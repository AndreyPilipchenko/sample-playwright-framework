import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ApisProductCatalog } from '../../src/apis/ApisProductCatalog';
import { ApisUserAccount } from '../../src/apis/ApisUserAccount';
import { newUuid, searchTokenOf, withUuid } from '../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;
let apisUserAccount: ApisUserAccount;

let testData: typeof import('../../resources/testData/CatalogSeedingTestJsonFile.json');

/**
 * The API surface the UI specs seed their own data through. No browser: each case creates
 * its records with a per-run UUID in every name, reads them back, and leaves them behind on
 * purpose (deleting needs an admin token).
 */
test.describe('Catalog and customer seeding API', () => {

  test('A created brand is stored with its name and slug', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.seedApi1);
    const brand = await apisProductCatalog.getBrand(catalog.brandId);
    await apisProductCatalog.verifyBrand(brand, catalog.brandId, catalog.brandName);
  });

  test('A created category is stored as a top-level category', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-2');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.seedApi2);
    const category = await apisProductCatalog.getCategory(catalog.categoryId);
    await apisProductCatalog.verifyTopLevelCategory(category, catalog.categoryId, catalog.categoryName);
  });

  test('A created product is stored with its price, stock, category and brand', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-3');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.seedApi3);
    const [seeded] = catalog.products;
    const [template] = testData.seedApi3.products;
    const product = await apisProductCatalog.getProduct(seeded.id);
    await apisProductCatalog.verifyProductStored(product, {
      id: seeded.id,
      name: seeded.name,
      price: template.price,
      stock: template.stock,
      categoryId: catalog.categoryId,
      brandId: catalog.brandId,
    });
  });

  test('Created products are listed in their category and found by search', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-4');

    const uuid = newUuid();
    const catalog = await apisProductCatalog.seedCatalog(uuid, testData.seedApi4);
    const seededNames = catalog.products.map((product) => product.name);
    const listing = await apisProductCatalog.getCategoryListing(catalog.categorySlug);
    await apisProductCatalog.verifyAllProductsInCategory(listing, catalog.categorySlug);
    await apisProductCatalog.verifyProductNamesFound(listing.productNames, seededNames);
    const found = await apisProductCatalog.searchProductNames(searchTokenOf(uuid));
    await apisProductCatalog.verifyProductNamesFound(found, seededNames);
  });

  test('A product without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-5');

    const reportedFields = await apisProductCatalog.createProductWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredProductFieldsReported(reportedFields, testData.seedApi5.requiredFields);
  });

  test('A registered customer can log in through the API', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-6');

    const user = { ...testData.seedApi6.user, email: withUuid(testData.seedApi6.user.email, newUuid()) };
    await apisUserAccount.registerUser(user);
    await apisUserAccount.getAccessToken(user.email, user.password);
  });

  test('Registering an already registered email is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-7');

    const user = { ...testData.seedApi7.user, email: withUuid(testData.seedApi7.user.email, newUuid()) };
    await apisUserAccount.registerUser(user);
    await apisUserAccount.verifyRegisteringExistingEmailIsRejected(user);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/CatalogSeedingTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
    apisUserAccount = new ApisUserAccount(request);
  });

});
