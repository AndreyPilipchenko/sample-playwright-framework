# Bug reports

Defects found while automating, written up for filing. None has been filed in a tracker yet. Each
report carries its status, reproduction counts and the points still open before filing. Filing needs a
separate, explicitly approved preview. Reports are written even when the defect is already in the
[known-defects register](../known-defects.md).

| Report | Register entry | Case | Status |
|---|---|---|---|
| [Cart table header has a blank extra column; remove column labelled "Total"](L1-cart-table-header.md) | L1 | TC-CART-1 | Open, not filed |
| [Cart line total always shows `$00.00`](cart-line-total-zero.md) | 8 | TC-CART-2, TC-CART-7 | Open, not filed |
| [Cart delete button does nothing](cart-delete-button-no-effect.md) | 7 | TC-CART-4, TC-CART-5 | Open, not filed |
| [Checkout order is not placed with the prefilled billing address (`POST /invoices` 500)](checkout-order-not-placed-prefilled-address.md) | new (related to 10) | TC-CPAY-12, TC-CPAY-13 | Open, not filed |
| [Contact form confirms the message, but the email is never delivered](contact-mail-not-delivered.md) | new | TC-CONT-8 | Open, not filed |
| [Chat checkout offers only "Sign in"; a guest cannot continue](chat-no-guest-checkout.md) | new | TC-CHAT-6 (guest) | Open, not filed |
| [Chat sign-in shows the typed password in plain text](chat-echoes-password.md) | new | seen in TC-CHAT-6 | Open, not filed |
| [Contact form and `POST /messages` accept an invalid email address](contact-api-accepts-invalid-email.md) | new | `contact-api-5` | Open, not filed |
| [`POST /messages` returns 500 for a guest without both a name and an email](contact-api-500-without-identity.md) | new | none | Open, not filed |
| [A parent category with children has no checkbox in the sidebar](category-parent-no-checkbox.md) | new | TC-PO-9 | Open, not filed |
| [A search leaves the sort dropdown showing the previous option](search-leaves-sort-selected.md) | new | TC-PO-6 | Open, not filed |
| [The category page has no price range slider](category-page-no-price-slider.md) | new | TC-CAT-3 | Open, not filed |
| [The category page title comes from the URL slug, not the category name](category-title-from-slug.md) | new | TC-CAT-2 (not automated) | Open, not filed |
| [The Categories menu has an entry labelled "UNDEFINED" that opens an empty page](nav-undefined-category-entry.md) | new | none | Open, not filed |
| [The product quantity is capped at 99, while the story allows 999,999,999](product-quantity-capped-at-99.md) | new | TC-PD-7 | Open, not filed |
| [The rentals page shows only the first 9 rentals, with no way to reach the rest](rentals-page-no-pagination.md) | new | TC-RENT-1 | Open, not filed |
| [A discounted rental shows a total at the full hourly rate](rental-total-ignores-location-discount.md) | new | TC-RENT-5 | Open, not filed |
