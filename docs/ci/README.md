# Triggering the test suite from the product repository

These two files belong in the **product** repository. They live here, in the test
repository's `docs/ci/`, only as the source to copy:

| File here | Copy to (product repository) |
|---|---|
| [`product-repo-trigger.yml`](product-repo-trigger.yml) | `.github/workflows/trigger-tests.yml` |
| this `README.md` | `docs/ci/trigger-tests.md` (or wherever the product keeps CI docs) |

## What it does

On every push to the product's `main` branch, the workflow sends a
[`repository_dispatch`](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)
event of type `product-main-push` to the test repository
(`AndreyPilipchenko/sample-playwright-framework`). That event starts the test repository's
**Smoke on product commit** workflow, which runs the `@smoke` tests on chromium against a
private copy of the application that it starts in Docker. The full test suite runs separately, nightly.

The product's own job takes a few seconds: it only sends the event and does not wait for the
tests. Results are in the test repository, under Actions → **Smoke on product commit**. Each
run is titled with the product commit that triggered it, `Smoke: <owner>/<product>@<sha>`.

The event carries this payload:

| Field | Value |
|---|---|
| `repository` | the product repository, `owner/name` |
| `ref` | the pushed ref, `refs/heads/main` |
| `sha` | the pushed commit |
| `url` | link to that commit |

## Setup

1. **Copy the workflow** into the product repository as `.github/workflows/trigger-tests.yml`.
   If the test repository is not `AndreyPilipchenko/sample-playwright-framework`, change
   `TESTS_REPOSITORY` at the top of the file.
2. **Create a token** that may dispatch to the test repository. A fine-grained personal access
   token: GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
   - Resource owner: the owner of the test repository.
   - Repository access: **Only select repositories** → the test repository.
   - Repository permissions: **Contents: Read and write** (the dispatch endpoint requires
     it). Nothing else.
   - Set an expiry and note it, because the trigger stops working when the token expires.

   A GitHub App installation token with the same permission works too, and does not depend
   on one person's account.
3. **Save the token as a secret** in the product repository: Settings → Secrets and
   variables → Actions → New repository secret, named `TESTS_DISPATCH_TOKEN`.

The token is used only by this workflow, only to send the event. It never reaches the test
repository's runs.

## Check that it works

- Push a commit to the product's `main`, or run **Trigger the test suite** by hand (Actions →
  Trigger the test suite → Run workflow). The job log ends with
  `Dispatched product-main-push for <owner>/<product>@<sha> to <test repository>`.
- In the test repository, a **Smoke on product commit** run titled with that commit appears
  within a minute.

To send the event without the workflow (for example to test the token), use the GitHub CLI
with the token in `GH_TOKEN`:

```sh
gh api repos/AndreyPilipchenko/sample-playwright-framework/dispatches --method POST \
  -f event_type=product-main-push \
  -f 'client_payload[repository]=<owner>/<product>' \
  -f 'client_payload[sha]=<commit sha>'
```

A successful dispatch returns HTTP 204 with no body.

## Troubleshooting

| Symptom | Cause |
|---|---|
| The product job fails with `HTTP 404: Not Found` | The token cannot see the test repository (wrong repository access or resource owner), or `TESTS_REPOSITORY` is misspelled. GitHub answers 404 rather than 403 for repositories a token cannot access. |
| The product job fails with `HTTP 403` or `401` | The token lacks **Contents: Read and write**, or it has expired or been revoked. |
| The product job fails with `gh: To use GitHub CLI in a GitHub Actions workflow, set the GH_TOKEN environment variable` | The `TESTS_DISPATCH_TOKEN` secret is missing or empty in the product repository. |
| The product job succeeds but no test run appears | The test repository's `smoke-on-commit.yml` is not on its default branch (GitHub starts `repository_dispatch` workflows only from there), or the event type no longer matches `product-main-push`. |
| Several quick pushes start only one or two test runs | Expected. The test repository queues smoke runs and keeps only the newest waiting one, so a burst of commits tests the latest. |
