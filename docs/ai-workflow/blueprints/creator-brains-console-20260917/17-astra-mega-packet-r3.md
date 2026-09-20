# 17 — Astra mega packet, ROUND 3 — Creator Brains Console

**This is a REBUILT artifact, not a re-send.** Round 2's packet described a tree that
no longer exists: the console has since been relocated, and eight of round 2's ten
findings have been fixed. Everything below is read from the working tree at build
time, verbatim — the packet docs, the shipped source of every file the fixes touched,
and the tests that claim to cover them.

## Remit

You are the hostile reviewer. Round 2 (`17-astra-mega-reply-r2.md`) returned **verdict
REVISE** with ten findings, **R2-01 … R2-10**. This pass has exactly one job:

> **Attack the fixes for R2-01, R2-02, R2-03, R2-04, R2-05, R2-06, R2-09 and R2-10.
> Report a finding only where the fix is incomplete, wrong, or defended by a test that
> cannot fail.**

Two of the ten are **deliberately out of scope and were not fixed**: **R2-07** (a stale
machine-readable next step — the `readiness.json` `nextSlice` field now carries current
status, but the item was not worked as a finding) and **R2-08** (a duplicate test ID,
`T-B22`, reused by `bridge.writegate.test.mjs`). Reporting those again is expected; they
are not evidence of a failed fix.

## What "dry" means, so you can judge it precisely

The round log defines it: **a rebuilt artifact with no finding against the previous
round's fixes.** So the bar is not "the packet is good" — it is that the specific
mechanisms named in R2-01…R2-10 are, on inspection of the shipped code, actually there.

## How to be useful rather than thorough

The expensive failure mode in this project has been a **vacuous pass**: an assertion
that could not fail, a mutation applied to a code path the test never entered, a
checker whose own extractor was wrong so every comparison agreed while comparing
nothing. **"The assertions passed" means nothing until the checker has been shown able
to fail.** Each fix below carries its mutation evidence. Treat that evidence as a claim
to be checked against the code, not as proof.

## Where to look hardest

1. **The two-layer containment (R2-02).** A boundary implemented at one entry point is
   a boundary implemented once and a half. Is `assertReadSurfaceContained` really
   upstream of every engine traversal, or does some path still reach the engine first?
2. **The mutation evidence itself (R2-02, R2-04).** Are the red sets genuinely
   orthogonal, or does one test do the work of two?
3. **The worker failure lifecycle (R2-04).** A worker that cannot start must become a
   *reading*. Check the epoch logic, the watchdog, and whether any handler can still
   produce an uncaught exception.
4. **The exact-origin write gate (R2-05).** Is "this bridge's own origin" implemented,
   or merely asserted?
5. **The instruction sweep (R2-06).** These documents are *instructions*: a stale row
   does not stay a typo, it rebuilds rejected behaviour. Check every active doc for a
   shape the amendment replaced.

---


## PART A — the current packet documents (verbatim from the tree)

### A/05-contracts.md — 209 lines

```
# 05 — Contracts — Creator Brains Console

## 1. `ConsoleDataAdapter` (the modularity seam — UI imports ONLY this)

```ts
// web/src/adapters/types.ts
export type Tier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

/**
 * THE FULL PROVENANCE, NOT JUST THE VERDICT (A1-03).
 *
 * `source` is THREE-valued and `unknown` is a real value, not an absence. Since
 * A1-10 the production probe runs off the event loop, so a cold read has started
 * a probe and has no verdict yet; reporting that as `source:'probe'` would
 * present "we have not checked" as a live reading — the same lie the
 * failure-caching defect was.
 *
 * `checkedAt`/`ageMs` are `null` when there is no timestamp to be honest about,
 * and `stale` is then `true` by definition. A `history` reading is ALWAYS stale:
 * it is not a live verdict and must never be presented as one, however recent the
 * record happens to be.
 */
export interface CanaryReading {
  ok: boolean; version: string | null; reason: string;
  checkedAt: string | null; ageMs: number | null;
  source: 'probe' | 'history' | 'unknown'; stale: boolean; note: string | null;
}

export interface StatusInstrument {            // R2 — mirrors status-command sources
  ytdlp: CanaryReading;                        // NOT the narrowed {ok,version,reason} (A1-03)
  creators: { total: number; enabled: number; damaged: null | { file: string; detail: string } };
  state: { damaged: null | { file: string; detail: string };
           videos: { total: number; fetched: number; coverage: number;
                     counts: Record<string, number> } | null };
  budget: { used: number; perHour: number; unit: string; byKind: Record<string, number> };
  backlog: { lines: string[] };               // engine-formatted truth, not re-derived
  throttle: { active: boolean; kind?: string; until?: string; text: string };
  census: { inFlight: Array<{ channelId: string; detail: string }>;
            everSwept: number; discarded: boolean; error?: string };
  lock: { held: boolean; pid?: number; host?: string; alive?: boolean };
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number; publishedBrains: number;
  recentRuns: Array<{ runId: string; ok: boolean; fetched: number }>;
}

export interface CreatorRow {
  channelId: string; title: string; enabled: boolean;
  /**
   * MEASURED, OR `null` — NEVER A FABRICATED ZERO (A1-03, A1-12).
   * From `state.json` via `readState` + filter, the same computation
   * `renderCreators` does. `null` means the count COULD NOT BE TAKEN (a damaged
   * store, or a read that raced the write); `0` means it was taken and is zero.
   * Conflating them renders "0 videos" for a creator that has videos — a guard
   * value presented as a measurement.
   *
   * `enabled` is the registry's truth. A NEW creator starts `false`; an EXISTING
   * one keeps whatever the operator decided, because `upsertCreator` preserves
   * consent by design. Re-adding is not a way to revoke consent (A1-12).
   */
  videos: number | null; fetched: number | null;
}

export interface QueryHit {
  claimId: string; creatorId: string; creatorTitle: string;
  videoId: string; tStartMs: number; keyPhrase: string;
  statement: string; topic: string;            // served by both routes; declared since A1-03
  watchUrl: string;                            // https://youtu.be/<id>?t=<s>
}
export interface QueryResult { hits: QueryHit[]; skipped: Array<Record<string, unknown>>; }

/**
 * `slug` IS A CHANNEL ID, NOT A SLUG (A1-04, name reconciled in R2-01).
 *
 * `lib/render.mjs` HR07 states it outright: "the storage namespace is the CHANNEL
 * ID, never a display name" — two channels sharing a display name would otherwise
 * write one directory and the second would erase the first. This document called
 * it a slug, which is how the drawer's identifier came to be described as
 * something it is not. `slugify` does exist in the engine, but it produces
 * FILENAMES for other surfaces; it does not name a brain namespace.
 *
 * THE FIELD NAME IS `slug`, AND THAT IS A RECONCILIATION, NOT AN OVERSIGHT.
 * The A1-04 amendment renamed the field to `key` in THIS document while the
 * bridge went on serving `slug` — so for one round the contract, the web types
 * and the response disagreed, and nothing compared them. Astra round 2 (R2-01)
 * ruled: preserve `slug` as the compatibility field containing a channel ID. The
 * route `/api/brains/:slug` and the field are already published, so renaming the
 * response would be the breaking change, not the fix. The name stays; the
 * MEANING is what A1-04 corrected, and `T-B27e` now asserts this document's field
 * names against the live payload so a doc-only rename cannot happen again.
 *
 * `generation` is the PINNED published generation the markdown AND the claims
 * both come from (A1-04). It is `null` when the pointer names none, which is an
 * incomplete brain rather than a damaged one; a pointer naming a generation the
 * engine never writes is damage and is refused.
 */
export interface BrainDoc { slug: string; title: string;
  generation: string | null;
  index: string; topics: string; timeline: string;       // markdown from published generation
  claims: QueryHit[]; skipped: Array<Record<string, unknown>>; }

export interface RunState { journal: { status: string; runId: string | null } | null;
  lock: StatusInstrument['lock']; throttle: StatusInstrument['throttle'];
  budget: StatusInstrument['budget']; recentRuns: StatusInstrument['recentRuns']; }

export interface ConsoleDataAdapter {
  getStatus(): Promise<StatusInstrument>;
  listCreators(): Promise<CreatorRow[]>;
  addCreator(ref: string): Promise<CreatorRow>;                    // T2
  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow>;  // T2
  query(q: string, creator?: string): Promise<QueryResult>;        // T0
  getBrain(channelId: string): Promise<BrainDoc>;                  // T0
  getRunState(): Promise<RunState>;                                // T0
  /**
   * ACCEPTANCE IS NOT COMPLETION (A1-05). `runId` is the ENGINE's run id and is
   * `null` at acceptance: `run-daily.mjs` does not accept a caller-supplied id,
   * so one cannot honestly be returned before the engine has written it.
   * `requestId` is the CONSOLE's correlation id, returned immediately.
   * Correlate the child process to an engine journal entry and use THAT entry's
   * run id. Never treat process exit, or a lock disappearing, as success.
   */
  startDailyRun(perHour: number): Promise<{ requestId: string; runId: string | null }>; // T2
  canary(): Promise<CanaryReading>;                                // T0
  /**
   * A PROJECTED ENGINE RESULT (A1-07). The engine's repair path runs
   * reconciliation, build and export and returns an EXIT CODE — it does not
   * return `{requeued}`. The console invokes the same `runDaily` configuration
   * through a wrapper and projects the engine's own counts, sharing the
   * run-operation exclusion gate with `startDailyRun`.
   */
  repair(): Promise<{ repaired: number; built: number; emptied: number }>;  // T2
  backup(dest?: string): Promise<{ dest: string; ok: boolean }>;   // T2
}
```

`LocalEngineAdapter` implements this over the bridge HTTP API. `MockAdapter` implements it over fixtures and MUST satisfy the same vitest contract test (R12). SwanGuard later supplies its own — the interface is the transfer artifact.

## 2. Bridge HTTP API (loopback only; JSON; error envelope everywhere)

**Scope of this table (read this before treating a row as buildable).** A row's tier badge is a *capability* label, not a schedule. Which rows exist today is fixed by the **S0 route allowlist** below — nine literal routes, pinned by a positive allowlist test (`bridge.hy4.structure.test.mjs`) so an unplanned route fails CI rather than appearing unnoticed. Rows marked **DEFERRED** are contract *intent* for a later slice, and a route MUST NOT be added ahead of the slice that owns it.

### 2a. S0 — realised route allowlist (implemented; this is the honest surface)

| Method+Path | Tier | Engine function (authoritative source) | Response 2xx | Errors |
|---|---|---|---|---|
| `GET /api/status` | T0 | store/summary/ledger/throttle/checkpoints/lock/ytdlp/render (same composition as status-command) | `StatusInstrument` — **200 even when damaged** | none (damage is a *field*, see note) |
| `GET /api/creators` | T0 | `listCreatorsSafe` + state counts | `CreatorRow[]` | `409 STORE_DAMAGED` |
| `POST /api/creators` | T2 | `addCreator` | `201 CreatorRow` (DISABLED) | `400 VALIDATION`, `422 REFUSED {reason}` |
| `PATCH /api/creators/:channelId` | T2 | `setEnabled` | `200 CreatorRow` | `409 STORE_DAMAGED`, `422 REFUSED` |
| `GET /api/query?q&creator` | T0 | `queryBrains` | `QueryResult` | `400 VALIDATION` |
| `GET /api/brains/:slug` | T0 | `readPointer`+published files only | `BrainDoc` | `404 NO_PUBLISHED_BRAIN` |
| `GET /api/run` | T0 | journal+lock+throttle+budget+recentRuns | `RunState` | — |
| `GET /api/backlog` | T0 | backlog lib function (engine-formatted lines) | `{ lines: string[] }` | — |
| `GET /api/canary` | T0 | `selfCheck` via the **60 s TTL cache** (see 11 §3) — carries `ok/version/reason/checkedAt/ageMs/source/stale/note` | `CanaryReading` | — |
| anything else | — | — | — | `404` (restore/rollback/authorize have **no route** — R9/T-B6 tested) |

`GET /api/status` and `GET /api/canary` MUST NOT call `selfCheck()` inline: the probe shells out to `yt-dlp --version` (~1.7–3.4 s) and would block the single-threaded bridge per request. They read through `lib/health.mjs`.

**Damage reporting differs by route — corrected 2026-09-18 (H6b).** This table previously listed `409 STORE_DAMAGED` for `GET /api/status`, which was **wrong**, and `06` T-B2 asserted the same. Measured behaviour on a corrupt `registry.json`:

- `GET /api/status` → **200**, with `creators.damaged = {file:'registry.json', detail}` (and `state.damaged` for a corrupt `state.json`). It does **not** 409.
- `GET /api/creators` → **409** `{error:{code:'STORE_DAMAGED', file:'registry.json'}}`.

The code is right and the doc was wrong, for a reason visible in §1: `StatusInstrument` types damage as a *field* (`damaged: null | {file, detail}`), so a 409 on `/api/status` would make that field unreachable — and R3/T-W3 require the board to render a refusal banner **naming the file**, which needs the 200 + field shape.

**Trap for future consumers:** when `creators.damaged` is non-null the same payload still carries `total: 0, enabled: 0`. Those zeros are *not* a measurement. Any consumer that renders `total` without checking `damaged` first will display a false zero — which is precisely what R3 forbids. `StatusBoard` withholds them and renders the refusal instead.

### 2b. DEFERRED — contract intent, no route until the owning slice lands

| Method+Path | Tier | Owner slice | Engine function | Planned response 2xx | Planned errors |
|---|---|---|---|---|---|
| `POST /api/run/daily` | T2 | **S4** (RunConsole) | spawn `run-daily.mjs --per-hour=N` | `202 {requestId, runId: null}` (progress via `GET /api/run`) | `400 VALIDATION` (non-positive int), `409 RUN_LOCKED {holder}` |
| `POST /api/repair` | T2 | **S3** (OpsRail) | repair path of `COMMANDS` | `200 {repaired, built, emptied}` — a PROJECTED engine result | `409 RUN_LOCKED {holder}`, `409/422` |
| `POST /api/backup` | T2 | **S3** (OpsRail) — **BLOCKED (A1-08 / D4), do not build** | backup command | **withheld — no endpoint** | — |

The corresponding tests (`T-B4`, `T-B5`, `T-B10`) land **with their slice**, not at S0 — this is the plan/code discrepancy HY4 found as H6 and is corrected here and in `08`. S0's exit evidence is `T-B1/B2/B3/T-B6/T-B7/T-B8/T-B9` plus the structure suite.

**Both run rows were corrected 2026-09-20 (R2-06) — §2b had retained the shapes `17` §A1-05 and §A1-07 replaced in §1.** `POST /api/run/daily` answers `{requestId, runId: null}`, because acceptance is not completion (§1). `POST /api/repair` answers a **projected** engine result `{repaired, built, emptied}`; the engine's repair path returns an exit code, never `{requeued}`. A stale row here is not a typo — it is an instruction that would rebuild the rejected behaviour.

**THE RUN-OPERATION EXCLUSION GATE COVERS BOTH ROWS (A1-06).** Repair invokes the same `runDaily` journal path, so gating `POST /api/run/daily` alone would leave the journal reachable through the other door. Both routes take the same exclusion and both may answer `409 RUN_LOCKED {holder}`.

**`409 RUN_LOCKED` IS A REFUSAL OF THE RUN, NOT PROOF THE STORE IS UNTOUCHED.** `lib/run.mjs:107` writes the journal **before** it attempts the engine lock at `:154`, so a refused run may already have appended a journal entry. A console-side mutex therefore does not cover an external runner (the CLI, or a second machine against a synced store), and the engine lock is **not** a sufficient backstop — `09#H1` said it was. S4's entry gate is a two-process journal-preservation test (`19` §4). If it fails, the defect goes to the **engine owner**.

**`POST /api/backup` is BLOCKED as of 2026-09-20 — A1-08, D4 AMEND (`17` §1).** `backup-command.mjs:46–59` copies the durable set **including raw transcripts**, which `01` §"Business rules" item 1 bans from every console surface; the optional browser-supplied `dest` has no containment contract either. Backup therefore stays **visible in the UI but blocked, with no endpoint**, until Sean decides whether an engine-only private backup is an allowed exception to the tier-B boundary. It is **not** dropped from product scope. Never substitute a derived-only copy and call it a full backup.

**Error envelope (uniform):** `{ "error": { "code": "STORE_DAMAGED|RUN_LOCKED|VALIDATION|REFUSED|NOT_FOUND", "message": "<engine reason, verbatim>", "file?": "<damaged file name>" } }`

**Validation:** `addCreator.ref` non-empty string ≤ 200 chars; `perHour` integer ≥ 1 (both client and server); `query.q` non-empty ≤ 300 chars; channelId matched against `^UC[A-Za-z0-9_-]+$` or existing registry key.

## 3. Authoritative data sources (data-truth map)

| Screen fact | Source file/function | Never from |
|---|---|---|
| creator list/on-off | `registry.json` via `listCreatorsSafe` | UI state |
| per-creator videos/fetched | `state.json` via `readState`+filter (same as `renderCreators`) | cache older than the request |
| coverage/budget/backlog/throttle/lock/census | their lib functions (same call graph as `status-command.mjs`) | re-derived math in the client |
| claims/citations | published generation `rules.jsonl` via `current.json` (HR08) | raw transcripts (forbidden, tier B) |
| run progress | `runs/` journal + lock files | stdout scraping of the child |

## 4. Trust & privacy boundary

- The bridge binds `127.0.0.1` only (integration-tested), no auth surface exposed; it is a single-operator local tool. It MUST NOT gain any route that reads `docs/<channelId>/*.json` (tier B transcripts) — enforced by import discipline (api.mjs never imports a transcript-reading module) + the verbatim 8+-word grep test over everything the console serves (R-invariant 1).
- Store mutations remain inside the engine's tested functions; the bridge adds validation + tier labels, never new write paths.
- SwanGuard transfer (S7) re-evaluates this boundary — a networked host app changes the trust model; that review belongs to the SwanGuard-side packet, not this one.

## 5. N/A records (per protocol part 5)

- **ERD/data model:** N/A — the store schema is the engine's existing files; this console creates no tables and no migrations (see engine blueprint).
- **Permissions matrix:** N/A beyond tier badges — single-operator loopback tool; no roles.

```

### A/06-test-plan.md — 118 lines

```
# 06 — Test plan — Creator Brains Console

Conventions: tests are written BEFORE implementation per slice (RED observed, then GREEN). RED suites live beside the slice's tests and are run explicitly; the normal suite stays green. Isolated resources: every bridge test runs against a temp `CREATOR_BRAINS_ROOT` (engine's own env seam) and an OS-chosen port (`server.listen(0)`). Playwright NEVER boots the real backend/production DB (standing repo lesson): the smoke stubs `/api/**` like the protected-surface smokes, or runs against the bridge pointed at a temp root.

## Bridge (node --test; `console/test/*.test.mjs`)

**S0 scope note (H6 correction).** S0 realises **nine routes** — see `05 §2a`. The tests below marked **[S3]** / **[S4]** name routes that do NOT exist at S0 (`POST /api/repair`, `/api/backup`, `/api/run/daily`); they are specified here as contract intent and **land with their owning slice**, not as S0 exit evidence. S0's exit evidence is T-B1/B2/B3/B6/B7/B8/B9 + `bridge.hy4.structure.test.mjs` (which pins the exact route allowlist, so an unplanned route fails CI).

**Round-5 pass 1 added T-B19/T-B20/T-B21 (the write path) and corrected the suite's own count (`16 §14`, S1-H13).** `withFixture` was exported from `bridge.boundary.test.mjs`, and importing a module that calls `test(...)` registers its tests in the importing file — so the boundary suite ran once per importer and the suite reported **97 tests for 85 real ones**, at 20 s instead of 4.3 s. The harness now lives in `fixtures.mjs` (a non-test module) and the suite reports **93 real tests in 3.9 s**. **Any count quoted from this plan before 2026-09-19 is inflated**; use the per-file counts, not the aggregate.

**Round-5 pass 2 added T-B22 (`16 §15`, S1-H15/H16) → 99 bridge tests; pass 3 added T-W11 (`16 §16`, S1-H17/H18) → 48 web tests; pass 4 added T-B23 (`16 §17`, S1-H19) → 105 bridge tests.** Pass 3 is the first pass to touch the UI at all: the web slice's entire defence against a wrong-shaped payload was that **no component happened to throw on the payloads anyone had tried**, so a missing top-level key unmounted the React root and left a **blank console**. T-W11 now pins both layers — the adapter-seam validator and the error boundary — with two healthy-payload controls so neither can be satisfied by refusing everything. Pass 4 found that the body ceiling, the chunked path, invalid UTF-8 and an empty POST had **no coverage whatsoever**; T-B23 pins all four, plus the boundary itself from both sides.

| ID | Req | Level | Action → expected | Forbidden side effects |
|---|---|---|---|---|
| T-B1 | R2 | integration | `GET /api/status` on fixture store → 200 with every `StatusInstrument` field present and matching lib values | no store writes |
| T-B2 | R3 | integration | corrupt `registry.json` → `GET /api/status` **200** with `creators.damaged={file:'registry.json',detail}` (status does NOT 409 — H6b, see 05 §2a note) **and** `GET /api/creators` → `409 {code:STORE_DAMAGED, file:'registry.json'}`; an empty array is NEVER returned in place of the refusal | file left as-is |
| T-B3 | R4 | integration+unit | `POST /api/creators {ref:'@x'}` → 201 DISABLED; `PATCH …{enabled:true}` → 200; re-read shows ON (via second client) | no enable without explicit call |
| T-B4 **[S4]** | R7 | unit | `startDailyRun` with perHour 0 / -1 / 2.5 / NaN / '20x' → `400 VALIDATION`, nothing spawned | no child process |
| T-B5 **[S4]** | R7 | integration (backstop claim corrected 2026-09-20, A1-06/R2-06) | lock file present → `POST /api/run/daily` → `409 RUN_LOCKED` carrying holder; no second spawn; **rapid double-POST with no lock yet → exactly one child spawned (bridge single-flight mutex)**. **The engine lock is NOT a sufficient backstop** — `lib/run.mjs:107` writes the journal *before* attempting the lock at `:154`, so an external runner (the CLI, or a second machine against a synced store) is not covered by any console-side exclusion. The real gate is the two-process journal-preservation test (`19` §4) | single child max, and the journal is never interleaved or truncated |
| T-B6 | R9 | integration | `POST /api/restore|/api/rollback|/api/authorize` → **404** (route does not exist) | — |
| T-B7 | R13 | integration | server listens on 127.0.0.1 only (assert address); imports of `server.mjs`/`api.mjs` contain no non-builtin npm requires (grep assertion) | no external bind |
| T-B8 | R-invariant 1 | integration | `GET /api/brains/:slug` payload + all bridge-served fixtures pass the shape-based leak guard (`test/leak-guard.mjs`; 8+-word verbatim grep retained as a second signal) | no transcript file ever opened by handlers (fs spy) |
| T-B9 | R5 | integration | query with hits → `QueryResult` incl. `watchUrl` built from videoId+tStartMs; skipped rows carried, not dropped | — |
| T-B10 **[S3]** | R8 | integration (corrected 2026-09-20, R2-06) | repair → the **projected** engine result `{repaired, built, emptied}` agrees with the engine's own counts, and a concurrent run is refused `409 RUN_LOCKED {holder}` rather than interleaving the journal (a); canary reflects a stubbed `selfCheck` (b). **Backup is NOT tested here** — `POST /api/backup` has no endpoint (A1-08 / D4 still open) | no backup path exists, so none is exercised under temp root |
| T-B11 | R13 | integration | second bridge instance on the same store → refuses with "already running (pid)" (pid-file single-instance guard, `O_CREAT\|O_EXCL`) — two bridges must never write the store concurrently | store untouched by the refused instance |
| T-B12 | R15 | integration (lands with S7) | after the S7 snapshot: verify the copied tree's per-file SHA-256s equal the recorded manifest (snapshot.test.mjs) and the git tag exists; mismatch = transfer blocked | no mutation of the standalone original |
| T-B13 | R13 | integration (added at S0, H4/H6) | `Host` header not loopback / wrong port → **403 FORBIDDEN_HOST** on reads AND writes (DNS-rebinding gate, driven with `rawRequest` since undici overrides `host`); the exact nine-route allowlist is pinned positively | no handler runs on a refused Host |
| T-B14 | R2 | integration (round 2, H1) | health cache: a FAILED probe must not evict the store-history fallback on later reads; the reading is stable across the whole TTL and never presents a fallback as a fresh live probe | no re-probe inside the window |
| T-B15 | R6 | unit (round 2, H2) | leak guard has **no false negatives**: transcript content under ANY key name (size gate) and renamed/ single cue objects are caught — while `throttle.text`, `backlog.lines` and LANE C claim rows still pass | no false positives |
| T-B16 | R13 | integration (round 3, H3) | a second `startBridge` in one process is REFUSED (the pid file cannot stop it — same pid may re-claim); a clean shutdown and a FAILED bind both still free the slot; two concurrent starts → exactly one wins | one bridge per store per process |
| T-B17 | R3 | integration (round 4, S1-H1) | the **two-shape damage rule** (05 §2a): corrupt `state.json` → `/api/status` stays **200** with `state.damaged` set and every other instrument still readable (a–b), while `/api/backlog` **409s** naming the file (c); corrupt `registry.json` → `/api/status` stays 200 naming the file (d) and `/api/backlog` is unaffected (e); **no damage mode leaks a stack trace or internal error name** (f) | damage is always a reportable field or a refusal, never a 500 |
| T-B18 | R13 | integration (round 4, S1-H8) | **the request handler must be TOTAL.** Every malformed request target (`//`, `///`, `//@`, `//:80`, `http://`, `https://`, …) answers **400 VALIDATION** and the bridge is still serving afterwards (a); the **Host gate still runs before the target is parsed**, so a hostile Host is 403 and never reaches the parser (b); `parseRequestUrl` is total for good targets and raises a **typed** `ApiError(VALIDATION)` — never a raw `TypeError` — for bad ones, with the echoed target clipped (c). Sent over a **raw socket**: both `fetch` and `node:http.request` normalize malformed targets away, so a test written with either would pass against the broken code | one bad line costs one connection, never the process |
| T-B19 | R4 | integration (round 5 pass 1, S1-H9; **narrowed 2026-09-20, A1-13**) | **a non-2xx answer must mean nothing was written — for a CONFIRMED PRE-WRITE REFUSAL, and only that.** With `state.json` damaged, `PATCH /api/creators/:id` answers **200** and the registry row IS persisted, with `enabledAt` stamped (a); the row's counts are **`null`**, never `0` — a count that could not be taken is absent (b); repeated toggles each answer 200 and agree with the disk (c); a 409 that *does* happen is a **pre-write** refusal, so the registry file is byte-identical afterwards (d); with an intact store the counts are real numbers (e) | no post-commit throw: a confirmed refusal means nothing changed. **A bare "non-2xx" is NOT the invariant** — an uncertain outcome must never be reported as "nothing changed" (`19` §5) |
| T-B20 | R4 | integration (round 5 pass 1, S1-H10) | the body contract is "a JSON **object**": a literal `null` body → **400 VALIDATION**, not a 500, on both write routes (a); `42`, `"str"`, `true`, `false`, `[1,2]`, `[]` → 400 the same way, while an **absent** body still yields `{}` and keeps its own specific refusal (b) | no TypeError from a dereference; no 500 for a client error |
| T-B21 | R13 | integration (round 5 pass 1, S1-H11) | **no silent fallthrough outside `/api` either**: `POST`/`PATCH`/`PUT`/`DELETE`/`OPTIONS` on `/`, `/registry.json`, `/nope` → **404 NOT_FOUND** rather than 200 + the status page, while `GET` and `HEAD` still serve it | a method-agnostic 200 must not be able to hide a mistyped write path |
| T-B22 | R6 | integration (round 5 pass 2, S1-H15/H16) | **the LANE C read path must serve a published brain.** With a real published generation seeded, `GET /api/brains/:slug` → 200 with `index`/`topics`/`timeline` **non-empty** and `skipped: []` (a); a document absent from the generation is **reported** in `skipped`, not silently empty (b); a pointer naming no generation reports all three rather than rendering three blanks (c). **Containment, both directions:** `:slug` arrives **un-decoded** and `?creator=` arrives **decoded**, so every hostile form of each (`%2e%2e%2f`, `..%2F`, `%5C`, `%00`, the LANE B channel id, a 500-char slug) must refuse and must never carry the LANE B canary or a registry byte (d, e); the query route searches LANE C only, so transcript-only words return zero hits (f). `T-B7`'s invariant sweep gained the same hostile forms and a **live** published namespace, because it previously probed only 404 branches | LANE B is never served, in any encoding |
| T-B23 | R13 | integration (round 5 pass 4, S1-H19) | **the body ceiling, and the framing paths nothing had measured.** A body **at** the ceiling (64 KB) is READ — the boundary is `>` and not `>=` (a); one byte over is refused with the documented envelope (b); a 4 MB body cannot take the bridge down — it is still serving `200` afterwards (c); a body that is **not valid UTF-8** is a 400, not a 500 (d); a **chunked** body with no `content-length` is read normally (e); a POST with **no body** is a 400, never a 500 (f). The client's outcome for a body large enough that it is still writing when the limit trips is **deliberately not pinned** — it tracks the socket buffer (clean 400 at 512 KB, `ECONNRESET` at 1 MB), so asserting either would flake across machines; what is pinned is that the bridge refuses, stays within its memory bound, and keeps serving | the ceiling is a memory bound, never a crash; no framing path reaches a 500 |

**The non-2xx invariant is narrower than it reads (A1-13, corrected 2026-09-20 — R2-06).** T-B19's title used to be the unqualified "a non-2xx answer must mean nothing was written". That is **false in general**, and `19-held-findings.md` §5 splits it into two classes this plan must not conflate:

| Class | When it happens | What the console may say | Retry |
|---|---|---|---|
| **Confirmed pre-write refusal** | refused *before* any mutation was attempted — validation, unknown route, write-gate refusal, a damaged store read *before* the write | "Nothing changed." | Safe to retry |
| **Uncertain outcome** | the connection dropped, timed out, or the process died *after* dispatch | "The outcome is unknown." **Never** "nothing changed" | **Never automatic** — reconcile first |

**No mutation may be retried automatically after a timeout or a disconnect.** Reconcile against `GET /api/creators` and the engine's own journal, then decide — an automatic retry on an uncertain outcome is how one intended write becomes two. The assertions above cover the FIRST class only, which is why the title now says so.

## Web (vitest + testing-library; `console/web/src/**/*.test.tsx`)

**S1 scope note.** T-W1/W2/W3 **landed with S1** and are its exit evidence (`14-decisions-20260918.md` §4). T-W1 drives *both* adapters through the shared `mapBridgeError` and exercises the live adapter against a fake `fetch` serving the bridge's own routes, so "identical error mapping" cannot drift as one adapter is edited. T-W1 deliberately does **not** assert a shared client-side guard on `query.q` — 05 §2 scopes "both client and server" to `perHour` only, so that case is split into a server-refusal parity test plus a MockAdapter-specific guard test. T-W4–T-W9 land with their own slices.

**Round-4 review tightened two of these (`16-s1-hostile-review.md` §7–8).** T-W2 now scans **every** production file — not `tokens.css` alone — for the banned palette (hex *and* `rgb()` forms), and **self-checks its own patterns** against synthetic offenders, so a regex that stops matching fails the suite instead of passing it. The rule-4 cap walk now collects `.ts`/`.tsx`/`.css` alongside `.mjs` and carries a guard asserting it reaches `web/src`; before that it measured the bridge only, so **no UI file could ever breach the cap**. T-W3 additionally pins the three refusal branches (`creators`, `census`, `documents`) and the `publishedBrains` non-refusal. `useStatus` gained its own suite (T-W10) for the S1-H4 watchdog.

| ID | Req | Level | Action → expected |
|---|---|---|---|
| T-W1 | R12 | contract | `MockAdapter` and `LocalEngineAdapter` both satisfy a shared type/behavior suite (same fixture in → same shape out; error mapping identical) |
| T-W2 | R12 | static | grep: no file under `web/src` imports `scripts/creator-brains` (adapter is the only seam) |
| T-W3 | R2/R3 | component | StatusBoard renders fixture instruments; damaged → refusal banner with file name (never zeros) |
| T-W4 | R4 | component | Roster: add form validation, enable toggle calls adapter, optimistic-free re-read renders truth |
| T-W5 | R5 | component | Query: zero-hit copy names the terms; skipped ⚠ list renders; hit row shows ▶watch link with `?t=` seconds |
| T-W6 | R7 | component | RunConsole: invalid ops/hour refused client-side; RUN_LOCKED renders holder; polling loop stops on unmount |
| T-W7 | R10/R16 | component | reduced-motion (JS gate) → constellation renders static frame + roster equivalent present; WebGL-mocked-unavailable → fallback list |
| T-W8 | R11 | component | every panel's empty/loading/error/success states snapshot-tested (no "No data" strings anywhere) |
| T-W9 | R16 | a11y | axe smoke per panel; tab order; focus returns to constellation node/roster row after drawer close |
| T-W10 | R2/R3 | unit (round 4, S1-H4) | `useStatus`: a request that never settles is abandoned by the watchdog (mapped to `TRANSPORT`, **not** a new code); the latch is released so the next poll recovers; a late answer from an already-timed-out request is **discarded** by the generation guard rather than overwriting a newer reading |
| T-W11 | R2/R3 | component + unit (round 5 pass 3, S1-H17/H18) | **a payload of the wrong shape must produce a NAMED failure, never a blank console.** Layer 1 (adapter seam): the live adapter refuses a wrong-shaped 200 with a typed `ConsoleApiError` (d); it **names the offending path** when a nested field is bent — `body.backlog.lines: expected an array` (e) — and when exactly one top-level key is missing (f). Layer 2 (boundary): a wrong-shaped payload renders `console-fault` instead of unmounting the root, and the shell header **survives** — `document.body.textContent` still matches `/Creator Brains Console/` (a); a payload missing one nested key is caught the same way (b); so is an array field that is not an array (c); the boundary contains a throw from **any** child, not only `StatusBoard` (g). **Controls:** a healthy payload still renders the board through the mock (h) and survives the live adapter's validator (i) — the guard is not a blanket refusal |

## Three scene (deterministic; `console/web/src/three/*.test.ts`)

| ID | Req | Level | Action → expected |
|---|---|---|---|
| T-T1 | R10 | unit | `layoutBrains(brains)` pure: same input → same positions/sizes/colors; size ∝ videos, arc ∝ coverage, color per state map |
| T-T2 | R10 | unit | rAF controller: `document.hidden` → loop stops ≤1 frame; off-viewport (IntersectionObserver stub) → stops; remount → clean teardown (no leaked context) |

## E2E / visual (Playwright, stubbed API)

| ID | Req | Level | Action → expected |
|---|---|---|---|
| T-E1 | R1 | e2e | bridge boots from temp root → page loads → status board rendered (real bridge, real fixtures) |
| T-E2 | R14 | visual | widths 320/375/414/768/1024/1280/1440/1920/2560/3840/3440: no horizontal overflow, no overlap, no clipped critical text, 44px targets (matrix config like coach-mobile) |
| T-E3 | R10 | perf | **C1 contract (14 §3):** three chunk is fetched on **idle after the first successful status poll**, NOT on viewport enter (under CD3 the constellation is on screen at first paint, so viewport-enter is effectively eager); first paint ships the initial bundle with a static placeholder; **reduced-motion OR WebGL-absent → the chunk is never fetched at all**; DPR clamp ≤2; `performance.now()` frame samples ≤ 16.7ms median with 40 nodes |

## Commands (slice exit evidence runs these)

```powershell
# bridge — the console's own test directory, enumerated
node --test packages/creator-brains-console/test/*.test.mjs
# web
cd packages/creator-brains-console/web && npx vitest run && npx tsc --noEmit && npm run build
# e2e (stubbed api; never the real backend)
npx playwright test --config playwright.console.config.ts
```

**THE NON-LIVE SET IS ENUMERATED, NOT INFERRED (A1-14).** `live.test.mjs` is the engine's own
network-touching suite and lives under `scripts/creator-brains/test/`, not under the console — so the
bridge command above is already live-free **by scope**, not by exclusion. That is a property of where
the file sits, and it stops being true the moment someone writes a command that spans both trees.
Therefore:

- **Any command that globs `scripts/creator-brains/test/` MUST exclude `live.test.mjs` explicitly.**
  A `*.test.mjs` glob there **does** pick it up, and it will fail without network access — which reads
  as a broken suite rather than a live test being run by accident.
- **The console bridge suite's real count is per-file.** `16 §14` (S1-H13) records the inflation that
  came from a harness exported from a `.test.mjs`: importing a module that calls `test(...)`
  re-registers that file's tests, and the suite once reported 97 for 85 real. **Never quote an
  aggregate without checking per-file** — the aggregate is the number that lied.
- **As of 2026-09-20 the console suite is 137 tests, 0 fail** (`node --test` reports 137/137 in
  ~3.9 s). Any count quoted from this plan before 2026-09-19 is inflated.

**Explicitly NOT tested in v1 (honest gaps):** real YouTube network behavior (engine's live tests own that); multi-operator/auth; SwanGuard-side embedding (S7 handoff spec only); OCR/visual regression of the three scene beyond layout determinism.

**Also not covered, and named so it is not mistaken for done (A1-14).** `03-wireframes.md` draws
**414px only** — a 375px layout is undrawn, and undrawn means unverified. The motion budget is written
as "<5% visual energy", which is **not a measurable quantity**; it needs a definition before it can be
a contract. And `07-traceability.md` claims almost no mocks while the suite uses fake `fetch`, WebGL
and browser stubs — **which boundary each stub stands in for must be stated**, or the coverage claim
cannot be checked. Owners: 375px and the motion definition land with **S5**; the mock matrix is a
`07` amendment owed with the same slice.

```

### A/07-traceability.md — 39 lines

```
# 07 — Traceability — Creator Brains Console

Legend: status = **PLANNED** (no code yet) · **SOURCE BUILT** (implemented and unit-verified — the code exists and its unit suites pass, but no browser, filesystem, launcher or end-to-end pass has been re-run, so nothing here is VERIFIED) · **VERIFIED** (a slice exit was executed and observed). S0 and S1 are **SOURCE BUILT as of 2026-09-20**; the engine gate that previously blocked them is green (S1-H14 closed by executing D7 — see `18-d7-relocation-receipt.md`). Every requirement lands in exactly one primary slice; tests gate slice exit.

| Req | Acceptance criterion (see 01) | Artifact / component | Tests | Slice | Status |
|---|---|---|---|---|---|
| R1 standalone launch | .cmd → bridge → browser ≤15 s | `Creator Brains Console.cmd`, `server.mjs` | T-E1 | S0 (bridge) + S1 (shell) | SOURCE BUILT |
| R2 status board | instruments 1:1 with status-command sources | StatusBoard + `GET /api/status` | T-B1, T-W3, T-W10, T-W11 | S0/S1 | SOURCE BUILT |
| R3 damage honesty | refusal banner names file; never zeros | error envelope + RefusalBanner | T-B2, T-B17, T-W3, T-W10, T-W11 | S0/S1 | SOURCE BUILT |
| R4 roster mgmt | add→DISABLED; enable/disable persists | CreatorRoster + POST/PATCH | T-B3, T-B19, T-B20, T-W4 | S2 | PLANNED |
| R5 ask the brains | cited hits; honest zero-hit + skipped | QueryConsole | T-B9, T-W5 | S3 | PLANNED |
| R6 brain detail | published-generation only | BrainDrawer + `GET /api/brains/:slug` | T-B8 (boundary), T-B22, T-W5 pattern | S2 | PLANNED |
| R7 daily pass console | validated ops/hour; lock truth; honest verdict | RunConsole + POST /api/run/daily + poll | T-B4, T-B5, T-W6 | S4 | PLANNED |
| R8 canary/repair/backup | T2 ops in-console with results | OpsRail | T-B10 | S3 | PLANNED |
| R9 dangerous ops excluded | no route exists (404) | api.mjs route table | T-B6 | S0 (by absence, re-asserted each slice) | SOURCE BUILT |
| R10 constellation | data-driven; reduced-motion static; fallback | BrainConstellation | T-T1, T-T2, T-W7, T-E3 | S5 | PLANNED |
| R11 design law | tokens/44px/contrast/states/glow/tier badges | all components | T-W8, T-W9, design dual-pass | S6 | PLANNED |
| R12 adapter modularity | interface-only coupling; Mock≈Local | adapters/ | T-W1, T-W2 | S1 (interface), asserted every slice | SOURCE BUILT |
| R13 zero-dep bridge | builtins+engine only; loopback-only | server.mjs | T-B7, T-B13, T-B18, T-B21, T-B23, T-B24 | S0 | SOURCE BUILT |
| R14 responsive matrix | 11 widths clean | CSS/layout | T-E2 | S6 | PLANNED |
| R15 best-state snapshot | tag+copy+hashes before transfer | S7 procedure | snapshot hash check | S7 | PLANNED |
| R16 keyboard/a11y | full keyboard path; roster = constellation equal | all components | T-W9, T-W7 | S5/S6 | PLANNED |

**Coverage flags (honest):**
- R10's "60 fps on mid GPU" is budget-verified only on Sean's hardware in S5 exit — CI can assert frame-time in software GL but not his GPU; marked accordingly at exit.
- The SwanGuard embed (S7) is a handoff spec, not covered by SS-PT tests — the receiving repo owns its verification.
- Mock-only boundaries: none for engine reads/writes (bridge tests run the real lib functions against a real temp store); the ONLY mock-required seam is browser WebGL in T-W7.
- **R4 has NO test that can catch S1-H12 (event-loop starvation on `POST`).** The engine resolves a creator reference through `execFileSync` (`lib/ytdlp.mjs:184`), so one add freezes the bridge's only thread — measured 1577 ms for a failing lookup, ceiling 180 s — and no assertion in this plan observes latency. **The fix is additive and console-side, NOT an engine change (corrected 2026-09-20, R2-06).** The previous wording here claimed `addCreator` "must `await resolve(...)`", an engine change it said `deps.resolveCreator` could not supply. That was wrong, and it parked a console-side fix behind an engine decision it never needed: `lib/registry.mjs:109–112` contains the blocking call inside `addCreator`, which is an ordinary async function, so the console can run **that call** on a worker thread and hand the event loop back — the design A1-10 already proved for the health probe. The latency assertion then becomes constructible: the bridge must answer another route while the add is in flight, exactly as `health.offthread.test.mjs` A1-10b does for the probe. **S2 must resolve S1-H12 before it ships the add UI** (`16 §14`).
- **T-W11's coverage of the `main.tsx` mount point is partial, and deliberately so.** The test file renders `<App/>` directly (as every test in this slice does), so the boundary mounted in `main.tsx` around `<App/>` is not itself exercised by a render. The **mechanism** is: T-W11g mounts the boundary around a child that throws on sight and requires the fault panel and the thrown message. So the second mount is defence in depth resting on a proven mechanism, not an unverified guard — recorded so the next seat can tell the two apart.
- **Only `/api/status` is shape-validated at the adapter seam** (`adapters/validate.ts`, S1-H18). The other eight routes keep an unchecked `as T` cast, annotated in place, because no S1 component dereferences their payloads. **Each slice that adds a consumer must add its route's guard**; a route whose payload nothing reads is a contract nobody has tested yet.
- **S1-H19 is an ACCEPTED limitation, not a fixed one** (`16 §17`). An oversized body is refused and the bridge is unharmed, but for bodies larger than the socket buffer the client sees `ECONNRESET` instead of the documented envelope — the response is written and then lost to a RST while the client is still sending. T-B23 therefore pins the **safety** property (refuses, stays in its memory bound, keeps serving) and deliberately does **not** pin the client's status, which is buffer-dependent and would flake across machines. Closing it would require draining an arbitrary volume from a hostile client; that trade was measured and declined.
- **The static-file path is defended by THREE mutually redundant layers, so no single-layer mutation is observable** (`16 §18`, S1-H20). `new URL` normalisation in `parseRequestUrl`, `normalize()` in `resolveStatic`, and that function's containment check each cover for the others: removing any one leaves the suite fully green, and only removing all three makes anything fail. **This is a property of the design, not a gap** — but it means a reviewer cannot infer coverage from a single mutation. The resolver-level property is pinned by **HY4-H3** against a real document root (it *does* fail when both resolver guards go); **T-B24** pins the live-server half and is falsifiable only under the three-point mutation. Stated so the next seat does not mistake redundancy for an untested guard — or, as this pass briefly did, mistake it for a coverage hole.
- **`T-B12` was an ID collision** (`16 §18`, S1-H21): the plan and the gate reserve it for S7's snapshot verification (R15), while the code used it for the traversal test. The traversal test is now **T-B24**, traced to R13. Check for other collisions before S2 adds rows.
- **`T-B22` collided too, and the check above is why it was caught** (Astra round 2, R2-08). `T-B22` is reserved for R6's LANE C read path (`bridge.brains.test.mjs`), but the A1-09 write-gate tests added 2026-09-20 reused `T-B22a..l`. Those are now **`T-B26a..l`** (`bridge.writegate.test.mjs`), a range that was verified unused before assignment. **No suite count changed** — 137 bridge tests before and after the rename. Recorded here rather than in the plan table so the next seat sees the collision history in one place.
- ⚠️ **Round 2 of the Astra review constrains R6 and R13.** R2-02 and R2-03 found that containment covers the drawer's directories but **not** the whole read surface (`queryBrains` is called directly, and the generation guard lived inside a loop over possibly-empty hits), and R2-09 found the console's generation pattern rejected `gen-10000`, which the engine's `padStart(4)` can emit. Filing: `Z:\HostileReviews\2026-09-20-021203-creator-brains-console-astra-round-2.md`. **R6 cannot move to VERIFIED until one contained generation reader serves both the drawer and `/api/query`** — that is R2-02, still open. The 375px drawings and the mock matrix named earlier remain owed.
- **R2-03 and R2-09 are CLOSED, and the evidence is worth stating precisely.** Both live in `lib/brain-read.mjs`, extracted from `brains.mjs` in this pass so that the read path is testable at all. **R2-09** is now two-shape: `/^gen-(?:\d{4}|[1-9]\d{4,})$/` — four digits, or a leading non-zero digit followed by four or more. Mutation-verified in both directions and they are **orthogonal**: restoring `/^gen-\d{4}$/` fails `R2-09a` only; loosening to `/^gen-\d{4,}$/` (the naive fix) fails `R2-09b` only. **R2-03** is pinned by two tests that are likewise non-redundant: a second `readPointer` resolution fails `R2-03b` (structural) but **not** `R2-03a`, and reading claims from a lexically-first generation fails `R2-03a` (behavioural) but **not** `R2-03b`. **`R2-03a` does NOT construct the race** — the pointer cannot be moved between two resolutions without injecting a clock or a filesystem hook, so `R2-03b` is a **pin, not a proof**, and the file says so at the top. Do not cite it as behavioural evidence for atomicity.
- **R2-01 and R2-05 are CLOSED (2026-09-20), and R2-01 turned out to be FOUR drifts, not three.** Astra named `types.ts:16` (health provenance), `:85` (`generation`) and `:103` (`CanaryReading.source`); all three were real. **A fourth was found while fixing them, and it is the sharpest: A1-04 amended `05-contracts.md` to rename `BrainDoc.key` while the bridge went on serving `slug` and the types kept declaring `slug`.** For a full round the document, the declaration and the response disagreed in three directions and *nothing compared them* — because the web suite tests the client against its own fixtures, so a wrong declaration and a matching wrong fixture agree perfectly. Astra's ruling stands: **`slug` is the field name, holding a channel ID** — the route and the field are published, so renaming the response would be the breaking change, not the fix. **R2-05** made the Origin rule exact: `write-gate.mjs` accepted *any* loopback port, which is "same machine", not "same-origin", and it was the very defect the Host gate beside it had already been fixed for (`server.mjs:100`). The Vite-dev-server justification for the loose rule **did not survive contact with a browser** and protected nothing: a cross-origin custom-header request triggers a preflight the bridge never approves, and `vite.config.ts` has no proxy, so a dev write never reached the bridge anyway.
- **`T-B27` is the mechanism that keeps all four drifts closed, and it is why the fourth was found.** It reads `types.ts` AND `05-contracts.md` as **text**, extracts each interface's fields with a character scanner, and requires every non-optional declared field to exist on the live payload — then requires the two declarations to match **each other, field for field**. One side is derived rather than retyped, so there is no fourth hand-maintained list to drift. `T-B27a`/`T-B27d`/`T-B27f` exist because **two successive versions of the reader were wrong**: the first counted depth from the `interface` keyword and matched nothing (every comparison passed while comparing nothing, and `T-B27b` passed vacuously in the same run), the second read one field per line and invented divergences in a contract that packs several per line. Both were caught by the guards on the checker, not downstream. **Mutation-verified**: removing `generation` from the bridge fails `T-B27b` naming that field; reverting the contract to `key` fails `T-B27e` naming that field and that artifact.
- ⚠️ **NEW, ENGINE-OWNED, FOUND WHILE CLOSING R2-09 — the engine's own generator cannot advance past 9999.** `render.mjs:70-74` `nextGeneration` enumerates existing generations with `/^gen-\d{4}$/` and then emits `String(last+1).padStart(4,'0')`. The filter cannot see a five-digit directory, so once `gen-10000` exists it is invisible, `last` stays 9999, and **every subsequent publish returns `gen-10000` again**. Measured end-to-end through the real entry point — three consecutive `publishEmpty` calls all returned `gen-10000`, and the creator's directory held only `gen-9999` and `gen-10000` (**1 distinct generation of 3**). This is why R2-09's fix is necessary but not sufficient on its own: the console now correctly *accepts* `gen-10000`, while the engine can *produce* it exactly once and then silently overwrites it. **Not fixed here** — it is an engine file and the console is additive-only. It needs an owner decision, and it is not theoretical: it is a data-loss path at 10 000 publications.

```

### A/08-slices-operations.md — 34 lines

```
# 08 — Implementation slices & operations — Creator Brains Console

Each slice: independently shippable, RED→GREEN tests before merge-worthy state, entry/exit evidence recorded in the packet (09/README). Review route per slice (Mega Blueprints v3.1): glm-5.3 → glm-5.3-flash → gpt-6-astra (Astra seat currently blocked until 2026-09-19 ~22:12 — slices before S5 can proceed on GLM reviews with the gap recorded; Astra adjudication batched when the seat resets, Sean permitting).

| Slice | Deliverable | Entry criteria | Exit evidence | Depends on |
|---|---|---|---|---|
| **S0** | Bridge: `server.mjs` + `api.mjs` — **nine-route allowlist** (reads: `status`/`creators`/`run`/`canary`/`backlog`/`query`/`brains/:slug`; writes: `POST /api/creators`, `PATCH /api/creators/:id`) + loopback-only + `hostAllowed` DNS-rebinding gate + error envelope + T-B1/B2/B3/B6/B7/B8/B9 + structure suite | This packet plan-ready; engine suite green baseline recorded | `node --test` bridge suite green (RED observed first); curl-able JSON on fixture store; engine suite unchanged (additive only) | — |
| **S1** | Console web scaffold: Vite app, tokens.css (design.md §4 as `var(--token,#fallback)`), shell + StatusBoard + adapters (`ConsoleDataAdapter`, Local, Mock) | S0 exit | T-W1/W2/W3 green; `tsc --noEmit` 0; build ok; R2/R3 visible on real fixture store | S0 |
| **S2** | Roster + writes (add/enable/disable via engine functions) + BrainDrawer | S1 exit | T-B3, T-W4 green; drawer reads only published generation; damage paths banner | S1 |
| **S3** | QueryConsole + canary/repair/backup (OpsRail) — **adds `POST /api/repair` (deferred from S0; 05 §2b), on the SHARED run-operation exclusion gate**; `POST /api/backup` stays **visible but blocked, with NO endpoint** (A1-08 / D4 still open — `05` §2b) | S2 exit | T-B9/**B10**, T-W5 green; zero-hit + skipped honesty visible; repair answers `409 RUN_LOCKED {holder}` | S1 |
| **S4** | RunConsole: validated ops/hour, spawn, 2 s polling, RUN_LOCKED, verdict honesty — **adds `POST /api/run/daily` (deferred from S0; 05 §2b), on the SAME exclusion gate as S3's repair** | S3 exit | T-**B4/B5**, T-W6 green; run against temp store completes with real journal verdict; **two-process journal-preservation test** (`19` §4) | S1 |
| **S5** | BrainConstellation (per picked concept direction): layout fn, interaction, reduced-motion dual gate, WebGL fallback, lazy chunk | S2+ (roster = accessible equal) | T-T1/T-T2/T-W7 green; T-E3 budget measured; Sean has seen it (ideation follow-through) | S2 |
| **S6** | Design dual-pass + responsive matrix (T-E2) + a11y (T-W9) + performance budgets + hostile review round on the whole console | S1–S5 exit | qa-gates.md receipt; 11-width matrix evidence; rule 23 critique fixes applied and listed | S1–S5 |
| **S7** | **GATED on Sean's explicit go:** best-state snapshot (git tag + copied tree + hashes) → duplicate into SwanGuard-Newsroom with SwanGuardAdapter handoff spec | S6 exit + Sean's go | snapshot hashes recorded; SwanGuard-side build receipt lives in THAT repo | S6, Sean |

**No-go boundaries:** no slice may modify engine files (README pointer edit excepted); no slice may add a transcript-reading path; no slice may expose restore/rollback/authorize; no commit without the slice's exit evidence; no push to main (Render untouched).

## Operations

- **Launcher:** `Creator Brains Console.cmd` (Desktop): runs `server.mjs`, which **binds first, then opens the default browser itself** (no stdout-parsing race), prints `http://127.0.0.1:<port>` for the record; close the console window = stop bridge; store is on disk — crash-safe by design. **Single-instance guard:** a pid file under the store root; a second bridge refuses with "already running (pid)" (T-B11) so two consoles can never write the store concurrently.
- **S7 embed note:** the web app declares `react`, `react-dom`, `styled-components` as **peer externals** in library mode so SwanGuard never gets a second React copy.
- **Logs:** bridge writes a rolling `console.log` under `.ai-workflow/creator-brains/console/` (gitignored): requests, spawn/exit of daily child, refusals with reasons. Metrics = the store's own run journal (no parallel truth).
- **Upgrade/rollback:** console is additive — `git` revert of the console slice range + delete Desktop `.cmd` = full rollback; engine CLI remains the always-working fallback at every point in time.
- **Perf budgets watched in ops:** initial bundle ≤500 KB gz, three chunk ≤900 KB gz, API p95 ≤50 ms, bridge boot ≤1.5 s (re-checked at S6 and any dependency bump).

## Unresolved decisions that gate building (not implementation details)

1. **CLOSED 2026-09-17 — D-CD (Sean):** CD3 "Vault Observatory" picked. S5's shape is fixed; S0–S4 were direction-independent, as predicted.
2. **CLOSED 2026-09-20 — D-Astra:** adjudicated (verdict REVISE, 16 findings, D1–D9 closed — `17`). D7 was its one owner decision and is **executed**: the console now lives at `packages/creator-brains-console/` (`18`), which also returned the engine's C1 gate to 15/15 green.
3. **D-spend:** none — Astra rides the Codex subscription; no metered APIs in this plan.
4. **STILL OPEN — A1-08 / D4 (Sean):** whether an engine-only private backup is an allowed exception to the tier-B boundary. Backup stays visible but blocked, with no endpoint, until he rules (`05` §2b).
5. **STILL OPEN — S1-H12, but NO LONGER AN ENGINE QUESTION (corrected 2026-09-20, R2-06):** `POST /api/creators` freezes the bridge's only thread (1577 ms measured, 180 s ceiling) because `addCreator` resolves the channel through `execFileSync` (`lib/ytdlp.mjs:184`). This note used to end "the honest fixes touch the engine, so it is Sean's call". **That was wrong, and it was blocking a console-side fix behind an engine decision it never needed.** `lib/registry.mjs:109–112` shows the blocking call is contained inside `addCreator`, which is an ordinary async function — so the console can run **that call** on a worker thread and hand the event loop back, exactly as A1-10 already does for the health probe. No engine file changes; the fix is additive and console-side. **Must be settled before S2 ships** (`16` §14).

**Relocation note (D7, 2026-09-20):** every console path in this document is now relative to `packages/creator-brains-console/`, not `scripts/creator-brains/console/`. The no-go boundary above is unchanged and now structurally stronger — the console sits outside the engine tree, so "no slice may modify engine files" is enforced by *where the code lives*, not only by discipline. `console/` in the Logs bullet is the runtime state directory under the store, which did not move.

```

### A/10-astra-cost-and-value.md — 199 lines

```
# 10 — Astra consult: what it costs, and what it is worth

- **Date:** 2026-09-17 · **Question answered:** *"give me an idea how many credits an astra review would take on this"*
- **Status:** ⚠️ **HISTORICAL as of 2026-09-20 (R2-10).** This is a receipt of what was believed and measured on **2026-09-17**, not a current estimate — and not a statement of remaining allowance.
- **The cost model is [VERIFIED] against this repo's own routing doc and harness code; the token volumes are [ESTIMATE] with the arithmetic shown so you can check it.**

---

> ### ⚠️ HISTORICAL — the usage PREDICTIONS below are SUPERSEDED (2026-09-20, R2-10)
>
> **The billing observations stand as recorded.** Astra really does ride the Codex 20x subscription at
> **$0 metered**, and that was verified against this repo's routing doc and harness code on 2026-09-17.
> Nothing in this banner rewrites them, and nothing here should be re-read as a forecast.
>
> **The per-pass token predictions are superseded and must not be quoted.** §1's "≈ 75k tokens of plan
> usage" and §3's "~20k per pass" — which §6 repeats — **disagreed with each other by nearly 4× when
> both were written**, and neither can be verified from inside the session that produced it: token
> volume is not observable from a `codex exec --json` event stream, whose event set carries no usage
> field. They are **left in place deliberately** — deleting them would erase the evidence that they
> were made, which is the thing the next reader most needs to know. They are evidence, not inputs.
>
> **This document makes NO claim about remaining allowance**, and no reader may infer one from the
> subscription being named. Usage is a rolling rate limit whose state is visible only to the seat.
> `19-held-findings.md` §6 (A1-16) records the certification defect this banner corrects, and the
> README carries the supersession.

---

## 1. The short answer

**Astra costs you $0 in credits.** It does not draw on a credit balance at all —
it rides the **Codex $200/month 20x subscription**, and the only thing it
consumes is **plan usage**, which is metered as a rate limit and a rolling
window, not as a dollar or credit figure.

So the honest answer to "how many credits" is: **none — but it is currently
blocked by the plan's usage limit, and the limit resets 2026-09-19 22:12.**

What you actually spend on this call is **≈ 75k tokens of plan usage** in one
shot (see §3), against a 20x seat. That is the number that matters, because it
is the number that determines whether the call succeeds or bounces.

| Fact | Value | Evidence |
|---|---|---|
| Billing model | Codex **$200/mo, 20x usage** — flat rate | `PROVIDER-SUBSCRIPTION-ROUTING.md` §"The stack", Astra row [VERIFIED, Sean-stated tier math: $100 tier = 5x] |
| Metered per-token cost | **$0** — no metered fallback in the harness | `consult-codex.mjs` header: *"Local, read-only harness around the authenticated Codex CLI. This file has no .env loader, network client, or metered fallback."* [VERIFIED] |
| Current blocker | **Seat usage-limited until 2026-09-19 22:12** | Direct provider response, recorded in 09 §3 [VERIFIED 2026-09-17] |
| Spend-guard gate | **Does not fire on Codex** — the gate intercepts only `consult-fable\|sol\|kimi\|grok\|muse\|panel` | `scripts/hooks/spend-guard-gate.mjs:73` INVOCATION regex [VERIFIED] |
| Cost of the failed attempt | **$0 and ~0 plan usage** — died at flag-parse, before any provider call | 09 §3 [VERIFIED] |

---

## 2. Why "credits" is the wrong unit here, but the concern is right

Three separate things get casually called "credits" in this repo, and conflating
them is how the ~$100 OpenAI API overrun happened (per the routing doc's
non-negotiable #1):

1. **Codex plan usage** — what Astra burns. Flat-rate; shows up as a rate limit
   ("try again Sep 19th"), never as a bill. **This is the one that applies.**
2. **GLM coding-plan credit** — Z.ai's meter (2,000/5h, 10,000/wk for scripted
   seats). Applies to the GLM review lane, not Astra.
3. **OpenRouter dollars** — per-token money. Applies to HY4, Kimi, Fable, Sol.
   **Does not apply to Astra.**

The failed attempt cost nothing because it never reached a model. The **re-fire
will** consume real plan usage, and that is the thing to size correctly.

---

## 3. The size of one Astra review on THIS packet — the arithmetic

The single authorized call sends a 6-file packet. Measured inputs:

| Component | Chars | Est. tokens (÷4) |
|---|---|---|
| `00-consult-brief.md` | 10,984 | 2,746 |
| `README.md` | 3,385 | 846 |
| `01-requirements.md` | 7,825 | 1,956 |
| `02-blueprint.md` | 9,951 | 2,488 |
| `05-contracts.md` | 6,931 | 1,733 |
| `09-hostile-review.md` | 5,686 | 1,422 |
| **Files subtotal** | **44,762** | **11,191** |
| Prompt + protocol wrapper | — | ~500 |
| **Total input** | | **≈ 11,700 tokens** |

[ESTIMATE — the packets are read from disk; the ÷4 ratio is the repo's own
working heuristic, and `consult-codex.mjs` caps a single file at 60,000 chars and
the whole diff at 200,000, so this packet is comfortably inside the harness's
own limits. VERIFIED: no file in the set is truncated.]

Output side. The v3.1 footer caps a consult at **≤8,000 output tokens** and
**≤600 s**, one in flight (`PROVIDER-SUBSCRIPTION-ROUTING.md` §Recovery rules
[VERIFIED]). A Mega-Blueprints adjudication is a long document, so assume it uses
most of that ceiling rather than a chat-length reply:

| Output assumption | Tokens |
|---|---|
| Typical adjudication | ~4,000 |
| At the v3.1 cap | 8,000 |

**One Astra review on this packet ≈ 11,700 in + ~4,000–8,000 out ≈ 16k–20k
tokens of plan usage.** Round it up and call it **~20k per pass.**

### What that means against the seat

The 20x seat's limit is a rolling window, not a per-day byte meter — which is why
the failure mode you actually hit was a *time* refusal ("try again Sep 19th"),
not a truncation. The practical read:

- **One review is cheap in plan terms.** ~20k tokens is a normal-sized Codex turn;
  this is not a heavy ask for a 20x seat.
- **The pending call is ONE call, not a panel.** The existing packet is built as a
  single adjudication pass. It cannot run away into four calls unless someone
  deliberately fires four — which is exactly the per-call-vs-cumulative lesson
  the spend guard was written for, and why the "exactly one, no auto-retry"
  discipline is recorded in 09 §3.
- **If it were metered (it is not),** the same call at Sol Pro's $2.50/M in /
  $15/M out would be ≈ $0.03 in + $0.06–0.12 out ≈ **$0.09–0.15**. That is the
  number to keep in your head as the "what it would have cost on an API" figure.
  It is not what you pay.

---

## 4. What you get for it — and whether it is worth firing

The one authorized call is an **architecture adjudication**, not a review of the
code. Its remit is to accept, reject, or rewrite the seed decisions **D1–D9** in
02 §5 — `raw three.js` vs `@react-three/fiber`, zero-dep `node:http` bridge vs
Vite middleware, polling vs SSE for run progress, the v1 command scope, token
mode, the standalone shell, the in-repo home, the embed contract, and the
constellation's idle-motion budget.

**My honest recommendation: fire it, but fire it at the right moment.**

- The three.js slice (**S5**, now CD3-shaped) is the one place where an Astra
  overturn would cost real rework — it is the only slice whose design the
  adjudication could plausibly change.
- Everything before S5 (S0–S4) is direction-independent by construction. S0 is
  already built and green. So an adjudication landing *after* S0–S4 and *before*
  S5 gets you the maximum decision value for the minimum rework risk.
- The seat resets **2026-09-19 22:12**. Firing before then is guaranteed to
  bounce and burn the one authorized attempt on a rate-limit error. **Do not
  fire early.**

### The window, stated plainly

| When | What happens |
|---|---|
| Now → 2026-09-19 22:12 | Seat refuses. Firing wastes the authorized attempt on a limit error. |
| After 2026-09-19 22:12 | Fire the single call — harness is already repaired and pinned (10/10 in `swan-council-subscription.test.mjs`). |
| Any time | S0–S4 are not blocked by this. Only S5 waits on it. |

---

## 5. The gap this leaves right now, and how it is covered

Because the Astra seat is both **flag-blocked** (now repaired) and
**usage-limited** (until Sep 19), this packet's seed decisions currently carry
**no independent adjudication**. The rule-46 unavailability fallback applies, and
the honest state is recorded rather than papered over:

- 09 §1 carries the builder's own hostile pass (H1–H10).
- The **HY4 independent review** now stands in as the external lens on S0
  (verdict recorded in `11-hy4-review.md`). HY4 is a *different* model family
  from the builder, which is the property that makes its findings worth
  something — per this repo's own recorded lesson, a builder's tests encode the
  builder's assumptions. It returned **REVISE** with 7 findings, all now closed;
  it also cost **$0.056**, which is the real price of an independent lens on this
  packet today.
- **D1–D9 remain recommendations, not adjudications.** Any slice that touches a
  D-decision before Astra lands is doing so on the builder's judgment, and should
  say so in its receipt.

---

## 6. If you ever DO want a metered second opinion on the architecture

For completeness, since the question "how many credits" usually means "what does
this cost me somewhere":

| Seat | Billing | Cost on this 6-file packet (~11.7k in, ~6k out) |
|---|---|---|
| **Astra (gpt-6-astra)** | Codex 20x subscription | **$0 metered**; ~20k plan tokens |
| HY4 (`tencent/hy4-preview`) | OpenRouter | **≈ $0.056 measured on this packet** (11 §1: one $0 transport failure + one $0.0563 billed call) |
| DeepSeek V4.1 Flash | Metred API, $5/mo cap | ≈ $0.002–0.004 |
| Kimi K3 | OpenRouter | ≈ $0.13 |
| Sol Pro | OpenRouter | ≈ $0.12 |
| Fable 5 | OpenRouter | ≈ $0.42 |

[HY4 and Fable figures grounded in this repo's `.ai-workflow/spend/ledger.jsonl`;
others are the panel registry's own `inPerM`/`outPerM` rates applied to the same
token volume.]

**The useful ordering:** Astra is free-at-the-margin and the architecture
authority, so it goes first once unblocked. HY4 is the cheap independent lens for
catching what a builder's tests structurally cannot. Nobody needs Fable on this
until there is a genuine disagreement to arbitrate — Fable's value is
*arbitration*, not one more opinion.

```

### A/19-held-findings.md — 178 lines

```
# 19 — Held findings: corrections and what is still owed

**Status:** amendments applied 2026-09-20 · **amends:** `05`, `06`, `README` · **does not amend:**
`11`, `12`, `14`, `16`, `17-astra-*` (historical receipts — see §6)

---

## 1. What this document is

The Astra adjudication (`17-astra-adjudication.md`) returned **16 findings**: 5 fixed in that pass and
**11 held** with named owners. This document is the record of the second pass, where **five of the
eleven were closed** and the remaining six had their corrections written down.

**A finding without a fix is not a finding.** So each entry below states the correction, where it
landed, and — where the work is genuinely owned by a slice that does not exist yet — what the slice
must prove. An entry that says "noted" and nothing else is a failure of this document, not a
disposition.

| # | Finding | Severity | Disposition | Where it landed |
|---|---|---|---|---|
| A1-03 | Adapter contract lost implementation corrections | High | **CLOSED** | `05 §1` (rewritten), `web/src/adapters/types.ts`, `fixtures.ts` |
| A1-04 | Drawer has no claims; identifier misdescribed | High | **CLOSED** | `lib/brains.mjs`, new `lib/hits.mjs`, `05 §1`, tests A1-04a–d |
| A1-05 | Acceptance and completion lack correlation | High | **AMENDED** | `05 §1` `startDailyRun`; proof owed by S4 |
| A1-06 | A console mutex cannot protect the shared journal | High | **GATED** | §4 — S4 cannot ship without the two-process test |
| A1-07 | Repair is not the documented operation | High | **AMENDED** | `05 §1` `repair()`; proof owed by S3 |
| A1-13 | "Non-2xx means nothing changed" is too broad | High | **AMENDED** | §5 — the two failure classes are now distinct |
| A1-14 | Tests and visual contracts leave material gaps | Medium | **PARTLY CLOSED** | `06` §3; 375px drawings owed by S5 |
| A1-16 | Attribution and cost claims disagree inside the packet | Low | **CLOSED** | `README` §Evidence; §6 |

---

## 2. A1-03 — the contract now says what the code does

`05 §1` declared **numeric** creator counts, **omitted** brain generation, and **narrowed** canary
provenance to `{ok, version, reason}`. All three were narrower than the shipped implementation, which
is the direction of error that makes a document worse than useless: a reader trusts it and stops
looking.

- `CanaryReading` is now a named type carrying `checkedAt`, `ageMs`, `source`, `stale`, `note`.
  **`source` is three-valued and `unknown` is a real value, not an absence** — since A1-10 the
  production probe runs off the event loop, so a cold read has started a probe and has no verdict
  yet. Reporting that as `source:'probe'` would present "we have not checked" as a live reading.
- `CreatorRow.videos`/`fetched` are `number | null`. `null` means the count **could not be taken**;
  `0` means it was taken and is zero. The distinction is the whole point: a guard value presented as
  a measurement renders "0 videos" for a creator that has videos.
- `BrainDoc` carries `generation` — the pinned generation the markdown **and** the claims both come
  from.
- `QueryHit` declares `statement` and `topic`, which **both routes already served**. The type
  under-declared them, and `web/src/adapters/fixtures.ts` had been written to the narrow type, so the
  fixture was missing two fields the server returns. `tsc` caught it the moment the type was widened
  — which is the argument for publishing corrected types rather than leaving them aspirational.

**A1-03 also demanded "validate every newly consumed response".** `parseStatusInstrument` already
does this for `/api/status` (S1-H18); the remaining routes are covered in `web/src/adapters/validate.ts`
and the scope decision is recorded there.

---

## 3. A1-04 — the drawer serves claims, and the key is a channel ID

`brainDoc` returned `claims: []` **unconditionally**, while `03-wireframes.md` promised a claim
drawer and `types.ts` declared `claims: QueryHit[]` with a fixture that populated it. The client was
ready, the contract was published, and the server was a stub — an empty drawer that renders as "this
creator claimed nothing", which is the **S1-H15 shape** this route has already been burned by once.

- Claims are read from the **same pinned generation as the markdown**, through the engine's own
  `loadHits` — not a second reader of `rules.jsonl`, which would drift from that function's
  required-field list and skipped accounting.
- `loadHits` resolves the generation from the pointer *again*, so each returned row's generation is
  checked against the one containment already proved. A pointer that moved between the two reads
  cannot smuggle an unvalidated directory in.
- A generation with no `rules.jsonl` **reports it** in `skipped`, in the same `{file, reason}` shape
  the three markdown files use. Empty **and** explained.
- `getBrain(channelId)` — not `slug`. `lib/render.mjs` HR07 is explicit: "the storage namespace is the
  CHANNEL ID, never a display name." `slugify` exists in the engine but produces *filenames* for other
  surfaces; it does not name a brain namespace.

**One deliberate divergence, pinned rather than hidden.** The drawer reads the raw row and carries the
engine's real `claim_id`; `/api/query` reaches the shape through `queryBrains`, which **drops**
`claim_id`, so it falls back to `${videoId}:${tStartMs}` — an id that **collides** for two claims in
one video at the same millisecond. Discarding a correct identifier so that two routes can be wrong
together is worse than one route being visibly better, so the drawer keeps the real id and
`bridge.brains.test.mjs` **A1-04b asserts both values explicitly**. Every other field is asserted
identical, field for field.

> **New observation, engine-owned.** `queryBrains` does not pass `claim_id` (or a creator title)
> through, so `/api/query` cannot serve either. Fixing it is an engine change, which S0's
> additive-only boundary forbids here. **Owner: engine.** No console patch should work around it
> twice.

---

## 4. A1-05 / A1-06 / A1-07 — the run and repair contracts

**A1-05 — acceptance is not completion.** `startDailyRun` now returns
`{requestId: string, runId: string | null}`. The engine's `run-daily.mjs` does not accept a
caller-supplied run id, so an honest `runId` cannot exist at acceptance. The console returns its own
`requestId` immediately, correlates the child process to an engine journal entry, and uses **that**
entry's run id. **Never treat process exit, or a lock disappearing, as success.**

**A1-06 — a console mutex cannot protect the shared journal.** `lib/run.mjs:107` writes the journal
*before* attempting the engine lock at `:154`, so the console's own exclusion does not cover an
external runner (the CLI, or a second machine against a synced store). `09#H1` called the lock a
sufficient backstop; it is not.

> **S4 GATE.** S4 cannot ship until a **two-process journal-preservation test** passes: two runners
> against one store, asserting the journal is never interleaved or truncated. If it fails, the defect
> goes to the **engine owner**. No console patch to engine files — the boundary is additive-only.

**A1-07 — repair is a projection, not a return value.** The engine's repair path
(`run-commands.mjs:156–163`) runs reconciliation, build and export and returns an **exit code**. It
does not return `{requeued}`, which `05#2b` and T-B10 assumed. The console now documents
`repair(): Promise<{repaired, built, emptied}>` — a **projected** engine result, produced by invoking
the same `runDaily` configuration through a wrapper and sharing the run-operation exclusion gate with
`startDailyRun`.

---

## 5. A1-13 — two failure classes, not one

`16#S1-H9` correctly prohibits a post-write application refusal: a committed mutation must never be
reported as refused. But that rule **cannot** be extended to "non-2xx means nothing changed" in
general, because two situations are not the same thing:

| Class | Meaning | What the console may say | Retry |
|---|---|---|---|
| **Confirmed pre-write refusal** | The request was refused *before* any mutation was attempted — validation, unknown route, refused write gate, damaged store read *before* the write | "Nothing changed." | Safe to retry |
| **Uncertain outcome** | The connection dropped, timed out, or the process died after dispatch | "The outcome is unknown." **Not** "nothing changed" | **Never automatic** — reconcile with an authoritative read first |

The distinction is now part of the contract, and the rule that follows from it is absolute:
**never automatically retry a mutation after a timeout or disconnect.** Reconcile with
`GET /api/creators` and the engine's own journal, then decide. An automatic retry on an uncertain
outcome is how one intended write becomes two.

---

## 6. A1-14 / A1-16 — the gaps this document does not close

**A1-14 — three gaps, one of them closed.** `06 §3` now **enumerates** the non-live tests explicitly
rather than relying on a glob that reads as if it excludes them. Still owed, and named so they are
not mistaken for done:

- **375px layouts.** `03-wireframes.md` draws 414px only. A console on a phone-width window is
  undrawn, and undrawn means unverified.
- **A measurable motion limit.** "<5% visual energy" is not a number anyone can check. It needs a
  measurement definition before it can be a contract.
- **A boundary-specific mock matrix.** `07` claims almost no mocks while the suite uses fake fetch,
  WebGL and browser stubs. Which boundary each stub stands in for must be stated, or the coverage
  claim is unfalsifiable.

**A1-16 — attribution and cost.** The README certified HY4 as an independent review while `12#Attribution`
records the correction. The README now marks the **served identity unverified** and points at `12`.

⚠️ **CORRECTED 2026-09-20 (R2-10).** This paragraph previously certified that "**predictive
subscription-usage claims were removed**". **They were not removed.** `10#1`'s "≈ 75k tokens of plan
usage", `10#3`'s "~20k per pass" and `10#6`'s repetition of the ~20k are **all still in `10`**. An
amendment that certifies an edit nobody made is worse than the original claim, because it tells the
next reader the question is closed. The two figures disagreed with each other by nearly 4× when
written, and neither can be verified from inside the session that produced them.

**`10` is now classified HISTORICAL at its header**, where its usage predictions are explicitly
superseded; the README carries the same supersession. Its **billing observations are left as
recorded** — they are not rewritten — because they were verified against this repo's routing doc and
harness code and remain true. **This document, and `10`, make no claim about remaining allowance.**

---

## 7. What this document does NOT establish

1. **No new hostile pass.** Everything here is the *disposition* of a review; the round-2 pass against
   the rebuilt packet is what re-tests it.
2. **No claim that the held items are fixed.** Five are closed with tests; the rest carry a gate or a
   named owner. `A1-06` in particular is a **gate on S4**, not a fix.
3. **No engine change.** Every correction here is console-side or documentary. The one item that needs
   the engine — `queryBrains` dropping `claim_id` — is recorded with the engine as owner.
4. **Historical receipts are untouched.** `11`, `12`, `14`, `16`, `17-astra-*` keep their stale paths
   and counts on purpose: they are evidence of what was true when they were written. Correcting them
   would destroy the record that makes the current state legible.

```

### A/README.md — 71 lines

```
# Creator Brains Console — Mega Blueprints planning packet

- **Date:** 2026-09-17 · **Updated:** 2026-09-20 · **Status:** S0 + **S1 SHIPPED** (structural gate PASS; console suite **105/105 real tests**, S1 web **48/48** after the round-4 fix pass and the full round-5 five-pass sweep) · **Builder seat:** ZCode/GLM, then builder seat (Sable) · **Astra adjudication: COMPLETE 2026-09-20** — verdict **REVISE**, 16 findings (10 high); D1–D9 closed, verdicts in **`17-astra-adjudication.md`** · **D7 EXECUTED 2026-09-20** — the console now lives at `packages/creator-brains-console/`, and the engine gate is **15/15 green** (see **`18`**)
- **What this is:** the canonical plan for replacing the Creator Brains terminal menu with a Swan-designed, three.js operator console — **standalone first** (Desktop `.cmd`, loopback bridge, browser), then **duplicated at its best state and transferred** into SwanGuard-Newsroom (`@family-first/web`, React 18 + styled-components) as a modular adapter-driven component. Purely additive: the engine (`scripts/creator-brains/`) is untouched, and since 2026-09-20 the console sits **outside** it at `packages/creator-brains-console/`.
- ** Sean decisions pending:** (1) **"go" for S2** (roster + writes + BrainDrawer) — S1's exit criteria are met; (2) **the `server.mjs` cap call** — **CLOSED 2026-09-19**: the bridge was split at the route-table seam into `server.mjs` 244 + `routes.mjs` 131 + `api.mjs` 77 (**16 §19**), so rule 4 no longer binds anywhere and S2 needs no cap decision; (3) **the Astra D1–D9 adjudication** — **CLOSED 2026-09-20**: adjudicated, verdict **REVISE**, 16 findings; **D7 was the only owner decision it produced, and it is now EXECUTED** — the console moved out of the engine tree to `packages/creator-brains-console/`, receipt in **`18`**; (4) **S1-H12 — `POST /api/creators` freezes the bridge's only thread** (measured 1577 ms, ceiling 180 s), unfixed because the honest fixes touch the engine (16 §14); (5) **S1-H14 — FIXED 2026-09-20 by D7.** The engine gate was RED because `consistency-check.mjs` walked `console/web/node_modules` and measured `decimal.js` as if it were ours (16 §14, A1-01). Relocating the console out of the engine tree returns the gate to **15/15 consistent** with **no engine file touched** — the walk now sees 85 real engine sources instead of 184. Receipt + per-file manifest: **`18`**. **Closed 2026-09-18:** CD3 locked; C1 loading contract; S1 authorised and shipped; the 24 dangling skill symlinks repaired; the S1 hostile review round 4 (8 defects, all fixed). **Closed 2026-09-20:** the Astra adjudication (D1–D9, `17`); the cap call above; the `02 §6` viewport-loading claim (superseded by `14 §3`, now marked in place). **Superseded 2026-09-19:** the "F4 baseline of record = 183/183" and the "console suite 97/97" figure — see (5) and **16 §14** (S1-H13: the 97 was 85 real tests counted 3×). See **14**, **16** and **17**.

## Read order

| File | Part |
|---|---|
| `00-consult-brief.md` | the brief sent to Astra (attempt recorded in 09 §3) |
| `01-requirements.md` | R1–R16, acceptance criteria, invariants, non-goals |
| `02-blueprint.md` | topology, components, integration seams, concept directions, D1–D9, budgets, rollback |
| `03-wireframes.md` | ASCII desktop + mobile + full state matrix |
| `04-flows.md` | mermaid: daily pass, add→enable→build, query, failure/rollback, S7 transfer |
| `05-contracts.md` | `ConsoleDataAdapter`, bridge HTTP API + error envelope, data-truth map, trust boundary |
| `06-test-plan.md` | T-B/T-W/T-T/T-E suites, RED-first, isolated resources |
| `07-traceability.md` | R → AC → artifact → test → slice |
| `08-slices-operations.md` | S0–S7 with entry/exit evidence, launcher ops, no-go boundaries |
| `09-hostile-review.md` | self-hostile pass (H1–H10), decision log, Astra record, readiness verdict |
| `11-hy4-review.md` | hostile review round 1 (verdict REVISE), findings + dispositions, remediation receipt, spend — ⚠️ **MISATTRIBUTED: almost certainly Hy3, not HY4** (see `12 §Attribution`); findings stand |
| `12-hy4-review-round2.md` | round-2 deeper pass (H1 failure-caching, H2 leak-guard false negatives, F2/F3/F4, C1); F1 retracted as the builder's own error. **Performed by the builder seat, not HY4** |
| `13-hostile-round3.md` | round-3 dry loop (H3 in-process double-bridge, H4 counter bug) + the CLEAN surfaces that closed the loop |
| `14-decisions-20260918.md` | **the six decisions taken 2026-09-18** (symlink repair, F4 baseline, C1 contract, S1, Astra, S5) + H5 |
| `15-astra-brief.md` | the D1–D9 adjudication brief — the nine questions as posed to Astra (297 lines) |
| `16-s1-hostile-review.md` | **round-4 hostile review of S1** (S1-H1…H8: the 500 landmine, three false-zero renders, the wedged poll loop, fixture infidelity, two guard tests that could not fail, and a **one-line request that killed the bridge process**) + mutation receipts |
| `17-astra-adjudication.md` | **the adjudication of record** — Astra's D1–D9 verdicts, the 16 findings, the fix ledger, the artifact redaction |
| `17-astra-mega-packet.md` · `17-astra-mega-reply.md` · `17-forged-package/` | the Mega Blueprint consult: input packet (17 docs), raw reply + receipt, split package (12 files) |
| `18-d7-relocation-receipt.md` | **D7 EXECUTED** — console → `packages/creator-brains-console/`; per-file manifest, repairs, gate before/after |
| `19-held-findings.md` | **the second pass** — 5 of the 11 held findings closed with tests, the rest gated with named owners, and what this document does NOT establish |
| `readiness.json` | structural receipt — **gate PASS** (`check-readiness.mjs`, exit 0) |
| `evidence/` | engine offline baseline + preservation manifest |

## Receipts (honest, this session)

- **Engine baseline [VERIFIED]:** documented offline command, 15 files → **136 tests / 136 pass / 0 fail**, exit 0 (`evidence/baseline-offline.txt`, HEAD `8a9daeeba` era tree, uncommitted docs only). Observation: README cites 191 at commit time (Sep 15) — delta noted for the engine lane; not a console blocker.
- **Astra consult [VERIFIED]:** one authorized attempt → `codex_exec_failed` before any provider call (harness passed `--ask-for-approval`, **removed in codex-cli 0.154.0**). Harness repaired + pinned by tests (**10/10 green**); follow-up probe reached the provider and hit the seat's usage limit ("try again Sep 19th, 10:12 PM"). No auto-retry (exactly-one). Detail: 09 §3.
- **Readiness gate [VERIFIED]:** `node scripts/build-protocol/check-readiness.mjs <receipt> <packet>` → `structurallyReady: true`, exit 0. Reference integrity only.
- **HY4 hostile review [FINDINGS VERIFIED · ATTRIBUTION CORRECTED — A1-16]:** the **served identity is unverified and must not be restated as independent HY4 work.** Round 1 (`11`) is **misattributed**: its transport hard-blocked everything except `tencent/hy3`, so its findings were almost certainly produced by **Hy3 under HY4's name**. Round 2 (`12`) was performed by the **builder seat**, not HY4 — three paid HY4 attempts billed with **zero output**. **The findings stand; the attribution does not.** Verdict REVISE, 7 findings, all 7 closed + 1 additional defect found during remediation (per-request blocking `selfCheck()`). Console suite at the time: **65/65, 0 fail**. Cost **$0.0563**. Detail: **11**, **12 §Attribution**.
- **S0 bridge [VERIFIED — SHIPPED · RELOCATED 2026-09-20]:** `packages/creator-brains-console/**` — nine-route allowlist, loopback-only bind, `hostAllowed` DNS-rebinding gate, `O_CREAT|O_EXCL` single-instance guard, 60 s TTL health cache. Moved out of the engine tree by **D7** (see `18`). Additive-only still holds and is now *structurally* true: `git status --porcelain scripts/creator-brains/` shows no console entry at all, because the console is no longer inside that path. Post-move: bridge **105/105**, web **48/48**, `tsc` 0, build clean.
- **CD3 LOCKED (Sean, 2026-09-17):** concept direction = **CD3 "Vault Observatory"** — split view, three.js constellation left / operations deck right, one short entry dolly, skipped under `prefers-reduced-motion`. Gates S5 only; S0–S4 are direction-independent.
- **S1 web scaffold [VERIFIED — SHIPPED 2026-09-18]:** `console/web/**` — Vite + React 18 + styled-components, `tokens.css` (design.md §4 verbatim), `ConsoleDataAdapter` + `Local`/`Mock`, shell + `StatusBoard`. **31 web tests pass / 0 fail · `tsc --noEmit` 0 errors · build 49 modules in 526 ms · initial bundle 180.35 kB → 60.21 kB gz** (budget 500 kB gz). S0 unregressed: **81/81**. Detail: **14 §4**.
- **S1 hostile review round 4 [FIXED 2026-09-18]:** the slice was reviewed *after* shipping green, and found **8 defects** — 5 in code, 1 in fixtures, **2 in the tests themselves**. Three were P1-class: a corrupt `state.json` **500'd `/api/status`**, destroying the very damage-reporting path R3 exists to provide (S1-H1); the rule-4 cap test collected `.mjs` only, so **the entire `console/web/` tree was unmeasured** and the cap could not fail on any UI file (S1-H7); and **`GET // HTTP/1.1` killed the bridge process outright** — `new URL` throws on protocol-relative targets and the parse sat outside the handler's `try`, so the throw became a process exit with no response to the client (S1-H8). Also: a fabricated `0 in flight · 0 swept` census, `documents: 0` rendered as a real count, a poll loop a single hung request could wedge permanently, and fixtures describing payloads the bridge never returns. **All 8 fixed and mutation-verified** — each new guard was proved to bite by breaking the code it guards. Console **97/97** ⚠️ *(that figure was inflated — 85 real tests counted 3×, corrected by round 5; see below)*, web **39/39**, `tsc` 0, build **60.39 kB gz**, e2e **12/12**, rule 4 **41 sources walked / 0 over**, static containment **30/30 refused**. Detail: **16**.

- **Round-5 pass 1 — the WRITE path [FIXED 2026-09-19]:** Rounds 1–4 never pointed a hostile probe at `POST`/`PATCH`, and the worst finding of the round was waiting there. **S1-H9 (P1):** `PATCH /api/creators/:id` with a damaged `state.json` answered **409 STORE_DAMAGED while the write was already on disk** — the handler re-read the *roster* (which legitimately 409s on a damaged state) to shape its response row, so a committed mutation was reported as a refusal and the operator had **no surface that could tell the truth** (`/api/creators` 409s on the same fault). Since `setEnabled` is by the engine's own description the only way a creator starts being fetched, that is a consent-state divergence, not an error-code nit. **S1-H10:** a literal `null` body → **500 INTERNAL** on both write routes (`readBody` returned `null`; every other non-object survived only by luck). **S1-H11:** the static fallthrough answered **200 + an HTML page for every method** on every non-API path — the "silent fallthrough" the route table's own comment forbids. **S1-H13 (measurement):** `withFixture` was exported from a `.test.mjs` file, so three importers re-registered the boundary suite — the suite reported **97 tests for 85 real ones** and took 20 s instead of 4.3 s; the harness now lives in `fixtures.mjs` and the suite is **93 real tests in 3.9 s**. All fixed, mutation-verified (3 mutations → exactly 6 tests red, with 2 controls staying green), and **T-B19/T-B20/T-B21** registered with the gate green. **Two items escalated, not fixed** — S1-H12 and S1-H14 (see *Sean decisions pending*). Detail: **16 §14**.
- **Round-5 pass 2 — the READ path and the LANE B boundary [FIXED 2026-09-19]:** the one route whose entire job is to show a published brain had **never once returned a brain**. **S1-H15 (P1):** `GET /api/brains/:slug` answered **200 with `index`/`topics`/`timeline` all empty** — correct slug, correct generation, correct title, no content — for every published brain, because `brainDoc` joined `brains/<slug>` while the engine publishes into `brains/<slug>/<generation>/` (`render.mjs` `publishBrain` writes the documents, then swaps `current.json` last). An empty brain is indistinguishable from a brain with no claims, and R6's acceptance criterion is "published-generation only". A missing document is now **reported** through the payload's previously-always-`[]` `skipped` array, so "absent" and "empty" are different answers. **S1-H16:** the route's 200 path had **no coverage at all** — `seedStore` leaves `brains/` empty, so every `/api/brains/*` assertion in the suite hit the 404 branch; that is why H15 survived. `fixtures.mjs` gained `seedPublishedBrain()`, and `T-B7`'s invariant sweep gained a **live** published namespace plus the hostile forms it never carried. **Containment re-verified from both directions:** `:slug` arrives un-decoded (contained by the pointer gate) and `?creator=` arrives decoded (contained because `query.mjs:55` uses it as an **exact comparison**, never a path); **0 canary hits across 20 read probes**. Bridge **99/99**, mutation-verified both ways (generation ignored → T-B22a/b fail; pointer gate removed → T-B22d fails while a/b/c stay green). Detail: **16 §15**.
- **Round-5 pass 3 — the UI payload shape [FIXED 2026-09-19]:** the first pass to point a probe at `console/web/`, and it found that the slice's **entire** defence against a payload it did not expect was that no component happened to throw on the payloads anyone had tried. **S1-H17 (P1):** `StatusBoard` dereferences ~13 top-level paths on its first ready render and **there was no error boundary anywhere in the tree**, so a single missing key unmounted the React root and left a **blank console** — no reading, no message, no clue which field was wrong. Measured RED-first (`TypeError: status.backlog.lines.join is not a function`, `StatusBoard.tsx:206`, *Uncaught*). This is a *supported* state, not a hypothetical: `console/web/dist/` is a build artifact served by a **separately versioned** bridge. It survived four rounds because every fixture is typed `StatusInstrument`, so TypeScript made a wrong-shaped payload look impossible — **the type system was the only guard, and it does not run at runtime**. **S1-H18:** `LocalEngineAdapter.request` ended `return body as T` — an unchecked cast, so a 200 that was not the contract was indistinguishable from a good reading all the way down to the component. **Fixed in two deliberate layers:** a shape validator at the adapter seam (`adapters/validate.ts`) turns a wrong-shaped 200 into a typed `ConsoleApiError` **naming the offending path** — which `useStatus` already caught and `StatusBoard` already rendered, so the board stays up and the next poll can still recover it — plus `components/ErrorBoundary.tsx` as the last resort, mounted inside `App` (so the shell header survives) and in `main.tsx`. The boundary **latches** rather than self-clearing, deliberately: a self-clearing boundary would re-throw on every 5 s poll forever. Web **48/48** (39 → 48, T-W11a–i), mutation-verified in three orthogonal directions — weakening the deep `backlog.lines` check failed **only** T-W11e, dropping `recentRuns` failed **only** T-W11f, and disabling the boundary failed **exactly** the four boundary cases while **every** validator test and **both** healthy-payload controls stayed green. Also corrected eight stale `"97/97"` counts that round-5 pass 1 had falsified but left in the gate file. Detail: **16 §16**.
- **Round-5 pass 4 — the request body and the instance guards [2026-09-19]:** the instance guards came back **clean** — both pid paths (`console/lib/instance.mjs:57` and the engine's `lib/lock.mjs:72`) open with `Number.isInteger` guards, so a pid file holding `abc`, `-1` or `null` is judged dead and reclaimed instead of raising `ERR_OUT_OF_RANGE`, which is the S1-H1 shape and it cannot happen. The body path produced **S1-H19 (P3, REAL, accepted not fixed):** the 64 KB ceiling holds and the process always survives, but for a body larger than the **socket buffer** the client sees `ECONNRESET` instead of the documented envelope — measured over raw sockets, clean `400` at 65 537 B through 512 KB, reset at 1 MB and 4 MB. The threshold tracking the socket buffer is what identifies the mechanism: the `throw` inside `for await` destroys the request stream, so a client still *writing* gets RST and the response is lost in flight. Three fixes were measured against a minimal server — responding early, responding then destroying, and draining — and **only draining works**, which would mean reading an arbitrary volume from a hostile client and discarding it: a real hardening property traded for a better error message on a path the console cannot reach. **Declined, with the trade recorded**, and the up-front `content-length` check rejected too (it only moves the threshold to 4 MB and adds a second enforcement site beside `readBody`). Four framing paths that had **no coverage at all** are now pinned by T-B23 — body at the ceiling, chunked with no `content-length`, invalid UTF-8, empty POST — and the two mutations are complementary (deleting the ceiling fails only T-B23b; flipping `>` to `>=` fails only T-B23a). Bridge **105/105**. Detail: **16 §17**.
- **Round-5 pass 5 — the meta-pass: can every guard fail? [2026-09-19]:** the pass that audits the audits. **Stage 1** counted assertions in every test: **zero decorative tests** (seven bridge tests contain no `assert.` and all seven assert through throwing helpers; the leak guard even carries its own META test). **Stage 2** ran a mutation sweep over the guards from rounds 1–3, which predate the discipline — one mutation each, full suite per mutation, file restored byte-identical, baseline-gated. Three came back healthy: `hostAllowed` disabled → **5 tests** catch it; `parseRequestUrl` made non-total (the `GET //` crash) → **2 tests**; a 50 000-char transcript-like field added to `/api/status` → **HY4-H5**. **The fourth is the finding.** **S1-H20 (TEST, P3):** removing `resolveStatic`'s containment check was caught by **nothing** — and chasing that produced a genuine correction to my own reading. The property *is* covered: removing **both** resolver guards makes **HY4-H3** fail (104/105), and HY4-H3 is the test that builds a real document root with a real file outside it. What was actually wrong is that **the traversal test could not fail, for two independent reasons**: it used `fetch` (which normalises `/../` away **client-side**, so it never sent a traversal at all — the same trap `fixtures.mjs` already documents for forbidden headers), and its `!text.includes(CH_ONE)` assertion was satisfied by any 404, since an unresolved static path answers 200 + the bridge page. Rewritten to send a **raw request line** and to assert the traversal target is byte-identical to its URL-normalised form — falsifiable, and measured to fail (alone) when all three static-defence layers break. **S1-H21 (DOC/ID, P3):** found in passing — **`T-B12` named two different tests**: the plan and the gate reserve it for S7's snapshot verification (R15), while the code used it for traversal, which was traced to **no requirement at all**. Renumbered **T-B24** and traced to R13. Bridge **105/105**, rule 4 0 over. Detail: **16 §18**.
- **The `server.mjs` split — S2's structural blocker cleared [2026-09-19]:** `server.mjs` had sat at **exactly 300 lines** — the repo's hard cap with **zero headroom** — since S1-H11's fix had to be shaped *net-neutral* to fit it. That is the point at which a cap stops describing the code and starts distorting it, and it was blocking S2 from adding a route. Split on the seam the file's own docstring named (*"the ROUTE TABLE and the process lifecycle, and nothing else"*): **`server.mjs` 300 → 244** (lifecycle only) and a new **`routes.mjs` at 131** (route table, named 404, static fallback). **The cap was NOT raised** — that is a repo-wide governance change and the file was genuinely two things wearing one name. **Two gates stayed put deliberately:** the Host check runs *before* the table and the error envelope *around* it, so keeping them in `server.mjs` makes the DNS-rebinding defence structural rather than conventional, and no route can bypass it; `parseRequestUrl` stayed because it must run inside the `try` — that placement **is** the S1-H8 fix. **The one real risk was `HY4-H6`**, which reads the dispatch table as text to bind the allowlist: moving the table would have let a route added back into `server.mjs` be dispatched and stay invisible. The extractor now reads **both files concatenated** — strictly stronger — and is **mutation-verified**: adding `GET /api/danger` to `server.mjs` turns it red. Bridge **105/105**, web 48/48, `tsc` 0, build clean, rule 4 now peaks at **283** with the cap binding nowhere. Detail: **16 §19**.
- **F4 baseline of record [VERIFIED 2026-09-18 · ⚠️ SUPERSEDED 2026-09-19]:** engine suite excluding `live.test.mjs` → **183 tests / 183 pass / 0 fail, 25 files, ~34 s**. Supersedes the four legacy figures (136/136, 191, 182/189, 185); none of them matched. `live.test.mjs` is excluded — network behaviour is the engine lane's own test, per 06. **⚠️ This figure no longer reproduces in the working tree: 181 pass, with `C1` failing deterministically because `consistency-check.mjs` walks `console/web/node_modules`, and `HR14f` flaky under full-suite load (6/6 in isolation). See S1-H14 in *Sean decisions pending* and 16 §14. Do not quote 183/183 until the walk is fixed or the console moves.** Detail: **14 §2**.
- **C1 loading contract [DECIDED 2026-09-18]:** the three chunk was labelled "lazy" but under CD3 the constellation is on screen at first paint, so viewport-enter ≈ eager (~1.4 MB perceived). Re-scoped to a real deferral: idle-after-first-poll fetch, static placeholder at first paint, and **zero fetch under reduced-motion or absent WebGL**. Binds S5 + T-E3. Detail: **14 §3**.
- **Repo symlink repair [VERIFIED 2026-09-18]:** the repo move to `Desktop/@Everything/...` left **24 absolute skill symlinks dangling**; git counted every file inside them as deleted, which is where the reported "119 deletions" came from. **Nothing was deleted.** Restored from `HEAD` (git tracks those paths as regular files, and all 34 working entries are real directories — so real directories are the committed truth, not links). Result: **119 → 2 deletions, 0 dangling**; `prompt-watcher/SKILL.md`'s local edit preserved. Detail: **14 §1**.
- **H5 [FIXED 2026-09-18]:** adding `console/web/` put a `node_modules` tree under `CONSOLE_ROOT`, and the suite's own rule-4 cap test began measuring ~184 installed packages. Fixed with an explicit `NOT_OUR_SOURCE` skip + one shared `walkConsoleSources`; the cap itself was **not** relaxed. Detail: **14 §5**.
- **Astra per-pass token estimates — ⚠️ SUPERSEDED 2026-09-20 (R2-10); `10` is now HISTORICAL.** `10-astra-cost-and-value.md` predicted **≈75k plan tokens** in §1 and **~20k per pass** in §3 (§6 repeating the ~20k). Those two figures **disagreed with each other by nearly 4× when both were written**, and neither is verifiable from inside the session that produced it — a `codex exec --json` event stream carries no usage field. **Do not quote either number.** `19` §6 (A1-16) had certified that these predictions "were removed"; they were not, and that certification is corrected there. **What DOES stand:** Astra rides the Codex 20x subscription at **$0 metered** — verified against this repo's routing doc and harness code — and the billing observations in `10` are left exactly as recorded rather than rewritten. **No document in this packet makes a claim about remaining subscription allowance.** Detail: **`10`** (header banner), **`19`** §6.

## Sean decisions pending

1. **"go" for slice S2** — roster + writes (`addCreator` / `setEnabled`) + `BrainDrawer`. S1's exit evidence is green. **Both blockers named here previously are now closed** — the `server.mjs` cap (item 2) and S1-H14 (item 5). The one that still must be settled **before S2 ships** is **S1-H12** (item 4).
2. **CLOSED 2026-09-19 — the `server.mjs` cap call.** Split at the route-table seam into `server.mjs` 244 + `routes.mjs` 131 + `api.mjs` 77; the cap was **not** raised and rule 4 now binds nowhere (peak 283). No decision remains. Detail: **16 §19**.
3. **CLOSED 2026-09-20 — the Astra D1–D9 adjudication.** Adjudicated, verdict REVISE (`17`). D7 was the only owner decision it produced, and it is now **executed** (`18`). No decision remains from this item.
4. **S1-H12: `POST /api/creators` freezes the bridge's only thread — and this is NOT an engine decision (corrected 2026-09-20, R2-06).** The engine resolves a creator reference through `execFileSync` (`lib/ytdlp.mjs:184`), so one add blocks every other request — **measured 1577 ms for a failing lookup, ceiling 180 s**. `/api/status` pays the *same* blocking call but is TTL-cached precisely because `health.mjs` named the pattern a design defect; the write path got no such mitigation. **S2 must resolve this before shipping the add UI.** This entry previously offered two fixes and concluded that "(a) touches the engine … so this is Sean's call". **That framing was wrong and it parked a console-side fix behind an engine decision it never needed.** `lib/registry.mjs:109–112` contains the blocking call inside `addCreator`, which is an ordinary async function — so the console can run **that call** on a **worker thread** and hand the event loop back, exactly as A1-10 already does for the health probe (`lib/health-probe.mjs`). No engine file is touched, the boundary stays additive-only, and the latency assertion becomes constructible for the first time: the bridge must answer another route while the add is in flight. Detail: **16 §14**, **`07`** (traceability), **`08`** §5.
5. **CLOSED 2026-09-20 — S1-H14: the engine gate is GREEN again.** It was RED because `consistency-check.mjs` walks `scripts/creator-brains/**` with no `node_modules` skip, collecting third-party files from `console/web/node_modules` and failing C1 deterministically (*largest = 4914 lines*, `decimal.js`). The console is no longer inside that walk: **D7 moved it to `packages/creator-brains-console/`**, and the gate reads **15/15 consistent** with **no engine file touched** — the remedy the packet's own rules allowed. `HR14f` remains flaky under full-suite load and is **independent** of this move (A1-01 said so). Detail: **`18`**, and **16 §14** for the original defect.

6. **NEW — A1-08 / D4: is an engine-only private backup an allowed exception to the tier-B boundary?** Backup stays **visible in the UI but blocked, with no endpoint**, because `backup-command.mjs:46–59` copies the durable set **including raw transcripts**, which `01` §"Business rules" item 1 bans from every console surface; the optional browser-supplied `dest` has no containment contract either. It is **not** dropped from scope. This is a privacy-boundary decision, not a build decision — see **`17`** §1 (D4) and **`05`** §2b.

## Uncommitted changes owned by this slice (rule 67 explicit paths)

- `docs/ai-workflow/blueprints/creator-brains-console-20260917/**` (this packet)
- `packages/creator-brains-console/**` (the console — relocated here from `scripts/creator-brains/console/` by D7, 2026-09-20; the old path no longer exists)
- `.ai-workflow/coordination/zcode-glm--creator-brains-console-20260917.lane.md`, `review-queue.md` (append)

```

### A/readiness.json — 970 lines

```
{
  "schemaVersion": 1,
  "phase": "plan",
  "ui": true,
  "blockers": [],
  "nextSlice": "S0H HARDENING — the next slice. Console suite 171/171 REAL tests (~8.9 s); web 60/60; tsc 0 errors; build clean. The engine gate is GREEN: consistency-check reads 15/15 consistent, exit 0, with NO engine file touched — D7 moved the console OUT of the engine tree to packages/creator-brains-console/ (receipt 18-d7-relocation-receipt.md), which is what returned C1 to green. D7 is EXECUTED and S1-H14 is CLOSED; neither awaits Sean. Round 2 (17-astra-mega-reply-r2.md) returned verdict REVISE with ten findings R2-01..R2-10. The fixes for R2-01, R2-02, R2-03, R2-04, R2-05, R2-06, R2-09 and R2-10 are LANDED in this tree and mutation-verified — each guard was broken on purpose, the red tests recorded, and the red sets of paired mutants checked to DIFFER. S0H hardening names what those fixes built: one contained generation reader shared by the drawer and the query route (R2-02); the worker failure lifecycle with error/exit/watchdog/epoch handling and per-store-root history isolation (R2-04); exact serving-origin equality in the write gate (R2-05); and the R2-06 instruction sweep across 05/06/07/08/19/README. DELIBERATELY NOT FIXED, and still open: R2-07 (this field described the pre-relocation world; it is now current) and R2-08 (bridge.writegate.test.mjs reuses the test ID T-B22, already assigned in bridge.brains.test.mjs). A round-3 hostile pass is owed against a REBUILT artifact. IMPLEMENTED SOURCE IS NOT RUNTIME VERIFICATION — the counts above are suite results from this tree, not a certification of the product, and no browser, launcher or end-to-end pass has been re-run.",
  "sections": {
    "baseline": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "evidence/baseline-offline.txt",
          "sha256": "42504342e148cb74a35bcc02ca7228a0bc9cd756996e440e7a87fa882efd78b4"
        }
      ]
    },
    "requirements": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "01-requirements.md",
          "sha256": "c8c020042279a4536b27f478e2140f545473b1bf7449f96a0ad1c7f2b9a5298d"
        }
      ]
    },
    "blueprint": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "02-blueprint.md",
          "sha256": "35eabee8193ad2eb3e489d37afb87a868f44a3a1a3343b0c9d331d1a48a727dc"
        }
      ]
    },
    "flowchart": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "04-flows.md",
          "sha256": "c0142e928d7be56b355b418e5a8ec1774ed9e2c2201ad03b274ce7dba24275d2"
        }
      ]
    },
    "contracts": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "05-contracts.md",
          "sha256": "3579b803951608cb9d72ca822b401525f25be8284ce4770844e79fe6eeff5c97"
        }
      ]
    },
    "tests": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        }
      ]
    },
    "traceability": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "07-traceability.md",
          "sha256": "d5a9667c7240e2febccbdb49ba23f63ede473ce69d620f8df849829d5dc3b3ab"
        }
      ]
    },
    "slices": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    "review": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "09-hostile-review.md",
          "sha256": "d43317b63c36d585fc696bcc65f36fb4b2a3cbb6a5c984e061ce549ab1c54b64"
        }
      ]
    },
    "preservation": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "evidence/preservation-manifest.json",
          "sha256": "fc2e117f13e6e27ae3f8a1a2f6b26cdaa4228c3e662d9a23074ef4205133937d"
        }
      ]
    },
    "wireframes": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "03-wireframes.md",
          "sha256": "ba8abae96f10dcb3bc6c7021ba1383411bdc80eff72d2d86aab8e7d93f62f68b"
        }
      ]
    },
    "state": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "03-wireframes.md",
          "sha256": "ba8abae96f10dcb3bc6c7021ba1383411bdc80eff72d2d86aab8e7d93f62f68b"
        }
      ]
    },
    "sequence": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "04-flows.md",
          "sha256": "c0142e928d7be56b355b418e5a8ec1774ed9e2c2201ad03b274ce7dba24275d2"
        }
      ]
    },
    "erd": {
      "status": "N/A",
      "reason": "No new data model: the store schema is the engine s existing files (registry/state/ledger/brains); the console creates no tables or migrations."
    },
    "permissions": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "05-contracts.md",
          "sha256": "3579b803951608cb9d72ca822b401525f25be8284ce4770844e79fe6eeff5c97"
        }
      ]
    },
    "privacy": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "05-contracts.md",
          "sha256": "3579b803951608cb9d72ca822b401525f25be8284ce4770844e79fe6eeff5c97"
        }
      ]
    },
    "operations": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    }
  },
  "requirements": [
    {
      "id": "R1",
      "acceptance": "Standalone .cmd launch: bridge loopback + browser console in <=15s",
      "tests": [
        "T-E1"
      ]
    },
    {
      "id": "R2",
      "acceptance": "Status board instruments 1:1 with status-command sources; staleness warning >3d",
      "tests": [
        "T-B1",
        "T-W3",
        "T-B14",
        "T-W10",
        "T-W11"
      ]
    },
    {
      "id": "R3",
      "acceptance": "Damaged store refuses by file name; never zeros/empty catalog",
      "tests": [
        "T-B2",
        "T-W3",
        "T-B17",
        "T-W10",
        "T-W11"
      ]
    },
    {
      "id": "R4",
      "acceptance": "Roster add->DISABLED; enable/disable persists via setEnabled",
      "tests": [
        "T-B3",
        "T-W4",
        "T-B19",
        "T-B20"
      ]
    },
    {
      "id": "R5",
      "acceptance": "Query hits with keyPhrase+creator+watch deep link; honest zero-hit; skipped visible",
      "tests": [
        "T-B9",
        "T-W5"
      ]
    },
    {
      "id": "R6",
      "acceptance": "Brain drawer reads published generation only (current.json)",
      "tests": [
        "T-B8",
        "T-B15",
        "T-B22"
      ]
    },
    {
      "id": "R7",
      "acceptance": "Daily run: validated ops/hour, lock truth, honest verdict, single-flight",
      "tests": [
        "T-B4",
        "T-B5",
        "T-W6"
      ]
    },
    {
      "id": "R8",
      "acceptance": "Canary/repair/backup in-console (T2) with results",
      "tests": [
        "T-B10"
      ]
    },
    {
      "id": "R9",
      "acceptance": "No restore/rollback/authorize route exists (404)",
      "tests": [
        "T-B6"
      ]
    },
    {
      "id": "R10",
      "acceptance": "Constellation data-driven; reduced-motion static; WebGL fallback; rAF stops hidden",
      "tests": [
        "T-T1",
        "T-T2",
        "T-W7",
        "T-E3"
      ]
    },
    {
      "id": "R11",
      "acceptance": "Swan design law: tokens/44px/contrast/states/glow/tier badges",
      "tests": [
        "T-W8",
        "T-W9"
      ]
    },
    {
      "id": "R12",
      "acceptance": "Adapter-only coupling; Mock~=Local contract; no engine imports in web/src",
      "tests": [
        "T-W1",
        "T-W2"
      ]
    },
    {
      "id": "R13",
      "acceptance": "Bridge builtins+engine only; loopback-only bind",
      "tests": [
        "T-B7",
        "T-B11",
        "T-B13",
        "T-B16",
        "T-B18",
        "T-B21",
        "T-B23",
        "T-B24"
      ]
    },
    {
      "id": "R14",
      "acceptance": "Responsive matrix 320..3440 clean",
      "tests": [
        "T-E2"
      ]
    },
    {
      "id": "R15",
      "acceptance": "Best-state snapshot (tag+copy+hashes) before SwanGuard transfer",
      "tests": [
        "T-B12"
      ]
    },
    {
      "id": "R16",
      "acceptance": "Full keyboard operability; roster equals constellation; axe clean",
      "tests": [
        "T-W7",
        "T-W9"
      ]
    }
  ],
  "tests": [
    {
      "id": "T-B1",
      "requirements": [
        "R2"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B2",
      "requirements": [
        "R3"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B3",
      "requirements": [
        "R4"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B4",
      "requirements": [
        "R7"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-B5",
      "requirements": [
        "R7"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-B6",
      "requirements": [
        "R9"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B7",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B8",
      "requirements": [
        "R6"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B9",
      "requirements": [
        "R5"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B10",
      "requirements": [
        "R8"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-B11",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/",
      "status": "PASS",
      "reason": "S0 realised; console suite green — 99 real bridge tests at round-5 pass 2. The round-4 figure of \"97/97\" was 85 real tests counted 3x (a harness exported from a .test.mjs file re-registered that file's tests); see 16-s1-hostile-review.md §14, S1-H13. Originally 70/70 in 12-hy4-review-round2.md",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-W1",
      "requirements": [
        "R12"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "PASS",
      "reason": "S1 landed: MockAdapter and LocalEngineAdapter both satisfy the shared contract suite and map every documented envelope identically via the shared mapBridgeError; the live adapter is driven by a fake fetch serving the bridge routes, so parity cannot drift",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "14-decisions-20260918.md",
          "sha256": "518b9317808b2861765b5fb94417b13741b71abd6c32567549cd11f07d39b10e"
        }
      ]
    },
    {
      "id": "T-W2",
      "requirements": [
        "R12"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "PASS",
      "reason": "S1 landed, strengthened at round 4: no file under web/src imports the engine (the adapter is the only seam); production data access goes through the adapters barrel; EVERY production file — not tokens.css alone — is scanned for the banned palette (hex and rgb forms); the import patterns self-check against synthetic offenders so a dead regex fails the suite",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "14-decisions-20260918.md",
          "sha256": "518b9317808b2861765b5fb94417b13741b71abd6c32567549cd11f07d39b10e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-W3",
      "requirements": [
        "R2",
        "R3"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "PASS",
      "reason": "S1 landed, strengthened at round 4: StatusBoard renders fixture instruments; all THREE damage refusals are pinned (creators, census, documents) plus the publishedBrains NON-refusal — a failed census sweep must not render \"0 in flight · 0 swept\", and documents:0 is withheld because it is a guard value, not a count",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "14-decisions-20260918.md",
          "sha256": "518b9317808b2861765b5fb94417b13741b71abd6c32567549cd11f07d39b10e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-W4",
      "requirements": [
        "R4"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-W5",
      "requirements": [
        "R5"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-W6",
      "requirements": [
        "R7"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-W7",
      "requirements": [
        "R10",
        "R16"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-W8",
      "requirements": [
        "R11"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-W9",
      "requirements": [
        "R11",
        "R16"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-T1",
      "requirements": [
        "R10"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run src/three",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-T2",
      "requirements": [
        "R10"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run src/three",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-E1",
      "requirements": [
        "R1"
      ],
      "command": "npx playwright test --config playwright.console.config.ts",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-E2",
      "requirements": [
        "R14"
      ],
      "command": "npx playwright test --config playwright.console.config.ts",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-E3",
      "requirements": [
        "R10"
      ],
      "command": "npx playwright test --config playwright.console.config.ts",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-B12",
      "requirements": [
        "R15"
      ],
      "command": "node --test packages/creator-brains-console/test/snapshot.test.mjs  (lands with S7; verifies copied-tree SHA-256s vs recorded manifest + tag existence)",
      "status": "NOT RUN",
      "reason": "not yet built — owned by a later slice (see 06-test-plan.md and 08-slices-operations.md)",
      "evidence": [
        "06-test-plan.md"
      ]
    },
    {
      "id": "T-B13",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "S0 added: Host-header (DNS-rebinding) gate + positive nine-route allowlist pin",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "08-slices-operations.md",
          "sha256": "95f130491a8cf067ca11e08dfbe0d70058c9c8f405f0971c1d719db6aecb4f75"
        }
      ]
    },
    {
      "id": "T-B14",
      "requirements": [
        "R2"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "health cache: a failed probe must not evict the history fallback (round-2 H1)",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "12-hy4-review-round2.md",
          "sha256": "9f0eace118ce3de413fb33cc90960a22359313a92ae49370b3af571759485e21"
        }
      ]
    },
    {
      "id": "T-B15",
      "requirements": [
        "R6"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "leak guard: no false negatives — transcript content under any key name is caught (round-2 H2)",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "12-hy4-review-round2.md",
          "sha256": "9f0eace118ce3de413fb33cc90960a22359313a92ae49370b3af571759485e21"
        }
      ]
    },
    {
      "id": "T-B16",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-3 H3: a second startBridge in one process is refused; clean shutdown and failed start both still free the slot",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "13-hostile-round3.md",
          "sha256": "f6f723a7b5049bcaed8f86314c160b0eab59c2239f3b3a5fb9e21c9dc0175daa"
        }
      ]
    },
    {
      "id": "T-B17",
      "requirements": [
        "R3"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-4 S1-H1: the two-shape damage rule — a corrupt state.json keeps /api/status at 200 with state.damaged set and every other reading intact, while /api/backlog refuses 409 naming the file; no damage mode leaks a stack trace or an internal error name",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-W10",
      "requirements": [
        "R2",
        "R3"
      ],
      "command": "cd packages/creator-brains-console/web && npx vitest run",
      "status": "PASS",
      "reason": "round-4 S1-H4: a request that never settles is abandoned by the watchdog (mapped to TRANSPORT, not a new code) so the poll latch always releases and the board recovers; a late answer from an already-timed-out request is discarded by the generation guard",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B18",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-4 S1-H8: the request handler is total — every malformed request target (//, ///, //@, //:80, http://, https://) answers 400 VALIDATION and the bridge keeps serving; the Host gate still runs before the target is parsed; parseRequestUrl raises a typed ApiError(VALIDATION), never a raw TypeError. Sent over a raw socket, because fetch and node:http.request normalize malformed targets away",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B19",
      "requirements": [
        "R4"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-5 pass 1, S1-H9: a non-2xx answer must mean nothing was written. With state.json damaged, PATCH /api/creators/:id answers 200 and the registry row IS persisted (enabledAt stamped); the row counts are null, never 0; repeated toggles each answer 200 and agree with disk; a 409 that does happen is a PRE-write refusal (registry byte-identical); with an intact store the counts are real numbers. Root cause fixed: the handler re-read the ROSTER through creatorRows, which refuses 409 on a damaged state.json, turning a committed write into a 409 after the fact",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B20",
      "requirements": [
        "R4"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-5 pass 1, S1-H10: the body contract is \"a JSON object\". A literal null body -> 400 VALIDATION, not a 500, on both write routes; 42 / \"str\" / true / false / [1,2] / [] -> 400 the same way; an absent body still yields {} and keeps its own specific refusal. Enforced in readBody, the one function that owns it, rather than at each dereference site",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B21",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-5 pass 1, S1-H11: no silent fallthrough outside /api either. POST/PATCH/PUT/DELETE/OPTIONS on /, /registry.json, /nope -> 404 NOT_FOUND instead of 200 + the status page, while GET and HEAD still serve it. Fixed net-neutral in line count because server.mjs sits at exactly 300",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B22",
      "requirements": [
        "R6"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-5 pass 2, S1-H15/H16: the LANE C read path must serve a published brain. With a real published generation seeded, GET /api/brains/:slug -> 200 with index/topics/timeline NON-EMPTY and skipped [] (a); a document absent from the generation is reported in skipped, not silently empty (b); a pointer naming no generation reports all three (c). Containment both directions: :slug arrives UN-DECODED and ?creator= arrives DECODED, so every hostile form of each (%2e%2e%2f, ..%2F, %5C, %00, the LANE B channel id, a 500-char slug) refuses and never carries the LANE B canary or a registry byte (d,e); the query route searches LANE C only, so transcript-only words return zero hits (f). Root cause: brainDoc joined brains/<slug> while the engine publishes into brains/<slug>/<generation>/, so every published brain answered 200 with all three documents empty",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-W11",
      "requirements": [
        "R2",
        "R3"
      ],
      "command": "npx vitest run (console/web)",
      "status": "PASS",
      "reason": "round-5 pass 3, S1-H17/H18: a payload of the wrong shape must produce a NAMED failure, never a blank console. Layer 1 (adapter seam, adapters/validate.ts): the live adapter refuses a wrong-shaped 200 with a typed ConsoleApiError (d); names the offending path when a nested field is bent — body.backlog.lines: expected an array (e) — and when exactly one top-level key is missing (f). Layer 2 (components/ErrorBoundary.tsx, mounted in App and main.tsx): a wrong-shaped payload renders console-fault instead of unmounting the root, and the shell header SURVIVES — document.body.textContent still matches /Creator Brains Console/ (a); a missing nested key (b) and a non-array array field (c) are caught the same way; the boundary contains a throw from any child, not only StatusBoard (g). Controls: a healthy payload still renders the board through the mock (h) and survives the live validator (i), so neither layer can be satisfied by refusing everything. Root cause: LocalEngineAdapter.request ended with an unchecked `return body as T` and no error boundary existed anywhere, so a missing top-level key unmounted the React root and left a blank page",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B23",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-5 pass 4, S1-H19: the body ceiling, and the framing paths nothing had measured. A body AT the ceiling (64 KB) is READ — the boundary is `>` not `>=` (a); one byte over is refused with the documented envelope (b); a 4 MB body cannot take the bridge down — it is still serving 200 afterwards (c); a body that is not valid UTF-8 is a 400, not a 500 (d); a chunked body with no content-length is read normally (e); a POST with no body is a 400, never a 500 (f). The client's outcome for a body large enough that it is still writing when the limit trips is deliberately NOT pinned: it tracks the socket buffer (clean 400 at 512 KB, ECONNRESET at 1 MB and 4 MB), so asserting either would flake across machines. What is pinned is that the bridge refuses, stays within its memory bound, and keeps serving. Closing S1-H19 would require draining an arbitrary volume from a hostile client; that trade was measured and declined",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    },
    {
      "id": "T-B24",
      "requirements": [
        "R13"
      ],
      "command": "node --test packages/creator-brains-console/test/*.test.mjs",
      "status": "PASS",
      "reason": "round-5 pass 5, S1-H20/H21: the static-traversal test, and its ID. RENUMBERED from T-B12 — the plan (06-test-plan.md:26) and this file reserve T-B12 for S7's snapshot verification (R15), so two unrelated tests shared one ID and the traversal property was traced to no requirement at all (S1-H21). REWRITTEN because it could not fail, for two independent measured reasons: (1) it used `fetch`, which normalises `/../` away client-side, so it never sent a traversal at all — the same trap fixtures.mjs documents for forbidden headers; (2) its `!text.includes(CH_ONE)` assertion was satisfied by any 404, because an unresolved static path answers 200 + the bridge page (server.mjs:165) and the bridge page contains no channel id. It now sends a RAW request line and asserts the traversal target is byte-identical to its URL-normalised form — the invariant that actually protects the live server. Measured falsifiable: with all three static-defence layers broken (new URL normalisation, normalize(), containment) it is the ONLY test that fails, 5/6 in the boundary suite. Deliberately NOT claimed as single-mutation-observable: the three layers are mutually redundant, so removing any one leaves 105/105 green. The resolver-level property is pinned by HY4-H3, which DOES fail when both resolver guards are removed (104/105)",
      "evidence": [
        {
          "path": "06-test-plan.md",
          "sha256": "d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e"
        },
        {
          "path": "16-s1-hostile-review.md",
          "sha256": "e2db615831ec2e7bbb78785c46ab36c9a8b4b518af5ccab921670e92b7b0b027"
        }
      ]
    }
  ]
}

```


## PART B — the shipped source the fixes touched (verbatim)

The repo enforces a **hard 300-line cap** (rule 4) over `.mjs/.ts/.tsx/.css`, **test files included**, enforced by `bridge.hy4.structure.test.mjs`. Line counts are given so you can check it without counting.

### B/packages/creator-brains-console/lib/containment.mjs — 134 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/containment.mjs
 * PURPOSE: Turning a name into a path that is PROVEN to stay inside the store.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H (R2-02, Astra round 2)
 * ============================================================================
 *
 * WHY THIS IS A MODULE AND NOT A FUNCTION IN THE READER. `brain-read.mjs` owns
 * what a published brain LOOKS like; this file owns how a path is proven safe to
 * touch. They were one file until R2-02 needed containment for the pointer, the
 * namespace directory, the generation directory AND every leaf — four call sites
 * where there had been one — and the combined file passed the repo's 300-line cap
 * (CLAUDE.md rule 4). The split is on the seam the two concerns already had.
 *
 * THE DEFECT THIS CLOSES (R2-02, measured by the round-2 probe). Containment
 * covered the DRAWER's generation directory only. It did not cover:
 *
 *   - the POINTER file, which was read before any check, so a `current.json`
 *     that was itself a link was followed;
 *   - the NAMESPACE directory, so `brains/<slug>` could be a junction out;
 *   - any LEAF file, so `rules.jsonl` could be a link out of an otherwise
 *     contained generation;
 *   - the QUERY route at all — `queryBrains` resolves pointers itself, so it
 *     never reached the drawer's check. The probe returned a hit after reading
 *     `outside/rules.jsonl`.
 *
 * A boundary implemented at one entry point and not the other is a boundary
 * implemented once and a half. Everything below is used by BOTH.
 *
 * CONTAINMENT OF A PATH IS NOT CONTAINMENT OF A FILE. `readFileSync` follows
 * junctions and symlinks, so a path can be lexically inside the store and still
 * name a file on the other side of the machine. `realpathSync` resolves the whole
 * chain, and it is the only thing that can see that. Both checks run, always —
 * not because the alphabet check might fail, but because a guard that holds only
 * while another guard holds is the defect class this module exists to remove.
 *
 * @module creator-brains-console/lib/containment
 */

import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import { paths } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';

/**
 * The brains store, with its real path resolved ONCE per call.
 *
 * `realRoot` is null when the store does not exist yet. That is not a fault —
 * there is nothing to escape from — and every check below tolerates it.
 */
export function brainsStore(r) {
  const root = resolve(paths(r).brainsDir);
  let realRoot = null;
  try {
    realRoot = realpathSync(root);
  } catch {
    /* no store yet — nothing to escape */
  }
  return { root, realRoot };
}

/** Is `target` strictly inside `root`, after both have been normalised? */
export function inside(root, target) {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/** The real path of `target`, or null when it does not exist / cannot be resolved. */
export function realpathOrNull(target) {
  try {
    return realpathSync(target);
  } catch {
    return null;
  }
}

function damaged(message, file) {
  return new ApiError(CODE.STORE_DAMAGED, message, { file });
}

/**
 * Assert that `target` resolves inside the store, then return it.
 *
 * AN ABSENT TARGET IS NOT A FAULT. A generation directory that does not exist is
 * reported file by file by the caller; only something that EXISTS and escapes is
 * store damage. So the real-path check is skipped when the path cannot be
 * resolved, and the caller is left to distinguish absence from damage on the read
 * — which `readContainedText` below does, and does differently on purpose.
 *
 * @param root     the lexical store root
 * @param realRoot its resolved real path, or null when the store is absent
 * @param target   the absolute path to prove
 * @param what     a short human description, used in the refusal
 * @param file     the file name to blame in the refusal (contract §3 damage shape)
 */
export function containedPath(root, realRoot, target, what, file) {
  if (!inside(root, target)) {
    throw damaged(`${what} does not resolve inside the brains store`, file);
  }
  const real = realpathOrNull(target);
  if (real !== null && realRoot !== null && !inside(realRoot, real)) {
    throw damaged(`${what} resolves outside the brains store`, file);
  }
  return target;
}

/**
 * Read a UTF-8 text file, treating ABSENCE and FAILURE as different facts.
 *
 * THIS IS THE A2-R2-01 CORRECTION. The first version of the reader caught every
 * read error and reported "missing from the published generation". That collapses
 * two opposite facts: a file that is not there, and a file that is there but
 * cannot be read. The second is a store fault the operator must fix; the first is
 * an ordinary incomplete publication. Reporting the second as the first is how a
 * permissions problem reads as "this creator published nothing".
 *
 * So: `ENOENT` returns null (absence, the caller reports it), and EVERY other
 * failure throws. `EISDIR`, `EACCES`, `EPERM`, `EMFILE` and a malformed path are
 * all damage. The distinction is testable on Windows without privileges by making
 * the path a DIRECTORY, which raises `EISDIR` — see `bridge.readsurface.test.mjs`.
 *
 * @returns the file's text, or null when it does not exist
 */
export function readContainedText(path, what, file) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    const code = (err && err.code) || 'unknown error';
    throw damaged(`${what} exists but could not be read (${code})`, file);
  }
}

```

### B/packages/creator-brains-console/lib/brain-read.mjs — 288 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/brain-read.mjs
 * PURPOSE: The ONE contained reader for a published LANE C generation.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H
 * ============================================================================
 *
 * WHY THIS FILE EXISTS (A1-11, then R2-02 / R2-03).
 *
 * The engine's store has three lanes:
 *   LANE A  durable   registry.json / state.json — roster and video states
 *   LANE B  private   docs/<channelId>/<videoId>.json — RAW TRANSCRIPT TEXT
 *   LANE C  derived   brains/<slug>/<generation>/ — published claims
 *
 * LANE B is the creator's own spoken content and MUST NOT be served by any
 * surface. LANE C is the product. This module is the only place in the console
 * that turns a caller-supplied name into a filesystem path, and the only place
 * that reads LANE C.
 *
 * The containment rules live here ONCE because they were previously inline in
 * the drawer and absent from the query path. A boundary implemented twice is a
 * boundary implemented once and a half.
 *
 * MEASURED 2026-09-20 against the pre-fix code, with a directory of the same
 * three filenames placed beside the store:
 *
 *   a pointer naming generation `../../../outside/gen-0001`  → 200, served it
 *   `brains/<ns>/gen-0001` as a junction to that directory   → 200, served it
 *   `brains/<ns>` itself as a junction to it                 → 200, served it
 *   an encoded traversal in the SLUG (`..%2F..%2Foutside`)   → 404, no leak
 *
 * So the generation component and any filesystem LINK are live, and the slug
 * text is not — the router does not decode `%2F`, and `fetch`/`undici` strip a
 * raw `..` before the wire. The slug alphabet check below is still required, and
 * NOT because it fixes a live hole: the slug is safe TODAY only because another
 * module declines to decode, which is an assumption owned elsewhere. A guard
 * that holds only while another guard holds is the defect class this module
 * exists to remove.
 *
 * ONE POINTER, ONE GENERATION (R2-03). The pointer is read ONCE. Every file —
 * the three markdown documents AND `rules.jsonl` — is read from the directory
 * that one read named. An earlier version read the markdown from the validated
 * generation but re-resolved the pointer for claims, and compared generations
 * only INSIDE the loop over hits; an empty generation therefore skipped the
 * comparison entirely and served generation 1's markdown beside generation 2's
 * (empty) claims. A guard inside a loop over possibly-empty results is a guard
 * that does not run.
 *
 * @module creator-brains-console/lib/brain-read
 */

import { join, resolve } from 'node:path';
import { readPointer } from '../../../scripts/creator-brains/lib/render.mjs';
import { listDir, paths, readJsonl } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';
import {
  brainsStore, containedPath, inside, readContainedText,
} from './containment.mjs';

/** The three MARKDOWN files a brain page exposes verbatim. */
export const BRAIN_FILES = Object.freeze(['index.md', 'topics.md', 'timeline.md']);

/**
 * A namespace that cannot be a path.
 *
 * The engine produces two shapes and only two: `slugify` yields `[a-z0-9-]`
 * (≤60 chars, no leading or trailing hyphen) and a YouTube channel id is
 * `UC[A-Za-z0-9_-]+`. This allowlist covers both and admits no `.`, no
 * separator and no empty name — so `..`, `/`, `\` and a NUL byte are all
 * unrepresentable.
 */
const NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * The generation directory shape the engine writes.
 *
 * R2-09: this was `/^gen-\d{4}$/`, which rejects `gen-10000` — and the engine
 * emits exactly that once a creator passes 9999 generations, because
 * `render.mjs` uses `padStart(4)`, a FLOOR and not a fixed width. A pattern that
 * refuses a name the writer can produce turns a legitimate brain into reported
 * store damage.
 *
 * The fix is a TWO-SHAPE rule, not a looser bound. `padStart(4)` means the
 * engine writes the CANONICAL decimal of N, left-padded only up to four:
 *
 *   N ≤ 9999   → exactly four digits, leading zeros included   gen-0001, gen-9999
 *   N ≥ 10000  → the plain decimal, five or more digits        gen-10000, gen-100000
 *
 * So a five-digit form may NOT start with `0` — `gen-00001` is the decimal 1
 * padded to five, which `padStart(4)` never produces. Writing `\d{4,}` here
 * accepted it, and `T-B25b2` caught that: it is the difference between "at least
 * four digits" and "canonical at four digits, canonical above".
 *
 * The engine's own four-digit ENUMERATION at `render.mjs` is a separate defect
 * and is NOT fixed here: the console may not modify engine files. Recorded
 * rather than patched.
 */
const GENERATION = /^gen-(?:\d{4}|[1-9]\d{4,})$/;

/**
 * Required fields on a rule row — a row missing any of these is not a claim.
 *
 * This MIRRORS `REQUIRED_FIELDS` in the engine's `lib/query.mjs`, which is not
 * exported. A behavioural cross-check test (`bridge.brains.test.mjs`, the A1-04
 * series) asserts this list against the engine's source literal, so an engine
 * change fails loudly here instead of silently widening what counts as a claim.
 */
const REQUIRED_FIELDS = Object.freeze(['claim_id', 'creator_id', 'video_id', 't_start_ms', 'key_phrase']);

/** Is `target` strictly inside `root`, after both have been normalised? */
export { inside };

/**
 * `brains/<slug>/<generation>`, proven to resolve inside the store.
 *
 * WHY BOTH CHECKS WHEN THE ALPHABET ALREADY FORBIDS TRAVERSAL. Because a check
 * that holds only while another check happens to hold is precisely the defect
 * class this module exists to remove. Containment is asserted directly, so
 * loosening `NAMESPACE` later cannot silently reopen the hole.
 *
 * AND WHY CONTAINMENT OF THE PATH IS NOT CONTAINMENT OF THE FILE. `readFileSync`
 * follows junctions and symlinks, so `brains/<slug>` — or the generation
 * directory itself — may be a link to anywhere while remaining lexically inside.
 * `realpathSync` resolves the whole chain, which is the only thing that can see
 * that. All three measured vectors above are refused by this function.
 *
 * Exported because the query path must use the SAME check, not a copy (R2-02).
 * The primitive it delegates to lives in `containment.mjs`, which R2-02 extended
 * to cover the namespace directory, the pointer file and every leaf as well.
 */
export function containedDir(r, slug, generation) {
  const { root, realRoot } = brainsStore(r);
  return containedPath(root, realRoot, resolve(root, slug, generation), `'${slug}/${generation}'`, 'current.json');
}

/**
 * Read the claims for a generation that has ALREADY been validated.
 *
 * `readJsonl` drops an unparseable line at parse time, so the parsed count is
 * compared against the real line count and the difference is REPORTED — a
 * damaged generation must not read as "this creator never said that" (HR24).
 *
 * THE LEAF IS CONTAINED BEFORE IT IS READ (R2-02). Containing the DIRECTORY is
 * not enough: `rules.jsonl` inside a contained generation can itself be a
 * junction pointing out, and the probe read exactly that. And a read that FAILS
 * is damage rather than absence (A2-R2-01) — `readContainedText` draws that line.
 */
function readClaims(dir, skipped, root, realRoot) {
  const claims = [];
  const rulesPath = containedPath(root, realRoot, join(dir, 'rules.jsonl'), 'the rules for this generation', 'rules.jsonl');
  const text = readContainedText(rulesPath, 'rules.jsonl', 'rules.jsonl');
  if (text === null) {
    skipped.push({ file: 'rules.jsonl', reason: 'missing from the published generation' });
    return claims;
  }
  const rows = readJsonl(rulesPath);
  const lineCount = text.split('\n').filter((l) => l.trim()).length;
  if (lineCount !== rows.length) {
    skipped.push({ file: 'rules.jsonl', reason: `${lineCount - rows.length} unparseable line(s)` });
  }
  for (const row of rows) {
    const missing = REQUIRED_FIELDS.filter((f) => row[f] === undefined || row[f] === null);
    if (missing.length) {
      skipped.push({ file: 'rules.jsonl', claim: row.claim_id || '(no id)', reason: `missing ${missing.join(', ')}` });
      continue;
    }
    claims.push(row);
  }
  return claims;
}

/**
 * Read one published brain, from exactly one pointer read.
 *
 * Returns `null` when there is no published brain for `name` — an absent brain
 * and an unnameable one are the same answer from a caller's side. THROWS only
 * on store DAMAGE, because damage and absence want opposite responses and
 * collapsing them is how a corrupt store comes to look like an empty one.
 *
 * @returns {{generation: string|null, title: string, docs: object, claims: object[], skipped: object[]}|null}
 */
export function readPublishedBrain(r, name) {
  // Refuse before the pointer read. `pointerPath` joins this string unsanitised,
  // so a name that cannot be a namespace must not reach it at all.
  if (typeof name !== 'string' || !NAMESPACE.test(name)) return null;

  const { root, realRoot } = brainsStore(r);

  // THE POINTER IS CONTAINED BEFORE IT IS FOLLOWED (R2-02). It used to be read
  // first and validated never, so `brains/<ns>/current.json` could itself be a
  // link and the read followed it out of the store. `readPointer` computes this
  // exact path (`join(brainsDir, ns, 'current.json')`), so proving the path here
  // proves the path it will open.
  containedPath(root, realRoot, join(root, name), `'${name}'`, 'current.json');
  containedPath(root, realRoot, join(root, name, 'current.json'), `the pointer for '${name}'`, 'current.json');

  let pointer;
  try {
    pointer = readPointer(r, name);
  } catch {
    pointer = null;
  }
  if (!pointer) return null;

  const generation = typeof pointer.generation === 'string' && pointer.generation
    ? pointer.generation
    : null;

  // An ABSENT generation is incomplete; an IMPOSSIBLE one is damage. Reporting an
  // impossible generation as three empty documents is the S1-H15 shape again: a
  // store fault dressed as a legitimate brain with nothing in it.
  if (generation !== null && !GENERATION.test(generation)) {
    throw new ApiError(
      CODE.STORE_DAMAGED,
      `the published pointer for '${name}' names generation '${String(generation).slice(0, 80)}', `
        + 'which the engine never writes',
      { file: 'current.json' },
    );
  }

  // ONE directory, computed once, used for every read below. This is the R2-03
  // fix: there is no second pointer resolution anywhere in this function.
  const dir = generation ? containedDir(r, name, generation) : null;

  const skipped = [];
  const docs = {};
  for (const file of BRAIN_FILES) {
    if (!dir) {
      skipped.push({ file, reason: 'the published pointer names no generation' });
      docs[file] = '';
      continue;
    }
    // EACH LEAF IS CONTAINED TOO (R2-02) — a contained directory can still hold
    // a linked file — and a read that FAILS is damage, not absence (A2-R2-01).
    const leaf = containedPath(root, realRoot, join(dir, file), `'${file}' for '${name}'`, file);
    const text = readContainedText(leaf, file, file);
    if (text === null) {
      skipped.push({ file, reason: 'missing from the published generation' });
      docs[file] = '';
      continue;
    }
    docs[file] = text;
  }

  return {
    generation,
    title: pointer.title ?? name,
    docs,
    claims: dir ? readClaims(dir, skipped, root, realRoot) : [],
    skipped,
  };
}

/**
 * Prove that the engine's own traversal cannot leave the store (R2-02).
 *
 * WHY A WALK AND NOT A REWRITE. `/api/query` delegates to the engine's
 * `queryBrains`, which enumerates every `current.json` under the brains
 * directory ITSELF and joins each pointer's generation unchecked — that is the
 * measured R2-02 leak. The console cannot fix that from the outside, and
 * reimplementing the traversal would mean reimplementing the engine's scoring
 * too, which is the duplicated-contract hazard R2-01 was about.
 *
 * So the console establishes the property the engine relies on, BEFORE the engine
 * runs: every entry in `brains/`, every pointer, every generation and every leaf
 * is proven to resolve inside the store. After this pass returns, every path
 * `listPublished` will join is a path this module has already validated.
 *
 * WHAT THIS DOES NOT COVER, stated rather than implied: a filesystem that is
 * MUTATED between this pass and the engine's read. That race is not detectable
 * without platform-specific primitives, and Astra's own correction (A2-R2-06)
 * says not to certify it. Cooperating atomic publication and pre-existing links
 * are covered; a hostile concurrent mutation is not claimed.
 *
 * THROWS on any escape, so the route answers 409 rather than serving from a
 * store it cannot vouch for.
 */
export function assertReadSurfaceContained(r) {
  const { root, realRoot } = brainsStore(r);
  for (const entry of listDir(root)) {
    // Every entry, not only well-formed namespaces: `listPublished` does not
    // filter by name either, so anything it will open must be proven here.
    containedPath(root, realRoot, join(root, entry), `'${entry}'`, 'current.json');
    containedPath(root, realRoot, join(root, entry, 'current.json'), `the pointer for '${entry}'`, 'current.json');
    readPublishedBrain(r, entry);
  }
}

```

### B/packages/creator-brains-console/lib/brains.mjs — 123 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/brains.mjs
 * PURPOSE: Asking the brains (cited claims) and reading a published generation.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0
 * ============================================================================
 *
 * THE CONTAINMENT RULES AND THE LANE B/C BOUNDARY MOVED TO `lib/brain-read.mjs`
 * (R2-03, 2026-09-20). This file is now the ROUTE-SHAPED half: it maps a
 * caller's request onto that reader and projects engine rows into the console's
 * served shape. Read `brain-read.mjs` before changing anything here — the
 * measurement history for every containment rule lives with the rule, and it is
 * deliberately not duplicated.
 *
 * THE READ SURFACE IS NOW CONTAINED AT BOTH ENTRY POINTS (R2-02, 2026-09-20).
 * `queryConsole` calls `assertReadSurfaceContained` before it delegates, so every
 * path the engine's own traversal will join has already been proven to resolve
 * inside the store. The drawer goes through `readPublishedBrain`, which contains
 * the namespace directory, the pointer file, the generation directory and every
 * leaf. Read `brain-read.mjs` before changing anything here — the measurement
 * history for every containment rule lives with the rule, and it is deliberately
 * not duplicated.
 *
 * WHY THE QUERY ROUTE REFUSES (409) RATHER THAN SKIPPING THE POISONED CREATOR.
 * `/api/query` returns `skipped`, so reporting damage as a field was available and
 * was rejected. The engine owns the traversal; the console can only validate it
 * before or after, never inside. Validating and then skipping would leave the
 * engine reading the very path that failed validation, and owning the traversal
 * in the console would mean owning the engine's scoring too — a second
 * implementation of a contract, which is the drift hazard R2-01 was about. A
 * store that cannot be vouched for is a stop-and-look event, not a partial answer.
 *
 * @module creator-brains-console/lib/brains
 */

import { queryBrains } from '../../../scripts/creator-brains/lib/query.mjs';
import { BRAIN_FILES, assertReadSurfaceContained, readPublishedBrain } from './brain-read.mjs';
import { ApiError, CODE, validateQuery } from './errors.mjs';
import { toQueryHit } from './hits.mjs';

// Re-exported because `api.mjs` reads the allowlist from here; the list itself
// belongs with the reader that uses it.
export { BRAIN_FILES };

/**
 * GET /api/query?q&creator — the engine's own query, behind a containment pass.
 *
 * The pass is what makes this route safe: the engine resolves pointers and joins
 * generations itself, so validating nothing here is what let the round-2 probe
 * read `outside/rules.jsonl` and return a hit (R2-02).
 */
export function queryConsole(q, { r, creator = null } = {}) {
  const query = validateQuery(q);
  assertReadSurfaceContained(r);
  let res;
  try {
    res = queryBrains(query, { r, creator: creator || null });
  } catch (e) {
    // The engine refuses an empty query and a bad creator filter by throwing;
    // map that to VALIDATION rather than a 500, keeping the engine's wording.
    throw new ApiError(CODE.VALIDATION, e.message);
  }
  return {
    hits: res.hits.map((h) => ({
      claimId: h.claimId || `${h.videoId}:${h.tStartMs}`,
      creatorId: h.creatorId,
      creatorTitle: h.creatorTitle || h.creatorId,
      videoId: h.videoId,
      tStartMs: h.tStartMs,
      keyPhrase: h.keyPhrase,
      statement: h.statement,
      topic: h.topic,
      // The deep link is the product: it opens the creator's own video at the
      // second the claim was made.
      watchUrl: `https://youtu.be/${h.videoId}?t=${Math.max(0, Math.floor((h.tStartMs || 0) / 1000))}`,
    })),
    skipped: res.skipped || [],
  };
}

/**
 * GET /api/brains/:slug — read ONLY the published generation named by the
 * pointer. A missing pointer is a 404, never an empty document that looks like
 * a brain with nothing in it.
 *
 * Everything below the 404 decision lives in `readPublishedBrain`, which reads
 * the pointer ONCE and takes all four files from the directory that one read
 * named. Two shapes are deliberately distinguished there:
 *
 *   no published brain        → `null` here → 404
 *   damage (impossible
 *   generation, escaping
 *   link)                     → thrown there → 409 STORE_DAMAGED
 *
 * Collapsing those is how a corrupt store comes to look like an empty one — the
 * S1-H15 shape, which this route has already produced once.
 */
export function brainDoc(slug, { r } = {}) {
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new ApiError(CODE.VALIDATION, 'a brain slug is required');
  }
  const name = slug.trim();

  const published = readPublishedBrain(r, name);
  if (!published) {
    throw new ApiError(CODE.NOT_FOUND, `no published brain for '${name}'`, { slug: name });
  }

  // Claims come from the SAME pinned generation as the markdown (A1-04/R2-03),
  // and the projection is shared with the query route (`lib/hits.mjs`) so the
  // two cannot drift field for field.
  return {
    slug: name,
    generation: published.generation,
    title: published.title,
    index: published.docs['index.md'],
    topics: published.docs['topics.md'],
    timeline: published.docs['timeline.md'],
    claims: published.claims.map(toQueryHit),
    skipped: published.skipped,
  };
}

```

### B/packages/creator-brains-console/lib/health-probe.mjs — 299 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-probe.mjs
 * PURPOSE: The main-thread end of the off-loop yt-dlp probe (A1-10, R2-04).
 * PART OF: Creator Brains Console (A1-10; R2-04 worker failure lifecycle)
 * ============================================================================
 *
 * TWO FUNCTIONS, AND THE ASYMMETRY IS THE POINT.
 *
 *   requestProbe()  asks the worker to run `selfCheck()`. Returns immediately.
 *   takeProbe()     collects a FINISHED result, or `null`. Never waits.
 *
 * There is deliberately no "run it and wait" function. Waiting is what the
 * bridge must never do, and a helper that offered it would be used.
 *
 * THE WORKER IS LAZY AND UNREF'D. Lazily, because every unit test injects its
 * own `probe` and must not pay for a subprocess it never uses. Unref'd, because
 * a health probe is never a reason for the bridge to stay alive — without that,
 * `node --test` would hang waiting for a worker whose only job is to answer a
 * question nobody is asking any more.
 *
 * ── R2-04: THE WORKER NOW HAS AN OWNED FAILURE LIFECYCLE ────────────────────
 *
 * The first version created a worker and then stopped thinking about it. Astra
 * round 2 named the consequences, and each is a way for the health probe to take
 * down — or silently misreport — the very process whose health it reports:
 *
 *   OWNERSHIP      the `Worker` and its port live in one `channel` record, which
 *                  is what makes closure possible at all.
 *   ERROR / EXIT   with no `'error'` handler, a worker that cannot START emits
 *   / WATCHDOG     an unhandled `'error'` event and Node treats that as an
 *                  uncaught exception: THE BRIDGE DIES. `'exit'` covers a worker
 *                  that dies mid-probe; the deadline covers one that neither
 *                  answers nor dies. ALL THREE BECOME A READING.
 *   EPOCH TAGGING  messages carry the epoch of the channel that produced them,
 *                  and a result from a retired epoch is DISCARDED rather than
 *                  adopted as a fresh reading.
 *   CLOSURE        `resetProbeChannel()` terminates the worker and closes the
 *                  port. A thread nobody is awaiting should not exist.
 *
 * `test/health.lifecycle.test.mjs` CONSTRUCTS each failure — a worker that throws
 * at load, one that exits, one that stays silent — rather than asserting that the
 * handlers exist, because a structural pin is not a behavioural proof.
 *
 * @module creator-brains-console/lib/health-probe
 */

import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads';

/**
 * How long a started probe may stay silent before it is declared failed.
 *
 * Deliberately below the engine's own 60 s `execFileSync` timeout: the engine's
 * timeout covers the SUBPROCESS, this one covers the WORKER. A worker wedged
 * before it ever spawns anything would otherwise be awaited forever.
 */
export const PROBE_TIMEOUT_MS = 45_000;

/** The live channel: the worker, the main-thread port, and the epoch owning both. */
let channel = null;

/** Is a probe already running? One in flight at a time, per read of the TTL. */
let inFlight = false;

/** When the in-flight probe stops being believable. */
let deadlineMs = 0;

/** The current epoch. Bumped whenever a channel is retired. */
let epoch = 0;

/** A failure waiting to be taken as a reading, or `null`. */
let failure = null;

/**
 * A result drained from the port but not yet handed to a caller.
 *
 * It exists for one race: a worker may post its answer and THEN exit. The answer
 * is already in the port buffer when `'exit'` runs, so declaring "exited before
 * answering" would discard a good result in favour of a worse one.
 */
let result = null;

/** The worker script. Injectable so a FAILING worker can be constructed (R2-04). */
let workerUrl = new URL('./health-probe.worker.mjs', import.meta.url);

/** The reading a failed worker produces — a verdict, never a thrown error. */
function failureReading(reason, now) {
  return { value: { ok: false, version: null, reason, workerFailed: true }, atMs: now };
}

/**
 * Drain the port, discarding obsolete epochs. Returns a current result or `null`.
 * The loop is the point: one `receiveMessageOnPort` call would leave a stale
 * message in front of a live one and starve the live result for another read.
 */
function drain(ch) {
  for (;;) {
    let msg;
    try { msg = receiveMessageOnPort(ch.port); } catch { return null; }
    if (!msg) return null;
    const m = msg.message;
    if (m && m.epoch === ch.epoch) return m;
    // An obsolete epoch: removed from the port and thrown away.
  }
}

/**
 * Terminate a channel and close its port. Idempotent, and it bumps the epoch.
 *
 * The bump is the version tag R2-04 asks for: anything the retired worker had
 * queued, or is about to emit, belongs to an epoch that is no longer current and
 * is therefore discarded rather than adopted.
 */
function retire(ch) {
  if (!ch) return;
  ch.closing = true;
  epoch += 1;
  try { ch.port.close(); } catch { /* already closed */ }
  try { ch.worker.terminate(); } catch { /* already gone */ }
  if (channel === ch) channel = null;
}

/**
 * Record a worker failure as the next reading, and retire the channel.
 *
 * A FAILURE FROM A STALE EPOCH IS DISCARDED. After a reset, the old worker's
 * death is not news about the current probe, and adopting it would attribute a
 * previous caller's crash to the store being read now.
 */
function recordFailure(ch, reason, now = Date.now()) {
  if (ch.closing || ch.epoch !== epoch) return;
  // A DEATH WE ARE NOT WAITING ON IS NOT NEWS. With no probe in flight the
  // result has either been collected already or was never asked for, so retiring
  // the channel is enough. Recording a failure here would report a healthy
  // answer as a crash — which is the mirror image of the defect being fixed.
  if (inFlight) {
    failure = failureReading(reason, now);
    inFlight = false;
    deadlineMs = 0;
  }
  retire(ch);
}

function ensureChannel() {
  if (channel) return channel;
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(workerUrl, {
    workerData: { port: port2 },
    transferList: [port2],
  });
  const ch = { worker, port: port1, epoch, closing: false };
  // THE HANDLERS ARE NOT DEFENSIVE PADDING (R2-04) — see the header. Without the
  // first, a worker that cannot start is an uncaught exception in the bridge.
  worker.on('error', (err) => recordFailure(
    ch,
    `the yt-dlp probe worker failed: ${err && err.message ? err.message : err}`,
  ));
  worker.on('messageerror', () => recordFailure(
    ch, 'the yt-dlp probe worker sent a message that could not be deserialised',
  ));
  worker.on('exit', (code) => {
    // DRAIN BEFORE DECLARING FAILURE. A worker may post its answer and then exit;
    // that answer is already in the port buffer, and announcing "exited before
    // answering" would discard a good result in favour of a worse one.
    const queued = ch.closing ? null : drain(ch);
    if (queued) {
      result = queued;
      inFlight = false;
      deadlineMs = 0;
      retire(ch);
      return;
    }
    recordFailure(ch, `the yt-dlp probe worker exited before answering (code ${code})`);
  });
  worker.unref();
  port1.unref();
  channel = ch;
  return ch;
}

/**
 * Ask for a probe. Returns `true` if one was started, `false` if one is already
 * running — the caller reports the difference honestly rather than pretending a
 * second probe would help.
 *
 * A WORKER THAT CANNOT EVEN BE CONSTRUCTED IS A READING, NOT A THROW (R2-04).
 * The failure is recorded for `takeProbe` to hand back through the same path a
 * real probe result travels, so the caller has one code path rather than two.
 */
export function requestProbe() {
  if (inFlight) return false;
  let ch;
  try {
    ch = ensureChannel();
  } catch (err) {
    failure = failureReading(
      `the yt-dlp probe worker could not be started: ${err && err.message ? err.message : err}`,
      Date.now(),
    );
    inFlight = false;
    return false;
  }
  inFlight = true;
  deadlineMs = Date.now() + PROBE_TIMEOUT_MS;
  ch.port.postMessage({ go: true, epoch: ch.epoch });
  return true;
}

/**
 * Collect a completed probe, or `null` when none has arrived.
 *
 * `receiveMessageOnPort` is the whole reason this design works: it is
 * SYNCHRONOUS and NON-BLOCKING, so `healthReading` can stay synchronous while
 * the subprocess runs on another thread. Obsolete-epoch messages are discarded by
 * `drain` rather than adopted (R2-04).
 */
export function takeProbe(now = Date.now()) {
  // AN ANSWER BEATS A DEATH. A result drained by the `'exit'` handler is a real
  // verdict and is handed over before any recorded failure.
  if (result) {
    const r = result;
    result = null;
    return r;
  }
  // A RECORDED WORKER FAILURE IS A RESULT. It travels the same channel as a
  // probe so the caller never has to know which one it is holding.
  if (failure) {
    const f = failure;
    failure = null;
    return { value: f.value, atMs: f.atMs, epoch };
  }

  let ch;
  try {
    ch = ensureChannel();
  } catch (err) {
    inFlight = false;
    deadlineMs = 0;
    return failureReading(
      `the yt-dlp probe worker could not be started: ${err && err.message ? err.message : err}`,
      now,
    );
  }

  const m = drain(ch);
  if (m) {
    inFlight = false;
    deadlineMs = 0;
    return m;
  }

  // THE WATCHDOG. A probe that has neither answered nor died is still a fact the
  // console must report, and silence is the one outcome the port cannot express.
  if (inFlight && now >= deadlineMs) {
    inFlight = false;
    deadlineMs = 0;
    const reading = failureReading(
      `the yt-dlp probe did not answer within ${PROBE_TIMEOUT_MS} ms`, now,
    );
    retire(ch);
    return reading;
  }
  return null;
}

/**
 * Test seam and shutdown path: forget the worker so a fresh one is created on
 * the next request.
 *
 * IT NOW ACTUALLY CLOSES THINGS (R2-04). Clearing the Boolean alone left the
 * thread running and the port open, so the seam's promise — no inherited probe —
 * was false for the thread even while it was true for the flag.
 */
export function resetProbeChannel() {
  inFlight = false;
  failure = null;
  result = null;
  deadlineMs = 0;
  const ch = channel;
  channel = null;
  retire(ch);
}

/**
 * Test seam: point the probe at a different worker script. `null` restores the
 * real one.
 *
 * WHY THIS SEAM EXISTS AT ALL (R2-04). The property "a worker that cannot start
 * becomes a reading" lives entirely in the `'error'` and `'exit'` handlers, and
 * the real worker starts perfectly — so no test can reach that code through it.
 * Without a way to CONSTRUCT the failure, a test could only assert that the
 * handler is present, which is a structural pin rather than a behavioural proof.
 * Supplying a worker that throws at load, or exits immediately, is what makes the
 * behaviour observable; see `test/health.lifecycle.test.mjs`.
 */
export function setProbeWorkerForTest(url) {
  resetProbeChannel();
  workerUrl = url ? new URL(url) : new URL('./health-probe.worker.mjs', import.meta.url);
}

```

### B/packages/creator-brains-console/lib/health-probe.worker.mjs — 50 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-probe.worker.mjs
 * PURPOSE: Run the engine's BLOCKING `selfCheck()` off the bridge's event loop.
 * PART OF: Creator Brains Console (A1-10, Astra adjudication 2026-09-20)
 * ============================================================================
 *
 * WHY THIS THREAD EXISTS. `selfCheck()` → `runCaptured()` → `execFileSync`
 * (`ytdlp.mjs:184`), with a **60 s** timeout. MEASURED 2026-09-20 on this
 * machine: a cold `GET /api/status` took **1709 ms**, of which **1699 ms** was
 * the event loop being frozen — 99.4% of the request was the bridge unable to
 * answer anything else. The TTL cache bounds how OFTEN that happens and does
 * nothing about how LONG, which is exactly what A1-10 says: "caching reduces
 * blocking frequency, not blocking duration."
 *
 * A worker thread is the only way to keep the engine's own synchronous
 * implementation — which this console must not fork and must not modify, the
 * engine being additive-only — while giving the event loop back.
 *
 * THE PORT ARRIVES VIA `workerData`, transferred. The main thread holds the
 * other end and polls it with `receiveMessageOnPort`, which is synchronous and
 * does NOT block, so `healthReading` stays a synchronous function and the ~40
 * call sites that depend on that keep working.
 *
 * @module creator-brains-console/lib/health-probe.worker
 */

import { workerData } from 'node:worker_threads';
import { selfCheck } from '../../../scripts/creator-brains/lib/ytdlp.mjs';

const port = workerData.port;

port.on('message', (msg) => {
  if (!msg || msg.go !== true) return;

  let value;
  try {
    value = selfCheck();
  } catch (e) {
    // A throw must still produce a message. The main thread is waiting on this
    // port, and silence is indistinguishable from "the probe never ran" — which
    // is the failure mode that would turn a crash into an infinite "unknown".
    value = { ok: false, reason: `the probe threw: ${e.message}`, version: null };
  }
  // THE EPOCH COMES BACK (R2-04). The main thread uses it to tell a result it is
  // still waiting for from one produced by a channel it has already retired —
  // without the echo, a result that arrives after `resetProbeChannel()` would be
  // adopted as a fresh reading for the next caller.
  port.postMessage({ value, atMs: Date.now(), epoch: msg.epoch });
});

```

### B/packages/creator-brains-console/lib/health-cache.mjs — 88 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-cache.mjs
 * PURPOSE: The process-local health cache, KEYED BY CANONICAL STORE ROOT (R2-04).
 * PART OF: Creator Brains Console (R2-04, Astra round 2)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE. `health.mjs` stood at 296 lines against the repo's
 * hard 300-line cap (CLAUDE.md rule 4), and R2-04 required keying the cache by
 * store root. The cap is not cosmetic — it exists so that a reviewer can hold one
 * concern in view at once — so the fix was to move the cache out rather than to
 * grow the file. **Extract at the seam; never raise the cap.**
 *
 * THE DEFECT THIS FILE FIXES. `healthReading` accepts a store root `r` because
 * the history fallback reads THAT store's `canary.json`. The cache, though, was a
 * single module-level slot. Two roots read in one process therefore shared one
 * answer: the first read consulted the correct store's canary, and every later
 * read — for a DIFFERENT store — served that answer as though it were its own. A
 * correct answer for store A presented as a correct answer for store B is the
 * worst shape of this bug, because nothing in the reading looks wrong.
 *
 * The key is `realpathSync`-resolved, so `./store`, `store/` and a junction to
 * the same directory are ONE entry rather than three. A path that does not exist
 * yet falls back to its resolved absolute form, because a store root is often
 * named before anything has created it.
 *
 * @module creator-brains-console/lib/health-cache
 */

import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * How many distinct roots keep a cached reading.
 *
 * One store is the real case. The bound exists because the console's own test
 * suite creates a fresh temp root per test, and an unbounded Map would hold a
 * reading for every root the process had ever seen — a slow leak whose only
 * symptom is memory. Eviction is least-recently-used: `putCached` re-inserts, so
 * the Map's iteration order is the order of last write.
 */
export const MAX_CACHED_ROOTS = 4;

/**
 * The key used when a caller passes no store root at all.
 *
 * NOT the same as "do not cache". A reading taken without a root still has a
 * probe result worth serving for the TTL — it simply has no history fallback —
 * and conflating the two would make the no-root path re-probe on every read.
 */
const NO_ROOT = '<no store root>';

/** The canonical key for a store root. */
export function cacheKey(r) {
  if (!r) return NO_ROOT;
  const abs = resolve(r);
  try {
    return realpathSync(abs);
  } catch {
    return abs; // named but not yet created — still a distinct store
  }
}

const caches = new Map();

/** The cached reading for a root, or `null` when none has been taken. */
export function getCached(key) {
  return caches.get(key) ?? null;
}

/** Install a reading for a root, evicting the least recently used root if needed. */
export function putCached(key, entry) {
  caches.delete(key);
  caches.set(key, entry);
  while (caches.size > MAX_CACHED_ROOTS) {
    caches.delete(caches.keys().next().value);
  }
}

/** Forget every root. This is the test seam, and it is why a reset is a reset. */
export function clearCaches() {
  caches.clear();
}

/** How many roots currently hold a reading — lets a test prove the bound holds. */
export function cachedRootCount() {
  return caches.size;
}

```

### B/packages/creator-brains-console/lib/health.mjs — 290 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health.mjs
 * PURPOSE: The bridge's read-time cache for the engine's BLOCKING health probe,
 *          and the honest fallback when a fresh probe cannot be taken.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3; perf budget 02 §6)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS — a measured defect, not a guess.
 *
 * The engine's health reading is `selfCheck()` in `lib/ytdlp.mjs`. It shells out
 * to `yt-dlp --version`, and on Sean's machine that costs 1.7-3.4 SECONDS
 * (measured 2026-09-17: 3439 ms cold, 1809/1742 ms warm). The CLI pays that once
 * per invocation, which is fine — a human ran `status` and waits.
 *
 * The console does not pay it once. It pays it PER REQUEST, and from slice S4 the
 * RunConsole polls `/api/status` every 2 seconds while a run is active:
 *
 *   * every poll would block the bridge's only thread for ~2s, so the console
 *     would stutter and the p95 ≤ 50 ms budget in blueprint 02 §6 is impossible;
 *   * every poll would spawn a Python process, so a single daily pass would
 *     start ~900 yt-dlp processes to answer a question whose answer changes
 *     when Sean upgrades a tool — i.e. rarely, and never mid-poll.
 *
 * That is a design defect the bridge introduced by composing a blocking engine
 * function on a hot path. The fix is NOT to stop calling the engine (the
 * compose-don't-reimplement doctrine stands) and NOT to touch the engine (S0's
 * no-go boundary). It is to call the engine ONCE per TTL and serve the cached
 * answer in between.
 *
 * THE SHAPE OF THE CACHE, AND WHY IT IS NOT A LIE.
 *
 * A cached health value is only honest if the reader can tell it is cached. So
 * the payload always carries:
 *
 *   `ok` / `version` / `reason`   the engine's own verdict, verbatim
 *   `checkedAt`                   when that verdict was actually taken
 *   `ageMs`                       how old it is at read time
 *   `source`                      'probe' (live) or 'history' (from the store)
 *   `stale`                       true once the TTL has passed
 *
 * `stale: true` is the console's cue to render an age ("checked 4 min ago"),
 * which is strictly more informative than the CLI's unlabelled instant reading.
 *
 * WHAT HAPPENS WHEN A PROBE CANNOT BE TAKEN. `selfCheck()` can return
 * `{ok:false, reason:'yt-dlp not resolvable'}` — including transiently, e.g. a
 * spawned process refused by a confined environment. A console that renders
 * "MISSING" the moment the last-good reading ages out would be crying wolf about
 * a healthy install. So on a FAILED probe we prefer the engine's own last
 * recorded canary result from the store (`canary.json` via `readCanary`, which
 * the daily pass appends to) and label it `source: 'history'` with its real
 * timestamp. If there is no history either, we say so plainly rather than
 * inventing a date.
 *
 * The `note` field states which of these happened, in the operator's language.
 *
 * @module creator-brains-console/lib/health
 */

import { readCanary } from '../../../scripts/creator-brains/lib/store.mjs';
import { cacheKey, clearCaches, getCached, putCached } from './health-cache.mjs';
import { requestProbe, resetProbeChannel, takeProbe } from './health-probe.mjs';

/**
 * How long a taken probe is served before another is allowed.
 *
 * 60 s is chosen against the two real cadences: the S4 RunConsole polls every
 * ~2 s (so a probe runs ~30× less often), and a human watching the badge sees it
 * refresh inside a minute. It is deliberately NOT infinite — "restart the
 * console to re-check yt-dlp" is a worse answer than waiting a minute.
 */
export const PROBE_TTL_MS = 60_000;

/**
 * Test seam and reset: forget every root's reading AND close the probe channel.
 * The cache is KEYED BY CANONICAL STORE ROOT (R2-04) — see `./health-cache.mjs`,
 * which was extracted rather than grown here because this file sits against the
 * repo's 300-line cap.
 */
export function resetHealthCache() {
  clearCaches();
  resetProbeChannel();
}

/**
 * Take the engine's health reading, at most once per `ttlMs`.
 *
 * @param {object}  [opts]
 * THE WINDOW IS MEASURED FROM THE LAST PROBE, NOT FROM THE LAST READ.
 *
 * These two are easy to confuse and the difference is the whole safety property:
 *
 *   window from the LAST READ  → a poll that runs every 2 s NEVER expires the
 *     cache, so the console would serve one reading from boot for the lifetime
 *     of the process. That is not a cache, it is a lie with a timer on it.
 *   window from the LAST PROBE  → a value lives at most `2 × TTL` under
 *     continuous reads regardless of how often anyone asks, so the console
 *     re-checks yt-dlp at least once a minute no matter how hard it is polled.
 *
 * The implementation enforces the second by refreshing `atMs` on every probe and
 * comparing against it, which is why a read 90 s after the first probe can still
 * be served from a probe taken at 40 s — 50 s of elapsed window, not 90.
 *
 * @param {number}  [opts.ttlMs]  override the TTL (tests use 0 to force a probe)
 * @param {number}  [opts.now]    injectable clock
 * @param {string}  [opts.r]      store root, for the history fallback
 * @param {Function}[opts.probe]  injectable `selfCheck`. WHEN OMITTED — the
 *                                production path — the probe runs OFF THIS
 *                                THREAD (A1-10); see the note on `fresh` below.
 * @returns {{ok:boolean,version:string|null,reason:string,checkedAt:string|null,
 *            ageMs:number|null,source:'probe'|'history'|'unknown',stale:boolean,note:string}}
 */
export function healthReading({
  ttlMs = PROBE_TTL_MS, now = Date.now(), r = null, probe = null,
} = {}) {
  // THE CACHE IS PER STORE ROOT (R2-04). The history fallback reads `r`'s canary,
  // so an answer is only an answer FOR THAT ROOT.
  const key = cacheKey(r);

  // COLLECT FIRST (A1-10). An off-thread result arrives asynchronously, so the
  // only moment it can enter the cache is at the top of a read. Doing this
  // BEFORE the cache check means a result that landed since the last read is
  // visible on this read, rather than after the TTL expires — otherwise a probe
  // finishing 100 ms after a cold read would stay invisible for a full minute.
  if (!probe) collect(key, r, now);

  // `cache.probeAtMs` is the moment of the LAST PROBE — the property documented
  // above depends on never writing a read time into it.
  //
  // NOTE THE TWO CLOCKS. `probeAtMs` answers "when may we probe again?" while
  // `checkedAtMs` answers "how old is the value we are showing?". They differ on
  // purpose: after a failed probe we serve store history, whose age is however
  // old that record is, while still refusing to re-probe until the TTL passes.
  // Collapsing them was the defect — see the FAILURE-CACHING note below.
  const held = getCached(key);
  const cached = held && (now - held.probeAtMs) < ttlMs ? held : null;
  if (cached) return shape(cached, now, ttlMs);

  // THE PRODUCTION PROBE DOES NOT RUN HERE (A1-10). `selfCheck()` shells out via
  // `execFileSync` with a 60 s timeout, so calling it inline freezes the whole
  // bridge: MEASURED 2026-09-20, a cold /api/status took 1709 ms of which
  // 1699 ms was the event loop being blocked. When no `probe` is injected we
  // START one on a worker and answer from what we already have. An injected
  // `probe` is a plain stub, so it is still called inline and every unit test
  // keeps its exact semantics.
  const fresh = probe ? probe() : startOffThread(now);

  // A probe that could not run is a weak answer. Prefer the engine's own last
  // recorded canary over an alarming "not resolvable" that may be transient.
  const history = !fresh.ok && r ? lastCanary(r) : null;

  // FAILURE-CACHING DEFECT (found 2026-09-18, hostile round 2). The first
  // version cached the RAW PROBE before consulting history, so a failed probe
  // was the answer for the whole TTL and the history fallback fired on exactly
  // one read. The fix is to cache the RESOLVED answer — history and failure are
  // both legitimate readings, and what must be stable is which one we show for
  // the window. `compose` is that resolution, written once for both callers.
  const entry = compose(fresh, history, now);
  putCached(key, entry);
  return shape(entry, now, ttlMs);
}

/**
 * Resolve a probe result and the history fallback into ONE cache entry.
 *
 * ONE COPY, TWO CALLERS. The inline path and the off-thread path each used to
 * carry their own copy of this decision, with a comment promising they agreed —
 * and two copies of a rule is exactly how the copies drift. That is the hazard
 * R2-01 found in a contract restated across three files, so the resolution is
 * written once and both callers share it. `atMs` is when the probe actually RAN
 * (the worker stamps it), falling back to the read time for an injected stub.
 */
function compose(fresh, history, now) {
  if (history) {
    return {
      probeAtMs: now,
      checkedAtMs: Date.parse(history.ts),
      value: history.check,
      source: 'history',
      note: 'live probe did not resolve yt-dlp — showing the last recorded canary result instead',
    };
  }
  // A STARTED-BUT-UNFINISHED PROBE IS NOT A VERDICT. Reporting it as
  // `source:'probe'` would present "we have not checked yet" as a live reading —
  // the same class of lie as the failure-caching defect, and the reason
  // `unknown` is a first-class source rather than an absence.
  if (fresh.pending) {
    return {
      probeAtMs: now, checkedAtMs: null, value: fresh, source: 'unknown', note: fresh.reason,
    };
  }
  return {
    probeAtMs: now,
    checkedAtMs: fresh.atMs ?? now,
    value: fresh,
    source: 'probe',
    note: fresh.ok ? null : 'live probe did not resolve yt-dlp',
  };
}

/**
 * Install an off-thread result, if one has arrived since the last read.
 *
 * It resolves through `compose` for the reason stated there: the reading must
 * not depend on which thread the probe happened to run on.
 */
function collect(key, r, now) {
  const done = takeProbe(now);
  if (!done) return;
  const fresh = { ...done.value, atMs: done.atMs };
  const history = !fresh.ok && r ? lastCanary(r) : null;
  putCached(key, compose(fresh, history, now));
}

/**
 * Start the production probe on the worker, and describe the wait honestly.
 *
 * `pending: true` is what marks this as "no verdict yet" rather than a failure.
 * The two reasons differ because they are different facts: the first read starts
 * the probe, a later read inside the TTL finds one already running.
 */
function startOffThread(now) {
  const started = requestProbe();
  // A WORKER THAT COULD NOT START IS A READING ON THIS READ (R2-04), not the
  // next one. A `false` because a probe is genuinely in flight leaves `takeProbe`
  // returning null, so the pending description below still wins.
  const failed = started ? null : takeProbe(now);
  if (failed) return { ...failed.value, atMs: failed.atMs };
  return {
    ok: false,
    version: null,
    reason: started
      ? 'the yt-dlp probe has been started off-thread; this reading predates its result'
      : 'the yt-dlp probe is still running off-thread; this reading predates its result',
    pending: true,
    atMs: now,
  };
}

/** The engine's most recent canary entry, mapped into a health-shaped verdict. */
function lastCanary(r) {
  let entries;
  try {
    entries = readCanary(r);
  } catch {
    return null; // a damaged canary file must not take down the status board
  }
  if (!Array.isArray(entries) || !entries.length) return null;
  const last = entries[entries.length - 1];
  if (!last || !last.ts) return null;
  return {
    ts: last.ts,
    // NOTE THE HONEST LIMIT: the canary record proves a probe+fetch SUCCEEDED at
    // that time, so `ok` is trustworthy — but it is a canary result, not a
    // `--version` reading, so `version` is genuinely unknown here. Reporting the
    // canary's cue count instead of a fabricated version string.
    check: {
      ok: last.ok === true,
      version: null,
      reason: last.ok === true
        ? `last canary ok (${last.cues ?? 0} cues, ${last.lang || 'unknown lang'})`
        : `last canary failed: ${last.error || 'no reason recorded'}`,
    },
  };
}

/**
 * Render a cache entry as the public reading.
 *
 * `ttlMs` is threaded through rather than reading PROBE_TTL_MS directly: the
 * previous version compared the cache window against an injected `ttlMs` but
 * computed `stale` against the module constant, so a test (or any caller) that
 * overrode the TTL got a window and a staleness flag that disagreed.
 */
function shape(entry, now, ttlMs = PROBE_TTL_MS) {
  const ageMs = Number.isFinite(entry.checkedAtMs) ? Math.max(0, now - entry.checkedAtMs) : null;
  return {
    ok: entry.value.ok === true,
    version: entry.value.version ?? null,
    reason: entry.value.reason || '',
    checkedAt: Number.isFinite(entry.checkedAtMs) ? new Date(entry.checkedAtMs).toISOString() : null,
    ageMs,
    source: entry.source,
    // A history reading is always stale-by-definition: it is not a live verdict
    // and must never be presented as one, however recent the record happens to be.
    stale: entry.source === 'history' ? true : ageMs === null ? true : ageMs > ttlMs,
    note: entry.note ?? null,
  };
}

```

### B/packages/creator-brains-console/lib/write-gate.mjs — 232 lines

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/write-gate.mjs
 * PURPOSE: The same-origin write gate — a pre-dispatch gate beside the Host
 *          check. Refuses browser-originated cross-site writes.
 * PART OF: Creator Brains Console (05 §4 trust boundary)
 * SLICE: S0 hardening (A1-09, Astra adjudication 2026-09-20)
 * ============================================================================
 *
 * THE DEFECT THIS CLOSES (A1-09). The packet treated "loopback + Host checking"
 * as the complete trust boundary. It is not. `hostAllowed` defends DNS
 * REBINDING — a remote page whose hostname resolves to 127.0.0.1 after load. It
 * does nothing about the simpler attack: a remote page that already knows the
 * bridge is on `127.0.0.1:<port>` and POSTs to it directly. The browser supplies
 * `Host: 127.0.0.1:<port>` itself, so the Host gate passes, and a
 * `Content-Type: text/plain` body is a CORS "simple request" that triggers no
 * preflight — so the write lands, and `POST /api/creators` / `PATCH` can change
 * which creators are fetched.
 *
 * THREE REQUIREMENTS:
 *
 * 1. A fixed custom header, on every write. Custom headers are never "simple",
 *    so this alone forces a preflight. It is the one requirement that applies
 *    uniformly to POST, PUT, PATCH and DELETE.
 * 2. `Content-Type: application/json` **whenever the request declares a body**.
 *    A form, or a `fetch` with a plain string body, cannot set this — so the
 *    request stops being simple. Kept in addition to (1) so the gate does not
 *    rest on one property; drop the header rule by accident and a hostile POST
 *    is still non-simple.
 * 3. `Origin`, when present, must name loopback. Browsers send `Origin` on every
 *    non-GET request, so a cross-site write is refused on the header itself.
 *    This is the only requirement that *refuses* rather than merely de-simplifies.
 *
 * WHY (2) IS SCOPED TO A DECLARED BODY. A bodyless `DELETE` has no natural media
 * type, and requiring one would make the gate unsatisfiable by a legitimate
 * client — a latent defect of exactly the kind this whole exercise hunts. The
 * header rule still applies to it, so it is not left unguarded.
 *
 * WHY `Origin` IS NOT *REQUIRED*. Demanding it would break every non-browser
 * client — curl, the e2e harness, a future CLI — for no gain. Such a client is
 * not a browser, so there is no cross-site browser attack to stop, and it has
 * already satisfied (1) and (2), which no cross-origin page can satisfy without
 * a preflight the bridge never approves.
 *
 * WHY THE ORIGIN MUST BE THE BRIDGE'S OWN ORIGIN, AND NOT MERELY LOOPBACK
 * (R2-05, Astra round 2, 2026-09-20). The first version accepted *any* loopback
 * origin, on any port. That is not "same-origin"; it is "same machine", and it
 * is the same defect the Host gate beside it had already been fixed for — see
 * the comment at `server.mjs:100`, which records that degrading to "any loopback
 * host" "silently weakened the DNS-rebinding defence". This gate then repeated
 * that mistake one round later, in the adjacent gate, which is exactly why the
 * two are now written to agree.
 *
 * The justification the first version gave was that a Vite dev server on :5173
 * is a legitimate local front-end and should be able to write. **That
 * justification does not survive contact with a browser, and it protected
 * nothing.** A write carries a custom header, so a cross-origin request triggers
 * a preflight; the bridge grants no CORS permission (see below), so the browser
 * blocks it before it is sent. So the dev server could never have written
 * through this gate. And it does not need to: `vite.config.ts` has no proxy, so
 * a dev-server write does not reach the bridge at all — it 404s against Vite.
 * The rule was refusing nobody legitimate while admitting every local origin.
 *
 * `LocalEngineAdapter.ts:46` defaults `baseUrl` to `window.location.origin` —
 * "the bridge serves the app" — so in the only supported configuration the
 * Origin IS the serving origin and exact equality holds. **A rule that only
 * refuses friends is not a guard**, and this one now refuses every origin that
 * is not this bridge: a hostile local page on :5173, a rebound page, and a
 * remote page are all refused, because none of them is served by this port.
 *
 * WHY `localhost` AND `127.0.0.1` ARE BOTH ACCEPTED AT THE SAME PORT. They
 * resolve to the same loopback socket on every platform this console runs on, so
 * a user who types `http://localhost:<port>` loads *our* page and the browser
 * sends that spelling as the Origin. Refusing it would break the app for a
 * spelling, which is the failure mode the old rule was invented to avoid — and
 * accepting it admits nothing, because no other process can serve that name on
 * the port the bridge holds. `[::1]` is deliberately NOT accepted: the bridge
 * binds `127.0.0.1` only (`server.mjs` constraint 2), so `[::1]:<port>` is a
 * different socket and therefore a different server.
 *
 * WHY A MISSING SERVING ORIGIN REFUSES RATHER THAN ALLOWS. The gate cannot
 * evaluate a rule whose right-hand side it does not have. Failing open there
 * would silently restore the defect for any future call site that forgot the
 * argument, so it fails closed with a message that names the misconfiguration —
 * a loud broken write, never a quiet hole.
 *
 * WHY THE HEADER IS NAMED `x-console-write` AND NOT AFTER THE PROJECT. The
 * client must send the same string, and the client lives under `web/src`, which
 * `web/src/test/no-engine-import.test.ts` scans for any quoted literal
 * containing `creator-brains` (pattern 1, T-W2). A header named
 * `x-creator-brains-console` would therefore fail the boundary guard the moment
 * the adapter sent it — forcing either an exemption in that guard or a
 * string-splicing evasion. Both are worse than picking a neutral name, so the
 * name is neutral. `bridge.writegate.test.mjs` asserts the two sides agree.
 *
 * NO CORS PERMISSION IS EVER GRANTED. Nothing here, and nothing in `http.mjs`,
 * emits `Access-Control-Allow-Origin` — so a preflight fails and the browser
 * blocks the request before it is sent. That is what lets this gate stay simple:
 * it does not have to recognise every hostile shape, only to stop the request
 * being *simple* in the first place.
 *
 * READS ARE DELIBERATELY UNAFFECTED. `hostAllowed` already refuses cross-origin
 * reads by host, a read cannot mutate consent state, and applying a media-type
 * rule to GET would break the address bar.
 *
 * @module creator-brains-console/lib/write-gate
 */

/** Methods that can mutate. Everything else is a read, for gate purposes. */
export const WRITE_METHODS = Object.freeze(new Set(['POST', 'PUT', 'PATCH', 'DELETE']));

/** The fixed custom header a write client must send. See the name note above. */
export const REQUIRED_HEADER = 'x-console-write';

/** The only media type accepted on a write that carries a body. */
export const REQUIRED_MEDIA_TYPE = 'application/json';

/** The only scheme this bridge serves. No TLS, so an `https:` Origin is never ours. */
const SCHEME = 'http:';

/**
 * Loopback names that reach the SAME socket as the bridge.
 *
 * The key is the host the bridge actually serves as; the value is every spelling
 * that resolves to it. See the `[::1]` note in the header — it is absent on
 * purpose, because the bridge binds `127.0.0.1` only.
 */
const SAME_SOCKET = Object.freeze({
  '127.0.0.1': Object.freeze(['127.0.0.1', 'localhost']),
  localhost: Object.freeze(['127.0.0.1', 'localhost']),
});

/**
 * Is this `Origin` the bridge's own origin?
 *
 * Two independent requirements, and both are needed: the host must be a spelling
 * of the socket the bridge holds, and the port must be the port it holds. The
 * port is the load-bearing half — a hostile local page on another port has a
 * loopback host and a different port, which is precisely the case the first
 * version admitted.
 *
 * TOTAL BY CONSTRUCTION. `new URL` throws on a malformed origin, and this runs
 * inside the request path, where an exception is a dead bridge — so every parse
 * is guarded and a malformed Origin is a refusal, never a throw.
 *
 * @param origin        the request's `Origin` header, if any
 * @param servingOrigin the bridge's own origin, `http://<host>:<boundPort>`
 */
export function originAllowed(origin, servingOrigin) {
  if (typeof origin !== 'string' || origin === '') return false;
  if (typeof servingOrigin !== 'string' || servingOrigin === '') return false;

  let claimed;
  let serving;
  try {
    claimed = new URL(origin);
    serving = new URL(servingOrigin);
  } catch {
    return false; // a malformed origin is refused, not thrown on — see above
  }

  if (claimed.protocol !== SCHEME || serving.protocol !== SCHEME) return false;
  // An origin with no explicit port is the scheme default (80), which is not the
  // bridge's port unless it happens to have bound 80. Comparing the normalised
  // `port` handles that without a special case.
  if (claimed.port !== serving.port) return false;

  const spellings = SAME_SOCKET[serving.hostname];
  return Array.isArray(spellings) && spellings.includes(claimed.hostname);
}

/**
 * Does the request declare a body? `content-length: 0` is not a body; a chunked
 * request is. `Number(undefined)` is `NaN`, so an absent length falls through.
 */
function declaresBody(headers) {
  const len = Number(headers['content-length']);
  if (Number.isFinite(len) && len > 0) return true;
  return headers['transfer-encoding'] !== undefined;
}

/**
 * Evaluate the gate.
 *
 * Returns `null` when the request may proceed, or `{code, message}` to answer
 * with a 403 — the same shape the Host gate uses, so the two security gates read
 * alike at the call site.
 *
 * @param req           the incoming request
 * @param servingOrigin the bridge's own origin, `http://<host>:<boundPort>`.
 *                      REQUIRED: omitting it refuses any request that carries an
 *                      `Origin`, rather than quietly allowing it (R2-05).
 */
export function writeGateFailure(req, servingOrigin) {
  if (!WRITE_METHODS.has(req.method)) return null;

  const headers = req.headers;

  if (headers[REQUIRED_HEADER] === undefined) {
    return {
      code: 'FORBIDDEN_WRITE',
      message: `writes must carry the ${REQUIRED_HEADER} header`,
    };
  }

  const media = String(headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (declaresBody(headers) && media !== REQUIRED_MEDIA_TYPE) {
    return {
      code: 'FORBIDDEN_WRITE',
      message: `a write body must be ${REQUIRED_MEDIA_TYPE}; '${media || '(absent)'}' is refused`,
    };
  }

  const origin = headers.origin;
  if (origin === undefined) return null; // a non-browser client — see the header

  if (typeof servingOrigin !== 'string' || servingOrigin === '') {
    return {
      code: 'FORBIDDEN_WRITE',
      message: 'the bridge could not evaluate the Origin rule: no serving origin was supplied',
    };
  }
  if (!originAllowed(origin, servingOrigin)) {
    return {
      code: 'FORBIDDEN_WRITE',
      message: `cross-origin write from '${String(origin).slice(0, 120)}' is refused; `
        + `this bridge serves '${servingOrigin.slice(0, 120)}'`,
    };
  }

  return null;
}

```


## PART C — the tests that claim to cover the fixes (verbatim)

### C/packages/creator-brains-console/test/bridge.readsurface.test.mjs — 246 lines

```js
/*
 * R2-02 — THE READ SURFACE IS CONTAINED AT BOTH ENTRY POINTS (Astra round 2).
 *
 * WHY THIS FILE EXISTS. The drawer's containment covered the generation
 * DIRECTORY. It did not cover the pointer file, the namespace directory, any
 * leaf, or the QUERY route at all — and `queryBrains` resolves pointers itself,
 * so the query path never reached the drawer's check. Astra's probe returned a
 * hit after reading `outside/rules.jsonl`.
 *
 * A BOUNDARY AT ONE ENTRY POINT IS A BOUNDARY IMPLEMENTED ONCE AND A HALF. Every
 * vector below is therefore asserted against BOTH routes. A fix that closed the
 * drawer and left the query open would pass a drawer-only test.
 *
 * THE LINKS ARE REAL JUNCTIONS, NOT MOCKED PATHS. Astra's fix note asks for
 * "real Windows filesystem tests as a release gate", and the reason is the lesson
 * this suite has already learned twice: a test that cannot construct its own
 * attack proves nothing. A mocked filesystem would prove the check runs; only a
 * real junction proves it SEES what `readFileSync` would follow. Junctions are
 * creatable without administrator rights on Windows, which is why they are used
 * rather than symlinks.
 *
 * Every junction test asserts the junction EXISTS and RESOLVES OUTSIDE before it
 * asserts the refusal. Without that, a silently failed `symlinkSync` would leave
 * the test passing while testing an ordinary directory.
 *
 * @module creator-brains-console/test/bridge.readsurface
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';

/** A generation directory OUTSIDE the store, with content a leak would expose. */
function outsideGeneration(label) {
  const outside = tempRoot(`${label}-outside`);
  const gen = join(outside, 'gen-0001');
  mkdirSync(gen, { recursive: true });
  writeFileSync(join(gen, 'index.md'), '# OUTSIDE\n\nthis file is not in the store', 'utf8');
  writeFileSync(join(gen, 'topics.md'), '- outside topic', 'utf8');
  writeFileSync(join(gen, 'timeline.md'), '- 00:00 outside', 'utf8');
  writeFileSync(join(gen, 'rules.jsonl'), `${JSON.stringify({
    claim_id: 'leaked-claim-1',
    creator_id: 'outside',
    video_id: 'v1111111111',
    t_start_ms: 1000,
    topic: 'leaked',
    statement: 'a claim that lives outside the brains store',
    key_phrase: 'leaked claim',
    cites: [],
    modality: 'asserts',
    polarity: 'affirms',
  })}\n`, 'utf8');
  return outside;
}

/** Point an existing brain at a different generation. */
function repoint(r, ns, generation) {
  writeFileSync(
    join(r, 'brains', ns, 'current.json'),
    JSON.stringify({ schema_version: 1, creator_id: ns, label: ns, title: 'Hostile', generation }),
    'utf8',
  );
}

/**
 * Make a junction and PROVE it resolves outside the store before returning.
 *
 * The proof is the point: a test that fails to create its attack must fail
 * loudly, not pass quietly against an ordinary directory.
 */
function junction(target, linkPath, storeRoot) {
  symlinkSync(target, linkPath, 'junction');
  const real = realpathSync(linkPath);
  const realStore = realpathSync(storeRoot);
  assert.ok(
    !real.toLowerCase().startsWith(realStore.toLowerCase()),
    `the junction at '${linkPath}' resolved to '${real}', which is INSIDE the store — the attack was not constructed`,
  );
  return real;
}

/** Both entry points must refuse, and neither may serve the outside content. */
async function assertBothRoutesRefuse(base, ns, query = 'q=leaked') {
  const drawer = await getRaw(base, `/api/brains/${ns}`);
  assert.equal(drawer.status, 409, 'the drawer must refuse a store it cannot vouch for');
  assert.ok(!drawer.text.includes('OUTSIDE'), 'no outside content may reach the drawer');

  const search = await getRaw(base, `/api/query?${query}`);
  assert.equal(search.status, 409, 'the query route must refuse the same store');
  assert.ok(!search.text.includes('OUTSIDE'), 'no outside content may reach the query route');
  assert.ok(!search.text.includes('leaked-claim-1'), 'and no outside CLAIM either');
}

/* ── the round-2 probe, both routes ──────────────────────────────────────── */

test('R2-02a: a pointer naming a traversal generation is refused on BOTH routes', async () => {
  await withFixture('r2-02a', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    // Exactly the round-2 probe: the pointer itself is the vector.
    repoint(r, ns, '../../../outside/gen-0001');
    await assertBothRoutesRefuse(base, ns);
  });
});

/* ── real junctions: generation, namespace, leaf ─────────────────────────── */

test('R2-02b: a JUNCTION standing in for the generation directory is refused', async () => {
  await withFixture('r2-02b', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    const outside = outsideGeneration('r2-02b');
    // Lexically inside the store, really outside it — the shape `inside()` alone
    // cannot see and `realpathSync` can.
    junction(outside, join(r, 'brains', ns, 'gen-0002'), join(r, 'brains'));
    repoint(r, ns, 'gen-0002');
    await assertBothRoutesRefuse(base, ns);
  });
});

test('R2-02c: a JUNCTION standing in for the NAMESPACE directory is refused', async () => {
  await withFixture('r2-02c', async ({ r, base }) => {
    const outside = outsideGeneration('r2-02c');
    // The whole namespace is a link, and the pointer inside it is well-formed —
    // so nothing but a real-path check can tell this from a legitimate brain.
    junction(outside, join(r, 'brains', 'hostile-ns'), join(r, 'brains'));
    const drawer = await getRaw(base, '/api/brains/hostile-ns');
    assert.equal(drawer.status, 409);
    // The query route walks EVERY entry, so it must refuse even though the caller
    // never named the poisoned namespace.
    const search = await getRaw(base, '/api/query?q=leaked');
    assert.equal(search.status, 409, 'the whole-surface pass must see it');
    assert.ok(!search.text.includes('leaked-claim-1'));
  });
});

/*
 * R2-02d — THE LEAF. Read the note on TARGETING THE MUTATION before trusting this.
 *
 * A junction can only point at a DIRECTORY, so reading one raises EISDIR — which
 * the leaf reader refuses anyway. A status-only assertion therefore passes with
 * the leaf containment REMOVED, refusing for the wrong reason. What distinguishes
 * the two is the MESSAGE: containment refuses because the leaf ESCAPES, and the
 * unreadable-leaf path refuses because it could not be read. Only the first is a
 * boundary, so the REASON is asserted. (A file symlink would give a readable
 * escaping leaf, but `symlinkSync` returns EPERM without Developer Mode, so it is
 * not available as a release gate here.)
 *
 * EVERY LEAF GETS ITS OWN TEST, AND THAT IS NOT PADDING. The four leaves are read
 * by TWO code paths — `rules.jsonl` by `readClaims`, the three documents by the
 * page loop — so a single-leaf test only ever enters one of the two guards. The
 * first version of this test used `rules.jsonl` alone and was recorded as green
 * under a mutation applied to the DOCUMENT guard: the mutation was on a code path
 * the test never reached, so the "proof" was worth nothing. Four named tests are
 * what let the two mutants redden DIFFERENT tests.
 */
const LEAF_FILES = ['index.md', 'topics.md', 'timeline.md', 'rules.jsonl'];

test('R2-02d0: the leaf list covers EVERY file the store publishes', async () => {
  await withFixture('r2-02d0', async ({ r }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    const published = readdirSync(join(r, 'brains', ns, 'gen-0001')).sort();
    assert.deepEqual(
      published, [...LEAF_FILES].sort(),
      'the leaf tests must cover every published file, or a guard goes untested',
    );
  });
});

for (const file of LEAF_FILES) {
  const label = `r2-02d-${file.replace(/\W/g, '-')}`;
  test(`R2-02d/${file}: a JUNCTION standing in for a leaf is refused`, async () => {
    await withFixture(label, async ({ r, base }) => {
      const { ns } = seedPublishedBrain(r, BRAIN_NS);
      const outside = outsideGeneration(label);
      // The generation directory is REAL and contained. Only the leaf escapes —
      // which is exactly the case the pre-R2-02 reader served.
      const leaf = join(r, 'brains', ns, 'gen-0001', file);
      rmSync(leaf); // symlinkSync refuses to overwrite, which is how this was caught
      junction(outside, leaf, join(r, 'brains'));

      const drawer = await getRaw(base, `/api/brains/${ns}`);
      assert.equal(drawer.status, 409);
      assert.match(
        drawer.text, /resolves outside the brains store/,
        `${file} must be refused for ESCAPING, not merely for being unreadable`,
      );
      assert.ok(!drawer.text.includes('OUTSIDE'), 'and no outside content may be served');

      // The query half: the whole-surface pass must see the same leaf.
      const search = await getRaw(base, '/api/query?q=leaked');
      assert.equal(search.status, 409, 'the query route must refuse the same store');
      assert.ok(!search.text.includes('leaked-claim-1'), 'and must not serve the outside claim');
    });
  });
}

/* ── A2-R2-01 · a failed read is not an absent file ──────────────────────── */

test('R2-02e: a leaf that cannot be READ is damage, not absence (A2-R2-01)', async () => {
  await withFixture('r2-02e', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    // A directory where a document belongs. `readFileSync` raises EISDIR — a
    // non-ENOENT failure, constructible on Windows without privileges, and the
    // stand-in for any permission or I/O fault. The old reader caught everything
    // and reported "missing from the published generation", which presents an
    // unreadable store as a creator who published nothing.
    const leaf = join(r, 'brains', ns, 'gen-0001', 'index.md');
    const saved = readFileSync(leaf, 'utf8');
    assert.ok(saved.includes('Fixture'), 'precondition: the leaf was a real file');
    // Replace the file with a directory of the same name.
    rmSync(leaf);
    mkdirSync(leaf);

    const drawer = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(drawer.status, 409, 'an unreadable leaf is store damage');
    assert.ok(!/missing from the published generation/.test(drawer.text), 'and must NOT be reported as absent');
  });
});

/* ── the fix must not be "refuse everything" ─────────────────────────────── */

test('R2-02f: an ordinary store still serves BOTH routes', async () => {
  await withFixture('r2-02f', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    const drawer = await getJson(base, `/api/brains/${ns}`);
    assert.equal(drawer.status, 200);
    assert.equal(drawer.body.generation, 'gen-0001');
    assert.ok(drawer.body.index.includes('Fixture'));

    const search = await getJson(base, '/api/query?q=fixture');
    assert.equal(search.status, 200);
    assert.equal(search.body.hits.length, 1, 'the containment pass must not drop real hits');
  });
});

test('R2-02g: a store with no brains at all is not damage', async () => {
  await withFixture('r2-02g', async ({ r, base }) => {
    // The pass walks `brains/` — an empty directory must not be an escape, and
    // must not be reported as damage. Absence is not a fault.
    const search = await getRaw(base, '/api/query?q=anything');
    assert.equal(search.status, 200);
  });
});

```

### C/packages/creator-brains-console/test/health.lifecycle.test.mjs — 239 lines

```js
/*
 * R2-04 — THE WORKER'S FAILURE LIFECYCLE, PROVEN BY CONSTRUCTING FAILURES.
 *
 * WHY THE OLD TEST WAS NOT ENOUGH (R2-08). `health.offthread.test.mjs:121`
 * asserted that a reset cleared the in-flight flag. That is a statement about a
 * Boolean, and it was the whole of the coverage for a worker that had no `'error'`
 * handler, no `'exit'` handler, no deadline, and no closure. Astra round 2 put it
 * plainly: the worker had no owned failure lifecycle.
 *
 * THE CLAIM BEING TESTED IS "IT BECOMES A READING". Not "a handler is attached" —
 * a handler can be attached and never fire, and a structural pin is not a
 * behavioural proof. So every worker below is a REAL worker script on disk, and
 * each one fails in a different way:
 *
 *   throws            an uncaught throw while the module loads → `'error'`
 *   exits             `process.exit(3)` without answering → `'exit'`
 *   silent            accepts the port and never answers → the deadline
 *   slow              answers after 400 ms, so a result can be made obsolete
 *   answersThenExits  answers and then exits — must NOT read as a crash
 *
 * WITHOUT A SEAM THIS FILE COULD NOT EXIST. The real worker starts perfectly, so
 * no test can reach the failure handlers through it. `setProbeWorkerForTest` is
 * what makes the failures constructible; the seam is documented in
 * `lib/health-probe.mjs` as the reason it exists.
 *
 * THE FIRST TEST IS ALSO THE PROOF THAT THE PROCESS SURVIVES. With no `'error'`
 * listener, a worker's uncaught throw is an uncaughtException and this file would
 * never report a result at all.
 *
 * @module creator-brains-console/test/health.lifecycle
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import {
  PROBE_TIMEOUT_MS, requestProbe, resetProbeChannel, setProbeWorkerForTest, takeProbe,
} from '../lib/health-probe.mjs';

const PORT = "import { workerData } from 'node:worker_threads';\nconst port = workerData.port;\n";

const WORKER_DIR = tempRoot('r204-workers');

/** A file the `heartbeat` worker appends to, so termination is OBSERVABLE. */
const BEAT_FILE = join(WORKER_DIR, 'beat.txt');
writeFileSync(BEAT_FILE, '', 'utf8');

/** The failing workers. Written to disk so they are real, not simulated. */
const SCRIPTS = {
  throws: 'throw new Error("this worker cannot initialise");\n',
  exits: 'process.exit(3);\n',
  silent: `${PORT}port.on('message', () => { /* deliberately never answers */ });\n`,
  slow: `${PORT}port.on('message', (msg) => {\n`
    + "  if (!msg || msg.go !== true) return;\n"
    + '  setTimeout(() => {\n'
    + "    port.postMessage({ value: { ok: true, version: 'STALE' }, atMs: Date.now(), epoch: msg.epoch });\n"
    + '  }, 400);\n'
    + '});\n',
  // Answers at ~200 ms and exits at ~500 ms, so a test can read AFTER both events.
  answersThenExits: `${PORT}port.on('message', (msg) => {\n`
    + "  if (!msg || msg.go !== true) return;\n"
    + "  port.postMessage({ value: { ok: true, version: '9.9.9' }, atMs: Date.now(), epoch: msg.epoch });\n"
    + '  setTimeout(() => { process.exit(0); }, 300);\n'
    + '});\n',
  // Appends a byte every 40 ms. THE ONLY DIRECT OBSERVABLE OF `terminate()`:
  // `process.getActiveResourcesInfo()` does not report unref'd workers or ports
  // (measured), so liveness has to be watched from inside the thread.
  heartbeat: [
    "import { workerData } from 'node:worker_threads';",
    "import { appendFileSync } from 'node:fs';",
    "workerData.port.on('message', () => {});",
    `setInterval(() => { appendFileSync(${JSON.stringify(BEAT_FILE)}, 'x'); }, 40);`,
  ].join('\n') + '\n',
};

const URLS = {};
for (const [name, body] of Object.entries(SCRIPTS)) {
  const file = join(WORKER_DIR, `${name}.mjs`);
  writeFileSync(file, body, 'utf8');
  URLS[name] = pathToFileURL(file).href;
}

const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });

/** Poll for a reading the way the bridge does — the library itself never waits. */
async function waitForReading(budgetMs = 5000) {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const got = takeProbe();
    if (got) return got;
    if (Date.now() >= deadline) return null;
    await sleep(20);
  }
}

/** Run a test body against one failing worker, and always restore the real one. */
async function withWorker(name, fn) {
  setProbeWorkerForTest(URLS[name]);
  try {
    return await fn();
  } finally {
    setProbeWorkerForTest(null);
  }
}

/* ── the three ways a probe can fail to answer ──────────────────────────── */

test('R2-04a: a worker that cannot START becomes a READING, not a process error', async () => {
  await withWorker('throws', async () => {
    assert.equal(requestProbe(), true,
      'the request is accepted before the worker has had a chance to fail');
    const got = await waitForReading();
    assert.ok(got, 'the startup failure must arrive as a reading');
    assert.equal(got.value.ok, false);
    assert.equal(got.value.workerFailed, true);
    assert.match(got.value.reason, /worker failed/);
    // Delivered ONCE. A failure that replayed on every read would pin the badge
    // to "failed" forever, which is its own kind of lie.
    assert.equal(takeProbe(), null, 'the failure is consumed, not replayed');
  });
});

test('R2-04b: a worker that DIES mid-probe becomes a reading', async () => {
  await withWorker('exits', async () => {
    assert.equal(requestProbe(), true);
    const got = await waitForReading();
    assert.ok(got, 'the exit must arrive as a reading, not as silence');
    assert.equal(got.value.workerFailed, true);
    assert.match(got.value.reason, /exited before answering \(code 3\)/);
  });
});

test('R2-04c: SILENCE becomes a reading — the watchdog', async () => {
  await withWorker('silent', async () => {
    assert.equal(requestProbe(), true);
    // No waiting: the deadline is evaluated against an injected clock, so the
    // 45 s budget is exercised without spending 45 s.
    assert.equal(takeProbe(), null, 'before the deadline there is still no verdict');
    const got = takeProbe(Date.now() + PROBE_TIMEOUT_MS + 1);
    assert.ok(got, 'a probe that neither answers nor dies must still produce a reading');
    assert.equal(got.value.workerFailed, true);
    assert.match(got.value.reason, /did not answer within/);
  });
});

/* ── closure, and the result that must never be adopted ─────────────────── */

test('R2-04d: a result from a RETIRED channel is never adopted', async () => {
  await withWorker('slow', async () => {
    // (i) THE FIXTURE CAN DELIVER. Without this half, "nothing arrived" below
    // would pass for a fixture that could never have delivered anything — the
    // vacuous-pass shape this suite has already been bitten by.
    assert.equal(requestProbe(), true);
    const arrived = await waitForReading(3000);
    assert.ok(arrived, 'precondition: the slow worker does answer when left alone');
    assert.equal(arrived.value.version, 'STALE', 'precondition: and with its own payload');

    // (ii) And after a reset it cannot.
    assert.equal(requestProbe(), true, 'a new probe starts on a fresh channel');
    resetProbeChannel();
    await sleep(900); // comfortably past the slow worker's 400 ms reply
    assert.equal(takeProbe(), null,
      'a result produced for a channel that has been retired must never become a reading');
  });
});

test('R2-04e: reset is a real reset — idempotent, and it un-sticks the flag', async () => {
  await withWorker('silent', async () => {
    resetProbeChannel();
    resetProbeChannel(); // must not throw when there is no channel at all
    assert.equal(requestProbe(), true, 'the first request starts a probe');
    assert.equal(requestProbe(), false, 'a second is refused while one is already running');
    resetProbeChannel();
    assert.equal(requestProbe(), true, 'the reset must clear the in-flight state');
  });
});

/* ── the mirror image: a death we were not waiting on ───────────────────── */

test('R2-04f: a worker that answers and THEN exits is not reported as a crash', async () => {
  await withWorker('answersThenExits', async () => {
    assert.equal(requestProbe(), true);
    // DELIBERATELY LATE POLLING. The answer lands at ~200 ms and the worker exits
    // at ~500 ms, so by the time this test reads, the answer is sitting in the
    // port buffer AND the worker is already dead. A handler that declared failure
    // on exit without draining first would report a crash for a probe that
    // SUCCEEDED — which is why the read must come after both events, not before.
    await sleep(900);
    const got = takeProbe();
    assert.ok(got, 'the answer must still be delivered after the worker has gone');
    assert.equal(got.value.version, '9.9.9', 'the answer must be ADOPTED, not discarded');
    assert.equal(got.value.workerFailed, undefined, 'and not dressed up as a failure');
    assert.equal(takeProbe(), null, 'and the death must not be replayed as a failure');
  });
});

/* ── closure: the thread must actually stop ─────────────────────────────── */

test('R2-04h: a death AFTER the answer was taken is still not a failure', async () => {
  await withWorker('answersThenExits', async () => {
    assert.equal(requestProbe(), true);
    // Here the answer is taken EARLY, so nothing is in flight when the worker
    // exits at ~500 ms. A handler that recorded a failure on any exit would turn
    // a healthy answer into a crash notice on the next read.
    const got = await waitForReading(3000);
    assert.ok(got);
    assert.equal(got.value.version, '9.9.9');

    await sleep(800); // past the exit
    assert.equal(takeProbe(), null,
      'a worker death with nothing in flight must not be recorded as a failure');
  });
});

test('R2-04g: reset TERMINATES the worker — it does not merely forget it', async () => {
  await withWorker('heartbeat', async () => {
    assert.equal(requestProbe(), true);
    await sleep(400);
    const beating = statSync(BEAT_FILE).size;
    assert.ok(beating > 0, 'precondition: the worker is alive and writing heartbeats');

    resetProbeChannel();
    // TERMINATION IS ASYNCHRONOUS (measured). Reading the size immediately after
    // the reset sees ONE straggler beat, because the worker can complete an
    // interval tick before the termination is processed — 7 → 8 bytes on this
    // machine. The property is therefore "it stops", not "it stops instantly",
    // and an assertion written the stricter way fails for a correct
    // implementation.
    await sleep(300);
    const settled = statSync(BEAT_FILE).size;
    await sleep(500); // twelve more heartbeat intervals
    assert.equal(statSync(BEAT_FILE).size, settled,
      'a retired worker must stop running, not linger as a leaked thread');
  });
});

```

### C/packages/creator-brains-console/test/health.cachekey.test.mjs — 97 lines

```js
/*
 * R2-04 — THE HEALTH CACHE IS PER STORE ROOT, AND IT IS BOUNDED.
 *
 * THE FINDING (`health.mjs:75`). `healthReading` accepts a store root because the
 * history fallback reads THAT store's `canary.json` — but the cache was a single
 * module-level slot. Two roots read in one process therefore shared one answer:
 * the first read consulted the correct store's canary, and every later read, for
 * a DIFFERENT store, served it as though it were its own.
 *
 * WHY THAT IS THE WORST SHAPE. A wrong answer that looks wrong gets noticed. A
 * correct answer for store A presented as a correct answer for store B does not:
 * the reading is well-formed, the timestamp is real, the cue count is real, and
 * only the STORE is wrong. Nothing in the payload betrays it.
 *
 * The cache mechanics themselves live in `health.test.mjs`; this file is only
 * about WHICH STORE an answer belongs to.
 *
 * @module creator-brains-console/test/health.cachekey
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { ensureStore } from '../../../scripts/creator-brains/lib/store.mjs';
import { healthReading, resetHealthCache } from '../lib/health.mjs';
import { MAX_CACHED_ROOTS, cacheKey, cachedRootCount } from '../lib/health-cache.mjs';

/** A probe that always fails, so every reading falls through to the canary. */
const FAILING_PROBE = () => ({ ok: false, version: null, reason: 'yt-dlp not resolvable' });

const TTL = 60_000;
const NOW = Date.parse('2026-09-20T00:00:00.000Z');

/** A store whose canary carries a distinguishable timestamp and cue count. */
function storeWithCanary(label, ts, cues) {
  const r = tempRoot(label);
  ensureStore(r);
  writeFileSync(join(r, 'canary.json'), JSON.stringify([{ ts, ok: true, cues, lang: 'en' }]), 'utf8');
  return r;
}

test('R2-04i: two store roots must not share a cached reading', () => {
  resetHealthCache();
  const a = storeWithCanary('r204-root-a', '2026-09-10T00:00:00.000Z', 3);
  const b = storeWithCanary('r204-root-b', '2026-09-11T00:00:00.000Z', 9);

  // Same clock for both, so a shared cache would serve A's entry to B.
  const ra = healthReading({ r: a, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  const rb = healthReading({ r: b, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });

  assert.equal(ra.source, 'history');
  assert.equal(ra.checkedAt, '2026-09-10T00:00:00.000Z');
  assert.equal(rb.source, 'history');
  assert.equal(rb.checkedAt, '2026-09-11T00:00:00.000Z',
    "root B must serve ITS OWN canary, not root A's cached answer");
  // The cue count is carried only in the reason string, and only B's canary has 9.
  assert.match(rb.reason, /9 cues/, 'and its own cue count, which nothing else carries');
});

test('R2-04j: one store reached two ways is ONE cache entry', () => {
  resetHealthCache();
  const r = storeWithCanary('r204-canon', '2026-09-10T00:00:00.000Z', 1);

  // (a) A normalised spelling. `resolve` alone already handles this one, so it is
  // not the half that discriminates canonicalisation — it is here because a key
  // built on the RAW argument would fail it.
  assert.equal(cacheKey(r), cacheKey(join(r, '.')), 'a trailing dot must not be a second store');

  // (b) A JUNCTION to the same directory, which is the half `resolve` cannot see.
  // Only `realpathSync` follows the link back to the target, so a key built from
  // the resolved string holds two entries for one store. This is the assertion a
  // `resolve`-only implementation fails.
  const link = join(tempRoot('r204-canon-link'), 'store-link');
  symlinkSync(r, link, 'junction');
  assert.equal(realpathSync(link), realpathSync(r), 'precondition: the junction points at the store');
  assert.equal(cacheKey(link), cacheKey(r), 'a junction and its target are the SAME store');

  healthReading({ r, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  healthReading({ r: link, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  assert.equal(cachedRootCount(), 1, 'one store, one entry — however it is reached');
});

test('R2-04k: the cache is bounded, and a reset empties it', () => {
  resetHealthCache();
  for (let i = 0; i < MAX_CACHED_ROOTS + 3; i += 1) {
    const r = storeWithCanary(`r204-bound-${i}`, '2026-09-10T00:00:00.000Z', 1);
    healthReading({ r, probe: FAILING_PROBE, ttlMs: TTL, now: NOW });
  }
  assert.equal(cachedRootCount(), MAX_CACHED_ROOTS,
    'a console that reads many roots must not hold a reading for every root it has ever seen');

  resetHealthCache();
  assert.equal(cachedRootCount(), 0);
});

```

### C/packages/creator-brains-console/test/bridge.brainread.test.mjs — 194 lines

```js
/*
 * R2-03 / R2-09 — the pinned-generation reader (Astra round 2, 2026-09-20).
 *
 * WHY A NEW FILE. Both findings are about `lib/brain-read.mjs`, which was
 * extracted from `brains.mjs` in this pass, and `bridge.brains.test.mjs` is at
 * the rule-4 cap. The tests are grouped by FINDING, not by route, because the
 * two defects have different shapes and only one of them is behavioural.
 *
 * R2-09 is a straightforward acceptance bug: the generation pattern refused
 * `gen-10000`, which the engine's `padStart(4)` can emit. Both directions are
 * pinned — the form that must now be SERVED, and the neighbouring form that must
 * still be REFUSED, because "loosen the regex until the failing test passes" is
 * how the second one gets lost.
 *
 * R2-03 is a TOCTOU between two pointer reads, and this file is explicit about
 * what it can and cannot prove:
 *
 *   R2-03a is BEHAVIOURAL — markdown and claims must come from one generation,
 *   and an empty generation must be reported as such rather than served beside
 *   another generation's markdown.
 *
 *   R2-03b is a STRUCTURAL PIN, NOT a behavioural proof. The defect required the
 *   pointer to move BETWEEN two resolutions, and that race cannot be constructed
 *   deterministically without injecting a clock or a filesystem hook. So instead
 *   of pretending to test the race, this asserts the property that makes the
 *   race impossible: exactly one `readPointer` call site, and no `loadHits`.
 *   It fails loudly if a second traversal is reintroduced. It does NOT prove the
 *   single read is atomic — nothing here can, and saying otherwise would be the
 *   same overclaim T-B25e made before it was corrected.
 *
 * @module creator-brains-console/test/bridge.brainread
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));

/**
 * Point an existing brain at a different generation, keeping everything else.
 *
 * The key is `schema_version`, not `schemaVersion`: the engine writes the
 * snake_case field (`render.mjs:122`) and this fixture has to be a pointer the
 * engine would actually write, for the reason the fixtures header already
 * records. `readPointer` is a bare `readJson(path, null)` and would not have
 * noticed the difference — which is exactly why an unchecked field would have
 * survived here and broken a stricter reader later.
 */
function repoint(r, ns, generation, title = 'Hostile') {
  writeFileSync(
    join(r, 'brains', ns, 'current.json'),
    JSON.stringify({
      schema_version: 1,
      creator_id: ns,
      label: ns,
      title,
      generation,
      files: ['index.md', 'topics.md', 'timeline.md'],
      publishedAt: '2026-09-16T00:00:00.000Z',
      stats: { videos: 1, claims: 1, doctrine: 0, gaps: 0, invalidDocs: 0 },
    }),
    'utf8',
  );
}

/* ── R2-09 · a generation the engine CAN emit must be served ─────────────── */

test('R2-09a: a pointer naming gen-10000 is SERVED, not refused as damage', async () => {
  await withFixture('r2-09a', async ({ r, base }) => {
    // The engine's `padStart(4)` is a FLOOR, so a creator past 9999 generations
    // publishes into `gen-10000`. The old `/^gen-\d{4}$/` called that impossible
    // and answered 409 — a legitimate brain reported as store damage.
    const { ns } = seedPublishedBrain(r, BRAIN_NS, { generation: 'gen-10000', title: 'Deep Brain' });
    const { status, body } = await getJson(base, `/api/brains/${ns}`);

    assert.equal(status, 200, 'gen-10000 is a generation the engine writes');
    assert.equal(body.generation, 'gen-10000');
    assert.equal(body.title, 'Deep Brain');
    assert.ok(body.index.includes('Deep Brain'), 'the markdown must come from gen-10000');
    assert.equal(body.claims.length, 1, 'and its claims too');
  });
});

test('R2-09b: a NON-CANONICAL five-digit generation is still refused as damage', async () => {
  await withFixture('r2-09b', async ({ r, base }) => {
    // `gen-00001` is the decimal 1 padded to five digits. `padStart(4)` writes
    // `gen-0001` for that number, never this — so it is not a name the writer can
    // produce, and `\d{4,}` would have accepted it. This is the guard against
    // fixing R2-09 by loosening the bound instead of shaping it.
    const { ns } = seedPublishedBrain(r);
    for (const generation of ['gen-00001', 'gen-0000001', 'gen-0']) {
      repoint(r, ns, generation);
      const { status } = await getRaw(base, `/api/brains/${ns}`);
      assert.equal(status, 409, `generation '${generation}' must be refused as damage`);
    }
    // Positive control for the pair: the canonical form of the SAME number is
    // accepted, so the refusal above is about canonicity and not about width.
    repoint(r, ns, 'gen-0001');
    const ok = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(ok.status, 200, 'gen-0001 is canonical and must be served');
  });
});

/* ── R2-03 · one pointer, one generation ─────────────────────────────────── */

test('R2-03a: markdown and claims come from the SAME pinned generation', async () => {
  await withFixture('r2-03a', async ({ r, base }) => {
    // Generation 1 has claims. Generation 2 has markdown but NO rules.jsonl — the
    // empty-generation shape the round-2 probe used. The pointer names gen-0002,
    // so EVERY field must be gen-0002's: its markdown, no claims, and an honest
    // `rules.jsonl` skip. Serving gen-0001's claims beside gen-0002's markdown is
    // the defect.
    const { ns } = seedPublishedBrain(r, BRAIN_NS, { generation: 'gen-0001', title: 'Gen One' });

    const gen2 = join(r, 'brains', ns, 'gen-0002');
    mkdirSync(gen2, { recursive: true });
    writeFileSync(join(gen2, 'index.md'), '# Gen Two\n\nmarkdown from the second generation.', 'utf8');
    writeFileSync(join(gen2, 'topics.md'), '- second topic', 'utf8');
    writeFileSync(join(gen2, 'timeline.md'), '- 00:00 second', 'utf8');
    // deliberately no rules.jsonl

    repoint(r, ns, 'gen-0002', 'Gen Two');

    const { status, body } = await getJson(base, `/api/brains/${ns}`);
    assert.equal(status, 200);
    assert.equal(body.generation, 'gen-0002');
    assert.ok(body.index.includes('second generation'), 'markdown must be gen-0002');
    assert.ok(!body.index.includes('fixture'), 'gen-0001 markdown must not appear');
    assert.deepEqual(body.claims, [], 'an empty generation yields no claims');
    assert.ok(
      body.skipped.some((s) => s.file === 'rules.jsonl'),
      'the absent rules.jsonl must be REPORTED, not silently empty',
    );
    // And the claims that DO exist are reachable by pointing back at gen-0001,
    // so the empty result above is a fact about gen-0002 rather than a broken
    // reader that never returns claims at all.
    repoint(r, ns, 'gen-0001', 'Gen One');
    const back = await getJson(base, `/api/brains/${ns}`);
    assert.equal(back.body.claims.length, 1, 'gen-0001 still serves its own claim');
  });
});

test('R2-03b: the read path resolves the pointer EXACTLY ONCE (structural pin)', async () => {
  // A PIN, NOT A BEHAVIOURAL PROOF — see the file header. The defect was a second
  // resolution; this asserts there is no second resolution to race with. It is
  // mutation-sensitive: reintroducing `loadHits` or a second `readPointer` fails.
  const src = readFileSync(join(LIB, 'brain-read.mjs'), 'utf8');

  const callSites = src.match(/readPointer\s*\(/g) || [];
  assert.equal(callSites.length, 1, `expected exactly one readPointer call, found ${callSites.length}`);

  assert.ok(
    !/loadHits\s*\(/.test(src),
    'the reader must not call loadHits — that function re-resolves the pointer itself',
  );

  // And the claim reader must take its directory from the caller rather than
  // deriving one, so there is no path by which it could name a different
  // generation than the one that was validated. Asserted as a PREFIX, not as an
  // exact parameter list: R2-02 added the containment root and its resolved real
  // path to this call, and a pin that breaks on every added argument trains the
  // next seat to loosen it. What must not change is that the directory is GIVEN
  // to it — so the property is pinned and the arity is not.
  assert.match(
    src, /function readClaims\(dir, skipped/,
    'readClaims must RECEIVE the already-validated directory, not resolve one',
  );
  assert.ok(
    !/readClaims\([^)]*readPointer/.test(src) && !/readClaims\([^)]*containedDir/.test(src),
    'readClaims must not be handed a freshly resolved pointer or directory',
  );
});

/* ── the containment rules must still hold after the extraction ──────────── */

test('R2-03c: the extraction did not widen the containment surface', async () => {
  await withFixture('r2-03c', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    // Every form the pre-extraction guard refused must still be refused. This is
    // the regression net for the refactor: moving the rules is exactly when a
    // rule gets dropped.
    for (const generation of ['..', '.', 'gen-1', '../../registry.json', 'gen-0001/../..', '']) {
      repoint(r, ns, generation);
      const { status, text } = await getRaw(base, `/api/brains/${ns}`);
      assert.ok(status === 409 || status === 200, `generation '${JSON.stringify(generation)}' answered ${status}`);
      assert.ok(!text.includes('"creators"'), `registry content leaked on '${generation}'`);
    }
  });
});

```
