import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { CartPage } from '../src/pages/CartPage';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';
import { newUuid } from '../src/utils/UniqueData';

let cartPage: CartPage;
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

  test('Detail page shows name, price, description and image', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD1);
    const [product] = catalog.products;
    await productDetailPage.navigate(product.id);
    await productDetailPage.verifyProductDetails({ name: product.name, price: testData.tcPD1.expectedPrice, description: testData.tcPD1.products[0].description });
  });

  test('Plus button increases quantity', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-4');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD4);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyQuantity(testData.tcPD4.expectedStartQuantity);
    await productDetailPage.increaseQuantity();
    await productDetailPage.verifyQuantity(testData.tcPD4.expectedIncreasedQuantity);
  });

  test('Minus button decreases quantity', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-5');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD5);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.enterQuantity(testData.tcPD5.startQuantity);
    await productDetailPage.verifyQuantity(testData.tcPD5.startQuantity);
    await productDetailPage.decreaseQuantity();
    await productDetailPage.verifyQuantity(testData.tcPD5.expectedDecreasedQuantity);
  });

  test('Add to cart adds the selected quantity without error', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-8');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD8);
    const [product] = catalog.products;
    await productDetailPage.navigate(product.id);
    await productDetailPage.enterQuantity(testData.tcPD8.quantity);
    await productDetailPage.addToCart();
    await productDetailPage.verifyAddToCartRaisedNoError();
    await cartPage.navigate();
    await cartPage.verifyItemQuantity(product.name, testData.tcPD8.quantity);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/ProductDetailTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    cartPage = new CartPage(page);
    productDetailPage = new ProductDetailPage(page);
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
