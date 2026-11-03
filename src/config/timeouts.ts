/**
 * The suite's timing tiers — single source (same single-source pattern as reporting.ts,
 * utility-classes practice 17). `playwright.config.ts` imports the four defaults; page
 * classes import the slow-surface tier. The conventions linter hardcodes
 * EXPECT_DEFAULT_MS (check-conventions.mjs, harness package — a .mjs script cannot import
 * TS), so that value must not change here on its own.
 *
 * Measured against the Toolshop target (2026-11-03): a cold home-page load takes ~0.5s,
 * a warm one ~50ms, the first product card renders within ~0.6s, and the smoke test runs
 * in ~1s. The budgets below are failure ceilings with wide margin for a busy shared
 * instance or a cold local stack — not expected durations.
 *
 *  1. Defaults (consumed by playwright.config.ts) — govern every call with NO inline timeout.
 *  2. SLOW_SURFACE_MS — for a wait that measurably exceeds the assertion default. The
 *     linter requires a named tier for any inline timeout above EXPECT_DEFAULT_MS, so a
 *     slow surface uses this instead of a numeric literal. Nothing needs it yet.
 * Utils retry-ladder budgets (below the defaults) are mechanism, not tier — they stay
 * inline where the ladder lives.
 */

/** Whole-test budget (config `timeout`) — kept well above EXPECT_DEFAULT_MS, so a failing assertion reports its own message instead of an opaque "test timeout". Raise per test with `test.setTimeout` for a genuinely long journey. */
export const TEST_DEFAULT_MS = 60_000;
/** Assertion budget (expect.timeout) — lockstep with the conventions linter; see above. */
export const EXPECT_DEFAULT_MS = 30_000;
/** Action budget (use.actionTimeout) — a hung click/fill/waitFor fails as itself. */
export const ACTION_DEFAULT_MS = 30_000;
/** Navigation budget (use.navigationTimeout) — ~60x the measured cold page load. */
export const NAVIGATION_DEFAULT_MS = 30_000;
/** The slow-surface tier — inline on waits that measurably exceed the assertion default. */
export const SLOW_SURFACE_MS = 60_000;
