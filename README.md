# sample-playwright-framework

A sample Playwright + TypeScript test automation framework, built for training and
interview practice. It follows Page Object Model conventions, with
Allure/HTML/JSON/JUnit reporting and a CI pipeline.

## Application under test

[`https://with-bugs.practicesoftwaretesting.com`](https://with-bugs.practicesoftwaretesting.com)
— the "with-bugs" variant of the public Practice Software Testing / Toolshop demo site,
configured here as the `app` browser target in the `practice` environment (mode `test`,
so runs may read and change data freely). It ships with intentional defects by design,
so don't be surprised when something looks broken — that's the point.

## Project structure

```
src/pages/    GUI business layer — page classes (locators + actions + validations)
src/apis/     API business layer (not used yet — created on first need)
src/dbs/      DB business layer (not used yet — created on first need)
src/utils/    Technical layer — ApiActions/DBActions facades, Allure/report plumbing
src/config/   Environment & target coordinates (reads .harness/targets.json / .env)
src/fixtures/ The suite's `test` with the `role` option (signed-in sessions)
tests/        Spec files — orchestrate business flows, carry Allure metadata only
setup/        Setup project — signs each role in once per run
resources/    testData/ (per-spec JSON files), Queries/ and apisCollections/ (team libraries)
.harness/     Harness-managed project config, targets and the vendored package
```

See `AGENTS.md` / `CLAUDE.md` for the AI-agent skill routing, and the harness's own
`node_modules/playwright-pom-harness/docs/` for the full conventions reference.

## Test documentation

[`docs/`](docs/README.md) holds the test documentation for the application under test,
compiled from the upstream Practice Software Testing docs:

- [Test plan](docs/test-plan.md) — scope, environment, approach, risks, and the
  treatment of tests for a deliberately broken target (a test of broken functionality fails
  until it is fixed)
- [Test cases](docs/test-cases.md) — test conditions per feature area, traced to
  upstream acceptance criteria

## Getting started

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
cp .env.example .env   # fill in any values a test needs (none required yet)
npm test                # runs the suite headless; opens the Allure report after
```

Allure (`reports/allure-report/index.html`) is the main report and opens after a local
run (`AUTO_ALLURE_OPEN=false` turns that off). The Playwright HTML report is still
written to `reports/playwright-report/`; open it with
`npx playwright show-report reports/playwright-report`.

Run Playwright from the repository root. Specs load their test data from
repo-root-relative paths (`./resources/testData/...`, the harness test-data
convention, which `check-conventions` verifies), so launching from a subfolder with
`-c` fails with `ENOENT`. npm scripts, CI and the VS Code extension already run from the root.

Check harness readiness any time with `npx --no pom-harness check`, and enforce POM
conventions with `npx --no pom-harness check-conventions`.

## Signed-in tests

The `setup` project (`setup/auth.setup.ts`) signs each role in once per run and saves
its session to the gitignored `playwright/.auth/`. The app keeps its token in
sessionStorage, which Playwright's `storageState` does not capture, so specs opt in through
the `role` fixture instead:

```ts
import { test } from '../src/fixtures/test';

test.use({ role: 'customer' }); // or 'admin'
```

Credentials come from `.env` (`APP_CUSTOMER_*`, `APP_ADMIN_*`, see `.env.example`); an unset
role is skipped. The setup never retries, because this target locks an account after **one**
failed login (known defect #21). On CI the same four variables come from the repository's
GitHub Actions secrets, mapped onto the spec-running steps of both workflows.

## Running the app locally

By default the suite runs against the shared public instance. You can instead run the
application under test on your own machine in Docker — useful for a clean, freshly
seeded dataset, for offline work, and for avoiding interference from other users of
the public instance.

Requires Docker and free ports `4200`, `8091`, `3306`.


```sh
npm run app:up        # start and seed the stack (first run pulls ~1.5 GB of images)
npm run test:local    # run the suite against http://localhost:4200
npm run app:status    # readiness and container state
npm run app:logs      # container logs
npm run app:down      # stop it (add -- --volumes to drop the data too)
```

`scripts/app.mjs` backs these — it downloads the upstream project's
`docker-compose.prod.yml` into a gitignored `.app/` directory and runs the prebuilt
images, so no application source is cloned. Useful options:

```sh
node scripts/app.mjs up --variant sprint5 --timeout 900   # a different upstream build
node scripts/app.mjs test -- --headed --project=chromium  # pass args through to Playwright
```

The local instance is a harness environment, `local`, defined in
`.harness/project.json`. Its browser and API targets are `app-local` in
`.harness/targets.json`. `TEST_ENV` selects the environment, and
`src/config/targets.ts` resolves every address from it; without `TEST_ENV` the
default environment, `practice` (the public instance), is used. Any Playwright
invocation honours it:

```sh
TEST_ENV=local npx playwright test
```

To point a single run at another address without adding an environment, override it
per name: `APP_URL` for the UI, `APP_API_URL` for the API.

The stack starts the UI on `4200`, the REST API on `8091` (Swagger at
`:8091/api/documentation`) and MariaDB on `3306`. Note that the upstream `web` (nginx)
and `cron` images are published for **linux/arm64 only** — Docker Desktop emulates
them transparently, but a bare amd64 Linux host needs binfmt handlers registered
(`docker run --privileged --rm tonistiigi/binfmt --install arm64`), which is what the
CI job's QEMU step does.

## CI

Two workflows run the tests. This repository is the test project, not the product, so
**commits and pull requests here run nothing**.

| Workflow | Runs | When |
|---|---|---|
| `smoke-on-commit.yml` | `@smoke` tests on chromium, firefox and webkit | Every commit to the product repository's `main`: its workflow sends a `repository_dispatch` of type `product-main-push`; the run is titled with the product commit (`Smoke: <repo>@<sha>`) |
| `nightly.yml` | all tests, in stages | 02:00 UTC every night (GitHub runs schedules on the default branch only) |

Both can be started by hand (Actions → Run workflow, or `gh workflow run smoke-on-commit.yml`
/ `gh workflow run nightly.yml`). Smoke runs queue behind each other, and a burst of product
commits tests only the newest one; nightly runs have their own queue, so a product commit never
cancels a waiting nightly run.

The nightly stages; each starts only when the one before it passed:

| Stage | Job | What it does |
|---|---|---|
| 1 | `api-tests` | Conventions check, typecheck and lint, then the browserless API specs (`tests/api`) |
| 2 | `smoke` | The `@smoke` subset on chromium, firefox and webkit (one job per browser) |
| 3 | `regression` | Every other spec on chromium, in 2 parallel shards |
| - | `regression-local` | Brings the application up on the runner with Docker, seeds it, and runs the whole suite against that private instance; independent of the stages, gates nothing |

The steps both workflows share are composite actions in `.github/actions/`:

| Action | What it does |
|---|---|
| `setup` | Node, `npm ci`, and the requested Playwright browsers (cached; chromium is always added, because the auth setup runs on it) |
| `static-checks` | Conventions check, typecheck and lint |
| `run-specs` | Runs Playwright headless (`command` + `args`), publishes the HTML and Allure reports as `*-<report-name>` artifacts whatever the outcome, then fails if the specs failed |

Tests of broken functionality assert the documented behaviour, so they fail, and the run
is red, until the product fixes them (see [test plan §4.1](docs/test-plan.md)). All jobs run
headless and publish HTML and Allure reports as artifacts (named per job, browser or shard;
`regression-local` also uploads container logs when the run does not pass).

### Connecting the product repository

The trigger that the product repository needs, and its instructions, are in
[`docs/ci/`](docs/ci/README.md): a workflow to copy into the product repository
([`product-repo-trigger.yml`](docs/ci/product-repo-trigger.yml)) and a README for that
repository covering the token, the secret, how to check it works and troubleshooting. Both
live under `docs/` so they never run here.

## Tests

| Spec | Covers |
|---|---|
| `tests/HomeTests.spec.ts` | Smoke check: the home page loads with its product catalog |
