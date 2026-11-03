# Known Defects Register — Toolshop (with-bugs)

The `with-bugs` build ships **90+ intentional defects**. This register is transcribed
from the
[upstream known-bugs documentation](https://github.com/testsmith-io/practice-software-testing/blob/main/docs/sprints/sprint5-with-bugs.md)
for that build.

These are **not** bugs to fix — they are the exercise. The register exists so that a
failing test can be traced to a known defect instead of being investigated as a
regression. See [test plan §4](test-plan.md) for the expected-failure policy and
[test cases](test-cases.md) for the defect → test-case mapping.

Upstream numbering is preserved (IDs 1–94, with the odd ordering quirk that #84 sits
between the UI and accessibility blocks). Defect IDs are referenced from test cases as
`Defect`, and should be attached to failing tests via `allure.issue(...)`.

---

## UI defects (1–70, 84)

| ID | Area | Title |
|---|---|---|
| 1 | Cart | Plus / minus sign is not adding the amount |
| 2 | Category page | Sort works the other way around |
| 3 | Category page | Category "Chainsaw" leads to 404 |
| 4 | Category page | Some product names are aligned to the right |
| 5 | Category page | Title centered in Edge |
| 6 | Category page | Product names prevented from wrapping in Firefox |
| 7 | Checkout — cart | Delete button is disabled |
| 8 | Checkout — cart | Total price displays 0,00 |
| 9 | Checkout — billing address | Typo "Billing Address" |
| 10 | Checkout — billing address | Instead of postcode "Missing value" is displayed |
| 11 | Checkout — billing address | Submit / Next button has no text |
| 12 | Checkout — payment | Payment method dropdown shows "Error 304 - Missing Payment Gateway" |
| 13 | Invoice list | No pagination |
| 14 | Invoice page | Payment method shows "Method not found" |
| 15 | Invoice page | City is displayed in Country field and Country as City |
| 16 | Invoice page | Address fields display "undefined" |
| 17 | Login page | Email and password will not be validated |
| 18 | Login page | Incorrect tab order in Firefox |
| 19 | Login page | Input padding of email is not correct in Chrome |
| 20 | Login page | Button width is not correct in Firefox |
| 21 | Login page | User will be locked after 1 invalid attempt (should be 3) |
| 22 | Forgot password | Different font for the button in Edge and Chrome |
| 23 | Forgot password | Input padding of email is not correct in Chrome |
| 24 | Forgot password | Button width is not correct in Edge |
| 25 | Forgot password | Email syntax will not be checked |
| 26 | Home page | Some product images are not visible in Chrome |
| 27 | Home page | Price range selection doesn't work, max price is not sent to the server |
| 28 | Home page | Broken image instead of Toolshop logo |
| 29 | Home page | Home link in upper corner links to the contact page |
| 30 | Home page | Broken image instead of magnifying glass beside "Search" |
| 31 | Home page | Link text typo "Contakt" instead of "Contact" |
| 32 | Home page | "User Data not found" displayed instead of username |
| 33 | Home page | Typo "Sorth" instead of "Sort" |
| 34 | Home page | Typo "Serch" instead of "Search" on button |
| 35 | Home page | Product names prevented from wrapping in Firefox |
| 36 | Profile page | First Name displayed as Last Name and vice versa |
| 37 | Profile page | "City not found" displayed in city field |
| 38 | Profile page | Changing address fields leads to 404 or error |
| 39 | Profile page | Updated password is not hashed in DB, so it no longer works |
| 40 | Product detail | Plus / minus buttons do not change quantity |
| 41 | Product detail | "Add to favourites" displays error "Upsss... something wrong" |
| 42 | Product detail | Typo "Reltded products" instead of "Related products" |
| 43 | Product detail | "Add to cart" shows red error but items are still added |
| 44 | Product detail | Title aligned to the right in Firefox & Edge |
| 45 | Product detail | Buttons overlap in Chrome |
| 46 | Product detail | Badge text color is black |
| 47 | Product detail | Cannot add more than 10 pieces to cart |
| 48 | Rentals page | Bulldozer images don't work in Firefox and Edge |
| 49 | Rentals page | Title centered in Chrome |
| 50 | Registration page | Error reveals password hint for existing users |
| 51 | Registration page | Special characters in name cause "Invalid character" error |
| 52 | Registration page | State displays country and country displays state |
| 53 | Registration page | Incorrect tab order in Chrome |
| 54 | Registration page | Typo in Phone placeholder |
| 55 | Registration page | Different font for error messages in Edge and Chrome |
| 56 | Registration page | City label not aligned properly in Firefox |
| 57 | Registration page | Input padding of phone not correct in Firefox |
| 58 | Registration page | Button width not correct in Chrome |
| 59 | Registration page | Smaller font for some dropdown options |
| 60 | Contact page | Dropdowns display "Error 101" and "Error 202" |
| 61 | Contact page | Incorrect tab order in Firefox |
| 62 | Contact page | Typo in Message placeholder |
| 63 | Contact page | Different font for Attachment label in Edge and Chrome |
| 64 | Contact page | Email label not aligned properly in Firefox |
| 65 | Contact page | Input padding of firstname not correct in Firefox |
| 66 | Contact page | Button width not correct in Edge and Chrome |
| 67 | Contact page | Smaller font for some dropdown options |
| 68 | Contact page | PDF file upload not allowed |
| 69 | Contact page | JPG file upload not allowed |
| 70 | Contact page | File with 0KB can be uploaded |
| 84 | Emails | Logo used inconsistently in mails |

### Notes on the UI block

- **Browser-specific defects** (5, 6, 18–20, 22–24, 26, 35, 44, 45, 48, 49, 53,
  55–58, 61, 63–67) cannot be found by a Chromium-only run. The framework currently
  enables Chromium only; Firefox and WebKit are commented out in
  `playwright.config.ts`. Note also that these defects name **Edge**, which Playwright
  reaches via the `msedge` channel on a Chromium project rather than a separate engine.
- **Defects 68–70 contradict the specification.** The acceptance criterion says the
  attachment must be a `.txt` file that is *exactly 0 KB*; on that reading, refusing
  PDF (#68) and JPG (#69) is correct behaviour and accepting a 0 KB file (#70) is also
  correct. Treat the intended rule as unresolved — see test plan open question 2.
- **Defects 21 and 39 are destructive** on a shared public instance: #21 locks an
  account after a single failure, #39 leaves an account with an unusable password.
  Exercise both only with a freshly registered throwaway account.
- **Defects 2 and 27** mean sorting and price-range filtering return wrong result sets.
  Any test that relies on sort or price filtering as a *setup step* will be affected
  indirectly, not just tests that assert on them.

---

## API and security defects (71–83)

| ID | Area | Title | OWASP category |
|---|---|---|---|
| 71 | `users/{id}` | Can retrieve details of a different user by changing the ID | API1:2023 Broken Object Level Authorization |
| 72 | Token / refresh token | Long-lived access token (260000 min / refresh 520000 min) | API2:2023 Broken Authentication |
| 73 | `users` | Responses reveal `enabled` and `failed_login_attempts` to non-admins | API3:2023 Broken Object Property Level Authorization |
| 74 | `brands` | Possible to delete a brand without an admin token | API5:2023 Broken Function Level Authorization |
| 75 | `products` | Responses reveal stock amount to non-admins | API3:2023 Broken Object Property Level Authorization |
| 76 | `products` | Possible to delete a product without an admin token | API5:2023 Broken Function Level Authorization |
| 77 | `reports` | Too strict rate limiter returns 429 Too Many Requests | API4:2019 Lack of Resources & Rate Limiting |
| 78 | `invoices` | All invoices returned regardless of token ownership | API5:2023 Broken Function Level Authorization |
| 79 | `users/login` | SQL injection allows login as any user (append `' -- ` to email) | API8:2019 Injection |
| 80 | `logs/laravel.log` | Application logs exposed through the web | API8:2023 Security Misconfiguration |
| 81 | `invoices` | Can modify amount and price via POST | A04:2021 Insecure Design |
| 82 | All IDs | IDs are incremental and guessable (ULIDs in the non-bug build) | API1:2023 Broken Object Level Authorization |
| 83 | Token roles | Wrong status code 401 instead of 403 for wrong role | API2:2023 Broken Authentication |

### Notes on the API block

- Defects 74, 76 and 81 **write or destroy data** on a shared public instance.
  Exercising them removes brands/products other learners may be relying on, and #81
  forges invoice amounts. Prefer creating your own record first and attacking that.
- Defect 79 grants login as an arbitrary user, including admin. It is the single
  highest-severity item here and the clearest demonstration of why injection matters.
- Defect 82 (sequential IDs) is what makes 71 and 78 trivially exploitable — ID
  guessability is the enabler, the authorisation gaps are the vulnerability.
- Only exercise these against this deliberately vulnerable practice target.

---

## Accessibility defects (85–94)

| ID | Area | Title |
|---|---|---|
| 85 | Links | Contrast of links too low (4.26:1) |
| 86 | Checkout wizard | Contrast of checkout wizard labels too low (3.94:1) |
| 87 | Login form | No labels on form inputs |
| 88 | Checkout address form | No labels on form inputs |
| 89 | Checkout payment form | No labels on form inputs |
| 90 | Checkout login form | No labels on form inputs |
| 91 | Product detail | Quantity input has no label |
| 92 | Product detail | Product images have no alt text |
| 93 | Product overview | Search form has no labels |
| 94 | Product overview | No fieldset for filters |

Contrast figures are against the WCAG 2.1 AA minimum of 4.5:1 for normal text. The
missing-label defects (87–91, 93) also undermine accessible-name-based locators, which
is part of why this build's `data-test` attributes are the more reliable locator
strategy — see test plan §4.2.

---

## Exploratory tours

The upstream docs map defect classes to tour types. Use these to structure manual
exploratory sessions.

| Tour | Targets | Likely defects |
|---|---|---|
| Landmark | Key functional landmarks — buttons, inputs, counters | 1, 7, 40, 43, 47 |
| Supporting Actor | Secondary UI — dropdowns, sort, filters | 2, 12, 27, 33, 60 |
| SuperModel | Visual and layout issues across browsers | 4–6, 19, 20, 44, 45, 49, 55–58 |
| FedEx | Follow data end-to-end through the system | 8, 15, 16, 36, 37, 39 |
| GarbageCollector | Every button and interactive element | 7, 11, 40, 41 |
| Intellectual | Invalid, edge-case and boundary data | 17, 25, 47, 51, 70 |
| BadBoy | Security — injection, authorisation | 71–83 |
| Links / Typos | All links and text correctness | 3, 9, 29, 31, 33, 34, 42, 54, 62 |
| Accessibility | Screen readers, contrast checkers, keyboard navigation | 85–94 |

---

## Locally observed defects (L-prefixed)

Defects found while automating that the upstream list does not contain. They take an
`L` prefix so they can never collide with upstream numbering. Each entry was reproduced
on both the public instance and the local Docker stack (`sprint5-with-bugs`).

| ID | Area | Title | Observed | Case |
|---|---|---|---|---|
| L1 | Checkout — cart | Cart table header has a blank extra column, and the Actions (remove) column is labelled "Total" (`Item, —, Quantity, Price, Total, Total`) | 2026-11-03 | TC-CART-1 |

---

## Register integrity

This register is a transcription of upstream documentation as of 2026-11-02, not an
independently reproduced defect list. Two consequences:

1. **Not verified individually.** Each entry should be confirmed against the live
   build before being cited as the cause of a test failure. The upstream list may lag
   the deployed build.
2. **Not necessarily complete.** "90+" is the upstream count; undocumented defects
   almost certainly exist, and finding them is the point of exploratory testing. A
   failure with no matching register entry is a *candidate finding*, not automatically
   a test bug.
