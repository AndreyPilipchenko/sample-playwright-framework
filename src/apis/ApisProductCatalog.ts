import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeGreaterThan, expectToContainAll, expectToEqual } from '../utils/Expects';

/** One page of `GET /products` (Swagger: ProductResponse list, paginated). */
interface ProductPage {
  data: { name: string; category: { slug: string } }[];
}

/** One category listing as the API returned it — names and each product's own category, from the same response. */
export interface CategoryListing {
  productNames: string[];
  categorySlugs: string[];
}

export class ApisProductCatalog {
  readonly apiActions: ApiActions;

  readonly products_serviceName = `${applications.app.apiUrl}/products`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  /**
   * The first page of one category's products (9 per page), which is what the product
   * grid shows. Public endpoint, no token. The price window the UI sends is not mirrored:
   * defect #27 drops the max price, and every Hammer is within the UI's default window.
   */
  async getCategoryListing(categorySlug: string): Promise<CategoryListing> {
    return await allure.step(`Get the product listing of category: ${categorySlug}`, async () => {
      const response = await this.apiActions.get(this.products_serviceName, {
        params: { by_category_slug: categorySlug },
      });
      expectToBe('the product list response status', response.status(), 200);
      const { data } = (await response.json()) as ProductPage;
      return {
        productNames: data.map((product) => product.name),
        categorySlugs: data.map((product) => product.category.slug),
      };
    });
  }

  ///// Validations

  async verifyProductNamesInclude(listing: CategoryListing, knownNames: string[]) {
    await allure.step(`Verify the category product list includes the known products: ${knownNames.join(', ')}`, async () => {
      expectToContainAll('the product names in the API response', listing.productNames, knownNames);
    });
  }

  /** Checks each listed product's own category, independently of the filter that selected it. */
  async verifyAllProductsInCategory(listing: CategoryListing, categorySlug: string) {
    await allure.step(`Verify every product listed for category ${categorySlug} belongs to it`, async () => {
      expectToBeGreaterThan('the number of products in the category', listing.categorySlugs.length, 0);
      expectToEqual('the category of every listed product', listing.categorySlugs, listing.categorySlugs.map(() => categorySlug));
    });
  }
}
