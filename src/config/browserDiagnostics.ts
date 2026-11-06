/**
 * The app's toast messages, as BrowserDiagnostics handles them. They cannot be closed (no close
 * button, a click does nothing) and fade by themselves after about 3.4s (measured on the local
 * stack, 2026-11-06). So a toast that covers a link or form control holds the test until it fades,
 * and every toast's text goes into the report.
 *
 * A spec that reads toasts sets `test.use({ waitForToasts: false })`: the wait also runs before
 * assertions, so it would make the toast disappear before the check.
 *
 * No popup that blocks a test exists today. If one appears, close it with `page.addLocatorHandler`
 * inside the `context.on('page')` listener in src/utils/BrowserDiagnostics.ts and record that in
 * the report. A spec that checks that popup needs the same way to turn it off.
 */
export const TOAST_SELECTOR = 'ngb-toast';

/** Longest wait for a toast to fade, about 3x the measured time; after it the test carries on. */
export const TOAST_FADE_LIMIT_MS = 10_000;

/** Budget for checking what a toast covers; a toast gone by then needs no wait. */
export const TOAST_CHECK_MS = 1_000;
