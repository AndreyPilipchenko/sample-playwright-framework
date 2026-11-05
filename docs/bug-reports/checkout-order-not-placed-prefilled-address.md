# BUG: Checkout order is not placed when the billing address is left prefilled; `POST /invoices` returns 500 and no invoice number is shown

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). Closely related to entry [10](../known-defects.md) (postcode shows "Missing value"), which may be its cause. |
| Test cases | TC-CPAY-12 (valid payment places the order and shows the invoice number) and TC-CPAY-13 (cart is cleared after a successful order) in [test cases](../test-cases.md). Automated with an explicitly typed address, see Automation. |
| Automation | The checkout tests in `tests/CheckoutTests.spec.ts` type the full billing address themselves, so they do not exercise the prefilled path. That follows the case wording ("valid payment") and is not a workaround for this defect: the prefilled path has no test of its own yet. |
| Area | Checkout — billing address and payment |
| Environment | Public instance `https://with-bugs.practicesoftwaretesting.com`, Chromium (Playwright) |
| Observed | 2026-11-05 |
| Reproduction | Prefilled address: 4 of 4 attempts failed (3 harness exploration runs of TC-CPAY-12 and 1 controlled script run). Postcode retyped: 1 of 1 controlled run succeeded, and the harness runs that typed the whole address succeeded. Local Docker stack not checked. |
| Severity / priority / type | Not set. Suggested: critical, since a signed-in customer who keeps the saved address cannot complete an order and gets no error (a judgement, not from a source). Tracker fields are unresolved. |

## Summary

A signed-in customer reaches the billing address step with their saved address prefilled, and the postcode field shows
`missing value` instead of the stored postcode. Proceeding with that address and paying (Bank Transfer) shows "Payment
was successful" twice, but the order is never placed: the invoice request fails with HTTP 500, no invoice number is
shown and the cart keeps its items. The user sees no error. Retyping only the postcode makes the same flow succeed.

## Preconditions

- A customer registered through `POST /users/register` with a valid address (`Street 1`, `Amsterdam`, `State`, `NL`,
  postcode `1234AA`).
- One in-stock product (any).

## Steps to reproduce

1. Open the product page, click **Add to cart**, then open the cart at `#/checkout` and click **Proceed to checkout**.
2. On the sign-in step, log in as the customer and click **Proceed to checkout**.
3. On the billing address step, leave every prefilled field as it is. The postcode field reads `missing value`.
4. Click **Proceed to checkout**.
5. On the payment step, choose **Bank Transfer**, enter any account name and account number, and click **Confirm**.
   "Payment was successful" is shown.
6. Click **Confirm** again.

## Expected result

- The order is placed and "Thanks for your order! Your invoice number is INV-…" is shown (TC-CPAY-12).
- The cart is cleared (TC-CPAY-13).
- If the order cannot be placed, an error says so.

## Actual result

- `POST /invoices` returns **500**.
- No invoice number appears. The page keeps showing "Payment was successful" (twice) and the **Confirm** button.
- The cart still holds the product, and no error is shown.

## What changes the outcome

One fresh customer per row, otherwise the same steps. Prefilled values: street `Street 1`, city `Amsterdam`, state
`State`, country `NL`, postcode `missing value`.

| Billing change before step 4 | `POST /invoices` | Invoice number |
|---|---|---|
| None (all prefilled) | 500 | none |
| Only the postcode retyped as `1234AA` | 201 | `INV-2026000009` |
| Only the state retyped as `Noord-Holland` | 500 | none |

So the postcode value is what blocks the order. The address stored on the account is valid; the checkout form shows the
wrong value for it (register entry 10).

## Evidence

- Controlled script run of the table above: `.harness/state/checkout/recon3.cjs` (output of the three variants recorded
  in the session on 2026-11-05).
- Harness exploration runs of TC-CPAY-12 that failed with the prefilled address, under `.harness/runs/`
  (`checkout-tc-cpay-12-20261105T145348` and the two runs after it before the address was typed explicitly), each with the
  page text after the second **Confirm** showing no invoice.
- The passing run with the typed address: `checkout-tc-cpay-12-20261105T150309`.

## Open points before filing

- The 500 response body is `{"message":"Something went wrong"}`. The failing invoice request (captured from a trace) carries
  `"billing_postcode":"missing value"`; with the retyped postcode the request carries `1234AA` and returns 201.
- Whether the same failure happens for other payment methods was not checked; only Bank Transfer is rendered with
  fields in this build (the other methods show the same bank fields).
- Public instance only; the local Docker stack was not checked.
- While automating, a second behaviour showed up: the saved address loads after the billing step opens and overwrites
  values typed (or a field cleared) before it arrives. In 8 of 10 diagnostic runs of the order cases the invoice request was
  sent with the prefilled `State` / `missing value` instead of the typed `Noord-Holland` / `1234AA` and failed with 500
  (`{"message":"Something went wrong"}`). This was a race in the first version of the tests, now handled by waiting for the
  saved address before typing. Whether the late overwrite is itself a product defect is a decision for whoever files this.
- Whether to track it separately from register entry 10 or as a consequence of it is a decision for whoever files it.
- Severity and priority need the project's scale; none is invented here.

## Related

- Register entry 10: "Instead of postcode 'Missing value' is displayed".
- A test of the prefilled path (case TC-CBA-5, "logged-in user's address is pre-filled from the account", no defect
  listed) would cover the display half; an order case on the prefilled path is not yet in the plan.
