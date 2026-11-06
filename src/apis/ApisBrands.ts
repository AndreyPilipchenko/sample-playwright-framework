import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { slugOf } from '../utils/UniqueData';
import { applications } from '../config/applications';
import { expectToBe, expectToBeOneOf, expectToContainAll, expectToEqual } from '../utils/Expects';

/** A brand as `GET /brands/{id}` returned it. */
export interface BrandRecord {
  id: number;
  name: string;
  slug: string;
}

export class ApisBrands {
  readonly apiActions: ApiActions;

  readonly brands_serviceName = `${applications.app.apiUrl}/brands`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  async createBrand(name: string): Promise<number> {
    return await allure.step(`Create the brand: ${name}`, async () => {
      const response = await this.apiActions.post(this.brands_serviceName, { data: { name, slug: slugOf(name) } });
      expectToBe('the create brand response status', response.status(), 201);
      return ((await response.json()) as { id: number }).id;
    });
  }

  async getBrand(brandId: number): Promise<BrandRecord> {
    return await allure.step(`Get the brand ${brandId}`, async () => {
      const response = await this.apiActions.get(`${this.brands_serviceName}/${brandId}`);
      expectToBe('the get brand response status', response.status(), 200);
      return (await response.json()) as BrandRecord;
    });
  }

  /** The status of deleting a brand with no token at all. */
  async deleteBrandWithoutToken(brandId: number): Promise<number> {
    return await allure.step(`Delete the brand ${brandId} without a token`, async () => {
      const response = await this.apiActions.delete(`${this.brands_serviceName}/${brandId}`);
      return response.status();
    });
  }

  /** Creating a brand without its required fields is refused; resolves to the field names the API complained about. */
  async createBrandWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create a brand without its required fields', async () => {
      const response = await this.apiActions.post(this.brands_serviceName, { data: {} });
      expectToBe('the create brand without fields response status', response.status(), 422);
      return Object.keys((await response.json()) as Record<string, string[]>);
    });
  }

  ///// Validations

  /** Deleting without an admin token is refused: 401 or 403. */
  async verifyDeleteRefused(brandId: number, status: number) {
    await allure.step(`Verify deleting the brand ${brandId} without a token is refused`, async () => {
      expectToBeOneOf(`the status of deleting the brand ${brandId} without a token`, status, [401, 403]);
    });
  }

  async verifyBrand(brand: BrandRecord, expectedId: number, expectedName: string) {
    await allure.step(`Verify the brand is stored as: ${expectedName}`, async () => {
      expectToEqual('the stored brand', { id: brand.id, name: brand.name, slug: brand.slug }, { id: expectedId, name: expectedName, slug: slugOf(expectedName) });
    });
  }

  async verifyRequiredFieldsReported(reportedFields: string[], requiredFields: string[]) {
    await allure.step(`Verify the missing required brand fields are reported: ${requiredFields.join(', ')}`, async () => {
      expectToContainAll('the brand fields the API reported', reportedFields, requiredFields);
    });
  }
}
