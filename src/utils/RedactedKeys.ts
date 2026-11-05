/**
 * Credential names every reporting facade masks with `***` before a payload reaches a
 * step attachment or the console — the single list ApiActions, DBActions and
 * MySqlActions share, so a new secret name is added once and the facades cannot drift.
 * Matching is case-insensitive: callers compare `name.toLowerCase()`.
 *
 * Each facade keeps its own redaction mechanics (utility-classes practice 13); only the
 * deny-lists live here. Key-based masking cannot see inside an opaque string — see
 * ApiActionsOptions.redactResponseBody for endpoints whose whole body is a secret.
 */

/** HTTP header names whose values are masked in request/response logs. */
export const REDACTED_HEADERS: ReadonlySet<string> = new Set([
  'authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'api-key', 'x-auth-token',
]);

/**
 * Locator text that marks a secret form field (e.g. `getByTestId('password')`). AllureReport
 * masks the value Playwright prints in the title of an input step on such a field
 * (`Fill "<value>"` → `Fill "***"`). Allure step titles only: the HTML report, traces and
 * failure-page snapshots keep the raw value (utility-classes practice 20).
 */
export const REDACTED_FIELD_LOCATOR = /password|passwd|passcode|secret|token|api[-_]?key/i;

/** Object keys (API bodies, DB params and row columns) whose values are masked, at any nesting depth. */
export const REDACTED_KEYS: ReadonlySet<string> = new Set([
  'password', 'token', 'access_token', 'refresh_token', 'client_secret', 'secret', 'apikey', 'api_key',
]);
