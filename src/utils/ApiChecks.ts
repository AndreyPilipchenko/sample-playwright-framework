import { type ApiActions } from './ApiActions';
import { expectToBe, expectToBeOneOf } from './Expects';

/** Posts an empty body, expects a 422 and resolves to the field names the API complained about. */
export async function postEmptyAndGetReportedFields(apiActions: ApiActions, url: string, statusSubject: string): Promise<string[]> {
  const response = await apiActions.post(url, { data: {} });
  expectToBe(statusSubject, response.status(), 422);
  return Object.keys((await response.json()) as Record<string, string[]>);
}

/** A call that needs a token is refused without one: 401 or 403. */
export function expectRefusedWithoutToken(subject: string, status: number): void {
  expectToBeOneOf(subject, status, [401, 403]);
}
