import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import {
  expectNotToBeChecked,
  expectNotToHaveTexts,
  expectToBeChecked,
  expectToBeHidden,
  expectToHaveAttribute,
  expectToHaveCSS,
  expectToHaveValue,
  expectToHaveTitle,
  expectToHaveText,
  expectToHaveURL,
  expectToBeVisible,
  expectToContainText,
  expectNotToHaveCount,
  expectToHaveMatchingCount,
  expectTextsToContainAll,
  expectTextsToEqualInAnyOrder,
} from '../utils/Expects';

export class HomePage {
  readonly page: Page;
  readonly url: string = applications.app.url;

  // Locators
  private readonly productCards_list: Locator;
  private readonly productNames_list: Locator;
  private readonly searchQuery_input: Locator;
  private readonly searchSubmit_button: Locator;
  private readonly searchCaption_txt: Locator;
  private readonly sort_dropdown: Locator;
  private readonly minPrice_input: Locator;
  private readonly maxPrice_input: Locator;
  private readonly pagination_list: Locator;
  private readonly currentPage_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productCards_list = page.getByTestId(/^product-/).filter({ has: page.getByTestId('product-name') });
    this.productNames_list = this.productCards_list.getByTestId('product-name');
    this.searchQuery_input = page.getByTestId('search-query');
    this.searchSubmit_button = page.getByTestId('search-submit');
    this.searchCaption_txt = page.getByTestId('search-caption');
    this.sort_dropdown = page.getByTestId('sort');
    this.minPrice_input = page.locator('.ngx-slider-pointer-min');
    this.maxPrice_input = page.locator('.ngx-slider-pointer-max');
    this.pagination_list = page.getByRole('navigation', { name: 'Pagination' });
    this.currentPage_txt = this.pagination_list.locator('li.current');
  }

  /** The product card whose name is exactly `productName`. */
  private productCard_link(productName: string): Locator {
    return this.productCards_list.filter({
      has: this.page.getByTestId('product-name').and(this.page.getByText(productName, { exact: true })),
    });
  }

  /** The category filter checkbox labelled exactly `categoryName`. */
  private category_checkbox(categoryName: string): Locator {
    return this.page.getByLabel(categoryName, { exact: true });
  }

  /** The brand filter checkbox labelled exactly `brandName`. */
  private brand_checkbox(brandName: string): Locator {
    return this.page.getByLabel(brandName, { exact: true });
  }

  /** The price on the card of `productName`; the original price once the product is discounted. */
  private cardPrice_txt(productName: string): Locator {
    return this.productCard_link(productName).getByTestId('product-price');
  }

  private cardDiscountPrice_txt(productName: string): Locator {
    return this.productCard_link(productName).getByTestId('product-discount-price');
  }

  private cardOutOfStock_msg(productName: string): Locator {
    return this.productCard_link(productName).getByTestId('out-of-stock');
  }

  /** The link to page `pageNumber` in the pagination. */
  private pageNumber_link(pageNumber: string): Locator {
    return this.pagination_list.locator('a').filter({ hasText: new RegExp(`^\\s*page\\s*${pageNumber}\\s*$`) });
  }

  private cardName_txt(card: Locator): Locator {
    return card.getByTestId('product-name');
  }

  private cardImage_img(card: Locator): Locator {
    return card.locator('img');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Home Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async clickProductCard(productName: string) {
    await step(`Click the product card: ${productName}`, async () => {
      await this.productCard_link(productName).click();
    });
  }

  async searchFor(query: string) {
    await step(`Search the products for: ${query}`, async () => {
      await this.searchQuery_input.fill(query);
      await this.searchSubmit_button.click();
    });
  }

  async sortBy(optionLabel: string) {
    await step(`Sort the products by: ${optionLabel}`, async () => {
      await this.sort_dropdown.selectOption({ label: optionLabel });
    });
  }

  /**
   * Moves both price slider handles with the keyboard, one step per key press: the left handle up from 0, the right
   * handle down from the top of the scale. The grid reloads after every press, so the last one decides.
   */
  async setPriceRange(minimum: number, maximum: number, scaleMaximum: number = 200) {
    await step(`Set the price range to ${minimum} - ${maximum}`, async () => {
      await this.minPrice_input.press('Home');
      for (let press = 0; press < minimum; press++) await this.minPrice_input.press('ArrowRight');
      await this.maxPrice_input.press('End');
      for (let press = 0; press < scaleMaximum - maximum; press++) await this.maxPrice_input.press('ArrowLeft');
    });
  }

  async filterByCategory(categoryName: string) {
    await step(`Filter the products by category: ${categoryName}`, async () => {
      await this.category_checkbox(categoryName).check();
    });
  }

  async filterByBrand(brandName: string) {
    await step(`Filter the products by brand: ${brandName}`, async () => {
      await this.brand_checkbox(brandName).check();
    });
  }

  async goToPage(pageNumber: string) {
    await step(`Go to page ${pageNumber} of the products`, async () => {
      await this.pageNumber_link(pageNumber).click();
    });
  }

  /** The names on the grid once it has rendered. */
  async readProductNames(): Promise<string[]> {
    return await step('Read the product names on the grid', async () => {
      await this.productNames_list.first().waitFor();
      return (await this.productNames_list.allInnerTexts()).map((name) => name.trim());
    });
  }

  ///// Validations

  async verifyPageTitle(expectedTitle: string | RegExp) {
    await step(`Verify the home page title: ${expectedTitle}`, async () => {
      await expectToHaveTitle(this.page, expectedTitle);
    });
  }

  async verifyProductCatalogVisible() {
    await step('Verify the product catalog shows a product', async () => {
      await expectToBeVisible('the first product card', this.productCards_list.first());
    });
  }

  /** Images load lazily, so each card is scrolled into view before its image is judged. */
  async verifyEveryProductCardShowsImageNameAndPrice() {
    await step('Verify every product card shows an image, a name and a price', async () => {
      await expectToBeVisible('the first product card', this.productCards_list.first());
      await expectToHaveMatchingCount('the product names', this.productNames_list.filter({ hasText: /\S/ }), this.productCards_list, 'product');
      await expectToHaveMatchingCount('the product prices', this.productCards_list.getByTestId('product-price').filter({ hasText: /\$\d+\.\d{2}/ }), this.productCards_list, 'product');
      for (const card of await this.productCards_list.all()) {
        await card.scrollIntoViewIfNeeded();
        await expectToBeVisible(`the image of ${await this.cardName_txt(card).innerText()}`, this.cardImage_img(card));
      }
    });
  }

  /**
   * The caption appears before the grid re-renders, so it is not the gate. The grid must
   * be non-empty first (an empty grid would trivially "match"), then the matching and
   * total counts are re-read together until they agree — they never do on an unfiltered grid.
   */
  async verifyOnlyProductsMatchingSearchShown(query: string) {
    await step(`Verify the grid shows only products whose name contains: ${query}`, async () => {
      await expectToContainText('the search caption', this.searchCaption_txt, query);
      await expectNotToHaveCount('the product names shown', this.productNames_list, 0, 'product');
      await expectToHaveMatchingCount(`the product names containing "${query}"`, this.productNames_list.filter({ hasText: query }), this.productNames_list, 'product');
    });
  }

  /** The grid lists exactly these products, in this order. */
  async verifyProductNamesInOrder(expectedNames: string[]) {
    await step(`Verify the grid lists the products in this order: ${expectedNames.join(', ')}`, async () => {
      await expectToHaveText('the product names shown', this.productNames_list, expectedNames);
    });
  }

  /** Order-insensitive: the grid and the expected list may sort differently. */
  async verifyProductNamesShown(expectedNames: string[]) {
    await step(`Verify the grid shows exactly the products: ${expectedNames.join(', ')}`, async () => {
      await expectTextsToEqualInAnyOrder('the product names shown', this.productNames_list, expectedNames);
    });
  }

  /** Arrival first, then content: the grid is only shown on the home route. */
  async verifyHomePageOpened() {
    await step('Verify the home page opened with the product catalog', async () => {
      await expectToHaveURL(this.page, new RegExp(`^${this.url}/?(#/?)?$`));
      await expectToBeVisible('the first product card', this.productCards_list.first());
    });
  }

  async verifyPaginationDisplayed(nextPage: string) {
    await step(`Verify the pagination is displayed with a link to page ${nextPage}`, async () => {
      await expectToBeVisible('the pagination', this.pagination_list);
      await expectToBeVisible(`the link to page ${nextPage}`, this.pageNumber_link(nextPage));
    });
  }

  /** The grid has moved on from `previousNames`, and the pagination says which page it is on. */
  async verifyPageShown(pageNumber: string, previousNames: string[]) {
    await step(`Verify the grid shows page ${pageNumber}, with other products than before`, async () => {
      await expectToContainText('the current page', this.currentPage_txt, pageNumber);
      await expectNotToHaveTexts('the product names shown', this.productNames_list, previousNames);
      await expectToBeVisible('the first product name', this.productNames_list.first());
    });
  }

  /** The page sets the caption as soon as it accepts a search, so no caption and the same grid mean it was refused. */
  async verifySearchRejected(unchangedNames: string[]) {
    await step('Verify the search was not carried out', async () => {
      await expectToBeHidden('the search caption', this.searchCaption_txt);
      await expectToHaveText('the product names shown', this.productNames_list, unchangedNames);
    });
  }

  async verifyCategoryNotChecked(categoryName: string) {
    await step(`Verify the category filter is not checked: ${categoryName}`, async () => {
      await expectNotToBeChecked(`the category filter ${categoryName}`, this.category_checkbox(categoryName));
    });
  }

  async verifyBrandNotChecked(brandName: string) {
    await step(`Verify the brand filter is not checked: ${brandName}`, async () => {
      await expectNotToBeChecked(`the brand filter ${brandName}`, this.brand_checkbox(brandName));
    });
  }

  async verifySortNotSelected() {
    await step('Verify no sort option is selected', async () => {
      await expectToHaveValue('the sort dropdown', this.sort_dropdown, '');
    });
  }

  async verifyCategoryChecked(categoryName: string) {
    await step(`Verify the category filter is checked: ${categoryName}`, async () => {
      await expectToBeChecked(`the category filter ${categoryName}`, this.category_checkbox(categoryName));
    });
  }

  async verifyPriceRange(expected: { minimum: string; maximum: string; scaleMaximum: string }) {
    await step(`Verify the price range is ${expected.minimum} - ${expected.maximum} on a scale up to ${expected.scaleMaximum}`, async () => {
      await expectToHaveAttribute('the lower price handle', this.minPrice_input, 'aria-valuenow', expected.minimum);
      await expectToHaveAttribute('the upper price handle', this.maxPrice_input, 'aria-valuenow', expected.maximum);
      await expectToHaveAttribute('the top of the price scale', this.maxPrice_input, 'aria-valuemax', expected.scaleMaximum);
    });
  }

  async verifyProductCardDiscounted(productName: string, expected: { originalPrice: string; discountedPrice: string }) {
    await step(`Verify the card of ${productName} shows ${expected.originalPrice} struck through and ${expected.discountedPrice}`, async () => {
      await expectToHaveText('the original price on the card', this.cardPrice_txt(productName), expected.originalPrice);
      await expectToHaveCSS('the original price on the card', this.cardPrice_txt(productName), 'text-decoration-line', 'line-through');
      await expectToHaveText('the discounted price on the card', this.cardDiscountPrice_txt(productName), expected.discountedPrice);
    });
  }

  async verifyProductCardOutOfStock(productName: string, expectedText: string) {
    await step(`Verify the card of ${productName} shows: ${expectedText}`, async () => {
      await expectToHaveText('the out-of-stock marker on the card', this.cardOutOfStock_msg(productName), expectedText);
    });
  }

  /** The card is there first, so the absent marker is a real observation. */
  async verifyProductCardInStock(productName: string) {
    await step(`Verify the card of ${productName} shows no out-of-stock marker`, async () => {
      await expectToBeVisible(`the card of ${productName}`, this.productCard_link(productName));
      await expectToBeHidden('the out-of-stock marker on the card', this.cardOutOfStock_msg(productName));
    });
  }

  async verifyProductNamesInclude(knownNames: string[]) {
    await step(`Verify the grid includes the known products: ${knownNames.join(', ')}`, async () => {
      await expectTextsToContainAll('the product names shown', this.productNames_list, knownNames);
    });
  }
}
