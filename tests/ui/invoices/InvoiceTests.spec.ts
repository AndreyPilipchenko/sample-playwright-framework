import type { APIRequestContext } from '@playwright/test';
import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ApisInvoices, type CreatedInvoice } from '../../../src/apis/ApisInvoices';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { ApisOwnInvoices, type OwnInvoiceSeed } from '../../../src/apis/ApisOwnInvoices';
import { ApisUserAccount, type UserSeed } from '../../../src/apis/ApisUserAccount';
import { AccountPage } from '../../../src/pages/AccountPage';
import { InvoiceDetailPage } from '../../../src/pages/InvoiceDetailPage';
import { InvoicesPage } from '../../../src/pages/InvoicesPage';
import { LoginPage } from '../../../src/pages/LoginPage';
import { newUuid, withUuid } from '../../../src/utils/UniqueData';

let accountPage: AccountPage;
let invoiceDetailPage: InvoiceDetailPage;
let invoicesPage: InvoicesPage;
let loginPage: LoginPage;
let apisProductCatalog: ApisProductCatalog;
let apisUserAccount: ApisUserAccount;
let apiRequest: APIRequestContext;
let apisOwnInvoices: ApisOwnInvoices;

let testData: typeof import('../../../resources/testData/InvoiceTestJsonFile.json');

/**
 * Each case registers its own customer, seeds its own product and creates the invoice through the API
 * (the same call checkout makes), so it never depends on an order placed elsewhere. Every record carries
 * a per-run UUID and is left behind on purpose (deleting needs an admin token). The customer then signs
 * in once, in the browser, and opens the invoice from the list.
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
async function openOwnInvoiceDetail(seed: OwnInvoiceSeed): Promise<{ user: UserSeed; invoice: CreatedInvoice; productName: string }> {
  const uuid = newUuid();
  const user = { ...seed.user, email: withUuid(seed.user.email, uuid) };
  const userId = await apisUserAccount.registerUser(user);
  const catalog = await apisProductCatalog.seedCatalog(uuid, seed.catalog);
  const [product] = catalog.products;
  const apisInvoices = new ApisInvoices(apiRequest, () => apisUserAccount.getAccessToken(user.email, user.password));
  const invoice = await apisInvoices.createInvoice(userId, seed.invoice, [
    { productId: product.id, unitPrice: seed.catalog.products[0].price, quantity: seed.quantity },
  ]);

  await loginPage.navigate();
  await loginPage.login(user.email, user.password);
  await accountPage.verifyPageOpened(); // the sign-in must finish before navigating away from it
  await invoicesPage.navigate();
  await invoicesPage.openInvoiceDetails(invoice.invoiceNumber);
  return { user, invoice, productName: product.name };
}

test.describe('Invoices', () => {
  test.describe.configure({ retries: 0 });

  test('Invoice detail shows number, date and total', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-3');

    const { invoice } = await openOwnInvoiceDetail(testData.tcINV3);
    await invoiceDetailPage.verifyInvoiceNumber(invoice.invoiceNumber);
    await invoiceDetailPage.verifyInvoiceDate(invoice.invoiceDate.slice(0, 10));
    await invoiceDetailPage.verifyInvoiceTotal(testData.tcINV3.expectedInvoiceTotal);
  });

  test('Line items show quantity, name, price and line total', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-6');
    const { expectedQuantity, expectedPrice, expectedLineTotal } = testData.tcINV6;

    const { productName } = await openOwnInvoiceDetail(testData.tcINV6);
    await invoiceDetailPage.verifyLineItemQuantity(productName, expectedQuantity);
    await invoiceDetailPage.verifyLineItemProductName(productName);
    await invoiceDetailPage.verifyLineItemPrice(productName, expectedPrice);
    await invoiceDetailPage.verifyLineItemTotal(productName, expectedLineTotal);
  });

  test('Billing address fields show their stored values', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-4');

    await openOwnInvoiceDetail(testData.tcINV4);
    await invoiceDetailPage.verifyBillingAddress(testData.tcINV4.expectedAddress);
  });

  test('Payment method and details are shown', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-5');

    await openOwnInvoiceDetail(testData.tcINV5);
    await invoiceDetailPage.verifyPayment(testData.tcINV5.expectedPayment);
  });

  test('Non-existent or foreign invoice shows "not found"', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-7');
    const { foreign, missingInvoiceId, expectedMessage } = testData.tcINV7;

    await openOwnInvoiceDetail(testData.tcINV7);
    const foreignInvoice = await apisOwnInvoices.createOwnInvoice(foreign);
    await invoiceDetailPage.navigate(missingInvoiceId);
    await invoiceDetailPage.verifyInvoiceDoesNotExist(expectedMessage);
    await invoiceDetailPage.navigate(foreignInvoice.created.id);
    await invoiceDetailPage.verifyInvoiceDoesNotExist(expectedMessage);
  });

  test('City and Country appear in their correct fields', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-10');

    await openOwnInvoiceDetail(testData.tcINV10);
    await invoiceDetailPage.verifyCityAndCountry(testData.tcINV10.expectedCity, testData.tcINV10.expectedCountry);
  });

  test('Address fields never render "undefined"', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoices');
    await allure.testCaseId('TC-INV-11');

    await openOwnInvoiceDetail(testData.tcINV11);
    await invoiceDetailPage.verifyNoUndefinedInAddress();
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/InvoiceTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ page, request }) => {
    apiRequest = request;
    apisOwnInvoices = new ApisOwnInvoices(request);
    apisProductCatalog = new ApisProductCatalog(request);
    apisUserAccount = new ApisUserAccount(request);
    accountPage = new AccountPage(page);
    invoiceDetailPage = new InvoiceDetailPage(page);
    invoicesPage = new InvoicesPage(page);
    loginPage = new LoginPage(page);
  });
});
