import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeVisible, expectToHaveText } from '../utils/Expects';

/** Admin order list (`#/admin/orders`). Requires a signed-in admin session. */
export class AdminOrdersPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/admin/orders`;

  // Locators
  private readonly search_input: Locator;
  private readonly search_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.search_input = page.getByTestId('order-search-query');
    this.search_button = page.getByTestId('order-search-submit');
  }

  /**
   * The list row of the order with this id (its Edit link carries it). The invoice number is no key: the
   * local build can issue the same number twice when two invoices are created at the same moment.
   */
  private row(orderId: number): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByTestId(`order-edit-${orderId}`) });
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Admin Orders Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async searchOrder(invoiceNumber: string) {
    await step(`Search the admin order list for ${invoiceNumber}`, async () => {
      await this.search_input.fill(invoiceNumber);
      await this.search_button.click();
    });
  }

  async openOrder(orderId: number) {
    await step(`Open the order ${orderId}`, async () => {
      await this.row(orderId).getByRole('link', { name: 'Edit' }).click();
    });
  }

  ///// Validations

  async verifyOrderListed(orderId: number, invoiceNumber: string, billingAddress: string, status: string, total: string) {
    await step(`Verify the order ${invoiceNumber} is listed with its address, status and total`, async () => {
      const row = this.row(orderId);
      await expectToBeVisible(`the row of the order ${invoiceNumber}`, row);
      await expectToHaveText(`the invoice number of the order ${orderId}`, row.getByRole('cell').nth(0), invoiceNumber);
      await expectToHaveText(`the billing address of the order ${invoiceNumber}`, row.getByRole('cell').nth(1), billingAddress);
      await expectToHaveText(`the status of the order ${invoiceNumber}`, row.getByRole('cell').nth(3), status);
      await expectToHaveText(`the total of the order ${invoiceNumber}`, row.getByRole('cell').nth(4), total);
    });
  }
}
