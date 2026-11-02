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

## CI

`.github/workflows/playwright.yml` runs on every push/PR to `main` (and on manual
dispatch): installs dependencies and Chromium, checks conventions, runs the suite
headless, and publishes the HTML and Allure reports as build artifacts.

## Tests

| Spec | Covers |
|---|---|
| `tests/HomeTests.spec.ts` | Smoke check: the home page loads with its product catalog |
