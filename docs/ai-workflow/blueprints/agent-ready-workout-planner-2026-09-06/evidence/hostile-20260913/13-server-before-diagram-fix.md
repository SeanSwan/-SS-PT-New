# Server repair contract — hostile adjudication and bounded build decisions

Version 1 — 2026-09-13. Owner: Sean. Role of this document's author: Astra architecture/audit subagent. Scope: documentation only. **DESIGN DECISIONS SPECIFIED; formal PLAN READY and IMPLEMENTATION VERIFIED are not claimed.**

This appendix specializes `12-hostile-reconciliation-and-repair.md` (`12-hostile-reconciliation-and-repair.md` — not committed; machine-local evidence); it does not replace the preserved packet or approve application changes past its workflow gates. Requirements R-H01–R-H30 retain their existing IDs. The source reports are `backend-audit.md` (`../../../../tmp/rolodex-audit-evidence/backend-audit.md` — not committed; machine-local evidence) and `backend-boundaries.md` (`../../../../tmp/rolodex-audit-evidence/backend-boundaries.md` — not committed; machine-local evidence). These relative evidence links resolve from the blueprint directory to the worktree's ignored tmp evidence directory; preservation/receipt must package those artifacts before another checkout is asked to rely on them.

Authoritative source: worktree `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913`, HEAD `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`. The divergent `f8815a0b1` review branch is historical evidence only. Before this document was written, scoped status reported the copied blueprint directory untracked and no application modifications. Parent owns integration; this agent owns only this new appendix.

Read-input SHA-256 snapshots:

| Artifact at the time of this read | SHA-256 |
|---|---|
| Appendix 12 | `c04ae3ccf14b4603e7cca3f09a164775f01cf0579898c0c8ae3914f972171752` |
| backend-audit.md | `6eb60dd076bd47bbace5962c2f4b29f1acad94b23a9539e7cb862ee948bc6415` |
| backend-boundaries.md | `53b4089803ef4eeb5ef6f7a630cd38d42194dbc2e385ddfc2007a9cd260fe321` |

Appendix 12 is actively maintained by the parent; later hashes can differ without invalidating these read snapshots. No existing plan/report was overwritten.

## 1. Hostile verdict on the repair plan

The plan identifies the correct boundaries. Its earlier phrases “claim,” “normalize equipment,” and “apply progression” are not sufficient implementation contracts by themselves. The decisions below close the specific implementation ambiguities; the remaining blockers are evidence/workflow gates, not an invitation to redesign the product.

| Plan gap challenged | Adjudicated decision | Requirements |
|---|---|---|
| A status-only claim can be stolen by a newer reader; an old finally block can release a new owner | Database row lock plus monotonically increasing generationVersion; lease and every commit/finalize fenced by that exact owner/version | R-H03–H05 |
| Memory looks like per-slot exposure but SQL uniqueness is per Sprint/exercise | Keep the existing unique index; define the table as a derived union with one deterministic representative slot. Slot snapshots retain actual exposure truth | R-H04–H05 |
| Changing every equipment some() to every() breaks genuine alternatives | Explicit source-aware disjunction of requirement sets; defaults and legacy overrides specified below | R-H08 |
| Clearing a URL alone still allows source identity to rehydrate it | Replacement identity governs hydration; source identity is provenance only, persisted separately | R-H02, H09 |
| A generated label can claim progress while prescriptions remain unchanged | Actual typed prescriptions and recorded before/after values govern labels; conditional future advice is labeled conditional | R-H11, H20 |
| A deload is mislabeled as an active-recovery movement day | Keep strength days as training/homework with a volume deload; only actual recovery selections use active_recovery | R-H20 |
| Taught confirmation and taught-log retry have different identities | Sprint confirmation uses the owned slot as its operation identity; ordinary class runs get a durable unique operation key | R-H04, H28–H29 |
| ClassPlan forbids per-person data but attendance may need a selected variant | Keep person-level attendance selections outside ClassPlan and outside all Brain input | R-H26, H28 |
| Proposed baseline command paths resemble directories that do not exist | Existing tests are flat files under backend/tests/unit; use verified file paths/prefix selection and record executed test counts | All server tests |

A further correction matters: `bootcampConstants.mjs:45–49` already contains legacy format definitions. Do not “fix” these by mapping their names to superficially similar formats with different timing or station counts. Preserve each existing format's exact structure through route validation and saving.

## 2. Exact source scope and ownership

Paths below are relative to the authoritative worktree. Line references identify c0c source, not future edited line numbers. Add narrowly scoped pure helpers only where listed; no new generic job framework, catalog rewrite, phase table, provider integration or server runner relay.

| Work unit | Existing source touch points | Permitted new source / data |
|---|---|---|
| Template authority, transaction and fidelity | backend/routes/bootcampRoutes.mjs; backend/services/bootcamp/bootcampCrud.mjs:55–258; backend/models/BootcampTemplate.mjs:68,103; existing template/exercise associations in backend/models/associations.mjs | backend/services/bootcamp/bootcampTemplateContract.mjs for normalization and metadata envelope; use existing Template.metadata, no exercise-column migration |
| Equipment, muscles and movement classification | backend/services/variationEngine.mjs:361–475; backend/services/workoutBuilderService.mjs:181–229,562–596,1084,1229; backend/services/workoutBuilderCandidateService.mjs; backend/services/bootcamp/bootcampTaxonomy.mjs; bootcampCapacity.mjs; exerciseRolodexBridge.mjs; painAwareGating.mjs; bootcampGenerator.mjs | backend/services/exerciseConstraintContract.mjs, pure source-aware normalization/matching; do not duplicate existing muscle/region ontology dictionaries |
| Substitution truth | backend/services/bootcamp/classStyleModifiers.mjs:60–110; painAwareGating.mjs:130–155; bootcampGenerator.mjs:242–276; bootcampCrud.mjs:76–104,158–193 | backend/services/bootcamp/bootcampSubstitutionContract.mjs, pure provenance/identity contract |
| Sprint claims, dates, memory, confirmation | backend/routes/sprintRoutes.mjs:127–199,258; backend/services/bootcamp/sprintGenerator.mjs; sprintService.mjs:32–149,199–298; BootcampSprint/SprintWeek/SprintClassSlot/SprintExerciseMemory models as contract references | backend/services/bootcamp/sprintGenerationClaim.mjs; existing Sprint.metadata/generationVersion and slot JSONB hold claim/prescription data; no Sprint lease-column migration |
| Progression prescription | sprintGenerator.mjs:31–54,110–135; sprintService.mjs:70–71,232–240; workoutBuilderService.mjs:731–749,1109–1131,1208–1335; workoutProgressionService.mjs:104–192 | backend/services/workoutPrescriptionProgression.mjs, pure transformations; reuse nasmOptPolicy.mjs and planDayTypeService.mjs. Canonical phase table is read-only |
| History/attendance and commands | bootcampCrud.mjs:219–221; bootcampRoutes.mjs:164–182,210–265; bootcampAttendance.mjs; models/BootcampClassLog.mjs; services/ai/commandRegistry/bootcampCommands.mjs | Additive migration for nullable ClassLog.operationKey, payloadHash and executionSummary, with a unique trainerId/operationKey index; model and migration registry wiring only as required by repository convention |
| Brain contract | backend/services/bootcamp/bootcampBrain.mjs:95–207; bootcampGenerator.mjs:644–658,814–823 | Optional abort-capability adapter contract; no provider/module configuration, provider activation or paid fallback |

The shared timing compiler `shared/bootcamp-core/timeline.mjs`, ClassPlan schema and frontend `BootcampClassPlanAdapter.ts` are integration dependencies. Parent must assign the adapter/consumer work to its frontend lane. Backend timing checks must import the same pure ClassPlan compilation contract; do not reproduce independent PDF/Runner/Bootcamp duration formulas. If the existing adapter is browser-typed, extracting its pure conversion to the shared directory is a separate, explicitly scoped integration edit with byte-equivalence tests.

Headless appendix: new UI wireframes N/A. Existing loading/partial/conflict/retry, substitution disclosure, progression labels and Preflight states remain owned by appendix 12's desktop/mobile wireframes. No new consumer UI is silently waived by calling this appendix headless.

## 3. Source-aware equipment and muscle contract

### EquipmentRequirementV1

Normalize to a disjunction of conjunctions:

```ts
type EquipmentRequirementV1 = {
  version: 1;
  anyOf: Array<{ allOf: string[] }>;
  status: 'known' | 'unresolved';
  sourceKind: 'catalog' | 'legacy_registry' | 'explicit_v1';
  sourceKey: string | null;       // local provenance, never provider input
  ruleVersion: string;
  rawLabels: string[];
  unresolvedLabels: string[];
};
```

An exercise is feasible only if at least one complete allOf option is feasible. An empty outer anyOf is invalid/unresolved, never vacuously true. A deliberate `anyOf:[{allOf:[]}]` means no external equipment. `bodyweight` is always available but does not erase other members of its conjunction.

| Source and example | Normalized anyOf | Decision |
|---|---|---|
| Catalog equipmentNeeded = ["barbell","bench"] | [{allOf:["barbell","bench"]}] | Both required |
| Legacy barbell_squat = ["barbell","rack"] | [{allOf:["barbell","rack"]}] | Both required |
| Legacy inverted_row = ["bodyweight","rack"] | [{allOf:["bodyweight","rack"]}] | Rack still required |
| Legacy face_pulls = ["cable_machine","resistance_band"] | [{allOf:["cable_machine"]},{allOf:["resistance_band"]}] | Explicit alternatives |
| Legacy goblet_squat = ["dumbbell","kettlebell"] | [{allOf:["dumbbell"]},{allOf:["kettlebell"]}] | Explicit alternatives |
| Explicit bodyweight option plus loaded option | [{allOf:["bodyweight"]},{allOf:["dumbbell"]}] | Bodyweight is valid because the source explicitly permits it |
| Missing/null/malformed equipment source | unresolved | Never infer verified equipment-free status |
| Explicit catalog [] | [{allOf:[]}] | Catalog declares no external equipment; preserve source provenance |

Decode existing array or JSON-encoded-array storage, including at most two JSON decoding layers; reject malformed objects, deep nesting and non-string items as unresolved. Normalize trim/case/separator and a small tested exact alias dictionary. Do not use arbitrary substring matching, broad machine/ball equivalence or an LLM. Deduplicate tokens without changing raw display labels. Candidate and profile tokens go through the same normalizer. Unknown specific labels can match only the exact normalized unknown token explicitly present in an authorized inventory; a generic `machine` does not match every machine.

Legacy exceptions are keyed by source kind plus stable exercise key; never infer OR merely because the array has two entries. At this revision, explicit OR keys are face_pulls, upright_row, shrugs, overhead_tricep_extension, goblet_squat, walking_lunges, reverse_lunges, romanian_deadlift, single_leg_deadlift, russian_twist, pallof_press and external_rotation. calf_raises retains its explicit bodyweight option; its generic machine option remains unresolved unless that exact token is deliberately inventoried. Every other existing legacy multi-item array defaults to AND. Thus step_ups continues to require bench+dumbbell until a source author explicitly declares the unweighted variant. This favors a disclosed false negative over an invented equipment claim.

Explicit V1 requirements take precedence when authoritatively stored; client-supplied claims of catalog provenance are untrusted. Catalog rows continue to accept legacy equipmentNeeded arrays and return their existing display fields. V1 is an additive normalized view; no bulk data rewrite or migration is needed.

### Profile-state contract

| State | Feasibility behavior | Observable result |
|---|---|---|
| No profile selected | Open-gym mode; keep existing common-gym assumptions visible | Never label equipment verified |
| Selected, authorized, successfully loaded, zero items | Verified-empty inventory, bodyweight options only | A rack exercise remains excluded |
| Selected, authorized and loaded with items | Strict matching of complete requirement options | Include selected option and shortages |
| Missing/deleted/foreign selected profile | Existing 404/403 authority response before generation | Zero generation/provider dispatch |
| Profile/bridge dependency unavailable | Retryable constraint-unavailable result, preserving previous draft | Never fall through into an unconstrained pool |

Bridge SQL may provide candidates but is not the final feasibility authority. Apply the same pure matcher after bridge results and after every registry/fallback branch. A bridge error cannot change strict mode. Unknown/unresolved requirements are excluded from strict generation with an aggregate reason; open-gym mode may surface them only with an unresolved assumption, never as verified.

Equipment kind availability and simultaneous quantity/capacity are separate checks. Once an OR option is selected, reserve that option in the existing deterministic station capacity allocator; do not count every alternative as required and do not reuse the same single item across simultaneous demands. Multi-option capacity search is bounded and deterministic. No-profile mode reports unverified capacity; no fabricated counts.

For muscles, both candidate primary and secondary lists and existing pain/region exclusions must use the same canonicalizer. Preserve unknowns and surface unresolved warnings. Use stored nasmMovementPattern/movementPattern before coarse bodyPartCategory fallback. Pain severity thresholds and clinical rules are unchanged. No source dictionary repair is a medical efficacy claim.

## 4. Substitution provenance and save fidelity

A substitute has two identities: the original offered movement and the movement the person will perform. A rename is insufficient proof of the second identity.

```ts
type SelectionProvenanceV1 = {
  version: 1;
  recordKey: string;              // server-generated UUID for this occurrence
  source: { exerciseKey: string | null; libraryId: string | null; name: string };
  replacement: { exerciseKey: string | null; libraryId: string | null; name: string } | null;
  resolution: 'original' | 'verified_replacement' | 'unverified_replacement';
  reasonCode: 'original' | 'requested_region_mod' | 'board_alternative' | 'low_impact_alternative';
  requestedRegion: string | null; // canonical aggregate region only
  detailsVerified: boolean;
};
```

The identity referenced by exerciseLibraryId and media hydration is always the performed/displayed identity. Verified replacement means exact stable ID/key resolution from the trusted registry/catalog and reapplication of equipment/pain constraints. Name-only matching is allowed only when exact normalized name yields exactly one candidate; ambiguity is unresolved. Names alone never prove region suitability. Canonical verification does not claim that an exercise treats a medical condition.

For unresolved replacement text, clear source library ID, source key as active identity, all video/image/thumbnail fields, instructions, description, equipmentRequired, muscleTargets and source-derived modification/variation details on the replacement row. Preserve source identity only in provenance/sourceExerciseName. Preserve generic timing, position and board. Show “details unverified / trainer review”; do not invent replacement-specific directions. Future reload may resolve an explicit target ID, but must never join back to the source ID because replacement media is absent.

A requested knee modification may use kneeMod. It may not silently fall back to shoulderMod, another joint's field, or easyVariation and claim knee suitability. If a same-region alternative is absent or cannot pass applicable constraints, retain an explicit unresolved/manual-review state. Unverified alternatives may be displayed for trainer review; they cannot satisfy a severe-pain exclusion in automatically generated main work. The engine must either find a verified eligible replacement or return a blocked/partial result.

Existing data compatibility: on load, a row with a different sourceExerciseName and no V1 metadata is treated as an unresolved substitution; suppress source hydration. An old row with neither provenance nor a differing source name cannot be proven to be a rename—do not retroactively certify or bulk rewrite it.

Persistence uses existing BootcampTemplate.metadata under a reserved, versioned `selectionManifestV1` map keyed by persisted BootcampExercise row ID. In the one save transaction, generate unique occurrence recordKeys, create explicitly allowlisted rows with server-owned templateId/stationId, collect returned row IDs, then write the server-built manifest. It carries provenance, canonical exerciseKey, selectionReason/chips/rung and pain caution/swap metadata plus optional prescription metadata. Reject duplicate/invalid occurrence references before writing. Root JSON metadata is descriptive, never write authority. User-supplied row IDs, FK values, manifest keys and `verified` flags are ignored/rejected, not trusted.

This avoids adding unsupported ORM attributes to BootcampExercise and avoids a column migration for the repair. Return and load reattach the manifest to each actual row ID before display/hydration. Persist equipmentProfileId and spaceProfileId after authority checks. Include root exercises for full_group; avoid duplicating station rows in both collections. All zero timing values and all board/order values survive. A late child/manifest failure rolls back the parent, stations, exercises, stretches and overflow. Existing templates without the manifest remain readable.

## 5. Sprint claim, commit, recovery and history

### API and ownership

Normalize every Sprint/week/slot route ID to a finite positive safe integer before job lookup or query. Validate every callable service with an actor context `{userId, role}`; no “internal caller is trusted” escape. Trainer owns the Sprint; admin override is explicit and follows existing policy. Scope week/slot queries to the authorized Sprint. A previousSprintId must pass the same object authorization before any memory read.

New generation/regeneration requests carry a stable operationId UUID and expectedGenerationVersion from the loaded Sprint. The client retains both for retries. Missing version returns 428 with a refresh instruction; malformed IDs/options return 400/422; stale version/active generation returns 409; unauthorized object returns the existing non-disclosing error contract. Coordinate the caller update in the same integration release. No automatic retry POST obtains a new version on the user's behalf.

SSE checks ownership before flushing headers or reading any in-memory job events. Cache keys include Sprint ID and generationVersion/operationId. An authorized GET reconnect reads durable status even after process restart; if event details have expired, send a status snapshot plus explicit terminal/interrupted state. Do not imply the in-memory Map is a cross-process coordinator.

### Durable claim in existing fields

`generationVersion` is the fence. Reserve Sprint.metadata.generationOperationV1:

```ts
{
  version: 1, operationId, expectedVersion, claimedVersion,
  kind: 'generate_all' | 'regenerate_slot', slotId: number | null,
  requestHash, state: 'running' | 'completed' | 'failed' | 'interrupted',
  previousStatus, startedAt, heartbeatAt, leaseExpiresAt,
  completedSlots, failedSlots, terminalResult: object | null
}
```

Do not accept this reserved metadata from generic update endpoints. Merge unrelated Sprint.metadata keys under the row lock. No client clock decides lease ownership.

1. In a short managed DB transaction lock the authorized Sprint row FOR UPDATE. Check status, expected version and operation ID/hash. The same most-recent operation ID/hash returns its in-progress/terminal receipt without new work. Same operation ID with changed hash is 409. An older expected version is 409 even if its receipt has since been replaced; this prevents an old retry from becoming fresh generation.
2. Claim only draft/active states, or an explicitly retried expired generating lease. Completed/archived Sprints are not rewritten. Increment generationVersion exactly once and store running metadata/status together. Validate schema/profile references first where possible. All post-claim setup—including previous memory loads—is inside guarded cleanup.
3. Lease: 120 seconds using database time; heartbeat every 30 seconds and immediately before expensive dispatch. These are engineering liveness limits, not training policy. Heartbeat updates require the owned version/operation and an unexpired lease. It may not revive an expired claim.
4. Generation happens outside transactions. After any awaited generation/adapter call, check cancellation/fence before writing. Claim ownership is lost if a new version exists or the lease expired, even if this worker believes it is alive.
5. Every Sprint/week/slot mutation, archive and confirmation takes the Sprint lock first and rejects a live generating claim. Generic status writes cannot fabricate generating/generated/taught states. Every generation-affecting edit increments generationVersion too, so a request based on older settings is stale; a notes-only edit does not. Read-only calls remain available. New defaults apply to still-planned slots only. Changing the structure/prescription of an already generated slot uses an explicit regenerate operation with validated overrides: commit the new settings and snapshot together, preserving both old values on failure. Taught data is immutable through these endpoints. Do not silently change a slot's format/week prescription label while retaining a different generated class.
6. After an expired lease, an explicit authorized retry may take a new version and record the earlier operation interrupted. Lease expiry is permission to fence stale writes, not a claim that a process/provider stopped. The old worker's heartbeat, slot commit and finally all fail their fence. No timer automatically launches another generation.

### Slot transaction and memory semantics

Preserve the existing DB unique index `idx_sprint_exercise_unique(sprintId, exerciseKey)`, defined by `20260401000002-create-bootcamp-sprint-tables.cjs:303–305`. The table is the Sprint's distinct-key union, not an occurrence ledger.

For each successful generated result: begin a short transaction; lock Sprint then target slot; assert actor, exact owned version/operation, unexpired lease and eligible slot state; validate the generated snapshot; update slot generatedClassData, exerciseKeys and status; update the memory union; commit. Emit success/progress only after commit. A memory failure rolls back slot changes. Never mutate the in-process exclusion Set before commit.

Slot.exerciseKeys is the exposure source. New generated records carry the canonical registry key (`exercise_key` or existing `db-<id>` fallback from variationEngine.mjs:443–444), not only a display name. Carry it in generatedClassData and the template manifest. Deduplicate within a slot. Main performed choices are primary memory; alternative boards are not additional exposures. A verified main substitution retains original key in provenance and includes the actual replacement key in its selected-identity data. Exclusion matching may conservatively reserve both its source and target while reporting that policy; unresolved free text is not an invented catalog key.

Resume seeds from all already generated/taught slot snapshots before generating the first missing slot, plus the authorized previous Sprint union. Order by weekNumber, scheduledDate, slot ID. For legacy snapshots without keys, resolve exact ID/key from the registry; exact-name resolution must be unique. If any required memory cannot be reconstructed, return an explicit memory-unresolved/manual-review result instead of promising no-repeat. Do not silently use an empty Set after read failure.

Within the Sprint lock, derive the union from all eligible generated/taught slot exerciseKeys. Each key's representative is the earliest exposure by ordinal weekNumber, scheduledDate and slot ID. Upsert representative slotId/weekNumber; remove a union row only if no surviving exposure owns that key. This preserves the existing unique schema and handles legacy duplicates without deleting another slot's exclusion. A bounded Sprint has at most 52 weeks and 7 unique weekly days; reject larger new schedules instead of an unbounded generation loop. Slot snapshots remain the authority for actual history. Never store weekId where ordinal weekNumber is required.

Regeneration claims the Sprint using the same protocol. Reject taught/skipped slots; require explicit state correction outside this operation. Build exclusions from other surviving slots plus prior Sprint memory **without deleting old memory**. Generate externally. Replace target snapshot and rebuild the affected union in one fenced transaction. Failure leaves the old snapshot/keys/memory byte-equivalent. A later slot failure during full generation preserves earlier committed slots for resume; full-horizon all-or-nothing is deliberately not promised.

### Finalization and rollback

Finalization is another short transaction locking Sprint and comparing owned version/operation/lease. Derive counts from persisted slots, not loop counters. Mark active only when all non-skipped required slots are generated/taught and there is at least one required slot; otherwise draft with a failed/interrupted reason. Return the status actually committed. A finally block can release only its own claim and can never unconditionally overwrite a newer Sprint status.

If an unexpected error occurs before the first slot, own-only cleanup returns draft/prior compatible state and records failure. If cleanup/DB is unavailable, do not announce success: the persisted lease remains the recovery path. Log sanitized operation ID/version/stage/count/reason; no exercises, notes or health data. Losing the SSE connection ends listening, not an already authorized backend operation. Explicit cancellation, if later added, must fence commits; no server cancel endpoint is invented in this repair.

```mermaid
sequenceDiagram
 participant C as Authorized caller
 participant W as Worker
 participant D as Database
 C->>D: Check actor and expected version
 D->>D: Lock Sprint and claim new fence
 D-->>W: Owned operation and lease
 W->>W: Generate outside transaction
 W->>D: Lock Sprint then slot; verify fence and lease
 alt stale or write fails
 D-->>W: Conflict or rollback; old slot survives
 else owned and valid
 D->>D: Commit slot and memory union together
 D-->>C: Committed progress
 end
 W->>D: Finalize only owned fence
 alt lease expired and explicit retry claims newer fence
 C->>D: Claim new version and resume committed slots
 W->>D: Old finalize rejected
 end
```

### Taught confirmation and ordinary logs

Sprint confirmation locks Sprint then slot. A generated slot transitions to taught, gets one class log, links classLogId and updates the distinct taught count in the same transaction. Retry returns the existing linked log/slot; differing date or performed payload is conflict, not an overwrite. Confirmation of planned/empty data fails. Repeated calls do not add counts or logs. Legacy taught slots with a valid saved snapshot can create their missing log/link on explicit confirmation without an extra transition; absent snapshots require manual review and no invented history.

Use deterministic operationKey `sprint-slot:<slotId>`, scoped by trainerId, for that log. Ordinary taught logs use `run:<stable-run-UUID>` persisted by the caller before its first POST. Add nullable ClassLog.operationKey STRING(128), payloadHash STRING(64), executionSummary JSONB and a unique index on trainerId+operationKey. Old rows remain null and readable. New write endpoints require an operation key; do not backfill imaginary run identity into historical logs.

Canonical payloadHash is computed after schema normalization and excludes receipt timestamps. Same key/hash returns the original log ID; changed content with same key is 409. Unique-constraint races re-read the winning log **after the losing transaction rolls back**, then compare hashes. No retry handler continues querying inside an aborted PostgreSQL transaction. The Sprint path's existing slot lock also prevents duplicate link creation.

executionSummary distinguishes trainer_attested_prescription from runner_measured. Current UI supplies the former. Prescribed work seconds/rounds are not measured elapsed time; expectedParticipants is not actual attendance. No timer event writes history implicitly. Creating a taught log does not deduct sessions or award new gamification, and does not auto-record attendance.

Attendance retains the existing per-log row lock and receipt transaction. Select exactly one performed identity per logical slot. Old rows with no board are treated as the trainer-attested performed list; new mixed-board input must explicitly select the main or an authorized alternative. Per-attendee selected-variant data belongs to attendance input, not ClassPlan/Brain. Alternative/lowImpact offers alone never create extra completed sets.

Call canonical model validation explicitly on each prepared DailyWorkoutForm before bulk insert, including nonempty exercises, date, duration and trainer/client rules; run only the required existing normalization hooks, with transaction context. Do not globally enable arbitrary hooks that might trigger billing/provider/gamification side effects. Self-attendance is rejected for registered workout-form creation while that existing model invariant stands; no special self exception is invented. No-show/guest-only behavior follows the existing explicit contract. Failure rolls back all forms and attendance receipt.

## 6. H20 — concrete conservative progression contract

This section resolves the numeric policy needed for the repair. It adopts current code's training intent without inventing estimated performance, changing impact eligibility or replacing the canonical NASM table. It is a product programming decision for trainer-reviewable prescriptions, not a clinical recommendation or certification.

### Single-session measured progression

Keep `nasmOptPolicy.mjs:21–85` as the single phase range/tempo source. Keep the existing micro-progression rule in `workoutProgressionService.mjs:104–173`: last comparable logged performance, one rep first, then +2.5 lb upper-body or +5 lb lower-body at the phase rep ceiling, with existing pain/high-RPE/readiness holds. Do not introduce compound weekly percentage load increases or a second phase table.

Repair fidelity: when progression.action supplies targetReps, the actual typed prescription used by Logger/save must match it, not only progression.note. Apply normalized primary+secondary pain matching before allowing an increase. Do not raise a load/volume that an existing pain or readiness transform has already lowered. Unknown history, missing pain/readiness data or unresolvable exercise identity yields conditional/hold metadata, not proof that progressive loading is safe. Existing weight-unit assumptions must be explicit; these increments are pounds and must not be relabeled kilograms.

### Planner horizon and deload

A future planned session is not evidence that the prior planned session was completed. Do not recursively compound the same logged performance through 12–52 future weeks. Keep mesocycle/phase selection and planned exercise structure. Future overload advice is `conditional_on_logged_performance`; materialize the measured micro-progression when an actual next comparable session is requested. Rename unconditional “weekly load increased” claims to that conditional state unless a real numeric change exists.

Use the existing scheduled fourth-week deload and the existing Sprint factor 0.7 as the explicit default **volume** factor. For a non-recovery Planner day, after normal phase, style and readiness transforms:

- If sets >= 2, deloadSets = max(1, floor(baseSets * 0.7)); keep reps/load/rest/tempo. Examples: 4→2, 3→2, 2→1. Integer sets mean the effective reduction is often larger than 30%; report actual before/after, not “exactly 30% less work.”
- If there is only one set, reduce a positively parsed integer rep target or both bounds of a numeric rep range with max(1, floor(value * 0.7)); preserve order. For a duration prescription reduce positive work seconds/range similarly. Do not parse an arbitrary free-text instruction as a numeric target.
- If no reducible supported field exists, leave the prescription unchanged with `applied:false, reason:'unsupported_prescription'`; mark manual review. Never stamp “deload applied” on unchanged data.
- Do not reduce rest, increase load or alter tempo to compensate. Regenerate setScheme/repGoal from the new typed values. Persist baseline/actual values and policyVersion.
- Strength deload days retain `dayType:'training', assignmentType:'homework'` plus isDeloadWeek/progression metadata. Only a day actually selected as active_recovery uses `recoveryDayPrescriptionOverride` (existing 1 set, 30–60s, 30s rest, controlled tempo). Do not replace every fourth-week strength movement with recovery exercises.

This is deliberately volume reduction, not a claimed intensity reduction or medically individualized deload. It never changes billing/session flags.

### Sprint scheduling versus impact

Delete the semantic conversion through intensityCategoryFromModifier. Sprint workload does not select high_impact, medium_impact, flexibility or any other impact/movement category. Retain an explicitly selected valid impact category unchanged; if none exists, omit it and retain the generator's existing unranked default. Pain eligibility remains upstream and cannot be relaxed by progression.

Keep the existing strategy functions as **requested work-duration modifiers**: linear min(1 + 0.05*(ordinalWeek-1), 1.5); undulating [1,0.85,1.1]; block 0.9/1/1.1/1.05 for current week bands; deload 0.7. For random, preserve the [0.85,1.15) band but use a stable seed derived from Sprint ID + ordinal week + policyVersion, persisted/resolved once. Regeneration/retry does not reroll the week's load.

Default persisted 1.0 does not prove a trainer override. Add Sprint.metadata.progressionPolicyV1 with version, overrideByWeek and resolved modifier provenance. New create resolves strategy defaults; a PUT containing intensityModifier marks that week explicit even when it equals 1.0. Legacy non-deload 1.0 is treated as old scaffold default; legacy non-1 values are retained as legacy overrides if finite and within 0.7–1.5. Out-of-range legacy values require correction, not silent clamping. Display this compatibility inference. Toggling deload preserves the underlying override for later reuse; it does not overwrite it with 1.0. Deload takes precedence while enabled.

For ordinary, non-paced standard station/full-group/circuit/custom work:

1. Build a legal baseline using exact saved format, selected exercises and existing timing. Freeze exercise membership, stations, rounds, rests, transitions, warmup/cooldown and finishers for the progression transform.
2. Proposed main work interval = max(1, round(baseWorkSec * requestedModifier)). Add a conservative 60-second ceiling for automatically progressed ordinary work intervals; a manually saved longer interval is preserved as an override and does not receive automated increases. This new ceiling is a programming bound, explicitly separate from phase/impact policy.
3. Use the shared ClassPlan compiler to compare the proposed timeline with the requested work-block budget. targetDuration retains its current meaning of workout minutes; demonstration/clear/stretch overhead is separate. If an increase exceeds the budget, find the largest integer work interval between baseline and proposal whose compiled work block fits. Never shorten rest, remove required exercises or exceed the requested time to force progression. If even baseline fails, return a Preflight budget failure rather than certify the class.
4. A factor < 1 reduces main work duration and can finish early. Do not silently fill saved time with extra work. Preserve start/end work data and show actual work seconds before/after. Alternatives inherit their corresponding slot interval without becoming extra timeline work.
5. Persist `progression:{policyVersion, mode:'scheduled_work_duration', requestedModifier, source, baseWorkSec, appliedWorkSec, baseWorkTotalSec, appliedWorkTotalSec, applied, reason}` in slot generatedClassData and template manifest. A cap/rounding hold is explicitly `applied:false`, not a claimed increase. Readiness/pain reductions remain authoritative and cannot be reversed.

Example: ordinary 30s work at week-2 linear 1.05 proposes 32s; a 30s budget ceiling yields 30s and a budget_hold. Deload proposes 21s, same rounds/rest/movement identity. Actual total work changes by compiled intervals; it is never calculated by summing all offered boards.

Protocol invariants are stronger than the scalar. For EMOM/Tabata/AMRAP paced blocks, pyramid, or any style whose timing/load semantics are not ordinary standard intervals, keep the exact protocol and return `mode:'manual_protocol', applied:false` with the requested modifier and trainer-review reason. Do not turn a 60s EMOM into a 90s minute or mislabel an unchanged paced class as a deload. Unsupported automatic progression is a truthful capability limit, not an unresolved numeric policy. A later protocol-specific progression feature needs its own acceptance contract.

Training tradeoff: the repair prioritizes truthful, conservative changes and existing pain/readiness holds. It does not promise endlessly unique movements or automatic long-horizon weight gains. No further user choice is needed to implement these defaults within the authorized repair; a user request for aggressive compounding, load changes in paced classes or revised pain thresholds would be a new consequential policy choice.

## 7. Remaining associated backend boundaries

These remain in the combined server slice, with bounded acceptance rather than a new discovery task.

- **R-H26:** Validate dayType/mode at the Brain seam and Sprint create/update seam using shared enums. Wire payload contains opaque tokens plus canonical movement-pattern ID or unknown, recent boolean and setup bucket (0–5, 6–20, >20 seconds), bounded headcount and known mode. No raw names/keys/notes, IDs, per-person selections or history text. Prompts must change when these decision facts change, and remain unchanged when only private names change. Do not infer judgment quality from valid JSON.
- **R-H27:** Provider callback may accept a second options argument with AbortSignal and output/request bounds; one attempt, existing 1–30s deadline. Timeout/disconnect abort where supported, discard late success/rejection, clear handles. At most one unsettled optional Brain provider operation per server process; if an adapter cannot cancel, retain that occupancy until settlement and use deterministic fallback for concurrent requests. Do not release the occupancy merely because Promise.race returned. This is per-process containment, not cluster-wide spend control. Provider module import cannot be forcibly cancelled: preserve default-off configuration and bounded capability disclosure; no new provider activation is part of this task.
- **R-H28–29:** Performed selection and log operation identity follow section 5. Actual elapsed measurement stays separate from trainer-attested prescribed data. Keep the existing attendance feature gate unchanged.
- **R-H30:** Share the current generation-supported 20–90-minute range and finite style/format/day enums across command schema and HTTP validation. Stop acknowledging silently clamped/coerced settings. Bootcamp optPhase is currently unsupported; return explicit unsupported-option failure for supplied optPhase instead of accepting and ignoring it. Do not add phase-based Bootcamp programming by analogy to Planner. Empty structural option objects fail before an applied receipt. The browser event acknowledgement remains separate from successful generation/persistence.

## 8. Requirement-linked executable acceptance plan

New test filenames below are proposed, not existing PASS evidence. Prefer actual production pure helpers/service functions with injected repositories and barriers; do not certify behavior with source-string matches. Existing source-probe observations are diagnostic evidence only. RED must be an intended assertion failure, not missing imports/setup.

| Test ID → requirement | Proposed test file and fixture/action | Required observable result and forbidden effects |
|---|---|---|
| S-H01/02 → R-H01–02 | backend/tests/unit/bootcampTemplateTransaction.test.mjs: FK injection; late stretch/manifest failure; root/station/board reload | Foreign keys server-owned; complete rollback; count/order/metadata/profile IDs/zero rest preserved |
| S-H03 → R-H03 | Extend backend/tests/api/sprintRoutesSecurity.test.mjs with executable route/service mocks; foreign trainer generate/reconnect/regenerate; string/NaN/unsafe IDs | Deny before job/events/headers; no dispatch/read of foreign memory; normalized legitimate IDs work |
| S-H04 → R-H04 | backend/tests/unit/sprintGenerationClaim.test.mjs: two readers, A lease expires, B claims, late A success/finally/heartbeat; retry same/different hash | One claimant; stale A performs zero writes; terminal status equals committed status |
| S-H05 → R-H05 | backend/tests/unit/sprintGenerationAtomicity.test.mjs: second memory write fails; regeneration throws; resume mixed existing slots; duplicated legacy key | Slot+union rollback; old regeneration snapshot survives; remaining exposure retained; ordinal week; no empty-memory fallback |
| S-H06 → R-H06 | backend/tests/unit/sprintCalendarContract.test.mjs: date-only starts under UTC/LA and DST; duplicate weekdays; all existing legacy aliases | Same dates across TZ; nonempty unique schedule; exact legacy station/round/time shape; bounds rejected before transaction |
| S-H07/08 → R-H07–08 | backend/tests/unit/exerciseConstraintContract.test.mjs; extend bootcampEquipmentProfile.test.mjs and workoutBuilderCandidateSafety.test.mjs | Primary+secondary aliases gated; AND/OR truth table; rack requirement survives bodyweight; strict constraint persists across bridge failure |
| S-H09 → R-H09 | backend/tests/unit/bootcampSubstitutionIdentity.test.mjs plus bootcampTemplateMediaRejoin.test.mjs | Verified target media only; unresolved rename has no source demo; wrong-region fallback cannot satisfy pain; manifest save/reload preserves identity |
| S-H11 → R-H11 | Extend backend/__tests__/workoutBuilderService.assignmentTypes.test.mjs and corresponding save contract | 40/70/85 intensity, zero rest, progression targets/notes/tempo/IDs survive typed save/load |
| S-H19 → R-H19 | Extend backend/__tests__/workoutBuilderLongHorizon.test.mjs; tests/unit/bootcampGenerationSemantics.test.mjs | Six requested movement families cannot vanish due to ceil/slice; stored pattern beats category; recent window contains sessions, not last seven individual exercises |
| S-H20a → R-H20 | backend/tests/unit/workoutPrescriptionProgression.test.mjs: 4/3/2/1 sets, reps/ranges/durations, unsupported text, actual recovery | Measurable conservative deload; no fake active_recovery label; no rest/load increase; single-set limits disclosed |
| S-H20b → R-H20 | Same helper suite + sprintGenerationSemantics.test.mjs: default1 vs explicit1 override, deload toggle, all strategies, stable random, ordinary timeline budget, paced class | Default no longer masks strategy; modifier never changes impact; actual intervals and compiled totals agree; caps/unsupported protocols report hold |
| S-H20c → R-H20 | Extend backend/__tests__/workoutProgressionService.test.mjs and generation integration fixture | TargetReps affects real prescription; no increase through pain/readiness holds; future plans do not compound one old exposure; canonical phase table unchanged |
| S-H26/27 → R-H26–27 | Extend backend/tests/unit/bootcampBrain.test.mjs with synthetic callbacks, fake time/abort and an unresolved callback | No free-text wire fields; relevant facts present; disabled zero calls; timeout abort observed; late result ignored; unabortable occupancy cap retained |
| S-H28 → R-H28 | Extend backend/tests/unit/bootcampAttendance.test.mjs and tests/api/bootcampAttendanceRouteSafety.test.mjs with executable model validation | One performed row per slot; no future/empty/self-invalid form; required duration valid; no billing/provider effects; transaction rollback |
| S-H29 → R-H04/H29 | backend/tests/unit/bootcampTaughtIdempotency.test.mjs; lost response retry, same key changed payload, duplicate Sprint confirmation | Same log ID; one taught count/link; changed request409; attendance retry stays same class identity |
| S-H30 → R-H30 | Extend backend/tests/unit/bootcampCommands.test.mjs and tests/api/bootcampGenerateStyleContract.test.mjs | Every accepted supported option survives generation; 120min/unknown style/optPhase/empty options rejected truthfully |

Required real DB suite: `backend/tests/integration/rolodexServerRepair.postgres.test.mjs`, explicitly isolated and separate from default Vitest selection. Prove row locks with two connections, lease fencing with a controlled DB clock seam, slot/union rollback, unique taught-log race, attendance validation/receipt atomicity, additive migration up/down/up and preexisting-null-row compatibility. Never run it until the DB is positively identified as disposable by isolated test configuration; no dev DB/environment assumption. Schema inspection must prove the unique index actually exists in that fixture. These tests are NOT RUN here.

Suggested synthetic selection from backend cwd after the proposed files exist:

```text
node node_modules/vitest/vitest.mjs run tests/unit/bootcampTemplateTransaction.test.mjs tests/unit/sprintGenerationClaim.test.mjs tests/unit/sprintGenerationAtomicity.test.mjs tests/unit/sprintCalendarContract.test.mjs tests/unit/exerciseConstraintContract.test.mjs tests/unit/bootcampSubstitutionIdentity.test.mjs tests/unit/workoutPrescriptionProgression.test.mjs tests/unit/bootcampTaughtIdempotency.test.mjs tests/api/sprintRoutesSecurity.test.mjs --maxWorkers=2 --reporter=dot
node node_modules/vitest/vitest.mjs run __tests__/workoutBuilder __tests__/workoutProgressionService.test.mjs __tests__/bootcampEquipmentProfile.test.mjs tests/unit/bootcamp tests/unit/workoutBuilder tests/api/bootcamp tests/api/sprintRoutesSecurity.test.mjs --maxWorkers=2 --reporter=dot
```

The second command uses Vitest filename-substring filters such as tests/unit/bootcamp, not physical directories. Verify the actual selected files/count against this table. Integration tests are excluded by the default backend/vitest.config.mjs; a separate disposable-DB config/invocation is required and cannot be marked covered by those two commands. Shared timeline/adapter, parent browser, type/build and final union checks remain required.

Coverage boundaries: synthetic repositories prove sequencing and dependency calls, not PostgreSQL lock behavior; fake completion functions prove payload/cancellation contracts, not a real provider's behavior; source metadata cannot prove a deployed schema or mounted frontend.

## 9. Delivery, compatibility and rollback

Order within the existing S1 envelope: acceptance RED fixtures → pure vocabulary/provenance and H20 transformations → atomic template save/reload → Sprint fence/calendar/memory → taught-log schema/idempotency/attendance → optional Brain/command contract integration → S1 regression and required review. Split this envelope if practical without silently changing review cadence/budget. Parent owns exact slice enrollment and Luna assignment.

API compatibility changes requiring coordinated frontend deployment: expectedGenerationVersion/operationId for generation and regeneration; stable operationKey for taught logs; truthful unsupported command response; additive provenance/progression metadata. Read compatibility is preserved for old templates/logs/Sprints. Old write clients receive explicit validation/precondition errors rather than silently downgraded behavior.

Schema operations are limited to the ClassLog additive columns/index. New nullable columns make old rows readable; index permits multiple null legacy keys. No speculative historical backfill. Migration down removes the new index/columns only in a disposable rollback test; production rollback should first revert consuming code while retaining data columns. Do not erase idempotency receipts or post-upgrade history to make a code rollback appear clean. Sprint metadata and template manifests are ignored by old readers but retained.

Do not operate old and new generation writers concurrently: old code lacks the fence checks and can defeat the protocol even though the metadata schema is compatible. Drain old workers before a later authorized release; verify no generating claim remains from the old version. A source-only audit cannot certify that operation. No deployment, migration, push or live provider activation is authorized by this appendix.

Operational owner remains Sean. Log reason codes, stages, counts, policy version and operation fence. Avoid medical/exercise details in operational logs. No benchmark improvement claimed. Performance constraints: at most one per-Sprint writer, generation outside DB transactions, memory union bounded by schedule limits, one default-off provider operation per process, no repeated POST on reconnect. Measure DB lock duration and ClassPlan compilation before release; no invented latency claim.

## 10. Readiness and remaining decisions

| Item | Status at authoring |
|---|---|
| Hostile review of appendix 12's server design and the two backend reports | Performed by this Astra architecture subagent; decisions above |
| Numeric H20, source equipment semantics, substitution provenance, Sprint fence/rollback decisions | Specified for implementation; unsupported automatic protocol progression explicitly bounded |
| Application edits / DB / providers / network / secrets inspection | None performed by this task |
| Existing isolated diagnostic probes | Reports contain 14 primary and 8 boundary observations with actual local invocation/output; not acceptance GREEN |
| New contract acceptance RED/GREEN and real DB migration/race proof | NOT RUN |
| Diagram | Mermaid source authored; rendered preview/validation NOT RUN in this task |
| Parent baseline results | Parent-reported baseline only; this appendix does not rerun or independently certify them |
| Controller enrollment, native hook execution, exact slice readiness receipt | NOT VERIFIED by this author |
| Fresh GLM 5.3 / Flash reviews and final combined Astra implementation review | NOT RUN here; existing review cadence remains pending resolution/enforcement by parent |
| Served-model identity and output-token metadata | Unknown; no invented receipt fields or inferred served-model certification |
| Formal PLAN READY / IMPLEMENTATION VERIFIED / DEPLOYED | Not claimed |

No remaining programming choice in this appendix requires a new permission stop within the already authorized repair. True consequential changes outside this contract remain: enabling a live provider or paid fallback; changing pain/clinical thresholds or canonical phase policy; automatically progressing paced-protocol loads; inventing actual attendance/elapsed exercise history from a prescription; cross-device server runner control; operating a non-disposable DB or deployment. These are excluded extensions, not hidden requirements to complete this bounded design.

The next authorized action is to incorporate this contract into the canonical traceability/readiness receipt, establish the required workflow/controller evidence without fabricating metadata, then have the assigned builder execute the isolated RED acceptance slice when its gates permit. A complete document is not successful application behavior or a passed reviewer gate.
