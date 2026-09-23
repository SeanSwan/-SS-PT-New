# Contracts, data truth and trust boundaries

Artifact: SPA-CONTRACTS / owner: implementing backend lead + Sean / version: 1.0, 2026-09-06.
Status: PROPOSED; current and future contracts separated. No model/migration changed. Supersedes: none.

## Current authoritative model

`backend/models/ClientPainEntry.mjs:21-145`, table `client_pain_entries`: `id`, `userId`, `createdById`, `bodyRegion`, `side`, `painLevel`, `painType`, `description`, `onsetDate`, `isActive`, `resolvedAt`, `aggravatingMovements`, `relievingFactors`, `trainerNotes`, `aiNotes`, `posturalSyndrome`, `assessmentFindings`; Sequelize timestamps `createdAt`, `updatedAt`. No `status`, structure ID, episode series, revision or observational audit table exists here. painLevel is integer 1–10; side is left/right/center/bilateral. Nullable createdById/painType must be accepted on read. Internal fields are stripped for client responses by the controller.

Do not put anatomy location into `assessmentFindings`: that is a staff-only assessment field and is removed for client roles. Do not replace bodyRegion with an FMA ID: current validation and downstream workout constraints depend on existing region keys.

Current REST responses use `{success,data,count?}`; service read methods rename `data` to `entries`, while create/update typings incorrectly promise `entry`. New code decodes the actual envelope and validates it. Missing/unrecognized data yields an unavailable state; it never becomes a successful empty list.

## Proposed additive v2 contract

Keep existing `/api/pain-entries` routes; introduce explicitly versioned routes below only after server contract tests. Put `/v2` mount before the v1 parameter router, or constrain v1 IDs; record actual mount order in S0. No silent v1→v2 routing.

| Proposed route | Request | Result |
|---|---|---|
| GET `/api/pain-entries/v2/:userId` | cursor, limit 1–50, active/all filter | PainEpisodeSummary[], nextCursor, serverTime, catalogCompatibility |
| POST same | idempotency key; initial report; optional location | 201 `{success:true,data:{episode,observation},mutationId}`; replay returns same result |
| GET `/:userId/:entryId/observations` | cursor, limit 1–100, optional before | Immutable observation summaries with source timestamps, nextCursor |
| POST `/:userId/:entryId/observations` | expectedRevision, idempotency key, new observation | Atomically append and update current summary; 409 on stale revision |
| POST `/:userId/:entryId/resolve` | expectedRevision, idempotency key | Resolution observation and isActive=false; no fabricated zero pain point |
| POST `/:userId/:entryId/reviews` | expectedRevision, review disposition, visibility-qualified notes | Authorized trainer/admin review; own client cannot forge reviewer identity |
| POST `/:userId/:entryId/observations/:observationId/corrections` | expectedRevision, corrected fields, reason | Append correction referencing prior observation; preserve audit, do not mutate history silently |

Suffix routes above share the `/api/pain-entries/v2` prefix. Reopening after resolution creates a new episode with priorEpisodeId rather than reusing an old curve. v1 destructive admin delete remains out of the redesigned primary UI; retention/deletion follows existing policy and must include new child rows.

```ts
type PainLocation = {
  schemaVersion: 1;
  regionId: string; // approved legacy region key; server-validated
  side: 'left' | 'right' | 'center' | 'bilateral';
  selectionKind: 'surface-area' | 'anatomy-reference' | 'uncertain-area';
  catalogVersion: string | null;
  structureIds: string[]; // 0..8 unique stable catalog IDs, not canvas indices
};
type PainObservationInput = {
  painLevel: number; // integer 1..10; resolution is a separate operation
  painType?: string | null; // existing enum values, not free-form enum growth
  description?: string; // <=2000 characters
  onsetDate?: string | null; // YYYY-MM-DD, non-future in user timezone
  onsetKind?: 'sudden' | 'gradual' | 'unknown';
  context?: 'rest' | 'activity' | 'after-activity' | 'unspecified';
  aggravatingMovements?: string; // <=1000 each
  relievingFactors?: string;
  functionalImpact?: 'none' | 'some' | 'stopped-activity' | 'unspecified';
  location?: PainLocation | null;
  workoutSessionId?: string | null; // UUID in WorkoutSession; same-client check
  reportedAt?: string; // RFC3339, server bounds and receivedAt retained
};
```

Body target/userId, createdById, reviewer, permissions and receivedAt are server-owned. Reject nonfinite, fractional, boolean or numeric-string scores in v2 (v1 behavior remains backward compatible until migration). Validate total JSON ≤16KiB, note lengths, unknown keys, invalid catalog hashes, missing mesh IDs, region/side contradictions and cross-user session IDs. Client submitted staff fields return 403/422, never silently become trusted internal notes.

## Proposed storage, atomicity and compatibility

Add nullable `anatomyLocation` JSONB, integer `revision` default 0 and nullable `priorEpisodeId` to ClientPainEntry. Add `PainEntryObservation` with UUID id, painEntryId/userId/actorId FKs, eventKind(report/update/resolve/correction/legacy-baseline), immutable symptom snapshot, reportedAt, receivedAt, priorObservationId, revision and mutationId. Add `PainEntryReview` with UUID id, painEntryId, observedRevision, actorId, disposition, clientVisibleNote and internalNote. Retain existing summary fields for legacy consumers.

Use one service transaction for scoped authorization, row lock, expected revision, observation append, summary update and replay record. Unique `(actorId,userId,mutationId)` plus payload hash; same key/different payload→409. Authorize again before replay result disclosure. Retain mutation dedupe for the lifetime of the associated record under existing retention/deletion policy. No timestamp-based “probably same” dedupe. Concurrent writers yield one success/one conflict, not last-writer-wins loss.

Idempotency record includes minimal payload hash/result IDs; no extra free text or provider output. Pending/committed/known-failed states are stored transactionally. Response loss moves the client to “Checking whether your report saved”; query/replay same mutation ID only after access check; never create a fresh mutation to retry an unknown outcome. Server effects and client rendering use the same user+entry+revision identity.

Migration: isolated DB first; additive nullable fields/indexes; batched baseline observation per existing record with unique legacy marker; baseline explicitly says “history before upgrade unavailable.” Do not infer daily observations from updatedAt, resolvedAt or missing values. Legacy createdAt may establish entry creation, not the exact time its current score was reported. Preserve all existing IDs/notes and enum meaning. New v2 and old v1 writes must call a shared summary/observation service before timeline rollout; otherwise mark legacy changes as unknown-history events. No dual-write window accepted as complete.

Rollback: disable v2 UI flag, keep additive columns/tables and old API operational, stop new review exposure if necessary. Never drop appended observations to roll back presentation. Restore drill uses an isolated sanitized DB; production restore requires its own explicit approval. Index builds and data backfill budgets measured before rollout. No `sync({alter:true})`.

## Caller cross-check and required migration sweep

| Caller | Current fields / discrepancy | Required preservation |
|---|---|---|
| painEntryController | model field set above; active, resolve and staff sanitization | Central writer + v1 response compatibility |
| aiWorkoutController/contextBuilder | active region, side, severity/type, descriptions, triggers, aiNotes/posture/findings | Existing allowed constraints; no exact-tissue diagnostic inference |
| clientProgressController | pain query and progress source | Differentiate latest state from observation history |
| clientIntelligenceService/masterPromptBuilder | active pain plus health context | Honor consent/sanitization; no direct anatomy/profile fan-out |
| painDispatchers/painFollowUpService | active region/severity/type, IDs and source dates | Same-client authorization and honest staleness |
| painWriteService | creates region/severity/description; hardcoded center | Shared v2 validation; legacy side marked ambiguous if contradictory |
| clientSelfServicePainDispatchers | own user, region, clamped severity, description, active; read fields id/region/severity/date | Eliminate divergence only in explicit writer slice with tests |
| bootcampPainAlerts | `status:'active'` is absent from model; createdBy filter is not assignment ownership | Reproduce and repair in owned sibling slice before claiming all constraints work |
| healthDataEncryption | configured ClientPainEntry sensitive fields | Extend encryption/serialization tests to new notes/snapshots |
| PainEntryCorrectiveExercise | links approved corrective exercise records | Preserve links and canonical exercise library; no model-generated exercises auto-applied |

This is a risk inventory, not a completed whole-caller schema certification. S0 must produce the full model→caller-field drift table from current chosen release source and check all occurrences in routes/controllers/services, including indirect model getters. Evidence includes raw caller locations; model edits are prohibited until that completed table and mounted receipts exist.

## Permissions and privacy matrix

| Actor | Read/report | Staff review/notes | Explore | Other client's data |
|---|---|---|---|---|
| Client | Own entries and observations; own edits/resolution | Client-visible replies only | Full educational features | Denied, no stale cache/render |
| Assigned trainer | Authorized assigned client's reports | Review; internal and visible notes separate | Full | Denied unless currently assigned |
| Admin | Existing policy scope; explicit target | Same review controls; existing admin delete separate | Full | Existing admin authorization only |
| Unknown/expired role | Loading or denied; no private display/write | None | Public catalog may load if separate route allows | Denied |
| Swan Coach/provider | Structured minimum only through existing consent/privacy route | No direct DB write; proposals require existing confirmation | No external patient scene | Never expanded by UI selection |

Patient data stays in authenticated app APIs. Geometry/metadata caches contain no patient overlays, names, descriptions or account-linked view telemetry. Never put pain descriptions into query parameters, CDN URLs, analytics, console logs or public exports. Cache private queries by actor+target+role/access epoch and wipe on logout/revocation/target change. No sensitive draft localStorage/offline persistence in the initial version; show the tab-lifetime limitation honestly. If durable drafts are later required, use encrypted server-side draft storage under a separately reviewed retention contract.

Existing backend privacy hooks are dependencies, not automatically proven safeguards. Only sanitized IDs/structured constraints may cross the permitted AI boundary; no raw screenshot or health narrative is sent in this planning task. Review content cannot turn a trainer into a licensed clinician. Display severity as the client's report, not tissue damage or danger probability. IASP emphasizes the personal nature of pain; a precise mesh does not validate cause. [IASP terminology](https://www.iasp-pain.org/resources/terminology/).

## v1.3 easy reporting compatibility

No new endpoint/schema is required. Areas / Not sure uses the proposed surface-area or uncertain-area PainLocation with approved regionId/side; structureIds may be empty. Muscle/bone/joint selection may add reviewed catalog IDs but never implies a diagnosis. Tissue category, pain type, feeling and timing are optional; nullable legacy painType remains valid.

viewMode and easySelectionCategory are presentation state, absent from the write contract. Easy and Explore share one draft and the same guarded idempotent save. Filters never save, erase pain, resolve episodes, change body preferences or prescribe workouts. Existing ERD, sequence, permission and privacy boundaries remain applicable.
