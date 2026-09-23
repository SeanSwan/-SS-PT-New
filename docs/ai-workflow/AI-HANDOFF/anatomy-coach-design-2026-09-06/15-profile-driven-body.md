# Profile-driven body personalization — measured, adjustable and connected

Artifact: SPA-PERSONALIZATION / version 1.2 / effective 2026-09-07 / owner: frontend, backend and anatomy leads.
Status: PLANNING ONLY. v1.2, 2026-09-07: diverse body references for all backgrounds; explicit measured/manual choice shared with Workout Planner; Three.js native Swan integration; derivative assets preferred where practical, retained source assets authorized as fallback.
Complements [custom assets](14-custom-anatomy-assets.md), [data/privacy](03-contracts-data-privacy.md) and [recovery](11-training-recovery.md).

## Product behavior

On an authorized client’s Pain Chart or Workout Planner, honor their saved body mode and chosen reference. Apply supported measurements automatically only in measured mode. The client can open “Customize body” to inspect inputs and adjust appearance or preview proportions. Reporting stays immediately usable. This is a personalized visual reference, not a scan or a claim that predicted organ positions match the person.

The earlier 6′2″ / 220 lb strong Black male and female concepts are optional reference presets within a diverse library. They never fill missing client data silently. Appearance selection is open to every client; nationality is not a morphology input.

Use stature, current weight, body-fat percentage and available circumferences together. Separate measured inputs, derived estimates, visual preferences and unavailable values. Client customization must never overwrite a recorded measurement merely by dragging a visual slider.


## Two equal user paths and shared state

| Choice | Behavior | New measurements / reset |
|---|---|---|
| Use my measurements | Fit chosen supported anatomy to saved height/weight/body composition/circumferences; appearance stays manually chosen | Refresh supported shape after source revision changes at a safe interaction boundary. Reset preview restores current measured fit |
| Choose a reference body | Choose an available reference/preset and supported appearance/proportion adjustments independently of personal measurements | New health measurements do not alter the chosen reference. Reset returns the saved manual preset; switching to measured mode is explicit |

A new user without a preference sees these two clear choices; no race/nationality/body-type guess. Existing valid preference wins. If data or a compatible rig is unavailable, measured mode shows the retained detailed reference with a limitation and an optional manual choice. Do not silently change the saved mode or fabricate fitted geometry.

Store shapeMode:measured|reference, anatomicalReferenceSetId, variantId, appearancePresetId, supportedOverrides, baseMeasurementRevision and preferenceRevision. Keep appearance choice orthogonal to shapeMode. Save uses the existing proposed guarded preference writer; cancel preserves persisted mode. Unknown/retired preset IDs show compatible available alternatives without overwriting a draft or falling back to another person’s preference.

## Verified source fields and route evidence

These are read-only source observations from the current checkout, not live database inspection or runtime authorization proof.

| Source / path and lines | Observed contract | Proposed use |
|---|---|---|
| backend/models/User.mjs:135–145 | gender nullable string; weight and height nullable FLOAT; these model fields declare no unit columns | Height/profile fallback with verified writer-unit provenance; gender does not automatically choose anatomy/appearance |
| frontend/src/services/profileTypes.ts:26–27 and profileService.ts:8–25 | optional weight/height; GET /api/profile and /api/profile/:userId | Existing profile transport, behind proper self/assigned staff authorization |
| backend/core/routes.mjs:281; backend/routes/profileRoutes.mjs:199,248 | profile mount; own get protected; target get also authorizeResourceAccess | Existing path to reconcile at S0; do not infer privileged access from a frontend client selector |
| backend/models/BodyMeasurement.mjs:24–46 | measurementDate, weight, weightUnit lbs/kg, bodyFatPercentage, muscleMassPercentage, bmi, circumferenceUnit inches/cm | Timestamped measurement authority, explicit unit conversion and provenance |
| same model:48–64 | neck, shoulders, chest, upperChest, underChest, right/leftBicep, right/leftForearm, naturalWaist, umbilicus, lowerWaist, hips, right/leftThigh, right/leftCalf | Measured shape constraints with side-specific correspondence |
| same model:65–98 | visceralFatLevel, metabolicAge, boneMass, waterPercentage; method, verified fields and notes/photos | Method/confidence provenance where useful. No automatic organ/fat-location/age geometry from these summary figures; omit notes/photos from morphology payload |
| backend/core/routes.mjs:365; bodyMeasurementRoutes.mjs:38,109,116,123,130 | protect first; user/list/latest/stats paths before /:id; user reads have verifyClientAccessByUserId | Existing scoped measurement transport; literal GET /api/measurements/user/:userId and /latest |
| frontend/src/components/DashBoard/Pages/admin-dashboard/MeasurementEntry.controller.ts:140–146 | calls /api/measurements/user/${selectedClient.id}/latest and reads weightUnit | Existing consumer pattern, not proof latest row contains every desired field |
| backend/controllers/bodyMeasurementController.mjs:458–459 | latest measurement query orders measurementDate DESC | A weigh-in can be newer than a circumference measurement; resolve per field with dates instead of discarding all prior dimensions |
| frontend/src/components/DashBoard/Pages/admin-clients/CreateClientModal.tsx:532,869 | heightPartsToInches; Weight(lbs) UI | Evidence one profile writer uses imperial conventions; insufficient proof for every legacy writer |

All listed schema fields exist in the models. BodyMeasurement has no height column. User has no dedicated bodyFatPercentage column in the inspected physical-attribute block. Do not invent profile.bodyFatPercentage or silently treat profile height as centimeters. S0 inventories all profile/onboarding/import/measurement writers and resolves legacy unit drift before enabling personalized dimensions.

For these touched candidate paths, the observed mount order is profile at 281 and measurements at 365; the measurements user routes precede /:id and are exact route matches. Complete runtime route-shadow/caller proof remains S0 before changing application behavior. No source-only observation claims current production readiness.

## Authoritative source and conflict policy

The proposed BodyMorphInputResolver runs server-side behind the same self/assigned-trainer/admin target policy. It exposes only morphology fields and provenance. It reads real saved records; no charts, avatar sliders, AI text or workout plans are substitute measurement authority.

Resolve each field independently as of the requested time: latest eligible non-null, finite, valid-unit measurement at/before asOf; deterministic tie-break by measurementDate then updatedAt then id. Prefer the explicit-unit BodyMeasurement weight over an older unversioned profile weight. Profile fallback needs a verified unit/migration marker. Height comes from the verified profile/onboarding authority because BodyMeasurement does not contain it.

Do not blend a stale torso measurement with new limb values invisibly. Return each source date and a coverage/staleness summary. Proposed configurable staleness threshold: 90 days, visibly labeled; it affects confidence and refresh affordance, not automatic deletion. Future-dated, malformed, ambiguous-unit and unsupported-range values remain unavailable with reasons.

DECIMAL values may arrive as strings: parse strict finite numeric forms, reject blank/boolean/NaN/infinity/unit-suffixed text, preserve zero only where domain-valid, convert once to canonical cm/kg/percentage units. Do not guess units from magnitude. Do not clamp a saved input to the asset's range and call it matched.

Weight plus body fat can support a labeled broad composition estimate, but does not identify exact body shape, individual muscle mass, organ size or fat location. BMI is not a second independent physique measurement. Circumference is not muscle tissue mass. Metabolic age, bone mass and visceral-fat score do not provide organ geometry. Workout exposure affects recovery overlays, not anatomical hypertrophy.

## Proposed contracts and ownership

Proposed new read: GET /api/anatomy/personalization/:userId?asOf=<ISO>. This is NOT an existing endpoint. Resolve data in backend/services/anatomyPersonalizationService.mjs; mount a protected narrow router after S0 ownership review. Reuse established access services and model factories.

Response: targetId, accessEpoch, sourceRevision, asOf, inputVersion, fields{heightCm,weightKg,bodyFatPct,muscleMassPct,circumferencesCm}, provenance keyed by field {recordType,recordId,measuredAt,updatedAt,unit,method,verified,status}, coverage, exclusions[], supportedModelVersion and display status. Return no names, photos, notes or secrets. Unknowns are null with reasons, not healthy/average values.

Proposed private display preference record: actor/target authorization, shapeMode, anatomicalReferenceSetId, variantId, appearancePresetId, appearance choices, savedVisualAdjustments, baseMeasurementRevision, preferenceRevision, renderer/morph version and timestamps. API shape is a conditional PUT with expectedRevision and mutation ID under the same protected personalization resource. Treat it as new proposed storage, not an existing User column.

Frontend:
- useBodyPersonalization owns scoped read/cache, sourceRevision, request cancellation and target/access fencing.
- BodyMorphInputResolver adapter validates the response; no direct ORM-shaped blobs enter renderer state.
- BodyMorphController maps supported canonical values into the authored rig, records residual/error and owns applied morph revision.
- CustomizeBodySheet separates measured values, visual-only preview and profile-update navigation.
- AtlasSelectionBridge maps stable semantic IDs throughout morph, variant and asset changes.

On saved measurement/profile edit/delete/import, invalidate the affected user’s measured projection only after commit; return pending/stale until recompute. Manual reference preferences remain unchanged; actual measured fields still update in their proper health context. All measurement writers must participate or reconcile through a source-revision digest on read. No best-effort event alone can establish freshness. Historical views recompute with model/source version labels, not invented immutable prior bodies.

## Morphing the whole anatomy coherently

Where asset feasibility supports it, author a constrained reviewed parametric rig per complete reference set. Track A without an approved rig remains reference-only; unsupported morphology is explicitly unavailable rather than a release claim. Share stature/landmark transforms across skeleton and all connected layers; apply surface/circumference and volume deformation with constraints that preserve attachments. Maintain source-compatible part selection and batching. Do not multiply every muscle/organ by weight ratio.

At any new morph, update morphed rest transforms/bounds, overlays, picking, explode offsets and camera framing from the same immutable morph revision. Freeze atomically while editing a pain report or dragging a structure; apply a completed preview at the interaction boundary. Reassembly uses current morphed rest state, not original 6′2″ rest geometry.

When input is outside the authored domain or fitting residuals exceed reviewed limits, preserve facts and show “Reference body; some measurements could not be represented.” Let reporting continue. Do not arbitrarily stretch organs, erase measurements or display a fake exact match.

Proposed fitting gates: within 0.5 cm for supported measured height; supported selected circumference targets within max(1 cm, 2%) in standardized rest-pose measurement planes. If simultaneous constraints cannot meet those tolerances without invalid anatomy, report partial fit; no fabricated PASS. These are engineering targets pending rig validation, not claims of body-scan accuracy.

## Desktop/mobile interaction and difficult states

Desktop: body remains dominant; Customize opens an inspector with the selected mode, appearance controls and reset. Measured mode shows source dates and fit status; manual mode shows the chosen reference and visual-only adjustments. Mobile: same body plus sheet, 44 px controls, explicit Done/Cancel; no hidden hover controls.

Tabs within the sheet: Measurements (read-only source facts and correction links), Appearance (skin/hair/reference choice), Preview shape (optional visual adjustments clearly labeled). Reset restores the current saved fit in measured mode or the saved reference preset in manual mode. Saving appearance/preferences does not update health measurements. A deliberate “Update my measurements” action opens the canonical permission-appropriate measurement flow with units and confirmation; no silent reverse-write from avatar proportions.

States: profile loading → scene remains usable reference; partial inputs → supported parameters only; denied → private fields/shape cleared; error → retained same-target scene visibly stale; newer data → refresh prompt or atomic safe apply; conflict → show saved vs draft preference; cancel → discard preview; context loss → list reporting; target switch → clear prior shape and cancel pending data; rollback → prior approved rig/version, original observations untouched.

Client chooses reference/appearance manually. Staff may view personalized body only within assigned-client scope. No raw private meshes, body measurements or rendered health overlays sent to the public Human Atlas iframe, Hermes, third-party model provider or public social surface. Sharing requires its own explicit authorized feature; this task provides none.

## Acceptance P11/T29 and future slice S3D

Fixtures: synthetic metric/imperial-equivalent records; newest weight-only row with older circumference row; missing/ambiguous profile units; left/right asymmetry; duplicate timestamps; deleted source; extreme/inconsistent dimensions; revoked access; target A slow/B fast; two preference writers; reduced motion; profile correction during report draft.

Required results: deterministic source selection/conversion; per-field provenance; no invented dimensions; measured vs preview separation; matching canonical semantic pain selection under coherent morph; accurate fit/partial status; source-revision parity after all writers; races and permission denial cannot leak prior shape; reset and rollback never rewrite measurements/pain/workouts.

Future commands: backend npx vitest run tests/unit/anatomyPersonalization.test.mjs tests/integration/anatomyPersonalizationAccess.test.mjs; frontend npx playwright test e2e/pain-atlas/personalization.spec.ts; rig measurement/landmark validation for every approved asset variant. Fixture harnesses and application implementation are NOT RUN.

S3D depends on S0 source/unit reconciliation and a tested reference catalog. Measured morphology additionally depends on S3C rig capability; manual reference selection and source-based pain reporting can ship while custom morphology is deferred. Release claims name which capabilities passed T29/T30. This adds no scan service, model training, clinical prediction or third-party generator dependency.

## Workout Planner integration — one client, one preference

The [separate Planner expansion packet](../../blueprints/agent-ready-workout-planner-2026-09-06/README.md) owns Planner generation, exercise/library, save/backup/blend and agent contracts. This packet adds a shared body-reference preference; it does not replace those controls or copy a stale Planner.

Read-only source checked in tmp/worktrees/agent-ready-planner-audit-20260906: frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:16 mounts WorkoutPlannerPageLayout; its :98 mounts WorkoutPlannerCommandPanelV2 on the V2 path; WorkoutPlannerCommandPanelV2.tsx:126 consumes selectedClientId and clientGenBlocked from existing clientState. Its prior audit labels commit 53120649f356c3efccee32872b530096d386642f. Reconcile worktree metadata after relocation and current release at S0; this is no new production mount claim.

Proposed insertion: a compact “Body reference” control adjacent to the current client context in WorkoutPlannerCommandPanelV2, opening the same BodyReferencePicker/CustomizeBodySheet used by Pain Atlas. Keep Generate/Advanced/Rolodex/Save placement. Mobile opens a full sheet with Back/Cancel/Use this body; desktop uses the contextual inspector. No second client selector or second uncoordinated Three.js canvas. A focused body preview may reuse the same engine with exclusive renderer ownership.

Selection is keyed to the authorized selectedClientId, not coach identity or plan ID. Undefined target/clientGenBlocked disables private personalization; a clearly labeled generic reference can remain view-only. Staff preview does not overwrite the client’s saved preference without the explicit scoped save action. Publish the committed preferenceRevision to both surfaces and fence delayed target/mode responses.

Measurements newly entered during Planner intake flow through the canonical measurement/profile writer first. Saved values become morphology inputs by source revision; unsaved intake values may appear as labeled preview only. Goals, exercise selections, desired weight and generated workout text are not measured anatomy. Body selection never changes workout prescription, target client, plan contentRevision or permissions. A prospective muscle emphasis overlay must be labeled Planned emphasis and remain separate from actual completed-workout recovery.

P12/T30 fixtures: measured→manual→measured; Planner→Pain Atlas→Planner; delayed client A/B; new measurement while manual; unsaved intake; preference conflict; unavailable variant. Expected: one scoped preference revision, correct availability/fitting, preserved report/plan drafts, actual data used for workout logic, no demographic inference and no hidden plan save. Future frontend npx playwright test e2e/pain-atlas/planner-body-reference.spec.ts plus isolated API preference contracts. NOT RUN.
