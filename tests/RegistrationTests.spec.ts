import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ApisUserAccount } from '../src/apis/ApisUserAccount';
import { LoginPage } from '../src/pages/LoginPage';
import { RegisterPage } from '../src/pages/RegisterPage';
import { newUuid, withUuid } from '../src/utils/UniqueData';

let apisUserAccount: ApisUserAccount;
let loginPage: LoginPage;
let registerPage: RegisterPage;

let testData: typeof import('../resources/testData/RegistrationTestJsonFile.json');

/**
 * The registered customer's email carries a per-run UUID; the account is left behind on purpose
 * (deleting a user needs an admin token). Never retried: this target locks an account after ONE
 * failed login (known defect #21).
 */
test.describe('User Registration', () => {
  test.describe.configure({ retries: 0 });

  test('Valid submission creates the account and redirects to login', { tag: ['@regression'] }, async () => {
    await allure.feature('User Registration');
    await allure.testCaseId('TC-REG-9');
    const form = { ...testData.tcREG9.form, email: withUuid(testData.tcREG9.form.email, newUuid()) };

    await registerPage.navigate();
    await registerPage.register(form);
    await loginPage.verifyPageOpened();
    await apisUserAccount.verifyCanLogIn(form.email, form.password);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/RegistrationTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    apisUserAccount = new ApisUserAccount(request);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
  });
});
