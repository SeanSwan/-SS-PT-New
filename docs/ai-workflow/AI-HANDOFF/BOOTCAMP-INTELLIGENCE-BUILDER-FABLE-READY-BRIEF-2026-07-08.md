# Bootcamp Intelligence Builder - Fable Ready Brief

**Date:** 2026-07-08
**Surface:** Admin/Trainer Bootcamp Creator
**Status:** Local foundation pass ready for Fable review. Implemented locally: OPT phase handoff, strict equipment/evidence engine, generator helper extraction, shared Exercise Intelligence Picker wrapper, compact equipment-manager shortcut, and video-first exercise detail media.

## Plain-English Summary

Bootcamp Builder now has a stronger foundation for Fable to review. The generate path carries OPT phase through to the Rolodex query, selected equipment profiles are treated as strict generation context, confirmed equipment-exercise mappings are pulled into candidate evidence, and generated exercises now carry selection/media/equipment fields that the UI can explain.

The frontend now routes manual and hybrid Bootcamp picking through a shared `ExerciseIntelligencePicker` wrapper instead of directly binding every Bootcamp surface to the raw Rolodex panel. The normal exercise detail panel also uses the same media resolver as Demo Mode, so trainers see the video/poster/evidence stack before the old How-to section. The generator was also split back under the 300-line rule so Fable can review smaller modules instead of one mixed orchestration file.

This does not claim the final expert-level Bootcamp brain is finished. The remaining Fable review target is the next layer: richer station roles, explicit insufficient-equipment UX, deterministic coach review sequencing, and true inline equipment/mapping workflows beyond the current direct Equipment Manager shortcut.

## Current Source Receipt

| Layer | Current Evidence |
| --- | --- |
| Admin route mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:134` mounts `/equipment`; `:135` mounts `/bootcamp` to `BootcampBuilderPage` for admin. |
| Trainer route mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:167` mounts `/equipment`; `:168` mounts `/bootcamp` to `BootcampBuilderPage` for trainer. |
| Frontend Bootcamp composition | `frontend/src/components/BootcampBuilder/BootcampBuilderSidePanels.tsx:95` and `:138` mount `ExerciseIntelligencePicker`; `:107` and `:143` pass manual/hybrid context. |
| Frontend equipment shortcut | `frontend/src/components/Shared/EquipmentProfilePicker.tsx:54` resolves the role-aware Equipment Manager path; `:118-123` renders the compact `Manage Equipment Profiles` action. |
| Frontend detail media | `frontend/src/components/BootcampBuilder/ExerciseDetailPanel.tsx:52` mounts `ExerciseDetailMediaStage`; `:54` mounts the extracted `ExerciseDetailTeachMe`. |
| Shared media resolver | `frontend/src/components/BootcampBuilder/bootcampExerciseMedia.ts:4` resolves direct/catalog video and poster data; `BootcampDemoMode.tsx:21` and `ExerciseDetailMediaStage.tsx:4` consume the same helper. |
| Frontend evidence contract | `frontend/src/hooks/useBootcampAPI.types.ts:45-53` declares `selectionReason`, `equipmentEvidence`, `missingEquipment`, `mediaStatus`, and `scoreBreakdown`. |
| Backend route handoff | `backend/routes/bootcampRoutes.mjs:66` accepts `optPhase`; `:92-109` parses 1-5 and forwards `safeOptPhase` into generation. |
| Generator orchestration | `backend/services/bootcamp/bootcampGenerator.mjs:30-48` imports focused helpers; `:63` accepts `optPhase`; `:104-108` passes it into `queryExercisesForBootcamp`. |
| Strict equipment context | `backend/services/bootcamp/bootcampEquipmentContext.mjs:36-43` creates strict profile context; `:64-71` reads confirmed `EquipmentExerciseMap` rows. |
| Strict filtering | `backend/services/bootcamp/bootcampGenerator.mjs:121` filters Rolodex results; `:137` filters registry fallback; `:144-145` summarizes strict equipment readiness. |
| Evidence annotation | `backend/services/bootcamp/bootcampIntelligenceEngine.mjs:208-212` annotates allowed exercises with equipment/media/score fields; `:225` counts missing equipment. |
| Bootcamp snapshot persistence | `backend/services/bootcamp/bootcampExerciseSelection.mjs:113-117` carries evidence fields into generated exercise records; `:85` and `:121` preserve valid Exercise UUIDs. |
| Generator line-cap refactor | `backend/services/bootcamp/bootcampGenerator.mjs` is 266 lines; extracted helpers are `bootcampEquipmentContext`, `bootcampExerciseSelection`, `bootcampIntensityScoring`, `bootcampStructure`, and `bootcampPainAlerts`. |
| Pain alert ownership | `backend/services/bootcamp/bootcampPainAlerts.mjs:16` exports the non-fatal pain-alert collector; generator calls it at `bootcampGenerator.mjs:199`. |

## Implemented Local Slices

**S0 - OPT phase handoff**

- `backend/routes/bootcampRoutes.mjs` validates `optPhase` as 1-5 and forwards it into `generateBootcampClass`.
- `bootcampGenerator.mjs` passes `optPhase` into `queryExercisesForBootcamp`.
- Contract coverage lives in `backend/tests/unit/bootcampRouteFormatContract.test.mjs` and `backend/tests/unit/bootcampGenerationSemantics.test.mjs`.

**S1/S2 - Strict equipment and selection evidence**

- Added `backend/services/bootcamp/bootcampIntelligenceEngine.mjs` for pure strict-equipment filtering and coach-facing summaries.
- Added `backend/services/bootcamp/bootcampEquipmentContext.mjs` so profile lookup and confirmed mapping evidence are not buried inside the generator.
- Rolodex results and registry fallback are both strict-filtered when an equipment profile is selected.
- Generated exercises now carry `selectionReason`, `equipmentEvidence`, `missingEquipment`, `mediaStatus`, and `scoreBreakdown`.
- Missing-equipment counts now surface in the strict equipment summary, including warnings when the compatible pool is smaller than planned non-cardio slots.

**S3 - Shared picker foundation**

- Added `frontend/src/components/BootcampBuilder/ExerciseIntelligencePicker.tsx` as the Bootcamp adapter around the canonical Rolodex picker.
- Manual and hybrid Bootcamp panes route through that adapter.
- Added a compact Equipment Manager shortcut to `EquipmentProfilePicker` so Bootcamp config can jump directly to the mounted role-aware equipment surface.

**S4 - Generator maintainability extraction**

- Extracted selection, equipment context, intensity scoring, structure math, and pain alerts out of `bootcampGenerator.mjs`.
- Added a semantic contract that keeps the generator under 300 lines and asserts those helper boundaries stay extracted.

**S6 - Video-first detail refactor**

- Added `bootcampExerciseMedia.ts` and moved Demo Mode media resolution behind it.
- Added `ExerciseDetailMediaStage.tsx` for normal detail-panel media/evidence rendering.
- Extracted `ExerciseDetailTeachMe.tsx` so the detail panel is thin and the generic guidance flag remains tested.

## Verification Completed

- `backend`: `npx vitest run tests/unit/bootcampRouteFormatContract.test.mjs tests/unit/bootcampIntelligenceEngine.test.mjs tests/unit/bootcampGenerationSemantics.test.mjs --reporter verbose` -> 3 files / 26 tests passed.
- `backend`: `node --check` passed for `bootcampRoutes.mjs`, `bootcampGenerator.mjs`, and the five extracted Bootcamp helper modules.
- `frontend`: Bootcamp detail/picker focused suites -> 4 files / 11 tests passed.
- `frontend`: shared equipment picker focused suites -> 4 files / 7 tests passed.
- `frontend`: `npx tsc --noEmit` passed.
- `git diff --check` on touched paths passed; only Windows LF-to-CRLF warnings were reported.

## Fable Review Target

Fable should review the current local foundation and return the next build sequence, especially around these risk points:

1. Strict equipment fallback still returns bodyweight/compatible candidates rather than a first-class `insufficient_equipment` response. Decide when to fail closed versus auto-fill bodyweight alternatives.
2. EquipmentExerciseMap is high-confidence evidence, but token matching still allows equipment when mappings are incomplete. Decide if strict mode should require mappings for non-bodyweight equipment.
3. `ExerciseIntelligencePicker` is currently an adapter around Bootcamp's existing Rolodex panel. Decide how far to extract a truly shared picker core without pulling Bootcamp station semantics into Workout Logger.
4. The direct Equipment Manager shortcut is present, but true inline add/map/confirm flows are still future work.
5. Swan Coach should review and explain generated classes, but deterministic equipment, pain, and OPT gates should stay authoritative.
6. Station roles, regression/progression paths, coach cues, and timing corrections need structured fields before the next large UI pass.

## Recommended Next Move

Ask Fable to review this local packet, challenge the remaining slice boundaries, and return a risk-ranked sequence for: `insufficient_equipment` UX, station-role scoring, inline equipment mapping, deterministic coach review sequencing, and shared picker core extraction.
