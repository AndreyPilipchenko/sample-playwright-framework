import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { expectTextsToContainAll, expectLatestTextsToInclude, expectToBeVisible, expectToHaveCount } from '../utils/Expects';
import { exactText } from '../utils/TextPatterns';

/** One question the chat asks and the answer to give it. */
export interface ChatQuestion {
  question: string;
  answer: string;
}

/** The chat widget, on every page: its window, its answers and its action buttons. */
export class ChatWidgetPage {
  readonly page: Page;

  // Locators
  private readonly toggle_button: Locator;
  private readonly window_txt: Locator;
  private readonly messages_list: Locator;
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
    // The chat's own messages, not the customer's echoed answers (which include the password) nor the typing
    // indicator. Messages carry no test id; each one's text sits in its .message-content element.
    this.messages_list = this.window_txt.locator('.bot-message .message-content:not(.loading)');
    this.answer_input = page.getByTestId('chat-input');
    this.send_button = page.getByTestId('chat-send');
    this.checkout_button = page.getByTestId('chat-action-start-checkout');
    this.signIn_button = page.getByTestId('chat-action-checkout-login');
    this.continueAsGuest_button = page.getByTestId('chat-action-checkout-guest');
    this.confirmAddress_button = page.getByTestId('chat-action-checkout-confirm-address');
    this.paymentMethod_list = page.getByTestId('chat-action-select-payment-method');
    this.placeOrder_button = page.getByTestId('chat-action-checkout-confirm-order');
  }

  /** The message whose whole text is `text`, or that matches the pattern. */
  private message_txt(text: string | RegExp): Locator {
    return this.messages_list.filter({ hasText: typeof text === 'string' ? exactText(text) : text });
  }

  /**
   * The messages shown after a heading message. The conversation stays on screen, so this keeps a check from being
   * satisfied by an earlier message or button. Chat messages have no test id, hence the CSS classes.
   */
  private messagesAfter_list(heading: string): Locator {
    // `has` looks inside each message, so its locator starts at the message content, not at the window.
    const headingMessage = this.window_txt.locator('.chat-message').filter({ has: this.page.locator('.message-content').filter({ hasText: exactText(heading) }) });
    return headingMessage.locator('xpath=following-sibling::*[contains(concat(" ", @class, " "), " chat-message ")]').locator('.message-content');
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

  /**
   * Answers a run of questions in order, each once the chat has asked it (an unasked question times the wait out).
   * For runs whose questions differ between builds, such as the bank-transfer details (docs/app-versions.md, B7):
   * the test data lists them per build.
   */
  async answerQuestions(questions: ChatQuestion[]) {
    await step(`Answer the chat questions: ${questions.map(({ question }) => question).join(' / ')}`, async () => {
      for (const { question, answer } of questions) {
        await this.message_txt(question).waitFor();
        await this.answer(answer);
      }
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

  /** One of the chat's messages is exactly `expected`. On failure the report lists every message the chat showed. */
  async verifyMessage(expected: string) {
    await step(`Verify the chat says "${expected}"`, async () => {
      await expectLatestTextsToInclude('the chat messages', this.messages_list, expected);
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
      await expectToHaveCount('the chat messages with an invoice number', this.message_txt(/INV-\d+/), 1, 'message');
    });
  }
}
