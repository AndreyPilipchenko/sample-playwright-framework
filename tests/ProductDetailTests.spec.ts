import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';
import { newUuid } from '../src/utils/UniqueData';

let productDetailPage: ProductDetailPage;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../resources/testData/ProductDetailTestJsonFile.json');

test.describe('Product Detail', () => {

  test('Quantity selector is displayed defaulting to 1', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-3');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD3);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyProductInStock();
    await productDetailPage.verifyQuantitySelectorDisplayed();
    await productDetailPage.verifyQuantity(testData.tcPD3.expectedDefaultQuantity);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/ProductDetailTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    productDetailPage = new ProductDetailPage(page);
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
