import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { byBuild } from '../utils/AppEnvironment';
import { applications } from '../config/applications';
import { expectToBe, expectToBeAtLeast, expectToBeAtMost, expectToContain, expectToEqual } from '../utils/Expects';
import { postEmptyAndGetReportedFields } from '../utils/ApiChecks';

/** One line item of an invoice (Swagger: InvoiceItem). */
export interface InvoiceLineSeed {
  productId: string;
  unitPrice: number;
  quantity: number;
}

/**
 * The values an invoice is created from (Swagger: InvoiceRequest); the billing address and payment are Bank
 * Transfer values. The fixed build checks the city and state against its postcode lookup and needs a bank
 * name (docs/app-versions.md, B7), so seeds use the city and state that lookup gives for their postcode.
 */
export interface InvoiceSeed {
  /** The street line: `billing_address` on the with-bugs build, `billing_street` on the fixed build. */
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostcode: string;
  paymentBankName: string;
  paymentAccountName: string;
  paymentAccountNumber: string;
}

/** What a created invoice looks like to the test: its number and date exactly as the API issued them. */
export interface CreatedInvoice {
  /** A number on the with-bugs build, a string on the fixed build. */
  id: number | string;
  invoiceNumber: string;
  invoiceDate: string;
}

/**
 * An invoice as `GET /invoices/{id}` and `GET /invoices` return it (Swagger: InvoiceResponse), limited to what
 * the specs read. The with-bugs build has `billing_address`, `billing_postcode` and flat payment fields; the
 * fixed build `billing_street`, `billing_postal_code` and a nested `payment` (docs/app-versions.md, B7).
 */
export interface InvoiceRecord {
  id: number | string;
  user_id: number | string;
  invoice_number: string;
  invoice_date: string;
  billing_address?: string;
  billing_street?: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postcode?: string;
  billing_postal_code?: string;
  total: number;
  payment_method?: string;
  payment_account_name?: string;
  payment_account_number?: number | string;
  payment?: { payment_method: string; payment_details: { bank_name?: string; account_name?: string; account_number?: number | string } };
  invoicelines: { product_id: number | string; unit_price: number; quantity: number }[];
}

/** What came of an invoice sent with a client-supplied unit price and total. */
export interface ForgedInvoiceOutcome {
  status: number;
  /** The invoice as stored, read back when the API accepted the request. */
  stored?: InvoiceRecord;
}

export class ApisInvoices {
  readonly apiActions: ApiActions;

  readonly invoices_serviceName = `${applications.app.apiUrl}/invoices`;
  /** The fixed build only: an order is placed from a server-side cart (docs/app-versions.md, B7). */
  readonly carts_serviceName = `${applications.app.apiUrl}/carts`;
  /** How the API names the Bank Transfer payment method. */
  readonly bankTransfer_method = byBuild({ fixed: 'bank-transfer', default: 'Bank Transfer' });

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
  async createInvoice(userId: number | string, seed: InvoiceSeed, lines: InvoiceLineSeed[]): Promise<CreatedInvoice> {
    return await allure.step('Create an invoice through the API', async () => {
      const total = Number(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0).toFixed(2));
      const response = await this.apiActions.post(this.invoices_serviceName, { data: await this.invoicePayload(userId, seed, lines, total) });
      expectToBe('the create invoice response status', response.status(), 201);
      const body = (await response.json()) as { id: number | string; invoice_number: string; invoice_date: string };
      return { id: body.id, invoiceNumber: body.invoice_number, invoiceDate: body.invoice_date };
    });
  }

  /**
   * Creates an invoice whose unit price and total are not the product's real ones. Resolves to the response
   * status and, when the API accepted it, the invoice as stored, so the validation can tell a refusal, a
   * server-side re-pricing and a stored forgery apart. Records are left behind like every other invoice.
   */
  async createInvoiceWithForgedAmounts(userId: number | string, seed: InvoiceSeed, line: InvoiceLineSeed, forgedTotal: number): Promise<ForgedInvoiceOutcome> {
    return await allure.step('Create an invoice with a client-supplied unit price and total', async () => {
      const response = await this.apiActions.post(this.invoices_serviceName, { data: await this.invoicePayload(userId, seed, [line], forgedTotal) });
      const status = response.status();
      if (status !== 201) return { status };
      const { id } = (await response.json()) as { id: number | string };
      return { status, stored: await this.getInvoice(id) };
    });
  }

  async getInvoice(invoiceId: number | string): Promise<InvoiceRecord> {
    return await allure.step(`Get the invoice ${invoiceId}`, async () => {
      const response = await this.apiActions.get(`${this.invoices_serviceName}/${invoiceId}`);
      expectToBe('the get invoice response status', response.status(), 200);
      return (await response.json()) as InvoiceRecord;
    });
  }

  /** The caller's invoice list (`GET /invoices`): the invoice numbers on its first page, and `total` across every page. */
  async getInvoiceList(): Promise<{ numbers: string[]; total: number }> {
    return await allure.step('Get the invoice list', async () => {
      const response = await this.apiActions.get(this.invoices_serviceName);
      expectToBe('the invoice list response status', response.status(), 200);
      const { data, total } = (await response.json()) as { data: InvoiceRecord[]; total: number };
      return { numbers: data.map((invoice) => invoice.invoice_number), total };
    });
  }

  /** Creating an invoice without its required fields is refused; resolves to the field names the API complained about. */
  async createInvoiceWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create an invoice without its required fields', async () => {
      return await postEmptyAndGetReportedFields(this.apiActions, this.invoices_serviceName, 'the create invoice without fields response status');
    });
  }

  /**
   * The create invoice body. The with-bugs build takes the lines, their prices and the total from the
   * client. The fixed build places the order from a cart, filled first, and prices it on the server; the
   * client's prices and total still go along as extra fields, which is what the forged-amounts case sends.
   */
  private async invoicePayload(userId: number | string, seed: InvoiceSeed, lines: InvoiceLineSeed[], total: number): Promise<Record<string, unknown>> {
    const clientAmounts = {
      total,
      invoice_items: lines.map((line) => ({ product_id: line.productId, unit_price: line.unitPrice, quantity: line.quantity })),
    };
    const fixedPayload = async () => ({
      billing_street: seed.billingAddress,
      billing_city: seed.billingCity,
      billing_state: seed.billingState,
      billing_country: seed.billingCountry,
      billing_postal_code: seed.billingPostcode,
      payment_method: this.bankTransfer_method,
      payment_details: { bank_name: seed.paymentBankName, account_name: seed.paymentAccountName, account_number: seed.paymentAccountNumber },
      cart_id: await this.createCart(lines),
      ...clientAmounts,
    });
    const withBugsPayload = async () => ({
      user_id: userId,
      billing_address: seed.billingAddress,
      billing_city: seed.billingCity,
      billing_state: seed.billingState,
      billing_country: seed.billingCountry,
      billing_postcode: seed.billingPostcode,
      payment_method: this.bankTransfer_method,
      payment_account_name: seed.paymentAccountName,
      payment_account_number: seed.paymentAccountNumber,
      ...clientAmounts,
    });
    return await byBuild({ fixed: fixedPayload, default: withBugsPayload })();
  }

  /** The fixed build only: a cart holding the lines, filled the way the shop's checkout fills it. */
  private async createCart(lines: InvoiceLineSeed[]): Promise<string> {
    return await allure.step('Create a cart holding the invoice lines', async () => {
      const response = await this.apiActions.post(this.carts_serviceName);
      expectToBe('the create cart response status', response.status(), 201);
      const { id } = (await response.json()) as { id: string };
      for (const line of lines) {
        const added = await this.apiActions.post(`${this.carts_serviceName}/${id}`, { data: { product_id: line.productId, quantity: line.quantity } });
        expectToBe('the add to cart response status', added.status(), 200);
      }
      return id;
    });
  }

  /** The billing address and payment of a stored invoice, read from wherever the build keeps them. */
  private storedBillingAndPayment(invoice: InvoiceRecord) {
    const payment = byBuild({
      fixed: { method: invoice.payment?.payment_method, ...invoice.payment?.payment_details },
      default: { method: invoice.payment_method, account_name: invoice.payment_account_name, account_number: invoice.payment_account_number },
    });
    return {
      billingAddress: byBuild({ fixed: invoice.billing_street, default: invoice.billing_address }),
      billingCity: invoice.billing_city,
      billingState: invoice.billing_state,
      billingCountry: invoice.billing_country,
      billingPostcode: byBuild({ fixed: invoice.billing_postal_code, default: invoice.billing_postcode }),
      paymentMethod: payment.method,
      paymentAccountName: payment.account_name,
      paymentAccountNumber: payment.account_number === undefined ? undefined : String(payment.account_number),
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

  /**
   * No invoice keeps the client's unit price and total. The with-bugs build takes the amounts in the request, so
   * there the request must be refused (4xx). The fixed build takes no amounts at all: it prices the server cart
   * (docs/app-versions.md, B7), so there the invoice must be created (201) at the product's real price. A
   * refusal on the fixed build fails: it would mean the order was rejected for some other reason, which proves
   * nothing about pricing.
   */
  async verifyForgedAmountsNotStored(outcome: ForgedInvoiceOutcome, real: { unitPrice: number; quantity: number }) {
    const check = byBuild({
      fixed: () => {
        expectToBe('the status of the order sent with forged amounts', outcome.status, 201);
        expectToEqual(
          'the unit price and total stored for the forged invoice',
          { unitPrice: outcome.stored?.invoicelines[0]?.unit_price, total: outcome.stored?.total },
          { unitPrice: real.unitPrice, total: Number((real.unitPrice * real.quantity).toFixed(2)) },
        );
      },
      default: () => {
        expectToBeAtLeast('the status of the forged invoice', outcome.status, 400);
        expectToBeAtMost('the status of the forged invoice', outcome.status, 499);
      },
    });
    await allure.step('Verify the invoice does not keep the client-supplied unit price and total', async () => {
      check();
    });
  }

  /** The number is `INV-` and digits; the date starts with the calendar day (the create response writes the time with dashes, the read with colons). */
  async verifyInvoiceIssued(created: CreatedInvoice) {
    await allure.step(`Verify the invoice ${created.invoiceNumber} was issued with a number and a date`, async () => {
      expectToBe('whether the invoice number is INV- and digits', /^INV-\d+$/.test(created.invoiceNumber), true);
      expectToBe('whether the invoice date starts with a calendar day', /^\d{4}-\d{2}-\d{2}/.test(created.invoiceDate), true);
    });
  }

  async verifyInvoiceStored(invoice: InvoiceRecord, expected: { userId: number | string; seed: InvoiceSeed; total: number }) {
    await allure.step(`Verify the invoice ${invoice.invoice_number} is stored with its billing address, payment and total`, async () => {
      expectToEqual(
        'the stored invoice',
        { userId: invoice.user_id, ...this.storedBillingAndPayment(invoice), total: invoice.total },
        {
          userId: expected.userId,
          billingAddress: expected.seed.billingAddress,
          billingCity: expected.seed.billingCity,
          billingState: expected.seed.billingState,
          billingCountry: expected.seed.billingCountry,
          billingPostcode: expected.seed.billingPostcode,
          paymentMethod: this.bankTransfer_method,
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
}
