# BUG: A discounted rental shows a total at the full hourly rate

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-RENT-5 (location-based discount applies to rentals) in [test cases](../test-cases.md). |
| Automation | `tests/ui/catalog/RentalTests.spec.ts` passes on the discounted price, then fails on the total. |
| Area | Product detail, rental products |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 6 of 6 runs of TC-RENT-5 failed, plus 1 of 1 controlled script run. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

At a location with a discount, a rental offer shows the discounted hourly price next to a total that still uses the full price. The two figures disagree on the same page.

## Preconditions

- A rental product marked as a location offer, priced at 100.
- A browser position in Amsterdam (20% discount).

## Steps to reproduce

1. Open the product detail page of the rental.
2. Leave the duration at 1 hour.

## Expected result

Rentals AC5 applies the discount to the rental price, and AC3 makes the total the hourly rate times the duration, so 1 hour should total 80.00. The story does not state this combination in one sentence.

## Actual result

- The original price `100.00` is struck through and the discounted price is `$80`.
- The total is `100.00`.

## Evidence

- TC-RENT-5 failure output: expected `80.00`, received `100.00`.
- Source comparison, not run: `sprint5` `detail.component.html` calculates a discounted total from `product.discount_price * quantity`. `sprint5-with-bugs` only has `product.price * quantity`.

## Open points before filing

- The price in the cart for a discounted rental was not checked, so what the shopper actually pays is unknown.
- Severity and priority need the project's scale; none is invented here.
