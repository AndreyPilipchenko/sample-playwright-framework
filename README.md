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
  test intent policy for a deliberately broken target (conformance tests are tagged
  `@conformance` and fail while their defects are open)
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
failed login (known defect #21).

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

Two workflows. Except `regression-local`, every job runs against the hosted public instance.

**Pull-request gate** — `.github/workflows/playwright.yml`, on every push/PR to `main` (and
on manual dispatch). Small and fast; the smoke stage starts only when the API stage passed:

| Stage | Job | What it does |
|---|---|---|
| 1 | `api-tests` | Conventions check, typecheck and lint, then the browserless API specs (`tests/api`) |
| 2 | `smoke` | The `@smoke` subset on chromium |

**Nightly** — `.github/workflows/nightly.yml`, at 02:00 UTC on `main` (GitHub runs schedules
on the default branch only) and on manual dispatch for any branch. Its jobs are independent:

| Job | What it does |
|---|---|
| `smoke-cross-browser` | The `@smoke` subset on firefox and webkit |
| `regression` | Every non-smoke spec on chromium, in 2 parallel shards. Includes the `@conformance` tests, so it is red while their defects are open |
| `regression-local` | Brings the application up on the runner with Docker, seeds it, and runs the whole suite against that private instance |

All jobs run headless and publish HTML and Allure reports as artifacts (named per job,
browser or shard; `regression-local` also uploads container logs when the run does not
pass).

Conformance tests (documented behaviour the application violates, tagged `@conformance`)
stay red until the defect is fixed. Run the two signals separately when you need them:

```sh
npm run test:non-conformance  # working functionality: must be green
npm run test:conformance      # documented behaviour: red while defects are open
```

## Tests

| Spec | Covers |
|---|---|
| `tests/HomeTests.spec.ts` | Smoke check: the home page loads with its product catalog |
