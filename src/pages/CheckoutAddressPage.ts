import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { byBuild } from '../utils/AppEnvironment';
import { expectToBeDisabled, expectToBeVisible, expectToHaveText, expectToHaveValue } from '../utils/Expects';
import { waitUntilFilled } from '../utils/Waits';

/** The billing address values typed on the step. */
export interface BillingAddress {
  /** The street line: the Address field on the with-bugs build, the Street field on the fixed build. */
  address: string;
  /** The fixed build's House number field, which it requires; the with-bugs build has none. */
  houseNumber?: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

/**
 * Checkout step 3: the billing address (`/checkout`). A signed-in user's saved address is prefilled. The fixed
 * build names the fields Street and Postal code, adds a House number, makes the country a dropdown, and fills
 * street, city and state from a postcode lookup once country, postal code and house number are in
 * (docs/app-versions.md, B3).
 */
export class CheckoutAddressPage {
  readonly page: Page;

  // Locators
  private readonly address_input: Locator;
  private readonly city_input: Locator;
  private readonly state_input: Locator;
  private readonly country_input: Locator;
  private readonly postcode_input: Locator;
  private readonly houseNumber_input: Locator;
  private readonly proceed_button: Locator;
  private readonly fieldError_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.address_input = page.getByTestId(byBuild({ fixed: 'street', default: 'address' }));
    this.city_input = page.getByTestId('city');
    this.state_input = page.getByTestId('state');
    this.country_input = page.getByTestId('country');
    this.postcode_input = page.getByTestId(byBuild({ fixed: 'postal_code', default: 'postcode' }));
    this.houseNumber_input = page.getByTestId('house_number');
    this.proceed_button = page.getByTestId('proceed-3');
    this.fieldError_txt = page.locator('.alert-danger');
  }

  ///// Actions

  /** Types every address field, replacing what is prefilled. */
  async enterAddress(billing: BillingAddress) {
    await step('Enter the billing address', async () => {
      await byBuild({ fixed: () => this.enterLookedUpAddress(billing), default: () => this.enterEachField(billing) })();
    });
  }

  /** The with-bugs build: every field is a text input. */
  private async enterEachField(billing: BillingAddress) {
    await this.address_input.fill(billing.address);
    await this.city_input.fill(billing.city);
    await this.state_input.fill(billing.state);
    await this.country_input.fill(billing.country);
    await this.postcode_input.fill(billing.postcode);
  }

  /**
   * The fixed build: the country (a dropdown, by its code), postal code and house number first, then the street,
   * city and state the lookup filled in are replaced with the given ones, once the lookup has filled them.
   */
  private async enterLookedUpAddress(billing: BillingAddress) {
    await this.country_input.selectOption(billing.country);
    await this.postcode_input.fill(billing.postcode);
    await this.houseNumber_input.fill(billing.houseNumber ?? '');
    await this.houseNumber_input.blur();
    await waitUntilFilled(this.city_input);
    await this.address_input.fill(billing.address);
    await this.city_input.fill(billing.city);
    await this.state_input.fill(billing.state);
  }

  async clearAddressField() {
    await step('Clear the Address field', async () => {
      await this.address_input.fill('');
      await this.address_input.press('Tab');
    });
  }

  async proceed() {
    await step('Click Proceed to checkout on the billing address step', async () => {
      await this.proceed_button.click();
    });
  }

  ///// Validations

  async verifyAddressStepShown() {
    await step('Verify the billing address step is shown', async () => {
      await expectToBeVisible('the Address field', this.address_input);
    });
  }

  /**
   * The saved address loads after the step opens and overwrites whatever was typed or cleared before it
   * arrives, so callers wait for it first.
   */
  async verifySavedAddressPrefilled(expectedAddress: string) {
    await step('Verify the saved address is prefilled', async () => {
      await expectToHaveValue('the Address field', this.address_input, expectedAddress);
    });
  }

  /** Every required field is shown; the postcode must show the saved postcode, not a placeholder text. */
  async verifyRequiredAddressFieldsShown(savedPostcode: string) {
    await step('Verify every required address field is shown and the postcode holds the saved value', async () => {
      await expectToBeVisible('the Address field', this.address_input);
      await expectToBeVisible('the City field', this.city_input);
      await expectToBeVisible('the State field', this.state_input);
      await expectToBeVisible('the Country field', this.country_input);
      await expectToBeVisible('the Postcode field', this.postcode_input);
      await expectToHaveValue('the Postcode field', this.postcode_input, savedPostcode);
    });
  }

  async verifyRequiredFieldError(expectedMessage: string) {
    await step('Verify the missing required field is flagged', async () => {
      await expectToHaveText('the required field error', this.fieldError_txt, expectedMessage);
    });
  }

  async verifyProceedText(expectedText: string) {
    await step(`Verify the Proceed button reads: ${expectedText}`, async () => {
      await expectToHaveText('the Proceed to checkout button', this.proceed_button, expectedText);
    });
  }

  async verifyProceedDisabled() {
    await step('Verify the Proceed button is disabled', async () => {
      await expectToBeDisabled('the Proceed to checkout button', this.proceed_button);
    });
  }
}
