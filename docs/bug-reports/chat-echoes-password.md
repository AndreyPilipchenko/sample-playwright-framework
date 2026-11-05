# BUG: Chat sign-in shows the typed password in plain text

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | None asserts this. Seen while automating TC-CHAT-6 in [test cases](../test-cases.md). |
| Automation | None. The case does not state an expected result for this, so no test was added. |
| Area | Chat widget, sign-in during checkout |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 2 of 2 controlled script runs. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

When a visitor signs in from the chat, the password field is an ordinary text input, and the password stays visible in the
conversation as a message after it is sent. Anyone who can see the screen can read it.

## Preconditions

- A registered customer, one in-stock product in the cart and no signed-in session.

## Steps to reproduce

1. Open the chat and choose **Checkout**, then **Sign in**.
2. Enter the email address and send it.
3. At "Please enter your password:", enter the password and send it.

## Expected result

No acceptance criterion states this. The usual expectation, not from a source, is that a password is masked while typed and
not repeated on screen.

## Actual result

- While typing, the input has `type="text"`, so the password is readable.
- After sending, the password is visible as a message in the chat window.

## Evidence

- Controlled script run: `chat-input` had `type="text"`, and the password was visible in `chat-window` as exact text.
- Test failure output of an earlier TC-CHAT-6 run (`error-context.md`) showed the disposable test password in the page
  snapshot, so it can also reach screenshots, videos and traces. That output was not retained.
- Source comparison, not run: upstream `sprint5/UI/src/app/chat-widget/chat-widget.component.html` also uses
  `type="text"`, and `chat-widget.component.ts` calls `addUserMessage(input)` before handling the input, so this does not look
  specific to the with-bugs build.

## Open points before filing

- The expected result is a judgement, so whoever files this needs to confirm it.
- It looks like an upstream behaviour too, so it may belong upstream rather than in the with-bugs list.
- Only disposable test accounts were used.
- Severity and priority need the project's scale; none is invented here.
