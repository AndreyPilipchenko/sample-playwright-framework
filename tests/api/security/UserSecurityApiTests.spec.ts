import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { ApisUsers } from '../../../src/apis/ApisUsers';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let apisUserAccount: ApisUserAccount;

let testData: typeof import('../../../resources/testData/UserSecurityApiTestJsonFile.json');

/**
 * Security checks on the user endpoints. Each case registers its own customers (email carries a per-run UUID,
 * records are left behind on purpose). Expected behaviour comes from the defect-free upstream build: another
 * customer's record is refused, tokens live at most an hour, admin-only fields stay hidden and an injected
 * email is not a login. Never retried: a failed login counts against the account.
 */
test.describe('User API security', () => {
  test.describe.configure({ retries: 0 });

  test('A customer cannot read another customer\'s record', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('User API security');
    await allure.testCaseId('TC-API-1');
    const owner = withUniqueEmail(testData.tcApi1.owner, newUuid());
    const other = withUniqueEmail(testData.tcApi1.other, newUuid());

    await apisUserAccount.registerUser(owner);
    const otherId = await apisUserAccount.registerUser(other);
    const apisUsers = new ApisUsers(request, () => apisUserAccount.getAccessToken(owner.email, owner.password));
    const status = await apisUsers.getUserStatus(otherId);
    await apisUsers.verifyOtherUserRecordRefused(status);
  });

  test('Access and refreshed token lifetimes are reasonable', { tag: ['@regression'] }, async () => {
    await allure.feature('User API security');
    await allure.testCaseId('TC-API-2');
    const user = withUniqueEmail(testData.tcApi2.user, newUuid());

    await apisUserAccount.registerUser(user);
    const lifetimes = await apisUserAccount.getTokenLifetimesMinutes(user.email, user.password);
    await apisUserAccount.verifyTokenLifetimesWithin(lifetimes, testData.tcApi2.maxLifetimeMinutes);
  });

  test('A customer\'s own record hides the enabled and failed login attempts fields', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('User API security');
    await allure.testCaseId('TC-API-3');
    const user = withUniqueEmail(testData.tcApi3.user, newUuid());

    const userId = await apisUserAccount.registerUser(user);
    const apisUsers = new ApisUsers(request, () => apisUserAccount.getAccessToken(user.email, user.password));
    const record = await apisUsers.getOwnUserRecord(userId);
    await apisUsers.verifyAdminOnlyFieldsHidden(record, testData.tcApi3.adminOnlyFields);
  });

  test('A login with an injected email is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('User API security');
    await allure.testCaseId('TC-API-9');
    const { injectionSuffix, wrongPassword } = testData.tcApi9;
    const user = withUniqueEmail(testData.tcApi9.user, newUuid());

    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyLoginRejected(`${user.email}${injectionSuffix}`, wrongPassword);
  });

  test.beforeAll(async () => {
    testData = loadTestData('UserSecurityApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisUserAccount = new ApisUserAccount(request);
  });
});
