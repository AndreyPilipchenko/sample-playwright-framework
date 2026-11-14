import { environmentName, environmentNames } from '../config/targets';

/**
 * Picks the value for the environment this run targets (TEST_ENV, else the project's default
 * in .harness/project.json). Each environment runs its own build of the application, so a
 * page or service class uses this where a locator, field, endpoint or payload differs
 * between builds:
 *
 *   readonly zip = byEnvironment({ hosted: page.getByTestId('postal_code'), default: page.getByTestId('postcode') });
 *
 * Keys are environment names; `default` covers every environment not listed. A key that names no
 * environment throws, so a typo can't fall back to `default` unnoticed. Only use it for a recorded
 * difference between builds, never to make a known defect pass.
 */
export function byEnvironment<T>(values: { default: T } & Partial<Record<string, T>>): T {
  const unknown = Object.keys(values).filter((key) => key !== 'default' && !environmentNames.includes(key));
  if (unknown.length) {
    throw new Error(`byEnvironment: ${unknown.join(', ')} is not an environment in .harness/project.json (known: ${environmentNames.join(', ')}).`);
  }
  return values[environmentName] ?? values.default;
}

