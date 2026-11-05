import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import {
  expectToBeAtLeast, expectToBeAtMost, expectToBeHidden, expectToBeVisible, expectToHaveAttribute, expectToHaveText, expectToHaveURL,
  expectToHaveValue,
} from '../utils/Expects';

/** The address part of the profile. */
export interface ProfileAddress {
  address: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
}

/** The profile fields a customer can change. */
export interface ProfileEdit extends ProfileAddress {
  firstName: string;
  lastName: string;
  phone: string;
}

/** Customer profile (`#/account/profile`), including the change password section. Requires a signed-in session. */
export class ProfilePage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/account/profile`;

  // Locators
  private readonly firstName_input: Locator;
  private readonly lastName_input: Locator;
  private readonly email_input: Locator;
  private readonly phone_input: Locator;
  private readonly address_input: Locator;
  private readonly postcode_input: Locator;
  private readonly city_input: Locator;
  private readonly state_input: Locator;
  private readonly country_input: Locator;
  private readonly updateProfile_button: Locator;
  private readonly profileSuccess_txt: Locator;
  private readonly profileError_txt: Locator;
  private readonly currentPassword_input: Locator;
  private readonly newPassword_input: Locator;
  private readonly confirmPassword_input: Locator;
  private readonly changePassword_button: Locator;
  private readonly alert_txt: Locator;
  private readonly successAlert_txt: Locator;
  /** When the change password form was last submitted, to time the automatic logout. */
  private submittedAt = 0;
  /** When the profile form was last submitted, to time the fading of its message. */
  private profileSubmittedAt = 0;

  constructor(page: Page) {
    this.page = page;
    this.firstName_input = page.getByTestId('first-name');
    this.lastName_input = page.getByTestId('last-name');
    this.email_input = page.getByTestId('email');
    this.phone_input = page.getByTestId('phone');
    this.address_input = page.getByTestId('address');
    this.postcode_input = page.getByTestId('postcode');
    this.city_input = page.getByTestId('city');
    this.state_input = page.getByTestId('state');
    this.country_input = page.getByTestId('country');
    this.updateProfile_button = page.getByTestId('update-profile-submit');
    // The profile message sits beside its own submit button, inside the profile section.
    const profileSection = this.updateProfile_button.locator('xpath=..');
    this.profileSuccess_txt = profileSection.locator('.alert-success');
    this.profileError_txt = profileSection.locator('.alert-danger');
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

  /** Replaces every editable field and submits the profile form. */
  async updateProfile(edit: ProfileEdit) {
    await step('Update the profile', async () => {
      await this.firstName_input.fill(edit.firstName);
      await this.lastName_input.fill(edit.lastName);
      await this.phone_input.fill(edit.phone);
      await this.fillAddress(edit);
      this.profileSubmittedAt = Date.now();
      await this.updateProfile_button.click();
    });
  }

  /** Replaces only the address fields and submits the profile form. */
  async updateAddress(address: ProfileAddress) {
    await step('Update the address in the profile', async () => {
      await this.fillAddress(address);
      this.profileSubmittedAt = Date.now();
      await this.updateProfile_button.click();
    });
  }

  private async fillAddress(address: ProfileAddress) {
    await this.address_input.fill(address.address);
    await this.postcode_input.fill(address.postcode);
    await this.city_input.fill(address.city);
    await this.state_input.fill(address.state);
    await this.country_input.fill(address.country);
  }

  async reload() {
    await step('Reload the profile page', async () => {
      await this.page.reload();
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

  /** The saved profile has loaded once the read-only email shows; edit cases wait for it so a late load cannot overwrite what they type. */
  async verifyProfileLoaded(email: string) {
    await step('Verify the profile has loaded', async () => {
      await expectToHaveValue('the Email field', this.email_input, email);
    });
  }

  async verifyAccountDetails(expected: ProfileEdit & { email: string }) {
    await step('Verify the profile shows the current account details', async () => {
      await expectToHaveValue('the First Name field', this.firstName_input, expected.firstName);
      await expectToHaveValue('the Last Name field', this.lastName_input, expected.lastName);
      await expectToHaveValue('the Email field', this.email_input, expected.email);
      await expectToHaveValue('the Phone field', this.phone_input, expected.phone);
      await this.verifyAddress(expected);
    });
  }

  /** Every field the update changed shows its new value. */
  async verifyEditSaved(expected: ProfileEdit) {
    await step('Verify the updated profile values are stored', async () => {
      await expectToHaveValue('the First Name field', this.firstName_input, expected.firstName);
      await expectToHaveValue('the Last Name field', this.lastName_input, expected.lastName);
      await expectToHaveValue('the Phone field', this.phone_input, expected.phone);
      await this.verifyAddress(expected);
    });
  }

  async verifyNames(firstName: string, lastName: string) {
    await step('Verify First Name and Last Name show in their own fields', async () => {
      await expectToHaveValue('the First Name field', this.firstName_input, firstName);
      await expectToHaveValue('the Last Name field', this.lastName_input, lastName);
    });
  }

  async verifyAddress(expected: ProfileAddress) {
    await step('Verify the address fields show the stored values', async () => {
      await expectToHaveValue('the Address field', this.address_input, expected.address);
      await expectToHaveValue('the Postcode field', this.postcode_input, expected.postcode);
      await expectToHaveValue('the City field', this.city_input, expected.city);
      await expectToHaveValue('the State field', this.state_input, expected.state);
      await expectToHaveValue('the Country field', this.country_input, expected.country);
    });
  }

  async verifyProfileUpdated(expectedMessage: string) {
    await step('Verify the profile update is confirmed', async () => {
      await expectToHaveText('the profile update message', this.profileSuccess_txt, expectedMessage);
    });
  }

  /** The confirmation fades about 5 seconds after submitting; the window comes from the test data. */
  async verifyProfileMessageFades(window: { minSeconds: number; maxSeconds: number }) {
    await step('Verify the profile message fades after about 5 seconds', async () => {
      await expectToBeHidden('the profile update message', this.profileSuccess_txt);
      const seconds = (Date.now() - this.profileSubmittedAt) / 1000;
      expectToBeAtLeast('the seconds from submit to the message fading', seconds, window.minSeconds);
      expectToBeAtMost('the seconds from submit to the message fading', seconds, window.maxSeconds);
    });
  }

  /** No error shows after an update; call it after the success message so it cannot pass before the response arrives. */
  async verifyNoProfileError() {
    await step('Verify the profile update raised no error', async () => {
      await expectToBeHidden('the profile error', this.profileError_txt);
    });
  }

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
