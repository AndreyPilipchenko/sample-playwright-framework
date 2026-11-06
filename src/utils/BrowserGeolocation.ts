import { type Page } from '@playwright/test';
import { GEOLOCATION_SESSION_KEYS } from '../config/geolocation';

/** A place the browser reports as its position. */
export interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Makes the app read a chosen position through the browser's own geolocation API: the context must have granted the
 * geolocation permission (`test.use({ permissions: ['geolocation'] })`). The app only asks the browser when the
 * session marks it (src/config/geolocation.ts), so the session is reset and marked first, and the reload ends once
 * the answer is stored. Technical helper: it works on the page's session storage, which no page class owns.
 */
export async function useBrowserLocation(page: Page, position: GeoPosition): Promise<void> {
  await page.context().setGeolocation(position);
  await page.evaluate(({ request, answer }) => {
    window.sessionStorage.removeItem(answer);
    window.sessionStorage.setItem(request, '1');
  }, GEOLOCATION_SESSION_KEYS);
  await page.reload();
  await page.waitForFunction((answer) => window.sessionStorage.getItem(answer) !== null, GEOLOCATION_SESSION_KEYS.answer);
  await page.waitForLoadState('load');
}
