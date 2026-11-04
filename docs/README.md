# Test Documentation

Test documentation for the Toolshop application under test, compiled from the upstream
[Practice Software Testing documentation](https://testsmith-io.github.io/practice-software-testing/)
and verified against the live target on 2026-11-02.

Organised by **feature area**. Testing targets the latest deployed build of the
application, and only the features actually present in that build are documented.

| Document | Contents |
|---|---|
| [Test plan](test-plan.md) | Scope, environment, accounts, approach, risks, the test intent and branch policy, open questions |
| [Test cases](test-cases.md) | 234 test conditions across 24 feature areas, traceable to upstream acceptance criteria |
| [Known defects](known-defects.md) | The 90+ intentional defect register, with notes and exploratory tour mapping |

## Start here

The application is **deliberately broken** — it carries 90+ intentional defects. That
single fact drives most of the decisions in these documents:

- All tests live on the mainline branches, and a failing test stays red until the
  functionality is fixed. **Conformance** tests (documented behaviour the app violates) are
  tagged `@conformance`, so the working-functionality suite (`npm run test:non-conformance`)
  stays a clean signal. See [test plan §4.1](test-plan.md).
- Routing is **hash-based** (`#/checkout`, not `/checkout`). Clean paths return 404.
  This was verified live and contradicts the upstream release notes.
- The instance is **public and shared**. Account and catalogue state is mutable by
  anyone, so tests must create the data they depend on.

## Related

- Framework conventions, structure and commands: [project README](../README.md)
- Agent skill routing: `AGENTS.md` / `CLAUDE.md` at the repository root
