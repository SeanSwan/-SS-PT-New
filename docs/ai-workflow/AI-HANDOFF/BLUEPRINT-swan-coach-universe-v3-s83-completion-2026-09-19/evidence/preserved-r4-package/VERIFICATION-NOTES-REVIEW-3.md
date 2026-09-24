# VERIFICATION NOTES — ASTRA REVIEW 3 · and the pass-6 fixes

**Date:** 2026-09-20 UTC · **Operator:** Sean · **Repo:** SwanStudios (SS-PT)
**Subject:** Astra's hostile review of passes 4 and 5, and the fixes made in response.
**Verdict returned by Astra:** **REVISE** — advisory only. Under Rule 46 the commit gate is **Fable's**,
and it remains **UNSPENT**. Nothing in this pass was committed or pushed.

**Companion documents**
- `ASTRA-REPLY-REVIEW-3.md` — Astra's reply, unedited (779 lines).
- `CONSULT-PACKET-REVIEW-3-PREAMBLE.md` — the remit and the twelve falsifiable claims it was given.
- `RUNNER-HARDENING-NOTES.md` — the runner's defect narrative, relocated there in this pass.
- `VERIFICATION-NOTES-REVIEW-2.md` — the previous round. **Read it second**: Review 3 corrects it.
- `tmp/coach-remediation-20260913/EVIDENCE-pass7-review3.txt` — the raw evidence behind §5.

---

## 0. WHAT THIS DOCUMENT IS

Astra reviewed the revision it had never seen — passes 4 and 5 — and returned **ten findings,
R3-01 … R3-10**. This document records, for **every** finding, an adjudicated verdict and the
execution that supports it, then what was actually changed.

**The rule this document follows, inherited from its predecessor:** no finding is relayed unverified,
and no fix is claimed without its output. Where Astra is right, it says so plainly — including where
that is unflattering, and it is unflattering in §4.

**The two findings that mattered most, in opposite directions:**

- **R3-07 is the one to read.** Astra's review forced me to discover that a *mechanism I had recorded
  as measured* was **fabricated**. I had written, in two files, that the intermittent flake was caused
  by a fixture deliberately killing a connection mid-commit. The fixture does no such thing — it runs
  a real `COMMIT` and then throws a synthetic JavaScript error. The story was plausible, it was
  consistent with the observations, and **it was not true**. It has been deleted, not softened. See §4.
- **R3-03 is the one that was fixed.** Astra rated it **High**: the database lease established lock
  *availability* but not *safety*. That is a real gap, it is now closed by a fail-closed target
  marker, and §3 shows it working against an actual crash of the runner.

---

## 1. WHAT WAS COMMISSIONED, AND WHAT CAME BACK

The review was run through the Mega Blueprint pipeline (`scripts/lib/mega-blueprint-mandate.mjs`),
which was armed and verified before the call — a dry run confirmed `megaBlueprint=true`,
`contract_headings_present=true`, `both_hostile_reviews_present=true`, exit 0. The packet was
3,785 lines / 190,546 characters.

**Receipt, as recorded by the transport:**

| | |
|---|---|
| model | `gpt-6-astra` (ChatGPT subscription — **$0 marginal**) |
| `wallSeconds` | 437.4 |
| `inputTokens` | 380,271 |
| `outputTokens` | 13,444 |
| `reasoningOutputTokens` | 2,224 |
| `megaBlueprint` | true |
| verdict | **REVISE** |

Astra's reply carries the required `## PART A / B / C` structure, and **it decomposes cleanly**. The
splitter was run against it:

```
$ node scripts/split-astra-blueprint.mjs --in <reply> --out-dir <dir> --check --mega-blueprint
[split] PART A: 17363 chars
[split] PART B: 26198 chars
[split] PART C: 2505 chars
[split] PART B documents found: 9
[split]   OK  00-README.md (25 lines) … 07-checkpoints.md (40 lines) · 09-tests.md (72 lines)
[split] --check: nothing written.
CHECK EXIT=0
```

> **CORRECTION (self-caught, same pass).** An earlier draft of this section reported a "contract
> defect": that `08-decision-density-self-test.md` was missing from PART B. **That was wrong, and the
> error was mine, not Astra's.** `FORGE_DOCS` in `scripts/lib/mega-blueprint-mandate.mjs` runs
> `00-README.md` … `07-checkpoints.md`, and `MEGA_BLUEPRINT_EXTRA_DOCS` is `['09-tests.md']` — **there
> is no `08-*.md` in the required set at all.** The numbering skips 08 by design, and the
> decision-density self-test is delivered as **PART C**, not as a numbered PART B document. I inferred
> a requirement from a naming convention instead of reading the list that defines it, then published
> the inference as a finding. It is recorded here rather than quietly deleted because it is the same
> class of error as R3-07 — see §4.

---

## 2. PER-FINDING ADJUDICATION

Every verdict below is **mine, after executing something**, not a restatement of Astra's. Where I
could not execute, it says UNVERIFIED.

### R3-01 — Node single-file mode loses the directory · Medium · **CONFIRMED, FIXED**

Astra: `--file` was reduced to a basename and handed to `node --test`, whose child cwd is `backend`.

**Reproduced before fixing:** `--file coachIntent` printed
`Could not find 'coachIntent.postgres.test.mjs'`.

**Why it was never a false green.** The cohort gate caught it and the run exited 1. That is worth
recording precisely: this defect was *loud*, not silent. It was a broken feature, not a broken verdict.

**Fix.** Suite identity is now ONE canonical backend-relative path, in
`tests/helpers/coachSuiteSelection.mjs`, with `labelOf` surviving only as a display string. All three
accepted spellings (`coachIntent`, `coachIntent.postgres.test.mjs`, the full path) resolve to the same
descriptor, and an unknown name is refused *with the known list*.

**Evidence:** `--file coachIntent` → **8/8, exit 0**; `--file coachIntent.proof` → 8/8;
`--file coachIntentListing` → 2/2; `--file coachWorkoutAtomic` → 13/13 — each with
`held from acquisition to release (verified)`. New coverage: `coachSuiteSelection.test.mjs` (10 tests).

### R3-02 — Lease cleanup still throws and still invents a successful release · Medium · **CONFIRMED, FIXED**

Four defects, all closed in `coachDatabaseLease.mjs`:

| | Defect | Fix |
|---|---|---|
| (a) | **The unlock boolean was discarded.** `pg_advisory_unlock` RETURNS a boolean; the code set `unlocked = true` whenever the statement did not throw. | The returned value is now inspected. `true` → released; `false` → **"NOT HELD at release — the lease was lost during the run"**; absent → UNVERIFIED. |
| (b) | A throwing `warn` callback propagated out of the `catch`, skipping `client.end()`. | Warnings go through `notify`, which cannot throw. |
| (c) | `err.message` on a `null` rejection made the catch block itself throw. | `safeMessage` stringifies defensively. |
| (d) | A successful `connect()` followed by a rejected lock query leaked the client. | Ownership begins at `connect()`; every give-up path closes what it opened. |

**On (a), which is the one that mattered.** I found this **independently, before Astra's reply
arrived**, by measuring the function on PostgreSQL 17:

```
A takes the lock                                    -> true
B unlocks a lock B does NOT hold (A still holds it) -> false
A unlocks (A is the holder)                         -> true
A unlocks AGAIN (A no longer holds it)              -> false
```

So the boolean is the **only** in-band signal distinguishing "held and released" from "never held".
Without it, the SUMMARY printed `held for the whole run` — a fact it had never verified. That is the
same asserting-rather-than-reporting class as F-4, in the direction pass 4 did not cover.

**Why the existing tests could not have caught it.** The pass-4 fake returned `{ rows: [] }` for the
unlock, while the real driver returns `{ rows: [{ released: <boolean> }] }`. **A fake that does not
resemble the driver structurally cannot see the defect.** The fake now returns the real shape.

### R3-03 — The lease does not establish continuous protection of running children · **High** · **FIXED — see §3**

### R3-04 — An advertised command still bypasses the lease · Medium · **CONFIRMED, FIXED**

Astra quoted `vitest.coach-postgres.config.mjs:66`, which advertised
`npx vitest run --config vitest.coach-postgres.config.mjs` — a command that performs destructive
resets **without** the lease.

**Fixed with enforcement, not prose.** `resetCoachTestSchema.mjs` now **refuses to load** unless
`SWAN_COACH_RUNNER=1`, which only the guarded runner sets:

```
REFUSED: the Coach PostgreSQL schema reset may only run under the guarded runner.
```

**Evidence:** the bare `--config` invocation now **exits 1**; the guarded runner still works
(`--file coachIntentListing` → 2/2, exit 0). The advertised command in the config was replaced by the
guarded one, with an explicit "INVOKING THIS CONFIG DIRECTLY IS NOT SUPPORTED" block.

### R3-05 — Pool tests provide useful evidence, but their strongest claims exceed their assertions · Medium · **CONFIRMED, FIXED**

Three precision defects in `coachWorkoutPoolBudget.postgres.test.mjs`:

- The peak was measured from a point that included the proposal's own acquisition. `beginApprovalMeasurement()`
  now resets the counters **after** `proposal()`, so the peak is the *approval's* peak.
- The losers' rejection was asserted by shape, not pinned. **Measured** rather than guessed — a
  temporary diagnostic printed `409 PROPOSAL_NOT_PENDING` ×4 — and the test now pins **status and code**.
- Timeout and recovery were exercised on *different* proposals. Astra's point: that repeats the
  original evidence gap. The combined test now performs timeout → release → rollback-verify → retry on
  the **same** proposal.

**A sequencing bug I introduced while making this fix, recorded because it is instructive:** I first
called `assertProposalRolledBack` *while the pool was still fully held*. That helper issues its own
queries, so it hit the very `Operation timeout` the test exists to observe — **the assertion could not
run in the state it was verifying.** Reordered to timeout → release → verify → retry, with the reason
in a comment.

### R3-06 — Failure paths can leave test-owned work alive · Medium · **CONFIRMED, FIXED**

- The revocation test in `coachWorkoutAtomic.postgres.test.mjs` left an in-flight approval orphaned.
  It is now observed immediately, converted to a never-rejecting `.then(ok, err)` shape, settled in a
  `finally`, and the barrier also settles if the approval finishes early.
- Pool acquisition is now inside the guard, so a throw cannot skip the release.

### R3-07 — Environmental attribution and some timing claims are unsupported · Medium · **CONFIRMED — the most important correction**

**Astra was right, and it was worse than a wording problem.** I had recorded that the intermittent
flake was caused by the fixture deliberately killing a connection mid-commit. I re-read
`coachWorkoutAtomic.postgres.test.mjs:168–174` and **the fixture runs a real `COMMIT` and then throws
a synthetic JavaScript error. It never kills a connection.** My recorded mechanism was fabricated.

Actions taken:
- The fabricated mechanism was **deleted** from `coachTestDatabase.mjs` and from
  `VERIFICATION-NOTES-REVIEW-2.md` §8.3, and replaced with an explicit CORRECTION block.
- "Durations tightened to ~41 s" was **backwards**. Measured: pre **35.49–35.92 s** → post
  **40.19–44.42 s**. The runs got **slower**. Corrected with the full measured set.
- The invalid "±6 % variance" inference was withdrawn.
- Four over-broad elimination claims were each narrowed.
- The flake cause is now labelled **UNRESOLVED**, and the budget **PROVISIONAL**.

**The probability math, because three greens are not proof:** at a 1-in-7 base rate,
P(0 failures in 3 runs) ≈ **63 %**; P(0 in 5) = 46.27 %; P(0 in 8) = 29.14 %.

### R3-08 — Timeout policy is neither executable nor a complete operation bound · Medium · **CONFIRMED, FIXED**

The budget chain was duplicated across three files with **no enforcing test**, which is why a pass-5
widening silently broke a coupling documented elsewhere.

**Fixed by making it executable:** two frozen named profiles in `coachTimeoutProfiles.mjs`, plus a test
that reads the **actual imported settings** back out — `sequelize.options.pool.acquire`,
`dialectOptions.connectionTimeoutMillis`, `config.test.hookTimeout` — rather than grepping docs.

**Why two profiles and not one chain:** a universal strict-order assertion would be **wrong**. The
pool-budget suite deliberately sets `acquire = 1500` **below** `connect = 15000`, because exhaustion
must be fast. That inversion is asserted **positively**, so a future pass cannot "correct" it and
silently destroy the suite's purpose.

**The guard caught its own blind spot in this very pass.** When the child deadline moved to
`coachChildRunner.mjs` (R3-03), the guard **failed**:

```
AssertionError: expected '#!/usr/bin/env node\n/**\n * run-coac…'
                to match /timeout: SHARED_PROFILE\.childDeadlin…/
```

That is the guard working. It was re-pointed at the budget's new home and a **behavioural** assertion
added (the deadline is actually wired to `setTimeout`/`clearTimeout`), not relaxed.

### R3-09 — Cohort checks still have narrower guarantees than their documentation · Low · **CONFIRMED, FIXED**

Three parts:

- **`cancelled` was never read.** A cancelled test counted as neither pass nor fail and would have
  slipped through. Now rejected.
- **The ANSI pattern was incomplete.** It did not cover private-parameter CSI or OSC sequences.
  Replaced with the full `ansi-regex` pattern, and verified by probe: **1,407 ESC bytes → 0**.
- **The vitest-gate claim was overstated.** I had written that the gate "no longer depends on which
  words vitest prints". Narrowed to what is true: a wording change cannot turn a **non-passing**
  cohort into a **passing** one; it can still silence the category checks.
- Added a **category-sum cross-check**: pass+fail+skipped+todo+cancelled must equal the declared total.

**`nodeTestRunnerSeparation.test.mjs:33` skips `integration`**, leaving the partition unguarded. That
gap is now closed by `coachSuiteSelection.test.mjs`, which asserts the config's `exclude` list matches
`NODE_TEST_SUITES`.

### R3-10 — The verification ledger cannot substantiate its complete closure tally · Medium · **PARTIAL**

Astra listed seven artifacts absent from the packet, and was right about every one. This is a fair
criticism of the **packet**, and it is also a fair criticism of the **practice**: I had been carrying
"14 confirmed" forward without per-claim status.

**What was done:**
- Tests named `RED:` were renamed **`CHARACTERIZATION:`**. Astra is correct that they assert the old
  defect's behaviour and pass as written — they are not recorded failing executions of a new
  requirement. RED→GREEN is now reserved for an actual red-then-green pair (§5.2 shows one).
- Exit codes, SHA-256 source hashes and actual test results are now captured per run in
  `EVIDENCE-pass7-review3.txt`.
- This document is itself the per-claim ledger: every finding above carries its own verdict and its
  own evidence rather than inheriting a tally.

**What was NOT done, and should not be read as done:** the packet for a *future* review still needs
the raw artifacts Astra asked for (the corrected latency probe, the standalone reset, before-versions
of changed fixtures). A future reviewer would still have to ask for them.

---

## 3. R3-03 — THE FIX THAT MATTERED

Astra, verbatim:

> The runner uses `spawnSync` at `backend/run-coach-postgres.mjs:145` and later unconditionally prints
> "held for the whole run" at line 275. […] Loss of the dedicated PostgreSQL session can release its
> advisory lock while a test child continues using independent database connections. A second runner
> can then acquire the lock. The parent cannot process asynchronous lease notifications while blocked
> inside `spawnSync`.

### Why a lock cannot be the crash signal

1. The parent is killed, or the lease session dies, while a test **child** is still running.
2. The child holds its **own** database connections — PostgreSQL releases nothing on its behalf.
3. The advisory lock is therefore **free**, and the next runner takes it happily.
4. The next runner drops the `public` schema, underneath a child that is still working.

The operating system releases a lock on crash. **That is precisely what makes it useless for this
question.** A file is not released on crash, so the marker is.

### The three changes

1. **Asynchronous child execution** (`tests/helpers/coachChildRunner.mjs`). `spawnSync` → `spawn` +
   `await`. The parent stays live. `kill()` is exported and wired to lease loss.
2. **Explicit lease-loss handling.** The lease client is supervised; on `error` or `end` during the
   run the current child is killed, no further child starts, and the run is reported **INVALIDATED**.
   A lost lease is never silently tolerated.
3. **A fail-closed target marker** (`tests/helpers/coachTargetMarker.mjs`). Created **atomically**
   (`O_CREAT|O_EXCL`) **before** the lease is acquired, keyed by **target** (host/port/database) so
   cooperating runners in different worktrees see the same file. Retained on crash, lease loss or
   uncertain descendant termination. Recovery requires the marker's own token **and** a demonstrably
   quiescent target — **no age check, no PID check**, both of which Astra explicitly prohibited.

### It works, against an actual crash

A full run was started and the parent node process was killed ~14 s in. Measured on the crashed target:

| | |
|---|---|
| backends connected to `coach_test_20260906` | **0** |
| advisory-lock holders for key `776012026091900` | **0** |
| **marker present** | **YES** |

**That table is R3-03, measured.** The lock freed itself and would have admitted the next runner; the
marker did not. The next run then **refused** (exit 5, printing the recorded token), and recovery with
that token succeeded (exit 0, marker cleared). Full transcript in `EVIDENCE-pass7-review3.txt` §5.

### What this deliberately does NOT claim

- **Not** protection against a **non-cooperating** client. Something that never runs this runner never
  reads the marker. Same limit as the lease (R2-02).
- Quiescence is "no other backend on the target database". A child alive but momentarily
  connectionless is **not** detected. This narrows the window; it does not close it absolutely.
- It does **not** prove that parent termination reaps descendants on Windows. That is exactly why the
  marker is retained on an uncertain finish rather than assumed clean.
- ~~The quiescence-refusal path is not demonstrated end-to-end.~~ **CLOSED — see §5.6.** In the crash
  test the orphaned children died with the shell, so `0 backends` was measured on an already-quiet
  target. That left the refusal itself covered only by unit tests with a fake client. It has since
  been **verified against a genuinely live backend**.

---

## 4. CORRECTIONS THIS REVIEW FORCED ON MY OWN RECORD

Listed separately because they are about the **practice**, not the code.

1. **A fabricated mechanism was published.** §2/R3-07. It is the single most serious item in this
   document. The lesson is not "be careful" — it is that a plausible mechanism, consistent with the
   observations, **survived several passes of review by me** because I never re-read the fixture. The
   fix is procedural: the claim now carries the file:line that would falsify it.
2. **A headline timing claim was backwards.** "Tightened to ~41 s" described a slowdown.
3. **A statistical inference was invalid.** "±6 % variance" was read from a sample that could not
   support it.
4. **A defect was published as fixed while it was live.** Recorded in Review 2 and unchanged: defect 6
   was declared fixed twice and was still live both times. Only executing the chain falsified it.
5. **Rule 4 was breached by my own fixes, twice in this pass.** The runner hit 344 lines mid-pass-4,
   and 303 lines again in pass 6 (`coachTargetMarker.test.mjs`). Both were fixed by **extraction** —
   `coachSuiteSelection.mjs`, `coachChildRunner.mjs`, `coachTargetMarker.mjs`, and a test split — not
   by deleting the prose that explains why the code exists. Final state: **0 files over 300 lines.**
6. **I published a finding that was not a finding.** §1's "contract defect" — a missing
   `08-decision-density-self-test.md` — **did not exist.** I inferred a requirement from a naming
   convention instead of reading `MEGA_BLUEPRINT_REQUIRED_DOCS`, then reported the inference as a
   defect in someone else's work. Astra's reply is complete and conformant (`--check`, exit 0, 9/9
   documents). This is item 1's class again, in the opposite direction: item 1 published a mechanism I
   had not re-read; this published a *requirement* I had not read. Both are claims stated with more
   confidence than their evidence, and both were caught only by going back to the source.

**The pattern across items 1, 2, 3 and 6.** Every one of them is a **claim about evidence** that
outran the evidence: a mechanism not re-read, a direction of change not re-measured, an inference
presented as a measurement, a requirement not looked up. The code defects were found by executing the
code; these were found only by re-reading the *claims*. The practical rule that follows is narrow and
usable: **before a claim is written down, attach the command or the file:line that would falsify it.**
A claim that cannot name its own falsifier is not yet a claim.

---

## 5. VERIFICATION OF THE FIXES

### 5.1 Harness unit suites — 117 tests, 8 files, exit 0

```
     Test Files  8 passed (8)
          Tests  117 passed (117)
```

Per file, counted from a `--reporter=verbose` run; the counts sum to the reported total exactly
(117), so no file is silently absent from the aggregate:

| file | tests | |
|---|---|---|
| `cohortChecks.test.mjs` | 28 | R2-12 / R3-09 gates |
| `coachDatabaseLease.test.mjs` | 17 | R3-02 |
| `coachTimeoutProfiles.test.mjs` | 12 | R3-08 |
| `nodeTestRunnerSeparation.test.mjs` | 4 | pre-existing |
| `coachSuiteSelection.test.mjs` | 10 | **new** — R3-01 / R3-09(c) |
| `coachTargetMarker.test.mjs` | 25 | **new** — R3-03 |
| `coachTargetPreflight.test.mjs` | 7 | **new** — R3-03 |
| `coachChildRunner.test.mjs` | 14 | **new** — R3-03 |
| **total** | **117** | |

### 5.2 RED before GREEN — shown, not asserted

The marker's atomicity was mutated (`openSync(…, 'wx')` → `'w'`) and the tests re-run:

```
     × REFUSES when one already exists, and reports what is there
     × does NOT overwrite — the first run's token survives the second attempt
     Tests  3 failed | 10 passed (13)
```

Restored → **25 passed**. The tests fail when the property is removed, so they measure it.

### 5.3 Full cohort — three runs, EXIT 0 ×3

```
run 1 EXIT=0   run 2 EXIT=0   run 3 EXIT=0
Test Files  10 passed (10)   Tests  130 passed (130)
node:test  8 / 8 / 2 pass · 0 fail · 0 skipped · 0 cancelled  (all three files)
database lease:  held from acquisition to release (verified) · release: released
cohort: all identities and zero-skip checks satisfied.
Target marker after all three runs: CLEARED
```

### 5.4 The marker lifecycle, six ways

| Case | Result |
|---|---|
| clean run | marker **cleared** |
| stale marker present | **refused**, exit 5, marker **retained**, token printed |
| recovery, wrong token | **refused**, exit 5, marker **retained** |
| recovery, correct token + quiescent | **cleared**, exit 0 |
| **parent killed mid-run** | marker **retained**; lock freed (0 holders); next run **refused** |
| **recovery while a backend is connected** | **refused**, exit 5, marker **retained** |

### 5.5 Claim → evidence

| Claim | Evidence |
|---|---|
| `--file` single-suite mode works for all suites | 8/8, 8/8, 2/2, 13/13, exit 0 |
| The lease's release outcome is verified, not asserted | `pg_advisory_unlock` boolean measured on PG17 |
| A bare `--config` cannot bypass the lease | exit 1 with the REFUSAL message |
| The timeout chain is enforced | 12 tests reading the real imported settings |
| Every single-file path works | `--file` ×4 re-run after the R3-03 rewrite: 8/8, 8/8, 2/2, 13/13, all exit 0 |
| The marker survives a crash and blocks the next run | §3 table, `EVIDENCE-pass7-review3.txt` §5 |
| Quiescence is measured, not assumed | §5.6, `EVIDENCE-pass7-review3.txt` §5b |
| Rule 4 holds | 0 files over 300 lines (19 files hashed) |
| Every touched file parses | `node --check` clean on all 19 |

### 5.6 Closing the quiescence gap — a live backend, not a fake

The crash test (§3) left one honest hole: the orphaned children died with the shell, so recovery ran
against an **already-quiet** target. The refusal half of the quiescence gate was therefore covered
only by unit tests with a fake client. It has since been run against a real connection:

```
backends on coach_test_20260906 while a psql session holds one ..... 1

  recovery with the correct token  ->  RECOVERY REFUSED: 1 other backend(s)
                                       are still connected ... EXIT=5
                                       marker: RETAINED            [correct]

  (holder disconnects)
backends ........................................................... 0

  recovery with the same token     ->  recovery: target verified
                                       quiescent; marker cleared ... EXIT=0
                                       marker: cleared             [correct]
```

**Why this is worth a section of its own.** The refusal is driven by the **actual `pg_stat_activity`
count**, and the same marker clears the instant that count reaches zero — so the gate is measuring the
database, not replaying a fixture. A fake client could not have shown that.

---

## 6. WHAT IS **NOT** FIXED — OPEN ITEMS, STATED PLAINLY

- **The intermittent flake is UNRESOLVED.** The fabricated explanation was removed; no replacement
  explanation is offered, because I do not have one. Three greens do not bound it — at 1-in-7,
  P(0 in 3) ≈ 63 %.
- **R3-10 is PARTIAL.** The packet for a future review still lacks the raw artifacts Astra named.
- ~~The quiescence refusal is unverified against a live busy target.~~ **Closed** (§5.6).
- **No workload-derived threshold.** `30000` is chosen, not derived; the measured peak bounds **one** path.
- **A non-cooperating SQL client is not protected against** (R2-02). Stated, and unfixable here.
- **Astra's `[UNKNOWN]` items remain UNVERIFIED:** the `19/19` guard cohort; the migration-chain
  outcome; R2-06's corrected probe and raw measurement; R2-13's README; R2-15's full correction set.
- ~~The Review-3 reply has not been split, and the missing `08-decision-density-self-test.md` remains
  unexplained.~~ **Closed, and the premise was false.** The reply was split-checked (`--check
  --mega-blueprint`, exit 0, 9/9 documents) and there is no `08-*.md` in the required set. See §1.
- **The reply has not been split to DISK.** Only `--check` was run; no package was written. If the
  Part B documents are wanted as real files, run the splitter without `--check`.
- **Fable 5.1's commit gate is UNSPENT.** Nothing committed, nothing pushed. `main` auto-deploys.

---

## 7. REVIEW CHAIN STATUS (Rule 46)

| Role | Status |
|---|---|
| Builder | this pass |
| Gemini | not run for this revision |
| **Codex hostile review** | **not run for this revision** — Astra's Review 3 stands in for the hostile pass, and under Rule 46 Codex's verdict is mandatory input, not the gate |
| Astra (advisory) | **REVISE**, 10 findings — 9 fixed and verified, 1 partial |
| **Fable — Final Decider & commit gate** | **UNSPENT** |

**This document is not a verdict.** It is the builder's account of its own fixes. Under Rule 46 it
cannot be the gate, and it should not be read as one. The honest summary is: **Astra's ten findings
were adjudicated by execution; nine are closed with evidence, one is partial, and the item Astra rated
High is closed by a mechanism that has been demonstrated against a real crash of the runner.**
