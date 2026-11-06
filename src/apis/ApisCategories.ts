import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { slugOf } from '../utils/UniqueData';
import { applications } from '../config/applications';
import { expectToBe, expectToContainAll, expectToEqual } from '../utils/Expects';
import { postEmptyAndGetReportedFields } from '../utils/ApiChecks';

/** A category as `GET /categories/{id}` returned it. */
export interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

export class ApisCategories {
  readonly apiActions: ApiActions;

  readonly categories_serviceName = `${applications.app.apiUrl}/categories`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  /** Top-level unless `parentId` is given. */
  async createCategory(name: string, parentId: number | null = null): Promise<number> {
    return await allure.step(`Create the category: ${name}`, async () => {
      const response = await this.apiActions.post(this.categories_serviceName, {
        data: { name, slug: slugOf(name), parent_id: parentId },
      });
      expectToBe('the create category response status', response.status(), 201);
      return ((await response.json()) as { id: number }).id;
    });
  }

  async getCategory(categoryId: number): Promise<CategoryRecord> {
    return await allure.step(`Get the category ${categoryId}`, async () => {
      const response = await this.apiActions.get(`${this.categories_serviceName}/${categoryId}`);
      expectToBe('the get category response status', response.status(), 200);
      return (await response.json()) as CategoryRecord;
    });
  }

  /** Creating a category without its required fields is refused; resolves to the field names the API complained about. */
  async createCategoryWithoutRequiredFields(): Promise<string[]> {
    return await allure.step('Create a category without its required fields', async () => {
      return await postEmptyAndGetReportedFields(this.apiActions, this.categories_serviceName, 'the create category without fields response status');
    });
  }

  ///// Validations

  async verifyTopLevelCategory(category: CategoryRecord, expectedId: number, expectedName: string) {
    await allure.step(`Verify the category is stored as a top-level category: ${expectedName}`, async () => {
      expectToEqual(
        'the stored category',
        { id: category.id, name: category.name, slug: category.slug, parent_id: category.parent_id },
        { id: expectedId, name: expectedName, slug: slugOf(expectedName), parent_id: null },
      );
    });
  }

  async verifyRequiredFieldsReported(reportedFields: string[], requiredFields: string[]) {
    await allure.step(`Verify the missing required category fields are reported: ${requiredFields.join(', ')}`, async () => {
      expectToContainAll('the category fields the API reported', reportedFields, requiredFields);
    });
  }
}
