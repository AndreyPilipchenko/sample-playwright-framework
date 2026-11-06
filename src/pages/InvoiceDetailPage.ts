import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectNotToHaveValue, expectToBeVisible, expectToHaveValue, expectToHaveText } from '../utils/Expects';
import { expectAddressFieldsToShow, type AddressValues } from './AddressFields';
import { rowWithCell } from '../utils/TableRows';

/** The payment values the invoice detail shows. */
export interface InvoicePayment {
  method: string;
  accountName: string;
  accountNumber: string;
}

/** Invoice detail (`#/account/invoices/<id>`), opened from the invoice list. Requires a signed-in session. */
export class InvoiceDetailPage {
  readonly page: Page;
  readonly urlPrefix: string = `${applications.app.url}/#/account/invoices`;

  // Locators
  private readonly invoiceNumber_input: Locator;
  private readonly invoiceDate_input: Locator;
  private readonly total_input: Locator;
  private readonly address_input: Locator;
  private readonly postcode_input: Locator;
  private readonly city_input: Locator;
  private readonly state_input: Locator;
  private readonly country_input: Locator;
  private readonly paymentMethod_input: Locator;
  private readonly accountName_input: Locator;
  private readonly accountNumber_input: Locator;
  private readonly notExist_txt: Locator;
  private readonly subtotal_input: Locator;
  private readonly discount_input: Locator;

  constructor(page: Page) {
    this.page = page;
    this.invoiceNumber_input = page.getByTestId('invoice-number');
    this.invoiceDate_input = page.getByTestId('invoice-date');
    this.total_input = page.getByTestId('total');
    this.address_input = page.getByTestId('address');
    this.postcode_input = page.getByTestId('postcode');
    this.city_input = page.getByTestId('city');
    this.state_input = page.getByTestId('state');
    this.country_input = page.getByTestId('country');
    this.paymentMethod_input = page.getByTestId('payment-method');
    this.accountName_input = page.getByTestId('account-name');
    this.accountNumber_input = page.getByTestId('account-number');
    this.subtotal_input = page.getByLabel('Subtotal', { exact: true });
    this.discount_input = page.getByLabel('Discount amount', { exact: true });
    this.notExist_txt = page.locator('p', { hasText: /This invoice doesn't exist/ });
  }

  /** The Products table row of the line item named exactly `productName`. */
  private line_row(productName: string): Locator {
    return rowWithCell(this.page, productName);
  }

  ///// Actions

  /**
   * Opens the detail of the invoice with this id. Going from one invoice to another only changes the URL hash, so
   * the page is reloaded to make the app fetch the new invoice.
   */
  async navigate(invoiceId: number) {
    await step(`Navigate to the invoice ${invoiceId}`, async () => {
      await this.page.goto(`${this.urlPrefix}/${invoiceId}`);
      const fetched = this.page.waitForResponse((response) => response.url().endsWith(`/invoices/${invoiceId}`));
      await this.page.reload();
      await fetched; // the page says nothing reliable until the invoice request has answered
    });
  }

  ///// Validations

  async verifyBillingAddress(expected: AddressValues) {
    await step('Verify the billing address fields show the stored values', async () => {
      await expectAddressFieldsToShow(
        { address: this.address_input, postcode: this.postcode_input, city: this.city_input, state: this.state_input, country: this.country_input },
        expected,
      );
    });
  }

  /** `expected` values are plain amounts (`59.50`); the page puts the currency symbol in front, with or without a space. */
  async verifyDiscountedTotals(expected: { subtotal: string; discount: string; total: string }) {
    await step('Verify the invoice shows the subtotal, the discount and the final total', async () => {
      await expectToHaveValue('the invoice subtotal', this.subtotal_input, new RegExp(`^\\$\\s?${expected.subtotal.replace('.', '\\.')}$`));
      await expectToHaveValue('the invoice discount', this.discount_input, new RegExp(`^\\$\\s?${expected.discount.replace('.', '\\.')}$`));
      await this.verifyInvoiceTotal(expected.total);
    });
  }

  async verifyCityAndCountry(city: string, country: string) {
    await step('Verify City and Country sit in their own fields', async () => {
      await expectToHaveValue('the City field', this.city_input, city);
      await expectToHaveValue('the Country field', this.country_input, country);
    });
  }

  /** The invoice has loaded (the address is not empty) before the "undefined" checks, so they cannot pass on an empty page. */
  async verifyNoUndefinedInAddress() {
    await step('Verify no billing address field shows "undefined"', async () => {
      await expectToHaveValue('the Address field', this.address_input, /.+/);
      await expectNotToHaveValue('the Address field', this.address_input, /undefined/);
      await expectNotToHaveValue('the Postcode field', this.postcode_input, /undefined/);
      await expectNotToHaveValue('the City field', this.city_input, /undefined/);
      await expectNotToHaveValue('the State field', this.state_input, /undefined/);
      await expectNotToHaveValue('the Country field', this.country_input, /undefined/);
    });
  }

  async verifyPayment(expected: InvoicePayment) {
    await step('Verify the payment method and details are shown', async () => {
      await expectToHaveValue('the Payment Method field', this.paymentMethod_input, expected.method);
      await expectToHaveValue('the Account Name field', this.accountName_input, expected.accountName);
      await expectToHaveValue('the Account Number field', this.accountNumber_input, expected.accountNumber);
    });
  }

  async verifyInvoiceDoesNotExist(expectedMessage: string) {
    await step('Verify the page says the invoice does not exist', async () => {
      await expectToBeVisible('the invoice-does-not-exist message', this.notExist_txt);
      await expectToHaveText('the invoice-does-not-exist message', this.notExist_txt, expectedMessage);
    });
  }

  async verifyInvoiceNumber(expectedNumber: string) {
    await step(`Verify the invoice number is ${expectedNumber}`, async () => {
      await expectToHaveValue('the invoice number', this.invoiceNumber_input, expectedNumber);
    });
  }

  /** `expectedDate` is the calendar date (`YYYY-MM-DD`); the page appends the time of day. */
  async verifyInvoiceDate(expectedDate: string) {
    await step(`Verify the invoice date is ${expectedDate}`, async () => {
      await expectToHaveValue('the invoice date', this.invoiceDate_input, new RegExp(`^${expectedDate}`));
    });
  }

  /** `expectedAmount` is the plain amount (`28.30`); the page puts the currency symbol in front, with or without a space. */
  async verifyInvoiceTotal(expectedAmount: string) {
    await step(`Verify the invoice total is ${expectedAmount}`, async () => {
      await expectToHaveValue('the invoice total', this.total_input, new RegExp(`^\\$\\s?${expectedAmount.replace('.', '\\.')}$`));
    });
  }

  async verifyLineItemQuantity(productName: string, expectedQuantity: string) {
    await step(`Verify the quantity of ${productName} on the invoice is ${expectedQuantity}`, async () => {
      await expectToHaveText(`the quantity of ${productName}`, this.line_row(productName).getByRole('cell').nth(0), expectedQuantity);
    });
  }

  async verifyLineItemProductName(productName: string) {
    await step(`Verify the invoice lists the product ${productName}`, async () => {
      await expectToHaveText(`the product name of ${productName}`, this.line_row(productName).getByRole('cell').nth(1), productName);
    });
  }

  async verifyLineItemPrice(productName: string, expectedPrice: string) {
    await step(`Verify the price of ${productName} on the invoice is ${expectedPrice}`, async () => {
      await expectToHaveText(`the price of ${productName}`, this.line_row(productName).getByRole('cell').nth(2), expectedPrice);
    });
  }

  async verifyLineItemTotal(productName: string, expectedLineTotal: string) {
    await step(`Verify the line total of ${productName} on the invoice is ${expectedLineTotal}`, async () => {
      await expectToHaveText(`the line total of ${productName}`, this.line_row(productName).getByRole('cell').nth(3), expectedLineTotal);
    });
  }
}
