import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToHaveURL } from '../utils/Expects';

/** Admin dashboard (`#/admin/dashboard`). Requires a signed-in admin session; without one the app redirects to the login page. */
export class AdminDashboardPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/admin/dashboard`;

  constructor(page: Page) {
    this.page = page;
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Admin Dashboard Page', async () => {
      await this.page.goto(this.url);
    });
  }

  ///// Validations

  async verifyPageOpened() {
    await step('Verify the Admin Dashboard Page is open', async () => {
      await expectToHaveURL(this.page, this.url);
    });
  }
}
