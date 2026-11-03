# ChaosEngine installer snapshot

A copy of the ChaosEngine Core installer (`install.ps1`, `bootstrap.py`), kept for when
ChaosEngine is set up in this project. Harness setup recommends that step; see
<https://github.com/ShaftHQ/SHAFT_ENGINE/tree/main/chaos-engine#install>.

These files are third-party, unmodified and **dated 2026-11-02**. Upstream `main` has
changed since. They are not part of the test framework: nothing in this repo imports or
runs them, and lint ignores `tools/`.

## Installing

Use the upstream one-liner from the repository root, the folder ChaosEngine installs into:

```powershell
irm "https://raw.githubusercontent.com/ShaftHQ/SHAFT_ENGINE/main/chaos-engine/install.ps1" | iex
```

The snapshot here does not install offline. Run as a local file, `install.ps1` needs
`CHAOS_ENGINE_REPOSITORY=ShaftHQ/SHAFT_ENGINE` and still downloads `bootstrap.py` from
GitHub. It uses a local `bootstrap.py` only inside the full ChaosEngine source tree. Read
a script before running it, and prefer the current upstream version over this copy.
