import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import { ApisProducts } from '../../../src/apis/ApisProducts';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { CartPage } from '../../../src/pages/CartPage';
import { HeaderPage } from '../../../src/pages/HeaderPage';
import { HomePage } from '../../../src/pages/HomePage';
import { ProductDetailPage } from '../../../src/pages/ProductDetailPage';
import { RentalsPage } from '../../../src/pages/RentalsPage';
import { useBrowserLocation } from '../../../src/utils/BrowserGeolocation';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisProducts: ApisProducts;
let apisProductCatalog: ApisProductCatalog;
let cartPage: CartPage;
let headerPage: HeaderPage;
let homePage: HomePage;
let productDetailPage: ProductDetailPage;
let rentalsPage: RentalsPage;

let testData: typeof import('../../../resources/testData/RentalTestJsonFile.json');

/**
 * TC-RENT-1 seeds more rentals than one API page holds, so it depends only on its own data. TC-RENT-2 and 3 go through
 * the page with what is listed first; TC-RENT-4 and 5 start at the detail page with their own rental.
 */
test.describe('Rentals', () => {

  test('Rentals page is reachable', { tag: ['@regression'] }, async () => {
    await allure.feature('Rentals');
    await allure.testCaseId('TC-RENT-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcRENT1);
    await homePage.navigate();
    await headerPage.openCategoriesEntry(testData.tcRENT1.entry);
    await rentalsPage.verifyPageOpened(testData.tcRENT1.expectedTitle);
    await rentalsPage.verifyRentalsListed(catalog.products.map((rental) => rental.name));
  });

  test('Rental products are displayed with rental-specific details', { tag: ['@regression'] }, async () => {
    await allure.feature('Rentals');
    await allure.testCaseId('TC-RENT-2');

    await rentalsPage.navigate();
    await rentalsPage.verifyEveryRentalShowsImageNameAndDescription();
  });

  test('Rental detail page shows the duration selector', { tag: ['@smoke'] }, async () => {
    await allure.feature('Rentals');
    await allure.testCaseId('TC-RENT-3');
    const { minimumHours, maximumHours, startHours, chosenHours } = testData.tcRENT3;

    const [rental] = await apisProducts.getRentalListing();
    await rentalsPage.navigate();
    await rentalsPage.clickRental(rental.name);
    await productDetailPage.verifyProductDetailOpened(rental.name);
    await productDetailPage.verifyRentalDurationSlider({ minimum: minimumHours, maximum: maximumHours });
    await productDetailPage.verifyRentalTotal(rental.price, startHours);
    await productDetailPage.setRentalDuration(chosenHours);
    await productDetailPage.verifyRentalTotal(rental.price, chosenHours);
  });

  test('Rental item is labelled as a rental in checkout', { tag: ['@regression'] }, async () => {
    await allure.feature('Rentals');
    await allure.testCaseId('TC-RENT-4');
    const { cartItemCount, expectedLabel } = testData.tcRENT4;

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcRENT4);
    const [rental] = catalog.products;
    await productDetailPage.navigate(rental.id);
    await productDetailPage.addToCart();
    await headerPage.verifyCartItemCount(cartItemCount);
    await cartPage.navigate();
    await cartPage.verifyItemMarkedAsRental(rental.name, expectedLabel);
  });

  /** Location discounts come from the position the browser reports. */
  test.describe('At a location with a discount', () => {
    test.use({ permissions: ['geolocation'], geolocation: { latitude: 52.37, longitude: 4.9 } });

    test('Location-based discount applies to rentals', { tag: ['@regression'] }, async ({ page }) => {
      await allure.feature('Rentals');
      await allure.testCaseId('TC-RENT-5');
      const { position, originalPrice, discountedPrice, discountedRate, hours } = testData.tcRENT5;

      const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.tcRENT5);
      await homePage.navigate();
      await useBrowserLocation(page, position);
      await productDetailPage.navigate(catalog.products[0].id);
      await productDetailPage.verifyDiscountedPrice({ originalPrice, discountedPrice });
      await productDetailPage.verifyRentalTotal(discountedRate, hours);
    });
  });

  test.beforeAll(async () => {
    testData = loadTestData('RentalTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    apisProducts = new ApisProducts(request);
    apisProductCatalog = new ApisProductCatalog(request);
    cartPage = new CartPage(page);
    headerPage = new HeaderPage(page);
    homePage = new HomePage(page);
    productDetailPage = new ProductDetailPage(page);
    rentalsPage = new RentalsPage(page);
  });

});
