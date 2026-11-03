import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';

export class LoginPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/auth/login`;

  // Locators
  private readonly email_input: Locator;
  private readonly password_input: Locator;
  private readonly login_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email_input = page.getByTestId('email');
    this.password_input = page.getByTestId('password');
    this.login_button = page.getByTestId('login-submit');
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
}
