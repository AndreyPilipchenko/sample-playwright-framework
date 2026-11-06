import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisBrands } from '../../../src/apis/ApisBrands';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisBrands: ApisBrands;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../../resources/testData/BrandApiTestJsonFile.json');

/** Brand calls: records carry a per-run UUID and are left behind on purpose (deleting needs an admin token). */
test.describe('Brand API', () => {

  test('A created brand is stored with its name and slug', { tag: ['@regression'] }, async () => {
    await allure.feature('Brand API');
    await allure.testCaseId('brand-api-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.brandApi1);
    const brand = await apisBrands.getBrand(catalog.brandId);
    await apisBrands.verifyBrand(brand, catalog.brandId, catalog.brandName);
  });

  test('A brand without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Brand API');
    await allure.testCaseId('brand-api-2');

    const reportedFields = await apisBrands.createBrandWithoutRequiredFields();
    await apisBrands.verifyRequiredFieldsReported(reportedFields, testData.brandApi2.requiredFields);
  });

  test.beforeAll(async () => {
    testData = loadTestData('BrandApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisBrands = new ApisBrands(request);
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
