# BUG: The rentals page shows only the first 9 rentals, with no way to reach the rest

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-RENT-1 (rentals page is reachable), story AC1 "a list of all rental products", in [test cases](../test-cases.md). |
| Automation | `tests/ui/catalog/RentalTests.spec.ts`: TC-RENT-1 seeds 10 rentals, more than one API page holds, and fails because they are not all listed. |
| Area | Rentals page |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 4 of 4 runs of TC-RENT-1 failed, plus 2 of 2 controlled script runs. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC1 expects all rental products. The page shows one API page of 9 and has no pagination, so any further rentals cannot be reached from it.

## Preconditions

- More than 9 rental products exist. The local database had 24, most of them seeded by test runs.

## Steps to reproduce

1. Open `#/rentals`.
2. Count the cards and look for pagination.
3. Compare with `total` in `GET /products?is_rental=true`.

## Expected result

AC1: a list of all rental products is displayed.

## Actual result

- The API reports `total` 24 and `per_page` 9.
- The page shows 9 cards and has no pagination.

## Evidence

- Controlled script run: the figures above.
- Source comparison, not run: the rentals `overview.component.html` of both `sprint5` and `sprint5-with-bugs` has no pagination, and upstream `overview.component.ts` calls `getProductRentals()` with no page.

## Open points before filing

- A freshly seeded stack was not checked by hand. Going by product ids it holds about 3 rentals, so a shopper there may not notice this. TC-RENT-1 still fails there, because its 10 seeded rentals pass one page.
- The defect-free upstream template has no pagination either.
- Severity and priority need the project's scale; none is invented here.
