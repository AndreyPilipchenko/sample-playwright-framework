import { type Locator, type Page } from '@playwright/test';
import { byBuild } from '../utils/AppEnvironment';
import { expectToHaveValue } from '../utils/Expects';

/** The address values a customer's profile and an invoice both show. */
export interface AddressValues {
  address: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
}

/**
 * The five address inputs, as registration, the profile, checkout, an invoice and an admin order all name them. The
 * fixed build names the address and postcode fields street and postal_code (docs/app-versions.md, B3); city, state and
 * country keep their test ids on both builds. A page takes the fields it shows.
 */
export function addressFieldLocators(page: Page): Record<keyof AddressValues, Locator> {
  return {
    address: page.getByTestId(byBuild({ fixed: 'street', default: 'address' })),
    postcode: page.getByTestId(byBuild({ fixed: 'postal_code', default: 'postcode' })),
    city: page.getByTestId('city'),
    state: page.getByTestId('state'),
    country: page.getByTestId('country'),
  };
}

/** Checks each address input shows its value. The caller wraps this in its own step. */
export async function expectAddressFieldsToShow(fields: Record<keyof AddressValues, Locator>, expected: AddressValues): Promise<void> {
  await expectToHaveValue('the Address field', fields.address, expected.address);
  await expectToHaveValue('the Postcode field', fields.postcode, expected.postcode);
  await expectToHaveValue('the City field', fields.city, expected.city);
  await expectToHaveValue('the State field', fields.state, expected.state);
  await expectToHaveValue('the Country field', fields.country, expected.country);
}
