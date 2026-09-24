# SCU-FOUNDATION — exact S0–S5 implementation contract

Owner: Astra/architect; current builder Astra (Luna-compatible handoff).
Version: 3.2, 2026-09-06 UTC. Status: authorized local build.
Execution-status amendment 3.3: read 31/32 and 29/30 before these requirements.
Atomic S4/intent integration and the shared missing-origin default are already
verified locally. Imperative repair paragraphs below define retained acceptance
contracts, not instructions to rebuild completed code or restore obsolete REDs.
Gwen 3.8 is the next builder under Sean's explicit handoff request.
Supersedes: conflicting NEW-file and stop-at-each-card instructions in 08.
Shared definitions: 03-contracts C1–C8; amendments below win on conflict.

## S0-R — entry and integration candidate

1. Verify HEAD, main ref, dirty files, lane ownership; preserve packet snapshot.
2. Run AR01–AR10 and existing scoped suites. Store exact test IDs and exits.
3. Compare main-only changes to these domains: proposals, workout normalizer,
   billing policy, exercise library, route layout, CoachFact, provider routing.
4. Record a per-file merge decision; do not discard either branch's working edits.
   Build locally on this branch, then prepare an isolated current-main candidate.
   Candidate reconciliation precedes DB/browser integration acceptance.
5. Verify actual model column types and effective migrations. No app .env load.
   Disposable DB/Redis tests must refuse non-loopback hosts and non-test databases.
6. Inspect commit 21ed0554b and its CoachFact successors; choose one schema authority.
   Do not make a second fact table while the integration disposition is unresolved.

Exit evidence: baseline JSON, relevant-main-delta table, model/caller field map,
route mount receipt and classified existing failures. No local helper pass closes
the real Redis race/boot gate T44. Missing infrastructure remains explicitly open.

## S1-close — all mounted inputs share one task

Touch current controller/actions/voiceCapture/useSurfaceCoachDock adapters only
after lock resolution. Existing coachInputOrigin is reused.
Drive page and dock JSX in tests: dictation final → submit HTTP voice, typed edit
→ mixed, clear-all → text, missing origin → unknown-channel server policy.
CommandIntentBar submit must reach controller.handleIntentSubmit and the typed
catalog key must reach server schema validation; client key never grants permission.

Introduce one visible-focus owner at the dashboard shell if no existing mechanism
can supply it. Register on visible/focused dock, unregister on hide/unmount. One
Cmd/Ctrl+K handler selects visible owner; IME composition cannot submit.
Target switch increments a local generation; late chat/context/recording responses
from the prior generation are discarded. Retain draft with its original target;
show switch/review choice, never transplant it to the new client.

Exit: T01–T05 component + intercepted transport assertions for page and inventoried
docks. Backend rejects mismatched origin/target fixtures. Test role-specific entry.
No generic User route is invented merely to make parity tests pass.

R3-3 completes S1-close: useWorkoutLoggerDictation is mounted through the default
WorkoutLogger/LoggerDictationStrip path while Voice Mode V2 defaults OFF. Speech
finals declare voice, edits mixed, clear/reset typed explicitly. useCoachCommand
must default missing provenance to unknown, never text. Inventory mounted
ClientTrainingCommandBar and useCoachAssistant producers too; genuinely typed
callers declare text. Test actual capture → hook → HTTP, not source strings.

## S2 — stored policy and entity authority

Existing files: commandRegistry scoped entries, commandPolicy, commandExecutor,
dispatchers/clientScope, operationSigning, renderDigest, pendingConfirmations,
destructiveOperations, aiCommandRoutes, useConfirmationSheet, ConfirmationSheet.

Create a policy inventory row for EVERY registered mutator: command key, effect,
scopeKind, resolver, entity columns, actor roles, current-access checker, version,
inverse support, physical ceremony, activation flag, actual dispatcher.
Classify client self-service explicitly as self. Classify global admin reads
explicitly. Any new mutator without complete policy is disabled.

At preview resolve entity ownership from the actual row even without clientRef.
Compare authenticated actor policy, selected target, conversation target and entity
owner. Wrong owner is denied/mismatch before mint. Resolve again at confirmation.
Use current DB authorization, not model claims or stale frontend selection.

Normalize a server-owned confirmation projection:
{policyVersion,tier,isDestructive,requiresPhysicalConfirm,affectedCount:null|integer,
targetUserId,entityRevision,reversibility,expiresAt,displayFields}.
Sign/digest every material field with one canonical serializer and schema version.
Decode stored projection before arming. Missing/invalid v2 field blocks confirm.
Legacy payload uses a conservative compatibility decoder; it cannot reduce policy.

Replace input-driven styling/badges/warnings/armDelay/count with that projection.
No operation loaded => no confirm or inferred target. Unknown count => "Count
checked on save." A terminal result renders Close and, when authorized, Check result;
no Cancel/Confirm/Re-issue on unknown, burned or confirmed_elsewhere.
Escape dismisses a terminal view; it never posts a cancellation for it.

Do not require both proposal and generic command confirmation for the same workout.
Proposal approval uses its existing reviewToken; command approvals keep signatures.
The UI adapts the respective protocol into shared presentation, not shared authority.
Preserve existing denial envelopes and indistinguishable not-owned/missing replies.

Exit: T06–T10/T45 plus AF11/AF12 mounted tests; mutate parent vs stored policy in
both directions. Snapshot rendered digest fixture and prove actual HTTP payload.
Recheck no double POST from log entry plus hook.

## S3 — one lifecycle and honest receipts

R3-1 first: useCoachCommand and CoachCommandCenter.actions distinguish known
pre-effect refusal from transport-unknown. "No data was changed" requires
authoritative zero-effect/rollback evidence. Unknown retains the same request
key/intent and offers lookup, never generic message resend. Until server
idempotency is integrated, show uncertainty and direct to authoritative history;
an ignored request key does not prevent duplicate writes. Test real submit/retry
with effect-then-dropped-response, then the real DB; include confirm/event ACKs.

First fix AR03–AR05 in the existing service without calling it route completion.
Receipt allowlist is enforced BEFORE persistence and again at serialization.
No arbitrary strings, raw result bodies or errors in JSONB. IDs/kinds/reason codes
are bounded; reject negative affected count. A stored result.state cannot certify
verification. Failed, refused and cancelled records have committedAt:null.
completedAt is workflow finish time, not evidence of commit.

Canonical v2 state values: drafted, awaiting_approval, executing,
committed_unverified, verified, failed, unknown, cancelled, refused.
Preserve existing camel-case columns. Extend status validation additively; do not
create snake-case duplicates of actorId/requestKey/targetClientId/result.
New columns: version INTEGER default 0; committedAt/verifiedAt nullable timestamps;
expectedHash STRING(64); proofVersion INTEGER nullable. Confirm exact DDL at S0.
requestKey remains string for legacy reads; new input requires UUID. requestHash
uses a versioned canonical encoding of target/command/params/context/draft revision.

Legacy claimed/completed remain readable; absent proof maps conservatively to
unknown/committed_unverified, never verified. Keep one mapping function for public
state; update old service consumers/tests deliberately. Do not derive trust from
the model or from an arbitrary result JSON flag.

Create durable intent before preview. A reviewed write has exactly one immutable
proposalId link; enforce uniqueness for non-null proposalId after duplicate audit.
A proposal cannot acquire a second independent intent via a different request key.
Same actor/key/hash returns the existing intent; different hash returns 409.
Changing an approved draft creates a new intent/key and invalidates prior approval.
Transport retries retain the old key. Known rollback permits explicit reviewed
retry on the same unchanged intent, with a new attempt and approval reference.

Transitions use expected version + allowed prior state. Cancel wins only before
execution is claimed; racing execution returns current state, never false cancelled.
Timeout after dispatch makes unknown, not failed. Reconciliation performs no writes
to the workout; it requires current access and independently matching identity,
proposal link, expected footprint and revision before changing receipt state.

List endpoint budget: max 50 results, max 500 scanned rows and 10 query batches.
Batch authorization for unique targets. Cursor binds ordering tuple and actor/filter.
If SQL cannot apply authorization before LIMIT, return safe opaque continuation
from last examined row when no readable row is held, even with an empty page.
With a full returned page and readable lookahead, anchor to the last returned row;
never skip an authorized lookahead. Empty page plus cursor is not source exhaustion.
UI offers Check older results; continuation rechecks the same actor/filter and
current access. Only proven exhaustion returns nextCursor:null. See 15's explicit
cursor acceptance cases for ties, budget-limited pages and no skips/duplicates.
No total hidden count, no unbounded N+1. Fetch-next is a user-visible bounded action.

Exit: AR03–AR05, T11–T16/T46; real PostgreSQL 20-way claim, concurrent confirm/cancel,
crash before/after commit, read access revocation, duplicate proposal and query budget.
Rollback disables new entry, keeps reads/reconciliation. No dropping executed receipts.

## S4 — canonical workout transaction and read-back

Touch approval/persistence service, daily-form writer/payload service, intent hook,
verifier; existing workout UI event/result consumers and actual chart invalidation.
Do not create another generic workout endpoint or change paid-session semantics.

S4a strict data:
- Add normalizeAiExercises(exercises,{policy:'coach_verified_v1'}). Legacy default
  remains compatible; only reviewed Coach v2 entry opts in after complete validation.
- Canonical library resolution happens server-side before strict normalization.
  Require exerciseId/exerciseKey, explicit unit lb|kg|bodyweight, unique exercise
  instance ID, positive unique set ordinals, integer reps, finite nonnegative load.
- Never infer load 0 from missing/invalid input. Explicit bodyweight/zero is valid.
  Conflicting load and weight refuses; preserve original reps/load as entered.
- Persist ID/key/unit and instance identity in DailyWorkoutForm.formData.exercises.
  Existing WorkoutLog has exerciseName/reps/weight and NO canonical ID/unit columns.
  Do not pretend otherwise. Its numeric projection follows the existing unit
  convention only after that convention is proved in the chart adapter.
- If mixed-unit conversion cannot be proven end to end, block that new combination
  with UNIT_MAPPING_REQUIRED while retaining draft; do not relabel historical logs.
  AR01/AR02 cover the strict boundary; legacy/manual tests remain green.

S4b transaction:
- Extend claimPendingProposal/updateProposalStatus with optional transaction,
  preserving legacy caller behavior. Intake notifications run after commit.
- Daily-form writer retains transaction ownership. Supply a narrowly scoped
  beforeWrite callback to lock/revalidate proposal, intent and access, plus a
  beforeCommit callback receiving actual created IDs and normalized persisted data.
- Lock order is consistent: intent → proposal → existing user/session domain order.
  Never claim proposal in autocommit before this writer transaction for v2 workouts.
- beforeCommit writes proposal APPLIED/result and intent committed_unverified in
  that same transaction. Construct receipt from dailyForm.id, workoutSession.id,
  actual log IDs, committed body fingerprint; never coachIntent.result from request.
- Failure in claim/domain/proposal/receipt => rollback all. Post-commit effects
  (XP/earnings/notifications) cannot turn a committed workout into failed.
  Preserve existing post-commit jobs; record recoverable warnings separately.

S4c revision and verification:
- DailyWorkoutForm/WorkoutSession have no proven integer revision column. Existing
  verifier's fabricated version:1 fixture is not schema evidence.
- Use proofVersion:2 with SHA256 canonical semantic footprint: form/session IDs,
  client, date, exercise instance+canonical ID+unit+ordered set values.
  Exclude names, timestamps and free text. Persist the expected hash at commit.
- Authorized read loads form, session and ordered logs from DB, checks all ownership
  and relationships, and constructs its own footprint. Never copy expected values
  into observed fields. Missing log rows or unit mapping prevents verification.
- Re-read changed records before inverse/correction; fingerprint mismatch returns
  PRECONDITION_CHANGED. Never overwrite a trainer's concurrent correction.
- Keep legacy verifier API during migration; AR07/AR08 fix loose identity/ordinals.
  v2 adapter has real-schema integration tests, not invented model fields.

S4d mounted UX:
Browser event acknowledgement means "Draft updated." HTTP approved/consumed does
not mean saved. Render committed_unverified, unknown and verified from receipt API.
Refresh the existing progress query/event used by the canonical Logger after
commit; refetch source data, not local optimistic totals. Server lookup survives
reload; no resend. Manual logger remains operable when Coach capability is OFF.

Exit: T17–T21 plus proposal/receipt atomic failure injection, AR01/AR02/AR07/AR08,
exact form/session/log coherence and unchanged session-credit fixtures.

## S5 — evidence-aware inference through one boundary

Inventory every Coach chat path including aiChatService, providerRouter and tools.
No new SDK/vendor. Adopt provider policy for Coach capabilities while preserving
non-Coach caller shapes via an explicit compatibility adapter.
Server constructs actor/target/capability context; supplied body policy is ignored.
Allowlisted payload adapter strips identity/free text according to existing policy;
redaction is a mechanism with hostile fixtures, not a dataClass string assertion.

Bounded read tools: context summary, exercise lookup, recent-workout evidence,
progress evidence. Reuse authorized domain readers. Six calls, two model rounds,
20s total; per-query row/result byte caps. Tool output is data, never instructions.
No model-visible write tool, arbitrary URL/SQL, shell or Hermes action.
Final union: answer, clarification, draft_proposal, unavailable. Policy/IDs/approval
and commit truth are assigned server-side after schema validation.

Context distinguishes empty/unavailable/stale/denied. Permission/target refreshed
per tool; required pain/readiness refreshed before dependent suggestions/writes.
Cache key includes actor,target,role/access version,capability and private-mode flag.
Role switch, target switch, forget and logout invalidate it. Denied data never enters
provider payload. Budget exhaustion returns partial findings, not a new provider.

Exit T22–T25 plus complete caller inventory and forbidden-provider spy tests.
No live paid inference required for local implementation; real model evaluation
requires the configured provider budget and approved synthetic run at S11.
