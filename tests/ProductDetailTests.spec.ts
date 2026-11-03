import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';

let productDetailPage: ProductDetailPage;

let testData: typeof import('../resources/testData/ProductDetailTestJsonFile.json');

test.describe('Product Detail', () => {

  test('Quantity selector is displayed defaulting to 1', { tag: ['@smoke'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-3');

    await productDetailPage.navigate(testData.tcPD3.inStockProductId);
    await productDetailPage.verifyProductInStock();
    await productDetailPage.verifyQuantitySelectorDisplayed();
    await productDetailPage.verifyQuantity(testData.tcPD3.expectedDefaultQuantity);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/ProductDetailTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page }) => {
    productDetailPage = new ProductDetailPage(page);
  });

});
