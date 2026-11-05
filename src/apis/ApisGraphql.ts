import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToEqual } from '../utils/Expects';

/** What a GraphQL call returned: the HTTP status, the data and the error messages. */
export interface GraphqlResult {
  status: number;
  data: unknown;
  errorMessages: string[];
}

/**
 * The GraphQL endpoint (`POST /graphql`). A guarded field that fails aborts the whole query, so a
 * case sends one guarded field per query.
 */
export class ApisGraphql {
  readonly apiActions: ApiActions;

  readonly graphql_serviceName = `${applications.app.apiUrl}/graphql`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  /** Sends the query with no token. */
  async queryWithoutToken(query: string): Promise<GraphqlResult> {
    return await allure.step(`Send the GraphQL query without a token: ${query}`, async () => {
      const response = await this.apiActions.post(this.graphql_serviceName, { data: { query } });
      const body = (await response.json()) as { data?: unknown; errors?: { message: string }[] };
      return { status: response.status(), data: body.data ?? null, errorMessages: (body.errors ?? []).map((error) => error.message) };
    });
  }

  ///// Validations

  /** The query is refused as unauthenticated and returns no data for the guarded field. */
  async verifyUnauthenticated(result: GraphqlResult, expectedMessage: string) {
    await allure.step('Verify the guarded GraphQL field refuses an unauthenticated query', async () => {
      expectToEqual('the GraphQL error messages', result.errorMessages, [expectedMessage]);
      expectToEqual('the non-null GraphQL data values', Object.values((result.data ?? {}) as Record<string, unknown>).filter((value) => value !== null), []);
    });
  }
}
