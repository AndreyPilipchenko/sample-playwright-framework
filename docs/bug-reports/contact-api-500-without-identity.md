# BUG: `POST /messages` returns 500 for a guest without both a name and an email, and still stores the message

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | None. The expected status is not documented, so no test was added. |
| Automation | None. |
| Area | Contact API |
| Environment | Local Docker stack (`sprint5-with-bugs`), API on `http://localhost:8091`, `APP_ENV=local`. |
| Observed | 2026-11-06 |
| Reproduction | 2 of 2 with neither field, 1 of 1 with only a name, 1 of 1 with only an email. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

A request with no token that leaves out the name or the email passes validation and crashes with a 500. The response exposes
the exception, a server file path and a stack trace. The message is stored anyway, so a client that retries creates
duplicates.

## Steps to reproduce

Send `POST /messages` with no token:

```json
{
  "subject": "webmaster",
  "message": "Please tell me where I can find the documentation for this hammer."
}
```

## Expected result

No source states the status. The usual expectation, not from a source, is either a 4xx naming the missing fields with nothing
stored, or a 2xx. Either way, no exception details in the response.

## Actual result

| Sent | Status | Message in the response | Stored |
|---|---|---|---|
| Neither name nor email | 500 | `Attempt to read property "email" on null` | Yes (id 29) |
| Name only | 500 | `Attempt to read property "email" on null` | Yes (id 30) |
| Email only | 500 | `Attempt to read property "first_name" on null` | Yes (id 31) |

The body also carries `exception`, `file` (`/var/www/app/Http/Controllers/ContactController.php`), `line` and `trace`.

## Cause

The controller stores the message first. Then, when the environment is `local`, it falls back to the signed-in user for a
missing name or email (`app('auth')->user()->email`), and a guest has no user.

## Evidence

- Controlled requests on 2026-11-06, and the stored rows read back through `ContactRequests`.
- `ContactController.php` lines 62 to 77 in the running container.
- Source comparison, not run: upstream `sprint5/API/app/Services/ContactService.php` has the same fallback
  (`$input['email'] ?? Auth::user()->email`) and validation also allows both fields to be left out, so this does not look
  specific to the with-bugs build.

## Open points before filing

- The fallback only runs in the `local` environment, so a production-configured instance may not crash. The stack trace in the
  response also depends on debug settings.
- The form requires these fields for a guest, so only direct API calls reach this.
- Severity and priority need the project's scale; none is invented here.
