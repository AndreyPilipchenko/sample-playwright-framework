import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToHaveValue, expectToHaveText } from '../utils/Expects';

/** Invoice detail (`#/account/invoices/<id>`), opened from the invoice list. Requires a signed-in session. */
export class InvoiceDetailPage {
  readonly page: Page;

  // Locators
  private readonly invoiceNumber_input: Locator;
  private readonly invoiceDate_input: Locator;
  private readonly total_input: Locator;

  constructor(page: Page) {
    this.page = page;
    this.invoiceNumber_input = page.getByTestId('invoice-number');
    this.invoiceDate_input = page.getByTestId('invoice-date');
    this.total_input = page.getByTestId('total');
  }

  /** The Products table row of the line item named exactly `productName`. */
  private line_row(productName: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: productName, exact: true }) });
  }

  ///// Validations

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
