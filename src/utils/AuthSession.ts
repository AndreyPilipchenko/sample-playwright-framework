import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * Saves and restores a signed-in session that lives in sessionStorage.
 *
 * Playwright's `storageState` captures cookies, localStorage and IndexedDB, but not
 * sessionStorage (https://playwright.dev/docs/auth#session-storage), which is where the
 * app under test keeps its `auth-token`. These helpers fill that gap: the setup project
 * saves the page's sessionStorage once per run, and every test that opts into a role
 * restores it through an init script before the app's own code runs.
 *
 * The saved file holds a live token: it lives under the gitignored `playwright/.auth/`
 * and its contents never go into a step title, log line or attachment.
 */
interface SavedSession {
  origin: string;
  sessionStorage: Record<string, string>;
}

/** Marker set after the first restore, so a sign-out during the test is not undone by the next navigation. */
const RESTORED_MARKER = '__pw_session_restored';

/** Writes the page's origin and sessionStorage to `file`. */
export async function saveSession(page: Page, file: string): Promise<void> {
  const session: SavedSession = await page.evaluate(() => ({
    origin: window.location.origin,
    sessionStorage: Object.fromEntries(Object.entries(window.sessionStorage)) as Record<string, string>,
  }));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(session), 'utf8');
}

/** Seeds every page of `context` with the saved sessionStorage, once per tab, on the saved origin only. */
export async function restoreSession(context: BrowserContext, file: string): Promise<void> {
  let session: SavedSession;
  try {
    session = JSON.parse(await readFile(file, 'utf8')) as SavedSession;
  } catch {
    throw new Error(
      `No saved session at ${file} — run the 'setup' project (it runs automatically as a dependency) ` +
      `and make sure the role's credentials are set in .env.`,
    );
  }
  await context.addInitScript(({ origin, entries, marker }) => {
    if (window.location.origin !== origin || window.sessionStorage.getItem(marker)) return;
    for (const [key, value] of entries) window.sessionStorage.setItem(key, value);
    window.sessionStorage.setItem(marker, '1');
  }, { origin: session.origin, entries: Object.entries(session.sessionStorage), marker: RESTORED_MARKER });
}
