import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeVisible, expectToHaveText } from '../utils/Expects';

// Routeless skeleton area: the navigation bar rendered on every page.
export class HeaderPage {
  readonly page: Page;

  // Locators
  private readonly navHome_link: Locator;
  /** The signed-in account menu — `nav-user-menu` for customers, `nav-admin-menu` for admins. */
  private readonly accountMenu_button: Locator;
  /** The item count badge on the cart link. */
  private readonly cartQuantity_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navHome_link = page.getByTestId('nav-home');
    this.accountMenu_button = page.getByTestId('nav-user-menu').or(page.getByTestId('nav-admin-menu'));
    this.cartQuantity_txt = page.getByTestId('cart-quantity');
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

  async verifySignedIn() {
    await step('Verify the user is signed in', async () => {
      await expectToBeVisible('the signed-in account menu', this.accountMenu_button);
    });
  }

  async verifyCartItemCount(expectedCount: string) {
    await step(`Verify the cart badge shows ${expectedCount} item(s)`, async () => {
      await expectToHaveText('the cart item count', this.cartQuantity_txt, expectedCount);
    });
  }
}
