import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToHaveURL } from '../utils/Expects';

/** Customer account overview (`#/account`). Requires a signed-in session; without one the app redirects to the login page. */
export class AccountPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/account`;

  constructor(page: Page) {
    this.page = page;
  }

  ///// Actions

  async navigate() {
    await step('Navigate to My Account Page', async () => {
      await this.page.goto(this.url);
    });
  }

  ///// Validations

  async verifyPageOpened() {
    await step('Verify the My Account Page is open', async () => {
      await expectToHaveURL(this.page, this.url);
    });
  }
}
