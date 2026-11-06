import * as allure from 'allure-js-commons';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import { AdminProductFormPage } from '../../../src/pages/AdminProductFormPage';
import { AdminProductsPage } from '../../../src/pages/AdminProductsPage';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid, searchTokenOf, withUuid } from '../../../src/utils/UniqueData';

let adminProductsPage: AdminProductsPage;
let adminProductFormPage: AdminProductFormPage;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../../resources/testData/AdminProductTestJsonFile.json');

/**
 * Admin product management on the local stack (the case creates and deletes records). The case seeds its own
 * brand and category through the API, so the form's dropdowns offer values only this run owns; the product it
 * creates carries the same per-run UUID and is deleted at the end of the case.
 */
test.describe('Admin products', () => {
  test.use({ role: 'admin' });

  test('Products can be listed, created, edited and deleted', { tag: ['@regression'] }, async () => {
    await allure.feature('Admin products');
    await allure.testCaseId('TC-ADM-2');
    const { product, catalog, listedPrice, editedPrice, editedListedPrice, savedMessage, deletedMessage } = testData.tcADM2;
    const uuid = newUuid();
    const productName = withUuid(product.name, uuid);

    const seeded = await apisProductCatalog.seedCatalog(uuid, catalog);
    await adminProductFormPage.navigate();
    await adminProductFormPage.enterProduct({ ...product, name: productName, brandName: seeded.brandName, categoryName: seeded.categoryName });
    await adminProductFormPage.save();
    await adminProductFormPage.verifySaved(savedMessage);

    await adminProductsPage.navigate();
    await adminProductsPage.searchProduct(searchTokenOf(uuid));
    await adminProductsPage.verifyProductListed(productName, product.stock, listedPrice);

    await adminProductsPage.openProduct(productName);
    await adminProductFormPage.verifyPrice(product.price);
    await adminProductFormPage.changePrice(editedPrice);
    await adminProductFormPage.save();
    await adminProductFormPage.verifySaved(savedMessage);

    await adminProductsPage.navigate();
    await adminProductsPage.searchProduct(searchTokenOf(uuid));
    await adminProductsPage.verifyProductListed(productName, product.stock, editedListedPrice);

    await adminProductsPage.deleteProduct(productName);
    await adminProductsPage.verifyFlashMessage(deletedMessage);
    await adminProductsPage.searchProduct(searchTokenOf(uuid));
    await adminProductsPage.verifyProductNotListed(productName);
  });

  test.beforeAll(async () => {
    testData = loadTestData('AdminProductTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    adminProductsPage = new AdminProductsPage(page);
    adminProductFormPage = new AdminProductFormPage(page);
    apisProductCatalog = new ApisProductCatalog(request);
  });
});
