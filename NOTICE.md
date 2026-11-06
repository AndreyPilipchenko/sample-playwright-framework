# Notices

The [MIT license](LICENSE) covers the original work in this repository: the framework code, the tests and
the writing that isn't derived from the sources below. It doesn't cover the following.

## Toolshop (Practice Software Testing)

The application under test is
[Practice Software Testing](https://github.com/testsmith-io/practice-software-testing), copyright Testsmith,
under [its own license](https://github.com/testsmith-io/practice-software-testing/blob/main/LICENSE), which
reserves all rights not expressly granted. This repository doesn't contain the application:
`scripts/app.mjs` downloads the upstream compose file and images when run.

These documents are transcribed or compiled from Testsmith's documentation, so that material stays under
Testsmith's terms and is not licensed here under MIT:

- [`docs/known-defects.md`](docs/known-defects.md)
- [`docs/test-cases.md`](docs/test-cases.md)
- [`docs/test-plan.md`](docs/test-plan.md)
- [`docs/README.md`](docs/README.md)

Test reports, screenshots and traces show the application, and its content stays under the same terms.

## Playwright POM Harness

`.harness/vendor/` holds the `playwright-pom-harness` package, under its own MIT license
(copyright Playwright POM Harness contributors), which is included in the package along with its
third-party notices.

## Other dependencies

npm dependencies keep their own licenses.
