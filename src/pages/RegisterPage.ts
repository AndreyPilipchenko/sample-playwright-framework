import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { byBuild } from '../utils/AppEnvironment';
import { addressFieldLocators } from './AddressFields';
import { expectNotToContainText, expectToBeVisible, expectToHaveText } from '../utils/Expects';
import { waitUntilFilled } from '../utils/Waits';

/** The values typed on the registration form. */
export interface RegistrationForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  /** The street line: the Address field on the with-bugs build, the Street field on the fixed build. */
  address: string;
  /** The fixed build's House number field, which it requires; the with-bugs build has none. */
  houseNumber?: string;
  postcode: string;
  city: string;
  state: string;
  /** The country as the dropdown lists it, e.g. "Netherlands (the)". */
  country: string;
  phone: string;
  email: string;
  password: string;
}

/** The label each required registration field must carry. */
export interface RegistrationLabels {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  /** The fixed build only. */
  houseNumber?: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  password: string;
}

/**
 * Customer registration (`/auth/register`). The fixed build names the address fields Street and Postal code,
 * adds a required House number, and fills street, city and state from a postcode lookup once country,
 * postal code and house number are in (docs/app-versions.md, B3).
 */
export class RegisterPage {
  readonly page: Page;
  readonly url: string = `${applications.app.routes}/auth/register`;

  // Locators
  private readonly firstName_input: Locator;
  private readonly lastName_input: Locator;
  private readonly dateOfBirth_input: Locator;
  private readonly address_input: Locator;
  private readonly postcode_input: Locator;
  private readonly houseNumber_input: Locator;
  private readonly city_input: Locator;
  private readonly state_input: Locator;
  private readonly country_dropdown: Locator;
  private readonly phone_input: Locator;
  private readonly email_input: Locator;
  private readonly password_input: Locator;
  private readonly register_button: Locator;
  private readonly registerError_txt: Locator;
  private readonly firstNameLabel_txt: Locator;
  private readonly lastNameLabel_txt: Locator;
  private readonly dateOfBirthLabel_txt: Locator;
  private readonly addressLabel_txt: Locator;
  private readonly postcodeLabel_txt: Locator;
  private readonly houseNumberLabel_txt: Locator;
  private readonly cityLabel_txt: Locator;
  private readonly stateLabel_txt: Locator;
  private readonly countryLabel_txt: Locator;
  private readonly phoneLabel_txt: Locator;
  private readonly emailLabel_txt: Locator;
  private readonly passwordLabel_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstName_input = page.getByTestId('first-name');
    this.lastName_input = page.getByTestId('last-name');
    this.dateOfBirth_input = page.getByTestId('dob');
    ({ address: this.address_input, postcode: this.postcode_input, city: this.city_input, state: this.state_input, country: this.country_dropdown } =
      addressFieldLocators(page));
    this.houseNumber_input = page.getByTestId('house_number');
    this.phone_input = page.getByTestId('phone');
    this.email_input = page.getByTestId('email');
    this.password_input = page.getByTestId('password');
    this.register_button = page.getByTestId('register-submit');
    this.registerError_txt = page.getByTestId('register-error');
    // Each label belongs to the field its `for` attribute names.
    this.firstNameLabel_txt = page.locator('label[for="first_name"]');
    this.lastNameLabel_txt = page.locator('label[for="last_name"]');
    this.dateOfBirthLabel_txt = page.locator('label[for="dob"]');
    this.addressLabel_txt = page.locator(byBuild({ fixed: 'label[for="street"]', default: 'label[for="address"]' }));
    this.postcodeLabel_txt = page.locator(byBuild({ fixed: 'label[for="postal_code"]', default: 'label[for="postcode"]' }));
    this.houseNumberLabel_txt = page.locator('label[for="house_number"]');
    this.cityLabel_txt = page.locator('label[for="city"]');
    this.stateLabel_txt = page.locator('label[for="state"]');
    this.countryLabel_txt = page.locator('label[for="country"]');
    this.phoneLabel_txt = page.locator('label[for="phone"]');
    this.emailLabel_txt = page.locator('label[for="email"]');
    this.passwordLabel_txt = page.locator('label[for="password"]');
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
      await byBuild({ fixed: () => this.fillLookedUpAddress(form), default: () => this.fillAddress(form) })();
      await this.phone_input.fill(form.phone);
      await this.email_input.fill(form.email);
      await this.password_input.fill(form.password);
      await this.register_button.click();
    });
  }

  /** The with-bugs build: each address field, then the country. */
  private async fillAddress(form: RegistrationForm) {
    await this.address_input.fill(form.address);
    await this.postcode_input.fill(form.postcode);
    await this.city_input.fill(form.city);
    await this.state_input.fill(form.state);
    await this.selectCountry(form.country);
  }

  /**
   * The fixed build: country, postal code and house number first, then the street, city and state the form's
   * lookup filled in are replaced with the form's own, once the lookup has filled them (else it could
   * overwrite them afterwards).
   */
  private async fillLookedUpAddress(form: RegistrationForm) {
    await this.selectCountry(form.country);
    await this.postcode_input.fill(form.postcode);
    await this.houseNumber_input.fill(form.houseNumber ?? '');
    await this.houseNumber_input.blur();
    await waitUntilFilled(this.city_input);
    await this.address_input.fill(form.address);
    await this.city_input.fill(form.city);
    await this.state_input.fill(form.state);
  }

  /** The form only registers the country once the dropdown has been clicked, as a person always does first. */
  private async selectCountry(country: string) {
    await this.country_dropdown.click();
    await this.country_dropdown.selectOption({ label: country });
  }

  ///// Validations

  /** The fixed build adds a House number field to the address (docs/app-versions.md, B3); the with-bugs build has none. */
  private async verifyHouseNumberShown(expectedLabel: string | undefined) {
    await byBuild<() => Promise<void>>({
      fixed: async () => {
        await expectToBeVisible('the House number field', this.houseNumber_input);
        await expectToHaveText('the label of the House number field', this.houseNumberLabel_txt, expectedLabel ?? '');
      },
      default: async () => undefined,
    })();
  }

  /** Every required field is shown under its own label. */
  async verifyRequiredFieldsShown(expected: RegistrationLabels) {
    await step('Verify every required registration field is shown with its label', async () => {
      await expectToBeVisible(`the ${expected.firstName} field`, this.firstName_input);
      await expectToHaveText(`the label of the ${expected.firstName} field`, this.firstNameLabel_txt, expected.firstName);
      await expectToBeVisible(`the ${expected.lastName} field`, this.lastName_input);
      await expectToHaveText(`the label of the ${expected.lastName} field`, this.lastNameLabel_txt, expected.lastName);
      await expectToBeVisible(`the ${expected.dateOfBirth} field`, this.dateOfBirth_input);
      await expectToHaveText(`the label of the ${expected.dateOfBirth} field`, this.dateOfBirthLabel_txt, expected.dateOfBirth);
      await expectToBeVisible(`the ${expected.address} field`, this.address_input);
      await expectToHaveText(`the label of the ${expected.address} field`, this.addressLabel_txt, expected.address);
      await expectToBeVisible(`the ${expected.postcode} field`, this.postcode_input);
      await expectToHaveText(`the label of the ${expected.postcode} field`, this.postcodeLabel_txt, expected.postcode);
      await this.verifyHouseNumberShown(expected.houseNumber);
      await expectToBeVisible(`the ${expected.city} field`, this.city_input);
      await expectToHaveText(`the label of the ${expected.city} field`, this.cityLabel_txt, expected.city);
      await expectToBeVisible(`the ${expected.state} field`, this.state_input);
      await expectToHaveText(`the label of the ${expected.state} field`, this.stateLabel_txt, expected.state);
      await expectToBeVisible(`the ${expected.country} field`, this.country_dropdown);
      await expectToHaveText(`the label of the ${expected.country} field`, this.countryLabel_txt, expected.country);
      await expectToBeVisible(`the ${expected.phone} field`, this.phone_input);
      await expectToHaveText(`the label of the ${expected.phone} field`, this.phoneLabel_txt, expected.phone);
      await expectToBeVisible(`the ${expected.email} field`, this.email_input);
      await expectToHaveText(`the label of the ${expected.email} field`, this.emailLabel_txt, expected.email);
      await expectToBeVisible(`the ${expected.password} field`, this.password_input);
      await expectToHaveText(`the label of the ${expected.password} field`, this.passwordLabel_txt, expected.password);
    });
  }

  async verifyRegisterError(expectedMessage: string) {
    await step('Verify the registration error is shown', async () => {
      await expectToHaveText('the registration error', this.registerError_txt, expectedMessage);
    });
  }

  /** The error is shown and does not match the forbidden pattern, ignoring case. */
  async verifyRegisterErrorOmits(forbiddenPattern: string) {
    await step(`Verify the registration error does not reveal: ${forbiddenPattern}`, async () => {
      await expectToBeVisible('the registration error', this.registerError_txt);
      await expectNotToContainText('the registration error', this.registerError_txt, new RegExp(forbiddenPattern, 'i'));
    });
  }
}
