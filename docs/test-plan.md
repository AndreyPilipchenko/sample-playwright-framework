# Test Plan — Toolshop

> Derived from Testsmith's documentation and not covered by this repository's MIT license; see [NOTICE](../NOTICE.md).

Compiled from the upstream
[Practice Software Testing documentation](https://testsmith-io.github.io/practice-software-testing/)
([source repo](https://github.com/testsmith-io/practice-software-testing)) and verified
against the live target on 2026-11-02.

Organised by **feature area**. The suite runs against two builds of the application, the `with-bugs` build and
the fixed build, each in a private Docker stack and on a public instance (§1). Scheduled runs use only the
Docker stacks, because the public instances are too unstable. Scope is the features of the `with-bugs` build (§2).

---

## 1. Application under test

"Toolshop" is an e-commerce demo store (Angular front end, Laravel REST + GraphQL API,
MariaDB). The `with-bugs` build is a deliberately defective variant of the full-feature
store, published for exploratory-testing and bug-reporting practice. It carries
**90+ intentional defects** across UI, API/security and accessibility. The fixed build is
a newer release of the full-feature store without those defects.

The suite selects one of four environments with `TEST_ENV`:

| Environment | Build | Application | REST API |
|---|---|---|---|
| `local` | with-bugs | <http://localhost:4200> | <http://localhost:8091> |
| `local-fixed` | fixed | <http://localhost:4200> | <http://localhost:8091> |
| `hosted-with-bugs` | with-bugs | <https://with-bugs.practicesoftwaretesting.com> | <https://api-with-bugs.practicesoftwaretesting.com> |
| `hosted` | fixed | <https://practicesoftwaretesting.com> | <https://api.practicesoftwaretesting.com> |

Both local environments use the same ports, so one stack runs at a time (`scripts/app.mjs`). Only they have a
database and a mail inbox: MariaDB on port `3306`, inbox on <http://localhost:1080>. Swagger is at
`/api/documentation`, GraphQL and GraphiQL at `/graphql` and `/graphiql`, on each API host.

### 1.1 Routing — verified

The `with-bugs` build uses **hash-based routing**: `https://.../#/checkout`, `#/auth/login`,
`#/contact`, and so on. Clean (non-hash) URLs such as `/checkout` return **HTTP 404** there.
The fixed build uses path routes (`/checkout`). Page classes take routes from
`applications.app.routes`, which picks the form for the build
([app versions, B1](app-versions.md#b-real-changes-between-the-builds)).

Route guards were confirmed working on the `with-bugs` build: `#/account`, `#/account/invoices`,
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
the admin in the git-ignored `.env` under `APP_ADMIN_*` (see `.env.example`; customers are registered per run), per
this framework's secrets rule. The values above are documentation, not configuration.

> **Shared-state warning.** The public instances are used concurrently by other
> learners, and these accounts are shared there. Account state (profile fields, password,
> favorites, lock status) can be changed by anyone at any time. Tests must not depend
> on a pre-existing account state they did not create themselves — see §4.3.

---

## 2. Scope

Scope is taken from the upstream feature matrix (`docs/features.md`), filtered to the
`with-bugs` column. The same cases run on the fixed build; features only it has (such as
two-factor authentication on `hosted`) are not covered.

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

> The upstream release notes also list "cart" among the missing features. Exploration
> settled it: the `with-bugs` build keeps the cart in the browser and has no server-side
> cart API, while the fixed build has one (`POST /carts`;
> [app versions, B7](app-versions.md#b-real-changes-between-the-builds)).

### 2.3 Additional endpoint in the with-bugs build

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
The framework runs the full suite on Chromium and the `@smoke` subset on Firefox and WebKit
(projects in `playwright.config.ts`), so browser-specific defects are only caught on those
critical paths.

---

## 4. Testing against a deliberately broken application

This is the defining constraint of this project: how failing tests are treated follows
from it (§4.1).

### 4.1 Tests of broken functionality

Many checks that assert *documented* behaviour fail, because the application is wrong on
purpose. They are automated like every other case, on the default branch, and assert the
documented behaviour exactly as specified. A test that fails because the functionality is
broken is a real result and **stays red until the functionality is fixed**. Do not hide it:
no `test.fail()`, `test.fixme()`, `test.skip()` or retry-until-green, no weakened assertion
and no workaround in the page objects.

**When the suite runs.** This repository is the test project, not the product, so commits
and pull requests here do not run the suite (a pull request runs only the static checks, `.github/workflows/lint.yml`). A change to the product repository's `main`
branch runs the `@smoke` tests (a `repository_dispatch` event of type `product-main-push`,
sent by the product repository's workflow; a sample is in `docs/ci/product-repo-trigger.yml`)
through `.github/workflows/smoke-on-commit.yml`. All tests run nightly, scheduled for 02:00 UTC, on both local builds
(`local` and `local-fixed`) through `.github/workflows/nightly.yml`. The public sites are tested only by hand,
through `.github/workflows/hosted.yml`. All can be started by hand, and their shared steps live in
composite actions under `.github/actions/`. A red run therefore reports the product's state,
including the known defects until they are fixed.

Record the case ID with `allure.testCaseId(...)`; add `allure.issue(...)` only for a defect
a test is linked to. Each test has its own ID. When one case needs two tests, each gets a letter (TC-CBA-4a,
TC-CBA-4b), because Allure treats tests with the same ID as retries of one test. The [known-defects register](known-defects.md) and the
[bug reports](bug-reports/README.md) are documentation. Tests do not read them at run time.

### 4.2 Avoid asserting on defective surfaces incidentally

Several high-traffic elements carry typo or content defects (`"Contakt"`, `"Sorth"`,
`"Serch"`, `"User Data not found"`, broken logo image). Tests whose real subject is
something else should not assert on those strings, or they will fail for an unrelated
reason. Prefer stable `data-test` attributes — the build exposes them widely
(`nav-home`, `product-name`, `product-price`, `search-query`, `search-submit`, `sort`).

### 4.3 Test independence on shared, mutable data

The public instances are shared and mutable, and data on a local stack lasts until its volumes are dropped, so the
same rules apply everywhere:

- Create the data a test needs; never rely on seeded records surviving.
- Register a fresh user per test for account-state scenarios rather than reusing the
  shared demo logins — this is mandatory for anything touching password, profile or
  lock state.
- Account locking is destructive and defect #21 locks after **1** failed attempt
  instead of 3. A lock test run against a shared account can block other users and
  other tests. Use a throwaway registered account.
- Give every record a per-run UUID and work only with your own. Records are left behind on
  purpose, because deleting needs an admin token; only TC-ADM-2 and 7, which sign in as the
  admin anyway, delete what they create. On a public instance these records are visible to
  other users.

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
negative cases automated or explicitly deferred; cases on defective paths are automated
against the documented behaviour (§4.1); reports published.

Every failure stays red until the functionality is fixed. A failure that matches a known,
reported defect is listed in the run report; any other failure blocks exit.

---

## 7. Open questions

Carried deliberately rather than guessed:

1. **Contact-form attachment rule.** The acceptance criterion states an attachment must
   be *exactly 0 KB*, while defect #70 reports "file with 0KB can be uploaded" as a bug.
   These cannot both be right; the intended rule is unclear. Confirm actual behaviour
   before automating file-upload validation.
2. **Privacy policy.** The feature matrix excludes it from `with-bugs`, but `#/privacy`
   did not 404. Because the app is a single-page application the shell responds to any
   hash route, so this proves nothing either way — confirm whether real content renders.

Answered since, and kept here for the record:

- **Is the server-side cart API present?** Not in the `with-bugs` build; the fixed build has one (§2.2).
- **Does the build enforce 3-attempt locking?** The `with-bugs` build never locks an account.
  The fixed build locks after 3 failures and answers HTTP 423; on `hosted` the login page
  then shows the wrong message. TC-LOGIN-7/8 assert the threshold of 3, see
  [test cases §11](test-cases.md#11-user-login) and
  [app versions](app-versions.md#hosted-and-local).

---

## 8. Related documents

- [Test cases](test-cases.md) — test conditions per feature area, traceable to acceptance criteria
- [Known defects](known-defects.md) — the 90+ intentional defect register
- [App versions](app-versions.md) — the four environments, the two builds and how they differ
