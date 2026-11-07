import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { AccountPage } from '../../../src/pages/AccountPage';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ProfilePage } from '../../../src/pages/ProfilePage';
import { loadTestData } from '../../../src/utils/TestData';
import { CustomerFlows } from '../../../src/helpers/CustomerFlows';

let apisUserAccount: ApisUserAccount;
let accountPage: AccountPage;
let loginPage: LoginPage;
let profilePage: ProfilePage;
let customerFlows: CustomerFlows;

let testData: typeof import('../../../resources/testData/ChangePasswordTestJsonFile.json');

/** Never retried: this target locks an account after ONE failed login (known defect #21). */
test.describe('Change Password', () => {
  test.describe.configure({ retries: 0 });

  test('Form shows current, new and confirm password fields', { tag: ['@regression'] }, async () => {
    await allure.feature('Change Password');
    await allure.testCaseId('TC-CPW-1');

    const { labels, newPassword } = testData.tcCPW1;

    const user = await customerFlows.openProfileAsNewCustomer(testData.tcCPW1.user);
    await profilePage.verifyChangePasswordFieldsShown(labels);
    // Required means a submission without the field changes nothing, whatever way the build enforces it.
    await profilePage.submitIncompletePasswordChange(user.password, '', newPassword);
    await profilePage.submitIncompletePasswordChange(user.password, newPassword, '');
    await profilePage.submitIncompletePasswordChange('', newPassword, newPassword);
    await apisUserAccount.verifyCanLogIn(user.email, user.password);
  });

  test('Mismatched confirmation shows "Passwords do not match."', { tag: ['@regression'] }, async () => {
    await allure.feature('Change Password');
    await allure.testCaseId('TC-CPW-3');
    const { user, newPassword, confirmation, expectedError } = testData.tcCPW3;

    await customerFlows.openProfileAsNewCustomer(user);
    await profilePage.changePassword(user.password, newPassword, confirmation);
    await profilePage.verifyErrorShown(expectedError);
  });

  test('Wrong current password is rejected with its message', { tag: ['@regression'] }, async () => {
    await allure.feature('Change Password');
    await allure.testCaseId('TC-CPW-4');
    const { user, wrongCurrentPassword, newPassword, expectedError } = testData.tcCPW4;

    await customerFlows.openProfileAsNewCustomer(user);
    await profilePage.changePassword(wrongCurrentPassword, newPassword, newPassword);
    await profilePage.verifyErrorShown(expectedError);
  });

  test('Successful change confirms and logs out after 5s', { tag: ['@smoke'] }, async () => {
    await allure.feature('Change Password');
    await allure.testCaseId('TC-CPW-6');
    const { user, newPassword } = testData.tcCPW6;

    await customerFlows.openProfileAsNewCustomer(user);
    await profilePage.changePassword(user.password, newPassword, newPassword);
    await profilePage.verifySuccessMessageShown();
    await profilePage.verifyLoggedOutAfterAbout(testData.tcCPW6.logoutWindow);
  });

  test('Changed password works on the next login', { tag: ['@regression'] }, async () => {
    await allure.feature('Change Password');
    await allure.testCaseId('TC-CPW-7');
    const { user: seed, newPassword } = testData.tcCPW7;

    const user = await customerFlows.openProfileAsNewCustomer(seed);
    await profilePage.changePassword(user.password, newPassword, newPassword);
    await profilePage.verifySuccessMessageShown();
    await loginPage.verifyPageOpened(); // the automatic logout ends the session
    await loginPage.login(user.email, newPassword);
    await accountPage.verifyPageOpened();
  });

  test.beforeAll(async () => {
    testData = loadTestData('ChangePasswordTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    apisUserAccount = new ApisUserAccount(request);
    accountPage = new AccountPage(page);
    loginPage = new LoginPage(page);
    profilePage = new ProfilePage(page);
    customerFlows = new CustomerFlows(page, request);
  });
});
