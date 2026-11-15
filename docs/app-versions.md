# App versions

The suite runs against four environments, which run two builds of the application
(`src/config/builds.ts`):

| Environment | Build | Where |
|---|---|---|
| `local` | with the deliberate defects | Docker on `localhost:4200` |
| `hosted-with-bugs` | with the deliberate defects | https://with-bugs.practicesoftwaretesting.com |
| `local-fixed` | fixed | Docker on `localhost:4200` |
| `hosted` | fixed | https://practicesoftwaretesting.com |

Observed on 2026-11-14, from full runs of the `api` and `chromium` projects on each environment (the hosted
environments with `--workers=2 --grep-invert @local`). Each build gave the same result on both of its environments,
apart from the few hosted differences listed under [Hosted and local](#hosted-and-local).

The differences between the builds fall into three groups:

- **A — fixed defects.** A test is red on the with-bugs build and green on the fixed build because the defect it
  covers is fixed there. Nothing changes in the suite: the test asserts the documented behaviour on both builds.
- **B — real changes.** The fixed build is a newer version of the application: other routes, field names, an address
  form with a postcode lookup, a server-side cart. Page and service classes absorb these through `byBuild()`
  (`src/utils/AppEnvironment.ts`), and test data through a `<name>.fixed.json` overlay (`src/utils/TestData.ts`).
  Code comments cite the numbers below (B1, B2, …).
- **C — still red on the fixed build.** Open findings and test issues. These tests keep failing until the behaviour
  is fixed ([test plan §4.1](test-plan.md)); no build-specific value hides them.

`byBuild()` is only for B. It never selects a value that makes a defect pass.

## Results

| Environment | Passed | Failed | Skipped |
|---|---|---|---|
| `local` | 74 | 73 | 2 |
| `hosted-with-bugs` | 72 | 71 | 2 |
| `local-fixed` | 133 | 16 | 0 |
| `hosted` | 123 | 20 | 2 |

`local` and `local-fixed` run 149 tests, the hosted environments 145 (without `@local`). The hosted counts leave out
public-instance hiccups that passed on a rerun: three 500s on `hosted-with-bugs` and one connection reset on
`hosted` (TC-CPAY-1).

The `local-fixed` row is from 2026-11-15, with the demo admin login and the stack's queue worker (B15): its 16
failures are exactly the cases in C. The other rows come from runs on 2026-11-14 without admin credentials
(`APP_ADMIN_USERNAME`, `APP_ADMIN_PASSWORD`): the six admin UI tests (TC-ADM-2, 5, 6, 7, 8, 9) failed with "No saved
session", and the admin setup and TC-LOGIN-3 were skipped. The admin specs were run separately on `local` on
2026-11-15: TC-ADM-5 and 6 pass and TC-ADM-2, 7, 8, 9 and 12 fail on their recorded causes. The tables below include
these results.

## A. Fixed defects

Red on the with-bugs build, green on the fixed build. Defect numbers are from the
[known defects register](known-defects.md); "—" means a local finding recorded in [test cases](test-cases.md).

| Case | Defect | Test |
|---|---|---|
| TC-API-1 | 71 | A customer cannot read another customer's record |
| TC-API-2 | 72 | Access and refreshed token lifetimes are reasonable |
| TC-API-3 | 73 | A customer's own record hides the enabled and failed login attempts fields |
| TC-API-4 | 74 | A brand cannot be deleted without an admin token |
| TC-API-6 | 76 | A product cannot be deleted without an admin token |
| TC-API-8 | 78 | An invoice list shows only the signed-in customer's invoices |
| TC-API-9 | 79 | A login with an injected email is rejected |
| TC-API-10 | 80 | The application log file is not publicly accessible |
| TC-API-11 | 81 | An invoice does not keep a client-supplied unit price and total: refused on the with-bugs build, priced by the server on the fixed build (B7; the wider expectation awaits the case owner's acceptance) |
| customer-account-api-5 | — | Three failed logins lock the account with HTTP 423 |
| contact-api-5 | — | A message with an invalid email address is rejected |
| TC-LOGIN-5 | 17 | Empty email and password are validated client-side |
| TC-LOGIN-8 | 21 | Locked account shows the lock message and API returns HTTP 423 (local-fixed only, see [Hosted and local](#hosted-and-local)) |
| TC-REG-1 | 52 | All required registration fields are displayed |
| TC-REG-8 | 50 | The duplicate-email error reveals no password hint |
| TC-PROF-1, 4, 5, 7 | 36, 37, 38 | Profile details, names in their own fields, updates save |
| TC-CPW-7 | 39 | Changed password works on the next login |
| TC-NAV-1 | 29 | Home link navigates to the home page |
| TC-NAV-3, TC-CAT-4 | 3 | The fourth category entry opens its page (the fixed build calls it "Special Tools") |
| TC-NAV-4 | 32 | Signed-in user's name is displayed in the header |
| TC-PO-1 | 26 | Product grid cards show image, name and price |
| TC-PO-9 | — | Checking a parent category checks its children |
| TC-PO-13 | 2, 33 | Each sort option orders the grid correctly |
| TC-PO-15 | 27 | The price range filters the grid |
| TC-PD-4, TC-PD-5 | 40 | Plus and minus change the quantity |
| TC-PD-8 | 43 | Add to cart adds the selected quantity |
| TC-PD-12 | 41 | Add to favourites succeeds |
| TC-PD-16 | 91 | The quantity input has an accessible label |
| TC-PD-17 | 92 | Product images have alt text |
| TC-RENT-5 | — | The location discount applies to rentals |
| TC-CART-2, 4, 5, 7 | 1, 7, 8 | Quantity changes, deletion and totals |
| TC-CART-10, TC-CART-11 | — | The rental plus tool cart gets the 15% combination discount |
| TC-CBA-1 | 10 | All required address fields are displayed |
| TC-CBA-4b | 11 | The billing address step names its Proceed button |
| TC-CPAY-1, 4, 7 | 12 | Payment methods and the credit card fields |
| TC-DISC-5, 6 | — | The combination discount in the cart |
| TC-INV-4, 10, 11 | 15, 16 | Invoice billing address fields |
| TC-INV-5 | 14 | Invoice payment details |
| TC-INV-7 | 78 | An unknown invoice shows "not found" |
| TC-CONT-8 | — | A valid contact submission sends the mail (on `local-fixed`, where the stack's queue worker sends it within seconds, see B15; the hosted environments have no inbox) |
| TC-CONT-9 | 60 | The subject dropdown has no Error 101 or Error 202 entries |
| TC-CHAT-6b | — | The chat asks a guest for email and name before the address |
| TC-ADM-7, 8, 9 | — | An admin can save an edited user, and disabling or re-enabling the account takes effect ([report](bug-reports/admin-user-save-refused-phone.md)) |
| TC-ADM-12 | 83 | A customer token gets 403 on an admin-only call |

## B. Real changes between the builds

| # | Area | With-bugs build | Fixed build | Handled in |
|---|---|---|---|---|
| B1 | Routing | Hash routes (`/#/checkout`) | Path routes (`/checkout`) | `applications.app.routes` |
| B2 | Header | Account menu `nav-user-menu` / `nav-admin-menu`; category entry `nav-robotic-tools` | One account menu `nav-menu`; category entry `nav-other` | `HeaderPage` |
| B3 | Address | `address`, `postcode`; registration sends flat fields | `street`, `house_number`, `postal_code`; registration sends a nested `address` object; the country comes first and a postcode lookup fills street, city and state | `RegisterPage`, `ProfilePage`, `CheckoutAddressPage`, `InvoiceDetailPage`, `AdminOrderPage`, `ApisUserAccount` |
| B4 | Categories API | `GET /categories/{id}` | `GET /categories/tree/{id}` (the plain read is gone, 405) | `ApisCategories` |
| B5 | Products API | Public reads show `stock` | Public reads show `in_stock` only (defect 75 fixed) | `ApisProducts` |
| B6 | GraphQL | List fields return arrays | List fields return paginators | `ApisGraphql`, GraphQL queries in test data |
| B7 | Orders | The cart lives in the browser; `POST /invoices` takes the lines and the client's total | A server cart: `POST /carts`, `POST /carts/{id}` per product, then `POST /invoices` with `cart_id`, `billing_street`, `billing_postal_code` and `payment_details` (bank transfer: `bank_name`, `account_name`, `account_number`). The server prices the order and checks city and state against the postcode. Ids are ULIDs (strings). The UI and the chat ask for the bank name too | `ApisInvoices`, `ProductDetailPage.addToCart`, `CheckoutPaymentPage`, `ChatWidgetPage.answerQuestions`, the account fields of `InvoiceDetailPage` and `AdminOrderPage` (label only), the user update call `AdminUserFormPage.save` waits for, id parameters widened to `number \| string` |
| B8 | Eco discount | None | Products rated CO₂ A or B get 5% off at checkout, so seeded products use rating D | Test data |
| B9 | Geolocation | Handshake keys in `sessionStorage` | In `localStorage` | `GEOLOCATION_SESSION_KEYS` |
| B10 | Sign-in | Token in `sessionStorage` | Token `auth-token` in `localStorage` | `AuthSession`, `auth.sessionArea` |
| B11 | Messages | `.toast` | ngx-toastr (`.ngx-toastr .toast-message`) | `ProductDetailPage` |
| B12 | Checkout sign-in | Heading "Customer login" | Heading "Login"; guest checkout fields | `CheckoutSignInPage` |
| B13 | Pagination | ngx-pagination: `nav[aria-label=Pagination]`, current page `li.current`, links "page N" | An unlabelled `ul.pagination`, buttons named `Page-N`, current page `li.active` | `HomePage`, `CategoryPage` |
| B14 | Cart lines | One price per line | A location offer shows the list price struck through and the offer price after it, and the offer badge sits inside the product title. The discount row has empty spacer cells before its label | `CartPage` |
| B15 | Mail | Sent at once | Queued; a cron job works the queue once a minute (with a short queue, a contact mail arrived ~50 s after the submission). On the local stack the cron image runs emulated (arm64) and works about 12 jobs a minute, so after a full run's orders and registrations (200+ jobs) a new mail waited many minutes. `scripts/app.mjs` therefore adds a native queue worker to the `local-fixed` stack (environment provisioning, like the mail sink), and mail leaves within seconds | `ApisMailInbox.deliveryBudgetMs`, `QUEUED_MAIL_MS`, the `queue-worker` service of `scripts/app.mjs` |

Observed values that differ are test data, in the `*.fixed.json` overlays under `resources/testData/`. An overlay
never replaces a text a story or a bug report specifies: those tests stay red where the build shows other text (C).
Two overlays await the case owner's acceptance, because the case names the with-bugs value: the registration labels
(TC-REG-1) and "Special Tools" for the fourth category (TC-CAT-4, TC-NAV-3, whose case title names "Chainsaws").

| Overlay | Value | With-bugs build | Fixed build |
|---|---|---|---|
| `RegistrationTestJsonFile` | Field labels | "Date of birth", "Address", "Postcode", "E-mail address" | "Date of Birth *", "Street", "House number" (new field), "Postal code", "Email address" |
| `ProductDetailTestJsonFile` | Out-of-stock colour | `rgb(220, 53, 69)` | `rgb(202, 11, 0)` |
| `ProductOverviewTestJsonFile` | CO₂ sort labels | "CO₂ Rating (Best First)" / "(Worst First)" | "CO₂ Rating (A - E)" / "(E - A)" |
| `CategoryTestJsonFile`, `NavigationTestJsonFile` | Fourth category | "Chainsaws" | "Special Tools" |
| `NavigationTestJsonFile` | A Hand Tools product on page 1 | "Combination Pliers" | "Claw Hammer" (another product order) |
| `InvoiceApiTestJsonFile` | Required invoice fields | `user_id`, `billing_address`, `billing_city`, `billing_country`, `total` | `billing_street`, `billing_city`, `billing_country`, `payment_method`, `payment_details`, `cart_id` |
| `ChatWidgetTestJsonFile` | Bank transfer questions | account name, account number | bank name, account holder name, account number |

Because the fixed build checks city and state against the postcode (B7), seeded orders and checkout data use
addresses the lookup returns, which both builds accept: postcode `1234AA` (street "de Bruijnsingel", city "Idaerd",
state "Limburg") and `3511AB` (city "Einighausen", state "Groningen"). The lookup data is the same on `hosted` and
`local-fixed`.

## C. Still red on the fixed build

`scripts/quality-dashboard.mjs` reads this table as the recorded reason for a failure on the fixed build, so keep
its three columns; a Case cell may name several cases (`TC-ADM-7, 8, 9`).

| Case | Red on | Observation |
|---|---|---|
| TC-CAT-3 | both builds | The fixed category page has no price-range filter, so its filters differ from the product overview's |
| TC-PD-7 | both builds | The quantity input caps manual entry at 99 |
| TC-PO-6 | both builds | A search keeps the selected sort |
| TC-RENT-1 | both builds | The seeded rentals are not all on the first page once other runs have added rentals: a test design issue, not an application finding |
| TC-CART-1 | both builds | The last column of the cart table has no "Actions" header |
| TC-DISC-1 | both builds | No New York badge |
| TC-CONT-3 | both builds | The subject is "Status of my order", the story says "Status of order" (the with-bugs build also lists Error 101 / 202, defect 60) |
| TC-CPW-3 | both builds | The page shows the server's "The new password field confirmation does not match." instead of "Passwords do not match." ([report](bug-reports/change-password-mismatch-message.md)) |
| TC-REG-7 | both builds | The duplicate-email error is not "Email is already in use." (AC5): the with-bugs build reveals a password hint (defect 50), the fixed build says "A customer with this email address already exists." |
| TC-LOGIN-10 | both builds | The fixed build says "Account disabled" without the full stop AC6 quotes (`@local`; needs the database credentials) |
| TC-DISC-8 | both builds | The with-bugs build applies no combination discount. On a discounted invoice the fixed build gives the subtotal, discount and total fields the same test id `total`, labels the discount "Discount (15%)" instead of "Discount amount", and points all three labels at the total field, so no field is named Subtotal |
| TC-ADM-2 | both builds | The with-bugs build saves the edit, but the list keeps showing the old price ([report](bug-reports/admin-product-list-stale-after-save.md)). The fixed build's edit form opens with Stock, Brand, Category and Image empty, because `GET /products/{id}` no longer returns them (B5), so saving an edit fails with "Quantity is required". Creating a product works on both |
| TC-CBA-3 | fixed only | Clearing the street disables Proceed, but no error message names the field |
| TC-CPAY-13 | fixed only | After an order the cart page shows no "cart is empty" message; it appears only after removing items by hand |
| TC-DISC-4 | fixed only | A location offer at 80.00 shows as "$80", without cents (other prices keep them, "$38.73") |
| TC-CHAT-6a | fixed only | After signing in through the chat, the chat sends the order without the token: `POST /invoices` answers 401 and the chat says "Unauthorized" |

Seen on the fixed build but not covered by a test:

- A bank transfer without a bank name answers 500 "Something went wrong" instead of a 422 validation error.
- At checkout, the postcode lookup replaces the customer's saved street with the street it looks up.

## Hosted and local

`hosted` runs a newer release of the fixed build than the `local-fixed` images. Same API contract (identical
OpenAPI documents) and the same postcode lookup data, but:

- The profile page adds a two-factor authentication section and loads the account more slowly. A password change
  submitted before the account has loaded throws in the browser and sends nothing, so `openProfileAsNewCustomer`
  (`src/helpers/CustomerFlows.ts`) hands the page over only once the profile shows the account's email — the
  same wait the profile edit tests already used.
- TC-LOGIN-8 is red on `hosted` only: after three failed logins the API answers 423, but the login page shows
  "Invalid email or password" instead of the lock message.
- The public instances answer an occasional 500 under load (seen on `hosted-with-bugs`: creating a brand, listing
  rentals); a rerun passes. They are not findings.

## Rechecking

```sh
node scripts/app.mjs up --env local-fixed      # switches the stack; drops the other build's volumes
TEST_ENV=local-fixed AUTO_ALLURE_OPEN=false npx playwright test --project=api --project=chromium
TEST_ENV=hosted AUTO_ALLURE_OPEN=false npx playwright test --project=api --project=chromium --workers=2 --grep-invert @local
```

When a build changes, compare its results with the tables above. A new difference is a B item only if both builds
behave as documented and only the structure differs; anything else is a finding (C).
