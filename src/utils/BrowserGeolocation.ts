import { type Page } from '@playwright/test';

/** A place the browser reports as its position. */
export interface GeoPosition {
  latitude: number;
  longitude: number;
}

/**
 * Makes the app read a chosen position through the browser's own geolocation API: the context must have granted the
 * geolocation permission (`test.use({ permissions: ['geolocation'] })`). The app only asks the browser when the
 * session marks it (`RETRIEVE_GEOLOCATION`), stores the answer in `GEO_LOCATION` and reloads the home page, so the
 * session is reset and marked first. Technical helper: it works on the page's session storage, which no page class owns.
 */
export async function useBrowserLocation(page: Page, position: GeoPosition): Promise<void> {
  await page.context().setGeolocation(position);
  await page.evaluate(() => {
    window.sessionStorage.removeItem('GEO_LOCATION');
    window.sessionStorage.setItem('RETRIEVE_GEOLOCATION', '1');
  });
  await page.reload();
  await page.waitForFunction(() => window.sessionStorage.getItem('GEO_LOCATION') !== null);
  await page.waitForLoadState('load');
}
