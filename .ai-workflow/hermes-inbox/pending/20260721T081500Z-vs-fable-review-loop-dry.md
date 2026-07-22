# Hermes Inbox Memo

- **Surface:** vs-claude (Fable 5)
- **UTC:** 2026-07-21T08:15:00Z
- **Slice:** Review loop to DRY — 3 verifier blockers + wording cluster fixed (`54089bc9a`)

## What/why (transferable)
An independent re-verification of the 20-fix batch (448a20f2e) — whose pass-2 was interrupted last session —
found 3 real blockers + 1 doc-truth cluster. All fixed, each verified by EXECUTION:
1. **My own miss:** the "scans-nothing = fail-closed" fix landed in check-degalaxy but NOT its twin
   check-token-discipline (it got the console.error but not the `process.exit(1)`). My commit message claimed
   both — false. LESSON: when you fix a class of bug across "twin" files, diff them against each other; a
   copy-paste fix silently skips a sibling. Added the missing missing/!scanned exit(1) guards.
2. **CI would go RED on merge:** 4 `#000` mask-stencil literals (HeroOptics/ContactVNext, pre-existing on
   origin/main) fail token-discipline, which the NEW swan-lens-guards.yml runs from repo root. `#000/#fff` in
   `mask`/`-webkit-mask` are compositing ALPHA, not brand colour → added a mask-declaration strip. LESSON: when
   you newly WIRE a lint to CI, run it against the merge target first — it can red-flag pre-existing code the
   author never saw.
3. **500-should-be-400:** the isEmail model validator throws SequelizeValidationError → route catch-all → 500.
   Added an EMAIL_RE pre-check in contactRoutes POST → clean 400. LESSON: a model-level validator without a
   route-level format pre-check surfaces client errors as server errors.
4. Rule-53 cluster: 5 surface flags.ts still said "ABSOLUTE kill switch" contradicting the corrected runbook —
   reworded. Gallery-vnext flags.ts left to its lane.

## State
- Branch `claude/build-swan-lens` ~15 ahead of origin/main, UNPUSHED. Render deploys STILL failing on Render
  infra; nothing live. token-discipline+degalaxy clean from root + fail-closed wrong-cwd; build 19.7s; 7/7 tests.
- Kimi consult running (bbi3zdgbj): acquisition-funnel gap-fill + work-structuring — fold in when it lands.

## Owed
- Sean: NCEP credential real? arm nurture? Both still open. Retry Render deploy when their incident clears.
- The acquisition-funnel build prompt (ACQUISITION-FUNNEL-ACTIVATION-BUILD-PROMPT-2026-07-21.md) is ready to
  execute; nobody has started P0-0..P1-1 yet.
