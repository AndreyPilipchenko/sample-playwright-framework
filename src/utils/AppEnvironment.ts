import { environmentName, environmentNames } from '../config/targets';
import { environmentBuilds } from '../config/builds';

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

/** Every build name src/config/builds.ts assigns to an environment. */
const buildNames = [...new Set(Object.values(environmentBuilds))];

/**
 * Like `byEnvironment()`, keyed by the build the environment runs (src/config/builds.ts), for a
 * difference every environment of that build shares:
 *
 *   readonly zip = byBuild({ fixed: page.getByTestId('postal_code'), default: page.getByTestId('postcode') });
 *
 * A key that names no build throws, and so does an environment the build map leaves out. The same
 * rule applies: only for a difference recorded in docs/app-versions.md, never to make a defect pass.
 */
export function byBuild<T>(values: { default: T } & Partial<Record<string, T>>): T {
  const unknown = Object.keys(values).filter((key) => key !== 'default' && !buildNames.includes(key));
  if (unknown.length) {
    throw new Error(`byBuild: ${unknown.join(', ')} is not a build in src/config/builds.ts (known: ${buildNames.join(', ')}).`);
  }
  const build = environmentBuilds[environmentName];
  if (!build) throw new Error(`byBuild: src/config/builds.ts names no build for the environment "${environmentName}".`);
  return values[build] ?? values.default;
}
