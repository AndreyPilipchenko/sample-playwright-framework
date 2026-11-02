import { test as base } from '@playwright/test';
import { authStateFile, type Role } from '../config/auth';
import { restoreSession } from '../utils/AuthSession';

/**
 * The suite's `test`: Playwright's built-in one plus a `role` option.
 *
 * Justified public fixture (design-conventions §4a): the app keeps its session in
 * sessionStorage, which the built-in `storageState` option cannot restore, so a
 * signed-in context needs one lifecycle hook before any page opens. Specs opt in per
 * describe block; without `role` the context stays anonymous, exactly as before:
 *
 *   import { test } from '../src/fixtures/test';
 *   test.use({ role: 'customer' });
 */
export const test = base.extend<{ role: Role | undefined }>({
  role: [undefined, { option: true }],

  context: async ({ context, role }, use) => {
    if (role) await restoreSession(context, authStateFile(role));
    await use(context);
  },
});
