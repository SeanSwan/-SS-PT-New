---
surface: vs-claude
utc: 20260712T200000Z
topic: Swan Coach plan_edit shipped — Coach proposes, the NASM cortex referees deterministically, the trainer approves PER ITEM
tags: [swan-coach, workout-plans, training-cortex, security, product-doctrine]
---

## What I did / learned
- **SHIPPED (main `374af5b64`):** the `plan_edit` proposal type — Swan Coach can now propose field-level edits to a SAVED WorkoutPlan (one item per change: sets/reps/tempo/restSeconds/targetIntensity/exerciseSwap/notes, each with a one-sentence NASM OPT rationale). The trainer approves **per item** (`approvedItemIds` on the approve call); ONLY the approved subset applies; the rest is recorded skipped.
- **THE TRUST ARCHITECTURE (Sean's #1 requirement — "I need to trust this brain"):** the science is NOT in the prompt. `planEditDoctrineService` checks every proposed acute variable against the frozen `training-cortex` `NASM_OPT_PHASES` table (per-phase sets/reps/tempo/rest/intensity ranges) and stamps a deterministic verdict (`in_doctrine` / `out_of_doctrine` with the exact range shown / `unchecked`). Verdicts are **recomputed server-side on every detail read** — a model-authored or tampered verdict can never reach the trainer (test-pinned: a FORGED stored verdict is overwritten).
- **Weight is intensity-based BY CONTRACT:** the Coach proposes `targetIntensity` (%1RM); it never authors a raw load — same contract as the plan generator.
- **Security posture:** rides the existing proposal machinery (encrypted payload, review-token gate — must open details before approving, trainer-ownership — only the proposing trainer can act, trainer/admin-only routes). Plan ownership is IN THE QUERY (`id + userId`) so a swapped planId cannot reach another client's program. Explicit ids required (no list → no write); unknown/smuggled ids refused; approve-none is valid; validation failures release the claim back to PENDING.
- **Reuse lesson:** the proposal infra's per-type dispatcher meant the whole feature slotted in as one new type + one apply service + one detail branch + a CHECK-widening migration (mirroring the coverage-type migration exactly). No new endpoints; `req.body.approvedItemIds` rides the existing approve route.

## Why it matters to Hermes
- Hermes can now say Swan Coach CAN propose edits to an existing plan — but must always add: **nothing applies without the trainer approving each item**, and every item carries a deterministic NASM doctrine verdict the model cannot forge.
- The "LLM proposes / frozen-code referees / human decides per item" pattern is the house template for ANY future AI-write capability. Hermes should push proposals toward it.

## State right now
- Backend core LIVE on main: doctrine referee, per-item apply, migration, prompt contract (Coach knows the `plan_edit` block format + grounding rules), classifier, summary + detail branches. 10 new tests + 32 regression green; full backend 6384/6385 (the 1 = `missionQaAutomation` Chromium-driver check — machine-environment-dependent, fails in isolation, zero import overlap with this work).
- **NOT built yet (the immediate next slices):** (1) the per-item checkbox review UI in `CoachActionProposalCard` — the detail service already returns stamped items under `planEdit`; frontend needs checkboxes + passing `approvedItemIds` through `approveCoachProposal`; (2) feeding the SAVED plan's content into Coach chat context so proposals reference real weeks/days/exercises (the contract forbids inventing plan content, so without server-provided plan context the Coach must ask/decline).

## Sean owes / blockers (if any)
- None blocking. Next session: the review UI + plan-context feed (both scoped above).
