# VERIFICATION NOTES — ASTRA REVIEW 2 · plus pass-4 self-review (§7) and pass-5 R2-04 closure (§8)

**Date:** 2026-09-19 (passes 4-5 added 2026-09-20 UTC) · **Operator:** Sean · **Repo:** SwanStudios (SS-PT)
**Subject:** the fixes made in response to Astra's 20 A1 findings on the S83 blueprints.
**Verdict returned by Astra:** **REVISE** (advisory; Rule 46 — Fable is the commit gate, not this).

> **SUPERSEDED IN PART — read `VERIFICATION-NOTES-REVIEW-3.md` first.** This document covers Review 2
> and the self-review passes 4 and 5. Astra has since reviewed passes 4 and 5 as well
> (`ASTRA-REPLY-REVIEW-3.md`, ten findings **R3-01…R3-10**), and four claims in this file were
> corrected by that review — most importantly the flake mechanism in §8.3, which was **fabricated**
> and has been deleted. Where the two documents disagree, Review 3 is correct. The §8.6 bullet
> claiming "no external review" is likewise superseded.

---

## 0. WHAT THIS DOCUMENT IS

Astra hostile-reviewed the fixes. It returned **15 findings (R2-01 … R2-15)** plus a list of fixes
it accepted. This document records, for **every** finding, an adjudicated verdict and the evidence
for it — then what was actually changed.

**The rule this document follows: no finding is relayed unverified, and no fix is claimed without
its output pasted.** Where Astra is right, it says so plainly, including where that is unflattering.
Where Astra is partly right, it says which part.

**Headline: Astra found four things that were wrong in ways that mattered, and three of them were
in work the caller had already declared green.** In particular it caught an **arithmetic error in
the caller's own headline claim** (R2-07) and **three defects in the measurement instrument itself**
(R2-06) — meaning the number the budgets were derived from had never been validly measured.

**§7 is NOT Astra's work, and is labelled so throughout.** It is a pass-4 self-review of the revision
that came out of Astra's review — added after §5's rows were finally re-executed, and after one of
the instruments used for that re-execution turned out to be broken (F-5). Five further findings came
out of it. It must never be read as an independent verdict, and under Rule 46 it would not be one
even if it were.

**§8 is not Astra's work either.** It closes R2-04 — the most significant open item in §4 — by
building the two tests Astra asked for, and it records an **intermittent flake that a single run
would have hidden**. If you read only one section of this document after §2, read §8.3.

---

## 1. PROVENANCE

| Field | Value |
|---|---|
| Transport | `scripts/consult-astra-subscription.mjs` (Codex CLI, ChatGPT subscription, $0 marginal) |
| Requested model | `gpt-6-astra` |
| **Served model** | **unknown — unverifiable on this transport BY CONSTRUCTION** (`servedModel: null`; see `SERVED_MODEL_UNVERIFIABLE`) |
| Packet | `CONSULT-PACKET-REVIEW-2.md` — 2,180 lines / 118,666 chars, built by `tmp/coach-remediation-20260913/build-consult-packet-review2.mjs` |
| Arming | `Mega Blueprint` — dry-run proved `contract_headings_present=true both_hostile_reviews_present=true` **before** spending |
| Tokens | **in 142,233 · out 8,750 · reasoning 527** |
| Wall | 292.4 s · exit 0 |
| Reply | `ASTRA-REPLY-REVIEW-2.md` (691 lines) |

**Packet-sizing note.** The first assembly was 407,045 chars because it carried ten full logs. That
is ~40% larger than the Review-1 packet that measured 102,109 input tokens, and a truncated packet
loses its tail — where the output contract lives. Logs were therefore reduced by **line selection
only** (whole lines kept or dropped; nothing reworded), with the selection rule disclosed to the
model under each heading, and the full logs left on disk. Final: 118,666 chars → 142,233 input
tokens, so the trim was justified and the packet still arrived whole.

---

## 2. ADJUDICATION — ALL 15 FINDINGS

| ID | Sev | Astra's finding | Verdict | Basis |
|---|---|---|---|---|
| **R2-01** | HIGH | The reset runs once for the `node:test` group, not before every file; "before every suite" / "order-independent by construction" are false for that group | **CONFIRMED** | True. The claim was in the runner's docblock unqualified. **Fixed** — reset now runs before *each* node file, each in its own child process, and the claim is scoped. |
| **R2-02** | HIGH | `maxWorkers: 1` is process-local and cannot stop a second runner dropping the same schema | **CONFIRMED (mechanism); occurrence UNVERIFIED** | Mechanism is real and live under Rule 67. No occurrence was observed. **Fixed** — `pg_try_advisory_lock` lease for the whole run; second runner refuses. Limit stated: a non-cooperating SQL client is not protected. |
| **R2-03** | HIGH | A failed reset does not stop the dependent group | **CONFIRMED** | `resetOk` was computed and then ignored; group 2 ran unconditionally. **Fixed** — reset failure is terminal, dependents report `NOT RUN`. |
| **R2-04** | HIGH | "Cannot mask a product defect" is contradicted by the test wiring — product code uses the mocked, enlarged-budget instance | **CONFIRMED — the most serious finding** | Verified in source: `coachWorkoutAtomic…:11` substitutes this instance as the app DB, and the COMMIT cases call `approve(input)` with no test transaction. The claim was **false**. **Claim withdrawn** in all three places. Bounded acquisition/release tests **NOT yet written** — open item, §4. |
| **R2-05** | MED | "the informative connect error always wins" is not guaranteed — a queued acquisition can time out without starting a connection | **CONFIRMED** | Correct counterexample. **Fixed** — restated as an intended budget allocation, not an invariant; both error classes preserved. |
| **R2-06** | MED | The probe measures connect **+ close**, pools failures with successes, and uses wall-clock time | **CONFIRMED — three separate defects** | Verified by reading my own `connectOnce()`: the timestamp resolved after `end()`. **Fixed** — establishment timestamped before `end()`, close reported separately, failures separated, `hrtime.bigint()`; re-measured. |
| **R2-07** | MED | "below the platform's own median" is **arithmetically false** — 3000 ms is above the 2864 ms it cites | **CONFIRMED — my error** | Correct. 2864 < 3000, so the budget was *above* the median. **Fixed everywhere** (helper, config, handoff doc, packet). Corrected statement: establishment-only p50 **3033 ms**, **69/125 (55.2%)** above 3000 ms — i.e. *at* the median. |
| **R2-08** | MED | Withdrawn contamination evidence still presented as measured proof in the reset + runner; "FOUR" vs six; the config's list omits the node race | **CONFIRMED** | All three true. **Fixed** — measurement withdrawn in the reset docblock; stable IDs PG-1…PG-6; "six identified issues, not a proof no seventh exists"; race added to the config's list. |
| **R2-09** | MED | The suggested direct `node --test` command reintroduces the race (no reset, no `--test-concurrency=1`) | **CONFIRMED** | True — the bypass omitted both. **Fixed** — bypass removed; only the guarded runner documented. |
| **R2-10** | MED | The seven configs are mischaracterised; `coachWorkoutAtomic…` has **no** `envDir: false`; "nothing references them" is unverifiable from supplied evidence | **PARTIALLY CONFIRMED** | The `envDir` point is **correct** — 6 of 7 set it, and my comment said "the seven". Fixed. The reference search was run in-repo (not merely asserted) but is **not reproducible from the packet**, which is a fair objection: the wording is now a claim about *tooling coverage*, not about the files. Single-file mode added to the runner so the endorsement has a real target. |
| **R2-11** | HIGH | Port validation is not proof the target is disposable; "can only ever point at the disposable database" overstates enforcement | **CONFIRMED** | Correct. **Fixed** — restated as a targeting check, with disposability named an operator obligation. |
| **R2-12** | MED | `exit 0` does not enforce the advertised cohort or zero skips | **CONFIRMED** | Correct, and directly relevant given §3.1. **Fixed** — parsed cohort checks: zero failed/skipped/todo/cancelled in both groups; vitest file count matched against files **on disk**. |
| **R2-13** | MED | The README's current banner still advertises `10 suites/125 tests` (depends on a missing script) and "concurrency tests still pending" | **CONFIRMED** | Correct — and my A1-01 fix had only addressed the migration sentence on that line. **Fixed** — paragraph struck, bounded current result substituted. |
| **R2-14** | MED | The atomic tests have an unbounded barrier and cleanup-ownership gaps | **CONFIRMED (mechanism); observed effect UNKNOWN** | Verified by reading the tests. **Fixed** — bounded barrier (10 s), immediate transaction ownership, `Promise.allSettled` rollback. |
| **R2-15** | MED | Remaining overstatement: "immune to reading"; "no migrations" vs `proposalMigration.up()`; "10/18 fail" should be 8 failures | **CONFIRMED — all three** | **Fixed** — "immune to reading" replaced with "missed during inspection", noting PART 11's static check is itself the disproof; packet corrected to 8 failures; the "no migrations" scoping corrected. |

**Tally: 14 CONFIRMED · 1 PARTIALLY CONFIRMED · 0 REFUTED.**

---

## 3. THE FOUR THAT MATTER MOST

### 3.1 Astra predicted the exact failure that had already happened, and my fix had already walked into it

Astra's §3.4/§3.5 attacks existed to force one question: *did the fix convert failures into SKIPS
rather than passes?* **It did.** Iteration 1 of my own fix — raising the connect budget to 15000
while leaving `pool.acquire` at 10000 — inverted the pool/connect race. The reset's `beforeAll`
then threw `SequelizeConnectionAcquireTimeoutError` from `resetCoachTestSchema.mjs:40`, and the
whole file's **15 tests became SKIPS**:

```
 Test Files  1 failed | 8 passed (9)
      Tests  109 passed | 15 skipped (124)
```

A file-level FAIL with **zero failed tests** and 15 skips reads as a pass in any summary that only
counts failures. **This is now machine-checked against** (R2-12).

### 3.2 The measurement instrument was broken, and the budgets were derived from it

Three independent defects (R2-06): connect+close timed together, failures pooled with successes,
wall-clock instead of monotonic. Corrected, establishment-only, idle, 25-wide synthetic burst:

| Metric | Flawed probe | Corrected probe |
|---|---|---|
| p50 | 2864 ms | **3033 ms** |
| p95 | 3824 ms | 3797 ms |
| max | 3850 ms | 3823 ms |
| over 3000 ms | 45/125 (36%) | **69/125 (55.2%)** |

The two samples **disagree by ~6%**, so the median sits *within a few percent* of the 3000 ms
budget. The defensible claim is "3000 ms sat **at** the median and a majority of samples exceeded
it" — **not** "below the median". `15000` is *chosen*, not derived: the suites' own peak acquisition
concurrency has never been measured. That is stated, not hidden.

### 3.3 My own headline number was arithmetically backwards

R2-07. `2864 < 3000`, so a budget of 3000 ms was **above** the median it was said to be below. The
claim had been written into the helper, the config, the handoff document and the packet. It is
corrected in all four.

### 3.4 "Cannot mask a product defect" was false

R2-04. The suites substitute the enlarged-budget instance as the **application** database, and the
COMMIT cases call product entry points without a test transaction. Product code therefore acquires
connections under the relaxed budgets. The impossibility claim is withdrawn.

---

## 4. WHAT WAS NOT FIXED — OPEN ITEMS, STATED PLAINLY

Status as of **pass 5 (2026-09-20)**. Items 1 and 4 are now **CLOSED**; the rest stand unchanged.

1. ~~**R2-04's test gap.**~~ **CLOSED in pass 5 — see §8.** Astra asked for a bounded
   acquisition-failure test and a connection-release test, both **through the product caller**. Both
   now exist in `tests/integration/coachWorkoutPoolBudget.postgres.test.mjs` and pass against a
   deliberately tight pool whose tightness is asserted in-test. The withdrawn claim now has evidence
   behind it rather than a withdrawal alone.
2. **R2-02's limit.** The advisory lease protects against a cooperating runner only. An arbitrary
   SQL client is not protected against — stated in the runner.
3. **No workload-derived threshold.** `15000`/`30000` remain chosen values. Pass 5 measured the
   approval path's actual **peak** acquisition concurrency under a tight pool (peak ≤ 2, asserted) —
   but that is a bound on **one path**, not a workload-derived derivation for the harness as a whole.
   **Partially addressed, not closed**, and the distinction matters.
4. ~~**`coachWorkoutAtomic.postgres.test.mjs` at 295/300 lines.**~~ **RESOLVED in pass 5.** The shared
   fixture moved to `tests/helpers/coachApprovalFixture.mjs`; the suite is now **255/300**. Its 13
   tests were re-verified **unchanged** after the extraction — an extraction of a green file is only
   safe if that is proven, not assumed.
5. **Astra's [UNKNOWN] items** — the `19/19` guard-cohort execution, the migration-chain outcome —
   were not re-executed in this round and are **UNVERIFIED here**. The npm-script wiring *is*
   verifiable and is present (`package.json`: `"test:coach-postgres": "node run-coach-postgres.mjs"`).
6. **Astra has not reviewed pass 4 or pass 5.** Under Rule 46 the commit gate is Fable's, and it
   remains **UNSPENT**.

---

## 5. VERIFICATION OF THE FIXES

Every row below is a **PASTED result**, not a restatement. Pass 3 is the revision Astra reviewed;
pass 4 is the revision that came out of it plus the self-review findings in §7. **Both were
re-executed after their respective changes**, because a green recorded once is not a green (§6.1) —
and pass 4 in particular refactored an already-green artifact, which is exactly when a regression
hides.

### 5.1 Pass 3 — the revision Astra reviewed

Source: `tmp/coach-remediation-20260913/EVIDENCE-pass3-hardened.txt`

```
coach-pg-final-hardened-1.log →  Test Files  9 passed (9)
                                 Tests  124 passed (124)
                                 vitest group:    PASS
                                 node:test group: PASS
                                 cohort: all identities and zero-skip checks satisfied.
                                 node:test per-file: 8/8, 8/8, 2/2  (fail 0, skipped 0, todo 0)
coach-pg-final-hardened-2.log →  identical
coach-pg-final-hardened-3.log →  identical
coach-pg-file-mode.log        →  SINGLE-FILE MODE: coachWorkoutAtomic.postgres.test.mjs
                                 Test Files  1 passed (1)
                                 Tests  13 passed (13)
                                 vitest group:    PASS
```

`exit 0` on all four.

### 5.2 Pass 4 — the revision after F-1…F-5 (§7)

Source: `tmp/coach-remediation-20260913/EVIDENCE-pass4-hardened.txt`

```
coach-pg-pass4-hardened-1.log →  Test Files  9 passed (9)
                                 Tests  124 passed (124)
                                 database lease:  held for the whole run · release: released
                                 vitest group:    PASS
                                 node:test group: PASS
                                 cohort: all identities and zero-skip checks satisfied.
                                 node:test per-file: 8/8, 8/8, 2/2  (fail 0, skipped 0, todo 0)
coach-pg-pass4-hardened-2.log →  identical
coach-pg-pass4-hardened-3.log →  identical
coach-pg-pass4-file-mode.log  →  SINGLE-FILE MODE: coachWorkoutAtomic.postgres.test.mjs
                                 Test Files  1 passed (1)
                                 Tests  13 passed (13)
                                 vitest group:    PASS
```

`exit 0` on all four. Note `release: released` — F-4's fix means the lease outcome is now
**reported** rather than asserted. The refactor that produced this revision (the lease extraction
required to restore Rule 4 compliance) did **not** regress the suite.

### 5.3 R2-02's staged second-runner refusal — previously NOT RUN, now RUN

```
second runner EXIT=5
REFUSED: another guarded runner already holds the database lease.
         Two runners would drop the same schema under each other. Wait, or use
         a different database. (An arbitrary SQL client is NOT protected against.)
holder EXIT=0   (vitest PASS, node:test PASS, cohort satisfied)
```

The refusal is real, not merely mechanised. The limit is unchanged and is printed at the refusal
site: a non-cooperating SQL client is still not protected against.

### 5.4 The new gates, tested directly

```
tests/unit/cohortChecks.test.mjs              25 tests  PASS
tests/unit/coachDatabaseLease.test.mjs         9 tests  PASS
tests/unit/nodeTestRunnerSeparation.test.mjs   4 tests  PASS   (three-way lock intact)
```

### 5.5 Claim → evidence

| Claim | Evidence | Status |
|---|---|---|
| Hardened runner (pass 3): lease, per-file node reset, terminal reset failure, cohort gate | §5.1 | **VERIFIED** |
| `--file` single-file mode (R2-10) | §5.1, §5.2 | **VERIFIED** |
| Corrected probe (R2-06) | `probe-establishment-idle.txt` | **VERIFIED** |
| Test-file changes did not break the suite (R2-14) | §5.1 — the 13 atomic tests sit inside the 124 | **VERIFIED** |
| All changed files parse | `node --check` on every changed `.mjs` — all OK | **VERIFIED** |
| Rule 4 (300-line cap) | max 297/300 (`run-coach-postgres.mjs`) | **VERIFIED** |
| Second-runner lease refusal (R2-02) | §5.3 | **VERIFIED** |
| F-1…F-5 fixes hold, and pass 4 did not regress pass 3 | §5.2, §5.4, §7 | **VERIFIED** |

**UNVERIFIED:** the `19/19` guard cohort and the migration-chain result were not re-run this round.
**UNVERIFIED:** the suites' own peak acquisition concurrency.
**UNVERIFIED:** the new gate tests are proven against **one** vitest version (v4.1.10). The F-1
hardening removes the dependency on vitest's *wording*; it cannot prove a future reporter will not
change the *shape* of the summary, which the `could not find vitest totals` branch would catch as a
violation rather than as a pass — that branch is itself tested (§5.4).

### 5.6 Pass 5 — R2-04 closed, and an intermittent flake found

Source: `tmp/coach-remediation-20260913/pass5b-run-{1..5}.log`

```
run 1  EXIT=0 ::  Tests  131 passed (131) :: Duration 40.89s
run 2  EXIT=0 ::  Tests  131 passed (131) :: Duration 40.19s
run 3  EXIT=0 ::  Tests  131 passed (131) :: Duration 40.80s
run 4  EXIT=0 ::  Tests  131 passed (131) :: Duration 40.59s
run 5  EXIT=0 ::  Tests  131 passed (131) :: Duration 41.00s
```

The cohort grew from 9 to 10 vitest files (131 = 124 + 7) and the runner's expectation followed
**automatically** — `vitest cohort expectation: 10 files` — because it is derived from the files on
disk rather than hardcoded. That is the disk-derived design from §7/F-1 earning its keep.

**But the run BEFORE the mitigation failed**, and that is the more important record:

```
pass5 run 3:  Test Files  1 failed | 9 passed (10)
              Tests  3 failed | 128 passed (131)
  × coachWorkoutAtomic > COMMIT lost_ack never publishes intake APPLIED …   14501ms
  × coachWorkoutAtomic > revocation while approval waits on the client row …    1ms
  × coachWorkoutAtomic > transactional access holds the assignment row …        1ms
  SequelizeConnectionError: timeout expired   (pg/lib/client.js:106)
```

Two green runs, then a red one. **A single run would have recorded a false green.** Analysis and
mitigation in §8.3.

---

## 6. WHAT THE CALLER GOT WRONG IN ITS OWN PROCESS

Recorded because it is the reusable part:

1. **A green recorded once is not a green.** The `124/124` result was recorded, quoted into a
   handoff document, and was false when re-executed hours later.
2. **Two iterations were needed, and the first made things worse.** Raising a timeout without
   checking what else races it is its own defect class.
3. **The instrument was never validated.** The probe's own correctness was assumed because it
   produced plausible numbers.
4. **An impossibility claim was made from a partial reading** — "the connections are the tests'
   own" was true of *some* tests and false of others, and the claim was written as universal.
5. **Three `Edit` calls to one file in a single message race.** All reported success; two were
   silently lost and were only caught because a later read disagreed with a marker grep.

---

## 7. PASS 4 — SELF-REVIEW (no external reviewer)

**This section is not an Astra review.** Astra's Review 2 covered the revision in §5.1. Pass 4 is a
re-read of the revision that came OUT of that review. It is recorded separately, and labelled, so
that nothing here can be mistaken for an independent verdict — which under Rule 46 is advisory
anyway, the commit gate being Fable's.

Five findings. All five were found by reading the code, not by a tool, and **one of them was found
by being actively misled by my own instrument** (F-5), which is the most useful kind.

| ID | Finding | Verdict | Fix |
|---|---|---|---|
| **F-1** | The vitest cohort gate never asserted that any test RAN — unlike the node gate, which asserts `pass === tests` and `tests > 0`. It matched a file count and looked for the WORDS failed/skipped/todo/cancelled. | **CONFIRMED (mechanism) · DOWNGRADED — reachability NOT demonstrated** | Both gates extracted to `tests/helpers/cohortChecks.mjs`, which now parses totals and compares numbers. |
| **F-2** | `closeLease` could REJECT, and the caller awaits it inside a `finally`. A failed release therefore escaped `main()`, suppressed the SUMMARY, and turned an all-passing run into an apparent crash — losing its own evidence. | **CONFIRMED** | Extracted to `tests/helpers/coachDatabaseLease.mjs` as a total function; a failing release is reported, never thrown. Now tested with a throwing client. |
| **F-3** | The docblock never explained why a KILLED runner cannot wedge the next one. Session-scoped advisory locks are released when the session ends, so the `finally` is an optimisation, not the safety mechanism. Left unstated, the lease reads as a deadlock hazard. | **CONFIRMED (documentation gap with real consequences)** | Stated in the new module's header. |
| **F-4** | The SUMMARY printed `(released)` unconditionally — ASSERTING the outcome rather than reporting it. | **CONFIRMED** | The real release outcome is now captured and printed: `release: released`. |
| **F-5** | The runner echoed RAW ANSI into its own log, so its summary was not greppable: `grep "passed ("` returned **0** matches on a log that plainly contained `9 passed (9)`. `stripAnsi` existed and was applied to the CHECK but never to the ECHO. | **CONFIRMED — and it actively misled a real evidence extraction in this pass** | The echo is stripped; log and adjudicated text are now byte-identical. |

### 7.1 F-5 — the one worth reading twice

While extracting pass-3 evidence I ran `grep -n "passed ("` on a log whose summary I had *already
read with my own eyes*, and it returned **zero matches**. The runner's gate had clearly found the
line — it had printed `cohort: all identities and zero-skip checks satisfied.` — so the two
observations contradicted each other and one of them had to be wrong. The log was right and my
search was right; what was wrong was the assumption that a log containing `9 passed (9)` contains
the substring `passed (`.

`od -c` settled it:

```
0000000 033   [   2   m       T   e   s   t       F   i   l   e   s
0000020 033   [   2   2   m     033   [   1   m 033   [   3   2   m   9
0000040       p   a   s   s   e   d 033   [   3   9   m 033   [   2   2
0000060   m 033   [   9   0   m       (   9   ) 033   [   3   9   m  \n
```

`passed` and `(` are separated by `ESC[39m ESC[22m ESC[90m`. The substring does not exist.

This matters beyond the annoyance. **A defect that makes evidence unsearchable attacks the
verification method itself**, and this whole workstream exists because a green was believed without
being re-derived. The before/after is now a two-line proof with no `sed` applied to either side:

```
OLD (pass 3) logs:  coach-pg-final-hardened-{1,2,3}.log   grep -c "passed (" = 0, 0, 0
NEW (pass 4) logs:  coach-pg-pass4-hardened-{1,2,3}.log   grep -c "passed (" = 2, 2, 2
```

### 7.2 F-1 — a finding I measured and then SHRANK

I predicted that `Tests  no tests` would slip past the gate. I built a one-file config with zero
tests and ran it. vitest v4.1.10 printed:

```
 Test Files  1 failed (1)
      Tests  no tests
```

The wording I predicted **is** produced, and the regex does match it. But the FILE line is
`1 failed (1)`, which contains the word `failed`, so the existing gate already raised a violation.
A second candidate path — an include glob matching nothing — is likewise caught, because the file
count check then sees `no tests` instead of `9 passed (9)`.

**So the mechanism is real and the reachability is not demonstrated.** F-1 is recorded as hardening
and explicitly **not** as a live defect. This is the same disposition the repo already applies to
`ackCommit`'s unreachable mismatch branches: downgrade it and say so, rather than inflate it into a
fixed bug. Full probe: `tmp/coach-remediation-20260913/F1-GATE-PROBE-RESULT.txt`.

The fix is still worth making, because the gate's correctness for the zero-test case currently rests
on an implementation detail of vitest's reporter. It no longer does.

### 7.3 A Rule 4 breach I introduced and had to fix

The R2/F hardening pushed `run-coach-postgres.mjs` to **344 lines**, over the 300-line cap. My own
change broke a standing project rule, and the breach was only visible because line counts were
checked rather than assumed. Fixed by extracting the lease to `tests/helpers/coachDatabaseLease.mjs`
— which had the side benefit of making F-2 testable. The runner is now **297/300**.

Worth recording as a pattern: **hardening prose and hardening behaviour compete for the same budget,
and the docblocks grow faster than the code.** The next change to that runner must extract, not add.

### 7.4 Files added in pass 4

| File | Lines | Purpose |
|---|---|---|
| `backend/tests/helpers/cohortChecks.mjs` | 131 | The cohort gates, extracted so they are testable |
| `backend/tests/helpers/coachDatabaseLease.mjs` | 81 | The database lease, extracted for Rule 4 + testability |
| `backend/tests/unit/cohortChecks.test.mjs` | 185 | 25 tests, including the inputs that must FAIL |
| `backend/tests/unit/coachDatabaseLease.test.mjs` | 111 | 9 tests, including a client whose release throws |

### 7.5 What pass 4 did NOT do

- **No external review of pass 4.** Astra has not seen F-1…F-5 or the pass-4 revision. Under Rule 46
  the commit gate is Fable's, and it remains **unspent**.
- **R2-04's test gap is still open** (§4.1). It remains the most significant open item: the claim was
  withdrawn, but no bounded acquisition-failure or connection-release test through the product caller
  exists yet.
- **No workload-derived threshold** (§4.3). `15000`/`30000` remain chosen values.
- **The lease's non-cooperating-client limit is unchanged** and cannot be fixed here.
- **`coachWorkoutAtomic.postgres.test.mjs` is still 295/300** (§4.4). Its next change must extract.
- **The worktree's git registration is pruned** (`fatal: not a git repository: (NULL)`), so no diff
  could be derived from it. The authoritative change set is the mtime inventory in §7.6.

### 7.6 Authoritative change set (worktree, by mtime — no git available)

```
backend/package.json                                        (test:coach-postgres script)
backend/run-coach-postgres.mjs                              (rewritten, then lease extracted)
backend/vitest.coach-postgres.config.mjs
backend/tests/helpers/coachTestDatabase.mjs
backend/tests/helpers/resetCoachTestSchema.mjs
backend/tests/helpers/resetCoachTestSchemaNow.mjs            NEW
backend/tests/helpers/cohortChecks.mjs                       NEW  (pass 4)
backend/tests/helpers/coachDatabaseLease.mjs                 NEW  (pass 4)
backend/tests/integration/coachWorkoutAtomic.postgres.test.mjs
backend/tests/unit/cohortChecks.test.mjs                     NEW  (pass 4)
backend/tests/unit/coachDatabaseLease.test.mjs               NEW  (pass 4)
```

Per Rule 56: this is the change set of **one worktree**, not the full repo. Nothing here has been
committed or pushed, and nothing should be without Sean's explicit approval.

---

## 8. PASS 5 — R2-04 CLOSED, AND AN INTERMITTENT FLAKE FOUND

**Not an Astra review either.** Pass 5 did one thing: it replaced R2-04's *withdrawal* with
*evidence*, by building the two tests Astra asked for. It also, unavoidably, found a flake.

### 8.1 The two tests Astra asked for now exist

`tests/integration/coachWorkoutPoolBudget.postgres.test.mjs` — 7 tests, driving the **real** approval
path (`approveCoachActionProposal`) on a pool of **2**:

| Property Astra asked for | Test |
|---|---|
| Connection **release** through the product caller | returns every connection on the success path, on the **failure** path, under 5-way concurrency, and across 5 sequential approvals |
| **Bounded** acquisition failure through the product caller | pool exhausted by holding every connection → the caller fails in **bounded** time and **writes nothing** |
| (added) does the product path *need* the enlarged budget? | the whole path completes on a pool of 2; peak concurrency ≤ pool size |

### 8.2 The measurement, and two guards against a test that proves nothing

The exact failure was captured rather than described:

```
SequelizeConnectionAcquireTimeoutError: Operation timeout | elapsed = 1513
```

i.e. the pool's **own** acquire timeout (configured 1500 ms) — not an incidental error that happened
to be fast. The test now asserts the **exact error class** and a lower time bound, so it cannot pass
for an unrelated reason.

Two anti-no-op guards, because a test that believes it is exercising a tight budget while the product
path quietly uses a different pool would pass while proving nothing — the exact defect class this
workstream exists to hunt:

1. the first test asserts the pool really is tight (`maxSize === 2`, `acquireTimeoutMillis === 1500`);
2. the peak instrument asserts it actually **observed** acquisitions (`peak > 0`).

**A false start, recorded because it is the method working.** The first version of the sequential
test failed on its second iteration. Rather than guess, the test was made self-diagnosing and the
real reason read out:

```
iteration 1 returned 400: {"code":"DUPLICATE_DATE",
  "error":"A workout session already exists for this client on this date."}
```

The product was **right** and the test was wrong — five approvals of the same client and date
legitimately collide. The test now uses genuinely distinct dates. A guess here ("must be the session
credit") would have produced a fix for a defect that did not exist.

### 8.3 The intermittent flake — the most important thing in this section

**A single run would have recorded a false green.** Two consecutive cohort runs passed, then the
third failed:

```
Test Files  1 failed | 9 passed (10)      Tests  3 failed | 128 passed (131)
  × coachWorkoutAtomic > COMMIT lost_ack …                                14501ms
  × coachWorkoutAtomic > revocation while approval waits …                     1ms
  × coachWorkoutAtomic > transactional access holds the assignment row …       1ms
  SequelizeConnectionError: timeout expired   (pg/lib/client.js:106)
```

What was **ruled out**, by measurement rather than argument:

- **Not the new suite.** `coachWorkoutAtomic` runs **first** in the cohort (verified in both a failing
  and a passing run), so a later file cannot have caused it.
- **Not a leak in the new suite.** `coachWorkoutPoolBudget` alone: **3/3 green**, with an explicit
  `pool.using === 0` assertion after releasing the connections it deliberately holds.
- **Not deterministic.** `coachWorkoutAtomic` alone: **3/3 green**.
- **Not server-side exhaustion.** `SHOW max_connections` = **100**, with 2–3 client backends in use.
  This is connect **latency**.

**Rate: 1 failure in 7 full-cohort runs** (3 at 9 files in pass 4, 4 at 10 files in pass 5). The
baseline **mixes revisions**, so it is not a controlled estimate of an unchanged workload: pass 4
contributed 0/3 and pass 5 contributed 1/4 before mitigation.

**CORRECTION (pass 6, Astra R3-07) — the mechanism story was FABRICATED and is withdrawn.** This
document previously stated that the trigger "deliberately kills a connection mid-commit and therefore
forces a cold replacement connect at the worst possible moment". **That is false, and it was never
measured.** `coachWorkoutAtomic…:168-174` runs the REAL COMMIT and then throws a **synthetic
JavaScript error**; it terminates no connection, destroys no socket, and calls no
`pg_terminate_backend`. The OBSERVATION stands — a ~1-in-7 failure with `timeout expired` at
14501 ms. The CAUSE attributed to it does not, and the attribution is deleted rather than softened.
Note also that 14501 ms is a **test** duration, not a directly captured establishment duration, and
the failing stack does not identify whether the timeout occurred during approval, reconciliation, or
subsequent setup. The cause is therefore **UNRESOLVED** and the budget increase is **PROVISIONAL**.

**Mitigation — the timeout chain widened, and a near-miss caught.** Raising `acquire` silently broke
an invariant documented in a *different* file: `resetCoachTestSchema.mjs` recorded that its hook must
outlast `acquire`, because a hook timeout converts a file's tests into **skips** rather than
failures — the R2-01/R2-03 class. That coupling was found only by grepping every file for the budget
numbers before committing to the change. The chain is now explicit and asserted across three files:

```
connectionTimeoutMillis (30000) < acquire (45000) < hookTimeout/testTimeout (120000)
```

Result: **5/5 green**.

**CORRECTION (pass 6, Astra R3-07) — "durations tightened" was BACKWARDS.** An earlier version of this
line read "durations tightened to ~41 s". Measured: pre-mitigation Vitest durations were
**35.49 / 35.72 / 35.92 s**; post-mitigation they are **40.19 / 40.32 / 40.59 / 40.80 / 40.89 /
41.00 / 42.44 / 44.42 s**. The runs got **SLOWER** — which is what widening a timeout should be
expected to do, and the opposite of what the sentence claimed. These are also **Vitest group**
durations, which exclude the later `node:test` and reset work, so they are not whole-run durations.

**And the probability, stated rather than implied.** At an assumed independent failure probability of
1/7: expected failures in 5 runs = 0.71; P(zero failures in 5 runs) = (6/7)^5 = **46.27%**;
P(zero failures in 8 runs) = (6/7)^8 = **29.14%**. Five greens — or eight — are therefore **not**
evidence that the flake is gone. That is why the mitigation is labelled an accommodation.

**The honest caveat, which matters more than the green.** At a ~1-in-7 base rate, five consecutive
passes do **not** prove the flake is gone — the expected number of failures in five runs is well
under one either way. This is an **environment accommodation**, not a root-cause fix: the root cause
is *consistent with* environment latency, and every testable alternative has been ruled out, but it
is not proven to be environmental. **Treat a recurrence as a live signal, not as noise.**

### 8.4 Rule 4 relief, and the fixture extraction

`coachWorkoutAtomic.postgres.test.mjs` was at **295/300** (§4.4). The shared schema/model/service
setup moved to `tests/helpers/coachApprovalFixture.mjs`, which is what let a second suite drive the
same product path on a different budget. The suite is now **255/300** — and its **13 tests were
re-verified unchanged** after the extraction, because an extraction of a green file is only safe if
that is proven rather than assumed.

One unrequested change was caught and reverted during that refactor: an extra key had been added to a
`vi.mock` factory. Silently altering a mock while "just moving code" is exactly how a refactor starts
masking behaviour, so it was restored to the original key set.

### 8.5 Files added in pass 5

| File | Lines | Purpose |
|---|---|---|
| `backend/tests/helpers/coachApprovalFixture.mjs` | 134 | Shared fixture, extracted for reuse + Rule 4 |
| `backend/tests/integration/coachWorkoutPoolBudget.postgres.test.mjs` | 218 | R2-04's compensating evidence (7 tests) |

### 8.6 What pass 5 did NOT do

- ~~**No external review.** Astra has seen neither pass 4 nor pass 5.~~ **SUPERSEDED — see
  `VERIFICATION-NOTES-REVIEW-3.md`.** Astra HAS now reviewed passes 4 and 5 (`ASTRA-REPLY-REVIEW-3.md`,
  verdict **REVISE**, ten findings R3-01…R3-10, receipt 437.4 s / 380,271 in / 13,444 out). The commit
  gate is still Fable's and remains **UNSPENT**.
- **No workload-derived threshold** (§4.3). `30000` is chosen, not derived; the measured peak is a
  bound on **one** path.
- **The flake is mitigated, not explained.** See §8.3.
- **The R2-04 tests bound one path, not the system.** They do not prove that no other product path
  leaks, that a different pool configuration is safe, or that `max: 2` resembles production.
- **Astra's `[UNKNOWN]` items** (`19/19` guard cohort, migration chain) remain **UNVERIFIED here**.
