# BUG: The category page has no price range slider

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-CAT-3 (same filter set as the product overview) in [test cases](../test-cases.md). |
| Automation | `tests/CategoryTests.spec.ts` finds the other four filters, then fails on the slider. |
| Area | Category page |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 5 of 5 runs of TC-CAT-3 failed, plus 1 of 1 controlled script run. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC2 for the category page lists a price range slider among the filters. The page has the category and brand checkboxes, the sort dropdown and the pagination, but no slider.

## Preconditions

- None.

## Steps to reproduce

1. Open `#/category/hand-tools`.
2. Look at the sidebar.

## Expected result

AC2: category checkboxes, brand checkboxes, sorting dropdown, pagination controls and price range slider.

## Actual result

- The headings are Sort, Filters, By category, By brand and Sustainability. **Price Range** is missing.
- The page has no `ngx-slider` element.

## Evidence

- Controlled script run: 5 category checkboxes, 1 sort dropdown, 1 pagination and 0 sliders on `#/category/hand-tools`.
- Source comparison, not run: neither `sprint5` nor `sprint5-with-bugs` `category.component.html` contains `ngx-slider`.

## Open points before filing

- The defect-free upstream template has no slider either, so the story may be what needs correcting.
- Severity and priority need the project's scale; none is invented here.
