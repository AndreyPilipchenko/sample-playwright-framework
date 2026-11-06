import * as allure from 'allure-js-commons';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { ApisUsers } from '../../../src/apis/ApisUsers';
import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import { AdminDashboardPage } from '../../../src/pages/AdminDashboardPage';
import { AdminOrdersPage } from '../../../src/pages/AdminOrdersPage';
import { AdminProductsPage } from '../../../src/pages/AdminProductsPage';
import { AdminUsersPage } from '../../../src/pages/AdminUsersPage';
import { LoginPage } from '../../../src/pages/LoginPage';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let adminDashboardPage: AdminDashboardPage;
let adminProductsPage: AdminProductsPage;
let adminOrdersPage: AdminOrdersPage;
let adminUsersPage: AdminUsersPage;
let loginPage: LoginPage;
let apisUserAccount: ApisUserAccount;

let testData: typeof import('../../../resources/testData/AdminAccessTestJsonFile.json');

/**
 * A signed-in customer must not reach the admin area: every admin route sends them to the login page, and an
 * admin-only API call is refused with 403 (a wrong role is "forbidden", not "unauthenticated": known defect 83).
 * The API call signs in as its own freshly registered customer.
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('Admin access', () => {
  test.use({ role: 'customer' });
  test.describe.configure({ retries: 0 });

  test('A non-admin cannot reach admin routes', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Admin access');
    await allure.testCaseId('TC-ADM-12');
    const user = withUniqueEmail(testData.tcADM12.user, newUuid());

    await adminDashboardPage.navigate();
    await loginPage.verifyPageOpened();
    await adminProductsPage.navigate();
    await loginPage.verifyPageOpened();
    await adminOrdersPage.navigate();
    await loginPage.verifyPageOpened();
    await adminUsersPage.navigate();
    await loginPage.verifyPageOpened();

    await apisUserAccount.registerUser(user);
    const apisUsers = new ApisUsers(request, () => apisUserAccount.getAccessToken(user.email, user.password));
    const status = await apisUsers.getUserListStatus();
    await apisUsers.verifyWrongRoleForbidden(status);
  });

  test.beforeAll(async () => {
    testData = loadTestData('AdminAccessTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    adminDashboardPage = new AdminDashboardPage(page);
    adminProductsPage = new AdminProductsPage(page);
    adminOrdersPage = new AdminOrdersPage(page);
    adminUsersPage = new AdminUsersPage(page);
    loginPage = new LoginPage(page);
    apisUserAccount = new ApisUserAccount(request);
  });
});
