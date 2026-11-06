import type { BrowserContext, TestInfo } from '@playwright/test';
import { REDACTED_HEADERS, REDACTED_KEYS } from './RedactedKeys';

/**
 * What the browser did during a test, for working out why it failed: console errors, uncaught
 * page errors, failed requests, server errors (status 500 and above), native dialogs and tabs
 * the page opened. One test's events go into one "Browser diagnostics" attachment, on a failed
 * attempt only. Stack traces are left to the trace; a message that repeats is listed once with
 * its count, because a page can log the same error hundreds of times.
 *
 * It only reports: an event here never fails a test, and a reporting problem only warns
 * (utility-classes practice 5). Its events live in the per-test object the fixture holds, not
 * in a facade field (practice 11).
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

/**
 * Starts recording a context's events; the context's own lifetime ends the recording.
 * Context-level events cover every tab of the test.
 *
 * Having a dialog listener turns off Playwright's automatic dismissal, so this listener does the
 * same dismissal itself, one tick later. A spec's own synchronous `page.once('dialog', ...)` runs
 * first and wins; the late dismissal then fails harmlessly. A spec handler that awaits something
 * before answering would lose that race.
 */
export function recordBrowserEvents(context: BrowserContext): BrowserEvents {
  const events = new BrowserEvents();

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
