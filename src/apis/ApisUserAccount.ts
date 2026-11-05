import { type APIRequestContext, type APIResponse } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeAtMost, expectToBeTruthy } from '../utils/Expects';

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
  readonly refresh_serviceName = `${applications.app.apiUrl}/users/refresh`;

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

  /** A registered account can sign in through the API. One login only: this target locks an account after ONE failed login (defect #21). */
  async verifyCanLogIn(email: string, password: string) {
    await allure.step('Verify the account can sign in through the API', async () => {
      const response = await this.login(email, password);
      expectToBe('the login response status', response.status(), 200);
    });
  }

  /**
   * The lifetime, in minutes, of the token a login hands out and of the token a refresh hands out
   * (`expires_in` is in seconds). Never retry: a failed login counts against the account.
   */
  async getTokenLifetimesMinutes(email: string, password: string): Promise<{ access: number; refreshed: number }> {
    return await allure.step('Get the lifetime of the access and the refreshed token', async () => {
      const loginResponse = await this.login(email, password);
      expectToBe('the login response status', loginResponse.status(), 200);
      const login = (await loginResponse.json()) as LoginTokenResponse;
      const refreshResponse = await this.apiActions.get(this.refresh_serviceName, {
        headers: { Authorization: `Bearer ${login.access_token}` },
      });
      expectToBe('the refresh response status', refreshResponse.status(), 200);
      const refreshed = (await refreshResponse.json()) as LoginTokenResponse;
      return { access: login.expires_in / 60, refreshed: refreshed.expires_in / 60 };
    });
  }

  /** A wrong password is refused with HTTP 401. */
  async verifyLoginRejected(email: string, password: string) {
    await allure.step('Verify the API sign-in is rejected', async () => {
      const response = await this.login(email, password);
      expectToBe('the login response status', response.status(), 401);
    });
  }

  /** A disabled account is refused with HTTP 403, even with the right password. */
  async verifyLoginDisabled(email: string, password: string) {
    await allure.step('Verify the account is disabled for API sign-in', async () => {
      const response = await this.login(email, password);
      expectToBe('the login response status', response.status(), 403);
    });
  }

  /** A locked account is refused with HTTP 423 (Locked), even with the right password. */
  async verifyLoginLocked(email: string, password: string) {
    await allure.step('Verify the account is locked for API sign-in', async () => {
      const response = await this.login(email, password);
      expectToBe('the login response status', response.status(), 423);
    });
  }

  async verifyTokenLifetimesWithin(lifetimes: { access: number; refreshed: number }, maxMinutes: number) {
    await allure.step(`Verify the access and the refreshed token live at most ${maxMinutes} minutes`, async () => {
      expectToBeAtMost('the access token lifetime in minutes', lifetimes.access, maxMinutes);
      expectToBeAtMost('the refreshed token lifetime in minutes', lifetimes.refreshed, maxMinutes);
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
