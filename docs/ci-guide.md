# CI guide

The details behind the [CI section of the README](../README.md#ci): how to start a run by hand, what the
jobs do, and the steps the workflows share.

## Starting a run by hand

All three test workflows can be started by hand (Actions → Run workflow, or `gh workflow run <file>`).
Each has its own queue: smoke runs queue behind each other, and a burst of product commits tests only the
newest one; a product commit never cancels a waiting nightly or hosted run.

| Workflow | Tests | Manual inputs besides the filters |
|---|---|---|
| `nightly.yml` | `local` and `local-fixed`, each in a private Docker stack on its runner | `environment`: `both` (the default), `local` or `local-fixed` |
| `smoke-on-commit.yml` | `@smoke` on chromium, in a private Docker stack | `environment`: `local` (the default) or `local-fixed` |
| `hosted.yml` | One public site: the API specs and one browser's UI specs, `@smoke` and `@regression` | `site`: `hosted-with-bugs` (the default) or `hosted`; `browser`: `chromium` (the default), `firefox` or `webkit` |

The two local versions are described in [App versions](app-versions.md). A run on a public site
(`hosted.yml`) starts no stack, leaves out the `@local` tests (they need the stack's database or mail
inbox), uses 2 workers, uploads no traces (they could hold a live token), and saves no results for the
next comparison. The repository's admin login, the published demo account, is sent to that site.

Every workflow takes the same optional filters:

| Input | Effect |
|---|---|
| `tag` | Only tests with any of these tags, comma-separated (`@smoke, @regression`) |
| `name` | Only tests whose title contains this text, case-insensitive |
| `path` | Only these spec files or folders, space-separated, `:line` allowed (`tests/ui/accounts/LoginTests.spec.ts:38`) |

The filters narrow each job's own selection (smoke-on-commit never leaves `@smoke`); a job
left with nothing to run passes, and its summary says no tests matched. Every job writes its
results (counts, failed tests with the assertion, skipped tests with the reason) to the run's
Summary page. Failures are split into newly failing, fixed and still failing by comparing with
that job's previous unfiltered run on the same environment, whose results stay in the Actions cache; a
filtered run compares but does not replace them.

```sh
gh workflow run nightly.yml -f environment=local-fixed -f tag=@regression -f path=tests/ui/checkout/CartTests.spec.ts
gh workflow run smoke-on-commit.yml -f name="admin credentials" --ref <branch>
gh workflow run hosted.yml -f site=hosted -f tag=@smoke
```

## Nightly jobs

The `tests` job is a matrix: one job per suite and environment (`local` and `local-fixed`). They start
together, and each tests its own private Docker instance on its runner:

| Suite | What it does |
|---|---|
| `api` | The browserless API specs (`tests/api`): `@regression` and `@local` |
| `smoke-chromium`, `smoke-firefox`, `smoke-webkit` | The `@smoke` subset, one job per browser |
| `regression` | The `@regression` and `@local` specs on chromium |

`publish-site` runs after them and publishes the dashboard and the Allure reports of both environments to GitHub Pages (`<environment>/<suite>/`), unless the run was filtered, tested one environment only, or the secret check fails.

Artifacts carry the environment in their name: `allure-report-local-api`, `allure-report-local-fixed-api`,
`traces-local-fixed-regression`, and so on.

## Shared steps

The steps the workflows share are composite actions in `.github/actions/`:

| Action | What it does |
|---|---|
| `setup` | Node, `npm ci`, the requested Playwright browsers and their Ubuntu system packages (both cached, so a slow package mirror can't stall a job; chromium is always added, because the auth setup runs on it) |
| `static-checks` | For `lint.yml`: conventions check, core boundary check, script tests, typecheck and lint |
| `start-local-app` | Brings the Docker stack up on the runner, with the arm64 emulation its images need |
| `publish-app-logs` | Uploads the stack's container logs; call it with `if: failure()` |
| `run-specs` | Runs Playwright headless (`node scripts/app.mjs test` with the job's `args`), publishes the HTML and Allure reports and failed tests' traces as `*-<report-name>` artifacts whatever the outcome, then fails if the specs failed. `shared-site: true` (hosted.yml) means 2 workers, no traces and no saved comparison results |

## Runners, secrets and reports

- **Runners:** `ubuntu-latest` has Docker and compose preinstalled; `start-local-app` adds the arm64 emulation the
  shop's images need. The local jobs use 3 workers (`playwright.config.ts`), since each tests its own private stack;
  `hosted.yml` uses 2.
- **Secrets:** `APP_ADMIN_USERNAME` and `APP_ADMIN_PASSWORD` (the shared demo admin,
  [test plan §1.2](test-plan.md)) are mapped onto the spec-running steps only. The customer needs no secret: the
  setup registers a disposable one every run. With an empty admin secret the admin specs fail with "No saved
  session". Mind defect #21: one failed login locks the account, so check a value before saving it. `hosted.yml`
  sends the admin login to the chosen public site, which publishes the same demo login. The nightly `regression`
  and `api` jobs also read `APP_DB_LOCAL`: the disabled-account cases disable their account in the local MariaDB.
- **Reports:** native report detail (Playwright step titles, failure pages, traces) can contain the admin
  credentials. They are the published demo account, so the Allure report and the traces of failed tests
  (`traces-*`, kept 7 days) are always attached. This repository is public, so the jobs that sign in attach the
  Playwright HTML report only when the repository variable `PUBLISH_REPORTS` is `'true'`. `publish-site` checks
  the Allure reports for secrets before putting them on a public page.
- **Public sites:** they answer an occasional 500 under load; a rerun of the failed test tells a hiccup from a
  finding.

## Red runs

Tests of broken functionality assert the documented behaviour, so they fail, and the run
is red, until the product fixes them (see [test plan §4.1](test-plan.md)). All jobs run
headless and publish HTML and Allure reports as artifacts (named per job and browser;
the Docker jobs also upload container logs when they do not pass).
