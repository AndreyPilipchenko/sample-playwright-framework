import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeVisible, expectToContainText, expectToHaveCount, expectToHaveText, expectToHaveValue } from '../utils/Expects';

/** Checkout step 1: the cart review table (`#/checkout`). The cart is client-side state, so it must be filled in the same browser session. */
export class CartPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/checkout`;

  // Locators
  private readonly columnHeaders_list: Locator;
  private readonly cartTotal_txt: Locator;
  private readonly proceed_button: Locator;
  private readonly emptyCart_msg: Locator;
  private readonly subtotal_txt: Locator;
  private readonly discount_txt: Locator;
  private readonly discountLabel_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.columnHeaders_list = page.getByRole('columnheader');
    this.cartTotal_txt = page.getByTestId('cart-total');
    this.proceed_button = page.getByTestId('proceed-1');
    this.emptyCart_msg = page.getByText(/cart is empty/i);
    this.subtotal_txt = page.getByTestId('cart-subtotal');
    this.discount_txt = page.getByTestId('cart-discount');
    this.discountLabel_txt = page.getByRole('row').filter({ has: page.getByTestId('cart-discount') }).getByRole('cell').first();
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

  async proceed() {
    await step('Click Proceed to checkout on the cart step', async () => {
      await this.proceed_button.click();
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

  async verifyItemPrice(productName: string, expectedPrice: string) {
    await step(`Verify the price of ${productName} in the cart is ${expectedPrice}`, async () => {
      await expectToHaveText(`the price of ${productName}`, this.cartItem_row(productName).getByTestId('product-price'), expectedPrice);
    });
  }

  async verifyItemMarkedAsRental(productName: string, expectedLabel: string) {
    await step(`Verify ${productName} is marked in the cart with: ${expectedLabel}`, async () => {
      await expectToContainText(`the cart line of ${productName}`, this.cartItem_row(productName), expectedLabel);
    });
  }

  async verifyItemQuantity(productName: string, expectedQuantity: string) {
    await step(`Verify the quantity of ${productName} in the cart is ${expectedQuantity}`, async () => {
      await expectToHaveValue(`the quantity of ${productName}`, this.cartItem_row(productName).getByTestId('product-quantity'), expectedQuantity);
    });
  }

  async verifyCartSubtotal(expectedSubtotal: string) {
    await step(`Verify the cart subtotal is ${expectedSubtotal}`, async () => {
      await expectToHaveText('the cart subtotal', this.subtotal_txt, expectedSubtotal);
    });
  }

  /** The discount line names its percentage in its label and shows its amount as a deduction. */
  async verifyCartDiscount(expectedLabel: string, expectedAmount: string) {
    await step(`Verify the cart shows the discount ${expectedLabel} of ${expectedAmount}`, async () => {
      await expectToHaveText('the discount label', this.discountLabel_txt, expectedLabel);
      await expectToHaveText('the discount amount', this.discount_txt, expectedAmount);
    });
  }

  async verifyCartTotal(expectedTotal: string) {
    await step(`Verify the cart total is ${expectedTotal}`, async () => {
      await expectToHaveText('the cart total', this.cartTotal_txt, expectedTotal);
    });
  }

  async verifyCartEmpty() {
    await step('Verify the cart shows no items', async () => {
      await expectToBeVisible('the empty cart message', this.emptyCart_msg);
      await expectToHaveCount('the cart totals', this.cartTotal_txt, 0, 'total');
      await expectToHaveCount('the Proceed to checkout buttons', this.proceed_button, 0, 'button');
    });
  }

  async verifyItemNotListed(productName: string) {
    await step(`Verify ${productName} is no longer listed in the cart`, async () => {
      await expectToHaveCount(`the cart rows of ${productName}`, this.cartItem_row(productName), 0, 'row');
    });
  }
}
