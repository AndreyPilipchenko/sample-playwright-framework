# Harness change request: mask credentials in native report output

**Package:** playwright-pom-harness 4.3.2 · **Raised:** 2026-11-05 · **Status:** open

## Problem

Native Playwright detail puts credentials typed into the UI into the reports, on passing runs
as well as failing ones:

| Where | What | When |
|---|---|---|
| HTML report and Allure step titles | `Fill "<password>"`, `Fill "<email>"` | Every run that signs in |
| `error-context.md` (HTML report attachment) | The page snapshot lists the password field's value | A test that fails with a filled form still on the page |
| Traces | The typed value and the login request body | Every failed test's trace (on CI: its first attempt) |

Seen on 2026-11-05 in this repository's CI artifacts (smoke runs 42029953335 and 42031934295).
Playwright 1.63 renders the value into the title of every input call (`fill`, `type`,
`pressSequentially`, `keyboard.insertText`, `press`) and offers no option to mask it.

## What the harness allows today

Utility playbook practice 20 lists these artifacts as credential-bearing and forbids the
consumer-side fixes: no patching or listening to private Playwright instrumentation, no
rewriting reporter objects, no credential-value registries. It asks consumers to restrict
access and retention and to prefer disposable credentials, which is what this project does
(below). It can't remove the credentials from the reports themselves.

## What this project does meanwhile

- The customer role uses a disposable account the setup registers through the API each run.
- The admin can't be created through the API, so it stays a shared account (GitHub secrets).
- This repository is public, so the CI jobs that sign in don't upload the Playwright HTML
  report (failure pages, traces) unless the repository variable `PUBLISH_REPORTS` is `true`.
  The Allure report is always uploaded. `src/utils/AllureReport.ts` masks the value typed
  into a field whose locator looks secret (`REDACTED_FIELD_LOCATOR`), so its step titles show
  `Fill "***"` for passwords; emails stay visible, and a failure's page snapshot attachment can
  still show a filled password field. A failed test's trace is embedded in it too, so the two places
  that type the admin password record no trace: the `setup` project and `tests/LoginTests.spec.ts`. Traces of
  tests signed in as the admin can still show that session's token. The run's Summary page
  (`scripts/ci-summary.mjs`) shows the results as well.

## Requested

A supported, framework-wide way to keep known secrets out of native report output. For
example, a maintained post-run step that masks the values of declared secret variables in the
HTML report (including its embedded data and trace archives) and in the Allure results before
Allure generates its report, with the declared variable names configured in one place.
