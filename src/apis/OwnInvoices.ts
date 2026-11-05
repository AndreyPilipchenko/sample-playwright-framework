import { type APIRequestContext } from '@playwright/test';
import { newUuid, withUniqueEmail } from '../utils/UniqueData';
import { ApisInvoices, type CreatedInvoice, type InvoiceLineSeed, type InvoiceSeed } from './ApisInvoices';
import { ApisProductCatalog, type CatalogSeed } from './ApisProductCatalog';
import { ApisUserAccount, type UserSeed } from './ApisUserAccount';

/** Everything one invoice case needs: its customer, the product to buy, the invoice values and the quantity. */
export interface OwnInvoiceSeed {
  user: UserSeed;
  catalog: CatalogSeed;
  invoice: InvoiceSeed;
  quantity: number;
}

/**
 * Invoice flows that span domains (account, catalog, invoice). Each call registers its own customer
 * (email carries a per-run UUID) and signs in through the API as that customer; never retried by the
 * spec, because this target locks an account after ONE failed login (known defect #21). Records are
 * left behind on purpose (deleting needs an admin token).
 */

/** Registers a fresh customer and returns invoice calls that act as that customer. */
export async function registerInvoiceOwner(request: APIRequestContext, user: UserSeed, uuid = newUuid()) {
  const apisUserAccount = new ApisUserAccount(request);
  const owner = withUniqueEmail(user, uuid);
  const userId = await apisUserAccount.registerUser(owner);
  const apisInvoices = new ApisInvoices(request, () => apisUserAccount.getAccessToken(owner.email, owner.password));
  return { apisInvoices, userId, uuid };
}

/** Registers a customer, seeds one product and creates an invoice for it as that customer. */
export async function createOwnInvoice(request: APIRequestContext, seed: OwnInvoiceSeed) {
  const { apisInvoices, userId, uuid } = await registerInvoiceOwner(request, seed.user);
  const catalog = await new ApisProductCatalog(request).seedCatalog(uuid, seed.catalog);
  const lines: InvoiceLineSeed[] = [{ productId: catalog.products[0].id, unitPrice: seed.catalog.products[0].price, quantity: seed.quantity }];
  const created: CreatedInvoice = await apisInvoices.createInvoice(userId, seed.invoice, lines);
  return { apisInvoices, userId, created, lines };
}
