import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeAtLeast, expectToBeAtMost, expectToContain, expectToContainAll, expectToEqual } from '../utils/Expects';
import { postEmptyAndGetReportedFields } from '../utils/ApiChecks';

/** One line item of an invoice (Swagger: InvoiceItem). */
export interface InvoiceLineSeed {
  productId: string;
  unitPrice: number;
  quantity: number;
}

/** The values an invoice is created from (Swagger: InvoiceRequest); the billing address and payment are Bank Transfer values. */
export interface InvoiceSeed {
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostcode: string;
  paymentAccountName: string;
  paymentAccountNumber: string;
}

/** What a created invoice looks like to the test: its number and date exactly as the API issued them. */
export interface CreatedInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
}

/** An invoice as `GET /invoices/{id}` and `GET /invoices` return it (Swagger: InvoiceResponse), limited to what the specs read. */
export interface InvoiceRecord {
  id: number;
  user_id: number;
  invoice_number: string;
  invoice_date: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postcode: string;
  total: number;
  payment_method: string;
  payment_account_name: string;
  payment_account_number: number | string;
  invoicelines: { product_id: number | string; unit_price: number; quantity: number }[];
}

export class ApisInvoices {
  readonly apiActions: ApiActions;

  readonly invoices_serviceName = `${applications.app.apiUrl}/invoices`;

  /** `bearerTokenProvider` signs in as the invoice owner (see ApisUserAccount.getAccessToken); the facade injects the token. */
  constructor(request: APIRequestContext, bearerTokenProvider: () => Promise<string>) {
    this.apiActions = new ApiActions(request, { bearerTokenProvider });
  }

  ///// Actions

  /**
   * Creates an invoice for `userId`, the same call the checkout makes when an order is placed. The
   * invoice is deliberately left behind: it belongs to a disposable customer whose email carries a
   * per-run UUID, and deleting it needs an admin token.
   */
  async createInvoice(userId: number, seed: InvoiceSeed, lines: InvoiceLineSeed[]): Promise<CreatedInvoice> {
    return await allure.step('Create an invoice through the API', async () => {
      const total = Number(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0).toFixed(2));
      const response = await this.apiActions.post(this.invoices_serviceName, { data: this.invoicePayload(userId, seed, lines, total) });
      expectToBe('the create invoice response status', response.status(), 201);
      const body = (await response.json()) as { id: number; invoice_number: string; invoice_date: string };
      return { id: body.id, invoiceNumber: body.invoice_number, invoiceDate: body.invoice_date };
    });
  }

  /**
   * Creates an invoice whose unit price and total are not the product's real ones, and resolves to the
   * response status. Records created by a defective build are left behind like every other invoice.
   */
  async createInvoiceWithForgedAmounts(userId: number, seed: InvoiceSeed, line: InvoiceLineSeed, forgedTotal: number): Promise<number> {
    return await allure.step('Create an invoice with a client-supplied unit price and total', async () => {
      const response = await this.apiActions.post(this.invoices_serviceName, { data: this.invoicePayload(userId, seed, [line], forgedTotal) });
      return response.status();
    });
  }

  async getInvoice(invoiceId: number): Promise<InvoiceRecord> {
    return await allure.step(`Get the invoice ${invoiceId}`, async () => {
      const response = await this.apiActions.get(`${this.invoices_serviceName}/${invoiceId}`);
      expectToBe('the get invoice response status', response.status(), 200);
      return (await response.json()) as InvoiceRecord;
    });
  }

  /** The first page of the caller's invoice list (`GET /invoices`). */
  async getInvoiceNumbers(): Promise<string[]> {
    return await allure.step('Get the invoice list', async () => {
      const response = await this.apiActions.get(this.invoices_serviceName);
      expectToBe('the invoice list response status', response.status(), 200);
      const { data } = (await response.json()) as { data: InvoiceRecord[] };
      return data.map((invoice) => invoice.invoice_number);
    });
  }

  /** How many invoices the caller's list reports (`total` of `GET /invoices`), across every page. */
  async getInvoiceCount(): Promise<number> {
    return await allure.step('Get the number of invoices listed', async () => {
      const response = await this.apiActions.get(this.invoices_serviceName);
      expectToBe('the invoice list response status', response.status(), 200);
      return ((await response.json()) as { total: number }).total;
    });
  }

  /** Creating an invoice without its required fields is refused; resolves to the field names the API complained about. */
  async createInvoiceWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create an invoice without its required fields', async () => {
      return await postEmptyAndGetReportedFields(this.apiActions, this.invoices_serviceName, 'the create invoice without fields response status');
    });
  }

  private invoicePayload(userId: number, seed: InvoiceSeed, lines: InvoiceLineSeed[], total: number) {
    return {
      user_id: userId,
      billing_address: seed.billingAddress,
      billing_city: seed.billingCity,
      billing_state: seed.billingState,
      billing_country: seed.billingCountry,
      billing_postcode: seed.billingPostcode,
      total,
      payment_method: 'Bank Transfer',
      payment_account_name: seed.paymentAccountName,
      payment_account_number: seed.paymentAccountNumber,
      invoice_items: lines.map((line) => ({ product_id: line.productId, unit_price: line.unitPrice, quantity: line.quantity })),
    };
  }

  ///// Validations

  /** The owner's list is not empty, so an empty list for a customer who owns none proves scoping, not a broken list. */
  async verifyOwnInvoicesListed(count: number) {
    await allure.step('Verify the owner sees their own invoice in the list', async () => {
      expectToBeAtLeast('the number of invoices listed for the owner', count, 1);
    });
  }

  /** A customer who owns no invoice sees none, however many invoices other customers own. */
  async verifyNoInvoicesListed(count: number) {
    await allure.step('Verify a customer without invoices sees no invoice in the list', async () => {
      expectToBe('the number of invoices listed for a customer who owns none', count, 0);
    });
  }

  /** The client's unit price and total are refused with a 4xx status, so no invoice carries them. */
  async verifyForgedAmountsRefused(status: number) {
    await allure.step('Verify an invoice with a client-supplied unit price and total is refused', async () => {
      expectToBeAtLeast('the status of the forged invoice', status, 400);
      expectToBeAtMost('the status of the forged invoice', status, 499);
    });
  }

  /** The number is `INV-` and digits; the date starts with the calendar day (the create response writes the time with dashes, the read with colons). */
  async verifyInvoiceIssued(created: CreatedInvoice) {
    await allure.step(`Verify the invoice ${created.invoiceNumber} was issued with a number and a date`, async () => {
      expectToBe('whether the invoice number is INV- and digits', /^INV-\d+$/.test(created.invoiceNumber), true);
      expectToBe('whether the invoice date starts with a calendar day', /^\d{4}-\d{2}-\d{2}/.test(created.invoiceDate), true);
    });
  }

  async verifyInvoiceStored(invoice: InvoiceRecord, expected: { userId: number; seed: InvoiceSeed; total: number }) {
    await allure.step(`Verify the invoice ${invoice.invoice_number} is stored with its billing address, payment and total`, async () => {
      expectToEqual(
        'the stored invoice',
        {
          userId: invoice.user_id,
          billingAddress: invoice.billing_address,
          billingCity: invoice.billing_city,
          billingState: invoice.billing_state,
          billingCountry: invoice.billing_country,
          billingPostcode: invoice.billing_postcode,
          paymentMethod: invoice.payment_method,
          paymentAccountName: invoice.payment_account_name,
          paymentAccountNumber: String(invoice.payment_account_number),
          total: invoice.total,
        },
        {
          userId: expected.userId,
          billingAddress: expected.seed.billingAddress,
          billingCity: expected.seed.billingCity,
          billingState: expected.seed.billingState,
          billingCountry: expected.seed.billingCountry,
          billingPostcode: expected.seed.billingPostcode,
          paymentMethod: 'Bank Transfer',
          paymentAccountName: expected.seed.paymentAccountName,
          paymentAccountNumber: expected.seed.paymentAccountNumber,
          total: expected.total,
        },
      );
    });
  }

  async verifyInvoiceLines(invoice: InvoiceRecord, expectedLines: InvoiceLineSeed[]) {
    await allure.step(`Verify the invoice ${invoice.invoice_number} keeps its ${expectedLines.length} line item(s)`, async () => {
      expectToEqual(
        'the stored invoice lines',
        invoice.invoicelines.map((line) => ({ productId: String(line.product_id), unitPrice: line.unit_price, quantity: line.quantity })),
        expectedLines,
      );
    });
  }

  async verifyInvoiceListed(invoiceNumbers: string[], invoiceNumber: string) {
    await allure.step(`Verify the invoice list contains ${invoiceNumber}`, async () => {
      expectToContain('the invoice numbers listed', invoiceNumbers, invoiceNumber);
    });
  }

  async verifyRequiredInvoiceFieldsReported(reportedFields: string[], requiredFields: string[]) {
    await allure.step(`Verify the missing required fields are reported: ${requiredFields.join(', ')}`, async () => {
      expectToContainAll('the fields the API reported', reportedFields, requiredFields);
    });
  }
}
