**Target DTOs**

These are implementation targets for the hardening slice; they do not claim current source conformance.

```ts
type Damage = { file: string; detail: string };
type Skipped = { file: string; reason: string; creator?: string; claim?: string };
type Count = number | null;
type RequestOptions = { signal?: AbortSignal };

interface CanaryReading {
  ok: boolean;
  version: string | null;
  reason: string;
  checkedAt: string | null;
  ageMs: number | null;
  source: 'probe' | 'history' | 'unknown';
  stale: boolean;
  note: string | null;
}
interface LockReading {
  held: boolean;
  pid?: number;
  host?: string;
  alive?: boolean;
  ambiguous?: boolean;
}
interface BudgetReading {
  used: number;
  perHour: number;
  unit: string;
  byKind: Record<string, number>;
}
interface ThrottleReading {
  active: boolean;
  kind?: string;
  until?: string | null;
  text: string;
}
interface RecentRun {
  runId: string;
  ok: boolean;
  fetched: number;
}
interface StatusInstrument {
  ytdlp: CanaryReading;
  creators: { total: number; enabled: number; damaged: Damage | null };
  state: {
    damaged: Damage | null;
    videos: null | {
      total: number;
      fetched: number;
      coverage: number;
      counts: Record<string, number>;
    };
  };
  budget: BudgetReading;
  backlog: { lines: string[] };
  throttle: ThrottleReading;
  census: {
    inFlight: Array<{ channelId: string; detail: string }>;
    everSwept: number;
    discarded: boolean;
    error?: string;
  };
  lock: LockReading;
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number;
  publishedBrains: number;
  recentRuns: RecentRun[];
}
interface CreatorRow {
  channelId: string;
  title: string;
  enabled: boolean;
  videos: Count;
  fetched: Count;
}
interface QueryHit {
  claimId: string;
  creatorId: string;
  creatorTitle: string;
  videoId: string;
  tStartMs: number;
  keyPhrase: string;
  statement: string;
  topic: string;
  watchUrl: string;
}
interface QueryResult {
  hits: QueryHit[];
  skipped: Skipped[];
}
interface BrainDoc {
  slug: string; // compatibility name; value is the channel ID
  generation: string | null;
  title: string;
  index: string;
  topics: string;
  timeline: string;
  claims: QueryHit[];
  skipped: Skipped[];
}
interface LaunchReceipt {
  requestId: string;
  runId: string | null;
}
type RunPhase =
  | 'starting' | 'running' | 'completed'
  | 'failed' | 'interrupted' | 'unknown';
interface RunState {
  journal: { status: string; runId: string | null } | null;
  lock: LockReading;
  throttle: ThrottleReading;
  budget: BudgetReading;
  recentRuns: RecentRun[];
  launch: null | {
    requestId: string;
    pid: number | null;
    runId: string | null;
    phase: RunPhase;
  };
}
interface RepairResult {
  runId: string;
  ok: boolean;
  repaired: number;
  built: number;
  emptied: number;
  quarantined: number;
}
interface ConsoleDataAdapter {
  getStatus(o?: RequestOptions): Promise<StatusInstrument>;
  listCreators(o?: RequestOptions): Promise<CreatorRow[]>;
  addCreator(ref: string): Promise<CreatorRow>;
  setCreatorEnabled(id: string, enabled: boolean): Promise<CreatorRow>;
  query(q: string, creator?: string, o?: RequestOptions): Promise<QueryResult>;
  getBrain(channelId: string, o?: RequestOptions): Promise<BrainDoc>;
  getRunState(o?: RequestOptions): Promise<RunState>;
  startDailyRun(perHour: number): Promise<LaunchReceipt>;
  canary(o?: RequestOptions): Promise<CanaryReading>;
  repair(): Promise<RepairResult>;
  backup(dest?: string): Promise<{ dest: string; ok: boolean }>;
}
```

`backup()` remains a typed `NOT_FOUND` rejection and sends no request. `dest` is compatibility surface, not permission to implement arbitrary destinations.

**HTTP contract**

| Method/path | Request | Success | Owning slice |
|---|---|---|---|
| GET `/api/status` | — | 200 `StatusInstrument`, composite damage fields | Existing/S0H |
| GET `/api/creators` | — | 200 `CreatorRow[]` | Existing |
| POST `/api/creators` | `{"ref":"@handle"}` | 201 `CreatorRow`; existing consent retained | Existing/S2 hardening |
| PATCH `/api/creators/:channelId` | `{"enabled":true}` | 200 `CreatorRow` | Existing |
| GET `/api/brains/:channelId` | encoded channel ID | 200 `BrainDoc` | Existing/S0H |
| GET `/api/query` | `q`; optional `creator` | 200 `QueryResult` | Existing/S0H |
| GET `/api/run` | — | 200 `RunState`; `launch` added in S4 | Existing/S4 |
| GET `/api/backlog` | — | 200 `{"lines":[]}` | Existing |
| GET `/api/canary` | — | 200 `CanaryReading` | Existing/S0H |
| POST `/api/repair` | `{}` | 200 `RepairResult`, including `ok:false` | S3b |
| POST `/api/run/daily` | `{"perHour":20}` | 202 `{"requestId":"…","runId":null}` | S4 |
| POST `/api/backup` | none supported | 404 after policy validation | Blocked |
| restore/rollback/authorize | any | 404 after policy validation | Excluded |

**Errors**

```json
{"error":{"code":"STORE_DAMAGED","message":"Unable to read state.json.","file":"state.json"}}
```

| Status | Code / meaning |
|---|---|
| 400 | `VALIDATION`: malformed target/body/identifier/query/budget |
| 403 | `FORBIDDEN_HOST`, `FORBIDDEN_WRITE`: pre-dispatch policy refusal |
| 404 | `NOT_FOUND`: absent route or unpublished brain |
| 409 | `STORE_DAMAGED`, `RUN_LOCKED`, `OPERATION_BUSY` |
| 422 | `REFUSED`: positively established pre-write engine refusal |
| 500 | `INTERNAL`: sanitized unexpected failure; mutation outcome may be unknown |

`RUN_LOCKED` includes `holder: LockReading`. Do not echo stacks, private absolute paths or unfiltered subprocess errors. Client transport or invalid-response errors are not fabricated HTTP responses. Oversized bodies may produce a connection reset; never retry the mutation automatically.

**Request policy**

1. Validate Host against allowed loopback names and the actual bound port.
2. Expected browser Origin is `http://` plus that validated authority.
3. Present Origin must exactly equal expected Origin. Reject `null`, other ports, aliases and schemes.
4. Origin-less native requests remain permitted.
5. Every mutating request requires `x-console-write: 1`.
6. Declared bodies require JSON media type; no CORS permission.
7. Body limit: 65,536 bytes; fatal UTF-8; non-null JSON object.
8. `ref`: trimmed, 1–200 characters. `q`: trimmed, 1–300 characters.
9. `enabled`: Boolean. `perHour`: positive safe integer JSON number.
10. Response caching: `no-store`.

Unknown routes remain absent; a failed security gate can return 403 before their 404.

**Contained derived reader**

New exports:

```ts
readPublishedBrain(channelId: string, o: { r: string }): BrainDoc;
readPublishedClaims(o: { r: string; creator?: string }): QueryResult;
searchPublishedClaims(
  q: string,
  o: { r: string; creator?: string; limit?: 40 }
): QueryResult;
```

- Namespace must be one safe component, ≤64 characters. New creator identities use the engine’s channel-ID validator. Legacy safe names remain readable; display titles never become paths.
- Canonicalize the selected store and validate `brains/`, namespace, `current.json`, generation and each leaf before content reads.
- Reject links outside the selected namespace/generation, including links to another creator’s generation. Fail closed on permission/realpath errors. Only `ENOENT` means missing.
- Read and validate `current.json` once per namespace per request. Missing pointer →404 for drawer; malformed pointer →409. Query records a bounded skipped report for a damaged namespace.
- No generation → `generation:null`, empty content, four named skipped entries.
- Generation spelling: `gen-` plus a positive decimal integer padded to at least four digits; suffix must fit a safe integer. Accept `gen-10000`; reject separators and noncanonical padding.
- Read only `index.md`, `topics.md`, `timeline.md`, `rules.jsonl`.
- Never call `loadHits()` or `queryBrains()` on uncontrolled store paths from a console presentation route.
- Parse rules once. Validate nonempty claim/creator identifiers, matching creator identity, valid YouTube video ID, finite nonnegative safe-integer timestamp and string key phrase. Missing optional `statement`/`topic` normalize to empty strings; wrong-typed values are skipped.
- Keep the actual `claim_id`. Join display title from the pinned pointer. Construct watch URLs from validated video ID and whole seconds.
- Query preserves current engine term scoring: lowercase whitespace terms; matched-term count descending, matched-character score descending; deterministic creator/claim-ID tie-break; maximum 40 hits.
- The small scoring projection is console-owned to avoid unsafe filesystem delegation. Pin parity against engine queries on valid synthetic fixtures.
- One pointer may change while a request is running; the request finishes from its pinned immutable generation. No second pointer traversal.
- Cooperating engine publication and pre-existing malicious links are in scope. Protection against an actively malicious local process replacing links between filesystem operations is **unproven**; do not claim it from `realpath()` checks.

Safety limits: pointer 64KiB; each markdown file 2MiB; rules 16MiB/50,000 lines per generation; one claim 64KiB; aggregate query scan 64MiB/200,000 rows. Exceeding a limit produces an explicit refusal/skipped reason, never a normal empty result. Tune only through a reviewed contract amendment using corpus-size evidence.

**Workers**

```ts
resolveCreator(ref: string, o: { timeoutMs: 185000 }):
  Promise<{ channelId: string; title: string; url: string }>;

readHealth(o: { r: string; now?: number }): CanaryReading;
disposeHealth(o: { r: string }): Promise<void>;

startDailyRun(perHour: number, o: { r: string }): Promise<LaunchReceipt>;
runRepair(o: { r: string }): Promise<RepairResult>;
```

Resolver: one pending job, no queue. Validate before spawning. Worker resolves only; parent calls:

```js
await addCreator({ ref, r, deps: { resolveCreator: () => resolved } });
```

The parent’s engine call reads registry after resolution. This avoids extending the existing synchronous commit window; it does not prove cross-process registry transaction isolation.

Health: one worker flight, 60-second refresh interval, 65-second worker watchdog accommodating the existing subprocess ceiling. Retain worker handles; handle error/exit; terminate and close ports on timeout/shutdown. Tag messages with epoch/job identity; reset invalidates old messages. Store-derived history is keyed by canonical root. Preserve prior readings with their original age while refresh is pending; never label pending as failed.

Run/repair: one shared operation slot per canonical store. Both require the external-runner journal gate. Daily child uses `process.execPath`, fixed absolute engine script, argument array, explicit store root and no shell. Correlate new journal run ID, child PID and launch-time window. A terminal result requires the matching engine record; exit zero is insufficient.

Repair calls `runDaily({r, only:['reconcile','build','export']})` in a worker. Engine-internal private processing remains engine-owned. Only the projected result crosses back into the console.

**Configuration and rollback**

`CREATOR_BRAINS_ROOT`: explicit root → existing environment override → engine default. No new provider secret or database configuration.

No store schema migration. Ship bridge and web bundle together when target contracts change. Application rollback stops the bridge, disables its launcher and restores approved console bytes. It does not undo consent changes or engine work. Restore remains owner CLI-only.
