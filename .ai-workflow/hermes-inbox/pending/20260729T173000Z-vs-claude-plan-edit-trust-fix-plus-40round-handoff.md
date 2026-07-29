---
surface: vs-claude
utc: 20260729T173000Z
topic: Swan Coach plan_edit — hostile review closed a doctrine TRUST HOLE (shipped) + 40-round Dry-Loop handoff written for a fresh agent
tags: [swan-coach, plan-edit, training-cortex, trust, hostile-review, handoff, SWA-46]
---

## What I did / learned
- **Hostile-reviewed the shipped Swan Coach `plan_edit` "trust core" against CURRENT main** (not memory — the subsystem had grown 4+ commits since I first shipped it: audited lifecycle, optimistic contentRevision lock, active-only gate, revision-bound PDF regen; the APPLY path is now solid, don't re-flag it).
- **Found + fixed a real TRUST HOLE (shipped `01a7ee012`):** the deterministic NASM referee validated each change against a phase the LLM itself supplied (`payload.phase`). A proposal could declare "Phase 1" while loading Phase-4 weights and every item stamped `in_doctrine`. **The judge was trusting the accused's own yardstick.** Fix: the referee now resolves the OPT phase from the SAVED PLAN (per-week `optPhase` → `plan.nasmPhase` → default) via a shared `resolveActiveEditablePlan` (referee and writer judge the exact same plan); `payload.phase` is ignored. Proven with an adversarial test: an item carrying a lying `phase:4` is still judged against the plan's Phase-3 and correctly flagged `out_of_doctrine`.
- **Science upgrades same commit:** two-axis verdict (`verdict` + `severity` ok/info/caution — a tempo deviation is `info`/trainer's-call, not visually equal to an out-of-range load); a **magnitude guardrail** (in-range but aggressive single-edit jump >1 set / >10 %1RM → caution; a master caps the RATE of change, not just the endpoint); `plan_unavailable` verdict + `planVerified` flag. 11 new tests + 123 across 24 coach-proposal suites green.
- **Wrote a comprehensive handoff** (`docs/ai-workflow/AI-HANDOFF/SWAN-COACH-PLAN-EDIT-HOSTILE-REVIEW-HANDOFF-2026-07-29.md`) so a fresh agent runs **~40 more Dry-Loop hostile rounds** on the subsystem, then finishes SWA-46.

## Why it matters to Hermes
- The house pattern for ANY AI-write capability: **LLM proposes → FROZEN CODE referees against ground truth (never the model's own claim) → human approves per item.** The trust hole was that the referee trusted a model-supplied parameter — Hermes should treat "the referee's yardstick comes from the model" as a red flag anywhere it appears.
- When reviewing "shipped" work, review CURRENT main, not the memory of what was shipped — this subsystem had materially evolved.

## State right now
- LIVE on main (anchor `2d2c12c28`): trust fix + severity + magnitude. Apply path solid (other agents).
- **Biggest OPEN gap (P1 safety, SWA-46 Slice 1, NOT built):** the referee still returns `unchecked/info` for an `exerciseSwap` — it does not screen a swap against the client's pain/compensation profile though `nasmCesPolicy.mjs` exists. A contraindicated swap reads as "trainer's call." Also a swap-desync bug: `applyItem` rewrites only the exercise NAME, leaving `exerciseKey`/media pointing at the old movement.
- Remaining SWA-46: per-item review UI (frontend has ZERO plan_edit code yet), plan+pain context feed.

## Sean owes / blockers
- Sean to pick the fresh agent's first build after the 40 rounds: CES/pain safety slice **vs** a rewrite of the Coach system-prompt contract itself (he asked; unresolved).
