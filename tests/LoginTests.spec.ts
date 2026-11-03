import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { applications } from '../src/config/applications';
import { LoginPage } from '../src/pages/LoginPage';
import { AccountPage } from '../src/pages/AccountPage';
import { AdminDashboardPage } from '../src/pages/AdminDashboardPage';

let loginPage: LoginPage;
let accountPage: AccountPage;
let adminDashboardPage: AdminDashboardPage;

/**
 * Each test signs in once, in a fresh anonymous context, with a pre-existing account
 * from .env. Never retried: this target locks an account after ONE failed login
 * (known defect #21).
 */
test.describe('User Login', () => {
  test.describe.configure({ retries: 0 });

  test('Valid user credentials redirect to the customer account page', { tag: ['@smoke'] }, async () => {
    await allure.feature('User Login');
    await allure.testCaseId('TC-LOGIN-2');
    const { username, password } = applications.app.accounts.customer;
    test.skip(!username || !password, 'Set the customer account credentials in .env');

    await loginPage.navigate();
    await loginPage.login(username, password);
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

  test.beforeEach(({ page }) => {
    loginPage = new LoginPage(page);
    accountPage = new AccountPage(page);
    adminDashboardPage = new AdminDashboardPage(page);
  });

});
