# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-slice1-hostile-review-2026-08-13.md
**Seed:** (none)
**Tokens:** 6557 in / 12624 out | **Cost:** ~$0.0076 | **Wall:** 443.0s | **finish_reason:** stop

---

HOSTILE CODE REVIEW — scripts/hooks/lib/gate-common.mjs (Slice 1)
Reviewer: HY3 (independent parallel pass)
Scope: backend/tooling, terminal+file surfaces only
Verdict: DO-NOT-SHIP (blocking defects D1–D4)

==================================================================
SEVERITY-RANKED DEFECTS (blocking first)
==================================================================

[BLOCKER D1] Self-writable disable directory (Q4)
-------------------------------------------------
`isDisabled()` reads `.ai-workflow/qa/disabled/<name>`, a path under the repo
root that the constrained agent can freely write. The trust boundary says
gate state must be hook/tool/git-written, never agent-written. Here the agent
can simply `writeFileSync(join(disabledDir(),'review-round-gate'),'')` and turn
off any gate. That is a self-writable kill switch for a system whose only job
is to constrain that agent.

Exact fix:
- Move disable state out of the agent-writable tree. Read from a path set by a
  privileged hook via `SWAN_DISABLE_ROOT` (e.g. `/var/run/swan/disabled` or a
  git-notes ref), or require the marker to be a committed, hook-created file
  verified by `headSha()` + `git ls-files`. Until then, remove `isDisabled`
  from the security path; do not ship a gate that can be disabled by the
  examinee.

[BLOCKER D2] Freshness helper is mtime-based and forgeable; fails-closed return
              is undermined by fail-open consumers (Q2 + A2)
------------------------------------------------------------------------------
`isFreshThisSession()` returns false for unknown (fail-closed), but:
1. mtime is set by `utimesSync` — the agent can stamp any artifact to the
   session start and pass. A2 already obsoletes this: freshness must be
   consumer-checked `subject_sha`, not mtime.
2. The architecture says every consuming gate "fails OPEN on error". If a gate
   wraps the call and treats `false` (or any non-true) as an "error" condition
   and then calls `failOpen()`, the combination yields a guard that silently
   allows: unknown/unstattable => false => gate catches => failOpen => null
   (allow) with a "fail-open" telemetry line that looks intentional.
3. Even when used correctly (false => block), the mtime check is spoofable, so
   a blocked artifact can be re-stamped to look fresh.

Exact fix:
- Delete `isFreshThisSession` / `sessionStartMs` / `touchSessionStart` from the
  security contract now. Implement A2: `isFreshForSha(path, hookWrittenSha)`
  that compares `hashFile(path)` against a sha written ONLY by the SessionStart
  hook into a hook-owned file. Consumers must treat a mismatch OR missing sha
  as a hard block (fail-closed), never as `failOpen()`.

[BLOCKER D3] Telemetry swallows its own write errors; crash signal is
              self-defeating (Q3)
------------------------------------------------
`appendTelemetry` catches all errors and returns `false`. `failOpen()` ignores
that return and returns `null` (allow). So when the telemetry write fails
(disk full, `.ai-workflow` is a file, permission denied — all exercised in
tests), the gate STILL allows, and no line is written. The design claims
"silence becomes the crash signal", but here silence is manufactured by a
successful allow that couldn't log. The push gate may still see other recent
lines and print PASS, so the allow is invisible.

Exact fix:
- Change the contract: telemetry failure is a security event, not a swallowed
  error. Make `appendTelemetry` return `false` and have `failOpen` (and every
  gate decide()) do:
    if (!appendTelemetry({...})) { return BLOCK; } // fail-closed, never null
  or throw `TelemetryUnavailable` and require callers to block on catch.
- Additionally, on telemetry failure, write a synchronous stderr warning or
  exit non-zero so the hook framework knows evidence is missing.

[BLOCKER D4] Counter lock: no owner, no heartbeat, release deletes any lock
              (Q1)
-------------------------------------------------------------------------
`acquireCounterLock` uses `O_EXCL` then reclaims only on `mtime > 120s`.
- No PID/session is written into the lock. `releaseCounterLock` unconditionally
  `unlinkSync`s the path. If Agent A holds the lock and is alive but slow
  (>120s) or suspended, Agent B reclaims it (stale by mtime). Now BOTH believe
  they hold it. A later finishes and calls `releaseCounterLock`, deleting B's
  lock file. B then writes the counter, A overwrites it => lost write / double
  increment. The "exactly one force-unlink retry" does NOT prevent this; it
  only stops a steal ping-pong after the first steal.
- The boundary `ageMs <= staleMs` means a lock aged exactly 120 000 ms is NOT
  reclaimed; fine, but see D5 for test gap.

Exact fix:
- Write owner PID + session + acquire time into the lock file content on
  `openSync('wx')`.
- Before stealing, read the lock; if `ageMs > staleMs` but the owner PID is
  alive (POSIX `kill(pid,0)`, Windows `tasklist`/OpenProcess), do NOT unlink —
  wait or return contention.
- While holding, refresh mtime via `utimesSync` on an interval < TTL if the
  critical section can exceed it.
- `releaseCounterLock` must read the lock, compare owner, and only unlink if it
  matches; otherwise return `false`.

==================================================================
HIGH / MEDIUM
==================================================================

[HIGH D5] Test suite adjudication is an excuse; mutants survive (Q5)
-------------------------------------------------------------------
The suite claims mutation kill 1.00 post-adjudication, with the stale-TTL
boundary mutant called "equivalent". It is NOT equivalent:
- The stale-reclaim test sets age = TTL + 60 000 ms, so a mutant changing
  `ageMs <= staleMs` to `<` (reclaim at exactly TTL) is never exercised. That
  mutant survives.
- No test covers the double-acquire/lost-write window in D4 (single process,
  sequential). A mutant that makes `releaseCounterLock` delete a lock owned by
  another process, or that returns `ok:true` after the post-unlink `openSync`
  hits EEXIST, survives.
- No test covers D3: a mutant where `failOpen` still returns `null` when
  `appendTelemetry` returned `false` is exactly the shipped code and is "passed"
  because the test only asserts `null` is returned — it never asserts the allow
  is SUPPOSED to be blocked on telemetry failure.
- The "NUL byte" test proves non-EEXIST isn't laundered to contention, good,
  but it does not cover the live-owner steal.

Required new tests:
- Acquire lock, set mtime to exactly `Date.now() - LOCK_STALE_MS`, second
  acquire must report `contention` (proves `<=` boundary).
- Two simulated owners (write PID into lock manually) — reclaim must refuse
  when PID alive.
- `failOpen` must NOT return allow when `appendTelemetry` returns false (force
  the ENOTDIR case and assert block).

[MED D6] Portability off Windows / Node 22 (Q6)
------------------------------------------------
Logic is mostly portable, but:
- `O_EXCL` (`wx`) is not atomic on network filesystems (NFS/SMB) common on
  Linux/macOS; the lock can double-acquire there regardless of code. Use a
  lockfile library or flock where available.
- On Windows some AV intercepts `wx` and may return `EACCES` instead of
  `EEXIST`; the code only special-cases `EEXIST`, so a real open fault could be
  mislabeled `contention` (partially mitigated by the NUL-byte test, but not
  for AV-style errors).
- Numeric separator `120_000` breaks on Node < 12.5 (syntax error). If any
  host runs older Node, the module won't parse.
- `mtimeMs` resolution on FAT/network mounts is coarse; 120 s TTL hides it,
  but sub-second freshness checks would skew.
- No OS break in `execFileSync('git')` assuming git on PATH; otherwise returns
  null, already handled.

==================================================================
DIRECT ANSWERS TO HOSTILE-REVIEW QUESTIONS
==================================================================

Q1 (concurrency): Lost-write/double-acquire window is the no-ownership +
no-heartbeat steal after 120 s while the first agent is still alive, and the
unconditional `releaseCounterLock` deleting the thief's lock. "Exactly one
retry" does not close it.

Q2 (freshness + fail-open): The helper is fail-closed, but if a consumer maps
"false/unknown" to its error path and fails open (as the architecture permits),
the result is a silently allowing guard. Plus mtime is forgeable (A2), so even
a correct block is bypassable. Combination is unsafe.

Q3 (telemetry): Self-defeating. The crash signal relies on a write that
returns `false` on failure and is ignored by `failOpen`; a successful allow with
no log looks like a crash to the push gate but was actually a silent allow at
the local gate.

Q4 (disable): Not acceptable. Agent-writable disable dir = self-disable for a
constraint system. Must be hook-only writable.

Q5 (tests): Adjudication of the stale-TTL mutant as equivalent is wrong; the
boundary at exactly TTL is untested. Surviving mutants: TTL `<=` vs `<`, lock
ownership/release cross-owner delete, `failOpen` ignoring telemetry failure,
post-unlink EEXIST double-acquire.

Q6 (portability): `wx` not atomic on NFS/SMB; possible `EACCES` instead of
`EEXIST` on Windows AV; numeric separator breaks Node <12.5; otherwise logic
ports but lock safety does not.

Q7 (verdict): DO-NOT-SHIP. Branch is 1 858 commits behind, A2/A4/A6 amendments
not incorporated, and D1–D4 are each independently sufficient to block. Fix D1–D4,
reconcile to `origin/main`, re-run a hardened suite (D5), then re-review.

==================================================================
END REVIEW
==================================================================
