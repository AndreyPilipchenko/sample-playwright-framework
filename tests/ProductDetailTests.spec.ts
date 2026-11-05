import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { CartPage } from '../src/pages/CartPage';
import { ProductDetailPage } from '../src/pages/ProductDetailPage';
import { AccountPage } from '../src/pages/AccountPage';
import { HeaderPage } from '../src/pages/HeaderPage';
import { HomePage } from '../src/pages/HomePage';
import { LoginPage } from '../src/pages/LoginPage';
import { ApisProductCatalog } from '../src/apis/ApisProductCatalog';
import { ApisUserAccount } from '../src/apis/ApisUserAccount';
import { useBrowserLocation } from '../src/utils/BrowserGeolocation';
import { newUuid, withUniqueEmail } from '../src/utils/UniqueData';

let cartPage: CartPage;
let productDetailPage: ProductDetailPage;
let apisProductCatalog: ApisProductCatalog;
let accountPage: AccountPage;
let headerPage: HeaderPage;
let homePage: HomePage;
let loginPage: LoginPage;
let apisUserAccount: ApisUserAccount;

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
    await productDetailPage.verifyMessage(testData.tcPD8.expectedMessage);
    await cartPage.navigate();
    await cartPage.verifyItemQuantity(product.name, testData.tcPD8.quantity);
  });

  test('Quantity cannot go below 1', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-6');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD6);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyQuantity(testData.tcPD6.expectedQuantity);
    await productDetailPage.decreaseQuantity();
    await productDetailPage.verifyQuantity(testData.tcPD6.expectedQuantity);
  });

  test('Quantity accepts manual numeric entry', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-7');
    const { typedQuantity, belowMinimum, expectedMinimum, aboveMaximum, expectedMaximum } = testData.tcPD7;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD7);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.enterQuantity(typedQuantity);
    await productDetailPage.verifyQuantity(typedQuantity);
    await productDetailPage.enterQuantity(belowMinimum);
    await productDetailPage.verifyQuantity(expectedMinimum);
    await productDetailPage.enterQuantity(aboveMaximum);
    await productDetailPage.verifyQuantity(expectedMaximum);
  });

  test('More than 10 units can be added', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-9');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD9);
    const [product] = catalog.products;
    await productDetailPage.navigate(product.id);
    await productDetailPage.enterQuantity(testData.tcPD9.quantity);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(testData.tcPD9.quantity);
    await cartPage.navigate();
    await cartPage.verifyItemQuantity(product.name, testData.tcPD9.quantity);
  });

  test('Out-of-stock product cannot be added to cart', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-10');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD10);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyOutOfStock(testData.tcPD10.expectedLabel, testData.tcPD10.expectedColor);
  });

  test('Rental product shows an hourly duration slider (1-10)', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-11');
    const { minimumHours, maximumHours, hourlyRate, startHours, chosenHours } = testData.tcPD11;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD11);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyRentalDurationSlider({ minimum: minimumHours, maximum: maximumHours });
    await productDetailPage.verifyRentalTotal(hourlyRate, startHours);
    await productDetailPage.setRentalDuration(chosenHours);
    await productDetailPage.verifyRentalTotal(hourlyRate, chosenHours);
  });

  test('Add to Favorites while logged out is denied with a message', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-14');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD14);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyProductInStock();
    await productDetailPage.addToFavorites();
    await productDetailPage.verifyMessage(testData.tcPD14.expectedMessage);
  });

  test('Quantity input has an accessible label', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-16');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD16);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyQuantityHasAccessibleLabel(testData.tcPD16.expectedLabel);
  });

  test('Product images have alt text', { tag: ['@regression'] }, async () => {
    await allure.feature('Product Detail');
    await allure.testCaseId('TC-PD-17');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD17);
    await productDetailPage.navigate(catalog.products[0].id);
    await productDetailPage.verifyProductImagesHaveAltText();
  });

  /** Location discounts come from the position the browser reports. */
  test.describe('At a location with a discount', () => {
    test.use({ permissions: ['geolocation'], geolocation: { latitude: 52.37, longitude: 4.9 } });

    test('Discounted product shows both original and discounted price', { tag: ['@regression'] }, async ({ page }) => {
      await allure.feature('Product Detail');
      await allure.testCaseId('TC-PD-2');
      const { position, originalPrice, discountedPrice, expectedBadge } = testData.tcPD2;

      const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD2);
      await homePage.navigate();
      await useBrowserLocation(page, position);
      await productDetailPage.navigate(catalog.products[0].id);
      await productDetailPage.verifyDiscountedPrice({ originalPrice, discountedPrice });
      await productDetailPage.verifyDiscountBadge(expectedBadge);
    });
  });

  /** Never retried: this target locks an account after ONE failed login (known defect #21). */
  test.describe('Signed in', () => {
    test.describe.configure({ retries: 0 });

    test('Add to Favorites succeeds for a logged-in user', { tag: ['@regression'] }, async () => {
      await allure.feature('Product Detail');
      await allure.testCaseId('TC-PD-12');

      const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcPD12);
      const user = withUniqueEmail(testData.tcPD12.user, newUuid());
      await apisUserAccount.registerUser(user);
      await loginPage.navigate();
      await loginPage.login(user.email, user.password);
      await accountPage.verifyPageOpened();
      await productDetailPage.navigate(catalog.products[0].id);
      await productDetailPage.verifyProductInStock();
      await productDetailPage.addToFavorites();
      await productDetailPage.verifyMessage(testData.tcPD12.expectedMessage);
    });
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/ProductDetailTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    cartPage = new CartPage(page);
    productDetailPage = new ProductDetailPage(page);
    apisProductCatalog = new ApisProductCatalog(request);
    accountPage = new AccountPage(page);
    headerPage = new HeaderPage(page);
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    apisUserAccount = new ApisUserAccount(request);
  });

});
