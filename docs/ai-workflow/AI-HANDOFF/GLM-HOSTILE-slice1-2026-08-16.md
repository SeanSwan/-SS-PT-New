# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-slice1-hostile-review-2026-08-16.md
**Tokens:** 13154 in / 32000 out (reasoning: 25834) | total 45154
**Wall:** 544.9s

---

# Hostile review — Slice 1, post-fix

**Summary verdict:** The two CRITICAL classes this slice was supposed to eliminate — forged evidence and relocated trust — are both still open, through two doors neither previous review touched: the environment the hook inherits (Q1) and the `git` executable `headSha` resolves through `PATH` (Q10). The lock fixes are genuinely correct on the acquire path; the release path re-exports the S2 weapon under a docblock. Details below, in order.

| # | Finding | Severity |
|---|---|---|
| Q1 | `SWAN_GATE_ROOT`/`SWAN_DISABLE_ROOT` relocate/neutralize the trust root | CRITICAL |
| Q10a | `headSha` hijack via `PATH` or `GIT_DIR` — defeats A2 without touching the root | CRITICAL |
| Q3 | `isFreshForSha` attests a claim, not a review; docblock overclaims | CRITICAL (system primitive) |
| Q2/Q10b | Legacy string-path `releaseCounterLock` re-exports unconditional unlink | HIGH |
| Q5 | Unbounded `reason` tears telemetry; skip-malformed silently deletes the crash signal | MEDIUM (HIGH if slice-2 reads telemetry with `readJsonl`) |
| Q6 | Unfenced post-steal write window (seconds wide) + TTL=120s vs multi-minute reviews | MEDIUM |
| Q4 | `failOpen` contract is S3 deferred to 24 unwritten call sites | MEDIUM |
| Q7 | Malformed-name collapse (safe direction) + Linux/Windows kill-switch divergence | LOW / MEDIUM |
| Q8 | No fsync: power-loss zero-length rename is real on NTFS; dominated by adversarial truncation | LOW–MEDIUM |
| Q10c–f | Forward-movable session anchor; broken-disable-root collapse; lock-mtime DoS; telemetry-as-evidence | MEDIUM/HIGH |

---

## Q1 — `SWAN_GATE_ROOT` / `SWAN_DISABLE_ROOT`: CRITICAL, one command

Git hooks inherit the environment of the process that invoked git, and the process that invokes git is the agent's shell. `gateRoot()` re-reads the env at every call with no provenance check. Exploit, end to end:

```bash
git clone . /tmp/trust                      # real repo, same HEAD
mkdir -p /tmp/trust/.ai-workflow/qa
sha=$(git -C /tmp/trust rev-parse HEAD)
printf '{"subject_sha":"%s","status":"completed","rounds":6}' "$sha" \
  > /tmp/trust/.ai-workflow/qa/hostile-review.json
SWAN_GATE_ROOT=/tmp/trust git commit -m done
```

Inside the hook: `qaDir()`/`coordDir()`/`counterLockPath()`/`sessionAnchorPath()` all resolve under `/tmp/trust`; `headSha(cwd = gateRoot())` runs `git -C /tmp/trust rev-parse HEAD`, which returns the *same* sha (it's a real clone), so `isFreshForSha(forged, sha)` → `true`; and all telemetry is appended under `/tmp/trust`, so the in-repo telemetry file — the crash-signal channel — stays silent for the entire session. Note the clone is required only because `headSha` runs against the relocated root; per Q10a the adversary doesn't even need that.

`SWAN_DISABLE_ROOT` is the same hole pointed at the D1 fix in both directions:

- **Silence a legitimate kill switch:** operator places a marker in the out-of-tree root; agent commits with `SWAN_DISABLE_ROOT=/tmp/empty`. Every `isDisabled()` and `listDisabled()` in that process sees an empty root — the push gate's "refuse while any gate is disabled" check reads zero markers and passes.
- **Throw and remove a private kill switch:** agent sets `SWAN_DISABLE_ROOT=/tmp/m` containing `review-round-gate`, gates skip themselves ("disabled-honored"), agent deletes `/tmp/m` before push. And under the stated threat model — same filesystem privileges — even the *default* privileged root is agent-writable, so D1's "outside agent-writable space" is a location the adversary can write to anyway. The marker channel is only as strong as an OS ACL nobody has installed.

**Minimum fix that preserves test retargeting:** stop reading env in the trust path entirely. Export an in-process setter — `setGateRoot(dir)` / `setDisableRoot(dir)` — used only by `freshRoot()` in the tests (they already import the module directly; this is a one-line change per call site), and have `gateRoot()`/`disabledDir()` consult module state, falling back to the module-relative `DEFAULT_ROOT`, which correctly derives from the hook's own location. Additionally, hook entry points should defensively `delete process.env.SWAN_GATE_ROOT/SWAN_DISABLE_ROOT/GIT_DIR` at startup. An adversary spawning a process cannot reach in-process module state; it can always reach inherited env. Any env-based configuration of gate behavior is adversary-controlled input, full stop.

## Q2 — Injectable clock and stat: one seam is a weapon, one is already neutralized

Precision first, because the two seams differ:

- **`statFn` forgery is already dead.** The S1 identity check compares the corpse's real `dev/ino` against whatever `statFn` returned. A forged stale stat (`dev/999999`) fails `sameFile`, the corpse is restored, and the caller gets `contention`. The lock's own regression test demonstrates this. Correct as shipped.
- **`now` forgery is a live-steal primitive.** `acquireCounterLock({ lockPath: p, now: Date.now() + 10 ** 9 })` makes every existing lock's computed age exceed the TTL while the identity check passes (the corpse *is* the file that was statted — it's just not actually stale). One call steals a live holder's lock. (The converse sub-question — minting an instantly-stale lock — does **not** work: staleness is judged by real mtime at future readers using real clocks; `ts` is decorative. Correct to that extent.)
- **The worst export is neither:** `releaseCounterLock('/path/to/lock')` is the unconditional unlink — S2 resurrected as a public API. The agent doesn't need clock games; see Q10b.

But the decisive point the question misses: **the injection seams add zero marginal attack surface**, because the lock file lives in the agent-writable worktree and the adversary can `utimesSync` it directly:

```bash
while true; do touch .ai-workflow/coordination/review-counter.lock; sleep 60; done
```

One line, no Node, no API: the lock never goes stale, every honest gate gets `contention` forever (a DoS that converts to a fail-open the moment any slice-2 consumer handles lock-exhaustion by failing open — the function is literally named `failOpen`). Or `rm` the lock mid-critical-section for a lost update without touching the module at all. **The lock is a cooperative scheduler between two honest gate processes; against the examinee it provides nothing, and its header should say so.**

Recommendations, in order: (1) delete the string-path release branch (Q10b); (2) keep `now`/`statFn` — they're attack-equivalent to `utimesSync`, which the adversary already has, and killing them is security theater — but move the TTL boundary test onto an extracted pure function (`isStale(ageMs, staleMs)`) if you want the seam gone anyway; (3) add the fencing the lock lacks (Q6); (4) retitle the module docblock from mutual exclusion to "cooperative serialization; adversary defeats it by design; integrity comes from counter verification, not the lock."

## Q3 — `isFreshForSha` proves the weaker property: CRITICAL as a system primitive

What A2 actually buys: an artifact cannot be *replayed* across commits — a genuine review of an old HEAD does not satisfy the gate at a new HEAD. That is a real, narrow property and the mtime forgery door is closed.

What it does not buy: everything else. The artifact is agent-written; `git rev-parse HEAD` is world-readable; the docblock's claim "the agent cannot mint a binding for code it did not review, because HEAD is recomputed on the trust side" is **false** — the agent mints a binding for the current HEAD in one command without reviewing anything:

```bash
printf '{"subject_sha":"%s","status":"completed","rounds":6}' "$(git rev-parse HEAD)" \
  > .ai-workflow/qa/hostile-review.json
```

Consumer: `isFreshForSha(artifact.subject_sha, headSha())` → strings equal → fresh → CLEAN. This is the exact forgery the system's core rule ("agent-written state is a claim, never evidence") forbids, executed through the primitive labeled "the load-bearing freshness primitive." A2 solves the mtime/stale-reuse problem only. The one-line function is internally correct; the defect is that its contract, name, and docblock claim attestation strength it does not have, and 24 future gates will be built on that claim this week.

What would begin to close it, given same-privilege adversary + in-repo state (where every file is forgeable and there is no unilateral trust anchor on the box):

1. **The hook holds the pen.** The reviewer process writes its verdict to a pipe; the *hook* writes the artifact. The agent never gets write access to gate artifacts' birth.
2. **Anchor the chain in git's DAG.** Each hook-written gate event extends a hash chain (`h_i = H(h_{i-1} || event)`), and the current `h` is embedded in the commit the gate allows (trailer or note). Retroactive forgery of pre-existing gate history then breaks shas that later commits already depend on, and the push gate verifies the chain against the commit trailers. This is the only tamper-evidence available without OS-level separation, and it is the natural completion of A6's "hash manifest verified at session start."
3. Immediately: rename or re-document — `claimsShaBinding()` or a docblock that says "proves the artifact *names* this commit, nothing more," so no consumer mistakes it for review evidence.

## Q4 — `failOpen`: S3 deferred, MEDIUM

A truthy return is *necessary* — v1's defect was manufacturing silence — but it is not a *fix*. The fixed bug was one call site inside one function ignoring a return; the "fix" moves the same obligation to ~24 call sites that don't exist yet, enforced by a docblock. Nothing — compiler, lint, test, runtime — detects the tenth future call site that writes `failOpen(g, b, r); return ALLOW;`. The tests can't guard code that hasn't been written. That is the definition of deferred.

Constructions that make it unignorable:

- **Single choke point (best):** a `runGate(name, boundary, mode, fn)` wrapper that owns telemetry and exit-code mapping. `fn` returns a decision; the wrapper alone decides that telemetry-failure-at-fail-closed-boundary ⇒ block + nonzero exit. One enforcement point instead of 24 memories.
- **Throw at fail-closed boundaries:** telemetry failure there is exceptional; make `failOpen` throw a typed error. Ignoring it becomes impossible — an uncaught throw in a git hook is a nonzero exit, i.e., closed. Callers who genuinely want fail-open pass `mode` and get the current null/object shape.
- Cheap hygiene now: rename the sentinel field from `failOpen: true` to `block: true`, so even a careless reader of the returned object reads the instruction; and add a CI grep asserting every `failOpen(` call site consumes its return.

## Q5 — Telemetry tearing: MEDIUM, with a concrete self-inflicting input

`reason` is `String(entry?.reason ?? '')` — unbounded. Every other field is bounded by the fixed key set; `reason` is exactly where error stacks and adversary-influenced content (paths, branch names, commit messages) flow. Constructed input:

```js
appendTelemetry({ gate: 'review-round-gate', boundary: 'push',
                  result: 'fail-open', reason: 'E'.repeat(8192) });   // ≈8.3 KB line
```

Two agents' gates appending ~8 KB lines concurrently: each `appendFileSync` is one large write, and the OS is free to interleave at IRP/cluster granularity (the code's own comment concedes this; nothing enforces the bound the comment demands). Result: both lines are byte-interleaved, both fail `JSON.parse`, and `readJsonl`'s skip-malformed policy erases **both** — including the `fail-open` line, i.e., the exact record whose absence the system defines as the crash signal. Worse than silence: the file looks healthy, the detector sees a stale last-good line, and the strongest adversarial version needs no concurrency luck at all — the examinee arranges for a gate to fail with an attacker-sized reason (an 8 KB branch name in a validation error) while the second agent's gate writes. The hostile input is the error *content*, delivered through the gate's own telemetry.

Is skip-malformed right for this channel? **Not alone.** Skipping is correct for availability; the defect is that damage is unreportable. The reader must distinguish {absent}, {empty}, {n lines, k malformed}. Fix set, cheap: truncate `reason` at ~512 chars inside `appendTelemetry`; if the serialized line would exceed 4096, truncate `reason` further; make `readJsonl` (or a strict sibling, `auditJsonl`) return `{ lines, malformed }`; the crash detector treats `malformed > 0` as an alarm at least as loud as silence, because on this channel damage and death are the same event.

## Q6 — The residual release race: honest but mis-sized; the real window is seconds, not microseconds

The documented stat→unlink race is real and I'll give it, but it is dominated by an undocumented one.

**The µs race (documented).** A's section overran the TTL; B steals; A releases:

1. A: `statSync(path)` → inode I1 ✓ matches handle.
2. A: `readFileSync(path)` → token T_A ✓.
3. — preemption — B: rename→corpse (verify I1), unlink corpse, `claim` → I2/T_B at path.
4. A: `unlinkSync(path)` → deletes **B's** lock. Succeeds.
5. C: `claim` → I3. B and C both in critical sections; both write the counter; one write silently loses.

Closable? Not in portable Node — there is no identity-checked unlink; the Windows primitive that would do it (`SetFileInformationByHandle` with `FileDispositionInfoEx` on an open handle) needs a native module. So: honest accounting for *this* window.

**The seconds-wide window (undocumented, design-closable).** Nothing requires the release race at all:

1. A acquires (I1/T_A), begins a review that runs 3 minutes. `LOCK_STALE_MS` is 120 000.
2. t+121 s: B's gate stats → stale → rename → identity ✓ → claims (I2/T_B) → B reads the counter.
3. A finishes its review and **writes the counter**. A never re-verifies ownership; the lock API offers no `stillOwns(handle)` and the counter format carries no fencing token. Write #1 lands under B's regime.
4. B writes. One round increment is lost — the exact failure the lock exists to prevent, with no µs race required, and a likelihood set by "does any review round exceed two minutes," which for a hostile review of a large diff is the common case.

The precondition — critical section exceeding TTL — is not guarded, measured, or even warned about at the `LOCK_STALE_MS` definition, and 120 s is plausibly below the workload this gate gates. Verdict: the self-declared race is honest but an excuse *in scope*: the actionable defects are (a) no pre-write ownership re-check helper, (b) no fencing token in the protected state (counter records `{value, lastWriterToken}`; consumers reject entries whose token was provably not the live holder — converts undetected lost updates into detected ones), (c) TTL default vs. worst-case section size, unmeasured. Grade: µs race LOW (documented, narrow); unfenced window + TTL MEDIUM.

## Q7 — `isDisabled` malformed names: the collapse is real but points the safe way; the case-folding is the real bug

The domain collapse exists — "marker absent" and "query rejected" are both `false` — but examine the blast direction: a caller doing `if (!isDisabled(name)) enforceGate()` **enforces** on a rejected name. Fail-closed. The cost is only that misconfiguration is invisible (no third state, no telemetry line for the rejection). Since gate names are static strings, malformed input is a programmer error: throw `TypeError`, or return a discriminated result, and the collapse disappears. LOW.

The adjacent defect is not low. The *query* is lowercased but the *marker on disk* is not:

```bash
touch .ai-workflow/qa/disabled/Review-Round-Gate
```

- Windows/macOS: `existsSync('…/review-round-gate')` hits via case-insensitive lookup → disabled. ✓
- Linux: lookup of `review-round-gate` vs file `Review-Round-Gate` → `false` → gate runs, silently, while `listDisabled()` still reports `Review-Round-Gate` → the push gate refuses. Split-brain: per-gate ignores the kill switch, push blocks, nobody knows why.

The suite cannot catch this in the stated environment — the case test creates the marker lowercase, and see Q9 mutant 1. Fix: compare against the directory listing case-insensitively (`listDisabled().map(s => s.toLowerCase()).includes(key)`), or normalize marker names at creation. MEDIUM.

## Q8 — `writeJsonAtomic` durability: real on NTFS, and mostly fine — the hazard is the collapse helper

Two regimes:

- **Process kill (agent killed, tool timeout):** design is correct. `writeFileSync(tmp)` + `renameSync` — the target is atomically old-or-new; a killed writer leaves at most a `.tmp.` orphan. This is what A4's `killed` status needs, and it holds.
- **Power loss:** the gap is real. NTFS journals *metadata*; file *data* is flushed lazily. After the rename commits and before the data flush, power loss leaves the target present and **zero-length**. No `fsync` on the temp fd anywhere, and directory fsync doesn't exist on Windows anyway.

Does that defeat A4? By itself, no — it defeats it only in combination with a consumer that collapses the result. A zero-length counter is `'corrupt'` under `readJsonResult`, which is the fail-closed treatment the architecture mandates. But `readJsonOrDefault(counterPath(), {rounds: 0})` maps corrupt → fallback → **the round counter silently resets to zero**, and the adversary doesn't need a power cut to reach that state — `: > .ai-workflow/coordination/review-counter.json` (adversarial truncation, one keystroke, in-repo file) produces the identical corrupt file through the identical collapse. So: add the fsync (`open`, write, `fs.fsyncSync(fd)`, close, rename — cheap, correct on both platforms; skip dir fsync on Windows and say so), grade the durability gap LOW; grade the *exported* `readJsonOrDefault` MEDIUM as a loaded footgun — either stop exporting it, or rename it so no slice-2 author reaches for it at a decision site (`readJsonUnsafeCollapse`).

## Q9 — Surviving mutants and the untested branch that matters

Named mutants these 25 tests would let live:

1. **`isDisabled`: `raw.toLowerCase()` → `raw`.** The only case assertion (`'SOME-GATE'` → true) runs on Windows/NTFS where the lookup is case-insensitive anyway. The mutant passes the entire stated suite while breaking Linux — production consequence in Q7. This is the cleanest demonstration that a green suite in the stated environment is not a green suite.
2. **`releaseCounterLock` string branch: any mutation, including deletion.** Zero coverage. `unlinkSync(p); return true` → `return true` survives; so does removing the branch. Untested code that is also the adversarial surface (Q10b).
3. **`stampSessionStart`: write unclamped `when` into contents while keeping the clamped `utimesSync`.** The backwards-stamp test asserts `clamped === true` and the mtime but never re-reads `sessionAnchor().ts`. Surviving mutant yields contents claiming 1970 with mtime claiming now — the exact contents-vs-mtime divergence the fix was supposed to close.
4. **`listDisabled`: drop `.filter(f => !f.startsWith('.'))`.** No dotfile fixture. Consequence: a stray `.DS_Store`/editor temp in the disable dir makes the push gate refuse forever.
5. **`claim`: drop `pid` and `ts` from the lock body.** Only `.token` is ever asserted; `ts` is also read by no logic (staleness uses mtime) — the field is decorative and provably so.
6. **`isFreshForSha`: drop `|| !currentSha`.** `isFreshForSha('null', null)` → mutant returns `true` (`String(null) === 'null'`); suite only passes `null` against `'abc'`, where the comparison alone happens to return false.
7. **`appendTelemetry`: `?? ''` → `|| 'unknown'` on `reason`; same on `boundary`.** The empty-`gate` case is asserted; empty `reason`/`boundary` never are.
8. **`failOpen`: delete the `process.stderr.write` fallback.** Untested branch — the last-resort evidence channel has zero coverage.
9. **`writeJsonAtomic`: drop the failure-path `unlinkSync(tmp)`.** The no-orphan assertion runs only after *success*.
10. **`mtimeLooksFresh`: `statSync` → `lstatSync`.** No symlink fixture.

Untested branch that worries me most: **there is still not one multi-process test in a module whose reason to exist is two-process mutual exclusion.** The header's claim that `statFn` injection "expresses" the interleavings is only true of the one stat you can fake; the OS-level races (Q6's windows, concurrent `claim` after simultaneous steal) are structurally inexpressible here. A 200-iteration storm — two child processes looping acquire→increment→release, assert counter == attempts — is ~30 lines and kills the entire class, including any future regression in `claim`. Runner-up: `claim()` failing *between* `openSync(wx)` and `writeFileSync` (ENOSPC) leaves an **empty** lock that blocks the path for a full TTL — liveness, untested, and the reason the string-path release exists.

## Q10 — What all three reviews missed

**a) `headSha` resolves `git` through the adversary's `PATH` and `GIT_*` env — CRITICAL, and it collapses A2 without relocating anything.** `execFileSync('git', …)` inherits `process.env` wholesale. Two one-liners, both with default gate root:

```bash
printf '#!/bin/sh\necho %s\n' "$(cat forged.sha)" > /tmp/s/git && chmod +x /tmp/s/git
PATH=/tmp/s:$PATH git commit -m done          # hook's headSha → attacker-chosen sha
```

or, with no fake binary at all: `GIT_DIR=/tmp/fakerepo git commit` — `git -C <cwd> rev-parse HEAD` honors `GIT_DIR`, so the "trust-side recomputed HEAD" is the HEAD of a repo the agent fabricated. Either way `isFreshForSha(forgedArtifact.sha, headSha())` matches, because both sides now come from the adversary. The load-bearing input of the load-bearing primitive is resolved through the two most trivially hijackable channels in the process. Fix: invoke git with an absolute path recorded at hook-install time, pass `env` stripped of `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`/`GIT_OBJECT_DIRECTORY` and a sanitized `PATH`, or bypass the executable and resolve `.git/HEAD` → ref file directly (with a packed-refs fallback). Any of these is an hour of work.

**b) The S2 fix is incomplete: the weapon was kept and exported — HIGH.** `releaseCounterLock(counterLockPath())` unlinks whatever lock is at the path, unconditionally, from any code that can `import`. The docblock ("cleanup tooling only… do not use from a gate") is a comment, not a mechanism — and the examinee *is* arbitrary code with repo access: `node -e "import('./scripts/hooks/lib/gate-common.mjs').then(m=>m.releaseCounterLock(m.counterLockPath()))"` deletes the honest agent's live lock mid-section. The fix for "release deleted the thief's lock" shipped with the thief's primitive still on the public surface. Delete the branch; cleanup tooling can call `unlinkSync` itself and be reviewed as the dangerous code it is.

**c) `stampSessionStart` is exported, forward-movable, and destructive — MEDIUM.** The clamp only prevents *backwards* moves. "SessionStart hook only" is again a comment: the agent calls `stampSessionStart({ when: <future>, id: 'x', sha: headSha() })`, which **overwrites** the harness's anchor record (forensic loss of the real session binding) and, because `mtimeLooksFresh` compares against the anchor mtime, lets the adversary redefine which artifacts look recent. The anchor should be append-only per session, or content-hash-chained per Q3.

**d) A broken disable root collapses to "nothing disabled" — MEDIUM.** `listDisabled` returns `[]` on EACCES/ENOTDIR/EPERM, and `existsSync` swallows the same errors to `false`. Make the disable dir unreadable (`icacls /deny`, or replace it with a file) and every kill switch reads as absent: during an incident the operator throws the switch and nothing happens, silently. A channel whose *presence* is a control signal must distinguish "empty" from "broken"; broken should make the push gate refuse.

**e) Telemetry is forgeable evidence end to end — HIGH as a design constraint, state it now.** The agent can append fabricated `completed` lines, delete `fail-open` lines, or rewrite the whole file; it's in-repo and writable. Nothing in this slice says so, and slice-2 will otherwise treat "a telemetry line exists" as proof a gate ran. Telemetry is a debugging/forensics channel; only chain-anchored state (Q3.2) can be evidence.

**f) Minor, for completeness:** orphan `.tmp.`/`.stale.` files have no GC path (accumulate under adversarial ENOSPC or crash); `sessionId()` checks `CLAUDE_SESSION_ID` *before* `SWAN_GATE_SESSION_ID`, so the operator override can't override the harness, and its test is vacuous (`typeof x === x === null ? 'object' : 'string'` accepts anything); the common-test header says "14 to 20" but the file registers 15 checks.

---

## What is actually correct — so nobody "fixes" it backward

- **The acquire-side steal (S1 fix) is correct.** Rename + corpse-identity (dev/ino vs the statted file) closes the one-step-later double-hold against both honest races and forged `statFn`; the ghost test proves it, and the restore path is asserted. Correct as shipped.
- **Token-as-identity with inode corroboration and no `dev` comparison (S2 fix) is the right call**, including the Windows fstat/stat divergence handling — that's a genuinely non-obvious portability
