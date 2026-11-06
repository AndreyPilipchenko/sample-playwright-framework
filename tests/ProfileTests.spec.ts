import { test } from '../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisUserAccount, type UserSeed } from '../src/apis/ApisUserAccount';
import { AccountPage } from '../src/pages/AccountPage';
import { LoginPage } from '../src/pages/LoginPage';
import { ProfilePage } from '../src/pages/ProfilePage';
import { loadTestData } from '../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../src/utils/UniqueData';

let apisUserAccount: ApisUserAccount;
let accountPage: AccountPage;
let loginPage: LoginPage;
let profilePage: ProfilePage;

let testData: typeof import('../resources/testData/ProfileTestJsonFile.json');

/**
 * Each case registers its own customer through the API (unique email per run, left behind on purpose), signs in
 * once in a fresh anonymous context and opens the profile page. Expected values are the ones the customer
 * registered with. Never retried: this target locks an account after ONE failed login (known defect #21).
 */
async function openProfileAsNewCustomer(seed: UserSeed): Promise<UserSeed> {
  const user = withUniqueEmail(seed, newUuid());
  await apisUserAccount.registerUser(user);
  await loginPage.navigate();
  await loginPage.login(user.email, user.password);
  await accountPage.verifyPageOpened(); // the sign-in must finish before navigating away from it
  await profilePage.navigate();
  return user;
}

test.describe('Customer profile', () => {
  test.describe.configure({ retries: 0 });

  test('Profile page shows the current account details', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-1');

    const user = await openProfileAsNewCustomer(testData.tcPROF1.user);
    await profilePage.verifyAccountDetails(user);
  });

  test('Valid update saves and confirms, fading after 5s', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-4');
    const { edit, expectedMessage, fadeWindow } = testData.tcPROF4;

    const user = await openProfileAsNewCustomer(testData.tcPROF4.user);
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

    const user = await openProfileAsNewCustomer(testData.tcPROF5.user);
    await profilePage.verifyNames(user.firstName, user.lastName);
  });

  test('Updating address fields does not error or 404', { tag: ['@regression'] }, async () => {
    await allure.feature('Customer profile');
    await allure.testCaseId('TC-PROF-7');
    const { address, expectedMessage } = testData.tcPROF7;

    const user = await openProfileAsNewCustomer(testData.tcPROF7.user);
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
    apisUserAccount = new ApisUserAccount(request);
    accountPage = new AccountPage(page);
    loginPage = new LoginPage(page);
    profilePage = new ProfilePage(page);
  });
});
