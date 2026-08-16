---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-15
topic: LLM-boundary schema doctrine — the Coach command-lane outage root cause (post-deploy recursive review R1-R5)
surfaces: [backend/services/ai/commandRegistry/baseSchemas.mjs, backend/services/ai/commandRegistry/workoutCommands.mjs, backend/services/ai/intentClassifier.mjs, frontend admin-workout-planner useWorkoutPlannerAiEvents]
title: Llm boundary schema doctrine
tier_basis: Fable 5 is the reference Fable tier (Rule 68 — the model the corpus is named for)
decision: LLM-boundary schema doctrine — the Coach command-lane outage root cause (post-deploy recursive review R1-R5)
status: draft
migrated: 2026-08-16 — required keys back-filled mechanically (title<-filename; tier_basis<-designation; decision<-topic (re-keyed, not re-authored); status=draft (never reviewed against a contract)); originating_model untouched
---

## What was decided/built (Fable-tier lesson)
Live-prod QA of the dictation feature exposed that EVERY client-less Swan Coach command in
production had been silently collapsing to the chat fallback. Five verified root causes were
fixed in one recursive loop (main commits `b9052cfff`→`12dd2725a`):
1. `ClassifiedIntentSchema.clientRef` used bare `.optional()` while the classifier prompt's own
   OUTPUT FORMAT and examples instruct the model to emit the literal `null` — zod rejected it,
   and the parse fallback returned `chat/confidence:1`, indistinguishable from a real chat intent.
2. Models emit numerics as strings (`"sets":"3"`) — bare `z.number()` rejected them.
3. The classifier summary never showed the model the expected param KEY NAMES, so it copied the
   `{exercise}`-style pattern placeholders as keys → `exerciseName: Required` rejections.
4. Dictated speech is plural ("goblet squats"); libraries store singular names — a longer plural
   query can never substring/fuzzy-match a shorter target.
5. The same plural gap existed at a SECOND site (in-plan name matching) — fixing one link of a
   resolution chain without sweeping its siblings re-fails one step later.

## Why (the rationale Hermes should carry forward)
The model was never the problem — it classified perfectly the entire time. Every failure was the
DETERMINISTIC shell around the model contradicting what the prompt teaches the model to do.
When an LLM lane "does nothing," suspect the validation/plumbing contract before the model.

## Reusable pattern / rule Hermes should apply next time
- Every zod schema that validates LLM OUTPUT must accept what the prompt teaches: `.nullable()`
  wherever the prompt says "or null", `z.coerce.number()` for numerics, and the prompt must SHOW
  exact param key names (derive `[params: ...]` from the schema shape — one source of truth).
- Fallback signatures are diagnosable from outside: a consistent `chat/confidence:1` in <1s is a
  parse/validation fallback, not a slow model call. Compare a WORKING sibling lane (chat) against
  the broken one (classify) to isolate the differing layer.
- Decisive probe pattern: replay the REAL server function locally with env loaded INSIDE the
  script (never echoed) — the warn line that never reaches the client names the exact bug.
- Voice-input resolution needs plural→singular fallback at EVERY matching site (never strip
  double-s words like "press"); sweep all siblings of a resolution chain in the same fix.

## Risks / guardrails
- Coercion can silently change established contracts — one union (scheduledSessionId) had to keep
  strings; two existing suites pinned it. Coerce LLM-fed fields, not cross-service ID contracts.
- The classifier prompt grew (~+1.2k tokens for 126 command param lists) — acceptable; watch cost.
- Honest failure receipts were what made each next round findable — never mask them with generic copy.

## Provenance & privacy
originating_model: claude-fable-5 (this session, probe-verified before each fix); sanitizer PASS
(scan-secrets 0 hits); IDs-only confirmed (client referenced as ID 84 only; no keys, no PII).
