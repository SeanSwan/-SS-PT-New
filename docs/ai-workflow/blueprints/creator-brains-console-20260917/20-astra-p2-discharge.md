# 20 — Astra round 1 P2 discharge (root routing · launch failure · ownership region)

**Date:** 2026-09-22
**Source:** `docs/ai-workflow/AI-HANDOFF/ASTRA-SUBSCRIPTION-REPLY.md` §3
**Scope:** the three P2 findings that had a recommendation, minus the ones already discharged.

---

## 0. What was already done before this round

| Finding | Status before | Evidence |
|---|---|---|
| P1 — repair self-refuses (D2/P1b) | **DONE** | `bridge.repair.realengine.test.mjs`; 2 of 3 cases red on revert |
| P1 — spawn handoff gap (D2/P1a) | **DONE** | `bridge.handoff.test.mjs`, 3 mutations killed |
| P2 — weak source assertion / disconnected recorder / unobserved mutex scope | **DONE** (found already fixed on arrival) | `bridge.rundaily.test.mjs` §P2a/§P2b/§P2c, comment-stripping + `mutexHeld` flag |
| P2 — `useRunPoll.ts:186` disabled-polling cleanup (U1) | **DONE** | Astra named `useRunPoll.ts`; the same defect was unfixed in `useStatus.ts:107` and is now fixed there too |
| P2 — `runDaily` re-export at `run-gate.mjs:115–116` | **ALREADY ABSENT** — cited line is stale | `grep -c runDaily` over that file returns **comment text only**; the module has 155 lines, so `:115–116` is now `heldRefusal`/`lockedRefusal` body |

---

## 1. P2 — "The spawned process is not given the store being gated"

**Astra, verbatim:** *"uses `r` for the gate but passes the child only the script and `--per-hour`. It supplies neither a root argument nor a root-specific environment or working directory. Changing `r` does not change the child's launch configuration."* `[VERIFIED]`

**Confirmed against shipped source:** `run-daily.mjs` passed `{ detached: true, stdio: 'ignore', windowsHide: true }` — no env, no cwd. The child resolves `root()` as `explicit || process.env.CREATOR_BRAINS_ROOT || <repo default>` (`paths.mjs:49`) and receives no `explicit`.

**Consequence, stated plainly:** the gate reads `lockStatus(r)` / `withLock(r, …)` against the caller's `r` while the run writes the engine's default store. That is the "two writers, one store" shape the gate exists to prevent — reached by configuration drift rather than a race, and invisible from either side. **A console pointed at a non-default store had no gate at all.**

**Fix:** pass the resolved root on the child's `env` via `CREATOR_BRAINS_ROOT` — the wrapper's own documented "single knob" (`paths.mjs:22`). Spread rather than assign, so `process.env` is never mutated by a bridge.

**Tests:** `bridge.spawn-launch.test.mjs` — rout **and** non-mutation, with a control asserting the value differs from the default so it cannot pass vacuously.

---

## 2. P2 — "Spawn acceptance does not handle asynchronous launch failure"

**Astra, verbatim:** *"installs no child `error` listener and returns acceptance without observing the `spawn` event"* `[VERIFIED]`; *"[LIKELY] an asynchronous launch failure can become an unhandled error and terminate the bridge."*

**Confirmed:** no listeners; `202 {requestId}` returned unconditionally.

**Fix:** `awaitSpawn(child)` registers `spawn`/`error`/`exit` immediately and waits for **`'spawn'`** before the 202. Covers both failure shapes — an `error` event, and an exit before `spawn`. Listeners are removed on settle so a live child is not retained by a resolved promise.

**What is deliberately NOT awaited:** the child's **exit**. Acceptance is not completion (A1-05), and `run-daily.mjs` owns the exit codes. A test pins this so the two launch checks cannot silently grow into a completion wait.

**Tests:** `bridge.spawn-launch.test.mjs` — async `error` rejects and is **not** an `ApiError` (a launch failure is not a decision the API made); pre-spawn exit rejects rather than hanging the request; listener leak check; and the A1-05 counterweight.

---

## 3. P2 — "The new claim write precedes the shown cleanup region"

**Astra, verbatim:** *"acquires the lock and writes the claimed journal before entering the shown `try`"* `[VERIFIED]` → *"[LIKELY] a write failure can therefore bypass lock cleanup."*

**Confirmed:** `run.mjs` held the lock at `:184` and the `try` opened at `:188`.

**Consequence:** `claimRunJournal` is a **store write**. A full disk or a torn write at that line threw with the lock held and no `finally` in scope, holding the store until stale-owner reclamation — **6 hours** (`lock.mjs:50`). The symptom points at the lock (later runs refusing with a dead pid), not at the write that leaked it.

**Fix:** the ownership region now opens **before** the claim. Extracted to `lib/run-ownership.mjs` (`withOwnership`) because `run.mjs` hit **exactly 300** — the cap with zero headroom — and Rule 4 says extract at the seam, not line-golf. `run.mjs` → 271.

**Tests:** `scripts/creator-brains/test/run-ownership-release.test.mjs`, 6 cases.

---

## 4. ⚠️ The test that was green and vacuous — and how it was caught

**This is the round's most important finding, and it is about my own work.**

The first version of `run-ownership-release.test.mjs` drove its failure from `body` and asserted the lock was released. **All cases passed — including against a mutated build with the claim moved back OUTSIDE the `try`, i.e. against the defect itself.** A body failure releases the lock in *both* the correct and the defective shape, so the case could not discriminate.

Caught only because the mutation was run and it **survived**. The fix was to make the claim injectable (`claim = realClaim`) so the failure can be raised **at the line Astra named**. Re-measured:

| Mutation | Before the fix | After the fix |
|---|---|---|
| claim moved outside the `try` | **5 pass / 0 fail — mutation SURVIVED** | **1 fail** — case 1 red, exactly the named line |
| body throws | 5 pass | case 2 red (kept, documented as the non-discriminating control) |

The same lesson as the T-E3 budget harness: *a green gate can mean the FIXTURE avoided the defect.*

---

## 5. Two fixtures that could not emit — the same defect class

Adding the launch handshake broke **7 pre-existing cases** across two files, with `child.once is not a function` and `child.on('spawn', …)` that never fires. Both fixtures were plain objects:

- `bridge.rundaily.test.mjs` — `{ pid: 4242, unref() {} }`
- `bridge.handoff.test.mjs` — `{ unref() {}, pid: …, on() {} }` — an `on` that **silently discarded its arguments**, so its cases failed by **HANGING**, not by asserting.

Neither is test maintenance. A fake that cannot emit is a fake on which *"a launch failure must not be answered with a 202"* is **untestable** — which is how a `202` for a child that never started survives a green suite. Both now delegate to **one** shared `test/fixtures/spawn-recorder.mjs`, because two copies of a recorder that drift is the P2b defect made structural.

---

## 6. Verification

| Suite | Before | After |
|---|---|---|
| Engine (`scripts/creator-brains/test/*.test.mjs`) | 204 / 0 / 6 | **210 / 0 / 6** |
| Console (`packages/creator-brains-console/test/*.test.mjs`) | 336 / 0 | **342 / 0** |
| Web (vitest) | 145 / 0 (15 files) | **145 / 0 (15 files)** |
| `tsc --noEmit` | clean | **clean** |
| Rule 4 (>300 lines) over engine + console + web | 0 | **0** |

**Mutations run, all killed (4 for the launch work, 1 for the ownership region):**

| # | Mutation | Result |
|---|---|---|
| 1 | drop `env` from the spawn options | 1 red |
| 2 | remove the `awaitSpawn` call | 2 red |
| 3 | leave the listeners attached | 1 red |
| 4 | move the claim back outside the `try` | 1 red — **only after the test was corrected; see §4** |

Every mutated file was restored and verified **byte-identical** (`diff -q`) before the next step.

---

## 6a. End-to-end on the REAL engine (added after the suite runs)

The suites exercise `withOwnership` with injected doubles. Two runs against a real
temp store were needed to show the extraction did not regress the thing it was
extracted from — **D2/P1b, where the run used to refuse ITSELF**:

**Path 1 — the engine acquires its own lock.**
```
store: C:\Users\…\Temp\owner-e2e-ooKpor
runDaily ok: true
lock held AFTER the run: false        → PASS — lock released
```

**Path 2 — the CONSOLE path: the gate takes the lock and the engine must REUSE it.**
This is the one that matters, because it is the exact handoff D2/P1b broke:
```
gate holds lock, ok = true
runDaily via REUSED handle ok: true
phases: reconcile:ok canary:ok discover:ok fetch:ok build:ok export:ok digest:ok
after withLock, lock held: false      → PASS — released exactly once, by the gate
```

**All seven phases ran.** Before the D2/P1b fix this same call produced
`ok=false, lock:FAIL(store is locked (lock_held))` with every later phase skipped —
the engine acquiring a second, non-reentrant lock it already held. The phases list
above is the positive proof that the handle is now forwarded and reusable, and that
routing the claim through `withOwnership` left that intact.

Both scratch scripts were deleted; nothing was left in the repo root.

---

## 8. Astra round 2 on this round's own work — 2 findings, both real, both fixed

Dispatched because this round contained a self-caught vacuous test, which is exactly the
class worth an external pass. Reply: `21-astra-reply-p2-discharge.md`. Filed to
`Z:\HostileReviews` (Astra's session is read-only and could not file its own Rule 86 record).

**Astra's advisory verdict:** *"REVISE the test evidence. **No residual production defect
established in the three targeted fixes.**"* All three fixes were **[VERIFIED, source]** — but
two of my *tests* did not prove what they claimed. Both findings confirmed against shipped
source before acting.

### Finding 1 — `return await body()` is load-bearing, and nothing pinned it

`run-ownership.mjs` used `return await body()`, not `return body()`. Without the `await` the
`finally` runs as soon as the promise is **returned**, releasing the lock while the body is
still executing — the store unprotected for the entire run, which is D2/P1a reopened from the
inside.

**Measured myself:** the mutation `return await body()` → `return body()` **passed all six
cases** in the file. Every one asserted the release count *after completion*, and after
completion both shapes have released exactly once.

**Fixed** by two new cases with a **manually controlled pending body**: zero releases while the
promise is pending (after a `setImmediate` drain, so the body is genuinely in flight), exactly
one after it settles — on both the resolve and the reject path. Re-measured: the mutation now
kills **2 cases**.

### Finding 2 — the fixture granted an accidental grace period

`fakeChild` scheduled its emission in the **constructor**, so: (a) a caller registering
listeners one `nextTick` late still caught the event (`setImmediate` runs after the microtask
queue), making a late-listener regression invisible; and (b) the fixture emitted `spawn`
**before any spawn was requested**, so a "did it spawn?" assertion could be satisfied by event
timing.

**Fixed:** the emission is scheduled from **`spawnFn`**, one fresh child per call (so a double
spawn is two distinct emitters), plus an `emitAfter: 'tick' | 'immediate' | 'manual'` knob and a
`manualChild()` escape hatch.

**⚠️ My first version of the test for this ALSO did not discriminate.** I asserted it with two
`await setImmediate(r)` turns — enough for *either* scheduling mode to land — so collapsing
`'tick'` back to `setImmediate` left it green. **Mutation M6 survived.** Rewritten to assert
about the **same turn** (one microtask checkpoint, no macrotask), with both modes run side by
side in one ordering array. Re-measured: M6 now kills 1 case.

### Astra's `[UNKNOWN]`s — carried, not papered over

| Unproven | Astra's reason | Status |
|---|---|---|
| Child-side root **consumption** | Only the passing of `CREATOR_BRAINS_ROOT` is verified in the supplied source; the receiving side is outside the packet | **Confirmed by me on the real engine** — §6a path 2 runs the full handoff and all 7 phases |
| Exceptions **inside `takeStoreLock` after acquisition** | Cannot be adjudicated from the packet | **OPEN** — named, not claimed |
| Actual release **failures** | Same | **OPEN** — named, not claimed |
| **Integration closure** | Astra ran read-only, did not re-run the suites or mutations | **I ran them** — §6a, plus 212/0/6 · 346/0 · 145/0 |

Astra's note that `'exit'`-before-`'spawn'` is *"defensive adapter coverage, not a normal
successful-launch ordering"* is accurate and worth keeping: Node documents that a successful
`spawn` precedes the other events, so that case guards a misbehaving fake rather than a real
sequence. It is retained as defensive coverage, and labelled as such.

### Running total of mutations — a pattern worth recording

**Five of the six mutations run this session survived their first test.** M4 (claim outside the
`try`), M5 (the `await`), M6 (the fixture's grace period), and both earlier T-E3 harness
mutations were all initially **green against the defect**. Every one was caught only because the
mutation was actually executed.

The rule this session earned: **when a mutation survives, assume the TEST is wrong until the
wrongness is located.** In four of four cases it was — the injected failure or the observed
boundary sat on the wrong side of the property being claimed.



---

## 7. What this round does NOT close

- **U2 / HR14f still has NO Astra recommendation** — verified twice: `grep -ci HR14f` returns **0** in `ASTRA-SUBSCRIPTION-REPLY.md` **and** **0** in `ASTRA-STANDING-RECOMMENDATIONS-2026-09-22.md`. It is a stdout-parse issue measured at **0 failures in 26 runs**: not currently reproducible, and *not* "fixed". There is nothing to implement, and inventing a fix would be worse than leaving it open and labelled.
- **P1 — stale-lock reclamation race** (`lock.mjs:108–126`) is untouched: Astra's containment advice is to refuse automatic reclamation until serialization exists, and that is an **owner decision**, not a builder one.
- **P2 — the console blocks stale-lock recovery** (`run-gate.mjs` refuses any held lock) is untouched for the same reason: distinguishing a positively-dead owner from an ambiguous one changes what a 409 means.
- **Commit is still blocked** by the peer seat. HEAD `f6e09bca4`, unmoved.
