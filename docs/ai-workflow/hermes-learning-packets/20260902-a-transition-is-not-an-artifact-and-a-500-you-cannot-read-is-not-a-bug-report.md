---
date: 2026-09-02
originating_model: claude-fable-5-1
provenance: fable-tier-verified
topic: Fable 5.1 hostile re-review of the Fable 5.0 design-brain chain → blueprint v2 for Opus
models_used:
  - model: claude-fable-5-1
    role: hostile reviewer of the prior Fable-tier chain + blueprint author
    did: 12 gap findings (§1 of the blueprint), 10 recorded decisions, 9 BUILD-EXACT slices, 5 mermaids, 4 wireframes, test matrix; no code written by design (token economy)
    cost: subscription (Fable seat — review/blueprint only)
  - model: sonnet (2 Explore subagents)
    role: receipt gatherers
    did: cart-500 backend route receipt (mount walk, schema drift table, 3 ranked hypotheses); client/trainer/admin/arsenal build receipts with file:line
    cost: subscription
  - model: claude-fable-5 (prior session)
    role: the chain under review
    did: Step 3.5, taste bridge, five-surface review, X6 fix, hero triad — sound in substance; 4 incompletions + 1 wrong framing found
    cost: subscription
skills_touched:
  - id: design-brain review workstream (blueprint v2)
    change: created
    failure_motivating: the 5.0 chain's ranked list told Opus WHAT to do but not HOW; and X1 was built on a misidentified primitive
---

# A transition is not an artifact, and a 500 you cannot read is not a bug report

## Who did what

Fable 5.1 re-read the whole 5.0 chain with the specific remit "what did 5.0 miss." Two Sonnet agents fetched receipts; every load-bearing line was re-opened by the lead before it entered the blueprint (the corpus's [LIKELY]-drives-verdict lesson from 24 hours earlier). Fable 5.0's work held on substance: Step 3.5, the bridge contract, the X6 root cause, the trainer/admin corrections all survived. What did not survive was one *identification* and four *incompletions*.

## The durable lessons

1. **Same name, different thing.** 5.0 grepped `useCrystallizeTransition`, found it, and concluded "the Crystallize primitive exists, consumed only by parked surfaces." It is a settings-page theme-switch transition (`CRYSTALLIZE_SURFACE_ID = 'settings.appearance'`). The LAW-5 record artifact — the thing a logged set is supposed to condense into — exists nowhere. A grep hit on a NAME is not evidence the CONCEPT is implemented; read the export's constants and phases before calling it the thing you were looking for.
2. **Observability precedes root cause.** The cart 500 was ranked, hypothesized, and scoped across three review rounds — and its handler logs `error.name` and `error.code` only, never `message`/`stack` (`cartRoutes.mjs:70-76`). Nobody can know the cause until one logging line ships. The blueprint's first cart step is that line, not a fix. A defect you cannot observe cannot be assigned a root cause, only a guess.
3. **Mount order is a receipt, not trivia.** `/api/workout` mounted before `/api/workout/sessions`, and the dedicated sessions router has no `GET /`. The handler everyone thinks serves the Progress tab does not. Every API-touching slice in the blueprint names the mount-walk line.
4. **Tier gates hide defects and hide fixes.** The banned creature image only renders on the `full` tier; balanced/essential get nothing. A finding that says "replace the image" without the tier semantics ships a fix that two of three tiers never see — and leaves those tiers imageless. Asset specs must state per-tier behavior.
5. **A cumulative log cannot attribute traffic.** The 5.0 session called the fetch storm "confirmed anonymous" from a Playwright network list that accumulates across navigations. The blueprint's probe uses a fresh browser context — the only instrument that can make that claim.

## Mistakes I made

- Started writing the blueprint's S8 pagination spec against `workoutSessionRoutes.mjs` before checking mount order; the shadow check reversed the target file. Caught before writing, but the reflex to trust a filename over a mount walk is the same family as G5.
- One grep pipeline returned nothing (a `sed` range built from an empty variable) and I nearly read the empty output as "no pagination handling exists" — an instrument failure masquerading as an absence. Re-issued the probe; left the claim as `[HYPOTHESIS]` with a read-first instruction in the slice.
- Did not run the 5.0 session's taste-bridge test suite myself before citing "12 checks green" in the blueprint — carried forward from the prior session's proof. Marked as the required baseline command in §6 so Opus re-proves it.

## Error → fix → repeat ledger

- **Name-match → concept-claim** (new family this session, related to narrow-probe→broad-claim): 1 occurrence in the reviewed chain (X1), 0 repeats after naming it. Surviving correction: when a grep "finds the primitive," quote its exported constants/phases in the receipt before classifying.
- **Narrow-probe → broad-claim:** recurred in the 5.0 session (anonymous storm) — third occurrence across two days for this workstream. The procedural fix that finally sticks is instrument-specific: "cumulative network log → fresh context or no attribution."
- **[LIKELY] receipt drives a decision:** 0 occurrences in the blueprint — every slice's load-bearing lines were lead-opened; the three unopened facts are tagged `[HYPOTHESIS]` with a probe.

## External-model calibration

No paid seats this session. Two Sonnet receipt agents: 100% of spot-checked lines held (cart mount walk, association file, admin band boundaries, arsenal tier gate).
