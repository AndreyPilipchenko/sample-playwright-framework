import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeVisible, expectToHaveCount, expectToHaveText } from '../utils/Expects';
import { rowWithCell } from '../utils/TableRows';

/** Admin user list (`#/admin/users`). Requires a signed-in admin session. */
export class AdminUsersPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/admin/users`;

  // Locators
  private readonly search_input: Locator;
  private readonly search_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.search_input = page.getByTestId('user-search-query');
    this.search_button = page.getByTestId('user-search-submit');
  }

  /** The list row whose Email cell is exactly `email`. */
  private row(email: string): Locator {
    return rowWithCell(this.page, email);
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Admin Users Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async searchUser(query: string) {
    await step(`Search the admin user list for ${query}`, async () => {
      await this.search_input.fill(query);
      await this.search_button.click();
    });
  }

  async openUser(email: string) {
    await step('Open the user for editing', async () => {
      await this.row(email).getByRole('link', { name: 'Edit' }).click();
    });
  }

  async deleteUser(email: string) {
    await step('Delete the user', async () => {
      await this.row(email).getByRole('button', { name: 'Delete' }).click();
    });
  }

  ///// Validations

  async verifyUserListed(email: string, name: string) {
    await step('Verify the user is listed with their name', async () => {
      await expectToBeVisible(`the row of the user ${email}`, this.row(email));
      await expectToHaveText(`the name of the user ${email}`, this.row(email).getByRole('cell').nth(1), name);
    });
  }

  async verifyUserNotListed(email: string) {
    await step('Verify the user is not listed', async () => {
      await expectToHaveCount(`the rows of the user ${email}`, this.row(email), 0, 'row');
    });
  }
}
