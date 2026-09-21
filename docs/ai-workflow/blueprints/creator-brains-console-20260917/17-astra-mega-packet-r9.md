# ASTRA HOSTILE REVIEW — CREATOR BRAINS CONSOLE — ROUND 9

You are reviewing **one round's fix pass**, not a feature. Round 9 has a narrow subject and I want
you to attack it in the two directions that matter: **is the fix pass sound**, and **did the sweep
actually sweep**. Be hostile. A finding that says "this looks fine" is not a finding.

## 0. What round 9 was

Two commits sit at the head of this work:

**Commit A** (`58bfb0625` → `90dce1c9c`) — *the sweep*. Round 8 found R8-07: R7-01 had removed a
string-prefix containment test from `lib/containment.mjs` and **the same test survived one file
over** in `store-attacks.mjs:102`. Round 9 then enumerated every string-prefix predicate in the
console package rather than waiting for a review to find the next copy, and found **exactly one**
remaining member: `test/bridge.hy4.test.mjs:120`, `resolved.startsWith(dist)`. The fix extracted
the predicate into `test/path-containment.mjs` so the class has one named form instead of a copy per
validator.

**Commit B** (`51523776e` → `c1f91616d`) — *three recommended fixes*, each measured both ways:
1. `redact-egress.mjs` — the `sk-` row had **no left boundary**, so it fired inside ordinary
   English: `ta[sk-]runner-identifier`, `ri[sk-]management-framework`. The `{12,}` bound does not
   help, because it counts the TAIL. Fixed with `(?<![\w-])`. This is the eighth over-refusal the
   loop has found.
2. `bridge.containment.test.mjs` — `outsideBrain()` wrote to a **constant name** in the system temp
   root that nothing reaped. Nine orphaned `outside-*` directories were found on disk from one run.
3. `ASTRA-REVIEW-ROUTING.md` — a false claim ("`.claude/skills/` is untracked"; 70 files there are
   tracked) corrected.

## 1. YOUR REMIT — attack these, in this order

**(a) IS THE SWEEP COMPLETE?** This is the highest-value question in the packet. I enumerated
`.startsWith(`, `.endsWith(`, `indexOf(...) === 0`, `slice(0, n) ===`, `.includes(` and
`lastIndexOf` across `packages/creator-brains-console/`. I concluded the class has exactly ONE
member and left two neighbours alone (`lib/containment.mjs` is component-wise; `lib/http.mjs:279`
uses `base + sep`). **Break that conclusion.** Options: an idiom I did not enumerate; a containment
question asked through a DIFFERENT primitive (regex, `path.relative`, prefix concatenation,
`Set`/map membership, URL parsing); a *production* copy of the same test that my grep missed because
it is spelled differently; or a case where `base + sep` is genuinely wrong despite `resolve()`
stripping separators.

**(b) IS THE FIX AT THE SITE REAL, OR A PIN DRESSED UP?** I labelled `bridge.hy4.test.mjs:120` a PIN
and claimed it **cannot** be mutation-proved, because `resolveStatic` refuses a sibling of `dist`
through its own separator-aware check, so that branch only ever runs for a path already inside
`dist`. I then MEASURED that claim with two negative-control mutants (revert to prefix; invert
polarity) which must leave the suite green, and both did. **Is the reasoning airtight, or can you
construct an input where that assertion is the only thing standing between a leak and a 200?**

**(c) DOES THE SHARED PREDICATE ACTUALLY AGREE WITH THE PRODUCTION GUARD?** `path-containment.mjs`
deliberately restates the rule independently rather than importing `inside()`, so that a bug in the
guard is visible to the validator. I claim the two are exact negations everywhere **except**
`target === root`, where both answer `false` for different reasons. **Find an input where they
DISAGREE.** That would be a genuine defect in one of them, and it is the kind of thing a comment can
assert for a year without anyone checking.

**(d) THE `sk-` BOUNDARY — BOTH DIRECTIONS.** Show me a real secret shape my lookbehind now MISSES,
or an ordinary English string it still refuses. I mutated 2 ways (remove boundary: 4 red; tighten to
whitespace-only: 8 red). The hyphen was included in the lookbehind deliberately; argue it should not
be, or that it is insufficient. **Also check the other 18 rows in that table**, which I did not
audit — I only touched `sk-`, and several use the same unbounded-prefix shape.

**(e) THE FIXTURE-HYGIENE FIX.** My FIRST draft of it was itself a bug: it cleaned up with
`join(dir, '..', '..')`, which walks up from `gen-0001` twice, leaving the `outside-*` directory
and landing on the TEMP ROOT ITSELF — and measured on a private root, the run **deleted the root**.
I caught it and fixed it by capturing the created path. **Check the current form for the same class
of error**, and check whether the `process.on('exit')` per call leaks a listener when the file runs
many times in one process.

**(f) THE 300-LINE CAP.** `scripts/lib/redact-egress.mjs` is at **296** — four lines of headroom,
and round 9 grew it. Flag it if my change is what consumed the headroom, and say whether the seam is
the right one to split on or whether the cap is now distorting the file.

**(g) WHAT DID ROUND 9 *NOT* FIX THAT IT CLAIMS TO HAVE ADDRESSED?** R2-07 and R2-08 remain open by
decision. The sweep is claimed to be complete for one class only. If any of the three fixes above is
a restatement of an older finding rather than a new fix, say so.

## 2. SCOPE BOUND — this packet is deliberately small

Per `ASTRA-REVIEW-ROUTING.md` §7, this dispatch is `--bounded`: the Mega Blueprint hunting mandate
is **off**, which is why you have ~18 documents and not ~120. **A document you cannot see is not a
gap in the packet** — do not report missing context, and do not go looking for it. Everything the
remit needs is inlined. If you believe a specific missing artefact is load-bearing for a finding,
name THAT artefact and say what it would prove.

## 3. WHAT I AM NOT CLAIMING

- I am **not** claiming the console is done. Slices S2–S7 are unbuilt: no Roster, no RunConsole, no
  QueryConsole, no BrainDrawer, no BrainConstellation. S0 and S1 are **SOURCE BUILT** — the code
  exists and its unit suites pass, but no browser, filesystem, launcher or end-to-end pass has been
  re-run, so nothing here is VERIFIED (`07-traceability.md`, legend). This line said "shipped" until
  round 9c (Astra P3 #8): the packet's own §7 quotes that legend, and "shipped" claims an exit
  executed and observed, which is exactly what the legend withholds.
- I am **not** claiming the round-9 sweep is exhaustive beyond the idioms listed in (a).
- I am **not** claiming `sk-` is the only over-refusal. It is the one that was found.
- `redact-egress.mjs` is at 296/300 lines by measurement, not by estimate.

## 4. EVIDENCE I MEASURED (attack the measurements)

| Gate | Result |
|---|---|
| console suite | 289/289, 0 fail, 0 cancelled; per-file sum 289 = aggregate |
| redact suites | 56 / 9 / 6 / 20 pass, 0 fail |
| engine gate | 15/15 consistent |
| rule 4 | clean; `redact-egress.mjs` 296, `bridge.containment.test.mjs` 212 |
| mutation, round 9 sweep | 1 RED (red set {R8-07a}) + 2 NO-RED-AS-PREDICTED; control green 10/10 |
| mutation, `sk-` | 2/2 RED-AS-EXPECTED, 4 and 8 assertions matched |
| fixture leak | old code leaks 4 dirs/run; fixed leaks 0 across 3 runs on one shared root |

**Where I was wrong and corrected it, rather than hiding it:**
- I predicted 6 red for the `sk-` M1 mutant and measured **4**. Three of my six word cases spell
  `sk_` or `-sk`, never a literal `sk-`, so that mutant cannot reach them. The harness now binds
  the measured 4.
- My first M2 mutant used an unsatisfiable lookbehind, which tripped the module's own `selfTest()`
  and killed the process before any per-row test ran. Replaced with a satisfiable-but-too-strict bound.
- An earlier session note claimed `TMPDIR` fixed the `EPERM` fixture failures. It does not — on
  Windows `os.tmpdir()` honours `TEMP`/`TMP`. Corrected in the record.

## 5. OUTPUT

Findings as a numbered list, each with: **severity** (P1/P2/P3), the **file and line**, what is
**wrong**, how to **observe** it, and the **fix**. Separate "this is wrong" from "this is risky" and
from "I could not verify". A finding you could not verify is still useful if you label it.

If a claim in section 4 is wrong, say which and how you measured it. Do not accept my numbers because
I listed them in a table — that table is the thing under review.

---



=== BEGIN DOCUMENT: 05-contracts.md — the published contracts the readers must agree with ===

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
| `POST /api/run/daily` | T2 | **S4** (RunConsole) | spawn `run-daily.mjs --per-hour=N` | `202 {requestId: string, runId: string \| null}` (progress via `GET /api/run`) | `400 VALIDATION` (non-positive int), `409 RUN_LOCKED {holder}` |
| `POST /api/repair` | T2 | **S3** (OpsRail) | repair path of `COMMANDS` | `200 {repaired: number, built: number, emptied: number}` — a PROJECTED engine result | `409 RUN_LOCKED {holder}`, `409/422` |
| `POST /api/backup` | T2 | **S3** (OpsRail) — **BLOCKED (A1-08 / D4), do not build** | backup command | **withheld — no endpoint** | — |

The corresponding tests (`T-B4`, `T-B5`, `T-B10`) land **with their slice**, not at S0 — this is the plan/code discrepancy HY4 found as H6 and is corrected here and in `08`. S0's exit evidence is `T-B1/B2/B3/T-B6/T-B7/T-B8/T-B9` plus the structure suite.

**Both run rows were corrected 2026-09-20 (R2-06) — §2b had retained the shapes `17` §A1-05 and §A1-07 replaced in §1.** `POST /api/run/daily` answers `{requestId: string, runId: string | null}`, because acceptance is not completion (§1). `POST /api/repair` answers a **projected** engine result `{repaired: number, built: number, emptied: number}`; the engine's repair path returns an exit code, never `{requeued}`. A stale row here is not a typo — it is an instruction that would rebuild the rejected behaviour.

**THESE ROWS DECLARE TYPES, NOT JUST NAMES (R4-04).** They previously read `{requestId, runId: null}` and `{repaired, built, emptied}` — names only. `T-B27m` compares the *names* a declaration lists, so a row and a type could agree on every name while disagreeing on every type, and the round-4 probe showed exactly that: changing `runId` to `number` in `types.ts` produced **zero** compiler diagnostics. A contract that under-specifies is not a weaker contract, it is an unchecked one. The declared types are now pinned twice over: `web/src/adapters/contract.assert.ts` fails to COMPILE if `types.ts`, `LocalEngineAdapter.ts` or `MockAdapter.ts` drifts from them, and `T-B27m2` fails if this document drifts from that file.

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

=== END DOCUMENT: 05-contracts.md ===


=== BEGIN DOCUMENT: 06-test-plan.md — the test plan and the T-B/T-W/T-E register ===

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

=== END DOCUMENT: 06-test-plan.md ===


=== BEGIN DOCUMENT: 07-traceability.md — requirement -> test traceability ===

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

=== END DOCUMENT: 07-traceability.md ===


=== BEGIN DOCUMENT: 08-slices-operations.md — S0-S7 with entry/exit evidence and the no-go boundaries ===

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

=== END DOCUMENT: 08-slices-operations.md ===


=== BEGIN DOCUMENT: 19-held-findings.md — held findings, owners, and what is still owed ===

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

=== END DOCUMENT: 19-held-findings.md ===


=== BEGIN DOCUMENT: packages/creator-brains-console/lib/containment.mjs — PRODUCTION containment guard (R7-01 fix) ===

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
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { paths } from '../../../scripts/creator-brains/lib/paths.mjs';
import { ApiError, CODE } from './errors.mjs';

/**
 * The real-path resolver, injectable for tests.
 *
 * WHY THIS SEAM EXISTS. R5-02's fix is "only ENOENT means absence". Its failure
 * branch cannot be reached by real filesystem means on this host: a non-ENOENT
 * `realpathSync` failure needs an ACL (EACCES), and the two constructible
 * alternatives do not work — a path beneath a FILE reports **ENOENT** because the
 * leaf does not exist, and a Windows directory junction LOOP resolves cleanly
 * rather than raising ELOOP (both measured 2026-09-20). Astra reached the branch by
 * substituting filesystem responses in memory, and recorded the reachability limit
 * as [UNKNOWN]. Without a seam the fix would ship **unverified**, and an unverified
 * guard is the defect class this module exists to remove.
 *
 * Mirrors the existing `setProbeWorkerForTest` pattern in `lib/health-probe.mjs`.
 */
let realpathImpl = realpathSync;

/** Test seam. Pass nothing (or null) to restore the real resolver. */
export function setRealpathForTest(fn) {
  realpathImpl = typeof fn === 'function' ? fn : realpathSync;
}

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
    realRoot = realpathImpl(root);
  } catch (err) {
    // AN ABSENT STORE IS NOT A FAULT (R5-02). But the previous catch swallowed EVERY
    // error, so one EACCES on the root set `realRoot = null` for the WHOLE request
    // and disabled real-path containment globally — leaving only the lexical
    // `inside()`, which is the check `realpathSync` exists to supplement because it
    // cannot see a junction. Only ENOENT means "no store yet".
    //
    // THE TEST IS AN OPTIONAL CHAIN, NOT `err &&` (R6-02). `err && err.code !== 'ENOENT'`
    // is a FALSY test used as a PRESENCE test — the shape R5-01 removed from
    // `pointer.mjs`, reintroduced here one function over. A non-`Error` throw
    // (`undefined`, `null`, `false`, `0`, `''`) made the guard read as "the store does
    // not exist", which is a confident absence over a fault. `err?.code` is `undefined`
    // for a falsy throw, so it refuses instead.
    if (err?.code !== 'ENOENT') {
      throw damaged(
        `the brains store root could not be resolved`
          + `${err?.code ? ` (${err.code})` : ''}`,
        'brains',
      );
    }
    /* ENOENT — no store yet, and there is nothing to escape from. */
  }
  return { root, realRoot };
}

/**
 * Is `target` strictly inside `root`, after both have been normalised?
 *
 * THE ESCAPE TEST IS BY PATH COMPONENT, NOT BY PREFIX (R7-01). The previous form was
 * `!rel.startsWith('..')`, which rejects every name that merely BEGINS with two dots —
 * `..notes`, `..cache`, `..tmp` — none of which is a parent-directory component. The
 * consequence was not theoretical: `resolvePointer` runs namespace containment BEFORE
 * the ordinary-file skip, so an ordinary file named `..notes` sitting in the store
 * made the whole read refuse with `STORE_DAMAGED`. `listNamespaces` is an unfiltered
 * `readdirSync`, so such a name IS enumerated and DOES reach this check.
 *
 * A parent component is exactly `..`, or `..` followed by a separator. Both are
 * refused; a longer name that starts with two dots is an ordinary name and is allowed
 * — provided it also passes the real-path check, which is the one that can see a
 * junction regardless of spelling.
 */
export function inside(root, target) {
  const rel = relative(root, target);
  return rel !== ''
    && rel !== '..'
    && !rel.startsWith(`..${sep}`)
    && !isAbsolute(rel);
}

/**
 * The real path of `target`, or null ONLY when it genuinely does not exist (R5-02).
 *
 * `file` is the caller's filename, THREADED THROUGH rather than invented (R6-02): the
 * refusal must blame the file the caller was working on. A direct call has no caller
 * context, so the default names the store — which is at least true, and is why this is
 * a defaulted parameter rather than an omitted one.
 */
export function realpathOrNull(target, file = 'brains') {
  try {
    return realpathImpl(target);
  } catch (err) {
    // ONLY ENOENT IS ABSENCE. Every other resolution failure used to become `null`
    // here, and `containedPath` reads `null` as "cannot check" and SKIPS real-path
    // containment entirely — a guard that switches itself off on an error it did not
    // anticipate. Astra round 5 drove this with an injected EACCES and measured the
    // read proceeding with no damage. EACCES/EPERM/ELOOP/ENOTDIR are faults.
    //
    // THE TEST IS AN OPTIONAL CHAIN (R6-02). `err && err.code === 'ENOENT'` happens to
    // refuse a falsy throw too, but by inversion rather than by intent — the same
    // expression shape is WRONG one function up in `brainsStore`, where the sense is
    // reversed. Write the absence test the same way in both places so neither has to
    // be reasoned about separately.
    if (err?.code === 'ENOENT') return null;
    throw damaged(
      `'${target}' exists but its real path could not be resolved`
        + `${err?.code ? ` (${err.code})` : ''}`,
      file,
    );
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
 * THE ONE COMBINATION THAT IS NOT ABSENCE. A target that RESOLVED while the root did
 * not is refused, because that is not two absences agreeing — it is a target the store
 * cannot account for (R6-02). Every refusal here names a file: `brains` when the store
 * root is the subject, otherwise the caller's own filename, which is why `file` is a
 * required parameter rather than an optional one.
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
  const real = realpathOrNull(target, file);
  // A TARGET THAT RESOLVED CANNOT BE AUTHORIZED AGAINST A ROOT THAT DID NOT (R6-02).
  // `brainsStore` returns `realRoot: null` only when the root is absent, and the old
  // condition required BOTH non-null — so the one combination where skipping means the
  // check never ran for a target that DOES exist was the one combination it skipped.
  // The both-absent case is still not a fault: `real === null` short-circuits first.
  if (real !== null && realRoot === null) {
    throw damaged(`${what} resolves but the brains store root did not`, 'brains');
  }
  if (real !== null && !inside(realRoot, real)) {
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

=== END DOCUMENT: packages/creator-brains-console/lib/containment.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/lib/http.mjs — PRODUCTION static resolver (resolveStatic) ===

/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/http.mjs
 * PURPOSE: HTTP plumbing — the error envelope, body reading, and static file
 *          resolution. No routing knowledge lives here.
 * PART OF: Creator Brains Console (blueprint 05 §2)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THE ENVELOPE IS IN ONE PLACE. Blueprint 05 §2 promises that every failure
 * is `{error:{code,message}}` with the ENGINE'S OWN wording as `message`. If each
 * handler built its own error response, one of them would eventually leak a
 * stack trace and the contract would be a lie. There is exactly one function
 * that turns a thrown thing into bytes (`sendError`), and one function that maps
 * a code to a status (`statusFor`).
 *
 * WHY `readBody` HAS A CEILING. A loopback server with no body limit is a
 * self-inflicted denial of service: a runaway client can exhaust memory with one
 * request. 64 KB is orders of magnitude more than any route here needs (the
 * largest body is a creator reference).
 *
 * WHY STATIC RESOLUTION REFUSES TRAVERSAL. The static handler serves the web
 * build; the store sits beside the repo. Without a containment check,
 * `/../registry.json` reads the store through the file server. The check is
 * "the resolved target must be inside WEB_DIST", which is the only formulation
 * that survives symlinks and Windows path separators.
 *
 * @module creator-brains-console/lib/http
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError, CODE, LIMITS } from './errors.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The web build's output dir. Absent until slice S1 — handled, not assumed. */
export const WEB_DIST = join(HERE, '..', 'web', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

/** Map an ApiError's code to HTTP status (blueprint 05 §2). */
export function statusFor(code) {
  switch (code) {
    case CODE.VALIDATION: return 400;
    case CODE.STORE_DAMAGED:
    case CODE.RUN_LOCKED: return 409;
    case CODE.REFUSED: return 422;
    case CODE.NOT_FOUND: return 404;
    default: return 500;
  }
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    // The bridge is single-operator and local; caching a store view would let
    // the console show a stale roster after a write.
    'cache-control': 'no-store',
  });
  res.end(body);
}

/**
 * The ONLY place a thrown value becomes a response body.
 * An `ApiError` carries a code the client can branch on; anything else becomes a
 * generic 500 whose stack never travels.
 *
 * S1-H8: WRITING THE ERROR MUST NEVER ITSELF THROW. An uncaught throw from
 * inside a request handler becomes an `uncaughtException`, and Node's default
 * for that is to terminate the process — which is exactly how `GET //` killed
 * the bridge (the `new URL` throw escaped the handler). So the last line of
 * defence is built to be incapable of raising: if the response was already
 * partially written, `writeHead` raises `ERR_HTTP_HEADERS_SENT`, and that must
 * cost one connection rather than the whole bridge.
 */
export function sendError(res, err, log = null) {
  let status = 500;
  let payload;
  if (err instanceof ApiError) {
    status = statusFor(err.code);
    payload = { error: { code: err.code, message: err.message, ...err.extra } };
  } else {
    if (log) log(`bridge internal error: ${err?.stack || err}`);
    payload = { error: { code: 'INTERNAL', message: err?.message || 'unexpected bridge failure' } };
  }
  try {
    return sendJson(res, status, payload);
  } catch {
    try { res.destroy(); } catch { /* the socket is already gone */ }
    return undefined;
  }
}

/**
 * Read and parse a JSON body, bounded.
 *
 * S1-H10: THE RETURNED VALUE IS ALWAYS AN OBJECT. `JSON.parse` returns whatever
 * the bytes said, and a literal `null` is valid JSON — so `readBody` used to
 * return `null`, and the write routes then dereferenced `body.ref` /
 * `body.enabled` on it. That raised a TypeError INSIDE the handler, which the
 * catch turned into a 500 INTERNAL for what is plainly a client error: the
 * operator sees "unexpected bridge failure" for sending the four characters
 * `null`. `42`, `"x"`, `true` and `[1,2]` survived only by luck (reading a
 * property off them yields `undefined`, which the validators then refuse).
 *
 * The contract is enforced HERE rather than at each dereference site, because
 * this is the one function that owns "what a body may be" — a rule spread over
 * call sites is a rule the next route will forget.
 *
 * S1-H19 — MEASURED LIMITATION, ACCEPTED DELIBERATELY (round-5 pass 4). The
 * ceiling above is a MEMORY bound and it holds, but it is not a delivery
 * guarantee: the `throw` inside `for await` destroys the request stream, so if
 * the client is still writing when the limit trips, the kernel answers it with
 * RST and the 400 never arrives. Measured against a live bridge over raw
 * sockets: 65 537 B, 128 KB, 192 KB, 256 KB and 512 KB all answer a clean
 * `400 {"error":{"code":"VALIDATION","message":"request body too large"}}`, while
 * 1 MB and 4 MB give the client `ECONNRESET` with no response at all. The
 * threshold tracks the socket buffer, which is what identifies the mechanism.
 * The process always survives and keeps serving.
 *
 * NOT FIXED, and the reason is a trade rather than a shrug. Delivering the
 * envelope to a client mid-write requires DRAINING the remainder (measured: a
 * minimal server that drains up to a cap answers 400 at both 1 MB and 4 MB,
 * whereas responding early without draining still resets at 4 MB, and responding
 * then destroying resets at 1 MB). Draining means the bridge reads an arbitrary
 * volume from a hostile client and discards it — trading a real hardening
 * property for a better error message on a path the console cannot reach. The
 * UI's largest body is a creator reference. An up-front `content-length` check
 * was also measured and REJECTED: it only moves the threshold to 4 MB, leaving
 * the class intact, and it would put a second enforcement site beside this one,
 * contradicting the paragraph above. Recorded so the next seat does not
 * re-litigate it — and so nobody mistakes this for an oversight.
 */
export async function readBody(req, limit = LIMITS.BODY_MAX) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new ApiError(CODE.VALIDATION, 'request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  // A1-15 (2026-09-20): DECODE WITH FATAL VALIDATION.
  //
  // `toString('utf8')` substitutes U+FFFD for malformed bytes instead of
  // failing, so invalid UTF-8 reached JSON.parse — and the guarantee asserted in
  // `16` §17 ("replacement necessarily makes the JSON invalid") was never the
  // real one, because replacement INSIDE a quoted string leaves the syntax
  // perfectly valid. Measured on this tree: the bytes
  // `7b 22 72 65 66 22 3a 22 ff 22 7d` (`{"ref":"<0xff>"}`) decode to
  // `{"ref":"\uFFFD"}` and **JSON.parse succeeds**, so a malformed body became a
  // silently corrupted value rather than a refusal. A fatal decoder makes the
  // malformed case fail at the decode step, which is where it belongs.
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new ApiError(CODE.VALIDATION, 'request body is not valid UTF-8');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(CODE.VALIDATION, 'request body is not valid JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError(CODE.VALIDATION, 'request body must be a JSON object');
  }
  return parsed;
}

/**
 * DNS-REBINDING DEFENCE (added 2026-09-17 after HY4's P2 finding).
 *
 * The reason the bridge has no authentication is sound for READS: any local
 * process that can reach 127.0.0.1 can already read the store files directly, so
 * a token would add ceremony without adding protection.
 *
 * That argument does NOT cover WRITES, and HY4 was right to say so. A remote web
 * page can make Sean's own browser the attacker's client via DNS rebinding: the
 * page resolves its hostname to 127.0.0.1 *after* the initial load, then POSTs to
 * `/api/creators` from same-origin script. The browser sends it to the loopback
 * bridge — no CORS preflight is triggered for a simple request — and the bridge
 * would faithfully enable or disable creators. "A local process could already do
 * it" is irrelevant: the attacker is not a local process, it is remote content
 * using the browser as a proxy.
 *
 * The defence is the standard one and it is sufficient here: **the Host header
 * must name the loopback address.** A rebound request carries the attacker's
 * hostname in Host, so it is refused. This blocks the whole class without
 * inventing a token scheme, and it costs nothing on the legitimate path because
 * the launcher always navigates to `http://127.0.0.1:<port>`.
 *
 * Applied to ALL routes, not only writes. Reads leak the creator catalog and
 * coverage; there is no reason to serve those cross-origin either, and a
 * uniform rule is harder to regress than a rule applied to two handlers.
 */
export function hostAllowed(hostHeader, port) {
  if (typeof hostHeader !== 'string' || !hostHeader) return false;
  // Strip the port; IPv6 literals would arrive bracketed, which this bridge
  // never binds, so only host:port and bare host are accepted.
  const host = hostHeader.replace(/:\d+$/, '').toLowerCase();
  if (host === '127.0.0.1' || host === 'localhost' || host === '[::1]') {
    // When the caller knows the bound port, require it too — this closes the
    // case where another loopback service on a different port is targeted.
    if (typeof port !== 'number') return true;
    const claimed = Number((hostHeader.match(/:(\d+)$/) || [])[1]);
    // AN OMITTED PORT MEANS THE SCHEME DEFAULT, 80 (R4-03). `http://127.0.0.1/`
    // is the origin `http://127.0.0.1:80`, so a Host of `127.0.0.1` must be
    // compared against 80 rather than refused outright. `Number(undefined)` is
    // NaN, which is why the default is applied explicitly instead of left to
    // coercion. The rule only ever ADMITS when the bound port really is 80, so
    // the direction of the change is a corrected comparison, not a relaxation:
    // every other bound port still refuses a portless Host exactly as before.
    return (Number.isNaN(claimed) ? 80 : claimed) === port;
  }
  return false;
}

/**
 * Parse a request target into a URL, or throw a VALIDATION ApiError.
 *
 * S1-H8. `new URL(raw, base)` is NOT total: `//`, `///`, `//@`, `//:80`,
 * `http://`, `http:///` and `https://` all raise `TypeError ERR_INVALID_URL`,
 * because they are protocol-relative or scheme-only forms with no host. The
 * caller used to run this parse OUTSIDE its try block, so the throw escaped the
 * request handler — and Node turns an uncaught throw there into a process
 * exit. Measured 2026-09-18: `GET // HTTP/1.1` killed the bridge (exit code 1)
 * and the client saw only a reset connection.
 *
 * A malformed request target is a CLIENT error, so it is mapped to the
 * documented envelope (`05 §2`: VALIDATION → 400) rather than a 500. The
 * echoed target is truncated: it is attacker-controlled and unbounded.
 */
export function parseRequestUrl(rawUrl, base = `http://127.0.0.1`) {
  try {
    return new URL(rawUrl, base);
  } catch {
    throw new ApiError(CODE.VALIDATION, `unparseable request target: ${String(rawUrl).slice(0, 120)}`);
  }
}

/**
 * Resolve a URL path to a file inside WEB_DIST, or null.
 *
 * Containment is checked on the RESOLVED absolute path, not on the raw string —
 * string-prefix checks on the request URL are defeated by encodings and by
 * Windows separator handling. Anything that escapes resolves to null, so the
 * caller falls through to the status page rather than the filesystem.
 */
export function resolveStatic(urlPath, dist = WEB_DIST) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null; // malformed percent-encoding
  }
  const clean = normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const base = resolve(dist);
  const target = resolve(join(base, clean === '/' || clean === '\\' ? 'index.html' : clean));

  if (target !== base && !target.startsWith(base + sep)) return null;
  if (!existsSync(target)) return null;
  return target;
}

export function contentTypeFor(file) {
  return MIME[extname(file)] || 'application/octet-stream';
}

export function readStatic(file) {
  return readFileSync(file);
}

=== END DOCUMENT: packages/creator-brains-console/lib/http.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/path-containment.mjs — NEW in round 9 — the shared predicate ===

/*
 * Path containment, judged BY COMPONENT — the one predicate both fixture
 * validators ask the same question with.
 *
 * WHY THIS HAS ITS OWN MODULE (round 9). It lived in `store-attacks.mjs`, where
 * R8-07 introduced it. Round 9 swept the package for the class it belongs to — a
 * string-prefix test standing in for a containment test — and found one remaining
 * member in an unrelated subject: the H3 traversal validator in
 * `bridge.hy4.test.mjs`, whose assertion read `resolved.startsWith(dist)`.
 *
 * The fix could have imported this predicate out of `store-attacks.mjs`, but that
 * would couple an HTTP-surface test to a store-attack fixture — and drag in
 * `tempRoot` through it — to obtain four lines of `node:path` arithmetic. The
 * predicate is about paths, not about stores, so it is its own module and both
 * subjects import it. The class then has ONE named predicate rather than a copy
 * per validator, which is the whole point: R7-01 fixed the guard in
 * `lib/containment.mjs` and the same test survived one file over, because the fix
 * was aimed at a row and not at a class.
 *
 * WHY THIS IS NOT IN A `.test.mjs`. S1-H13 — a harness exported from a test file
 * re-registers that file's tests in every importer, so one test is counted once per
 * importer. A harness is not a test, and `node --test` must not see it.
 *
 * ── THE DEFECT THIS REPLACES, AND WHY IT SURVIVED A ROUND ────────────────────
 *
 * `junction()` proved its attack with `!real.toLowerCase().startsWith(realStore
 * .toLowerCase())` — the SAME string-prefix containment test R7-01 had removed from
 * `lib/containment.mjs` one round earlier. R7-01's fix was aimed at the guard; this
 * copy stood one file over, in the fixture validator, and round 8 found it there. That
 * is the sixth consecutive round in which "a fix aimed at a row is not a fix aimed at
 * a class" held, and it is why this predicate is now a named function with its own
 * tests rather than an expression inside an assertion.
 *
 * A prefix test is wrong in BOTH directions, and only the second one is quiet:
 *
 *   OVER-PERMISSIVE — `C:\store-evil` starts with `C:\store`, so a junction resolving
 *     to a SIBLING whose name merely begins with the store's name was judged INSIDE
 *     the store. The assertion then fires and reports "the attack was not
 *     constructed" against a junction that escaped perfectly well: a false alarm that
 *     reads as a broken fixture.
 *   OVER-REFUSING — a directory genuinely inside the store whose name begins with two
 *     dots (`..notes`) is not a parent component, and R7-01 recorded exactly this
 *     over-refusal as a defect. A guard that refuses legal input is a defect too.
 *
 * A parent component is exactly `..`, or `..` followed by a SEPARATOR. A longer name
 * that merely begins with two dots is an ordinary name and is inside. A `relative()`
 * result that is absolute means the two paths do not share a root at all, which is
 * also outside.
 *
 * IT IS DELIBERATELY NOT `lib/containment.mjs`'s `inside()`. Importing the production
 * guard would make these validators agree with the guard BY CONSTRUCTION, so a bug in
 * the guard would be invisible to the very tests whose job is to notice it. The rule is
 * restated here from `node:path` primitives, independently.
 *
 * THE ONE INPUT WHERE THIS IS NOT SIMPLY `!inside()`. For every target except the root
 * itself this returns the exact negation of production's `inside()`. At `target === root`
 * `relative()` yields `''`, and BOTH answer `false` — `inside()` because it is strictly
 * inside, this one because `''` is neither `..` nor absolute. So the two are negations
 * everywhere except the self-case, where they coincide on `false`. That is stated rather
 * than unified: making them one function would restore exactly the by-construction
 * agreement this file exists to avoid.
 *
 * @module creator-brains-console/test/path-containment
 */

import { isAbsolute, relative, sep } from 'node:path';

/** Does `target` lie OUTSIDE `root`, judged BY PATH COMPONENT (R8-07)? */
export function escapes(root, target) {
  const rel = relative(root, target);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

=== END DOCUMENT: packages/creator-brains-console/test/path-containment.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/store-attacks.mjs — fixture validator, R8-07 fix ===

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

import { escapes } from './path-containment.mjs';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';

/* `escapes()` — the component-wise containment predicate this harness proves its
 * attacks with — MOVED TO `path-containment.mjs` (round 9). Its provenance, the R8-07
 * defect it replaces, and why it is deliberately not production's `inside()`, are all
 * recorded there. It moved because a second and unrelated validator needed the same
 * predicate: a predicate about PATHS does not belong to a fixture about STORES, and
 * importing this file to reach it would have coupled an HTTP-surface test to
 * store-attack fixtures. One predicate, two importers. */

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
    escapes(from, join(outside, 'gen-0001')),
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
 *
 * THE PROOF IS `escapes()`, NOT A PREFIX TEST (R8-07). See its header — the prefix
 * form judged a sibling named `store-evil` to be inside the store, which turned a
 * correctly-constructed attack into a false "the attack was not constructed".
 */
export function junction(target, linkPath, storeRoot) {
  symlinkSync(target, linkPath, 'junction');
  const real = realpathSync(linkPath);
  const realStore = realpathSync(storeRoot);
  assert.ok(
    escapes(realStore, real),
    `the junction at '${linkPath}' resolved to '${real}', which is INSIDE the store — the attack was not constructed`,
  );
  return real;
}

=== END DOCUMENT: packages/creator-brains-console/test/store-attacks.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/store-attacks.r8.test.mjs — R8-07 tests ===

/*
 * store-attacks.r8.test.mjs — R8-07, the containment predicate in the fixture validator.
 *
 * WHY THIS FINDING IS THE HEADLINE OF ROUND 8. R7-01 found a string-prefix containment
 * test in `lib/containment.mjs` — `!rel.startsWith('..')` — and removed it, because a
 * name that merely BEGINS with two dots (`..notes`) is not a parent-directory component
 * and refusing it made a legal store name damage. Round 8 found the SAME class of test
 * still standing one file over, in this harness's `junction()` proof:
 *
 *   !real.toLowerCase().startsWith(realStore.toLowerCase())
 *
 * Six consecutive rounds have now confirmed that a fix aimed at a row is not a fix aimed
 * at a class. The copy survived because the guard's fix was correct and the copy was
 * somewhere else — and because no test asserted the property, only the behaviour that
 * happened to depend on it.
 *
 * WHAT IS ASSERTED HERE. `escapes()` is exercised in BOTH directions, because a prefix
 * test is wrong in both and only one of them is loud:
 *   - OVER-PERMISSIVE: a sibling named `store-evil` was judged INSIDE the store, so a
 *     correctly-constructed attack reported "the attack was not constructed".
 *   - OVER-REFUSING: `..notes` was judged a traversal, which is R7-01's defect verbatim.
 * And then the live one: a real junction to such a sibling must still be recognised as an
 * attack, on a real filesystem, because that is the case the prefix test got wrong.
 *
 * @module creator-brains-console/test/store-attacks.r8
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { escapes } from './path-containment.mjs';
import { junction } from './store-attacks.mjs';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';

test('R8-07a: `escapes` is component-wise, in both directions', () => {
  const root = resolve('store');
  const under = (...p) => join(root, ...p);

  // INSIDE — and the first two are the cases a prefix test gets WRONG.
  assert.equal(escapes(root, under('brains')), false);
  assert.equal(escapes(root, under('..notes')), false, 'a name BEGINNING with two dots is an ordinary name');
  assert.equal(escapes(root, root), false, 'the root itself is not outside the root');

  // OUTSIDE — and the first is the case a prefix test gets WRONG.
  assert.equal(escapes(root, `${root}-evil`), true, 'a SIBLING whose name begins with the root name is outside');
  assert.equal(escapes(root, resolve(root, '..')), true, 'a real parent component');
  assert.equal(escapes(root, resolve(root, '..', 'sibling')), true);

  // A DRIVE-LETTER MISMATCH SHARES NO ROOT, so `relative` hands back an ABSOLUTE path.
  // That branch is Windows-only: on POSIX every absolute path shares `/`.
  if (process.platform === 'win32') {
    assert.equal(escapes(root, 'D:\\store'), true, 'a different drive is never inside');
  }
});

test('R8-07b: a junction into a SIBLING named like the store is still an attack', () => {
  // THE PREFIX TEST'S BLIND SPOT, ON A REAL FILESYSTEM. `…/store-evil` starts with
  // `…/store`, so the old proof judged this junction INSIDE the store and the assertion
  // reported "the attack was not constructed" — against a junction that escaped
  // perfectly well. A false alarm that reads as a broken fixture is how a weak guard
  // survives: nobody investigates a test that complains about its own setup.
  const base = tempRoot('r8-07');
  const store = join(base, 'store');
  const target = join(base, 'store-evil', 'gen-0001');
  mkdirSync(target, { recursive: true });
  mkdirSync(store, { recursive: true });
  writeFileSync(join(target, 'index.md'), '# outside the store\n', 'utf8');

  assert.doesNotThrow(() => junction(target, join(store, 'gen-0001'), store));
});

=== END DOCUMENT: packages/creator-brains-console/test/store-attacks.r8.test.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/bridge.hy4.test.mjs — HY4 H3 traversal validator (round-9 fix site) ===

#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.hy4.test.mjs
 * PURPOSE: Regression tests for the HY4 independent hostile review's findings
 *          against the HTTP SURFACE — traversal, DNS rebinding, and the LANE B
 *          no-leak invariant.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM THE BUILDER'S SUITE.
 *
 * These are not tests the builder thought of. They are the specific defects an
 * INDEPENDENT reviewer found, and the reason they matter is the repo's own
 * recorded lesson: a builder's test suite encodes the builder's assumptions, so
 * it structurally cannot catch the defects that arise from those assumptions.
 * Keeping the reviewer's findings in their own file makes it visible forever
 * that the builder missed them — and if one of these tests is ever deleted, the
 * deletion is conspicuous.
 *
 * The findings are split by SUBJECT, because they are about three different
 * things and a 400-line file would violate the very rule H7 is about:
 *
 *   this file                          H3 traversal · H4 DNS rebinding · H5 leak
 *   bridge.hy4.process.test.mjs        H1 pid race · H2 listen-failure leak
 *   bridge.hy4.structure.test.mjs      H6 route allowlist · H7 the 300-line rule
 *
 * ---------------------------------------------------------------------------
 * HY4's VERDICT WAS **REVISE**. ALL SEVEN FINDINGS AND THEIR DISPOSITION:
 * ---------------------------------------------------------------------------
 *
 *   H1  P1  pid claim race (check-then-act) → concurrent bridges on one store
 *           FIXED: atomic exclusive create. Tests in the process file.
 *   H2  P1  listen failure leaves a live pid file, blocking every future start
 *           FIXED: release the slot when `listen` rejects. Process file.
 *   H3  P2  the traversal test (then T-B12, renumbered T-B24 in round 5 pass 5
 *           after an ID collision with the S7 snapshot row) was VACUOUS —
 *           `WEB_DIST` does not exist yet, so
 *           every request fell through to the status page and the containment
 *           logic never executed. A test that passes because its code path is
 *           unreachable is worse than no test: it reads as coverage.
 *           FIXED here, against a real temp webroot.
 *   H4  P2  DNS rebinding: a remote page can use Sean's own browser as a client
 *           against the loopback write API. FIXED by requiring the Host header
 *           to name loopback AND the exact bound port.
 *   H5  P2  T-B7 was a fixture grep; a leak under an unmapped field name would
 *           pass. FIXED by schema-level shape detection in test/leak-guard.mjs.
 *   H6  P2  Plan/contract declared routes S0 does not implement. Structure file.
 *   H7  P2  Files over the 300-line cap. Structure file.
 *
 * ---------------------------------------------------------------------------
 * THE MOST INSTRUCTIVE THING IN HERE IS NOT A PRODUCTION BUG
 * ---------------------------------------------------------------------------
 *
 * H4's two live attack tests originally used
 * `fetch(url, { headers: { host: 'evil.com' } })` and BOTH FAILED `200 !== 403`.
 * The bridge looked vulnerable. It was not.
 *
 * undici treats `host` as a FORBIDDEN HEADER NAME and silently substitutes the
 * real authority — verified directly (`probe-host.mjs`): a request sent that way
 * arrives with `Host: 127.0.0.1:<port>`, the legitimate value, which the bridge
 * correctly allows. The test could not construct its own attack.
 *
 * That is the worst possible failure shape for a security regression test, and
 * it was only visible because the test was RUN rather than reasoned about. The
 * fix was a raw `node:http.request` helper (`rawRequest`, in fixtures.mjs) that
 * puts the hostile value on the wire for real. Any future test that needs a
 * header the fetch spec protects must use it rather than reaching for `fetch`
 * and quietly testing nothing.
 *
 * @module creator-brains-console/test/bridge.hy4
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { startBridge, resolveStatic, hostAllowed } from '../server.mjs';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { CH_ONE, CANARY_PHRASE, fixtureRoot, getJson, rawRequest } from './fixtures.mjs';
import { assertNoTranscriptFields } from './leak-guard.mjs';
import { escapes } from './path-containment.mjs';

/* ── H3 · traversal, tested against a REAL webroot ───────────────────────── */

test('HY4-H3: static containment holds against a real document root', () => {
  // The root cause of the vacuous original: `WEB_DIST` is absent until the UI
  // slice lands, so a live-server traversal test could only ever observe the
  // fallback status page. This version calls the resolver DIRECTLY against a
  // real root containing a real file inside it and a real file outside it, so
  // the containment check actually executes.
  const root = tempRoot('hy4-webroot');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'inside.txt'), 'INSIDE-OK', 'utf8');
  writeFileSync(join(root, 'outside.txt'), 'OUTSIDE-SECRET', 'utf8');

  // The positive half. Without it, a "containment" fix that refused everything
  // would satisfy every assertion below and break the static server.
  const legal = resolveStatic('/inside.txt', dist);
  assert.ok(legal, 'a legal file inside the root must resolve');
  assert.equal(legal, join(dist, 'inside.txt'));

  // Every traversal shape must fail, and crucially must NOT reach the outside
  // file — that is the actual security property, not "returns null".
  for (const path of [
    '/../outside.txt',
    '/..%2Foutside.txt',
    '/%2e%2e/outside.txt',
    '/../../outside.txt',
    '/....//outside.txt',
    '/..%5Coutside.txt',
    '/%2e%2e%2foutside.txt',
  ]) {
    const resolved = resolveStatic(path, dist);
    assert.notEqual(resolved, join(root, 'outside.txt'), `'${path}' escaped the root`);
    if (resolved !== null) {
      // A COMPONENT-WISE CONTAINMENT TEST, NOT A PREFIX TEST (round 9). This read
      // `resolved.startsWith(dist)`, which judges a SIBLING named `dist-evil` to be
      // inside `dist` — R8-07's class, and the last member the round-9 sweep found in
      // this package. The predicate is shared, not re-spelled, so the class has one
      // named form rather than a copy per validator.
      //
      // THIS IS A PIN, AND IS LABELLED ONE. It cannot be mutation-proved: `resolveStatic`
      // refuses such a sibling through its own separator-aware check, so this branch only
      // ever runs for a path ALREADY inside `dist`, and reverting the line below is
      // unobservable from here. What the predicate itself guarantees is pinned by
      // R8-07a/R8-07b, which attack it directly.
      assert.ok(
        !escapes(dist, resolved),
        `'${path}' resolved outside the document root: ${resolved}`,
      );
    }
  }
});

test('HY4-H3: a malformed percent-encoding is refused, not thrown', () => {
  // `decodeURIComponent` throws on a truncated escape sequence. An uncaught
  // throw here would be a 500 on a URL any crawler can produce.
  const root = tempRoot('hy4-badpct');
  mkdirSync(root, { recursive: true });
  assert.equal(resolveStatic('/%E0%A4%A', root), null);
  assert.equal(resolveStatic('/%zz', root), null);
});

/* ── H4 · DNS rebinding ─────────────────────────────────────────────────── */

test('HY4-H4: the Host check refuses a rebound (non-loopback) Host header', () => {
  // The unit-level contract, stated exhaustively enough to pin the edges.
  assert.equal(hostAllowed('127.0.0.1:5173', 5173), true);
  assert.equal(hostAllowed('localhost:5173', 5173), true);
  assert.equal(hostAllowed('127.0.0.1', null), true);
  assert.equal(hostAllowed('[::1]:5173', 5173), true);

  // The attack: a page that rebound its own hostname to 127.0.0.1.
  assert.equal(hostAllowed('evil.com', 5173), false, 'a rebound hostname must be refused');
  assert.equal(hostAllowed('evil.com:5173', 5173), false);
  assert.equal(hostAllowed('attacker.example:80', 5173), false);

  // Wrong port on the right host: another loopback service, not this bridge.
  assert.equal(hostAllowed('127.0.0.1:9999', 5173), false);
  // Absent Host (HTTP/1.0 style) is refused rather than waved through.
  assert.equal(hostAllowed(undefined, 5173), false);
  assert.equal(hostAllowed('', 5173), false);
  // A Host that merely CONTAINS a loopback name is not loopback — this is the
  // prefix-matching bug that a naive `includes`/`startsWith` check would have.
  assert.equal(hostAllowed('127.0.0.1.evil.com', 5173), false);
  assert.equal(hostAllowed('notlocalhost', 5173), false);
  assert.equal(hostAllowed('localhost.evil.com:5173', 5173), false);
});

test('HY4-H4 (ATTACK): a write with a rebound Host header cannot mutate the store', async () => {
  const r = fixtureRoot('hy4-rebind');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    // This MUST go through rawRequest: fetch silently rewrites a `host` header
    // to the real authority, so a fetch-based version of this test sends
    // `Host: 127.0.0.1:<port>`, is allowed, and reports a false vulnerability.
    const res = await rawRequest(b.url, `/api/creators/${CH_ONE}`, {
      method: 'PATCH',
      host: 'evil.com',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(res.status, 403, 'a rebound write must be refused');
    assert.equal(res.body.error.code, 'FORBIDDEN_HOST');

    // Prove the refusal actually PREVENTED the write, rather than just answering.
    const after = await getJson(b.url, '/api/creators');
    const row = after.body.find((c) => c.channelId === CH_ONE);
    assert.equal(row.enabled, true, 'the creator must still be enabled — the write never happened');
  } finally { await b.shutdown(); }
});

test('HY4-H4: a rebound READ is refused too, not only writes', async () => {
  // Reads leak the creator catalog, coverage and staleness. There is no reason
  // to serve those cross-origin either, and a uniform rule is harder to regress
  // than a rule applied to two handlers.
  const r = fixtureRoot('hy4-rebind-read');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const res = await rawRequest(b.url, '/api/status', { host: 'evil.com' });
    assert.equal(res.status, 403, 'the creator catalog is not for cross-origin consumption either');
  } finally { await b.shutdown(); }
});

test('HY4-H4: a legitimate loopback request still works after a refusal', async () => {
  // The counterweight. Without this, a "fix" that 403s everything would satisfy
  // both attack tests above while breaking the console completely.
  const r = fixtureRoot('hy4-rebind-ok');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const viaFetch = await getJson(b.url, '/api/creators');
    assert.equal(viaFetch.status, 200, 'the real launcher path (127.0.0.1:<port>) must work');

    const viaRaw = await rawRequest(b.url, '/api/creators', { host: `127.0.0.1:${b.port}` });
    assert.equal(viaRaw.status, 200, 'an explicit loopback Host with the bound port must work');

    const viaLocalhost = await rawRequest(b.url, '/api/creators', { host: `localhost:${b.port}` });
    assert.equal(viaLocalhost.status, 200, 'localhost is loopback and must work');

    // The wrong port on a loopback host is a DIFFERENT service's page rebinding
    // into this bridge — the same attack class, and it must be refused.
    const wrongPort = await rawRequest(b.url, '/api/creators', { host: '127.0.0.1:9' });
    assert.equal(wrongPort.status, 403, 'a loopback Host naming a different port is another service');
  } finally { await b.shutdown(); }
});

/* ── H5 · the LANE B invariant, asserted at the schema level ─────────────── */

test('HY4-H5 (INVARIANT): no response carries a transcript-text field', async () => {
  const r = fixtureRoot('hy4-shape');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    for (const path of [
      '/api/status', '/api/creators', '/api/run', '/api/canary', '/api/backlog',
      `/api/brains/${CH_ONE}`, '/api/query?q=anything',
    ]) {
      const { body } = await getJson(b.url, path);
      assertNoTranscriptFields(body, path);
    }
  } finally { await b.shutdown(); }
});

test('HY4-H5 (META): the detector fires on a real leak and spares real prose', () => {
  // A GUARD IS WORTHLESS IF IT CANNOT FAIL, and a guard that fires on
  // everything is worse than none. Both halves are asserted: the detector must
  // catch the engine's actual LANE B shape, and it must tolerate the engine's
  // own contract-pinned display strings — otherwise it would "pass" by
  // demanding that working capabilities be deleted.
  assert.throws(
    () => assertNoTranscriptFields({
      videoId: 'v1111111111',
      channelId: CH_ONE,
      segments: [{ tStartMs: 0, text: CANARY_PHRASE }],
    }),
    /container field/,
    "the engine's own LANE B document must be caught",
  );

  assert.throws(
    () => assertNoTranscriptFields({ items: [{ tStartMs: 0, text: 'a spoken line' }] }),
    /timed caption cues/,
    'cue rows renamed to an innocuous key must STILL be caught — shape, not words',
  );

  assert.throws(
    () => assertNoTranscriptFields(
      { note: { text: 'A whole paragraph of spoken content. It runs on. And on.' } },
    ),
    /transcript-scale text/,
    'a long prose value under `text` must be caught',
  );

  // The legitimate shapes this detector MUST tolerate.
  assert.doesNotThrow(() => assertNoTranscriptFields(
    { throttle: { active: false, text: 'none — traffic is allowed' } },
  ), 'throttle.text is a contract-pinned display sentence, not a transcript');
  assert.doesNotThrow(() => assertNoTranscriptFields(
    { lines: ['2 videos due now', '1 video in 4h'] },
  ), 'formatted backlog lines are prose, not cues');
  assert.doesNotThrow(() => assertNoTranscriptFields(
    { hits: [{ keyPhrase: 'shadow lift', statement: 'shadow lift is a crutch', tStartMs: 30000 }] },
  ), 'a LANE C cited claim is the product and must pass');
});

=== END DOCUMENT: packages/creator-brains-console/test/bridge.hy4.test.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/bridge.containment.test.mjs — T-B25 containment family + fixture hygiene fix ===

/*
 * T-B25 — LANE C containment against an EXISTING hostile pointer and a LINK
 * escape (A1-11, Astra adjudication 2026-09-20).
 *
 * WHY A NEW FILE. `bridge.brains.test.mjs` T-B22d already probes hostile slug
 * FORMS and it passes — but only because every form it uses happens to resolve
 * to a `current.json` that does not exist. That is a fact about the probes, not
 * about the guard, and A1-11 says so in as many words: "Supplied probes mostly
 * use nonexistent hostile names." The two cases those probes cannot reach are
 * the two that matter:
 *
 *   1. a REAL published brain whose `current.json` is hostile. The pointer
 *      exists and parses, so nothing upstream stops it, and the generation
 *      component is joined into the path unvalidated;
 *   2. a real directory reached through a filesystem LINK. The path text is
 *      entirely legitimate — `brains/<ns>/gen-0001` — so no alphabet rule can
 *      see it. Only resolving the chain can.
 *
 * The positive control in T-B25a is not decoration: without it, "409" is
 * indistinguishable from "this route refuses everything", which is the shape of
 * a guard that has quietly become a bug.
 *
 * @module creator-brains-console/test/bridge.containment
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { BRAIN_NS, getJson, getRaw, seedPublishedBrain, withFixture } from './fixtures.mjs';

/** A phrase that exists ONLY outside the store. Its appearance is the leak. */
const OUTSIDE = 'OUTSIDE-THE-BRAINS-STORE-MUST-NEVER-BE-SERVED';

/**
 * A directory beside the store root, holding the three documents the route
 * reads. Sibling rather than child: a child would be inside `brainsDir` and
 * would prove nothing.
 *
 * UNIQUE AND SELF-CLEANING (round 9). This used to be
 * `join(r, '..', `outside-${label}`, 'gen-0001')` — a CONSTANT name in the SYSTEM
 * temp root. `withFixture` gave `r` a fresh `mkdtempSync` root and the exit reaper
 * tracked it, but this directory is a SIBLING of `r`, so nothing ever reaped it and
 * every run wrote to the same path.
 *
 * The consequence was the worst kind: three consecutive runs shared one directory, so a
 * run could inherit another run's half-written state, and once it became unwritable the
 * failure surfaced as `EPERM` inside `writeFileSync` — which reads as a broken fixture or
 * a sandbox fault, not as this defect. Measured 2026-09-21: nine `outside-*` directories
 * from a single run on 2026-09-20 01:23 were still on disk, and `T-B25b..e` failed with
 * `EPERM ... \outside-t-b25b\gen-0001\index.md` while an ordinary temp write succeeded.
 *
 * `realpathSync` rather than the literal parent, so the returned path still names where
 * the bytes really are when the system temp root is itself a link (Windows resolves
 * `%TEMP%` through `AppData\Local`). The containment assertions compare REAL paths, so a
 * lexical parent would be wrong for exactly the case this file exists to test.
 */
function outsideBrain(r, label) {
  const owner = join(realpathSync(join(r, '..')), `outside-${label}-${randomUUID()}`);
  const dir = join(owner, 'gen-0001');
  mkdirSync(dir, { recursive: true });
  for (const f of ['index.md', 'topics.md', 'timeline.md']) {
    writeFileSync(join(dir, f), `${OUTSIDE}\n`, 'utf8');
  }
  // Reap `owner` — the directory this function CREATED, captured in a variable rather
  // than re-derived. Re-deriving it as `join(dir, '..', '..')` was a real bug in the
  // first draft of this fix: that walks up from `gen-0001` twice, which leaves the
  // `outside-*` directory and lands on the TEMP ROOT ITSELF. Measured — a run with a
  // private temp root deleted the root, and on a SHARED root the second run then failed
  // all six tests because the root was gone. It would have deleted another session's
  // temp files. Capturing the created path is exact; a relative walk is not.
  //
  // `r`'s own reaper cannot reach a sibling, so the creator owns the cleanup — and the
  // label stays in the name so a leaked one is still identifiable by eye.
  process.on('exit', () => {
    try { rmSync(owner, { recursive: true, force: true }); } catch { /* best effort */ }
  });
  return dir;
}

/* ── T-B25a · the positive control ───────────────────────────────────────── */

test('T-B25a: a legitimate published brain still serves — the refusals mean something', async () => {
  await withFixture('t-b25a', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    const { status, body } = await getJson(base, `/api/brains/${ns}`);
    assert.equal(status, 200);
    assert.ok(body.index.includes('A published claim about the fixture'));
    assert.ok(!JSON.stringify(body).includes(OUTSIDE));
  });
});

/* ── T-B25b · an EXISTING pointer naming a traversing generation ─────────── */

test('T-B25b: an existing pointer naming a traversing generation is refused as damage', async () => {
  await withFixture('t-b25b', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    const outside = outsideBrain(r, 't-b25b');

    // A pointer that parses and EXISTS, naming a generation that walks out of
    // the store. Pre-fix this served the target directory's three documents with
    // a 200 (measured). It is now refused by the generation alphabet, which runs
    // before `containedDir` — so this test pins the FIRST of the two checks, and
    // T-B25c/d pin the containment check that a link forces past the alphabet.
    writeFileSync(
      join(r, 'brains', ns, 'current.json'),
      JSON.stringify({ schema_version: 1, title: 'Hostile', generation: `../../../${outside.split(/[\\/]/).slice(-2).join('/')}` }),
      'utf8',
    );

    const { status, text } = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(status, 409, 'a pointer the engine could not have written is a store fault, not an empty brain');
    assert.ok(!text.includes(OUTSIDE), 'the traversal must not have been followed');
  });
});

test('T-B25b2: an existing pointer naming a non-generation directory is refused as damage', async () => {
  await withFixture('t-b25b2', async ({ r, base }) => {
    const { ns } = seedPublishedBrain(r);
    for (const generation of ['..', '.', 'gen-1', 'gen-00001', 'GEN-0001', '../../registry.json', 'gen-0001/../..']) {
      writeFileSync(
        join(r, 'brains', ns, 'current.json'),
        JSON.stringify({ title: 'Hostile', generation }),
        'utf8',
      );
      const { status, text } = await getRaw(base, `/api/brains/${ns}`);
      assert.equal(status, 409, `generation '${generation}' was not refused`);
      assert.ok(!text.includes(OUTSIDE) && !text.includes('"creators"'), `leak on generation '${generation}'`);
    }
  });
});

/* ── T-B25c/d · the link escapes an alphabet rule cannot see ─────────────── */

test('T-B25c: a generation directory that is a LINK out of the store is refused', async () => {
  await withFixture('t-b25c', async ({ r, base }) => {
    const { ns, genDir } = seedPublishedBrain(r);
    const outside = outsideBrain(r, 't-b25c');

    // Every character of this path is legitimate. Only `realpathSync` can see
    // that the directory is a junction pointing outside the store.
    rmSync(genDir, { recursive: true, force: true });
    symlinkSync(outside, genDir, 'junction');

    const { status, text } = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(status, 409, 'a link out of the store is a containment fault');
    assert.ok(!text.includes(OUTSIDE), 'readFileSync FOLLOWS a junction — containment of the path is not containment of the file');
  });
});

test('T-B25d: a NAMESPACE that is a LINK out of the store is refused', async () => {
  await withFixture('t-b25d', async ({ r, base }) => {
    const outside = outsideBrain(r, 't-b25d');
    const ns = 'linked-ns';
    const outsideRoot = join(outside, '..');
    writeFileSync(join(outsideRoot, 'current.json'), JSON.stringify({ title: 'Linked', generation: 'gen-0001' }), 'utf8');

    symlinkSync(outsideRoot, join(r, 'brains', ns), 'junction');

    const { status, text } = await getRaw(base, `/api/brains/${ns}`);
    assert.equal(status, 409, 'the slug is inside the alphabet but the directory is not inside the store');
    assert.ok(!text.includes(OUTSIDE));
  });
});

/* ── T-B25e · the slug is refused BEFORE the pointer read ────────────────── */

test('T-B25e: an unnameable slug never reaches the pointer read', async () => {
  await withFixture('t-b25e', async ({ r, base }) => {
    seedPublishedBrain(r);
    const outside = outsideBrain(r, 't-b25e');
    const outsideRoot = join(outside, '..');
    writeFileSync(join(outsideRoot, 'current.json'), JSON.stringify({ title: 'Outside', generation: 'gen-0001' }), 'utf8');

    // PRE-ENCODED, DELIBERATELY. `fetch` runs the URL parser, which removes `.`
    // and `..` segments BEFORE the wire — so `'.'` and `'..'` cannot express
    // anything here and asserting a status for them tests the client, not the
    // guard (the same lesson T-B22d records). The encoded forms DO reach the
    // handler as literal text, which is what the handler must contain.
    //
    // THIS TEST IS A PIN, NOT A REGRESSION PROOF — and saying so is the point.
    // MEASURED against the pre-fix code (mutation, 2026-09-20): every one of
    // these already answered 404 and leaked nothing, because the router does not
    // decode `%2F` and so `pointerPath` never saw a `..`. The slug is therefore
    // safe TODAY only because another module declines to decode — an assumption
    // owned elsewhere, one `decodeURIComponent` away from being false. This test
    // makes the console's own rule explicit so that day is a failing test rather
    // than a silent reopening. The live vectors are T-B25b/c/d.
    const hostile = [
      '..%2F..%2Foutside-t-b25e',
      '%2e%2e%2f%2e%2e%2foutside-t-b25e',
      '..%5C..%5Coutside-t-b25e',
      'ns%00x',
      'a%2Fb',
      'a%5Cb',
      'x'.repeat(65),
      '%2e%2e',
      'a%20b',
    ];
    for (const name of hostile) {
      const { status, text } = await getRaw(base, `/api/brains/${name}`);
      assert.equal(status, 404, `'${name}' must be refused before any read`);
      assert.ok(!text.includes(OUTSIDE), `leak on slug '${name}'`);
    }

    // ...and the legitimate slug still works, so the refusals above are not
    // simply "this route refuses everything".
    assert.equal((await getJson(base, `/api/brains/${BRAIN_NS}`)).status, 200);
  });
});

=== END DOCUMENT: packages/creator-brains-console/test/bridge.containment.test.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/contract-table.mjs — R8-01/R8-02 fix ===

/*
 * contract-table.mjs — find a route's RESPONSE COLUMN in a markdown table and return
 * the whole type expression that column declares.
 *
 * WHY THIS IS ITS OWN MODULE. `contract-types.mjs` was already at 241 of the 300-line
 * cap (rule 4) when R7-03 needed header-driven column selection, balanced-brace
 * extraction and a whole-expression check. The seam was already there: this file reads
 * TABLE STRUCTURE, that file reads TYPE TEXT. Nothing here knows what a type is.
 *
 * THE DEFECT THIS CLOSES (R7-03, measured by Astra round 7). The previous reader was:
 *
 *   .find((line) => line.startsWith(`| \`${route}\``));
 *   const m = /\{([^}]*)\}/.exec(row.replace(/\\\|/g, '|'));
 *
 * Three failures in two lines, and only the first is about strictness:
 *
 *   1. `.find()` takes the FIRST row for the route. A route declared twice silently
 *      compared the first declaration and never read the second.
 *   2. `/\{([^}]*)\}/` takes the first brace pair ANYWHERE in the row. In
 *      `05-contracts.md` §2b the ERRORS column carries `{holder}`, and an
 *      engine-function column carrying braces would be read as the response shape.
 *   3. `[^}]*` stops at the first `}`. So `{…} & {…}` and `{…} | {…}` were truncated to
 *      their first object and compared as if that were the whole declaration — a
 *      fragment compared while claiming to be the declaration.
 *
 * Strictness inside `typedFields()` cannot see any of that: it receives only the
 * substring this file handed it. A parser is only as complete as its extraction.
 *
 * @module creator-brains-console/test/contract-table
 */

import assert from 'node:assert/strict';

/**
 * Split a markdown table row into cells on UNESCAPED pipes.
 *
 * `\|` is how a table escapes a pipe inside a cell — and §2b's response column is full
 * of them, because a TypeScript union is written `string \| null` there. Splitting on a
 * bare `|` would cut the type in half and then read the halves as separate columns.
 * A NUL placeholder is used rather than a printable sentinel so a cell can never be
 * mistaken for one.
 */
export function tableCells(row) {
  return row
    .replace(/\\\|/g, '\u0000')
    .split('|')
    .map((cell) => cell.replace(/\u0000/g, '|'));
}

/** The index of the column whose header names the response, or -1 when there is none. */
export function responseColumnIndex(header) {
  return tableCells(header).findIndex((cell) => /response/i.test(cell));
}

/** The `|---|---|` separator between a header and its rows. */
const SEPARATOR = /^\|[\s:|-]+\|$/;

/**
 * The nearest preceding table header for the row at index `i`, or null.
 *
 * THE HEADER IS THE LINE ABOVE THE `|---|` SEPARATOR, and the first version of this
 * function got that wrong: it skipped separator lines and returned the first other
 * `|`-line it met going up, which is the ROW IMMEDIATELY ABOVE — a data row, not a
 * header. It appeared to work for §2b only because those two rows sit directly under
 * their separator, so "the line above" and "the header" happened to be the same line.
 * For every row further down the table it returned the previous route's row, whose
 * columns carry no `Response` header, and `responseColumnIndex` then answered -1.
 * `R6-03k` caught it by parsing `GET /api/backlog`, which is eight rows into §2a.
 *
 * So the walk goes UP TO THE SEPARATOR and takes the line ABOVE it. A separator with no
 * `|`-line above it is a headerless table and is reported as such rather than borrowing
 * an unrelated row.
 */
export function headerFor(lines, i) {
  for (let j = i - 1; j >= 0; j--) {
    const line = lines[j];
    if (!line.startsWith('|')) return null;
    if (!SEPARATOR.test(line)) continue;
    const header = lines[j - 1];
    return header !== undefined && header.startsWith('|') ? header : null;
  }
  return null;
}

/**
 * The complete `{…}` this text declares, refusing a SECOND SHAPE or a COMPOSITION.
 *
 * BALANCED, so a nested object survives — `Array<{ d: string }>` is supported syntax
 * and must keep working.
 *
 * THE TAIL IS PART OF THE CHECK, but the check is aimed at a NAMED DEFECT CLASS rather
 * than at deviation in general. `{a} & {b}` adds requirements, `{a} | {b}` admits
 * alternatives, and a second `{…}` is a second shape: in all three cases returning the
 * first brace pair would compare a FRAGMENT while claiming to compare the declaration.
 *
 * THE FIRST VERSION REFUSED *ANY* NON-EMPTY TAIL, and that was an OVER-REFUSAL — the
 * sibling of R7-01, in the same round, which is worth recording. §2a and §2b both
 * annotate a response in the same cell as the shape (`StatusInstrument` — **200 even
 * when damaged**; `{…}` (progress via `GET /api/run`)), so "no tail at all" would have
 * refused a document written the way this document is written. Today those annotations
 * sit OUTSIDE the code span this function is handed, so the strict form happened to
 * pass — it was correct by authoring convention, not by construction. A refusal that
 * fires on legal input is a defect: it makes a correct document unreadable and invites
 * someone to edit the document to satisfy the reader.
 *
 * ── R8-01: THE HEAD IS EXAMINED TOO, AND AN ARRAY SUFFIX IS REFUSED ──────────
 *
 * THE HEAD WAS NOT CHECKED AT ALL. `text.indexOf('{')` found the first brace and
 * everything before it was DISCARDED, so `Array<{a: string}>` returned `{a: string}` —
 * the ELEMENT of an array, compared while claiming to be the response shape. The same
 * held for `Partial<{…}>`, `Readonly<{…}>` and `Foo & {…}`: a wrapper or a composition
 * whose right-hand object was read as the whole declaration. `Array<{…}>` was
 * documented here as "supported syntax that must keep working", and that note was
 * itself the over-permissive assumption — what is preserved is the BALANCED scan, so a
 * nested object is not truncated; what is refused is claiming a fragment is the whole
 * shape. The other side of the comparison cannot express an array return
 * (`methodReturnTypedFields` requires `Promise<{…}>`), so refusing here agrees with it
 * rather than inventing a new strictness.
 *
 * A leading `[]` in the tail joins the refusal for the same reason: `{a: string}[]` is
 * an ARRAY of that object, and reading the element's members as the response shape is
 * the identical fragment-compared-as-whole defect. Only the literal `[]` is refused, so
 * a prose annotation that happens to open with a bracket (`{…} [see note]`) is still
 * read as prose.
 *
 * RESIDUALS, named rather than hidden. A tail is NOT examined for:
 *   - a conditional type (`{a} extends B ? C : D`), which is not a shape this document
 *     uses and which no rule here can distinguish from prose.
 *   - a function type (`{a} => void`), likewise indistinguishable from prose without a
 *     type grammar, and likewise unexpressible on the other side of the comparison.
 *   - prose containing a brace, which is refused — it is indistinguishable from a second
 *     shape, and refusing is the safe direction.
 */
export function wholeObjectShape(text, what) {
  const start = text.indexOf('{');
  assert.notEqual(start, -1, `${what} declares no \`{…}\` response shape`);
  // THE HEAD MUST BE EMPTY (R8-01). Anything before the `{` means the object is a
  // COMPONENT of a larger type — `Array<`, `Partial<`, `Foo & ` — and returning it
  // would compare a fragment while claiming to compare the declaration. This is the
  // mirror of the tail check below, and the first version had the tail and not the head.
  const head = text.slice(0, start).trim();
  assert.equal(
    head, '',
    `${what} declares \`${head}\` before its \`{…}\`. This reader compares a WHOLE `
      + 'response shape, so a wrapper or a composition is refused rather than read as '
      + 'its right-hand object — that would report agreement about a declaration that '
      + 'was never read.',
  );
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch !== '}') continue;
    depth -= 1;
    if (depth > 0) continue;
    const tail = text.slice(i + 1).trim();
    assert.ok(
      !/[{}]/.test(tail) && !/^[&|]/.test(tail) && !/^\[\]/.test(tail),
      `${what} declares \`{…}\` followed by \`${tail}\`. This reader compares a WHOLE `
        + 'response shape, so an intersection, a union, an array suffix or a second '
        + 'object is refused rather than silently dropped — dropping it would report '
        + 'agreement about a declaration that was never read.',
    );
    return text.slice(start, i + 1);
  }
  assert.fail(`${what} declares an unclosed \`{\` — the shape is not a shape`);
}

/** The trimmed content of the FIRST code span in a cell, or null when it has none. */
function cellCode(cell) {
  const m = /`([^`]*)`/.exec(cell);
  return m === null ? null : m[1].trim();
}

/**
 * Every line index in `source` that is a table row declaring `route` in its FIRST cell.
 *
 * ── R8-02: ROW DISCOVERY COUNTED FORMATTING, AND COULD NOT SEE A FENCE ────────
 *
 * The previous form was a literal prefix test over every line:
 *
 *   if (lines[i].startsWith(`| \`${route}\``)) out.push(i);
 *
 * Three failures, and the first is a false NEGATIVE that hides a duplicate:
 *
 *   1. THE SPACE AFTER THE LEADING PIPE WAS PART OF THE MATCH. A row written
 *      `|`GET /api/x`|…` — legal markdown, and what a formatter may well emit — was not
 *      found at all. A route declared twice, once with the space and once without,
 *      yielded ONE row, so the "exactly one row" guard in `responseShapeFor` passed
 *      while a second declaration sat unread. Counting formatting is not counting
 *      declarations.
 *   2. NO FENCE AWARENESS. Every line was a candidate, so a fenced EXAMPLE of a table —
 *      the form this document uses constantly to show a shape — was counted as a
 *      declaration of the route it names. A route with one real row and one fenced
 *      example reported TWO rows and was refused.
 *   3. IT MATCHED ANYWHERE ON THE LINE, not in the method+path column. A row whose
 *      engine column happened to carry the route text counted as a declaration of it.
 *
 * So the row is identified by CELL now: the line is split with `tableCells` (which
 * applies the document's `\|` escaping), and the FIRST cell must hold exactly the route
 * inside a code span. Whitespace is formatting and is ignored; the route itself is
 * compared EXACTLY, so one route is never a prefix of another.
 */
export function rowIndexes(lines, route) {
  const out = [];
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (marker !== null) {
      const ch = marker[1][0];
      // A fence closes only on its OWN marker character; a ``` inside a ~~~ block is
      // content. Closing on either would end the block early and re-expose its rows.
      fence = fence === null ? ch : (fence === ch ? null : fence);
      continue;
    }
    if (fence !== null) continue;
    if (!line.startsWith('|')) continue;
    // `tableCells` yields an empty leading cell for the run before the first `|`.
    if (cellCode(tableCells(line)[1] ?? '') === route) out.push(i);
  }
  return out;
}

/**
 * The response type expression `source` declares for `route`, as a brace-list BODY.
 *
 * ── WHY IT RETURNS THE BODY AND NOT THE BRACED EXPRESSION ─────────────────────
 *
 * The first version returned `wholeObjectShape`'s result, braces included, and that broke
 * two shipped tests (`T-B27m2b`, `R6-03j`) the moment this seam was introduced. Both
 * consumers — `typedFields()` and `memberNames()` — take a brace-list BODY, which is what
 * the inline reader this replaced produced (`typedFields(m[1])`, where `m[1]` came from
 * `/\{([^}]*)\}/` and so excluded the braces). Changing what the seam hands over without
 * changing the callers is the defect: `typedFields` received `{requestId: …}`, split it on
 * the top-level delimiters, found the whole braced expression at depth 1 as a single
 * member, and refused it as `` `{requestId` is not a plain field name ``.
 *
 * So the contract is explicit here and `wholeObjectShape` keeps returning the braced
 * expression it validates — the braces are what the tail check needs to see.
 *
 * EXACTLY ONE ROW, OR A REFUSAL. Two rows for one route is two declarations, and a
 * reader that compares only one of them reports agreement about a document it did not
 * fully read.
 */
export function responseShapeFor(route, source) {
  const lines = source.split('\n');
  const rows = rowIndexes(lines, route);
  assert.equal(
    rows.length, 1,
    `05-contracts.md declares ${rows.length} table rows for ${route}; this reader `
      + 'requires exactly one, because a second row is a second declaration and only '
      + 'one of them would be compared.',
  );
  const header = headerFor(lines, rows[0]);
  assert.ok(header, `the row for ${route} has no table header above it`);
  const column = responseColumnIndex(header);
  assert.notEqual(column, -1, `the table above ${route} declares no response column`);
  const cell = tableCells(lines[rows[0]])[column];
  assert.ok(cell !== undefined, `the row for ${route} has no response column`);
  // ── R8-01 · EXACTLY ONE CODE SPAN MAY HOLD THE SHAPE ───────────────────────
  // The first version took the FIRST code span and never looked at the rest. A cell
  // written `` `{a: string}` or `{b: number}` `` therefore compared the first
  // alternative and reported agreement about the second — a fragment compared while
  // claiming to be the declaration. So EVERY span is examined, and exactly one may
  // hold a `{…}`.
  //
  // "A SPAN THAT HOLDS A BRACE" RATHER THAN "ONE SPAN AT ALL", because this document
  // annotates a response in the same cell and the annotation may itself be code: §2b's
  // run row reads `` `202 {…}` (progress via `GET /api/run`) ``. Refusing any second
  // span outright would refuse a document written the way this one is written — the
  // over-refusal R7-03 already paid for once.
  const spans = [...cell.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
  assert.ok(spans.length > 0, `the row for ${route} declares no code span in its response column`);
  const shapes = spans.filter((s) => /[{}]/.test(s));
  assert.equal(
    shapes.length, 1,
    `the row for ${route} declares ${shapes.length} code spans holding a \`{…}\` shape. `
      + 'This reader compares ONE response shape, so a second shape-like span is '
      + 'refused rather than skipped — skipping it would report agreement about a '
      + 'declaration that was never read.',
  );
  // The leading status code is the column's convention (`202 {…}`), not part of the type.
  const shape = wholeObjectShape(shapes[0].replace(/^\s*\d{3}\s*/, ''), `the row for ${route}`);
  return shape.slice(1, -1);
}

=== END DOCUMENT: packages/creator-brains-console/test/contract-table.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/contract-scan.mjs — R8-03/R8-04 fix (extracted) ===

/*
 * contract-scan.mjs — scan ONE declaration body into its fields, in document order.
 *
 * WHY THIS IS ITS OWN MODULE (R8-04, rule 4). `contract-parse.mjs` is the module that
 * READS ARTIFACTS — it owns the paths, the fenced-block extraction and the payload
 * comparison. Scanning a brace body is a different concern, and R8-04's fixes (bracket
 * nesting, comma/newline property boundaries, a termination check and escape-aware
 * literals) pushed `contract-parse.mjs` to 313 lines against rule 4's hard 300-line cap.
 * The cap is a cap, not a budget: the fix is to extract at the seam, never to golf the
 * comments until the reasoning that justifies the code is gone. `contract-parse.mjs`
 * re-exports this function, so no caller changes.
 *
 * WHY THIS IS NOT A `.test.mjs`. S1-H13 — a harness exported from a test file re-registers
 * that file's tests in every importer, so the suite's own count stops measuring what it
 * claims to measure. This module registers nothing.
 *
 * @module creator-brains-console/test/contract-scan
 */

import assert from 'node:assert/strict';

import { readMember, stripComments, unsupported } from './contract-names.mjs';

/**
 * The characters that end a member rather than beginning one.
 *
 * `;` is here because an empty member is legal in TypeScript (`interface X { ; a: string }`)
 * and because a doubled delimiter is spelling, not a member. Refusing on these would make
 * the reader refuse every interface at its own closing brace.
 *
 * `,` joins them in R8-04. A comma SEPARATES members, so one met where a member is expected
 * is spelling rather than a field name; without this the member branch would hand `,` to
 * `readMember`, get null back, and refuse the legal `{ a: string, b: number }`.
 */
const STRUCTURAL = new Set(['{', '}', ';', ',']);

/** Bracket nesting WITHIN a member, so a `,` in `Record<string, number>` is not a separator. */
const NEST_OPEN = new Set(['<', '[', '(']);
const NEST_CLOSE = new Set(['>', ']', ')']);

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
 *
 * ── R7-04: IT NOW REFUSES WHAT IT CANNOT READ, AND IT TRACKS LITERALS ─────────
 *
 * THREE CHANGES, all from one finding, and the first is the finding itself:
 *
 *   1. THE NAME GRAMMAR IS `readMember`'s, NOT `(\w+)(\??)`. The old regex matched a
 *      bare identifier only, and the fallthrough was `if (!/\s/.test(ch)) expectField
 *      = false` — it SKIPPED the member and carried on. So `readonly slug: string`,
 *      `'quoted': string`, `$x: string` and `0: string` each vanished, and a
 *      declaration carrying one extracted to exactly the fields of a declaration
 *      without it. That is ignorance read as agreement: the comparison built on this
 *      reader reported a match for a document it had not read. An unparseable member
 *      is now a hard failure naming the fragment.
 *   2. THE SCANNER TRACKS STRING LITERALS, so a `;` or a brace INSIDE a literal is not
 *      structural. `a: 'x;y'; b: number` used to end the first member at the `;` inside
 *      the literal and then refuse `y'` as a field name. The same class as the
 *      `stripComments` fix, one layer up.
 *   3. MEMBERS ARE MATCHED BEFORE QUOTES ARE OPENED, so a QUOTED NAME is read by
 *      `readMember` rather than being mistaken for the start of a literal.
 *
 * ── R8-03 / R8-04: THREE MORE, ALL OF THE SAME SHAPE ─────────────────────────
 *
 *   4. ESCAPED QUOTES NO LONGER CLOSE A LITERAL (R8-03). `a: 'it\'s'; extra: string`
 *      ended the literal at the escaped quote, so the `;` after it was read as string
 *      content and the scan swallowed the interface to its end — returning `a` alone
 *      from a two-field declaration.
 *   5. A NEWLINE AND A COMMA SEPARATE MEMBERS, and bracket nesting is tracked so they
 *      do not separate one that merely contains them (R8-04). `expectField` used to be
 *      re-armed ONLY by `;`, so `{ a: string, extra: number }` and the
 *      one-member-per-line form both yielded `[a]` — a declaration that omitted `extra`
 *      compared EQUAL to one that declared it. The newline case PROBES before re-arming:
 *      a newline separates only if a readable member actually starts after it, so a type
 *      continued onto the next line (`a: string |` then `null`) is left alone.
 *   6. A TRUNCATED DECLARATION IS REFUSED (R8-04). `export interface X { a: string;` used
 *      to return `[a]`, so a cut-off declaration compared equal to a complete one.
 */
export function interfaceFields(source, name) {
  const text = stripComments(source);
  const marker = `export interface ${name} {`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `no declaration of interface ${name} was found`);

  const fields = [];
  let depth = 0;
  let nest = 0;
  let expectField = true;
  let quote = null;
  let escaped = false;
  let closed = false;
  const body = text.slice(start + marker.length);

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    // The STRUCTURAL guard is not decoration. Without it this branch consumes the
    // interface's own closing brace — `readMember` returns null for `}`, the branch
    // `continue`s instead of falling through, and the brace is skipped on every
    // iteration. The scan then runs past the interface into the NEXT declaration and
    // refuses there, which is how this was found.
    if (depth === 0 && nest === 0 && expectField && !STRUCTURAL.has(ch)) {
      const m = readMember(body, i);
      if (m !== null) {
        fields.push({ name: m.name, optional: m.optional });
        i += m.length - 1;
        expectField = false;
        continue;
      }
      // Not a member and not whitespace: a member this reader cannot understand, and
      // skipping it is the R7-04 defect.
      if (!/\s/.test(ch)) {
        throw unsupported(
          body.slice(i, i + 40),
          'this reader cannot parse it as a field name, so it cannot compare it',
        );
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; escaped = false; continue; }
    if (ch === '{') {
      depth += 1;
      expectField = false;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth < 0) { closed = true; break; } // the interface's own closing brace
      expectField = false;
      continue;
    }
    if (NEST_OPEN.has(ch)) { nest += 1; continue; }
    if (NEST_CLOSE.has(ch)) { if (nest > 0) nest -= 1; continue; }
    if (ch === ';' || ch === ',') {
      expectField = depth === 0 && nest === 0;
      continue;
    }
    if (ch === '\n' && depth === 0 && nest === 0 && !expectField
        && readMember(body, i + 1) !== null) {
      expectField = true;
      continue;
    }
  }
  assert.ok(closed, `interface ${name} is not terminated — no closing brace was found`);
  return fields;
}

=== END DOCUMENT: packages/creator-brains-console/test/contract-scan.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/contract-names.mjs — R8-03/R8-05 fix ===

/*
 * contract-names.mjs — the member-name grammar and the comment stripper, shared by
 * both contract readers.
 *
 * WHY THIS IS ITS OWN MODULE (R7-04). `contract-parse.mjs` and `contract-types.mjs`
 * both read the same thing — a brace list of TypeScript members — and they disagreed
 * about what a member IS. `contract-types.mjs` REFUSES a member it cannot read;
 * `contract-parse.mjs` dropped it on the floor. Two readers of one grammar, one strict
 * and one silent, is the R7-04 defect: a member the silent reader drops is a member it
 * cannot compare, and the comparison built on it then reports agreement about a
 * declaration that was never read.
 *
 * It is also the seam rule 4 wants. `contract-parse.mjs` was at 215 of the 300-line cap
 * when R7-04 needed a literal-aware comment stripper, a wider name grammar and a
 * refusing `memberNames()`. None of those three is about READING A FILE, which is what
 * that module is for, so they live here and both readers import them.
 *
 * WHAT THIS MODULE DOES NOT DO. It does not decide which artifact declares what, and it
 * does not compare anything. It turns text into member names, and it REFUSES text it
 * cannot read rather than returning a shorter list.
 *
 * ── A DELIBERATE ASYMMETRY, NAMED RATHER THAN LEFT TO BE FOUND ────────────────
 *
 * `memberNames()` here READS `readonly x: string`, `'quoted': string`, `$x: string` and
 * `0: string`. `typedFields()` in `contract-types.mjs` REFUSES the first two — that is
 * R6-03's shipped grammar, pinned by `contract-types.r6.test.mjs`, and it is not changed
 * here. So one row can be readable by the NAME link and refused by the doc→literal link.
 *
 * The two readers differ because they are asked different questions, and the difference
 * is deliberate on both sides:
 *
 *   `memberNames`  answers "which fields does this declare", and the live payload is the
 *                  other side of that comparison. A `readonly` field is a field the
 *                  bridge serves, so REFUSING it would make a legal declaration
 *                  unreadable and the payload check vacuous — an over-refusal.
 *   `typedFields`  answers "what TYPE does each field declare", for a link that compares
 *                  type expressions. R6-03's rule there is that unsupported syntax is a
 *                  hard failure rather than something absorbed, because an absorbed
 *                  member compares EQUAL to one that was never declared.
 *
 * `interfaceFields()` CANNOT delegate to `typedFields()` even if that were wanted: the
 * former must return members in DOCUMENT ORDER (`T-B27d` pins it) and `typedFields`
 * returns them SORTED. Two readers is therefore structural, not an oversight — and this
 * note exists so round 8 can judge it as a decision rather than report it as a discovery.
 *
 * @module creator-brains-console/test/contract-names
 */

/** The quote characters that open a literal in the artifacts this suite reads. */
const QUOTES = new Set(["'", '"', '`']);

/** The refusal for a member this grammar does not support. */
export function unsupported(fragment, why) {
  return new Error(
    `unsupported contract member \`${String(fragment).trim()}\`: ${why}. Extend this `
      + 'parser\'s grammar deliberately rather than letting the member be ignored — a '
      + 'member this reader drops is a member it cannot compare.',
  );
}

/**
 * Remove comments, WITHOUT touching the inside of a string literal (R7-04).
 *
 * The previous form was two `replace` calls, the second of them a global regex meaning
 * "strip from `//` to the end of the line, ANYWHERE". That is right for a comment and
 * wrong for a literal: `url: 'https://…'` lost everything from the `//` onward, so the
 * member's type was truncated to `'https:` and the reader then compared a string that is
 * not in the file. A `//` inside a literal is not a comment marker, and only a walk that
 * tracks literal state can tell the two apart.
 *
 * A COMMENT IS REPLACED BY A NEWLINE, not by nothing, so the line structure the callers
 * depend on survives (`interfaceFields` counts nothing by line, but the r6 fixtures and
 * every diagnostic quote the document as written).
 *
 * RESIDUAL, named rather than hidden: a REGEX literal containing `//` (e.g. `/a\/\//`)
 * is still stripped. Deciding whether a `/` opens a regex or is division needs the
 * preceding token — the same ambiguity the TypeScript scanner resolves with parser
 * state, which this reader does not have. No regex literal appears in either artifact
 * this suite reads; if one appears, the member it sits in fails a comparison rather
 * than silently passing one.
 */
export function stripComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote !== null) {
      out += ch;
      if (ch === '\\') {
        out += text[i + 1] ?? '';
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (QUOTES.has(ch)) {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      // A COMMENT IS REPLACED BY A SPACE, not by nothing (R8-05). Deleting it outright
      // JOINS the tokens on either side: `readonly/* note */slug: string` came out as
      // `readonlyslug: string`, so an edit that only removed a comment silently RENAMED
      // a field — and the reader then compared a name that is not in the file. The `//`
      // branch above emits a newline for the same reason: a comment is trivia, and
      // trivia must not change what the surrounding tokens ARE.
      out += ' ';
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * One member name at offset `i`, or `null` when there is none.
 *
 * THE GRAMMAR IS WIDER THAN `(\w+)(\??)` (R7-04). The old reader matched a bare
 * identifier and nothing else, so `readonly slug: string`, `'quoted-name': string`,
 * `$store: string` and `0: string` each failed to match — and the caller then ran
 * `if (!/\s/.test(ch)) expectField = false`, which SKIPS the member and carries on. A
 * declaration carrying an unreadable member therefore extracted to exactly the fields
 * of one without it: ignorance read as agreement.
 *
 * `readonly` IS MATCHED ONLY WHEN WHITESPACE FOLLOWS IT, because `readonly: boolean` is
 * a legal field NAME — without that condition the modifier and the name are
 * indistinguishable, and `readonly: boolean` would be read as a member called `boolean`.
 *
 * `length` is counted FROM `i`, so the caller resumes after the `:` without rescanning.
 */
export function readMember(text, i) {
  let j = i;
  while (j < text.length && /\s/.test(text[j])) j += 1;
  const m = /^(?:readonly\s+)?(?:'([^']+)'|"([^"]+)"|([\w$]+))(\?)?\s*:/.exec(text.slice(j));
  if (!m) return null;
  return {
    name: m[1] ?? m[2] ?? m[3],
    optional: m[4] === '?',
    length: (j - i) + m[0].length,
  };
}

/**
 * Split a brace-list body on TOP-LEVEL `,` or `;`.
 *
 * DEPTH-AWARE, because a type may contain the delimiters it is split on:
 * `Record<string, number>` carries a comma at angle-depth 1 and
 * `Array<{ a: number }>` carries one inside braces. A plain `split(',')` cuts those in
 * half and then INVENTS members — a false divergence, which is worse than a missed one
 * because it invites someone to "correct" a document that was right.
 *
 * Quoted literals are tracked too, for the same reason one step further out: `'a,b'` is
 * one type, not two members.
 */
/** The delimiter pairs a type may open. Tracked as a STACK, not a counter (R8-04). */
const PAIRS = { '<': '>', '{': '}', '[': ']', '(': ')' };
const CLOSERS = new Set(Object.values(PAIRS));

export function splitTopLevel(body) {
  const parts = [];
  const open = [];
  let quote = null;
  let escaped = false;
  let current = '';
  for (const ch of body) {
    if (quote !== null) {
      current += ch;
      // AN ESCAPED QUOTE DOES NOT CLOSE THE LITERAL (R8-03). Without this, `'it\'s'`
      // ended the literal at the escaped quote, so everything after it — including the
      // `;` that separates the NEXT member — was read as string content and the
      // remaining members vanished. `stripComments` has modelled this since R7-04; the
      // three scanners beside it had not.
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (QUOTES.has(ch)) { quote = ch; current += ch; continue; }
    if (Object.hasOwn(PAIRS, ch)) { open.push(PAIRS[ch]); current += ch; continue; }
    if (open.length > 0 && CLOSERS.has(ch)) {
      // A STACK, NOT A DEPTH COUNTER. `Array<(string]>` is balanced by count and
      // malformed by kind, so a counter accepted it (R8-04). A closer that does not
      // match the innermost opener is refused. A closer met with an EMPTY stack is
      // left alone on purpose: that is `>` in `(a: string) => void`, which is an
      // operator here and not a delimiter.
      if (ch !== open[open.length - 1]) {
        throw unsupported(body.slice(0, 80),
          `it closes \`${ch}\` while \`${open[open.length - 1]}\` is still open`);
      }
      open.pop();
      current += ch;
      continue;
    }
    if ((ch === ',' || ch === ';') && open.length === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  // AN UNCLOSED DELIMITER IS REFUSED, not silently accepted (R8-04). `a: Array<string`
  // used to be read as one well-formed member whose type merely spelled oddly, so a
  // truncated declaration compared EQUAL to a complete one.
  if (open.length > 0) {
    throw unsupported(body.slice(0, 80), `it leaves \`${open.join('')}\` unclosed`);
  }
  parts.push(current);
  return parts;
}

/**
 * The member names a brace-list BODY declares, sorted — refusing what it cannot read.
 *
 * This replaces a private `fieldNames()` that ended in
 * `.filter((name) => /^\w+$/.test(name))` (R7-04). The filter WAS the defect: `readonly x:
 * string` parsed to `readonly x`, failed the test, and vanished — so `{a: string}` and
 * `{a: string; readonly x: string}` produced the SAME name list, and the comparison built
 * on it reported agreement about a declaration it had not read. Optionality was dropped
 * the same way (`x?: string` → `x?` → dropped), which is the R5-04 hole one artifact over.
 *
 * THE OPTIONAL MARKER IS KEPT, as `x?`. A name list that cannot express optionality is
 * blind to a field being widened to optional — the exact drift R5-04 exists to catch.
 *
 * A trailing delimiter is spelling (`{a,}`); an interior empty member is malformed and is
 * refused. THE BOUNDARY IS `readMember`'s AND ONLY `readMember`'s (R8-05) — the first
 * version cross-checked it against `raw.indexOf(':')`, which is a second source of a fact
 * the grammar already knows and which is simply wrong when a quoted name contains a colon.
 */
export function memberNames(body) {
  const parts = splitTopLevel(body);
  const out = [];
  for (let i = 0; i < parts.length; i += 1) {
    const raw = parts[i].trim();
    if (raw === '') {
      if (i === parts.length - 1) continue;
      throw unsupported(parts[i], 'it is an empty member between two delimiters');
    }
    // THE BOUNDARY COMES FROM `readMember`, WHICH IS THE GRAMMAR (R8-05). This used to
    // derive the separator with `raw.indexOf(':')` and then cross-check it against
    // `readMember`'s own consumption. `indexOf` is a SECOND, dumber source of a fact the
    // grammar already knows, and it is wrong for every legal name that CONTAINS a colon:
    // for `'a:b': string` it landed on the colon inside the quotes, disagreed with
    // `readMember`, and the reader THREW on valid TypeScript. An over-refusal inside the
    // very grammar R7-04 built to be complete. The refusals this check was protecting
    // are all preserved, because `readMember` is anchored and simply does not match
    // `[key: string]: unknown` or `foo(): void` — it returns null and we refuse below.
    const m = readMember(raw, 0);
    if (!m) {
      throw unsupported(raw, 'it is not a field name this reader understands');
    }
    out.push(m.optional ? `${m.name}?` : m.name);
  }
  return out.sort();
}

=== END DOCUMENT: packages/creator-brains-console/test/contract-names.mjs ===


=== BEGIN DOCUMENT: packages/creator-brains-console/test/contract-parse.r8.test.mjs — R8-01..R8-06 tests ===

/*
 * contract-parse.r8.test.mjs — round 8's findings, pinned.
 *
 * WHY A SEPARATE FILE PER ROUND. Rule 4 caps every console source file at 300 lines and
 * test files are not exempt, so round 7's tests already live in their own file and
 * appending round 8's to it would break the cap and then tempt someone to golf the
 * comments that carry the reasoning. A round's findings also fail together and are read
 * together, which is the seam the cap is asking for.
 *
 * WHAT ROUND 8 FOUND, AND WHAT EACH TEST HERE IS FOR. Eight findings, all LOW, and the
 * headline is R8-07: R7-01 removed a string-prefix containment test from the guard and
 * left the SAME test standing one file over, in a fixture validator — the sixth
 * consecutive round in which "a fix aimed at a row is not a fix aimed at a class" held.
 * R8-07 itself is pinned in `store-attacks.r8.test.mjs`; this file pins the reader
 * findings, R8-01 through R8-06.
 *
 * A NOTE ON THE CONTROLS. Every refusal below is paired with a positive control, and
 * that is not ceremony. R7-03's first fix refused ANY non-empty tail and would have made
 * a correctly-written document unreadable; R8-05 was an over-refusal inside the very
 * grammar R7-04 built. A refusal that fires on legal input is a defect, so each
 * tightened reader is shown reading the real artifacts as well as refusing the broken
 * ones — `R8-01b` and `R8-02b` drive the SHIPPED document, not a fixture.
 *
 * @module creator-brains-console/test/contract-parse.r8
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contractRowShape, interfaceFields } from './contract-parse.mjs';
import { memberNames, splitTopLevel, stripComments } from './contract-names.mjs';
import { contractRowTypedFields, normalizeType } from './contract-types.mjs';
import { responseShapeFor, rowIndexes } from './contract-table.mjs';

const HEADER = '| Method+Path | Tier | Owner slice | Engine function | Planned response 2xx | Planned errors |';
const SEPARATOR = '|---|---|---|---|---|---|';

/** A §2b-shaped row whose response cell is `cell` verbatim. */
const row = (route, cell) => `| \`${route}\` | T2 | S4 | f | ${cell} | — |`;
const table = (...rows) => [HEADER, SEPARATOR, ...rows].join('\n');

/* ── R8-01 · the extraction compared a FRAGMENT as the whole response ─────── */

test('R8-01a: a WRAPPER before the shape is refused, not read as its right-hand object', () => {
  // `text.indexOf('{')` found the first brace and DISCARDED everything before it, so
  // `Array<{a: string}>` returned `{a: string}` — the ELEMENT of an array, compared while
  // claiming to be the response shape. The head was never examined at all; the tail was.
  for (const shape of [
    'Array<{a: string}>', 'Partial<{a: string}>', 'Readonly<{a: string}>', 'Foo & {a: string}',
  ]) {
    assert.throws(
      () => responseShapeFor('POST /api/x', table(row('POST /api/x', `\`200 ${shape}\``))),
      /before its/,
      `${shape} must be refused — returning the inner object compares a FRAGMENT`,
    );
  }
  // THE POSITIVE CONTROL, and the property the old note was defending: the scan is still
  // BALANCED, so a nested object inside a member is not truncated at its inner brace.
  assert.equal(
    responseShapeFor('POST /api/x', table(row('POST /api/x', '`200 {a: {d: string}}`'))),
    'a: {d: string}',
  );
});

test('R8-01b: a SECOND shape-like code span is refused, a prose annotation is not', () => {
  // The reader took the FIRST code span and never looked at the rest, so a cell offering
  // two alternative shapes compared the first and reported agreement about the second.
  assert.throws(
    () => responseShapeFor('POST /api/x', table(row('POST /api/x', '`200 {a: string}` or `{b: number}`'))),
    /declares 2 code spans/,
  );
  // THE OVER-REFUSAL CONTROL, ON THE SHIPPED DOCUMENT. §2b's run row carries a SECOND
  // code span in the response cell (`progress via GET /api/run`), so a rule of "one span
  // at all" would refuse a document written the way this one is written. The rule is
  // "one span HOLDING A SHAPE", and these two rows are why.
  assert.deepEqual(contractRowShape('POST /api/run/daily'), ['requestId', 'runId']);
  assert.deepEqual(contractRowShape('POST /api/repair'), ['built', 'emptied', 'repaired']);
});

/* ── R8-02 · row discovery counted FORMATTING, and could not see a fence ──── */

test('R8-02a: a row written without the space after `|` is FOUND, so a duplicate is not hidden', () => {
  // The space after the leading pipe was part of the match, so this row was invisible —
  // and a route declared twice, once each way, reported ONE row and passed the
  // "exactly one row" guard while a second declaration sat unread.
  const tight = '|`POST /api/x`|T2|S4|f|`200 {b: number}`|—|';
  const lines = table(row('POST /api/x', '`200 {a: string}`'), tight).split('\n');
  assert.deepEqual(rowIndexes(lines, 'POST /api/x'), [2, 3]);
  assert.throws(() => responseShapeFor('POST /api/x', lines.join('\n')), /declares 2 table rows/);
});

test('R8-02b: a FENCED example is an example, not a declaration', () => {
  const lines = [
    HEADER, SEPARATOR,
    row('POST /api/x', '`200 {a: string}`'),
    '```md',
    row('POST /api/x', '`200 {b: number}`'),
    '```',
  ];
  assert.deepEqual(rowIndexes(lines, 'POST /api/x'), [2]);
  // ...and the document still reads through it, which is the control: fence awareness
  // must not cost the reader the rows that ARE declarations.
  assert.deepEqual(contractRowShape('POST /api/x', lines.join('\n')), ['a']);
  // A fence closes only on its OWN marker: a ``` inside a ~~~ block is content.
  const tilde = ['~~~', '```', row('POST /api/x', '`200 {a: string}`'), '~~~'];
  assert.deepEqual(rowIndexes(tilde, 'POST /api/x'), [], 'the inner fence must not reopen the block');
});

test('R8-02c: PIN — the route is matched in the METHOD+PATH cell, not anywhere on the line', () => {
  // THIS IS A STRUCTURAL PIN, NOT A MUTATION-PROOF OF R8-02, and it is labelled because
  // the distinction matters. The old reader was `lines[i].startsWith(...)`, which is
  // already anchored to the start of the LINE — so a route named in the engine column was
  // never matched, and this test would have passed BEFORE the fix too. No mutant of the
  // old code can redden it.
  //
  // What it pins is the new reader's contract: the row is identified by CELL, so a naive
  // rewrite that searched the line for the route text would count a row whose engine
  // column merely mentions it. That is a real regression risk introduced by moving from a
  // line prefix to a cell, which is why the pin exists.
  const lines = [HEADER, SEPARATOR,
    '| `GET /api/other` | T0 | f | `GET /api/x` | `200 {a: string}` | — |'];
  assert.deepEqual(rowIndexes(lines, 'GET /api/x'), []);
  assert.deepEqual(rowIndexes(lines, 'GET /api/other'), [2]);
});

/* ── R8-03 · an ESCAPED quote was structural in three scanners ────────────── */

test('R8-03a: the DECLARATION SCANNER does not end a literal at an escaped quote', () => {
  // `a: 'it\'s'; b: number;` used to end the literal at the escaped quote, so the `;`
  // after it was read as string content and the interface was swallowed to its end —
  // returning `a` alone from a two-field declaration.
  const src = ['export interface X {', "  a: 'it\\'s';", '  b: number;', '}'].join('\n');
  assert.deepEqual(interfaceFields(src, 'X').map((f) => f.name), ['a', 'b']);
});

test('R8-03b: the SPLITTER and the NAME READER do not end a literal at an escaped quote', () => {
  // Same class, one scanner over: without the escape the `,` after the literal was read as
  // string content, so the remaining members vanished from the list.
  assert.deepEqual(splitTopLevel("a: 'it\\'s', b: number"), ["a: 'it\\'s'", ' b: number']);
  assert.deepEqual(memberNames("a: 'it\\'s', b: number"), ['a', 'b']);
});

test('R8-03c: the TYPE NORMALISER does not rewrite the inside of a literal', () => {
  // The escape used to end the literal early, so the whitespace after it was normalised as
  // TYPE TEXT — and `'it\'s  two'` collapsed onto `'it\'s two'`, making two DIFFERENT
  // literal types compare equal. That defeats R7-05's own rule, which says whitespace is
  // spelling only OUTSIDE a literal.
  assert.notEqual(normalizeType("'it\\'s  two'"), normalizeType("'it\\'s two'"));
  assert.equal(normalizeType("'it\\'s'"), "'it\\'s'");
});

/* ── R8-04 · incomplete input was accepted as a shorter, complete-looking list ─ */

test('R8-04a: a comma and a newline SEPARATE members, not only a semicolon', () => {
  // `expectField` was re-armed ONLY by `;`, so in both of these forms the second property
  // was never read and the declaration compared EQUAL to one that omitted it.
  assert.deepEqual(
    interfaceFields('export interface X { a: string, extra: number }', 'X').map((f) => f.name),
    ['a', 'extra'],
  );
  assert.deepEqual(
    interfaceFields(['export interface X {', '  a: string', '  extra: number', '}'].join('\n'), 'X')
      .map((f) => f.name),
    ['a', 'extra'],
  );
  // THE PROBE'S JOB. A type continued onto the next line must NOT be split, or the reader
  // would invent a member called `null`.
  assert.deepEqual(
    interfaceFields(['export interface X {', '  a: string |', '  null', '}'].join('\n'), 'X')
      .map((f) => f.name),
    ['a'],
  );
});

test('R8-04b: a TRUNCATED declaration is refused, not returned as a shorter list', () => {
  // `export interface X { a: string;` used to yield `[a]`, so a cut-off declaration
  // compared EQUAL to a complete one.
  assert.throws(() => interfaceFields('export interface X { a: string;', 'X'), /is not terminated/);
  assert.throws(() => splitTopLevel('a: Array<string'), /unclosed/);
  assert.throws(() => memberNames('a: Array<string'), /unclosed/);
  // A STACK, NOT A COUNTER: `Array<(string]>` is balanced by COUNT and malformed by KIND.
  assert.throws(() => splitTopLevel('a: Array<(string]>'), /is still open/);
});

/* ── R8-05 · an OVER-REFUSAL inside the grammar R7-04 built ───────────────── */

test('R8-05a: a colon INSIDE a quoted name is read, not refused', () => {
  // `raw.indexOf(':')` is a second, dumber source of a fact the grammar already knows. For
  // `'a:b': string` it landed on the colon inside the quotes, disagreed with `readMember`,
  // and the reader THREW on valid TypeScript.
  assert.deepEqual(memberNames("'a:b': string"), ['a:b']);
  assert.deepEqual(memberNames('"x:y"?: number'), ['x:y?']);
  // The refusals this check was protecting are all preserved, because `readMember` is
  // anchored and simply does not match an index signature.
  assert.throws(() => memberNames('[key: string]: unknown'), /unsupported contract member/);
});

test('R8-05b: a comment between two tokens does not JOIN them', () => {
  // Deleting a comment outright renamed a field: `readonly/* note */slug` came out as
  // `readonlyslug`. A comment is trivia, and trivia must not change what a token IS.
  assert.equal(stripComments('readonly/* note */slug: string'), 'readonly slug: string');
  assert.deepEqual(
    interfaceFields(['export interface X {', '  a/* note */: string;', '  b: number;', '}'].join('\n'), 'X')
      .map((f) => f.name),
    ['a', 'b'],
  );
});

/* ── R8-01/R8-02 · the two readers still agree on the shipped document ─────── */

test('R8-01c: the tightened extraction still reads the real document, both ways', () => {
  // The class-level control. R8-01 and R8-02 both tighten the SAME seam, so a mistake in
  // either would show up here as a refusal of the contract of record rather than as a
  // wrong answer — which is the direction that fails loudly.
  for (const route of ['POST /api/run/daily', 'POST /api/repair']) {
    const typed = contractRowTypedFields(route).map((f) => (f.optional ? `${f.name}?` : f.name)).sort();
    assert.deepEqual(contractRowShape(route), typed, `${route}: the two readers disagree`);
  }
});

=== END DOCUMENT: packages/creator-brains-console/test/contract-parse.r8.test.mjs ===


=== BEGIN DOCUMENT: scripts/lib/redact-egress.mjs — PRODUCTION egress redactor — sk- boundary fix ===

/**
 * redact-egress.mjs — the last gate before a document leaves this machine.
 * =======================================================================
 * WHY THIS EXISTS (2026-08-22 incident, handoff v5 §4):
 * A review packet dispatched to six external vendors carried the operator's
 * Windows username inside filesystem paths. A secret scan had been run before
 * dispatch and returned "No matches found" — on a file that demonstrably
 * contained the string. **The instrument produced a false negative and it was
 * believed.** Scope, once measured: 59 documents, 140 occurrences, months old.
 *
 * REVISED 2026-08-26 (Fable review, EGRESS-REDACTOR-REVIEW-PACKET-2026-08-23):
 * the first version gated the *file read*; callers then assembled diffs,
 * prompts, seeds and even the redactor's own ENOENT messages around it and
 * sent those raw. The gate now sits at the TRANSPORT: `fetchForEgress()`
 * redacts the final request body immediately before the socket. Per-read
 * helpers remain for early, labelled reporting — they are defense in depth,
 * not the control.
 *
 * THE CANARY IS A POSITIVE CONTROL ON THE INSTRUMENT, NOT A COVERAGE PROOF.
 * Before redacting anything real, every call plants one sample of EVERY shape
 * it knows (identity, hostname, each secret family) and verifies each was
 * caught. That proves the instrument is live and every pattern fires in this
 * process. Coverage — whether a class nobody thought of leaks — lives in the
 * test corpus and the threat model (accidental leakage by cooperative authors;
 * regex is the right tool for that and the wrong tool for adversarial exfil).
 *
 * Identity is derived at runtime (os.userInfo / homedir / hostname), never
 * hardcoded — hardcoding the operator's name here would make THIS FILE the leak.
 */
import { readFileSync } from 'node:fs';
import { homedir, hostname, userInfo } from 'node:os';
import { basename } from 'node:path';
// The training-tier gate moved to its own module when this file outgrew the
// 300-line cap (SWA-236), but it stays part of THIS file's public surface:
// every caller imports the egress control from here, and fetchForEgress below
// is what actually enforces it.
import { armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist }
  from './training-tier-gate.mjs';
// Astra is NOT blocked on OpenRouter (the subscription does not serve
// `gpt-6-astra-pro`), but it is double-gated: two independent confirmations,
// surfaced as two sequential stops. Sean 2026-09-19. See the module header.
// The names are imported (not only re-exported) because the default export
// object below references them as local bindings — `export … from` alone
// creates no binding in this module.
import { assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel }
  from './astra-reseller-gate.mjs';

export { armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist }
  from './training-tier-gate.mjs';
export { assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel }
  from './astra-reseller-gate.mjs';

/**
 * Canary samples are assembled from parts so this source file never contains a
 * literal key-shaped string: the pre-commit secret scanner (rightly) cannot tell
 * a canary from a leak, and an allowlist for this file would be a bigger hole.
 */
const c = (...parts) => parts.join('');

/**
 * Secret-shaped values: [regex, replacement, canary sample]. Redacted wherever
 * they appear, key name irrelevant. Every row's sample is planted by selfTest().
 */
const SECRET_SHAPES = [
  // THE `sk-` ROW NEEDS A LEFT BOUNDARY (round 9, over-refusal). Without one the
  // alternative matched INSIDE ordinary English words, because `sk-` occurs as a
  // word-junction in all of them:
  //
  //   ta[sk-]runner-identifier   ri[sk-]management-framework   di[sk-]usage-reporting
  //
  // Every one is 12+ word-characters after `sk-`, so the `{12,}` lower bound offered no
  // protection at all — the bound counts the TAIL, and the tail of an English compound
  // is long. A guard that refuses legal input is a defect in its own right (this loop
  // has now found eight of them), and this one is worse than most: `redactForEgress` is
  // the egress path, so a false positive SILENTLY ALTERS prose on its way to a vendor
  // rather than raising an error anyone would see.
  //
  // `(?<![\w-])` forbids a preceding word-character OR HYPHEN. The hyphen matters: without
  // it, `task-sk-abcdefghijklmnop1234` would fire, and a hyphen is exactly the character
  // that makes a false positive read as a real key. A real key is preceded by
  // start-of-string, whitespace, a quote, `=`, `(`, `:`, or a comma — none of which this
  // lookbehind rejects. Verified both directions in `redact-egress.test.mjs`.
  [/(?<![\w-])sk-[A-Za-z0-9_-]{12,}/g, '<REDACTED-KEY>', c('sk-', 'CANARYCANARYCANARY123456')],
  [/sk_(live|test)_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('sk_', 'live_', 'CANARY0123456789')],
  [/rk_live_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('rk_', 'live_', 'CANARY0123456789')],
  [/whsec_[A-Za-z0-9]{8,}/g, '<REDACTED-KEY>', c('whsec', '_CANARY0123456789')],
  [/xoxb-[A-Za-z0-9-]{8,}/g, '<REDACTED-KEY>', c('xoxb', '-CANARY-0123456789')],
  [/AIza[A-Za-z0-9_-]{20,}/g, '<REDACTED-KEY>', 'AIzaCANARYCANARYCANARY0123456789'],
  [/rnd_[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'rnd_CANARYCANARYCANARY0123'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'ghp_CANARYCANARYCANARY0123456789'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '<REDACTED-KEY>', 'github_pat_CANARYCANARYCANARY0123'],
  [/SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, '<REDACTED-KEY>', 'SG.CANARYCANARYCANARY01.CANARYCANARYCANARY02'],
  [/lin_api_[A-Za-z0-9]{20,}/g, '<REDACTED-KEY>', 'lin_api_CANARYCANARYCANARY0123'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '<REDACTED-JWT>', 'eyJCANARYCANARY.eyJCANARYCANARY.CANARY'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer <REDACTED-KEY>', 'Bearer CANARYCANARYCANARY0123'],
  [/\b\d{8,}:[A-Za-z0-9_-]{30,}\b/g, '<REDACTED-BOT-TOKEN>', '12345678:CANARYCANARYCANARYCANARYCANARY01'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<REDACTED-PEM>',
    '-----BEGIN PRIVATE KEY-----\nCANARY\n-----END PRIVATE KEY-----'],
  [/(?:postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|mysql|amqps?):\/\/[^\s"'<>]+/gi, '<REDACTED-DB-URL>',
    c('postgresql:', '//canary:canary@canary.invalid:5432/canary')],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '<REDACTED-EMAIL>', 'canary@canary.invalid'],
  [/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '<REDACTED-PHONE>', '(555) 000-0199'],
  // Rule 47 numeric IDs (Telegram chat_id etc): keyed at 7+ digits, bare only
  // at 10+ so all-digit 9-char commit SHAs and 20260826T… timestamps survive.
  [/\b(chat_id|chat|user_id|from_id|owner_id|telegram_id|id)(\s*[=:]\s*)-?\d{7,}\b/gi, '$1$2<REDACTED-ID>', 'chat_id=1234567'],
  [/(?<![\w.-])-?\d{10,}(?![\w.-])/g, '<REDACTED-ID>', '9876543210'],
];

/** Names that are also ordinary words: redact with boundaries instead of corrupting prose. */
const COMMON_WORD_NAMES = new Set([
  'admin', 'administrator', 'user', 'users', 'root', 'dev', 'developer', 'test', 'guest',
  'owner', 'default', 'public', 'home', 'desktop', 'server', 'local', 'localhost', 'ubuntu',
  'runner', 'node', 'docker', 'system', 'pi', 'me', 'main',
]);

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Identity-bearing names, derived from the RUNTIME environment. */
export function identityNames() {
  const user = (userInfo().username || '').trim();
  const winUser = basename(homedir() || '') || '';
  let host = '';
  try { host = (hostname() || '').trim(); } catch { host = ''; }
  return [...new Set([user, winUser, host].filter((n) => n && n.length >= 3 && n.toLowerCase() !== 'localhost'))];
}

/** Identity-bearing patterns, built from the RUNTIME environment. */
function identityPatterns() {
  // Paths must be redacted before their identity-bearing segments. If names run
  // first, `C:\\Users\\operator` becomes `C:\\Users\\<OPERATOR>` and the path
  // rule can no longer prove or replace the absolute prefix. Match one or two
  // backslashes so the same rule covers raw text and JSON-stringified bodies.
  const out = [
    [/\/mnt\/[a-z]\/Users\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
    [/[A-Za-z]:(?:\\{1,2}|\/)Users(?:\\{1,2}|\/)[^\\/\s"'<>]+/g, '<PATH>'],
    [/\/(?:home|Users)\/[^/\s"'<>:,;)\]]+/g, '<PATH>'],
  ];
  for (const name of identityNames()) {
    const esc = escapeRe(name);
    const re = COMMON_WORD_NAMES.has(name.toLowerCase())
      ? new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'gi')
      : new RegExp(esc, 'gi');
    out.push([re, '<OPERATOR>']);
  }
  return out;
}

function applyAll(text, patterns) {
  let out = text;
  const hits = [];
  for (const [re, repl] of patterns) {
    const m = out.match(re);
    if (m && m.length) hits.push({ replacement: repl, count: m.length });
    out = out.replace(re, repl);
  }
  return { out, hits };
}

/**
 * Prove the instrument is live: plant one sample of every known shape plus
 * the runtime identity, and verify each was caught. Throws rather than
 * returning a reassuring boolean — a caller can ignore a boolean; it cannot
 * ignore a throw. This certifies the instrument, NOT coverage.
 */
export function selfTest() {
  const names = identityNames();
  const user = basename(homedir() || '') || userInfo().username || '';
  if (!user || user.length < 3 || !names.length) {
    throw new Error(
      '[redact-egress] CANARY IMPOSSIBLE: cannot derive an operator identity from the ' +
      'runtime environment, so the redactor cannot be proven. Refusing to certify this ' +
      'document as safe to send.',
    );
  }
  const identityCanary = names.map((n) => `/home/${n}/x C:\\Users\\${n}\\y host=${n}`).join(' ');
  const canary = `canary ${identityCanary} ${SECRET_SHAPES.map((s) => s[2]).join(' ')}`;
  const { out } = applyAll(canary, [...identityPatterns(), ...SECRET_SHAPES]);
  const leaked = [];
  for (const n of names) if (out.toLowerCase().includes(n.toLowerCase())) leaked.push(`identity:${n.length}ch`);
  for (const [, repl, sample] of SECRET_SHAPES) {
    const probe = sample.split('\n')[0].slice(0, 12);
    if (out.includes(probe)) leaked.push(`shape:${repl}`);
  }
  if (leaked.length) {
    throw new Error(
      `[redact-egress] CANARY FAILED — the instrument did not catch: ${leaked.join(', ')}. ` +
      'Its silence about this document means NOTHING. Refusing to send.',
    );
  }
  return true;
}

/**
 * Redact `text` for egress. Runs the canary first, every time.
 * @returns {{text: string, hits: Array<{replacement: string, count: number}>}}
 */
export function redactForEgress(text) {
  selfTest();
  const { out, hits } = applyAll(String(text ?? ''), [...identityPatterns(), ...SECRET_SHAPES]);
  return { text: out, hits };
}

function report(label, hits) {
  if (hits.length) {
    const total = hits.reduce((n, h) => n + h.count, 0);
    console.error(`[redact-egress] ${label}: ${total} redaction(s) before send — ` +
      hits.map((h) => `${h.replacement}×${h.count}`).join(', '));
  } else {
    console.error(`[redact-egress] ${label}: no matches (instrument live; coverage per test corpus)`);
  }
}

/** Redact and report in one call; returns the redacted string. */
export function redactOutbound(text, { label = 'outbound', quiet = false } = {}) {
  const { text: out, hits } = redactForEgress(text);
  if (!quiet) report(label, hits);
  return out;
}

/**
 * Drop-in replacement for `readFileSync(path, 'utf-8')` on any document that is
 * about to be sent to an external model. Reports what it removed on stderr —
 * silent redaction is how you stop noticing that documents keep needing it.
 * A read failure is rethrown with a REDACTED message: Node's ENOENT text
 * carries the absolute path, which is the incident class this module exists for.
 */
export function readForEgress(path, opts = {}) {
  const { label = 'document', quiet = false } = typeof opts === 'object' && opts ? opts : {};
  let raw;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    const e = new Error(`[redact-egress] read failed (${err.code || 'ERR'}): ${redactForEgress(err.message).text}`);
    e.code = err.code;
    throw e;
  }
  return redactOutbound(raw, { label, quiet });
}

/**
 * THE CONTROL. Drop-in for `fetch(url, init)` on any request that leaves this
 * machine: the string `init.body` is redacted immediately before the socket,
 * so diffs, prompts, seeds and error strings assembled around a document get
 * the same treatment the document did. Headers are untouched (the API key
 * lives there and belongs there). Canary failure throws → nothing is sent.
 */
/**
 * Seats that must never be reached through a paid reseller.
 *
 * Sean holds a Z.ai subscription that already includes BOTH glm-5.3 and glm-5.3-flash,
 * so routing either one through OpenRouter pays per-token for something already bought.
 * This lives at the egress chokepoint rather than in a doc because every consult script
 * funnels through here: a prose rule has to be remembered by each new script and each
 * new agent, and this project's own corpus records prose rules being violated four times
 * in one session after being written up. A refusal cannot be forgotten.
 */
const SUBSCRIPTION_ONLY_MODEL_PREFIXES = [
  { prefix: 'z-ai/', seat: 'GLM (glm-5.3, glm-5.3-flash)', use: 'node scripts/consult-glm.mjs --model glm-5.3[-flash]' }
];

export function assertNotResoldSubscriptionSeat(url, body) {
  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return; }
  if (!host.includes('openrouter')) return;

  let model = '';
  try { model = String(JSON.parse(body)?.model ?? ''); } catch { return; }
  if (!model) return;

  const hit = SUBSCRIPTION_ONLY_MODEL_PREFIXES.find((entry) => model.toLowerCase().startsWith(entry.prefix));
  if (!hit) return;

  throw new Error(
    `[redact-egress] REFUSED: "${model}" via OpenRouter. The ${hit.seat} seat is covered by the ` +
    `Z.ai subscription and must go direct, not through a paid reseller. Use: ${hit.use}`
  );
}

export async function fetchForEgress(url, init = {}, { label = 'request', quiet = false, fetchImpl = globalThis.fetch } = {}) {
  if (typeof init.body !== 'string') {
    throw new Error('[redact-egress] fetchForEgress requires a string body (JSON.stringify it first); refusing to send an unredactable body.');
  }
  assertNotResoldSubscriptionSeat(url, init.body);
  assertAstraResellerDoubleArmed(url, init.body);
  assertTrainingTierArmed(url, init.body);
  const body = redactOutbound(init.body, { label, quiet });
  return fetchImpl(url, { ...init, body });
}


export default {
  readForEgress, redactForEgress, redactOutbound, fetchForEgress,
  assertNotResoldSubscriptionSeat, selfTest, identityNames,
  armTrainingTierEgress, assertTrainingTierArmed, isTrainingTierModel, trainingTierAllowlist,
  assertAstraResellerDoubleArmed, astraResellerGateState, isAstraSubscriptionModel,
};

=== END DOCUMENT: scripts/lib/redact-egress.mjs ===


=== BEGIN DOCUMENT: scripts/lib/redact-egress.test.mjs — its suite, with the round-9 boundary tests ===

/**
 * redact-egress.test.mjs — run: node scripts/lib/redact-egress.test.mjs
 *
 * The load-bearing tests are REGRESSION 1 (the exact shape that leaked to six
 * vendors on 2026-08-22 — the operator's username inside a filesystem path)
 * and REGRESSION 2 (2026-08-26 Fable review: the redactor's OWN read-error
 * message carried the same path, and callers sent it).
 */
import { basename } from 'node:path';
import { homedir, hostname, userInfo } from 'node:os';
import { fetchForEgress, identityNames, readForEgress, redactForEgress, selfTest } from './redact-egress.mjs';

let pass = 0;
let fail = 0;

function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const has = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());

const USER = basename(homedir() || '') || userInfo().username;
const HOST = hostname();

// --- the redactor must prove itself before anything else is meaningful ---
ok('selfTest() passes (every shape + identity caught)', (() => {
  try { return selfTest() === true; } catch (e) { console.log('   ', e.message); return false; }
})());
ok('identityNames() includes the OS user', identityNames().some((n) => n.toLowerCase() === USER.toLowerCase()));

// --- REGRESSION 1: the actual 2026-08-22 incident shape ---
{
  const doc = [
    '# Review packet',
    '',
    'The launcher lives at `C:\\Users\\' + USER + '\\Desktop\\quick-pt\\SS-PT\\run.ps1`',
    'and the WSL mirror is /home/' + USER + '/hermes2/.hermes/config.yaml',
    'plus /mnt/c/Users/' + USER + '/tmp/out.txt and C:/Users/' + USER + '/fwd.txt',
  ].join('\n');
  const { text } = redactForEgress(doc);
  ok('REGRESSION 1: username gone from every path form', !has(text, USER), text);
  ok('REGRESSION 1: doc still readable (headings survive)', text.includes('# Review packet'));
}

// --- REGRESSION 1B: path patterns must fire before the identity fallback ---
// Username absence alone is insufficient: replacing only the name leaves the
// machine-specific path shape in place and cannot prove the path detector ran.
{
  const cases = [
    ['windows backslash', `C:\\Users\\${USER}\\Desktop\\private-project\\plan.md`,
      '<PATH>\\Desktop\\private-project\\plan.md'],
    ['windows slash', `C:/Users/${USER}/Desktop/private-project/plan.md`,
      '<PATH>/Desktop/private-project/plan.md'],
    ['linux home', `/home/${USER}/private-project/plan.md`,
      '<PATH>/private-project/plan.md'],
    ['wsl mount', `/mnt/c/Users/${USER}/private-project/plan.md`,
      '<PATH>/private-project/plan.md'],
  ];
  for (const [name, input, expected] of cases) {
    const { text } = redactForEgress(input);
    ok(`REGRESSION 1B: ${name} has exact path replacement`, text === expected, `${text} !== ${expected}`);
  }
}

// --- REGRESSION 1C: fetchForEgress receives JSON.stringify output ---
// JSON doubles Windows backslashes. The transport boundary must still recognize
// and replace the path, rather than passing only because the username fallback fired.
{
  const body = JSON.stringify({
    content: `C:\\Users\\${USER}\\clients\\private-project\\plan.md`,
  });
  const { text } = redactForEgress(body);
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* asserted below */ }
  ok('REGRESSION 1C: JSON-escaped Windows path remains valid JSON', parsed !== null, text);
  ok('REGRESSION 1C: JSON-escaped Windows path uses PATH marker',
    parsed?.content === '<PATH>\\clients\\private-project\\plan.md', parsed?.content || text);
}

// --- REGRESSION 2: the read-error channel (2026-08-26) ---
{
  let msg = '';
  try { readForEgress(homedir() + '/does-not-exist-' + Date.now() + '.md'); } catch (e) { msg = e.message; }
  ok('REGRESSION 2: ENOENT message is thrown', msg.length > 0);
  ok('REGRESSION 2: ENOENT message carries no username', msg && !has(msg, USER), msg);
}

// --- hostname is identity too ---
if (HOST && HOST.length >= 3) {
  const { text } = redactForEgress('ran on host ' + HOST + ' at 09:00');
  ok('hostname redacted', !has(text, HOST), text);
} else {
  ok('hostname redacted (skipped: hostname too short to be identity)', true);
}

// --- secret shapes: one row per family ---
{
  const cases = [
    ['openai key', 'token=sk-abcdefghijklmnop1234567890', 'sk-abcdef'],
    ['anthropic key', ['sk-ant', '-api03-AbCdEfGhIjKlMnOpQrStUv'].join(''), 'sk-ant'],
    ['openrouter key', 'sk-or-v1-abcdef0123456789abcdef', 'sk-or'],
    ['stripe live', 'k=' + ['sk_', 'live_', 'abcdefgh12345678'].join(''), 'sk_live_'],
    ['render api key', 'RENDER_API_KEY=rnd_AbCdEfGhIjKlMnOpQrStUvWxYz12', 'rnd_AbCd'],
    ['github ghp_', ['ghp', '_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ab'].join(''), 'ghp_ABCD'],
    ['github pat', ['github_p', 'at_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123'].join(''), ['github_p', 'at_ABCD'].join('')],
    ['sendgrid', 'SG.abcdefghijklmnopqrstuv.wxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd', 'SG.abcdef'],
    ['linear', 'lin_api_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'lin_api_ABCD'],
    ['slack bot', ['xoxb', '-1234567890-abcdefghijkl'].join(''), 'xoxb-'],
    ['google api', 'AIzaSyA1234567890abcdefghijklmnopqrs', 'AIza'],
    // samples are split so this file never holds a literal secret shape (pre-commit scanner)
    ['jwt', 'Bearer ' + ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'dozjgNryP4J3jVmNHl0w'].join('.'), 'eyJhbGci'],
    ['opaque bearer', 'Authorization: Bearer 8f3a9c2b1d4e5f60718293a4b5c6d7e8', '8f3a9c2b'],
    ['telegram bot', 'TOKEN=12345678:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw0', ':AAHdqTcv'],
    ['telegram chat_id', 'chat_id=1234567890', '1234567890'],
    ['keyed short id', 'owner id: 8765432', '8765432'],
    ['phone', 'call (555) 123-4567 or 555.123.4567', '123-4567'],
    ['db url postgres', 'DATABASE_URL=' + ['postgresql:', '//u:p@host.example.com:5432/db'].join(''), 'postgres'],
    ['db url redis', 'REDIS_URL=redis://:secretpass@host:6379', 'secretpass'],
    ['db url mongodb', ['mongodb+srv:', '//u:p@cluster.x.net/db'].join(''), 'u:p@'],
    ['email', 'contact ops@example.com now', 'ops@example'],
    ['pem', ['-----BEGIN RSA ', 'PRIVATE KEY-----\nMIIE\n-----END RSA ', 'PRIVATE KEY-----'].join(''), 'MIIE'],
  ];
  for (const [name, input, needle] of cases) {
    const { text } = redactForEgress(input);
    ok(`secret shape: ${name}`, !text.includes(needle), text);
  }
}

// --- it must NOT shred ordinary prose, timestamps, SHAs, line refs ---
{
  const prose = [
    'The gate refuses a run when the report contains a bare VERIFIED marker.',
    'memo 20260816T012000Z-recon.md at commit 72ef9ae40 and 139437997, see file.mjs:1234, v10.0.26200, 2026-08-26.',
  ].join('\n');
  const { text } = redactForEgress(prose);
  ok('ordinary prose / timestamps / SHAs / line refs untouched', text === prose, text);
}

// --- ROUND 9: the `sk-` row must not match INSIDE an English word ---
//
// The over-refusal was silent rather than loud: `redactForEgress` is the egress
// path, so a false positive rewrites prose on its way to a vendor instead of
// raising anything. All four below are real compounds whose spelling contains
// `sk-` at a word junction, and every one has 12+ word-characters after it — the
// `{12,}` bound counts the TAIL, so it offered no protection.
{
  const words = [
    ['task-runner-identifier', 'ta'],
    ['risk-management-framework', 'ri'],
    ['disk-usage-reporting', 'di'],
    ['task_run_identifier', 'ta'],
    ['risk_assessment', 'ri'],
    ['desk-organizer', 'de'],
  ];
  for (const [word, prefix] of words) {
    const sentence = `the ${word} is documented in ${word}.md`;
    const { text } = redactForEgress(sentence);
    ok(`sk- row does not fire inside '${word}'`, text === sentence, text);
  }
}

// --- ROUND 9: ...and it must STILL catch a real key, at every real boundary ---
//
// The complement of the block above. A boundary that fixed the false positives by
// weakening the match would be a worse bug than the one it replaced, so the
// contexts a key genuinely appears in are pinned explicitly.
{
  const contexts = [
    ['env assignment', 'API_KEY=sk-abcdefghijklmnop1234567890'],
    ['quoted', '"sk-abcdefghijklmnop1234"'],
    ['parenthesised', 'see (sk-abcdefghijklmnop1234)'],
    ['start of string', 'sk-abcdefghijklmnop1234 is the key'],
    ['after a comma', 'keys: a, sk-abcdefghijklmnop1234'],
    ['in JSON', '{"key":"sk-abcdefghijklmnop1234"}'],
  ];
  for (const [name, input] of contexts) {
    const { text } = redactForEgress(input);
    ok(`sk- row still catches a real key: ${name}`, text.includes('<REDACTED-KEY>') && !text.includes('sk-abcdef'), text);
  }
  // The hyphen lookbehind: a hyphen BEFORE `sk-` makes it a compound, not a key.
  const { text: hyphen } = redactForEgress('prefix-sk-abcdefghijklmnop1234');
  ok('sk- row does not fire after a hyphen (compound, not key)', !hyphen.includes('<REDACTED-KEY>'), hyphen);
}

// --- reporting: hits are surfaced, not swallowed ---
{
  const { hits } = redactForEgress('/home/' + USER + '/a and sk-zzzzzzzzzzzzzzzz');
  ok('hits reported for the caller to print', hits.length >= 1 && hits.every((h) => h.count > 0));
}

// --- idempotence: redacting twice must not corrupt placeholders ---
{
  const once = redactForEgress('/home/' + USER + '/x chat_id=1234567890 (555) 123-4567').text;
  const twice = redactForEgress(once).text;
  ok('idempotent (safe to double-apply)', once === twice, `${once} vs ${twice}`);
}

// --- THE CONTROL: transport gate redacts the assembled body, not just the doc ---
{
  let sent = null;
  const fakeFetch = async (url, init) => { sent = { url, init }; return { ok: true, status: 200 }; };
  const body = JSON.stringify({
    messages: [{ role: 'user', content: '## Git diff\n+ path C:\\Users\\' + USER + '\\x\n(failed to read: ENOENT open /home/' + USER + '/y) sk-abcdefghijklmnop1234' }],
  });
  await fetchForEgress('https://example.invalid/v1', {
    method: 'POST', headers: { Authorization: 'Bearer sk-realkey-stays-in-header-0123456789' }, body,
  }, { quiet: true, fetchImpl: fakeFetch });
  ok('fetchForEgress: body reaches the socket with no username', sent && !has(sent.init.body, USER), sent?.init.body);
  ok('fetchForEgress: body reaches the socket with no key', sent && !sent.init.body.includes('sk-abcdef'));
  ok('fetchForEgress: body is still valid JSON', (() => { try { JSON.parse(sent.init.body); return true; } catch { return false; } })());
  ok('fetchForEgress: headers untouched (API key belongs there)', sent.init.headers.Authorization.includes('sk-realkey'));
  let threw = false;
  try { await fetchForEgress('https://example.invalid/v1', { body: { not: 'a string' } }, { quiet: true, fetchImpl: fakeFetch }); } catch { threw = true; }
  ok('fetchForEgress: refuses a non-string body (cannot redact what it cannot see)', threw);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

=== END DOCUMENT: scripts/lib/redact-egress.test.mjs ===
