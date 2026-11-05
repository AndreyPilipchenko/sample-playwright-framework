import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeAtLeast, expectToBeAtMost, expectToBeVisible, expectToHaveAttribute, expectToHaveText, expectToHaveURL } from '../utils/Expects';

/** Customer profile (`#/account/profile`), including the change password section. Requires a signed-in session. */
export class ProfilePage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/account/profile`;

  // Locators
  private readonly currentPassword_input: Locator;
  private readonly newPassword_input: Locator;
  private readonly confirmPassword_input: Locator;
  private readonly changePassword_button: Locator;
  private readonly alert_txt: Locator;
  private readonly successAlert_txt: Locator;
  /** When the change password form was last submitted, to time the automatic logout. */
  private submittedAt = 0;

  constructor(page: Page) {
    this.page = page;
    this.currentPassword_input = page.getByTestId('current-password');
    this.newPassword_input = page.getByTestId('new-password');
    this.confirmPassword_input = page.getByTestId('new-password-confirm');
    this.changePassword_button = page.getByTestId('change-password-submit');
    // The message sits beside the submit button, inside the change password section.
    const section = this.changePassword_button.locator('xpath=..');
    this.alert_txt = section.getByRole('alert');
    this.successAlert_txt = section.locator('.alert-success');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to My Profile Page', async () => {
      await this.page.goto(this.url);
    });
  }

  /** Fills the change password form and submits it. The passwords never appear in the step title. */
  async changePassword(currentPassword: string, newPassword: string, confirmation: string) {
    await step('Submit the change password form', async () => {
      await this.currentPassword_input.fill(currentPassword);
      await this.newPassword_input.fill(newPassword);
      await this.confirmPassword_input.fill(confirmation);
      this.submittedAt = Date.now();
      await this.changePassword_button.click();
    });
  }

  ///// Validations

  /** Each field is found by its documented label (exact, case-sensitive). */
  async verifyChangePasswordFieldsShown(labels: { current: string; new: string; confirm: string }) {
    await step('Verify the change password section shows the three fields', async () => {
      for (const label of [labels.current, labels.new, labels.confirm]) {
        await expectToBeVisible(`the "${label}" field`, this.page.getByLabel(label, { exact: true }));
      }
    });
  }

  async verifyChangePasswordFieldsRequired(labels: { current: string; new: string; confirm: string }) {
    await step('Verify the three change password fields are required', async () => {
      for (const label of [labels.current, labels.new, labels.confirm]) {
        await expectToHaveAttribute(`the "${label}" field`, this.page.getByLabel(label, { exact: true }), 'required', '');
      }
    });
  }

  async verifyErrorShown(expectedMessage: string) {
    await step('Verify the change password error is shown', async () => {
      await expectToHaveText('the change password error', this.alert_txt, expectedMessage);
    });
  }

  async verifySuccessMessageShown() {
    await step('Verify the success message is shown', async () => {
      await expectToBeVisible('the success message', this.successAlert_txt);
    });
  }

  /** The app signs the user out about 5 seconds after a successful change; the window comes from the test data. */
  async verifyLoggedOutAfterAbout(window: { minSeconds: number; maxSeconds: number }) {
    await step('Verify the user is logged out to the login page after about 5 seconds', async () => {
      await expectToHaveURL(this.page, `${applications.app.url}/#/auth/login`);
      const seconds = (Date.now() - this.submittedAt) / 1000;
      expectToBeAtLeast('the seconds from submit to logout', seconds, window.minSeconds);
      expectToBeAtMost('the seconds from submit to logout', seconds, window.maxSeconds);
    });
  }
}
