import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { HomePage } from '../src/pages/HomePage';
import { HeaderPage } from '../src/pages/HeaderPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';
import { newUuid } from '../src/utils/UniqueData';

let homePage: HomePage;
let headerPage: HeaderPage;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../resources/testData/HomeTestJsonFile.json');

test.describe('Home', () => {

  test('Home page loads with the product catalog', { tag: ['@smoke'] }, async () => {
    await allure.feature('Home');
    await allure.testCaseId('home1');

    await apisProductCatalog.seedCatalog(newUuid(), testData.home1);
    await homePage.navigate();
    await headerPage.verifyNavigationVisible();
    await homePage.verifyPageTitle(new RegExp(testData.home1.expectedTitleContains));
    await homePage.verifyProductCatalogVisible(testData.home1.minimumProductCount);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/HomeTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    homePage = new HomePage(page);
    headerPage = new HeaderPage(page);
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
