# Harness change request: a shorter assertion budget, or one a project can set

**Package:** playwright-pom-harness 4.3.2 · **Raised:** 2026-11-16 · **Status:** open

## Problem

The assertion budget (`expect.timeout`) is 30 seconds, fixed by the 2026-09-08 timeout ruling and
hardcoded in two rules of `check-conventions` (`timeout-below-default`, `timeout-literal-in-pages`), so
`src/config/timeouts.ts` can't change it on its own. A web-first assertion that never comes true waits the
whole budget. This project keeps tests of broken functionality red (`docs/test-plan.md` §4.1), so most red
tests in a run spend 30 seconds waiting, and again on the CI retry.

The application renders in well under a second: a cold page load takes about 0.5 s and the first product
card about 0.6 s (measured 2026-11-03, `src/config/timeouts.ts`).

## Measurement

Nightly 43835376735 (2026-11-16), the per-test durations of the list reporter in the job logs. Each
regression job runs on chromium with 3 workers; CI retries a failed test once, except where a spec sets
`retries: 0`.

| Job | Wall time | Test time | Failed attempts | Their time | Share |
|---|---|---|---|---|---|
| Regression on `local` (with the defects) | 18 min 05 s | 2,815 s | 84, of them 26 retries | 2,739 s | 97% |
| Regression on `local-fixed` | 6 min 56 s | 901 s | 13, of them 4 retries | 487 s | 54% |
| The other eight jobs | 1 to 4 min each | | | | |

On `local`, 81 of the 84 failed attempts took 29 s or more (average 32.6 s); the retries alone took
866 s. The nightly's wall time is that of its slowest job, so the red tests on `local` set it: about
18 minutes, against roughly 7 for everything else.

## Estimate

Test time on `local` is about 80 s for the passing tests plus the failed attempts. Divided over 3 workers,
with the job's ~2.5 minutes of setup (stack start, browsers, reports):

| Assertion budget | Failed attempts (~81 × budget + ~1.5 s) | Job wall time, roughly |
|---|---|---|
| 30 s (today) | ~2,700 s | 18 min |
| 10 s | ~930 s | 8 min |
| 5 s | ~530 s | 6 min |

The nightly would then take about 8 minutes with 10 s, or 6 with 5 s, instead of 18. These are estimates
from the logs, not runs. A public site answers more slowly than the local stack and may need a longer
budget, which is one reason to let a project set the value.

## What the harness allows today

- `EXPECT_DEFAULT_MS` must stay in lockstep with the linter's copy, so lowering it alone would make
  the two rules misjudge inline timeouts.
- Per-assertion timeouts below the default are flagged as redundant (`timeout-below-default`).
- Fewer retries would halve the cost of a red test, but this project keeps one CI retry to show flaky
  tests (`playwright.config.ts`).

## Requested

One of:

- A project setting for the assertion budget (for example in `.harness/project.json`) that the
  conventions rules read instead of their hardcoded 30 s, so `src/config/timeouts.ts` and the linter
  stay in step.
- A lower default (10 s) in the ruling, with `SLOW_SURFACE_MS` for the surfaces that measurably need more.
