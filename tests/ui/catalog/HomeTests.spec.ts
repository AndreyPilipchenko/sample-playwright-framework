import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { HomePage } from '../../../src/pages/HomePage';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { loadTestData } from '../../../src/utils/TestData';

let homePage: HomePage;
let headerPage: HeaderPage;

let testData: typeof import('../../../resources/testData/HomeTestJsonFile.json');

test.describe('Home', () => {

  test('Home page loads with the product catalog', { tag: ['@smoke'] }, async () => {
    await allure.feature('Home');
    await allure.testCaseId('home1');

    await homePage.navigate();
    await headerPage.verifyNavigationVisible();
    await homePage.verifyPageTitle(new RegExp(testData.home1.expectedTitleContains));
    await homePage.verifyProductCatalogVisible();
  });

  test.beforeAll(async () => {
    testData = loadTestData('HomeTestJsonFile.json');
  });

  test.beforeEach(({ page }) => {
    homePage = new HomePage(page);
    headerPage = new HeaderPage(page);
  });

});
