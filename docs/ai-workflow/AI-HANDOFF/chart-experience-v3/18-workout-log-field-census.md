---
artifact_id: SWAN-CHART-WORKOUTLOG-FIELD-CENSUS
owner: lead Codex adjudication; Luna source census
version: 3.2
effective: 2026-09-04
status: READ-ONLY RULE29 RECEIPT; NO MODEL EDITS
supersedes: incomplete matched ORM caller-field inventory in15
---

# Actual WorkoutLog field census

Build root: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/chart-experience-v3-20260904`.
HEAD `53120649f356c3efccee32872b530096d386642f`; all source paths below are relative to it.
Luna inspected the16 matches of `rg -l '\bWorkoutLog\b' backend/routes backend/controllers backend/services`.
The lead independently reproduced that exact match set and checked model/projection/patch
and fallback sites. A broader substring grep includes names such as WorkoutLogError and is
not this16-file census. No production schema, frontend caller or dynamic SQL proof is implied.

## Authoritative model

`backend/models/WorkoutLog.mjs:8–108` explicitly declares:
`id, sessionId, exerciseName, circuitName, circuitOrder, exerciseRole, setNumber, reps,
weight, tempo, rest, rpe, notes, exerciseNote, setType, isometricHoldSeconds`.
`timestamps:true` at114 adds `createdAt, updatedAt`; table113 is `workout_logs`.
`weight:51–59` is FLOAT, non-null, default0, minimum0; it has NO unit metadata.
The parent is WorkoutSession (`models/associations.mjs:1060–1061`), not booking Session.

In the table, FULL means ORM hydrates all current columns without explicit projection, not
that the caller individually reads all of them. Parent/session attributes are not log fields.
Every set below is the complete *explicit* log-field union at these matched sites.

| Caller / evidence | Explicit WorkoutLog fields | Classification / retention gap |
|---|---|---|
| controllers/adminWorkoutLoggerController.mjs:223–237,292,335–375,388–390,429–446 | id,sessionId,exerciseName,circuitName,circuitOrder,exerciseRole,setNumber,reps,weight,tempo,rest,rpe,notes,exerciseNote,setType,isometricHoldSeconds | FULL GET; PATCH replaces rows; DELETE reads reps/weight to recompute parent totals. No explicit child createdAt ordering here; corrected Luna's ambiguous timestamp note |
| controllers/aiWorkoutController.mjs:476–497 | createdAt (child order) | FULL logs passed through; other selected properties are parent fields |
| routes/dailyWorkoutFormRoutes.mjs:128–153,1064–1077 | sessionId,exerciseName,setNumber,reps,weight,tempo,rest,rpe,notes,exerciseNote | Partial legacy write; circuit fields,setType,isometricHoldSeconds omitted, not missing model columns |
| services/ai/dispatchers/workoutReadDispatchers.mjs:52–57 | none | FULL association hydration; result uses parent totals, not individual log fields |
| services/ai/dispatchers/workoutStatisticsReadDispatcher.mjs:15–19,35–55,91–94 | exerciseName,reps | FULL association; no weight math at these sites |
| services/ai/longHorizonContextBuilder.mjs:122–126,256–268,317–326 | exerciseName,weight,reps,rpe | FULL association; raw load/volume math; date comes from session |
| services/exerciseFamiliarityService.mjs:100–119,125–127 | sessionId,exerciseName | session filter and explicit name projection |
| services/fitnessTranscriptionVocabService.mjs:81–98,105 | sessionId,exerciseName,weight | Explicit projection; unitless mass reaches transcription vocabulary |
| services/masterPromptBuilder.mjs:72–99,152,186–191,314–322 | exerciseName,weight,reps,rpe | FULL association; also reads five non-column fallback properties listed below; raw volume/e1RM |
| services/workout/aiWorkoutDailyFormPayloadService.mjs:93–104,107–142,146–163 | sessionId,exerciseName,circuitName,circuitOrder,exerciseRole,setNumber,reps,weight,tempo,rest,rpe,notes,exerciseNote,setType,isometricHoldSeconds | Complete explicit write projection, no unit pair; rest aliases map to rest |
| services/workout/aiWorkoutDailyFormService.mjs:90–94,101,178–193 | sessionId,reps,weight plus complete delegated payload projection in previous row | Destroy/bulkCreate inside transaction; totalReps/totalWeight belong to parent |
| services/workoutLastWeightService.mjs:52,67–89 | sessionId,exerciseName,weight,reps,id | Explicit attributes; id used for order; legacy weight returned without unit |
| services/workoutProgressDetailReadModelService.mjs:58–95,172–205 | id,exerciseName,exerciseNote,setNumber,reps,weight,rpe,tempo,notes,rest | Explicit projection; omits circuit fields,setType,isometricHoldSeconds,timestamps; exerciseNote maps to performanceNotes |
| services/workoutProofLoader.mjs:108,123–151 | id,exerciseName,weight,reps,setNumber | Explicit projection; id orders rows; other weightUsed/repsCompleted fields are Set model, not WorkoutLog |
| services/workoutProofSeriesService.mjs:6–8,22–45,104–105,133,160–165 | no ORM access; projected exerciseName,weight,reps,setNumber | Model mention only; pure math over loader rows including prDeltaLbs; still requires unit-aware adoption |
| services/workoutService.mjs:69,110–119 | id,exerciseName,setNumber,reps,weight,tempo,rest,rpe,notes | Explicit projection; remaining columns omitted |

## Drift adjudication

| Caller field | Real model column | Verdict |
|---|---|---|
| All listed actual fields above | Identical named column, including generated timestamps | MATCH |
| restTime/restSeconds input | rest via payload adapter | MATCH by explicit mapping |
| masterPromptBuilder log.exercise | No column; fallback for exerciseName | DRIFT / heterogeneous input assumption; not schema proof |
| masterPromptBuilder log.sets | No column; default1 in summary, undefined in detailed projection | DRIFT; do not multiply unit-aware per-set rows by fabricated set counts |
| masterPromptBuilder log.formRating | No column | DRIFT; undefined fallback output |
| masterPromptBuilder log.nasmCategory/log.category | No columns | DRIFT; cannot treat fallback General as verified movement classification |
| normalized totalWeight/totalReps/totalSets | WorkoutSession parent, not WorkoutLog | MATCH only on the parent |
| future enteredWeight/enteredWeightUnit | No current columns | PLANNED, not an existing source |
| historical index migration exerciseId/clientId | No WorkoutLog columns | DRIFT; migration replay must be selective |

Luna's phrase "no explicitly referenced field is absent" was too broad: the five fallback
properties above ARE absent. They are documented debt; this storage slice does not repair
unrelated prompt generation. The new chart math must not repeat those assumptions.

## Model change and rollout implications

Adding attributes to the model makes FULL association queries request them automatically.
Therefore schema deployment MUST precede code activation; an unmigrated production table
would fail reads even with chart flags off. This is a release blocker, not hidden by flags.
Additive columns have no unit default and no historical backfill. Old writes remain NULL/NULL;
later v1 writers explicitly preserve entered value/unit plus compatibility pounds.

Raw SQL readers beyond this token census are recorded in15 and remain KG3 adoption work.
Dynamic wrappers, jobs, fixtures/seeders, constructed SQL, frontend ingresses and actual
production schema remain UNPROVEN. This receipt closes the bounded Rule29 source-census
prerequisite, not KG20 all-consumer completion or authorization to modify every matched file.
