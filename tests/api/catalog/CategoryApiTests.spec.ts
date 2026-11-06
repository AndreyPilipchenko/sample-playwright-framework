import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApisCategories } from '../../../src/apis/ApisCategories';
import { ApisProductCatalog } from '../../../src/apis/ApisProductCatalog';
import { loadTestData } from '../../../src/utils/TestData';
import { newUuid } from '../../../src/utils/UniqueData';

let apisCategories: ApisCategories;
let apisProductCatalog: ApisProductCatalog;

let testData: typeof import('../../../resources/testData/CategoryApiTestJsonFile.json');

/** Category calls: records carry a per-run UUID and are left behind on purpose (deleting needs an admin token). */
test.describe('Category API', () => {

  test('A created category is stored as a top-level category', { tag: ['@regression'] }, async () => {
    await allure.feature('Category API');
    await allure.testCaseId('category-api-1');

    const catalog = await apisProductCatalog.seedCatalog(newUuid(), testData.categoryApi1);
    const category = await apisCategories.getCategory(catalog.categoryId);
    await apisCategories.verifyTopLevelCategory(category, catalog.categoryId, catalog.categoryName);
  });

  test('Created products are listed in their category and found by search', { tag: ['@regression'] }, async () => {
    await allure.feature('Category API');
    await allure.testCaseId('category-api-2');

    const uuid = newUuid();
    const catalog = await apisProductCatalog.seedCatalog(uuid, testData.categoryApi2);
    await apisProductCatalog.verifyProductsListedAndSearchable(catalog, uuid);
  });

  test('A category without its required fields is rejected', { tag: ['@regression'] }, async () => {
    await allure.feature('Category API');
    await allure.testCaseId('category-api-3');

    const reportedFields = await apisCategories.createCategoryWithoutRequiredFields();
    await apisCategories.verifyRequiredFieldsReported(reportedFields, testData.categoryApi3.requiredFields);
  });

  test.beforeAll(async () => {
    testData = loadTestData('CategoryApiTestJsonFile.json');
  });

  test.beforeEach(({ request }) => {
    apisCategories = new ApisCategories(request);
    apisProductCatalog = new ApisProductCatalog(request);
  });

});
