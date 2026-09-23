# HOSTILE REVIEW REQUEST — the S1-H12 registry-write lock fix (SS-PT, Creator Brains)

**Seat:** Sable (WorkBuddy), on Sean's behalf. **Date:** 2026-09-23 ~01:10 PDT.
**Repo:** SS-PT, branch
`creator-brains-engine-r2-20260915`, HEAD `226491323`.
**Reviewed content is UNCOMMITTED** — the working tree is the artifact of record, not HEAD.

You have repo access. **Read the tree.** This packet is a guide, not the evidence: if it narrows
the picture, that is my error and worth a finding of its own.

---

## 1. What changed, and why

`registry.json` is a single file holding the creator catalog. Two code paths mutate it with an
unlocked read-modify-write:

| path | thread | engine call |
|---|---|---|
| add creator | **worker thread** (`lib/creator-add.worker.mjs`) | `registry.mjs addCreator` |
| enable/disable | **main thread** (`lib/creators.mjs`) | `registry.mjs setEnabled` |

Until recently both ran on the one main thread, so the event loop serialised them. S1-H12 moved the
add-creator resolution onto a worker thread to remove a measured 1577 ms freeze of the bridge's only
thread — which created **genuine parallelism between two unlocked RMWs of one file**. So the lost
update is a regression introduced by that remedy.

**Reproduced deterministically** (not a timing race): a test-double worker blocks inside
`deps.resolveCreator` — after the read, before the write — signals a file flag, and the main thread
mutates inside that window. Before the fix: 3/3 RED, `false !== true`.

**The fix:**
- `addCreator` wraps its read-modify-write in the engine's cross-process `withLock`, with a **fresh
  re-read inside the lock**.
- `setEnabled` takes the synchronous `acquireLock` with the release in a `finally`.
- Both mutation paths now map a held store to **409 `RUN_LOCKED`** instead of 422 `REFUSED`.

## 2. Snapshot boundary

Freeze on these bytes. Line counts and first 16 hex of sha256, generated from disk:

```
a5ce500edafc54ec    273 lines  scripts/creator-brains/lib/registry.mjs          <- CHANGED
37480b8f15e0b756    219 lines  packages/creator-brains-console/lib/creators.mjs <- CHANGED
9a0966baa3a4a476    151 lines  packages/creator-brains-console/test/creator-add.registry-lock.test.mjs   <- NEW
7f45a423a014235b    126 lines  packages/creator-brains-console/test/creator-add.registry-race.test.mjs    <- docblock corrected
19da6b5e31f88345    297 lines  scripts/creator-brains/lib/lock.mjs             <- UNCHANGED by me
1c308dd58eb4409f    149 lines  scripts/creator-brains/lib/run-lock.mjs         <- UNCHANGED
4c160813de0dafb3    195 lines  packages/creator-brains-console/lib/creator-add.mjs        <- UNCHANGED
c293524c9c2ebff0     73 lines  packages/creator-brains-console/lib/creator-add.worker.mjs <- UNCHANGED
5ef61a74abdd91b1    112 lines  packages/creator-brains-console/lib/errors.mjs   <- UNCHANGED
6caa4f941dd734ee    242 lines  packages/creator-brains-console/lib/http.mjs     <- UNCHANGED
9a69e9ac730c5ea6     78 lines  packages/creator-brains-console/test/fixtures/barrier-add.worker.mjs <- UNCHANGED
```

`git diff -- scripts/creator-brains/lib/registry.mjs packages/creator-brains-console/lib/creators.mjs`
shows exactly the change.

## 3. The evidence I already have — attack the REASONING, not just the code

Green tests after a fix prove nothing, so I ran a mutation harness: one file mutated in place, the
backup taken in its own step and verified by md5, anchors counted and a non-unique anchor refused.
Both suites run per mutant:

| mutant | mechanism deleted | race test | lock test |
|---|---|---|---|
| control | — | GREEN | GREEN |
| M1 | the fresh re-read (lock kept) | **RED** | GREEN |
| M2 | the lock on `addCreator` | GREEN | **RED** |
| M3 | the lock on `setEnabled` | GREEN | **RED** |

Suites: console **351 pass / 0 fail**; engine **228 pass / 0 fail / 6 skipped** (the 6 are `@live`
network tests behind `CREATOR_BRAINS_LIVE=1`, identical to the pre-change baseline).

Reproduce:
```
node --test packages/creator-brains-console/test/creator-add.registry-race.test.mjs
node --test packages/creator-brains-console/test/creator-add.registry-lock.test.mjs
node --test packages/creator-brains-console/test/*.test.mjs
node --test scripts/creator-brains/test/*.test.mjs
```

## 4. My claims, numbered so you can falsify them

For each: **CONFIRMED / REFUTED / INCONCLUSIVE**, plus the command or file:line you used.

- **C1** — The race test proves the fresh re-read and proves **nothing** about the lock. It is
  structural: its barrier arms inside the resolver, which runs *before* any lock is taken.
- **C2** — `touchCreator` (the third unlocked RMW in `registry.mjs`) needs **no** lock, because its
  only callers `discover.mjs:240` and `sweep.mjs:195` run as phases of `run.mjs`, and `run.mjs:168`
  takes the store lock via `takeStoreLock` before them. Wrapping it would be the A1-06 self-refusal
  documented at `run-lock.mjs:37-49`. **Falsify by finding a path where discover/sweep run unlocked.**
- **C3** — No A1-06 self-refusal is introduced: neither `setEnabled` nor `addCreator` is ever called
  by a caller that already holds the store lock. **Falsify by finding such a chain.**
- **C4** — `setEnabled` could not be made async, because all three callers use its return value
  (`commands.mjs:78`, `launch.mjs:148`, `creators.mjs:188`).
- **C5** — Holding the lock around **only** the read+write (not the 180 s yt-dlp resolve) is safe,
  because resolution touches no shared state.
- **C6** — Mapping a held store to 409 `RUN_LOCKED` is correct for these two endpoints and nothing
  depended on 422 `REFUSED` for them. **I went beyond the literal authorisation here — this is the
  change I am least sure of. Attack it.**
- **C7** — The lock is effective across the worker thread despite the worker sharing `process.pid`
  with the main thread. Specifically: the worker cannot steal the main thread's lock and vice versa
  (same host + `pidAlive` → `lock_held`).
- **C8** — The 6 skipped engine tests are pre-existing `@live` skips, not skipped *by* this change.

## 5. What I know is weak, and what I did not do

- **A hard worker-thread crash while holding the lock wedges the store** (shared pid ⇒ `pidAlive`
  stays true ⇒ reclaim never fires). Held window is milliseconds (read + write only). I did **not**
  fix this: `lock.mjs` is 297/300 and its reclaim protocol is the most carefully argued code in the
  engine. Is my risk assessment right, and is there a cheap bounded fix?
- `addCreator` still does a **pre-flight read outside the lock**. I claim it cannot cause a lost
  update because the write's read is inside. Check that reasoning.
- The lock body is written with `runId: null` (I pass no `runId`). Does anything surface that —
  `status.mjs`, the journal, the console UI — and does it read as a broken/foreign holder?
- **Nothing is committed.** I have not yet established that this change is landable as a file-list
  commit (an earlier, unrelated attempt failed because a changed file imported a symbol absent from
  HEAD). If you can see a landing hazard in the current tree, that is a finding I want.
- I did not touch `lock.mjs`, `store.mjs`, or the engine's run path.

## 6. What I want from you

Be hostile about the **fix**, not about the defect I already found. The most valuable findings here
are the ones where my fix is *wrong or incomplete*: a remaining window, a lock that is taken in the
wrong place, a contract change that breaks a caller, a test that cannot fail, or a claim of mine
above that is simply false.

---

## OUTPUT CONTRACT — MECHANICAL, PLEASE FOLLOW EXACTLY

Emit exactly **three** level-2 headings, in this order, spelled exactly as written:

```
## PART A — FINDINGS
## PART B — ADJUDICATION OF THE CLAIMS C1–C8
## PART C — WHAT YOU COULD NOT CHECK
```

Under `## PART A — FINDINGS`, emit one level-3 heading per finding, exactly:

```
### F01 — HIGH|MEDIUM|LOW — <short title>
### F02 — HIGH|MEDIUM|LOW — <short title>
```

Each finding body must contain, as literal labels on their own lines:

```
CLAIM:          one sentence
EVIDENCE:       file:line, or the command output that shows it
REPRODUCTION:   the exact command you ran, or "read-only, no execution"
EXPECTED:       what the code should do
ACTUAL:         what it does
REMEDY:         the smallest change that closes it
```

Under `## PART B`, one line per claim, exactly this shape (no prose paragraphs):

```
C1 — CONFIRMED|REFUTED|INCONCLUSIVE — <one sentence, with file:line or command>
```

Under `## PART C`, a bulleted list of what you could not verify and why.

If you find nothing in a section, write the heading and `NONE`. Do not omit a heading — I split
this mechanically and a missing heading costs a round-trip.

**Do not re-derive the defect.** I know about the lost update. Tell me what is wrong with the fix.
