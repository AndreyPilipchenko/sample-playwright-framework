import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import {
  expectToBeDisabled,
  expectToBeHidden,
  expectToBeVisible,
  expectToHaveAttribute,
  expectToHaveCount,
  expectToHaveCSS,
  expectToHaveText,
  expectToHaveURL,
  expectToHaveValue,
} from '../utils/Expects';

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
  private readonly toast_msg: Locator;
  private readonly addToFavorites_button: Locator;
  private readonly originalPrice_txt: Locator;
  private readonly offerPrice_txt: Locator;
  private readonly durationHandle_input: Locator;
  private readonly duration_txt: Locator;
  private readonly totalPrice_txt: Locator;
  private readonly relatedProductImages_list: Locator;
  private readonly productImagesWithoutAlt_list: Locator;

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
    this.toast_msg = page.locator('.toast');
    this.addToFavorites_button = page.getByTestId('add-to-favorites');
    this.originalPrice_txt = page.locator('.discounted').filter({ has: this.unitPrice_txt });
    this.offerPrice_txt = page.getByTestId('offer-price');
    this.durationHandle_input = page.locator('.ngx-slider-pointer-min');
    this.duration_txt = page.locator('#duration');
    this.totalPrice_txt = page.locator('#total-price');
    this.relatedProductImages_list = page.locator('.card img[src*="assets/img/products/"]');
    this.productImagesWithoutAlt_list = page.locator('img[src*="assets/img/products/"]:not([alt]), img[src*="assets/img/products/"][alt=""]');
  }

  /** The quantity input, found by its accessible name. */
  private namedQuantity_input(accessibleName: string): Locator {
    return this.quantity_input.and(this.page.getByRole('spinbutton', { name: accessibleName }));
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

  async addToFavorites() {
    await step('Click Add to favourites on the product detail page', async () => {
      await this.addToFavorites_button.click();
    });
  }

  /** Moves the rental duration handle with the keyboard, one hour per key press, up from 1 hour. */
  async setRentalDuration(hours: number) {
    await step(`Set the rental duration to ${hours} hour(s)`, async () => {
      await this.durationHandle_input.press('Home');
      for (let press = 1; press < hours; press++) await this.durationHandle_input.press('ArrowRight');
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

  async verifyDiscountedPrice(expected: { originalPrice: string; discountedPrice: string }) {
    await step(`Verify the page shows ${expected.originalPrice} struck through and ${expected.discountedPrice}`, async () => {
      await expectToHaveText('the original price', this.unitPrice_txt, expected.originalPrice);
      await expectToHaveCSS('the original price', this.originalPrice_txt, 'text-decoration-line', 'line-through');
      await expectToHaveText('the discounted price', this.offerPrice_txt, expected.discountedPrice);
    });
  }

  async verifyOutOfStock(expectedText: string, expectedColor: string) {
    await step(`Verify the page shows ${expectedText} in red and Add to cart is disabled`, async () => {
      await expectToHaveText('the out-of-stock marker', this.outOfStock_msg, expectedText);
      await expectToHaveCSS('the out-of-stock marker', this.outOfStock_msg, 'color', expectedColor);
      await expectToBeDisabled('the Add to cart button', this.addToCart_button);
    });
  }

  /** Messages disappear after about 3 seconds, so check right after the action; the absence of an error proves nothing later on. */
  async verifyMessage(expectedMessage: string) {
    await step(`Verify the message is shown: ${expectedMessage}`, async () => {
      await expectToHaveText('the message', this.toast_msg, expectedMessage);
    });
  }

  /** The slider is there first, so the absent plus and minus buttons are a real observation. */
  async verifyRentalDurationSlider(expected: { minimum: string; maximum: string }) {
    await step(`Verify a duration slider from ${expected.minimum} to ${expected.maximum} hours replaces the plus and minus buttons`, async () => {
      await expectToBeVisible('the duration slider', this.durationHandle_input);
      await expectToHaveAttribute('the duration slider', this.durationHandle_input, 'aria-valuemin', expected.minimum);
      await expectToHaveAttribute('the duration slider', this.durationHandle_input, 'aria-valuemax', expected.maximum);
      await expectToBeHidden('the increase quantity (+) button', this.increaseQuantity_button);
      await expectToBeHidden('the decrease quantity (-) button', this.decreaseQuantity_button);
    });
  }

  /** The duration is checked first, so the total cannot match a duration the slider has not reached. */
  async verifyRentalTotal(hourlyRate: number, hours: number) {
    const expectedTotal = (hourlyRate * hours).toFixed(2);
    await step(`Verify the total for ${hours} hour(s) at ${hourlyRate} per hour is ${expectedTotal}`, async () => {
      await expectToHaveText('the duration', this.duration_txt, String(hours));
      await expectToHaveText('the total price', this.totalPrice_txt, expectedTotal);
    });
  }

  async verifyQuantityHasAccessibleLabel(expectedLabel: string) {
    await step(`Verify the quantity input is labelled for assistive technology: ${expectedLabel}`, async () => {
      await expectToBeVisible('the quantity input', this.quantity_input);
      await expectToBeVisible(`the quantity input named ${expectedLabel}`, this.namedQuantity_input(expectedLabel));
    });
  }

  /** The related products render later, so one of them must be there before the images are counted. */
  async verifyProductImagesHaveAltText() {
    await step('Verify every product image has alt text', async () => {
      await expectToBeVisible('the first related product image', this.relatedProductImages_list.first());
      await expectToHaveCount('the product images without alt text', this.productImagesWithoutAlt_list, 0, 'image');
    });
  }

  async verifyQuantity(expectedQuantity: string) {
    await step(`Verify the quantity input shows: ${expectedQuantity}`, async () => {
      await expectToHaveValue('the quantity input', this.quantity_input, expectedQuantity);
    });
  }
}
