import { type Page } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';

/** Customer invoice list (`#/account/invoices`). Requires a signed-in session; without one the app redirects to the login page. */
export class InvoicesPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/account/invoices`;

  constructor(page: Page) {
    this.page = page;
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Invoices Page', async () => {
      await this.page.goto(this.url);
    });
  }
}
