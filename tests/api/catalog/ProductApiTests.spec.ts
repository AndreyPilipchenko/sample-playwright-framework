import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, searchTokenOf } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../../resources/testData/ProductApiTestJsonFile.json');

/** Product calls: records carry a per-run UUID and are left behind on purpose (deleting needs an admin token). */
test.describe('Product API', () => {

  test('A created product is stored with its price, stock, category and brand', { tag: ['@regression'] }, async () => {
    await allure.feature('Product API');
    await allure.testCaseId('product-api-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.productApi1);
    await apisProductCatalog.verifyFirstProductSeeded(catalog, testData.productApi1);
  });

  test('A product without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Product API');
    await allure.testCaseId('product-api-2');

    const reportedFields = await apisProductCatalog.createProductWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredProductFieldsReported(reportedFields, testData.productApi2.requiredFields);
  });

  test('A restocked product is stored with its new stock', { tag: ['@regression'] }, async () => {
    await allure.feature('Product API');
    await allure.testCaseId('product-api-3');
    const { newStock, products } = testData.productApi3;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.productApi3);
    await apisProductCatalog.restockSeededProduct(catalog, products[0], newStock);
    const product = await apisProductCatalog.getProduct(catalog.products[0].id);
    await apisProductCatalog.verifyProductStock(product, newStock);
  });

  test('A search matching no product finds none', { tag: ['@regression'] }, async () => {
    await allure.feature('Product API');
    await allure.testCaseId('product-api-4');

    const found = await apisProductCatalog.searchProductNames(`${testData.productApi4.queryPrefix}${searchTokenOf(newUuid())}`);
    await apisProductCatalog.verifyProductNamesFound(found, []);
  });

  test('An unknown product id is not found', { tag: ['@regression'] }, async () => {
    await allure.feature('Product API');
    await allure.testCaseId('product-api-5');
    const { unknownProductId } = testData.productApi5;

    const status = await apisProductCatalog.getProductStatus(unknownProductId);
    await apisProductCatalog.verifyNotFound(`the product ${unknownProductId}`, status);
  });

  test.beforeAll(async () => {
    testData = loadTestData('ProductApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
