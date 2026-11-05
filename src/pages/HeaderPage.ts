import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeVisible, expectToHaveCount, expectToHaveText } from '../utils/Expects';

// Routeless skeleton area: the navigation bar rendered on every page.
export class HeaderPage {
  readonly page: Page;

  // Locators
  private readonly navHome_link: Locator;
  /** The signed-in account menu — `nav-user-menu` for customers, `nav-admin-menu` for admins. */
  private readonly accountMenu_button: Locator;
  /** The item count badge on the cart link. */
  private readonly cartQuantity_txt: Locator;
  private readonly categoriesMenu_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navHome_link = page.getByTestId('nav-home');
    this.accountMenu_button = page.getByTestId('nav-user-menu').or(page.getByTestId('nav-admin-menu'));
    this.cartQuantity_txt = page.getByTestId('cart-quantity');
    this.categoriesMenu_button = page.getByTestId('nav-categories');
  }

  /** The entry labelled exactly `entryName` in the Categories menu. */
  private categoriesEntry_link(entryName: string): Locator {
    return this.page.getByRole('link', { name: entryName, exact: true });
  }

  ///// Actions

  async clickHome() {
    await step('Click the Home link in the navigation bar', async () => {
      await this.navHome_link.click();
    });
  }

  async openCategoriesEntry(entryName: string) {
    await step(`Open ${entryName} from the Categories menu`, async () => {
      await this.categoriesMenu_button.click();
      await this.categoriesEntry_link(entryName).click();
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

  async verifySignedInUserName(expectedName: string) {
    await step(`Verify the header shows the signed-in user: ${expectedName}`, async () => {
      await expectToHaveText('the signed-in account menu', this.accountMenu_button, expectedName);
    });
  }

  async verifyCartItemCount(expectedCount: string) {
    await step(`Verify the cart badge shows ${expectedCount} item(s)`, async () => {
      await expectToHaveText('the cart item count', this.cartQuantity_txt, expectedCount);
    });
  }

  async verifyCartBadgeHidden() {
    await step('Verify the cart shows no item count badge', async () => {
      await expectToHaveCount('the cart item count badge', this.cartQuantity_txt, 0, 'badge');
    });
  }
}
