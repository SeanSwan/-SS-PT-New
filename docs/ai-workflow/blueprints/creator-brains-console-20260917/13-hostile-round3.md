# 13 — Hostile review round 3 (dry-loop) — Creator Brains Console

- **Date:** 2026-09-18 · **Seat:** builder adversarial pass (no external seat spent) · **Scope:** the surfaces rounds 1–2 never touched — the HTTP layer, the instance guard, the LANE B read path, and a full re-audit of round 2's own fixes.
- **Verdict: REVISE** — 1 new code defect (P2, real, reachable from the S7 embed), 1 measurement defect of my own, 1 doc correction. **The loop ran dry on every other surface.**

---

## 1. H3 — the single-instance guard does not hold within a process (CODE, P2, REAL)

**Where:** `server.mjs` + `lib/instance.mjs`

`lib/instance.mjs` promises that "one console at a time" is *"a property of the system rather than a convention Sean has to remember."* That promise was not true at the layer that actually matters.

`claimInstance` deliberately lets the **same pid re-claim** — it must, or a restart inside one process would be impossible, and `bridge.hy4.process.test.mjs` asserts exactly that. But the consequence was never traced to the caller. Measured:

```
bridge 1: http://127.0.0.1:50671
bridge 2: http://127.0.0.1:50672
RESULT: TWO bridges on ONE store (lost-update window open)
```

Two live bridges, one `registry.json`, two writers, no transaction — **precisely the silent lost-update the module exists to prevent.** The pid file stops a second *process*; nothing stopped a second *call*.

**Why this is not theoretical:** slice **S7** embeds the bridge in SwanGuard. An in-process host is exactly the caller that can invoke `startBridge` twice — a retry, a hot reload, a module initialised twice.

**Fix:** a process-local registry keyed by store root, complementary to the pid file:

| Guard | Stops |
|---|---|
| pid file (`O_CREAT\|O_EXCL`) | a second **process** (a second `.cmd` click) |
| in-process registry | a second **call** (retry / reload / double-init) |

The claim is made **synchronously, before the first `await`** — doing check-then-register across the async `listen` would reproduce the very check-then-act shape `openSync(…,'wx')` was introduced to kill. The handle object is mutated in place so its identity stays stable for the shutdown ownership comparison.

**The failure mode I had to design against:** turning the guard into a *lockout*. Both escapes must still work, and both are pinned:
- a restart after a clean shutdown,
- a retry after a **failed** bind.

Regression: `test/bridge.inprocess.test.mjs` (5 tests, **T-B16**), including a `Promise.allSettled` race asserting **exactly one** of two concurrent starts wins.

---

## 2. H4 — my own line-count measurement was wrong (MEASUREMENT, REAL)

While adding the guard, `server.mjs` went to 312 lines and the rule-4 test failed — correct. But when I then measured with `awk` I got **300** while the test reported **301**. My `awk` was double-subtracting: `awk END{NR}` already excludes the trailing empty record, so subtracting 1 again under-counts by one.

**Consequence beyond this file:** the "largest canonical: `health.history.test.mjs` **282**" figure I wrote into `11-hy4-review.md` was wrong; the true canonical count is **283**. Corrected in `11 §5` and `12 §8`. All later measurements use the repo's canonical `lineCount` (from `consistency-check.mjs`) rather than shell arithmetic.

Final state: **21 files, 0 over 300**, largest = `server.mjs` at exactly 300.

---

## 3. Surfaces that came back CLEAN (attacked, not assumed)

This is the substance of a dry-loop pass: what was tried and did **not** break.

### 3.1 Static-file traversal — 20 payloads, 0 escapes
`resolveStatic` containment held against every encoding I could construct: `../`, `..%2f`, `%2e%2e%2f`, `....//`, backslash and `%5c` variants, `//server/share` UNC, `C:/Windows`, `D:/`, null-byte injection (`%00`), `..;/`, and mixed separators. Containment is checked on the **resolved absolute path**, which is the only formulation that survives symlinks and Windows separators — and it does.

### 3.2 DNS-rebinding gate — 13 hostile Host values, 0 bypasses
Refused: `evil.com`, `127.0.0.1.evil.com`, `localhost.evil.com`, `127.0.0.1.attacker.net`, wrong port, missing port while the port is known, empty, absent, `0x7f.0.0.1`, and decimal `2130706433`. Fail-closed on a missing Host. `localhost` is correctly **allowed** (it is loopback by RFC 6761 and cannot be rebound) — my first probe listed it as "bad", which was a probe error, not a finding.

### 3.3 Live end-to-end — 24/24
Against a booted bridge on a temp store: oversized ref, malformed JSON, empty ref, 70 KB body (limit 64 KB), `enabled:"true"` as a string, empty/5000-char/absent `q`, and `restore`/`rollback`/`authorize`/`run/daily`/`repair` all **404**, `OPTIONS`/`DELETE` **404**. No error body leaked an absolute path. The LANE B canary never appeared.

### 3.4 LANE B read path — 15 slug payloads + 4 creator filters, 0 leaks
`brainDoc` held. Note the module's claim is narrower than it reads: the **file names** are literals (safe), but the **slug** is joined, so containment rests on `readPointer` refusing traversal — which it does. Worth stating explicitly, because the docstring implies the literal filenames alone are the guarantee.

Two 200s in my probe were artifacts of **URL normalization in the client** (`new URL('/api/brains/../../registry.json')` → `/registry.json` → falls through to the static handler's status page). Not a server behaviour.

### 3.5 The H8 class is fully closed
Grepped every console module for blocking subprocess calls: the **only** `execFileSync`/`spawnSync` in the composed graph is `ytdlp.mjs` (the health probe), and `selfCheck` is now imported by exactly one file — `health.mjs`, behind the TTL cache. `server.mjs` uses async `execFile` (browser open). `status.mjs` calls `healthReading` at both of its call sites (lines 64, 169). **No second instance of the round-1 P1.**

---

## 4. Verification

```
node --test scripts/creator-brains/console/test/*.test.mjs
# tests 81 / pass 81 / fail 0   (~10 s)
```

| Check | Result |
|---|---|
| Console suite | **81/81 pass, 0 fail** |
| Rule 4 (300-line cap) | 21 files, **0 over** (max 300) |
| Readiness gate | `structurallyReady: true` |
| Engine boundary | `?? scripts/creator-brains/console/` only — zero engine files touched |
| Static traversal | 20/20 refused |
| Host gate | 13/13 hostile refused, legit allowed |
| Live HTTP surface | 24/24 correct |
| LANE B read path | 19/19 no leak |

## 5. Dry-loop statement

Three rounds, **nine code/receipt defects found and fixed** (H1–H8 across rounds 1–3 plus receipt F2–F4). Round 3's remaining surfaces — traversal, Host gate, live validation envelopes, slug handling, blocking-call audit — produced **no new findings** across 76 adversarial inputs. The one real defect found (H3) was in a class round 2 had no reason to look at: the guard's own contract, tested at the wrong layer.

**Residual risks carried forward, stated rather than hidden:**
- **Pid reuse** (`instance.mjs` header): the guard checks the pid is *alive*, not that it is the *same* process. No portable Windows fix without job objects. Unchanged.
- **F4** (open, needs Sean): the engine baseline is cited as 136/136, 191, 182/189 and 185 across four docs. Which is the baseline of record is an engine-lane decision.
- **C1** (open, needs Sean): under CD3 the "lazy" three chunk is not lazy — perceived initial load is ~1.4 MB.
