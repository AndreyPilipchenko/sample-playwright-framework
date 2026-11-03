import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';

/** Customer favorites list (`#/account/favorites`). Requires a signed-in session; without one the app redirects to the login page. */
export class FavoritesPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/account/favorites`;

  constructor(page: Page) {
    this.page = page;
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Favorites Page', async () => {
      await this.page.goto(this.url);
    });
  }
}
