import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeTruthy, expectToContain, expectToEqual } from '../utils/Expects';

/** A contact message as the API takes it. A guest also gives a name and an email; a signed-in customer does not. */
export interface ContactMessageSeed {
  name?: string;
  email?: string;
  subject: string;
  message: string;
}

/** A contact message as the API returns it. */
export interface ContactMessageRecord {
  id: number;
  user_id?: number;
  name?: string | null;
  email?: string | null;
  subject: string;
  message: string;
  status?: string;
}

/** The contact messages the form sends (`POST /messages`) and a customer reads back (`GET /messages`). */
export class ApisContact {
  readonly apiActions: ApiActions;

  readonly messages_serviceName = `${applications.app.apiUrl}/messages`;

  /** Without a `bearerTokenProvider` the calls are a guest's. With one, the facade injects a customer's token (see ApisUserAccount.getAccessToken). */
  constructor(request: APIRequestContext, bearerTokenProvider?: () => Promise<string>) {
    this.apiActions = new ApiActions(request, { bearerTokenProvider });
  }

  ///// Actions

  /** The message is deliberately left behind: nothing in the API deletes one. */
  async sendMessage(seed: ContactMessageSeed): Promise<ContactMessageRecord> {
    return await allure.step('Send a contact message through the API', async () => {
      const response = await this.apiActions.post(this.messages_serviceName, { data: seed });
      expectToBe('the send message response status', response.status(), 200);
      return (await response.json()) as ContactMessageRecord;
    });
  }

  async getMessage(messageId: number): Promise<ContactMessageRecord> {
    return await allure.step(`Get the contact message ${messageId}`, async () => {
      const response = await this.apiActions.get(`${this.messages_serviceName}/${messageId}`);
      expectToBe('the get message response status', response.status(), 200);
      return (await response.json()) as ContactMessageRecord;
    });
  }

  /** The first page of the caller's message list. */
  async getMessageIds(): Promise<number[]> {
    return await allure.step('Get the contact message list', async () => {
      const response = await this.apiActions.get(this.messages_serviceName);
      expectToBe('the message list response status', response.status(), 200);
      const { data } = (await response.json()) as { data: ContactMessageRecord[] };
      return data.map((message) => message.id);
    });
  }

  ///// Validations

  async verifyMessageReturned(actual: ContactMessageRecord, seed: Required<ContactMessageSeed>) {
    await allure.step('Verify the API returns the sent message with its id', async () => {
      expectToBeTruthy('the message id', actual.id);
      expectToBe('the message sender name', actual.name, seed.name);
      expectToBe('the message sender email', actual.email, seed.email);
      expectToBe('the message subject', actual.subject, seed.subject);
      expectToBe('the message text', actual.message, seed.message);
    });
  }

  async verifyMessageStored(actual: ContactMessageRecord, userId: number, seed: ContactMessageSeed, expectedStatus: string) {
    await allure.step('Verify the message is stored for its customer', async () => {
      expectToBe('the message owner', actual.user_id, userId);
      expectToBe('the message subject', actual.subject, seed.subject);
      expectToBe('the message text', actual.message, seed.message);
      expectToBe('the message status', actual.status, expectedStatus);
    });
  }

  async verifyMessageListed(messageIds: number[], messageId: number) {
    await allure.step(`Verify the message list contains the message ${messageId}`, async () => {
      expectToContain('the listed message ids', messageIds, messageId);
    });
  }

  async verifyMessageRejected(seed: Partial<ContactMessageSeed>, expectedErrors: Record<string, string[]>) {
    await allure.step('Verify the API rejects the message', async () => {
      const response = await this.apiActions.post(this.messages_serviceName, { data: seed });
      expectToBe('the rejected message response status', response.status(), 422);
      expectToEqual('the validation errors', await response.json(), expectedErrors);
    });
  }

  async verifyListRequiresSignIn() {
    await allure.step('Verify the message list requires a signed-in user', async () => {
      const response = await this.apiActions.get(this.messages_serviceName);
      expectToBe('the anonymous message list response status', response.status(), 401);
    });
  }
}
