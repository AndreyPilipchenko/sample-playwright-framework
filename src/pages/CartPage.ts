import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToHaveCount, expectToHaveText } from '../utils/Expects';

/** Checkout step 1: the cart review table (`#/checkout`). The cart is client-side state, so it must be filled in the same browser session. */
export class CartPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/checkout`;

  // Locators
  private readonly columnHeaders_list: Locator;
  private readonly cartTotal_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.columnHeaders_list = page.getByRole('columnheader');
    this.cartTotal_txt = page.getByTestId('cart-total');
  }

  /** The table row of the cart item named exactly `productName`. */
  private cartItem_row(productName: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByTestId('product-title').and(this.page.getByText(productName, { exact: true })) });
  }

  /** The delete button of the cart item named exactly `productName` (an unlabelled icon link, no test id). */
  private delete_button(productName: string): Locator {
    return this.cartItem_row(productName).locator('.btn-danger');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to the Cart Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async changeQuantity(productName: string, quantity: string) {
    await step(`Change the quantity of ${productName} in the cart to ${quantity}`, async () => {
      const quantity_input = this.cartItem_row(productName).getByTestId('product-quantity');
      await quantity_input.fill(quantity);
      await quantity_input.press('Tab');
    });
  }

  async deleteItem(productName: string) {
    await step(`Click the delete button of ${productName} in the cart`, async () => {
      await this.delete_button(productName).click();
    });
  }

  ///// Validations

  async verifyColumnHeaders(expectedHeaders: string[]) {
    await step(`Verify the cart table columns are: ${expectedHeaders.join(', ')}`, async () => {
      await expectToHaveText('the cart table column headers', this.columnHeaders_list, expectedHeaders);
    });
  }

  async verifyLineTotal(productName: string, expectedTotal: string) {
    await step(`Verify the line total of ${productName} is ${expectedTotal}`, async () => {
      await expectToHaveText(`the line total of ${productName}`, this.cartItem_row(productName).getByTestId('line-price'), expectedTotal);
    });
  }

  async verifyCartTotal(expectedTotal: string) {
    await step(`Verify the cart total is ${expectedTotal}`, async () => {
      await expectToHaveText('the cart total', this.cartTotal_txt, expectedTotal);
    });
  }

  async verifyItemNotListed(productName: string) {
    await step(`Verify ${productName} is no longer listed in the cart`, async () => {
      await expectToHaveCount(`the cart rows of ${productName}`, this.cartItem_row(productName), 0, 'row');
    });
  }
}
