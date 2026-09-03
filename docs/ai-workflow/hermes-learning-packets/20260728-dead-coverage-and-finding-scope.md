---
originating_model: claude-fable-5
date: 2026-07-28
topic: Dead coverage, vacuous greens, and why the first failing case is a sample rather than the boundary
provenance: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
title: a test you never run is a lie you keep
tier_basis: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
decision: unknown
status: draft
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-provenance; decision=unknown [CORRECTED 2026-08-16 — topic left in place; a subject is not a rule]; status=draft (never reviewed against a contract)); originating_model untouched
---

# Learning Packet — a test you never run is a lie you keep

**The permanent lesson, two halves:** (1) a test excluded from the default suite decays
silently into **false coverage** — its existence gets read as passing, and nobody learns
otherwise until someone runs it years later; (2) when you find one instance of such rot,
**the first failing case is a sample, not the boundary** — keep probing before you file,
because the finding is usually a family.

## 1. Dead coverage: the failure mode

Three real-database web smokes failed 100% of the time. Nobody knew, because they were
gated behind an env flag (`describe.runIf(...)`) and therefore skipped in every normal run.
The repo *looked* like it covered durable deletion receipts, evidence-graph rendering, and
command receipts. It covered none of them. Worse, the tests had **once passed** — a receipt
doc in the same repo recorded a successful run back when the schema had three migrations.
They rotted as the app grew, and the flag hid the rot.

**Rules that follow:**
- Any test behind an env flag needs **either** a scheduled/CI run **or** an explicit
  skip-reason. There is no third honest state.
- When you disable a test, **delete its runner script too.** A skipped suite with a live
  script reports a cheerful green over zero tests. A **vacuous pass is worse than a red**:
  red is information, green-over-nothing is misinformation.
- A skip is only honest when it is **deliberate and documented** — name the tracking issue,
  the root cause, and the exact step that would re-enable it, in the file itself.

## 2. Finding-scope discipline: don't stop at the first sample

I filed the issue as "3 dead tests," then kept running the rest of the family and found
**5 of 8** failing from **two unrelated environmental causes** (one auth, one missing seed
data). The filed scope was wrong within minutes of filing it.

**Rule:** the moment you have a finding worth filing, ask *"is this the whole set?"* and
spend the extra cycles enumerating the family. Filing early with a narrow boundary is
worse than filing late with the real one, because the narrow number becomes the plan.

## 3. Attribution discipline: prove it isn't yours before you own it (or disown it)

Four separate theories blamed my own recent changes: a newly-required env key, a 403 path,
an empty gate table, stale copy. **All four were wrong**, and each was disproven by reading
the actual code rather than reasoning from plausibility (`NODE_ENV=development` defaults the
key; non-owners return cleanly instead of erroring; a missing gate row means *visible*, not
hidden; the "stale" copy still exists in the app).

The decisive move was mechanical, not analytical: **check out the pre-change commit and run
the same failing command.** Identical failure ⇒ pre-existing, full stop. Do this *before*
either claiming or disclaiming a regression — and restore the tree in the same command so a
diagnostic experiment can never leave the worktree dirty.

## 4. Knowing what NOT to fix

Two of the five failures were left untouched on purpose. Their fix required designing a
seeding fixture for a shell that is already **iceboxed** by a product pivot, and touching a
harness shared by ~40 passing tests. Cleanup that changes shared infrastructure to serve a
surface being replaced is churn wearing diligence as a costume. **Fix the unambiguous part;
file the design decision.** An honest issue with three ranked options and a recommendation
moves a project further than a risky unilateral repair.

## 5. Applying this
- Grep for flag-gated tests (`runIf`, `skipIf`, env-conditional describes) — each one needs a
  scheduled run or a documented reason. Treat the rest as unproven.
- Disabling a test → delete/neuter its script in the same commit.
- Before filing a finding, enumerate its family.
- Before attributing a failure to your change, re-run it at the pre-change commit.
- Before "fixing" infrastructure, ask whether the surface it serves is being replaced.
