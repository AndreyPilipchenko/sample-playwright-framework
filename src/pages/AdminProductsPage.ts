import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeVisible, expectToHaveCount, expectToHaveText } from '../utils/Expects';
import { rowWithCell } from '../utils/TableRows';

/** Admin product list (`#/admin/products`). Requires a signed-in admin session. */
export class AdminProductsPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/admin/products`;

  // Locators
  private readonly search_input: Locator;
  private readonly search_button: Locator;
  private readonly add_link: Locator;
  private readonly flash_msg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.search_input = page.getByTestId('product-search-query');
    this.search_button = page.getByTestId('product-search-submit');
    this.add_link = page.getByTestId('product-add');
    this.flash_msg = page.locator('.alert-success');
  }

  /** The list row whose Name cell is exactly `name`. */
  private row(name: string): Locator {
    return rowWithCell(this.page, name);
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Admin Products Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async searchProduct(name: string) {
    await step(`Search the admin product list for ${name}`, async () => {
      await this.search_input.fill(name);
      await this.search_button.click();
    });
  }

  async openAddProduct() {
    await step('Click Add Product', async () => {
      await this.add_link.click();
    });
  }

  async openProduct(name: string) {
    await step(`Open the product ${name} for editing`, async () => {
      await this.row(name).getByRole('link', { name: 'Edit' }).click();
    });
  }

  async deleteProduct(name: string) {
    await step(`Delete the product ${name}`, async () => {
      await this.row(name).getByRole('button', { name: 'Delete' }).click();
    });
  }

  ///// Validations

  async verifyProductListed(name: string, stock: string, price: string) {
    await step(`Verify the product ${name} is listed with its stock and price`, async () => {
      await expectToBeVisible(`the row of the product ${name}`, this.row(name));
      await expectToHaveText(`the stock of the product ${name}`, this.row(name).getByRole('cell').nth(2), stock);
      await expectToHaveText(`the price of the product ${name}`, this.row(name).getByRole('cell').nth(3), price);
    });
  }

  async verifyProductNotListed(name: string) {
    await step(`Verify the product ${name} is not listed`, async () => {
      await expectToHaveCount(`the rows of the product ${name}`, this.row(name), 0, 'row');
    });
  }

  async verifyFlashMessage(expected: string) {
    await step(`Verify the message "${expected}" is shown`, async () => {
      await expectToHaveText('the product list message', this.flash_msg, expected);
    });
  }
}
