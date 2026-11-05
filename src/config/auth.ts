import * as path from 'node:path';

/**
 * Signed-in session states — single source for the setup project (setup/auth.setup.ts)
 * and the `role` fixture (src/fixtures/test.ts).
 *
 * The app keeps its auth token in sessionStorage, which Playwright's `storageState`
 * does not capture, so each role's session is saved by src/utils/AuthSession.ts into
 * `playwright/.auth/<role>.json` (gitignored — it holds a live token).
 */
export const roles = ['customer', 'admin'] as const;

export type Role = (typeof roles)[number];

/** Absolute path of a role's saved session file. */
export const authStateFile = (role: Role): string =>
  path.resolve(__dirname, '../../playwright/.auth', `${role}.json`);
