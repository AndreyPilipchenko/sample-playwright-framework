import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { AccountPage } from '../../../src/pages/AccountPage';
import { InvoicesPage } from '../../../src/pages/InvoicesPage';
import { FavoritesPage } from '../../../src/pages/FavoritesPage';
import { AdminDashboardPage } from '../../../src/pages/AdminDashboardPage';
import { LoginPage } from '../../../src/pages/LoginPage';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { HomePage } from '../../../src/pages/HomePage';
import { CategoryPage } from '../../../src/pages/CategoryPage';
import { RentalsPage } from '../../../src/pages/RentalsPage';
import { loadTestData } from '../../../src/utils/TestData';
import { CustomerFlows } from '../../../src/helpers/CustomerFlows';

let accountPage: AccountPage;
let invoicesPage: InvoicesPage;
let favoritesPage: FavoritesPage;
let adminDashboardPage: AdminDashboardPage;
let loginPage: LoginPage;
let headerPage: HeaderPage;
let homePage: HomePage;
let categoryPage: CategoryPage;
let rentalsPage: RentalsPage;
let customerFlows: CustomerFlows;

let testData: typeof import('../../../resources/testData/NavigationTestJsonFile.json');

test.describe('Navigation & Header', () => {

  test('Guarded routes redirect to login when unauthenticated', { tag: ['@smoke'] }, async () => {
    await allure.feature('Navigation & Header');
    await allure.testCaseId('TC-NAV-5');

    await accountPage.navigate();
    await loginPage.verifyPageOpened();
    await invoicesPage.navigate();
    await loginPage.verifyPageOpened();
    await favoritesPage.navigate();
    await loginPage.verifyPageOpened();
    await adminDashboardPage.navigate();
    await loginPage.verifyPageOpened();
  });

  test('Home link navigates to the home page', { tag: ['@regression'] }, async () => {
    await allure.feature('Navigation & Header');
    await allure.testCaseId('TC-NAV-1');

    await rentalsPage.navigate();
    await headerPage.clickHome();
    await homePage.verifyHomePageOpened();
  });

  test('Each category nav entry opens its category page', { tag: ['@regression'] }, async () => {
    await allure.feature('Navigation & Header');
    await allure.testCaseId('TC-NAV-3');
    const { handTools, powerTools, chainsaws } = testData.tcNAV3;

    await homePage.navigate();
    await headerPage.openCategoriesEntry(handTools.entry);
    await categoryPage.verifyCategoryOpened(handTools.expectedTitle, handTools.knownProduct);
    await headerPage.openCategoriesEntry(powerTools.entry);
    await categoryPage.verifyCategoryOpened(powerTools.expectedTitle, powerTools.knownProduct);
    await headerPage.openCategoriesEntry(chainsaws.entry);
    await categoryPage.verifyResolvedWithoutNotFound(chainsaws.expectedTitle);
  });

  /** Never retried: this target locks an account after ONE failed login (known defect #21). */
  test.describe('Signed in', () => {
    test.describe.configure({ retries: 0 });

    test("Signed-in user's name is displayed in the header", { tag: ['@regression'] }, async () => {
      await allure.feature('Navigation & Header');
      await allure.testCaseId('TC-NAV-4');

      const user = await customerFlows.signInAsNewCustomer(testData.tcNAV4.user);
      await headerPage.verifySignedInUserName(`${user.firstName} ${user.lastName}`);
    });
  });

  test.beforeAll(async () => {
    testData = loadTestData('NavigationTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    customerFlows = new CustomerFlows(page, request);
    accountPage = new AccountPage(page);
    invoicesPage = new InvoicesPage(page);
    favoritesPage = new FavoritesPage(page);
    adminDashboardPage = new AdminDashboardPage(page);
    loginPage = new LoginPage(page);
    headerPage = new HeaderPage(page);
    homePage = new HomePage(page);
    categoryPage = new CategoryPage(page);
    rentalsPage = new RentalsPage(page);
  });

});
