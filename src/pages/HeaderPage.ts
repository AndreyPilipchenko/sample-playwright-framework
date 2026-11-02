import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeVisible } from '../utils/Expects';

// Routeless skeleton area: the navigation bar rendered on every page.
export class HeaderPage {
  readonly page: Page;

  // Locators
  private readonly navHome_link: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navHome_link = page.locator('[data-test="nav-home"]');
  }

  ///// Actions

  async clickHome() {
    await step('Click the Home link in the navigation bar', async () => {
      await this.navHome_link.click();
    });
  }

  ///// Validations

  async verifyNavigationVisible() {
    await step('Verify the navigation bar is visible', async () => {
      await expectToBeVisible('the Home navigation link', this.navHome_link);
    });
  }
}
