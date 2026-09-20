**Compatibility**

S1 payloads remain compatible except where the documented contract was already wrong. Planned additions land with their consumers. Extra object fields are tolerated; missing/retyped required fields are refused. A failed validator reports the field path.

```ts
type Damage = { file: string; detail: string };
type Count = number | null;
type Skipped = Record<string, unknown>;

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
  used: number; perHour: number; unit: string;
  byKind: Record<string, number>;
}
interface ThrottleReading {
  active: boolean; kind?: string; until?: string | null; text: string;
}
interface RecentRun { runId: string; ok: boolean; fetched: number }

interface StatusInstrument {
  ytdlp: CanaryReading;
  creators: { total: number; enabled: number; damaged: Damage | null };
  state: {
    damaged: Damage | null;
    videos: null | {
      total: number; fetched: number; coverage: number;
      counts: Record<string, number>;
    };
  };
  budget: BudgetReading;
  backlog: { lines: string[] };
  throttle: ThrottleReading;
  census: {
    inFlight: Array<{ channelId: string; detail: string }>;
    everSwept: number; discarded: boolean; error?: string;
  };
  lock: LockReading;
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number;
  publishedBrains: number;
  recentRuns: RecentRun[];
}
interface CreatorRow {
  channelId: string; title: string; enabled: boolean;
  videos: Count; fetched: Count;
}
interface QueryHit {
  claimId: string; creatorId: string; creatorTitle: string;
  videoId: string; tStartMs: number; keyPhrase: string; watchUrl: string;
}
interface QueryResult { hits: QueryHit[]; skipped: Skipped[] }
interface BrainDoc {
  slug: string; // compatibility field; value is channelId, not a display slug
  generation: string;
  title: string;
  index: string; topics: string; timeline: string;
  claims: QueryHit[]; skipped: Skipped[];
}
interface LaunchReceipt {
  requestId: string;
  runId: string | null;
}
interface RunState {
  journal: { status: string; runId: string | null } | null;
  lock: LockReading; throttle: ThrottleReading; budget: BudgetReading;
  recentRuns: RecentRun[];
  launch: null | {
    requestId: string; pid: number | null; runId: string | null;
    phase: 'starting' | 'running' | 'completed' | 'failed'
      | 'interrupted' | 'unknown';
  };
}
interface RepairResult {
  runId: string; ok: boolean;
  repaired: number; built: number; emptied: number;
}
interface RequestOptions { signal?: AbortSignal }
```

`ytdlp` provenance normalization lands in S1R; it is not a claim that today’s status DTO already exposes every field above. `launch` lands in S4.

```ts
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

`backup` remains a typed refusal in both adapters until its gate is resolved. The optional `dest` signature is retained for compatibility; it is not authority to implement arbitrary filesystem destinations.

**HTTP contract and slice ownership**

| Method / path | Request | Success | Owner |
|---|---|---|---|
| GET `/api/status` | None | 200 `StatusInstrument`; damage fields retained | Existing/S1R |
| GET `/api/creators` | None | 200 `CreatorRow[]` | Existing/S2 |
| POST `/api/creators` | `{"ref":"@handle"}` | 201 `CreatorRow` | Existing/S2 |
| PATCH `/api/creators/:channelId` | `{"enabled":true}` | 200 `CreatorRow` | Existing/S2 |
| GET `/api/query` | `q`, optional `creator=channelId` | 200 `QueryResult` | Existing/S3a |
| GET `/api/brains/:channelId` | One encoded channel-ID segment | 200 `BrainDoc` | Existing/S2 |
| GET `/api/run` | None | 200 `RunState` | Existing/S4 extension |
| GET `/api/backlog` | None | 200 `{lines:string[]}`; extra fields tolerated | Existing |
| GET `/api/canary` | None | 200 `CanaryReading` | Existing/S1R |
| POST `/api/repair` | `{}` | 200 `RepairResult` | S3b only |
| POST `/api/run/daily` | `{"perHour":20}` | 202 `{"requestId":"…","runId":null}` | S4 only |
| POST `/api/backup` | None currently allowed | 404 | Blocked S3c |
| Any restore/rollback/authorize route | Any | 404 | Never v1 |

**Error envelope**

```json
{
  "error": {
    "code": "STORE_DAMAGED",
    "message": "Unable to read state.json.",
    "file": "state.json"
  }
}
```

| Status | Codes / meaning |
|---|---|
| 400 | `VALIDATION`: body, encoding, query, identifier, budget |
| 403 | `FORBIDDEN_HOST`, `FORBIDDEN_ORIGIN`: request rejected before handler |
| 404 | `NOT_FOUND`: absent route or absent published brain |
| 409 | `STORE_DAMAGED`, `RUN_LOCKED`, `OPERATION_BUSY` |
| 415 | `UNSUPPORTED_MEDIA_TYPE`: write is not JSON |
| 422 | `REFUSED`: confirmed engine refusal before the intended mutation |
| 500 | `INTERNAL`: generic message; mutation outcome may be uncertain |

`RUN_LOCKED` additionally carries `holder:{pid?,host?,alive?,ambiguous?}`. No stack traces, credentials, raw store contents, or unfiltered absolute paths. Engine messages are retained only after privacy-safe projection. `TRANSPORT` and payload-validation failures are client errors, not invented HTTP responses.

Oversized requests may reset the connection; that accepted transport limitation remains explicit.

**Validation and trust**

- Host must match a permitted loopback authority and the actual bound port.
- Browser mutation Origin must equal the serving origin.
- Every mutation requires `Content-Type: application/json` and `X-Creator-Console: 1`.
- A native client may omit Origin but still needs the media type and custom header.
- No CORS allowance; cross-origin OPTIONS does not unlock a write.
- Body ≤65,536 bytes, fatal UTF-8 decode, non-null JSON object.
- `ref`: trimmed nonempty string ≤200 characters.
- `q`: trimmed nonempty string ≤300 characters.
- `perHour`: JSON number, positive safe integer; strings/booleans rejected.
- New channel IDs satisfy the engine’s canonical validator. Existing registry keys may remain listable; malformed legacy identifiers do not become filesystem paths.
- Brain generation must be one safe filename component. Resolve real paths under the selected brain directory; refuse links escaping it. Do not follow a poisoned pointer into another directory.
- Only `index.md`, `topics.md`, `timeline.md`, `rules.jsonl` may supply drawer content.
- Raw transcript paths are never opened by console presentation handlers.
- Escape displayed text. Validate watch URLs from video IDs and finite nonnegative timestamps.
- Read responses use `Cache-Control: no-store`.

**Worker contracts**

```ts
resolveCreatorInWorker(
  ref: string,
  options: { timeoutMs: 185000 }
): Promise<{ channelId: string; title: string; url: string }>;

refreshHealthInWorker(
  options: { timeoutMs: 15000 }
): Promise<{ ok: boolean; version: string | null; reason: string }>;

readPublishedBrain(channelId: string, options: { r: string }): BrainDoc;
launchDaily(perHour: number, options: { r: string }): Promise<LaunchReceipt>;
runRepair(options: { r: string }): Promise<RepairResult>;
```

Resolver worker calls the existing exported `validateCreatorRef` and `defaultResolveCreator`. Parent then calls:

```js
await addCreator({
  ref,
  r,
  deps: { resolveCreator: () => resolved }
});
```

No worker changes registry/state files during resolution. This design is [LIKELY] feasible from inspected exports; tests must prove it before shipping.

Health refresh is single-flight. Successful cached readings expire after 60 seconds. History fallback retains its original timestamp and a current-probe-failure note. Status reads may show an explicitly unknown/pending reading while refresh runs; never fabricate fresh health.

**Run contract**

Launch metadata is console process state, not another engine journal. Correlation requires matching child PID and a newly observed engine run ID. A terminal success requires the matching engine record with `ok:true`. Unknown journal statuses, overwritten journals, missing records, or uncorrelated child exit render uncertainty.

Daily child invocation uses `process.execPath`, a fixed absolute `E/run-daily.mjs`, argument array `["--per-hour=N"]`, explicit store-root environment, and no shell. S4’s Windows process-survival test decides whether the required detached lifecycle works; no claimed detached behavior without that result.

Repair uses the engine’s existing configuration:

```js
runDaily({ r, only: ['reconcile', 'build', 'export'] })
```

Its worker projects the returned record; it does not parse CLI stdout or invent a requeued count.

**Migrations, configuration, rollback**

No engine schema migration or new database environment variable. `CREATOR_BRAINS_ROOT` remains authoritative. No provider keys are required.

Relocation changes code paths only. Preserve dependencies through the existing web lockfile; do not install dependencies under `E`. Remove the old active console location only after an approved, verified move. A residual `node_modules` tree under `E` still triggers the old problem.

Rollback disables the console launcher and restores the preserved console sources if needed. It does **not** undo creator toggles, completed jobs, backups, or other engine mutations. Store restoration remains CLI-only.
