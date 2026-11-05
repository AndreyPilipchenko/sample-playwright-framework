import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeEnabled, expectToBeVisible } from '../utils/Expects';

/** Checkout step 2: the sign-in step (`#/checkout`, shown to a guest after the cart step). Reached by proceeding from the cart. */
export class CheckoutSignInPage {
  readonly page: Page;

  // Locators
  private readonly loginHeading_txt: Locator;
  private readonly email_input: Locator;
  private readonly password_input: Locator;
  private readonly login_button: Locator;
  private readonly proceed_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginHeading_txt = page.getByRole('heading', { name: 'Customer login' });
    this.email_input = page.getByTestId('email');
    this.password_input = page.getByTestId('password');
    this.login_button = page.getByTestId('login-submit');
    this.proceed_button = page.getByTestId('proceed-2');
  }

  ///// Actions

  /** Signs in on the step. Credentials and account identifiers never appear in the step title. */
  async login(email: string, password: string) {
    await step('Log in with the supplied account on the checkout sign-in step', async () => {
      await this.email_input.fill(email);
      await this.password_input.fill(password);
      await this.login_button.click();
    });
  }

  async proceed() {
    await step('Click Proceed to checkout on the sign-in step', async () => {
      await this.proceed_button.click();
    });
  }

  ///// Validations

  async verifyLoginStepShown() {
    await step('Verify the sign-in step shows the customer login form', async () => {
      await expectToBeVisible('the customer login heading', this.loginHeading_txt);
      await expectToBeVisible('the login submit button', this.login_button);
    });
  }

  async verifyEmailPasswordAndSubmitShown() {
    await step('Verify the login step shows the email field, the password field and the submit button', async () => {
      await expectToBeVisible('the email field', this.email_input);
      await expectToBeVisible('the password field', this.password_input);
      await expectToBeVisible('the login submit button', this.login_button);
    });
  }

  async verifyCanProceed() {
    await step('Verify the user can proceed to the next checkout step', async () => {
      await expectToBeEnabled('the Proceed to checkout button', this.proceed_button);
    });
  }
}
