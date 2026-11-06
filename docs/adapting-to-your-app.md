# Adapting the framework to your app

The framework is split into a reusable core and the Toolshop tests. This guide lists what to change to test another
app. **It hasn't been tried on another app yet**, so expect to find gaps.

| Part | Folders | What to do |
|---|---|---|
| Core | `src/utils`, `src/fixtures` | Keep it, apart from the items in steps 2 and 3 |
| Settings | `src/config`, `.harness/targets.json`, `.harness/project.json`, `.env` | Change the values |
| Toolshop | `src/pages`, `src/apis`, `src/dbs`, `src/helpers`, `tests`, `setup`, `resources/testData` | Replace |

The folders stay where they are, because `check-conventions` from the harness expects these paths.
`scripts/check-core-boundary.mjs` runs on every pull request. It fails when core names the app or imports a Toolshop
layer, or when two tests share a case ID.

## 1. Point it at your app

| Setting | File |
|---|---|
| App, API and database addresses | `.harness/targets.json`, with the environments in `.harness/project.json` |
| Named apps and pre-existing accounts | `src/config/applications.ts`, with the secrets in `.env` (see `.env.example`) |
| Databases | `src/config/databases.ts` |
| Test ID attribute (`data-test` here) | `testIdAttribute` in `playwright.config.ts` |

## 2. Set up sign-in

- List your roles in `src/config/auth.ts`.
- Write `setup/auth.setup.ts` for your login. It signs each role in once and saves the session.
- `src/utils/AuthSession.ts` saves and restores sessionStorage. If your app keeps its session in cookies or
  localStorage, use Playwright's `storageState` instead and change the `role` fixture in `src/fixtures/test.ts`.
- Toolshop locks an account after one failed login, so the `setup` project has `retries: 0`. Keep that if your app
  does the same.

## 3. Change the app-specific behaviour

| Behaviour | File | What to do |
|---|---|---|
| Toast selector and fade timings | `src/config/browserDiagnostics.ts` | Set your selector, or if your app has no toasts, default `waitForToasts` to `false` in `src/fixtures/test.ts` |
| Browser position session keys | `src/config/geolocation.ts` | Set your keys, or if your app doesn't use them, delete this file and `src/utils/BrowserGeolocation.ts` |
| Timeouts | `src/config/timeouts.ts` | Set your own, but change `EXPECT_DEFAULT_MS` only with the harness linter, which hardcodes it. Remove `PASSWORD_CHANGE_ANSWER_MS`, which is specific to Toolshop |
| Validation errors: a 422 whose body is keyed by field | `postEmptyAndGetReportedFields` in `src/utils/ApiChecks.ts` | Change it to match your API |

## 4. Replace the Toolshop tests

Replace the page classes, API and database services, helpers, specs and test data. To see the shape to follow, use
`src/pages/LoginPage.ts` and `tests/ui/accounts/LoginTests.spec.ts`. Give each test its own case ID.

## 5. Update CI and documents

| Item | File |
|---|---|
| Local app stack | `scripts/app.mjs`, `.github/actions/start-local-app` |
| Jobs, secrets and the product repository's trigger | `.github/workflows/nightly.yml`, `.github/workflows/smoke-on-commit.yml` |
| Report names on the live site | `REPORT_NAMES` in `scripts/build-site.mjs` |
| Reasons on the dashboard | `docs/test-cases.md`, `docs/known-defects.md` and `docs/bug-reports/README.md`, which `scripts/quality-dashboard.mjs` needs, and the Toolshop sentence on its page |
| App words that core must not name | `APP_TERMS` in `scripts/check-core-boundary.mjs`, and the matching cases in `scripts/tests/` |
| Toolshop documents and their license notice | `docs/`, `NOTICE.md` |
| The gitignored local copy of the app, and the agent instructions | `.app/`, `.github/copilot-instructions.md` |
