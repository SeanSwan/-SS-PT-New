# Swan Coach Hive-Mind — C0 (Locate) complete; 5 premise corrections + a live P0

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 (comment posted) · related SWA-59, SWA-63, SWA-51, SWA-46, SWA-64
**Branch:** `claude/coach-hive-mind-20260724` off `origin/main@e57f6804a` — worktree-isolated, **not pushed, not merged**
**Artifact:** `docs/ai-workflow/AI-HANDOFF/COACH-HIVE-MIND-C0-CANONICAL-RECEIPT-2026-07-24.md` @ `3e2a6930f`

---

## Why Hermes should carry this

Five load-bearing facts about the Swan Coach lane were wrong in the program's own master prompt. Any future agent starting Coach work from that prompt will repeat the same mistakes unless these land.

## Transferable facts

1. **The Coach backend is `backend/services/ai/`** — not `backend/services/swanCoach/` (never existed). 165 files: 19 domain command registries, 49 dispatchers, ~119 commands across categories A–N, plus `contextEngine/`, `adapters/` (anthropic/gemini/openai/venice), `pipeline/EthicalAIPipeline.mjs`. **Anyone told the Coach backend is "missing" is being misinformed.**

2. **An eval harness already exists and is CI-wired** — `backend/eval/` with `goldenDataset.mjs`, `evalRunner`, `evalThresholds`, `driftDetector`, `evalReport`; npm scripts `eval`, `eval:report`, `eval:baseline`, `eval:drift`, `eval:drift:strict`, `provider:ab*`. It gates **output validity** (schema / PII / contraindication / scope-of-practice / adversarial). It does **not** gate **utterance→intent resolution** — that axis is genuinely uncovered. Extend, never rebuild.

3. **`backend/eval/coachCommandCenterGoldenScenarios.mjs` is DORMANT** — has the right shape (`expectedIntent`, `expectedClientRef`) and **zero importers**. Independently flagged in `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-07-16.md` (lines 122, 262) as "no current importer / wiring or archiving" and unmoved since. Adopt it rather than authoring a new fixture shape.

4. **The event bus is partially built** — `frontend/src/utils/aiWorkoutEvents.ts` (193 ln) is the **sole** dispatched-event registry: four families (logger `AI_*`, `AI_PLANNER_*`, `AI_BOOTCAMP_*`, `AI_PAINCHART_*`), DOM CustomEvent transport, acknowledge contract, planner Undo shipped. Missing: persistence, replay, `inputOrigin`, offline queue, reconciliation state. Two other files declare `AI_`-prefixed constants that are **not** events (`hooks/aiMessageLimits.ts` = char limits; `Shared/AITerminalPanel.types.ts` = a context array) — naming coincidence, zero `dispatchEvent` hits.

5. **The typed-intent contract and confirmation taxonomy already exist** — `backend/services/ai/commandRegistry/baseSchemas.mjs`: `ClassifiedIntentSchema` carries `intent` / `clientRef` / `params` / **`confidence`**; `CommandDefinition` carries **`destructive`**, **`requiresConfirmation`**, **`roleRequired`**, **`requiresClientRef`**. A tiered voice-confirmation model is an *extension* of these, not a new contract.

6. **`inputOrigin` exists nowhere** in `frontend/src` or `backend` — the voice-vs-manual telemetry gap is total. Cleanest insertion point is `dispatchers/workoutLogWriteDispatcher.mjs` (30 ln, clean param bag) → `services/workout/aiWorkoutDailyFormService.mjs`; persistence-layer landing not yet traced to a column.

## 🔴 Live P0 — wrong-client write on main

`backend/services/ai/dispatchers/scheduleWriteDispatchers.mjs:115` and `:157` resolve the client from **`params.clientId`** (classifier-extracted) while **`ctx.resolvedClient` is in scope and ignored** — `ctx` is provably available, used at `:113` and `:120`. Writes land at `:131` (`Session.create`) and `:161`.

A misparsed pronoun ("schedule her for Tuesday at 3") books or reschedules against the **wrong client's record**, even with a client selected on screen. The shared guard `dispatchers/clientScope.mjs` exists and **21 of 49 dispatchers use it**; this one does not.

`workoutSessionCommandDispatchers.mjs:33` inlines equivalent precedence — **drift risk, not a live defect** (an earlier flag of it was a false positive, corrected after reading source).

**Distinct from SWA-17**, which was a frontend draft-store actor-scoping issue and is resolved on main. This one is a backend write path and is unfixed.

## Scope corrections worth remembering

- **Dictation is already half-unified.** `coach-assistant/hooks/useCoachBrowserSpeechInput.ts` is the canonical primitive with **5 non-test consumers** (CoachDock, voiceCapture, CoachInputBar, ClientTrainingCommandBar, WorkoutLogger). **6 stragglers** still own speech directly: `AIAssistant/DictationOrb.tsx` (500 ln), `FoodTracker/useNutritionDictation.ts`, `UniversalMasterSchedule/ScheduleAiOperatorDock.tsx`, `Shared/CrystallineVoicePill.tsx`, `UserDashboard/components/SwanCoachActionLauncher.tsx`, `pages/support/useSupportDictation.ts`. The job is convergence, not a rewrite.
- **Grep gotcha:** `useSupportDictation.ts` aliases `window` to a local `speechWindow` before reading `SpeechRecognition`, so `window.SpeechRecognition` patterns produce a **false negative**. Any speech-convergence sweep must match the aliased form.
- **A fifth Coach surface exists** beyond the usual four (coach-assistant / WorkoutLogger / admin-workout-planner / BootcampBuilder): `DashBoard/workspaces/clients-team/ClientTrainingCommandBar.tsx`.

## Process fact

Branch hygiene mattered: the program's "verified" file inventory was derived from a tree **1092 commits behind main**. Re-verification on fresh main happened to match exactly (369/203/160/64/10, WorkoutLogger 866 ln) — but the *interpretations* built on it did not survive. **Re-verify on fresh main before planning, every time.**

## Status / next

C0 delivered; awaiting Sean on two questions: (1) run the new **C0.5** wrong-client hotfix before C1, or hold to the original order; (2) if C0.5 — cherry-pick to `main` standalone, or batch per Rule 70.

**Provenance:** Opus 5 (sub-Fable). Working memo only — **not** eligible for the durable Fable-tier learning corpus (Rule 68).