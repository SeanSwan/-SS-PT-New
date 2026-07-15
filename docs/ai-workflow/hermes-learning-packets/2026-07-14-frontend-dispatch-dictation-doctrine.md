---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-14
topic: FRONTEND_DISPATCH doctrine — how AI edits browser-local surfaces (dictation planner/logger blueprint)
surfaces: [admin-workout-planner, WorkoutLogger, ai-command lane, BLUEPRINT-dictation-planner-logger-sync-2026-07-14]
---

## What was decided/built (Fable-tier lesson)
Forged the builder package for dictation-first control of the Workout Planner and Logger
(docs/ai-workflow/AI-HANDOFF/BLUEPRINT-dictation-planner-logger-sync-2026-07-14/, main @ 1747c45e2).
Core ruling: when Swan Coach (or any AI) must change state that lives in an OPEN browser surface,
the server never writes it. The command lane returns `type:'frontend_dispatch'` naming a
CustomEvent + payload; the client dispatches it; a surface hook applies it through the surface's
existing setters and ACKNOWLEDGES honestly (handled true/false), so receipts can say "no planner
was open" instead of lying. Five logger commands already work this way; the blueprint adds a
`planner_*` family (add/swap/remove/update/generate) plus a `context.surface` field so the intent
parser disambiguates "add X" between planner and logger.

## Why (rationale Hermes should carry forward)
- Persistence stays human: dictated edits only dirty the surface; Sean's Save/Update is the write
  gate. This preserves trainer indispensability and review-before-persist.
- One brain, one transport: no second chat lane/socket. Every new voice surface = mic glue +
  command context + an event family; the lane, parser, and receipt honesty are shared.
- Same-day proof of reuse: the planner swap helpers (applyHorizonSwap etc.) built for manual
  swapping are the exact mutation layer the AI events reuse — build state mutations once, drive
  them from buttons AND voice.

## Reusable pattern / rule Hermes should apply next time
Any "let me talk to <surface>" request decomposes to: (1) dictation glue
(useCoachBrowserSpeechInput + recorder fallback; interim NEVER enters the editable value),
(2) command-lane submit with `context.surface`, (3) FRONTEND_DISPATCH registry entries,
(4) a use<Surface>AiEvents hook mirroring useWorkoutAiEvents with acknowledge semantics.
Related standing facts: plan PDFs auto-attach on create/update (do not rebuild); the logger
auto-loads plans via `loadPlan=today` and only weight is meant to be missing (last-weight
suggestion endpoint is slice S5 of the blueprint).

## Risks / guardrails
- `planner_*` commands are admin/trainer only; clients keep request_plan_adjustment.
- Fuzzy exercise-name resolution must fail honest (receipt asks for more of the name) — never
  guess-swap a movement in a training plan.
- Voice context sends IDs + structural state only (rule 8); health notes never ride command context.
- Builder not yet launched; checkpoints (07-checkpoints.md) gate each slice — drift goes back to
  the builder, never patched silently by the architect.

## Provenance & privacy
originating_model: claude-fable-5 (this session's architect synthesis). Sanitizer: repo secret
scan PASS on the blueprint dir and this packet. IDs/roles only — no client names, no PII, no
secrets.
