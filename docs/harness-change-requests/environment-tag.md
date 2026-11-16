# Harness change request: a tag for tests that need a particular environment

**Package:** playwright-pom-harness 4.3.2 · **Raised:** 2026-11-16 · **Status:** open

## Problem

The tag vocabulary is closed to `@smoke` and `@regression` (design conventions, decision record
2026-08-21: "New tags require a new ruling"). This project has tests that can only run where the
environment offers something the public sites don't:

| Test | Needs |
|---|---|
| TC-LOGIN-10, TC-ADM-9, `customer-account-api-6` | The application's database, to disable an account (the API cannot) |
| TC-CONT-8 | The mail inbox of the local stack |

They carry `@local` instead of `@regression`. The nightly jobs on the local stacks select
`@regression` and `@local`; a run against a public site leaves them out with
`--grep-invert @local` (`.github/workflows/hosted.yml`). The `tag-vocabulary` rule of
`check-conventions` warns on each of the four, on every run.

## What the harness allows today

- The rule does not honour `// conventions-ok`, unlike the line-based rules.
- The baseline (`scripts/conventions-baseline.json`) is for legacy violations to fix when touched,
  and says never to add an entry to silence a new one. `@local` is not something to fix.
- Without the tag, a public-site run would need a list of test titles or files to skip, which
  goes stale as tests change.

So the four warnings stay, and `docs/test-plan.md` §4.4 explains them. Standing warnings make a new
one easier to miss.

## Requested

One of:

- A ruling that adds an environment-requirement tag (for example `@local`) to the closed set,
  alongside `@smoke` and `@regression`, for tests that need a resource only some environments have.
- A project-level list of extra tags the rule accepts, kept in `.harness/`, with the reason for
  each tag next to it.
