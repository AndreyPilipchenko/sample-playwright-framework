# BUG L1: Checkout cart table header has a blank extra column and the remove-item column is labelled "Total"

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker |
| Register entry | [L1](../known-defects.md) (not in the upstream known-bug list) |
| Test case | TC-CART-1 in [test cases](../test-cases.md) |
| Area | Checkout — cart review |
| Environment | Public with-bugs instance and local Docker (`sprint5-with-bugs`), Chromium 1920×1080 |
| Observed | 2026-11-03 |
| Reproduction | Local Docker 2 of 2; public instance 1 of 1 (first attempts, no retries) |
| Severity / priority / type | Not set. Suggested: cosmetic, not blocking checkout (a judgement, not from a source). Tracker fields are unresolved. |

## Summary

The cart table on the checkout page has six header cells instead of five: `Item, (blank), Quantity,
Price, Total, Total`. The acceptance criterion for cart review calls for `Item, Quantity, Price, Total,
Actions`. A shopper sees an unlabelled column and two columns both titled "Total", one of which holds
the remove button.

## Preconditions

- The Toolshop app (public with-bugs instance or the local `sprint5-with-bugs` Docker stack).
- No login needed.
- At least one in-stock product (product 1, Combination Pliers, was used).

## Steps to reproduce

1. Open `#/product/1`.
2. Click **Add to cart**.
3. Open the cart at `#/checkout`.
4. Read the header cells of the cart table.

## Expected result

Header cells read `Item, Quantity, Price, Total, Actions` (TC-CART-1, acceptance criterion AC1).

## Actual result

Header cells read `Item, (blank), Quantity, Price, Total, Total`. Each body row has 6 cells.

## Reproduction record

| Environment | Result | Notes |
|---|---|---|
| Local Docker | 2 of 2 | Earlier exploration, then re-read directly on 2026-11-03 (header cells and row-cell count). |
| Public instance | 1 of 1 | Earlier exploration only; the exact page text was not recorded. |

## Open points before filing

- The expected result comes from AC1 as transcribed in `docs/test-cases.md`; the upstream source was not re-read.
- The blank column may be a hidden icon or spacer. Only header cells and the row-cell count were read, not the markup.
- Tracker destination, work-item type, severity, priority and required custom fields are unresolved; no Azure DevOps connection was checked.

## Attachments

None approved. A candidate unannotated screenshot of the local cart is at `.harness/state/smoke/l1-cart.png`
(gitignored). It has not been reviewed, annotated or approved for filing.
