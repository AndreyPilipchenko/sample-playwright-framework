# BUG: The category page title comes from the URL slug, not the category name

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-CAT-2 (category name is shown as the page title), P3 and not automated yet, in [test cases](../test-cases.md). |
| Automation | None yet. |
| Area | Category page |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 2 of 2 controlled script runs. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC1 shows the category name as the page title. The title is built from the slug with only its first hyphen replaced, so a name of three or more words keeps its hyphens.

## Preconditions

- A category whose slug has more than one hyphen.

## Steps to reproduce

1. Create a category named `R7 Cat <uuid>`.
2. Open `#/category/<its slug>`.
3. Read the title.

## Expected result

AC1: the category name is shown as the page title.

## Actual result

- The title reads `Category: R7 Cat-ebc3f6df-db2e-43bb-b9f5-6f6afdf2d19d`.
- `#/category/hand-tools` reads `Category: Hand Tools`, because its slug has one hyphen.
- A slug with no category behind it still gets a title, for example `Category: Undefined`.

## Evidence

- Controlled script runs on 2026-11-06.
- Source comparison, not run: `sprint5` `category.component.html` line 5 uses `slug.replace('-', ' ') | titlecase`, so this is not specific to the with-bugs build.

## Open points before filing

- Only seeded test categories showed the hyphens. No factory category with a longer slug was checked.
- Severity and priority need the project's scale; none is invented here.
