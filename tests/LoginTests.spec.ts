import { test } from '../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { applications } from '../src/config/applications';
import { LoginPage } from '../src/pages/LoginPage';
import { AccountPage } from '../src/pages/AccountPage';
import { AdminDashboardPage } from '../src/pages/AdminDashboardPage';
import { ApisUserAccount } from '../src/apis/ApisUserAccount';
import { databases } from '../src/config/databases';
import { DbsUserAccount } from '../src/dbs/DbsUserAccount';
import { newUuid, withUuid } from '../src/utils/UniqueData';

let loginPage: LoginPage;
let accountPage: AccountPage;
let adminDashboardPage: AdminDashboardPage;
let apisUserAccount: ApisUserAccount;
let dbsUserAccount: DbsUserAccount;

let testData: typeof import('../resources/testData/LoginTestJsonFile.json');

/**
 * Each test signs in once, in a fresh anonymous context. The customer is registered by the
 * test itself through the API (unique email per run, left behind on purpose); the admin
 * cannot be created through the API, so TC-LOGIN-3 uses the pre-existing account from .env.
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('User Login', () => {
  test.describe.configure({ retries: 0 });

  test('Login form shows email and password fields', { tag: ['@regression'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-1');

    await loginPage.navigate();
    await loginPage.verifyEmailAndPasswordFieldsShown();
  });

  test('Invalid credentials show "Invalid email or password"', { tag: ['@regression'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-4');
    const user = { ...testData.tcLogin4.user, email: withUuid(testData.tcLogin4.user.email, newUuid()) };

    await apisUserAccount.registerUser(user);
    await loginPage.navigate();
    await loginPage.login(user.email, testData.tcLogin4.wrongPassword);
    await loginPage.verifyLoginError(testData.tcLogin4.expectedError);
  });

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

  test('Empty email and password are validated client-side', { tag: ['@regression'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-5');
    const { email, password, expectedEmailError, expectedPasswordError } = testData.tcLogin5;

    await loginPage.navigate();
    await loginPage.login(email, password);
    await loginPage.verifyEmailAndPasswordRequired(expectedEmailError, expectedPasswordError);
  });

  test('Account locks only after 3 consecutive failures', { tag: ['@regression'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-7');
    const { wrongPassword, expectedError } = testData.tcLogin7;
    const user = { ...testData.tcLogin7.user, email: withUuid(testData.tcLogin7.user.email, newUuid()) };

    await apisUserAccount.registerUser(user);
    await loginPage.navigate();
    await loginPage.login(user.email, wrongPassword);
    await loginPage.verifyLoginError(expectedError);
    await loginPage.login(user.email, wrongPassword);
    await loginPage.verifyLoginError(expectedError);
    await loginPage.login(user.email, user.password);
    await accountPage.verifyPageOpened();
  });

  test('Locked account shows the lock message and API returns HTTP 423', { tag: ['@regression'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-8');
    const { wrongPassword, expectedError, expectedLockMessage } = testData.tcLogin8;
    const user = { ...testData.tcLogin8.user, email: withUuid(testData.tcLogin8.user.email, newUuid()) };

    await apisUserAccount.registerUser(user);
    await loginPage.navigate();
    await loginPage.login(user.email, wrongPassword);
    await loginPage.verifyLoginError(expectedError);
    await loginPage.login(user.email, wrongPassword);
    await loginPage.verifyLoginError(expectedError);
    await loginPage.login(user.email, wrongPassword);
    await loginPage.verifyLoginError(expectedError);
    await loginPage.login(user.email, user.password);
    await loginPage.verifyLoginError(expectedLockMessage);
    await apisUserAccount.verifyLoginLocked(user.email, user.password);
  });

  test('Disabled account shows "Account disabled." and is not authenticated', { tag: ['@regression'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-10');
    const user = { ...testData.tcLogin10.user, email: withUuid(testData.tcLogin10.user.email, newUuid()) };

    await apisUserAccount.registerUser(user);
    await dbsUserAccount.disableUser(user.email);
    await loginPage.navigate();
    await loginPage.login(user.email, user.password);
    await loginPage.verifyLoginError(testData.tcLogin10.expectedError);
    await loginPage.verifyPageOpened();
  });

  test.beforeAll(async () => {
    dbsUserAccount = new DbsUserAccount(databases.appDb);
    testData = JSON.parse(fs.readFileSync('./resources/testData/LoginTestJsonFile.json', 'utf8'));
  });

  test.afterAll(async () => {
    await dbsUserAccount.close();
  });

  test.beforeEach(({ page, request }) => {
    apisUserAccount = new ApisUserAccount(request);
    loginPage = new LoginPage(page);
    accountPage = new AccountPage(page);
    adminDashboardPage = new AdminDashboardPage(page);
  });

});
