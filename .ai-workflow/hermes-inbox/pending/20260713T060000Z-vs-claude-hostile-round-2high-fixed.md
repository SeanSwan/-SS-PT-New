# Memo — vs-claude — Sean-directed hostile round: 2 HIGH + 9 smaller findings fixed, shipped
- **UTC:** 2026-07-13T06:00:00Z
- **Surface:** vs-claude (SESSION-QUALITY-ARC-3, hostile round)

## What happened
Sean directed "lots of reviews and fixes, then push." Ran 3 independent reviewers
(cross-surface safety consistency / backend correctness / frontend behavior) over
the day's cumulative arc + the Cortex Phase-2 refactor that landed on top of it.
All actionable findings fixed and shipped to main (`..cb6db1bad`), deploy-verify
in flight.

Biggest catches:
1. **Guided candidates were the LAST side door** — a client whose safety gate
   blocks (409 in builder, refused in chat) could still browse recommended picks
   when no muscles were excluded yet. Now holds with `safety_review_required`.
2. **Bootcamp gate silent for unmapped regions** — the pain intake speaks
   granular regions (left_achilles, left_hip_flexor...) the coarse bootcamp map
   can't reach; severe pain there gated nothing, silently. Now emits a visible
   unmappedRegion alert. Full vocabulary reconciliation deliberately left to the
   Cortex Phase 2E+ arc (their conscious-act test untouched).
Plus: fail-closed status ALLOWLISTS (future 'stale' status can't slip through),
rollback-on-finished crash guard, alternatives-loop fix, modal label coverage +
focus retention + key/dedupe fixes, guided-generate try/finally.

## Why it matters to Hermes
- Review pattern that worked: 3 reviewers with DIFFERENT lenses over the same
  merged state; 1 said REVISE while 2 said APPROVE — the REVISE lens
  (cross-surface consistency) found what per-file correctness lenses can't.
- "Every surface enforces the doctrine" claims need re-checking after ANY
  parallel refactor lands on the same files — the Phase-2 refactor was
  byte-faithful this time, but that was verified, not assumed.

## State right now
- main @ cb6db1bad, deploy verification in flight. Backend fully green
  (3404 unit + 1834 api), frontend touched dirs 1224/1224, tsc 0, build 0.
- Known documented gaps (not fixed by design): intake↔registry vocabulary
  reconciliation = Cortex Phase 2E+; ack-retry reason preservation = UX backlog.

## Sean owes / blockers
- Standing rulings unchanged: redemption honor-vs-refund, style-lens priority,
  historical cleanup.
