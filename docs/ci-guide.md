# CI guide

The details behind the [CI section of the README](../README.md#ci): how to start a run by hand, what the nightly
jobs do, and the steps the workflows share.

## Starting a run by hand

Both can be started by hand (Actions → Run workflow, or `gh workflow run smoke-on-commit.yml`
/ `gh workflow run nightly.yml`). Smoke runs queue behind each other, and a burst of product
commits tests only the newest one; nightly runs have their own queue, so a product commit never
cancels a waiting nightly run.

A manual run takes optional inputs (all blank = the local stack and every test):

| Input | Effect |
|---|---|
| `app_url`, `api_url` | Test another deployment instead of the local stack: give both. The deployment needs the same demo accounts, and the repository's admin login is sent to it. The run starts no stack, uses 2 workers and uploads no traces, which could hold a live token. Tests that need the local mail inbox or database fail, and the results aren't published to the live site. |
| `tag` | Only tests with any of these tags, comma-separated (`@smoke, @regression`) |
| `name` | Only tests whose title contains this text, case-insensitive |
| `path` | Only these spec files or folders, space-separated, `:line` allowed (`tests/ui/accounts/LoginTests.spec.ts:38`) |

The filters narrow each job's own selection (smoke-on-commit never leaves `@smoke`); a job
left with nothing to run passes, and its summary says no tests matched. Every job writes its
results (counts, failed tests with the assertion, skipped tests with the reason) to the run's
Summary page. Failures are split into newly failing, fixed and still failing by comparing with
that step's previous unfiltered run, whose results stay in the Actions cache; a filtered run or
one against another URL compares but does not replace them.

```sh
gh workflow run nightly.yml -f tag=@regression -f path=tests/ui/checkout/CartTests.spec.ts
gh workflow run smoke-on-commit.yml -f name="admin credentials" --ref <branch>
```

## Nightly jobs

The nightly jobs start together, and each tests its own private Docker instance on its runner:

| Job | What it does |
|---|---|
| `api-local` | The browserless API specs (`tests/api`) |
| `smoke-local` | The `@smoke` subset on chromium, firefox and webkit, one job per browser |
| `regression-local` | Every other spec on chromium |
| `publish-site` | Runs after them: publishes the dashboard and Allure reports to GitHub Pages, unless the run was filtered or the secret check fails |

## Shared steps

The steps the workflows share are composite actions in `.github/actions/`:

| Action | What it does |
|---|---|
| `setup` | Node, `npm ci`, the requested Playwright browsers and their Ubuntu system packages (both cached, so a slow package mirror can't stall a job; chromium is always added, because the auth setup runs on it) |
| `static-checks` | For `lint.yml`: conventions check, core boundary check, script tests, typecheck and lint |
| `start-local-app` | Brings the Docker stack up on the runner, with the arm64 emulation its images need |
| `publish-app-logs` | Uploads the stack's container logs; call it with `if: failure()` |
| `run-specs` | Runs Playwright headless (`command` + `args`), publishes the HTML and Allure reports and failed tests' traces as `*-<report-name>` artifacts whatever the outcome, then fails if the specs failed |

## Red runs

Tests of broken functionality assert the documented behaviour, so they fail, and the run
is red, until the product fixes them (see [test plan §4.1](test-plan.md)). All jobs run
headless and publish HTML and Allure reports as artifacts (named per job and browser;
the local jobs also upload container logs when they do not pass).
