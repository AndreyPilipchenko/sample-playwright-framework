# BUG: Contact form confirms the message, but the confirmation email is never delivered

| Field | Value |
|---|---|
| Status | Open, not yet filed in any tracker. New: not in the [known-defects register](../known-defects.md). |
| Test cases | TC-CONT-8 (valid submission confirms and sends the email) in [test cases](../test-cases.md). |
| Automation | `tests/ContactTests.spec.ts` shows the confirmation, then fails waiting for the mail in the local inbox. |
| Area | Contact form, API mail queue |
| Environment | Local Docker stack (`sprint5-with-bugs`, `node scripts/app.mjs up`), with mailcatcher as the mail sink. Chromium (Playwright). |
| Observed | 2026-11-06 |
| Reproduction | 8 of 8 recorded runs of TC-CONT-8 failed on delivery, plus 1 of 1 controlled script run. The hosted instance was not checked: it has no inbox these checks can read. |
| Severity / priority / type | Not set. Tracker fields are unresolved. |

## Summary

A guest who sends a valid contact form sees "Thanks for your message! We will contact you shortly.", but no email reaches
the address they gave. The story's AC7 requires both the message and the email.

## Preconditions

- The local stack is running, with the mailcatcher inbox on `http://localhost:1080`.

## Steps to reproduce

1. Open `#/contact` as a guest.
2. Enter a first name, a last name and an email address.
3. Choose the subject **Webmaster** and enter a message of at least 50 characters.
4. Click **Send**.
5. Open `http://localhost:1080/messages` and look for the address.

## Expected result

- A confirmation message is displayed (AC7).
- A confirmation email is sent to the provided address (AC7).

## Actual result

- The confirmation is displayed and `POST /messages` returns 200.
- No mail for that address had arrived 30 seconds later.
- The queue table `jobs` grew by one row (46 to 47) and nothing processes it.

## Cause

There are two causes, and fixing only one does not deliver the mail:

1. The API queues this mail (`Mail::to(...)->queue(new Contact(...))`, `QUEUE_CONNECTION=database`), and the stack runs no
   queue worker.
2. The with-bugs build's `config/app.php` leaves out `Illuminate\Bus\BusServiceProvider`, so a worker cannot run the job.

## Evidence

- Temporary experiment on 2026-11-06: a `php artisan queue:work --tries=1` service was added to the stack and every job it
  picked up failed, 226 in total, including a new contact message. The service was then removed. Those queued jobs were
  discarded by the attempt.
- Running one queued `Contact` mail synchronously raised `BindingResolutionException: Target
  [Illuminate\Contracts\Bus\Dispatcher] is not instantiable`.
- Sending the same mail directly with `Mail::send` reached the inbox with the subject `Contact`, so the mail sink and the
  template work.
- Source comparison, not run: upstream `sprint5/API/config/app.php` lists `BusServiceProvider`; the upstream
  `docker-compose.prod.yml` has no queue worker either.

## Open points before filing

- Whether cause 1 is a product defect or a property of the local stack is for whoever files this. A deployed instance may
  run a worker, but cause 2 would still stop it.
- The hosted instance was not checked.
- Severity and priority need the project's scale; none is invented here.
