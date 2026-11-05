import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectToBeVisible, expectToHaveText, expectToHaveURL } from '../utils/Expects';

export class LoginPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/auth/login`;

  // Locators
  private readonly email_input: Locator;
  private readonly password_input: Locator;
  private readonly login_button: Locator;
  private readonly loginError_txt: Locator;
  private readonly emailError_txt: Locator;
  private readonly passwordError_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email_input = page.getByTestId('email');
    this.password_input = page.getByTestId('password');
    this.login_button = page.getByTestId('login-submit');
    this.loginError_txt = page.getByTestId('login-error');
    // Never rendered by the with-bugs build (it does not validate the form); ids from the defect-free upstream
    // source, see docs/test-cases.md §11.
    this.emailError_txt = page.getByTestId('email-error');
    this.passwordError_txt = page.getByTestId('password-error');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to Login Page', async () => {
      await this.page.goto(this.url);
    });
  }

  /** Signs in once. Credentials and account identifiers never appear in the step title. */
  async login(email: string, password: string) {
    await step('Log in with the supplied account', async () => {
      await this.email_input.fill(email);
      await this.password_input.fill(password);
      await this.login_button.click();
    });
  }

  ///// Validations

  async verifyPageOpened() {
    await step('Verify the login page is open', async () => {
      await expectToHaveURL(this.page, this.url);
    });
  }

  async verifyEmailAndPasswordFieldsShown() {
    await step('Verify the login form shows the email and password fields', async () => {
      await expectToBeVisible('the email field', this.email_input);
      await expectToBeVisible('the password field', this.password_input);
    });
  }

  async verifyEmailAndPasswordRequired(expectedEmailError: string, expectedPasswordError: string) {
    await step('Verify the empty email and password are flagged as required', async () => {
      await expectToHaveText('the email error', this.emailError_txt, expectedEmailError);
      await expectToHaveText('the password error', this.passwordError_txt, expectedPasswordError);
    });
  }

  async verifyLoginError(expectedMessage: string) {
    await step('Verify the login error is shown', async () => {
      await expectToHaveText('the login error', this.loginError_txt, expectedMessage);
    });
  }
}
