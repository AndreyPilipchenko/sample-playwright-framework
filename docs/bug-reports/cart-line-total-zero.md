# BUG: Checkout cart line total always shows `$00.00`; it does not follow price or quantity

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker |
| Register entry | [8](../known-defects.md): "Total price displays 0,00". Written up here with its own reproduction, as requested. |
| Test cases | TC-CART-2 (line total after a quantity change) and TC-CART-7 (cart total versus line totals) in [test cases](../test-cases.md) |
| Automation | None on this branch. Both cases are conformance cases, planned for the `conformance-test` branch (test plan §4.1). |
| Area | Checkout — cart review |
| Environment | Local Docker (`sprint5-with-bugs`), Chromium 1920×1080 |
| Observed | 2026-11-03 |
| Reproduction | Local Docker 3 of 3 (browser exploration and two scripted runs of the cart steps); public instance not checked |
| Severity / priority / type | Not set. Suggested: major, since the shopper cannot see what each line costs (a judgement, not from a source). Tracker fields are unresolved. |

## Summary

On the checkout cart page, the **Total** cell of each cart line always reads `$00.00`, whatever the product's
unit price or the quantity. The cart total at the bottom is correct. After a quantity change it also updates
correctly, so the line totals and the cart total disagree.

## Preconditions

- The Toolshop app (local `sprint5-with-bugs` Docker stack); no login needed.
- Product 1 (Combination Pliers, unit price `$14.15`) is in stock.

## Steps to reproduce

1. Open `#/product/1`.
2. Click **Add to cart**.
3. Open the cart at `#/checkout`.
4. Read the **Total** cell of the product's row and the cart total.
5. Change the quantity of the product to `3` and press Tab.
6. Read the **Total** cell of the row and the cart total again.

## Expected result

- After step 3: the line total is `$14.15` and the cart total is `$14.15` (TC-CART-7: the cart total reflects the
  sum of the line totals, not 0,00).
- After step 5: the line total is `$42.45` (3 × `$14.15`) and the cart total is `$42.45` (TC-CART-2).

## Actual result

- After step 3: the line total is `$00.00`; the cart total is `$14.15`.
- After step 5: the line total is still `$00.00`; the cart total is `$42.45`.
- With two products in the cart (`$14.15` and `$12.01`): both line totals read `$00.00`; the cart total is `$26.16`.

## Evidence

- Harness exploration runs `cart-tc-cart-2-20261103T154541` and `cart-tc-cart-7-20261103T154541` under
  `.harness/runs/` (observations: `lineTotal: "$00.00"` against `expectedLineTotal: 42.45`; `lineTotals: ["$00.00"]`
  against `cartTotal: "$14.15"`).
- Scripted check of the same steps: the line total of Combination Pliers read `"$00.00"` where `"$42.45"` (quantity 3) and
  `"$14.15"` (quantity 1) were expected.

## Open points before filing

- The register title says "0,00" (comma); the app renders `$00.00` (dot, two leading zeros). The register entry
  may describe a different cell, such as the cart total on another build.
- The expected values come from the unit price shown in the same row and the documented cart behaviour, not from a
  separate requirements document.
- Only the local app was checked. The public instance was not re-run for this report.
- Tracker destination, work-item type, severity, priority and required custom fields are unresolved; no Azure DevOps
  connection was checked.
- No screenshot attached; none has been reviewed or approved for filing.
