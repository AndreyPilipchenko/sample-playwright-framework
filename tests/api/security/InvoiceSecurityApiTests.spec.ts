import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisOwnInvoices } from '../../../src/apis/ApisOwnInvoices';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';

let apisOwnInvoices: ApisOwnInvoices;

let testData: typeof import('../../../resources/testData/InvoiceSecurityApiTestJsonFile.json');

/**
 * Security checks on the invoice endpoints. Each case registers its own customers and leaves its records
 * behind. Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('Invoice API security', () => {
  test.describe.configure({ retries: 0 });

  test('An invoice list shows only the signed-in customer\'s invoices', { tag: ['@regression'] }, async () => {
    await allure.feature('Invoice API security');
    await allure.testCaseId('TC-API-8');

    const owner = await apisOwnInvoices.createOwnInvoice(testData.tcApi8.owner);
    const { total: ownCount } = await owner.apisInvoices.getInvoiceList();
    await owner.apisInvoices.verifyOwnInvoicesListed(ownCount);
    const { apisInvoices } = await apisOwnInvoices.registerInvoiceOwner(testData.tcApi8.other);
    const { total: count } = await apisInvoices.getInvoiceList();
    await apisInvoices.verifyNoInvoicesListed(count);
  });

  test('An invoice rejects a client-supplied unit price and total', { tag: ['@regression'] }, async ({ request }) => {
    await allure.feature('Invoice API security');
    await allure.testCaseId('TC-API-11');
    const { invoice, catalog, quantity, forgedUnitPrice, forgedTotal } = testData.tcApi11;

    const { apisInvoices, userId, uuid } = await apisOwnInvoices.registerInvoiceOwner(testData.tcApi11.user);
    const seeded = await new ApisProductCatalog(request).seedCatalog(uuid, catalog);
    const outcome = await apisInvoices.createInvoiceWithForgedAmounts(
      userId, invoice, { productId: seeded.products[0].id, unitPrice: forgedUnitPrice, quantity }, forgedTotal);
    await apisInvoices.verifyForgedAmountsNotStored(outcome, { unitPrice: catalog.products[0].price, quantity });
  });

  test.beforeAll(async () => {
    testData = loadTestData('InvoiceSecurityApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisOwnInvoices = new ApisOwnInvoices(request);
  });
});
