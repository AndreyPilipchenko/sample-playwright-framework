# Test Plan — Toolshop (with-bugs)

Compiled from the upstream
[Practice Software Testing documentation](https://testsmith-io.github.io/practice-software-testing/)
([source repo](https://github.com/testsmith-io/practice-software-testing)) and verified
against the live target on 2026-11-02.

Organised by **feature area**. Testing targets the latest deployed build of the
application, and only the features actually present in that build are in scope.

---

## 1. Application under test

| Component | URL |
|---|---|
| Application | <https://with-bugs.practicesoftwaretesting.com> |
| REST API | <https://api-with-bugs.practicesoftwaretesting.com> |
| Swagger (REST) | <https://api-with-bugs.practicesoftwaretesting.com/api/documentation> |
| GraphQL / GraphiQL | `/graphql` and `/graphiql` on the API host |

"Toolshop" is an e-commerce demo store (Angular front end, Laravel REST + GraphQL API,
MariaDB). The `with-bugs` build is a deliberately defective variant of the full-feature
store, published for exploratory-testing and bug-reporting practice. It carries
**90+ intentional defects** across UI, API/security and accessibility.

### 1.1 Routing — verified

The build uses **hash-based routing**: `https://.../#/checkout`, `#/auth/login`,
`#/contact`, and so on. Clean (non-hash) URLs such as `/checkout` return **HTTP 404**.

This was confirmed live: every clean path tested returned 404, while the `#/…`
equivalents resolved. Note the upstream release notes claim "hash routing → clean
URLs" — that upgrade is **not** in this build. Any navigation code or documentation
assuming clean URLs will break here.

Route guards were also confirmed working: `#/account`, `#/account/invoices`,
`#/account/favorites` and `#/admin/dashboard` all redirect to `#/auth/login` when
unauthenticated.

### 1.2 Test accounts

Published, shared, non-confidential demo credentials:

| Role | Email | Password |
|---|---|---|
| admin | `admin@practicesoftwaretesting.com` | `welcome01` |
| user | `customer@practicesoftwaretesting.com` | `welcome01` |
| user | `customer2@practicesoftwaretesting.com` | `welcome01` |
| user | `pass123` user — `customer3@practicesoftwaretesting.com` | `pass123` |

Even though these are public, keep them out of committed code and step titles: put
them in the git-ignored `.env` under `APP_LOGIN_USERNAME` / `APP_LOGIN_PASSWORD`, per
this framework's secrets rule. The values above are documentation, not configuration.

> **Shared-state warning.** This is a public instance used concurrently by other
> learners, and these accounts are shared. Account state (profile fields, password,
> favorites, lock status) can be changed by anyone at any time. Tests must not depend
> on a pre-existing account state they did not create themselves — see §4.3.

---

## 2. Scope

Scope is taken from the upstream feature matrix (`docs/features.md`), filtered to the
`with-bugs` column.

### 2.1 In scope

| Area | Notes |
|---|---|
| Product overview | grid, pagination, search, category + brand filters, sorting, price range |
| Product detail | info, quantity selector, add to cart, favorites, related products |
| Product category browsing | per-category page with the same filter set |
| Rentals | rental products and hourly duration |
| Checkout | cart review, sign-in step, billing address, advanced payment methods |
| Discounts | geo-location discount, rental/non-rental combination discount |
| Authentication | login, registration, forgot password, account locking |
| Customer account | profile, change password, favorites, invoices (list + detail), messages |
| Contact form | advanced form with `.txt` file attachment |
| Admin | dashboard, CRUD for products/categories/brands/orders/users/messages, reports |
| Chat widget | find product, order product, checkout, support |
| APIs | REST (Swagger-documented) and GraphQL |

### 2.2 Out of scope — absent from this build

Per the upstream feature matrix, these features exist in the full-feature store but are
**not** in the `with-bugs` build. Do not write test cases against them:

- Two-factor authentication / TOTP
- Social login (Google, GitHub)
- Invoice PDF download
- Multi-language support
- Privacy policy page
- Product comparison and product specifications
- Google Analytics

> Caveat: the upstream release notes also list "cart" among the missing features,
> yet the feature matrix lists the full checkout flow as present and the defect
> register contains cart-specific bugs. The likely reading is that the *server-side
> persistent cart API* (`/carts/…`) is absent while a client-side cart exists.
> **Confirm by exploration before writing cart-API tests** — see Open Questions (§7).

### 2.3 Additional endpoint in this build

| Method | Endpoint | Note |
|---|---|---|
| GET | `/logs/laravel.log` | Application logs exposed over the web — intentional defect #80 |

---

## 3. Test approach

Layered, matching this framework's architecture:

1. **UI (browser) tests** — business flows through page objects. Primary layer.
2. **REST API tests** — contract, authorisation and validation checks; also the fastest
   route to the security defects.
3. **GraphQL tests** — same data model, different surface; useful for cross-checking
   that both APIs agree.
4. **Accessibility checks** — contrast, form labels, alt text, keyboard/tab order.
5. **Exploratory testing** — the upstream docs map defect classes to nine tour types
   (Landmark, Supporting Actor, SuperModel, FedEx, GarbageCollector, Intellectual,
   BadBoy, Links/Typos, Accessibility). Use these for manual sessions; they are the
   documented way to discover the register in §[known defects](known-defects.md).

Browser coverage matters more than usual here: a large share of the intentional
defects are **browser-specific** (Chrome vs Firefox vs Edge layout, padding, tab order,
font and image-loading differences). A Chromium-only suite will structurally miss them.
The framework currently runs Chromium only; Firefox and WebKit projects are commented
out in `playwright.config.ts`.

---

## 4. Testing against a deliberately broken application

This is the defining constraint of this project and it changes how tests must be
written.

### 4.1 Expected-failure policy

Most automated checks that assert *correct* behaviour will **fail**, because the
application is wrong on purpose. Each test must therefore declare its intent:

| Intent | Meaning | Assertion style |
|---|---|---|
| **Conformance** | Asserts the documented acceptance criterion. Expected to FAIL while the matching defect is open. | Assert the AC as specified; link the defect ID. |
| **Characterisation** | Pins the current (buggy) behaviour so regressions are visible. | Assert what the app actually does; comment why. |
| **Neutral** | Behaviour unaffected by any known defect. | Ordinary assertion. |

Record the intent and any defect ID in the test's Allure metadata
(`allure.issue(...)` for a defect, `allure.testCaseId(...)` for the local case ID) so
report readers can tell a real regression from a known bug.

Do **not** weaken a conformance assertion to make the suite green — that destroys the
signal the suite exists to provide. Either let it fail against a linked defect, or
write it deliberately as characterisation.

### 4.2 Avoid asserting on defective surfaces incidentally

Several high-traffic elements carry typo or content defects (`"Contakt"`, `"Sorth"`,
`"Serch"`, `"User Data not found"`, broken logo image). Tests whose real subject is
something else should not assert on those strings, or they will fail for an unrelated
reason. Prefer stable `data-test` attributes — the build exposes them widely
(`nav-home`, `product-name`, `product-price`, `search-query`, `search-submit`, `sort`).

### 4.3 Test independence on shared, mutable data

The instance is public and its data is shared and mutable:

- Create the data a test needs; never rely on seeded records surviving.
- Register a fresh user per test for account-state scenarios rather than reusing the
  shared demo logins — this is mandatory for anything touching password, profile or
  lock state.
- Account locking is destructive and defect #21 locks after **1** failed attempt
  instead of 3. A lock test run against a shared account can block other users and
  other tests. Use a throwaway registered account.
- Clean up what you create where an endpoint allows it.

---

## 5. Risk areas

Ranked by likely impact on this application:

1. **Checkout and payment** — the money path. Cart totals showing `0,00`, a disabled
   delete button, and a broken payment-method dropdown are all known-defective.
2. **Authentication and authorisation** — SQL injection on login, broken object-level
   authorisation, long-lived tokens, wrong status codes.
3. **Data integrity** — profile update writes an unhashed password (#39), field
   swaps (city/country, first/last name) that corrupt displayed and stored data.
4. **Discounts** — geo-location and combination discount arithmetic feeding invoices.
5. **Cross-browser rendering** — a large, systematically under-tested defect class.
6. **Accessibility** — 9+ documented defects; also the area most often skipped.

---

## 6. Entry and exit criteria

**Entry.** Target reachable; `npx --no pom-harness check` reports ready; test accounts
valid or a fresh account registerable; required secrets present in `.env`.

**Exit.** Every in-scope area has at least its documented happy-path and primary
negative cases automated or explicitly deferred; all conformance failures trace to a
defect ID in the register; no unexplained failure remains; reports published.

A failing suite is not by itself an exit blocker here — an **unexplained** failure is.

---

## 7. Open questions

Carried deliberately rather than guessed:

1. **Is the server-side cart API present?** Upstream docs contradict themselves (§2.2).
   Resolve by exploration before writing cart-API tests.
2. **Contact-form attachment rule.** The acceptance criterion states an attachment must
   be *exactly 0 KB*, while defect #70 reports "file with 0KB can be uploaded" as a bug.
   These cannot both be right; the intended rule is unclear. Confirm actual behaviour
   before automating file-upload validation.
3. **Privacy policy.** The feature matrix excludes it from `with-bugs`, but `#/privacy`
   did not 404. Because the app is a single-page application the shell responds to any
   hash route, so this proves nothing either way — confirm whether real content renders.
4. **Does this build enforce 3-attempt locking at all?** Defect #21 says it locks after
   1 attempt. The threshold needs confirming before a locking test can assert anything.

---

## 8. Related documents

- [Test cases](test-cases.md) — test conditions per feature area, traceable to acceptance criteria
- [Known defects](known-defects.md) — the 90+ intentional defect register
