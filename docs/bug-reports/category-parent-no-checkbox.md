# BUG: A parent category with children has no checkbox in the sidebar

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-PO-9 (checking a parent checks its children) in [test cases](../test-cases.md). |
| Automation | `tests/ProductOverviewTests.spec.ts` fails trying to check the parent. |
| Area | Product overview, category filter |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 5 of 5 runs of TC-PO-9 failed, plus 1 of 1 controlled script run. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC6 expects a parent category checkbox that also checks its children. A category that has children is shown as a plain label, with no checkbox, so a shopper cannot select the whole group.

## Preconditions

- A top-level category with at least one child, such as **Hand Tools**.

## Steps to reproduce

1. Open the home page.
2. Look at **By category** in the sidebar.
3. Try to check **Hand Tools**.

## Expected result

AC6: checking the parent checks all its children.

## Actual result

- **Hand Tools** and **Power Tools** are labels with no checkbox; their children, such as **Hammer**, have one.
- A seeded parent behaved the same: its label had no control, and its two children each had a checkbox.

## Evidence

- Controlled script run: `getByLabel` found no control for the seeded parent and found one for its child.
- Source comparison, not run: `sprint5-with-bugs/UI/src/app/products/overview/overview.component.html` renders the input only when the category has a `parent_id` or has no children. Upstream `sprint5` has a "Top-level parent" input for `!category.parent_id`.

## Open points before filing

- The second half of AC6, unchecking all children unchecks the parent, could not be tried. TC-PO-9 does not cover it.
- Severity and priority need the project's scale; none is invented here.
