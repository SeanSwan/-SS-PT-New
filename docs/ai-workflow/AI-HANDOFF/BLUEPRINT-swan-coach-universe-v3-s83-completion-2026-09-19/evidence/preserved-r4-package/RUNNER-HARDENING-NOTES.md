# RUNNER-HARDENING-NOTES — the guarded Coach PostgreSQL runner

**Scope.** This file holds the defect narrative for `backend/run-coach-postgres.mjs` and its helper
modules. It was **relocated here from the runner's docblock in pass 6**, not deleted: the runner hit
the Rule 4 cap (300 lines) again while absorbing the R3-03 fix, and the narrative was the largest
block of prose in it. The runner now carries a condensed summary and points here.

Nothing in this file is a claim about test *results*. Results live in the evidence logs under
`tmp/coach-remediation-20260913/` and in `VERIFICATION-NOTES-REVIEW-*.md`. This file is about why the
runner is shaped the way it is.

---

## Why the runner exists at all

These suites were reported "blocked" for several sessions. They were never blocked by a missing
database server. Reconciling them found **six** independent issues, three of them environmental.
Identifiers are stable so the documents can cite them.

| Id | Issue |
|---|---|
| **PG-1** | `tests/helpers/coachTestDatabase.mjs` reads `SWAN_COACH_TEST_PORT` **only** and throws without it. It never reads `PG_HOST`/`PG_PORT`, so the previously recorded plan ("point them at the cluster with `PG_*`") could not have worked. (Astra A1-09.) |
| **PG-2** | No **aggregate** config existed. Precisely: `tests/helpers/` DOES hold seven per-suite configs — the issue is that nothing invokes them as a set. See `vitest.coach-postgres.config.mjs`. |
| **PG-3** | The twelve suites share ONE hardcoded database name and did not isolate from each other. |
| **PG-4** | **Three** of the twelve are `node:test` files, not vitest. Running them under vitest reports "No test suite found", which reads like a defect. |
| **PG-5** | The `node:test` group **raced itself**: `node --test` runs files concurrently by default and all three call the same migration `up()`. |
| **PG-6** | The connection budgets were tuned from a measurement that was itself wrong. See `tests/helpers/coachTestDatabase.mjs` for the corrected statement. |

**"Six identified issues" is not a proof that no seventh exists.** Two were found only by
re-executing work already recorded green, so a seventh is a live possibility, not a rhetorical one.

---

## Astra Review 2 (2026-09-19) — four findings that changed behaviour

| Id | Change |
|---|---|
| **R2-01** | The reset ran **once** before the `node:test` group, so the three files still shared predecessor state. It now runs before **every** node file, each file in its own child process. The old "order-independent by construction" claim was true of the vitest group only and was stated too broadly. |
| **R2-02** | `maxWorkers: 1` is process-local and cannot stop a **second** runner (or a concurrent agent under Rule 67) dropping the same schema. The runner now takes a database-scoped `pg_try_advisory_lock` lease for the whole run and **refuses to start** without it. LIMIT, stated because the review asked for it: this protects against a **cooperating** runner only. An arbitrary SQL client that ignores the lease is not protected against. |
| **R2-03** | A failed reset did not stop the dependent group. Now a reset failure is **terminal**: the dependent group is reported `NOT RUN` and the run exits nonzero. |
| **R2-12** | `exit 0` did not enforce the advertised cohort. Totals are now parsed and checked: zero failed, zero skipped/todo/cancelled in both groups, and the vitest file count must equal the number of vitest suite files actually on disk. Counts are a **cross-check** — the cohort identity comes from the file inventory, not from a number hardcoded in the runner that would rot. |

---

## Pass 4 self-review (2026-09-20) — no external reviewer; found by re-reading

Astra's Review 2 covered the **previous** revision. Re-reading the revision that came out of it
produced five further findings. None came from an external reviewer, and they are recorded so the
next reader does not have to rediscover them.

| Id | Finding |
|---|---|
| **F-1** | The vitest cohort gate never asserted that any test **ran** — unlike the node gate, which asserts `pass === tests` and `tests > 0`. MEASURED, THEN **DOWNGRADED**: vitest v4.1.10 reports a zero-test file as `Test Files 1 failed (1)`, so the old gate already caught it and no **reachable** path was demonstrated. Both gates now parse totals and compare numbers. Evidence: `tmp/coach-remediation-20260913/F1-GATE-PROBE-RESULT.txt`. |
| **F-2** | `closeLease` could **reject**, and the caller awaits it inside a `finally`. A failed release therefore escaped `main()`, suppressed the SUMMARY, and turned an all-passing run into an apparent crash — taking its own evidence with it. It can no longer throw. |
| **F-3** | The docblock never explained why a **killed** runner cannot wedge the next one. Session-scoped advisory locks are released when the session ends, so the `finally` is an optimisation and not the safety mechanism. Left unstated, the lease read as a deadlock hazard. |
| **F-4** | The SUMMARY printed `(released)` unconditionally — **asserting** the outcome rather than **reporting** it. It now reports what actually happened. |
| **F-5** | The runner echoed **raw ANSI** into its own log, so its summary was not greppable: `grep "passed ("` returned ZERO matches on a log that plainly contained "9 passed (9)". `stripAnsi` already existed and was applied to the CHECK but never to the ECHO. This was not theoretical — it produced a **false reading of a real evidence extraction** during pass 4. |

---

## Astra Review 3 (2026-09-19) — the findings that shaped pass 6

| Id | Change |
|---|---|
| **R3-01** | `--file` was reduced to a basename and handed to `node --test`, whose child cwd is `backend`, so `--file coachIntent` failed with `Could not find 'coachIntent.postgres.test.mjs'`. Suite identity is now ONE canonical backend-relative path — see `tests/helpers/coachSuiteSelection.mjs`. |
| **R3-02** | Four defects in the F-2 fix, all closed. The one that mattered: **the unlock boolean was discarded**, so the SUMMARY reported "held for the whole run" — a fact it had never verified. See `tests/helpers/coachDatabaseLease.mjs`. |
| **R3-03** | **The lease did not establish continuous protection of running children.** See below — this is the fix that changed the runner's control flow. |
| **R3-04** | The config advertised a command that bypassed the lease. The reset module now **refuses to load** outside the guarded runner. |
| **R3-08** | The timeout policy was neither executable nor a complete bound. Named profiles + an enforcing test. |

---

## R3-03 in full — why the runner no longer uses `spawnSync`

Astra, verbatim:

> The runner uses `spawnSync` at `backend/run-coach-postgres.mjs:145` and later unconditionally
> prints "held for the whole run" at line 275. […] Loss of the dedicated PostgreSQL session can
> release its advisory lock while a test child continues using independent database connections. A
> second runner can then acquire the lock. The parent cannot process asynchronous lease notifications
> while blocked inside `spawnSync`.

The gap, stated as a sequence:

1. The parent is killed, or the lease session dies, while a test **child** is still running.
2. The child holds its **own** database connections, so PostgreSQL releases nothing on its behalf.
3. The advisory lock is therefore free, and the next runner takes it happily.
4. The next runner drops the `public` schema — underneath a child that is still working.

A lock **cannot** be the crash signal here, because the operating system releases it on crash. That
is exactly the property that makes it useless for this question. **A file is not released on crash**,
so the marker is.

### The three changes

1. **Asynchronous child execution.** `spawnSync` → `spawn` + `await`. The parent can now observe and
   act while a child runs. A child that exceeds the deadline is killed and the run is marked
   **abandoned** rather than reported as a clean finish.
2. **Explicit lease-loss handling.** The lease client is supervised. If it errors or ends while the
   run is in progress, the current child is killed, no further child is launched, and the run is
   reported as **invalidated**. A lost lease is never silently tolerated.
3. **A fail-closed local target marker.** Created atomically **before** the lease is acquired,
   keyed by **target** (host/port/database) so cooperating runners in different worktrees see the
   same file. Retained after a crash, lease loss, or uncertain descendant termination. Recovery
   requires the marker's own token **and** a demonstrably quiescent target — no age check, no PID
   check, both of which Astra explicitly prohibited. See `tests/helpers/coachTargetMarker.mjs`.

### What this deliberately does NOT claim

- It does not protect against a **non-cooperating** client. Something that never runs this runner
  never reads the marker. Same limit as the lease (R2-02).
- Quiescence is measured as "no other backend on the target database". A child that is alive but
  momentarily connectionless is not detected. This **narrows** the window; it does not close it
  absolutely.
- It does not prove that parent termination reaps descendants on Windows. That is why the marker is
  retained on an uncertain finish rather than assumed clean.

---

## Usage

```
SWAN_COACH_TEST_PORT=55433 node run-coach-postgres.mjs
SWAN_COACH_TEST_PORT=55433 node run-coach-postgres.mjs --file coachWorkoutAtomic
SWAN_COACH_TEST_PORT=55433 node run-coach-postgres.mjs --recover-target=<token>
```

There is deliberately **no `--reset` flag**. An earlier draft documented one and the script never
read argv — a "phantom control", the same class as `USE_BULLMQ_RECONCILIATION`. It is also
unnecessary.

The target database is **DISPOSABLE**. The suites `sync()` and `drop()` tables by name and the reset
drops the `public` schema. Never point this at real data.
