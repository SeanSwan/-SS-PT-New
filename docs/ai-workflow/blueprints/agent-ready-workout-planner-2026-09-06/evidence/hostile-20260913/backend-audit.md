# Backend hostile audit — Rolodex, Bootcamp, Planner, Sprint

Status: **REVISE**. Evidence date: 2026-09-13. Auditor: bounded Astra backend review seat. Application baseline: `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`.

Repository: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913`.

Both supplied reviews target the much older `f8815a0b1` branch. Several Bootcamp findings are stale, but important safety mismatches remain and the Sprint/save paths contain additional concrete bugs. This report supplements the parent's canonical blueprint; it is not a competing plan or implementation receipt.

Audit was read-only until the parent authorized these evidence artifacts. No DB, provider, network, application-write, or deployment operations occurred. Isolated source-function probes used synthetic fixtures and mocked persistence. They verify JavaScript behavior, **not PostgreSQL integration or production behavior**. An initial inline harness ReferenceError was corrected and is not counted as RED evidence.

All application references below are relative to the repository above; line numbers describe the baseline source. Evidence artifacts use the same baseline. No application source was modified by this review seat.

## 1. P1 — Caller-controlled child foreign keys cross template ownership

`backend/services/bootcamp/bootcampCrud.mjs:144` constructs `{ templateId: template.id, ...s }`; the same order occurs for stretches at `:200` and overflow at `:208`. The POST route accepts `generatedClass` wholesale after only a truthiness check at `backend/routes/bootcampRoutes.mjs:130`.

A synthetic probe created parent ID `123` while caller-supplied station, stretch, and overflow `templateId:999` all reached persistence mocks as `999`. Authentication and new-parent ownership do not protect those child writes.

**Repair contract:** validate the submitted class and explicitly allowlist every child field; set authoritative IDs after validation. Never accept child `id`, `templateId`, `trainerId`, or arbitrary association fields from generated-class payloads. Validate station indices against the new class. Validate referenced equipment/space profiles and log template ownership where applicable.

**Tests:** trainer A submits child FK fields for trainer B's template; reject before any write, or demonstrably ignore those fields and link every child only to A's new template. Include stations, stretches, overflow, and invalid station indices. Test the real HTTP/service boundary with synthetic models, then isolated PostgreSQL integration before claiming real transaction/authorization verification.

## 2. P1 — Template save is non-atomic and loses important fields on reload

- `bootcampCrud.mjs:116-211` performs independent parent, station, exercise, stretch, and overflow writes without a transaction. A later failure leaves a partial template while the route reports failure; retry creates another parent.
- Full-group generation creates exercises without `stationIndex` (`bootcampGenerator.mjs:850-857`), so save persists `stationId:null` (`bootcampCrud.mjs:160`). `getTemplates` includes only `stations.exercises`, overflow, and stretches (`:251-255`), omitting the direct exercises association. That association exists at `backend/models/associations.mjs:1288`. Full-group rows disappear from the response.
- Profile IDs remain absent from generated output (`bootcampGenerator.mjs:776-804`) and the parent save whitelist (`bootcampCrud.mjs:116-141`).
- Save drops exercise-level `selectionReason`, chips/rung, `painSwap`, and `painCaution` (`bootcampCrud.mjs:158-193`). Current class-level `relaxationSummary` does persist; the previous review's blanket statement that all provenance is lost is too broad.
- Reload hydrates original media unconditionally from `exerciseLibraryId` (`bootcampCrud.mjs:93-100`), worsening the substitution problem in section 4.

**Repair contract:** validate before writing, then use one transaction for the complete template. Preserve source/profile/pain/selection metadata through an explicit versioned JSON contract or appropriate migration. Include direct exercises on retrieval with deterministic ordering and no duplicate presentation of station rows. Use a caller operation key if save retry must be exactly-once.

**Tests:** failure injection at each child write leaves no parent/children; full-group and station classes survive save/load with matching count/order; profiles, safety annotations, provenance, styles, and alternative identities survive; repeated operation key returns the original result. ORM mocks alone do not verify rollback or unique constraints.

## 3. P1 — Current pain normalization is incompatible across engines

### Planner mismatch remains current

- DB registry returns raw primary/secondary muscles and equipment at `backend/services/variationEngine.mjs:419-449`.
- Planner compares muscles exactly at `backend/services/workoutBuilderService.mjs:211` and equipment exactly at `:223`.
- Synthetic probe: `muscles:['Biceps']` survives `excludedMuscles:['biceps']`; `equipment:['Dumbbells']` fails against category `dumbbell`.
- The second safety gate repeats exact muscle comparison (`workoutBuilderService.mjs:335` onward), so it does not repair the mismatch.
- Secondary muscles are kept separately (`variationEngine.mjs:447`) but not checked by `filterExercises`. A safe primary with pain-excluded secondary can pass.
- Guided candidate equipment (`workoutBuilderCandidateEquipment.mjs:5-7,39-43`) normalizes case/spacing but not singular/plural/aliases; that lane also drifts.

### Bootcamp's new vocabulary disagrees with its pain map

The old nonexistent-column query is fixed. However, the bridge now emits `pectorals`, `latissimus_dorsi`, `traps`, etc. (`exerciseRolodexBridge.mjs:213-224`), while `painAwareGating.mjs:119-123` substring-matches against `bootcampTargetsForRegion`, whose relevant entries still emit `chest`, `lats`, and `trapezius` (`training-cortex/ontology/regionMuscleMap.mjs:162-197`).

Source-function probes at pain severity 9 produced zero alerts for `chest→pectorals`, `upper_traps_left→traps`, and `mid_back_left→latissimus_dorsi`. Positive control `left_knee→quadriceps` produced one alert.

**Repair contract:** normalize both exclusion targets and registry primary/secondary targets through the existing ontology/taxonomy boundary; preserve raw display labels separately. Do not add independent lowercase patches. Use explicit equivalence/coverage fixtures for existing ontology tags and DB-schema display names. Unknown severe-pain mappings must remain visible and must not claim protection.

**Tests:** case, spaces/underscores, synonyms, primary and secondary targets, unknown/unmapped tags, legacy registry and DB-shaped records. Include the three failed Bootcamp probes and knee positive control. This is a dictionary/correctness repair, not a new prescription policy.

## 4. P1 — Alternative names retain the original exercise's demonstration

`classStyleModifiers.mjs:72-95` spreads the original exercise and changes name/board, clearing only selected programming metadata. A synthetic `Jump Squat` with `kneeMod:'Wall Sit'` became `Wall Sit` while retaining the original library ID, video, and instructions `Jump explosively`.

The main pain swap is also rename-only (`painAwareGating.mjs:145-149`). Template media hydration can reintroduce the original demonstration after save/load. `deriveJointFriendlyAlternative` additionally falls back from the affected region's field to any joint modification (`classStyleModifiers.mjs:62-69`). A shoulder modification is not evidence of addressing severe knee pain.

**Repair contract:** keep original identity as an explicit source field. Resolve a replacement to verified library identity when possible; otherwise clear original media, instructions, and unsupported target muscle/equipment claims. Severe-pain routing should use a region-applicable modification or explicit caution/manual review, without presenting an arbitrary other-joint modification as verified protection.

**Tests:** alternatives cannot inherit original instructions/demo identity; save/load cannot rehydrate the original as the replacement; knee pain with only `shoulderMod` does not claim a knee-safe swap; multiple regions preserve original provenance and cautions.

## 5. P1 — Sprint authorization, regeneration, memory, and retries

Sprint route/service/generator are unchanged between `f8815a0b1` and current main.

1. **Generate/stream IDOR:** `sprintRoutes.mjs:127-160,177-199` never checks the caller against the sprint; generator loads by bare ID (`sprintGenerator.mjs:64`). Another trainer can initiate generation or inspect progress.
2. **Normal regeneration rejects valid route IDs:** route passes string parameters (`sprintRoutes.mjs:258-259`), then `sprintGenerator.mjs:221-222` compares integer `slot.sprintId !== sprintId`. Synthetic numeric 7 versus string `"7"` produced `Slot not found`.
3. **Memory receives no keys:** `buildExerciseRecord` drops `key` (`bootcampGenerator.mjs:242-272`); Sprint extracts only `ex.key` (`sprintGenerator.mjs:139-142,243-245`). A real record function produced `extractedSprintKeys:[]`. The earlier claim that Sprint memory works mechanically is rejected.
4. **Resume ignores saved memory:** `sprintMemory` starts empty (`:99-100`); generated/taught slots are skipped without collecting keys (`:114-117`).
5. **Taught confirmation inflates counts on retry:** `sprintService.mjs:279-286` marks taught and increments unconditionally. Two calls produced two increments.
6. **DB claim permits a later concurrent claimant:** compare-and-swap matches only ID/current version (`sprintGenerator.mjs:78-85`), not a non-generating status. A second process reading the incremented version can claim while the first works. Finalization writes by bare ID (`:187-190`).
7. **Pre-finally failure can strand generation:** previous-sprint memory loads at `:91-97`, after claim but before `try` at `:108`.
8. **Regeneration destroys memory before success:** `:224-240`; generator/write failure cannot restore it. New memory stores `weekNumber:slot.weekId` (`:259`), confusing row ID with ordinal week.
9. **Taught confirmation does not write actual class history:** it never creates `BootcampClassLog`, despite the slot model having `classLogId`; Sprint taught work does not close Bootcamp's actual-history loop.

**Repair contract:** normalize/validate IDs once; enforce ownership before job lookup, SSE headers, or mutation. Define stable generated exercise identity. Persist slot+memory atomically after successful generation; seed resume from saved slots. Use DB claim/lease with status/version checks and scoped finalization. Taught confirmation must transition once transactionally, increment once, and link one class log. Preserve taught history; distinguish planned/generated/taught/skipped.

**Tests:** trainer A/B and admin auth for both stream routes; string IDs; two-process claim simulation; partial-generation resume; failures around each write; duplicate/concurrent confirmation; skipped/taught slots; correct ordinal week; non-empty stable memory. Existing `tests/api/sprintRoutesSecurity.test.mjs` tests source strings/error sanitization, not ownership or these mutations.

## 6. P1/P2 — Sprint progression is disabled twice; calendar drift

- Scaffold persists `intensityModifier:1.0` in every non-deload week (`sprintService.mjs:71,130`). `week.intensityModifier || progressionFn(...)` (`sprintGenerator.mjs:110-112`) then bypasses every progression strategy.
- Even after that fix, `low|moderate|high|max` (`sprintGenerator.mjs:50-54`) is unsupported by the scorer (`bootcampGenerator.mjs:357-379`) and template intensity ENUM.
- Legacy format tokens such as `stations_3x5` are not resolved by `FORMAT_CONFIG`; `resolveBootcampStructure` falls back to `4x4_r2` but retains the requested label (`bootcampGenerator.mjs:410-424`).
- Current random selection means prior claims that every week has identical exercises are too strong. The progression signal remains ineffective, while exercise picks can vary randomly.
- Date-only UTC parsing mixes with local getters/setters (`sprintService.mjs:34-61`). Synthetic LA-timezone Monday start `2026-09-14` plus `['monday']` stores `scheduledDate:'2026-09-15'`, `dayOfWeek:1`.

**Correctness repair:** calendar/UTC-only arithmetic; canonical format alias mapping; distinguish absent versus manual modifier. Validate duplicate/invalid frequency entries and bound duration to supported product horizons before constructing schedules.

**Tests:** Monday/non-Monday starts, DST boundaries, timezone independence, duplicate frequency values, supported duration limits, every legacy format, progression strategies, explicit overrides, deloads.

**Training-policy decision required:** intensity progression is not impact category. Do not map `high` mechanically to `high_impact`. Choose and record actual deload percentages, load increments, intensity-to-prescription math, and trainer override behavior in the canonical blueprint before implementing training math.

## 7. P1/P2 — Planner classification, allocation, equipment, and horizon drift

- Registry categorizes all `legs` as `squat`, all `arms` as `push`, using body part before `nasmMovementPattern` (`variationEngine.mjs:435-451`). A legs-tagged deadlift cannot enter hinge selection even when its stored movement pattern says hinge.
- Full-body uses `ceil(count/6)` then truncates (`workoutBuilderService.mjs:572-596`); with sufficient candidates and count eight, two each of push/pull/squat/hinge consume the allocation, dropping lunge/core.
- Claimed seven-session rotation stores only seven keys (`:1239-1245,1266,1305-1307`).
- Deload uses unchanged phase prescriptions (`:1269-1290`) and then labels those days active recovery due to `isDeloadWeek` (`:1312-1320`).
- Weekly overload remains explanatory text (`:1125-1129`); plan-day output lacks the single-workout path's history-derived load recommendations.
- Missing/empty selected equipment profile silently disables filtering (`:561-568,1083-1089`).
- Equipment `some` allows an exercise requiring barbell and bench with barbell-only inventory; the synthetic fixture retained `bench_press`.
- Bootcamp bridge accepts any equipment substring (`exerciseRolodexBridge.mjs:93-100`). Empty bridge results fall back to registry without reapplying the requested inventory (`bootcampGenerator.mjs:571-575`).
- No-profile Bootcamp inventory returns `['bodyweight','none']` (`bootcampGenerator.mjs:291-292`; `bootcampCapacity.mjs:29-39`), initially constraining the supposedly open-gym query to bodyweight. Subsequent fallback can admit equipment. No-profile semantics are inconsistent.

**Repair contract:** canonical movement classification with explicit fallback; round-robin allocation; retain sessions as sessions; distinguish no profile, empty confirmed profile, unavailable profile, and open gym. Model all-required equipment versus acceptable alternatives. Do not blindly replace all `some` calls with `every`, because some legacy arrays intentionally mean alternatives.

**Tests:** DB-shaped deadlift/lunge/curl classification; count 1-12 with sufficient/sparse pools; seven six-exercise sessions; empty/unavailable/foreign profiles; AND requirements, OR alternatives; strict inventory surviving bridge failure. Deload/load changes require the policy decision above.

## Prior-review dispositions

| Previous claim | Current-main disposition |
|---|---|
| Bootcamp nonexistent pain status column | STALE/FIXED by isActive + active roster. New pain vocabulary failure remains. |
| Exact-case Bootcamp station targeting | STALE/FIXED by normalized primary/secondary targeting and visible sparse coverage. |
| Deterministic Bootcamp regeneration | STALE/FIXED by sampled selection. Planner remains deterministic within inputs/history. |
| Table-count probe every generation | STALE/REMOVED. |
| Hardcoded aiGenerated:true | STALE/FIXED; reflects actual brainUsed. |
| No LLM path anywhere | STALE; optional Bootcamp brain/provider-module path exists. Runtime enablement was not inspected. |
| Planner pain/equipment mismatch | CONFIRMED, including synthetic source probes. |
| Silent bridge fallback | CONFIRMED; inner catch-to-empty remains at bridge line 162. |
| Sprint ownership gap | CONFIRMED. |
| Sprint memory works | REJECTED; record identity is dropped. |
| Sprint progression ineffective | CONFIRMED, plus stored-default override blocker. |
| Planner deload/count/window failures | CONFIRMED. |
| Missing elbow/foot/hip mods | CONFIRMED in bridge SELECT line 143, formatter, and generated record. |
| Save loses all provenance | PARTIAL; class relaxation summary now persists, important exercise/pain/profile fields do not. |
| Zero class-log/history UI consumers | Initially NOT RECERTIFIED; subsequent bounded boundary audit confirmed this is STALE/FIXED by BootcampTaughtPanel/useBootcampTaughtLog. See backend-boundaries.md. |
| All four P0s broken in production | NOT A VALID CURRENT-MAIN CONCLUSION. Prior DB evidence belongs to the old review. No production DB was queried here. |

## Bounded repair order and policy boundary

1. Save write authority/atomicity.
2. Sprint authorization/state correctness.
3. Taxonomy and replacement identity.
4. Complete save/load fidelity.
5. Count/session/equipment correctness.
6. Explicitly specified progression policy.

Preserve current Brain, day-type, attendance, and quality-gate architecture. New deload/load percentages, high-impact eligibility, clinical claims about substitutions, and equipment-AND/OR interpretations are product/training decisions; distinguish those from repairing IDs, ownership, aliases, calendar math, and transactional consistency. Do not claim provider readiness or run paid/provider requests from this audit.

## Repeatable evidence

Invocation from the dedicated repository root:

```powershell
node tmp/rolodex-audit-evidence/backend-probes.mjs | Tee-Object -FilePath tmp/rolodex-audit-evidence/backend-probes-output.json
```

Actual execution: exit code **0**, Node `v24.19.0`, no application changes. [Executable probe](backend-probes.mjs). [Exact JSON output with source SHA-256 hashes](backend-probes-output.json).

Actual observations from that execution:

| Probe | Output |
|---|---|
| Generated identity | hasKey=false; extractedSprintKeys=[] |
| Child FK override | created parent 123; station/stretch/overflow each linked to supplied 999 |
| Duplicate taught confirmation | increments=2; final slotStatus=taught |
| String-ID regeneration | rejected=true; error=Slot not found |
| Planner Biceps vs biceps | retained=[curl] |
| Planner Dumbbells vs dumbbell | retained=[] |
| Planner missing bench | retained=[bench_press] with barbell only |
| Alternative identity | Wall Sit retained synthetic-original-demo, original-id, and Jump explosively |
| Severe chest / pectorals | alerts=0 |
| Severe upper_traps_left / traps | alerts=0 |
| Severe mid_back_left / latissimus_dorsi | alerts=0 |
| Severe knee / quadriceps positive control | alerts=1 |
| Stored intensity default | computed linear 1,1.05,1.1,1.2,1.45; actual all 1 |
| LA Monday date | input 2026-09-14; stored 2026-09-15; dayOfWeek=1 |

The script is diagnostic evidence rather than a passing regression suite. It deliberately exposes baseline defects; changed results after repairs are expected. No DB/runtime success can be inferred from these synthetic observations.

## Inspected inventory and remaining boundaries

Inspected current and prior Sprint routes/service/generator; Bootcamp routes/generator/CRUD/bridge/constants/taxonomy/capacity/pain gating/class-style helpers; Bootcamp/Sprint models and associations; Planner service and relevant routes/candidate equipment; variation registry; central pain ontology; exercise-library route; Sprint security tests and backend setup/config. Library `/api/exercises/library` remains the authenticated reference-data contract, with no evidence supporting replacement.

Attendance was initially inspected at its route boundary, not fully audited. The parent subsequently requested a separate bounded pass over Brain/provider dispatch, attendance, and runner commands; those results belong in `backend-boundaries.md`. Neither document claims deployed, DB-verified, or provider-verified behavior.
