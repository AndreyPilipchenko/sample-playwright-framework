import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let apisUserAccount: ApisUserAccount;

let testData: typeof import('../../../resources/testData/CatalogSeedingTestJsonFile.json');

/** Customer registration and login calls; each case registers its own customer (email carries a per-run UUID). */
test.describe('Customer account API', () => {

  test('A registered customer can log in through the API', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-6');

    const user = withUniqueEmail(testData.seedApi6.user, newUuid());
    await apisUserAccount.registerUser(user);
    await apisUserAccount.getAccessToken(user.email, user.password);
  });

  test('Registering an already registered email is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-7');

    const user = withUniqueEmail(testData.seedApi7.user, newUuid());
    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyRegisteringExistingEmailIsRejected(user);
  });

  test.beforeAll(async () => {
    testData = loadTestData('CatalogSeedingTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisUserAccount = new ApisUserAccount(request);
  });

});
