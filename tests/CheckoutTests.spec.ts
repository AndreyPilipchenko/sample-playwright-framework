import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { HeaderPage } from '../src/pages/HeaderPage';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { CartPage } from '../src/pages/CartPage';
import { CheckoutSignInPage } from '../src/pages/CheckoutSignInPage';
import { CheckoutAddressPage } from '../src/pages/CheckoutAddressPage';
import { CheckoutPaymentPage } from '../src/pages/CheckoutPaymentPage';
import { ApisProductCatalog, type CatalogSeed } from '../src/apis/ApisProductCatalog';
import { ApisUserAccount, type UserSeed } from '../src/apis/ApisUserAccount';
import { newUuid, withUuid } from '../src/utils/UniqueData';

let headerPage: HeaderPage;
let productDetailPage: ProductDetailPage;
let cartPage: CartPage;
let checkoutSignInPage: CheckoutSignInPage;
let checkoutAddressPage: CheckoutAddressPage;
let checkoutPaymentPage: CheckoutPaymentPage;
let apisProductCatalog: ApisProductCatalog;
let apisUserAccount: ApisUserAccount;

let testData: typeof import('../resources/testData/CheckoutTestJsonFile.json');

/**
 * Each case seeds its own product through the API (per-run UUID in every name, left behind on
 * purpose) and, where it needs one, registers its own customer. Checkout runs in one browser
 * session because the cart is client-side state.
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
async function addSeededProductToCartAndOpenIt(seed: CatalogSeed & { cartItemCount: string }): Promise<void> {
  const catalog = await apisProductCatalog.seedCatalog(newUuid(), seed);
  await productDetailPage.navigate(catalog.products[0].id);
  await productDetailPage.addToCart();
  await headerPage.verifyCartItemCount(seed.cartItemCount);
  await cartPage.navigate();
}

/** A fresh customer for the case: unique email per run, left behind on purpose (deleting it needs an admin token). */
async function registerCustomer(seed: UserSeed): Promise<UserSeed> {
  const user = { ...seed, email: withUuid(seed.email, newUuid()) };
  await apisUserAccount.registerUser(user);
  return user;
}

test.describe('Checkout', () => {
  test.describe.configure({ retries: 0 });

  test('Guest proceeding from cart sees the login step', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CSI-1');

    await addSeededProductToCartAndOpenIt(testData.tcCSI1);
    await cartPage.proceed();
    await checkoutSignInPage.verifyLoginStepShown();
  });

  test('Login step shows email, password and submit', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CSI-2');

    await addSeededProductToCartAndOpenIt(testData.tcCSI2);
    await cartPage.proceed();
    await checkoutSignInPage.verifyEmailPasswordAndSubmitShown();
  });

  test('Valid credentials authenticate and allow proceeding', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CSI-3');
    const user = await registerCustomer(testData.tcCSI3.user);

    await addSeededProductToCartAndOpenIt(testData.tcCSI3);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.verifyCanProceed();
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifyAddressStepShown();
  });

  test('Empty required field is flagged and Proceed is disabled', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CBA-3');
    const user = await registerCustomer(testData.tcCBA3.user);

    await addSeededProductToCartAndOpenIt(testData.tcCBA3);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.clearAddressField();
    await checkoutAddressPage.verifyRequiredFieldError(testData.tcCBA3.expectedError);
    await checkoutAddressPage.verifyProceedDisabled();
  });

  test('All required address fields are displayed', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CBA-1');
    const user = await registerCustomer(testData.tcCBA1.user);

    await addSeededProductToCartAndOpenIt(testData.tcCBA1);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.verifyRequiredAddressFieldsShown(user.postcode);
  });

  test('Completing all fields allows proceeding to payment', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CBA-4');
    const user = await registerCustomer(testData.tcCBA4.user);

    await addSeededProductToCartAndOpenIt(testData.tcCBA4);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.enterAddress(testData.tcCBA4.billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.verifyPaymentStepShown();
  });

  test('Dropdown lists all five payment methods', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CPAY-1');
    const user = await registerCustomer(testData.tcCPAY1.user);

    await addSeededProductToCartAndOpenIt(testData.tcCPAY1);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.enterAddress(testData.tcCPAY1.billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.verifyPaymentMethodsListed(testData.tcCPAY1.expectedMethods);
  });

  test('Credit Card shows number, expiry, CVV, holder name', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CPAY-4');
    const user = await registerCustomer(testData.tcCPAY4.user);

    await addSeededProductToCartAndOpenIt(testData.tcCPAY4);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.enterAddress(testData.tcCPAY4.billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.choosePaymentMethod(testData.tcCPAY4.paymentMethod);
    await checkoutPaymentPage.verifyCreditCardFieldsShown();
  });

  test('Past expiry date shows "Expiration date must be in the future."', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CPAY-7');
    const { billing, paymentMethod, card, expectedError } = testData.tcCPAY7;
    const user = await registerCustomer(testData.tcCPAY7.user);

    await addSeededProductToCartAndOpenIt(testData.tcCPAY7);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.enterAddress(billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.choosePaymentMethod(paymentMethod);
    await checkoutPaymentPage.verifyCreditCardFieldsShown();
    await checkoutPaymentPage.enterCreditCard(card);
    await checkoutPaymentPage.verifyExpirationDateError(expectedError);
  });

  test('Valid payment places the order and shows the invoice number', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CPAY-12');
    const { billing, bank, expectedPaymentMessage } = testData.tcCPAY12;
    const user = await registerCustomer(testData.tcCPAY12.user);

    await addSeededProductToCartAndOpenIt(testData.tcCPAY12);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.enterAddress(billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.enterBankTransfer(bank.accountName, bank.accountNumber);
    await checkoutPaymentPage.confirm();
    await checkoutPaymentPage.verifyPaymentSuccessful(expectedPaymentMessage);
    await checkoutPaymentPage.confirm();
    await checkoutPaymentPage.verifyOrderPlaced();
  });

  test('Cart is cleared after a successful order', { tag: ['@regression'] }, async () => {
    await allure.feature('Checkout');
    await allure.testCaseId('TC-CPAY-13');
    const { billing, bank, expectedPaymentMessage } = testData.tcCPAY13;
    const user = await registerCustomer(testData.tcCPAY13.user);

    await addSeededProductToCartAndOpenIt(testData.tcCPAY13);
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.verifySavedAddressPrefilled(user.address);
    await checkoutAddressPage.enterAddress(billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.enterBankTransfer(bank.accountName, bank.accountNumber);
    await checkoutPaymentPage.confirm();
    await checkoutPaymentPage.verifyPaymentSuccessful(expectedPaymentMessage);
    await checkoutPaymentPage.confirm();
    await checkoutPaymentPage.verifyOrderPlaced();
    await headerPage.clickHome();
    await cartPage.navigate();
    await cartPage.verifyCartEmpty();
    await headerPage.verifyCartBadgeHidden();
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/CheckoutTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
    apisUserAccount = new ApisUserAccount(request);
    headerPage = new HeaderPage(page);
    productDetailPage = new ProductDetailPage(page);
    cartPage = new CartPage(page);
    checkoutSignInPage = new CheckoutSignInPage(page);
    checkoutAddressPage = new CheckoutAddressPage(page);
    checkoutPaymentPage = new CheckoutPaymentPage(page);
  });
});
