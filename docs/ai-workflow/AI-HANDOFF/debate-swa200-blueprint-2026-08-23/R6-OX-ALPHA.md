# Consult reply — Ox Alpha (stealth/ox-alpha) — 2026-08-23T21:00:30.619Z

> tokens: prompt=8143 completion=1075 | finish_reason: stop | max_tokens: 60000

**Not clean. One new defect — and it's exactly the repeat you were testing for.**

## The defect: `outcome:"unknown"` is `entry-broken` under a new name

Rev 6 deleted `entry-broken` because it had no shape in 7.1 and no branch in the mermaid — then introduced `outcome:"unknown"` with the identical defect:

- **The A1 contract table** defines it (`verified | incomplete | unknown`) and specifies when it fires (thrown query error → `pendingAfter:"unknown"`).
- **7.1's five shapes have no shape for it.** Shape 5 is `"outcome":"incomplete"`. An operator reading a POST line containing `"outcome":"unknown"` has no documented interpretation. Worse, the two sub-cases demand *opposite* responses and the doc doesn't distinguish them:
  - child exited **0**, pending-set query threw → migration likely succeeded, check failed. No page.
  - child exited **non-zero**, pending-set query threw → this is shape 5's situation with degraded evidence. Page.
  
  Without a shape, both look like an undocumented state — which on a fresh incident at 2am means either a false page or a missed one.
- **The mermaid has no edge for it.** A3 branches on `no PRE`, `lockVerified:false`, `locked:false`, `POST outcome:incomplete`, and `verified twice`. A deploy emitting `outcome:"unknown"` falls through every branch — the flowchart dead-ends precisely where rev 6 added a new terminal state.

This is the same failure mode as round 4→5: the fix touched the contract table without re-reading the two sections that consume it (the document even warns about this in its own header).

## Minor dangle (same root cause)

**Section 9, step 3:** "`pendingAfter` from the attestation tells you how many did not apply." After rev 6, `pendingAfter` can be the string `"unknown"`. The runbook should say what to do then — answer: fall back to the `SequelizeMeta` vs `backend/migrations/` diff the same step already prescribes, which makes the sentence trivially fixable ("if `pendingAfter` is `"unknown"`, the meta-table diff below is your only source").

## Checked and clean

- No other section references `entryImports` — the DO-NOT-ADD block, shadow-workflow ownership note, and A1's scope line are internally consistent.
- `fatalInWarn` computed form is consistent across the contract table and wireframe example (`"fatalInWarn":true` under warn mode... wait — see below).
- Shape 1 footnote and 3.5 option-1 residual exposure read correctly.

## One thing I want flagged, not counted as a defect

The 7.1 happy-path wireframe shows `"fatalInWarn":true` while `"mode":"warn"`. Under the computed rule (`mode === 'warn'`), warn mode yields `false`. Either the wireframe predates Ox Alpha's fix and wasn't updated, or the formula is inverted. That's a real inconsistency in rev 6 — I'm flagging it rather than counting it as a second defect only because it may be a stale example rather than a logic error, but **one of those two lines is wrong and must be fixed alongside the shape addition.**

**Verdict: not CLEAN. Fix = add shape 6 (`outcome:"unknown"`, both sub-cases), add the mermaid edge, amend §9 step 3, reconcile the `fatalInWarn` wireframe value. All four edits are in the mutually-dependent cluster the header warns about — apply together.**
