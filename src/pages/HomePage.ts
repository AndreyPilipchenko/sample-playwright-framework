import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToHaveTitle, expectToBeVisible, expectToBeAtLeast } from '../utils/Expects';

export class HomePage {
  readonly page: Page;
  readonly url: string = applications.app.url;

  // Locators
  private readonly productCards_list: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productCards_list = page.getByTestId(/^product-/).filter({ has: page.getByTestId('product-name') });
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Home Page', async () => {
      await this.page.goto(this.url);
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
}
