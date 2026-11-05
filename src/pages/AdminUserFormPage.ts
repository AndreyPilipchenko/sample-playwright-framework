import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectNotToBeChecked, expectToBeChecked, expectToHaveValue } from '../utils/Expects';

/** Admin user form (`#/admin/users/edit/{id}`). Requires a signed-in admin session. */
export class AdminUserFormPage {
  readonly page: Page;

  // Locators
  private readonly firstName_input: Locator;
  private readonly lastName_input: Locator;
  private readonly email_input: Locator;
  private readonly enabled_checkbox: Locator;
  private readonly save_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstName_input = page.getByTestId('first-name');
    this.lastName_input = page.getByTestId('last-name');
    this.email_input = page.getByTestId('email');
    this.enabled_checkbox = page.getByTestId('enabled');
    this.save_button = page.getByTestId('user-submit');
  }

  ///// Actions

  async changeFirstName(firstName: string) {
    await step(`Change the first name to ${firstName}`, async () => {
      await this.firstName_input.fill(firstName);
    });
  }

  async setEnabled(enabled: boolean) {
    await step(`Set Enabled to ${enabled}`, async () => {
      await this.enabled_checkbox.setChecked(enabled);
    });
  }

  /** Saves and waits for the update call to finish, so the next step sees the stored record. */
  async save() {
    await step('Click Save on the user form', async () => {
      const saved = this.page.waitForResponse((response) => response.request().method() === 'PUT' && /\/users\/\d+$/.test(response.url()));
      await this.save_button.click();
      await saved;
    });
  }

  ///// Validations

  async verifyUserLoaded(firstName: string, lastName: string, email: string) {
    await step('Verify the user form shows the user\'s name and email', async () => {
      await expectToHaveValue('the First Name field', this.firstName_input, firstName);
      await expectToHaveValue('the Last Name field', this.lastName_input, lastName);
      await expectToHaveValue('the Email field', this.email_input, email);
    });
  }

  async verifyEnabled() {
    await step('Verify the user is enabled', async () => {
      await expectToBeChecked('the Enabled checkbox', this.enabled_checkbox);
    });
  }

  async verifyDisabled() {
    await step('Verify the user is disabled', async () => {
      await expectNotToBeChecked('the Enabled checkbox', this.enabled_checkbox);
    });
  }
}
