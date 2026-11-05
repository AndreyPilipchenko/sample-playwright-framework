import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToHaveText, expectToHaveValue } from '../utils/Expects';

/** What the order view shows about the invoice, in the form's own formats. */
export interface AdminOrderDetails {
  invoiceNumber: string;
  total: string;
  billingAddress: string;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
}

/** Admin order view and status form (`#/admin/orders/edit/{id}`). Requires a signed-in admin session. */
export class AdminOrderPage {
  readonly page: Page;
  readonly urlPrefix: string = `${applications.app.url}/#/admin/orders/edit`;

  // Locators
  private readonly invoiceNumber_input: Locator;
  private readonly total_input: Locator;
  private readonly status_dropdown: Locator;
  private readonly updateStatus_button: Locator;
  private readonly statusMessage_input: Locator;
  private readonly address_input: Locator;
  private readonly paymentMethod_input: Locator;
  private readonly accountName_input: Locator;
  private readonly accountNumber_input: Locator;
  private readonly flash_msg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.invoiceNumber_input = page.getByTestId('invoice-number');
    this.total_input = page.getByTestId('invoice-total');
    this.status_dropdown = page.getByTestId('order-status');
    this.updateStatus_button = page.getByTestId('update-status-submit');
    this.statusMessage_input = page.getByTestId('status-message');
    this.address_input = page.getByTestId('address');
    this.paymentMethod_input = page.getByTestId('payment-method');
    this.accountName_input = page.getByTestId('account-name');
    this.accountNumber_input = page.getByTestId('account-number');
    this.flash_msg = page.locator('.alert-success');
  }

  ///// Actions

  async navigate(orderId: number) {
    await step(`Navigate to the order ${orderId}`, async () => {
      await this.page.goto(`${this.urlPrefix}/${orderId}`);
    });
  }

  async reload() {
    await step('Reload the order view', async () => {
      await this.page.reload();
    });
  }

  async setStatus(status: string) {
    await step(`Set the order status to ${status}`, async () => {
      await this.status_dropdown.selectOption(status);
      await this.updateStatus_button.click();
    });
  }

  /** Leaving ON_HOLD needs a status message (upstream rule). */
  async setStatusWithMessage(status: string, message: string) {
    await step(`Set the order status to ${status} with a status message`, async () => {
      await this.statusMessage_input.fill(message);
      await this.status_dropdown.selectOption(status);
      await this.updateStatus_button.click();
    });
  }

  ///// Validations

  async verifyDetails(details: AdminOrderDetails) {
    await step(`Verify the order view shows the invoice ${details.invoiceNumber}`, async () => {
      await expectToHaveValue('the Invoice Number field', this.invoiceNumber_input, details.invoiceNumber);
      await expectToHaveValue('the Total field', this.total_input, details.total);
      await expectToHaveValue('the Billing Address field', this.address_input, details.billingAddress);
      await expectToHaveValue('the Payment Method field', this.paymentMethod_input, details.paymentMethod);
      await expectToHaveValue('the Account Name field', this.accountName_input, details.accountName);
      await expectToHaveValue('the Account Number field', this.accountNumber_input, details.accountNumber);
    });
  }

  async verifyLineItem(productName: string, quantity: string, price: string, total: string) {
    await step(`Verify the order line of ${productName}`, async () => {
      const line = this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: productName, exact: true }) });
      await expectToHaveText(`the quantity of ${productName}`, line.getByRole('cell').nth(0), quantity);
      await expectToHaveText(`the price of ${productName}`, line.getByRole('cell').nth(2), price);
      await expectToHaveText(`the line total of ${productName}`, line.getByRole('cell').nth(3), total);
    });
  }

  async verifyStatusUpdated(expected: string) {
    await step(`Verify the message "${expected}" is shown`, async () => {
      await expectToHaveText('the order status message', this.flash_msg, expected);
    });
  }

  async verifyStatus(expected: string) {
    await step(`Verify the order status is ${expected}`, async () => {
      await expectToHaveValue('the Status field', this.status_dropdown, expected);
    });
  }
}
