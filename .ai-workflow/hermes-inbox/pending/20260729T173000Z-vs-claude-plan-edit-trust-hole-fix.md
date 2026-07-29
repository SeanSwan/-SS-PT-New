---
surface: vs-claude
utc: 20260729T173000Z
topic: Swan Coach plan_edit — closed a doctrine TRUST HOLE (referee trusted the LLM's own phase); added severity + magnitude guardrails
tags: [swan-coach, plan-edit, training-cortex, security, trust, nasm]
issue: SWA-46
---

## What I did / learned
- **Hostile-reviewed the shipped plan_edit "trust core" against CURRENT main** (not memory — it had drifted 4+ commits: audited lifecycle, optimistic contentRevision lock, active-only gate, revision-bound PDF regen; the APPLY path is now solid, don't re-flag it).
- **Found + fixed a real TRUST HOLE (`01a7ee012` on main):** the deterministic doctrine referee validated every change against a NASM OPT phase the **LLM itself supplied** (`payload.phase`). A proposal could declare "Phase 1" while loading Phase-4 weights and every item stamped `in_doctrine`. A referee that trusts the accused's own yardstick is not a referee.
- **Fix:** phase is now resolved from the SAVED PLAN (per-week `optPhase` → `plan.nasmPhase` → default) via a shared `resolveActiveEditablePlan` — the referee judges the EXACT plan the apply path mutates; they can never disagree on the target. `getCoachActionProposal` loads the plan and passes it to the sanitizer; items carry `phaseUsed`/`phaseSource`/`planVerified`.
- Added a **severity axis** (ok/info/caution) so a harmless tempo deviation ≠ an out-of-range load; a **magnitude guardrail** (in-range but >1-set / >10-%1RM single-edit jump → caution, beyond NASM 2-for-2); `plan_unavailable` verdict (archived/deleted plan) backstopped by the apply path independently refusing a missing plan.

## Why it matters to Hermes
- **The house lesson for ANY AI-write capability:** a deterministic "referee" is only trustworthy if it sources its ground-truth (phase, current values, client constraints) from the SYSTEM OF RECORD, never from the model's own message. If the model supplies the yardstick it's measured against, the check is theater. Hermes should apply this test to every propose→approve→apply flow.
- Plan ids are **UUIDs** (not integers); the id-normalization is UUID-strict and degrades safe on malformed input.

## State right now
- Backend LIVE on main. 11 new tests (incl. an adversarial "fake payload.phase cannot launder an out-of-doctrine change" lock) + 779/783 across 144 workout-plan/AI/coach files green. tsc n/a (backend .mjs, node --check clean). Rule 42 clean; secret scan clean.
- Dry-Loop: 2 consecutive CLEAN rounds (broad-domain suite; adversarial fuzz of the new functions).

## Open (SWA-46, still to build — NOT done)
- **P1 SAFETY GAP:** the referee still returns `unchecked/info` for an `exerciseSwap` — it does NOT check the swap against the client's pain/compensation profile even though `training-cortex/policy/nasmCesPolicy.mjs` exists. A contraindicated swap reads as "trainer's call." Next slice wires CES + client pain so it flags the reserved `contraindicated` severity, and fixes swap-desync (a swap rewrites only the name, leaving exerciseKey/media pointing at the old exercise).
- Then: per-item trainer review UI (severity-colored badges) + feed the de-identified plan+pain into Coach chat context.

## Sean owes / blockers
- None blocking. Sean asked whether next = the CES/pain safety slice or a rewrite of the Coach system-prompt contract itself.
