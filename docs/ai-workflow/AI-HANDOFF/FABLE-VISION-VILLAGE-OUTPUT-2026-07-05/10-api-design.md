# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 56.8s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

We are reviewing the plan document for API surface. We are the API design the plan is a master plan for the SwanStudios SaaS platform.

 We are to review the plan and derive the actual endpoints (existing and new) from the plan.

 Steps:

 1. Existing API sufficiency: For each surface (workstream) in the plan, we need to check if the existing endpoints return enough data or if a new endpoint is required.

 2. Search/query needs: Where the plan filters client-side, is that adequate at scale? If not, we need server-side search/pagination.

 3. New endpoint design: For each new endpoint the plan proposes, check the REST shape (verbs, resource nesting, payload, multipart if uploads).

 4. Multimodal/large payloads: If the plan sends images/audio/large bodies, how should the contract handle them?

 5. Rate limiting: For each new operation, what rate limits are appropriate?

 6. Realtime vs polling: Should any new updates be pushed (WebSocket/SSE) instead of polled?

 7. Response contracts: Are response shapes/types adequate and stable for the consumers?

 8. Caching strategy: For each cached read, is the TTL appropriate, and what invalidates it on write?

 We must output as structured markdown with specific API design recommendations.

 We are to derive every feature-specific detail from the plan content provided.

 Let's go through each workstream (A to L) and note the API-related parts.

 However, note that the plan is very long and we are to focus on the API surface.

 We'll look for mentions of API endpoints, data fetching, and any backend changes.

 We note that the plan says: "Grounded current state" and "Desired end state", and then "Gap analysis", and then "Data & API contract".

 We are to extract the API contract from the plan.

 Since the plan is for multiple workstreams, we'll go through each and note:

   - Existing endpoints that are used and whether they are sufficient.
   - New endpoints that are required.

 We'll also note any search/query needs, multimodal payloads, etc.

 Let's start by scanning the plan for API-related terms.

 We note that the plan has a section for each workstream (A to L) and in each, there is a "Grounded reality" and "Fable must design".

 We are particularly interested in the "Data & API contract" part of the output contract (section 2.7) but note that the plan may not have filled that in for every workstream? Actually, the plan says that for each workstream, Fable's final plan must contain all of the items, including 7. Data & API contract.

 However, the plan we are reviewing is the master brief (Fable's plan) that is to be used by the worker-bot. So we are to review this plan and derive the API surface from it.

 We must look in the plan for any mention of API endpoints, methods, etc.

 Let's go workstream by workstream.

 Note: The plan is very long, so we will focus on the parts that mention API, endpoints, backend, etc.

 We'll also note any existing endpoints that are mentioned in the grounded reality.

 We are to verify any "no backend changes" claim.

 Let's begin.

 Workstream A: Theme picker ease-of-use + cross-theme contrast

   - Grounded reality: 
        * Theme persists to localStorage only (no DB sync).
        * There is a dormant direct-select grid: `ThemeShowcase.tsx` (setTheme(id)).
        * Contrast is runtime-enforced for button text only; single-point contrast home: `utils/theme/themeUtils.ts`.

   - Fable must design:
        * Dual affordance (keep 1-tap cycle + add a mobile bottom-sheet / desktop popover jump-to-theme picker built on `ThemeShowcase`).
        * Table-driven WCAG pass across all 28 themes that clamps `--text-muted/--text-label/--text-secondary` via the existing luminance helper.

   - API: No mention of API endpoints. This is purely frontend/themeing. So no backend changes.

 Workstream B: Exercise Rolodex remake + consolidation

   - Grounded reality:
        * Unified DATA, fragmented PRESENTATION.
        * Canonical = `WorkoutLogger/NASMExerciseRolodex.tsx`
        * Shared spine `useExerciseSearch.ts` → `exerciseRoutes.mjs:480` (`/library`) → `Exercise` model (~736 rows).
        * 6 pickers total, all on the same endpoint (canonical + planner + bootcamp + WorkoutManagement/ExerciseLibrary + ExerciseSelectionStep + pages/workout/ExerciseSelector), plus dormant + wrong-endpoint `Shared/ExercisePickerPanel.tsx` (0 consumers, points at trainer-only `/search` → 403 for clients).

   - Fable must design:
        * Extract ONE shared `<SwanExercisePicker>` from `NASMExerciseRolodex` (virtualized + preview + mobile core), unify the divergent filter vocab, have planner + bootcamp consume it.
        * Replace the anchored dropdown overlay with a mobile bottom-sheet.
        * Retire the 5 competing/legacy/orphan selectors.
        * Promote real `coachingCues`/`instructions` over the `getExerciseTips()` keyword heuristic.
        * Surface an honest "no demo video yet" state.
        * Rule-58 schema cross-check on `exerciseLibraryContract.mjs` before trusting counts.

   - API: 
        * The existing endpoint is `/library` (from `exerciseRoutes.mjs:480`). 
        * The plan says all 6 pickers are on the same endpoint. So the existing endpoint `/library` is used by all.
        * The plan does not mention any new endpoint. It is about consolidating the frontend to use the same endpoint and improving the frontend component.
        * However, note that the plan says: "unify the divergent filter vocab". This might imply that the existing endpoint `/library` might need to support new filter parameters? But the plan doesn't explicitly say to change the backend.

        * We must check: does the existing endpoint `/library` return enough data for the new Rolodex?

        * The grounded reality says the `Exercise` model has ~736 rows. The endpoint `/library` likely returns a list of exercises.

        * The new Rolodex wants to show: preview split-view, keyboard nav, real mobile tuning, and also `coachingCues`/`instructions` (which are fields on the Exercise model?).

        * We must check if the existing endpoint returns the `coachingCues` and `instructions` fields.

        * If not, then we may need to adjust the endpoint to include these fields, or the frontend might be missing them.

        * However, the plan says: "promote real `coachingCues`/`instructions` over the `getExerciseTips()` keyword heuristic". This suggests that the data is already present in the model but not being used in the current Rolodex.

        * Therefore, the existing endpoint might already return these fields, but the current Rolodex is not using them.

        * So the existing endpoint might be sufficient.

        * But note: the plan says "unify the divergent filter vocab". This might mean that the frontend is currently using different filter parameters in different pickers, and we want to unify them to a single set of filter parameters that the backend endpoint `/library` already supports? Or do we need to change the backend to support a unified set of filters?

        * The plan does not specify changing the backend. It says: "unify the divergent filter vocab" in the frontend.

        * Therefore, we assume that the existing endpoint `/library` is sufficient and returns the necessary data (including the fields needed for the new Rolodex) and supports the necessary filter parameters.

        * However, we must verify: the plan does not mention any backend change for B.

        * But note: the plan says "Rule-58 schema cross-check on `exerciseLibraryContract.mjs`". This is a frontend contract? Or a backend contract? The file name suggests it might be a contract for the exercise library (backend). We are to check the schema drift.

        * Since the plan says to cross-check, it implies that there might be a drift between the frontend expectation and the backend schema. But the plan does not say to change the backend, only to cross-check.

        * Therefore, for B, we do not require a new endpoint, but we must ensure that the existing endpoint `/library` returns the necessary data (including `coachingCues` and `instructions`) and that the frontend uses the correct field names.

        * If the existing endpoint does not return `coachingCues` and `instructions`, then we would need to change the backend. But the plan does not explicitly say to change the backend, so we assume the data is there.

        * However, to be safe, we note that the plan does not require a new endpoint for B, but we must verify the existing endpoint's response.

 Workstream C: Bootcamp creator remake

   - Grounded reality:
        * Large, LIVE, actively-developed (~40 files + `backend/services/bootcamp/`).
        * Dual/tri-mode station builder with genuine differentiators.
        * Sibling: Sprint Planner (3-month, `/api/bootcamp/sprints`).
        * Uses its own `ExerciseRolodexPanel` → Workstream B applies.

   - 🔑 Highest-value gap: the "**Log class as taught**" UI does NOT exist — backend + `useBootcampAPI.logClass/getHistory` exist but no component consumes them → the freshness engine is starved (no way to write `BootcampClassLog`).

   - Fable must design:
        * Ship the "Mark as Taught" + class-history UI (activates freshness + history + analytics).
        * Bridge group participation into per-client progress (optional attribution → data-truth loop).
        * Mobile-first stepped flow (replace the clipped 3-pane deck on phone).
        * Consolidate 3 nav paths to one.
        * Split the 657-line generator under the cap.
        * Showcase the buried differentiators as premium UI moments.
        * Canonical-Rolodex integration (B).
        * Optional live interval/timer runner.

   - API:
        * The plan mentions that the backend for `useBootcampAPI.logClass/getHistory` exists but is not consumed by any component.
        * So we have existing endpoints for logging a class and getting history? 
        * The plan does not specify the exact endpoints, but we can infer:
            * `logClass`: likely a POST to `/api/bootcamp/classes/:id/log` or similar.
            * `getHistory`: likely a GET to `/api/bootcamp/classes/:id/history` or `/api/bootcamp/class-logs`.

        * The plan says: "Ship the 'Mark as Taught' + class-history UI". This UI will consume the existing `logClass` and `getHistory` endpoints.

        * Therefore, no new endpoint is required for the bootcamp creator remake? 

        * However, note that the plan also says: "Bridge group participation into per-client progress". This might require new endpoints to fetch group participation data and update per-client progress? 

        * But the plan does not specify any new endpoint for that. It might be done by existing endpoints.

        * Also, the plan says: "Consolidate 3 nav paths to one". This is frontend.

        * Therefore, for C, we do not require a new endpoint, but we must use the existing `logClass` and `getHistory` endpoints.

        * However, we must check if the existing endpoints return enough data for the class-history UI.

        * The plan does not mention any backend change for C.

 Workstream D: Pain charts upgrade

   - Grounded reality:
        * The anatomical body-map upgrade + pain-aware generation are on origin/main.
        * The upgrade PLAN doc is on origin/main.
        * The NEW upgrade CODE is unpushed/unreviewed on the stale branch (commit `d7e501559`): `painChartInsights.ts`, `PainChartInsightPanel.tsx`, `PainChartTrendFollowUp.tsx`, `BodyMapClientTargetSelector.tsx`.
        * All insights are REAL (derived from `ClientPainEntry` rows).
        * ⚠ Two merge regressions if cherry-picked naively (deletes `BodyMapEvidenceSection` + `resolveAnatomyGender`, both live on origin/main).
        * 🔑 Loop not closed: the pain→workout `promptSnippet`/`workoutConstraints` are display-only — no wiring into Coach/bootcamp generation.

   - Fable must design:
        * (a) preserve the WIP; 
        * (b) 3-way merge onto current origin/main;
        * (c) close the pain→workout loop — wire `workoutConstraints`/`promptSnippet` into the Coach + bootcamp generator;
        * (d) promote Pain Intelligence into the dashboard next-best-action (H);
        * (e) decide client-vs-staff exposure of injury guidance (liability);
        * (hygiene: delete dead `getContrastColor`, replace the brittle source-string test.

   - API:
        * The plan mentions that the insights are derived from `ClientPainEntry` rows. So there must be an endpoint to fetch pain entries? 
        * The plan does not explicitly mention any endpoint, but we can infer that there is an endpoint to get pain entries for the pain chart.

        * The plan says: "close the pain→workout loop — wire `workoutConstraints`/`promptSnippet` into the Coach + bootcamp generator". This implies that the backend for Coach and bootcamp generator must be updated to accept and use the `workoutConstraints` and `promptSnippet` (which are derived from pain entries).

        * However, the plan does not specify any new endpoint. It says to wire the existing data (which is already being computed and displayed) into the Coach and bootcamp generator.

        * Therefore, we assume that the existing endpoints for Coach and bootcamp generator are sufficient to receive the `workoutConstraints` and `promptSnippet` as part of the request? Or do we need to change the endpoints to accept new parameters?

        * The plan does not specify. But note: the `workoutConstraints` and `promptSnippet` are derived from pain entries and are currently only displayed. To use them in the Coach and bootcamp generator, we would need to send them from the frontend to the backend when generating a workout or bootcamp.

        * Therefore, we might need to change the existing endpoints for workout generation and bootcamp generation to accept new parameters (like `workoutConstraints` and `promptSnippet`).

        * However, the plan does not explicitly say to change the backend. It says to "wire" them, which might mean that the frontend will now include these in the request to the existing endpoints.

        * So we assume that the existing endpoints for workout generation and bootcamp generation already accept these parameters? Or we need to extend them.

        * Since the plan does not mention a new endpoint, we assume that we are to extend the existing endpoints (if necessary) to accept the new parameters.

        * But note: the plan says "wire into", which might be done without changing the endpoint if the data is already available in the context (e.g., from the pain chart component). However, the Coach and bootcamp generator are likely separate processes that don't have the pain chart context.

        * Therefore, we likely need to change the existing endpoints for workout generation and bootcamp generation to accept the pain-derived constraints and snippet.

        * However, the plan does not specify the exact endpoints. We must look for them in the grounded reality.

        * The grounded reality does not mention any endpoint for Coach or bootcamp generator in D.

        * We know from other workstreams:
            * Coach: might be related to the workout logger? 
            * Bootcamp generator: we saw in C that there is a bootcamp service.

        * Given the lack of explicit endpoint mention, we will note that for D, we may need to modify existing endpoints (for workout generation and bootcamp generation) to accept new parameters (workoutConstraints and promptSnippet). But we do not require a new endpoint.

        * However, the plan does not say "no backend changes", so we must be cautious.

        * We'll come back to this after reviewing all.

 Workstream E: Nutrition ecosystem deepening

   - Grounded reality:
        * Hub `NutritionWorkspace.tsx` (13 tabs, subscription-gated).
        * REAL: meal logger → `DailyMacroLog` via `/api/macros` (USDA FoodData Central + OpenFoodFacts + CalorieNinjas); supplement gap-analysis (reads 7–30d macros); barcode scanner (OpenFoodFacts + FatSecret, caches `FoodProduct`); garden zone lookup (phzmapi.org); ingredient safety; AI photo (Gemini).
        * STATIC: garden = 15 hardcoded plants / 1 microgreen, no grow-tracking; supplements = 12 hardcoded, ALL affiliate URLs empty.
        * BROKEN/MISLABELED: farm finder on deprecated USDA AMS endpoint; restaurant tab is a FatSecret nutrition-FACTS search mislabeled as a location finder.
        * Meal logger fragmented across 4 surfaces + 2 barcode entry points.

   - Fable must design:
        * Consolidate the 4 logger surfaces into one "logger mill" (manual/search/voice/photo/barcode as modes of ONE flow).
        * A deep garden module (My Garden model, grow-tracking, microgreen timelines, care reminders, harvest journal, garden→macro bridge).
        * A durable farm-finder strategy — spell out paid API vs self-built dataset/API per Sean's cost constraint.
        * Split "Menu Nutrition Facts" from a true geolocation "Restaurants Near Me" finder.
        * Wire supplement affiliate URLs (or a self-hosted product/link table).
        * Re-mount/unify the camera barcode scanner.

   - API:
        * The plan mentions:
            * Meal logger: uses `/api/macros` (existing).
            * Barcode scanner: uses OpenFoodFacts and FatSecret (external APIs) and caches `FoodProduct` (so we have a backend endpoint to get cached food products? or to save scans?).
            * Garden zone lookup: uses phzmapi.org (external API).
            * Farm finder: currently broken (deprecated USDA AMS) -> we need to either use a paid API or build our own.
            * Restaurant finder: currently mislabeled -> we need to split into two: one for menu nutrition facts (which might use an existing endpoint for nutrition facts) and one for geolocation (which we need to build or use a paid API).
            * Supplement affiliate URLs: we need to wire them -> we might need a backend endpoint to get

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
