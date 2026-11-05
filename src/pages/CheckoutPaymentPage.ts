import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectToBeVisible, expectToHaveText } from '../utils/Expects';

/** Checkout step 4: the payment (`#/checkout`). Confirming twice places the order: first the payment, then the order. */
export class CheckoutPaymentPage {
  readonly page: Page;

  // Locators
  private readonly paymentMethod_dropdown: Locator;
  private readonly accountName_input: Locator;
  private readonly accountNumber_input: Locator;
  private readonly confirm_button: Locator;
  private readonly paymentMessage_txt: Locator;
  private readonly orderConfirmation_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.paymentMethod_dropdown = page.getByTestId('payment-method');
    this.accountName_input = page.getByTestId('account-name');
    this.accountNumber_input = page.getByTestId('account-number');
    this.confirm_button = page.getByTestId('finish');
    this.paymentMessage_txt = page.locator('.help-block');
    this.orderConfirmation_txt = page.getByText(/Thanks for your order! Your invoice number is INV-\d+/);
  }

  ///// Actions

  /** Chooses Bank Transfer and types its account name and number. */
  async enterBankTransfer(accountName: string, accountNumber: string) {
    await step('Choose Bank Transfer and enter the account details', async () => {
      await this.paymentMethod_dropdown.selectOption({ label: 'Bank Transfer' });
      await this.accountName_input.fill(accountName);
      await this.accountNumber_input.fill(accountNumber);
    });
  }

  async confirm() {
    await step('Click Confirm on the payment step', async () => {
      await this.confirm_button.click();
    });
  }

  ///// Validations

  async verifyPaymentSuccessful(expectedMessage: string) {
    await step('Verify the payment is reported as successful', async () => {
      await expectToHaveText('the payment message', this.paymentMessage_txt.first(), expectedMessage);
    });
  }

  async verifyOrderPlaced() {
    await step('Verify the order is placed and its invoice number is shown', async () => {
      await expectToBeVisible('the order confirmation with its invoice number', this.orderConfirmation_txt);
    });
  }
}
