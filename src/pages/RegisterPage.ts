import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';

/** The values typed on the registration form. */
export interface RegistrationForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  postcode: string;
  city: string;
  state: string;
  /** The country as the dropdown lists it, e.g. "Netherlands (the)". */
  country: string;
  phone: string;
  email: string;
  password: string;
}

/** Customer registration (`#/auth/register`). */
export class RegisterPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/auth/register`;

  // Locators
  private readonly firstName_input: Locator;
  private readonly lastName_input: Locator;
  private readonly dateOfBirth_input: Locator;
  private readonly address_input: Locator;
  private readonly postcode_input: Locator;
  private readonly city_input: Locator;
  private readonly state_input: Locator;
  private readonly country_dropdown: Locator;
  private readonly phone_input: Locator;
  private readonly email_input: Locator;
  private readonly password_input: Locator;
  private readonly register_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstName_input = page.getByTestId('first-name');
    this.lastName_input = page.getByTestId('last-name');
    this.dateOfBirth_input = page.getByTestId('dob');
    this.address_input = page.getByTestId('address');
    this.postcode_input = page.getByTestId('postcode');
    this.city_input = page.getByTestId('city');
    this.state_input = page.getByTestId('state');
    this.country_dropdown = page.getByTestId('country');
    this.phone_input = page.getByTestId('phone');
    this.email_input = page.getByTestId('email');
    this.password_input = page.getByTestId('password');
    this.register_button = page.getByTestId('register-submit');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to the Registration Page', async () => {
      await this.page.goto(this.url);
    });
  }

  /** Fills every field and submits. The email and password never appear in the step title. */
  async register(form: RegistrationForm) {
    await step('Register with the supplied details', async () => {
      await this.firstName_input.fill(form.firstName);
      await this.lastName_input.fill(form.lastName);
      await this.dateOfBirth_input.fill(form.dateOfBirth);
      await this.address_input.fill(form.address);
      await this.postcode_input.fill(form.postcode);
      await this.city_input.fill(form.city);
      await this.state_input.fill(form.state);
      // The form only registers the country once the dropdown has been clicked, as a person always does first.
      await this.country_dropdown.click();
      await this.country_dropdown.selectOption({ label: form.country });
      await this.phone_input.fill(form.phone);
      await this.email_input.fill(form.email);
      await this.password_input.fill(form.password);
      await this.register_button.click();
    });
  }
}
