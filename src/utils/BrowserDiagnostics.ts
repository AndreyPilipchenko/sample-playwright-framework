import { errors, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import { TOAST_CHECK_MS, TOAST_FADE_LIMIT_MS, TOAST_SELECTOR, TOAST_WAIT_BUDGET_MS } from '../config/browserDiagnostics';
import { REDACTED_HEADERS, REDACTED_KEYS } from './RedactedKeys';

/**
 * What the browser did during a test, for working out why it failed: console errors, uncaught
 * page errors, failed requests, server errors (status 500 and above), native dialogs, tabs the
 * page opened and toast messages. One test's events go into one "Browser diagnostics" attachment,
 * on a failed attempt only. Stack traces are left to the trace; a message that repeats is listed
 * once with its count, because a page can log the same error hundreds of times.
 *
 * It never fails a test, and a reporting problem only warns (utility-classes practice 5). Its one
 * effect on a test is timing: it can wait for a toast that covers a control to fade. It adds a
 * script and a `window` function to every page, to observe toasts; they only read the page. Its
 * events live in the per-test object the fixture holds, not in a facade field (practice 11).
 *
 * Masking is limited (practice 20): query strings, fragments and logins are removed from URLs,
 * and values following a credential name or `Bearer` are masked in message text. Other secrets
 * in a message stay visible, so treat the attachment like the rest of the failure artifacts.
 */

/** Longest message kept per event. */
const MAX_MESSAGE_LENGTH = 500;
/** Most distinct events kept per test; a page looping on changing errors should not bloat the report. */
const MAX_EVENTS = 200;
/** A request cancelled by the page moving on, not a failure. */
const ABORTED_REQUEST = 'net::ERR_ABORTED';
/** Lowest status counted as a server error. */
const SERVER_ERROR_STATUS = 500;
/** The `window` function the toast observer reports through. */
const TOAST_BINDING = '__browserDiagnosticsToast';

const CREDENTIAL_NAMES = [...REDACTED_KEYS, ...REDACTED_HEADERS].join('|');
/**
 * A credential name followed by `:` or `=` and its value, in any case: quoted, quoted inside
 * escaped JSON, or plain up to the next separator, with an optional auth scheme before it.
 */
const CREDENTIAL_VALUE = new RegExp(
  String.raw`(\\?["']?(?:${CREDENTIAL_NAMES})\\?["']?\s*[:=]\s*)(?:(?:bearer|basic)\s+)?(\\"(?:[^"\\]|\\[^"])*\\"|"(?:[^"\\]|\\.)*"|'[^']*'|[^\s,&;}]+)`,
  'gi',
);
const BEARER_VALUE = /(bearer\s+)[\w.~+/=-]+/gi;

/** One recorded event; `count` grows when the same message comes again. */
interface BrowserEvent {
  atSeconds: string;
  text: string;
  count: number;
}

/** What the toast observer sends for each toast. */
interface ToastSeen {
  text: string;
  coversControl: boolean;
}

/** A URL without what can carry credentials: its login, query string and fragment. */
function cleanUrl(url: string): string {
  return url.replace(/^([a-z][a-z+.-]*:\/\/)[^/@]*@/i, '$1').replace(/[?#].*$/s, '?<query or fragment removed>');
}

/** The first line of a message (its stack is in the trace), with credentials masked, clipped. */
function cleanMessage(text: string): string {
  const firstLine = text.split('\n', 1)[0];
  const masked = firstLine.replace(CREDENTIAL_VALUE, '$1***').replace(BEARER_VALUE, '$1***');
  return masked.length > MAX_MESSAGE_LENGTH ? `${masked.slice(0, MAX_MESSAGE_LENGTH)}…[truncated]` : masked;
}

/** A page message with its numbers blanked, the key that groups its repeats. */
function blankNumbers(text: string): string {
  return text.replace(/\d+/g, '#');
}

/** The recorded events of one test. Created by `recordBrowserEvents`. */
export class BrowserEvents {
  private readonly started = Date.now();
  private readonly byMessage = new Map<string, BrowserEvent>();
  private dropped = 0;

  /**
   * Adds an event, or counts it when an event with the same key was already recorded. Page
   * messages pass a key with their numbers blanked, so `value 3` and `value 4` count as one;
   * network events keep their full text, so a 500 and a 503 stay separate.
   */
  record(text: string, key: string = text): void {
    const seen = this.byMessage.get(key);
    if (seen) {
      seen.count++;
    } else if (this.byMessage.size < MAX_EVENTS) {
      this.byMessage.set(key, { atSeconds: ((Date.now() - this.started) / 1000).toFixed(1), text, count: 1 });
    } else {
      this.dropped++;
    }
  }

  /** The report text, in order of first appearance; empty when nothing happened. */
  toText(): string {
    const lines = [...this.byMessage.values()].map(({ atSeconds, text, count }) =>
      `+${atSeconds}s ${text}${count > 1 ? ` (${count} times)` : ''}`);
    if (this.dropped > 0) lines.push(`…${this.dropped} more event(s) not shown`);
    return lines.join('\n');
  }
}

/** Runs in the page: whether a link or form control lies under this element. */
function coversControl(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return [...document.querySelectorAll('a, button, input, select, textarea')].some((control) => {
    const other = control.getBoundingClientRect();
    return !element.contains(control)
      && other.width > 0 && other.height > 0
      && other.left < box.right && other.right > box.left && other.top < box.bottom && other.bottom > box.top;
  });
}

/**
 * Runs in the page: tells the test about each toast once, as soon as it has text. A mutation
 * observer sees toasts that come and go between two test steps, which a locator handler cannot.
 * It only reads the page. `covers` arrives as a parameter because this function is sent as source.
 */
function observeToasts(selector: string, bindingName: string, covers: (element: Element) => boolean): void {
  const reported = new WeakSet<Element>();
  const report = (window as unknown as Record<string, (toast: ToastSeen) => Promise<void>>)[bindingName];
  new MutationObserver(() => {
    for (const toast of document.querySelectorAll(selector)) {
      if (reported.has(toast)) continue;
      const text = (toast as HTMLElement).innerText?.trim();
      if (text) {
        reported.add(toast);
        report({ text, coversControl: covers(toast) }).catch(() => undefined); // the test or page has ended
      }
    }
  }).observe(document, { childList: true, subtree: true, characterData: true });
}

/** A toast's text, or nothing when it has gone. Never throws. */
async function toastText(toast: Locator): Promise<string> {
  return toast.innerText({ timeout: TOAST_CHECK_MS }).catch(() => '');
}

/**
 * Holds the test until a toast that covers a link or form control fades (they cannot be closed,
 * see src/config/browserDiagnostics.ts), and reports each wait. The observer reports the toasts.
 *
 * A locator handler runs before clicks, fills and auto-retrying assertions, also those on the
 * toast itself, so a spec that reads toasts must turn the waiting off. Waiting ends on a page once
 * a toast stays unchanged past the limit or the page's total wait passes TOAST_WAIT_BUDGET_MS, or
 * each later step would wait again and use up the test's time. Nothing here may fail a test.
 */
function holdForToasts(page: Page, events: BrowserEvents): void {
  const toast = page.locator(TOAST_SELECTOR).first();
  let keepWaiting = true;
  let waitedMs = 0;
  page
    .addLocatorHandler(
      toast,
      async () => {
        if (!keepWaiting) return;
        const mustWait = await toast.evaluate(coversControl, undefined, { timeout: TOAST_CHECK_MS }).catch(() => false);
        if (!mustWait) return;
        const textBefore = await toastText(toast);
        const started = Date.now();
        try {
          await toast.waitFor({ state: 'hidden', timeout: TOAST_FADE_LIMIT_MS });
          events.record(`waited ${((Date.now() - started) / 1000).toFixed(1)}s for a toast that covered a control to fade`);
        } catch (waitErr) {
          if (!(waitErr instanceof errors.TimeoutError)) {
            events.record(`stopped waiting for a toast: ${cleanMessage(String(waitErr))}`);
          } else if (textBefore && (await toastText(toast)) === textBefore) {
            keepWaiting = false;
            events.record(`toast still visible after ${TOAST_FADE_LIMIT_MS / 1000}s, no more waiting on this page: ${cleanMessage(textBefore)}`);
          } else {
            events.record(`a toast was still visible after ${TOAST_FADE_LIMIT_MS / 1000}s with different text, carried on`);
          }
        }
        waitedMs += Date.now() - started;
        if (keepWaiting && waitedMs >= TOAST_WAIT_BUDGET_MS) {
          keepWaiting = false;
          events.record(`waited ${TOAST_WAIT_BUDGET_MS / 1000}s or more for toasts in total, no more waiting on this page`);
        }
      },
      { noWaitAfter: true },
    )
    .catch((reportErr: unknown) => console.warn('BrowserDiagnostics: watching toasts failed:', reportErr));
}

/**
 * Starts the observer of toast messages on every page of the context. If that fails, only the toast
 * lines of the report are missing, so it warns and the test goes on.
 */
async function reportToasts(context: BrowserContext, events: BrowserEvents): Promise<void> {
  try {
    await context.exposeBinding(TOAST_BINDING, (_source, toast: ToastSeen) => {
      events.record(`toast message: ${cleanMessage(toast.text)}${toast.coversControl ? ' (covers a control)' : ''}`);
    });
    await context.addInitScript({
      content: `(${observeToasts.toString()})(${JSON.stringify(TOAST_SELECTOR)}, ${JSON.stringify(TOAST_BINDING)}, ${coversControl.toString()});`,
    });
  } catch (reportErr) {
    console.warn('BrowserDiagnostics: starting the toast observer failed:', reportErr);
  }
}

/**
 * Starts recording a context's events; the context's own lifetime ends the recording.
 * Context-level events cover every tab of the test. With `waitForToasts`, a toast covering a
 * control also holds the test until it fades.
 *
 * Having a dialog listener turns off Playwright's automatic dismissal, so this listener does the
 * same dismissal itself, one tick later. A spec's own synchronous `page.once('dialog', ...)` runs
 * first and wins; the late dismissal then fails harmlessly. A spec handler that awaits something
 * before answering would lose that race.
 */
export async function recordBrowserEvents(context: BrowserContext, waitForToasts: boolean): Promise<BrowserEvents> {
  const events = new BrowserEvents();
  await reportToasts(context, events);

  context.on('console', (message) => {
    if (message.type() !== 'error') return;
    const source = message.location().url;
    const text = `console error: ${cleanMessage(message.text())}${source ? ` (at ${cleanUrl(source)})` : ''}`;
    events.record(text, blankNumbers(text));
  });
  context.on('weberror', (webError) => {
    const text = `uncaught page error: ${cleanMessage(webError.error().message)}`;
    events.record(text, blankNumbers(text));
  });
  context.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'unknown reason';
    if (reason !== ABORTED_REQUEST) events.record(`request failed: ${request.method()} ${cleanUrl(request.url())} (${reason})`);
  });
  context.on('response', (response) => {
    if (response.status() >= SERVER_ERROR_STATUS) {
      events.record(`server error: ${response.status()} ${response.request().method()} ${cleanUrl(response.url())}`);
    }
  });
  context.on('dialog', (dialog) => {
    events.record(`native dialog (${dialog.type()}): ${cleanMessage(dialog.message())}`);
    setTimeout(() => {
      // Playwright's default: a page may not be held open by its beforeunload dialog.
      const answer = dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss();
      answer.catch(() => undefined); // already answered by a spec, or the page has gone
    }, 0);
  });
  context.on('page', (page) => {
    page.on('popup', (popup) => events.record(`new tab opened: ${cleanUrl(popup.url())}`));
    if (waitForToasts) holdForToasts(page, events);
  });

  return events;
}

/** Attaches the recorded events when this attempt failed and something was recorded. Never throws. */
export async function attachBrowserEventsOnFailure(testInfo: TestInfo, events: BrowserEvents): Promise<void> {
  try {
    const report = events.toText();
    if (testInfo.status === testInfo.expectedStatus || !report) return;
    await testInfo.attach('Browser diagnostics', { body: report, contentType: 'text/plain' });
  } catch (reportErr) {
    console.warn('BrowserDiagnostics: reporting failed:', reportErr);
  }
}
