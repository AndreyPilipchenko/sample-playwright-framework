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

/** The values a registered customer is created from (Swagger: UserRequest); `email` carries the per-run unique token. */
export interface UserSeed {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
  phone: string;
  dob: string;
  email: string;
  password: string;
}

export class ApisUserAccount {
  readonly apiActions: ApiActions;

  readonly login_serviceName = `${applications.app.apiUrl}/users/login`;
  readonly register_serviceName = `${applications.app.apiUrl}/users/register`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  /**
   * Registers a customer — a public endpoint, no token. The account is deliberately left
   * behind: its email carries a per-run UUID, and deleting it needs an admin token.
   */
  async registerUser(user: UserSeed): Promise<number> {
    return await allure.step('Register a customer through the API', async () => {
      const response = await this.apiActions.post(this.register_serviceName, {
        data: this.registerPayload(user),
      });
      expectToBe('the register response status', response.status(), 201);
      return ((await response.json()) as { id: number }).id;
    });
  }

  /** Registering an email that is already registered is refused with 409. */
  async verifyRegisteringExistingEmailIsRejected(user: UserSeed) {
    await allure.step('Verify registering an already registered email is rejected', async () => {
      const response = await this.apiActions.post(this.register_serviceName, {
        data: this.registerPayload(user),
      });
      expectToBe('the duplicate register response status', response.status(), 409);
    });
  }

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

  private registerPayload(user: UserSeed) {
    return {
      first_name: user.firstName,
      last_name: user.lastName,
      address: user.address,
      city: user.city,
      state: user.state,
      country: user.country,
      postcode: user.postcode,
      phone: user.phone,
      dob: user.dob,
      email: user.email,
      password: user.password,
    };
  }
}
