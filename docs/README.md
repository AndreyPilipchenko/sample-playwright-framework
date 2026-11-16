# Test Documentation

> Derived from Testsmith's documentation and not covered by this repository's MIT license; see [NOTICE](../NOTICE.md).

Test documentation for the Toolshop application under test, compiled from the upstream
[Practice Software Testing documentation](https://testsmith-io.github.io/practice-software-testing/)
and verified against the live target on 2026-11-02.

Organised by **feature area**. The suite runs against two builds of the application: the `with-bugs`
build, which carries the deliberate defects, and the fixed build. Each runs privately in Docker (`local`,
`local-fixed`) and on a public instance (`hosted-with-bugs`, `hosted`); the public instances are too unstable
for scheduled runs. [App versions](app-versions.md) lists how the builds differ.

| Document | Contents |
|---|---|
| [Test plan](test-plan.md) | Scope, environments, accounts, approach, risks, how tests of broken functionality are treated, open questions |
| [Test cases](test-cases.md) | 234 test conditions across 24 feature areas, traceable to upstream acceptance criteria |
| [Automated tests](automated-tests.md) | Every spec, the cases it covers and which are red |
| [Known defects](known-defects.md) | The 90+ intentional defect register of the with-bugs build, with notes and exploratory tour mapping |
| [App versions](app-versions.md) | The four environments and two builds, results per environment, fixed defects, real changes and what is still red on the fixed build |
| [Bug reports](bug-reports/README.md) | Defects found while automating, beyond the intentional register |
| [CI guide](ci-guide.md) | Workflows, manual runs and CI jobs |
| [Adapting to your app](adapting-to-your-app.md) | How to point the framework at another application |

## Start here

The `with-bugs` build is **deliberately broken**: it carries 90+ intentional defects. That
single fact drives most of the decisions in these documents:

- Tests assert the documented behaviour, so a test of broken functionality fails and stays
  red until the functionality is fixed, on every build. See [test plan §4.1](test-plan.md).
- The builds differ in structure as well as defects: the `with-bugs` build routes by hash (`/#/checkout`), the
  fixed build by path (`/checkout`). Page and service classes absorb such changes
  ([app versions, B](app-versions.md#b-real-changes-between-the-builds)).
- The public instances are **shared**, and account and catalogue state there is mutable by
  anyone, so tests create the data they depend on, on the local copies too.

## Related

- Framework conventions, structure and commands: [project README](../README.md)
- Agent skill routing: `AGENTS.md` / `CLAUDE.md` at the repository root
