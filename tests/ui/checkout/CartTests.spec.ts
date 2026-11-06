import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { ProductDetailPage } from '../../../src/pages/ProductDetailPage';
import { CartPage } from '../../../src/pages/CartPage';
import { CheckoutSignInPage } from '../../../src/pages/CheckoutSignInPage';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { newUuid } from '../../../src/utils/UniqueData';

let headerPage: HeaderPage;
let productDetailPage: ProductDetailPage;
let cartPage: CartPage;
let checkoutSignInPage: CheckoutSignInPage;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../../resources/testData/CartTestJsonFile.json');

/**
 * They assert the documented cart behaviour and fail while defects L1, 7 and 8 are open
 * (test plan §4.1). They are never weakened to pass.
 * Each case seeds its own products through the API (per-run UUID in every name, left behind
 * on purpose) and never relies on the existing catalog.
 */
test.describe('Checkout Cart', () => {

  test('Cart table shows Item, Quantity, Price, Total, Actions', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART1);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART1.cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyColumnHeaders(testData.tcCART1.expectedColumnHeaders);
  });

  test('Changing quantity recalculates line and cart totals', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-2');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART2);
    const [product] = catalog.products;
    await productDetailPage.navigate(product.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART2.cartItemCount);
    await cartPage.navigate();
    await cartPage.changeQuantity(product.name, testData.tcCART2.newQuantity);
    await cartPage.verifyLineTotal(product.name, testData.tcCART2.expectedLineTotal);
    await cartPage.verifyCartTotal(testData.tcCART2.expectedCartTotal);
  });

  test('Delete button removes the item', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-4');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART4);
    const [product] = catalog.products;
    await productDetailPage.navigate(product.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART4.cartItemCount);
    await cartPage.navigate();
    await cartPage.deleteItem(product.name);
    await cartPage.verifyItemNotListed(product.name);
  });

  test('Cart total recalculates after deletion', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-5');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART5);
    const [first, second] = catalog.products;
    await productDetailPage.navigate(first.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART5.firstCartItemCount);
    await productDetailPage.navigate(second.id);
    await productDetailPage.verifyProductDetailOpened(second.name);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART5.secondCartItemCount);
    await cartPage.navigate();
    await cartPage.deleteItem(first.name);
    await cartPage.verifyCartTotal(testData.tcCART5.expectedCartTotal);
  });

  test('Cart total reflects the sum of line totals (not 0,00)', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-7');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART7);
    const [product] = catalog.products;
    await productDetailPage.navigate(product.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART7.cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyLineTotal(product.name, testData.tcCART7.expectedLineTotal);
    await cartPage.verifyCartTotal(testData.tcCART7.expectedCartTotal);
  });

  test('Proceed advances to the next checkout step', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-8');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART8);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART8.cartItemCount);
    await cartPage.navigate();
    await cartPage.proceed();
    await checkoutSignInPage.verifyLoginStepShown();
  });

  test('Mixed rental + non-rental cart applies 15% combination discount', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-10');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART10);
    const [rental, tool] = catalog.products;
    await productDetailPage.navigate(rental.id);
    await productDetailPage.addToCart();
    await productDetailPage.navigate(tool.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART10.cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyCartDiscount(testData.tcCART10.expectedDiscountLabel, testData.tcCART10.expectedDiscountAmount);
  });

  test('Cart shows subtotal, discount amount and final total', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout Cart');
    await allure.testCaseId('TC-CART-11');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcCART11);
    const [rental, tool] = catalog.products;
    await productDetailPage.navigate(rental.id);
    await productDetailPage.addToCart();
    await productDetailPage.navigate(tool.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcCART11.cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyCartSubtotal(testData.tcCART11.expectedSubtotal);
    await cartPage.verifyCartDiscount(testData.tcCART11.expectedDiscountLabel, testData.tcCART11.expectedDiscountAmount);
    await cartPage.verifyCartTotal(testData.tcCART11.expectedCartTotal);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/CartTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
    headerPage = new HeaderPage(page);
    productDetailPage = new ProductDetailPage(page);
    cartPage = new CartPage(page);
    checkoutSignInPage = new CheckoutSignInPage(page);
  });

});
