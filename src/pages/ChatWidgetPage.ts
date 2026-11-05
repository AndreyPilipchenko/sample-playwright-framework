import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectTextsToContainAll, expectToBeVisible } from '../utils/Expects';

/** The chat widget, on every page: its window, its answers and its action buttons. */
export class ChatWidgetPage {
  readonly page: Page;

  // Locators
  private readonly toggle_button: Locator;
  private readonly window_txt: Locator;
  private readonly answer_input: Locator;
  private readonly send_button: Locator;
  private readonly checkout_button: Locator;
  private readonly signIn_button: Locator;
  private readonly continueAsGuest_button: Locator;
  private readonly confirmAddress_button: Locator;
  private readonly paymentMethod_list: Locator;
  private readonly placeOrder_button: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggle_button = page.getByTestId('chat-toggle');
    this.window_txt = page.getByTestId('chat-window');
    this.answer_input = page.getByTestId('chat-input');
    this.send_button = page.getByTestId('chat-send');
    this.checkout_button = page.getByTestId('chat-action-start-checkout');
    this.signIn_button = page.getByTestId('chat-action-checkout-login');
    this.continueAsGuest_button = page.getByTestId('chat-action-checkout-guest');
    this.confirmAddress_button = page.getByTestId('chat-action-checkout-confirm-address');
    this.paymentMethod_list = page.getByTestId('chat-action-select-payment-method');
    this.placeOrder_button = page.getByTestId('chat-action-checkout-confirm-order');
  }

  /**
   * The messages shown after a heading message. The conversation stays on screen, so this keeps a check from being
   * satisfied by an earlier message or button. Chat messages have no test id, hence the CSS classes.
   */
  private messagesAfter_list(heading: string): Locator {
    return this.window_txt.locator(`.chat-message:has(.message-content:text-is("${heading}")) ~ .chat-message .message-content`);
  }

  ///// Actions

  async open() {
    await step('Open the chat window', async () => {
      await this.toggle_button.click();
    });
  }

  async startCheckout() {
    await step('Choose Checkout in the chat menu', async () => {
      await this.checkout_button.click();
    });
  }

  async signIn(email: string, password: string) {
    await step('Sign in from the chat', async () => {
      await this.signIn_button.click();
      await this.answer(email);
      await this.answer(password);
    });
  }

  async continueAsGuest() {
    await step('Continue the chat checkout as a guest', async () => {
      await this.continueAsGuest_button.click();
    });
  }

  /** Sends one answer to the question the chat is asking. The chat takes any input at any time, so check the question first. */
  async answer(text: string) {
    await step('Answer the chat', async () => {
      await this.answer_input.fill(text);
      await this.send_button.click();
    });
  }

  async confirmAddress() {
    await step('Confirm the billing address in the chat', async () => {
      await this.confirmAddress_button.click();
    });
  }

  async choosePaymentMethod(method: string) {
    await step(`Choose the ${method} payment method in the chat`, async () => {
      await this.paymentMethod_list.filter({ hasText: method }).click();
    });
  }

  async placeOrder() {
    await step('Place the order in the chat', async () => {
      await this.placeOrder_button.click();
    });
  }

  ///// Validations

  /** For a text the conversation shows once, such as a question. */
  async verifyMessage(expected: string) {
    await step(`Verify the chat says "${expected}"`, async () => {
      await expectToBeVisible(`the chat message "${expected}"`, this.window_txt.getByText(expected, { exact: true }));
    });
  }

  async verifyAddressConfirmation(heading: string, expectedLines: string[]) {
    await step('Verify the chat repeats the billing address for confirmation', async () => {
      await expectTextsToContainAll('the address to confirm', this.messagesAfter_list(heading), expectedLines);
    });
  }

  async verifyOrderSummary(heading: string, expectedLines: string[]) {
    await step('Verify the chat summarises the order', async () => {
      await expectTextsToContainAll('the order summary', this.messagesAfter_list(heading), expectedLines);
    });
  }

  async verifyGuestCheckoutOffered() {
    await step('Verify the chat offers to continue as a guest', async () => {
      await expectToBeVisible('the continue-as-guest button', this.continueAsGuest_button);
    });
  }

  async verifyOrderNumberShown() {
    await step('Verify the chat shows the order number', async () => {
      await expectToBeVisible('the invoice number in the chat', this.window_txt.getByText(/INV-\d+/));
    });
  }
}
