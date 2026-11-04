import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { applications } from '../src/config/applications';
import { LoginPage } from '../src/pages/LoginPage';
import { AccountPage } from '../src/pages/AccountPage';
import { AdminDashboardPage } from '../src/pages/AdminDashboardPage';
import { ApisUserAccount } from '../src/apis/ApisUserAccount';
import { newUuid, withUuid } from '../src/utils/UniqueData';

let loginPage: LoginPage;
let accountPage: AccountPage;
let adminDashboardPage: AdminDashboardPage;
let apisUserAccount: ApisUserAccount;

let testData: typeof import('../resources/testData/LoginTestJsonFile.json');

/**
 * Each test signs in once, in a fresh anonymous context. The customer is registered by the
 * test itself through the API (unique email per run, left behind on purpose); the admin
 * cannot be created through the API, so TC-LOGIN-3 uses the pre-existing account from .env.
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('User Login', () => {
  test.describe.configure({ retries: 0 });

  test('Valid user credentials redirect to the customer account page', { tag: ['@smoke'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-2');
    const user = { ...testData.tcLogin2.user, email: withUuid(testData.tcLogin2.user.email, newUuid()) };

    await apisUserAccount.registerUser(user);
    await loginPage.navigate();
    await loginPage.login(user.email, user.password);
    await accountPage.verifyPageOpened();
  });

  test('Valid admin credentials redirect to the admin dashboard', { tag: ['@smoke'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-3');
    const { username, password } = applications.app.accounts.admin;
    test.skip(!username || !password, 'Set the admin account credentials in .env');

    await loginPage.navigate();
    await loginPage.login(username, password);
    await adminDashboardPage.verifyPageOpened();
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/LoginTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    apisUserAccount = new ApisUserAccount(request);
    loginPage = new LoginPage(page);
    accountPage = new AccountPage(page);
    adminDashboardPage = new AdminDashboardPage(page);
  });

});
