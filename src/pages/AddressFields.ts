import { type Locator } from '@playwright/test';
import { expectToHaveValue } from '../utils/Expects';

/** The address values a customer's profile and an invoice both show. */
export interface AddressValues {
  address: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
}

/** Checks each address input shows its value. The caller wraps this in its own step. */
export async function expectAddressFieldsToShow(fields: Record<keyof AddressValues, Locator>, expected: AddressValues): Promise<void> {
  await expectToHaveValue('the Address field', fields.address, expected.address);
  await expectToHaveValue('the Postcode field', fields.postcode, expected.postcode);
  await expectToHaveValue('the City field', fields.city, expected.city);
  await expectToHaveValue('the State field', fields.state, expected.state);
  await expectToHaveValue('the Country field', fields.country, expected.country);
}
