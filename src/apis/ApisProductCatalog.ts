import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { searchTokenOf, slugOf, withUuid } from '../utils/UniqueData';
import { ApisBrands } from './ApisBrands';
import { ApisCategories } from './ApisCategories';
import { ApisProducts, type ProductSeed } from './ApisProducts';

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

/** Flows that span the brand, category and product endpoints; each endpoint's own calls live in its class. */
export class ApisProductCatalog {
  readonly apisBrands: ApisBrands;
  readonly apisCategories: ApisCategories;
  readonly apisProducts: ApisProducts;

  constructor(request: APIRequestContext) {
    this.apisBrands = new ApisBrands(request);
    this.apisCategories = new ApisCategories(request);
    this.apisProducts = new ApisProducts(request);
  }

  ///// Actions

  /**
   * Creates a brand, a top-level category and the given products in them, each with stock.
   * Every create endpoint is public (no token). The records are deliberately left behind:
   * their names carry a per-run UUID, so nothing collides, and deleting needs an admin token.
   */
  async seedCatalog(uuid: string, seed: CatalogSeed): Promise<SeededCatalog> {
    const brandName = withUuid(seed.brandName, uuid);
    const categoryName = withUuid(seed.categoryName, uuid);
    return await allure.step(`Seed the category ${categoryName} with ${seed.products.length} product(s)`, async () => {
      const brandId = await this.apisBrands.createBrand(brandName);
      const categoryId = await this.apisCategories.createCategory(categoryName);
      const imageId = await this.apisProducts.getAnyProductImageId();
      const seeded: SeededCatalog['products'] = [];
      for (const template of seed.products) {
        const product = { ...template, name: withUuid(template.name, uuid) };
        const productId = await this.apisProducts.createProduct(product, categoryId, brandId, imageId);
        await this.apisProducts.setStock(productId, product, categoryId, brandId, imageId);
        seeded.push({ id: String(productId), name: product.name });
      }
      return { brandId, brandName, categoryId, categoryName, categorySlug: slugOf(categoryName), products: seeded };
    });
  }

  /** Changes the stock of the first seeded product through `PUT /products/{id}`, which replaces the whole record, so the rest is sent as it was seeded. */
  async restockSeededProduct(catalog: SeededCatalog, template: ProductSeed, stock: number) {
    await allure.step(`Restock the seeded product ${catalog.products[0].name} to ${stock}`, async () => {
      const imageId = await this.apisProducts.getAnyProductImageId();
      await this.apisProducts.setStock(Number(catalog.products[0].id), { ...template, name: catalog.products[0].name, stock }, catalog.categoryId, catalog.brandId, imageId);
    });
  }

  ///// Validations

  /** Reads the first seeded product back and checks it is stored with the seeded price, stock, category and brand. */
  async verifyFirstProductSeeded(catalog: SeededCatalog, seed: CatalogSeed) {
    const [seeded] = catalog.products;
    const [template] = seed.products;
    const product = await this.apisProducts.getProduct(seeded.id);
    await this.apisProducts.verifyProductStored(product, {
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
    const listing = await this.apisProducts.getCategoryListing(catalog.categorySlug);
    await this.apisProducts.verifyAllProductsInCategory(listing, catalog.categorySlug);
    await this.apisProducts.verifyProductNamesFound(listing.productNames, seededNames);
    const found = await this.apisProducts.searchProductNames(searchTokenOf(uuid));
    await this.apisProducts.verifyProductNamesFound(found, seededNames);
  }
}
