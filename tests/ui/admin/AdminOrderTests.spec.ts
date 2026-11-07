import * as allure from 'allure-js-commons';
import { ApisOwnInvoices } from '../../../src/apis/ApisOwnInvoices';
import { test } from '../../../src/fixtures/test'; // conventions-ok: session and browser diagnostics fixture
import { AdminOrderPage } from '../../../src/pages/AdminOrderPage';
import { AdminOrdersPage } from '../../../src/pages/AdminOrdersPage';
import { loadTestData } from '../../../src/utils/TestData';

let adminOrdersPage: AdminOrdersPage;
let adminOrderPage: AdminOrderPage;

let apisOwnInvoices: ApisOwnInvoices;

let testData: typeof import('../../../resources/testData/AdminOrderTestJsonFile.json');

/**
 * Admin order management on the local stack. Each case registers its own customer, seeds its own product and
 * creates the invoice through the API (the call checkout makes), then the admin works on that order.
 * Never retried: this target locks an account after ONE failed login (known defect #21).
 */
test.describe('Admin orders', () => {
  test.use({ role: 'admin' });
  test.describe.configure({ retries: 0 });

  test('Orders can be listed and viewed', { tag: ['@smoke'] }, async () => {
    await allure.feature('Admin orders');
    await allure.testCaseId('TC-ADM-5');
    const { order, expectedStatus, expectedListedTotal, expectedTotal, expectedPaymentMethod, expectedLine } = testData.tcADM5;

    const { created, productName } = await apisOwnInvoices.createOwnInvoice(order);
    await adminOrdersPage.navigate();
    await adminOrdersPage.searchOrder(created.invoiceNumber);
    await adminOrdersPage.verifyOrderListed(created.id, created.invoiceNumber, order.invoice.billingAddress, expectedStatus, expectedListedTotal);

    await adminOrdersPage.openOrder(created.id);
    await adminOrderPage.verifyDetails({
      invoiceNumber: created.invoiceNumber,
      total: expectedTotal,
      billingAddress: order.invoice.billingAddress,
      paymentMethod: expectedPaymentMethod,
      accountName: order.invoice.paymentAccountName,
      accountNumber: order.invoice.paymentAccountNumber,
    });
    await adminOrderPage.verifyLineItem(productName, expectedLine.quantity, expectedLine.price, expectedLine.total);
  });

  test('Order status can be set to each of the five values', { tag: ['@regression'] }, async () => {
    await allure.feature('Admin orders');
    await allure.testCaseId('TC-ADM-6');
    const { order, initialStatus, updatedMessage, onHold, awaitingShipment, awaitingShipmentMessage, shipped, completed } = testData.tcADM6;

    const { created } = await apisOwnInvoices.createOwnInvoice(order);
    await adminOrderPage.navigate(created.id);
    await adminOrderPage.verifyStatus(initialStatus);

    await adminOrderPage.setStatus(onHold);
    await adminOrderPage.verifyStatusUpdated(updatedMessage);
    await adminOrderPage.reload();
    await adminOrderPage.verifyStatus(onHold);

    await adminOrderPage.setStatusWithMessage(awaitingShipment, awaitingShipmentMessage);
    await adminOrderPage.verifyStatusUpdated(updatedMessage);
    await adminOrderPage.reload();
    await adminOrderPage.verifyStatus(awaitingShipment);

    await adminOrderPage.setStatus(shipped);
    await adminOrderPage.verifyStatusUpdated(updatedMessage);
    await adminOrderPage.reload();
    await adminOrderPage.verifyStatus(shipped);

    await adminOrderPage.setStatus(completed);
    await adminOrderPage.verifyStatusUpdated(updatedMessage);
    await adminOrderPage.reload();
    await adminOrderPage.verifyStatus(completed);
  });

  test.beforeAll(async () => {
    testData = loadTestData('AdminOrderTestJsonFile.json');
  });

  test.beforeEach(({ page, request }) => {
    apisOwnInvoices = new ApisOwnInvoices(request);
    adminOrdersPage = new AdminOrdersPage(page);
    adminOrderPage = new AdminOrderPage(page);
  });
});
