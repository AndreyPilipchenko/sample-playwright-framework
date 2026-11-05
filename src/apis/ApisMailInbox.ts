import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectEventuallyToContainEqual } from '../utils/Expects';

/** One delivered mail per recipient, as the inbox lists it. */
export interface DeliveredMail {
  recipient: string;
  subject: string;
}

/** The local stack's mail sink (mailcatcher, `GET /messages`): what the application really sent. */
export class ApisMailInbox {
  readonly apiActions: ApiActions;

  readonly messages_serviceName = `${applications.mailInbox.apiUrl}/messages`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  /** Every delivered mail. The inbox writes recipients as `<address>`; this returns the bare address. */
  private async getDeliveredMail(): Promise<DeliveredMail[]> {
    const response = await this.apiActions.get(this.messages_serviceName);
    const messages = (await response.json()) as { recipients: string[]; subject: string }[];
    return messages.flatMap(({ recipients, subject }) =>
      recipients.map((recipient) => ({ recipient: recipient.replace(/[<>]/g, ''), subject })),
    );
  }

  ///// Validations

  /** Delivery is asynchronous, so the inbox is re-read until the mail arrives or the assertion times out. */
  async verifyMailDelivered(recipient: string, subject: string) {
    await allure.step(`Verify a mail with the subject "${subject}" reached the given address`, async () => {
      await expectEventuallyToContainEqual('the delivered mail', () => this.getDeliveredMail(), { recipient, subject });
    });
  }
}
