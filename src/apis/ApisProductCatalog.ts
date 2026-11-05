import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { searchTokenOf, withUuid } from '../utils/UniqueData';
import { applications } from '../config/applications';
import { expectToBe, expectToBeGreaterThan, expectToContainAll, expectToEqual } from '../utils/Expects';

/** One page of `GET /products` (Swagger: ProductResponse list, paginated). */
interface ProductPage {
  data: { name: string; category: { slug: string } }[];
}

/** A brand as `GET /brands/{id}` returned it. */
export interface BrandRecord {
  id: number;
  name: string;
  slug: string;
}

/** A category as `GET /categories/{id}` returned it. */
export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
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
}

/** A brand, a top-level category and products, all named by `{uuid}` templates (see UniqueData.withUuid). */
export interface CatalogSeed {
  brandName: string;
  categoryName: string;
  products: ProductSeed[];
}

/** What a seeded catalog left behind, for the test to drive the UI and the API with. */
export interface SeededCatalog {
  brandId: number;
  brandName: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  products: { id: string; name: string }[];
}

/** URL part of a name: lowercase words separated by hyphens (Swagger: slug). */
function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export class ApisProductCatalog {
  readonly apiActions: ApiActions;

  readonly products_serviceName = `${applications.app.apiUrl}/products`;
  readonly brands_serviceName = `${applications.app.apiUrl}/brands`;
  readonly categories_serviceName = `${applications.app.apiUrl}/categories`;
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

  /**
   * Creates a brand, a top-level category and the given products in them, each with stock.
   * Every create endpoint is public (no token). The records are deliberately left behind:
   * their names carry a per-run UUID, so nothing collides, and deleting needs an admin token.
   */
  async seedCatalog(uuid: string, seed: CatalogSeed): Promise<SeededCatalog> {
    const brandName = withUuid(seed.brandName, uuid);
    const categoryName = withUuid(seed.categoryName, uuid);
    return await allure.step(`Seed the category ${categoryName} with ${seed.products.length} product(s)`, async () => {
      const brandId = await this.createBrand(brandName);
      const categoryId = await this.createCategory(categoryName);
      const imageId = await this.getAnyProductImageId();
      const seeded: SeededCatalog['products'] = [];
      for (const template of seed.products) {
        const product = { ...template, name: withUuid(template.name, uuid) };
        const productId = await this.createProduct(product, categoryId, brandId, imageId);
        await this.setStock(productId, product, categoryId, brandId, imageId);
        seeded.push({ id: String(productId), name: product.name });
      }
      return { brandId, brandName, categoryId, categoryName, categorySlug: slugOf(categoryName), products: seeded };
    });
  }

  async createBrand(name: string): Promise<number> {
    return await allure.step(`Create the brand: ${name}`, async () => {
      const response = await this.apiActions.post(this.brands_serviceName, { data: { name, slug: slugOf(name) } });
      expectToBe('the create brand response status', response.status(), 201);
      return ((await response.json()) as { id: number }).id;
    });
  }

  /** Top-level category (`parent_id` null). */
  async createCategory(name: string): Promise<number> {
    return await allure.step(`Create the category: ${name}`, async () => {
      const response = await this.apiActions.post(this.categories_serviceName, {
        data: { name, slug: slugOf(name), parent_id: null },
      });
      expectToBe('the create category response status', response.status(), 201);
      return ((await response.json()) as { id: number }).id;
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

  async getBrand(brandId: number): Promise<BrandRecord> {
    return await allure.step(`Get the brand ${brandId}`, async () => {
      const response = await this.apiActions.get(`${this.brands_serviceName}/${brandId}`);
      expectToBe('the get brand response status', response.status(), 200);
      return (await response.json()) as BrandRecord;
    });
  }

  async getCategory(categoryId: number): Promise<CategoryRecord> {
    return await allure.step(`Get the category ${categoryId}`, async () => {
      const response = await this.apiActions.get(`${this.categories_serviceName}/${categoryId}`);
      expectToBe('the get category response status', response.status(), 200);
      return (await response.json()) as CategoryRecord;
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

  /** Changes the stock of the first seeded product through `PUT /products/{id}`, which replaces the whole record, so the rest is sent as it was seeded. */
  async restockSeededProduct(catalog: SeededCatalog, template: ProductSeed, stock: number) {
    await allure.step(`Restock the seeded product ${catalog.products[0].name} to ${stock}`, async () => {
      const imageId = await this.getAnyProductImageId();
      await this.setStock(Number(catalog.products[0].id), { ...template, name: catalog.products[0].name, stock }, catalog.categoryId, catalog.brandId, imageId);
    });
  }

  /** Creating a brand without its required fields is refused; resolves to the field names the API complained about. */
  async createBrandWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create a brand without its required fields', async () => {
      return await this.postEmptyAndGetReportedFields(this.brands_serviceName, 'the create brand without fields response status');
    });
  }

  /** Creating a category without its required fields is refused; resolves to the field names the API complained about. */
  async createCategoryWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create a category without its required fields', async () => {
      return await this.postEmptyAndGetReportedFields(this.categories_serviceName, 'the create category without fields response status');
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

  private async postEmptyAndGetReportedFields(url: string, statusSubject: string): Promise<string[]> {
    const response = await this.apiActions.post(url, { data: {} });
    expectToBe(statusSubject, response.status(), 422);
    return Object.keys((await response.json()) as Record<string, string[]>);
  }

  private productPayload(product: ProductSeed, categoryId: number, brandId: number, imageId: number) {
    return {
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: categoryId,
      brand_id: brandId,
      product_image_id: imageId,
      is_location_offer: 0,
      is_rental: 0,
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

  async verifyBrand(brand: BrandRecord, expectedId: number, expectedName: string) {
    await allure.step(`Verify the brand is stored as: ${expectedName}`, async () => {
      expectToEqual('the stored brand', { id: brand.id, name: brand.name, slug: brand.slug }, { id: expectedId, name: expectedName, slug: slugOf(expectedName) });
    });
  }

  async verifyTopLevelCategory(category: CategoryRecord, expectedId: number, expectedName: string) {
    await allure.step(`Verify the category is stored as a top-level category: ${expectedName}`, async () => {
      expectToEqual(
        'the stored category',
        { id: category.id, name: category.name, slug: category.slug, parent_id: category.parent_id },
        { id: expectedId, name: expectedName, slug: slugOf(expectedName), parent_id: null },
      );
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

  /** Reads the first seeded product back and checks it is stored with the seeded price, stock, category and brand. */
  async verifyFirstProductSeeded(catalog: SeededCatalog, seed: CatalogSeed) {
    const [seeded] = catalog.products;
    const [template] = seed.products;
    const product = await this.getProduct(seeded.id);
    await this.verifyProductStored(product, {
      id: seeded.id,
      name: seeded.name,
      price: template.price,
      stock: template.stock,
      categoryId: catalog.categoryId,
      brandId: catalog.brandId,
    });
  }

  /** Checks every seeded product is listed in its category and found by the run's search token. */
  async verifyProductsListedAndSearchable(catalog: SeededCatalog, uuid: string) {
    const seededNames = catalog.products.map((product) => product.name);
    const listing = await this.getCategoryListing(catalog.categorySlug);
    await this.verifyAllProductsInCategory(listing, catalog.categorySlug);
    await this.verifyProductNamesFound(listing.productNames, seededNames);
    const found = await this.searchProductNames(searchTokenOf(uuid));
    await this.verifyProductNamesFound(found, seededNames);
  }

  async verifyRequiredProductFieldsReported(reportedFields: string[], requiredFields: string[]) {
    await allure.step(`Verify the missing required fields are reported: ${requiredFields.join(', ')}`, async () => {
      expectToContainAll('the fields the API reported', reportedFields, requiredFields);
    });
  }

  async verifyRequiredFieldsReported(entity: string, reportedFields: string[], requiredFields: string[]) {
    await allure.step(`Verify the missing required ${entity} fields are reported: ${requiredFields.join(', ')}`, async () => {
      expectToContainAll(`the ${entity} fields the API reported`, reportedFields, requiredFields);
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
