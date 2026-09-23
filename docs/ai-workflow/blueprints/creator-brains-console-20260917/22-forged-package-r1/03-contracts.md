**Decision:** Existing public fields remain compatible. New metadata is additive and slice-owned. Do not silently replace `slug` with `key`.

**Display, sensitivity, effects, permissions**

| Dimension | Values and rule |
|---|---|
| Display scope | `operational_metadata`, `published_derived`, `software_verification` |
| Sensitivity | All console data is operator-local by default. Raw transcripts are private and excluded from the display plane. Derived does not mean public or fact-checked. |
| Effect tier | T0 reads; T2 bounded engine writes. A tier is not authorization, sensitivity, or review state. |
| Permission | Single local operator through the loopback bridge. Host/origin controls are browser-request defenses, not authentication against other local processes. |
| S7 | Host-supplied identity/authorization must be reviewed in SwanGuard. Never expose the standalone bridge as a network service. |
| Content review | No curated tier, claim approval store, or claim-review workflow is introduced. |

**Core payloads**

These reproduce the supplied field contract, with explicit additions below.

```ts
type Damage = { file: string; detail: string };
type Skipped = Record<string, unknown>; // rendered through safe projection, never JSON-dumped
type CanaryReading = {
  ok: boolean; version: string | null; reason: string;
  checkedAt: string | null; ageMs: number | null;
  source: 'probe' | 'history' | 'unknown'; stale: boolean; note: string | null;
};
type StatusInstrument = {
  ytdlp: CanaryReading;
  creators: { total: number; enabled: number; damaged: Damage | null };
  state: {
    damaged: Damage | null;
    videos: {
      total: number; fetched: number; coverage: number;
      counts: Record<string, number>;
    } | null;
  };
  budget: { used: number; perHour: number; unit: string; byKind: Record<string, number> };
  backlog: { lines: string[] };
  throttle: { active: boolean; kind?: string; until?: string; text: string };
  census: {
    inFlight: Array<{ channelId: string; detail: string }>;
    everSwept: number; discarded: boolean; error?: string;
  };
  lock: { held: boolean; pid?: number; host?: string; alive?: boolean };
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number;
  publishedBrains: number | null;
  publishedBrainsDamaged: Damage | null;
  recentRuns: Array<{ runId: string; ok: boolean; fetched: number }>;
};
type CreatorRow = {
  channelId: string; title: string; enabled: boolean;
  videos: number | null; fetched: number | null;
};
type QueryHit = {
  claimId: string; creatorId: string; creatorTitle: string;
  videoId: string; tStartMs: number; keyPhrase: string;
  statement: string; topic: string; watchUrl: string;
};
type QueryResult = { hits: QueryHit[]; skipped: Skipped[] };
type BrainDoc = {
  slug: string; title: string; generation: string | null;
  index: string; topics: string; timeline: string;
  claims: QueryHit[]; skipped: Skipped[];
  observation?: {
    observedAt: string; contentDigest: string;
    publicationWarning: 'generation-reuse-risk' | null;
  };
};
type RunOperation = {
  requestId: string; kind: 'daily' | 'repair';
  state: 'accepted' | 'running' | 'completed' | 'failed' | 'unknown';
  engineRunId: string | null;
};
type RunState = {
  journal: { status: string; runId: string | null } | null;
  lock: StatusInstrument['lock']; throttle: StatusInstrument['throttle'];
  budget: StatusInstrument['budget']; recentRuns: StatusInstrument['recentRuns'];
  operation?: RunOperation | null;
};
```

**Validation decisions**

- Finite nonnegative safe integers for counts and `tStartMs`; nullable counts stay nullable.
- `enabled` is a boolean, never truthiness-coerced.
- Damage takes precedence over apparent zero counts.
- `source:'unknown'` requires no fabricated timestamp; `history` remains stale.
- Coverage units and document-count failure representation are **U1 source-entry bindings**. Preserve the actual established payload; do not invent a new nullability amendment without its fixtures.
- `slug` contains the channel ID. Generation grammar remains `/^gen-(?:\d{4}|[1-9]\d{4,})$/`.
- All strings rendered from `skipped` are projected to `{source, reason}` with safe relative labels; never expose arbitrary object contents.
- The S2 drawer requires valid observation metadata once S2’s producer ships. Older adapters may omit it only under an explicit legacy capability, which renders “Publication fingerprint unavailable.”
- Content digest covers the exact delivered derived fields and claims in deterministic order. It identifies an observation; it does not prove historical immutability or atomicity against an external in-place writer.

**Adapter signatures**

```ts
type ReadOptions = { signal?: AbortSignal };
interface ConsoleDataAdapter {
  getStatus(options?: ReadOptions): Promise<StatusInstrument>;
  listCreators(options?: ReadOptions): Promise<CreatorRow[]>;
  addCreator(ref: string): Promise<CreatorRow>;
  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow>;
  query(q: string, creator?: string, options?: ReadOptions): Promise<QueryResult>;
  getBrain(channelId: string, options?: ReadOptions): Promise<BrainDoc>;
  getRunState(requestId?: string, options?: ReadOptions): Promise<RunState>;
  startDailyRun(perHour: number): Promise<{ requestId: string; runId: string | null }>;
  canary(options?: ReadOptions): Promise<CanaryReading>;
  repair(): Promise<{ repaired: number; built: number; emptied: number }>;
  backup(dest?: string): Promise<never>;
}
type EvidenceMap = {
  channelId: string; generation: string | null; contentDigest: string;
  groups: Array<{ topic: string; videos: Array<{ videoId: string; claims: QueryHit[] }> }>;
};
interface ConsoleExtensionAdapter {
  capabilities: { evidenceMap: boolean };
  getEvidenceMap(channelId: string, brain: BrainDoc): Promise<EvidenceMap>;
}
```

The optional read arguments are compatible extensions; mutations intentionally take no abort signal suggesting engine cancellation.

**Bridge request security**

- Bind `127.0.0.1` on an OS-selected port.
- Validate Host against the actual bound host/port before route parsing or dispatch.
- For writes: require exact same-origin `Origin`, `Content-Type: application/json`, and the established custom-header gate. No CORS permission, cross-origin preflight support, or browser-provided filesystem paths.
- **Proposed canonical header if the existing literal differs or is undocumented:** `X-Creator-Brains: 1`. U2 must record the actual literal. Preserve an already-established equivalent literal and update this one contract/test constant instead of introducing a second header.
- Missing/wrong write gates return 403 before dispatch. Local CLI clients must supply the same explicit headers; this is not a secret or local-process authentication.
- Keep the 64KiB body limit and the accepted S1-H19 connection-reset behavior.

**Routes and exact JSON contracts**

`L` = loopback Host gate; `W` = L plus write gates. No user account/token authentication is introduced.

| Method/path | Gate | Request | Success JSON | Named failures |
|---|---|---|---|---|
| `GET /api/status` | L | none | `200 StatusInstrument` | Damage remains fields; unexpected failure 500 |
| `GET /api/creators` | L | none | `200 CreatorRow[]` | 409 `STORE_DAMAGED` |
| `POST /api/creators` | W | `{"ref":"<nonempty, ≤200 chars>"}` | `201 CreatorRow` | 400 `VALIDATION`; 409 `WRITE_BUSY`/`STORE_DAMAGED`; 422 `REFUSED`; uncertain 504 |
| `PATCH /api/creators/:channelId` | W | `{"enabled":true}` or `false` | `200 CreatorRow` | 400; 409 busy/damage; 422 refusal; uncertain 504 |
| `GET /api/query?q=...&creator=...` | L | q nonempty ≤300 chars; creator optional exact ID | `200 QueryResult` | 400 validation; contained-read refusals reported through documented route failure or `skipped` |
| `GET /api/brains/:slug` | L | channel ID, not display slug | `200 BrainDoc` | 404 `NO_PUBLISHED_BRAIN`; 409 `STORE_DAMAGED` |
| `GET /api/run` | L | optional `requestId` in S4 | `200 RunState` | Invalid ID 400; absent correlation must remain unknown |
| `GET /api/backlog` | L | none | `200 {"lines":["<engine-formatted>"]}` | 409 `STORE_DAMAGED` |
| `GET /api/canary` | L | none | `200 CanaryReading` | Probe failure is a reading, not a fabricated success |
| `POST /api/repair` | W; S3 gate | `{}` | `200 {"repaired":0,"built":0,"emptied":0}` with actual measured counts | 409 `RUN_LOCKED`/publication fence; 422 refusal; uncertain outcome |
| `POST /api/run/daily` | W; S4 gate | `{"perHour":20}` | `202 {"requestId":"<uuid>","runId":null}` | 400 validation; 409 `RUN_LOCKED`/publication fence |
| Backup/restore/rollback/authorize | none exposed | any | none | 404 `NOT_FOUND` |
| Other API routes/methods | none | any | none | 404 `NOT_FOUND` |

The two run-operation routes are **planned reconciliation targets**. [UNKNOWN] Their current presence cannot be settled from the conflicting packet excerpts.

```ts
type ErrorEnvelope = {
  error: {
    code:
      | 'VALIDATION' | 'FORBIDDEN_HOST' | 'FORBIDDEN_ORIGIN'
      | 'WRITE_GATE_REQUIRED' | 'STORE_DAMAGED' | 'WRITE_BUSY'
      | 'RUN_LOCKED' | 'REFUSED' | 'NOT_FOUND' | 'NO_PUBLISHED_BRAIN'
      | 'PUBLICATION_UNSAFE' | 'WRITE_OUTCOME_UNKNOWN' | 'INTERNAL';
    message: string;
    file?: string;
    holder?: { pid?: number; host?: string };
    outcome?: 'not_started' | 'unknown';
  };
};
```

Client-only codes: `TRANSPORT`, `PAYLOAD_INVALID`, `BLOCKED_POLICY`. They are not fabricated HTTP statuses. Validation errors name a JSON path; messages exclude stacks, credentials, raw transcripts, and absolute private paths.

**Mutation lifecycle**

- Acquire registry gate immediately before dispatch; busy requests are refused, not queued.
- New add invokes a fixed worker entry chosen by code, never by request input.
- Soft response deadline: 190 seconds. Expiry after dispatch reports `WRITE_OUTCOME_UNKNOWN`; retain gate/worker ownership until settlement.
- No automatic worker termination, retry, or assumption that a disconnected client canceled the engine operation.
- On bridge restart, no persisted console operation history is assumed. Reload authoritative state; unresolved actions stay unknown.
- Console serialization does not claim protection from concurrent external CLI registry writes. T-N02’s real two-process test must establish the engine boundary or block the add/toggle release.
- Confirmed pre-dispatch refusal may say “Nothing was submitted.” Post-dispatch ambiguity never says “Nothing changed.”
- Repair/daily share the verified lock-reuse seam. Missing correlation, process exit alone, or disappearance of a lock cannot establish success.
- Fence console publishing when the current generation reaches `gen-9999` or above until the documented engine reuse defect is independently closed. Read parsing still accepts valid five-digit names.

**New console exports**

```ts
runAddInWorker(
  root: string, ref: string
): Promise<CreatorRow>;

withRegistryMutation<T>(
  task: () => Promise<T>
): Promise<T>;

readContainedBrain(
  root: string, channelId: string
): Promise<BrainDoc>;

queryContainedBrains(
  root: string, q: string, creator?: string
): Promise<QueryResult>;

validateCreatorRows(body: unknown): CreatorRow[];
validateCreatorRow(body: unknown): CreatorRow;
validateBrainDoc(body: unknown): BrainDoc;
validateQueryResult(body: unknown): QueryResult;
validateRunState(body: unknown): RunState;
validateCanaryReading(body: unknown): CanaryReading;

projectEvidenceMap(channelId: string, brain: BrainDoc): EvidenceMap;
```

Actual engine invocation syntax is U1-bound; these are new console wrapper signatures, not invented engine exports.

**Review Ledger contract**

```ts
type VerificationEvent = {
  schemaVersion: 1;
  sequence: number;
  eventId: string;
  occurredAt: string;
  kind: 'candidate' | 'test' | 'review' | 'checkpoint' | 'revoke' | 'supersede';
  candidateDigest: string;
  requirementIdsJson: string;
  evidenceRefsJson: string;
  reviewRefJson: string | null;
  decision: 'recorded' | 'pass' | 'revise' | 'halt' | 'inconclusive';
  blockingFindingIdsJson: string;
  supersedesEventId: string | null;
  prevHash: string;
  eventHash: string;
};
type VerificationAnchor = {
  schemaVersion: 1; ledgerId: string; sequence: number;
  eventHash: string; candidateDigest: string; createdAt: string;
};
appendVerificationEvent(input: Omit<VerificationEvent, 'sequence' | 'prevHash' | 'eventHash'>):
  Promise<VerificationEvent>;
verifyVerificationLedger(path: string, anchor?: VerificationAnchor):
  Promise<{ consistent: boolean; anchored: boolean; eligible: boolean; reasons: string[] }>;
```

- Store under the task’s evidence directory, outside engine data. Append with exclusive writer lock; validate prior head first; flush before reporting success. Never truncate a corrupt suffix automatically.
- Hash `JSON.stringify()` of a fixed-order array of all event fields except `eventHash`; SHA-256 lowercase hex. Genesis `prevHash` is 64 zeroes.
- Nested JSON strings use recursively sorted object keys; array order is preserved. Reject nonfinite numbers and duplicate-key ambiguity at input construction.
- Candidate digest binds sorted relative paths and SHA-256s of console source, tests, contracts, package manifests, and lockfiles. Exclude generated verification metadata explicitly to avoid a self-referential build.
- Evidence references contain relative path, SHA-256, command ID, exit code, environment ID, requirement IDs, and scope. No raw output or private content in the event.
- Review reference includes archive `review_id`, initial file hash, and immutable-review digest. Normalize only the permitted `superseded_by` backlink out of that digest.
- An independently retained anchor must match head, count, and candidate. Without it, report **consistent but unanchored**, never tamper-proof.
- Verification is computed; an event’s text cannot grant eligibility by itself.
- The UI summary is injected at the root and validated. It certifies its named source candidate only; post-build distribution hashes remain separate.

**Migrations/environment/rollback**

No engine migration or schema change. Use existing `CREATOR_BRAINS_ROOT`; do not introduce browser-selectable roots or log environment values. Test roots are temporary and explicitly selected. Ledger schema version 1 rejects unknown versions. Application rollback restores console code/launcher only; data recovery remains separately governed.
