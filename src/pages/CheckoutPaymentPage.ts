import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectTextsToEqualInAnyOrder, expectToBeVisible, expectToHaveText } from '../utils/Expects';

/** The credit card values typed on the payment step; the expiration date reads MM/YYYY. */
export interface CreditCard {
  number: string;
  expirationDate: string;
  cvv: string;
  holderName: string;
}

/** Checkout step 4: the payment (`#/checkout`). Confirming twice places the order: first the payment, then the order. */
export class CheckoutPaymentPage {
  readonly page: Page;

  // Locators
  private readonly paymentMethod_dropdown: Locator;
  private readonly paymentMethod_list: Locator;
  private readonly cardNumber_input: Locator;
  private readonly expirationDate_input: Locator;
  private readonly cvv_input: Locator;
  private readonly cardHolderName_input: Locator;
  private readonly expirationDateError_txt: Locator;
  private readonly accountName_input: Locator;
  private readonly accountNumber_input: Locator;
  private readonly confirm_button: Locator;
  private readonly paymentMessage_txt: Locator;
  private readonly orderConfirmation_txt: Locator;

  constructor(page: Page) {
    this.page = page;
    this.paymentMethod_dropdown = page.getByTestId('payment-method');
    // The placeholder option has an empty value; every other option is a payment method.
    this.paymentMethod_list = this.paymentMethod_dropdown.locator('option:not([value=""])');
    // The card fields never render in the with-bugs build (choosing Credit Card shows the Bank Transfer fields);
    // these ids were observed on the defect-free site (https://practicesoftwaretesting.com), see docs/test-cases.md §9.
    this.cardNumber_input = page.getByTestId('credit_card_number');
    this.expirationDate_input = page.getByTestId('expiration_date');
    this.cvv_input = page.getByTestId('cvv');
    this.cardHolderName_input = page.getByTestId('card_holder_name');
    // The error renders right after the field it belongs to, once that field is touched.
    this.expirationDateError_txt = page.locator('[data-test="expiration_date"] + .alert-danger');
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
      await this.choosePaymentMethod('Bank Transfer');
      await this.accountName_input.fill(accountName);
      await this.accountNumber_input.fill(accountNumber);
    });
  }

  async choosePaymentMethod(method: string) {
    await step(`Choose the payment method: ${method}`, async () => {
      await this.paymentMethod_dropdown.selectOption({ label: method });
    });
  }

  /** Types the card fields in form order; leaving the expiration date field marks it touched. */
  async enterCreditCard(card: CreditCard) {
    await step('Enter the credit card details', async () => {
      await this.cardNumber_input.fill(card.number);
      await this.expirationDate_input.fill(card.expirationDate);
      await this.cvv_input.fill(card.cvv);
      await this.cardHolderName_input.fill(card.holderName);
    });
  }

  async confirm() {
    await step('Click Confirm on the payment step', async () => {
      await this.confirm_button.click();
    });
  }

  ///// Validations

  async verifyPaymentStepShown() {
    await step('Verify the payment step is shown', async () => {
      await expectToBeVisible('the payment method dropdown', this.paymentMethod_dropdown);
    });
  }

  async verifyPaymentMethodsListed(expectedMethods: string[]) {
    await step(`Verify the payment methods offered are exactly: ${expectedMethods.join(', ')}`, async () => {
      await expectTextsToEqualInAnyOrder('the payment method options', this.paymentMethod_list, expectedMethods);
    });
  }

  async verifyCreditCardFieldsShown() {
    await step('Verify the credit card number, expiration date, CVV and card holder name fields are shown', async () => {
      await expectToBeVisible('the Credit Card Number field', this.cardNumber_input);
      await expectToBeVisible('the Expiration Date field', this.expirationDate_input);
      await expectToBeVisible('the CVV field', this.cvv_input);
      await expectToBeVisible('the Card Holder Name field', this.cardHolderName_input);
    });
  }

  async verifyExpirationDateError(expectedMessage: string) {
    await step('Verify the expiration date is flagged', async () => {
      await expectToHaveText('the expiration date error', this.expirationDateError_txt, expectedMessage);
    });
  }

  async verifyPaymentSuccessful(expectedMessage: string) {
    await step('Verify the payment is reported as successful', async () => {
      await expectToHaveText('the payment message', this.paymentMessage_txt.first(), expectedMessage);
    });
  }

  /** The invoice number the order confirmation announces (`INV-...`). */
  async readPlacedInvoiceNumber(): Promise<string> {
    return await step('Read the invoice number from the order confirmation', async () => {
      const text = (await this.orderConfirmation_txt.textContent()) ?? '';
      const invoiceNumber = /INV-\d+/.exec(text)?.[0];
      if (!invoiceNumber) throw new Error(`The order confirmation shows no invoice number: "${text}"`);
      return invoiceNumber;
    });
  }

  async verifyOrderPlaced() {
    await step('Verify the order is placed and its invoice number is shown', async () => {
      await expectToBeVisible('the order confirmation with its invoice number', this.orderConfirmation_txt);
    });
  }
}
