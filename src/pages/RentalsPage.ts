import { type Page, type Locator } from '@playwright/test';
import { step } from 'allure-js-commons';
import { applications } from '../config/applications';
import { expectNotToHaveCount, expectTextsToContainAll, expectToHaveMatchingCount, expectToHaveText, expectToHaveURL } from '../utils/Expects';

/** Rental products (`#/rentals`). Its cards have no test id for their parts, only for the card itself. */
export class RentalsPage {
  readonly page: Page;
  readonly url: string = `${applications.app.url}/#/rentals`;

  // Locators
  private readonly pageTitle_txt: Locator;
  private readonly rentalCards_list: Locator;
  private readonly rentalNames_list: Locator;
  private readonly rentalDescriptions_list: Locator;
  private readonly visibleRentalImages_list: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle_txt = page.getByTestId('page-title');
    this.rentalCards_list = page.getByTestId(/^product-\d+$/);
    this.rentalNames_list = this.rentalCards_list.locator('.card-title');
    this.rentalDescriptions_list = this.rentalCards_list.locator('.card-text');
    this.visibleRentalImages_list = this.rentalCards_list.locator('img').locator('visible=true');
  }

  /** The rental card whose name is exactly `rentalName`. */
  private rentalCard_link(rentalName: string): Locator {
    return this.rentalCards_list.filter({ has: this.page.locator('.card-title').and(this.page.getByText(rentalName, { exact: true })) });
  }

  ///// Actions

  async navigate() {
    await step('Navigate to the Rentals Page', async () => {
      await this.page.goto(this.url);
    });
  }

  async clickRental(rentalName: string) {
    await step(`Click the rental card: ${rentalName}`, async () => {
      await this.rentalCard_link(rentalName).click();
    });
  }

  ///// Validations

  async verifyPageOpened(expectedTitle: string) {
    await step(`Verify the rentals page opened: ${expectedTitle}`, async () => {
      await expectToHaveURL(this.page, /\/#\/rentals$/);
      await expectToHaveText('the page title', this.pageTitle_txt, expectedTitle);
    });
  }

  async verifyRentalsListed(expectedNames: string[]) {
    await step(`Verify the page lists the rental products: ${expectedNames.join(', ')}`, async () => {
      await expectTextsToContainAll('the rental names shown', this.rentalNames_list, expectedNames);
    });
  }

  /** Every card has its own image, name and description: each set is compared with the cards, which must not be empty. */
  async verifyEveryRentalShowsImageNameAndDescription() {
    await step('Verify every rental shows an image, a name and a description', async () => {
      await expectNotToHaveCount('the rental cards', this.rentalCards_list, 0, 'card');
      await expectToHaveMatchingCount('the visible rental images', this.visibleRentalImages_list, this.rentalCards_list, 'image');
      await expectToHaveMatchingCount('the rental names', this.rentalNames_list.filter({ hasText: /\S/ }), this.rentalCards_list, 'name');
      await expectToHaveMatchingCount('the rental descriptions', this.rentalDescriptions_list.filter({ hasText: /\S/ }), this.rentalCards_list, 'description');
    });
  }
}
