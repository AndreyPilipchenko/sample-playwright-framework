import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { withUuid } from '../utils/UniqueData';
import { applications } from '../config/applications';
import { expectToBe, expectToBeGreaterThan, expectToBeOneOf, expectToContainAll, expectToEqual } from '../utils/Expects';

/** One page of `GET /products` (Swagger: ProductResponse list, paginated). */
interface ProductPage {
  data: { name: string; category: { slug: string } }[];
}

/** A product as `GET /products/{id}` returned it. */
export interface ProductRecord {
  id: number;
  name: string;
  price: number;
  stock: number | null;
  category: { id: number; name: string; slug: string };
  brand: { id: number; name: string };
}

/** One category listing as the API returned it — names and each product's own category, from the same response. */
export interface CategoryListing {
  productNames: string[];
  categorySlugs: string[];
}

/** The values a seeded product is created from; `name` is a template with a `{uuid}` placeholder. */
export interface ProductSeed {
  name: string;
  description: string;
  price: number;
  co2Rating: string;
  /** Not in the Swagger ProductRequest, but PUT /products/{id} honours it — a created product has no stock and the UI shows it out of stock. */
  stock: number;
  /** Rental products are priced per hour and count as the rental half of the 15% combination discount. */
  isRental?: boolean;
  /** Location offers get the geo-location discount in the UI. */
  isLocationOffer?: boolean;
}

/** A rental product as `GET /products?is_rental=true` returned it. */
export interface RentalListingEntry {
  name: string;
  price: number;
}

export class ApisProducts {
  readonly apiActions: ApiActions;

  readonly products_serviceName = `${applications.app.apiUrl}/products`;
  readonly images_serviceName = `${applications.app.apiUrl}/images`;

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

  /** One more stocked product in a category and brand that already exist; lets a case combine records of two seeded catalogs. */
  async addProduct(uuid: string, template: ProductSeed, categoryId: number, brandId: number): Promise<{ id: string; name: string }> {
    const product = { ...template, name: withUuid(template.name, uuid) };
    return await allure.step(`Add the product ${product.name} to category ${categoryId} and brand ${brandId}`, async () => {
      const imageId = await this.getAnyProductImageId();
      const productId = await this.createProduct(product, categoryId, brandId, imageId);
      await this.setStock(productId, product, categoryId, brandId, imageId);
      return { id: String(productId), name: product.name };
    });
  }

  /** The first page of rental products, ordered by id, so the first entries stay put while other cases seed rentals. */
  async getRentalListing(): Promise<RentalListingEntry[]> {
    return await allure.step('Get the first page of rental products', async () => {
      const response = await this.apiActions.get(this.products_serviceName, { params: { is_rental: 'true' } });
      expectToBe('the rental list response status', response.status(), 200);
      const { data } = (await response.json()) as { data: RentalListingEntry[] };
      expectToBeGreaterThan('the number of rental products', data.length, 0);
      return data;
    });
  }

  /** The id of an image already on the server — images cannot be created through the API. */
  async getAnyProductImageId(): Promise<number> {
    return await allure.step('Get the id of an existing product image', async () => {
      const response = await this.apiActions.get(this.images_serviceName);
      expectToBe('the image list response status', response.status(), 200);
      const images = (await response.json()) as { id: number }[];
      expectToBeGreaterThan('the number of existing product images', images.length, 0);
      return images[0].id;
    });
  }

  async createProduct(product: ProductSeed, categoryId: number, brandId: number, imageId: number): Promise<number> {
    return await allure.step(`Create the product: ${product.name}`, async () => {
      const response = await this.apiActions.post(this.products_serviceName, {
        data: this.productPayload(product, categoryId, brandId, imageId),
      });
      expectToBe('the create product response status', response.status(), 201);
      return ((await response.json()) as { id: number }).id;
    });
  }

  async setStock(productId: number, product: ProductSeed, categoryId: number, brandId: number, imageId: number) {
    await allure.step(`Set the stock of product ${productId} to ${product.stock}`, async () => {
      const response = await this.apiActions.put(`${this.products_serviceName}/${productId}`, {
        data: { ...this.productPayload(product, categoryId, brandId, imageId), stock: product.stock },
      });
      expectToBe('the update product response status', response.status(), 200);
    });
  }

  async getProduct(productId: string): Promise<ProductRecord> {
    return await allure.step(`Get the product ${productId}`, async () => {
      const response = await this.apiActions.get(`${this.products_serviceName}/${productId}`);
      expectToBe('the get product response status', response.status(), 200);
      return (await response.json()) as ProductRecord;
    });
  }

  /** Names found by `GET /products/search` for the query (first page). */
  async searchProductNames(query: string): Promise<string[]> {
    return await allure.step(`Search the products for: ${query}`, async () => {
      const response = await this.apiActions.get(`${this.products_serviceName}/search`, { params: { q: query } });
      expectToBe('the product search response status', response.status(), 200);
      const { data } = (await response.json()) as ProductPage;
      return data.map((product) => product.name);
    });
  }

  /** The status of deleting a product with no token at all. */
  async deleteProductWithoutToken(productId: string): Promise<number> {
    return await allure.step(`Delete the product ${productId} without a token`, async () => {
      const response = await this.apiActions.delete(`${this.products_serviceName}/${productId}`);
      return response.status();
    });
  }

  /** The status `GET /products/{id}` answers for an id that does not exist. */
  async getProductStatus(productId: string): Promise<number> {
    return await allure.step(`Get the status of the product ${productId}`, async () => {
      return (await this.apiActions.get(`${this.products_serviceName}/${productId}`)).status();
    });
  }

  /** Creating a product without its required fields is refused; resolves to the field names the API complained about. */
  async createProductWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create a product without its required fields', async () => {
      const response = await this.apiActions.post(this.products_serviceName, { data: {} });
      expectToBe('the create product without fields response status', response.status(), 422);
      return Object.keys((await response.json()) as Record<string, string[]>);
    });
  }

  private productPayload(product: ProductSeed, categoryId: number, brandId: number, imageId: number) {
    return {
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: categoryId,
      brand_id: brandId,
      product_image_id: imageId,
      is_location_offer: product.isLocationOffer ? 1 : 0,
      is_rental: product.isRental ? 1 : 0,
      co2_rating: product.co2Rating,
    };
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

  /** Deleting without an admin token is refused: 401 or 403. */
  async verifyDeleteRefused(productId: string, status: number) {
    await allure.step(`Verify deleting the product ${productId} without a token is refused`, async () => {
      expectToBeOneOf(`the status of deleting the product ${productId} without a token`, status, [401, 403]);
    });
  }

  async verifyProductStored(product: ProductRecord, expected: { id: string; name: string; price: number; stock: number; categoryId: number; brandId: number }) {
    await allure.step(`Verify the product is stored as: ${expected.name}`, async () => {
      expectToEqual(
        'the stored product',
        { id: String(product.id), name: product.name, price: product.price, stock: product.stock, categoryId: product.category.id, brandId: product.brand.id },
        expected,
      );
    });
  }

  async verifyProductNamesFound(names: string[], expectedNames: string[]) {
    await allure.step(`Verify the product names found are exactly: ${expectedNames.join(', ')}`, async () => {
      expectToEqual('the product names found', [...names].sort(), [...expectedNames].sort());
    });
  }

  async verifyRequiredProductFieldsReported(reportedFields: string[], requiredFields: string[]) {
    await allure.step(`Verify the missing required fields are reported: ${requiredFields.join(', ')}`, async () => {
      expectToContainAll('the fields the API reported', reportedFields, requiredFields);
    });
  }

  async verifyProductStock(product: ProductRecord, expectedStock: number) {
    await allure.step(`Verify the product ${product.name} has the stock ${expectedStock}`, async () => {
      expectToBe('the stored stock', product.stock, expectedStock);
    });
  }

  async verifyNotFound(subject: string, status: number) {
    await allure.step(`Verify ${subject} is not found`, async () => {
      expectToBe(`the status for ${subject}`, status, 404);
    });
  }
}
