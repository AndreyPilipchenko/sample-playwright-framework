import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { databases } from '../../../src/config/databases';
import { DbsUserAccount } from '../../../src/dbs/DbsUserAccount';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let apisUserAccount: ApisUserAccount;
let dbsUserAccount: DbsUserAccount;

let testData: typeof import('../../../resources/testData/CustomerAccountApiTestJsonFile.json');

/**
 * Customer registration and login calls; each case registers its own customer (email carries a per-run UUID).
 * Expected statuses for a locked (423) and a disabled (403) account come from the defect-free upstream source.
 * The disabled case needs the database (APP_DB_LOCAL): this build's admin API cannot disable an account.
 * Never retried: a retry would hide a run where the lock state changed unexpectedly.
 */
test.describe('Customer account API', () => {
  test.describe.configure({ retries: 0 });

  test('A registered customer can log in through the API', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer account API');
    await allure.testCaseId('customer-account-api-1');

    const user = withUniqueEmail(testData.customerAccountApi1.user, newUuid());
    await apisUserAccount.registerUser(user);
    await apisUserAccount.getAccessToken(user.email, user.password);
  });

  test('Registering an already registered email is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer account API');
    await allure.testCaseId('customer-account-api-2');

    const user = withUniqueEmail(testData.customerAccountApi2.user, newUuid());
    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyRegisteringExistingEmailIsRejected(user);
  });

  test('A wrong password is rejected through the API', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer account API');
    await allure.testCaseId('customer-account-api-3');
    const user = withUniqueEmail(testData.customerAccountApi3.user, newUuid());

    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyLoginRejected(user.email, testData.customerAccountApi3.wrongPassword);
  });

  test('Two failed logins do not lock the account', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer account API');
    await allure.testCaseId('customer-account-api-4');
    const { wrongPassword } = testData.customerAccountApi4;
    const user = withUniqueEmail(testData.customerAccountApi4.user, newUuid());

    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyLoginRejected(user.email, wrongPassword);
    await apisUserAccount.verifyLoginRejected(user.email, wrongPassword);
    await apisUserAccount.verifyCanLogIn(user.email, user.password);
  });

  test('Three failed logins lock the account with HTTP 423', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer account API');
    await allure.testCaseId('customer-account-api-5');
    const { wrongPassword } = testData.customerAccountApi5;
    const user = withUniqueEmail(testData.customerAccountApi5.user, newUuid());

    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyLoginRejected(user.email, wrongPassword);
    await apisUserAccount.verifyLoginRejected(user.email, wrongPassword);
    await apisUserAccount.verifyLoginRejected(user.email, wrongPassword);
    await apisUserAccount.verifyLoginLocked(user.email, user.password);
  });

  test('A disabled account is refused with HTTP 403', { tag: ['@regression', '@db'] }, async () => {
    await allure.feature('Customer account API');
    await allure.testCaseId('customer-account-api-6');
    const user = withUniqueEmail(testData.customerAccountApi6.user, newUuid());

    await apisUserAccount.registerUser(user);
    await dbsUserAccount.disableUser(user.email);
    await apisUserAccount.verifyLoginDisabled(user.email, user.password);
  });

  test.beforeAll(async () => {
    dbsUserAccount = new DbsUserAccount(databases.appDb);
    testData = loadTestData('CustomerAccountApiTestJsonFile.json');
  });

  test.afterAll(async () => {
    await dbsUserAccount.close();
  });

  test.beforeEach(({ request }) => {
    apisUserAccount = new ApisUserAccount(request);
  });

});
