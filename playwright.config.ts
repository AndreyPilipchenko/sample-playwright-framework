import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { allureConfig, allureEnvironmentInfo } from './src/config/reporting';
import { TEST_DEFAULT_MS, EXPECT_DEFAULT_MS, ACTION_DEFAULT_MS, NAVIGATION_DEFAULT_MS } from './src/config/timeouts';
/**
 * Read environment variables (secrets like DB credentials) from the gitignored
 * .env at the repo root — copy .env.example to .env and fill in the values.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Default testMatch already recurses into subfolders — the spec layout
   * (tests/api/<category>/ and tests/ui/<category>/<Feature>Tests.spec.ts) needs no extra config. */
  /* Budgets and their measurements live in src/config/timeouts.ts. The test budget stays
   * above the assertion budget, so a failing assertion reports its own message. */
  timeout: TEST_DEFAULT_MS,
  /* An inline { timeout } on an assertion means this spot deviates deliberately
   * (slow surfaces above it via SLOW_SURFACE_MS; utils retry-ladder budgets below it). */
  expect: { timeout: EXPECT_DEFAULT_MS },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only. One retry still shows a flaky test; more would only repeat tests that fail on
   * an open defect every time (docs/test-plan.md 4.1), at up to a minute per attempt. */
  retries: process.env.CI ? 1 : 0,
  /* Every active CI job tests its own private Docker stack, so CI uses the same number as a local run.
   * A manual run against another deployment uses 2 (.github/actions/run-specs). */
  workers: 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    /* On GitHub Actions, failures also show as inline annotations on the PR diff. */
    ...(process.env.GITHUB_ACTIONS ? [['github'] as const] : []),
    // Finish Allure before the HTML viewer's onExit can keep an interactive run open.
    // Paths and environmentInfo are shared with setup and the post-flush report job.
    ['./src/utils/AllureReport.ts', {
      resultsDir: allureConfig.resultsDir,
      environmentInfo: allureEnvironmentInfo,
      // No link templates yet: specs identify cases with `allure.testCaseId` (docs/test-cases.md IDs),
      // which Allure does not turn into links, and no spec uses `allure.issue` or `allure.tms`.
      // When defects are filed in a tracker, add literal `links.issue` / `links.tms` templates
      // here (harness-setup); the conventions check warns if a spec uses one without its template.
    }],
    // Allure is the report that opens after a local run; the HTML report stays on disk
    // (`npx playwright show-report reports/playwright-report`) and is a CI artifact.
    ['html', { open: 'never', outputFolder: 'reports/playwright-report' }],
    ['json', { outputFile: 'reports/json-report/test-results.json' }],
    // Machine-readable outcomes for CI test-result ingestion. GitHub has no built-in
    // Tests tab; a checks action (e.g. dorny/test-reporter) can consume this file.
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['playwright-ctrf-json-reporter', {}]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* No baseURL — every page navigates to an absolute URL from src/config (e.g. LoginPage's `${applications.app.url}/#/auth/login`). */
    ignoreHTTPSErrors: true,
    /* The app tags its controls with `data-test`, so page classes locate them with page.getByTestId('nav-home'). */
    testIdAttribute: 'data-test',
    /* A hung click/fill/waitFor fails as itself after 30s, never as an opaque "test timed out". */
    actionTimeout: ACTION_DEFAULT_MS,
    /* A page that does not load fails as a navigation error, well before the test budget. */
    navigationTimeout: NAVIGATION_DEFAULT_MS,
    /* Native traces, screenshots, videos and report details may contain credentials; restrict artifact access and retention. */
    /* Every failure keeps a trace. On CI that is the first attempt's, because many specs set `retries: 0`
     * and a policy that records only on a retry would leave their failures without one. */
    trace: process.env.CI ? 'retain-on-first-failure' : 'retain-on-failure',
    headless: true,
    // viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  globalSetup: require.resolve('./global-setup.ts'),

  /* Configure projects for major browsers */
  projects: [
    /* Signs each role in once per run and saves its session (setup/auth.setup.ts);
     * specs opt in with `test.use({ role: 'customer' })` from src/fixtures/test.ts. */
    {
      name: 'setup',
      testDir: './setup',
      testMatch: /.*\.setup\.ts/,
      retries: 0, // an account locks after ONE failed login (known defect #21) — never retry
      /* No trace: it would record the admin password typed by a failed login. */
      use: { ...devices['Desktop Chrome'], trace: 'off' },
    },
    /* Browserless API specs (tests/api): no UI, no signed-in sessions, so no setup dependency.
     * Run alone with `npx playwright test --project=api` (the separate CI job does). */
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },

    /* Cross-browser coverage is limited to the critical-path `@smoke` subset; the full
     * functional suite runs on chromium only. */
    {
      name: 'firefox',
      testDir: './tests/ui',
      dependencies: ['setup'],
      grep: /@smoke/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1920, height: 1080 } },
    },

    {
      name: 'webkit',
      testDir: './tests/ui',
      dependencies: ['setup'],
      grep: /@smoke/,
      use: { ...devices['Desktop Safari'], viewport: { width: 1920, height: 1080 } },
    },
  ],

});
