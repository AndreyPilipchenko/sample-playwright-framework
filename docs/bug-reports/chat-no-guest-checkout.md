# BUG: Chat checkout offers only "Sign in"; a guest cannot continue

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-CHAT-6 (checkout walks through cart, details, address, payment, confirmation) in [test cases](../test-cases.md), guest route. |
| Automation | `tests/ChatWidgetTests.spec.ts`: the guest test fails on the missing button. The test for a customer who signs in from the chat passes. |
| Area | Chat widget, checkout |
| Environment | Local Docker stack (`sprint5-with-bugs`), Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 6 of 6 runs of the guest test failed, plus 1 of 1 controlled script run. Counted from this session's run output; no run record was kept. The hosted instance was not checked. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

A visitor who is not signed in and starts checkout in the chat is told to sign in, and the only choices are **Sign in** and
**Back to menu**. The story's AC4 includes guest details (email, first name, last name) for a visitor who is not logged in.

## Preconditions

- One in-stock product in the cart, and no signed-in session.

## Steps to reproduce

1. Open a product page and click **Add to cart**.
2. Open the chat and choose **Checkout**.

## Expected result

- The chat shows the cart total and lets the visitor continue as a guest.
- It asks for the email, the first name and the last name, then for the address (AC4).

## Actual result

- The chat shows the cart total and "Please sign in to continue with checkout."
- The choices are **Sign in** and **Back to menu**. There is no continue-as-guest choice.

## Evidence

- Controlled script run: the last action buttons were `Sign in` and `Back to menu`, and `chat-action-checkout-guest` matched 0
  elements.
- Source comparison, not run: upstream `sprint5/UI/src/app/chat-widget/chat-widget.component.ts` offers `checkout-login` and
  `checkout-guest` ("Continue as guest") and has the three guest prompts. The local bundle's `startCheckoutFlow` has only the
  sign-in choice.

## Open points before filing

- The guest prompts in the test come from the upstream source and could not be observed locally.
- The guest test ends at the street prompt, so the rest of a guest checkout is not covered.
- Severity and priority need the project's scale; none is invented here.
