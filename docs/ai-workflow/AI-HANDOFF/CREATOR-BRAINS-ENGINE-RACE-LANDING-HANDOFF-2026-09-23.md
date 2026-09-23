# Creator Brains engine — race landing handoff (F01–F04)

**Date:** 2026-09-23
**Branch:** `creator-brains-engine-r2-20260915`
**Scope:** the lost-update class Astra r1 found in the catalog mutation paths.
**Review of record:** `ASTRA-S1H12-LOCK-REVIEW-PACKET-r1.md` → `ASTRA-S1H12-LOCK-REVIEW-REPLY-r1.md`

This document exists because **two of the four findings are not in this commit**, and a reader
looking at the code will otherwise conclude they were missed. Each is held back for a stated,
checkable reason — not for lack of time.

---

## 1. What landed

### F01 — subscription sync was a third unlocked registry writer — **FIXED**

Astra's evidence: `lib/subs.mjs:198` read the registry, awaited network work at `:220`/`:232`, then
saved **that original snapshot** at `:252–255` with no lock. A snapshot collected before a
concurrent `enable` committed was silently reverting that enable.

The write is now `commitSnapshot` in `lib/subs-apply.mjs`: the lock is acquired first, the registry
is **re-read inside it**, and the snapshot is applied to the fresh read. Subscription retrieval
stays outside the lock — it is network I/O and holding a store lock across it would serialise every
writer behind a remote call.

### F04 — the 60 s deadline could strand a worker-owned lock — **FIXED**

Astra's evidence: `creator-add.mjs:81` set a 60 s deadline and `:118` terminated the worker on
timeout, while the lock had been moved *inside* that terminable worker.

The fix splits the operation at the thread boundary, which is the part worth remembering:
`creator-add.worker.mjs` now **resolves only** — it never touches the store. The validated, locked
commit runs on the main thread, which nothing terminates. `settleCreate` performs it in the message
handler, after the epoch check.

The reason a worker-held lock is unrecoverable rather than merely annoying: **worker threads share
`process.pid`**, so a terminated worker leaves a lock whose recorded pid is still *alive*;
`acquireLock` refuses to reclaim a lock whose owner is live, and the store wedges permanently.

## 2. What is held back, and why

### F03 — the discarded `release()` boolean — **NOT in this commit; remedy is inert against it**

The defect is real and the remedy is written and mutation-proven — see `C:/tmp/f03-hold/`.

It is held back because at **this commit's** `lock.mjs` the retry cannot work. HEAD's `lock.mjs`
(185 lines) is pre-E4: its `release()` latches `released = true` **before** its single unlink
attempt and carries no transient-retry policy, so retry calls 2–4 would return `false` without
touching the file. The post-E4 `release()` lives in another seat's **uncommitted** worktree copy
(297 lines, +121/−9 vs HEAD). Landing the retry now would add a mechanism that cannot execute and a
test that cannot pass.

The retry and its test therefore ship with the E1/E4 slice that makes `release()` retryable. The
call site carries a comment naming F03 and explaining the discard, so the discard is not mistaken
for an oversight.

**Preserved (byte-exact, md5 in the manifest):** `C:/tmp/f03-hold/{MANIFEST.md, lock-release.mjs,
lock-release-retry.test.mjs, registry.mjs, subs-apply.mjs}` — the last two are complete files to
drop in place once E1/E4 is committed.

### F02 — a creator lock falsely acknowledges daily-run startup — **NOT landable from here**

Astra's evidence: `run-reservation.mjs:168–174` clears the reservation for **any** held lock,
`status.mjs:174` projects creator locks identically to run locks, and `routes.mjs:94` passes that
projection to `noteRun`.

The entire mechanism is **uncommitted**: `run-reservation.mjs` is untracked and `routes.mjs` is
dirty by another seat. There is nothing to fix in a tracked file, and a fix here would have to
land on top of a file this session does not own. Recorded for the console-ops slice with `runId` as
the discriminator and `status.mjs:173` as the root.

## 3. The engine suite's six failures are ONE instrument fault

`scripts/creator-brains/test/*.test.mjs` reports **234 tests / 222 pass / 6 fail / 6 skipped**.

All six failures share a single root cause, measured, with no repo code involved:

```
$ node -e "const{spawnSync}=require('child_process');
           console.log(spawnSync(process.execPath,['-e','0']).error?.code)"
EBUSY
```

`spawnSync` cannot spawn **any** process in this sandbox — full path, via `PATH`, and `shell:true`
all return `EBUSY`; async `spawn` exits 0. Consequences:

| Test file | Tracked? | Why it fails |
|---|---|---|
| `consistency.test.mjs` (C1) | yes | spawns `consistency-check.mjs` via `spawnSync` → no stdout → the catch reports an *empty* contradiction list |
| `mutation-gaps.test.mjs` (MG6) | yes | `spawnSync` |
| `readiness.test.mjs` (R1) | yes | `spawnSync` |
| `review-repairs-store.test.mjs` (HR16c) | yes | `spawnSync` |
| `lock-release-wiring.test.mjs` (E1, E4) | **no** — other seat's slice | `spawnSync` at `:166`; the child never ran (`status:null`, empty stdout) |

Two consequences worth carrying forward:

- **`C1`'s empty error body is a false lead.** `error: |- cross-surface contradictions:` with
  nothing after it reads as a real cross-surface disagreement with a broken formatter. It is a
  spawn that never happened. Do not go hunting for the contradiction.
- **The console suite is unaffected because no console test uses `spawnSync`** (grepped) — which is
  exactly why it is 354/354 while these four engine files fail. The two suites disagreeing is not
  evidence of a real defect in either.

None of the six is caused by this change, and none would be fixed by it.

## 4. Proof of the landing

**Landing proof — overlay, then control.** `git archive HEAD` into a temp tree, overlay only the
landing files, run the console suite; then run the **same** suite on the byte-identical tree with
**no overlay**, and diff the failure sets.

| Tree | tests | pass | fail |
|---|---|---|---|
| `HEAD` + landing files overlaid (`C:/tmp/lp3`) | 313 | 300 | 13 |
| `HEAD` alone, no overlay (`C:/tmp/lp-control`) | 307 | 293 | 14 |

`comm -23` on the failure sets is **empty**: the landing adds 6 tests, all passing, and introduces
**zero** new failures. The 13 are pre-existing HEAD artifacts — HEAD's `contract-parse.mjs` regex
`` /```ts\n([\s\S]*?)\n```/ `` cannot match HEAD's own `05-contracts.md`; the four dirty test files
in the worktree are what reconcile them.

**Worktree, isolated and sequential:**

- console suite: **354 / 354, 0 fail** — measured with nothing else running. An earlier 353/354 run
  was my own contention (I had the engine suite in the background); the failing test was an
  unrelated liveness precondition in `health.lifecycle.test.mjs:224`.
- engine suite: 234 tests, 6 failures, all attributable to §3.

**Mutation proofs (each deletes exactly one mechanism; the test claiming coverage must go RED):**

- F01 — extraction census proves the **write**, not known function names.
- F04 — M3: make `settleCreate` a passthrough → only the commit test RED. M4: re-point the worker
  at `addCreator` → the source-shape tripwire RED.
- F03 (in the hold) — M1: delete the retry → 2 RED. M2: delete the `releaseFailed` assignment → 1 RED.

## 5. Hazards a reader must not trip over

- **`lock.mjs` and `paths.mjs` are dirty by another seat** (297 lines vs HEAD's 185; 5 of that
  slice's test files are untracked). This commit does not touch them. Do not read the worktree
  `lock.mjs` as part of this change.
- **73 staged deletions** sit in the index, unrelated to this work (plus
  `backend/utils/emailTemplates.mjs`). They were already staged when this session began. The commit
  is path-scoped precisely so it neither publishes nor disturbs them. **They are still staged and
  still need an owner's decision.**
- **`git commit -- <pathspec>` silently omits untracked files.** The new files in this change were
  `git add`ed first; a pathspec alone would have dropped them from the commit without complaint.
