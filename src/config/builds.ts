/**
 * The build of the application each environment runs. Environments that run the same build
 * share every difference recorded in docs/app-versions.md, so page and service classes select
 * per build with `byBuild()` (src/utils/AppEnvironment.ts) instead of repeating a value for each
 * environment. An environment missing here is a mistake: `byBuild()` throws for it.
 *
 *   withBugs  the build with the deliberate defects (docs/known-defects.md)
 *   fixed     the newer build without them: path routes, string ids, a structured address,
 *             cart-based orders (docs/app-versions.md lists each difference)
 */
export const environmentBuilds: Readonly<Record<string, string>> = {
  local: 'withBugs',
  'hosted-with-bugs': 'withBugs',
  'local-fixed': 'fixed',
  hosted: 'fixed',
};
