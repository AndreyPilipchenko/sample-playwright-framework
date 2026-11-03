import { type APIRequestContext, type APIResponse } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeTruthy } from '../utils/Expects';

/** Body of a successful `POST /users/login` (Swagger: TokenResponse). */
interface LoginTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class ApisUserAccount {
  readonly apiActions: ApiActions;

  readonly login_serviceName = `${applications.app.apiUrl}/users/login`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  async login(email: string, password: string): Promise<APIResponse> {
    return await allure.step('Log in through the API', async () => {
      return await this.apiActions.post(this.login_serviceName, {
        data: { email, password },
      });
    });
  }

  /**
   * Logs in and returns the bearer token — shaped to serve as an ApiActions
   * `bearerTokenProvider` for services that call authenticated endpoints. Never retry
   * it on failure: this target locks an account after ONE failed login (defect #21).
   */
  async getAccessToken(email: string, password: string): Promise<string> {
    return await allure.step('Get an API access token', async () => {
      const response = await this.login(email, password);
      expectToBe('the login response status', response.status(), 200);
      const { access_token: accessToken } = (await response.json()) as LoginTokenResponse;
      expectToBeTruthy('the login access token', accessToken);
      return accessToken;
    });
  }
}
