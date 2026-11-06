import { type APIRequestContext, type Page } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisUserAccount, type UserSeed } from '../apis/ApisUserAccount';
import { AccountPage } from '../pages/AccountPage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { newUuid, withUniqueEmail } from '../utils/UniqueData';

/** Customer flows that span the API and several pages, shared by more than one spec. */
export class CustomerFlows {
  private readonly apisUserAccount: ApisUserAccount;
  private readonly accountPage: AccountPage;
  private readonly loginPage: LoginPage;
  private readonly profilePage: ProfilePage;

  constructor(page: Page, request: APIRequestContext) {
    this.apisUserAccount = new ApisUserAccount(request);
    this.accountPage = new AccountPage(page);
    this.loginPage = new LoginPage(page);
    this.profilePage = new ProfilePage(page);
  }

  /**
   * Registers a customer through the API (unique email per run, left behind on purpose) and signs in once.
   * Resolves to the customer as registered.
   */
  async signInAsNewCustomer(seed: UserSeed): Promise<UserSeed> {
    return await allure.step('Sign in as a new customer', async () => {
      const user = withUniqueEmail(seed, newUuid());
      await this.apisUserAccount.registerUser(user);
      await this.loginPage.navigate();
      await this.loginPage.login(user.email, user.password);
      await this.accountPage.verifyPageOpened(); // the sign-in must finish before navigating away from it
      return user;
    });
  }

  /** Signs in as a new customer and opens the profile page. */
  async openProfileAsNewCustomer(seed: UserSeed): Promise<UserSeed> {
    return await allure.step('Open the profile page as a new customer', async () => {
      const user = await this.signInAsNewCustomer(seed);
      await this.profilePage.navigate();
      return user;
    });
  }
}
