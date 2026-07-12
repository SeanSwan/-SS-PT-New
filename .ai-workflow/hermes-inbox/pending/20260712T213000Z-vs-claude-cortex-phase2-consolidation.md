# Hermes Inbox Memo
- **When (UTC):** 2026-07-12T21:30:00Z
- **Surface:** vs-claude (Fable 5)
- **Topic:** Cortex Phase 2 consolidation batch (2A-2D) built; two real drift findings locked

## What happened
Phase 2 "Consolidation & Ontology Foundation" first batch on branch claude/cortex-p0-safety-20260712 (4 commits, zero-behavior-change discipline, byte-identity test locks):
- **2A** `training-cortex/policy/nasmOptPolicy.mjs` — THE single NASM OPT acute-variable table; builder's OPT_PHASE_PARAMS + its duplicate inline intensity map + candidate-card defaults now derive from it.
- **2B** `training-cortex/policy/nasmCesPolicy.mjs` — CES_MAP (ILA strategies) + COMPENSATION_TO_V3B3_TAGS (registry-tag bridge) merged into one per-compensation catalog; closed-set taxonomy tripwire.
- **2C** `training-cortex/ontology/regionMuscleMap.mjs` — both region→muscle vocabularies (registry tags vs bootcamp Rolodex prose) in ONE home, difference explicit.
- **2D** acknowledge-review dialog (SafetyGateModal) now on the two older LIVE generation surfaces — WorkoutBuilderPage (/workout-builder) + WorkoutPlanBuilder (clients-team Training tab) via new shared `components/cortex/useSafetyGateReview.ts`.

## Transferable facts
- **[VERIFIED] Real drift #1:** nasmProgressionService Phase-5 repRange '1-10' vs canonical NASM Power 1-5 — locked as a documented variance; resolving = touch the test consciously (2A.2 + consumer sweep).
- **[VERIFIED] Real drift #2:** 18 of 34 mapped pain regions (neck/hip/core/left_ankle-class bilateral names) can NEVER be produced by the pain-intake allowlist ('neck_front'-style keys) — pain there still 409s the gate but excludes no muscles at selection. Pain-chart/ontology reconciliation arc queued.
- `adminClientService.generateWorkoutPlan` = DORMANT (zero callers) — classified, no UI built.
- Hazard class worth remembering: widening a handler that's ALSO a bare onClick lets the MouseEvent flow into the new param — shape-guard before spreading (`caught in useWorkoutPlanBuilderController`).
- Consolidation recipe that worked ×3: canonical module + consumers derive legacy shapes + byte-identity snapshot tests + drift tripwires on the copies you DIDN'T relocate.

## State / Sean owes
- Batch NOT pushed (gates in flight at memo time). Sean gates the push.
- Next arc (2E+): unify services/ai/contextBuilder onto clientIntelligenceService, knowledge_sources + exercise_clinical_profiles additive migrations, persona vault doc (10-coach-persona-and-voice.md), region-vocabulary reconciliation, progression-service drift resolution.
