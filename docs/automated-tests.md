# Automated tests

Every test asserts the documented behaviour (see [test plan §4.1](test-plan.md)). A test of broken functionality
fails and stays red until the product is fixed; the cases are in [test cases](test-cases.md), the defects in
[known defects](known-defects.md) and the written bug reports in [bug reports](bug-reports/).

## UI specs

20 spec files, with the cases each covers and which are red.

| Spec | Cases | Covers | Tag |
|---|---|---|---|
| `HomeTests.spec.ts` | 1 | Home page loads with the product catalog | `@smoke` |
| `NavigationTests.spec.ts` | TC-NAV-1, 3, 4, 5 | Home link, category menu entries, signed-in name in the header, guarded routes. **TC-NAV-1, 3 and 4 are red** (defects 29, 3, 32) | `@smoke`, `@regression` |
| `ProductOverviewTests.spec.ts` | TC-PO-1 to 9, 11 to 17 | Search and its limits, category and brand filters, opening a product card, pagination, sort options, price range, discount and out-of-stock on the cards. **TC-PO-13 and 15 are red** (known defects); **TC-PO-6 and 9 are red** (local findings) | `@smoke`, `@regression` |
| `ProductDetailTests.spec.ts` | TC-PD-1 to 12, 14, 16, 17 | Details shown, discount, quantity selector and limits, plus and minus buttons, add to cart, out of stock, rental slider, favorites, accessible label and alt text. **TC-PD-4, 5, 8, 12, 16 and 17 are red** (defects 40, 43, 41, 91, 92); **TC-PD-7 is red** (local finding) | `@smoke`, `@regression` |
| `CategoryTests.spec.ts` | TC-CAT-1, 3, 4 | Only the category's products, the filter set, the Chainsaws entry. **TC-CAT-3 is red** (local finding); **TC-CAT-4 is red** (defect 3) | `@smoke`, `@regression` |
| `RentalTests.spec.ts` | TC-RENT-1 to 5 | Rentals page and its cards, duration slider and total, rental label in the cart, location discount. **TC-RENT-1 and 5 are red** (local findings) | `@smoke`, `@regression` |
| `LoginTests.spec.ts` | TC-LOGIN-1..5, 7, 8, 10 | Form fields, invalid credentials message, customer and admin sign-in redirects, empty-form validation, locking after 3 failures, disabled account. **TC-LOGIN-5 and 8 are red** (known defects; the local build never locks) | `@regression`, sign-ins `@smoke` , TC-LOGIN-10 `@local` |
| `ChangePasswordTests.spec.ts` | TC-CPW-1, 3, 4, 6, 7 | Form fields, mismatched confirmation, wrong current password, successful change and logout, the new password on the next login. **TC-CPW-1, 3 and 7 are red** (TC-CPW-7: defect 39) | `@smoke`, `@regression` |
| `ProfileTests.spec.ts` | TC-PROF-1, 4, 5, 7 | Account details, valid update with its fading confirmation, first and last name fields, address update. **All four are red** (defects 36, 37, 38) | `@regression` |
| `CartTests.spec.ts` | TC-CART-1, 2, 4, 5, 7, 8, 10, 11 | Cart table, quantity change, delete, totals, proceed to checkout, the 15% combination discount. **All but TC-CART-8 are red** (known defects; no combination discount locally) | `@smoke`, `@regression` |
| `ContactTests.spec.ts` | TC-CONT-3, 8, 9 | Subject options, no error entries among them, a valid guest message with its confirmation and mail in the local inbox. **All three are red** (defect 60, TC-CONT-3 also on the story's "Status of order" wording; the mail is never delivered locally) | `@regression`, TC-CONT-8 `@local` |
| `ChatWidgetTests.spec.ts` | TC-CHAT-6 | Chat checkout: a customer signing in from the chat reaches the order number; the guest route is **red** (the local build does not offer it) | `@smoke`, `@regression` |
| `DiscountTests.spec.ts` | TC-DISC-1, 4, 5, 6, 8 | Location discount per city through the browser's geolocation, discounted cart line, combination discount in the cart and on the invoice. **All but TC-DISC-4 are red** on the local build | `@smoke`, `@regression` |
| `CheckoutTests.spec.ts` | TC-CSI-1..3, TC-CBA-1, 3, 4, TC-CPAY-1, 4, 7, 12, 13 | Guest sign-in step, billing address fields and validation, proceeding to payment, payment methods, credit card form and expiry check, placing an order, cart cleared afterwards. **TC-CBA-1 and TC-CPAY-1, 4, 7 are red** (known defects) | `@smoke`, `@regression` |
| `RegistrationTests.spec.ts` | TC-REG-1, 7, 8, 9 | Field labels, duplicate-email message without a password hint, a valid registration that lands on login and can sign in. **TC-REG-1, 7, 8 are red** (known defects) | `@smoke`, `@regression` |
| `InvoiceTests.spec.ts` | TC-INV-3, 4, 5, 6, 7, 10, 11 | Invoice detail shows number, date, total, line items, billing address, payment details, and "not found" for a missing or foreign invoice. **TC-INV-4, 5, 7, 10 and 11 are red** (defects 14, 15, 16; TC-INV-7 a local finding) | `@smoke`, `@regression` |
| `AdminProductTests.spec.ts` | TC-ADM-2 | Admin creates, edits and deletes a product. **Red locally** (suspected: the edited price is not stored) | `@regression` |
| `AdminOrderTests.spec.ts` | TC-ADM-5, 6 | Orders are listed and viewed; the initial status, then each of the other four | `@smoke`, `@regression` |
| `AdminUserTests.spec.ts` | TC-ADM-7, 8, 9 | Admin lists, edits and deletes a user; disabling and re-enabling decide whether the user can sign in. **All three red locally** (suspected: the user edit is refused with 422) | `@regression`, TC-ADM-9 `@local` |
| `AdminAccessTests.spec.ts` | TC-ADM-12 | A customer is sent to login from every admin route; an admin-only API call must answer 403. **Red** (defect 83) | `@regression` |

The admin specs need `APP_ADMIN_USERNAME` and `APP_ADMIN_PASSWORD`; the setup project skips the admin sign-in without them, and the admin specs then fail with "No saved session".

## API specs

10 spec files in `tests/api`, the browserless `api` project.

| Spec | Tests | Covers |
|---|---|---|
| `catalog/BrandApiTests.spec.ts` | 2 | Brand creation and read-back, brand required-field rejection |
| `catalog/CategoryApiTests.spec.ts` | 3 | Category creation and read-back, listing and search, category required-field rejection |
| `catalog/ProductApiTests.spec.ts` | 5 | Product creation and read-back, required-field rejection, restocking, a search matching nothing, an unknown product id (404) |
| `accounts/CustomerAccountApiTests.spec.ts` | 6 | Registration and login, duplicate email (409), wrong password (401), two failures do not lock, three failures lock (423), disabled account (403, needs `APP_DB_LOCAL`). **The lock test is red** on the local build, which never locks; where defect 21 applies (locks after one failure) the two-failures test is red instead |
| `security/UserSecurityApiTests.spec.ts` | 4 | TC-API-1, 2, 3, 9: another customer's record, token lifetimes, admin-only fields hidden, injected email. **All four are red** (known defects) |
| `security/CatalogSecurityApiTests.spec.ts` | 2 | TC-API-4, 6: brand and product delete without a token. **Both red** |
| `security/InvoiceSecurityApiTests.spec.ts` | 2 | TC-API-8, 11: invoice list scoped to its owner, forged unit price and total. **Both red** |
| `security/ServerExposureApiTests.spec.ts` | 2 | TC-API-10, 16: public log file (**red**), guarded GraphQL fields refuse unauthenticated queries |
| `contact/ContactApiTests.spec.ts` | 6 | `POST /messages` as a guest and as a customer, read-back and listing, missing fields, over-long text, invalid email (**red**: the local build accepts it), the list requires sign-in |
| `invoices/InvoiceApiTests.spec.ts` | 5 | `POST /invoices` issues a number and date; `GET /invoices/{id}` returns the stored billing address, payment and total, and the line items; `GET /invoices` lists the owner's invoice; a create without required fields is rejected |

Every request the service classes in `src/apis/` send has at least one API test, except the local mail inbox read,
which TC-CONT-8 covers. The `accounts`, `catalog`, `contact`
and `invoices` specs are not part of the `docs/test-cases.md` inventory: they check the calls the UI specs seed
their data through, the login status codes and the call behind the contact form. The `security` specs automate ten of the §22 cases (TC-API-1, 2, 3,
4, 6, 8, 9, 10, 11, 16) and only run meaningfully against the local stack, since they attack the target.

They are `@regression`, except the disabled-account test (`customer-account-api-6`), which is `@local` because it needs the database. Run only these with `npx playwright test --project=api`. UI specs sign in through the setup project
(see [Signed-in tests](../README.md#signed-in-tests)), seed their own data through the API and leave disposable records behind.

## Not automated yet

See [Not automated yet](../README.md#not-automated-yet) in the README.
