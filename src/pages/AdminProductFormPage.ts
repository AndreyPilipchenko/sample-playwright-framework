import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToHaveText, expectToHaveValue } from '../utils/Expects';

/** The values typed into the product form. */
export interface AdminProductSeed {
  name: string;
  description: string;
  stock: string;
  price: string;
  brandName: string;
  categoryName: string;
}

/** Admin product form (`#/admin/products/add` and `#/admin/products/edit/{id}`). Requires a signed-in admin session. */
export class AdminProductFormPage {
  readonly page: Page;
  readonly addUrl: string = `${applications.app.url}/#/admin/products/add`;

  // Locators
  private readonly name_input: Locator;
  private readonly description_input: Locator;
  private readonly stock_input: Locator;
  private readonly price_input: Locator;
  private readonly brand_dropdown: Locator;
  private readonly category_dropdown: Locator;
  private readonly co2Rating_dropdown: Locator;
  private readonly image_dropdown: Locator;
  private readonly save_button: Locator;
  private readonly saved_msg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.name_input = page.getByTestId('name');
    this.description_input = page.getByTestId('description');
    this.stock_input = page.getByTestId('stock');
    this.price_input = page.getByTestId('price');
    this.brand_dropdown = page.getByTestId('brand-id');
    this.category_dropdown = page.getByTestId('category-id');
    this.co2Rating_dropdown = page.getByTestId('co2-rating');
    this.image_dropdown = page.getByTestId('product-image-id');
    this.save_button = page.getByTestId('product-submit');
    this.saved_msg = page.locator('.alert-success');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to the Add Product form', async () => {
      await this.page.goto(this.addUrl);
    });
  }

  /** Fills every required field; the CO2 rating and the image take the first real option. */
  async enterProduct(product: AdminProductSeed) {
    await step(`Enter the product ${product.name}`, async () => {
      await this.name_input.fill(product.name);
      await this.description_input.fill(product.description);
      await this.stock_input.fill(product.stock);
      await this.price_input.fill(product.price);
      await this.brand_dropdown.selectOption({ label: product.brandName });
      await this.category_dropdown.selectOption({ label: product.categoryName });
      await this.co2Rating_dropdown.selectOption({ index: 1 });
      await this.image_dropdown.selectOption({ index: 1 });
    });
  }

  async changePrice(price: string) {
    await step(`Change the price to ${price}`, async () => {
      await this.price_input.fill(price);
    });
  }

  async save() {
    await step('Click Save on the product form', async () => {
      await this.save_button.click();
    });
  }

  ///// Validations

  async verifySaved(expected: string) {
    await step(`Verify the message "${expected}" is shown`, async () => {
      await expectToHaveText('the product form message', this.saved_msg, expected);
    });
  }

  async verifyPrice(expected: string) {
    await step(`Verify the price field holds ${expected}`, async () => {
      await expectToHaveValue('the Price field', this.price_input, expected);
    });
  }
}
