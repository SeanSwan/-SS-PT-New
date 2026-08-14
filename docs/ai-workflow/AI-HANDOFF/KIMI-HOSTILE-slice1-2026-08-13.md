# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-slice1-hostile-review-2026-08-13.md
**Seed:** (none)
**Tokens:** 6397 in / 10285 out | **Cost:** ~$0.1735 | **Wall:** 323.5s | **finish_reason:** stop

---

# HOSTILE CODE REVIEW — `gate-common.mjs` + test suite

**Reviewer:** Kimi K3 (architect of record) · **Date:** 2026-08-13

**VERDICT: DO-NOT-SHIP.** Not "rebuild from scratch" — the I/O primitives are sound and the file is ~85% correct — but three of the five load-bearing claims in the header comment have live counterexamples (mutual exclusion, the crash signal, and the freshness anchor), the provenance is 1,858 commits stale, and the file implements a pre-A2/A6 trust model. This ships only after rebase onto the reconciled tree plus the specific fixes below. Shipping it as-is means 24 downstream files inherit a lock that can be held by two processes at once.

---

## Ranked findings (severity order)

### S1 — CRITICAL: The stale-lock steal has a TOCTOU double-hold race. Both agents can hold the lock simultaneously.

Sequence, two processes, one stale lock:

1. A stats lock → age > 120s → stale.
2. B stats lock → age > 120s → stale.
3. A `unlinkSync` → succeeds. A `openSync('wx')` → succeeds. **A holds the lock.**
4. B `unlinkSync` → **succeeds — it unlinks A's brand-new lock**, not the stale one.
5. B `openSync('wx')` → succeeds. **B holds the lock.**

A and B both believe they hold it. Both write the counter. One write silently loses — the exact failure the lock exists to prevent, delivered by the lock itself. The author's comment ("another process reclaimed it first") only handles unlink *failure*. Unlink *success* against a lock that is no longer the one you statted is the bug. "Exactly one retry" is not the problem; the unconditional unlink is. The stale-TTL design also has no inode/identity binding anywhere: `statSync` at T1 and `unlinkSync` at T2 are not asserted to be the same file.

**Exact fix:** make the steal atomic via rename, and give the lock an identity:

```javascript
// at acquire: write holder identity, not an empty file
writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token: randomUUID(), ts: Date.now() }), { flag: 'wx' });

// at steal: rename is atomic; only one stealer can win the source path
const corpse = `${lockPath}.stale.${process.pid}.${randomUUID()}`;
try { renameSync(lockPath, corpse); } catch { return { ok: false, reason: 'contention', stolen: false }; }
try { unlinkSync(corpse); } catch { /* corpse cleanup is best-effort */ }
closeSync(openSync(lockPath, 'wx')); // single retry, now safe
```

After A renames, the source path no longer exists, so B's rename fails ENOENT → B correctly sees contention. The ping-pong the author feared from looped retries is actually prevented by *rename*, not by the retry count.

### S2 — CRITICAL: `releaseCounterLock` can delete another process's live lock.

A acquires, critical section runs long (>120s, or clock skew, or a stalled-but-alive process), B steals per S1. A finishes and calls `releaseCounterLock()` — unconditional `unlinkSync` — and deletes **B's** lock. Now C acquires while B is mid-write. No ownership check exists because the lock file is empty (S1 fix prerequisite).

**Exact fix:** remember `{dev, ino}` (from `fstatSync` on the acquire fd) plus the token; on release, `statSync` the path and unlink only if dev/ino/token match. Residual sub-millisecond race remains — document it, and bound critical sections well under the TTL, or heartbeat-touch the lock mtime during long holds.

### S3 — HIGH: `failOpen` swallows the telemetry failure. The "silence is the crash signal" design is self-defeating at exactly the point it matters.

`appendTelemetry` returns `false` on failure. `failOpen` — the one function whose entire stated purpose is "a fail-open that logs nothing is indistinguishable from a pass" — **ignores the return value** and returns `null` (allow) regardless. So: telemetry disk full / ENOTDIR / EACCES → every gate fails open, nothing is logged, and the system is in precisely the "dead guard reads as satisfied guard" state the module header says it exists to kill. The push gate's "newest telemetry line predates session" check partially rescues this *if* it fails closed on stale telemetry — but that's a downstream file's discipline, not this file's guarantee, and this file is the one making the contract claim.

**Exact fix:** `failOpen` must surface logging failure:

```javascript
export function failOpen(name, boundary, reason, latencyMs = 0) {
  const logged = appendTelemetry({ gate: name, boundary, result: 'fail-open', reason, latency_ms: latencyMs });
  if (!logged) {
    try { process.stderr.write(`GATE-TELEMETRY-FAILURE ${name} ${reason}\n`); } catch { /* last resort */ }
    return { failOpen: true, telemetrySound: false, gate: name, reason }; // NOT null
  }
  return null;
}
```

…and the architecture must state that a telemetry-unsound fail-open is a **block** at the push boundary (extend the R8-1 exception). Also note the concurrency corollary: two agents appending JSONL via `appendFileSync` can interleave/tear lines (Windows append semantics especially), and `readJsonl`'s skip-malformed policy silently absorbs the evidence — telemetry loss under exactly the two-agent load this system exists for. Keep lines < 4096 bytes and document the POSIX `O_APPEND` assumption.

### S4 — HIGH: The freshness anchor is forgeable by the constrained party. `touchSessionStart` is agent-callable and takes an attacker-controlled `when`.

`isFreshThisSession` fails closed against *absence* and fails **open against forgery**:

- Any process can `import { touchSessionStart } from './gate-common.mjs'` and call `touchSessionStart(new Date(0))` → session start = epoch → **every artifact ever written is "fresh"**. The doc comment frames re-stamping as an idempotency feature; it is a one-line bypass.
- The marker lives at `.ai-workflow/qa/.session-start`, inside the tree the agent demonstrably writes (it swept 728 lines into a dirty index today). `touch` alone defeats it; `utimesSync` on the artifact defeats it from the other side.
- This directly violates A6 (trust root written only by hooks) and is precisely what A2 was amended to fix. The fail-closed posture is theater while the input is adversary-controlled.

**Exact fix:** (a) `touchSessionStart` must never move the marker *backwards* — clamp `when >= existing mtime`; (b) the marker must carry contents — `{sessionId, headSha, ts}` — written only by the SessionStart hook, and consumers verify contents and session-id match, not bare mtime; (c) demote the whole function per A2 (ruling below); (d) inject the clock (`now = Date.now()` param) so the boundary is testable.

### S5 — HIGH: Self-writable kill switch with zero audit trail.

`isDisabled` checks for a file in `.ai-workflow/qa/disabled/` — agent-writable — and says nothing to anyone when it returns true. The header's defense ("visible in `ls`") addresses discoverability by a human who thinks to look, not authorization. The agent whose behavior this system constrains can `touch .ai-workflow/qa/disabled/review-round-gate` and the gate silently fails open (and per S3, even the fail-open line may not land). Also: `isDisabled(name)` does `join(disabledDir(), String(name))` with no sanitization — `isDisabled('../../../../tmp/x')` traverses. Names are internal constants today, but this is a shared library; future callers will pass interpolated values.

**Exact fix:** (1) every `true` result emits a `disabled-honored` telemetry line (memoize per process to avoid log spam); (2) the push gate must enumerate active disable markers and refuse PASS while any R8-class gate is disabled — disable is a *human rollback drill*, so its presence must be loud at the trust boundary; (3) reject `name` containing path separators; (4) per A6, longer-term: markers require human-authored content (a reason string + non-agent mtime heuristic is weak; a human-only path outside the repo root is strong).

### S6 — MEDIUM: Error-domain collapse in `readJsonSafe` is a loaded footgun for 24 future files.

The doc comment says callers distinguish absent-vs-corrupt "by checking existsSync first." That is (a) a TOCTOU in miniature, (b) unenforced — nothing in the type signature reminds the slice-7 author, and (c) collapses EACCES/EPERM into the same bucket as ENOENT, so a permissions failure reads as "no data yet" → fail open. `headSha` similarly collapses "git missing," "not a repo," and "detached/no commits" into `null` — acknowledged in the comment, and acceptable there because null is a real answer, but the `readJsonSafe` collapse directly feeds R8-2's fail-closed-on-corrupt requirement through caller discipline alone.

**Exact fix:** return a discriminated result — `{ ok: true, value } | { ok: false, error: 'missing' | 'corrupt' | 'unreadable' }` — and let callers opt into collapsing. This is a breaking signature change, which is exactly why it must happen in slice 1, before 24 callers exist.

### S7 — MEDIUM: The mutation-equivalence adjudication is overreach, and the suite has never seen concurrency.

The stale-TTL boundary mutant (`ageMs <= staleMs` → `<`) is **not semantically equivalent** — it observably changes behavior at age == 120_000ms. The honest adjudication is "behaviorally distinct but unkillable without clock injection, and immaterial at filesystem timestamp granularity." The author wrote "equivalent," which conveniently avoided the real fix: `acquireCounterLock` already takes `staleMs` but not `now`; Date.now() is a hidden dependency. With an injected clock the mutant dies in one test. Kill rate 1.00 with one written excuse is 13/14 plus a waiver — report it that way.

**Mutants the author did not plant that survive today:**

1. **`Math.round` → identity/trunc on `latency_ms`.** Tests use `7` and `'not-a-number'`; no fractional input exists. `latency_ms: 7.6` kills it. Survives.
2. **`??` → `||` on the `gate`/`reason` coercions.** No test passes `gate: ''`. Mutant turns an empty-string gate name into `'unknown'`; suite is blind. Survives.
3. **`failOpen` that drops the telemetry call entirely** is behaviorally indistinguishable from shipped code under every existing test, because no test exercises `failOpen` when `appendTelemetry` fails. The most important mutant class for this module's stated purpose — unplanted.
4. **The steal-path double-hold (S1)** — no multi-process test exists at all; every lock test is single-process sequential. A mutant that unlinks unconditionally on stale (i.e., the shipped code) survives trivially, because the suite cannot express the interleaving.
5. **`sessionStartMs` reading `atimeMs` instead of `mtimeMs`** — `touchSessionStart` sets both to `when`, so no test distinguishes them; on relatime/noatime mounts the atime variant is a real bug the suite would never catch. Survives.
6. **`headSha` `.trim() || null` → `.trim()`** — empty-output case untested; `''` is falsy like `null` but poisons `sha === null` checks. Survives.
7. **`ageMs === null` guard dropped** (unstattable-after-EEXIST → treated as stale → steal). Hard to induce portably, which is why it needed a planted fault-injection seam (`statFn` parameter). Survives.

Also missing: any test that `touchSessionStart` rejects a backwards move (there's nothing to test — the clamp doesn't exist), and any test that `isDisabled` rejects traversal names.

### S8 — LOW: No temp-then-rename primitive exists in the shared library (A4 gap).

A4 mandates temp-then-rename for artifact writes. This module offers only raw `appendFileSync`/`appendJsonl`. JSONL appends are legitimately exempt (append-only ledgers), but slice 2+ authors will reach for `writeFileSync` for verdict/anchor artifacts because this library gives them nothing better — and a crashed write then leaves a truncated artifact that passes an existence-plus-non-empty check: the exact incident described in the test file's own preamble. **Exact fix:** add `writeJsonAtomic(path, obj)` (write `path.tmp.<pid>`, `renameSync`) to this file now, so the correct pattern is the easy pattern.

### S9 — LOW: Telemetry is unbounded; session marker has no staleness ceiling.

`gate-telemetry.jsonl` grows forever; fine for slice 1, but note it. And a 6-day-old `.session-start` marker makes everything unfresh — fail-closed, correct — but the resulting permanent push-gate block is exactly the condition that trains a human to `touch` a disable file (S5). Fail-closed systems need a humane reset path or they get defeated by their own operators.

---

## Answers to the 7 questions

**1. Concurrency.** It double-acquires: the stale-steal unlink is not bound to the stat, so two stealers can both end up holding the lock (S1), and a slow legitimate holder can have its lock stolen and then delete the thief's lock on release (S2). It does not deadlock (the TTL guarantees progress) and it does not lose writes *on the happy path* (O_EXCL is correct for the uncontended and simply-contended cases). "Exactly one retry" is the right liveness choice but irrelevant to safety — the author aimed the retry limit at the ping-pong problem when the actual fix is atomic rename. With rename-based steal, one retry is provably sufficient.

**2. Freshness contract.** Fail-closed on unknown is correct *as far as it goes*, and no, the combination does not produce a silent allow on the absence axis: `isFreshThisSession → false` makes the consumer treat the artifact as stale, which blocks — the safe direction. The hole is the other axis: it fails **open against forgery**, because both the marker and the artifact mtimes are writable by the agent, and `touchSessionStart(new Date(0))` makes the universe fresh. Fail-closed on missing evidence plus forgeable evidence equals security theater.

**3. Telemetry self-defeat.** Yes, concretely: `failOpen` discards `appendTelemetry`'s return value, so the module's own headline contract ("silence becomes the crash signal") is void at the single call site where the line is load-bearing. The rescue currently lives in the push gate's freshness assert — a file that doesn't exist yet. Move the guarantee into this file (S3 fix) and downgrade torn-line risk (S3 corollary).

**4. Self-writable kill switch.** Not acceptable as written. A kill switch the constrained party can throw silently is a feature for the constrained party. It becomes acceptable only with: telemetry on every honored disable, push-gate visibility/refusal for R8-class gates, and (per A6) migration of the marker outside agent-writable space or behind human-authored content. The "visible in `ls`" argument is about a human auditing after the fact; the threat is the agent acting between audits.

**5. Test quality.** Covered in S7. The adjudication mislabels an unkillable-without-clock-injection mutant as "equivalent"; the correct response was injecting `now` and killing it. The suite's deeper problem is structural: zero multi-process coverage in a module whose reason to exist is two-agent contention, and no fault-injection seams, so the interesting mutants (S1 interleaving, stat-failure mid-steal, telemetry-failure-in-failOpen) are inexpressible. 14/14 against an 0.80 floor proves the happy path, nothing more.

**6. Portability.** Surprisingly decent — nothing Node-22-specific (`node:test` direct-run works 18+; no Windows-only APIs). Real risks: (a) `appendFileSync` append atomicity under concurrent writers is weakest on Windows — the platform they *tested* on — and better on POSIX, so Linux CI may mask nothing but macOS/Linux *deployments* inherit code validated against the wrong interleaving model; (b) `utimesSync`-based exact-equality tests flake on coarse-mtime filesystems (FAT, some network mounts, older CI images); (c) the NUL-byte probe's errno varies by platform (EINVAL vs ENOENT) — the assertion `notEqual 'contention'` is robust, but the *reason* asserted nowhere is platform-lucky; (d) `headSha` assumes `git` on PATH (handled: null); (e) case-insensitive filesystems make disable names collide on macOS/Windows but not Linux — pin names to lowercase; (f) if the two agents ever run in separate containers sharing a synced mount rather than one machine, filesystem mtime locks across sync lag are simply broken — document "same machine, same filesystem" as a hard precondition.

**7. Verdict.** **DO-NOT-SHIP** in current form. Blocking defects: S1 (lock double-hold), S2 (release deletes another's lock), S3 (failOpen swallows telemetry failure), S4 (forgeable freshness anchor / A6 violation), S5 (silent self-disable). Non-blocking but required before slice 2: S6 (typed readJsonSafe result — breaking change, do it now), S7 (clock injection + concurrency harness + the seven named mutants), S8 (writeJsonAtomic). Then rebase: 1,858 commits behind with A2/A4/A6 landing after authorship means this file must be re-reviewed against the reconciled blueprint anyway — the rebase is not optional hygiene, it's the review trigger.

---

## Ruling as architect: A2 vs. `isFreshThisSession`

**Both belong; A2 demotes, it does not delete.**

- **`subject_sha` becomes the evidence.** A review artifact must state the sha it covers; the consumer verifies `artifact.subject_sha === headSha()` (and, for push-time checks, that the anchor chain reaches current HEAD). This is unforgeable by mtime games — the agent cannot mint a sha binding for code it didn't review, because the consumer recomputes HEAD from git, which is on the trust side of the boundary.
- **mtime freshness is demoted to heuristic and internal plumbing.** It retains three legitimate, non-load-bearing roles: (a) the lock stale-TTL, which needs mtime and has no sha to check; (b) a human-facing tripwire — "this artifact claims sha X *and* is also 3 days old" is a useful anomaly signal worth telemetering; (c) a cheap pre-filter for UX before the sha check runs.
- **It must never again be the sole freshness proof for a gate decision.** Any consumer currently specced to call `isFreshThisSession` as its freshness check must be re-specced: sha binding is the decision input; mtime disagreement is a `suspect-artifact` telemetry event.
- **The session marker itself must comply with A6**: hook-written only, content-bearing (`{sessionId, headSha, ts}`), backwards-move-clamped. As shipped, `touchSessionStart` is an exported, agent-callable, `when`-parameterized trust-root writer — that signature is the defect, and it gets fixed in the same pass as S4 regardless of A2.

One sentence for the owner: the bones are good, the joints are broken — fix the lock, make failOpen honest, hook-write the freshness anchor, rebase, and *then* build 24 files on it.
