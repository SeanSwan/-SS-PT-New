# 11 — HY4 hostile review & remediation — Creator Brains Console (S0 bridge)

- **Date:** 2026-09-17 (review), 2026-09-18 (remediation verified) · **Seat:** HY4 (`tencent/hy4-preview` via the council transport) · **Scope:** S0 bridge — `scripts/creator-brains/console/**`
- **Verdict from HY4: REVISE** — 7 findings, no blocker, all shippable-with-fixes.
- **Final state: all 7 closed + 1 additional defect found during remediation. Console suite 65/65 green; engine untouched.**

## 1. Spend (provider-actual, honest)

| Call | Outcome | Cost |
|---|---|---|
| HY4 attempt 1 | transport failure, no model output | **$0.0000** (recorded `usd: 0`) |
| HY4 attempt 2 | review delivered | **$0.056305735** |
| **Total billed** | | **$0.0563** |

The earlier note of "$0.1131 total" in the working log double-counted: the first attempt produced no billable output. The ledger (`.ai-workflow/spend/ledger.jsonl`, topic `hy4-review-packet`) is the authority — one $0 row and one $0.0563 row. Recorded via `recordSpend()`.

## 2. Findings and dispositions

| # | Finding | Class | Disposition | Regression test |
|---|---|---|---|---|
| H1 | pid-file claim is a read-then-write race — two bridges can both "claim" the slot | REAL | `claimInstance` now creates the pid file with `openSync(path, 'wx')` (`O_CREAT\|O_EXCL`); the create IS the lock. A loser gets `EEXIST` and refuses naming the holder. | `bridge.hy4.process.test.mjs` (6 tests) |
| H2 | If `listen` fails after the slot is claimed, the pid file leaks and blocks every future start | REAL | `startBridge` releases the instance in the bind's `catch` before rethrowing. | `bridge.hy4.process.test.mjs` |
| H3 | The traversal test was vacuous — it asserted a 404 for a path that never reached the resolver | REAL | Replaced with a test that drives a real encoded-traversal path through `resolveStatic` and asserts containment outside `WEB_DIST`. | `bridge.hy4.test.mjs` |
| H4 | **DNS rebinding** — a remote page can make Sean's browser a client of a no-auth loopback write API | REAL | `hostAllowed(host, boundPort)` runs before ANY handler (reads included) and 403s a non-loopback or wrong-port `Host`. Port is resolved per-request from the live server so the exact bound port is enforced on the normal `port: 0` path. | `bridge.hy4.test.mjs` |
| H5 | Fixture-grep leak test was keyword-based and both over- and under-fired | REAL | Rewrote as `test/leak-guard.mjs`: shape-based detection (transcript container names + cue-shape recognition `{tStartMs,text}` + prose-length heuristics). A META test proves it catches a renamed leak (`items: [{tStartMs,text}]`) while sparing contract-pinned prose (`throttle.text`, `backlog.lines`, LANE C claim rows). | `bridge.hy4.test.mjs` + `leak-guard.mjs` META |
| H6 | Plan declared routes the code does not implement (`POST /api/run/daily`, `/api/repair`, `/api/backup`) | REAL (doc drift) | **Document half** — 05 §2 and 08 S0 amended to the implemented nine-route allowlist with the writes deferred to S3/S4 (this change). **Code half** — the positive allowlist test pins the exact route set, so an unplanned route fails CI rather than passing unnoticed. | `bridge.hy4.structure.test.mjs` |
| H7 | Line counts cited in the packet did not match the files | REAL | Adopted the repo's canonical `lineCount` from `consistency-check.mjs` (subtract the trailing newline). All 18 console `.mjs` files are under the 300-line cap. | `bridge.hy4.structure.test.mjs` |

## 3. Additional defect found during remediation (not in HY4's report)

| # | Defect | Evidence | Fix |
|---|---|---|---|
| H8 | **Per-request blocking probe.** `statusInstrument` and `canaryState` each called `selfCheck()` — which shells out to `yt-dlp --version` — on every request. Measured **3439 ms cold / 1809 ms / 1742 ms warm**. With S4's 2-second polling this would saturate the bridge's single thread and spawn roughly 900 processes per daily pass. | `probe-h2b.mjs`: `canary fetch -> 200` in `3784ms` | New `lib/health.mjs`: a 60 s TTL cache over the probe, with **provenance** (`checkedAt`/`ageMs`/`source`/`stale`/`note`) so a cached reading never masquerades as an instant one. When the live probe fails, the reading falls back to the last `canary.json` history entry and says so. Also fixed `canaryState()` being called with no store root, which made the history fallback dead code. | `health.test.mjs` (cache mechanics) + `health.history.test.mjs` (fallback + route wiring) |

## 4. Two self-inflicted test defects (the lesson: run the test)

Both of these were caught only by **executing** the tests — neither was visible by reading the diff.

| Defect | Why it happened | Fix |
|---|---|---|
| The H4 attack test failed `200 !== 403` — the bridge *looked* vulnerable | **undici silently overrides a `host` header.** `fetch(url, {headers:{host:'evil.com'}})` reached the server with `Host: 127.0.0.1:<port>`, so the test could not construct its own attack. | Added `rawRequest()` to `test/fixtures.mjs` built on `node:http.request`, which puts the hostile value on the wire. Verified: raw result `{"sawHost":"evil.com"}`. (undici treats `host` as a forbidden header name; `node:http` does not.) |
| H7 reported the test file itself at 329 lines | The test used `text.split('\n').length`, which counts the phantom trailing element after a final newline. | Copied the repo's canonical `lineCount` verbatim, with a comment recording that the first version "invented a defect that did not exist". |

Three further health-test failures were all **wrong assertions, not wrong code** — e.g. asserting a 60 000 ms boundary is "inside" a `< ttlMs` window (it is not), and expecting 5 probes over 300 s when the correct count is 6. Each was corrected against observed semantics.

## 5. Verification receipt

```
node --test scripts/creator-brains/console/test/*.test.mjs
# tests 65 / pass 65 / fail 0   duration_ms 8802
```

- All 18 console `.mjs` files under the 300-line cap (largest canonical: `health.history.test.mjs` 282). **Corrected 2026-09-18:** the true canonical count is **283**, and the file count is now 21 after round 2 and round 3 added three test files. The 282 figure came from an `awk`-based count that double-subtracted the trailing record; the repo's canonical `lineCount` is authoritative and the `bridge.hy4.structure.test.mjs` cap test now measures every file.
- **Engine boundary intact:** `git status --porcelain scripts/creator-brains/` → only `?? scripts/creator-brains/console/`. Zero engine files modified; the console is purely additive.
- Engine baseline: 182/189 pass with **1 pre-existing load-sensitive flake** (`HR14f` concurrency) — verified NOT caused by this work: it passes 6/6 in isolation across 3 runs, and no engine file was touched.

## 6. Note on test-isolation artifacts

The 18-second durations seen earlier were an artifact of the `enumerate-tests.mjs` harness double-importing the test file, not real cost — plain `node --test` runs the same suite in **4.3 s**. Also recorded: in Git Bash, `node --test <dir>/` fails `MODULE_NOT_FOUND` because the trailing slash is stripped; use the glob form `"scripts/.../test/*.test.mjs"` with `MSYS_NO_PATHCONV=1`.
