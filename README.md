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
tests/        Spec files — orchestrate business flows, carry Allure metadata only
resources/    testData/ (per-spec JSON files), Queries/ and apisCollections/ (team libraries)
.harness/     Harness-managed project config, targets and the vendored package
```

See `AGENTS.md` / `CLAUDE.md` for the AI-agent skill routing, and the harness's own
`node_modules/playwright-pom-harness/docs/` for the full conventions reference.

## Test documentation

[`docs/`](docs/README.md) holds the test documentation for the application under test,
compiled from the upstream Practice Software Testing docs:

- [Test plan](docs/test-plan.md) — scope, environment, approach, risks, and the
  expected-failure policy for a deliberately broken target
- [Test cases](docs/test-cases.md) — test conditions per feature area, traced to
  upstream acceptance criteria

## Getting started

```sh
npm ci
npx playwright install --with-deps chromium
cp .env.example .env   # fill in any values a test needs (none required yet)
npm test                # runs the suite headless; opens the HTML/Allure report after
```

Check harness readiness any time with `npx --no pom-harness check`, and enforce POM
conventions with `npx --no pom-harness check-conventions`.

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

The local instance is pointed at by overriding `APP_URL`, which
`src/config/targets.ts` resolves ahead of the committed target — no config file is
edited. Any Playwright invocation honours it:

```sh
APP_URL=http://localhost:4200 npx playwright test
```

The stack starts the UI on `4200`, the REST API on `8091` (Swagger at
`:8091/api/documentation`) and MariaDB on `3306`. Note that the upstream `web` (nginx)
and `cron` images are published for **linux/arm64 only** — Docker Desktop emulates
them transparently, but a bare amd64 Linux host needs binfmt handlers registered
(`docker run --privileged --rm tonistiigi/binfmt --install arm64`), which is what the
CI job's QEMU step does.

## CI

`.github/workflows/playwright.yml` runs on every push/PR to `main` (and on manual
dispatch) with two independent jobs:

| Job | What it does |
|---|---|
| `test` | Runs the suite against the hosted public instance |
| `local-app` | Brings the application up on the runner with Docker, seeds it, and runs the suite against that private instance |

Both check conventions, run headless, and publish HTML and Allure reports as
artifacts (the `local-app` job suffixes its artifact names, and also uploads container
logs when the run does not pass). They are deliberately separate so a hosted-instance
outage cannot mask a genuine suite failure, and so the two run in parallel.

## Tests

| Spec | Covers |
|---|---|
| `tests/HomeTests.spec.ts` | Smoke check: the home page loads with its product catalog |
