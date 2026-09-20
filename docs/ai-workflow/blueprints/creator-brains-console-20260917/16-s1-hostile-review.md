# 16 — Hostile review round 4 (S1) — Creator Brains Console

- **Date:** 2026-09-18 · **Seat:** builder adversarial pass (no external seat spent) · **Scope:** the slice S1 shipped — the UI, the damage-reporting path, and the *tests that were supposed to be guarding it*.
- **Verdict: REVISE → GREEN.** 8 findings (S1-H1…H8), all fixed and all mutation-verified. **Two were P1-class:** one destroyed the damage-reporting path (S1-H1), the other **killed the bridge process with a single malformed request line** (S1-H8). One (S1-H7) was a hole in the guard suite itself: the rule-4 cap test could not fail on any UI file.
- **S1-H8 was added after the first version of this document.** The sweep was extended from the UI to the static/HTTP layer — a surface rounds 3–4 had not revisited *since S1 put a real web build behind it*. Recorded here rather than in a new document so the round stays coherent.

---

## 1. Why this round targeted the tests, not just the code

Rounds 1–3 audited the engine bridge. S1 added a whole new surface — `console/web/` — and the first pass at reviewing it looked at the *code*. That was the wrong first move.

The more dangerous class is a test that passes because it cannot fail. S1 shipped 31 green tests; three of the seven findings below are places where a green test was not evidence of anything. A slice whose guard suite is narrower than its own file tree has no exit criteria, only a green log.

---

## 2. S1-H1 — a corrupt `state.json` 500'd the damage-reporting route (CODE, **P1, REAL**)

**Where:** `console/lib/status.mjs:79` (and `:195` for the same call on `/api/backlog`).

`stateOrDefault()` **throws on a corrupt file by design** — `defaultValue` refuses to substitute a default for damage (`lib/store.mjs:211`). `getStatus` called it unconditionally:

```js
const videos = stateOrDefault(stateRead).videos || {};
```

Measured on a booted bridge against a store with a corrupt `state.json`:

```
GET /api/status  -> 500, stack trace in the body
GET /api/backlog -> 500
```

**Why this is P1 and not a cosmetic 500.** R3 exists so that damage is *reported*. `StatusInstrument` types damage as a **field** (`05 §1`), and `state.damaged` was already being computed one line earlier — but it was **unreachable**, because the function threw before returning. So the one condition the reporting path exists to describe was the one condition that destroyed it. Worse, the client cannot tell the difference: `StatusBoard` renders *"The bridge did not answer"*, which is indistinguishable from the bridge being down. The operator is told the wrong story.

**Fix** — guard the derivation, keep the route composite:

```js
const stateDamaged = isDamaged(stateRead);
const videos = stateDamaged ? {} : (stateOrDefault(stateRead).videos || {});
const summary = stateDamaged ? null : summarize(videos);
```

`/api/backlog` is *not* composite — its entire payload derives from `state.json`, so `lines: []` would be indistinguishable from a genuinely empty backlog. It now refuses with `409 STORE_DAMAGED` naming the file, like `/api/creators` does.

This is the **two-shape rule** the plan had not stated: a *composite* instrument route keeps 200 and reports damage as a field; a route whose whole payload comes from the damaged file refuses. Recorded in `05 §2a`.

**Regression:** `test/bridge.damage.test.mjs` — T-B17a–f, including a raw-text assertion that no stack trace reaches the body.

## 3. S1-H2 — the census rendered a fabricated measurement (CODE, P2)

**Where:** `components/StatusBoard.tsx`, census row.

`StatusInstrument.census.error` exists precisely because a failed checkpoint sweep leaves `everSwept` at **0** — the count is *absent*, not zero. `status.mjs:139` only sets `error` when `sweeps.error` is truthy. `StatusBoard` ignored the field entirely and rendered:

```
0 in flight · 0 swept
```

That is a fabricated measurement, and it is the exact failure R3 forbids: it reads as "the system checked and found nothing in flight" when the truth is "the system could not check". Fixed with a refusal branch (`data-testid="refused-census"`) that names the sweep error instead of the counts.

## 4. S1-H3 — `documents: 0` is a guard, not a count (CODE, P2)

**Where:** `console/lib/status.mjs:148` → `components/StatusBoard.tsx`.

```js
documents: stateDamaged ? 0 : listDocs(r).length,
```

That `0` is a *guard value* — the field is typed `number`, not `number | null`, so the shape stays stable and the consumer is expected to check damage first. `StatusBoard` rendered it, so a store fault announced **"you have no documents"**.

Fixed by splitting the single `Published` row into two, because they have different truth conditions:

| Row | Source | Behaviour under `stateDamaged` |
|---|---|---|
| **Documents** | `listDocs(r)` — gated on `state.json` | **withheld** (refusal) |
| **Published brains** | `listPublished(r)` — reads `brains/`, not `state.json` | **real count, still shown** |

Withholding the second would have been the same class of lie in the opposite direction. The split is the fix; the refusal alone would have been over-correction.

## 5. S1-H4 — one hung request disabled polling permanently (CODE, P2)

**Where:** `hooks/useStatus.ts`.

The `inFlight` latch — which exists so a slow response cannot stack a second request — was cleared **only in `finally`**. A request that never settles therefore held it forever: every later poll returned immediately at the guard, and the board sat on a stale reading with no recovery short of a reload. "Never overlaps itself" had been implemented as "never recovers".

**Fix:** each load races the adapter against a watchdog, so `finally` always runs, plus a generation counter so a late answer from a timed-out request cannot overwrite a newer reading.

```js
const status = await Promise.race([
  adapterRef.current.getStatus(),
  new Promise((_, reject) => { watchdog = setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs); }),
]);
```

Two deliberate calls:
- A watchdog is mapped to **`TRANSPORT`**, not a new `TIMEOUT` code. No response was ever received, which is what `mapTransportError` already means; adding a code would widen the `05 §2` envelope for a purely client-side condition.
- The timeout lives in the hook, **not** in `ConsoleDataAdapter.getStatus()`. That interface is transcribed verbatim from `05 §1`; a signature change to fix a client concern would have been the tail wagging the contract.

**Regression:** `hooks/useStatus.test.ts` (3 tests) — timeout + recovery, late-answer discard, stale-but-labelled.

## 6. S1-H5 — the fixtures described responses the bridge never produces (MEASUREMENT, P2)

`fixtures.ts` is the input to T-W3, so a fixture that lies makes the component test a fiction — it asserts behaviour against a payload that cannot occur.

Measured against a live bridge and corrected:

| Fixture | Was | Bridge actually returns |
|---|---|---|
| `damagedRegistryStatus` | zeroed `documents` / `publishedBrains` / `recentRuns` | all **still real** — registry damage does not touch the docs dir or the brains dir |
| `damagedStateStatus` | left `backlog.lines` populated, `documents` real | `backlog.lines: []`, `documents: 0` |

The `creators: {total: 0, enabled: 0, damaged: {...}}` trap is *faithful* and was kept — those zeros are real output and are exactly what a naive consumer renders as a false zero.

## 7. S1-H6 — T-W2 was narrower than its own claim (TEST, P2)

**Where:** `src/test/no-engine-import.test.ts`.

The requirement is "no file under `web/src` imports the engine". Three gaps:

1. **`export … from` re-exports** were caught only incidentally (the `from` keyword happened to match), and the label claimed "static import".
2. **Concatenated and split literals** — `'../../' + 'creator-brains/x'`, or `'creator' + '-brains/x'` — matched nothing.
3. **The palette check scanned `tokens.css` alone.** A component could hard-code a banned colour and the suite stayed green.

Fixed by extracting one `scanEngineImports(text)` used by both the real scan and a new **self-check** that runs synthetic offenders through the same matcher — so a future edit cannot silently neuter a pattern. The palette rule now scans **every production file** for the banned hexes *and* their `rgb()` forms.

The self-check is the load-bearing part: it converts "the regexes look right" into "the regexes are proven to fire".

## 8. S1-H7 — the rule-4 cap test could not fail on any UI file (TEST COVERAGE, **P1-class**)

**Where:** `test/bridge.hy4.structure.test.mjs:199`.

CLAUDE.md rule 4 is a **repo-wide** 300-line hard cap. The console's cap test collected sources with:

```js
if (entry.endsWith('.mjs')) acc.push(full);
```

When S1 added `console/web/`, that meant the **entire TypeScript tree went unmeasured** — ~16 files, including `StatusBoard.tsx` at **267** lines. The test's own claim, *"every console source file honours the 300-line cap"*, was false as written: it was a cap on the engine bridge, not on the console.

This is the finding that justifies the round. H5 (recorded in `14 §5`) had already been found and fixed in this same test by adding the `node_modules` skip — and that fix, while correct, *masked this one*, because both defects lived in the same three lines and only the skip set was examined.

**Fix:** an explicit `SOURCE_EXT` list, plus a guard test asserting the walk actually reaches the UI:

```js
const web = files.filter((f) => /[\\/]web[\\/]src[\\/]/.test(f));
assert.ok(web.length >= 10, `the walk reached only ${web.length} files under web/src ...`);
```

Measured after the fix: **40 sources walked, 0 over the cap**, largest = `server.mjs` at exactly **300**.

## 9. S1-H8 — one malformed request line kills the bridge (CODE, **P1, REAL**)

**Where:** `console/server.mjs:125` — `new URL(req.url, …)` sat **outside** the handler's `try` block.

`new URL(raw, base)` is not total. Seven-plus targets are protocol-relative or scheme-only forms with no host, and each raises `TypeError ERR_INVALID_URL`:

```
GET // HTTP/1.1        GET /// HTTP/1.1      GET //// HTTP/1.1
GET //@ HTTP/1.1       GET //:80 HTTP/1.1    GET http:// HTTP/1.1
GET http:/// HTTP/1.1  GET https:// HTTP/1.1
```

Because the parse ran before the `try`, the throw escaped the request handler entirely. Node turns an uncaught throw there into an `uncaughtException`, and its default for that is **to terminate the process**. Measured against a real child process (`startBridge`, no `uncaughtException` handler):

```
GET /api/canary  -> 200   child alive: true
GET //           -> SOCKERR:ECONNRESET
child exited: YES (code=1, signal=null)     # ERR_INVALID_URL
```

**One request line. No response to the client, and the bridge is gone.** The console is loopback-only, so this is not a remote-attacker path — the DNS-rebinding gate refuses a hostile Host *before* the parse, and T-B18b now pins that ordering. But **any local process can kill the operator's bridge with one `curl`**, and the console UI is served from that same origin. The pid file does *not* turn this into a lockout (`claimInstance` clears a stale pid), so severity is crash-plus-DoS rather than a permanent wedge — which is the only reason this is P1 and not worse.

**Why the guard suite never caught it.** It is not a logic error in a handler; it is a throw escaping the *dispatch* layer, above every route and therefore above every route test. Round 3 had attacked `resolveStatic` and `hostAllowed` hard, but always *through* handlers — and it did so **before S1 existed**, when the static layer served only a placeholder page. The class is "the request handler must be total", and nothing tested that.

**Fix, in three parts:**

1. `lib/http.mjs` gains `parseRequestUrl(rawUrl, base)` — total, and maps the failure to the documented envelope (`05 §2`: `VALIDATION` → **400**) instead of letting it fall through to a generic 500. The echoed target is clipped to 120 chars: it is attacker-controlled and unbounded.
2. The parse moves **inside** the `try` (net −1 line, keeping rule 4 satisfied).
3. `sendError` is now incapable of throwing. Its whole job is to produce an error response, so if *it* raised — `writeHead` raises `ERR_HTTP_HEADERS_SENT` on a partially-written response — the process would die by the identical mechanism. A guard that can be defeated by the failure it exists to report is not a guard.

**Regression:** `test/bridge.requesttarget.test.mjs` — **T-B18a/b/c**. The tests use a new `rawRequestLine` fixture that writes to a socket directly, because **both `fetch` and `node:http.request` parse the target into a URL before writing it** and therefore normalize every malformed form away. A test written with either would have passed against the broken code — the same trap the `rawRequest` docstring already records for forbidden headers, in a different disguise.

## 10. A containment check that held, and one that is only correct by accident

Extending the sweep to the static layer produced one clean result and one latent defect worth recording.

**CLEAN — traversal containment survived S1.** 30 hostile payloads against `resolveStatic` with the real `WEB_DIST` root now in place: `../`, `..%2f`, `%2e%2e`, `....//`, `..;/`, `.%2e`, double-encoded `%252e%252e`, backslash variants, UNC `//server/share`, `C:/Windows/win.ini`, null-byte `%00`, overlong-UTF-8 `%c0%ae`, and enough `..` depth to escape the repo root. **0 escapes** — containment is checked on the resolved absolute path, which is the only formulation that survives both encodings and Windows separators. Round 3's conclusion is reconfirmed under the new root.

**LATENT — `resolveStatic`'s containment check permits the base *directory*.** The guard reads:

```js
if (target !== base && !target.startsWith(base + sep)) return null;
```

That `target !== base` exception can only ever admit `WEB_DIST` **itself**, which is a directory — so `resolveStatic('')` and `resolveStatic('.')` both return a directory, and `readFileSync(dir)` then raises EISDIR. Measured: 2 of 30 payloads resolved to a directory.

**It is not reachable through the bridge** — `url.pathname` from `new URL` always begins with `/`, so `clean` is never `''` or `'.'`. But the function is **exported** (`server.mjs` re-exports it) and its correctness depends entirely on an assumption made by its caller. That is the same shape as H5 and S1-H7: a guard that is right only because of something unstated somewhere else. Left as-is deliberately — tightening it means either a behaviour change with no test that can fail, or deleting the exception, and neither should be done quietly. Recorded so the next seat decides it on purpose.

## 11. Mutation verification — a test that cannot fail is not evidence

Each new guard was proved to bite by breaking the code it guards, observing the failure, and reverting. Six mutations, six confirmations:

| Guard | Mutation applied | Observed failure |
|---|---|---|
| S1-H4 watchdog | `reject(...)` → `() => {}` (watchdog neutered) | 2 tests fail, state stuck at `loading` **forever** — the exact wedged symptom |
| S1-H2 census refusal | branch condition → `false` | `Unable to find an element by: [data-testid="refused-census"]` |
| S1-H6 palette scan | injected `#00FFFF` into `App.tsx` | `expected [ 'App.tsx — #00ffff' ] to deeply equal []` |
| S1-H6 self-check | pattern → `creator-brains-MUTATED` | self-check names the **6 samples** that pattern was carrying |
| S1-H7 walk | `SOURCE_EXT` → `.mjs` only | `the walk reached only 0 files under web/src — the cap does not cover the UI` |
| S1-H8 request target | parse moved back **outside** the `try` (the original bug) | T-B18a fails: `failureType: 'unhandledRejection', code: 'ERR_INVALID_URL'` |

All mutations reverted; a post-revert grep for `MUTATION` across `console/` returns only `jsdom`'s internal `MUTATION_TYPE` constants in `node_modules`.

The S1-H6, S1-H7 and S1-H8 results are the ones that matter most: in all three cases the *old* suite would have stayed green under the mutation, which is the definition of the defect.

**The S1-H8 mutation is worth one note on evidence.** Under `node --test` the throw surfaces as an `unhandledRejection` attributed to the test, not as a process exit — because the runner installs its own rejection handling. The **process death** was established separately, against a real `startBridge` child with no such handler: `child exited: YES (code=1)`. Two different observations of one defect; the severity claim rests on the child-process run, not on the test-runner symptom.

## 12. Verification

| Check | Result |
|---|---|
| Console (bridge) suite | **97/97 pass, 0 fail** — ⚠️ **this number was inflated; see §14 S1-H13.** The true distinct count was 85 |
| Web suite (`vitest run`) | **39/39 pass, 0 fail** (4 files) |
| `tsc --noEmit` | **0 errors** |
| `vite build` | 49 modules, 180.94 kB → **60.39 kB gz** (budget 500 kB) |
| S1 exit e2e | **12/12 checks** |
| Rule 4 | **41 sources walked, 0 over** (max `server.mjs` = 300) |
| Static containment | 30/30 hostile payloads refused |
| Request-target robustness | 8/8 malformed targets → 400, bridge survives |
| Engine boundary | `scripts/creator-brains/console/**` untracked only — zero engine files touched |
| LANE B | still never served; the e2e canary never appeared |

Suite growth: bridge 81 → 93 (S0 close-out) → **94** (walk guard) → **97** (T-B18a/b/c); web 31 → **39**.

## 13. Dry-loop statement

Round 4 found **8 defects in a slice that had already shipped green** — 5 in code, 1 in fixtures, 2 in the tests themselves. Three were P1-class: one destroyed the damage-reporting path (S1-H1), one made the repo's own line-cap rule unenforceable on a whole new file tree (S1-H7), and one **let a single malformed request line kill the bridge process** (S1-H8).

**The pattern across all three P1s is the same and worth naming:** each was a guard or a parse that was correct *only under an assumption made somewhere else* — that `stateOrDefault` would not be called on a damaged file, that the walk reached the UI, that `req.url` always parses. None of them were logic errors in a handler, which is why handler-level tests could not see them.

**Residual risks carried forward, stated rather than hidden:**

- **`server.mjs` is at exactly 300 lines — zero headroom.** Rule 4 permits 300, so this is compliant, but **the first route S2 adds breaks the cap**, and the S1-H8 fix already consumed the last line of slack (it was re-shaped to be net-neutral rather than net-positive to avoid breaching the cap mid-fix). S2 must decide up front whether to split `server.mjs` (a router/registration split is the natural seam) or to raise the cap repo-wide — and the cap is a CLAUDE.md rule, so it is Sean's call, not the builder's.
- **The S1-H4 watchdog is time-based, not cancellation-based.** It releases the latch and discards the late answer, but the underlying `fetch` is not aborted — the socket lives until the browser or bridge closes it. Truly aborting would need `AbortSignal` threaded through `ConsoleDataAdapter.getStatus()`, i.e. a `05 §1` contract change. Deliberately not done; recorded so the next seat can make that call knowingly.
- **`resolveStatic`'s `target !== base` exception** admits the base directory (see §10). Unreachable through the bridge, but exported and only correct by accident of the caller's URL parsing. Not changed, deliberately.
- **`15-astra-brief.md` remains reserved** for the 2026-09-19 22:30 automation. This document took `16` to avoid colliding with it.

---

## 14. Round 5, pass 1 — the WRITE path (`POST`/`PATCH`), plus the suite's own arithmetic

Rounds 1–4 reviewed the read surface, the damage modes, the UI, and the static/HTTP layer.
Nobody had pointed a hostile probe at the two **write** routes. Pass 1 did, and the
worst finding of the round was waiting there.

### S1-H9 — a committed write was reported as a refusal (CODE, **P1, REAL**)

`PATCH /api/creators/:channelId` with a damaged `state.json` returned **409
STORE_DAMAGED** while the registry write it had just performed **was already on disk**.

Measured against a real bridge (`state.json` overwritten with `{ this is not json`):

```
PATCH CH_TWO {enabled:true}  -> HTTP 409 STORE_DAMAGED   (error.file = state.json)
  registry after: enabled=true, enabledAt=2026-09-19T07:42:41.386Z   <- PERSISTED
PATCH CH_TWO {enabled:false} -> HTTP 409 STORE_DAMAGED
  registry after: enabled=false                                      <- PERSISTED AGAIN
GET /api/creators            -> HTTP 409 STORE_DAMAGED   (the roster refuses too)
GET /api/status              -> HTTP 200 (composite route, damage as a field)
```

**Cause.** `lib/creators.mjs` delegated the write to the engine's `setEnabled`
(correct — that is the file's whole doctrine), then re-read the **roster** through
`creatorRows` to shape the response row. `creatorRows` is a *roster read* and
legitimately refuses 409 on a damaged `state.json` (`lib/creators.mjs:49-51`). So a
state fault turned a completed registry write into a 409 **after the fact**.

**Why this is P1 and not an error-code nit.** The single property a write client must
be able to rely on is:

> a non-2xx answer means nothing was written.

Every reading the operator has of that 409 is "the toggle did not happen" — and every
surface they could use to check is *also* refusing (`/api/creators` 409s on the same
fault). The console had **no way to tell the truth**. A UI that optimistically toggles
and rolls back on error would show the creator as disabled while the registry says
enabled, and `setEnabled` is by the engine's own description "the ONLY way a creator
starts being fetched" — so the operator's consent state silently disagrees with the
file that governs fetching.

**Fix.** The post-write path may no longer throw. Counts are now taken by
`safeCounts()` — a non-throwing lookup that returns **`null`** when `state.json` is
unreadable, never `0`. That is the same rule round 4 applied to `documents`
(§4 / `status.mjs:148`): a count that could not be taken is **absent**, not zero.
`CreatorRow.videos/fetched` widened to `number | null` in `adapters/types.ts` with the
reason at the field — done now precisely because S2 has not built the roster UI yet,
so nothing has been built on the false `number` contract.

### S1-H10 — a literal `null` body was a 500 (CODE, P2, REAL)

`readBody` returned whatever `JSON.parse` yielded, and **`null` is valid JSON**. The
write routes then dereferenced `body.ref` / `body.enabled` on it:

```
body null   POST -> 500 INTERNAL  Cannot read properties of null (reading 'ref')
            PATCH-> 500 INTERNAL  Cannot read properties of null (reading 'enabled')
body 42     POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
body "str"  POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
body true   POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
body [1,2]  POST -> 400 VALIDATION     PATCH -> 400 VALIDATION
```

`42`, `"str"`, `true` and `[1,2]` survived **only by luck** — reading a property off
them yields `undefined`, which the validators then refuse. `null` is the one value
that is `typeof === 'object'` and still throws. Sending the four characters `null`
returned "unexpected bridge failure".

**Fix.** The body contract ("a JSON object") is enforced in `readBody`, the one
function that owns it — not at each dereference site, because a rule spread over call
sites is a rule the next route forgets. An *absent* body still yields `{}` and keeps
its own, more specific refusal.

### S1-H11 — the static fallthrough answered every method with 200 (CODE, P3, REAL)

The route table's own comment reads *"anything else under /api is a named 404, never a
silent fallthrough"*. Outside `/api` there was exactly the silent fallthrough it
forbids:

```
GET|POST|PATCH|DELETE|PUT|OPTIONS  /registry.json  -> 200  <!doctype html>…(BRIDGE_PAGE)
```

A client PATCHing a typo'd path got a **200 with an HTML page** instead of a 404 —
and a method-agnostic 200 on a write is how a UI bug hides. Fixed **net-neutral** in
line count (one condition widened, no lines added), because `server.mjs` sits at
exactly 300 — see S1-H14.

### S1-H12 — `POST` starves the event loop, with none of `/api/status`'s mitigation (CODE, **P1 for S2, REAL, escalated**)

`POST /api/creators` resolves the reference through the engine, and the engine's
`runOperation` is **synchronous**: `lib/ytdlp.mjs:184` calls `execFileSync`, and
`addCreator` invokes the resolver without awaiting (`lib/registry.mjs:112`).

Measured with a 10 ms tick counter (idle baseline ≈ 64 ticks/s):

```
POST /api/creators {ref:"UCaaa…"} -> 422 in 1577 ms, loop ticks during it: 0
```

**Zero ticks in 1.6 s.** A failing lookup costs ~1.6 s of a completely frozen bridge;
the engine's timeout ceiling is **180 s**, and a successful or rate-limited lookup sits
somewhere between. During the freeze the bridge answers nothing — not `/api/status`,
not the static page — so a status poll queued behind an add is delayed by the whole
add, and the S1 `useStatus` watchdog (15 s, S1-H4) will report `TRANSPORT` for a poll
that was merely queued. The operator reads that as "the console is broken".

**Why this is a finding rather than a known cost.** `lib/health.mjs` documents this
exact pattern as a defect it exists to fix: *"composing a blocking engine function on
a hot path … a design defect the bridge introduced"*, and it pays the same blocking
call **once per 60 s TTL** so that `/api/status` can meet the p95 ≤ 50 ms budget in
`02 §6`. The doctrine was applied to the **read** path and never to the **write** path,
where the call is unbounded, uncached, and on a route the operator triggers by hand.

**Not fixed here, deliberately.** A cache is not available to a write, so the honest
answers are (a) make the engine's resolver async — `addCreator` would need
`await resolve(...)`, an **engine** change, and `deps.resolveCreator` cannot be fixed
from the console side because a returned Promise fails the `resolved.channelId` check —
or (b) stop serving the add synchronously (202 + a job). Both are Sean's call; (a)
touches the engine, which SOUL.md forbids doing to make the console look better. The
route is live today but the add UI is S2's, so **S2 must resolve this before shipping
it**. Recorded, measured, escalated.

### S1-H13 — the suite's own test count was inflated, and it was paying 4× for it (MEASUREMENT, P2)

`withFixture` was **exported from `bridge.boundary.test.mjs`**, and three other test
files imported it from there. Importing a module that calls `test(...)` **registers
that module's tests in the importing file's process**, so the boundary suite ran once
per importer:

```
per-file registered counts, BEFORE:  boundary 6 · damage 12 · write 14 · routes 19
per-file registered counts, AFTER :  boundary 6 · damage  6 · write  8 · routes 13
```

The suite reported **97 tests for 85 real ones** (the boundary file counted 3×), and
the boundary file's `/api/status` calls — which spawn a yt-dlp probe on a cold cache,
~3.7 s — were paid once per importer. Suite wall time **4.3 s → 20 s**.

This is the same shape as the round's other findings and is why it is recorded as a
defect rather than a tidy-up: **the number the packet quotes as evidence was not
measuring what it claimed.** A re-registered test can also pass in one file while the
file that owns it fails. `withFixture` now lives in `fixtures.mjs` (a non-test module),
with the rule stated at its definition: *a harness is not a test.*

### S1-H14 — the engine's own gate fails in this working tree, because the console installed deps (BLOCKER, escalated)

Running the engine suite as the packet's additive-only gate requires:

```
node --test scripts/creator-brains/test/*.test.mjs     # excl. live.test.mjs
# tests 183 · pass 181 · fail 2
not ok 53 - C1 every surface agrees with the artifacts of record
   DISAGREE no engine file exceeds the Rule 4 cap — largest = 4914 lines
```

**Cause.** `scripts/creator-brains/consistency-check.mjs:46-51` walks
`scripts/creator-brains/**` for `*.mjs` with **no `node_modules` skip**. The console
lives at `scripts/creator-brains/console/`, so the walk collects **186** files of which
**71 are third-party** — the largest being
`console/web/node_modules/decimal.js/decimal.mjs` at **4914 lines**.

**This is not caused by this pass.** `node_modules` is gitignored
(`.gitignore:4`) and its mtime is **2026-09-18 13:02**, ~11 h before these edits; the
whole `console/` tree is untracked. It was introduced by S1 running `npm install`
inside `console/web/` — which the packet **explicitly permits** ("npm deps only inside
`console/web/`"). The packet's rule and the engine's gate contradict each other, and
the gate is deterministic: 2/2 isolated runs fail.

**Consequence for the record:** the F4 baseline of record (**183/183**) **no longer
holds in this working tree**. It is superseded, honestly, by:

| Engine suite, this tree | Result |
|---|---|
| `C1` | **FAIL, deterministic** — the `node_modules` walk above |
| `HR14f` (two real concurrent runs) | **flaky under full-suite load** — 6/6 pass in isolation ×3, fails when the whole suite runs in parallel |
| everything else | **181 pass** |

`HR14f` is recorded because a baseline that is only reproducible when run alone is not
a baseline; it should be re-measured under load before it is quoted again.

**Not fixed here, deliberately.** The one-line fix (`skip node_modules in the walk`)
is in an **engine** file, and fixing it would be touching the engine to make the
console's side effect disappear — exactly what SOUL.md forbids. The real question is
Sean's: should the console live inside the engine tree at all, or should the walk skip
`node_modules`? Both are legitimate; they have different consequences. Escalated.

**The same defect was already found and fixed on the other side of the same boundary —
which is what makes this a contradiction rather than an oversight.** The README's H5
receipt records it: *"adding `console/web/` put a `node_modules` tree under
`CONSOLE_ROOT`, and the suite's own rule-4 cap test began measuring ~184 installed
packages. Fixed with an explicit `NOT_OUR_SOURCE` skip."* So the **console's** cap walk
learned to skip third-party code; the **engine's** consistency walk did not, and the
engine walk is the one that gates the engine suite. One boundary, two walkers, one of
them fixed. That asymmetry is the finding.

### What pass 1 checked and found CLEAN (recorded so the next seat does not re-litigate it)

- **Encoded traversal in the PATCH path segment.** `p.slice('/api/creators/'.length)`
  passes the segment through **un-decoded**, so `%2e%2e%2f%2e%2e%2fregistry.json`,
  `..%2Fregistry.json` and `%2Fetc%2Fpasswd` all reach `validateChannelId` as literal
  strings and are refused **400** by the shape check. Containment holds — but note it
  holds *because the string is undecoded*, not because anyone reasoned about decoding.
  Pass 2 must check `/api/brains/:slug`, which resolves through a different path.
- **`PATCH /api/creators/../../registry.json` → 200 is a PROBE ARTIFACT, not traversal.**
  `rawRequest` runs `new URL(base + path)` client-side, which normalises the target to
  `/registry.json` before it reaches the wire. Sent as a raw request line it *still*
  normalises (server-side, inside `parseRequestUrl`) to `/registry.json`, misses
  `/api/creators/`, and lands on the static fallthrough — which is how it became
  S1-H11. **There is no traversal here.**
- **`POST` refuses before writing.** With a damaged store, `addCreator` returns
  `{ok:false, reason}` and the registry file is byte-identical afterwards — verified,
  not assumed. (A first probe appeared to show POST *succeeding* under a damaged
  `state.json`; that was the probe's own error — `addCreator` never reads `state.json`,
  and the 422 was a network resolution failure for a fake handle. The correction is
  recorded because the wrong conclusion would have been a false finding.)
- **The health probe's blocking cost is already owned.** `/api/status` costs ~3.7 s on
  a cold cache (`execFileSync` → `yt-dlp --version`). This is *not* a new finding:
  `lib/health.mjs` exists solely to bound it, documents the measurement, and measures
  the TTL window from the last **probe** (so a 2 s poll cannot pin a value forever).
  Noted because it interacts with S1-H12: the bridge has **two** independent sources of
  multi-second loop starvation, and only one of them has a mitigation.

### Pass 1 — verification

| Check | Result |
|---|---|
| Bridge suite | **93/93 pass, 0 fail** — and now **93 real, not 111 reported for 93** |
| Suite wall time | **3.9 s** (was 20 s with the 3× re-registration) |
| New tests | **T-B19a–e, T-B20, T-B20b, T-B21** (8) |
| Mutation check | all 3 guards mutated → **T-B19a/b/c, T-B20, T-B20b, T-B21 fail; T-B19d/e stay green** (see below) |
| Rule 4 | `server.mjs` **300**, `http.mjs` 242, `creators.mjs` 146, `fixtures.mjs` 227 — 0 over |
| Engine boundary | `console/**` still untracked; **zero engine files edited** this pass |

**Mutation evidence (§11 discipline).** Reverting the S1-H9 fix to its original
`creatorRows` call, disabling the S1-H10 shape check, and removing the S1-H11 method
guard produced exactly `not ok` on T-B19a, T-B19b, T-B19c, T-B20, T-B20b, T-B21 —
while **T-B19d** (the pre-write-refusal invariant) and **T-B19e** (the happy path)
stayed green. Two controls passing under a mutation that breaks six other tests is what
makes the failures attributable rather than a shared artifact. All three mutations were
reverted; the suite is green at the reverted state.

---

## 15. Round 5, pass 2 — the READ path and the LANE B containment boundary

Pass 1 took the writes. Pass 2 took the reads that touch the filesystem — the only two
parameters in the whole bridge that reach a file path — and found that the one route
whose entire job is to show a published brain had **never once returned a brain**.

### S1-H15 — `/api/brains/:slug` answered 200 with an EMPTY document (CODE, **P1, REAL**)

Measured against a bridge with a real published generation seeded in the engine's own
layout (`brains/<ns>/gen-0001/{index,topics,timeline}.md` + `brains/<ns>/current.json`):

```
GET /api/brains/fixture-brain -> 200
  keys: slug, generation, title, index, topics, timeline, claims, skipped
  slug=fixture-brain  generation=gen-0001  title=Fixture Brain
  index    = ""
  topics   = ""
  timeline = ""
```

Correct slug, correct generation, correct title, **no content** — for every published
brain, always.

**Cause.** The engine publishes into `brains/<slug>/<generation>/` and swaps
`current.json` **last** (`lib/render.mjs` `publishBrain`: `const genDir =
ensureDir(join(dir, generation)); for (const f of files) writeTextAtomic(join(genDir,
f.name), f.text);` … then `writeJsonAtomic(pointerPath(r, ns), pointer)`).
`console/lib/brains.mjs` joined `brainsDir + slug` only and then read the three literal
names — **a directory that never contains them**. The generation segment was missing.
The engine's own `listPublished` states the correct layout one file away
(`dir: join(base, ns, ptr.generation)`), which is what makes this a plain omission
rather than a misunderstanding.

**Why this is P1.** The handler's own docstring reads *"A missing pointer is a 404,
never an empty document that looks like a brain with nothing in it."* The code produced
exactly that empty document whenever the pointer **did** exist — and an empty brain is
**indistinguishable from a brain with no claims**. R6's whole acceptance criterion is
"published-generation only"; the route was published-generation **nothing**. S2's
BrainDrawer would have rendered an empty panel and the operator would have concluded
the brain had no content.

**Fix.** Join the generation from the pointer. A missing document is now **reported**
through the payload's already-present-but-always-`[]` `skipped` array — the same rule
`loadHits` already applies to a missing `rules.jsonl` — so "absent" and "empty" are no
longer the same answer.

### S1-H16 — the route's 200 path had NO coverage, which is why H15 survived (TEST, P2)

`seedStore` creates an **empty** `brains/` directory. Every `/api/brains/:slug`
assertion in the suite — `T-B7`'s surface, `bridge.routes.test.mjs`, `bridge.hy4.test.mjs`
— therefore hit the **404 branch**. The 200 path was never executed by any test, so a
handler that returned three empty strings could not fail.

This is the same shape as S1-H13 and S1-H7 before it: **the test was measuring the
refusal path while the packet's evidence table said the route was covered.** A fixture
that cannot represent a published brain cannot test one.

**Fix.** `fixtures.mjs` gained `seedPublishedBrain()`, written to the engine's real
layout (generation directory, pointer last), and `T-B7`'s invariant sweep now includes a
**live** published namespace plus the hostile forms below — not only 404s.

### Checked CLEAN — the two parameters reach the store by opposite routes, and both hold

`:slug` arrives **un-decoded** (`p.slice('/api/brains/'.length)`); `?creator=` arrives
**decoded** by `URLSearchParams`. Opposite encodings, opposite risks, so each got its
own evidence:

- **`:slug` is contained by the POINTER GATE, not by path sanitisation.** `readPointer`
  must succeed before anything is read, and it looks up a literal directory name, so
  `%2e%2e%2f`, `..%2F`, `%5C`, `%00`, the LANE B channel id and a 500-char slug all
  404. Verified across 9 hostile forms: **no canary, no registry byte**.
- **`?creator=` is a COMPARISON, never a path.** `lib/query.mjs:55` reads
  `if (creator && pub.namespace !== creator) continue;` — an exact string match against
  the namespaces `listPublished` enumerated from the filesystem. It is never joined into
  a path, so traversal payloads match nothing and return `{"hits":[],"skipped":[]}`.
  Verified: traversal, encoded traversal, `%00`, and `/etc/passwd` all → 0 hits, while
  the real namespace still returns its claim.
- **LANE B cannot leak through `brainDoc` even if the pointer gate is removed** — this
  was *tested*, not asserted. Removing the gate makes the route answer 200 for a hostile
  slug (T-B22d's 404 assertion fails, so the test bites) and it **still serves nothing**,
  because the three filenames are literals (`index.md`/`topics.md`/`timeline.md`) while
  LANE B files are `<videoId>.json`. The design holds structurally; the pointer gate is
  the second line, not the only one.
- **The query route searches LANE C only.** Querying the canary phrase, `hydraulic` and
  `manifold` — words that exist *only* in the owner-private transcript — all return 0
  hits.

### Pass 2 — verification

| Check | Result |
|---|---|
| Bridge suite | **99/99 pass, 0 fail, 3.89 s** (93 → 99: T-B22a–f) |
| Web suite | **39/39 pass** |
| `tsc --noEmit` | **0 errors** |
| Rule 4 | 0 files over (max `server.mjs` = 300) |
| LANE B containment | **0 canary hits across 20 read probes**; 9 hostile slug forms + 5 hostile `creator=` forms all refuse |
| Mutation check | generation ignored → **T-B22a/b fail**; pointer gate removed → **T-B22d fails**, T-B22a/b/c stay green |
| Engine boundary | zero engine files edited (pass 2 either) |

**One assertion had to be strengthened during mutation testing.** T-B22c originally
asserted only `skipped.length === 3`, which passes under **both** the fixed and the
broken code — a decorative assertion. It now pins the three `reason` strings, so it
distinguishes "the pointer names no generation" from "the files are missing from a
generation that was named". Recorded because it is the §11 lesson repeating: the first
draft of a guard is often not a guard.

---

## 16. Round 5, pass 3 — the UI slice, where a wrong payload blanks the console

Passes 1 and 2 took the bridge. Pass 3 took `console/web/` (16 files, 1838 lines) and asked
the one question the bridge cannot answer for it: **what does the operator see when the
payload is not the shape this build expects?**

Before this pass, the answer was: *nothing at all.*

### S1-H17 — an uncaught render throw unmounted the console and left a blank page (CODE, **P1, REAL**)

Established RED-first, with the failing test written **before** the fix (`T-W11`). Feeding
`StatusBoard` a payload it did not expect produced:

```
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: status.backlog.lines.join is not a function
 ❯ StatusBoard src/components/StatusBoard.tsx:206:67
   204|         <Label>Backlog</Label>
   205|         <Value>
   206|           {status.backlog.lines.length > 0 ? status.backlog.lines.join…
 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

**Uncaught** — and there was **no error boundary anywhere in the tree**, verified by grep
across the whole web slice rather than by reading one file. `main.tsx` rendered `<App/>`
straight into `createRoot`, so React 18 unmounted the entire root: **no status, no message,
no clue which field was wrong.** The console simply goes white.

**Why this is P1.** `console/web/dist/` is a **build artifact**, and the bridge that serves
it is **versioned separately**. "The payload has a shape this build never saw" is therefore a
*supported* state, not a hypothetical — and its failure mode was total loss of the UI rather
than a named refusal. R2/R3 exist precisely so the operator can tell "we could not read this"
from "this is zero"; a blank page is the worst available answer to both.

**Why it survived four review rounds.** Every fixture in `adapters/fixtures.ts` is typed
`StatusInstrument`, so TypeScript made a wrong-shaped payload look *impossible* — and
`StatusBoard`'s ~13 unguarded dereferences (`status.creators.damaged`, `status.ytdlp.ok`,
`status.budget.used`, `status.census.inFlight.length`, `status.recentRuns.length`, …) were
never exercised with anything else. **The type system was the only guard, and it does not
run at runtime.** This is the round-5 pattern once more: a guard correct only under an
assumption made elsewhere — here, that the bundle and the bridge always agree.

**Fix — two layers, deliberately separate.**

1. **`adapters/validate.ts` (new) + `LocalEngineAdapter.getStatus()`** — the *primary*
   defence, at the seam. A 200 of the wrong shape becomes a typed `ConsoleApiError` naming
   the offending paths, which `useStatus` already catches into `phase: 'error'`, which
   `StatusBoard` already renders as its refusal banner. **The board stays up and the next
   poll can still recover it** — self-healing, for free, because the existing error path
   already worked. What was missing was only the *check*.
2. **`components/ErrorBoundary.tsx` (new)**, mounted twice — inside `App` around
   `StatusBoard`, and in `main.tsx` around `<App/>`. The *last resort*, for what layer 1
   cannot see: a non-validating adapter (the mock, or a future one) and any render throw
   nobody predicted.

**The boundary latches, and that is a decision, not an oversight.** A boundary that cleared
itself on the next poll would re-throw on **every** poll, forever, against a payload that is
not going to change — a render-throw loop every 5 s in place of one clean refusal. It
refuses once, names the fault, and tells the operator to reload. The self-healing belongs to
layer 1, and it is there.

**The inner boundary is mounted INSIDE the shell.** That is what keeps the header and the
page alive, and it is asserted: T-W11a requires `document.body.textContent` to still match
`/Creator Brains Console/` while the fault panel is showing.

### S1-H18 — the adapter seam cast the body instead of checking it (CODE, P2, REAL)

`LocalEngineAdapter.request` ended:

```js
if (!res.ok) throw mapBridgeError(res.status, body);
return body as T;                     // ← an unchecked cast
```

Every method inherited it, so a 200 whose body was not the contract was **indistinguishable
from a good reading** all the way down to the component. S1-H17 is what that costs when the
component dereferences deeply.

**Scope, stated rather than implied.** Only `/api/status` is validated, because
`StatusBoard` is the only component in S1 that dereferences a payload at all. The other
eight routes return values no S1 component reads; a validator for them would be
**unexercised code asserting a contract nobody depends on yet**, which is the thing this
review keeps finding. They are named as follow-ups instead of written blind. The remaining
`as T` cast is annotated in place so the next reader cannot mistake it for a reviewed line.

**The drift direction is safe, and that is why a shape declaration is acceptable here.**
This repo treats a second statement of the payload as a hazard (status.mjs header, blueprint
H10) — but this one **cannot fabricate a value**: it asserts presence and broad type only.
Adding a field to the bridge leaves the guard passing (undeclared keys are allowed, so the
console stays forward-compatible); **removing or retyping** one fails the guard loudly, which
is exactly the change that used to blank the console. Optionality was read off `status.mjs`
rather than guessed: `census.error` is the one conditional field and is `opt`; `ytdlp.version`,
`throttle.until`, `lock.pid` and `lock.alive` are left undeclared because `StatusBoard` reads
each behind a `??` or a truthiness test and none of them can throw.

### A copy inaccuracy the fix exposed (CODE, P3)

`StatusBoard`'s no-instrument banner read *"The bridge did not answer, so no instrument can be
shown."* That was true when a missing instrument could only mean a transport failure. With
layer 1 in place it is **false for the case the banner now most often reports** — the bridge
did answer, with a body the console cannot read. Corrected to name both causes. Small, but
the whole point of R3 is that the console does not tell the operator something untrue about
what it knows.

### Checked CLEAN (recorded so the next seat does not re-litigate it)

- **`pct()` / `videos.coverage` is NOT a finding.** `pct` calls `.toFixed(1)` on
  `n * 100`, which yields `"NaN"` for a non-number rather than throwing — ugly, but not a
  crash, and `summary.mjs:36` always produces a number. Deliberately **not** manufactured
  into a finding; the temptation to pad a hostile review with a plausible-looking non-issue
  is exactly how a real one gets buried.
- **No partial payload is reachable from today's bridge.** Every top-level key in
  `status.mjs`'s return (lines 92–153) is unconditional — the only conditional *field* is
  `census.error`. So the guard is not defending against a shape the current bridge emits; it
  defends against a **different build** of the bridge, which is the real risk (see S1-H17).
- **`useStatus` already handled the failure path correctly.** Its `catch` sets
  `phase: 'error'` while keeping the previous reading, and the S1-H4 watchdog guarantees the
  in-flight latch always releases. Nothing needed to change there; layer 1 simply gives it
  something to catch.

### Pass 3 — verification

| Check | Result |
|---|---|
| Web suite | **48/48 pass** (39 → 48: T-W11a–i, 9 new) |
| Bridge suite | **99/99 pass, 0 fail, 4.45 s** (unchanged — no bridge file touched this pass) |
| `tsc --noEmit` | **0 errors** |
| `npm run build` | clean — 51 modules, 184.68 kB js / 61.57 kB gzip |
| Rule 4 | 0 files over. `validate.ts` 162, `payload-shape.test.tsx` 158, `ErrorBoundary.tsx` 121, `StatusBoard.tsx` 267, `server.mjs` 300 |
| Mutation check | 3 guards mutated → **orthogonal** failures, 2 controls green under each (below) |
| Engine boundary | **zero engine files edited** (pass 3 either) |
| LANE B | no read path changed this pass; containment untouched |

**Mutation evidence (§11 discipline).** Each mutation was applied, observed, and reverted.

| Mutation | Tests that failed | Tests that stayed green |
|---|---|---|
| `backlog: obj({ lines: arr(str) })` → `obj({})` | **T-W11e only** (1) | the 8 others, incl. both healthy controls |
| `recentRuns` deleted from `STATUS_SHAPE` | **T-W11f only** (1) | the 8 others |
| `getDerivedStateFromError` returns `{ error: null }` | **T-W11a, b, c, g** (4) | **T-W11d, e, f, h, i** — every validator case and both controls |

The third row is the one that matters: disabling the boundary failed **exactly** the four
boundary-dependent tests while **every** validator test and **both** healthy-payload controls
stayed green. That orthogonality is what makes the two layers separately attributable rather
than one mechanism wearing two names.

**One coverage limit, stated plainly.** `main.tsx`'s mount point is not itself rendered by
any test — the test file renders `<App/>` directly, as every other test in this slice does.
What *is* tested is the **mechanism**: T-W11g renders the boundary around a component that
throws on sight and requires the fault panel to appear with the thrown message. So the
boundary's behaviour is proven; the second *mount* is defence in depth whose correctness
rests on the same proven mechanism. Recorded rather than left to look covered.

**A process trap worth writing down.** Two `Edit` calls issued against the **same file** in
one batch both read the original, and the second write clobbered the first — the
`ErrorBoundary` import vanished from `App.tsx` while the JSX edit landed, producing a
`ReferenceError: ErrorBoundary is not defined` that looked like a build problem and was a
lost update. Same-file edits must be issued **sequentially**. It cost one test cycle; it
would cost a lot more in a file where the lost half was the guard rather than the import.

---

## 17. Round 5, pass 4 — the request body and the instance guards

Pass 4 took the one input path every write route shares, plus both pid guards. The instance
guards came back **clean**. The body path produced a finding that is **real, measured, and
deliberately NOT fixed** — the first of those in this round, and the reasoning is recorded
in full because a declined finding is only honest if the trade is written down.

### S1-H19 — an oversized body is refused safely, but the client cannot READ the refusal (CODE, P3, REAL, **accepted not fixed**)

`readBody` has a 64 KB ceiling, and it holds: memory stays bounded (at most `limit` plus one
chunk is ever buffered) and the process survives everything thrown at it. The defect is
narrower and different: **the refusal does not always reach the client.**

Measured against a live bridge over raw sockets — because `fetch` and `node:http.request`
will not declare a `Content-Length` they do not intend to honour, so they cannot construct
this case:

| Body | Client sees |
|---|---|
| 65 537 B | `400 {"error":{"code":"VALIDATION","message":"request body too large"}}` |
| 128 KB | same 400 |
| 192 KB | same 400 |
| 256 KB | same 400 |
| 512 KB | same 400 |
| **1 MB** | **`ECONNRESET`, no response** |
| **4 MB** | **`ECONNRESET`, no response** |

`GET /api/status` answers 200 after every one of them, so the bridge is never harmed.

**Mechanism (measured, not inferred).** The threshold tracks the **socket buffer**, which is
what identifies the cause: the `throw` inside `for await` destroys the request stream, so if
the client is still *writing* when the limit trips, the kernel answers with RST and the
response — which the bridge does write — is discarded in flight. Below the buffer the whole
body has already landed, so the same code path delivers cleanly.

**Three candidate fixes, all measured against a minimal server** so the answer is about the
transport rather than about the bridge:

| Strategy | 1 MB | 4 MB |
|---|---|---|
| respond and end, no drain *(what the bridge does today)* | 400 | ECONNRESET |
| respond, then destroy after flush | ECONNRESET | ECONNRESET |
| **drain-and-discard up to a cap, then respond** | **400** | **400** |

**Why it is not fixed.** Only draining works, and draining means the bridge **reads an
arbitrary volume from a hostile client and throws it away** — trading a real hardening
property (the memory/bandwidth bound) for a better error message on a path the console
cannot reach, since the UI's largest body is a creator reference. That trade is the wrong way
round. **An up-front `content-length` check was also measured and rejected:** it only moves
the threshold to 4 MB (strategy 1 above still resets there), leaving the class intact, and it
would place a second enforcement site beside `readBody` — contradicting that function's own
stated reason for existing ("this is the one function that owns what a body may be"). A guard
that shifts a threshold without removing a failure mode is the exact shape this review keeps
finding, and adding one here to look thorough would be the wrong lesson to take from it.

Recorded in `lib/http.mjs` at `readBody`, with the numbers, so the next seat does not
re-litigate it — and so nobody mistakes it for an oversight.

### Checked CLEAN — the instance guards, and four framing paths that had no coverage

- **Both pid guards already refuse garbage correctly.** `console/lib/instance.mjs:57` and the
  engine's `lib/lock.mjs:72` each open with `if (!Number.isInteger(pid) || pid <= 0) return
  false`, so a pid file containing `abc`, `-1`, `0`, `null` or `1e999` is judged **not alive**
  and reclaimed rather than raising. A `process.kill` on a garbage pid would have thrown
  `ERR_OUT_OF_RANGE` — the S1-H1 shape — and it cannot. `readLock` additionally treats an
  unparseable lock file as `{ambiguous: true}` rather than absent, which is the correct
  direction. The only residue is cosmetic: `Number.isInteger("1234")` is false, so a pid
  stored as a *string* would be reported `(dead)` while held. The engine writes a number.
- **Four framing paths had no test at all** and now do (T-B23). Every existing body test used
  a small, well-formed, content-length-framed, valid-UTF-8 body. Unmeasured until now: a body
  **at** the ceiling (proving the boundary is `>` and not `>=`), a body over it, a **chunked**
  body with no `content-length`, a body that is **not valid UTF-8**, and a POST with **no
  body**.
- **A truncated body is handled by Node's parser, not by the envelope.** Declaring
  `Content-Length: 100` and sending 10 bytes with FIN gives `400` with an empty body — that
  is Node's own HTTP parser rejecting the incomplete message, below the application layer.
  Same for a negative `content-length`, a garbage chunk size, and a `content-length` smaller
  than the bytes actually sent. All four are correct and none of them is the bridge's to fix.
- **Invalid UTF-8 is a 400, not a 500.** `Buffer.toString('utf8')` maps the bad bytes to
  U+FFFD, `JSON.parse` then fails, and the route answers the documented envelope.

### Pass 4 — verification

| Check | Result |
|---|---|
| Bridge suite | **105/105 pass, 0 fail, 5.03 s** (99 → 105: T-B23a–f) |
| Web suite | **48/48 pass** (unchanged) |
| Rule 4 | 0 files over. `http.mjs` 242 → **266**, `server.mjs` 300, `validate.ts` 162 |
| Mutation check | 2 mutations → **exactly one test each, complementary** (below) |
| Engine boundary | **zero engine files edited** (pass 4 either) |
| Oversized-body survival | bridge serving `200` after every hostile body, incl. 4 MB |

**Mutation evidence (§11 discipline).** The two mutations are *complementary*, which is what
makes them evidence rather than noise:

| Mutation | Fails | Stays green |
|---|---|---|
| the ceiling check deleted outright | **T-B23b only** | **T-B23a** (the control — a 64 KB body still reaches `validateRef`) |
| `size > limit` → `size >= limit` | **T-B23a only** | **T-B23b** |

Deleting the guard fails the over-limit case and leaves the at-limit case passing; flipping
the comparison fails the at-limit case and leaves the over-limit case passing. Neither
mutation can be satisfied by a test that is not measuring the boundary, and together they pin
it from both sides.

**One assertion recorded as mutation-equivalent rather than silently kept.** T-B23f pins that
a POST with no body is a **400, never a 500** — a real contract. But the obvious mutation
(`return {}` → `return null` for zero chunks) does **not** fail it, because `validateRef`
rejects `null` and `undefined` with the same message. The comment says so. An assertion whose
mutation is equivalent is worth knowing about rather than discovering later.

---

## 18. Round 5, pass 5 — the meta-pass: can every guard fail?

Passes 1–4 each mutation-verified **their own** new guards. That leaves the guards from
rounds 1–3, which were written before the discipline existed. Pass 5 asked the question
directly of them, in two stages: does every test assert anything at all, and does every
*load-bearing* guard have a test that fails when it is broken?

### Stage 1 — the mechanical scan: is any test assertion-free?

All 105 bridge tests and the web suite were split on their test registrations and counted for
assertions. **Seven bridge tests contain no `assert.` call** — and all seven are false
positives of the scan: they assert through throwing helpers (`assertCaught`,
`assertNoTranscriptFields`, which raise `AssertionError` internally). Notably the leak guard
already carries its own **META test** ("the detector fires on a real leak and spares real
prose"), which is precisely the discipline this pass exists to enforce.

**Result: zero decorative tests by this measure.** Recorded because a scan that finds nothing
is only reassuring if the method is stated.

### Stage 2 — a mutation sweep over the PRE-EXISTING guards

Four load-bearing guards from rounds 1–3, one mutation each, the **full** suite run for each,
the file restored from an in-memory copy and byte-verified. The sweep refuses to run at all
if the baseline is not green, and each anchor must occur exactly once.

| Mutation | Caught by |
|---|---|
| **M1** `hostAllowed` always allows (DNS-rebinding defence off) | **5 tests** — HY4-H4 ×4, T-B18b |
| **M2** `resolveStatic` containment check removed | **NOTHING** — 105/105 green |
| **M3** `parseRequestUrl` no longer catches (the `GET //` crash path) | **2 tests** — T-B18a, T-B18c |
| **M4** `/api/status` carries a 50 000-char transcript-like field | **1 test** — HY4-H5 (INVARIANT) |

M1, M3 and M4 are healthy: the guards that protect the bridge are pinned by tests that bite.
**M2 is the interesting one**, and chasing it produced this pass's finding.

### S1-H20 — T-B12 could not fail, for two independent reasons (TEST, P3, REAL)

M2 removed the containment check from `resolveStatic` and **no test noticed**. The natural
reading — "traversal is untested" — is wrong, and establishing that required three separate
measurements:

1. **The live server never receives a `..`.** `parseRequestUrl` runs `new URL(rawUrl, base)`,
   which normalises dot-segments before anything else sees the path. Measured over a raw
   socket: `GET /../package.json` reaches `resolveStatic` as `/package.json`.
2. **The two resolver guards are mutually redundant.** With the containment check removed,
   `normalize()`'s dot-segment collapse still refuses all 15 hostile forms probed. With
   `normalize()` removed, the containment check still refuses them. **Neither single mutation
   is observable**, because each covers the other.
3. **The property IS covered — by HY4-H3.** Removing *both* resolver guards does get caught:
   `104/105`, and the single failure is `HY4-H3: static containment holds against a real
   document root`, which builds a temp document root containing a real file **inside** it and
   a real file **outside** it. That test is the one that can fail, and it does.

So this was **not** a coverage hole, and recording it as one would have been a false finding.
What *is* real is that **T-B12 was vacuous**, for two reasons that each independently made it
unfailable:

- **It could not construct its own attack.** It used `getRaw`, which is `fetch` — and `fetch`
  builds a `URL`, which normalises `/../` away **client-side**. `GET /../registry.json` left
  the test process as `GET /registry.json`. This is the same trap `fixtures.mjs` already
  documents for forbidden headers: *a test that cannot construct its own attack proves
  nothing.*
- **Its assertion was satisfied by any 404.** `!text.includes(CH_ONE)` against paths that
  resolve to files which do not exist beside `web/dist`. An unresolved static path answers
  **200 + the bridge page** (`server.mjs:165`), and the bridge page contains no channel id.

**Fix.** T-B12 now sends a **raw request line** — the only way a `..` reaches the wire — and
asserts two things: that the traversal target reaches neither the store nor a file outside
`dist`, and that it is **byte-identical** to the same target as URL parsing alone would
produce. That second assertion is the invariant that actually protects the live server, and it
is the one that can fail: with all three layers broken it fails, and **it is the only test
that does** (measured: 5/6 in the boundary suite, T-B12 the sole failure).

**The comment on the test now states the limit rather than hiding it.** T-B12 is *not* claimed
as mutation-observable, because no single-line mutation can make it fail — three mutually
redundant layers defend that path, and that is a property of the design, not a defect. The
resolver-level property is HY4-H3's job, and the comment says so, so the next seat does not
re-derive this.

**A correction that belongs in the record.** My first reading of M2 was "the traversal guard
has no coverage" — a P2-class finding, and wrong. It survived only until I measured HY4-H3
against the double mutation. The sweep's value came from the *discipline of checking the
reading*, not from the reading itself; a single-guard mutation that nothing catches is
evidence about **redundancy**, and it is not evidence about coverage until you have tried
breaking the other guards too.

### S1-H21 — the traversal test was squatting on another test's ID (DOC/ID, P3, REAL)

Found while rewriting T-B12, and independent of it: **`T-B12` named two different tests.**
`06-test-plan.md:26` reserves T-B12 for the **S7 snapshot verification** (per-file SHA-256s
against the recorded manifest, mapped to R15), and `readiness.json` carries a matching T-B12
row with status `NOT RUN`. The traversal test in `bridge.boundary.test.mjs` used the same ID.

The damage is traceability, which is the one thing this packet's gate exists to provide: the
gate's row and the code's test agreed on a name and on **nothing else**, and the traversal
property was traced to **no requirement at all** — it appears in neither R13's nor any other
row. A reader following T-B12 from the plan would have landed on the wrong test, and a reader
following it from the code would have concluded S7's snapshot verification was implemented.

**Fix.** Renumbered to the next free ID, **T-B24**, and traced to **R13** alongside T-B23. The
plan's T-B12 keeps its S7 meaning; the historical note in `bridge.hy4.test.mjs` names both IDs
so the earlier review's language still resolves. Recorded because an ID collision is exactly
the kind of defect a green suite cannot see.

### Pass 5 — verification

| Check | Result |
|---|---|
| Bridge suite | **105/105 pass, 0 fail, 4.39 s** |
| Web suite | **48/48 pass** (unchanged) |
| Rule 4 | 0 files over. `http.mjs` 266, `bridge.boundary.test.mjs` 208, `server.mjs` 300 |
| Assertion scan | 105 + 37 tests; **0 assertion-free** (7 candidates, all helper-based) |
| Mutation sweep | 4 mutations, baseline-gated, each restored **byte-identical**, final baseline re-checked green |
| Engine boundary | **zero engine files edited** (all five passes) |
| Sweep safety | refuses to run on a non-green baseline; aborts if any file fails to restore |

---

## 19. The `server.mjs` split — clearing S2's structural blocker

Not a hostile finding: a **remediation** of one this packet had been carrying since S1-H11,
and the last item on the round-5 work list.

### The blocker

`server.mjs` sat at **exactly 300 lines** — the repo's hard cap (CLAUDE.md rule 4) with
**zero headroom**. S1-H11's fix had to be written *net-neutral* to fit, which is the point at
which a cap stops describing the code and starts distorting it. S2 could not add a route
without either breaching the cap or making an unrelated cut, so `nextSlice` recorded a
decision for Sean: split, or raise the cap. **Raising it was never the right answer** — it is
a repo-wide governance change (`CLAUDE.md` rule 4), and the file was genuinely two things
wearing one name.

### The split

On the seam `server.mjs`'s own docstring already named — *"the ROUTE TABLE and the process
lifecycle, and nothing else"*:

| | Before | After |
|---|---|---|
| `server.mjs` | **300** | **244** — lifecycle: construction, the Host gate, the parse, the envelope, listen/shutdown, browser open, CLI entry |
| `routes.mjs` | — | **131** — the route table, the named 404, the static fallback, `BRIDGE_PAGE` |

**Two gates deliberately stayed in `server.mjs`.** The Host check runs *before* the route
table and the envelope wraps *around* it, so neither is reachable by — or visible to — any
individual route. Keeping both there makes that structural rather than conventional, and it
means the DNS-rebinding defence cannot be bypassed by adding a route. `parseRequestUrl` also
stayed, because it must run inside the `try`; that placement **is** the S1-H8 fix.

### The one real risk, and what was done about it

`HY4-H6` reads the dispatch table **as text** and compares the extracted routes against a
declared allowlist — the check that makes R9 ("no dangerous route may appear unnoticed")
reviewable rather than decorative. Moving the table would have left a hole big enough to drive
that check through: a route added back into `server.mjs` would be dispatched by the bridge and
invisible to the test.

**So the extractor now reads `routes.mjs` AND `server.mjs`, concatenated** — strictly stronger
than before, since it previously read one file and now reads the whole bridge. Verified by
mutation: adding `GET /api/danger` to `server.mjs` turns `HY4-H6` red with *"the bridge
dispatches routes that are NOT in the S0 allowlist: GET /api/danger"*.

### Verification

| Check | Result |
|---|---|
| Bridge suite | **105/105 pass, 0 fail, 4.61 s** — unchanged by the move |
| Web suite | **48/48 pass** |
| `tsc --noEmit` | **0 errors** |
| `npm run build` | clean |
| Rule 4 | largest console source is now **283** (`health.history.test.mjs`); `server.mjs` **244**, `routes.mjs` **131** — the cap is no longer binding anywhere |
| Allowlist check | reads both files; **mutation-verified** to catch a route added to either |
| Engine boundary | **zero engine files edited** |

**What this unblocks.** S2 no longer needs a cap decision, and S1-H11's net-neutral constraint
is gone. **S1-H12 remains the blocker for the add UI** — `POST /api/creators` still resolves
through `execFileSync` and freezes the bridge's only thread (measured 1577 ms, ceiling 180 s).
That one needs an engine change and is Sean's call.




