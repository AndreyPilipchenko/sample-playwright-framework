import { type Locator, type Page } from '@playwright/test';

/** The table row with a cell holding exactly `text`. */
export function rowWithCell(page: Page, text: string): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: text, exact: true }) });
}
