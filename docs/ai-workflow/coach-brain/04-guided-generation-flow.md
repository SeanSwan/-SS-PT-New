---
brain: swan_coach_cortex
domain: guided_generation
review_status: approved
authority: sean_codex_2026_06_24
tags: [guided-generation, rolodex, trainer-workflow]
---
# Guided Generation Flow

Swan Coach should support three generation modes.

## Auto Generate

Fast mode. The system chooses the workout from client data, NASM rules, Sean-style weights, and freshness rules. It still shows trainer-facing rationale and safety flags before approval.

## Guide Me

Trainer choice mode. The system asks only the questions needed for the current plan and then shows candidate exercises.

Expected flow:

1. Confirm workout target: body focus, goal, session length, equipment, and intensity flavor.
2. Pull client context, run a readiness check, and identify safety, tightness, range of motion, soreness, recovery, or missing-data flags.
3. Build 4-6 exercise candidates for each important slot.
4. Show each candidate with Rolodex media, source, muscles, equipment, OPT phase fit, and why it is suggested.
5. Let the trainer pick, swap, or auto-fill.
6. Save trainer decisions as preference signals after approval.

## Readiness Check

Before important exercise selection, Swan Coach should ask or confirm the smallest useful readiness check for the session. The check should cover tightness, soreness, range of motion limits, local tissue fatigue, recent heavy training, and whether the client needs release, rolling, rest, or a lower-threat movement option before intensity.

Trainer-facing classification should use Green/Yellow/Red:

- Green: normal tightness or soreness that improves with warmup, release, rolling, and controlled range of motion.
- Yellow: overworked or guarded tissue; reduce load, avoid aggressive failure work, add recovery work, and choose exercises that preserve the goal without provoking the limiter.
- Red: sharp pain, swelling, numbness, tingling, major weakness, recent injury, or symptoms that do not improve; stop provocative work and require referral or clearance.

This check should change candidate scoring. The system can still train the goal, but it should bias toward movements that help the client leave with better control, safer positions, and a more usable body.
## Deep Grill

Planning mode for building Sean doctrine or a new long-horizon client strategy. It can ask more questions, but still one question at a time.

Use Deep Grill when:

- Sean is expanding the brain,
- the client has complex goals or constraints,
- the plan is multi-month,
- the trainer wants to define a new style rule,
- generation is blocked by missing context.

## Candidate Card Requirements

Each candidate should show:

- exercise name,
- preview video or thumbnail when available,
- target muscles and movement pattern,
- equipment,
- NASM phase fit,
- Sean-style match reason,
- safety or form note,
- freshness note,
- joint-integrity note for shoulders, hips, ankles, elbows, hands, forearms, neck, or trunk when relevant,
- readiness/recovery note when tightness, soreness, range of motion, or tissue fatigue changes the best option,
- quick actions: choose, swap, save preference, avoid for this client.

## Learning Loop

A trainer choice is not automatically doctrine. It becomes a signal. Doctrine changes require Sean approval or repeated verified evidence.
