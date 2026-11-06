# BUG: Admin cannot save an edited user: the phone comes back as a number

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-ADM-7, TC-ADM-8 and TC-ADM-9 in [test cases](../test-cases.md). |
| Automation | `tests/ui/admin/AdminUserTests.spec.ts` fails after the refused save. |
| Area | Admin, users |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright) and direct API calls. |
| Observed | 2026-11-06 |
| Reproduction | Failed in the local run of 2026-11-06 and in nightly 42248340744. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Saving an edited registered user in the admin area is refused with a 422, so a name change or a disable never takes effect. The API returns an all-digit phone as a number and then refuses the same value as not being a string. The leading zero is lost as well.

## Preconditions

- A customer registered with the phone `0987654321`.
- Signed in as an admin.

## Steps to reproduce

1. Open the user in the admin area.
2. Change the first name and save.

## Expected result

The change is saved.

## Actual result

`PUT /users/{id}` answers 422: "The phone field must be a string."

## Evidence

- Direct API calls with the customer's own token: `GET /users/{id}` returned `987654321`, `GET /users/me` returned `"0987654321"`, and `PUT /users/{id}` answered 422 with this message for the number, but passed validation with the string.
- Browser diagnostics of TC-ADM-7, 8 and 9 show the 422 on `PUT /users/{id}`.
- Source, not run: `app/Http/Controllers/Controller.php` encodes responses in `preferredFormat` with `JSON_NUMERIC_CHECK`, which turns numeric strings into numbers. `GET /users/me` does not go through it. The `sprint5` controller does not use this flag.
- Source, not run: `users-add-edit.component.ts` loads the user with `patchValue` and sends the form's values back.

## Open points before filing

- Only all-digit values should be affected. A numeric postcode (`nullable|string`) should get the same 422, but this was not run.
- Seeded users are not affected, because the seed data leaves their phone empty, which the rule accepts.
- Severity and priority need the project's scale; none is invented here.
