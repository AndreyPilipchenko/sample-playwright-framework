import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;

let seedData: typeof import('../../../resources/testData/CatalogSeedingTestJsonFile.json');
let catalogData: typeof import('../../../resources/testData/ProductCatalogApiTestJsonFile.json');

/** Category calls: records carry a per-run UUID and are left behind on purpose (deleting needs an admin token). */
test.describe('Category API', () => {

  test('A created category is stored as a top-level category', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-2');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), seedData.seedApi2);
    const category = await apisProductCatalog.getCategory(catalog.categoryId);
    await apisProductCatalog.verifyTopLevelCategory(category, catalog.categoryId, catalog.categoryName);
  });

  test('Created products are listed in their category and found by search', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-4');

    const uuid = newUuid();
    const catalog = await apisProductCatalog.seedCatalog(uuid, seedData.seedApi4);
    await apisProductCatalog.verifyProductsListedAndSearchable(catalog, uuid);
  });

  test('A category without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-3');

    const reportedFields = await apisProductCatalog.createCategoryWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredFieldsReported('category', reportedFields, catalogData.catalogApi3.requiredFields);
  });

  test.beforeAll(async () => {
    seedData = loadTestData('CatalogSeedingTestJsonFile.json');
    catalogData = loadTestData('ProductCatalogApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
