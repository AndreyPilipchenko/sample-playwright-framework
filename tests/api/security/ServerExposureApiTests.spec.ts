import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisAppLogs } from '../../../src/apis/ApisAppLogs';
import { ApisGraphql } from '../../../src/apis/ApisGraphql';
import { loadTestData } from '../../../src/utils/TestData';

let testData: typeof import('../../../resources/testData/ServerExposureApiTestJsonFile.json');

/** What the server shows to a visitor who is not signed in: its log file and its guarded GraphQL fields. */
test.describe('Server exposure API', () => {

  test('The application log file is not publicly accessible', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Server exposure API');
    await allure.testCaseId('TC-API-10');
    const apisAppLogs = new ApisAppLogs(request);

    const status = await apisAppLogs.getLaravelLogStatus();
    await apisAppLogs.verifyLogFileNotPublic(status);
  });

  test('JWT-guarded GraphQL fields reject unauthenticated access', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Server exposure API');
    await allure.testCaseId('TC-API-16');
    const { expectedMessage, userQuery, usersQuery, invoicesQuery, contactRequestsQuery } = testData.tcApi16;
    const apisGraphql = new ApisGraphql(request);

    await apisGraphql.verifyUnauthenticated(await apisGraphql.queryWithoutToken(userQuery), expectedMessage);
    await apisGraphql.verifyUnauthenticated(await apisGraphql.queryWithoutToken(usersQuery), expectedMessage);
    await apisGraphql.verifyUnauthenticated(await apisGraphql.queryWithoutToken(invoicesQuery), expectedMessage);
    await apisGraphql.verifyUnauthenticated(await apisGraphql.queryWithoutToken(contactRequestsQuery), expectedMessage);
  });

  test.beforeAll(async () => {
    testData = loadTestData('ServerExposureApiTestJsonFile.json');
  });
});
