import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeHidden, expectToBeVisible, expectToHaveAttribute, expectToHaveText, expectToHaveURL, expectToHaveValue } from '../utils/Expects';

export class ProductDetailPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/product`;

  // Locators
  private readonly productName_txt: Locator;
  private readonly quantity_input: Locator;
  private readonly increaseQuantity_button: Locator;
  private readonly decreaseQuantity_button: Locator;
  private readonly outOfStock_msg: Locator;
  private readonly addToCart_button: Locator;
  private readonly unitPrice_txt: Locator;
  private readonly description_txt: Locator;
  private readonly productImage_img: Locator;
  private readonly discount_txt: Locator;
  private readonly errorToast_msg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productName_txt = page.getByTestId('product-name');
    this.quantity_input = page.getByTestId('quantity');
    this.increaseQuantity_button = page.getByTestId('increase-quantity');
    this.decreaseQuantity_button = page.getByTestId('decrease-quantity');
    this.outOfStock_msg = page.getByTestId('out-of-stock');
    this.addToCart_button = page.getByTestId('add-to-cart');
    this.unitPrice_txt = page.getByTestId('unit-price');
    this.description_txt = page.getByTestId('product-description');
    this.productImage_img = page.locator('img[src*="assets/img/products/"]').first();
    this.discount_txt = page.locator('.badge.bg-danger');
    this.errorToast_msg = page.locator('.toast.bg-danger');
  }

  ///// Actions

  async navigate(productId: string) {
    await step(`Navigate to the product detail page of product ${productId}`, async () => {
      await this.page.goto(`${this.url}/${encodeURIComponent(productId)}`);
    });
  }

  async increaseQuantity() {
    await step('Click the plus button next to the quantity', async () => {
      await this.increaseQuantity_button.click();
    });
  }

  async decreaseQuantity() {
    await step('Click the minus button next to the quantity', async () => {
      await this.decreaseQuantity_button.click();
    });
  }

  async enterQuantity(quantity: string) {
    await step(`Enter the quantity ${quantity}`, async () => {
      await this.quantity_input.fill(quantity);
    });
  }

  async addToCart() {
    await step('Click Add to cart on the product detail page', async () => {
      await this.addToCart_button.click();
    });
  }

  ///// Validations

  /** Arrival first: the home grid also renders `product-name`, so the name is checked only once the route changed. */
  async verifyProductDetailOpened(productName: string) {
    await step(`Verify the product detail page opened for: ${productName}`, async () => {
      await expectToHaveURL(this.page, /\/#\/product\/[^/]+$/);
      await expectToHaveText('the product name', this.productName_txt, productName);
    });
  }

  /** The product loads first (name visible), so the absent out-of-stock marker is a real observation, not a not-yet-rendered page. */
  async verifyProductInStock() {
    await step('Verify the product is in stock', async () => {
      await expectToBeVisible('the product name', this.productName_txt);
      await expectToBeHidden('the out-of-stock marker', this.outOfStock_msg);
    });
  }

  async verifyQuantitySelectorDisplayed() {
    await step('Verify the quantity input with plus and minus buttons is displayed', async () => {
      await expectToBeVisible('the quantity input', this.quantity_input);
      await expectToBeVisible('the increase quantity (+) button', this.increaseQuantity_button);
      await expectToBeVisible('the decrease quantity (-) button', this.decreaseQuantity_button);
    });
  }

  async verifyProductDetails(expected: { name: string; price: string; description: string }) {
    await step(`Verify the detail page shows ${expected.name} with its price, description and image`, async () => {
      await expectToHaveText('the product name', this.productName_txt, expected.name);
      await expectToHaveText('the unit price', this.unitPrice_txt, expected.price);
      await expectToHaveText('the product description', this.description_txt, expected.description);
      await expectToBeVisible('the product image', this.productImage_img);
      await expectToHaveAttribute('the product image', this.productImage_img, 'src', /assets\/img\/products\/.+/);
    });
  }

  async verifyDiscountBadge(expectedText: string) {
    await step(`Verify the discount badge reads ${expectedText}`, async () => {
      await expectToHaveText('the discount badge', this.discount_txt, expectedText);
    });
  }

  /** Waits for the page's requests to settle first, so a late error message cannot be missed. */
  async verifyAddToCartRaisedNoError() {
    await step('Verify adding to the cart raised no error message', async () => {
      await this.page.waitForLoadState('networkidle');
      await expectToBeHidden('the error message', this.errorToast_msg);
    });
  }

  async verifyQuantity(expectedQuantity: string) {
    await step(`Verify the quantity input shows: ${expectedQuantity}`, async () => {
      await expectToHaveValue('the quantity input', this.quantity_input, expectedQuantity);
    });
  }
}
