# SCU-TAKEOVER — source receipt and execution delta

Owner: Astra. Effective: 2026-09-06 UTC. Status: implementation in progress.
Sean explicitly authorized takeover of the earlier Coach implementation lane.
That resolves the ownership blocker in 17/22; those earlier receipts stay historical.
The previous lane record is retained; Astra's current lane records supersession.

## Baseline and ordered work

HEAD remains b88dd9e5c894908d9f193411fe66117294d190ef. origin/main resolves to
53120649f356c3efccee32872b530096d386642f. No main-only commits touch CoachIntent,
services/ai, services/workout, aiCommandRoutes or CoachConfirm in the narrow log.
This does not reconcile the whole branch or the separate CoachFact workstream.
Previous uncommitted repairs and independent planning amendments remain intact.

First: reproduce AR03/04/05; repair public receipt authority and persistence
allowlists. Next: bounded receipt pagination, confirmation/transport truth, then
versioned lifecycle and real PostgreSQL transaction tests. No release is implied.

## Receipt caller and model map

GET /api/ai-command/intents and /intents/:intentId are registered in
backend/routes/aiCommandRoutes.mjs:516 and :575. backend/core/routes.mjs:715
mounts that router. List is exact GET /intents; detail has one extra segment;
commands/pending/execute/confirm/cancel do not shadow those GET paths.
protect and rate limiting precede both handlers. canReadIntent at :83 performs
current assignment checks for targeted records. List uses toPublicCoachIntent;
detail calls readCoachIntent then the same serializer. No mounted frontend intent
receipt consumer was established by the initial literal-path search: this is a
backend endpoint repair, not a claim of a completed visible recovery journey.

CoachIntent model: backend/models/CoachIntent.mjs:17–35, table coach_intents.
Columns: id UUID; actorId INTEGER; requestKey STRING(128); requestHash STRING(64);
commandType STRING(100); targetClientId INTEGER nullable; status STRING(24);
operationId/proposalId STRING(64) nullable; result JSONB nullable;
errorCode STRING(100); expiresAt/completedAt DATE; createdAt/updatedAt timestamps.
Allowed statuses currently claimed/completed/failed/unknown/cancelled.

| Caller field | Real column | Disposition |
|---|---|---|
| claim actorId/requestKey/requestHash/commandType/targetClientId | Same camel-case columns | Match |
| claim operationId/proposalId/expiresAt/status | Same columns | Match |
| transition result/errorCode/completedAt/status | Same columns | Match; result needs pre-persistence allowlist |
| serializer source.state/source.verifiedAt/source.committedAt | Arbitrary JSONB values | Untrusted, cannot assign public truth |
| serializer completedAt as commit time | Workflow finish timestamp | Drift; never derive commit from finish |
| list actorId/targetClientId/createdAt/id | Same columns | Match; scan currently unbounded |
| future version/expectedHash/proofVersion/committedAt/verifiedAt | Not present yet | Additive migration required before activation |

Sibling search across backend routes/services found the intent service, GET routes
and workout/coachIntentTransactionHook.mjs. The hook calls completeCoachIntent in
the daily-form writer's transaction when supplied. Existing callers still omit it.
The hook's raw result argument must not bypass persistence sanitization.
No model changes are included in the first receipt repair; model/DDL parity and
real schema validation precede the next lifecycle slice.

## Verification infrastructure

An owned disposable PostgreSQL 17 container uses cached image postgres:17-alpine,
loopback publication only, synthetic coach_test_20260906 database and no production
credentials. Readiness passed. Tests must explicitly inject its connection and
must not import backend/database.mjs or application .env configuration.
Mock service tests remain useful but cannot replace real locking/rollback proof.

## Lifecycle schema cross-check before model edit

The live disposable v1 schema was created by the actual v1 migration. The actual
CoachIntent model (only its database dependency injected) passed 20 concurrent
claims with one row and a real rollback/commit test. The new field-parity test
failed because version was absent from both model and v1 schema.
Add version INTEGER NOT NULL DEFAULT 0; expectedHash VARCHAR(64) nullable;
proofVersion INTEGER nullable; committedAt/verifiedAt timestamps nullable.
Extend status allowlist with the v2 lifecycle while retaining claimed/completed.
Add a unique non-null proposalId index only after a duplicate audit; fail on
duplicates instead of silently discarding durable rows. Down preserves receipts.

Caller map after this additive change: service receipt reads committedAt,
verifiedAt, expectedHash, proofVersion; proof helper reads expectedHash/proofVersion,
actorId/targetClientId/proposalId/requestHash; lifecycle CAS reads and increments
version. All map directly to camel-case model columns. Existing route fields and
transaction-hook inputs remain the same. No snake-case duplicate columns.

## Isolated takeover candidate

Concurrent changes to the previous worktree were observed during verification.
The active implementation is now in tmp/worktrees/swan-coach-astra-owned-20260906,
branch codex/swan-coach-astra-owned-20260906, at the same base HEAD.
The old worktree is preserved. The new tmp/coach-isolation-receipt contains a
108-file manifest and independent copies, each hash-verified before new edits.
This path supersedes older worktree instructions in historical receipts.

Incoming expectedFootprint maps to a nullable JSONB model column. It is internal
semantic proof, never a public result field. The proof service and transaction
hook reference it; no public receipt serializer exports it. Both incoming
migration filenames remain, using one atomic v2 implementation. The compatibility
filename delegates to that implementation so migration order cannot omit the
proposal duplicate audit, index or expectedFootprint column. Tests run both names.

## Bounded receipt-list repair contract (before handler edit)

Keep the two mounted GET paths and their existing protect/rate-limit middleware.
Extract list scanning from aiCommandRoutes into coachIntentListing; retain detail
authorization. Batch current trainer assignment checks through the existing
listAssignedClientIds helper, adding an optional candidate-ID filter rather than
loading the whole roster. The real ClientTrainerAssignment model columns used
are clientId INTEGER, trainerId INTEGER and status STRING ('active'); table name
client_trainer_assignments. Existing unfiltered callers keep their behavior.

Use 50-row intent batches, at most ten batches/500 rows, and at most 50 returned
receipts. A readable lookahead anchors the last returned receipt; otherwise the
last examined row anchors non-exhausted pages. Preserve empty-page continuation.
No cached grant survives a page request. Query failure returns unavailable.
Admin can read scoped targets; client/user can read self; unknown roles denied.

Encrypt continuation tuples using the installed Node AES-256-GCM pattern from
socialTokenCipher.mjs, with a purpose-separated key derived from the existing
required OPERATION_SIGNING_KEY. Bind authenticated actor, role, requested target,
schema version and expiry. Never expose the denied tail's UUID/date in base64
plaintext. No new secret, provider, endpoint, dependency or model table.
Missing key fails closed; tampering/expired/cross-scope cursor returns invalid.

Independent validator gate is authored before this runtime repair. The builder
does not edit that gate. API regressions additionally drive the actual router.

## Reconciliation repair contract (before service edit)

This slice changes the internal reconcileCoachIntent API; no public reconciliation
endpoint or automatic domain-write retry is added. The authenticated domain caller
must provide authorizeIntent, which checks current access before and after readback.
No callback or denial returns unavailable with no row. The stored expectedFootprint,
expectedHash, proofVersion, version and committedAt columns own verification inputs.
Observation fields cannot substitute missing durable proof. Update predicates bind
id, status, version and expectedHash; success increments version. Read failure
preserves durable status, and a losing update rereads current state. No domain effect
is dispatched. The strict v2 semantic adapter and atomic proposal/writer integration
remain separate unfinished work; legacy verifier fixtures are not schema proof.

## Command-bar null-confirmation repair receipt

Owned-worktree route evidence: UniversalDashboardLayout.routes.tsx:188 maps
trainer /clients to TrainerClientsWorkspace; shell.tsx:133 renders DashboardRoutes;
shellPieces.tsx:108 mounts Component. TrainerClientsWorkspace.tsx:14 renders
ClientsWorkspace. Its view/tab chain is documented in 21; ClientsWorkspaceTabs:60
mounts TrainingTabContent, whose tabs/TrainingTabContent.tsx:224 mounts the command bar.
The active command bar consumes useCoachCommand; its :126 literal is
POST /api/ai-command/execute. ConfirmationSheet consumes useConfirmationSheet,
whose :108 reads GET /api/ai-command/pending/:operationId and :168 confirms by POST.
Core routes:715 mounts aiCommandRoutes; exact execute/pending/confirm handlers
are :195/:469/:530 in this candidate before this UI edit. No competing handler
matches these method/path combinations. Pending operations use the existing store,
not an invented model. Audit model AiCommandAuditLog.mjs:30–69 has userId INTEGER,
commandType STRING(100), targetClientId INTEGER and nullable operationId STRING(64).

The incoming component passes nullable operationId to a required-string prop,
reproduced by tsc TS2322 and a failing rendered-component regression. Reject
missing/blank operation identity before clearing the draft, and only mount a
sheet for a known operation. Extract existing pure helper code to preserve the
300-line component limit; do not change its unrelated result semantics here.
