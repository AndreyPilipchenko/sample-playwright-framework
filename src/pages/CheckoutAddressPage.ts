import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeDisabled, expectToBeVisible, expectToHaveText } from '../utils/Expects';

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

  async verifyRequiredFieldError(expectedMessage: string) {
    await step('Verify the missing required field is flagged', async () => {
      await expectToHaveText('the required field error', this.fieldError_txt, expectedMessage);
    });
  }

  async verifyProceedDisabled() {
    await step('Verify the Proceed button is disabled', async () => {
      await expectToBeDisabled('the Proceed to checkout button', this.proceed_button);
    });
  }
}
