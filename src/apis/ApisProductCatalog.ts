import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { withUuid } from '../utils/UniqueData';
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
      return { categoryName, categorySlug: slugOf(categoryName), products: seeded };
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
}
