import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisOwnInvoices } from '../../../src/apis/ApisOwnInvoices';
import { loadTestData } from '../../../src/utils/TestData';

let apisOwnInvoices: ApisOwnInvoices;

let testData: typeof import('../../../resources/testData/InvoiceApiTestJsonFile.json');

/**
 * The invoice calls the UI specs create their orders through (`POST /invoices`) and read back. No
 * browser: each case registers its own customer, seeds its own product, creates the invoice as that
 * customer and leaves the records behind on purpose. Never retried, because this target locks an
 * account after ONE failed login (known defect #21).
 */
test.describe('Invoice API', () => {
  test.describe.configure({ retries: 0 });

  test('A created invoice is issued with a number and a date', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-1');

    const { apisInvoices, created } = await apisOwnInvoices.createOwnInvoice(testData.invoiceApi1);
    await apisInvoices.verifyInvoiceIssued(created);
  });

  test('A created invoice is stored with its billing address, payment and total', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-2');
    const { invoice, expectedTotal } = testData.invoiceApi2;

    const { apisInvoices, userId, created } = await apisOwnInvoices.createOwnInvoice(testData.invoiceApi2);
    const stored = await apisInvoices.getInvoice(created.id);
    await apisInvoices.verifyInvoiceStored(stored, { userId, seed: invoice, total: expectedTotal });
  });

  test('A created invoice keeps its line items with product, price and quantity', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-3');

    const { apisInvoices, created, lines } = await apisOwnInvoices.createOwnInvoice(testData.invoiceApi3);
    const stored = await apisInvoices.getInvoice(created.id);
    await apisInvoices.verifyInvoiceLines(stored, lines);
  });

  test('A created invoice is listed for its owner', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-4');

    const { apisInvoices, created } = await apisOwnInvoices.createOwnInvoice(testData.invoiceApi4);
    const listed = await apisInvoices.getInvoiceNumbers();
    await apisInvoices.verifyInvoiceListed(listed, created.invoiceNumber);
  });

  test('An invoice without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API');
    await allure.testCaseId('invoice-api-5');
    const seed = testData.invoiceApi5;

    const { apisInvoices } = await apisOwnInvoices.registerInvoiceOwner(seed.user);
    const reportedFields = await apisInvoices.createInvoiceWithoutRequiredFields();
    await apisInvoices.verifyRequiredInvoiceFieldsReported(reportedFields, seed.requiredFields);
  });

  test.beforeAll(async () => {
    testData = loadTestData('InvoiceApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisOwnInvoices = new ApisOwnInvoices(request);
  });
});
