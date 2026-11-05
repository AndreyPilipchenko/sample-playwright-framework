import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectNotToHaveCount, expectTextsToEqualInAnyOrder, expectToHaveCount, expectToHaveText } from '../utils/Expects';

/** What a guest enters in the contact form. */
export interface ContactMessage {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

/** Contact form (`#/contact`). */
export class ContactPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/contact`;

  // Locators
  private readonly firstName_input: Locator;
  private readonly lastName_input: Locator;
  private readonly email_input: Locator;
  private readonly subject_dropdown: Locator;
  private readonly subjectOption_list: Locator;
  private readonly message_input: Locator;
  private readonly send_button: Locator;
  private readonly confirmation_msg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstName_input = page.getByTestId('first-name');
    this.lastName_input = page.getByTestId('last-name');
    this.email_input = page.getByTestId('email');
    this.subject_dropdown = page.getByTestId('subject');
    // The hidden entry is the "Select a subject" placeholder, not an option a visitor can choose.
    this.subjectOption_list = this.subject_dropdown.locator('option:not([hidden])');
    this.message_input = page.getByTestId('message');
    this.send_button = page.getByTestId('contact-submit');
    this.confirmation_msg = page.getByRole('alert');
  }

  ///// Actions

  async navigate() {
    await step('Navigate to the contact page', async () => {
      await this.page.goto(this.url);
    });
  }

  /** The form validates a field when it loses focus, so the subject is focused before its choice and left after it. */
  async sendMessage(contact: ContactMessage) {
    await step('Fill in and send the contact form as a guest', async () => {
      await this.firstName_input.fill(contact.firstName);
      await this.lastName_input.fill(contact.lastName);
      await this.email_input.fill(contact.email);
      await this.subject_dropdown.focus();
      await this.subject_dropdown.selectOption({ label: contact.subject });
      await this.subject_dropdown.blur();
      await this.message_input.fill(contact.message);
      await this.send_button.click();
    });
  }

  ///// Validations

  async verifySubjectOptions(expected: string[]) {
    await step('Verify the subject dropdown lists exactly the documented options', async () => {
      await expectTextsToEqualInAnyOrder('the subject options', this.subjectOption_list, expected);
    });
  }

  /** Checks the list has loaded first, so an empty dropdown cannot pass. */
  async verifySubjectOptionNotListed(unexpected: string) {
    await step(`Verify the subject dropdown has no "${unexpected}" entry`, async () => {
      await expectNotToHaveCount('the subject options', this.subjectOption_list, 0);
      await expectToHaveCount(`the "${unexpected}" subject options`, this.subjectOption_list.filter({ hasText: unexpected }), 0);
    });
  }

  async verifyConfirmation(expected: string) {
    await step('Verify the contact form confirms the message', async () => {
      await expectToHaveText('the contact confirmation', this.confirmation_msg, expected);
    });
  }
}
