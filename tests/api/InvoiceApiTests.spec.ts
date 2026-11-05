import { test, type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import * as fs from 'fs';
import { ApisInvoices, type CreatedInvoice, type InvoiceLineSeed } from '../../src/apis/ApisInvoices';
import { ApisProductCatalog } from '../../src/apis/ApisProductCatalog';
import { ApisUserAccount } from '../../src/apis/ApisUserAccount';
import { newUuid, withUuid } from '../../src/utils/UniqueData';

let apisProductCatalog: ApisProductCatalog;
let apisUserAccount: ApisUserAccount;
let request: APIRequestContext;

let testData: typeof import('../../resources/testData/InvoiceApiTestJsonFile.json');

type InvoiceApiCase = (typeof testData)['invoiceApi1'];

/**
 * The invoice calls the UI specs create their orders through (`POST /invoices`) and read back. No
 * browser: each case registers its own customer, seeds its own product with a per-run UUID in every
 * name, creates the invoice as that customer and leaves the records behind on purpose (deleting needs
 * an admin token). Each case signs in through the API as its customer; never retried, because this
 * target locks an account after ONE failed login (known defect #21).
 */
async function createOwnInvoice(seed: InvoiceApiCase) {
  const uuid = newUuid();
  const user = { ...seed.user, email: withUuid(seed.user.email, uuid) };
  const userId = await apisUserAccount.registerUser(user);
  const catalog = await apisProductCatalog.seedCatalog(uuid, seed.catalog);
  const lines: InvoiceLineSeed[] = [{ productId: catalog.products[0].id, unitPrice: seed.catalog.products[0].price, quantity: seed.quantity }];
  const apisInvoices = new ApisInvoices(request, () => apisUserAccount.getAccessToken(user.email, user.password));
  const created: CreatedInvoice = await apisInvoices.createInvoice(userId, seed.invoice, lines);
  return { apisInvoices, userId, created, lines };
}

test.describe('Invoice API', () => {
  test.describe.configure({ retries: 0 });

  test('A created invoice is issued with a number and a date', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-1');

    const { apisInvoices, created } = await createOwnInvoice(testData.invoiceApi1);
    await apisInvoices.verifyInvoiceIssued(created);
  });

  test('A created invoice is stored with its billing address, payment and total', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-2');
    const { invoice, expectedTotal } = testData.invoiceApi2;

    const { apisInvoices, userId, created } = await createOwnInvoice(testData.invoiceApi2);
    const stored = await apisInvoices.getInvoice(created.id);
    await apisInvoices.verifyInvoiceStored(stored, { userId, seed: invoice, total: expectedTotal });
  });

  test('A created invoice keeps its line items with product, price and quantity', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-3');

    const { apisInvoices, created, lines } = await createOwnInvoice(testData.invoiceApi3);
    const stored = await apisInvoices.getInvoice(created.id);
    await apisInvoices.verifyInvoiceLines(stored, lines);
  });

  test('A created invoice is listed for its owner', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-4');

    const { apisInvoices, created } = await createOwnInvoice(testData.invoiceApi4);
    const listed = await apisInvoices.getInvoiceNumbers();
    await apisInvoices.verifyInvoiceListed(listed, created.invoiceNumber);
  });

  test('An invoice without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-5');
    const seed = testData.invoiceApi5;
    const user = { ...seed.user, email: withUuid(seed.user.email, newUuid()) };

    await apisUserAccount.registerUser(user);
    const apisInvoices = new ApisInvoices(request, () => apisUserAccount.getAccessToken(user.email, user.password));
    const reportedFields = await apisInvoices.createInvoiceWithoutRequiredFields();
    await apisInvoices.verifyRequiredInvoiceFieldsReported(reportedFields, seed.requiredFields);
  });

  test.beforeAll(async () => {
    testData = JSON.parse(fs.readFileSync('./resources/testData/InvoiceApiTestJsonFile.json', 'utf8'));
  });

  test.beforeEach(({ request: apiRequest }) => {
    request = apiRequest;
    apisProductCatalog = new ApisProductCatalog(apiRequest);
    apisUserAccount = new ApisUserAccount(apiRequest);
  });
});
