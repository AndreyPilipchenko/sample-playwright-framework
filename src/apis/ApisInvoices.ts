import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe } from '../utils/Expects';

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
      const response = await this.apiActions.post(this.invoices_serviceName, {
        data: {
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
        },
      });
      expectToBe('the create invoice response status', response.status(), 201);
      const body = (await response.json()) as { id: number; invoice_number: string; invoice_date: string };
      return { id: body.id, invoiceNumber: body.invoice_number, invoiceDate: body.invoice_date };
    });
  }
}
