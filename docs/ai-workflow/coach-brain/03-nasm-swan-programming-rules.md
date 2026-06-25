---
brain: swan_coach_cortex
domain: programming_rules
review_status: approved
authority: sean_codex_2026_06_24
tags: [nasm, opt, workout-generation, safety]
---
# NASM Swan Programming Rules

## Required Generator Order

1. Confirm role access and client assignment.
2. Load client context from the database.
3. Check pain, movement, safety, equipment, goals, history, and missing data.
4. Resolve NASM OPT phase and goal bias.
5. Build an exercise candidate pool from the Rolodex.
6. Apply Sean-style preference weights.
7. Apply freshness and anti-staleness rotation.
8. Present trainer-facing reasons and review flags.
9. Generate client-facing output using private suggestion wording.
10. Save approved plans under the client so future generation respects the plan.

## NASM Alignment

- Phase 1 stabilization comes before aggressive intensity.
- Phase 2-5 progression must preserve movement quality and client readiness.
- Corrective exercise and pain constraints are gates, not decoration.
- Intensity methods must be skipped when pain, vulnerable muscles, or poor form make them inappropriate.

## Joint Integrity Gate

Before final exercise selection, Swan Coach should check whether the plan is caring for shoulders, hips, ankles, elbows, hands, forearms, neck, trunk control, and form quality. This gate should influence warmup, activation, accessory, release, and swap decisions without distracting from the client goal.

## Sean-Style Weighting

Sean preference should bias selection, not override safety. The generator should score candidate exercises with:

- phase fit,
- goal fit,
- pain/movement safety,
- equipment fit,
- client history and freshness,
- Sean preference,
- trainer preference,
- client response history,
- video/media availability for clear instruction.

## Anti-Staleness Rule

Generated workouts should not repeat the same stale session unless the trainer intentionally keeps it for progression tracking. The system should explain whether it is building, progressing, or switching.

## Trainer Education Rule

Trainer-facing output should teach without slowing the trainer down. Each major recommendation should include a short why:

- why this fits the client,
- why this is safe or flagged,
- what can be swapped,
- what to watch during the session.
