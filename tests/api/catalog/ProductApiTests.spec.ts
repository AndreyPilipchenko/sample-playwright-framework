import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, searchTokenOf } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;

let seedData: typeof import('../../../resources/testData/CatalogSeedingTestJsonFile.json');
let catalogData: typeof import('../../../resources/testData/ProductCatalogApiTestJsonFile.json');

/** Product calls: records carry a per-run UUID and are left behind on purpose (deleting needs an admin token). */
test.describe('Product API', () => {

  test('A created product is stored with its price, stock, category and brand', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-3');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), seedData.seedApi3);
    await apisProductCatalog.verifyFirstProductSeeded(catalog, seedData.seedApi3);
  });

  test('A product without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-5');

    const reportedFields = await apisProductCatalog.createProductWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredProductFieldsReported(reportedFields, seedData.seedApi5.requiredFields);
  });

  test('A restocked product is stored with its new stock', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-1');
    const { newStock, products } = catalogData.catalogApi1;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), catalogData.catalogApi1);
    await apisProductCatalog.restockSeededProduct(catalog, products[0], newStock);
    const product = await apisProductCatalog.getProduct(catalog.products[0].id);
    await apisProductCatalog.verifyProductStock(product, newStock);
  });

  test('A search matching no product finds none', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-4');

    const found = await apisProductCatalog.searchProductNames(`${catalogData.catalogApi4.queryPrefix}${searchTokenOf(newUuid())}`);
    await apisProductCatalog.verifyProductNamesFound(found, []);
  });

  test('An unknown product id is not found', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-5');
    const { unknownProductId } = catalogData.catalogApi5;

    const status = await apisProductCatalog.getProductStatus(unknownProductId);
    await apisProductCatalog.verifyNotFound(`the product ${unknownProductId}`, status);
  });

  test.beforeAll(async () => {
    seedData = loadTestData('CatalogSeedingTestJsonFile.json');
    catalogData = loadTestData('ProductCatalogApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
