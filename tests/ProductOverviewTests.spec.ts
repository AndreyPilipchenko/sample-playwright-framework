import { test } from '../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { HomePage } from '../src/pages/HomePage';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';
import { useBrowserLocation } from '../src/utils/BrowserGeolocation';
import { newUuid, searchTokenOf, withUuid } from '../src/utils/UniqueData';

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

  test('Product grid displays cards with image, name and price', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-1');

    await homePage.navigate();
    await homePage.verifyEveryProductCardShowsImageNameAndPrice();
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

  test('Pagination controls appear when products exceed one page', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-3');

    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.verifyPaginationDisplayed(testData.tcPO3.nextPage);
  });

  test('Clicking a page number updates the grid', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-4');

    await homePage.navigate();
    const firstPageNames = await homePage.readProductNames();
    await homePage.goToPage(testData.tcPO4.nextPage);
    await homePage.verifyPageShown(testData.tcPO4.nextPage, firstPageNames);
  });

  test('Search resets all active filters', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-6');
    const { minimumPrice, maximumPrice, activeRange, defaultRange, sortOption } = testData.tcPO6Range;

    const searchedUuid = newUuid();
    const filtered = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO6Filtered);
    const searched = await apisProductCatalog.seedCatalog(searchedUuid, testData.tcPO6Searched);
    await homePage.navigate();
    await homePage.filterByCategory(filtered.categoryName);
    await homePage.filterByBrand(filtered.brandName);
    await homePage.setPriceRange(minimumPrice, maximumPrice);
    await homePage.verifyPriceRange(activeRange);
    await homePage.sortBy(sortOption);
    await homePage.verifyProductNamesShown([filtered.products[0].name]);
    await homePage.searchFor(searchTokenOf(searchedUuid));
    await homePage.verifyProductNamesShown([searched.products[0].name]);
    await homePage.verifyCategoryNotChecked(filtered.categoryName);
    await homePage.verifyBrandNotChecked(filtered.brandName);
    await homePage.verifyPriceRange(defaultRange);
    await homePage.verifySortNotSelected();
  });

  test('Search query below 3 or above 40 characters is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-7');

    await homePage.navigate();
    const shownNames = await homePage.readProductNames();
    await homePage.searchFor(testData.tcPO7.tooShortQuery);
    await homePage.verifySearchRejected(shownNames);
    await homePage.searchFor(testData.tcPO7.tooLongQuery);
    await homePage.verifySearchRejected(shownNames);
  });

  test('Checking a parent category checks all its children', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-9');
    const { parentCategoryName, firstChildCategoryName, secondChildCategoryName } = testData.tcPO9;

    const uuid = newUuid();
    const firstChild = withUuid(firstChildCategoryName, uuid);
    const secondChild = withUuid(secondChildCategoryName, uuid);
    const parent = withUuid(parentCategoryName, uuid);
    const parentId = await apisProductCatalog.createCategory(parent);
    await apisProductCatalog.createCategory(firstChild, parentId);
    await apisProductCatalog.createCategory(secondChild, parentId);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.filterByCategory(parent);
    await homePage.verifyCategoryChecked(firstChild);
    await homePage.verifyCategoryChecked(secondChild);
  });

  test('Brand checkbox filters the grid to that brand', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-11');

    const uuid = newUuid();
    const first = await apisProductCatalog.seedCatalog(uuid, testData.tcPO11First);
    const second = await apisProductCatalog.seedCatalog(uuid, testData.tcPO11Second);
    const crossed = await apisProductCatalog.addProduct(uuid, testData.tcPO11Crossed, second.categoryId, first.brandId);
    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.filterByBrand(first.brandName);
    await homePage.verifyProductNamesShown([first.products[0].name, crossed.name]);
  });

  test('Category and brand filters combine (AND)', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-12');

    const uuid = newUuid();
    const first = await apisProductCatalog.seedCatalog(uuid, testData.tcPO12First);
    const second = await apisProductCatalog.seedCatalog(uuid, testData.tcPO12Second);
    const categoryOnly = await apisProductCatalog.addProduct(uuid, testData.tcPO12CategoryOnly, first.categoryId, second.brandId);
    await apisProductCatalog.addProduct(uuid, testData.tcPO12BrandOnly, second.categoryId, first.brandId);
    await homePage.navigate();
    await homePage.filterByCategory(first.categoryName);
    await homePage.verifyProductNamesShown([first.products[0].name, categoryOnly.name]);
    await homePage.filterByBrand(first.brandName);
    await homePage.verifyProductNamesShown([first.products[0].name]);
  });

  test('Price range slider defaults to $1-$100 with $200 maximum', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-14');

    await homePage.navigate();
    await homePage.verifyProductCatalogVisible();
    await homePage.verifyPriceRange(testData.tcPO14);
  });

  test('Product with no stock shows "Out of stock"', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Overview');
    await allure.testCaseId('TC-PO-17');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO17);
    const [soldOut, stocked] = catalog.products;
    await homePage.navigate();
    await homePage.filterByCategory(catalog.categoryName);
    await homePage.verifyProductCardOutOfStock(soldOut.name, testData.tcPO17.expectedLabel);
    await homePage.verifyProductCardInStock(stocked.name);
  });

  /** Location discounts come from the position the browser reports. */
  test.describe('At a location with a discount', () => {
    test.use({ permissions: ['geolocation'], geolocation: { latitude: 52.37, longitude: 4.9 } });

    test('Discounted product shows struck-through original and discounted price', { tag: ['@regression'] }, async ({ page }) => {
      await allure.feature('Product Overview');
      await allure.testCaseId('TC-PO-16');
      const { position, originalPrice, discountedPrice } = testData.tcPO16;

      const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPO16);
      await homePage.navigate();
      await useBrowserLocation(page, position);
      await homePage.filterByCategory(catalog.categoryName);
      await homePage.verifyProductCardDiscounted(catalog.products[0].name, { originalPrice, discountedPrice });
    });
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
