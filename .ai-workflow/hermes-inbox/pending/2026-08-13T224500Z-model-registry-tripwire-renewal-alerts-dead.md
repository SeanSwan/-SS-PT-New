---
surface: backend-models
slug: model-registry-tripwire-renewal-alerts-dead
agent: vs-claude (Opus 5)
date: 2026-08-13
---

# Model-registry drift tripwire built; it found renewal alerts dead in production

## What happened

Built the boot drift tripwire (both external reviewers had ranked this drift class #1). It
statically diffs the model ENUMERATION (files on disk, `getModel()` call sites) against the
REGISTRY (what `associations.mjs` returns). It found a live production failure on first run.

**Renewal alerts / churn-risk queue has never worked.** `RenewalAlert` has a model file, a
migration, a service, a controller, mounted routes (`/api/renewal-alerts`) and an automation cron
tick — and was never registered in `associations.mjs`. `getModel()` throws on an unknown key, so
`GET /api/renewal-alerts` returned 500 and the cron's renewal tick caught the throw and logged it,
failing silently on every run.

Root cause: the model exported a FACTORY `(sequelize) => {...}` while ~150 siblings import
sequelize themselves and export the instance. `associations.mjs` only knows the instance form, so
the model was structurally unregisterable. Only three files in the repo use the factory shape and
nothing instantiates any of them.

Fixed by converting to the dominant convention, registering it, and wiring the `User` association
the service's `include` actually requires (plus a separate alias for the second `contactedBy` FK).

## Lessons worth carrying

**A single convention deviation can make a feature structurally unable to run**, with every
individual piece present and correct. Nothing was broken; one file was merely *shaped* differently
from the loader that had to consume it.

**A catch-and-log around a scheduled job converts a hard failure into permanent silence.** The cron
has been failing every run since the feature shipped. A crash would have been discovered in a day.

**Validate the instrument before believing its output.** My tripwire produced three false findings
before it was trustworthy. A drift tool that invents findings gets ignored exactly like any other
gate that cries wolf — the same failure I fixed in the QA harness earlier the same day.

## Mistakes I made

- **My first fix would have crashed the server at boot — worse than the bug it fixed.** I assigned
  `RenewalAlertModule.default`, which is the factory FUNCTION, and wired `.belongsTo()` onto it.
  Caught only because I compared the file against an already-registered sibling before trusting it.
  A green static test said nothing about this; the tripwire passed on the broken fix.
- **Wrote a throwaway probe that failed silently and reported confident nonsense.** `indexOf`
  returned -1, and `slice(at, -1)` read to end-of-file instead of erroring, so my first drift
  numbers (10 "registry entries with no file", 27 "imported but unregistered") were junk. I nearly
  reported them. Every one was a parser artifact.
- **Built an enumeration keyed off filename rather than declared model name**, which reported
  `models/contact.mjs` as unregistered when it declares `modelName: "Contact"` and IS registered.
- **Wrote a scanner that matched its own documentation.** The audit module quotes the failing
  `getModel('RenewalAlert')` call in its header comment, so it reported a call site that does not
  exist.
- **Repeated a documented class:** "a feature can be structurally incapable of working while every
  test passes" is lesson 1 of the 2026-08-11 packet. It recurred here in a different subsystem. The
  difference this time is that the correction is a tripwire in CI, not a note.

## External-model calibration

None. No paid or external model was consulted this turn. One Kimi review is authorised for after
the remaining slices land.

## State for Hermes

- Commit `3dc7be425` on `claude/qa-harness-slice0-20260811` in `C:/tmp/ss-qa-harness-slice0`.
  Committed, NOT pushed.
- `backend/models/dormantModels.mjs` now lists the 23 unregistered models with reasons: 7 with no
  caller anywhere (Rule-34 quarantine candidates — access-log evidence required before any drop),
  16 consumed by direct import (acknowledged debt; still bypasses the stated index.mjs rule).
- Renewal alerts should be re-checked in production after deploy: the cron tick and
  `/api/renewal-alerts` have never once succeeded.
- Separate finding, NOT fixed: 21 backend test files use `node:test` and are never collected by
  vitest, so they never run under the normal test command. They pass under `node --test`. Belongs
  to the Forge/variant-run lane another agent holds.
- Still blocked on Sean: production auth-state capture; baseline migration and orphan-table
  disposition (both destructive, plan-gated).
