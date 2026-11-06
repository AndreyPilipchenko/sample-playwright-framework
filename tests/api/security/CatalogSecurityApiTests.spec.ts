import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisBrands } from '../../../src/apis/ApisBrands';
import { ApisProducts } from '../../../src/apis/ApisProducts';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisBrands: ApisBrands;
let apisProducts: ApisProducts;
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
    const status = await apisBrands.deleteBrandWithoutToken(catalog.brandId);
    await apisBrands.verifyDeleteRefused(catalog.brandId, status);
    await apisBrands.getBrand(catalog.brandId);
  });

  test('A product cannot be deleted without an admin token', { tag: ['@regression'] }, async () => {
    await allure.feature('Catalog API security');
    await allure.testCaseId('TC-API-6');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcApi6);
    const status = await apisProducts.deleteProductWithoutToken(catalog.products[0].id);
    await apisProducts.verifyDeleteRefused(catalog.products[0].id, status);
    await apisProducts.getProduct(catalog.products[0].id);
  });

  test.beforeAll(async () => {
    testData = loadTestData('CatalogSecurityApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisBrands = new ApisBrands(request);
    apisProducts = new ApisProducts(request);
    apisProductCatalog = new ApisProductCatalog(request);
  });
});
