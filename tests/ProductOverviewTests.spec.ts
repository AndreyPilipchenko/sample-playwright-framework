import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { HomePage } from '../src/pages/HomePage';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';
import { newUuid, searchTokenOf } from '../src/utils/UniqueData';

let homePage: HomePage;
let productDetailPage: ProductDetailPage;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../resources/testData/ProductOverviewTestJsonFile.json');

/**
 * Every case seeds its own brand, category and products through the API, named with a
 * per-run UUID, and works only with those. The seeded records are left behind on purpose
 * (deleting needs an admin token); the UUID keeps every run's records apart.
 */
test.describe('Product Overview', () => {

  test('Clicking a product card found by search navigates to its detail page', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-2');

    const uuid = newUuid();
    const catalog = await apisProductCatalog.seedCatalog(uuid, testData.tcPO2Search);
    await homePage.navigate();
    await homePage.searchFor(searchTokenOf(uuid));
    await homePage.clickProductCard(catalog.products[0].name);
    await productDetailPage.verifyProductDetailOpened(catalog.products[0].name);
  });

  test('Clicking a product card found by its category filter navigates to its detail page', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-2');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO2Category);
    await homePage.navigate();
    await homePage.filterByCategory(catalog.categoryName);
    await homePage.clickProductCard(catalog.products[0].name);
    await productDetailPage.verifyProductDetailOpened(catalog.products[0].name);
  });

  test('Search with a valid 3-40 character query filters the grid', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-5');

    const uuid = newUuid();
    await apisProductCatalog.seedCatalog(uuid, testData.tcPO5);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.searchFor(searchTokenOf(uuid));
    await homePage.verifyOnlyProductsMatchingSearchShown(searchTokenOf(uuid));
  });

  test('Category checkbox filters the grid to that category', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-8');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO8);
    const seededNames = catalog.products.map((product) => product.name);
    const categoryListing = await apisProductCatalog.getCategoryListing(catalog.categorySlug);
    await apisProductCatalog.verifyAllProductsInCategory(categoryListing, catalog.categorySlug);
    await apisProductCatalog.verifyProductNamesInclude(categoryListing, seededNames);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.filterByCategory(catalog.categoryName);
    await homePage.verifyProductNamesShown(categoryListing.productNames);
    await homePage.verifyProductNamesInclude(seededNames);
  });

  test('Each sort option orders the grid correctly', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-13');
    const { sortNameZA, sortNameAZ, sortPriceHighLow, sortPriceLowHigh, sortCo2Worst, sortCo2Best } = testData.tcPO13;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO13);
    const [lowest, middle, highest] = catalog.products.map((product) => product.name);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.filterByCategory(catalog.categoryName);
    await homePage.verifyProductNamesShown([lowest, middle, highest]);
    // The options alternate between descending and ascending, so a grid that has not re-sorted yet never matches by chance.
    await homePage.sortBy(sortNameZA);
    await homePage.verifyProductNamesInOrder([highest, middle, lowest]);
    await homePage.sortBy(sortNameAZ);
    await homePage.verifyProductNamesInOrder([lowest, middle, highest]);
    await homePage.sortBy(sortPriceHighLow);
    await homePage.verifyProductNamesInOrder([highest, middle, lowest]);
    await homePage.sortBy(sortPriceLowHigh);
    await homePage.verifyProductNamesInOrder([lowest, middle, highest]);
    await homePage.sortBy(sortCo2Worst);
    await homePage.verifyProductNamesInOrder([highest, middle, lowest]);
    await homePage.sortBy(sortCo2Best);
    await homePage.verifyProductNamesInOrder([lowest, middle, highest]);
  });

  test('Adjusting the price range filters the grid to that range', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-15');
    const { minimumPrice, maximumPrice } = testData.tcPO15;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO15);
    const [, middle] = catalog.products.map((product) => product.name);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.filterByCategory(catalog.categoryName);
    await homePage.setPriceRange(minimumPrice, maximumPrice);
    await homePage.verifyProductNamesShown([middle]);
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
