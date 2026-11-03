import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { AccountPage } from '../src/pages/AccountPage';
import { InvoicesPage } from '../src/pages/InvoicesPage';
import { FavoritesPage } from '../src/pages/FavoritesPage';
import { AdminDashboardPage } from '../src/pages/AdminDashboardPage';
import { LoginPage } from '../src/pages/LoginPage';

let accountPage: AccountPage;
let invoicesPage: InvoicesPage;
let favoritesPage: FavoritesPage;
let adminDashboardPage: AdminDashboardPage;
let loginPage: LoginPage;

test.describe('Navigation & Header', () => {

  test('Guarded routes redirect to login when unauthenticated', { tag: ['@smoke'] }, async () => {
    await allure.feature('Navigation & Header');
    await allure.testCaseId('TC-NAV-5');

    await accountPage.navigate();
    await loginPage.verifyPageOpened();
    await invoicesPage.navigate();
    await loginPage.verifyPageOpened();
    await favoritesPage.navigate();
    await loginPage.verifyPageOpened();
    await adminDashboardPage.navigate();
    await loginPage.verifyPageOpened();
  });

  test.beforeEach(({ page }) => {
    accountPage = new AccountPage(page);
    invoicesPage = new InvoicesPage(page);
    favoritesPage = new FavoritesPage(page);
    adminDashboardPage = new AdminDashboardPage(page);
    loginPage = new LoginPage(page);
  });

});
