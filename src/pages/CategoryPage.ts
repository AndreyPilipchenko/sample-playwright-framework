import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectNotToHaveCount, expectTextsToContainAll, expectTextsToEqualInAnyOrder, expectToBeHidden, expectToBeVisible, expectToHaveText } from '../utils/Expects';

/** Products of one category (`#/category/<slug>`). */
export class CategoryPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/category`;

  // Locators
  private readonly pageTitle_txt: Locator;
  private readonly notFound_msg: Locator;
  private readonly productNames_list: Locator;
  private readonly categoryFilters_list: Locator;
  private readonly brandFilters_list: Locator;
  private readonly sort_dropdown: Locator;
  private readonly pagination_list: Locator;
  private readonly priceSlider_input: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle_txt = page.getByTestId('page-title');
    this.notFound_msg = page.getByRole('heading', { name: 'Page Not Found' });
    this.productNames_list = page.getByTestId(/^product-\d+$/).getByTestId('product-name');
    this.categoryFilters_list = page.locator('input[name="category_id"]');
    this.brandFilters_list = page.locator('input[name="brand_id"]');
    this.sort_dropdown = page.getByTestId('sort');
    this.pagination_list = page.getByRole('navigation', { name: 'Pagination' });
    this.priceSlider_input = page.locator('.ngx-slider-pointer-min');
  }

  ///// Actions

  async navigate(categorySlug: string) {
    await step(`Navigate to the category page: ${categorySlug}`, async () => {
      await this.page.goto(`${this.url}/${encodeURIComponent(categorySlug)}`);
    });
  }

  ///// Validations

  /** The title changes at once and the previous grid stays until the new one arrives, so a known product proves the arrival. */
  async verifyCategoryOpened(expectedTitle: string, knownProduct: string) {
    await step(`Verify the category page opened: ${expectedTitle}, listing ${knownProduct}`, async () => {
      await expectToHaveText('the page title', this.pageTitle_txt, expectedTitle);
      await expectTextsToContainAll('the product names shown', this.productNames_list, [knownProduct]);
    });
  }

  async verifyProductNamesShown(expectedNames: string[]) {
    await step(`Verify the category page shows exactly the products: ${expectedNames.join(', ')}`, async () => {
      await expectTextsToEqualInAnyOrder('the product names shown', this.productNames_list, expectedNames);
    });
  }

  /** The filter set of story AC2, with the price slider last so a missing slider does not hide the others. */
  async verifyFiltersAvailable() {
    await step('Verify the category, brand, sort, pagination and price filters are available', async () => {
      await expectNotToHaveCount('the category checkboxes', this.categoryFilters_list, 0, 'checkbox');
      await expectNotToHaveCount('the brand checkboxes', this.brandFilters_list, 0, 'checkbox');
      await expectToBeVisible('the sort dropdown', this.sort_dropdown);
      await expectToBeVisible('the pagination', this.pagination_list);
      await expectToBeVisible('the price range slider', this.priceSlider_input);
    });
  }

  /** Title first: the route has rendered something, so the absent 404 heading is a real observation. */
  async verifyResolvedWithoutNotFound(expectedTitle: string) {
    await step(`Verify the category resolves without a 404: ${expectedTitle}`, async () => {
      await expectToHaveText('the page title', this.pageTitle_txt, expectedTitle);
      await expectToBeHidden('the 404 heading', this.notFound_msg);
    });
  }
}
