import * as allure from 'allure-js-commons';
import { type ApiActions } from './ApiActions';
import { expectToBe, expectToBeOneOf, expectToContainAll } from './Expects';

/** Posts an empty body, expects a 422 and resolves to the field names the API complained about. */
export async function postEmptyAndGetReportedFields(apiActions: ApiActions, url: string, statusSubject: string): Promise<string[]> {
  const response = await apiActions.post(url, { data: {} });
  expectToBe(statusSubject, response.status(), 422);
  return Object.keys((await response.json()) as Record<string, string[]>);
}

/**
 * The fields `postEmptyAndGetReportedFields` returned include every required one. Shared by the create-without-fields
 * case of every resource (`resource` names it in the step), so the service classes need no copy of their own.
 */
export async function verifyRequiredFieldsReported(resource: string, reportedFields: string[], requiredFields: string[]): Promise<void> {
  await allure.step(`Verify the missing required ${resource} fields are reported: ${requiredFields.join(', ')}`, async () => {
    expectToContainAll(`the ${resource} fields the API reported`, reportedFields, requiredFields);
  });
}

/** A call that needs a token is refused without one: 401 or 403. */
export function expectRefusedWithoutToken(subject: string, status: number): void {
  expectToBeOneOf(subject, status, [401, 403]);
}
