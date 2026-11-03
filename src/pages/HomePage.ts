import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import {
  expectToHaveTitle,
  expectToBeVisible,
  expectToBeAtLeast,
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

  constructor(page: Page) {
    this.page = page;
    this.productCards_list = page.getByTestId(/^product-/).filter({ has: page.getByTestId('product-name') });
    this.productNames_list = this.productCards_list.getByTestId('product-name');
    this.searchQuery_input = page.getByTestId('search-query');
    this.searchSubmit_button = page.getByTestId('search-submit');
    this.searchCaption_txt = page.getByTestId('search-caption');
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

  async filterByCategory(categoryName: string) {
    await step(`Filter the products by category: ${categoryName}`, async () => {
      await this.category_checkbox(categoryName).check();
    });
  }

  ///// Validations

  async verifyPageTitle(expectedTitle: string | RegExp) {
    await step(`Verify the home page title: ${expectedTitle}`, async () => {
      await expectToHaveTitle(this.page, expectedTitle);
    });
  }

  async verifyProductCatalogVisible(minimumCount: number = 1) {
    await step(`Verify the product catalog shows at least ${minimumCount} product(s)`, async () => {
      await expectToBeVisible('the first product card', this.productCards_list.first());
      expectToBeAtLeast('the number of products shown', await this.productCards_list.count(), minimumCount);
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

  /** Order-insensitive: the grid and the expected list may sort differently. */
  async verifyProductNamesShown(expectedNames: string[]) {
    await step(`Verify the grid shows exactly the products: ${expectedNames.join(', ')}`, async () => {
      await expectTextsToEqualInAnyOrder('the product names shown', this.productNames_list, expectedNames);
    });
  }

  async verifyProductNamesInclude(knownNames: string[]) {
    await step(`Verify the grid includes the known products: ${knownNames.join(', ')}`, async () => {
      await expectTextsToContainAll('the product names shown', this.productNames_list, knownNames);
    });
  }
}
