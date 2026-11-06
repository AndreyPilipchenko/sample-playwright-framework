import { test as base } from '@playwright/test';
import { authStateFile, type Role } from '../config/auth';
import { restoreSession } from '../utils/AuthSession';
import { attachBrowserEventsOnFailure, recordBrowserEvents } from '../utils/BrowserDiagnostics';

/**
 * The suite's `test`: Playwright's built-in one plus a `role` option and browser diagnostics.
 *
 * Justified public fixture (design-conventions §4a), used by the UI specs with
 * `// conventions-ok` on the import:
 * - The app keeps its session in sessionStorage, which the built-in `storageState` option cannot
 *   restore, so a signed-in context needs one lifecycle hook before any page opens. Specs opt in
 *   per describe block; without `role` the context stays anonymous.
 * - A failed test reports what the browser did (src/utils/BrowserDiagnostics.ts). That has to
 *   start before the first page opens and end after the test, in every UI spec. The same hook
 *   holds a test until a toast covering a control fades (`waitForToasts`).
 *
 *   import { test } from '../src/fixtures/test'; // conventions-ok: <reason>
 *   test.use({ role: 'customer' });
 */
export const test = base.extend<{ role: Role | undefined; waitForToasts: boolean }>({
  role: [undefined, { option: true }],
  /** Hold the test until a toast covering a control fades; specs that read toasts turn it off. */
  waitForToasts: [true, { option: true }],

  context: async ({ context, role, waitForToasts }, use, testInfo) => {
    if (role) await restoreSession(context, authStateFile(role));
    const browserEvents = await recordBrowserEvents(context, waitForToasts);
    await use(context);
    await attachBrowserEventsOnFailure(testInfo, browserEvents);
  },
});
