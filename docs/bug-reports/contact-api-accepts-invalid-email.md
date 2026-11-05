# BUG: `POST /messages` accepts an invalid email address

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | `contact-api-5` in `tests/api/contact/ContactApiTests.spec.ts`. Outside the [test case](../test-cases.md) inventory. |
| Automation | The test expects 422 and fails on the 200. |
| Area | Contact API |
| Environment | Local Docker stack (`sprint5-with-bugs`), API on `http://localhost:8091`. |
| Observed | 2026-11-06 |
| Reproduction | 6 of 6: 4 runs of `contact-api-5` and 2 controlled requests. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

The contact API stores a message whose email is not an email address. The form rejects such a value, but a direct API call
does not, and the stored address could not receive a reply.

## Steps to reproduce

Send `POST /messages` with no token:

```json
{
  "name": "Repro Guest",
  "email": "not-an-email-address",
  "subject": "webmaster",
  "message": "Please tell me where I can find the documentation for this hammer."
}
```

## Expected result

422 with the error `The email field must be a valid email address.`

This comes from the upstream rule below. The error text is the framework's default wording for that rule and was not seen in
a response.

## Actual result

200, and the message is stored with `"email":"not-an-email-address"`.

## Evidence

- Controlled request on 2026-11-06: status 200, message id 28.
- Source comparison, not run: upstream `sprint5/API/app/Http/Requests/Contact/StoreContact.php` has
  `'email' => ['sometimes', 'email', 'max:256', ...]`. `sprint5-with-bugs` has `'email' => 'max:120'`.

## Open points before filing

- The stories state no API rule for this, so the expected result rests on the upstream source.
- Whether this is an intended with-bugs defect is for whoever files it; it is not in the register.
- Severity and priority need the project's scale; none is invented here.
