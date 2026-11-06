# BUG: The admin product list shows the old price after an edit

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-ADM-2 in [test cases](../test-cases.md). |
| Automation | `tests/ui/admin/AdminProductTests.spec.ts` fails on the listed price after the edit. |
| Area | Admin, products |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | Failed in the local run of 2026-11-06 and in nightly 42248340744. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

After an admin edits a product and sees "Product saved!", the product list keeps showing the old price. The edit is saved; the list reads an old copy from the browser cache.

## Preconditions

- Signed in as an admin.

## Steps to reproduce

1. Open the product list and search for a product, so the search result is fetched.
2. Open the product, change its price and save.
3. Return to the list and repeat the same search within 2 minutes.

## Expected result

The list shows the new price.

## Actual result

The list shows the old price: `$9.99` instead of `$11.11` in the test. Its 30-second wait only re-reads the page and does not fetch the list again.

## Evidence

- `GET /products/573`, sent outside the browser after the failure, returned the new price, 11.11.
- In the failure trace, the second `GET /products/search` transferred 0 bytes, where the first transferred 879, so it came from the browser cache.
- The API's `routes/api.php` puts these routes under `cache.headers:public;max_age=120;etag`.

## Open points before filing

- The `sprint5` source defines the same cache setting. Whether the defect-free build shows the same stale list was not run, so this may belong to both builds.
- The test's search after deleting the product may read the cache in the same way. It stops before that point today, so this is not confirmed.
- Severity and priority need the project's scale; none is invented here.
