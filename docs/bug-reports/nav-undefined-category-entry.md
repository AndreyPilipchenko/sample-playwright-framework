# BUG: The Categories menu has an entry labelled "UNDEFINED" that opens an empty page

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | None. No case states what this entry should be, so no test was added. TC-NAV-3 covers the other category entries. |
| Automation | None. |
| Area | Navigation bar |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 2 of 2 controlled script runs. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

The Categories menu has an entry reading **UNDEFINED**. It opens "Category: Undefined" with no products.

## Preconditions

- None.

## Steps to reproduce

1. Open the home page.
2. Open **Categories**.
3. Click **UNDEFINED**.

## Expected result

No source states this entry. The usual expectation, not from a source, is that each entry names a real category.

## Actual result

- The entry links to `#/category/undefined`.
- The page title is "Category: Undefined" and it lists 0 products.
- No top-level category has the slug `undefined`, and none mentions `robotic`.

## Evidence

- Controlled script run: label, link, title and product count as above, and `GET /categories/tree` read for the slugs.
- Source comparison, not run: `sprint5-with-bugs` `header.component.html` line 34 hard-codes `UNDEFINED` with `data-test="nav-robotic-tools"`. Upstream `sprint5` has `nav-other`, linking to `/category/other`, in that place.

## Open points before filing

- The upstream comparison suggests this should be **Other**, but no project document says so.
- It may share a cause with register entry 3, the "Chainsaws" entry next to it, so whoever files this may want to link them.
- Severity and priority need the project's scale; none is invented here.
