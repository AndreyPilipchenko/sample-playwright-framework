import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ApisProductCatalog } from '../../src/apis/ApisProductCatalog';
import { newUuid, searchTokenOf } from '../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../resources/testData/ProductCatalogApiTestJsonFile.json');

/**
 * The catalog calls beyond plain seeding (see CatalogSeedingTests): changing stock, the other
 * required-field refusals, and the answers for nothing found. No browser; records carry a per-run
 * UUID and are left behind on purpose (deleting needs an admin token).
 */
test.describe('Product catalog API', () => {

  test('A restocked product is stored with its new stock', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-1');
    const { newStock, products } = testData.catalogApi1;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.catalogApi1);
    await apisProductCatalog.restockSeededProduct(catalog, products[0], newStock);
    const product = await apisProductCatalog.getProduct(catalog.products[0].id);
    await apisProductCatalog.verifyProductStock(product, newStock);
  });

  test('A brand without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-2');

    const reportedFields = await apisProductCatalog.createBrandWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredFieldsReported('brand', reportedFields, testData.catalogApi2.requiredFields);
  });

  test('A category without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-3');

    const reportedFields = await apisProductCatalog.createCategoryWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredFieldsReported('category', reportedFields, testData.catalogApi3.requiredFields);
  });

  test('A search matching no product finds none', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-4');

    const found = await apisProductCatalog.searchProductNames(`${testData.catalogApi4.queryPrefix}${searchTokenOf(newUuid())}`);
    await apisProductCatalog.verifyProductNamesFound(found, []);
  });

  test('An unknown product id is not found', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-5');
    const { unknownProductId } = testData.catalogApi5;

    const status = await apisProductCatalog.getProductStatus(unknownProductId);
    await apisProductCatalog.verifyNotFound(`the product ${unknownProductId}`, status);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/ProductCatalogApiTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
