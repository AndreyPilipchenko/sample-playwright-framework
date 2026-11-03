import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBe, expectToBeGreaterThan, expectToContainAll, expectToEqual } from '../utils/Expects';

/** One page of `GET /products` (Swagger: ProductResponse list, paginated). */
interface ProductPage {
  data: { name: string; category: { slug: string } }[];
}

export class ApisProductCatalog {
  readonly apiActions: ApiActions;

  readonly products_serviceName = `${applications.app.apiUrl}/products`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  /**
   * Names of the products in one category — the first page only (9 per page), which is
   * what the product grid shows. Public endpoint, no token.
   */
  async getProductNamesInCategory(categorySlug: string): Promise<string[]> {
    return await allure.step(`Get the product names in category: ${categorySlug}`, async () => {
      const { data } = await this.getCategoryPage(categorySlug);
      return data.map((product) => product.name);
    });
  }

  ///// Validations

  async verifyProductNamesInclude(productNames: string[], knownNames: string[]) {
    await allure.step(`Verify the category product list includes the known products: ${knownNames.join(', ')}`, async () => {
      expectToContainAll('the product names in the API response', productNames, knownNames);
    });
  }

  /** Checks each listed product's own category, independently of the filter that selected it. */
  async verifyAllProductsInCategory(categorySlug: string) {
    await allure.step(`Verify every product listed for category ${categorySlug} belongs to it`, async () => {
      const { data } = await this.getCategoryPage(categorySlug);
      const categorySlugs = data.map((product) => product.category.slug);
      expectToBeGreaterThan('the number of products in the category', categorySlugs.length, 0);
      expectToEqual('the category of every listed product', categorySlugs, categorySlugs.map(() => categorySlug));
    });
  }

  private async getCategoryPage(categorySlug: string): Promise<ProductPage> {
    const response = await this.apiActions.get(this.products_serviceName, {
      params: { by_category_slug: categorySlug },
    });
    expectToBe('the product list response status', response.status(), 200);
    return (await response.json()) as ProductPage;
  }
}
