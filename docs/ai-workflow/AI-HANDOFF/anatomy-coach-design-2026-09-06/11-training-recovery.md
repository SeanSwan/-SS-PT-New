# Three.js pain motion and training recovery

Artifact: SPA-RECOVERY / owner: backend lead, design lead and Sean / version 1.0, 2026-09-06.
Status: PROPOSED, amended by v1.1 viewer-port decision in 02-pain-atlas-blueprint.md. Pain and recovery overlays attach to the actual ported Human Atlas structures. No application code built.

## Product outcome

The same human has three views: **Pain Chart**, **Training recovery**, **Explore anatomy**. Pain Chart remains the first view and the fastest report path. Training recovery shows which muscle groups were trained recently, the recorded workload, and eventually an explicitly estimated recovery state. Explore reveals all anatomical systems and tools. These are projections of one authorized client's data, not three disconnected products.

A reported-pain outline remains visible in recovery mode. A shoulder can say “Low recent training load · pain reported 4/10.” No recovery algorithm resolves the pain episode, clears an injury, diagnoses damaged tissue or authorizes a workout. “Healing” is a user/qualified-care report if recorded, never a conclusion derived from a clock. The default heading is “Training recovery,” not “Injury healed.”

## Current receipts and gaps

| Layer | Verified source | Meaning and implementation consequence |
|---|---|---|
| Mounted chart | `frontend/src/components/ClientProgressCharts/ClientAnalyticsPanel.tsx:51`; `pages/Social/components/ProfileChartsSection.tsx:96` | RecoverySignalBars is imported/registered in current consumers; parent route and entitlement verification remain S0 work |
| Chart consumer | `components/Charts/charts/live/RecoverySignalBars.tsx:109-125` → `hooks/useAnalytics.ts` → `/api/analytics/:userId/chart-recovery-signal` | Error and empty are conflated into “No recovery flags”; repair with behavioral test before reuse |
| Backend | `backend/core/routes.mjs:409-410` → analyticsRoutes and clientAnalyticsRoutes → chartDataController `getRecoverySignalChart:743` | Counts pain-word notes and RPE ≥9 sets in completed workouts over 90 days; this is an exercise-level signal, not muscle recovery |
| Deprecated API | chartDataController `getMuscleRecoveryChart:908-909`; `hooks/analytics/useClientAnalytics.ts:98` still requests old route | Returns empty with deprecation metadata. Never translate that into “all fresh.” Migrate each proven consumer explicitly |
| Actual set facts | `backend/models/WorkoutLog.mjs` | Integer ID, UUID sessionId, exerciseName, setNumber, reps, weight, rpe, setType, notes/exerciseNote, holdSeconds. No persisted exerciseId or weight unit in this model |
| Actual session facts | `backend/models/WorkoutSession.mjs` | UUID ID, userId, date, status, completedAt, duration, intensity, averageRPE. Only completed actual sessions count |
| Structured exercise path | `backend/models/WorkoutExercise.mjs:23-37` | UUID workoutSessionId and exerciseId exist in a separate table; presence does not prove every logged set has that join |
| Muscle mapping | `backend/models/ExerciseMuscleGroup.mjs:14-50`; `Exercise.mjs:70-95` | Junction has primary/secondary/stabilizer, relative activation 1–10; exercise also has string-array muscle fields. Reconcile precedence explicitly; neither is a measured percentage |
| Canonical log writer | `backend/services/workout/workoutLogService.mjs:110-215,335-380` | Flattens named exercises into WorkoutLog rows; new stable identity must be persisted here and through every other actual writer |
| Workout route shadow | `core/routes.mjs:349` broad `/api/workout` before `:350` `/api/workout/sessions` | workoutRoutes handles `/sessions` GET/POST/PUT/DELETE (`:201-236`) before dedicated router `/` and `/:id`. Do not choose the later handler from its filename; verify actual matched controller |

The workout locker, charts and Coach must read **one derived recovery service** based on canonical persisted facts. Charts are views of workouts, not additional workouts to add to the total. Plans, generated proposals, calendar bookings, drafts and cancelled sessions contribute zero. A booking's integer Session ID is a different entity from a WorkoutSession UUID.

## Identity and calculation pipeline

1. Query authorized completed WorkoutSessions plus their canonical sets. Whitelist source adapters and document route→writer→table ownership. Pagination must not silently omit older rows. Use an explicit asOf timestamp and user timezone; elapsed time uses UTC instants.
2. Normalize one source set identity `(sourceSystem, workoutSessionId, sourceSetId)`. When two representations describe the same set, a durable import/translation link chooses one, never both. Unlinked ambiguous duplicates are excluded with a coverage reason for review. Do not dedupe on date/name alone.
3. Persist nullable canonical exercise UUID and mapping provenance for future named-log writes. Validate against `/api/exercises/library`, preserving that endpoint. Backfill only reviewed exact aliases with catalog version and audit; fuzzy text or an LLM cannot silently establish muscle identity. Historical unrecognized names stay unmapped.
4. Map the canonical exercise to reviewed muscle groups. Prefer a reviewed junction mapping; string muscle arrays are fallback only after canonical vocabulary reconciliation. Conflicts are unknown. Map muscle groups to documented atlas structure sets; highlight the group, not invented per-mesh precision. Unilateral laterality is explicit; unknown laterality is labeled, not arbitrarily left or right.
5. Calculate separate observed exposure and optional estimated recovery. Preserve missing RPE, unknown setType, unsupported modality and ambiguous timestamps as reasons. Zero added weight is valid for bodyweight work. Do not compare kg to lb; the first estimator uses no tonnage.
6. Publish one versioned projection to body view, private progress charts, workout locker and Coach. On commit/edit/delete/import, invalidate the client's version after the existing writer transaction commits. No events before rollback; no new message bus required. Recompute idempotently; reconciliation detects missed invalidations.

## Two-stage model, concrete and honest

**Stage A: observed recent load (required first release).** Per muscle, show mapped completed working-set count, last-trained time, source exercises, reported RPE distribution and mapping coverage for 24h/72h/7d. Warmups are listed separately. Unsupported modalities have duration/activity facts but no invented strength-set equivalence. State labels: “Trained recently,” “No recent mapped sets,” “Incomplete workout data,” or “Unavailable.” “No recent mapped sets” does not assert freshness.

**Stage B: estimated recovery (required later slice, disabled until its release gate).** Proposed experimental model `resistance-exposure-v1` uses eligible resistance working sets only. For a documented mapping weight w (primary=1, secondary=0.5, stabilizer=0.25), an explicitly recorded RPE coefficient q=clamp((RPE−4)/6,0,1), and elapsed hours h≥0, model exposure is `E_m(t)=Σ(w*q*2^(−h/H_m))`. These coefficients are product-model hypotheses, not established physiological constants. Missing RPE produces no q and lowers coverage. Unsupported set types contribute no fabricated value; they remain in observed facts.

H_m, the low/high thresholds, and required coverage are **unconfigured in production by default**. A versioned reviewed calibration profile must supply them before the estimate can appear. A synthetic profile (H=48h, low=1, high=3, coverage≥0.9) exists only in acceptance fixtures; those numbers must never become a default in application code. Do not claim a medical countdown or validated recovery percentage. The model cannot conclude “safe to train.”

Release calibration gate: sports/exercise science reviewer documents intended population, exclusions, profile values and rationale; collect consented longitudinal self-reports and workout facts; evaluate held-out clients and sessions, report calibration error, missingness and subgroup failures; compare against observed-load-only baseline. Sean approves product copy and scope. Until then Stage A remains useful and Stage B explicitly unavailable. No invented sample size or accuracy claim here.

For enabled profiles, map low/mid/high E to “Estimated fresh,” “Recovering from training,” and “High recent training load.” Always add “Estimate,” asOf and “Why this state.” Below coverage threshold→“Not enough data,” absent profile→“Estimate not available.” A current soreness/fatigue check-in is displayed alongside the estimate and may conservatively suppress an “Estimated fresh” headline. It never gets erased to fit the model. Pain remains its own higher-priority warning badge regardless of E.

Optional daily check-in: perceived soreness, energy/fatigue, sleep quality and “How does this area feel?” are voluntary, have recordedAt and explicit missing state, and reuse existing approved wellness contracts where present. New storage requires a separate reviewed contract. These are not prerequisites to quick pain reporting. Their absence must not be filled with ideal values.

Research supports combining load information with subjective reports and preserving differences between measures; it does not validate this proposed formula or a tissue-healing prediction. [Monitoring training response, systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC4789708/), [subjective training-load measurement limitations](https://pubmed.ncbi.nlm.nih.gov/30570718/). ACSM's search-listed recovery PDF returned 404 when opened, so it is not used as evidence.

## Proposed read contract and state ownership

New endpoint: GET `/api/recovery/:userId/muscles?asOf=<RFC3339>&window=7d`, mounted once with protect + current self/assignment/admin authorization. Default asOf=server now; constrain requested history to authorized retained range. It does not inherit chart Pro gating for the basic pain/workout view. Any premium analytics packaging is separate; reporting pain remains available under current access rules.

Response: `{success:true,data:{userId,asOf,sourceRevision,computedAt,modelVersion,calibrationVersion,mappingVersion,catalogVersion,status,coverage,muscles[],painSummaryRevision},requestId}`. status=`ready|partial|unavailable`; unavailable normally uses HTTP 503 error envelope, not ready empty data. Each muscle has canonical ID, region/side/structure references, lastTrainedAt nullable, observed exposure, estimate nullable, coverage `{eligibleSets,mappedSets,rpePresentSets,excludedSets,reasons}`, and paginated same-client evidence links. Do not expose a misleading single confidence percentage; coverage is not clinical certainty.

Cache key includes actor/access epoch, target, sourceRevision, asOf bucket, mappingVersion, modelVersion and calibrationVersion. Source freshness invalidates at each committed workout edit; display a stale badge until recomputed. Pain summary loads independently and retains its own revision/error state. A partial failure cannot hide active pain or declare all muscles fresh. Authorization rechecked for evidence drill-down. History is recomputed from facts valid at the requested observation time; if edit history is absent, label it “Recomputed from current records,” not an immutable historical snapshot.

Proposed modules: `backend/services/recovery/recoveryReadService.mjs` (scope/query), `canonicalWorkoutAdapter.mjs` (source dedupe), `muscleMappingService.mjs` (reviewed identity), `trainingExposureModel.mjs` (pure versioned calculation), route/controller; frontend `useMuscleRecovery`, `RecoveryEvidencePanel`, shared Victory time-series adapter. Use current installed stack; no speculative ML service, wearable integration or provider fan-out. Components stay under repo line limits.

Coach receives a bounded structured `trainingRecoveryContext` with sourceRevision, asOf, status, muscle summaries, pain constraints and evidence IDs through the existing privacy/consent boundary. Coach can explain facts and draft a plan adjustment. Existing confirm/cancel, durable intent and trainer scope rules govern any write. No autonomous program change from a colored muscle. Recovery is private by default; public profile charts and social sharing do not gain pain details, heatmaps or workout evidence through migration.

## Three.js visual and animation contract

Use installed Three.js (`frontend/package.json` currently `^0.169.0`; resolve exact lock version in S0). Separate scene geometry from overlays and report state. The body is the functional signature; no second decorative particle field. GPU batching must preserve stable structure picking after transparency, clipping and explosion. The healthy/neutral body never looks like an alarm panel.

| Meaning | Display | Motion |
|---|---|---|
| Selected/reporting area | Crisp outline + location label; pending draft pattern | One 250ms focus transition, cancelable |
| Reported pain | Semantic warm outline/hatch + “Reported pain 4/10”; severity remains numeric | Soft emissive pulse 2.4s period, maximum two cycles on selection; optional explicit Animate toggle with visible Pause |
| Estimated fresh | Cool low-intensity fill + “Estimate” text and icon | Static by default |
| Recovering/high recent load | Lavender/gold group fill + text/legend | On demand gentle sweep to show recently trained groups, ≤4.8s total |
| Unknown/unavailable | Neutral dashed/hatch surface | Never a green/cool fresh fill; no pulse |
| Pain plus low load | Pain boundary over recovery fill, separate chips | Pain indication remains legible; no color blending into “healthy” |

Add semantic pain/warning tokens to design doctrine after contrast checks, using existing semantic tokens where valid; do not repurpose Arctic Cyan for controls. Hue alone conveys nothing essential. Numbered callouts and a keyboard-accessible region list provide complete parity with the canvas. No screen-reader announcements on every animation frame.

`prefers-reduced-motion`, explicit Pause, tab hidden, offscreen canvas, low-power mode and WebGL context loss all stop loops. On-demand rendering resumes only for interaction/state changes; continuous animation is opt-in. No auto-rotation while entering a score. Mobile one-finger scroll outside explicit rotate interaction, reset view and front/back buttons; do not trap page scrolling. Save remains DOM-based if 3D fails. Dispose controls, listeners, materials, textures, renderer, worker and GPU buffers on final unmount; ref-count shared public assets correctly. [Three.js on-demand rendering](https://threejs.org/manual/en/rendering-on-demand.html), [resource cleanup](https://threejs.org/manual/en/cleanup.html).

Budget gates: responsive DOM report shell within 2s on defined midrange test device; load the actual upstream anatomy with progress/cancel/retry, initially preserve its packaged geometry and measure the approximately33MiB source transfer. The ≤2MiB basic-body target is withdrawn. Do not substitute a simpler main model to meet it; 30fps minimum during phone manipulation, 50fps desktop, p95 pick feedback ≤100ms. Cap pixel ratio at 1.5 phone/2 desktop. After ten mount/unmount cycles, no growing live renderer/worker count and stabilized GPU allocations. Measure actual assets before accepting budgets; fall back to 2D/list without blocking report save. Physical iOS/Android and WebGL-loss tests are NOT RUN in this packet.
