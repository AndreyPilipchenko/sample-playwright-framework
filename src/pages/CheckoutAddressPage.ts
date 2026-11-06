import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeDisabled, expectToBeVisible, expectToHaveText, expectToHaveValue } from '../utils/Expects';

/** The billing address values typed on the step. */
export interface BillingAddress {
  address: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

/** Checkout step 3: the billing address (`#/checkout`). A signed-in user's saved address is prefilled. */
export class CheckoutAddressPage {
  readonly page: Page;

  // Locators
  private readonly address_input: Locator;
  private readonly city_input: Locator;
  private readonly state_input: Locator;
  private readonly country_input: Locator;
  private readonly postcode_input: Locator;
  private readonly proceed_button: Locator;
  private readonly fieldError_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.address_input = page.getByTestId('address');
    this.city_input = page.getByTestId('city');
    this.state_input = page.getByTestId('state');
    this.country_input = page.getByTestId('country');
    this.postcode_input = page.getByTestId('postcode');
    this.proceed_button = page.getByTestId('proceed-3');
    this.fieldError_txt = page.locator('.alert-danger');
  }

  ///// Actions

  /** Types every address field, replacing what is prefilled. */
  async enterAddress(billing: BillingAddress) {
    await step('Enter the billing address', async () => {
      await this.address_input.fill(billing.address);
      await this.city_input.fill(billing.city);
      await this.state_input.fill(billing.state);
      await this.country_input.fill(billing.country);
      await this.postcode_input.fill(billing.postcode);
    });
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
