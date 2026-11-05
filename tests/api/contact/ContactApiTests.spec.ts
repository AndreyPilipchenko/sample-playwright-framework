import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisContact } from '../../../src/apis/ApisContact';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let testData: typeof import('../../../resources/testData/ContactApiTestJsonFile.json');

/**
 * The call behind the contact form (`POST /messages`) and reading a message back. No browser. The rules come from the
 * defect-free upstream source: the API requires a subject and a message of at most 250 characters and validates an
 * email; the 50-character minimum is the form's. Messages are left behind on purpose. Never retried, because this
 * target locks an account after ONE failed login (known defect #21).
 */
test.describe('Contact API', () => {
  test.describe.configure({ retries: 0 });

  test('A guest message is accepted and returned with its id', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact API');
    await allure.testCaseId('contact-api-1');
    const seed = withUniqueEmail(testData.contactApi1.message, newUuid());
    const apisContact = new ApisContact(request);

    const sent = await apisContact.sendMessage(seed);
    await apisContact.verifyMessageReturned(sent, seed);
  });

  test('A customer message is stored for that customer and listed', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact API');
    await allure.testCaseId('contact-api-2');
    const { message, expectedStatus } = testData.contactApi2;
    const user = withUniqueEmail(testData.contactApi2.user, newUuid());
    const apisUserAccount = new ApisUserAccount(request);
    const userId = await apisUserAccount.registerUser(user);
    const token = await apisUserAccount.getAccessToken(user.email, user.password);
    const apisContact = new ApisContact(request, () => Promise.resolve(token));

    const sent = await apisContact.sendMessage(message);
    const stored = await apisContact.getMessage(sent.id);
    await apisContact.verifyMessageStored(stored, userId, message, expectedStatus);
    const listed = await apisContact.getMessageIds();
    apisContact.verifyMessageListed(listed, sent.id);
  });

  test('A message without subject and text is rejected', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact API');
    await allure.testCaseId('contact-api-3');
    const apisContact = new ApisContact(request);

    await apisContact.verifyMessageRejected({}, testData.contactApi3.expectedErrors);
  });

  test('A message over 250 characters is rejected', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact API');
    await allure.testCaseId('contact-api-4');
    const { message, messageLength, expectedErrors } = testData.contactApi4;
    const apisContact = new ApisContact(request);

    await apisContact.verifyMessageRejected({ ...message, message: 'x'.repeat(messageLength) }, expectedErrors);
  });

  test('A message with an invalid email address is rejected', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact API');
    await allure.testCaseId('contact-api-5');
    const { message, expectedErrors } = testData.contactApi5;
    const apisContact = new ApisContact(request);

    await apisContact.verifyMessageRejected(message, expectedErrors);
  });

  test('The message list requires a signed-in user', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Contact API');
    await allure.testCaseId('contact-api-6');
    const apisContact = new ApisContact(request);

    await apisContact.verifyListRequiresSignIn();
  });

  test.beforeAll(async () => {
    testData = loadTestData('ContactApiTestJsonFile.json');
  });

});
