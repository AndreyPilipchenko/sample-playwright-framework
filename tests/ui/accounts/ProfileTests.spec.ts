import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ProfilePage } from '../../../src/pages/ProfilePage';
import { loadTestData } from '../../../src/utils/TestData';
import { CustomerFlows } from '../../../src/helpers/CustomerFlows';

let profilePage: ProfilePage;
let customerFlows: CustomerFlows;

let testData: typeof import('../../../resources/testData/ProfileTestJsonFile.json');

/** Never retried: this target locks an account after ONE failed login (known defect #21). */
test.describe('Customer profile', () => {
  test.describe.configure({ retries: 0 });

  test('Profile page shows the current account details', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-1');

    const user = await customerFlows.openProfileAsNewCustomer(testData.tcPROF1.user);
    await profilePage.verifyAccountDetails(user);
  });

  test('Valid update saves and confirms, fading after 5s', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-4');
    const { edit, expectedMessage, fadeWindow } = testData.tcPROF4;

    const user = await customerFlows.openProfileAsNewCustomer(testData.tcPROF4.user);
    await profilePage.verifyProfileLoaded(user.email);
    await profilePage.updateProfile(edit);
    await profilePage.verifyProfileUpdated(expectedMessage);
    await profilePage.verifyProfileMessageFades(fadeWindow);
    await profilePage.reload();
    await profilePage.verifyEditSaved(edit);
  });

  test('First and Last name display in their own fields', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-5');

    const user = await customerFlows.openProfileAsNewCustomer(testData.tcPROF5.user);
    await profilePage.verifyNames(user.firstName, user.lastName);
  });

  test('Updating address fields does not error or 404', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-7');
    const { address, expectedMessage } = testData.tcPROF7;

    const user = await customerFlows.openProfileAsNewCustomer(testData.tcPROF7.user);
    await profilePage.verifyProfileLoaded(user.email);
    await profilePage.updateAddress(address);
    await profilePage.verifyProfileUpdated(expectedMessage);
    await profilePage.verifyNoProfileError();
    await profilePage.reload();
    await profilePage.verifyAddress(address);
  });

  test.beforeAll(async () => {
    testData = loadTestData('ProfileTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    profilePage = new ProfilePage(page);
    customerFlows = new CustomerFlows(page, request);
  });
});
