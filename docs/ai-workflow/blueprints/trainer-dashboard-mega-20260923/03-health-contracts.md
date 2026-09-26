**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Mandatory companion to [03-contracts.md](03-contracts.md); same scope, bindings, and pending approvals.

**Health contract**

```ts
type Measurement =
  | { metric: 'heart_rate' | 'resting_heart_rate'; unit: 'bpm'; value: number }
  | { metric: 'hrv_rmssd' | 'hrv_sdnn'; unit: 'ms'; value: number }
  | { metric: 'steps'; unit: 'count'; value: number }
  | { metric: 'sleep_duration'; unit: 's'; value: number };
type Metric = Measurement['metric'];

type Observation = Measurement & {
  id: Id;
  subjectId: SubjectId;
  connectionId: Id | null;
  importId: Id | null;
  aggregation: 'instant' | 'interval' | 'daily_total';
  observedStart: ISOTime;
  observedEnd: ISOTime;
  originalOffsetMinutes: number;
  receivedAt: ISOTime;
  sourceKey: string;
  sourceLabel: string;
  deviceKey: string | null;
  originalRecordKey: string | null;
  sourceRevision: string | null; // Certified provider revision; never ingestion time.
  parserVersion: string;
  provenanceHash: string;
  supersedesId: Id | null;
  quality: 'accepted' | 'quarantined';
};
```

Rules:

- Values must be finite. Missing measurements are absent observations, not zero.
- Unit/metric combinations are fixed by the discriminated union above and enforced by the runtime decoder; TypeScript alone does not validate incoming JSON. Reject mismatched units and non-finite numbers.
- Require observedStart ≤ observedEnd and a finite integer offset in the certified source range. Instant observations have equal endpoints; interval/daily-total observations have a positive interval. Steps are nonnegative integers; duration is nonnegative and cannot exceed its interval. Daily windows follow the certified source timezone/DST semantics, not a fixed 24-hour assumption.
- Heart-rate and HRV values outside adapter-certified bounds are quarantined, not corrected.
- RMSSD and SDNN never share a trend line or aggregate.
- Provider identifiers are stored through protected server-side mappings; UI labels are safe display labels.
- Scope every dedupe key to subject and certified source/connection identity. Prefer provider record ID plus `sourceRevision` for dedupe. Otherwise hash subject, source identity, metric, interval, normalized unit/value, and aggregation.
- Dedupe excludes ingestion time and filename.
- Corrections append a revision; they do not erase earlier provenance. A revision must supersede an observation in the same subject/source/metric chain; reject cycles and cross-subject links. The adapter must supply correction identity or quarantine ambiguous corrections.
- Only accepted, non-superseded, non-erased observations are eligible for trends, source selection, and Coach previews; history may show ineligible rows only with explicit labels. Enforce eligibility on the server at selection and approval.
- Cross-source overlap is retained. Select one source per metric/window; never add overlapping daily totals.
- A source change creates a visible timeline annotation.
- Uploaded raw files expire within 24 hours after completion/discard, and uncommitted uploads expire after 24 hours.
- Proposed observation retention is 24 months, subject to a retention-policy checkpoint before launch. No indefinite raw archive.
- Deletion removes readings and derived summaries from active use and invalidates dependent Coach snapshots. Backup expiration and operational completion must be specified under B-05.

**Health endpoints**

All paths below begin `/api/health-ingestion/v1`.

| Method/path | Request | Success |
|---|---|---|
| GET `/workspace?subjectId={id}` | None | 200 `{subjectId,connections,consent,imports,updatedAt}` |
| GET `/observations?subjectId={id}&metric={metric}&cursor={cursor}` | None | 200 `PageResult<Observation>` |
| POST `/consents` | `{subjectId,purpose:"ingestion"|"coach_handoff",granted,textVersion}` | 201 `{id,recordedAt,granted}` |
| POST `/imports` | Multipart `file`, `subjectId`, `source`, `consentId` | 202 `{id,status:"uploaded"}` |
| GET `/imports/:id` | None | 200 `ImportState` below, including the reviewable preview hash and accepted operation identity |
| POST `/imports/:id/commit` | `{expectedPreviewHash,expectedVersion}` + operation key | 202 `ImportState` with `status:"committing"` and operation ID; poll the same import |
| POST `/imports/:id/discard` | `{expectedVersion}` + operation key | 200 cancelled state; 409 if commit already accepted/completed |
| POST `/imports/:id/retry` | `{operationId,expectedVersion}` + retry-request operation key | 202 resumed same operation; only a retryable failed commit, never a new import |
| POST `/connections/:provider/authorize` | `{subjectId,consentId}` | 200 `{authorizationUrl}` |
| GET `/connections/:provider/callback` | `code`, `state`; provider error alternative | 303 same-origin result route |
| DELETE `/connections/:id` | None | 200 `{id,status:"disconnected"}` |
| DELETE `/subjects/me/data` | `{confirmation:"DELETE_HEALTH_DATA"}` + operation key | 202 `{deletionJobId,status:"queued"}` after durable subject fence |
| GET `/deletions/:id` | Self-scoped | 200 `DeletionJob` below |
| POST `/coach-previews` | `{subjectId,observationIds,consentId}` | 201 `CoachPreview` in the [Coach contract](03-provider-coach-contracts.md) |
| POST `/coach-snapshots` | `{previewId,expectedSummaryHash,consentId}` | 201 immutable snapshot receipt; no model call |

All endpoints inherit common authentication, authorization, validation, rate-limit, and internal errors. Provider endpoints also return `503`; preview/commit/snapshot mutations also return `409` for stale hashes. Callback failures redirect to a same-origin result with a non-sensitive error code; no token enters a URL.

Imports accept only formats listed in a certified provider manifest. Initial maximum: 100MiB upload, 250MiB expanded content, 1,000 archive entries, five-minute parsing deadline. Reject nested archives, traversal paths, external XML entities, network resolution, and executable content. Processing occurs outside request handlers.


**Import lifecycle and immutable preview**

```ts
type ImportPreview = {
  previewHash: string; // Server-generated SHA-256 of canonical reviewed manifest.
  sourceLabel: string; observedStart: ISOTime; observedEnd: ISOTime;
  validCount: number; duplicateCount: number; rejectedCount: number;
  reasons: { code: string; count: number }[]; // No raw records or secrets.
  parserVersion: string; expiresAt: ISOTime;
};
type ImportState = { id: Id; version: number } & (
  | { status: 'uploaded' | 'validating'; operationId: null }
  | { status: 'reviewable'; operationId: null; preview: ImportPreview }
  | { status: 'committing' | 'completed'; operationId: Id; previewHash: string }
  | { status: 'failed'; operationId: Id | null; retryable: boolean; errorCode: string }
  | { status: 'rejected' | 'cancelled' | 'expired'; operationId: null; reasonCode: string }
);
type DeletionJob = {
  id: Id; status: 'queued' | 'running' | 'completed' | 'failed';
  requestedAt: ISOTime; completedAt: ISOTime | null;
  errorCode: string | null; retryable: boolean;
};
```

The private preview manifest binds subject, actor scope, immutable upload digest, normalized candidate IDs/values, disposition counts, parser/version, consent revision, subject data generation, and expiry. The server returns its hash; clients never reconstruct it from counts. Any change invalidates the preview. Commit revalidates all bindings and accepted record eligibility transactionally before publication. A zero-valid preview cannot commit.

Commit/discard use optimistic version checks and a serialized state transition: exactly one wins. Discard atomically marks cancellation and invalidates delayed parsing work. Completed records require the separate deletion flow. Lost commit/retry replies are reconciled through GET; repeating a commit key never launches a second job. Retry references the original accepted operation and its stored immutable payload; its own request key follows the common method/path/payload rules. It never creates a new ingestion operation and may resume only after confirming no committed result exists. Validation failure/expiry requires fresh upload. Expired raw input makes retry unavailable. Raw-file cleanup applies to rejected, cancelled, expired, and failed imports as well as completed imports; no state creates an indefinite archive.

**Deletion concurrency boundary**

Before returning 202, atomically advance the subject's monotonic data generation, mark deletion in progress, and record durable deletion work. Every validator, provider sync, import commit, and Coach approval captures its starting generation and checks it again inside its publication transaction. Old-generation work cannot recreate data. Block health reads/new intake while deletion is pending; pause local polling/sync and revoke tokens where the approved policy requires it. A retry resumes the same deletion job; requesting deletion again reconciles or safely resumes it.

Completion means active readings, derived summaries, previews, pending handoffs, and cached snapshots are removed or invalidated and old work is fenced. Restore must reapply deletion tombstones before serving data. B-05 still owns backup expiry, operational deletion proof, and whether/how future collection may resume; no automatic reconnection is authorized by this contract. Failures keep the fence and show an actionable incomplete state. The 202 response is never a completion receipt.
