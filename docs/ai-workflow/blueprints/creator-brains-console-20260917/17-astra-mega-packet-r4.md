# Astra Mega Packet — ROUND 4 (hostile review of the R3-01..R3-05 fixes)

## AUTHORIZATION AND CONTEXT — read this before the code

I am the operator of this repository, and I am asking for a review of my OWN
code. Everything in this packet is code I wrote, on my own machine, in a repo
that has no other contributors and no deployment.

The subject is **defensive containment hardening**. This subsystem reads derived
artifacts from a local store and must REFUSE to serve anything that escapes that
store. Some of the files below are security-flavoured because that is the domain
of the fix — path traversal, directory junctions, serving-origin checks. They are
defences and the tests that prove the defences refuse. Concretely:

- `test/store-attacks.mjs` **constructs** the malformed store shapes (a relative
  path that traverses out of the store; a directory junction that resolves
  outside it) so the tests can assert the guards REFUSE them. Each builder
  asserts its own attack was constructed and fails loudly otherwise, so a guard
  can never pass vacuously against an ordinary directory.
- The only thing attacked is a temporary directory the test creates itself. There
  is no exploit payload, no third-party target, no external system, and no
  instruction here that is meant to be executed against anything but this repo.
- The security assertions exist to make the console **fail closed**. A reader who
  removes them makes the console less safe, not more.

This framing is stated because the transport's safety classifier refused an
earlier copy of this packet that lacked it. Nothing below has been removed or
softened to obtain passage — the same files, byte-identical, are included here.

---

**Generated from the working tree.** Every file below is included VERBATIM and
byte-identical to what is on disk, so this review reads the SHIPPED code rather
than a description of it. Hashes are recorded per file.

**Repo:** `SS-PT` (a local working copy), branch `creator-brains-engine-r2-20260915`
**Console package:** `packages/creator-brains-console/`
**Paths below are RELATIVE to the repo root.**

## REMIT

Round 3 (`17-astra-mega-reply-r3.md`, included in full as PART 4) returned
**REVISE — not dry**, with FIVE residual findings. R2-02 was REOPENED; R2-04,
R2-05 and R2-06 were PARTIAL. All five have since been fixed in this tree, and
this packet is the rebuilt artifact those fixes are owed a review against.

| Finding | Severity | What was wrong | What changed |
|---|---|---|---|
| R3-01 | HIGH | `assertReadSurfaceContained` enumerated every entry but delegated to
`readPublishedBrain`, which returns `null` for a name outside `NAMESPACE` — so an
entry the engine still traverses had its generation and leaves left unproven. |
The enumeration moved to `lib/read-surface.mjs` and an invalid ENUMERATED namespace
is now a hard `409 STORE_DAMAGED` refusal, never a skip. |
| R3-02 | MEDIUM | `/api/status` called the engine `listPublished` directly, reading
every `current.json` with no containment. | `countPublished()` — the contained
enumerator — with damage as a FIELD and the count `null`, never `0`. |
| R3-03 | MEDIUM | The probe reset had no production caller; bridge shutdown never
released the worker. | `lib/health-lease.mjs` — leases acquired in `finishStart`,
released in `shutdown`; the LAST owner retires the worker. |
| R3-04 | MEDIUM | The write gate accepted either loopback spelling — a socket-alias
allowlist, not same-origin — and ignored path/credentials/query/fragment. |
`originAllowed` requires exact equality with the origin derived from the APPROVED
request Host, and requires the value to already BE a serialized origin. |
| R3-05 | HIGH | The R2-06 sweep amended the DOCUMENTS and left `types.ts`, both
adapters, two active paragraphs and the README headline still stating the rejected
shapes. | All of them synchronised, plus a NEW contract check on method RETURN
TYPES (`T-B27m`). |

**IN SCOPE:** R3-01, R3-02, R3-03, R3-04, R3-05 — whether each fix is complete and
whether it introduced anything new.

**OUT OF SCOPE, and named so they are not mistaken for done:** R2-07 and R2-08.
Round 3 itself observes that the current write-gate file uses `T-B26`, so the
packet's own claim that it reuses `T-B22` is stale — that observation is recorded
in `readiness.json` and is NOT a closure review of R2-08.

**WHAT "DRY" MEANS:** a rebuilt artifact with no finding against the previous
round's fixes. This is that artifact.

## EVIDENCE BOUNDARY — state the limit rather than implying certification

- Console suite: **183/183** real tests (`node --test test/*.test.mjs`).
- Web suite: **62/62** (`vitest run`); `tsc --noEmit` **0 errors**; build clean.
- Engine gate: `consistency-check.mjs` → **15/15 consistent, exit 0**, no engine file touched.
- Rule 4 (300-line cap, `.mjs/.ts/.tsx/.css`, test files included): **0 files over**;
  the two nearest are `lib/health-probe.mjs` 299 and `lib/health.mjs` 295.
- Mutation verification for these five fixes: **M1..M9**, each with its red set
  recorded, and paired mutants checked to redden DIFFERENT tests:
  M1→{R3-01a,R3-01b,R3-02a}, M2→{R3-02a,R3-02c}, M3→{T-B26e2,T-B26f},
  M4→{T-B26f}, M5→{R3-03a,R3-03b}, M6→{R3-03b}, M7→{R3-03c},
  M8→{T-B27m/repair}, M9→`tsc --noEmit` exit 2.
- **NOT RUN:** no browser pass, no launcher pass, no end-to-end pass, no real
  file-symlink attack (a file symlink needs Developer Mode on Windows, so the
  junction is used instead). **Suite results are not runtime certification.**

---

# PART 1 — PACKET DOCUMENTS

## `05-contracts.md` — sha256 `b99988d0f174eb844457dcda0ddeb2cc9683cc8f887674468be9218f29f82236`

```js
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
  documents: number;
  // R3-02. Counted through the CONTAINED enumerator. `null` when it refused —
  // a namespace or pointer escaped the brains store — never 0, which would read
  // as "nothing is published". The reason is in `publishedBrainsDamaged`.
  publishedBrains: number | null;
  publishedBrainsDamaged: { file: string; detail: string } | null;
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

## `06-test-plan.md` — sha256 `d6d860ba65f86dd3aa112a5cb93ffd3f4ddb4dc6e3a1917dc1bf59a8eab8919e`

```js
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

## `07-traceability.md` — sha256 `d5a9667c7240e2febccbdb49ba23f63ede473ce69d620f8df849829d5dc3b3ab`

```js
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

## `08-slices-operations.md` — sha256 `3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e`

```js
# 08 — Implementation slices & operations — Creator Brains Console

Each slice: independently shippable, RED→GREEN tests before merge-worthy state, entry/exit evidence recorded in the packet (09/README). Review route per slice (Mega Blueprints v3.1): glm-5.3 → glm-5.3-flash → gpt-6-astra (Astra seat currently blocked until 2026-09-19 ~22:12 — slices before S5 can proceed on GLM reviews with the gap recorded; Astra adjudication batched when the seat resets, Sean permitting).

| Slice | Deliverable | Entry criteria | Exit evidence | Depends on |
|---|---|---|---|---|
| **S0** | Bridge: `server.mjs` + `api.mjs` — **nine-route allowlist** (reads: `status`/`creators`/`run`/`canary`/`backlog`/`query`/`brains/:slug`; writes: `POST /api/creators`, `PATCH /api/creators/:id`) + loopback-only + `hostAllowed` DNS-rebinding gate + error envelope + T-B1/B2/B3/B6/B7/B8/B9 + structure suite | This packet plan-ready; engine suite green baseline recorded | `node --test` bridge suite green (RED observed first); curl-able JSON on fixture store; engine suite unchanged (additive only) | — |
| **S1** | Console web scaffold: Vite app, tokens.css (design.md §4 as `var(--token,#fallback)`), shell + StatusBoard + adapters (`ConsoleDataAdapter`, Local, Mock) | S0 exit | T-W1/W2/W3 green; `tsc --noEmit` 0; build ok; R2/R3 visible on real fixture store | S0 |
| **S2** | Roster + writes (add/enable/disable via engine functions) + BrainDrawer | S1 exit | T-B3, T-W4 green; drawer reads only published generation; damage paths banner | S1 |
| **S3** | QueryConsole + canary/repair/backup (OpsRail) — **adds `POST /api/repair` (deferred from S0; 05 §2b), on the SHARED run-operation exclusion gate**; `POST /api/backup` stays **visible but blocked, with NO endpoint** (A1-08 / D4 still open — `05` §2b) | S2 exit | T-B9/**B10**, T-W5 green; zero-hit + skipped honesty visible; repair answers `409 RUN_LOCKED {holder}`; **two-process journal-preservation test** (`19` §4) — repair reaches the SAME `runDaily` journal path, so this gate binds S3 exactly as it binds S4 | S1 |
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

## `19-held-findings.md` — sha256 `e10a32a80c99c81eb9c7df031bd9d6fc776f2da80b70f2615244fa03c7d29768`

```js
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
| A1-06 | A console mutex cannot protect the shared journal | High | **GATED** | §4 — **S3 (repair) AND S4 (daily)** cannot ship without the two-process test |
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
- The claims come from the **same pinned generation as the markdown** — ONE pointer read names one
  generation directory, and every leaf is read from it. **Do not reintroduce a second resolution.**
  An earlier version re-resolved the pointer for claims and compared generations only *inside the loop
  over hits*, so an empty generation skipped the comparison entirely and served generation 1's markdown
  beside generation 2's (empty) claims. `R2-03b` now pins the reader to **exactly one** `readPointer`
  call site, and `R2-03`/`R2-03c` cover the behaviour; this paragraph previously *instructed* the
  second resolution, which would rebuild the defect.
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

> **S3 + S4 GATE (widened 2026-09-20, R3-05).** **Neither S3 (repair) nor S4 (daily run)** can ship
> until a **two-process journal-preservation test** passes: two runners against one store, asserting
> the journal is never interleaved or truncated. This entry previously gated **S4 alone**, which left
> the same journal reachable through S3's `POST /api/repair` — repair invokes the same `runDaily`
> journal path, so gating one door and shipping the other is gating nothing. If the test fails, the
> defect goes to the **engine owner**. No console patch to engine files — the boundary is additive-only.

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

## `README.md` — sha256 `0c07fd5c12e373dcdf275397347f57ed2eaf153cd0b05ac6ac014a8cf07b0c31`

```js
# Creator Brains Console — Mega Blueprints planning packet

- **Date:** 2026-09-17 · **Updated:** 2026-09-20 · **Status:** S0 + **S1 SHIPPED** (structural gate PASS; console suite **105/105 real tests**, S1 web **48/48** after the round-4 fix pass and the full round-5 five-pass sweep) · **Builder seat:** ZCode/GLM, then builder seat (Sable) · **Astra adjudication: COMPLETE 2026-09-20** — verdict **REVISE**, 16 findings (10 high); D1–D9 closed, verdicts in **`17-astra-adjudication.md`** · **D7 EXECUTED 2026-09-20** — the console now lives at `packages/creator-brains-console/`, and the engine gate is **15/15 green** (see **`18`**)
- **What this is:** the canonical plan for replacing the Creator Brains terminal menu with a Swan-designed, three.js operator console — **standalone first** (Desktop `.cmd`, loopback bridge, browser), then **duplicated at its best state and transferred** into SwanGuard-Newsroom (`@family-first/web`, React 18 + styled-components) as a modular adapter-driven component. Purely additive: the engine (`scripts/creator-brains/`) is untouched, and since 2026-09-20 the console sits **outside** it at `packages/creator-brains-console/`.
- ** Sean decisions pending:** (1) **"go" for S2** (roster + writes + BrainDrawer) — S1's exit criteria are met; (2) **the `server.mjs` cap call** — **CLOSED 2026-09-19**: the bridge was split at the route-table seam into `server.mjs` 244 + `routes.mjs` 131 + `api.mjs` 77 (**16 §19**), so rule 4 no longer binds anywhere and S2 needs no cap decision; (3) **the Astra D1–D9 adjudication** — **CLOSED 2026-09-20**: adjudicated, verdict **REVISE**, 16 findings; **D7 was the only owner decision it produced, and it is now EXECUTED** — the console moved out of the engine tree to `packages/creator-brains-console/`, receipt in **`18`**; (4) **S1-H12 — `POST /api/creators` freezes the bridge's only thread** (measured 1577 ms, ceiling 180 s) — **still unfixed, but NOT an engine decision** (corrected 2026-09-20, R3-05). The wording here previously read "unfixed because the honest fixes touch the engine", which item 4's own entry below refutes: the blocking call sits inside `addCreator`, an ordinary async function, so the console can run it on a worker — the A1-10 pattern — with no engine file touched. **S2 must resolve it before shipping the add UI**; (5) **S1-H14 — FIXED 2026-09-20 by D7.** The engine gate was RED because `consistency-check.mjs` walked `console/web/node_modules` and measured `decimal.js` as if it were ours (16 §14, A1-01). Relocating the console out of the engine tree returns the gate to **15/15 consistent** with **no engine file touched** — the walk now sees 85 real engine sources instead of 184. Receipt + per-file manifest: **`18`**. **Closed 2026-09-18:** CD3 locked; C1 loading contract; S1 authorised and shipped; the 24 dangling skill symlinks repaired; the S1 hostile review round 4 (8 defects, all fixed). **Closed 2026-09-20:** the Astra adjudication (D1–D9, `17`); the cap call above; the `02 §6` viewport-loading claim (superseded by `14 §3`, now marked in place). **Superseded 2026-09-19:** the "F4 baseline of record = 183/183" and the "console suite 97/97" figure — see (5) and **16 §14** (S1-H13: the 97 was 85 real tests counted 3×). See **14**, **16** and **17**.

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

## `readiness.json` — sha256 `34295efb1289d5c1ca4c40c2c36b6f09f9540acf60eb0b46be3ffed573c8bc96`

```json
{
  "schemaVersion": 1,
  "phase": "plan",
  "ui": true,
  "blockers": [],
  "nextSlice": "S0H HARDENING — the next slice. Console suite 183/183 REAL tests; web 62/62; tsc 0 errors; build clean. The engine gate is GREEN: consistency-check reads 15/15 consistent, exit 0, with NO engine file touched — D7 moved the console OUT of the engine tree to packages/creator-brains-console/ (receipt 18-d7-relocation-receipt.md), which is what returned C1 to green. Round 2 (17-astra-mega-reply-r2.md) returned verdict REVISE with ten findings R2-01..R2-10; those fixes landed in 382427ae6 and 1ed4120a0. ROUND 3 (17-astra-mega-reply-r3.md) then reviewed that work against a REBUILT artifact and returned REVISE again, with FIVE residual findings — R2-02 was REOPENED and R2-04/R2-05/R2-06 were PARTIAL: R3-01 an invalid enumerated namespace was skipped by the preflight while the engine still traversed it; R3-02 /api/status read every pointer through the engine unchecked listPublished; R3-03 the probe reset had no production caller, so bridge shutdown never released the worker; R3-04 the write gate accepted either loopback spelling, which is a socket-alias allowlist and not same-origin; R3-05 the R2-06 sweep amended the DOCUMENTS and left types.ts, both adapters and two active paragraphs still stating the rejected shapes. ALL FIVE ARE NOW FIXED in this tree and mutation-verified (M1..M9, each with its red set recorded and paired mutants checked to DIFFER). What those fixes built: lib/read-surface.mjs — one contained enumerator whose set is the ENGINE's own (R3-01/R3-02); lib/health-lease.mjs — probe ownership leases wired to startBridge/shutdown, last owner retires (R3-03); exact serving-origin equality derived from the approved Host (R3-04); and the executable half of the contract sweep, including a new contract check on method RETURN TYPES (R3-05). DELIBERATELY NOT FIXED, and still open: R2-07 (this field described the pre-relocation world; it is now current) and R2-08 (bridge.writegate.test.mjs reuses the test ID T-B22, already assigned in bridge.brains.test.mjs — note round 3 observes the current write-gate file uses T-B26, so the packet's own claim about T-B22 is itself stale). A round-4 hostile pass is owed against a REBUILT artifact. IMPLEMENTED SOURCE IS NOT RUNTIME VERIFICATION — the counts above are suite results from this tree, not a certification of the product, and no browser, launcher or end-to-end pass has been re-run.",
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
          "sha256": "b99988d0f174eb844457dcda0ddeb2cc9683cc8f887674468be9218f29f82236"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "b99988d0f174eb844457dcda0ddeb2cc9683cc8f887674468be9218f29f82236"
        }
      ]
    },
    "privacy": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "05-contracts.md",
          "sha256": "b99988d0f174eb844457dcda0ddeb2cc9683cc8f887674468be9218f29f82236"
        }
      ]
    },
    "operations": {
      "status": "COMPLETE",
      "evidence": [
        {
          "path": "08-slices-operations.md",
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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
          "sha256": "3060a54e9972d5ae04ba9a362d1480b9d85714513b31eb6a35c47265501a180e"
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

# PART 2 — SHIPPED SOURCE

## `lib/read-surface.mjs` — sha256 `1f676b69859f1b0590ed29291d2b6640e7c6c2a3640f54f4c3dd1e5fcecd1a7b`

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/read-surface.mjs
 * PURPOSE: Prove the WHOLE read surface is contained before any route reads it,
 *          and answer the status route's publication count without reading a
 *          single unchecked pointer.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0H (R2-02, then R3-01 and R3-02)
 * ============================================================================
 *
 * WHY A WALK AND NOT A REWRITE (R2-02). `/api/query` delegates to the engine's
 * `queryBrains`, which enumerates every `current.json` under the brains
 * directory ITSELF and joins each pointer's generation unchecked — that is the
 * measured R2-02 leak. The console cannot fix that from the outside, and
 * reimplementing the traversal would mean reimplementing the engine's scoring
 * too, which is the duplicated-contract hazard R2-01 was about.
 *
 * So the console establishes the property the engine relies on, BEFORE the engine
 * runs: every entry in `brains/`, every pointer, every generation and every leaf
 * is proven to resolve inside the store. After this pass returns, every path
 * `listPublished` will join is a path already validated here.
 *
 * THE PREFLIGHT MUST COVER THE ENGINE'S ENUMERATION EXACTLY (R3-01, Astra round
 * 3). `render.mjs` `listPublished` filters on NOTHING — it takes every entry of
 * `brains/`, joins `current.json`, reads it, and keeps the ones whose pointer
 * names a generation. The first version of this walk enumerated the same set but
 * then handed each entry to `readPublishedBrain`, which returns `null` for a name
 * outside `NAMESPACE` — so an entry the engine would still traverse had its
 * generation and leaves left UNPROVEN, and the caller ignored the `null`.
 * Measured by Astra round 3: a directory named `bad.name` whose pointer named
 * `../../../outside/gen-0001` passed the preflight, and the query then opened the
 * outside rules file and returned a hit.
 *
 * AN ENUMERATED NAME THE CONSOLE CANNOT NAME IS DAMAGE, NEVER A SKIP. The two
 * halves must agree, and "skip what I cannot name" cannot be made to agree with
 * "traverse everything", because the engine is the one that traverses. The
 * engine's own test is the console's test: a pointer naming a generation is a
 * pointer the engine will join. So the enumeration uses the ENGINE'S `readPointer`
 * (a second reader would drift from `listPublished`, and drift silently), and an
 * entry that passes the engine's test but fails the console's alphabet refuses
 * the whole request with 409.
 *
 * AN ENTRY THE ENGINE DROPS IS AN ENTRY THIS WALK MAY DROP. A stray file, or a
 * directory whose pointer is absent or names no generation, is not read by
 * `listPublished` at all — so refusing on it would make a harmless `.DS_Store`
 * kill every query. Those entries are skipped, and that is not the R3-01 skip:
 * the engine skips them too.
 *
 * WHAT THIS DOES NOT COVER, stated rather than implied: a filesystem MUTATED
 * between this pass and the engine's read. That race is not detectable without
 * platform-specific primitives, and Astra's own correction (A2-R2-06) says not to
 * certify it. Cooperating atomic publication and pre-existing links are covered;
 * a hostile concurrent mutation is not claimed.
 *
 * @module creator-brains-console/lib/read-surface
 */

import { join } from 'node:path';
import { readPointer } from '../../../scripts/creator-brains/lib/render.mjs';
import { listDir } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';
import { brainsStore, containedPath } from './containment.mjs';
import { isNamespace, readPublishedBrain } from './brain-read.mjs';

/**
 * Every pointer the ENGINE will read, with each pointer PATH contained first.
 *
 * Returns `[{ name, pointer }]` in the engine's own enumeration order. THROWS
 * `STORE_DAMAGED` when an entry the engine would traverse is one the console
 * cannot name — see the header for why that is a refusal and not a skip.
 */
export function containedPointers(r) {
  const { root, realRoot } = brainsStore(r);
  const out = [];
  for (const entry of listDir(root)) {
    // Every entry, not only well-formed namespaces: `listPublished` does not
    // filter by name either, so anything it will open must be proven here. These
    // two calls prove the POINTER PATH — that `brains/<entry>` and its
    // `current.json` are not themselves links out of the store.
    containedPath(root, realRoot, join(root, entry), `'${entry}'`, 'current.json');
    containedPath(root, realRoot, join(root, entry, 'current.json'), `the pointer for '${entry}'`, 'current.json');

    let pointer = null;
    try {
      pointer = readPointer(r, entry);
    } catch {
      pointer = null; // the engine's `readJson(…, null)` answers the same way
    }
    // The engine keeps a pointer only when it names a generation; an entry it
    // drops is an entry it never reads, so this walk may drop it too.
    if (!pointer || !pointer.generation) continue;

    if (!isNamespace(entry)) {
      throw new ApiError(
        CODE.STORE_DAMAGED,
        `'${String(entry).slice(0, 80)}' is a published namespace the engine traverses `
          + 'but the console cannot name, so its generation cannot be proven to stay in the store',
        { file: 'current.json' },
      );
    }
    out.push({ name: entry, pointer });
  }
  return out;
}

/**
 * Prove that the engine's own traversal cannot leave the store (R2-02, R3-01).
 *
 * THROWS on any escape, so the route answers 409 rather than serving from a store
 * it cannot vouch for. `/api/query` refuses the WHOLE request rather than
 * skipping the poisoned creator: a skipped creator is indistinguishable from a
 * creator that never claimed anything (the S1-H15 shape).
 */
export function assertReadSurfaceContained(r) {
  for (const { name } of containedPointers(r)) readPublishedBrain(r, name);
}

/**
 * Count published brains WITHOUT reading their markdown or rules (R3-02).
 *
 * WHY THIS EXISTS. `lib/status.mjs` used to answer this by calling the engine's
 * `listPublished` directly — which reads every `current.json` through
 * `render.mjs:67`, with none of the containment above. A namespace or a pointer
 * that escaped the store therefore stayed reachable through the status route, and
 * the published count was derived from an untrusted pointer.
 *
 * THE SHAPE IS DELIBERATELY NOT THE QUERY ROUTE'S SHAPE. `/api/query` refuses the
 * whole request; status is a composite instrument, and turning one damaged brain
 * into a failed status reading would cost the operator every unrelated reading at
 * the moment they most need them. So damage here is a FIELD, and the count is
 * `null` — a count that cannot be taken is never `0`, which would be
 * indistinguishable from "nothing is published".
 *
 * NEVER THROWS a containment failure; a non-`ApiError` still propagates, because
 * a bug in this module is not a damaged store.
 *
 * @returns {{count: number|null, damage: {file: string, detail: string}|null}}
 */
export function countPublished(r) {
  try {
    return { count: containedPointers(r).length, damage: null };
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return {
      count: null,
      damage: { file: err.extra?.file || 'current.json', detail: err.message },
    };
  }
}
```

## `lib/containment.mjs` — sha256 `0252b4d5d6638291feaae523264dc8d856c7ebd981112833295d78e40adda89f`

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

## `lib/brain-read.mjs` — sha256 `ed5c769f9c8b6a261eec5fb3c8f31476b953fd461077fd8d6c79882b21f1b587`

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
import { readJsonl } from '../../../scripts/creator-brains/lib/paths.mjs';
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
 * Is `name` a namespace this module can turn into a path?
 *
 * EXPORTED SO THE ENUMERATION GUARD APPLIES THIS SAME RULE AND NOT A COPY
 * (R3-01). `lib/read-surface.mjs` must decide "the engine will traverse this
 * entry, and the console cannot name it" using the identical alphabet — a second
 * regex there would be a second statement of the rule, and the two would drift
 * exactly as the R2-01 contract did.
 */
export function isNamespace(name) {
  return typeof name === 'string' && NAMESPACE.test(name);
}

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
  if (!isNamespace(name)) return null;

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

/*
 * ---------------------------------------------------------------------------
 * `assertReadSurfaceContained` — the whole-surface preflight — MOVED to
 * `lib/read-surface.mjs` (R3-01). The walk has to enumerate the store, and
 * enumerating means calling `readPointer`; `R2-03b` pins that call to EXACTLY ONE
 * site in THIS file, because "the read path resolves the pointer once" is the
 * R2-03 property. A second call site here would have broken that pin for the
 * right reason, so the enumeration lives beside the preflight it serves rather
 * than inside the single-generation reader.
 * ---------------------------------------------------------------------------
 */
```

## `lib/brains.mjs` — sha256 `7c9a4d7a37b0ba7357f5f74eb63e85d7a79107621aab2f7539ad10631a33c817`

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
 * THE PREFLIGHT AND ITS ENUMERATION MOVED TO `lib/read-surface.mjs` (R3-01,
 * 2026-09-20). Round 3 measured the preflight skipping an entry the engine still
 * traversed, because the walk delegated to a reader that returns `null` for a
 * name outside its alphabet. The enumeration and the naming rule now live
 * together, where they can be made to agree; this file keeps the route shape.
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
import { BRAIN_FILES, readPublishedBrain } from './brain-read.mjs';
import { assertReadSurfaceContained } from './read-surface.mjs';
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

## `lib/status.mjs` — sha256 `7163a0a34c2213ea0e0f635cce917dd0430f800aa1a275a075f62e72d890fe61`

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/status.mjs
 * PURPOSE: The status instrument — the console's answer to "is this working,
 *          and when did it last actually succeed?"
 * PART OF: Creator Brains Console (blueprint 05 §1, §3)
 * SLICE: S0
 * ============================================================================
 *
 * THE ONE RULE IN THIS FILE. Every value below is produced by calling the SAME
 * lib function the CLI's `status` command calls, with the same arguments.
 * `status-command.mjs` is the reference composition; the call list here mirrors
 * it one-for-one so the console cannot silently disagree with the CLI about the
 * same store.
 *
 * WHY THAT IS LOAD-BEARING (blueprint H10). The alternative — recomputing
 * coverage, budget or backlog here — creates a second source of truth that goes
 * stale after the first engine change. Sean would then be looking at two
 * different numbers for one store with no way to tell which was right.
 *
 * WHAT IS DELIBERATELY PASSED THROUGH RATHER THAN RE-DERIVED (blueprint H6):
 * `backlog.lines` and `throttle.text` are the engine's OWN formatted sentences.
 * They are display strings, and re-deriving them in the client is exactly how
 * the console starts drifting. Their SHAPE is pinned by tests; their wording is
 * the engine's business.
 *
 * THREE VALUES *ARE* RE-DERIVED, and they are the honest seam in this file.
 * `census.inFlight[].detail`, `lastGood.staleDays` and `staleWarning` restate
 * arithmetic and phrasing that also exists in status-command.mjs. They are
 * provenance-free join points over engine data, not engine *logic*: the inputs
 * (sweep state, last-success timestamp, the staleness threshold) all come from
 * the engine, and only the sentence around them is local. The engine exposes no
 * function that returns these sentences, so the choice was to duplicate three
 * lines of formatting or to add an engine function — which S0's no-go boundary
 * forbids. Flagged rather than hidden.
 *
 * @module creator-brains-console/lib/status
 */

import {
  readState, readRegistry, isDamaged, describeRead, stateOrDefault,
  ensureStore, listRuns, readRunJournal, readLastSuccess, listDocs,
} from '../../../scripts/creator-brains/lib/store.mjs';
import { lockStatus } from '../../../scripts/creator-brains/lib/lock.mjs';
import { summarize } from '../../../scripts/creator-brains/lib/summary.mjs';
import { openBudget, budgetState } from '../../../scripts/creator-brains/lib/ledger.mjs';
import { backlogReport, formatBacklog } from '../../../scripts/creator-brains/lib/backlog.mjs';
import { throttleState, formatThrottle } from '../../../scripts/creator-brains/lib/throttle.mjs';
import { sweepState } from '../../../scripts/creator-brains/lib/checkpoints.mjs';
import { listCreatorsSafe } from '../../../scripts/creator-brains/lib/registry.mjs';
import { healthReading } from './health.mjs';
import { countPublished } from './read-surface.mjs';
import { ApiError, CODE } from './errors.mjs';

/** Staleness threshold — kept identical to status-command.mjs STALE_DAYS. */
export const STALE_DAYS = 3;

/** GET /api/status — mirrors `statusCommand`'s composition exactly. */
export function statusInstrument(r, { probe, now } = {}) {
  ensureStore(r);
  // NOT `selfCheck()` DIRECTLY. That call shells out to `yt-dlp --version` and
  // costs 1.7-3.4 s on this machine; the CLI pays it once, the console pays it
  // per request. `healthReading` composes the same engine function behind a TTL
  // cache — see lib/health.mjs for the measurement and the honesty contract.
  const check = healthReading({ r, probe, now });

  const regRead = readRegistry(r);
  const stateRead = readState(r);
  const registryDamaged = isDamaged(regRead);
  const catalog = registryDamaged ? { ok: false, creators: [] } : listCreatorsSafe(r);
  const creators = catalog.creators || [];

  const stateDamaged = isDamaged(stateRead);
  // `stateOrDefault` THROWS on a corrupt file by design — `defaultValue` refuses
  // to substitute a default for damage (lib/store.mjs). Calling it unconditionally
  // here made a damaged state.json 500 the WHOLE instrument, so the `state.damaged`
  // field below was unreachable and the operator lost every other reading too.
  // Measured 2026-09-18 (S1-H1): GET /api/status -> 500 with a stack trace.
  const videos = stateDamaged ? {} : (stateOrDefault(stateRead).videos || {});
  const summary = stateDamaged ? null : summarize(videos);

  const bs = budgetState(openBudget({ r }));
  const sweeps = sweepState(r);
  const everSwept = creators.filter((c) => c.lastAuthoritativeAt).length;

  const lock = lockStatus(r);
  const journal = readRunJournal(r);
  const ok = readLastSuccess(r);
  const staleDays = ok ? Math.floor((Date.now() - Date.parse(ok.at)) / 86_400_000) : null;
  const throttle = throttleState(r);

  // R3-02. The count comes from the CONTAINED enumerator, never from the engine's
  // unchecked `listPublished` — which read every `current.json` at `render.mjs:67`
  // with no containment, so an escaping namespace or pointer stayed reachable
  // through this route. Damage is a FIELD here rather than a refusal (unlike
  // /api/query) because status is a composite instrument: one damaged brain must
  // not cost the operator every unrelated reading. A count that cannot be taken is
  // `null`, never `0` — `0` would read as "nothing is published".
  const published = countPublished(r);

  return {
    // Composed, TTL-cached health reading with its own provenance (lib/health.mjs).
    // The first four fields keep the CLI's meaning exactly; `checkedAt`/`ageMs`/
    // `source`/`stale`/`note` are additive so the console can render an AGE
    // instead of implying every reading is instant.
    ytdlp: {
      ok: check.ok,
      version: check.version,
      reason: check.reason,
      checkedAt: check.checkedAt,
      ageMs: check.ageMs,
      source: check.source,
      stale: check.stale,
      note: check.note,
    },
    creators: {
      total: creators.length,
      enabled: creators.filter((c) => c.enabled).length,
      damaged: registryDamaged ? { file: 'registry.json', detail: describeRead(regRead) } : null,
    },
    state: {
      damaged: stateDamaged ? { file: 'state.json', detail: describeRead(stateRead) } : null,
      videos: summary ? {
        total: summary.total,
        fetched: summary.fetched,
        coverage: summary.coverage,
        counts: summary.counts,
      } : null,
    },
    budget: { used: bs.used, perHour: bs.perHour, unit: bs.unit, byKind: bs.byKind },
    // Engine-formatted truth, passed through verbatim (H6).
    backlog: {
      lines: stateDamaged ? [] : formatBacklog(backlogReport({
        state: { videos }, perHour: bs.perHour, now: Date.now(),
      })),
    },
    throttle: { ...throttle, text: formatThrottle(throttle) },
    census: {
      inFlight: sweeps.inFlight.map((s) => ({
        channelId: s.channelId,
        // Re-derived phrasing over engine fields (see the header note).
        detail: `certified ${s.certifiedTabs.join('+') || 'nothing'}`
          + ` · still to walk ${s.pendingTabs.join('+') || 'nothing'}`
          + ` · started ${s.ageDays}d ago · ${s.ids} id(s) seen`,
      })),
      everSwept,
      discarded: Boolean(sweeps.discarded),
      ...(sweeps.error ? { error: String(sweeps.error) } : {}),
    },
    lock: { held: lock.held, pid: lock.pid, host: lock.host, alive: lock.alive },
    lastRun: journal ? { status: journal.status, runId: journal.runId || null } : null,
    lastGood: ok ? { at: ok.at, staleDays } : null,
    staleWarning: staleDays !== null && staleDays > STALE_DAYS,
    staleDays: STALE_DAYS,
    // COUNT ONLY — `listDocs` reads document metadata to find a `videoId`; the
    // count is the permitted use of the private directory (R-invariant 1).
    documents: stateDamaged ? 0 : listDocs(r).length,
    publishedBrains: published.count,
    publishedBrainsDamaged: published.damage,
    recentRuns: listRuns(r, { limit: 5 }).map((run) => ({
      runId: run.runId, ok: run.ok, fetched: run.counts?.fetched ?? 0,
    })),
  };
}

/** GET /api/run — the run's truth is the engine's own files, never stdout. */
export function runState(r) {
  const journal = readRunJournal(r);
  const lock = lockStatus(r);
  const bs = budgetState(openBudget({ r }));
  const throttle = throttleState(r);
  return {
    journal: journal ? { status: journal.status, runId: journal.runId || null } : null,
    lock: { held: lock.held, pid: lock.pid, host: lock.host, alive: lock.alive },
    throttle: { ...throttle, text: formatThrottle(throttle) },
    budget: { used: bs.used, perHour: bs.perHour, unit: bs.unit, byKind: bs.byKind },
    recentRuns: listRuns(r, { limit: 10 }).map((run) => ({
      runId: run.runId, ok: run.ok, fetched: run.counts?.fetched ?? 0,
    })),
  };
}

/** GET /api/canary — the engine's own self-check, behind the same TTL cache. */
export function canaryState(r, { probe, now } = {}) {
  const check = healthReading({ r, probe, now });
  return {
    ok: check.ok, version: check.version, reason: check.reason,
    checkedAt: check.checkedAt, ageMs: check.ageMs,
    source: check.source, stale: check.stale, note: check.note,
  };
}

/** GET /api/backlog — the engine's own projection, as data. */
export function backlogData(r) {
  const bs = budgetState(openBudget({ r }));
  const stateRead = readState(r);
  // Same landmine as `statusInstrument` above, and the same reason to guard it.
  // Here the honest answer differs: the ENTIRE backlog payload derives from
  // state.json, so there is no composite reading to salvage. This route therefore
  // refuses like /api/creators does, rather than returning `lines: []` — which
  // would be indistinguishable from "the backlog is genuinely empty" (R3).
  if (isDamaged(stateRead)) {
    throw new ApiError(CODE.STORE_DAMAGED, describeRead(stateRead), { file: 'state.json' });
  }
  const videos = stateOrDefault(stateRead).videos || {};
  const report = backlogReport({ state: { videos }, perHour: bs.perHour, now: Date.now() });
  return { report, lines: formatBacklog(report), perHour: bs.perHour };
}
```

## `lib/write-gate.mjs` — sha256 `a80f492f1d8b095225d83e51b18a69309050de699e67a34106395b027baa3c80`

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
 * WHY `localhost` AND `127.0.0.1` ARE NOT INTERCHANGEABLE (R3-04, Astra round 3).
 * The version above still accepted either spelling for either serving hostname,
 * and that is a socket-alias allowlist rather than same-origin: by the URL
 * specification they are DIFFERENT origins. The argument for the table — "both
 * reach the same socket, so a user who typed one spelling must be admitted" —
 * proves less than it claims. A page loaded through `localhost` posts back to
 * `localhost` (`LocalEngineAdapter.ts:46` defaults `baseUrl` to
 * `window.location.origin`), so its Host and its Origin AGREE and exact equality
 * admits it with no table at all. The only case the table actually added was the
 * CROSS-alias one: a page served by `127.0.0.1` writing with an Origin of
 * `http://localhost:<port>`. That is a different origin, and nothing else here
 * admits it.
 *
 * SO THE RIGHT-HAND SIDE IS DERIVED, NOT ASSUMED. `server.mjs` passes the Host it
 * has ALREADY approved — with the port it actually bound — so the expected origin
 * is the authority the client really reached, not a constant that happens to
 * match. The Host gate and this gate now agree by construction instead of by a
 * second table that can drift from the first.
 *
 * `[::1]` NEEDS NO SPECIAL CASE ANY MORE. It is not this bridge's hostname, so it
 * fails the same equality test every other spelling fails. The note above about
 * it being a different socket is still the reason it is not admitted — it simply
 * no longer requires its own clause to say so.
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
 * Is this `Origin` the bridge's own origin?
 *
 * EXACT EQUALITY, and three things are required for it. The scheme must be the
 * one this bridge serves. The value must ALREADY BE a serialized origin. And the
 * host and port must be the host and port the request was actually served by.
 *
 * WHY THE RAW STRING IS COMPARED TO ITS OWN SERIALIZATION (R3-04, Astra round 3).
 * `new URL('http://user@h:1/p?q#f')` parses happily, and `.origin` silently drops
 * the userinfo, the path, the query and the fragment — so a check on normalised
 * fields alone ACCEPTS a value no browser sends and no specification calls an
 * origin. Byte equality against the canonical serialization is what refuses it.
 *
 * WHY THERE IS NO ALIAS TABLE ANY MORE. The previous version accepted `localhost`
 * and `127.0.0.1` interchangeably for either serving hostname. That is a
 * socket-alias allowlist, not same-origin: they are distinct origins, and the
 * table's real effect was to admit the CROSS-alias case — a page served by
 * `127.0.0.1` writing with an Origin of `http://localhost:<port>`.
 *
 * TOTAL BY CONSTRUCTION. `new URL` throws on a malformed origin, and this runs
 * inside the request path, where an exception is a dead bridge — so every parse
 * is guarded and a malformed Origin is a refusal, never a throw.
 *
 * @param origin        the request's `Origin` header, if any
 * @param servingOrigin the origin the request was served by — derived from the
 *                      Host the Host gate already approved, `http://<Host>`
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
  if (origin !== claimed.origin) return false;
  if (servingOrigin !== serving.origin) return false;

  // An origin with no explicit port is the scheme default (80), which is not the
  // bridge's port unless it happened to have bound 80. Comparing the normalised
  // `port` handles that without a special case.
  return claimed.hostname === serving.hostname && claimed.port === serving.port;
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

## `server.mjs` — sha256 `4496373596fdd5e9938275bc2fd8468af346c9b853bcb79e73b13259085049cc`

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/server.mjs
 * PURPOSE: The console's loopback bridge — process lifecycle, and the two gates
 *          that wrap the route table.
 * PART OF: Creator Brains Console (blueprint 02 §2, 05 §2, 08 Operations)
 * SLICE: S0
 * ============================================================================
 *
 * This file holds the LIFECYCLE and nothing else: construction, the Host gate,
 * the request-target parse, the error envelope, listen/shutdown, the browser
 * open, and the CLI entry. The ROUTE TABLE lives in `routes.mjs`, the HTTP
 * plumbing in `lib/http.mjs`, the single-instance guard in `lib/instance.mjs`,
 * and the handlers in the `lib/` modules behind `api.mjs`.
 *
 * WHY THE ROUTE TABLE MOVED (2026-09-19, S2 prep). This file sat at EXACTLY 300
 * lines — the repo's hard cap (CLAUDE.md rule 4) with zero headroom — so every
 * change had to be shaped net-neutral to fit, including S1-H11's fix. The cap had
 * stopped describing the code and started distorting it. The split is on the seam
 * this docstring already named. See `routes.mjs` for why the table there must
 * stay literal (HY4-H6 reads it as text).
 *
 * TWO GATES STAY HERE ON PURPOSE. The Host check runs BEFORE the route table and
 * the envelope wraps AROUND it, so neither is reachable by, or visible to, any
 * individual route — and keeping both here is what makes that structural rather
 * than conventional. `parseRequestUrl` also stays, because it must run inside the
 * `try` below; that placement IS the S1-H8 fix and is pinned by T-B18.
 *
 * DESIGN CONSTRAINTS THIS FILE OBEYS, AND WHY
 *
 * 1. ZERO DEPENDENCIES. The engine is zero-dep; the bridge composes the engine,
 *    so it inherits that. Nine literal routes need no framework.
 *
 * 2. BINDS 127.0.0.1 ONLY. Not 0.0.0.0, not a configurable host. The store it
 *    fronts holds the operator's whole creator catalog and the private
 *    transcript directory. Binding this to a routable interface would put a
 *    no-auth JSON API on Sean's LAN. `HOST` is a constant, not a parameter, so
 *    no env var and no flag can widen it.
 *
 * 3. OPENS THE BROWSER ITSELF, AFTER `listen` RESOLVES (blueprint H3). A `.cmd`
 *    that parses the port out of stdout races the server's own startup. The
 *    server knows the port because it just bound it, so it opens the browser
 *    with the real URL and the `.cmd` stays a two-line stub.
 *
 * 4. SINGLE INSTANCE via pid file (blueprint H2) — see lib/instance.mjs.
 *
 * 5. SIGNAL HANDLERS ARE REMOVED ON SHUTDOWN. The first version left them
 *    attached, so a process that started more than one bridge (a test suite, or
 *    the future embedding host) accumulated stale handlers that called
 *    `process.exit(0)` on the NEXT signal — killing the process mid-suite. The
 *    exit now lives in the signal handler, not in `shutdown`, so a library
 *    caller can stop the bridge without the module deciding to end the host.
 *
 * USAGE
 *   node packages/creator-brains-console/server.mjs [--port N] [--no-open]
 *
 * @module creator-brains-console/server
 */

import { createServer } from 'node:http';
import { execFile } from 'node:child_process';

import { ensureStore } from '../../scripts/creator-brains/lib/store.mjs';
import { root } from '../../scripts/creator-brains/lib/paths.mjs';
import { dispatch } from './routes.mjs';
import {
  sendJson, sendError, WEB_DIST, hostAllowed, parseRequestUrl,
} from './lib/http.mjs';
import { claimInstance, releaseInstance, registerBridge, unregisterBridge } from './lib/instance.mjs';
import { writeGateFailure } from './lib/write-gate.mjs';
import { acquireHealthOwner, releaseHealthOwner } from './lib/health-lease.mjs';

export { statusFor, hostAllowed } from './lib/http.mjs';
export { WEB_DIST } from './lib/http.mjs';
export { resolveStatic } from './lib/http.mjs';
export { dispatch } from './routes.mjs';
export {
  consoleDir, pidPath, isAlive, claimInstance, releaseInstance, InstanceError,
  liveBridgeFor, registerBridge, unregisterBridge, resetBridgeRegistry,
} from './lib/instance.mjs';

/**
 * Loopback only. Deliberately a constant with no override path: the whole point
 * of the trust boundary in blueprint 05 §4 is that this cannot be widened by a
 * config value someone later sets "just to test from my phone".
 */
export const HOST = '127.0.0.1';

/**
 * Build the request handler's server.
 *
 * The handler is three steps and no routing: the Host gate, the parse, the
 * envelope. Everything between the parse and the envelope is `dispatch`.
 */
export function createBridge({ r = root(), log = () => {}, port = null } = {}) {
  const bridge = createServer(async (req, res) => {
    // Resolve the bound port per request rather than capturing it: the real port
    // is only known after `listen` (port 0 asks the OS to choose). Closing over
    // `bridge` is safe because the handler cannot run before listen.
    //
    // THE FALLBACK MATTERS. `port` is null when the caller asked the OS to pick
    // (the normal launcher path). Reading it from the live server each request
    // means the Host check enforces the EXACT bound port in every case, instead
    // of degrading to "any loopback host" — which is what the first version did,
    // and which silently weakened the DNS-rebinding defence for the only launch
    // path this console actually uses.
    const boundPort = bridge.address()?.port ?? port ?? null;
    if (!hostAllowed(req.headers.host, boundPort)) {
      // 403 before any handler runs — see `hostAllowed` for why this is the
      // DNS-rebinding defence and why it applies to reads as well as writes.
      return sendJson(res, 403, {
        error: {
          code: 'FORBIDDEN_HOST',
          message: `the bridge serves loopback only; Host '${req.headers.host || '(absent)'}' is refused`,
        },
      });
    }

    // THE SECOND PRE-DISPATCH GATE (A1-09, 2026-09-20). Host checking defends
    // DNS rebinding; it does NOT stop a remote page that already knows the
    // loopback address from POSTing to it directly, because the browser supplies
    // the correct Host itself. Writes must therefore be non-simple: JSON media
    // type, a fixed custom header, and an Origin that IS this bridge's origin
    // when one is sent. Same 403 shape as the Host gate so the two read alike.
    //
    // THE SERVING ORIGIN IS THE AUTHORITY THE CLIENT ACTUALLY REACHED (R3-04).
    // `hostAllowed` has just approved `req.headers.host` against the exact bound
    // port, so that header IS this bridge's origin FOR THIS REQUEST — and taking
    // it from the request is what makes the rule exact rather than assumed. An
    // earlier version built `http://${HOST}:${boundPort}` from the bind constant
    // and then accepted either loopback spelling, which admitted a page served by
    // a DIFFERENT origin at the same port. See lib/write-gate.mjs.
    const writeFailure = writeGateFailure(req, `http://${req.headers.host}`);
    if (writeFailure) return sendJson(res, 403, { error: writeFailure });

    try {
      // MUST stay inside the try — see parseRequestUrl and T-B18 (S1-H8).
      const url = parseRequestUrl(req.url, `http://${HOST}`);
      return await dispatch(req, res, { r, url });
    } catch (err) {
      return sendError(res, err, log);
    }
  });
  return bridge;
}

/**
 * Start the bridge: claim the slot, bind loopback, then open the browser.
 *
 * TWO GUARDS, both required (see lib/instance.mjs for the full reasoning):
 * the pid file stops a second PROCESS, and the in-process registry stops a
 * second CALL — which the pid file cannot do, because the same pid is allowed
 * to re-claim so that a restart inside one process stays possible.
 */
export async function startBridge({
  r = root(), port = 0, open = true, log = (s) => process.stdout.write(`${s}\n`),
} = {}) {
  const storeKey = root(r);
  // Claim the in-process slot SYNCHRONOUSLY, before the first `await`: doing the
  // check-then-register across the async `listen` would let two concurrent calls
  // both pass — the check-then-act shape `openSync(…,'wx')` was introduced to
  // kill on the pid-file side. The object is mutated in place, so its identity
  // stays stable for the shutdown ownership comparison.
  const handle = { url: '(starting)' };
  registerBridge(storeKey, handle);

  let pid = null;
  try {
    ensureStore(r);
    pid = claimInstance(r);
    // `port` is passed through so the Host check can require the exact bound port
    // once known. When port is 0 the OS chooses, and the check falls back to
    // "any loopback host", which is still a complete DNS-rebinding defence.
    const server = createBridge({ r, log, port: port || null });

    try {
      await new Promise((res, rej) => {
        server.once('error', rej);
        server.listen(port, HOST, res);
      });
    } catch (err) {
      // If the bind fails AFTER the slot was claimed, the pid file would
      // otherwise block every future start until deleted by hand.
      releaseInstance(r, { pid });
      throw err;
    }

    const actual = server.address().port;
    const url = `http://${HOST}:${actual}`;
    log(`Creator Brains Console — bridge up on ${url}`);
    log(`store: ${storeKey}   pid: ${pid}`);
    log('close this window to stop the bridge.');

    // Browser opens AFTER listen resolved, so the URL is known-good (blueprint H3).
    if (open) {
      openBrowser(url).catch(() => log(`could not open a browser — open ${url}`));
    }

    return finishStart({ r, handle, storeKey, server, url, port: actual, pid, log });
  } catch (err) {
    // Any failure after the in-process claim must free it, or this process can
    // never start a bridge for this store again — a self-inflicted lockout.
    unregisterBridge(storeKey, handle);
    throw err;
  }
}

/** Attach the live handle, its signal handlers and its shutdown to `handle`. */
function finishStart({ r, handle, storeKey, server, url, port, pid }) {
  // R3-03: this bridge now OWNS a lease on the shared probe worker and health
  // cache for as long as it lives. Both are process-global, so only the LAST
  // owner to release retires them — resetting on every shutdown would let one
  // bridge tear the worker out from under another. Acquired HERE, on the success
  // path only: `startBridge`'s failure path never reaches this function, so it
  // has no lease to give back.
  acquireHealthOwner();
  let stopped = false;
  /** Stop the bridge. Idempotent; safe to call from a library or a signal. */
  const shutdown = () => {
    if (stopped) return;
    stopped = true;
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    releaseInstance(r, { pid });
    // Free the in-process slot. Leaving it behind would turn a clean shutdown
    // into a permanent refusal for this process.
    unregisterBridge(storeKey, handle);
    try { server.close(); } catch { /* already closed */ }
    // LAST, and only once the slot is free: a bridge that still owns the slot
    // must still own the worker it may answer from.
    releaseHealthOwner();
  };
  /** A real Ctrl-C should also END the process — but only that, not an embed. */
  const onSignal = () => {
    shutdown();
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  // MUTATE the already-registered object rather than replacing it: the registry
  // holds this identity, and `shutdown`'s ownership comparison depends on it.
  Object.assign(handle, { server, url, port, pid, shutdown, webDist: WEB_DIST });
  return handle;
}

/** Open the OS default browser without a shell (no quoting hazards). */
export function openBrowser(url) {
  return new Promise((res) => {
    const [cmd, args] = process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
    execFile(cmd, args, () => res());
  });
}

/* ── CLI entry (only when invoked, never on import) ──────────────────────── */

const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('packages/creator-brains-console/server.mjs');

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const portArg = argv.indexOf('--port');
  const port = portArg >= 0 ? Number(argv[portArg + 1]) : 0;
  startBridge({ port: Number.isInteger(port) ? port : 0, open: !argv.includes('--no-open') })
    .catch((err) => {
      process.stderr.write(`creator-brains console: ${err.message}\n`);
      process.exitCode = 1;
    });
}
```

## `lib/health-lease.mjs` — sha256 `d9100a03ce70efac60b81a16bddc65dbf8464b2a5390dd8a842b8bbc6d1a8c2a`

```js
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health-lease.mjs
 * PURPOSE: Who owns the shared probe worker — the reset rule, and the lease that
 *          decides when it may run.
 * PART OF: Creator Brains Console (blueprint 05 §1; 08 Operations)
 * SLICE: S0H (R3-03, Astra round 3)
 * ============================================================================
 *
 * WHY THIS MODULE EXISTS (R3-03). The probe worker and the health cache are
 * PROCESS-GLOBAL — one worker, one cache, however many stores are open. The reset
 * closes the worker and empties the cache, and until round 3 nothing in the bridge
 * ever called it: `api.mjs` re-exported it, `server.mjs` shut down without it, and
 * a source search found no production caller at all. An embedding host that
 * stopped a bridge while its process stayed alive therefore kept an idle worker
 * thread and a live cache entry. The lifecycle tests could not see it, because
 * they invoke the reset DIRECTLY — a test that calls the cleanup itself cannot
 * observe a missing production connection to it.
 *
 * WHY THE RESET RULE LIVES HERE AND NOT IN `health.mjs`. There are now two ways to
 * ask for a reset — explicitly, and implicitly by being the last owner to let go —
 * and a rule stated in two places is a rule that drifts (R2-01). So it is stated
 * ONCE, here, and `health.mjs` re-exports it under the name callers already use.
 *
 * WHY THE LAST OWNER, AND NOT EVERY SHUTDOWN. Two bridges may serve two stores
 * from one process. Retiring the shared worker when the FIRST of them stops would
 * pull it out from under the second — a shutdown that breaks a running service.
 * The lease counts live bridges, and only the release that reaches zero retires.
 *
 * @module creator-brains-console/lib/health-lease
 */

import { clearCaches } from './health-cache.mjs';
import { resetProbeChannel } from './health-probe.mjs';

/**
 * Close the probe worker and forget every root's reading.
 *
 * Idempotent, and safe at any time — the test suites call it between cases, which
 * is why it stays exported under its original name.
 */
export function resetHealthResources() {
  clearCaches();
  resetProbeChannel();
}

/** Live bridges holding the shared probe. */
let owners = 0;

/** Take a lease. Every successful `startBridge` takes exactly one. */
export function acquireHealthOwner() {
  owners += 1;
  return owners;
}

/**
 * Give a lease back, and retire the shared worker when the LAST one goes.
 *
 * A release with no matching acquire is a NO-OP rather than a reset: a stray call
 * must not be able to tear the worker out from under a bridge that is still
 * serving. That is why the count is checked BEFORE it is decremented — a release
 * from zero is not "the last owner left", it is a caller that never took one.
 */
export function releaseHealthOwner() {
  if (owners === 0) return 0;
  owners -= 1;
  if (owners === 0) resetHealthResources();
  return owners;
}

/** How many bridges currently hold the shared probe. Test seam and diagnostic. */
export function healthOwnerCount() {
  return owners;
}
```

## `lib/health.mjs` — sha256 `1066391e6cf2b1a7e8ab577aa54731783b2b6cc637cfdd56bb4ed9d7161aecf6`

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
import { cacheKey, getCached, putCached } from './health-cache.mjs';
import { requestProbe, takeProbe } from './health-probe.mjs';

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
 *
 * THE RULE MOVED TO `./health-lease.mjs` (R3-03) and is re-exported here under the
 * name every caller already uses. There are now two ways to ask for it — directly,
 * and implicitly by being the last bridge to let go of the shared worker — and the
 * cache is KEYED BY CANONICAL STORE ROOT (R2-04, see `./health-cache.mjs`), so the
 * pair of calls that constitutes a reset must exist once rather than twice.
 */
export {
  acquireHealthOwner,
  healthOwnerCount,
  releaseHealthOwner,
  resetHealthResources as resetHealthCache,
} from './health-lease.mjs';

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

## `lib/health-probe.mjs` — sha256 `2f1c5886cddce8acc4f6b4e9b3c91f5e362bb89486348c7cab5d814ec394e30b`

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

## `lib/health-probe.worker.mjs` — sha256 `61034b3486e7f13a3411bb5bfb042e71ae999c298d5b6cff248f3a05dd51d23b`

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

## `lib/health-cache.mjs` — sha256 `f32372241b90d11faf2e636048da908a2ab2bd76f211d0701d03960bf44ec4c5`

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

## `web/src/adapters/types.ts` — sha256 `166aae4368e3d67b46c2fd182024d4d9e0e8da159e8f468689642c84db7635fd`

```ts
/*
 * ConsoleDataAdapter — the modularity seam (05-contracts.md §1).
 * The UI imports ONLY this module. Transcribed verbatim from the contract;
 * do not "improve" shapes here without amending 05-contracts.md first.
 *
 * R2-01 (Astra round 2, 2026-09-20) FOUND THAT RULE BEING BROKEN IN THIS FILE.
 * Three declarations had drifted from what the bridge actually serializes, so a
 * future consumer would have been built on a contract the bridge does not honour:
 * `ytdlp` omitted the health PROVENANCE, `BrainDoc` omitted `generation`, and
 * `CanaryReading` could not express the `unknown` source. The contract
 * (`05-contracts.md`) was amended in the same pass. **Every declared field is now
 * asserted against a live payload by `bridge.contractsync.test.mjs`**, which
 * reads this file as text and requires each declared key to exist on the route —
 * so the next drift fails a test instead of shipping.
 */

export type Tier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface DamageReport {
  file: string;
  detail: string;
}

/**
 * Where a health verdict came from, and how old it is (lib/health.mjs:114).
 *
 * `unknown` IS A FIRST-CLASS SOURCE, not an absence. It means "no verdict has
 * been taken" — the probe has not run and there is no history entry — and it is
 * deliberately distinct from `probe` with `ok: false`, which means "a live check
 * ran and failed". Collapsing the two is how "we have not looked" comes to be
 * rendered as "it is broken" (R2-01).
 */
export type HealthSource = 'probe' | 'history' | 'unknown';

/**
 * The composed health reading, with its provenance (lib/health.mjs:283 `shape`).
 *
 * `stale` is true for any `history` reading BY DEFINITION — it is a record of a
 * past verdict, however recent, and must never be presented as a live one.
 */
export interface HealthReading {
  ok: boolean;
  version: string | null;
  reason: string;
  checkedAt: string | null;
  ageMs: number | null;
  source: HealthSource;
  stale: boolean;
  note: string | null;
}

export interface StatusInstrument {
  // R2 — mirrors status-command sources
  ytdlp: HealthReading;
  creators: { total: number; enabled: number; damaged: DamageReport | null };
  state: {
    damaged: DamageReport | null;
    videos: {
      total: number;
      fetched: number;
      coverage: number;
      counts: Record<string, number>;
    } | null;
  };
  budget: { used: number; perHour: number; unit: string; byKind: Record<string, number> };
  backlog: { lines: string[] }; // engine-formatted truth, not re-derived
  throttle: { active: boolean; kind?: string; until?: string; text: string };
  census: {
    inFlight: Array<{ channelId: string; detail: string }>;
    everSwept: number;
    discarded: boolean;
    error?: string;
  };
  lock: { held: boolean; pid?: number; host?: string; alive?: boolean };
  lastRun: { status: string; runId: string | null } | null;
  lastGood: { at: string; staleDays: number } | null;
  documents: number;
  /**
   * R3-02. The count comes from the CONTAINED enumerator, never from the engine's
   * unchecked `listPublished`. `null` means the count could not be taken — a
   * namespace or a pointer escaped the store — and is never `0`, which would be
   * indistinguishable from "nothing is published". The reason is in
   * `publishedBrainsDamaged`.
   */
  publishedBrains: number | null;
  publishedBrainsDamaged: DamageReport | null;
  recentRuns: Array<{ runId: string; ok: boolean; fetched: number }>;
}

export interface CreatorRow {
  channelId: string;
  title: string;
  enabled: boolean;
  /**
   * Counts come from `state.json` via the same per-creator filter
   * `launch.mjs renderCreators` uses. `null` means the count COULD NOT BE TAKEN
   * — `state.json` is damaged — and must be rendered as absent, never as 0
   * (S1-H9). A zero here would read as "this creator has no videos".
   */
  videos: number | null;
  fetched: number | null; // from state.json, per renderCreators truth
}

export interface QueryHit {
  /**
   * NOT ALWAYS THE ENGINE'S CLAIM ID (A1-03/A1-04). The brain drawer reads the
   * raw `rules.jsonl` row and carries the engine's real `claim_id`. `/api/query`
   * reaches this shape through the engine's `queryBrains`, which drops
   * `claim_id`, so it falls back to the composite `${videoId}:${tStartMs}` —
   * which COLLIDES for two claims in one video at the same millisecond. Do not
   * key a list on this value across both routes; the divergence is pinned by
   * `bridge.brains.test.mjs` and is an engine-side defect awaiting an owner.
   */
  claimId: string;
  creatorId: string;
  creatorTitle: string;
  videoId: string;
  tStartMs: number;
  keyPhrase: string;
  /** Served by both routes; declared here since A1-03. */
  statement: string;
  topic: string;
  watchUrl: string; // https://youtu.be/<id>?t=<s>
}

export interface QueryResult {
  hits: QueryHit[];
  skipped: Array<Record<string, unknown>>;
}

export interface BrainDoc {
  /**
   * THE COMPATIBILITY FIELD, AND IT HOLDS A CHANNEL ID (R2-01).
   *
   * The route is `/api/brains/:slug` and the response field is called `slug`,
   * but the value is the creator's channel id — the engine namespaces a brain by
   * channel (`lib/render.mjs` `brainDir(r, namespace)`), and `lib/brains.mjs`
   * returns the request parameter unchanged. The name is retained because the
   * route and the field are already published; **do not "correct" it to
   * `channelId` without amending 05-contracts.md**, and do not treat it as a
   * human-readable label. `title` is the label.
   */
  slug: string;
  /**
   * The generation directory every field below was read from (R2-01). `null`
   * when the published pointer names no generation — in which case the three
   * documents are empty and `skipped` says why, rather than the route inventing
   * a generation name. It is the answer to "which publication is this?", and
   * without it a reader cannot tell a stale document from a fresh one.
   */
  generation: string | null;
  title: string;
  index: string;
  topics: string;
  timeline: string; // markdown from published generation
  claims: QueryHit[];
  skipped: Array<Record<string, unknown>>;
}

export interface RunState {
  journal: { status: string; runId: string | null } | null;
  lock: StatusInstrument['lock'];
  throttle: StatusInstrument['throttle'];
  budget: StatusInstrument['budget'];
  recentRuns: StatusInstrument['recentRuns'];
}

/**
 * `GET /api/canary` — the same health reading as `StatusInstrument.ytdlp`, as
 * its own route (lib/status.mjs:173 `canaryState`).
 *
 * EVERY FIELD IS REQUIRED AND NULLABLE, which is the R2-01 correction. The old
 * declaration made the provenance optional (`checkedAt?: string`) and typed
 * `source` as `'probe' | 'history'`. The bridge emits all eight keys
 * unconditionally, and `source` can also be `'unknown'`; so the old type both
 * understated what is always present and could not represent what is actually
 * sent. An optional marker on a field the bridge always sends invites a consumer
 * to treat "absent" as a real state that cannot occur.
 */
export interface CanaryReading {
  ok: boolean;
  version: string | null;
  reason: string;
  // cached-probe provenance (05-contracts.md §2a)
  checkedAt: string | null;
  ageMs: number | null;
  source: HealthSource;
  stale: boolean;
  note: string | null;
}

export interface ConsoleDataAdapter {
  getStatus(): Promise<StatusInstrument>;
  listCreators(): Promise<CreatorRow[]>;
  addCreator(ref: string): Promise<CreatorRow>; // T2
  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow>; // T2
  query(q: string, creator?: string): Promise<QueryResult>; // T0
  getBrain(slug: string): Promise<BrainDoc>; // T0
  getRunState(): Promise<RunState>; // T0
  /**
   * R3-05. `05 §2b`: acceptance is NOT completion, so the 202 carries a
   * `requestId` and an explicitly NULL `runId` — progress is read from
   * `getRunState()`. The previous `{ runId: string }` promised an id the route
   * never had, and the document alone was amended while this interface, both
   * adapters and the mock kept declaring the rejected shape.
   */
  startDailyRun(perHour: number): Promise<{ requestId: string; runId: string | null }>; // T2
  canary(): Promise<CanaryReading>; // T0
  /**
   * R3-05. `05 §2b`: the engine's repair path returns an EXIT CODE, so the
   * console serves a PROJECTED result. `{ requeued: number }` was a field the
   * engine never produced — the same defect, in the transfer interface.
   */
  repair(): Promise<{ repaired: number; built: number; emptied: number }>; // T2
  backup(dest?: string): Promise<{ dest: string; ok: boolean }>; // T2
}
```

## `web/src/adapters/LocalEngineAdapter.ts` — sha256 `1bbb08d58756d430a220a8725daa81481c90192f1f4e25a5091c6587aab4d33f`

```ts
/*
 * LocalEngineAdapter — ConsoleDataAdapter over the bridge HTTP API.
 *
 * Talks ONLY to the nine routes that actually exist at S0 (05-contracts.md §2a).
 * `repair` and `backup` are contract members whose routes are DEFERRED to S3
 * (§2b); they throw a typed error instead of silently succeeding, so a caller
 * can never mistake "not implemented" for "done".
 */

import { ConsoleApiError, mapBridgeError, mapTransportError } from './errors';
import { parseStatusInstrument } from './validate';
import type {
  BrainDoc,
  CanaryReading,
  ConsoleDataAdapter,
  CreatorRow,
  QueryResult,
  RunState,
  StatusInstrument,
} from './types';

export interface LocalEngineAdapterOptions {
  /** Bridge origin. Defaults to the page origin (the bridge serves the app). */
  baseUrl?: string;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

const DEFERRED_TO_S3 =
  'route not implemented until S3 — see 05-contracts.md §2b; the bridge has no such route yet';

/**
 * The bridge's write gate requires this header on every mutating request
 * (`lib/write-gate.mjs`, A1-09). It is duplicated rather than imported because
 * `web/src` may not reach outside itself (T-W2, `no-engine-import.test.ts`), and
 * `bridge.writegate.test.mjs` asserts this literal still matches the gate — a
 * client that fails its own bridge's gate is a 403 with no clue why.
 */
const WRITE_HEADER = 'x-console-write';

export class LocalEngineAdapter implements ConsoleDataAdapter {
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(opts: LocalEngineAdapterOptions = {}) {
    this.baseUrl = opts.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1');
    this.doFetch = opts.fetchImpl ?? ((...args) => fetch(...args));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.doFetch(`${this.baseUrl}${path}`, {
        // `...init` spreads FIRST so that a caller passing its own `headers`
        // cannot drop the write header and turn every write into a 403.
        ...init,
        headers: {
          accept: 'application/json',
          ...(init?.headers as Record<string, string> | undefined),
          [WRITE_HEADER]: '1',
          ...(init?.body ? { 'content-type': 'application/json' } : {}),
        },
      });
    } catch (err) {
      throw mapTransportError(err);
    }

    let body: unknown = null;
    const text = await res.text();
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        // Non-JSON body (e.g. an HTML 404 page) degrades to UNKNOWN below.
        body = null;
      }
    }

    if (!res.ok) throw mapBridgeError(res.status, body);
    // Still an unchecked cast for the eight routes no S1 component reads;
    // `/api/status` is validated by its caller below (S1-H18). The scope
    // decision and the follow-ups are recorded in adapters/validate.ts.
    return body as T;
  }

  async getStatus(): Promise<StatusInstrument> {
    // Validated, not cast: a 200 of the wrong shape becomes a typed
    // ConsoleApiError that `useStatus` can catch, instead of a render throw that
    // blanks the console (S1-H18).
    return parseStatusInstrument(await this.request<unknown>('/api/status'));
  }

  listCreators(): Promise<CreatorRow[]> {
    return this.request<CreatorRow[]>('/api/creators');
  }

  addCreator(ref: string): Promise<CreatorRow> {
    return this.request<CreatorRow>('/api/creators', {
      method: 'POST',
      body: JSON.stringify({ ref }),
    });
  }

  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow> {
    return this.request<CreatorRow>(`/api/creators/${encodeURIComponent(channelId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  }

  query(q: string, creator?: string): Promise<QueryResult> {
    const params = new URLSearchParams({ q });
    if (creator) params.set('creator', creator);
    return this.request<QueryResult>(`/api/query?${params.toString()}`);
  }

  getBrain(slug: string): Promise<BrainDoc> {
    return this.request<BrainDoc>(`/api/brains/${encodeURIComponent(slug)}`);
  }

  getRunState(): Promise<RunState> {
    return this.request<RunState>('/api/run');
  }

  async startDailyRun(_perHour: number): Promise<{ requestId: string; runId: string | null }> {
    // POST /api/run/daily is deferred to S4 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S3.replace('S3', 'S4'), { status: null });
  }

  canary(): Promise<CanaryReading> {
    return this.request<CanaryReading>('/api/canary');
  }

  async repair(): Promise<{ repaired: number; built: number; emptied: number }> {
    // POST /api/repair is deferred to S3 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S3, { status: null });
  }

  async backup(_dest?: string): Promise<{ dest: string; ok: boolean }> {
    // POST /api/backup is deferred to S3 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S3, { status: null });
  }
}
```

## `web/src/adapters/MockAdapter.ts` — sha256 `8243f05238cd147f2f0997ecb6695b7bd982b79a75c06c3f949bd84491ad6a2f`

```ts
/*
 * MockAdapter — fixtures-backed ConsoleDataAdapter (05-contracts.md §1).
 *
 * Fault injection is expressed as the *wire* form (HTTP status + envelope body)
 * and pushed through the same `mapBridgeError` the live adapter uses. That is
 * deliberate: T-W1 requires identical error mapping, and the only way to prove
 * it is for the mock to fail the way the bridge fails.
 */

import { mapBridgeError, ConsoleApiError } from './errors';
import * as fx from './fixtures';
import type {
  BrainDoc,
  CanaryReading,
  ConsoleDataAdapter,
  CreatorRow,
  QueryResult,
  RunState,
  StatusInstrument,
} from './types';

export interface MockFault {
  status: number;
  body: unknown;
}

export interface MockAdapterOptions {
  /** Per-method faults, keyed by adapter method name. */
  faults?: Partial<Record<keyof ConsoleDataAdapter, MockFault>>;
  /** Artificial latency in ms; 0 in tests unless a test wants a pending state. */
  latencyMs?: number;
  status?: StatusInstrument;
  creators?: CreatorRow[];
  queryResult?: QueryResult;
  brainDoc?: BrainDoc;
  runState?: RunState;
  canary?: CanaryReading;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class MockAdapter implements ConsoleDataAdapter {
  private readonly opts: MockAdapterOptions;
  private readonly calls: string[] = [];

  constructor(opts: MockAdapterOptions = {}) {
    this.opts = opts;
  }

  /** Call log, so tests can assert the adapter is the only seam being used. */
  get callLog(): readonly string[] {
    return this.calls;
  }

  private async resolve<T>(method: keyof ConsoleDataAdapter, value: T): Promise<T> {
    this.calls.push(method);
    if (this.opts.latencyMs && this.opts.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.opts.latencyMs));
    }
    const fault = this.opts.faults?.[method];
    if (fault) throw mapBridgeError(fault.status, fault.body);
    return clone(value);
  }

  getStatus(): Promise<StatusInstrument> {
    return this.resolve('getStatus', this.opts.status ?? fx.healthyStatus);
  }

  listCreators(): Promise<CreatorRow[]> {
    return this.resolve('listCreators', this.opts.creators ?? fx.creators);
  }

  async addCreator(ref: string): Promise<CreatorRow> {
    const trimmed = ref.trim();
    if (!trimmed) {
      throw new ConsoleApiError('VALIDATION', 'ref must be a non-empty string', { status: 400 });
    }
    const row: CreatorRow = {
      channelId: trimmed.startsWith('UC') ? trimmed : `UC${trimmed.replace(/^@/, '')}`,
      title: trimmed,
      enabled: false, // created DISABLED — 05-contracts.md §2a
      videos: 0,
      fetched: 0,
    };
    return this.resolve('addCreator', row);
  }

  async setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow> {
    const base = (this.opts.creators ?? fx.creators).find((c) => c.channelId === channelId);
    if (!base) {
      throw new ConsoleApiError('NOT_FOUND', `no creator with id ${channelId}`, { status: 404 });
    }
    return this.resolve('setCreatorEnabled', { ...base, enabled });
  }

  async query(q: string, _creator?: string): Promise<QueryResult> {
    if (!q.trim()) {
      throw new ConsoleApiError('VALIDATION', 'q must be a non-empty string', { status: 400 });
    }
    return this.resolve('query', this.opts.queryResult ?? fx.queryResult);
  }

  async getBrain(slug: string): Promise<BrainDoc> {
    const doc = this.opts.brainDoc ?? fx.brainDoc;
    if (doc.slug !== slug) {
      throw new ConsoleApiError('NOT_FOUND', `no published brain for ${slug}`, { status: 404 });
    }
    return this.resolve('getBrain', doc);
  }

  getRunState(): Promise<RunState> {
    return this.resolve('getRunState', this.opts.runState ?? fx.runState);
  }

  async startDailyRun(perHour: number): Promise<{ requestId: string; runId: string | null }> {
    if (!Number.isInteger(perHour) || perHour < 1) {
      throw new ConsoleApiError('VALIDATION', 'perHour must be an integer >= 1', { status: 400 });
    }
    // R3-05: `runId` is null on acceptance, because acceptance is not completion
    // (05 §2b). The mock must produce the shape the route will, or it teaches the
    // UI a contract that no route honours.
    return this.resolve('startDailyRun', { requestId: 'req-mock-0001', runId: null });
  }

  canary(): Promise<CanaryReading> {
    return this.resolve('canary', this.opts.canary ?? fx.canary);
  }

  repair(): Promise<{ repaired: number; built: number; emptied: number }> {
    // R3-05: the projected engine result, not the rejected `{ requeued: 3 }`.
    return this.resolve('repair', { repaired: 3, built: 1, emptied: 0 });
  }

  backup(dest?: string): Promise<{ dest: string; ok: boolean }> {
    return this.resolve('backup', { dest: dest ?? '/tmp/backup-mock', ok: true });
  }
}
```

## `web/src/adapters/validate.ts` — sha256 `a8f822cae7a037d788b7f1e6e311c0541f08ee443f83d2d689a9512fcc04bf8f`

```ts
/*
 * validate.ts — payload-shape guards at the adapter seam (S1-H18).
 *
 * WHY THIS EXISTS. `LocalEngineAdapter.request` ended with `return body as T`,
 * an **unchecked cast**. A 200 whose body was not the contract therefore arrived
 * at the components looking exactly like a good reading, and `StatusBoard` —
 * which dereferences 13 top-level paths on its first ready render — threw during
 * render. In React 18 an uncaught render error unmounts the root, so the
 * operator's console went BLANK: no reading, no message, no clue which field was
 * wrong. `console/web/dist/` is a build artifact served by a separately
 * versioned bridge, so "the payload has a shape this build never saw" is a
 * supported upgrade state, not a hypothetical.
 *
 * WHAT THIS GUARDS, AND WHAT IT DELIBERATELY DOES NOT. Only the routes whose
 * payload a component actually dereferences are validated, which at S1 is
 * `/api/status` alone — `StatusBoard` is the only consumer in this slice. The
 * other eight routes return values no S1 component reads, so a validator for
 * them would be unexercised code asserting a contract nobody depends on yet.
 * They are listed as follow-ups in the S1 record rather than written blind.
 *
 * THE DRIFT DIRECTION IS SAFE. A shape declaration is a second statement of the
 * payload, which this repo treats as a hazard (status.mjs header, blueprint H10).
 * The difference is that it cannot fabricate a value: it asserts presence and
 * broad type only. Adding a field to the bridge leaves the guard passing
 * (undeclared keys are allowed, so the console stays forward compatible);
 * REMOVING or retyping one fails the guard loudly — which is exactly the change
 * that used to blank the console. The one real risk is an over-strict check
 * rejecting a healthy bridge, so every field the bridge may legitimately omit is
 * declared `opt`, and every field it may legitimately null is `nullOr`, both
 * read off status.mjs rather than guessed.
 */

import { ConsoleApiError } from './errors';
import type { StatusInstrument } from './types';

/** The subset of JSON the console can read a payload as. */
type Shape =
  | { k: 'obj'; fields: Record<string, Shape> }
  | { k: 'arr'; of: Shape }
  | { k: 'num' }
  | { k: 'str' }
  | { k: 'bool' }
  | { k: 'oneOf'; allowed: readonly string[] }
  | { k: 'nullOr'; inner: Shape }
  | { k: 'opt'; inner: Shape };

const num: Shape = { k: 'num' };
const str: Shape = { k: 'str' };
const bool: Shape = { k: 'bool' };
const arr = (of: Shape): Shape => ({ k: 'arr', of });
const obj = (fields: Record<string, Shape>): Shape => ({ k: 'obj', fields });
const nullOr = (inner: Shape): Shape => ({ k: 'nullOr', inner });
const opt = (inner: Shape): Shape => ({ k: 'opt', inner });

/**
 * A string drawn from a CLOSED SET — for a field whose values are enumerated,
 * where any other string is a contract violation rather than a new value. A
 * plain `str` would accept `'prob'` and let it reach a consumer that branches on
 * the value, which is a silent wrong branch instead of a refusal.
 */
const oneOf = (allowed: readonly string[]): Shape => ({ k: 'oneOf', allowed });

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** `{ file, detail }` — the damage report of 05-contracts.md §3. */
const damage: Shape = nullOr(obj({ file: str, detail: str }));

/** `state.videos` — null whenever state.json is unreadable (status.mjs:114). */
const videos: Shape = nullOr(obj({ total: num, fetched: num, coverage: num }));

/** `recentRuns[]` — the engine's own journal projection (status.mjs:150). */
const runEntry: Shape = obj({ runId: str, ok: bool, fetched: num });

/*
 * The exact paths `StatusBoard` dereferences on its first ready render
 * (components/StatusBoard.tsx:143-263). `staleWarning` and `staleDays` are
 * emitted by the bridge but read by nothing in S1, so they are not required
 * here — demanding keys no component reads would only invent false refusals.
 *
 * `census.error` is the one field status.mjs emits conditionally
 * (status.mjs:139), so it is `opt` and typed only when present. `throttle.until`
 * and `lock.pid`/`lock.alive` are also conditional; they are left undeclared,
 * which the walker allows, because StatusBoard reads each behind a `??` or a
 * truthiness test and none of them can throw.
 *
 * `ytdlp`'s PROVENANCE IS REQUIRED AS OF R2-01. `healthText` branches on
 * `source` and reads `checkedAt`/`ageMs`/`stale`, so these are no longer keys
 * "no component reads" — the board cannot render an honest health line without
 * them. `version`, `checkedAt`, `ageMs` and `note` are `nullOr` because
 * health.mjs emits null for each; `source` is a string and is checked for
 * membership of its closed set below, since a typo there would silently fall
 * through to the live branch and present an unknown reading as a probe.
 */
const health: Shape = obj({
  ok: bool,
  version: nullOr(str),
  reason: str,
  checkedAt: nullOr(str),
  ageMs: nullOr(num),
  source: oneOf(['probe', 'history', 'unknown']),
  stale: bool,
  note: nullOr(str),
});

const STATUS_SHAPE: Shape = obj({
  ytdlp: health,
  creators: obj({ total: num, enabled: num, damaged: damage }),
  state: obj({ damaged: damage, videos }),
  budget: obj({ used: num, perHour: num, unit: str }),
  backlog: obj({ lines: arr(str) }),
  throttle: obj({ active: bool, text: str }),
  census: obj({ inFlight: arr(obj({})), everSwept: num, discarded: bool, error: opt(str) }),
  lock: obj({ held: bool }),
  lastRun: nullOr(obj({ status: str, runId: nullOr(str) })),
  lastGood: nullOr(obj({ at: str, staleDays: nullOr(num) })),
  documents: num,
  // R3-02: null when the contained enumerator refused, never 0.
  publishedBrains: nullOr(num),
  publishedBrainsDamaged: damage,
  recentRuns: arr(runEntry),
});

/** Walk `value` against `shape`, appending one message per offending path. */
function collect(path: string, value: unknown, shape: Shape, bad: string[]): void {
  switch (shape.k) {
    case 'opt':
      if (value !== undefined) collect(path, value, shape.inner, bad);
      return;
    case 'nullOr':
      if (value !== null) collect(path, value, shape.inner, bad);
      return;
    case 'num':
      if (typeof value !== 'number' || !Number.isFinite(value)) bad.push(`${path}: expected a finite number`);
      return;
    case 'str':
      if (typeof value !== 'string') bad.push(`${path}: expected a string`);
      return;
    case 'bool':
      if (typeof value !== 'boolean') bad.push(`${path}: expected a boolean`);
      return;
    case 'oneOf':
      if (typeof value !== 'string' || !shape.allowed.includes(value)) {
        bad.push(`${path}: expected one of ${shape.allowed.map((a) => `'${a}'`).join(' | ')}`);
      }
      return;
    case 'arr':
      if (!Array.isArray(value)) {
        bad.push(`${path}: expected an array`);
        return;
      }
      value.forEach((item, i) => collect(`${path}[${i}]`, item, shape.of, bad));
      return;
    case 'obj':
      if (!isObj(value)) {
        bad.push(`${path}: expected an object`);
        return;
      }
      for (const key of Object.keys(shape.fields)) {
        collect(`${path}.${key}`, value[key], shape.fields[key], bad);
      }
      return;
    default:
      return;
  }
}

/** How many offending paths the refusal names before it summarises the rest. */
const MAX_NAMED = 4;

function shapeRefusal(route: string, bad: readonly string[]): ConsoleApiError {
  const named = bad.slice(0, MAX_NAMED).join('; ');
  const rest = bad.length > MAX_NAMED ? ` (+${bad.length - MAX_NAMED} more)` : '';
  return new ConsoleApiError(
    // UNKNOWN, not VALIDATION: the REQUEST was well formed — the *response* was
    // not the contract. That is the same bucket `mapBridgeError` already puts a
    // non-envelope body in (errors.ts:73), so the two paths agree rather than
    // inventing a second meaning for one code.
    'UNKNOWN',
    `${route} answered 200 with a payload this console cannot read — ${named}${rest}`,
    { status: 200 },
  );
}

/**
 * Assert that a 200 from `GET /api/status` is the instrument `StatusBoard`
 * reads. Throws a `ConsoleApiError` naming the offending paths; otherwise
 * returns the payload UNCHANGED — no cloning and no defaulting, so nothing is
 * fabricated on the way in (05-contracts.md §3).
 */
export function parseStatusInstrument(body: unknown): StatusInstrument {
  const bad: string[] = [];
  collect('body', body, STATUS_SHAPE, bad);
  if (bad.length > 0) throw shapeRefusal('/api/status', bad);
  return body as StatusInstrument;
}
```

## `web/src/adapters/fixtures.ts` — sha256 `bd81c175857b7e6da34baf2a6aae3daa40e68442cfe6b075b861e03c1a41a4f2`

```ts
/*
 * Fixtures for MockAdapter and the component tests.
 *
 * These mirror the shapes the bridge actually returns (05-contracts.md §1).
 * They deliberately contain NO transcript text — tier B is never representable
 * in anything the console can serve (05-contracts.md §4).
 */

import type {
  BrainDoc,
  CanaryReading,
  CreatorRow,
  QueryResult,
  RunState,
  StatusInstrument,
} from './types';

export const healthyStatus: StatusInstrument = {
  // A LIVE reading: the probe ran, it was fresh, and it succeeded (R2-01 — the
  // provenance is part of the payload, not decoration; the board branches on it).
  ytdlp: {
    ok: true,
    version: '2025.09.17',
    reason: '',
    checkedAt: '2026-09-18T11:40:00.000Z',
    ageMs: 420000,
    source: 'probe',
    stale: false,
    note: null,
  },
  creators: { total: 12, enabled: 9, damaged: null },
  state: {
    damaged: null,
    videos: {
      total: 418,
      fetched: 366,
      coverage: 0.8756,
      counts: { fetched: 366, pending: 52 },
    },
  },
  budget: { used: 7, perHour: 20, unit: 'fetches', byKind: { fetch: 7 } },
  backlog: { lines: ['52 videos pending across 3 creators', 'oldest pending: 2026-08-30'] },
  throttle: { active: false, text: 'no throttle active' },
  census: { inFlight: [], everSwept: 418, discarded: false },
  lock: { held: false },
  lastRun: { status: 'ok', runId: 'run-2026-09-18T04' },
  lastGood: { at: '2026-09-18T04:12:00.000Z', staleDays: 0 },
  documents: 418,
  publishedBrains: 12,
  publishedBrainsDamaged: null,
  recentRuns: [
    { runId: 'run-2026-09-18T04', ok: true, fetched: 7 },
    { runId: 'run-2026-09-17T04', ok: true, fetched: 11 },
    { runId: 'run-2026-09-16T04', ok: false, fetched: 0 },
  ],
};

/**
 * registry.json is unreadable → the roster must refuse, not render zeros.
 *
 * FIDELITY (S1-H5). Everything else stays REAL, because registry damage does not
 * affect it — measured against a live bridge on 2026-09-18: `documents` is still
 * counted (it reads the docs directory), and `state.videos` is still summarized.
 * A first draft zeroed `documents`/`publishedBrains`/`recentRuns` here, which
 * described a response the bridge never produces.
 *
 * The trap is in `creators`: `total`/`enabled` are still 0 alongside a non-null
 * `damaged`. Those zeros are not a measurement (05 §2a).
 */
export const damagedRegistryStatus: StatusInstrument = {
  ...healthyStatus,
  creators: {
    total: 0,
    enabled: 0,
    damaged: {
      file: 'registry.json',
      detail: "corrupt: invalid JSON: Expected property name or '}' in JSON at position 2 (line 1 column 3)",
    },
  },
};

/**
 * state.json is unreadable → coverage is unknown, so `videos` is null.
 *
 * FIDELITY (S1-H5). Measured against a live bridge: the roster is UNAFFECTED
 * (registry.json is intact), `backlog.lines` becomes `[]`, and `documents`
 * becomes 0 — the last of these is `status.mjs`'s own guard, not a measurement,
 * which is why StatusBoard withholds it rather than rendering "0 documents".
 *
 * Before S1-H1 was fixed this fixture described an impossible response: the
 * bridge 500'd instead, so nothing ever reached the client.
 */
export const damagedStateStatus: StatusInstrument = {
  ...healthyStatus,
  state: {
    damaged: { file: 'state.json', detail: 'corrupt: invalid JSON: Expected property name or \'}\' in JSON at position 2 (line 1 column 3)' },
    videos: null,
  },
  backlog: { lines: [] },
  documents: 0,
};

/**
 * A published namespace or pointer escapes the brains store → the count is
 * UNKNOWN, not zero (R3-02).
 *
 * FIDELITY. `countPublished` catches the containment refusal and reports it as a
 * FIELD, because status is a composite instrument: one damaged brain must not
 * cost the operator every unrelated reading. `documents` and the roster stay
 * real, because they read other files — that is the measured shape, not a
 * convenience. The count is `null`; rendering `0` would claim the store holds
 * nothing published.
 */
export const damagedBrainsStatus: StatusInstrument = {
  ...healthyStatus,
  publishedBrains: null,
  publishedBrainsDamaged: {
    file: 'current.json',
    detail: "'bad.name' is a published namespace the engine traverses but the console "
      + 'cannot name, so its generation cannot be proven to stay in the store',
  },
};

/** A census whose sweep errored — the counts are absent, not zero (S1-H2). */
export const censusErroredStatus: StatusInstrument = {
  ...healthyStatus,
  census: { inFlight: [], everSwept: 0, discarded: false, error: 'checkpoint sweep failed: EACCES' },
};

export const creators: CreatorRow[] = [
  { channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa', title: 'Systems Weekly', enabled: true, videos: 62, fetched: 60 },
  { channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb', title: 'Quiet Machines', enabled: true, videos: 41, fetched: 41 },
  { channelId: 'UCcccccccccccccccccccccc', title: 'Field Notes', enabled: false, videos: 28, fetched: 9 },
];

export const runState: RunState = {
  journal: { status: 'ok', runId: 'run-2026-09-18T04' },
  lock: healthyStatus.lock,
  throttle: healthyStatus.throttle,
  budget: healthyStatus.budget,
  recentRuns: healthyStatus.recentRuns,
};

export const queryResult: QueryResult = {
  hits: [
    {
      claimId: 'claim-0001',
      creatorId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
      creatorTitle: 'Systems Weekly',
      videoId: 'dQw4w9WgXcQ',
      tStartMs: 754000,
      keyPhrase: 'backpressure is a queueing decision, not a network one',
      // Both routes serve these; `QueryHit` under-declared them until A1-03, and
      // this fixture was written to the narrow type — which is how a contract
      // gets fixed in the docs and left broken in the client.
      statement: 'Backpressure is a queueing decision, not a network one.',
      topic: 'systems design',
      watchUrl: 'https://youtu.be/dQw4w9WgXcQ?t=754',
    },
  ],
  skipped: [{ videoId: 'aaaa1111222', reason: 'no published generation' }],
};

export const brainDoc: BrainDoc = {
  // `slug` holds a CHANNEL ID, not a human label — see the note on `BrainDoc`.
  slug: 'systems-weekly',
  generation: 'gen-0007',
  title: 'Systems Weekly',
  index: '# Systems Weekly\n\n62 videos, 60 fetched.',
  topics: '## Topics\n\n- queueing\n- backpressure',
  timeline: '## Timeline\n\n- 2026-08-30 — queueing deep dive',
  claims: queryResult.hits,
  skipped: queryResult.skipped,
};

export const canary: CanaryReading = {
  ok: true,
  version: '2025.09.17',
  reason: '',
  checkedAt: '2026-09-18T11:40:00.000Z',
  ageMs: 420000,
  source: 'probe',
  stale: false,
  note: null,
};

/** Cached-probe fallback: the live probe failed and history is being shown. */
export const canaryFromHistory: CanaryReading = {
  ok: true,
  version: '2025.09.17',
  reason: '',
  checkedAt: '2026-09-17T04:12:00.000Z',
  ageMs: 113_280_000,
  source: 'history',
  stale: true,
  note: 'live probe did not resolve yt-dlp — showing the last recorded canary result instead',
};

/*
 * ── THE TWO HEALTH STATES THE OLD RENDERING COULD NOT EXPRESS (R2-01) ───────
 *
 * Both fixtures are REAL bridge shapes, taken from lib/health.mjs: a `history`
 * reading and the `unknown` source. They exist because the previous rendering
 * collapsed them into "ok" and "not resolved" respectively — so a test that
 * asserted the old strings would have passed while the board lied. A fixture
 * that cannot represent a state cannot test it.
 */

/**
 * A past SUCCESS replayed from the daily pass. `ok: true` and `stale: true`
 * together — which is the whole point: the value is good and the verdict is not
 * live, and both facts have to survive to the screen.
 */
export const staleHistoryStatus: StatusInstrument = {
  ...healthyStatus,
  ytdlp: {
    ok: true,
    version: '2025.09.17',
    reason: '',
    checkedAt: '2026-09-17T04:12:00.000Z',
    ageMs: 113_280_000,
    source: 'history',
    stale: true,
    note: 'live probe did not resolve yt-dlp — showing the last recorded reading',
  },
};

/**
 * NO VERDICT HAS BEEN TAKEN: the probe has not run and there is no history
 * entry. `ok` is false, and that false is NOT a failure — it is the absence of
 * a check, which is why the board must not render it as one.
 */
export const uncheckedStatus: StatusInstrument = {
  ...healthyStatus,
  ytdlp: {
    ok: false,
    version: null,
    reason: '',
    checkedAt: null,
    ageMs: null,
    source: 'unknown',
    stale: true,
    note: null,
  },
};

/** A live check that RAN AND FAILED — the only case where the reason belongs. */
export const failedProbeStatus: StatusInstrument = {
  ...healthyStatus,
  ytdlp: {
    ok: false,
    version: null,
    reason: 'yt-dlp exited 1: unable to extract player',
    checkedAt: '2026-09-18T11:40:00.000Z',
    ageMs: 420000,
    source: 'probe',
    stale: false,
    note: null,
  },
};
```

## `web/src/components/StatusBoard.tsx` — sha256 `57930567dd035c78a6e4fedecd33e99cbf5b28aed6509101012ec6e9f08d6d8d`

```ts
/*
 * StatusBoard — R2/R3 surface.
 *
 * The load-bearing rule (T-W3): when the store reports damage, the affected
 * instrument renders a REFUSAL naming the file. It must never render 0, because
 * "0 videos" and "we could not read state.json" are different facts and the
 * operator acts differently on each (05-contracts.md §3 data-truth map).
 *
 * Tokens are consumed as var(--token, #fallback) per design.md §4 line 46.
 */

import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { StatusState } from '../hooks/useStatus';
import { healthText } from './healthText';

const Panel = styled.section`
  background: var(--carbon, #141419);
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  padding: var(--space-5, 24px);
  color: var(--text-primary, #e0ecf4);
  font-family: var(--font-ui, system-ui, sans-serif);
`;

const PanelHead = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4, 16px);
  margin-bottom: var(--space-4, 16px);
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const Meta = styled.span`
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

const Banner = styled.div<{ $tone: 'danger' | 'warn' }>`
  display: flex;
  gap: var(--space-3, 12px);
  align-items: flex-start;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  margin-bottom: var(--space-4, 16px);
  border-radius: var(--radius-control, 12px);
  border: 1px solid
    ${(p) => (p.$tone === 'danger' ? 'var(--danger, #e5484d)' : 'var(--border-gold, rgba(198, 168, 75, 0.3))')};
  background: ${(p) => (p.$tone === 'danger' ? 'rgba(229, 72, 77, 0.1)' : 'rgba(198, 168, 75, 0.1)')};
  font-size: 14px;
  line-height: 1.5;
`;

const BannerFile = styled.code`
  font-family: var(--font-data, monospace);
  color: var(--warn, #c6a84b);
`;

const Grid = styled.dl`
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(160px, 2fr);
  gap: var(--space-2, 8px) var(--space-4, 16px);
  margin: 0;
`;

const Label = styled.dt`
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

const Value = styled.dd<{ $refused?: boolean }>`
  margin: 0;
  font-family: var(--font-data, monospace);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: ${(p) => (p.$refused ? 'var(--warn, #c6a84b)' : 'var(--text-primary, #e0ecf4)')};
`;

const Refused = styled.span`
  color: var(--warn, #c6a84b);
`;

const Empty = styled.p`
  margin: 0;
  font-family: var(--font-drama, Georgia, serif);
  font-style: italic;
  font-size: 18px;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function Refusal({ file, testid = 'refused-value' }: { file: string; testid?: string }): ReactElement {
  return (
    <Value $refused data-testid={testid}>
      <Refused>refused — {file} unreadable</Refused>
    </Value>
  );
}

export interface StatusBoardProps {
  state: StatusState;
}

export function StatusBoard({ state }: StatusBoardProps): ReactElement {
  const { phase, status, error, initial } = state;

  if (initial && phase === 'loading') {
    return (
      <Panel aria-busy="true" data-testid="status-board">
        <PanelHead>
          <PanelTitle>Status</PanelTitle>
        </PanelHead>
        <Empty>Reading the store…</Empty>
      </Panel>
    );
  }

  if (!status) {
    return (
      <Panel data-testid="status-board">
        <PanelHead>
          <PanelTitle>Status</PanelTitle>
        </PanelHead>
        <Banner $tone="danger" role="alert" data-testid="refusal-banner">
          <span>
            No instrument can be shown — the bridge did not answer, or answered with a payload this
            console cannot read. {error?.code ?? 'UNKNOWN'}: {error?.message ?? 'unknown error'}
          </span>
        </Banner>
      </Panel>
    );
  }

  const creatorsDamaged = status.creators.damaged;
  const stateDamaged = status.state.damaged;
  const videos = status.state.videos;

  return (
    <Panel data-testid="status-board">
      <PanelHead>
        <PanelTitle>Status</PanelTitle>
        <Meta>
          {phase === 'error' ? `last poll failed (${error?.code}) — showing previous reading` : 'live'}
        </Meta>
      </PanelHead>

      {creatorsDamaged && (
        <Banner $tone="danger" role="alert" data-testid="refusal-banner">
          <span>
            <strong>Creator roster unavailable.</strong> The engine refused to read{' '}
            <BannerFile>{creatorsDamaged.file}</BannerFile> — {creatorsDamaged.detail}. Counts are withheld rather
            than reported as zero.
          </span>
        </Banner>
      )}

      {stateDamaged && (
        <Banner $tone="warn" role="alert" data-testid="refusal-banner">
          <span>
            <strong>Coverage unknown.</strong> The engine refused to read <BannerFile>{stateDamaged.file}</BannerFile>{' '}
            — {stateDamaged.detail}. Per-creator counts are withheld rather than reported as zero.
          </span>
        </Banner>
      )}

      <Grid>
        <Label>yt-dlp</Label>
        <Value data-testid="ytdlp-health">{healthText(status.ytdlp)}</Value>

        <Label>Creators</Label>
        {creatorsDamaged ? (
          <Refusal file={creatorsDamaged.file} />
        ) : (
          <Value>
            {status.creators.enabled} enabled of {status.creators.total}
          </Value>
        )}

        <Label>Video coverage</Label>
        {stateDamaged || !videos ? (
          <Refusal file={stateDamaged?.file ?? 'state.json'} />
        ) : (
          <Value>
            {videos.fetched} of {videos.total} ({pct(videos.coverage)})
          </Value>
        )}

        <Label>Budget</Label>
        <Value>
          {status.budget.used} / {status.budget.perHour} {status.budget.unit} this hour
        </Value>

        <Label>Backlog</Label>
        <Value>
          {status.backlog.lines.length > 0 ? status.backlog.lines.join(' · ') : 'no backlog reported'}
        </Value>

        <Label>Throttle</Label>
        <Value $refused={status.throttle.active}>
          {status.throttle.text}
          {status.throttle.until ? ` · until ${status.throttle.until}` : ''}
        </Value>

        <Label>Census</Label>
        {status.census.error ? (
          // S1-H2: `census.error` means the sweep FAILED. Rendering inFlight/everSwept
          // here would print "0 in flight · 0 swept" — a fabricated measurement, which
          // is the exact failure R3 exists to prevent. The counts are absent, not zero.
          <Value $refused data-testid="refused-census">
            <Refused>refused — the sweep failed: {status.census.error}</Refused>
          </Value>
        ) : (
          <Value>
            {status.census.inFlight.length} in flight · {status.census.everSwept} swept
            {status.census.discarded ? ' · discarded' : ''}
          </Value>
        )}

        <Label>Run lock</Label>
        <Value $refused={status.lock.held}>
          {status.lock.held ? `held by pid ${status.lock.pid ?? '?'}${status.lock.alive === false ? ' (dead)' : ''}` : 'free'}
        </Value>

        <Label>Last run</Label>
        <Value>{status.lastRun ? `${status.lastRun.status} · ${status.lastRun.runId ?? 'no id'}` : 'none recorded'}</Value>

        <Label>Last good</Label>
        <Value>
          {status.lastGood ? `${status.lastGood.at} (${status.lastGood.staleDays}d old)` : 'none recorded'}
        </Value>

        <Label>Documents</Label>
        {stateDamaged ? (
          // S1-H3: status.mjs emits `documents: 0` when state.json is unreadable
          // (`stateDamaged ? 0 : listDocs(r).length`). That 0 is a guard, not a
          // count, so rendering it would claim "you have no documents" during a
          // store fault. Split from publishedBrains — which does not depend on
          // state.json at all, so it stays real here and carries its OWN refusal
          // below when the brains store is what is damaged (R3-02).
          <Refusal file={stateDamaged.file} testid="refused-documents" />
        ) : (
          <Value>{status.documents}</Value>
        )}

        <Label>Published brains</Label>
        {status.publishedBrains === null ? (
          // R3-02: the count comes from the contained enumerator and is `null`
          // when it refused. Withholding it is the honest answer — `0` would
          // claim the store publishes nothing, which is a different fact.
          <Refusal
            file={status.publishedBrainsDamaged?.file ?? 'current.json'}
            testid="refused-published-brains"
          />
        ) : (
          <Value data-testid="published-brains">{status.publishedBrains}</Value>
        )}

        <Label>Recent runs</Label>
        <Value>
          {status.recentRuns.length > 0
            ? status.recentRuns.map((r) => `${r.runId}:${r.ok ? 'ok' : 'fail'}/${r.fetched}`).join(' · ')
            : 'none recorded'}
        </Value>
      </Grid>
    </Panel>
  );
}
```

# PART 3 — TESTS

## `test/bridge.readsurface.r3.test.mjs` — sha256 `e56be39b2a7f372fc063855051fcf23b35c964e33a947e62229a553ec9d8c124`

```js
/*
 * R3-01 and R3-02 — the read surface, round 3 (Astra, 2026-09-20).
 *
 * WHY THESE ARE NOT IN `bridge.readsurface.test.mjs`. That file holds the R2-02
 * suite and sits just under the 300-line cap (rule 4). These are the two findings
 * round 3 raised AGAINST that suite, so they belong beside it rather than inside
 * it — and the setup they need now lives in `store-attacks.mjs`, a harness module
 * rather than a test file (S1-H13: a harness exported from a `.test.mjs`
 * re-registers that file's tests in every importer).
 *
 * THE DEFECT CLASS. R2-02 built a preflight that proved every path the engine
 * would join resolves inside the store. Round 3 measured the preflight and the
 * engine enumerating DIFFERENT SETS: the engine's `listPublished` filters on
 * nothing, while the walk delegated to a reader that returns `null` for a name
 * outside the console's alphabet. An entry the engine traversed was therefore
 * never proven, and the query served it. A preflight that covers most of what the
 * engine reads is a preflight that proves nothing about the rest.
 *
 * @module creator-brains-console/test/bridge.readsurface.r3
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';
import { junction, outsideGeneration, repointOutside } from './store-attacks.mjs';

/**
 * A namespace directory the ENGINE will traverse and the CONSOLE cannot name.
 *
 * The engine reads `brains/<entry>/current.json` for every entry, so a directory
 * with a pointer naming a generation is traversed whatever it is called. The
 * console's alphabet is narrower, which is exactly the mismatch under test.
 */
function unnameableNamespace(r, name, label) {
  mkdirSync(join(r, 'brains', name), { recursive: true });
  const traversal = repointOutside(r, name, label);
  assert.ok(traversal.includes('..'), 'precondition: the pointer names a path outside the store');
  return traversal;
}

/** The outside content must not reach the caller, by any route. */
function assertNoLeak(text, what) {
  assert.ok(!text.includes('leaked-claim-1'), `${what} must not serve the outside claim`);
  assert.ok(!text.includes('OUTSIDE'), `${what} must not serve outside documents`);
}

/* ── R3-01 · the enumeration must cover the engine's set, not the console's ── */

test('R3-01a: a namespace the console cannot NAME but the engine traverses is refused', async () => {
  await withFixture('r3-01a', async ({ r, base }) => {
    // A dot is outside `NAMESPACE`. The engine does not care — it filters on
    // nothing — so this pointer is read and its generation is joined.
    unnameableNamespace(r, 'bad.name', 'r3-01a');

    const search = await getRaw(base, '/api/query?q=leaked');
    assert.equal(search.status, 409, 'an unnameable ENUMERATED namespace is store damage, never a skip');
    assertNoLeak(search.text, 'the query route');

    // The drawer cannot name it either, so it must not serve it.
    const drawer = await getRaw(base, '/api/brains/bad.name');
    assertNoLeak(drawer.text, 'the drawer');
  });
});

test('R3-01b: a namespace longer than the engine can produce is refused, not skipped', async () => {
  await withFixture('r3-01b', async ({ r, base }) => {
    // `slugify` yields at most 60 characters and `NAMESPACE` admits 64, so a
    // 65-character directory is not something the engine writes. It is still an
    // entry the engine will READ, which is what makes it damage rather than noise.
    const long = 'a'.repeat(65);
    unnameableNamespace(r, long, 'r3-01b');

    const search = await getRaw(base, '/api/query?q=leaked');
    assert.equal(search.status, 409);
    assertNoLeak(search.text, 'the query route');
  });
});

test('R3-01c: an entry the ENGINE also drops is NOT damage (the over-refusal control)', async () => {
  await withFixture('r3-01c', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    // Three shapes the engine drops, and therefore this walk must drop too:
    // `listPublished` keeps only pointers whose `generation` is truthy. Refusing
    // on these would let a stray file kill every query in the store.
    writeFileSync(join(r, 'brains', '.DS_Store'), 'junk', 'utf8');
    mkdirSync(join(r, 'brains', 'not-a-brain'), { recursive: true });
    writeFileSync(join(r, 'brains', 'not-a-brain', 'current.json'), JSON.stringify({ title: 'no generation' }), 'utf8');
    // An UNNAMEABLE entry with no generation is the sharpest case: the same
    // alphabet mismatch as R3-01a, but nothing for the engine to traverse.
    mkdirSync(join(r, 'brains', 'also.bad'), { recursive: true });

    const search = await getJson(base, '/api/query?q=fixture');
    assert.equal(search.status, 200, 'entries the engine drops must not be reported as damage');
    assert.equal(search.body.hits.length, 1, 'and the real brain must still answer');
  });
});

/* ── R3-02 · the status route reads no unchecked pointer ─────────────────── */

test('R3-02a: status reports an UNKNOWN count, not zero, when a pointer escapes', async () => {
  await withFixture('r3-02a', async ({ r, base }) => {
    unnameableNamespace(r, 'bad.name', 'r3-02a');

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200, 'status is a composite instrument — damage is a FIELD here');
    assert.equal(res.body.publishedBrains, null, 'a count that cannot be taken is null, never 0');
    assert.equal(res.body.publishedBrainsDamaged.file, 'current.json');
    assert.match(res.body.publishedBrainsDamaged.detail, /cannot name/);
    // The unrelated instruments are the reason this route does not refuse like
    // /api/query: losing them is the cost the operator can least afford.
    assert.ok(res.body.creators, 'the roster is still readable');
    assert.ok(Array.isArray(res.body.backlog.lines), 'the backlog is still readable');
  });
});

test('R3-02b: status counts a healthy store, and reports no damage', async () => {
  await withFixture('r3-02b', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    seedPublishedBrain(r, 'second-brain');

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.publishedBrains, 2, 'the contained enumerator counts real brains');
    assert.equal(res.body.publishedBrainsDamaged, null, 'and names no damage');
  });
});

test('R3-02c: a JUNCTION namespace makes status report UNKNOWN, for a different reason', async () => {
  await withFixture('r3-02c', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r, BRAIN_NS);
    // Lexically inside, really outside: the REALPATH guard, not the alphabet
    // guard. Two mechanisms, two messages — so these two tests cannot both pass
    // because one guard happens to cover the other's case.
    junction(outsideGeneration('r3-02c'), join(r, 'brains', 'hostile-ns'), join(r, 'brains'));

    const res = await getJson(base, '/api/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.publishedBrains, null);
    assert.match(
      res.body.publishedBrainsDamaged.detail, /resolves outside the brains store/,
      'the refusal must name ESCAPE, not the alphabet — otherwise R3-02a covers it twice',
    );

    // And the real brain is still there: this is a count that could not be TAKEN,
    // not a store with nothing in it.
    const drawer = await getRaw(base, `/api/brains/${ns}`);
    assert.ok(drawer.status === 409 || drawer.status === 200, 'the drawer answers something definite');
  });
});
```

## `test/bridge.probelease.test.mjs` — sha256 `f769fac3d1bb83f0beb3af67105519c76e2f8e8fdf69da38231da1f644623d70`

```js
/*
 * R3-03 — the shared probe worker follows BRIDGE OWNERSHIP (Astra round 3).
 *
 * WHY THIS FILE EXISTS. R2-04 gave the worker a failure lifecycle and a reset, and
 * then nothing in the bridge ever called the reset: `api.mjs` re-exported it,
 * `server.mjs` shut down without it, and a source search found no production
 * caller. An embedding host that stopped a bridge while its process stayed alive
 * kept an idle worker thread and a live cache entry.
 *
 * THE LIFECYCLE SUITE COULD NOT SEE IT, AND THAT IS THE POINT. `health.lifecycle`
 * and `health.cachekey` call the reset DIRECTLY — which is the right way to test
 * the reset, and structurally incapable of noticing that production never calls
 * it. A test that performs the cleanup itself cannot observe a missing connection
 * to the cleanup. These tests therefore drive the REAL `startBridge` and the REAL
 * route, and never call the reset to set up or tear down the property under test.
 *
 * LIVENESS IS OBSERVED FROM INSIDE THE THREAD. `process.getActiveResourcesInfo()`
 * does not report unref'd workers or ports (measured, R2-04), so the heartbeat
 * file is the only direct observable of `terminate()` that this platform offers.
 *
 * @module creator-brains-console/test/bridge.probelease
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { fixtureRoot, rawRequest } from './fixtures.mjs';
import { resetBridgeRegistry, startBridge } from '../server.mjs';
import { healthOwnerCount, healthReading, releaseHealthOwner, resetHealthCache } from '../lib/health.mjs';
import { setProbeWorkerForTest } from '../lib/health-probe.mjs';

const WORKER_DIR = tempRoot('r303-workers');
/** A file the heartbeat worker appends to, so termination is OBSERVABLE. */
const BEAT_FILE = join(WORKER_DIR, 'beat.txt');

const HEARTBEAT_URL = (() => {
  const file = join(WORKER_DIR, 'heartbeat.mjs');
  writeFileSync(file, [
    "import { workerData } from 'node:worker_threads';",
    "import { appendFileSync } from 'node:fs';",
    "workerData.port.on('message', () => {});",
    `setInterval(() => { appendFileSync(${JSON.stringify(BEAT_FILE)}, 'x'); }, 40);`,
  ].join('\n') + '\n', 'utf8');
  return pathToFileURL(file).href;
})();

const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });
const beats = () => statSync(BEAT_FILE).size;

/**
 * Give back every lease a PREVIOUS test left behind.
 *
 * WHY THIS IS HERE, AND WHY IT IS NOT CHEATING. Without it, one failing test
 * cascades: a leaked lease makes the next test's precondition false, and the third
 * test then fails for a reason that has nothing to do with what it asserts. With
 * it, each test fails only on its own property. The mutants below are exactly how
 * this was found — the first version of these tests HUNG under the missing-release
 * mutation, because the leak also skipped the cleanup that let the process exit. A
 * test that hangs on the defect is worse than one that fails: it spends the suite's
 * budget and can wedge a pipeline.
 */
function drainLeases() {
  while (healthOwnerCount() > 0) releaseHealthOwner();
}

/** Fresh lease state, a fresh heartbeat worker, and no bridge left registered. */
function fresh(label) {
  resetBridgeRegistry();
  drainLeases();
  resetHealthCache();
  setProbeWorkerForTest(HEARTBEAT_URL);
  writeFileSync(BEAT_FILE, '', 'utf8');
  return fixtureRoot(label);
}

/** Drive a REAL probe through the REAL route — the production trigger, not a stub. */
async function startProbeThrough(handle) {
  const res = await rawRequest(handle.url, '/api/status');
  assert.equal(res.status, 200, 'status must answer while the probe is still in flight');
  await sleep(300);
  assert.ok(beats() > 0, 'precondition: the probe worker is running and beating');
}

test('R3-03a: a real bridge takes the lease, and shutdown gives it back', async () => {
  const r = fresh('r303a');
  assert.equal(healthOwnerCount(), 0, 'precondition: no owner before start');

  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    assert.equal(healthOwnerCount(), 1, 'a running bridge owns the shared probe');
    await startProbeThrough(b);

    b.shutdown();
    assert.equal(healthOwnerCount(), 0, 'shutdown gives the lease back');

    // RETIRED, not merely forgotten — the observable R2-04g established. Measured
    // inside the try, because the `finally` below terminates the worker and would
    // make the assertion unreachable if it ran first.
    const before = beats();
    await sleep(300);
    assert.equal(beats(), before, 'the last owner must terminate the worker, not leave it idle');
  } finally {
    b.shutdown(); // idempotent — safe whether or not the line above ran
    setProbeWorkerForTest(null);
  }
});

test('R3-03b: two bridges share the probe, and only the LAST one retires it', async () => {
  const ra = fresh('r303b-a');
  const rb = fixtureRoot('r303b-b');
  const a = await startBridge({ r: ra, port: 0, open: false, log: () => {} });
  const b = await startBridge({ r: rb, port: 0, open: false, log: () => {} });
  try {
    assert.equal(healthOwnerCount(), 2, 'both bridges own the shared probe');
    await startProbeThrough(a);

    // A stops while B is still serving. Retiring the shared worker here would be
    // a shutdown that breaks a running service — which is why the lease exists.
    a.shutdown();
    assert.equal(healthOwnerCount(), 1, 'one owner remains');
    const kept = beats();
    await sleep(300);
    assert.ok(beats() > kept, 'the worker must outlive the first bridge to stop');

    // The last owner goes, and NOW it retires.
    b.shutdown();
    assert.equal(healthOwnerCount(), 0);
    const before = beats();
    await sleep(300);
    assert.equal(beats(), before, 'the LAST owner retires the worker');
  } finally {
    a.shutdown();
    b.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R3-03c: a release with no matching acquire is a NO-OP, not a reset', () => {
  resetBridgeRegistry();
  drainLeases();
  resetHealthCache();
  assert.equal(healthOwnerCount(), 0, 'precondition: no bridge is running');

  // Prime the cache from an INJECTED probe, so no worker is involved and the only
  // thing under test is the reset rule itself.
  const probe = () => ({ ok: true, version: 'CACHED-1.0.0', reason: 'stub' });
  assert.equal(healthReading({ probe, now: 1_000 }).version, 'CACHED-1.0.0');

  // A caller that never took a lease must not be able to retire anything. `owners`
  // is checked BEFORE it is decremented: a release from zero is not "the last
  // owner left", it is a caller that never took one.
  assert.equal(releaseHealthOwner(), 0, 'a stray release leaves the count at zero');

  // And the proof that nothing was RESET: the cached reading survives. A reset
  // empties the cache, so the next read would have to probe again — and this probe
  // throws if it is ever called.
  const again = healthReading({
    probe: () => { throw new Error('the stray release cleared the cache'); },
    now: 1_001,
  });
  assert.equal(again.version, 'CACHED-1.0.0', 'a stray release must not clear the cache');
});
```

## `test/store-attacks.mjs` — sha256 `606114d094245b10033e14ec038dd24700a6faa4dd3fbe206257c5559d417ae0`

```js
/*
 * Store-attack harness — build the REAL filesystem shapes a hostile or broken
 * store produces, so a test can attack one rather than describe one.
 *
 * WHY THIS IS NOT IN `fixtures.mjs`. That module seeds a HEALTHY store and sits
 * at 289 of the 300-line cap (rule 4). These helpers are the opposite concern:
 * they construct the shapes the containment rules exist to refuse.
 *
 * WHY THIS IS NOT IN A `.test.mjs`. S1-H13 — a harness exported from a test file
 * re-registers that file's tests in every importer, so one test is counted once
 * per importer. A harness is not a test, and `node --test` must not see it.
 *
 * WHY THE ATTACKS ARE REAL. Astra's fix note asks for real Windows filesystem
 * tests as a release gate, and this suite has learned twice why: a test that
 * cannot construct its own attack proves nothing. A mocked filesystem proves the
 * check RUNS; only a real junction proves it SEES what `readFileSync` follows.
 * Junctions are creatable without administrator rights on Windows, which is why
 * they are used rather than symlinks (a file symlink returns EPERM without
 * Developer Mode, so it is not available as a release gate here).
 *
 * @module creator-brains-console/test/store-attacks
 */

import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';

/** A generation directory OUTSIDE the store, with content a leak would expose. */
export function outsideGeneration(label) {
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

/**
 * Point a brain at a generation OUTSIDE the store through a REAL traversal.
 *
 * WHY A TRAVERSAL AND NOT A JUNCTION. These are different vectors with different
 * guards: a junction is lexically inside and escapes only through `realpathSync`,
 * while a traversal escapes LEXICALLY — the console's own `inside()` check is the
 * only thing that sees it. A test built on a junction cannot exercise that check.
 *
 * THE OUTSIDE DIRECTORY IS REAL AND READABLE, and that is the point. `generation`
 * is written verbatim into `current.json` and the engine joins it as
 * `join(base, ns, generation)`. If the directory did not exist the engine would
 * skip the entry and the route would refuse for the wrong reason — "nothing to
 * read" rather than "escapes the store" — so the test would pass with the guard
 * removed. Here the content is genuinely reachable, so a missing guard serves it.
 *
 * @returns the traversal actually written, so the caller can assert it escapes.
 */
export function repointOutside(r, ns, label) {
  const outside = outsideGeneration(label);
  const from = join(r, 'brains', ns);
  const traversal = relative(from, join(outside, 'gen-0001'));
  assert.ok(
    traversal.startsWith('..'),
    `the traversal '${traversal}' does not leave the store — the attack was not constructed`,
  );
  repoint(r, ns, traversal);
  return traversal;
}

/** Point an existing brain at a different generation. */
export function repoint(r, ns, generation) {
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
export function junction(target, linkPath, storeRoot) {
  symlinkSync(target, linkPath, 'junction');
  const real = realpathSync(linkPath);
  const realStore = realpathSync(storeRoot);
  assert.ok(
    !real.toLowerCase().startsWith(realStore.toLowerCase()),
    `the junction at '${linkPath}' resolved to '${real}', which is INSIDE the store — the attack was not constructed`,
  );
  return real;
}
```

## `test/bridge.readsurface.test.mjs` — sha256 `20894f5c352bd53e93946779d9973ac3ee7a026d7f4bb21e45a51f5507c18de0`

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
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';
import { junction, outsideGeneration, repoint } from './store-attacks.mjs';

/* The three attack builders live in `store-attacks.mjs` — a harness module, not a
 * test file, so importing it does not re-register anything (S1-H13). */

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

## `test/bridge.writegate.test.mjs` — sha256 `bafe8b20e9879e709ddd3b1dc1c43fa5ce590046e9ed5624515727523ff692d3`

```js
/*
 * T-B26 — the SAME-ORIGIN WRITE GATE (A1-09, Astra adjudication 2026-09-20).
 *
 * WHY THIS FILE EXISTS. The packet treated "binds loopback + checks Host" as the
 * complete trust boundary. It is not. `hostAllowed` stops DNS REBINDING — a page
 * whose hostname re-resolves to 127.0.0.1 after load. It does nothing about the
 * simpler attack the review actually named:
 *
 *   A remote page that already knows the bridge is on 127.0.0.1:<port> POSTs to
 *   it directly. The browser supplies `Host: 127.0.0.1:<port>` itself, so the
 *   Host gate passes; and a `Content-Type: text/plain` body is a CORS "simple
 *   request", so no preflight is sent. The write lands.
 *
 * A1-09's own correction text asked for exactly one test: "Test a foreign page
 * sending a simple `text/plain` request to the loopback URL." That is T-B26a.
 *
 * THE GATE'S THIRD DEFECT, FOUND BY BUILDING THE CLIENT. The first draft of the
 * gate required the custom header, and the console's own web adapter did not
 * send it — so the fix would have refused every write the app makes. Six
 * existing tests failed on contact, which is what caught it. T-B26k exists so
 * the two sides cannot drift apart silently again: the adapter lives under
 * `web/src`, which may not import this module (T-W2), so the header string is
 * duplicated and asserted equal here.
 *
 * @module creator-brains-console/test/bridge.writegate
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { originAllowed, writeGateFailure, REQUIRED_HEADER, REQUIRED_MEDIA_TYPE } from '../lib/write-gate.mjs';
import { withFixture, rawRequest, CH_TWO } from './fixtures.mjs';

/** The headers a legitimate write client sends. `gate:false` plus these is a valid write. */
const satisfied = (extra = {}) => ({ 'content-type': REQUIRED_MEDIA_TYPE, [REQUIRED_HEADER]: '1', ...extra });

/* ── T-B26a/b · the attack, and the header that de-simplifies it ─────────── */

test('T-B26a: a foreign page sending a simple text/plain POST is refused', async () => {
  await withFixture('t-b22a', async ({ base }) => {
    // Exactly the A1-09 attack: no custom header, a "simple" media type, so the
    // browser would have sent no preflight at all.
    const res = await rawRequest(base, '/api/creators', {
      method: 'POST', gate: false,
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ ref: 'UC' + 'z'.repeat(22) }),
    });
    assert.equal(res.status, 403, 'a simple cross-site write must not reach the route table');
    assert.equal(res.body.error.code, 'FORBIDDEN_WRITE');
  });
});

test('T-B26b: a JSON write with no custom header is refused', async () => {
  await withFixture('t-b22b', async ({ base }) => {
    // Content-type alone is not enough — that is the "does not rest on one
    // property" requirement. A fetch() with a JSON body is trivially written by
    // any page; a custom header is not, because it forces a preflight.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: { 'content-type': REQUIRED_MEDIA_TYPE },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /must carry the x-console-write header/);
  });
});

test('T-B26b2: a non-JSON media type is refused even when the header is present', async () => {
  await withFixture('t-b22b2', async ({ base }) => {
    const body = JSON.stringify({ enabled: true });
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false, body,
      headers: {
        'content-type': 'text/plain',
        [REQUIRED_HEADER]: '1',
        // Pinned rather than left to node's chunked default, so this asserts the
        // media rule and not the body-detection heuristic.
        'content-length': String(Buffer.byteLength(body)),
      },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /must be application\/json/);
  });
});

/* ── T-B26c/e · the Origin rule ──────────────────────────────────────────── */

test('T-B26c: a remote Origin is refused even with the header and media type satisfied', async () => {
  await withFixture('t-b22c', async ({ base }) => {
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: satisfied({ origin: 'https://evil.example' }),
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403, 'Origin is the requirement that actually refuses a browser write');
    assert.match(res.body.error.message, /cross-origin write/);
  });
});

test('T-B26e: a loopback Origin on ANOTHER port is refused (R2-05)', async () => {
  await withFixture('t-b22e', async ({ base }) => {
    // THIS TEST USED TO ASSERT THE OPPOSITE, and the inversion is the finding.
    // It accepted `http://localhost:5173` on the argument that refusing it would
    // break the Vite dev server. That argument was wrong twice over: the write
    // carries a custom header, so a cross-origin attempt triggers a preflight the
    // bridge never approves (no CORS permission is ever granted), and
    // `vite.config.ts` has no proxy — so a dev-server write never reaches the
    // bridge anyway. The old rule therefore refused nobody legitimate while
    // admitting every local origin, including a hostile local page. Astra round 2
    // found it (R2-05); the probe that found it used this exact origin.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: satisfied({ origin: 'http://localhost:5173' }),
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 403, 'another port is another origin, whatever the host resolves to');
    assert.match(res.body.error.message, /cross-origin write/);
  });
});

test('T-B26e2: the origin the request was SERVED BY is accepted, and nothing else', async () => {
  await withFixture('t-b22e2', async ({ base, port }) => {
    // The positive control for T-B26e: the rule must not be "refuse everything",
    // which would pass the test above and break the app.
    //
    // R3-04 INVERTED THIS TEST'S SECOND HALF. It used to loop over BOTH loopback
    // spellings and expect 200 from each — and that loop is what encoded the
    // socket-alias allowlist. `localhost` and `127.0.0.1` are DIFFERENT origins.
    // What is true, and what a browser actually does, is that a page writes back
    // to the authority it was served by: `LocalEngineAdapter.ts:46` defaults
    // `baseUrl` to `window.location.origin`, so Host and Origin agree.
    const send = (host, origin) => rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false, host,
      headers: satisfied({ origin }),
      body: JSON.stringify({ enabled: true }),
    });

    const own = await send(`127.0.0.1:${port}`, `http://127.0.0.1:${port}`);
    assert.equal(own.status, 200, 'the origin this request was served by IS this bridge\'s origin');

    // CROSS-ALIAS: same socket, same port, different origin — the case the alias
    // table admitted and exact equality refuses.
    const cross = await send(`localhost:${port}`, `http://127.0.0.1:${port}`);
    assert.equal(cross.status, 403, 'a different spelling is a different origin');

    // ...but the SAME spelling still writes, so the refusal above is about the
    // MISMATCH and not about the word `localhost`.
    const alias = await send(`localhost:${port}`, `http://localhost:${port}`);
    assert.equal(alias.status, 200, 'a page served by localhost writes back to localhost');
  });
});

test('T-B26f: originAllowed requires EXACT equality with the serving origin (R2-05, R3-04)', () => {
  const serving = 'http://127.0.0.1:8787';

  // Exactly the origin the request was served by, and nothing else.
  assert.equal(originAllowed('http://127.0.0.1:8787', serving), true, 'the serving origin is accepted');

  // The defect, one case per way to be a different origin.
  for (const bad of [
    'http://localhost:8787',      // R3-04: same socket, DIFFERENT origin — no alias table
    'HTTP://LOCALHOST:8787',      // not already a serialized origin (scheme/host case)
    'http://localhost:5173',      // R2-05 itself: loopback host, another port
    'http://127.0.0.1:8788',      // one port over
    'http://127.0.0.1',           // no port => :80, which is not 8787
    'http://[::1]:8787',          // a DIFFERENT socket — the bridge binds 127.0.0.1 only
    'https://127.0.0.1:8787',     // wrong scheme; the bridge serves no TLS
    // R3-04: `new URL` parses all four of these and `.origin` drops the extra, so
    // a normalised-field comparison accepts a value no browser ever sends.
    'http://127.0.0.1:8787/path',
    'http://user@127.0.0.1:8787',
    'http://127.0.0.1:8787?q=1',
    'http://127.0.0.1:8787#frag',
    'https://evil.example',
    'http://127.0.0.1.evil.example:8787',
    'http://localhost.evil.example:8787',
    'http://0.0.0.0:8787',
    '', null, 'null', 'not a url',
  ]) {
    assert.equal(originAllowed(bad, serving), false, `${String(bad)} is not this bridge's origin`);
  }

  // A caller that cannot supply the serving origin gets a refusal, not a pass.
  for (const noServing of [undefined, null, '', 42]) {
    assert.equal(
      originAllowed('http://127.0.0.1:8787', noServing), false,
      'a rule whose right-hand side is missing must fail closed',
    );
  }
});

/* ── T-B26g · the property that makes the preflight fail ─────────────────── */

test('T-B26g: no response ever carries access-control-allow-origin', async () => {
  await withFixture('t-b22g', async ({ base }) => {
    const responses = [
      await rawRequest(base, '/api/creators', { method: 'GET' }),
      await rawRequest(base, '/api/creators', { method: 'POST', gate: false, headers: { 'content-type': 'text/plain' }, body: 'x' }),
      await rawRequest(base, '/api/creators', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }),
      await rawRequest(base, '/api/creators', { method: 'POST', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ ref: 'x' }) }),
    ];
    for (const res of responses) {
      assert.equal(res.headers['access-control-allow-origin'], undefined,
        'granting CORS here would make the preflight succeed and the gate pointless');
    }
  });
});

/* ── T-B26h/i/j · the gate must not refuse a legitimate client ───────────── */

test('T-B26h: a bodyless DELETE passes on the header alone', async () => {
  await withFixture('t-b22h', async ({ base }) => {
    // A bodyless DELETE has no natural media type. Requiring one would make the
    // gate unsatisfiable by a legitimate client — the exact defect class this
    // whole review hunts. It must therefore reach the route table (404: no such
    // route) rather than being refused by the gate (403).
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'DELETE', gate: false, headers: { [REQUIRED_HEADER]: '1' },
    });
    assert.equal(res.status, 404, 'the gate must not be the thing that refused this');
  });
});

test('T-B26i: reads are unaffected by the gate', async () => {
  await withFixture('t-b22i', async ({ base }) => {
    // A media-type rule on GET would break the address bar.
    const res = await rawRequest(base, '/api/creators', { method: 'GET', gate: false });
    assert.equal(res.status, 200);
    const preflight = await rawRequest(base, '/api/status', { method: 'HEAD', gate: false });
    assert.notEqual(preflight.status, 403);
  });
});

test('T-B26j: a satisfied gate still reaches the route — validation is unchanged', async () => {
  await withFixture('t-b22j', async ({ base }) => {
    const res = await rawRequest(base, '/api/creators/not-a-channel', {
      method: 'PATCH', body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 400, 'the gate must be transparent to a well-formed client');
    assert.equal(res.body.error.code, 'VALIDATION');
  });
});

test('T-B26l: non-write methods are never gated (unit)', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS', 'TRACE']) {
    assert.equal(writeGateFailure({ method, headers: {} }), null, `${method} is not a write`);
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(writeGateFailure({ method, headers: {} })?.code, 'FORBIDDEN_WRITE');
  }
});

/* ── T-B26k · the client must satisfy its own bridge's gate ──────────────── */

test('T-B26k: the web adapter sends the same header this gate requires', () => {
  // The adapter may not import this module (T-W2 forbids web/src from escaping
  // itself), so the string is duplicated. That duplication is a silent-failure
  // seam: change one side and every write the console makes becomes a 403 with
  // no clue why. This is the cheapest possible guard against that.
  const adapter = readFileSync(
    join(import.meta.dirname, '..', 'web', 'src', 'adapters', 'LocalEngineAdapter.ts'), 'utf8',
  );
  assert.ok(adapter.includes(REQUIRED_HEADER),
    `web/src/adapters/LocalEngineAdapter.ts must send '${REQUIRED_HEADER}' on every request`);
});

test('T-B26k2: the browser-shaped write the adapter builds is accepted', async () => {
  await withFixture('t-b22k2', async ({ base, port }) => {
    // Node cannot reproduce a browser's forbidden-header handling, so the
    // browser shape is assembled from what the adapter actually sets: accept,
    // the gate header, a JSON media type, and the Origin the bridge serves the
    // app from. This is the end-to-end proof that the app can write.
    const res = await rawRequest(base, `/api/creators/${CH_TWO}`, {
      method: 'PATCH', gate: false,
      headers: {
        accept: 'application/json',
        [REQUIRED_HEADER]: '1',
        'content-type': REQUIRED_MEDIA_TYPE,
        origin: `http://127.0.0.1:${port}`,
      },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(res.status, 200, 'the console must be able to write to its own bridge');
    assert.equal(res.body.channelId, CH_TWO);
  });
});
```

## `test/bridge.contractsync.test.mjs` — sha256 `0b87bfcaa77a037d08ce9baf0e5041259f50db1bd89f7cafde15620c562ddfac`

```js
/*
 * T-B27 — THE WEB CONTRACT AND THE BRIDGE MUST AGREE (R2-01, Astra round 2).
 *
 * WHY THIS FILE EXISTS. `web/src/adapters/types.ts` says, in its own header, that
 * it is "transcribed verbatim from the contract; do not improve shapes here
 * without amending 05-contracts.md first". R2-01 found three declarations that had
 * drifted anyway: `ytdlp` omitted the health provenance, `BrainDoc` omitted
 * `generation`, and `CanaryReading` could not express the `unknown` source. None
 * of that was visible to any test, because the web suite tests the CLIENT against
 * its OWN fixtures — so a wrong declaration and a matching wrong fixture agree
 * perfectly and both pass. The bridge was never asked.
 *
 * A FOURTH DRIFT WAS FOUND WHILE FIXING IT, and it is the sharpest of the four:
 * A1-04 amended `05-contracts.md` to rename `BrainDoc.key`, while the bridge went
 * on serving `slug` and the types kept declaring `slug`. For a full round the
 * document, the declaration and the response disagreed in three directions, and
 * nothing compared them. That is why this file checks THREE artifacts, not two.
 *
 * THE HALF-FIX THIS AVOIDS. The obvious repair is a hand-written key list here,
 * checked against the payload. That is a fourth statement of the contract, and the
 * repo already treats a duplicated shape as a hazard (status.mjs header, blueprint
 * H10) — it would drift too, one round later, with nobody to blame.
 *
 * So ONE SIDE IS DERIVED, NOT RETYPED. `contract-parse.mjs` reads both declarations
 * as TEXT and extracts their field names; the other side is the live response. The
 * two things being compared are therefore the real declaration and the real
 * payload.
 *
 * @module creator-brains-console/test/bridge.contractsync
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TYPES_TS, assertServed, contractsTsBlock, contractRowShape, deferredRoute,
  interfaceFields, methodReturnFields,
} from './contract-parse.mjs';
import { BRAIN_NS, getJson, seedPublishedBrain, withFixture } from './fixtures.mjs';

const names = (src, n) => interfaceFields(src, n).map((f) => f.name).sort();

/* ── the extractor itself must be trustworthy before anything rests on it ─── */

test('T-B27a: the types.ts extractor reads real interfaces, not an empty set', () => {
  const src = readFileSync(TYPES_TS, 'utf8');

  const status = interfaceFields(src, 'StatusInstrument');
  assert.ok(status.length >= 12, `StatusInstrument extracted only ${status.length} fields`);

  // Spot-check the shapes R2-01 named, so a parser that silently returns the
  // wrong depth is caught here rather than by a passing comparison later.
  assert.ok(names(src, 'BrainDoc').includes('generation'), 'BrainDoc must declare generation (R2-01)');
  assert.ok(names(src, 'CanaryReading').includes('source'), 'CanaryReading must declare source (R2-01)');
  assert.deepEqual(
    interfaceFields(src, 'CanaryReading').filter((f) => f.optional), [],
    'CanaryReading must declare no optional field — the bridge always sends all eight (R2-01)',
  );
  // Nesting must not leak: `creators` is one field, not four.
  assert.ok(names(src, 'StatusInstrument').includes('creators'));
  assert.ok(!names(src, 'StatusInstrument').includes('total'), 'nested keys must not surface as top-level');
});

test('T-B27d: the extractor is depth-correct and field-granular', () => {
  // ONE FIELD PER LINE (the types.ts style).
  const onePerLine = [
    'export interface Sample {',
    '  top: number;',
    '  nested: {',
    '    inner: string;',
    '  };',
    '  deep: Array<{ a: number }>;',
    '  maybe?: string;',
    '}',
  ].join('\n');
  assert.deepEqual(interfaceFields(onePerLine, 'Sample'), [
    { name: 'top', optional: false },
    { name: 'nested', optional: false },
    { name: 'deep', optional: false },
    { name: 'maybe', optional: true },
  ]);

  // SEVERAL FIELDS PER LINE (the 05-contracts.md style), including a field on the
  // same line as the opening brace, and an inline comment after the brace.
  const packed = [
    'export interface Packed {   // a trailing comment must not eat the next field',
    '  a: number; b: string | null;',
    '  c: { inner: number }; d?: boolean; e: string; }',
  ].join('\n');
  assert.deepEqual(interfaceFields(packed, 'Packed'), [
    { name: 'a', optional: false },
    { name: 'b', optional: false },
    { name: 'c', optional: false },
    { name: 'd', optional: true },
    { name: 'e', optional: false },
  ]);
});

/* ── every consumed route is checked against the declaration ─────────────── */

test('T-B27b: the live payloads serve every field types.ts declares', async () => {
  await withFixture('t-b27b', async ({ r, base }) => {
    const src = readFileSync(TYPES_TS, 'utf8');
    const { ns } = seedPublishedBrain(r, BRAIN_NS);

    const status = await getJson(base, '/api/status');
    assert.equal(status.status, 200);
    assertServed('/api/status', interfaceFields(src, 'StatusInstrument'), status.body);
    // The health sub-object is the R2-01 defect site, so it is checked at depth
    // rather than trusted because its parent passed.
    assertServed('/api/status', interfaceFields(src, 'HealthReading'), status.body.ytdlp, '.ytdlp');

    const canary = await getJson(base, '/api/canary');
    assert.equal(canary.status, 200);
    assertServed('/api/canary', interfaceFields(src, 'CanaryReading'), canary.body);

    const run = await getJson(base, '/api/run');
    assert.equal(run.status, 200);
    assertServed('/api/run', interfaceFields(src, 'RunState'), run.body);

    const brain = await getJson(base, `/api/brains/${ns}`);
    assert.equal(brain.status, 200);
    assertServed('/api/brains/:slug', interfaceFields(src, 'BrainDoc'), brain.body);

    const creators = await getJson(base, '/api/creators');
    assert.equal(creators.status, 200);
    assert.ok(Array.isArray(creators.body) && creators.body.length > 0);
    for (const row of creators.body) {
      assertServed('/api/creators', interfaceFields(src, 'CreatorRow'), row);
    }

    const query = await getJson(base, '/api/query?q=fixture');
    assert.equal(query.status, 200);
    assertServed('/api/query', interfaceFields(src, 'QueryResult'), query.body);
    for (const hit of query.body.hits) {
      assertServed('/api/query', interfaceFields(src, 'QueryHit'), hit, '.hits[]');
    }
  });
});

test('T-B27c: the check is falsifiable — a declared field the bridge omits fails it', () => {
  // Guards against the whole file being vacuous. If `assertServed` tolerated a
  // missing key, every assertion above would pass for a bridge that serves
  // nothing — which is exactly what happened while this reader was being written,
  // and T-B27a is what caught it.
  assert.throws(
    () => assertServed('/api/x', [{ name: 'present' }, { name: 'absent' }], { present: 1 }),
    /missing: absent/,
  );
  // ...and an OPTIONAL declared field is not demanded, or the gate would refuse a
  // healthy bridge the first time the bridge legitimately omitted one.
  assert.doesNotThrow(() => assertServed('/api/x', [{ name: 'maybe', optional: true }], {}));
});

/* ── and the CONTRACT DOCUMENT must agree with the bridge too ─────────────── */

test('T-B27e: 05-contracts.md declares the fields the bridge actually serves', async () => {
  await withFixture('t-b27e', async ({ r, base }) => {
    const doc = contractsTsBlock();
    const { ns } = seedPublishedBrain(r, BRAIN_NS);

    const status = await getJson(base, '/api/status');
    const canary = await getJson(base, '/api/canary');
    const run = await getJson(base, '/api/run');
    const brain = await getJson(base, `/api/brains/${ns}`);
    const creators = await getJson(base, '/api/creators');
    assert.equal(status.status + canary.status + run.status + brain.status + creators.status, 1000);

    assertServed('05-contracts.md: /api/status', interfaceFields(doc, 'StatusInstrument'), status.body);
    assertServed('05-contracts.md: /api/status', interfaceFields(doc, 'CanaryReading'), status.body.ytdlp, '.ytdlp');
    assertServed('05-contracts.md: /api/canary', interfaceFields(doc, 'CanaryReading'), canary.body);
    assertServed('05-contracts.md: /api/run', interfaceFields(doc, 'RunState'), run.body);
    assertServed('05-contracts.md: /api/brains/:slug', interfaceFields(doc, 'BrainDoc'), brain.body);
    for (const row of creators.body) {
      assertServed('05-contracts.md: /api/creators', interfaceFields(doc, 'CreatorRow'), row);
    }

    // AND THE TWO DECLARATIONS MUST AGREE WITH EACH OTHER, field for field. This
    // is the assertion that would have caught A1-04's doc-only rename: the
    // contract said `key`, the types said `slug`, and each was "valid" alone.
    const types = readFileSync(TYPES_TS, 'utf8');
    for (const n of ['StatusInstrument', 'CanaryReading', 'RunState', 'BrainDoc', 'CreatorRow', 'QueryHit']) {
      assert.deepEqual(
        names(doc, n), names(types, n),
        `${n} is declared differently in 05-contracts.md and web/src/adapters/types.ts`,
      );
    }
  });
});

test('T-B27f: the two declarations differ on a renamed field, and the check catches it', () => {
  // Falsifiability for T-B27e's cross-artifact half. Without this, a `key`/`slug`
  // divergence could sit in the document indefinitely while every assertion above
  // passed, because each artifact was compared only to the bridge.
  assert.throws(
    () => assert.deepEqual(
      names('export interface X { key: string; b: number; }', 'X'),
      names('export interface X { slug: string; b: number; }', 'X'),
    ),
    /deep-equal|deepStrictEqual/,
  );
});

/* ── R3-05 · the DEFERRED methods, which no live payload can confirm ─────── */

const adapterSource = readFileSync(
  new URL('../web/src/adapters/LocalEngineAdapter.ts', import.meta.url), 'utf8',
);
const typesSource = readFileSync(TYPES_TS, 'utf8');

test('T-B27m0: the signature extractor can FAIL (the checker is checked)', () => {
  // THE R2-01 LESSON, APPLIED TO THIS READER. Two earlier field extractors in this
  // suite were wrong, and in both cases their assertions passed while comparing
  // nothing — one matched no fields at all, the other read a single field per line
  // and invented divergences. So this extractor is shown able to give a DIFFERENT
  // answer for a different signature, and to REFUSE a signature it cannot read
  // rather than return an empty list that compares equal to a document declaring
  // nothing.
  const rejected = 'async repair(): Promise<{ requeued: number }> { }';
  assert.deepEqual(methodReturnFields(rejected, 'repair'), ['requeued'], 'the reader sees the real names');
  assert.notDeepEqual(
    methodReturnFields(rejected, 'repair'), contractRowShape('POST /api/repair'),
    'the REJECTED shape must not match the document, or this comparison is vacuous',
  );
  assert.throws(
    () => methodReturnFields('async repair(): Promise<void> { }', 'repair'),
    /no Promise/,
    'an unreadable signature must throw, not return an empty list',
  );
});

for (const method of ['startDailyRun', 'repair']) {
  test(`T-B27m/${method}: the deferred return type agrees with 05 §2b`, () => {
    // The join key is derived from the adapter's OWN deferral comment, so there is
    // no hand-written method→route table here to drift one round later.
    const route = deferredRoute(adapterSource, method);
    assert.deepEqual(
      methodReturnFields(typesSource, method), contractRowShape(route),
      `${method} declares a different shape from 05-contracts.md §2b's row for ${route}`,
    );
  });
}
```

## `test/contract-parse.mjs` — sha256 `e476997426d0da3eef13397b71bb4499965e081585511f2e5d99482f74716148`

```js
/*
 * contract-parse.mjs — read a TypeScript interface declaration as TEXT.
 *
 * WHY THIS IS NOT IN A .test.mjs FILE. Two reasons, both learned here. First, the
 * repo's rule 4 caps every console source file at 300 lines, and `bridge.contractsync.test.mjs`
 * was 321 with this logic inline — the cap reported it by name, which is the cap
 * doing its job. Second, and the same reason `fixtures.mjs` lives outside the test
 * files: **a harness is not a test.** A module that a test file imports must not
 * register tests, or the suite's own count stops measuring what it claims to
 * measure (S1-H13). This module registers nothing.
 *
 * WHAT IT IS FOR. R2-01 found that `web/src/adapters/types.ts` and
 * `05-contracts.md` had both drifted from what the bridge actually serves, and
 * that NOTHING COULD SEE IT — the web suite tests the client against its own
 * fixtures, so a wrong declaration and a matching wrong fixture agree perfectly.
 * The fix needs one side derived rather than retyped, and these are the readers
 * that derive it. The same trick HY4-H6 uses when it reads the route table as
 * text instead of importing it.
 *
 * @module creator-brains-console/test/contract-parse
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The web contract as the client declares it. */
export const TYPES_TS = fileURLToPath(new URL('../web/src/adapters/types.ts', import.meta.url));

/** The contract of record, whose fenced `ts` block is compared too. */
export const CONTRACTS_MD = fileURLToPath(
  new URL('../../../docs/ai-workflow/blueprints/creator-brains-console-20260917/05-contracts.md', import.meta.url),
);

/**
 * Strip comments so they cannot be read as fields.
 *
 * `//` is stripped ANYWHERE on a line, not just at its start. Both artifacts
 * annotate declarations inline — `export interface StatusInstrument {   // R2 —
 * mirrors status-command sources` — and an anchored-only rule left that comment in
 * the body, where the scanner consumed it as a token and then treated the next
 * real field as already-seen. The symptom was two fields of `StatusInstrument`
 * reported as missing from a document that declares them: a FALSE divergence,
 * which is worse than a missed one because it invites someone to "fix" a correct
 * document.
 */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Top-level fields of one `export interface Name { … }`, as `{ name, optional }`.
 *
 * WHY A CHARACTER SCANNER AND NOT A LINE MATCH. `types.ts` writes one field per
 * line, but 05-contracts.md packs several onto one (`ok: boolean; version: string
 * | null; reason: string;`), and a line-based version of this function saw only
 * the FIRST field on each line.
 *
 * Depth is counted RELATIVE TO THE BODY: the scan starts just after the
 * interface's opening brace, so a field sits at depth 0 and a nested object's
 * contents sit at depth 1 or deeper. A field may begin at the start of the body or
 * after a `;` at depth 0. The interface's own closing brace drives the depth to
 * -1, which is the terminator.
 *
 * TWO EARLIER VERSIONS WERE WRONG, and both were caught by the tests here rather
 * than downstream — which is the only reason this reader can be trusted: the first
 * counted from the `interface` keyword, so it matched nothing and every comparison
 * passed while comparing nothing; the second read one field per line, so it
 * invented divergences. `T-B27a`/`T-B27d` keep both failure modes caught.
 */
export function interfaceFields(source, name) {
  const text = stripComments(source);
  const marker = `export interface ${name} {`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `no declaration of interface ${name} was found`);

  const fields = [];
  let depth = 0;
  let expectField = true;
  const body = text.slice(start + marker.length);

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '{') {
      depth += 1;
      expectField = false;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth < 0) break; // the interface's own closing brace
      expectField = false;
      continue;
    }
    if (ch === ';') {
      expectField = depth === 0;
      continue;
    }
    if (depth === 0 && expectField) {
      const m = /^(\w+)(\??)\s*:/.exec(body.slice(i));
      if (m) {
        fields.push({ name: m[1], optional: m[2] === '?' });
        i += m[0].length - 1;
        expectField = false;
        continue;
      }
      if (!/\s/.test(ch)) expectField = false;
    }
  }
  return fields;
}

/**
 * The single fenced `ts` block of 05-contracts.md — the contract of record.
 *
 * WHY THE DOC IS COMPARED TOO (and not just types.ts). A1-04 amended the contract
 * to rename `BrainDoc.key` while the bridge kept serving `slug` and the web types
 * kept declaring `slug`. For a full round the three disagreed and NO TEST COULD SEE
 * IT, because nothing had ever compared the document to the response. R2-01 is
 * that divergence surfacing. Comparing `types.ts` alone would leave the same hole
 * one artifact over.
 */
export function contractsTsBlock() {
  const text = readFileSync(CONTRACTS_MD, 'utf8');
  const m = text.match(/```ts\n([\s\S]*?)\n```/);
  assert.ok(m, '05-contracts.md must contain a fenced ts block');
  return m[1];
}

/**
 * Every declared non-optional field must be a key of `payload`.
 *
 * THE DIRECTION IS DELIBERATE. Declared ⊆ served. A declared field the bridge does
 * not send is a LIE the client will dereference; a served field nobody declared is
 * forward compatibility, and refusing it would make every additive bridge change a
 * breaking one. Optional fields are not required — demanding them would invent a
 * false refusal for a field the bridge may legitimately omit.
 */
export function assertServed(route, fields, payload, label = '') {
  const missing = fields
    .filter((f) => !f.optional && !Object.hasOwn(payload, f.name))
    .map((f) => f.name);
  assert.deepEqual(
    missing, [],
    `${route}${label} does not serve every field its declaration requires — missing: ${missing.join(', ')}`,
  );
}

/* ── R3-05 · the DEFERRED methods, which have no live payload to compare ─── */

/** The field names in a brace list: `requestId, runId: null` → sorted names. */
function fieldNames(body) {
  return body
    .split(/[;,]/)
    .map((part) => (part.split(':')[0] || '').trim())
    .filter((name) => /^\w+$/.test(name))
    .sort();
}

/**
 * The return-object field names a method's `Promise<{…}>` declares.
 *
 * WHY A METHOD AND NOT AN INTERFACE (R3-05). `T-B27` compares interface FIELDS,
 * which the live payload can confirm. The two deferred operations have no route
 * yet, so there is nothing to observe — and that is exactly why they drifted: the
 * R2-06 sweep amended `05 §2b` and left `types.ts`, `LocalEngineAdapter.ts` and
 * `MockAdapter.ts` still declaring `{runId: string}` and `{requeued: number}`. A
 * contract restated in four artifacts, corrected in one, is the R2-01 hazard.
 *
 * THROWS when the method declares no object return type, rather than returning an
 * empty list. An empty list would compare equal to a document that declares nothing
 * and pass while checking nothing — the failure mode both earlier field extractors
 * had, and the reason `T-B27m0` exists.
 */
export function methodReturnFields(source, method) {
  const text = stripComments(source);
  const m = new RegExp(`\\b${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<\\{([^}]*)\\}>`).exec(text);
  assert.ok(m, `no Promise<{…}> return type was found for ${method}`);
  return fieldNames(m[1]);
}

/**
 * The route a deferred adapter stub names, read from the RAW source.
 *
 * NOT STRIPPED, because the route is stated in the comment INSIDE the stub:
 * `// POST /api/run/daily is deferred to S4 (05-contracts.md §2b)`. Taking the join
 * key from the artifact that has to be right is what keeps this check from needing
 * a hand-written method→route table — a table that would be a fifth statement of
 * the contract.
 *
 * IT ANCHORS ON THE DECLARATION, NOT ON THE NAME. The first version searched for
 * the bare method name, and `LocalEngineAdapter`'s own header names `repair` before
 * the method is declared — so the search started in the header and returned the
 * NEXT route in the file, which was the daily run's. The check failed loudly rather
 * than passing, which is how it was caught, but the anchor is what makes it right:
 * a signature is `name(…) :`, and that is what is matched.
 */
export function deferredRoute(adapterSource, method) {
  const decl = new RegExp(`\\b${method}\\s*\\([^)]*\\)\\s*:`).exec(adapterSource);
  assert.ok(decl, `${method} is not declared in the adapter`);
  const m = /(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[\w/:.-]+)/.exec(adapterSource.slice(decl.index));
  assert.ok(m, `${method} does not name the route it defers to`);
  return `${m[1]} ${m[2]}`;
}

/** The response shape `05-contracts.md` declares for one route's table row. */
export function contractRowShape(route) {
  const row = readFileSync(CONTRACTS_MD, 'utf8')
    .split('\n')
    .find((line) => line.startsWith(`| \`${route}\``));
  assert.ok(row, `05-contracts.md declares no row for ${route}`);
  const m = /\{([^}]*)\}/.exec(row);
  assert.ok(m, `the row for ${route} declares no response shape`);
  return fieldNames(m[1]);
}
```

## `test/health.lifecycle.test.mjs` — sha256 `b1dfba21d77d3e6a8d5a48dbd3b6bc176a71f20105626fbcaea750c05f10839c`

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

## `test/health.cachekey.test.mjs` — sha256 `bacfa34313b17bfc900c37e47059fa1b628cf853e504297727f98e7ba8d3203f`

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

## `web/src/components/StatusBoard.test.tsx` — sha256 `da3b088b94075586fd63d16e99ac3d08aa6f4c13acbed65c99d751a8e902e8f2`

```ts
/*
 * T-W3 (R2/R3) — StatusBoard component.
 *
 * R3 is the load-bearing half: a damaged store must produce a REFUSAL naming the
 * file. The test asserts the absence of zeros explicitly, because "0 enabled of
 * 0" is the exact failure mode this requirement exists to prevent — it reads as
 * a real measurement when it is actually a refusal.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBoard } from '../components/StatusBoard';
import type { StatusState } from '../hooks/useStatus';
import * as fx from '../adapters/fixtures';

function ready(status: typeof fx.healthyStatus): StatusState {
  return { phase: 'ready', status, error: null, initial: false };
}

describe('T-W3 StatusBoard', () => {
  it('renders the fixture instruments when the store is healthy', () => {
    render(<StatusBoard state={ready(fx.healthyStatus)} />);

    expect(screen.getByTestId('status-board')).toBeInTheDocument();
    expect(screen.getByText(/9 enabled of 12/)).toBeInTheDocument();
    expect(screen.getByText(/366 of 418/)).toBeInTheDocument();
    expect(screen.getByText(/87\.6%/)).toBeInTheDocument();
    expect(screen.getByText(/ok · 2025\.09\.17/)).toBeInTheDocument();
    expect(screen.queryByTestId('refusal-banner')).not.toBeInTheDocument();
  });

  it('shows a refusal naming registry.json when the roster is damaged — never zeros', () => {
    const { container } = render(<StatusBoard state={ready(fx.damagedRegistryStatus)} />);

    const banner = screen.getByTestId('refusal-banner');
    expect(banner).toHaveTextContent('registry.json');
    expect(banner).toHaveTextContent(/withheld rather than reported as zero/i);

    // the refusal marker is present...
    expect(screen.getByTestId('refused-value')).toBeInTheDocument();
    // ...and no zero-count was rendered in its place
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/0 enabled of 0/);
    expect(text).not.toMatch(/\b0 of 0\b/);
  });

  it('withholds coverage when state.json is damaged', () => {
    const { container } = render(<StatusBoard state={ready(fx.damagedStateStatus)} />);

    expect(screen.getByTestId('refusal-banner')).toHaveTextContent('state.json');
    expect(screen.getByText(/Coverage unknown/i)).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\b0 of 0\b/);
    // the roster is NOT damaged here, so its real numbers still render
    expect(screen.getByText(/9 enabled of 12/)).toBeInTheDocument();
  });

  it('renders a skeleton on the first load only', () => {
    const { rerender } = render(
      <StatusBoard state={{ phase: 'loading', status: null, error: null, initial: true }} />,
    );
    expect(screen.getByText(/Reading the store/i)).toBeInTheDocument();

    rerender(<StatusBoard state={ready(fx.healthyStatus)} />);
    expect(screen.queryByText(/Reading the store/i)).not.toBeInTheDocument();
  });

  it('names the failure when the bridge never answered', () => {
    render(
      <StatusBoard
        state={{
          phase: 'error',
          status: null,
          error: { code: 'TRANSPORT', message: 'fetch failed', file: null },
          initial: false,
        }}
      />,
    );
    expect(screen.getByTestId('refusal-banner')).toHaveTextContent('TRANSPORT');
  });

  it('keeps showing the last good reading when a later poll fails', () => {
    render(
      <StatusBoard
        state={{
          phase: 'error',
          status: fx.healthyStatus,
          error: { code: 'TRANSPORT', message: 'fetch failed', file: null },
          initial: false,
        }}
      />,
    );
    // stale-but-labelled beats blank: the instrument is still there...
    expect(screen.getByText(/9 enabled of 12/)).toBeInTheDocument();
    // ...and the failure is disclosed rather than hidden
    expect(screen.getByText(/last poll failed \(TRANSPORT\)/)).toBeInTheDocument();
  });

  it('withholds the census counts when the sweep errored — absent, not zero (S1-H2)', () => {
    const { container } = render(<StatusBoard state={ready(fx.censusErroredStatus)} />);

    const refused = screen.getByTestId('refused-census');
    expect(refused).toHaveTextContent(/the sweep failed/i);
    expect(refused).toHaveTextContent(/EACCES/);

    // The landmine: rendering inFlight.length/everSwept here would print
    // "0 in flight · 0 swept" — a fabricated measurement. R3 forbids it.
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/0 in flight/);
    expect(text).not.toMatch(/0 swept/);
  });

  it('withholds the document count when state.json is damaged (S1-H3)', () => {
    render(<StatusBoard state={ready(fx.damagedStateStatus)} />);

    // `documents: 0` in that fixture is status.mjs's own guard, not a
    // measurement — so the board refuses instead of claiming "no documents".
    expect(screen.getByTestId('refused-documents')).toHaveTextContent(/state\.json unreadable/);
    // publishedBrains reads the brains directory, not state.json: it stays REAL.
    expect(screen.getByTestId('published-brains')).toHaveTextContent(String(fx.healthyStatus.publishedBrains));
  });

  it('keeps the document count real when only the roster is damaged (S1-H5 fidelity)', () => {
    render(<StatusBoard state={ready(fx.damagedRegistryStatus)} />);

    // registry damage does not touch the docs directory — withholding the
    // count here would be its own falsehood, in the opposite direction.
    expect(screen.queryByTestId('refused-documents')).not.toBeInTheDocument();
    expect(screen.getByTestId('published-brains')).toHaveTextContent(String(fx.healthyStatus.publishedBrains));
  });

  it('refuses the published count when the BRAINS store is damaged (R3-02)', () => {
    render(<StatusBoard state={ready(fx.damagedBrainsStatus)} />);

    // R3-02: the count comes from the contained enumerator and is `null` when it
    // refuses. Rendering `null` — or a fabricated 0 — would claim the store
    // publishes nothing, which is a different fact from "the count is unknown".
    expect(screen.getByTestId('refused-published-brains')).toHaveTextContent(/current\.json unreadable/);
    expect(screen.queryByTestId('published-brains')).not.toBeInTheDocument();
    // The unrelated instruments survive: that is why /api/status does not refuse
    // the whole reading the way /api/query does.
    expect(screen.queryByTestId('refused-documents')).not.toBeInTheDocument();
  });
});

/*
 * ── R2-01 · health is rendered with its PROVENANCE ──────────────────────────
 *
 * The old rendering was one ternary on `ok`, so a stale success and a live one
 * produced the SAME string, and "never checked" produced the same string as "the
 * check failed". These three tests fail against that version — which is the only
 * reason to write them. A test that passes both before and after a fix is not
 * evidence of the fix.
 */
describe('R2-01 health provenance', () => {
  it('a LIVE ok reading reads as ok and does not claim to be history', () => {
    render(<StatusBoard state={ready(fx.healthyStatus)} />);

    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/ok · 2025\.09\.17/);
    expect(line).not.toHaveTextContent(/not a live one/);
    expect(line).not.toHaveTextContent(/not yet checked/);
  });

  it('a HISTORY ok reading is labelled as not live, and carries its age', () => {
    render(<StatusBoard state={ready(fx.staleHistoryStatus)} />);

    // The value is good; the verdict is old. BOTH must reach the screen — this
    // is the case the old ternary rendered as a bare "ok".
    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/ok/);
    expect(line).toHaveTextContent(/from the last recorded check, not a live one/);
    expect(line).toHaveTextContent(/as of 2026-09-17T04:12:00\.000Z/);
    expect(line).toHaveTextContent(/ago/);
  });

  it('an UNKNOWN reading says no verdict was taken — it does not say "not resolved"', () => {
    render(<StatusBoard state={ready(fx.uncheckedStatus)} />);

    // `ok:false` here means "we have not looked", not "it is broken". The old
    // rendering said "not resolved — " with an empty reason, which reads as a
    // failure and blames nothing.
    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/not yet checked/);
    expect(line).toHaveTextContent(/no verdict has been taken/);
    expect(line).not.toHaveTextContent(/not resolved/);
    expect(line).not.toHaveTextContent(/failed/);
  });

  it('a live FAILURE names the reason, and is distinguishable from unknown', () => {
    render(<StatusBoard state={ready(fx.failedProbeStatus)} />);

    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/failed/);
    expect(line).toHaveTextContent(/unable to extract player/);
    expect(line).not.toHaveTextContent(/not yet checked/);
  });
});
```

## `web/src/test/payload-shape.test.tsx` — sha256 `86c11b8d1ab8da4c61c62f1801d2c0397d5b53c3fb2314147ae9a5782a801aac`

```ts
/*
 * T-W11 — the console must survive a payload it did not expect.
 *
 * WHY THIS FILE EXISTS (S1-H17 / S1-H18, round 5 pass 3). The UI's entire
 * defence against a payload of the wrong shape is that no component happens to
 * throw on the payloads anyone has tried. `LocalEngineAdapter.request` ends with
 * `return body as T` — an **unchecked cast** — and there is **no error boundary**
 * above `App`. In React 18 an uncaught error during render unmounts the whole
 * root, so the operator gets a **blank page**: no status, no message, and no clue
 * which field was wrong.
 *
 * The trigger is not exotic. `console/web/dist/` is a BUILD ARTIFACT served by a
 * separately-versioned bridge, so a `dist/` older or newer than the bridge is
 * enough to change the payload's shape. One missing top-level key — `recentRuns`,
 * `census`, `backlog.lines` — is all it takes, because `StatusBoard` dereferences
 * every one of them on its first render.
 *
 * The last case in this file is the control: a healthy payload must still render
 * the board, so the guard cannot be satisfied by refusing everything.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { App } from '../App';
import { LocalEngineAdapter, MockAdapter } from '../adapters';
import type { StatusInstrument } from '../adapters';
import { ErrorBoundary } from '../components/ErrorBoundary';
import * as fx from '../adapters/fixtures';

/** A bridge that answers 200 with a payload the console did not expect. */
const wrongShape = (payload: unknown) => new MockAdapter({ status: payload as StatusInstrument });

/** JSON `Response`, so the live adapter is driven through its real request path. */
const jsonOk = (body: unknown) => async () => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

describe('T-W11 payload-shape robustness', () => {
  it('a wrong-shaped payload produces a NAMED failure, not a blank console', async () => {
    render(<App adapter={wrongShape({ unexpected: true })} pollMs={0} />);

    const fault = await screen.findByTestId('console-fault');

    expect(fault).toBeInTheDocument();
    // The shell is still mounted: the page did not go blank.
    expect(document.body.textContent).not.toBe('');
    expect(document.body.textContent).toMatch(/Creator Brains Console/);
    // ...and it says something actionable rather than showing nothing.
    expect(fault.textContent?.length ?? 0).toBeGreaterThan(10);
  });

  it('a payload missing ONE nested key is caught the same way', async () => {
    const almost: Record<string, unknown> = { ...fx.healthyStatus };
    delete almost.recentRuns;

    render(<App adapter={wrongShape(almost)} pollMs={0} />);

    expect(await screen.findByTestId('console-fault')).toBeInTheDocument();
  });

  it('a payload whose array field is not an array is caught too', async () => {
    // `status.backlog.lines.length` then `.join(...)` — a string has `.length`
    // but no `.join`, so this throws one dereference deeper than a missing key.
    const bent = { ...fx.healthyStatus, backlog: { lines: 'not an array' } };

    render(<App adapter={wrongShape(bent)} pollMs={0} />);

    expect(await screen.findByTestId('console-fault')).toBeInTheDocument();
  });

  it('the LIVE adapter refuses a wrong-shaped 200 with a typed error, not an unchecked cast', async () => {
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk({ unexpected: true }) as unknown as typeof fetch,
    });

    await expect(adapter.getStatus()).rejects.toMatchObject({ name: 'ConsoleApiError' });
  });

  it('the LIVE adapter names the OFFENDING PATH when a nested field is bent', async () => {
    // The same payload that blanks the board through a non-validating adapter
    // (the case above) must instead arrive as a refusal that says which field
    // was wrong. Asserted precisely, because "it threw something" would pass
    // against a guard that refuses every payload.
    const bent = { ...fx.healthyStatus, backlog: { lines: 'not an array' } };
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(bent) as unknown as typeof fetch,
    });

    const err = await adapter.getStatus().then(
      () => null,
      (e: unknown) => e as { name: string; code: string; status: number; message: string },
    );

    expect(err?.name).toBe('ConsoleApiError');
    expect(err?.code).toBe('UNKNOWN');
    expect(err?.status).toBe(200);
    expect(err?.message).toMatch(/body\.backlog\.lines: expected an array/);
  });

  it('the LIVE adapter refuses a payload missing exactly ONE top-level key', async () => {
    // The motivating scenario stated plainly: the bridge and this build disagree
    // about one field. Layer 1 must name it, not hand it to the boundary.
    const almost: Record<string, unknown> = { ...fx.healthyStatus };
    delete almost.recentRuns;
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(almost) as unknown as typeof fetch,
    });

    const err = await adapter.getStatus().then(
      () => null,
      (e: unknown) => e as { name: string; message: string },
    );

    expect(err?.name).toBe('ConsoleApiError');
    expect(err?.message).toMatch(/body\.recentRuns: expected an array/);
  });

  it('the boundary contains a throw from ANY child, not only the status board', () => {
    // Proves the mechanism itself, independently of StatusBoard — this is what
    // makes the `main.tsx` mount point safe even though no test renders it.
    const Bomb = (): ReactElement => {
      throw new Error('T-W11g deliberate render throw');
    };

    render(
      <ErrorBoundary scope="The probe">
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('console-fault')).toBeInTheDocument();
    expect(screen.getByTestId('console-fault-detail').textContent).toMatch(/T-W11g deliberate render throw/);
    expect(screen.getByTestId('console-fault').textContent).toMatch(/The probe/);
  });

  it('a HEALTHY payload still renders the board — the guard is not a blanket refusal', async () => {
    render(<App adapter={new MockAdapter()} pollMs={0} />);

    expect(await screen.findByTestId('status-board')).toBeInTheDocument();
    expect(screen.queryByTestId('console-fault')).not.toBeInTheDocument();
  });

  it('a HEALTHY payload survives the LIVE adapter path too', async () => {
    // The control for the validator: `healthyStatus` must pass the shape guard,
    // or the console would refuse the very bridge it was built against.
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(fx.healthyStatus) as unknown as typeof fetch,
    });

    await expect(adapter.getStatus()).resolves.toMatchObject({ publishedBrains: 12 });
  });

  it('an UNKNOWN published count passes the guard and is NOT defaulted (R3-02)', async () => {
    // The contained enumerator answers `null` when it refuses, and names the
    // damage beside it. The shape guard must accept that, and the client must pass
    // it through UNCHANGED — defaulting it to 0 here would recreate the exact
    // falsehood ("nothing is published") the route went to the trouble of avoiding.
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(fx.damagedBrainsStatus) as unknown as typeof fetch,
    });

    await expect(adapter.getStatus()).resolves.toMatchObject({
      publishedBrains: null,
      publishedBrainsDamaged: { file: 'current.json' },
    });
  });
});
```

# PART 4 — THE ROUND-3 REVIEW BEING ANSWERED

## `17-astra-mega-reply-r3.md` — sha256 `aca8100bf1eb56649d157bd40ddf6eabce6b085ab413c66a3d580391e7a10e17`

```js
# Astra Reply — subscription transport — 2026-09-20T10:26:15.272Z

**Provider:** openai-codex
**Billing:** chatgpt-subscription
**Authentication:** chatgpt_subscription
**Transport:** codex-cli
**Requested model:** gpt-6-astra
**Served model:** NOT OBSERVABLE on codex-cli (see SERVED_MODEL_UNVERIFIABLE_NOTE)
**Reasoning effort:** high
**Tokens:** in=3195886 out=23615 reasoning=5877
**Packet:** `docs/ai-workflow/blueprints/creator-brains-console-20260917/17-astra-mega-packet-r3.md`
**Wall:** 900.8s
**Mega Blueprint:** ARMED (operator flag)

> Marginal cost $0 — this leg rides the ChatGPT subscription, not OpenRouter.

---
Mega Blueprint. I’ll check the eight fixes against the packet and current source, then emit the forged package in the required format. This session is read-only, so filing the review to `Z:\HostileReviews` is blocked; I’ll keep that limitation explicit.

I’m using the `fable-blueprint-forge` and `non-vibe-coding` skills. The archive has the round-2 review, and the working tree is dirty. I’m checking whether the containment preflight covers exactly the same namespaces and files that the engine later reads.

The source has two gaps worth testing: the preflight skips generation checks for names the engine still traverses, and `/api/status` still calls the engine’s pointer traversal without containment. The instruction sweep also leaves old run/repair adapter signatures and a journal gate that applies to S4 but not S3’s repair path. I’ll use in-memory probes to check the mechanisms without writing fixtures or touching the real store.

The in-memory probe reproduced the bypass: `bad.name` passes preflight without its pointer being read, then the engine query reads an outside rules file and returns a hit. That verifies the control-flow defect; real Windows filesystem reproduction remains unrun.

Four direct probes with real workers passed: startup failure, exit, stale-epoch filtering, and watchdog timeout. The remaining lifecycle gap is shutdown wiring: the bridge does not call the worker cleanup path.

The draft verdict is **REVISE**, with five residual findings across containment, shutdown, exact-origin matching, and active instructions. The health provenance display and generation-name fixes are present. In the package, I’m keeping `/api/status` at HTTP 200 with a damaged published-brain reading, and applying the journal-preservation gate before either repair or daily-run execution.

## PART A — HOSTILE REVIEW

**REVISE — not dry. Five residual findings: two high, three medium.** The containment bypass was reproduced using actual function bodies with a synthetic filesystem. Four direct tests using real worker threads passed. Full fixture suites, browser checks and real Windows filesystem attacks were **NOT RUN**.

Evidence prefixes:

- `C/` = `packages/creator-brains-console/`
- `P/` = `docs/ai-workflow/blueprints/creator-brains-console-20260917/`
- `E/` = `scripts/creator-brains/`

[VERIFIED] Reviewed a dirty working tree on `creator-brains-engine-r2-20260915`, observed HEAD `0ce516a256228e70c1c99152ff96fb37b48321db`. The supplied packet file’s SHA-256 was `72991daac8faf81d89532a87173d70ce873ad233983eeb96ecaeb9cff356ad5b`. This binds the packet, not every uncommitted source file.

**A1 — Findings against the existing fixes**

**R3-01 · HIGH · R2-02 remains bypassable through an invalid namespace**

[VERIFIED] `C/lib/brain-read.mjs:279–286` enumerates every entry and calls `readPublishedBrain()`. But `:186` returns `null` immediately for a namespace outside `NAMESPACE`. The caller ignores that return value. Consequently, neither its generation nor its leaves are checked.

The engine traverses that same entry without this restriction: `E/lib/render.mjs:66–68` reads its pointer and joins its generation; `E/lib/query.mjs:54–62` opens its rules. `C/lib/brains.mjs:55–58` therefore delegates after an incomplete preflight.

**Reproduction:** a synthetic `brains/bad.name/current.json` named `../../../outside/gen-0001`. The preflight accepted it without reading its pointer; the subsequent query opened the outside rules and returned one hit. This used the current functions with filesystem dependencies substituted in memory. **Real filesystem exploitability remains [UNKNOWN].**

The supplied `C/test/bridge.readsurface.test.mjs` covers valid namespace shapes; it does not construct this enumeration mismatch.

**Fix:** an invalid *enumerated* namespace must abort preflight with `409 STORE_DAMAGED`, before engine traversal. It must never mean “skip this entry,” because the engine will not skip it. Add cases for `bad.name` and a 65-character namespace, each pointing to a readable outside generation.

**R3-02 · MEDIUM · R2-02 still misses the status route’s pointer traversal**

[VERIFIED] `C/routes.mjs:84` mounts `/api/status`; `C/lib/status.mjs:149` calls `listPublished(r)` directly. That function reads every `current.json` at `E/lib/render.mjs:67`, without the new containment checks.

An escaping namespace or pointer link therefore remains reachable through another console read route. The output is a count; **this finding does not claim that status serves outside markdown or transcript text**. The defect is the unchecked file read and a count derived from an untrusted pointer.

**Fix:** derive `publishedBrains` through a contained pointer enumerator. Preserve status’s HTTP-200 partial-damage contract: return an unavailable count with a named damage field, and render that refusal while retaining unrelated instruments. Add a status-route junction test and a healthy-count control.

**R3-03 · MEDIUM · R2-04 implements reset, but does not connect it to bridge shutdown**

[VERIFIED] `C/lib/health-probe.mjs:274–281` closes the channel through `retire()`. However, `C/server.mjs:210–220` releases the instance and closes the HTTP server without releasing the probe or health cache. Source searches found no shutdown caller of either cleanup function.

The supplied lifecycle tests invoke `resetProbeChannel()` directly. They cannot detect this missing production connection. [LIKELY] An embedded bridge that shuts down while its process remains alive can retain an idle worker or an in-flight probe.

**Fix:** acquire a probe-owner lease after successful bridge startup; release it during shutdown. The last owner releases the worker and caches. Do not unconditionally reset the global channel when another bridge still owns it. Test real `startBridge()` → probe → `shutdown()`, including two simultaneous owners.

**R3-04 · MEDIUM · R2-05 implements a socket-alias allowlist, not exact origin equality**

[VERIFIED] `C/lib/write-gate.mjs:128–130,166–169` accepts both `localhost` and `127.0.0.1` for either serving hostname. `C/server.mjs:131` supplies the fixed bind hostname rather than the validated request authority.

Direct execution produced:

| Claimed Origin | Expected origin | Accepted |
|---|---|---:|
| `http://127.0.0.1:49321` | `http://127.0.0.1:49321` | Yes |
| `http://localhost:49321` | same | **Yes** |
| `http://127.0.0.1:5173` | same | No |
| `http://127.0.0.1:49321/path` | same | **Yes** |
| `http://user@127.0.0.1:49321` | same | **Yes** |

The port defect is corrected. The stronger exact-origin contract is not. `C/test/bridge.writegate.test.mjs:123–145` explicitly expects alias interchangeability, so that test preserves the deviation.

**Fix:** derive the expected origin from the already-approved request Host and actual bound port. Require the supplied Origin to be a serialized HTTP origin equal to it. A page loaded through `localhost` remains valid when posting to that same authority. Reject credentials, paths, queries and fragments. Preserve Origin-less native clients and the existing header/media-type requirements.

**Browser exploitation is [UNKNOWN]**; the remaining custom-header and CORS barriers were not bypassed in this review.

**R3-05 · HIGH · R2-06 leaves executable instructions that recreate rejected behavior**

[VERIFIED] The sweep corrected several rows but left three material conflicts:

1. **Repair precedes its external-runner gate.** `P/08-slices-operations.md:10` admits repair in S3; `:11` places the two-process journal-preservation evidence in S4. `P/19-held-findings.md:24,106` still explicitly gates only S4. A shared console mutex does not satisfy that external-process gate.
2. **The adapter contract still promises the rejected results.** `C/web/src/adapters/types.ts:192,194` declares `{runId:string}` and `{requeued:number}`. `LocalEngineAdapter.ts:125,134` retains those signatures; `MockAdapter.ts:128–129` returns `{requeued:3}`. Updating the document alone has not synchronized the transfer interface.
3. **Active prose still teaches the superseded implementation.** `P/19-held-findings.md:67–70` instructs a second `loadHits` pointer resolution and per-hit generation checks. `P/README.md:5` still says resolving the add-blocker requires engine changes, contradicting its corrected lower section.

**Fix:** require journal preservation before **either** repair or daily-run activation; synchronize both adapters and the interface with the amended contracts; replace those active paragraphs. Extend contract checks to method return types—`T-B27`’s field-name comparisons do not cover these signatures.

**Disposition of the eight targeted fixes**

| Fix | Round-3 disposition |
|---|---|
| R2-01 | [VERIFIED] Health provenance types, validator and mounted display corrections are present. T-B27 is a field-presence check, not complete type equivalence. Deferred method drift is recorded in R3-05. |
| R2-02 | **REOPENED:** R3-01 and R3-02. |
| R2-03 | [VERIFIED] Drawer source uses one pointer resolution and one selected generation. Concurrent filesystem behavior remains unproven. |
| R2-04 | **PARTIAL:** real-worker startup-error, exit, stale-epoch and watchdog probes passed; shutdown wiring remains R3-03. |
| R2-05 | **PARTIAL:** wrong-port refusal works; exact-origin contract remains R3-04. |
| R2-06 | **PARTIAL:** R3-05. |
| R2-09 | [VERIFIED] The two-shape generation regex accepts `gen-10000` and excludes padded five-digit forms. Existing engine rollover defect remains engine-owned. |
| R2-10 | [VERIFIED] Document 10 is marked historical and its predictions are explicitly superseded. No allowance claim is adopted here. |

R2-07 and R2-08 are excluded from the defect count. [VERIFIED] The current write-gate file uses `T-B26`; the packet’s claim that it still uses `T-B22` is stale. This observation is not a separate closure review of R2-08.

**Evidence limits**

- The junction tests construct real directory links and assert their resolution. They do not establish readable **file-symlink** behavior.
- The leaf tests distinguish escape from unreadability on the drawer response. Their query assertions do not make that same reason-level distinction.
- The paired mutation results are packet claims, not re-executed evidence in this turn.
- The synthetic traversal probe required two harness corrections before execution: exit 1 at `#!/usr/bin/env node`, then exit 1 at an incorrectly retained export block. Neither was product RED evidence.
- An additional control/metadata command returned no result before termination; no verification claim relies on it.

**A2 — One hostile pass over the drafted replacement package**

| Draft defect | Correction incorporated below |
|---|---|
| A blanket status preflight would turn one damaged brain into failure of the entire instrument. | Isolate published-brain damage; retain HTTP 200 and other readings. |
| Resetting the global worker on every shutdown could interrupt another bridge. | Use idempotent owner leases; reset only after the final release. |
| Comparing only with the numeric bind address would reject a legitimate page loaded through `localhost`. | Compare against the validated request authority, without alias equivalence. |
| Ignoring an invalid namespace would repeat the engine/preflight mismatch. | Enumerated invalid names are hard refusals, never skips. |
| A plan could imply that emitted documents or proposed tests had been installed and passed. | Mark the package as emitted, tests as unmaterialized/unrun, and archive filing as blocked. |

**Archive status: BLOCKED.** The prior round-2 filing was read. This session permits no filesystem writes, so this review has **not** been filed to `Z:\HostileReviews` or indexed. Under Rule 86, it is not a completed archived review.

## PART B — FORGED PACKAGE

### 00-README.md

# Creator Brains Console — Round-3 S0H correction package

**Version:** R3 proposed amendment  
**Status:** emitted for implementation; not installed; not runtime-certified  
**Owner:** console builder; independent checkpoint reviewer  
**Scope:** R3-01 through R3-05 only.

This package amends the existing Creator Brains Console packet. It does not replace historical reviews or authorize S2–S7 implementation, engine edits, deployment, transfer or paid review calls.

**Builder contract**

Implement one correction slice at a time. Preserve the current dirty work before edits. Follow the contracts below; return consequential omissions for adjudication. Each checkpoint requires the scoped diff and observed acceptance evidence. A proposed test is not a passing test.

**Requirements**

| ID | Required outcome | Acceptance |
|---|---|---|
| H-R1 | Every namespace the query engine may traverse has passed containment. | Invalid enumerated namespaces refuse before any outside read; valid brains remain queryable. |
| H-R2 | Status never follows an unchecked publication pointer. | Escaping pointer/namespace produces HTTP 200 with a named unavailable count; other instruments remain readable. |
| H-R3 | Probe resources follow bridge ownership. | Last shutdown retires the channel; another live owner prevents premature retirement. |
| H-R4 | Browser writes use exact request-origin equality. | Same-authority writes pass; cross-alias, wrong-port and malformed Origin values refuse. |
| H-R5 | Current instructions and transfer interfaces agree. | Run/repair signatures match the amendment; both operations share the external-runner entry gate. |
| H-R6 | Verification remains evidence-bounded. | No historical count, structural check or synthetic probe is presented as runtime certification. |

**Preservation and authority**

The packet hash and observed HEAD are recorded in Part A. They are not a preservation snapshot of the dirty tree. Before implementation, the writable owner must capture scoped pre-edit hashes and snapshots, confirm current lane ownership, and record any changes since this review.

`lane.mjs digest` reported “not a git repository — no ledger” although direct Git commands resolved the repository. **Ownership coverage is UNKNOWN; implementation must resolve that discrepancy.** Continuity promotion count was zero.

**Build order:** containment and status → lifecycle ownership → origin matching → contract/instruction reconciliation → combined verification and archive filing.

### 01-architecture.md

# Architecture

**Existing mounted paths [VERIFIED]**

- Browser: `web/src/App.tsx:85–104` constructs the adapter, polls status and mounts `StatusBoard`.
- HTTP: `routes.mjs:84–109` dispatches the existing nine routes.
- Query: `lib/brains.mjs:53–58` validates, preflights, then calls engine scoring.
- Drawer: `lib/brain-read.mjs:183–249` selects one generation.
- Probe: `lib/health.mjs` composes the root-specific reading; `lib/health-probe.mjs` owns the shared worker.

**Decisions**

1. Preserve engine query scoring. Correct the preflight’s traversal coverage.
2. Factor contained pointer reading so status can count publications without reading their markdown or rules.
3. Query continues to refuse the whole request when its read surface is damaged.
4. Status records publication damage locally and remains HTTP 200.
5. Keep the worker shared, with explicit bridge-owner leases.
6. Keep the nine-route allowlist unchanged.

```mermaid
flowchart TD
    Request[Incoming request] --> Host{Host approved?}
    Host -->|No| HostDenied[403 FORBIDDEN_HOST]
    Host -->|Yes| Write{Write method?}
    Write -->|Yes| Gate{Header, media type and exact Origin pass?}
    Gate -->|No| WriteDenied[403 FORBIDDEN_WRITE]
    Gate -->|Yes| Dispatch[Existing route dispatch]
    Write -->|No| Dispatch
    Dispatch --> Status[Status composition]
    Dispatch --> Query[Query preflight]
    Dispatch --> Drawer[Contained drawer read]
    Status --> Pointers[Contained pointer enumeration]
    Pointers -->|Healthy| Count[Measured publication count]
    Pointers -->|Damaged| Partial[Null count and named damage]
    Count --> Status200[200 StatusInstrument]
    Partial --> Status200
    Query --> Enumerated{Every enumerated name valid?}
    Enumerated -->|No| Damage[409 STORE_DAMAGED]
    Enumerated -->|Yes| Containment{Pointers, generations and leaves contained?}
    Containment -->|No| Damage
    Containment -->|Yes| Engine[Existing engine query]
    Engine --> Query200[200 hits and skipped]
    Drawer -->|Missing| Missing[404 NOT_FOUND]
    Drawer -->|Damaged| Damage
    Drawer -->|Healthy or incomplete| Brain200[200 one pinned generation]
    Damage --> RepairOffline[Operator inspects store outside console]
    RepairOffline --> Retry[Explicit read retry]
    Retry --> Request
```

**API sequences**

The unchanged routes remain documented here to preserve the complete S0 boundary.

```mermaid
sequenceDiagram
    participant UI as StatusBoard
    participant A as LocalEngineAdapter
    participant B as Bridge
    participant P as Contained pointer reader
    UI->>A: getStatus()
    A->>B: GET /api/status
    B->>P: enumerate validated pointers
    P-->>B: count or named damage
    B-->>A: 200 StatusInstrument
    A-->>UI: validated reading or typed contract error
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant E as Engine registry and state
    A->>B: GET /api/creators
    B->>E: read roster and measured counts
    E-->>B: rows or damaged store
    B-->>A: 200 CreatorRow[] or 409 STORE_DAMAGED
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant E as Engine
    A->>B: POST /api/creators with ref
    B->>B: Host then exact-origin write gate
    alt Gate refuses
        B-->>A: 403 FORBIDDEN_WRITE
    else Gate passes
        B->>E: existing addCreator path
        E-->>B: saved creator or refusal
        B-->>A: 201 CreatorRow or typed error
    end
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant E as Engine
    A->>B: PATCH /api/creators/:channelId with enabled
    B->>B: Host then exact-origin write gate
    alt Gate refuses
        B-->>A: 403 FORBIDDEN_WRITE
    else Gate passes
        B->>E: setEnabled
        E-->>B: persisted row or pre-write refusal
        B-->>A: 200 CreatorRow or typed error
    end
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant C as Containment
    participant E as Engine query
    A->>B: GET /api/query?q&creator
    B->>C: validate complete traversal surface
    alt Surface damaged
        C-->>B: STORE_DAMAGED
        B-->>A: 409
    else Surface contained
        B->>E: queryBrains using unchanged scoring
        E-->>B: hits and skipped
        B-->>A: 200 QueryResult
    end
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant C as Contained reader
    A->>B: GET /api/brains/:slug
    B->>C: validate name and read one pointer
    C->>C: read markdown and claims from selected generation
    C-->>B: publication, absence or damage
    B-->>A: 200 BrainDoc, 404 NOT_FOUND or 409 STORE_DAMAGED
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant E as Engine journal
    A->>B: GET /api/run
    B->>E: read journal, lock, budget, throttle and recent runs
    E-->>B: authoritative readings
    B-->>A: 200 RunState
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant E as Engine state
    A->>B: GET /api/backlog
    B->>E: read state and format backlog
    E-->>B: formatted backlog or damaged state
    B-->>A: 200 backlog or 409 STORE_DAMAGED
```

```mermaid
sequenceDiagram
    participant A as Adapter
    participant B as Bridge
    participant H as Health cache
    participant W as Probe worker
    A->>B: GET /api/canary
    B->>H: collect result and read root-specific cache
    opt Probe due
        H->>W: request tagged probe
    end
    H-->>B: probe, history or unknown reading
    B-->>A: 200 CanaryReading without waiting
```

```mermaid
stateDiagram-v2
    [*] --> Unowned
    Unowned --> Idle: first bridge acquires lease
    Idle --> Probing: probe requested
    Probing --> ResultReady: current-epoch response
    Probing --> FailureReady: error, exit or deadline
    ResultReady --> Idle: reading collected
    FailureReady --> Idle: failure collected
    Idle --> Unowned: final lease released
    Probing --> Unowned: final lease released
    ResultReady --> Unowned: final lease released
    FailureReady --> Unowned: final lease released
    Unowned --> Unowned: duplicate release
```

**ERD:** N/A — this correction creates or changes no database tables or durable store schema. API projections and in-memory owner state are specified in `03-contracts.md`; inventing SQL columns would misdescribe this file-backed engine.

**Race boundary:** pre-existing links are in scope. Protection against hostile concurrent link replacement remains unproven. This amendment does not claim portable filesystem atomicity.

Mermaid source is supplied; rendering was not verified.

### 02-wireframes.md

# Scoped wireframes

The affected screen is the existing S1 status shell. S2 roster/drawer, S3 query/operations and later constellation screens are outside this correction package; no new screens are authorized.

**Exact tokens**

| Use | Token |
|---|---|
| Page | `var(--bg-base, #030712)` |
| Panel | `var(--carbon, #141419)` |
| Primary text | `var(--frost-white, #E0ECF4)` |
| Warning and unavailable reading | `var(--warn, #C6A84B)` |
| Focus | `var(--wing-purple, #8B5CF6)` |
| Accent | `var(--ice-wing, #60C0F0)` |
| UI font | `var(--font-ui, system-ui)` |
| Data font | `var(--font-data, monospace)` |

**Desktop — existing shell, updated publication reading**

```text
Creator Brains Console
loopback · single operator

+--------------------------------+------------------------------------------+
|                                | Status                              live |
| The constellation arrives in   |                                          |
| S5 (CD3 “Vault Observatory”).   | yt-dlp            {health text}          |
|                                | Creators          {enabled} of {total}   |
|                                | Video coverage    {fetched}/{total}      |
|                                | Budget            {engine reading}       |
|                                | Backlog           {engine lines}         |
|                                | Throttle          {engine text}          |
|                                | Census            {reading or refusal}   |
|                                | Run lock          {reading}              |
|                                | Last run          {reading}              |
|                                | Last good         {reading}              |
|                                | Documents         {count or refusal}     |
|                                | Published brains  {count or refusal}     |
|                                | Recent runs       {reading}              |
+--------------------------------+------------------------------------------+
```

**375px — same screen and state slots**

```text
+-------------------------------------+
| Creator Brains Console               |
| loopback · single operator           |
+-------------------------------------+
| The constellation arrives in S5      |
| (CD3 “Vault Observatory”).           |
+-------------------------------------+
| Status                         live |
|                                     |
| yt-dlp                              |
| {health text, wrapping}              |
|                                     |
| Creators                            |
| {enabled} enabled of {total}         |
|                                     |
| Video coverage                      |
| {fetched} of {total} ({percentage})   |
|                                     |
| Budget / Backlog / Throttle          |
| {each label and value on own rows}   |
|                                     |
| Census / Run lock / Last run         |
| {each label and value on own rows}   |
|                                     |
| Last good / Documents                |
| {each label and value on own rows}   |
|                                     |
| Published brains                    |
| {count or named refusal, wrapping}   |
|                                     |
| Recent runs                         |
| {reading, wrapping}                  |
+-------------------------------------+
```

These frames use the same state replacements at both widths:

| State | Exact copy / rendered replacement |
|---|---|
| Initial loading | `Status` followed by `Reading the store…`; `aria-busy="true"`. |
| Healthy empty store | Published brains: `0`; last run, last good and recent runs: `none recorded`; backlog: `no backlog reported`. |
| Probe pending | `not yet checked — no verdict has been taken` |
| Successful live probe | `ok · {version}`; use `version unknown` when null. |
| Successful history | `ok as of {checkedAt} ({age} ago) — from the last recorded check, not a live one` |
| Failed history | `last check failed as of {checkedAt} ({age} ago) — {reason}` |
| Failed probe | `failed — {reason}` |
| Damaged publication pointer | Published brains: `refused — {file} unreadable`; immediately below: `{detail}`. Count withheld. |
| Recovering poll | Retain previous reading; header: `last poll failed ({code}) — showing previous reading`. Next successful poll replaces it. |
| Initial transport/contract failure | `No instrument can be shown — the bridge did not answer, or answered with a payload this console cannot read. {code}: {message}` |
| Render failure | `The console hit an error it could not render.` Keep the shell header visible. |
| Render-failure recovery | `reload the page to try again · the component stack is in the browser console` |
| Denied read | Use the initial-failure or previous-reading frame with the typed denial code; never substitute zero. |

No forms or mutation controls are added here. Client-side validation, save, cancel and mutation-retry states are therefore N/A for this screen. Gate refusals remain API behavior until their existing owning UI slices land.

At 375px, values wrap beneath labels; no horizontal page scrolling or clipped identifiers. Refusal updates use a named alert without moving focus. Polling must not steal focus. Existing controls retain 44px targets. No motion is added.

### 03-contracts.md

# Contracts

**Contained publication access**

```ts
type Damage = { file: string; detail: string };

type PointerSnapshot = {
  namespace: string;
  generation: string | null;
  title: string;
  pointerPath: string;
  generationDir: string | null;
};

function readContainedPointer(
  r: string,
  name: string,
  options?: { enumerated?: boolean }
): PointerSnapshot | null;

function listContainedPublishedPointers(
  r: string
): PointerSnapshot[];

function assertReadSurfaceContained(r: string): void;
```

Rules:

- Direct invalid drawer names retain the existing not-found behavior.
- Invalid names encountered during enumeration throw `STORE_DAMAGED`; they are never ignored.
- Use the existing namespace allowlist and canonical generation pattern.
- Contain the namespace and pointer before reading the pointer.
- Only `ENOENT` represents absence. Permission, I/O and malformed-JSON failures represent damage.
- Validate any named generation and its resolved directory.
- Query preflight additionally checks every served leaf.
- Status enumeration reads pointer metadata only; it never calls engine `listPublished()`.
- The drawer reads its pointer once and uses the resulting generation for all four files.
- These helpers introduce no store writes.

**Status amendment**

```ts
interface PublicationStatus {
  publishedBrains: number | null;
  publishedBrainsDamaged: Damage | null;
}
```

Both fields become required in `StatusInstrument`, fixtures and its runtime validator.

| Situation | `publishedBrains` | `publishedBrainsDamaged` |
|---|---:|---|
| Healthy empty store | `0` | `null` |
| Healthy publications | measured integer | `null` |
| Pointer enumeration/read/containment failure | `null` | `{file, detail}` |

`GET /api/status` remains HTTP 200. Other instruments retain their existing behavior. Deploy the serializer, adapter validator and mounted rendering together; an older incompatible bundle must surface its contract error rather than silently render a false count.

**Write gate**

```ts
originAllowed(origin: unknown, expectedOrigin: string): boolean;

writeGateFailure(
  req: IncomingMessage,
  expectedOrigin: string
): null | { code: 'FORBIDDEN_WRITE'; message: string };
```

- Host validation runs first.
- Build `expectedOrigin` from that validated request authority and the bound port.
- Accept a present Origin only when it is exactly the serialized HTTP origin expected for this request.
- No alias expansion, user information, path, query or fragment.
- Origin-less requests retain native-client support.
- `x-console-write` remains required on writes.
- Declared bodies require `application/json`.
- A refusal is HTTP 403 before body dispatch or mutation.
- No CORS permission is added.

**Probe ownership**

```ts
function acquireHealthOwner(): () => void;
```

The returned release function is idempotent. Successful bridge startup acquires one lease. Bridge shutdown releases it. Releasing the final lease invokes health-cache/channel cleanup; releasing an earlier lease does not interrupt another owner.

A failed bind acquires no lease. Explicit test reset remains available. Production worker messages continue to carry the channel epoch; stale messages are discarded.

**Deferred transfer-interface correction**

```ts
type DailyAcceptance = {
  requestId: string;
  runId: string | null;
};

type RepairCounts = {
  repaired: number;
  built: number;
  emptied: number;
};

interface DeferredOperations {
  startDailyRun(perHour: number): Promise<DailyAcceptance>;
  repair(): Promise<RepairCounts>;
}
```

These are interface corrections only. No route is added in S0H. At future HTTP acceptance, `runId` must be `null`. Repair counts alone do not establish a successful journal verdict.

Both future operations are blocked until the external two-process journal-preservation gate passes. A console mutex is an additional guard, not a substitute.

**Route preservation**

| Route | S0H behavior |
|---|---|
| `GET /api/status` | Updated partial-damage publication reading |
| `GET /api/creators` | Unchanged |
| `POST /api/creators` | Existing route; stricter exact-origin gate |
| `PATCH /api/creators/:channelId` | Existing route; stricter exact-origin gate |
| `GET /api/query` | Complete preflight before engine query |
| `GET /api/brains/:slug` | Shared pointer primitive; pinned generation retained |
| `GET /api/run` | Unchanged |
| `GET /api/backlog` | Unchanged |
| `GET /api/canary` | Same reading contract; lifecycle ownership corrected |

Backup remains blocked with no endpoint. Restore, rollback and authorize remain absent.

**Migration/environment:** no database migration, new environment variable, provider call or new dependency.

**Rollback:** preserve prior console code and matching web build together. If a containment correction must be reverted, disable the affected read surface rather than reopening the known escape. Engine CLI availability is independent; this package does not certify it.

### 04-build-order.md

# File-by-file order

Paths below are relative to `C/` unless prefixed `P/`. Every source/test file remains at or below 300 lines.

| Order | File | Change / boundary | Budget |
|---:|---|---|---:|
| 1 | `test/bridge.r3.readsurface.test.mjs` | Materialize the regressions in `09-tests.md`; real temp stores only. | ≤200 |
| 2 | `lib/brain-pointer.mjs` | New contained pointer primitive and enumerator; imports containment helpers, builtin filesystem/path APIs and engine path definitions. Exports the two pointer functions. | ≤220 |
| 3 | `lib/brain-read.mjs` | Consume pointer snapshots; explicitly reject invalid enumerated names. Preserve single-generation reads and leaf checks. | ≤300 |
| 4 | `lib/status.mjs` | Replace engine pointer enumeration with contained count composition; catch publication damage locally. | ≤250 |
| 5 | `web/src/adapters/types.ts`, `fixtures.ts`, `validate.ts` | Add nullable count plus required damage field; update healthy and damaged fixtures. | ≤300 each |
| 6 | `web/src/components/StatusBoard.tsx` | Render count or named refusal, preserving other readings. Extract a focused subcomponent if needed. | ≤300 |
| 7 | `test/health.r3.shutdown.test.mjs` | Add real bridge lifecycle tests, including two owners. | ≤200 |
| 8 | `lib/health-owners.mjs` | Own lease set and idempotent release; import `resetHealthCache`; export `acquireHealthOwner`. | ≤100 |
| 9 | `server.mjs` | Acquire after successful bind; release in shutdown; derive origin from validated authority. | ≤300 |
| 10 | `test/origin.r3.test.mjs`, `lib/write-gate.mjs` | Pin exact-origin behavior; remove socket-alias equivalence. | ≤300 each |
| 11 | `web/src/adapters/LocalEngineAdapter.ts`, `MockAdapter.ts`, `types.ts` | Synchronize deferred return types; keep live routes deferred. | ≤300 each |
| 12 | `web/src/test/r3-deferred-contract.test.ts` | Type-level parity assertions. | ≤80 |
| 13 | `P/05-contracts.md`, `06-test-plan.md`, `07-traceability.md`, `08-slices-operations.md`, `19-held-findings.md`, `README.md` | Replace active contradictions; preserve historical receipts. | Scoped edits |
| 14 | Current readiness evidence | Refresh hashes and status only after observing checks. | Existing schema |

**Patterns to preserve**

Existing route dispatch:

```js
if (req.method === 'GET' && p === '/api/status') {
  return sendJson(res, 200, statusInstrument(r));
}
```

Keep the literal route structure so the allowlist extractor remains effective.

Existing damage separation:

```js
if (err && err.code === 'ENOENT') return null;
throw damaged(`${what} exists but could not be read (${code})`, file);
```

Apply that distinction to pointer reading, rather than using the engine’s fallback-on-any-error JSON reader.

Existing UI integration:

```tsx
<ErrorBoundary scope="The status board">
  <StatusBoard state={status} />
</ErrorBoundary>
```

Retain this mount and its surviving shell header.

### 05-slices.md

# Correction slices and traceability

| Slice | Scope | Requirements | Exit evidence |
|---|---|---|---|
| S0H-R3A | Namespace coverage, contained pointer enumeration, partial status damage | H-R1, H-R2 | New read-surface regressions; existing drawer/query suites; status validator/component tests; no outside read on hostile fixtures |
| S0H-R3B | Worker ownership and shutdown | H-R3 | Existing lifecycle/cache suites plus actual bridge shutdown and two-owner cases |
| S0H-R3C | Exact request-origin equality | H-R4 | Origin matrix; live write-gate tests; unchanged positive native/browser-shaped controls |
| S0H-R3D | Adapter and active-instruction reconciliation | H-R5 | Deferred type assertions, typecheck, amended S3/S4 gate text, no new routes |
| S0H-R3E | Combined verification and archival | H-R6 | Per-file suite results, browser evidence for changed status states, archived review and reciprocal supersession |

**Stop condition:** do not advance to the next correction slice while its checkpoint has unresolved findings. Do not promote S2 or later work on the strength of this package.

Each slice records:

- exact changed files and pre/post hashes;
- RED result naming the intended assertion, followed by GREEN;
- control cases that remain successful;
- fixture root and platform;
- unverified boundaries and mutation evidence.

For S0H-R3A, live JSON checks must distinguish:

```text
Healthy empty:
HTTP 200
publishedBrains = 0
publishedBrainsDamaged = null

Escaping publication pointer:
HTTP 200
publishedBrains = null
publishedBrainsDamaged.file = "current.json"

Query over malformed enumerated namespace:
HTTP 409
error.code = "STORE_DAMAGED"
```

No suite count is fixed as an acceptance target. Counts are recorded after execution and checked per file.

### 06-bans.md

# Bans

- Do not edit engine source in this console correction.
- Do not skip invalid namespaces while delegating to an engine that still traverses them.
- Do not treat lexical containment as proof against filesystem links.
- Do not read pointer content before containing its path.
- Do not turn publication damage into a measured zero.
- Do not turn one publication fault into failure of unrelated status readings.
- Do not reread the drawer pointer for claims.
- Do not introduce a second query-scoring implementation.
- Do not equate `localhost` and `127.0.0.1` as browser origins.
- Do not terminate a shared probe while another bridge owns it.
- Do not equate unref’ing a worker with terminating it.
- Do not add repair, daily-run, backup or dangerous-operation routes in S0H.
- Do not activate repair before the external-runner journal gate.
- Do not automatically retry an uncertain mutation.
- Do not claim atomic filesystem protection from a source pin or synthetic test.
- Do not preserve superseded instructions in active sections without explicit historical labeling.
- Do not treat a structural readiness result as runtime evidence.
- Do not modify another agent’s locked files, broad-stage changes, push or deploy.
- Do not introduce MUI, new chart libraries, hardcoded replacement colors or additional animation.
- Do not exceed the 300-line source/test cap by growing an already-full file.

### 07-checkpoints.md

# Checkpoints and evidence receipt

**Current status**

| Check | Result |
|---|---|
| Prior archived round-2 review read | [VERIFIED] |
| Frozen packet hash captured | [VERIFIED] |
| Dirty-tree identity captured | [VERIFIED], not an immutable source snapshot |
| Lane ownership | **UNKNOWN** — digest failed to resolve repository |
| Invalid-namespace bypass | [VERIFIED] with actual function bodies and synthetic filesystem |
| Direct origin matrix | [VERIFIED] against imported implementation |
| Worker startup failure, exit, stale epoch, watchdog | PASS — four direct probes using real workers |
| Full bridge/web suites | NOT RUN — fixture-writing suites not executed in this read-only session |
| New acceptance tests below | NOT MATERIALIZED / NOT RUN |
| Windows junction/file-symlink release evidence | NOT RUN |
| Browser, launcher and end-to-end evidence | NOT RUN |
| Structural readiness recheck | NOT RUN |
| New review archived and indexed | BLOCKED — filesystem is read-only |

**Checkpoint remit**

> Review only this correction slice against its frozen diff. For each failure, name the requirement, file:line, reproducible trigger, observable incorrect result and concrete correction. Confirm that positive controls still pass. Distinguish source inspection, synthetic execution, real filesystem execution and browser execution. Return PASS, REVISE or HALT; do not infer completion from aggregate counts.

**Mutation obligations**

- Remove the invalid-enumerated-name refusal: the malformed-namespace tests must fail.
- Remove the status pointer guard: the status junction test must fail.
- Remove final-owner cleanup: the shutdown test must fail.
- Remove worker termination itself: the heartbeat termination test must fail.
- Accept hostname aliases again: the cross-alias origin test must fail.
- Restore either deferred adapter shape: typecheck must fail.

Record the exact mutation, failing test names, controls and restored-source hashes. Do not infer orthogonality merely because test names differ.

**Archive completion**

The writable owner must create a new dated Rule-86 record, referencing the round-2 review as superseded, fill the findings and unproven fields, and reindex. Preserve both sides of the supersession link. Do not edit the old findings into correctness.

**Hygiene:** this review wrote no source, fixture, screenshot or archive files. The emitted package and test sources still require materialization in the existing packet and console directories.

### 09-tests.md

# Executable acceptance tests

All new tests below are **proposed source, not installed or run**. Materialize them at the stated paths before execution. Existing fixture helpers provide isolated stores; never point these tests at the operator’s real store.

**`C/test/bridge.r3.readsurface.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, symlinkSync, realpathSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import {
  BRAIN_NS, getJson, seedPublishedBrain, withFixture,
} from './fixtures.mjs';

for (const ns of ['bad.name', 'a'.repeat(65)]) {
  test(`R3-R01/${ns.length}: invalid enumerated namespace refuses query`, async () => {
    await withFixture(`r3-invalid-${ns.length}`, async ({ r, base }) => {
      const outside = tempRoot(`r3-outside-${ns.length}`);
      const external = seedPublishedBrain(outside, BRAIN_NS);
      seedPublishedBrain(r, ns);

      const escapedGeneration = relative(
        join(r, 'brains', ns),
        external.genDir,
      );
      assert.ok(
        escapedGeneration.startsWith('..') || isAbsolute(escapedGeneration),
        'fixture must point outside the store',
      );

      writeFileSync(
        join(r, 'brains', ns, 'current.json'),
        JSON.stringify({
          schema_version: 1,
          creator_id: ns,
          title: 'Synthetic outside pointer',
          generation: escapedGeneration,
        }),
      );

      const response = await getJson(base, '/api/query?q=fixture');
      assert.equal(response.status, 409);
      assert.equal(response.body.error.code, 'STORE_DAMAGED');
      assert.equal(response.body.hits, undefined);
    });
  });
}

test('R3-R02: status reports an escaping namespace without losing other readings', async () => {
  await withFixture('r3-status-link', async ({ r, base }) => {
    const outside = tempRoot('r3-status-outside');
    const external = seedPublishedBrain(outside, BRAIN_NS);
    const target = join(outside, 'brains', external.ns);
    const link = join(r, 'brains', 'linked-brain');

    symlinkSync(target, link, 'junction');
    assert.equal(realpathSync(link), realpathSync(target));

    const response = await getJson(base, '/api/status');
    assert.equal(response.status, 200);
    assert.equal(response.body.publishedBrains, null);
    assert.equal(response.body.publishedBrainsDamaged.file, 'current.json');
    assert.ok(response.body.budget);
    assert.ok(response.body.creators);
    assert.ok(response.body.ytdlp);
  });
});

test('R3-R03: healthy publication remains visible in status and query', async () => {
  await withFixture('r3-healthy', async ({ r, base }) => {
    seedPublishedBrain(r, BRAIN_NS);
    const status = await getJson(base, '/api/status');
    assert.equal(status.status, 200);
    assert.equal(status.body.publishedBrains, 1);
    assert.equal(status.body.publishedBrainsDamaged, null);

    const query = await getJson(base, '/api/query?q=fixture');
    assert.equal(query.status, 200);
    assert.equal(query.body.hits.length, 1);
  });
});
```

These assert observable route behavior. Before closing H-R1/H-R2, augment them with a read spy or equivalent isolated child-process instrumentation proving that refused requests never open the outside target. Status-only assertions do not establish that stronger property.

**`C/test/origin.r3.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { originAllowed, writeGateFailure } from '../lib/write-gate.mjs';

test('R3-O01: equality follows the request authority, without alias expansion', () => {
  const numeric = 'http://127.0.0.1:49321';
  const named = 'http://localhost:49321';

  assert.equal(originAllowed(numeric, numeric), true);
  assert.equal(originAllowed(named, named), true);
  assert.equal(originAllowed(named, numeric), false);
  assert.equal(originAllowed(numeric, named), false);
  assert.equal(originAllowed('http://127.0.0.1:49322', numeric), false);
});

test('R3-O02: a URL with non-origin components is refused', () => {
  const expected = 'http://127.0.0.1:49321';
  for (const origin of [
    `${expected}/path`,
    `${expected}?x=1`,
    `${expected}#fragment`,
    'http://user@127.0.0.1:49321',
    'null',
  ]) {
    assert.equal(originAllowed(origin, expected), false, origin);
  }
});

test('R3-O03: an Origin-less native JSON write remains permitted', () => {
  assert.equal(writeGateFailure({
    method: 'POST',
    headers: {
      'x-console-write': '1',
      'content-type': 'application/json',
      'content-length': '2',
    },
  }, 'http://127.0.0.1:49321'), null);
});
```

Also update the existing live write-gate tests: same Host/Origin pairs pass for each supported authority; cross-alias pairs refuse before registry mutation.

**`C/test/health.r3.shutdown.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { startBridge } from '../server.mjs';
import {
  requestProbe, takeProbe, setProbeWorkerForTest,
} from '../lib/health-probe.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const worker = new URL('data:text/javascript,' + encodeURIComponent(`
  import { workerData } from 'node:worker_threads';
  workerData.port.on('message', message => {
    setTimeout(() => workerData.port.postMessage({
      epoch: message.epoch,
      atMs: Date.now(),
      value: { ok: true, version: 'SYNTHETIC', reason: '' },
    }), 150);
  });
`));

async function reading() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const value = takeProbe();
    if (value) return value;
    await sleep(20);
  }
  assert.fail('synthetic worker did not answer within 5 seconds');
}

test('R3-L01: final bridge shutdown discards its outstanding probe', async () => {
  const bridge = await startBridge({
    r: tempRoot('r3-shutdown'),
    port: 0, open: false, log: () => {},
  });
  setProbeWorkerForTest(worker);
  try {
    assert.equal(requestProbe(), true);
    assert.equal((await reading()).value.version, 'SYNTHETIC');

    assert.equal(requestProbe(), true);
    bridge.shutdown();
    await sleep(500);
    assert.equal(takeProbe(), null);
  } finally {
    bridge.shutdown();
    setProbeWorkerForTest(null);
  }
});

test('R3-L02: one bridge shutdown does not cancel another owner', async () => {
  const first = await startBridge({
    r: tempRoot('r3-owner-a'),
    port: 0, open: false, log: () => {},
  });
  const second = await startBridge({
    r: tempRoot('r3-owner-b'),
    port: 0, open: false, log: () => {},
  });
  setProbeWorkerForTest(worker);
  try {
    assert.equal(requestProbe(), true);
    first.shutdown();
    assert.equal((await reading()).value.version, 'SYNTHETIC');
  } finally {
    first.shutdown();
    second.shutdown();
    setProbeWorkerForTest(null);
  }
});
```

Retain `health.lifecycle.test.mjs`’s heartbeat termination test. The shutdown test establishes production wiring; heartbeat cessation establishes actual termination. Neither substitutes for the other.

**`C/web/src/test/r3-deferred-contract.test.ts`**

```ts
import { expectTypeOf, test } from 'vitest';
import type { ConsoleDataAdapter } from '../adapters/types';

test('R3-C01: daily acceptance carries correlation and nullable engine identity', () => {
  expectTypeOf<
    Awaited<ReturnType<ConsoleDataAdapter['startDailyRun']>>
  >().toEqualTypeOf<{
    requestId: string;
    runId: string | null;
  }>();
});

test('R3-C02: repair declares projected counts', () => {
  expectTypeOf<
    Awaited<ReturnType<ConsoleDataAdapter['repair']>>
  >().toEqualTypeOf<{
    repaired: number;
    built: number;
    emptied: number;
  }>();
});
```

**Typecheck is mandatory:** Vitest execution alone is not evidence that these type assertions passed.

**Exact commands — from repository root**

```powershell
node --test packages/creator-brains-console/test/bridge.r3.readsurface.test.mjs
node --test packages/creator-brains-console/test/health.r3.shutdown.test.mjs
node --test packages/creator-brains-console/test/origin.r3.test.mjs
node --test packages/creator-brains-console/test/bridge.readsurface.test.mjs packages/creator-brains-console/test/bridge.brainread.test.mjs packages/creator-brains-console/test/bridge.contractsync.test.mjs
node --test packages/creator-brains-console/test/health.lifecycle.test.mjs packages/creator-brains-console/test/health.cachekey.test.mjs
node --test packages/creator-brains-console/test/*.test.mjs
npm --prefix packages/creator-brains-console/web run test
npm --prefix packages/creator-brains-console/web run typecheck
npm --prefix packages/creator-brains-console/web run build
```

For the changed status presentation, extend `StatusBoard.test.tsx` and `payload-shape.test.tsx` with named cases:

- `R3-W01: publication damage withholds only the publication count`
- `R3-W02: healthy zero remains a measured zero`
- `R3-W03: missing publication damage field is a typed contract failure`
- `R3-W04: recovery replaces the publication refusal with the measured count`

Browser acceptance uses the real fixture-backed bridge and matching built UI at desktop and 375px. Record wrapping, preserved instruments, named refusal and recovery. These checks remain **NOT RUN**, and no screenshot evidence is supplied.

**Boundary matrix**

| Evidence | What it proves | What it does not prove |
|---|---|---|
| Synthetic filesystem probe | Current traversal control flow can bypass preflight | Windows link behavior |
| Real junction fixtures | Directory-link containment | Readable file-symlink behavior |
| Direct real-worker probes | Worker event/deadline mechanisms | Bridge shutdown ownership |
| Bridge shutdown tests | Lifecycle wiring | Termination without the heartbeat test |
| Origin unit matrix | Predicate contract | Browser CORS behavior |
| Type assertions + typecheck | Declared adapter return shapes | Future engine operation correctness |
| Component tests | Display-state behavior | Real browser layout |
| Fixture-backed browser checks | Mounted route and display integration | Real operator-store correctness |

## PART C — DECISION-DENSITY SELF-TEST

| Remaining choice | Disposition |
|---|---|
| Invalid namespace discovered during enumeration | **Decided:** refuse the entire traversal before engine invocation. |
| Invalid caller-supplied drawer name | **Decided:** retain not-found behavior. |
| Status publication damage | **Decided:** HTTP 200; nullable count plus required named damage field. |
| Counting publications | **Decided:** contained pointer metadata only; no engine `listPublished()` call. |
| Query scoring | **Decided:** retain engine scoring behind complete preflight. |
| Hostile concurrent filesystem replacement | **Bounded limitation:** not certified; requires separate platform-specific work. |
| File symlinks unavailable in the test environment | **Bounded:** mark that release evidence blocked; do not substitute junction success. |
| Shared worker shutdown | **Decided:** idempotent owner leases; final release cleans up. |
| Worker termination proof | **Decided:** keep heartbeat cessation separate from shutdown wiring. |
| `localhost` support | **Decided:** valid when it is the request’s approved authority; no cross-alias equality. |
| Malformed Origin values | **Decided:** refuse non-serialized origins. |
| Native clients without Origin | **Decided:** preserve existing support with header/media-type gates. |
| Deferred run/repair response shapes | **Decided:** synchronize the interface and both adapters now; add no routes. |
| External-runner journal gate | **Decided:** prerequisite for both repair and daily-run activation. |
| Add-worker implementation and backup exception | **Outside this correction:** retain existing S2 and owner gates. |
| UI scope | **Decided:** existing status shell only; no future-screen implementation. |
| Small helper names and internal decomposition | **Delegated with bounds:** listed exports/contracts preserved, no engine edits, ≤300 lines per file. |
| Timing in lifecycle tests | **Bounded:** readiness polling capped at five seconds; watchdog uses an injected clock; no arbitrary production timeout changes. |
| Test IDs/counts | **Decided:** use the new R3 prefixes; record observed per-file counts. |
| Shared-tree ownership | **Unresolved prerequisite:** repair or explain the lane-digest failure before editing. |
| Canonical document installation and preservation | **Blocked here:** writable owner must snapshot, apply and hash the amendment. |
| Review filing | **Blocked here:** writable owner must file and index this review before archive-completion claims. |

**Next authorized outcome:** materialize and verify the S0H corrections under the existing ownership workflow. This response supplies the review and proposed package; it does not establish implementation readiness, a dry round, or a filed review.
```
