import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';

/** The web storage area an app keeps its signed-in session in. */
export type SessionStorageArea = 'sessionStorage' | 'localStorage';

/**
 * Saves and restores a signed-in session that lives in web storage (sessionStorage or localStorage).
 *
 * Playwright's `storageState` captures cookies, localStorage and IndexedDB, but not
 * sessionStorage (https://playwright.dev/docs/auth#session-storage), where an app may keep
 * its token. These helpers fill that gap: the setup project
 * saves the page's sessionStorage once per run, and every test that opts into a role
 * restores it through an init script before the app's own code runs.
 *
 * The saved file holds a live token: it lives under the gitignored `playwright/.auth/`
 * and its contents never go into a step title, log line or attachment.
 */
interface SavedSession {
  origin: string;
  area: SessionStorageArea;
  entries: Record<string, string>;
}

/** Marker set after the first restore, so a sign-out during the test is not undone by the next navigation. */
const RESTORED_MARKER = '__pw_session_restored';

/** Writes the page's origin and the given storage area (sessionStorage unless told otherwise) to `file`. */
export async function saveSession(page: Page, file: string, area: SessionStorageArea = 'sessionStorage'): Promise<void> {
  const session: SavedSession = await page.evaluate((storageArea) => ({
    origin: window.location.origin,
    area: storageArea,
    entries: Object.fromEntries(Object.entries(window[storageArea])) as Record<string, string>,
  }), area);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(session), 'utf8');
}

/** Removes a saved session, so a role that cannot sign in this run does not reuse one from an earlier run. */
export async function discardSession(file: string): Promise<void> {
  await rm(file, { force: true });
}

/**
 * Seeds every page of `context` with the saved entries, in the area they were saved from, once per tab and on the
 * saved origin only. The once-per-tab marker always lives in sessionStorage, which is per tab.
 */
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
  await context.addInitScript(({ origin, area, entries, marker }) => {
    if (window.location.origin !== origin || window.sessionStorage.getItem(marker)) return;
    for (const [key, value] of entries) window[area].setItem(key, value);
    window.sessionStorage.setItem(marker, '1');
  }, { origin: session.origin, area: session.area, entries: Object.entries(session.entries), marker: RESTORED_MARKER });
}
