# BUG: The product quantity is capped at 99, while the story allows 999,999,999

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-PD-7 (quantity accepts manual numeric entry) in [test cases](../test-cases.md). |
| Automation | `tests/ui/catalog/ProductDetailTests.spec.ts` passes typed entry and the lower limit, then fails on the upper limit. |
| Area | Product detail, quantity input |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 5 of 5 runs of TC-PD-7 failed, plus 2 of 2 controlled script runs. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC7 clamps a typed quantity between 1 and 999,999,999. The page clamps it to 99 and tells the shopper that is the most they can order.

## Preconditions

- An in-stock, non-rental product.

## Steps to reproduce

1. Open the product detail page.
2. Type `1000000000` into the quantity and leave the field.
3. Repeat with `100`.

## Expected result

AC7: the value is clamped to 999,999,999.

## Actual result

- `1000000000` becomes `99`.
- `100` becomes `99`, with the message "You can order at most 99 of this product."
- The lower limit works as documented: `0` and `-3` become `1`.

## Evidence

- Controlled script runs on 2026-11-06, and the TC-PD-7 failure output (expected `999999999`, received `99`).
- Source comparison, not run: `MAX_QUANTITY = 99` in `detail.component.ts` of both `sprint5` and `sprint5-with-bugs`.

## Open points before filing

- The defect-free upstream build has the same limit and a message written for it, so this looks deliberate. The story may be what needs correcting.
- Severity and priority need the project's scale; none is invented here.
