# BUG: Checkout cart delete button does nothing; the item stays in the cart and the total does not change

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker |
| Register entry | [7](../known-defects.md): "Delete button is disabled". Written up here with its own reproduction, as requested. |
| Test cases | TC-CART-4 (delete removes the item) and TC-CART-5 (cart total recalculates after deletion) in [test cases](../test-cases.md) |
| Automation | TC-CART-4 and TC-CART-5 in `tests/CartTests.spec.ts`, tagged `@conformance`; they fail while this defect is open (test plan §4.1). |
| Area | Checkout — cart review |
| Environment | Local Docker (`sprint5-with-bugs`), Chromium 1920×1080 |
| Observed | 2026-11-03 |
| Reproduction | Local Docker 3 of 3 for TC-CART-4 and 3 of 3 for TC-CART-5 (browser exploration and two scripted runs of the cart steps); public instance not checked |
| Severity / priority / type | Not set. Suggested: major, since a shopper cannot remove an item from the cart (a judgement, not from a source). Tracker fields are unresolved. |

## Summary

The red remove button at the end of each cart row has no effect when clicked. The row stays in the cart, the
quantity stays the same and the cart total does not change, including after a page reload.

## Preconditions

- The Toolshop app (local `sprint5-with-bugs` Docker stack); no login needed.
- Products 1 (Combination Pliers, `$14.15`) and 2 (Pliers, `$12.01`) are in stock.

## Steps to reproduce

1. Open `#/product/1` and click **Add to cart**.
2. Open `#/product/2` and click **Add to cart**. The cart badge shows `2`.
3. Open the cart at `#/checkout`. The cart total reads `$26.16`.
4. Click the remove button of the first row (Combination Pliers).
5. Read the listed products and the cart total.

## Expected result

- The Combination Pliers row is removed (TC-CART-4).
- The cart total is `$12.01`, the price of the remaining product (TC-CART-5).

## Actual result

- Both rows are still listed (`Combination Pliers`, `Pliers`).
- The cart total still reads `$26.16`.
- The remove button is not disabled in the markup (no `disabled` or `aria-disabled` attribute, pointer events
  enabled, the click lands on the button icon); clicking simply changes nothing.

## Evidence

- Harness exploration runs `cart-tc-cart-4-20261103T154541` (`before: ["Combination Pliers"]`,
  `after: ["Combination Pliers"]`) and `cart-tc-cart-5-20261103T154541` (cart total unchanged at `$26.16`, both titles
  still listed) under `.harness/runs/`.
- Scripted check of the same steps: after clicking remove, the Combination Pliers row count was `1` where `0` was
  expected, and the cart total read `"$26.16"` where `"$12.01"` was expected.

## Open points before filing

- The register title says the button "is disabled"; the button is not disabled in the markup, so the wording may
  describe another build or only the visual state. The observed behaviour is a click with no effect.
- The button has no test id or accessible name; tests locate it by its `btn-danger` class inside the row.
- Only the local app was checked. The public instance was not re-run for this report.
- Tracker destination, work-item type, severity, priority and required custom fields are unresolved; no Azure DevOps
  connection was checked.
- No screenshot attached; none has been reviewed or approved for filing.
