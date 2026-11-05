import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeOneOf, expectToEqual } from '../utils/Expects';

/** User records read by id (`GET /users/{id}`), as the signed-in customer who owns the token. */
export class ApisUsers {
  readonly apiActions: ApiActions;

  readonly users_serviceName = `${applications.app.apiUrl}/users`;

  /** `bearerTokenProvider` signs in as the customer who reads (see ApisUserAccount.getAccessToken); the facade injects the token. */
  constructor(request: APIRequestContext, bearerTokenProvider: () => Promise<string>) {
    this.apiActions = new ApiActions(request, { bearerTokenProvider });
  }

  ///// Actions

  /** The status of reading the record of `userId`, whoever owns it. */
  async getUserStatus(userId: number): Promise<number> {
    return await allure.step(`Get the user record ${userId}`, async () => {
      const response = await this.apiActions.get(`${this.users_serviceName}/${userId}`);
      return response.status();
    });
  }

  /** The caller's own record; reading it must work. */
  async getOwnUserRecord(userId: number): Promise<Record<string, unknown>> {
    return await allure.step(`Get the own user record ${userId}`, async () => {
      const response = await this.apiActions.get(`${this.users_serviceName}/${userId}`);
      expectToBe('the own user record response status', response.status(), 200);
      return (await response.json()) as Record<string, unknown>;
    });
  }

  ///// Validations

  /** Another customer's record is refused: 401, 403 or 404 (the defect-free build answers 404 "not authorized"), never 200. */
  async verifyOtherUserRecordRefused(status: number) {
    await allure.step('Verify reading another customer\'s record is refused', async () => {
      expectToBeOneOf('the status of reading another customer\'s record', status, [401, 403, 404]);
    });
  }

  /** None of the admin-only fields appear in a non-admin's user record. */
  async verifyAdminOnlyFieldsHidden(record: Record<string, unknown>, adminOnlyFields: string[]) {
    await allure.step(`Verify the user record hides: ${adminOnlyFields.join(', ')}`, async () => {
      expectToEqual('the admin-only fields in the user record', adminOnlyFields.filter((field) => field in record), []);
    });
  }
}
