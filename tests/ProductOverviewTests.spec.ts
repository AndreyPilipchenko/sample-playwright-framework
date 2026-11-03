import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { HomePage } from '../src/pages/HomePage';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';

let homePage: HomePage;
let productDetailPage: ProductDetailPage;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../resources/testData/ProductOverviewTestJsonFile.json');

test.describe('Product Overview', () => {

  test('Clicking a product card navigates to its detail page', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-2');

    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.clickProductCard(testData.tcPO2.productName);
    await productDetailPage.verifyProductDetailOpened(testData.tcPO2.productName);
  });

  test('Search with a valid 3-40 character query filters the grid', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-5');

    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.searchFor(testData.tcPO5.searchQuery);
    await homePage.verifyOnlyProductsMatchingSearchShown(testData.tcPO5.searchQuery);
  });

  test('Category checkbox filters the grid to that category', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-8');

    const categoryListing = await apisProductCatalog.getCategoryListing(testData.tcPO8.categorySlug);
    await apisProductCatalog.verifyAllProductsInCategory(categoryListing, testData.tcPO8.categorySlug);
    await apisProductCatalog.verifyProductNamesInclude(categoryListing, testData.tcPO8.knownProductNames);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.filterByCategory(testData.tcPO8.categoryName);
    await homePage.verifyProductNamesShown(categoryListing.productNames);
    await homePage.verifyProductNamesInclude(testData.tcPO8.knownProductNames);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/ProductOverviewTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    homePage = new HomePage(page);
    productDetailPage = new ProductDetailPage(page);
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
