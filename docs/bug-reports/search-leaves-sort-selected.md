# BUG: A search leaves the sort dropdown showing the previous option

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-PO-6 (search resets all active filters) in [test cases](../test-cases.md). |
| Automation | `tests/ProductOverviewTests.spec.ts` passes on the category, brand and price reset, then fails on the sort dropdown. |
| Area | Product overview, search and sort |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 9 of 9 runs of TC-PO-6 failed. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC4 resets all active filters on a search. The category and brand checkboxes and the price slider are reset, but the sort dropdown keeps showing the option chosen before.

## Preconditions

- None.

## Steps to reproduce

1. Open the home page.
2. Choose a sort option, such as **Name (Z - A)**.
3. Search for a valid query.
4. Read the sort dropdown.

## Expected result

AC4: all active filters are reset. Whether sorting counts as a filter is not stated there; AC2 of the category story lists the sorting dropdown among "the same filters as the product overview".

## Actual result

- The dropdown still has the value `name,asc`.
- The checkboxes are unchecked and the price range is back at 1 to 100.

## Evidence

- TC-PO-6 failure output: expected an empty value, received `name,asc`.
- Source comparison, not run: upstream `sprint5` `overview.component.ts` sets `this.sorting = null` on search, and the `<select data-test="sort">` of both `sprint5` and `sprint5-with-bugs` has no value binding. So the list may no longer be sorted while the dropdown still shows the option, and this does not look specific to the with-bugs build.

## Open points before filing

- Whether the search results are really unsorted was not checked.
- If the team rules that sorting is not a filter, the last check of TC-PO-6 should go.
- Severity and priority need the project's scale; none is invented here.
