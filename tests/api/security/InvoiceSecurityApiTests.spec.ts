import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { registerInvoiceOwner, createOwnInvoice } from '../../../src/apis/OwnInvoices';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';

let testData: typeof import('../../../resources/testData/InvoiceSecurityApiTestJsonFile.json');

/**
 * Security checks on the invoice endpoints. Each case registers its own customers and leaves its records
 * behind. Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('Invoice API security', () => {
  test.describe.configure({ retries: 0 });

  test('An invoice list shows only the signed-in customer\'s invoices', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Invoice API security');
    await allure.testCaseId('TC-API-8');

    const owner = await createOwnInvoice(request, testData.tcApi8.owner);
    await owner.apisInvoices.verifyOwnInvoicesListed(await owner.apisInvoices.getInvoiceCount());
    const { apisInvoices } = await registerInvoiceOwner(request, testData.tcApi8.other);
    const count = await apisInvoices.getInvoiceCount();
    await apisInvoices.verifyNoInvoicesListed(count);
  });

  test('An invoice rejects a client-supplied unit price and total', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Invoice API security');
    await allure.testCaseId('TC-API-11');
    const { invoice, catalog, quantity, forgedUnitPrice, forgedTotal } = testData.tcApi11;

    const { apisInvoices, userId, uuid } = await registerInvoiceOwner(request, testData.tcApi11.user);
    const seeded = await new ApisProductCatalog(request).seedCatalog(uuid, catalog);
    const status = await apisInvoices.createInvoiceWithForgedAmounts(
      userId, invoice, { productId: seeded.products[0].id, unitPrice: forgedUnitPrice, quantity }, forgedTotal);
    await apisInvoices.verifyForgedAmountsRefused(status);
  });

  test.beforeAll(async () => {
    testData = loadTestData('InvoiceSecurityApiTestJsonFile.json');
  });
});
