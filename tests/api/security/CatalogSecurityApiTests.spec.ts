import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../../resources/testData/CatalogSecurityApiTestJsonFile.json');

/**
 * Deleting catalog records needs an admin token. Each case seeds its own brand and product, so a defective
 * build that lets the delete through only loses a record the case created (the case attacks
 * the target, so it is meant for the local stack).
 */
test.describe('Catalog API security', () => {

  test('A brand cannot be deleted without an admin token', { tag: ['@regression'] }, async () => {
    await allure.feature('Catalog API security');
    await allure.testCaseId('TC-API-4');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcApi4);
    const status = await apisProductCatalog.deleteBrandWithoutToken(catalog.brandId);
    await apisProductCatalog.verifyDeleteRefused(`the brand ${catalog.brandId}`, status);
    await apisProductCatalog.getBrand(catalog.brandId);
  });

  test('A product cannot be deleted without an admin token', { tag: ['@regression'] }, async () => {
    await allure.feature('Catalog API security');
    await allure.testCaseId('TC-API-6');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcApi6);
    const status = await apisProductCatalog.deleteProductWithoutToken(catalog.products[0].id);
    await apisProductCatalog.verifyDeleteRefused(`the product ${catalog.products[0].id}`, status);
    await apisProductCatalog.getProduct(catalog.products[0].id);
  });

  test.beforeAll(async () => {
    testData = loadTestData('CatalogSecurityApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
  });
});
