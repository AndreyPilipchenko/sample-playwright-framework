import * as path from 'node:path';
import { byBuild } from '../utils/AppEnvironment';
import type { SessionStorageArea } from '../utils/AuthSession';

/**
 * Signed-in session states — single source for the setup project (setup/auth.setup.ts)
 * and the `role` fixture (src/fixtures/test.ts).
 *
 * The with-bugs build keeps its auth token in sessionStorage, which Playwright's `storageState`
 * does not capture, so each role's session is saved by src/utils/AuthSession.ts into
 * `playwright/.auth/<role>.json` (gitignored — it holds a live token). The fixed build keeps
 * it in localStorage (docs/app-versions.md, B10); `sessionArea` names the area to save.
 */
export const sessionArea: SessionStorageArea = byBuild<SessionStorageArea>({ fixed: 'localStorage', default: 'sessionStorage' });

export const roles = ['customer', 'admin'] as const;

export type Role = (typeof roles)[number];

/** Absolute path of a role's saved session file. */
export const authStateFile = (role: Role): string =>
  path.resolve(__dirname, '../../playwright/.auth', `${role}.json`);
