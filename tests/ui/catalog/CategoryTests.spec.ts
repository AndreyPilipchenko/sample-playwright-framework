import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { CategoryPage } from '../../../src/pages/CategoryPage';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { HomePage } from '../../../src/pages/HomePage';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;
let categoryPage: CategoryPage;
let headerPage: HeaderPage;
let homePage: HomePage;

let testData: typeof import('../../../resources/testData/CategoryTestJsonFile.json');

test.describe('Category', () => {

  test("Category page lists only that category's products", { tag: ['@smoke'] }, async () => {
    await allure.feature('Category');
    await allure.testCaseId('TC-CAT-1');

    const uuid = newUuid();
    const listed = await apisProductCatalog.seedCatalog(uuid, testData.tcCAT1Listed);
    await apisProductCatalog.seedCatalog(uuid, testData.tcCAT1Other);
    await categoryPage.navigate(listed.categorySlug);
    await categoryPage.verifyProductNamesShown(listed.products.map((product) => product.name));
  });

  test('Same filter set as product overview is available', { tag: ['@regression'] }, async () => {
    await allure.feature('Category');
    await allure.testCaseId('TC-CAT-3');

    await categoryPage.navigate(testData.tcCAT3.categorySlug);
    await categoryPage.verifyFiltersAvailable();
  });

  test('"Chainsaws" category resolves without a 404', { tag: ['@regression'] }, async () => {
    await allure.feature('Category');
    await allure.testCaseId('TC-CAT-4');

    await homePage.navigate();
    await headerPage.openCategoriesEntry(testData.tcCAT4.entry);
    await categoryPage.verifyResolvedWithoutNotFound(testData.tcCAT4.expectedTitle);
  });

  test.beforeAll(async () => {
    testData = loadTestData('CategoryTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
    categoryPage = new CategoryPage(page);
    headerPage = new HeaderPage(page);
    homePage = new HomePage(page);
  });

});
