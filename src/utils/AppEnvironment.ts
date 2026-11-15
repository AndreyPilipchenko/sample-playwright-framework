import { environmentName } from '../config/targets';
import { environmentBuilds } from '../config/builds';

/** Every build name src/config/builds.ts assigns to an environment. */
const buildNames = [...new Set(Object.values(environmentBuilds))];

/**
 * Picks the value for the build this run's environment (TEST_ENV, else the project's default in
 * .harness/project.json) runs, as mapped in src/config/builds.ts. A page or service class uses it
 * where a locator, field, endpoint or payload differs between builds:
 *
 *   readonly zip = byBuild({ fixed: page.getByTestId('postal_code'), default: page.getByTestId('postcode') });
 *
 * Keys are build names; `default` covers every build not listed. A key that names no build throws, so a
 * typo can't fall back to `default` unnoticed, and so does an environment the build map leaves out. Only
 * use it for a difference recorded in docs/app-versions.md, never to make a known defect pass.
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
