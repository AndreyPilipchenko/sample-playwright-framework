# Test Cases — Toolshop (with-bugs)

Test conditions per feature area, compiled from the
[upstream acceptance criteria](https://github.com/testsmith-io/practice-software-testing/blob/main/docs/user-stories/v5.md)
and filtered to the features present in the latest deployed build.
Grouped by **feature area**.

Read [the test plan](test-plan.md) first — in particular §4, which explains why many of
these cases are expected to fail and how to mark them.

## How to read this

- **ID** — stable reference, `TC-<AREA>-<n>`. Use it as the local scenario ID in
  `allure.testCaseId(...)`.
- **Intent** — per test plan §4.1:
  - `C` **conformance** — asserts the documented AC; expected to fail while the linked defect is open
  - `X` **characterisation** — pins current buggy behaviour
  - `N` **neutral** — no known defect on this path
- **Defect** — ID in the [known-defects register](known-defects.md). A defect reference
  means a conformance test here should be expected to fail.
- **AC** — the upstream acceptance criterion this traces back to.

Priority: **P1** core revenue/security path, **P2** important, **P3** cosmetic or edge.

---

## 1. Product Overview

Route: `#/`

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-PO-1 | Product grid displays cards with image, name and price | P1 | C | 26, 92 | AC1 |
| TC-PO-2 | Clicking a product card navigates to its detail page | P1 | N | — | AC2 |
| TC-PO-3 | Pagination controls appear when products exceed one page | P2 | N | — | AC3 |
| TC-PO-4 | Clicking a page number updates the grid | P2 | N | — | AC3 |
| TC-PO-5 | Search with a valid 3–40 character query filters the grid | P1 | N | — | AC4 |
| TC-PO-6 | Search resets all active filters | P2 | N | — | AC4 |
| TC-PO-7 | Search query below 3 or above 40 characters is rejected | P2 | N | — | AC4 |
| TC-PO-8 | Category checkbox filters the grid to that category | P1 | N | — | AC5 |
| TC-PO-9 | Checking a parent category checks all its children | P2 | N | — | AC6 |
| TC-PO-10 | Unchecking all children unchecks the parent | P3 | N | — | AC6 |
| TC-PO-11 | Brand checkbox filters the grid to that brand | P2 | N | — | AC7 |
| TC-PO-12 | Category and brand filters combine (AND) | P2 | N | — | AC8 |
| TC-PO-13 | Each sort option orders the grid correctly | P1 | C | 2, 33 | AC9 |
| TC-PO-14 | Price range slider defaults to $1–$100 with $200 maximum | P2 | N | — | AC10 |
| TC-PO-15 | Adjusting the price range filters the grid to that range | P1 | C | 27 | AC11 |
| TC-PO-16 | Discounted product shows struck-through original and discounted price | P2 | N | — | AC12 |
| TC-PO-17 | Product with no stock shows "Out of stock" | P2 | N | — | AC13 |
| TC-PO-18 | Search button label reads "Search" | P3 | C | 34 | — |
| TC-PO-19 | Sort control label reads "Sort" | P3 | C | 33 | — |
| TC-PO-20 | Toolshop logo image loads | P3 | C | 28 | — |
| TC-PO-21 | Search icon image loads | P3 | C | 30 | — |
| TC-PO-22 | Product names wrap correctly (Firefox) | P3 | C | 35 | — |

Smoke coverage for TC-PO-1 is automated in `tests/HomeTests.spec.ts`.

## 2. Navigation & Header

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-NAV-1 | Home link navigates to the home page | P2 | C | 29 | — |
| TC-NAV-2 | Contact navigation label reads "Contact" | P3 | C | 31 | — |
| TC-NAV-3 | Each category nav entry opens its category page | P2 | C | 3 | — |
| TC-NAV-4 | Signed-in user's name is displayed in the header | P2 | C | 32 | — |
| TC-NAV-5 | Guarded routes redirect to login when unauthenticated | P1 | N | — | — |

TC-NAV-5 is verified behaviour: `#/account`, `#/account/invoices`,
`#/account/favorites` and `#/admin/dashboard` all redirect to `#/auth/login`.

## 3. Product Category page

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CAT-1 | Category page lists only that category's products | P2 | N | — | AC1 |
| TC-CAT-2 | Category name is shown as the page title | P3 | N | — | AC1 |
| TC-CAT-3 | Same filter set as product overview is available | P2 | N | — | AC2 |
| TC-CAT-4 | "Chainsaws" category resolves without a 404 | P2 | C | 3 | — |
| TC-CAT-5 | Product names are left-aligned | P3 | C | 4 | — |
| TC-CAT-6 | Page title alignment is consistent (Edge) | P3 | C | 5 | — |

## 4. Product Detail

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-PD-1 | Detail page shows name, price, description and image | P1 | C | 92 | AC1 |
| TC-PD-2 | Discounted product shows both original and discounted price | P2 | N | — | AC2 |
| TC-PD-3 | Quantity selector is displayed defaulting to 1 | P1 | N | — | AC3 |
| TC-PD-4 | Plus button increases quantity | P1 | C | 40 | AC4 |
| TC-PD-5 | Minus button decreases quantity | P1 | C | 40 | AC5 |
| TC-PD-6 | Quantity cannot go below 1 | P2 | N | — | AC6 |
| TC-PD-7 | Quantity accepts manual numeric entry | P2 | N | — | AC7 |
| TC-PD-8 | Add to cart adds the selected quantity without error | P1 | C | 43 | AC8 |
| TC-PD-9 | More than 10 units can be added | P2 | C | 47 | AC8 |
| TC-PD-10 | Out-of-stock product cannot be added to cart | P2 | N | — | AC9 |
| TC-PD-11 | Rental product shows an hourly duration slider (1–10) | P2 | N | — | AC10 |
| TC-PD-12 | Add to Favorites succeeds for a logged-in user | P2 | C | 41 | AC11 |
| TC-PD-13 | Adding an existing favorite is handled without duplication | P3 | N | — | AC12 |
| TC-PD-14 | Add to Favorites while logged out prompts/denies appropriately | P2 | N | — | AC13 |
| TC-PD-15 | Related products section is displayed and labelled correctly | P3 | C | 42 | AC14 |
| TC-PD-16 | Quantity input has an accessible label | P2 | C | 91 | — |
| TC-PD-17 | Product images have alt text | P2 | C | 92 | — |
| TC-PD-18 | Title alignment and button layout render correctly per browser | P3 | C | 44, 45 | — |

## 5. Rentals

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-RENT-1 | Rentals page is reachable | P2 | N | — | AC1 |
| TC-RENT-2 | Rental products are displayed with rental-specific details | P2 | N | — | AC2 |
| TC-RENT-3 | Rental detail page shows the duration selector | P2 | N | — | AC3 |
| TC-RENT-4 | Rental item is labelled as a rental in checkout | P2 | N | — | AC4 |
| TC-RENT-5 | Location-based discount applies to rentals | P2 | N | — | AC5 |
| TC-RENT-6 | Rental product images load across browsers | P3 | C | 48 | — |
| TC-RENT-7 | Rentals page title alignment is consistent | P3 | C | 49 | — |

## 6. Checkout — Cart Review

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CART-1 | Cart table shows Item, Quantity, Price, Total, Actions | P1 | C | L1 | AC1 |
| TC-CART-2 | Changing quantity recalculates line and cart totals | P1 | C | 1 | AC2 |
| TC-CART-3 | Quantity update shows "Product quantity updated." | P2 | C | 1 | AC2 |
| TC-CART-4 | Delete button removes the item | P1 | C | 7 | AC3 |
| TC-CART-5 | Cart total recalculates after deletion | P1 | C | 7, 8 | AC3 |
| TC-CART-6 | Empty cart shows "Your shopping cart is empty" | P2 | N | — | AC4 |
| TC-CART-7 | Cart total reflects the sum of line totals (not 0,00) | P1 | C | 8 | AC1 |
| TC-CART-8 | Proceed advances to the next checkout step | P1 | N | — | AC5 |
| TC-CART-9 | Discounted line item shows a badge and both prices | P2 | N | — | AC6 |
| TC-CART-10 | Mixed rental + non-rental cart applies 15% combination discount | P1 | N | — | AC7 |
| TC-CART-11 | Cart shows subtotal, discount amount and final total | P1 | C | 8 | AC7 |
| TC-CART-12 | Removing all rental items removes the 15% discount | P2 | N | — | AC8 |

## 7. Checkout — Sign In step

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CSI-1 | Guest proceeding from cart sees the login step | P1 | N | — | AC1 |
| TC-CSI-2 | Login step shows email, password and submit | P1 | N | — | AC2 |
| TC-CSI-3 | Valid credentials authenticate and allow proceeding | P1 | N | — | AC4 |
| TC-CSI-4 | Already-signed-in user sees "You are already signed in as …" | P2 | C | 32 | AC5 |

TOTP during checkout (upstream AC3) is **out of scope** — absent from this build.

## 8. Checkout — Billing Address

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CBA-1 | All required address fields are displayed | P1 | C | 10 | AC1 |
| TC-CBA-2 | Field max lengths enforced (street 70, city/state/country 40, postcode 10) | P2 | N | — | AC1 |
| TC-CBA-3 | Empty required field is flagged and Proceed is disabled | P1 | N | — | AC2 |
| TC-CBA-4 | Completing all fields allows proceeding to payment | P1 | C | 11 | AC3 |
| TC-CBA-5 | Logged-in user's address is pre-filled from the account | P2 | N | — | AC4 |
| TC-CBA-6 | Step heading is spelled correctly | P3 | C | 9 | — |
| TC-CBA-7 | Postcode field shows its value, not "Missing value" | P2 | C | 10 | AC1 |
| TC-CBA-8 | Proceed button has a visible text label | P2 | C | 11 | — |
| TC-CBA-9 | Address form inputs have accessible labels | P2 | C | 88 | — |
| TC-CBA-10 | Checkout wizard labels meet contrast requirements | P2 | C | 86 | — |

## 9. Checkout — Payment

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CPAY-1 | Dropdown lists all five payment methods | P1 | C | 12 | AC1 |
| TC-CPAY-2 | Bank Transfer shows bank name, account name, account number | P2 | C | 12 | AC2 |
| TC-CPAY-3 | Bank Transfer field format validation | P2 | N | — | AC2 |
| TC-CPAY-4 | Credit Card shows number, expiry, CVV, holder name | P1 | C | 12 | AC3 |
| TC-CPAY-5 | Card number enforces XXXX-XXXX-XXXX-XXXX | P2 | N | — | AC3 |
| TC-CPAY-6 | CVV accepts 3 or 4 digits only | P2 | N | — | AC3 |
| TC-CPAY-7 | Past expiry date shows "Expiration date must be in the future." | P1 | N | — | AC4 |
| TC-CPAY-8 | Buy Now Pay Later shows installments 3/6/9/12 | P2 | C | 12 | AC5 |
| TC-CPAY-9 | Gift Card shows card number and validation code | P2 | C | 12 | AC6 |
| TC-CPAY-10 | Cash on Delivery requires no extra fields | P2 | C | 12 | AC7 |
| TC-CPAY-11 | Switching method resets the form to the new fields | P2 | N | — | AC8 |
| TC-CPAY-12 | Valid payment places the order and shows the invoice number | P1 | N | — | AC9 |
| TC-CPAY-13 | Cart is cleared after a successful order | P1 | N | — | AC9 |
| TC-CPAY-14 | Payment form inputs have accessible labels | P2 | C | 89 | — |

## 10. User Registration

Route: `#/auth/register`

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-REG-1 | All required registration fields are displayed | P1 | C | 52 | AC1 |
| TC-REG-2 | Email max length 256 and RFC format enforced | P2 | N | — | AC1 |
| TC-REG-3 | Postcode and phone accept numeric input only | P2 | N | — | AC1 |
| TC-REG-4 | Focusing password shows the four requirements | P2 | N | — | AC2 |
| TC-REG-5 | Requirements update in real time as the password is typed | P2 | N | — | AC3 |
| TC-REG-6 | Strength indicator shows the five levels at 20–100% | P2 | N | — | AC4 |
| TC-REG-7 | Duplicate email shows "Email is already in use." | P1 | C | 50 | AC5 |
| TC-REG-8 | Duplicate-email error does not reveal a password hint | P1 | C | 50 | — |
| TC-REG-9 | Valid submission creates the account and redirects to login | P1 | N | — | AC6 |
| TC-REG-10 | Names containing valid special characters are accepted | P2 | C | 51 | AC1 |
| TC-REG-11 | State and Country fields show their own values | P2 | C | 52 | AC1 |
| TC-REG-12 | Tab order follows visual order | P3 | C | 53 | — |
| TC-REG-13 | Phone placeholder text is spelled correctly | P3 | C | 54 | — |
| TC-REG-14 | Field labels, padding and button width render correctly per browser | P3 | C | 55–59 | — |

## 11. User Login

Route: `#/auth/login`

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-LOGIN-1 | Login form shows email and password fields | P1 | N | — | AC1 |
| TC-LOGIN-2 | Valid user credentials redirect to `#/account` | P1 | N | — | AC2 |
| TC-LOGIN-3 | Valid admin credentials redirect to `#/admin/dashboard` | P1 | N | — | AC2 |
| TC-LOGIN-4 | Invalid credentials show "Invalid email or password" | P1 | N | — | AC3 |
| TC-LOGIN-5 | Empty email and password are validated client-side | P1 | C | 17 | AC1 |
| TC-LOGIN-6 | Malformed email is rejected | P2 | C | 17 | AC1 |
| TC-LOGIN-7 | Account locks only after 3 consecutive failures | P1 | C | 21 | AC4 |
| TC-LOGIN-8 | Locked account shows the lock message and API returns HTTP 423 | P1 | C | 21 | AC4 |
| TC-LOGIN-9 | Admin account is never locked by failed attempts | P2 | N | — | AC5 |
| TC-LOGIN-10 | Disabled account shows "Account disabled." and is not authenticated | P1 | N | — | AC6 |
| TC-LOGIN-11 | Login inputs have accessible labels | P2 | C | 87 | — |
| TC-LOGIN-12 | Tab order follows visual order | P3 | C | 18 | — |
| TC-LOGIN-13 | Input padding and button width render correctly per browser | P3 | C | 19, 20 | — |

> TC-LOGIN-7 / TC-LOGIN-8 are destructive on a shared instance. Register a throwaway
> account first (test plan §4.3). Social login (upstream AC1, AC10) and TOTP
> (AC7–AC9) are **out of scope** — absent from this build.

## 12. Forgot Password

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-FPW-1 | Forgot-password link opens a form with an email input | P2 | N | — | AC1 |
| TC-FPW-2 | Email format is validated | P2 | C | 25 | AC2 |
| TC-FPW-3 | Registered email triggers reset and a confirmation that fades after 3s | P2 | N | — | AC3 |
| TC-FPW-4 | Unregistered email shows an error | P2 | N | — | AC4 |
| TC-FPW-5 | Button font and width render consistently per browser | P3 | C | 22, 24 | — |
| TC-FPW-6 | Email input padding renders correctly in Chrome | P3 | C | 23 | — |

## 13. Customer Profile

Route: `#/account/profile`

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-PROF-1 | Profile page shows the current account details | P1 | C | 36, 37 | AC1 |
| TC-PROF-2 | All eight editable fields are editable | P2 | N | — | AC2 |
| TC-PROF-3 | Email field is read-only | P2 | N | — | AC3 |
| TC-PROF-4 | Valid update saves and confirms, fading after 5s | P1 | C | 38 | AC4 |
| TC-PROF-5 | First and Last name display in their own fields | P1 | C | 36 | AC1 |
| TC-PROF-6 | City field shows the stored city, not "City not found" | P2 | C | 37 | AC1 |
| TC-PROF-7 | Updating address fields does not error or 404 | P1 | C | 38 | AC4 |

## 14. Change Password

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CPW-1 | Form shows current, new and confirm password fields | P1 | N | — | AC1 |
| TC-CPW-2 | Strength indicator behaves as on registration | P2 | N | — | AC2 |
| TC-CPW-3 | Mismatched confirmation shows "Passwords do not match." | P1 | N | — | AC3 |
| TC-CPW-4 | Wrong current password is rejected with its message | P1 | N | — | AC4 |
| TC-CPW-5 | New password identical to current is rejected | P2 | N | — | AC5 |
| TC-CPW-6 | Successful change confirms and logs out after 5s | P1 | N | — | AC6 |
| TC-CPW-7 | Changed password works on the next login | P1 | C | 39 | AC6 |

> TC-CPW-7 is the functional check for defect #39 (password stored unhashed, so the
> new password cannot be used). Highly destructive on a shared account — use a
> throwaway registered account only.

## 15. Favorites

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-FAV-1 | Favorites page lists image, name and 250-char truncated description | P2 | N | — | AC1 |
| TC-FAV-2 | Empty favorites shows an appropriate message | P3 | N | — | AC2 |
| TC-FAV-3 | Deleting a favorite removes it and refreshes the list | P2 | N | — | AC3 |

## 16. Invoices

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-INV-1 | Invoice list shows number, street, date, total and details link | P2 | N | — | AC1 |
| TC-INV-2 | Invoice list is paginated | P2 | C | 13 | AC1 |
| TC-INV-3 | Invoice detail shows number, date and total | P1 | N | — | AC2 |
| TC-INV-4 | Billing address fields show their stored values | P1 | C | 15, 16 | AC2 |
| TC-INV-5 | Payment method and details are shown | P1 | C | 14 | AC2 |
| TC-INV-6 | Line items show quantity, name, price and line total | P1 | N | — | AC2 |
| TC-INV-7 | Non-existent or foreign invoice shows "not found" | P1 | C | 78 | AC3 |
| TC-INV-8 | Discounted invoice shows subtotal, discount and final total | P2 | N | — | AC4 |
| TC-INV-9 | Discounted line item shows original and discounted price | P2 | N | — | AC5 |
| TC-INV-10 | City and Country appear in their correct fields | P1 | C | 15 | AC2 |
| TC-INV-11 | Address fields never render "undefined" | P1 | C | 16 | AC2 |

PDF download (upstream AC6–AC8) is **out of scope** — absent from this build.

## 17. Messages

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-MSG-1 | Messages list shows subject, truncated message, status, date, link | P2 | N | — | AC1 |
| TC-MSG-2 | Status badge renders NEW / IN_PROGRESS / RESOLVED | P3 | N | — | AC1 |
| TC-MSG-3 | Message detail shows the original message and its replies | P2 | N | — | AC2 |
| TC-MSG-4 | Submitting a reply adds it to the thread | P2 | N | — | AC3 |

## 18. Contact Form

Route: `#/contact`

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CONT-1 | Logged-in user's name and email are auto-filled and hidden | P2 | N | — | AC1 |
| TC-CONT-2 | Guest sees required first name, last name and email fields | P2 | N | — | AC2 |
| TC-CONT-3 | Subject dropdown lists the six documented options | P1 | C | 60 | AC3 |
| TC-CONT-4 | Message field requires at least 50 characters | P2 | N | — | AC3 |
| TC-CONT-5 | Attachment accepts a valid `.txt` file | P2 | C | 70 | AC4 |
| TC-CONT-6 | Non-`.txt` file shows "File should have a txt extension." | P2 | C | 68, 69 | AC5 |
| TC-CONT-7 | File of the wrong size shows "File should be empty." | P2 | C | 70 | AC6 |
| TC-CONT-8 | Valid submission confirms and sends the email | P1 | N | — | AC7 |
| TC-CONT-9 | Subject dropdown shows no "Error 101"/"Error 202" entries | P1 | C | 60 | AC3 |
| TC-CONT-10 | Message placeholder text is spelled correctly | P3 | C | 62 | — |
| TC-CONT-11 | Labels, padding, fonts and button width render per browser | P3 | C | 63–67 | — |
| TC-CONT-12 | Tab order follows visual order | P3 | C | 61 | — |

> TC-CONT-5 / 6 / 7 depend on resolving open question 2 in the test plan — the
> upstream attachment rule and defect #70 contradict each other.

## 19. Admin

Route: `#/admin/dashboard` (admin role required)

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-ADM-1 | Dashboard shows the sales bar chart and recent invoices | P2 | N | — | AC1 |
| TC-ADM-2 | Products can be listed, created, edited and deleted | P1 | N | — | AC2 |
| TC-ADM-3 | Categories CRUD including optional parent category | P2 | N | — | AC3 |
| TC-ADM-4 | Brands CRUD | P2 | N | — | AC4 |
| TC-ADM-5 | Orders can be listed and viewed | P1 | N | — | AC5 |
| TC-ADM-6 | Order status can be set to each of the five values | P1 | N | — | AC5 |
| TC-ADM-7 | Users can be listed, viewed, edited and deleted | P1 | N | — | AC6 |
| TC-ADM-8 | Disabling a user immediately blocks their login | P1 | N | — | AC7 |
| TC-ADM-9 | Re-enabling a user restores their access | P1 | N | — | AC7 |
| TC-ADM-10 | Messages can be viewed and replied to | P2 | N | — | AC8 |
| TC-ADM-11 | Reports show monthly sales, weekly sales and statistics | P2 | C | 77 | AC9 |
| TC-ADM-12 | Non-admin cannot reach admin routes | P1 | C | 83 | — |

> Admin CRUD on a shared public instance is destructive and visible to other users.
> Prefer creating and then removing your own records; avoid editing seeded data.

## 20. Chat Widget

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-CHAT-1 | Chat toggle opens a window with the four-option menu | P2 | N | — | AC1 |
| TC-CHAT-2 | Find Product returns up to 5 matching product cards | P2 | N | — | AC2 |
| TC-CHAT-3 | View Product navigates to the detail page | P2 | N | — | AC2 |
| TC-CHAT-4 | Order Product adds the chosen quantity to the cart | P2 | N | — | AC3 |
| TC-CHAT-5 | Custom quantity accepts 1–999 | P3 | N | — | AC3 |
| TC-CHAT-6 | Checkout walks through cart, details, address, payment, confirmation | P1 | N | — | AC4 |
| TC-CHAT-7 | Checkout with an empty cart shows "Your cart is empty" | P3 | N | — | AC5 |
| TC-CHAT-8 | Support collects subject, 50-char message and optional `.txt` | P2 | N | — | AC6 |

## 21. Discounts

| ID | Title | Pri | Intent | Defect | AC |
|---|---|---|---|---|---|
| TC-DISC-1 | Geo-location discount applies the correct rate per city | P1 | N | — | Geo AC1 |
| TC-DISC-2 | Discounted price shows struck-through original | P2 | N | — | Geo AC2 |
| TC-DISC-3 | Unsupported location applies no discount | P2 | N | — | Geo AC3 |
| TC-DISC-4 | Cart line item uses the discounted price | P1 | N | — | Geo AC4 |
| TC-DISC-5 | Mixed rental + non-rental cart applies 15% | P1 | N | — | Comb AC1 |
| TC-DISC-6 | Cart shows subtotal, 15%, discount amount and total | P1 | C | 8 | Comb AC2 |
| TC-DISC-7 | Removing one product type removes the 15% | P2 | N | — | Comb AC3 |
| TC-DISC-8 | Invoice reflects subtotal, discount and final total | P1 | N | — | Comb AC4 |

Geo rates: New York 5%, Mumbai 10%, Tokyo 15%, Amsterdam 20%, London 25%.
Geo-location testing requires browser-context geolocation override plus the
corresponding permission grant.

## 22. API — REST and GraphQL

These cover the documented security defects; all are conformance tests expected to
fail while the defects stand. See the register for OWASP mapping.

| ID | Title | Pri | Intent | Defect |
|---|---|---|---|---|
| TC-API-1 | `GET /users/{id}` rejects reading another user's record | P1 | C | 71 |
| TC-API-2 | Access/refresh token lifetimes are reasonable | P1 | C | 72 |
| TC-API-3 | `users` responses hide `enabled` and `failed_login_attempts` from non-admins | P1 | C | 73 |
| TC-API-4 | `DELETE /brands/{id}` requires an admin token | P1 | C | 74 |
| TC-API-5 | `products` responses hide stock from non-admins | P2 | C | 75 |
| TC-API-6 | `DELETE /products/{id}` requires an admin token | P1 | C | 76 |
| TC-API-7 | `reports` rate limiter does not return 429 under normal use | P2 | C | 77 |
| TC-API-8 | `GET /invoices` returns only the token owner's invoices | P1 | C | 78 |
| TC-API-9 | `POST /users/login` is not vulnerable to SQL injection | P1 | C | 79 |
| TC-API-10 | `GET /logs/laravel.log` is not publicly accessible | P1 | C | 80 |
| TC-API-11 | `POST /invoices` rejects client-supplied amount/price | P1 | C | 81 |
| TC-API-12 | Resource IDs are non-sequential and unguessable | P2 | C | 82 |
| TC-API-13 | Wrong-role request returns 403, not 401 | P2 | C | 83 |
| TC-API-14 | Swagger documentation is reachable and matches the live contract | P3 | N | — |
| TC-API-15 | GraphQL and REST return consistent data for the same entity | P2 | N | — |
| TC-API-16 | JWT-guarded GraphQL fields reject unauthenticated access | P1 | N | — |

> TC-API-9 (SQL injection via appending `' -- ` to the email) and TC-API-11 modify or
> bypass data. Run them only against this intentionally vulnerable practice target.

## 23. Accessibility

| ID | Title | Pri | Intent | Defect |
|---|---|---|---|---|
| TC-A11Y-1 | Link text meets the 4.5:1 contrast minimum | P2 | C | 85 |
| TC-A11Y-2 | Checkout wizard labels meet contrast minimum | P2 | C | 86 |
| TC-A11Y-3 | Login form inputs have labels | P2 | C | 87 |
| TC-A11Y-4 | Checkout address form inputs have labels | P2 | C | 88 |
| TC-A11Y-5 | Checkout payment form inputs have labels | P2 | C | 89 |
| TC-A11Y-6 | Checkout login form inputs have labels | P2 | C | 90 |
| TC-A11Y-7 | Product detail quantity input has a label | P2 | C | 91 |
| TC-A11Y-8 | Product images have alt text | P2 | C | 92 |
| TC-A11Y-9 | Product overview search form has labels | P2 | C | 93 |
| TC-A11Y-10 | Filter groups use a fieldset with a legend | P3 | C | 94 |
| TC-A11Y-11 | All interactive elements are keyboard reachable in visual order | P2 | C | 18, 53, 61 |

## 24. Email

| ID | Title | Pri | Intent | Defect |
|---|---|---|---|---|
| TC-MAIL-1 | Registration confirmation email is sent | P2 | N | — |
| TC-MAIL-2 | Checkout confirmation email is sent | P2 | N | — |
| TC-MAIL-3 | Forgot-password email contains the new password | P2 | N | — |
| TC-MAIL-4 | Email branding/logo is used consistently | P3 | C | 84 |

Email assertions need a mail sink. MailHog exists only in a local Docker deployment,
so against the hosted target these are **manual or deferred** unless a local instance
is used.

---

## Coverage summary

| Area | Cases | Automated |
|---|---|---|
| Product Overview | 22 | 1 (TC-PO-1, smoke) |
| Navigation & Header | 5 | 0 |
| Product Category | 6 | 0 |
| Product Detail | 18 | 0 |
| Rentals | 7 | 0 |
| Checkout — Cart | 12 | 0 |
| Checkout — Sign In | 4 | 0 |
| Checkout — Address | 10 | 0 |
| Checkout — Payment | 14 | 0 |
| Registration | 14 | 0 |
| Login | 13 | 0 |
| Forgot Password | 6 | 0 |
| Profile | 7 | 0 |
| Change Password | 7 | 0 |
| Favorites | 3 | 0 |
| Invoices | 11 | 0 |
| Messages | 4 | 0 |
| Contact Form | 12 | 0 |
| Admin | 12 | 0 |
| Chat Widget | 8 | 0 |
| Discounts | 8 | 0 |
| API | 16 | 0 |
| Accessibility | 11 | 0 |
| Email | 4 | 0 |
| **Total** | **234** | **1** |

This is a test-design inventory, not a commitment to automate all of it. Sequence by
priority: P1 checkout, authentication and API-security cases first.
