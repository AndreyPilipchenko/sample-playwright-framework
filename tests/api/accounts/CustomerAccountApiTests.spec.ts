import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let apisUserAccount: ApisUserAccount;

let testData: typeof import('../../../resources/testData/CustomerAccountApiTestJsonFile.json');

/** Customer registration and login calls; each case registers its own customer (email carries a per-run UUID). */
test.describe('Customer account API', () => {

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

  test.beforeAll(async () => {
    testData = loadTestData('CustomerAccountApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisUserAccount = new ApisUserAccount(request);
  });

});
