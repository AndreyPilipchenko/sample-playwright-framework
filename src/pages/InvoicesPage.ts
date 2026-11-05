import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';

/** Customer invoice list (`#/account/invoices`). Requires a signed-in session; without one the app redirects to the login page. */
export class InvoicesPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/account/invoices`;

  constructor(page: Page) {
    this.page = page;
  }

  /** The Details link of the list row showing exactly `invoiceNumber`. */
  private details_link(invoiceNumber: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: invoiceNumber, exact: true }) }).getByRole('link', { name: 'Details' });
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Invoices Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async openInvoiceDetails(invoiceNumber: string) {
    await step(`Open the details of invoice ${invoiceNumber}`, async () => {
      await this.details_link(invoiceNumber).click();
    });
  }
}
