# BUG: The change password form shows the server's message for a mismatched confirmation

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-CPW-3 in [test cases](../test-cases.md). |
| Automation | `tests/ui/accounts/ChangePasswordTests.spec.ts` fails on the message text. |
| Area | Profile page, change password |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | Failed in the local run of 2026-11-06 and in nightly 42248340744. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

Story AC3 for changing a password says a mismatched confirmation shows "Passwords do not match.". The page sends the form and shows the server's own message instead.

## Preconditions

- A signed-in customer on `#/account/profile`.

## Steps to reproduce

1. Enter the current password.
2. Enter a new password, and a different value as the confirmation.
3. Click **Change Password**.

## Expected result

AC3: the error "Passwords do not match." is displayed.

## Actual result

The alert reads "The new password field confirmation does not match.", after a 422 from `POST /users/change-password`.

## Evidence

- TC-CPW-3's error output and browser diagnostics show this text and the 422.
- Source comparison, not run: the `sprint5` `profile.component.html` shows "Passwords do not match." from a check in the form. The local build's template has no such check.

## Open points before filing

- Severity and priority need the project's scale; none is invented here.
