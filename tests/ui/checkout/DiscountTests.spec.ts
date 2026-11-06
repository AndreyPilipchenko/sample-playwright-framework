import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { ApisUserAccount } from '../../../src/apis/ApisUserAccount';
import { CartPage } from '../../../src/pages/CartPage';
import { CheckoutAddressPage } from '../../../src/pages/CheckoutAddressPage';
import { CheckoutPaymentPage } from '../../../src/pages/CheckoutPaymentPage';
import { CheckoutSignInPage } from '../../../src/pages/CheckoutSignInPage';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { HomePage } from '../../../src/pages/HomePage';
import { InvoiceDetailPage } from '../../../src/pages/InvoiceDetailPage';
import { InvoicesPage } from '../../../src/pages/InvoicesPage';
import { ProductDetailPage } from '../../../src/pages/ProductDetailPage';
import { useBrowserLocation } from '../../../src/utils/BrowserGeolocation';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, withUniqueEmail } from '../../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;
let apisUserAccount: ApisUserAccount;
let cartPage: CartPage;
let checkoutAddressPage: CheckoutAddressPage;
let checkoutPaymentPage: CheckoutPaymentPage;
let checkoutSignInPage: CheckoutSignInPage;
let headerPage: HeaderPage;
let homePage: HomePage;
let invoiceDetailPage: InvoiceDetailPage;
let invoicesPage: InvoicesPage;
let productDetailPage: ProductDetailPage;

let testData: typeof import('../../../resources/testData/DiscountTestJsonFile.json');

/**
 * Location discounts come from the position the browser reports, so every case runs in a context that may use
 * geolocation. The combination discount (15% when a rental and a non-rental product are in one cart) needs one
 * rental product and one non-rental product, seeded through the API. Never retried: this target locks an account
 * after ONE failed login (known defect #21).
 */
test.describe('Discounts', () => {
  test.describe.configure({ retries: 0 });
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 52.37, longitude: 4.9 } });

  test('Location discount badge shows the percentage for each city', { tag: ['@regression'] }, async ({ page }) => {
    await allure.feature('Discounts');
    await allure.testCaseId('TC-DISC-1');
    const { cities, badges } = testData.tcDISC1;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcDISC1);
    await homePage.navigate();
    await useBrowserLocation(page, cities.mumbai);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyDiscountBadge(badges.mumbai);
    await useBrowserLocation(page, cities.tokyo);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyDiscountBadge(badges.tokyo);
    await useBrowserLocation(page, cities.amsterdam);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyDiscountBadge(badges.amsterdam);
    await useBrowserLocation(page, cities.london);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyDiscountBadge(badges.london);
    // New York last: its longitude is the one the app handles differently, so a failure there hides nothing.
    await useBrowserLocation(page, cities.newYork);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyDiscountBadge(badges.newYork);
  });

  test('Cart line carries the location discount', { tag: ['@regression'] }, async ({ page }) => {
    await allure.feature('Discounts');
    await allure.testCaseId('TC-DISC-4');
    const { position, expectedLinePrice, cartItemCount } = testData.tcDISC4;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcDISC4);
    const [product] = catalog.products;
    await homePage.navigate();
    await useBrowserLocation(page, position);
    await productDetailPage.navigate(product.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyItemPrice(product.name, expectedLinePrice);
  });

  test('Rental plus non-rental cart gets the 15% combination discount', { tag: ['@regression'] }, async () => {
    await allure.feature('Discounts');
    await allure.testCaseId('TC-DISC-5');
    const { cartItemCount, expectedDiscountLabel, expectedDiscountAmount } = testData.tcDISC5;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcDISC5);
    const [rental, tool] = catalog.products;
    await productDetailPage.navigate(rental.id);
    await productDetailPage.addToCart();
    await productDetailPage.navigate(tool.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyCartDiscount(expectedDiscountLabel, expectedDiscountAmount);
  });

  test('Cart shows the discounted subtotal, discount and total', { tag: ['@regression'] }, async () => {
    await allure.feature('Discounts');
    await allure.testCaseId('TC-DISC-6');
    const { cartItemCount, expectedSubtotal, expectedDiscountLabel, expectedDiscountAmount, expectedCartTotal } = testData.tcDISC6;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcDISC6);
    const [rental, tool] = catalog.products;
    await productDetailPage.navigate(rental.id);
    await productDetailPage.addToCart();
    await productDetailPage.navigate(tool.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyCartSubtotal(expectedSubtotal);
    await cartPage.verifyCartDiscount(expectedDiscountLabel, expectedDiscountAmount);
    await cartPage.verifyCartTotal(expectedCartTotal);
  });

  test('Invoice records the discounted total', { tag: ['@regression'] }, async () => {
    await allure.feature('Discounts');
    await allure.testCaseId('TC-DISC-8');
    const { cartItemCount, billing, bank, expectedPaymentMessage, expectedTotals } = testData.tcDISC8;

    const user = withUniqueEmail(testData.tcDISC8.user, newUuid());
    await apisUserAccount.registerUser(user);
    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcDISC8);
    const [rental, tool] = catalog.products;
    await productDetailPage.navigate(rental.id);
    await productDetailPage.addToCart();
    await productDetailPage.navigate(tool.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(cartItemCount);
    await cartPage.navigate();
    await cartPage.proceed();
    await checkoutSignInPage.login(user.email, user.password);
    await checkoutSignInPage.proceed();
    await checkoutAddressPage.enterAddress(billing);
    await checkoutAddressPage.proceed();
    await checkoutPaymentPage.enterBankTransfer(bank.accountName, bank.accountNumber);
    await checkoutPaymentPage.confirm();
    await checkoutPaymentPage.verifyPaymentSuccessful(expectedPaymentMessage);
    await checkoutPaymentPage.confirm();
    await checkoutPaymentPage.verifyOrderPlaced();
    const invoiceNumber = await checkoutPaymentPage.readPlacedInvoiceNumber();
    await invoicesPage.navigate();
    await invoicesPage.openInvoiceDetails(invoiceNumber);
    await invoiceDetailPage.verifyDiscountedTotals(expectedTotals);
  });

  test.beforeAll(async () => {
    testData = loadTestData('DiscountTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    apisProductCatalog = new ApisProductCatalog(request);
    apisUserAccount = new ApisUserAccount(request);
    cartPage = new CartPage(page);
    checkoutAddressPage = new CheckoutAddressPage(page);
    checkoutPaymentPage = new CheckoutPaymentPage(page);
    checkoutSignInPage = new CheckoutSignInPage(page);
    headerPage = new HeaderPage(page);
    homePage = new HomePage(page);
    invoiceDetailPage = new InvoiceDetailPage(page);
    invoicesPage = new InvoicesPage(page);
    productDetailPage = new ProductDetailPage(page);
  });
});
