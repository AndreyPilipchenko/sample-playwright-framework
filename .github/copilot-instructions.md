# Review guidance for this repository

This is a Playwright + TypeScript test framework (page object model) for the Practice
Software Testing "Toolshop" app. It is the test project, not the product: its own pull
requests run no tests. When reviewing, flag these in particular:

## Test policy (docs/test-plan.md §4.1)
- Every test asserts the documented behaviour. A test of broken functionality fails and stays
  red until the product is fixed. Flag any `test.fail`, `test.fixme`, `test.skip` used to hide
  a defect, a weakened assertion, or a workaround that turns a defect test green. `test.skip`
  is allowed only for an environment condition (e.g. credentials not set).
- Tests must never read `docs/known-defects.md` at run time.
- No tag, branch or flag that separates defect tests from the rest.

## Layers (src/)
- `tests/` specs call business methods only: no locators, no raw `page`/`request` calls, no
  loops or conditionals in test bodies.
- `src/pages/` page classes hold locators and business-named actions wrapped in Allure steps;
  checks are `verify*` methods in a `///// Validations` section.
- `src/apis/` and `src/dbs/` service classes go through the `ApiActions` / `DBActions`
  facades in `src/utils/`, never the raw driver.
- Technical complexity (retries, try/catch, parsing) belongs in `src/utils/` only.

## Data and secrets
- Test inputs live in `resources/testData/<Spec>JsonFile.json`, read root-relative
  (`./resources/testData/...`); unique values come from `src/utils/UniqueData.ts`.
- Credentials come only from environment variables (`.env`, GitHub secrets). Flag any literal
  credential in code, and any credential, email or token interpolated into a step title, log
  or attachment.
- Prefer disposable accounts registered through the API over shared ones. This target locks
  an account after one failed login, so login flows are never retried.

## CI (.github/)
- No `push` or `pull_request` triggers on the test workflows: smoke runs on the product
  repository's dispatch, the full suite nightly, both by hand.
- Shared steps live in composite actions in `.github/actions/`. Workflow inputs reach scripts
  through `env`, never spliced into `run:` text.
- This repository is public: jobs that sign in with shared credentials must not publish the
  Playwright HTML report (failure pages, traces) unless `PUBLISH_REPORTS` is enabled. The
  Allure report is always published.
