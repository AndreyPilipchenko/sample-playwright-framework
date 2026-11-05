import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;

let seedData: typeof import('../../../resources/testData/CatalogSeedingTestJsonFile.json');
let catalogData: typeof import('../../../resources/testData/ProductCatalogApiTestJsonFile.json');

/** Brand calls: records carry a per-run UUID and are left behind on purpose (deleting needs an admin token). */
test.describe('Brand API', () => {

  test('A created brand is stored with its name and slug', { tag: ['@regression'] }, async () => {
    await allure.feature('Seeding API');
    await allure.testCaseId('seed-api-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), seedData.seedApi1);
    const brand = await apisProductCatalog.getBrand(catalog.brandId);
    await apisProductCatalog.verifyBrand(brand, catalog.brandId, catalog.brandName);
  });

  test('A brand without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Product catalog API');
    await allure.testCaseId('catalog-api-2');

    const reportedFields = await apisProductCatalog.createBrandWithoutRequiredFields();
    await apisProductCatalog.verifyRequiredFieldsReported('brand', reportedFields, catalogData.catalogApi2.requiredFields);
  });

  test.beforeAll(async () => {
    seedData = loadTestData('CatalogSeedingTestJsonFile.json');
    catalogData = loadTestData('ProductCatalogApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
