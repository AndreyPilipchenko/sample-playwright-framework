import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { databases } from '../../../src/config/databases';
import { DbsUserAccount } from '../../../src/dbs/DbsUserAccount';
import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import { AdminUserFormPage } from '../../../src/pages/AdminUserFormPage';
import { AdminUsersPage } from '../../../src/pages/AdminUsersPage';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, searchTokenOf, withUniqueEmail } from '../../../src/utils/UniqueData';

let adminUsersPage: AdminUsersPage;
let adminUserFormPage: AdminUserFormPage;
let apisUserAccount: ApisUserAccount;
let dbsUserAccount: DbsUserAccount;

let testData: typeof import('../../../resources/testData/AdminUserTestJsonFile.json');

/**
 * Admin user management on the local stack. Each case registers its own customer through the API (email
 * carries a per-run UUID) and finds it in the admin list by that email. The enable and disable cases check the
 * outcome where it matters, a sign-in through the API; re-enabling starts from a disabled account, which this
 * build can only produce in the database (APP_DB_LOCAL).
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('Admin users', () => {
  test.use({ role: 'admin' });
  test.describe.configure({ retries: 0 });

  test('Users can be listed, viewed, edited and deleted', { tag: ['@regression'] }, async () => {
    await allure.feature('Admin users');
    await allure.testCaseId('TC-ADM-7');
    const { editedFirstName } = testData.tcADM7;
    const uuid = newUuid();
    const user = withUniqueEmail(testData.tcADM7.user, uuid);

    await apisUserAccount.registerUser(user);
    await adminUsersPage.navigate();
    await adminUsersPage.searchUser(searchTokenOf(uuid));
    await adminUsersPage.verifyUserListed(user.email, `${user.firstName} ${user.lastName}`);

    await adminUsersPage.openUser(user.email);
    await adminUserFormPage.verifyUserLoaded(user.firstName, user.lastName, user.email);
    await adminUserFormPage.changeFirstName(editedFirstName);
    await adminUserFormPage.save();
    await adminUsersPage.navigate();
    await adminUsersPage.searchUser(searchTokenOf(uuid));
    await adminUsersPage.verifyUserListed(user.email, `${editedFirstName} ${user.lastName}`);

    await adminUsersPage.deleteUser(user.email);
    await adminUsersPage.verifyUserNotListed(user.email);
  });

  test('Disabling a user immediately blocks their login', { tag: ['@regression'] }, async () => {
    await allure.feature('Admin users');
    await allure.testCaseId('TC-ADM-8');
    const uuid = newUuid();
    const user = withUniqueEmail(testData.tcADM8.user, uuid);

    await apisUserAccount.registerUser(user);
    await adminUsersPage.navigate();
    await adminUsersPage.searchUser(searchTokenOf(uuid));
    await adminUsersPage.openUser(user.email);
    await adminUserFormPage.verifyUserLoaded(user.firstName, user.lastName, user.email);
    await adminUserFormPage.verifyEnabled();
    await adminUserFormPage.setEnabled(false);
    await adminUserFormPage.save();
    await apisUserAccount.verifyLoginDisabled(user.email, user.password);
  });

  test('Re-enabling a user restores their access', { tag: ['@regression', '@db'] }, async () => {
    await allure.feature('Admin users');
    await allure.testCaseId('TC-ADM-9');
    const uuid = newUuid();
    const user = withUniqueEmail(testData.tcADM9.user, uuid);

    await apisUserAccount.registerUser(user);
    await dbsUserAccount.disableUser(user.email);
    await adminUsersPage.navigate();
    await adminUsersPage.searchUser(searchTokenOf(uuid));
    await adminUsersPage.openUser(user.email);
    await adminUserFormPage.verifyUserLoaded(user.firstName, user.lastName, user.email);
    await adminUserFormPage.verifyDisabled();
    await adminUserFormPage.setEnabled(true);
    await adminUserFormPage.save();
    await apisUserAccount.verifyCanLogIn(user.email, user.password);
  });

  test.beforeAll(async () => {
    dbsUserAccount = new DbsUserAccount(databases.appDb);
    testData = loadTestData('AdminUserTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    adminUsersPage = new AdminUsersPage(page);
    adminUserFormPage = new AdminUserFormPage(page);
    apisUserAccount = new ApisUserAccount(request);
  });

  test.afterAll(async () => {
    await dbsUserAccount.close();
  });
});
