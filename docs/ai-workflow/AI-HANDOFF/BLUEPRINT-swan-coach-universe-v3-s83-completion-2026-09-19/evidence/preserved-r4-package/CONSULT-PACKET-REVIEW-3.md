# CONSULT PACKET (REVIEW 3) — hostile review of the pass-4 and pass-5 revision

**Prepared:** 2026-09-20 · **Operator:** Sean · **Repo:** SwanStudios (SS-PT)
**Purpose:** you reviewed the fixes once (Review 2) and returned 15 findings. The caller **acted on them again**, then made two further passes. **This call reviews the revision you have never seen** — pass 4 and pass 5.

> Read the arming mandate above as governing HOW to document. This preamble is the WHAT.

---

## SECTION 0 — REMIT

**Mega Blueprint**

### 0.1 What is in scope, precisely

You are reviewing **only** the work produced after your Review 2 reply was filed. Three things:

| Pass | What it is | Where it came from |
|---|---|---|
| **Pass 3** | the revision your Review 2 **did** review | — |
| **Pass 4** | five findings, **F-1…F-5**, from re-reading the revision that came out of your review | a self-review. **No external reviewer.** |
| **Pass 5** | **R2-04 closed** with the two tests you asked for, plus an **intermittent flake** found and mitigated | the caller |

**You have seen none of pass 4 or pass 5.** That is the entire subject.

### 0.2 The failure mode that matters most, restated because it keeps being the right one

A fix that **appears** to work and does not. In this workstream that has meant, so far:

- a claim of "order-independent by construction" that was true of one runner group and false of the other (**your R2-01**);
- a claim that "raising the connection budgets cannot mask a product defect" that was **false as written** (**your R2-04**);
- a budget justified as "below the platform's own median" when the arithmetic was **backwards** (**your R2-07**);
- a measurement instrument with **three** independent defects, which the budgets had been derived from (**your R2-06**).

Pass 4 and pass 5 each added one more of the same family, and the caller found them by re-reading and by executing — not by being told. §2.2 and §2.4 are those confessions. **The pattern is that this workstream's claims run ahead of its evidence, and that re-execution is what closes the gap.** Assume it is still true somewhere in what follows; that assumption is the job.

### 0.3 Three constraints on your reply

1. **Do not re-raise a finding you already made unless the fix failed.** If a fix is adequate, say so in one line and move on. A re-report is not a finding. §2.1 tells you what the caller believes it did with each of your 15 — check that belief against the files, and **say where it is wrong**.
2. **Every finding needs a concrete fix**, and where you assert a fix is inadequate you must name **the specific mechanism that defeats it** — not the general risk. "This could still fail" is not a finding.
3. **The single highest-value thing you can do is falsify a claim of verification.** Every number in this packet has a log. If a log does not support the claim made from it, that is the finding worth the whole call.

---

## SECTION 1 — WORKING ROOT

```
C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906
```

**Operational notes, and two of them are live hazards:**

- The sandbox is **read-only**; emit your package as reply text. The operator saves and files it.
- **Repo search is unavailable by design** (the sandbox denies the transport's `rg` binary). Do not try to explore the repository — everything you need is in this packet. Mark anything absent as `[UNKNOWN]` rather than inventing it. In Review 1, exploring cost ~382,000 input tokens and produced no work.
- **This worktree is PRUNED from git.** Its `.git` file still points at `.git/worktrees/swan-coach-astra-owned-20260906`, but that registry entry no longer exists, so `git status` and `git diff` **fail with `not a git repository: (NULL)`**. The **files are intact**; only git's view of them is gone. **Consequence: no diff is available, so every "before" state is given to you explicitly. Do not assume you can recover a before/after yourself.** This was measured again today while preparing this packet.
- **Rule 56 disclosure — this is an UNMERGED branch.** Every file discussed here lives ONLY on `codex/swan-coach-astra-owned-20260906` (tip `70547685c`). The main working tree has **no** `backend/tests/helpers/coachTestDatabase.mjs` and **no** `backend/tests/integration/*.postgres.test.mjs` at all. So "pre-existing" in this packet means **pre-existing on this unmerged branch**, never "pre-existing on `main`". Do not let the caller's language blur that.
- **Nothing has been committed or pushed.** Under the repo's Rule 46 the commit gate belongs to a different model (Fable), and it is **unspent**. Your verdict is advisory to that gate, not the gate.

---

## SECTION 2 — WHAT CHANGED SINCE YOUR REVIEW

### 2.1 The disposition of your 15 findings — check this table against the files

| Your finding | What the caller says it did | Where to check it |
|---|---|---|
| **R2-01** reset ran once for the `node:test` group | reset now runs before **every** node file, each in its **own child process**; the unqualified claim is scoped | `run-coach-postgres.mjs:240-258`, `resetCoachTestSchema.mjs:4-9` |
| **R2-02** `maxWorkers: 1` is process-local | a `pg_try_advisory_lock` lease for the whole run; a second runner **refuses** (`EXIT=5`), demonstrated | `coachDatabaseLease.mjs`, `run-coach-postgres.mjs:211-217` |
| **R2-03** a failed reset did not stop the dependent group | reset failure is now **terminal**; dependents report `NOT RUN`, run exits nonzero | `run-coach-postgres.mjs:246-253` |
| **R2-04** "cannot mask a product defect" was false | claim **withdrawn** everywhere; **two tests built** through the real product caller on a tight pool | `coachWorkoutPoolBudget.postgres.test.mjs`, §8 |
| **R2-05** "the informative connect error always wins" is not guaranteed | restated as an **intended budget allocation**, not an invariant; both error classes preserved | `coachTestDatabase.mjs:21-26` |
| **R2-06** three probe defects | establishment timestamped before `end()`; close reported separately; failures separated; `hrtime.bigint()`; re-measured | `probe-connect-latency.mjs`, §3.2 |
| **R2-07** "below the median" was backwards | corrected everywhere to "**at** the median, majority above"; p50 **3033 ms**, 69/125 (55.2%) over 3000 | `coachTestDatabase.mjs:29-45` |
| **R2-08** withdrawn evidence still presented as proof | measurement **withdrawn** in the reset docblock; stable IDs PG-1…PG-6; "six identified, not a proof no seventh exists"; the node race added to the config's list | `resetCoachTestSchema.mjs:19-26`, `run-coach-postgres.mjs:8-27` |
| **R2-09** the suggested bypass reintroduced the race | bypass **removed**; only the guarded runner documented | `run-coach-postgres.mjs:74-83` |
| **R2-10** the seven configs mischaracterised; `envDir` point | `envDir` comment corrected; wording changed to a claim about **tooling coverage**; single-file mode added so the endorsement has a target | `run-coach-postgres.mjs:177-198` |
| **R2-11** port validation ≠ proof of disposability | restated as a **targeting check**; disposability named an **operator obligation** | `coachTestDatabase.mjs:97-100`, `resetCoachTestSchema.mjs:40-45` |
| **R2-12** `exit 0` did not enforce the cohort | totals **parsed** and checked: zero failed/skipped/todo/cancelled, file count vs files **on disk** | `cohortChecks.mjs`, `run-coach-postgres.mjs:94` |
| **R2-13** README banner still advertised a stale matrix | paragraph struck; bounded current result substituted | `swan-coach-universe-v3/README.md` |
| **R2-14** unbounded barrier, cleanup-ownership gaps | bounded barrier (10 s), immediate transaction ownership, `Promise.allSettled` rollback | `coachWorkoutAtomic.postgres.test.mjs` |
| **R2-15** remaining overstatement (three items) | "immune to reading" → "missed during inspection"; packet corrected to 8 failures; "no migrations" scoping corrected | the handoff docs |

**Tally the caller claims: 14 CONFIRMED · 1 PARTIALLY CONFIRMED · 0 REFUTED.** Your Review 2 verdict was **REVISE**. The caller's position is that it did not dispute any finding. **Test that position** — a fix that was claimed and not made is the most valuable thing you can find.

### 2.2 Pass 4 — five findings from a self-review, with no external reviewer

These are the caller's own, found by re-reading the revision that came out of your review. **They are not a verdict and must not be read as one.** Recorded so you can attack the *disposition*, not rediscover the fact.

| ID | Finding | Disposition |
|---|---|---|
| **F-1** | The **vitest** cohort gate never asserted that any test ran — unlike the node gate, which asserted `pass === tests` and `tests > 0`. A summary reading `Tests  no tests` contains none of the words the gate looked for | **MEASURED, THEN DOWNGRADED.** The caller built a one-file zero-test config and ran it: vitest v4.1.10 reports a zero-test file as `Test Files  1 failed (1)`, and the word `failed` on the file line **already** raised a violation. So the hole is real **in the parser** but **no reachable path was demonstrated**. Recorded as **hardening, not a live defect** — the same disposition this repo applies to `ackCommit`'s unreachable mismatch branches. Both gates now parse **numbers**, so neither depends on which words a reporter prints |
| **F-2** | `releaseLease` could **reject**, and the caller awaits it inside a `finally`. A failed release escaped `main()`, suppressed the SUMMARY, and turned an all-passing run into an apparent crash — taking its own evidence with it | **FIXED.** `releaseLease` is now total: reports, never throws. Exercised with a client whose release throws |
| **F-3** | The docblock never explained why a **killed** runner cannot wedge the next one | **FIXED.** Stated: session-scoped advisory locks are released when the session ends, so the `finally` is an optimisation, not the safety mechanism |
| **F-4** | The SUMMARY printed `(released)` **unconditionally** — asserting the very fact a reader would want proven | **FIXED.** It now reports the outcome that actually occurred |
| **F-5** | The runner echoed **raw ANSI** into its own log, so its summary was not greppable: `grep "passed ("` returned **ZERO** matches on a log that plainly contained `9 passed (9)` | **FIXED.** `stripAnsi` is now applied to the **echo**, not only to the check |

**F-1 is the one to attack.** The caller's own framing is that it *shrank* a finding it had measured. Either that is the right call (the repo's own precedent for unreachable branches) or it is a finding being buried. **Say which, and why.**

**F-5 is the one that is embarrassing in an instructive way.** The defect was found because the caller was **misled by its own tooling** while extracting evidence: a real green looked like a missing summary line. The measurement was `od -c`, which showed `ESC[39m ESC[22m ESC[90m` between `passed` and `(`. The before/after is in §8.

### 2.3 Pass 5 — your R2-04, closed with tests rather than with a withdrawal

You asked for two things through the **product caller**. Both now exist in `coachWorkoutPoolBudget.postgres.test.mjs` (7 tests), driving the real `approveCoachActionProposal` on a pool of **2**:

| What you asked for | Test |
|---|---|
| Connection **release** through the product caller | returns every connection on the success path, on the **failure** path, under 5-way concurrency, and across 5 sequential approvals |
| **Bounded** acquisition failure through the product caller | pool genuinely exhausted → the caller fails in **bounded** time and **writes nothing** |
| *(added)* does the product path even **need** the enlarged budget? | the whole path completes on a pool of 2; peak concurrency ≤ pool size |

The exact failure was **captured, not described**: `SequelizeConnectionAcquireTimeoutError: Operation timeout | elapsed = 1513` — i.e. the pool's **own** acquire timer (configured 1500 ms), not an incidental error that merely happened to be fast.

**Two anti-no-op guards** exist because a test that believes it is exercising a tight budget while the product path quietly uses a different pool would pass while proving nothing — the exact defect class this workstream exists to hunt:

1. the first test asserts the pool really is tight (`maxSize === 2`, `acquireTimeoutMillis === 1500`);
2. the peak instrument asserts it actually **observed** acquisitions (`peak > 0`).

**A false start, recorded because it is the method working.** The first version of the sequential test failed on its second iteration. Rather than guess, the caller made the test self-diagnosing and read the reason out: `{"code":"DUPLICATE_DATE","error":"A workout session already exists for this client on this date."}` — **the product was right and the test was wrong.** Five approvals of the same client and date legitimately collide. A guess here would have produced a fix for a defect that did not exist.

**Also in pass 5:** the shared fixture moved to `tests/helpers/coachApprovalFixture.mjs`, which took `coachWorkoutAtomic.postgres.test.mjs` from **295/300** to **255/300** against the repo's Rule 4 cap — and its 13 tests were **re-verified unchanged** after the extraction, because an extraction of a green file is only safe if that is proven rather than assumed. During that refactor the caller caught itself adding an **unrequested key** to a `vi.mock` factory and reverted it.

### 2.4 The intermittent flake — read this section twice

**A single run would have recorded a false green.** Two consecutive cohort runs passed; the **third failed**:

```
Test Files  1 failed | 9 passed (10)
     Tests  3 failed | 128 passed (131)
  × coachWorkoutAtomic > COMMIT lost_ack …                              14501ms
  × coachWorkoutAtomic > revocation while approval waits …                   1ms
  × coachWorkoutAtomic > transactional access holds the assignment row …     1ms
  SequelizeConnectionError: timeout expired   (pg/lib/client.js:106)
```

What was **ruled out, by measurement rather than argument**:

- **Not the new suite.** `coachWorkoutAtomic` runs **first** in the cohort — verified in both a failing and a passing run — so a later file cannot have caused it.
- **Not a leak in the new suite.** `coachWorkoutPoolBudget` **alone: 3/3 green**, with an explicit `pool.using === 0` assertion after releasing the connections it deliberately holds.
- **Not deterministic.** `coachWorkoutAtomic` **alone: 3/3 green**.
- **Not server-side exhaustion.** `SHOW max_connections` = **100**, with 2–3 client backends in use. This is connect **latency**.

**Observed rate: 1 failure in 7 full-cohort runs.** The trigger is the `lost_ack` case, which deliberately **kills a connection mid-commit** and therefore forces a cold replacement connect at the worst possible moment.

**The mitigation, and a near-miss caught.** Raising `acquire` silently broke an invariant documented in a **different file**: `resetCoachTestSchema.mjs` records that its hook must **outlast** `acquire`, because a hook timeout converts a file's tests into **skips** rather than failures — the R2-01/R2-03 class, and a real incident on 2026-09-19. That coupling was found only by grepping **every** harness file for the budget numbers before committing to the change. The chain is now:

```
connectionTimeoutMillis (30000)  <  acquire (45000)  <  hookTimeout / testTimeout (120000)
```

Result: **5/5 green**, durations tightened to ~41 s.

**The honest caveat, which matters more than the green.** At a ~1-in-7 base rate, five consecutive passes do **not** prove the flake is gone — the expected number of failures in five runs is well under one either way. This is an **environment accommodation**, not a root-cause fix: the root cause is *consistent with* environment latency, and every testable alternative has been ruled out, but it is **not proven** to be environmental. **Treat a recurrence as a live signal, not as noise.**

---

## SECTION 3 — THE CLAIMS TO ATTACK

Twelve assertions. Each is falsifiable from the material in this packet. **Pick the ones you can actually break, and say which you could not.**

1. **The vitest gate is now as strong as the node gate.** `checkVitestCohort` asserts `passed === total`, `total === expectedFiles`, `total > 0`, and rejects unparseable totals. *Attack:* is `parseVitestTotals`'s `total` regex (`\((\d+)\)\s*$`) correct against every real vitest summary shape? When it fails to match, does the gate fail **closed** (violation) or **open** (silent pass)? Is `expectedFiles` derived from disk or from a number that can rot?
2. **A failed lease release cannot change the verdict.** `releaseLease` is "total by construction". *Attack:* is it total for **every** input, including a client whose `end()` throws **and** whose `unlock` succeeded? Does the injected `warn` default (`console.error`) have any path that can throw?
3. **A killed runner cannot wedge the next one.** Rests on session-scoped advisory locks dying with the session. *Attack:* the lease holds a **dedicated** `Client`. If that connection **drops mid-run**, PostgreSQL releases the lock but the runner continues believing it holds it. Is that reachable, and if so is the claim "held for the whole run" (printed in every SUMMARY) false?
4. **The lease refusal is real, not merely mechanised.** Demonstrated `EXIT=5` for a second runner while the holder stayed green. *Attack:* does the refusal cover a second runner that uses a **different** database name, or a different port? Is the stated limit (a non-cooperating SQL client) the **only** limit?
5. **F-5's fix makes the log byte-identical to the adjudicated text.** *Attack:* `stripAnsi`'s pattern is `\u001b\[[0-9;]*[A-Za-z]`. Does it cover **every** sequence a runner emits — CSI with `?`/`<`/`>` private parameters, OSC (`ESC ] … BEL`), two-character escapes? If a residue survives, what does that do to the `grep` property the fix exists to create?
6. **The R2-04 tests cannot pass for the wrong reason.** *Attack:* `instrumentPool()` monkey-patches `p.acquire`/`p.release` **after** the fixture has already run `authenticate()` and `sync()`. What has already happened that the instrument cannot see? Does `peakUsing > 0` prove the instrument observed **the product path's** acquisitions, or merely **some** acquisitions? Can the exhaustion test pass while the product path never attempted an acquisition at all?
7. **The R2-04 tests bound one path, and the caller says so.** *Attack:* is "one path" the right unit of honesty, or does the shared fixture make the **other** suite's evidence weaker than claimed by reusing it?
8. **The flake is environmental.** Every testable alternative was ruled out. *Attack:* name an alternative that was **not** tested. Is "1 in 7" consistent with a *product* defect — specifically, does `lost_ack`'s deliberate connection kill leave the pool in a state the product should have recovered from?
9. **Widening the chain is a mitigation, not a fix.** Stated. *Attack:* at a 1-in-7 base rate, what is the **expected number of failures** in the 5 green runs, and what does that number permit you to conclude? Is 5 the wrong number of runs to report as reassurance, and if so what should have been reported instead?
10. **The timeout chain is correct and is documented in three files.** *Attack:* **nothing enforces it.** There is no test that asserts `connectionTimeoutMillis < acquire < hookTimeout`. The near-miss of §2.4 is precisely a case where prose failed and a grep happened to catch it. Is the absence of an enforcing test a finding, and what should it assert?
11. **Pass 4 did not regress pass 3.** The refactor that restored Rule 4 compliance extracted the lease. *Attack:* the pass-4 evidence is 3 full runs + 1 single-file run. Is that sufficient to support "did not regress", given the flake documented **one section earlier**?
12. **`30000` is chosen, not derived, and that is disclosed.** *Attack:* is disclosure sufficient where a number gates whether a suite is called green? What should the number be derived from, and is the derived quantity even measurable on this platform?

---

## SECTION 4 — HOUSE RULES THAT BIND THIS WORK

- **Rule 4** — 300-line cap per module. Current max in the changed set: **297** (`run-coach-postgres.mjs`). It was **344** mid-pass-4, which is why the lease was extracted.
- **Rule 46** — the review chain is builder → Gemini → Codex hostile review (**mandatory input**) → **Fable = Final Decider and commit gate**. **Your verdict is advisory and is not the gate.** Do not phrase findings as blocking; phrase them as findings.
- **Rule 56** — union-vs-full-repo honesty. See §1. Everything here is on an **unmerged branch**.
- **Rule 67** — parallel AI coding. Two agents share one working tree. This is why the database lease (R2-02) is not theoretical: a concurrent agent dropping the same schema is a live hazard in this repo, not a hypothetical.
- **Dual-pass discipline** — the arming mandate requires you to hostile-review the **existing** artifacts (A1) as well as your **own** draft (A2). Both are owed. The mandate text is reproduced in SECTION 11 so a run rooted in a tree without `.claude/skills/` behaves identically.

---

## SECTION 5 — HOW TO READ WHAT FOLLOWS

| Section | Contents |
|---|---|
| **6** | Every file added or amended in pass 4 and pass 5, **verbatim** |
| **7** | The new unit tests that exercise the gates and the lease, **verbatim** — including the *previous* implementations, reproduced so the weakness is **proven rather than asserted** |
| **8** | The flake: the failing run, the isolation runs, the mitigation, and the F-5 before/after |
| **9** | The caller's own claim ledger (`VERIFICATION-NOTES-REVIEW-2.md` §7 and §8), verbatim |
| **10** | The run logs — line-selected, nothing reworded |
| **11** | The governing skill, verbatim |

**Disclosure on the logs in SECTION 10.** They are **not** reproduced in full — ten full logs come to ~250 KB, mostly per-test `✓` lines, which would push this packet past the size at which it risks being truncated, and a truncated packet loses its tail, where the output contract lives. Each log is reduced by **line selection only**: whole lines kept or dropped, **nothing reworded, reordered, paraphrased or elided mid-line**. Two transformations, both disclosed:

1. **ANSI colour escapes are stripped.** Formatting only.
2. **Lines are selected by a stated rule**, named under each heading as `Selection mode`. `full` = every line. `tailfrom` = from the first matching marker to the end. `green` = the totals and summary lines only.

The **full** logs remain on disk at
`C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/coach-remediation-20260913/`
beside the script that built this packet. **If you believe a selection has hidden something material, say so and name the file** — that is a finding, and a fair one.

---

## SECTION 6 — THE FILES THAT CHANGED (verbatim)

Nine files. Three are **new in pass 4**, two are **new in pass 5**, and four are **amended**. Read the docblocks: they are where the caller recorded its reasoning, and **the reasoning is what you are reviewing** — a docblock that states a property the code does not have is the most valuable find available here.

---

## SECTION 7 — THE NEW UNIT TESTS (verbatim)

These exist because the gates were extracted from a script that executes `main()` at import time, and **a gate that cannot be tested is a gate that is only believed**. They include, deliberately, **verbatim reproductions of the pre-pass-4 implementations** (`checkVitestCohort_V1`, `closeLease_V1`) so that the weaknesses F-1 and F-2 describe are **demonstrated by a failing test** rather than asserted in prose.

**Read the fixture provenance notes.** Each fixture is labelled **CAPTURED** (byte-checked against real output with `od -c`) or **SYNTHETIC**. The distinction matters: the F-1 downgrade rests on a CAPTURED zero-test run, and the caller states plainly that a SYNTHETIC empty-test shape is *not* what vitest prints.

---

## SECTION 8 — THE FLAKE: THE EVIDENCE

The single most important artifact in this packet. A green that did not reproduce, four alternatives ruled out by execution, and the before/after for the ANSI defect that was **found by being misled by the caller's own logs**.

---

## SECTION 9 — THE CALLER'S OWN CLAIM LEDGER (verbatim)

`VERIFICATION-NOTES-REVIEW-2.md` §7 (pass 4) and §8 (pass 5). Reproduced in full and **labelled as not-your-work** throughout, because it is not a verdict and must never be read as one. It is included so you can check its claims against the files rather than take its word.

---

## SECTION 10 — THE RUN LOGS (line-selected, nothing reworded)

Every number quoted anywhere in this packet has its log here, in chronological order, and **the sequence IS the story**: a recorded green that did not reproduce, a first fix that converted failures into **skips**, a second fix that held, a third pass that closed your R2-04, and a flake that a single run would have hidden.

---

## SECTION 11 — THE GOVERNING SKILL (verbatim)

Reproduced so that you never need to look it up, and so that a run rooted in a tree that does not contain `.claude/skills/` behaves identically to one that does. **Treat this as the loaded skill. Do not stop to request it.**

---

## CLOSING

You now hold: the remit and the precise scope (§0), the working root and its four hazards (§1), the disposition of your own 15 findings plus pass 4 and pass 5 (§2), twelve falsifiable claims (§3), the house rules (§4), nine changed files (§6), the gate and lease tests with their predecessors (§7), the flake evidence (§8), the caller's claim ledger (§9), every raw log (§10), and the governing skill (§11).

**Emit PART A (hostile review of the pass-4 and pass-5 revision), PART B (the refreshed package), PART C (decision-density self-test).**

Three closing constraints, restated because they are the ones most often violated in this repo:

1. **Do not restate this packet back to the operator.** Spend every token on findings and decisions. A summary of the packet is not a deliverable.
2. **Do not describe the product as working unless a mounted surface proves it.** If your package asserts a capability, it must name the mounted surface and the test that proves it is mounted. This workstream's single most expensive recurring failure is a completion claim that outran the mount.
3. **Where you could not verify something, write `[UNKNOWN]` and say what would settle it.** An honest gap is worth more here than a confident guess — this document exists because three passes of confident claims each needed a fourth pass to correct.

---

## SECTION 6 — THE FILES THAT CHANGED (verbatim)

Nine files. Three are new in pass 4, two are new in pass 5, four are amended. Read the
docblocks — they are where the caller recorded its reasoning, and **the reasoning is what you
are reviewing**. A docblock that states a property the code does not have is the most valuable
find available here.

### backend/tests/helpers/cohortChecks.mjs

_NEW in pass 4. The two cohort gates, extracted from a script that executes `main()` at import time and therefore cannot be imported by a test. **Read the F-1 block: it records a finding the caller MEASURED and then SHRANK.** Attack the disposition, not the fact. Note also that `stripAnsi` is exported from here and is now the runner's ECHO filter (F-5) as well as its check filter._

````js
/**
 * cohortChecks.mjs — the cohort gates, extracted so they can be TESTED.
 *
 * WHY EXTRACTED. These two functions decide whether a run that exited 0 is allowed to be called
 * green. They previously lived as local `const`s inside `run-coach-postgres.mjs`, which executes
 * `main()` at import time and therefore cannot be imported by a test. A gate that cannot be tested
 * is a gate that is only believed. `tests/unit/cohortChecks.test.mjs` now exercises them directly,
 * including the inputs that must FAIL.
 *
 * ═══ F-1 — GATE ASYMMETRY (pass 4, 2026-09-20) — REAL MECHANISM, REACHABILITY NOT DEMONSTRATED ═══
 * `checkVitestCohort` was weaker than `checkNodeCohort`. The node gate asserted `pass === tests`
 * and `tests > 0`; the vitest gate asserted neither — it matched a file count and looked for the
 * WORDS failed/skipped/todo/cancelled. A summary reading `Tests  no tests` contains none of those
 * words, so in principle a cohort that executed zero assertions could satisfy the gate.
 *
 * That hypothesis was MEASURED, not asserted, and it did NOT hold: vitest v4.1.10 reports a
 * zero-test file as `Test Files  1 failed (1)` / `Tests  no tests`, and the word `failed` on the
 * file line already raises a violation. See `tmp/coach-remediation-20260913/F1-GATE-PROBE-RESULT.txt`.
 * The finding is therefore recorded as HARDENING, not as a live defect — the same disposition this
 * repo applies to `ackCommit`'s unreachable mismatch branches.
 *
 * The fix is still made, because the gate's correctness for the zero-test case currently rests on
 * an implementation detail of vitest's reporter. Both gates now PARSE the totals and compare
 * numbers, so the two are symmetric and neither depends on which words a reporter chooses to print.
 *
 * ═══ F-5 — THE RUNNER'S OWN LOGS WERE NOT GREPPABLE (pass 4) ═══
 * The runner echoed child output to its own log VERBATIM. Vitest colours that output even when it
 * is piped, so the escapes sit INSIDE the summary line:
 *
 *     ESC[2m Test Files ESC[22m ESC[1mESC[32m9 passedESC[39mESC[22mESC[90m (9)ESC[39m
 *
 * The literal substring `passed (` does not exist in that line, so `grep "passed ("` finds 0
 * matches in a log that plainly contains "9 passed (9)". This was not theoretical: it produced a
 * FALSE reading of a real evidence extraction during pass 4, which briefly looked like a missing
 * summary line. `stripAnsi` already existed here and was applied to the CHECK but not to the ECHO.
 * Callers should strip ONCE and use that text for both, so the log is byte-identical to the text
 * that was adjudicated. Trade-off accepted knowingly: the log loses colour and gains the property
 * that it can be searched, which is the entire reason this runner exists.
 */

/** Remove ANSI escape sequences. Terminators are letters, so this is safe on ordinary text. */
export const stripAnsi = (s) => String(s).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');

/**
 * Parse a vitest summary line such as "9 passed (9)", "1 failed | 8 passed (9)", "no tests".
 * Returns { counts, total, empty }. `total` is null when the line carries no "(n)".
 */
export const parseVitestTotals = (line) => {
  const text = stripAnsi(line).trim();
  const counts = {};
  for (const m of text.matchAll(/(\d+)\s+(passed|failed|skipped|todo|cancelled|pending)/g)) {
    counts[m[2]] = Number(m[1]);
  }
  const total = text.match(/\((\d+)\)\s*$/);
  return {
    counts,
    total: total ? Number(total[1]) : null,
    empty: /^no tests\b/i.test(text),
  };
};

/** Every outcome that is NOT a plain pass. Shared by both gates so they cannot drift apart. */
const NON_PASS_OUTCOMES = ['failed', 'skipped', 'todo', 'cancelled', 'pending'];

/**
 * R2-12 + F-1 — enforce the vitest cohort. Returns a list of violations; empty is good.
 * Asserts, in both the file line and the test line: a parseable total, a nonzero test count, and
 * `passed === total`. Nothing here depends on which words the reporter prints.
 */
export const checkVitestCohort = (raw, expectedFiles) => {
  const out = stripAnsi(raw);
  const bad = [];

  const fileMatch = out.match(/Test Files\s+(.+)/);
  const testMatch = out.match(/\n\s+Tests\s+(.+)/);
  if (!fileMatch || !testMatch) return ['could not find vitest totals — output shape changed'];

  const fileLine = fileMatch[1].trim();
  const testLine = testMatch[1].trim();
  const files = parseVitestTotals(fileLine);
  const tests = parseVitestTotals(testLine);

  // ── file cohort: identity (count) AND totality
  if (files.empty) bad.push(`vitest file totals report "no tests": ${fileLine}`);
  if (files.total === null) bad.push(`vitest file totals carry no (n) total: ${fileLine}`);
  if (files.counts.passed !== expectedFiles) {
    bad.push(`expected exactly ${expectedFiles} passing vitest file(s), got ${files.counts.passed ?? 'none'}: ${fileLine}`);
  }
  if (files.total !== expectedFiles) {
    bad.push(`vitest file total ${files.total} does not equal the ${expectedFiles} file(s) on disk: ${fileLine}`);
  }

  // ── test cohort: F-1 — the NUMBERS, not just the words
  if (tests.empty) bad.push(`vitest test totals report "no tests": ${testLine}`);
  if (tests.total === null) bad.push(`vitest test totals carry no (n) total: ${testLine}`);
  if (tests.total === 0) bad.push('vitest ran zero tests');
  if (tests.counts.passed !== tests.total) {
    bad.push(`vitest passed (${tests.counts.passed ?? 'none'}) does not equal total (${tests.total}): ${testLine}`);
  }

  for (const word of NON_PASS_OUTCOMES) {
    if ((files.counts[word] ?? 0) > 0) bad.push(`vitest file totals report "${word}": ${fileLine}`);
    if ((tests.counts[word] ?? 0) > 0) bad.push(`vitest test totals report "${word}": ${testLine}`);
  }
  return bad;
};

/**
 * R2-12 — enforce the `node:test` TAP cohort. Unchanged in substance from the runner's original
 * version; it already asserted `pass === tests` and `tests > 0`, which is what F-1 made the vitest
 * gate match.
 */
export const checkNodeCohort = (raw) => {
  const bad = [];
  const num = (name) => {
    const m = String(raw).match(new RegExp(`^# ${name} (\\d+)$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  const tests = num('tests');
  const pass = num('pass');
  const fail = num('fail');
  const skipped = num('skipped');
  const todo = num('todo');
  if (tests === null || pass === null || fail === null) return ['could not find node:test TAP totals'];
  if (fail !== 0) bad.push(`node:test reports ${fail} failure(s)`);
  if (skipped !== 0) bad.push(`node:test reports ${skipped} skipped`);
  if (todo !== 0) bad.push(`node:test reports ${todo} todo`);
  if (pass !== tests) bad.push(`node:test pass (${pass}) does not equal tests (${tests})`);
  if (tests === 0) bad.push('node:test ran zero tests');
  return bad;
};

````

### backend/tests/helpers/coachDatabaseLease.mjs

_NEW in pass 4. The advisory lease. **§3 claim 3 is about this file:** the lease holds a DEDICATED `Client`; if that connection drops mid-run PostgreSQL releases the lock while the runner continues to print "held for the whole run". Decide whether that is reachable._

````js
/**
 * coachDatabaseLease.mjs — the database-scoped lease for the Coach PostgreSQL suites.
 *
 * EXTRACTED from `run-coach-postgres.mjs` in pass 4 for two reasons:
 *   1. Rule 4 — the runner had grown to 344 lines (cap 300) as a result of the R2/F hardening.
 *   2. Testability — F-2 below is the claim "a failed release cannot change the verdict". While
 *      this code lived inside a script that executes `main()` at import time, that claim could only
 *      be READ. `tests/unit/coachDatabaseLease.test.mjs` now exercises it with a client that throws.
 *
 * ── R2-02 (Astra Review 2) — WHY THE LEASE EXISTS
 * `maxWorkers: 1` is process-local and cannot stop a SECOND runner — or a concurrent agent under
 * Rule 67 — dropping the same schema underneath this one. The lease is database-scoped, taken with
 * `pg_try_advisory_lock`, and the runner REFUSES to start without it.
 *
 * ── F-3 (pass 4) — WHY A KILLED RUNNER CANNOT WEDGE THE NEXT ONE
 * This is the first question a reviewer asks about an advisory lease, and the answer is a property
 * of PostgreSQL rather than of this code: session-scoped advisory locks are released when the
 * session ends, and the session ends when the process does — including under SIGKILL, where no
 * `finally` runs. The runner's `finally` is therefore an optimisation for the normal path, not the
 * safety mechanism. Left unstated, the lease reads as a deadlock hazard, which it is not.
 *
 * ── THE LIMIT THAT DOES HOLD
 * This protects against a COOPERATING runner only. An arbitrary SQL client that never asks for the
 * lock is not protected against, and no amount of care here would change that.
 *
 * ── F-2 (pass 4) — RELEASE MUST NOT BE ABLE TO CHANGE THE VERDICT
 * `releaseLease` could previously REJECT: `pg_advisory_unlock` throws if the connection died
 * mid-run, and `client.end()` can throw as well. The caller awaits it inside a `finally`, so that
 * rejection escaped `main()` — the SUMMARY was never printed, and a run in which EVERY test passed
 * died as an apparent crash, taking its own evidence with it. That is the same class as R2-03
 * (failure handling silently changing the outcome), pointing the other way. `releaseLease` is now
 * total: it reports and never throws, and returns what actually happened so the caller can report
 * it rather than assert it (F-4).
 */

/** Arbitrary but stable; must not collide with other advisory-lock users in this database. */
export const LOCK_KEY = 776_012_026_091_900;

/**
 * Try to take the lease.
 * @returns the connected client on success, or `null` if another COOPERATING runner holds it.
 * @throws if the connection cannot be established at all — deliberately a different outcome from a
 *         refusal, so the caller cannot report "someone else is running" when the truth is "the
 *         database is unreachable".
 */
export const acquireLease = async (Client, dbConfig) => {
  const client = new Client(dbConfig);
  await client.connect();
  // The cast is not cosmetic: `pg_try_advisory_lock` is overloaded (bigint) and (int, int), so an
  // untyped parameter makes PostgreSQL report "function is not unique".
  const { rows } = await client.query('SELECT pg_try_advisory_lock($1::bigint) AS got', [LOCK_KEY]);
  if (!rows[0].got) {
    await client.end();
    return null;
  }
  return client;
};

/**
 * Release the lease. TOTAL BY CONSTRUCTION — it never throws and always returns a status string.
 * @param {object|null} client the value returned by `acquireLease`
 * @param {(msg: string) => void} warn injected so a test can capture warnings without a console
 */
export const releaseLease = async (client, warn = (m) => console.error(m)) => {
  if (!client) return 'not acquired';
  let unlocked = false;
  try {
    await client.query('SELECT pg_advisory_unlock($1::bigint)', [LOCK_KEY]);
    unlocked = true;
  } catch (err) {
    warn(`WARNING: advisory unlock failed (${err.message}).`);
    warn('         The session closes next, so PostgreSQL releases the lock with it.');
    warn('         This does NOT affect the test verdict.');
  }
  try {
    await client.end();
  } catch (err) {
    warn(`WARNING: lease client close failed (${err.message}).`);
  }
  return unlocked ? 'released' : 'released by session close';
};

````

### backend/run-coach-postgres.mjs

_REWRITTEN in pass 4 — 297/300 lines after the extraction. This is the file Astra Review 2 covered, in its PREVIOUS revision; everything below the "SELF-REVIEW HARDENING (pass 4)" marker is new. The pass-3 revision of this file was 344 lines, which is why the lease was extracted._

````js
#!/usr/bin/env node
/**
 * run-coach-postgres.mjs — run ALL twelve Coach PostgreSQL suites, both runners, under one
 * GUARDED entry point.
 *
 * WHY THIS EXISTS. These suites were reported "blocked" for several sessions. They were never
 * blocked by a missing database server. Reconciling them found SIX independent issues, three of
 * which are environmental. Identifiers are stable so the documents can cite them:
 *
 *   PG-1  `tests/helpers/coachTestDatabase.mjs` reads `SWAN_COACH_TEST_PORT` ONLY and throws
 *         without it. It never reads `PG_HOST`/`PG_PORT`, so the previously recorded plan
 *         ("point them at the cluster with PG_*") could not have worked. (Astra A1-09.)
 *   PG-2  No AGGREGATE config existed. Note precisely: `tests/helpers/` DOES hold seven
 *         per-suite configs — the issue is that nothing invokes them as a set. See
 *         `vitest.coach-postgres.config.mjs`.
 *   PG-3  The twelve suites share ONE hardcoded database name and did not isolate from each
 *         other.
 *   PG-4  THREE of the twelve are `node:test` files, not vitest. Running them under vitest
 *         reports "No test suite found", which reads like a defect.
 *   PG-5  The `node:test` group RACED ITSELF: `node --test` runs files concurrently by default
 *         and all three call the same migration `up()`.
 *   PG-6  The connection budgets were tuned from a measurement that was itself wrong. See
 *         `tests/helpers/coachTestDatabase.mjs` for the corrected statement.
 *
 * "SIX IDENTIFIED ISSUES" — NOT AN EXHAUSTIVE PROOF THAT NO SEVENTH EXISTS. Two of the six were
 * found only by re-executing work that had already been recorded green, so a seventh is a live
 * possibility, not a rhetorical one.
 *
 * ═══ HOSTILE-REVIEW HARDENING (Astra Review 2, 2026-09-19) ═══
 * Four review findings changed this file's behaviour, not just its prose:
 *
 *   R2-01  The reset ran ONCE before the `node:test` group, so the three files still shared
 *          predecessor state. It now runs before EVERY node file, each file in its own child
 *          process. The old "order-independent by construction" claim was true of the vitest
 *          group only and was stated too broadly.
 *   R2-02  `maxWorkers: 1` is process-local and cannot stop a SECOND runner (or a concurrent
 *          agent) dropping the same schema. This runner now takes a database-scoped
 *          `pg_try_advisory_lock` lease for the whole run and REFUSES to start without it.
 *          LIMIT, stated because the review asked for it: this protects against a cooperating
 *          runner only. An arbitrary SQL client that ignores the lease is not protected against.
 *   R2-03  A failed reset did not stop the dependent group. Now a reset failure is TERMINAL:
 *          the dependent group is reported NOT RUN and the run exits nonzero.
 *   R2-12  `exit 0` did not enforce the advertised cohort. Totals are now parsed and checked:
 *          zero failed, zero skipped/todo/cancelled in both groups, and the vitest file count
 *          must equal the number of vitest suite files actually on disk. Counts are a
 *          CROSS-CHECK — the cohort identity comes from the file inventory, not from a number
 *          hardcoded here that would rot.
 *
 * ═══ SELF-REVIEW HARDENING (pass 4, 2026-09-20 — no external reviewer; found by re-reading) ═══
 * Astra's Review 2 covered the PREVIOUS revision of this file. Re-reading the revision that came
 * out of it produced five further findings. None came from an external reviewer, and they are
 * recorded here so the next reader does not have to rediscover them.
 *
 *   F-1  The vitest cohort gate never asserted that any test RAN — unlike the node gate, which
 *        asserts `pass === tests` and `tests > 0`. MEASURED, THEN DOWNGRADED: the hole is real in
 *        the parser, but vitest v4.1.10 reports a zero-test file as `Test Files  1 failed (1)`, and
 *        the word `failed` on the file line already raised a violation — so no REACHABLE path was
 *        demonstrated. Recorded as hardening, not as a live defect. Both gates now parse the totals
 *        and compare numbers, so neither depends on which words vitest chooses to print.
 *        Evidence: tmp/coach-remediation-20260913/F1-GATE-PROBE-RESULT.txt
 *   F-2  `closeLease` could REJECT, and the caller awaits it inside a `finally`. A failed release
 *        therefore escaped `main()`, suppressed the SUMMARY, and turned an all-passing run into an
 *        apparent crash — taking its own evidence with it. It can no longer throw.
 *   F-3  The docblock never explained why a KILLED runner cannot wedge the next one. Session-scoped
 *        advisory locks are released when the session ends, so the `finally` is an optimisation and
 *        not the safety mechanism. Left unstated, the lease read as a deadlock hazard.
 *   F-4  The SUMMARY printed `(released)` unconditionally — ASSERTING the outcome rather than
 *        reporting it. It now reports what actually happened.
 *   F-5  This runner echoed RAW ANSI into its own log, so its summary was not greppable:
 *        `grep "passed ("` returned ZERO matches on a log that plainly contained "9 passed (9)".
 *        `stripAnsi` already existed and was applied to the CHECK but never to the ECHO. This was
 *        not theoretical — it produced a FALSE reading of a real evidence extraction during pass 4.
 *
 * USAGE
 *   SWAN_COACH_TEST_PORT=55433 node run-coach-postgres.mjs      (or: npm run test:coach-postgres)
 *
 * There is deliberately NO `--reset` flag. An earlier draft of this docblock documented one and
 * the script never read argv — a documented-but-nonexistent control, the same "phantom control"
 * class as `USE_BULLMQ_RECONCILIATION`. It is also unnecessary: the reset is unconditional.
 *
 * The target database is DISPOSABLE. The suites sync() and drop() tables by name and the reset
 * drops the `public` schema. Never point this at real data.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// F-1 (pass 4, 2026-09-20). The cohort gates used to be local `const`s in this file, which made
// them UNTESTABLE: this module executes `main()` at import time, so no test could import them. A
// gate that cannot be tested is a gate that is only believed. They now live in a module the unit
// suite imports, and `tests/unit/cohortChecks.test.mjs` exercises the inputs that must FAIL.
import { stripAnsi, checkVitestCohort, checkNodeCohort } from './tests/helpers/cohortChecks.mjs';
import { acquireLease, releaseLease } from './tests/helpers/coachDatabaseLease.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { Client } = require('pg');

const port = Number(process.env.SWAN_COACH_TEST_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('ERROR: set SWAN_COACH_TEST_PORT to the owned disposable database port.');
  console.error('       e.g.  SWAN_COACH_TEST_PORT=55433 node run-coach-postgres.mjs');
  process.exit(4);
}

const DATABASE = 'coach_test_20260906';
const DB = { host: '127.0.0.1', port, database: DATABASE, user: 'coach_test_admin', password: '' };

/** The three suites that use `node:test` rather than vitest. */
const NODE_TEST_SUITES = [
  'tests/integration/coachIntent.postgres.test.mjs',
  'tests/integration/coachIntent.proof.postgres.test.mjs',
  'tests/integration/coachIntentListing.postgres.test.mjs',
];

/** Cohort identity comes from disk, not from a hardcoded number that rots. */
const allSuiteFiles = readdirSync(`${here}/tests/integration`)
  .filter((f) => f.endsWith('.postgres.test.mjs'));
const nodeSuiteNames = new Set(NODE_TEST_SUITES.map((p) => p.split('/').pop()));
const EXPECTED_VITEST_FILES = allSuiteFiles.filter((f) => !nodeSuiteNames.has(f)).length;

const RESET = 'tests/helpers/resetCoachTestSchemaNow.mjs';

/**
 * Run a child, echo its output, and capture it for the cohort checks.
 *
 * F-5 (pass 4). The echo is ANSI-STRIPPED, and the stripped text is what gets returned and
 * therefore what gets checked. Previously the RAW text was echoed, and vitest colours its output
 * even when it is piped, so the escapes landed INSIDE the summary line:
 *
 *     ESC[2m Test Files ESC[22m ESC[1mESC[32m9 passedESC[39mESC[22mESC[90m (9)ESC[39m
 *
 * The literal substring `passed (` did not exist in that line. `grep "passed ("` returned ZERO
 * matches on a log that plainly contained "9 passed (9)", which produced a false reading of a real
 * evidence extraction during pass 4 and briefly looked like a missing summary line. `stripAnsi`
 * already existed in this file and was applied to the CHECK but never to the ECHO.
 * Stripping once means the log is byte-identical to the text that was adjudicated.
 * Trade-off, accepted knowingly: the log loses colour. That is the right trade for a log whose
 * entire purpose is to be searched and cited.
 */
const run = (label, cmd, args) => {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, {
    cwd: here, encoding: 'utf8', shell: process.platform === 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const out = stripAnsi(`${r.stdout || ''}${r.stderr || ''}`);
  process.stdout.write(out);
  return { ok: r.status === 0, out };
};

/** The reset, as its own child process so a failure is attributable and terminal. */
const reset = (label) => run(label, process.execPath, [RESET]);

/**
 * R2-12 + F-1 — the cohort gates now live in `tests/helpers/cohortChecks.mjs` and are imported
 * above. They were moved out of this file because this file cannot be imported by a test, and an
 * untestable gate is only believed. `tests/unit/cohortChecks.test.mjs` covers them, including the
 * inputs that must fail.
 *
 * Behaviour changed in that move, deliberately:
 *   - The vitest gate now PARSES the totals and asserts `passed === total` and `total > 0`, matching
 *     what the node gate always did. It no longer depends on which words vitest prints.
 *   - `stripAnsi` also became the ECHO filter (F-5), not just the check filter.
 */

/**
 * R2-02 / F-2 / F-3 — the database lease now lives in `tests/helpers/coachDatabaseLease.mjs`.
 * It was extracted in pass 4 for two reasons: (a) this file had grown past the Rule 4 cap as a
 * result of the hardening, and (b) the F-2 claim — "a failed release cannot change the verdict" —
 * was only READABLE while it lived here. It is now exercised by
 * `tests/unit/coachDatabaseLease.test.mjs` with a client whose release throws.
 */

/**
 * R2-10 — SINGLE-FILE MODE. `--file <suite>` is the SUPPORTED way to run one suite, because it
 * applies the same lease, the same reset and the same cohort checks as a full run. The seven
 * pre-existing per-suite configs are preserved as history but are no longer endorsed as
 * equivalent entry points: they omit the reset, so they do not isolate.
 */
let selected = null;
const fileFlag = process.argv.indexOf('--file');
if (fileFlag !== -1) {
  const raw = process.argv[fileFlag + 1];
  if (!raw || raw.startsWith('--')) {
    console.error('ERROR: --file requires a suite name, e.g. --file coachWorkoutAtomic');
    process.exit(4);
  }
  const name = raw.endsWith('.mjs') ? raw.split('/').pop() : `${raw}.postgres.test.mjs`;
  if (!allSuiteFiles.includes(name)) {
    console.error(`ERROR: unknown suite "${raw}". Known suites:`);
    for (const f of allSuiteFiles) console.error(`  ${f}`);
    process.exit(4);
  }
  selected = name;
}

const main = async () => {
  const selectedIsNodeSuite = selected ? nodeSuiteNames.has(selected) : false;
  const vitestRuns = !selected || !selectedIsNodeSuite;
  const nodeSuites = selected ? (selectedIsNodeSuite ? [selected] : []) : NODE_TEST_SUITES;
  const expectedVitestFiles = selected ? 1 : EXPECTED_VITEST_FILES;

  console.log(`target 127.0.0.1:${port}/${DATABASE}`);
  console.log(selected
    ? `SINGLE-FILE MODE: ${selected}`
    : `FULL RUN · vitest cohort expectation: ${EXPECTED_VITEST_FILES} files · node:test files: ${NODE_TEST_SUITES.length}`);

  const lease = await acquireLease(Client, DB);
  if (!lease) {
    console.error('REFUSED: another guarded runner already holds the database lease.');
    console.error('         Two runners would drop the same schema under each other. Wait, or use');
    console.error('         a different database. (An arbitrary SQL client is NOT protected against.)');
    process.exit(5);
  }

  const violations = [];
  let vitestOk = true;
  let vitestRan = false;
  let nodeOk = true;
  let nodeRan = false;
  const notRun = [];
  // F-4: the lease release outcome is RECORDED here so the SUMMARY can report it, not assert it.
  let leaseOutcome = 'unknown';

  try {
    // ── Group 1 — the vitest suites. The per-file reset is wired into the config's
    //    `setupFiles`, so this group is genuinely order-independent.
    if (vitestRuns) {
      const args = ['vitest', 'run', '--config', 'vitest.coach-postgres.config.mjs'];
      if (selected) args.push(`tests/integration/${selected}`);
      const vitest = run(selected || 'vitest suites', 'npx', args);
      vitestRan = true;
      vitestOk = vitest.ok;
      violations.push(...checkVitestCohort(vitest.out, expectedVitestFiles).map((v) => `vitest: ${v}`));
    }

    // ── Group 2 — the node:test suites. R2-01: reset before EVERY file, each in its own
    //    child process, because these files get no `setupFiles` hook. R2-03: a failed reset
    //    is TERMINAL for everything after it.
    if (nodeSuites.length) {
      const nodeResults = [];
      nodeRan = true;
      for (const suite of nodeSuites) {
        const r = reset(`schema reset before ${suite.split('/').pop()}`);
        if (!r.ok) {
          notRun.push(suite);
          violations.push(`reset failed before ${suite} — that file and all later files were NOT RUN`);
          nodeRan = false;
          break;
        }
        nodeResults.push(run(suite.split('/').pop(), process.execPath, [
          '--import', './tests/helpers/registerCoachTestDatabase.mjs',
          '--test', '--test-concurrency=1', suite,
        ]));
      }
      if (nodeRan) {
        nodeOk = nodeResults.length === nodeSuites.length && nodeResults.every((r) => r.ok);
        for (const t of nodeResults) {
          violations.push(...checkNodeCohort(t.out).map((v) => `node:test: ${v}`));
        }
      }
    }
  } finally {
    // F-2: this cannot throw, so it cannot suppress the SUMMARY below and cannot turn a passing
    // run into an apparent crash. Its real outcome is captured for the SUMMARY (F-4).
    leaseOutcome = await releaseLease(lease);
  }

  console.log(`\n=== SUMMARY ===`);
  // F-4: report the lease outcome that ACTUALLY happened. This line used to print "(released)"
  // unconditionally — asserting the very fact a reader would want to see proven.
  console.log(`database lease:  held for the whole run · release: ${leaseOutcome}`);
  if (vitestRan) console.log(`vitest group:    ${vitestOk ? 'PASS' : 'FAIL'}`);
  if (nodeSuites.length) {
    console.log(`node:test group: ${nodeRan ? (nodeOk ? 'PASS' : 'FAIL') : 'NOT RUN (reset failed)'}`);
  }
  if (notRun.length) console.log(`NOT RUN:         ${notRun.join(', ')}`);

  if (violations.length) {
    console.error(`\nCOHORT VIOLATIONS (${violations.length}) — exit nonzero even if every process exited 0:`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exitCode = 1;
    return;
  }
  if (!vitestOk || !nodeOk) {
    console.error('\nOne or more groups failed. See the group output above.');
    process.exitCode = 1;
    return;
  }
  console.log('cohort: all identities and zero-skip checks satisfied.');
  process.exitCode = 0;
};

await main();

````

### backend/tests/helpers/coachApprovalFixture.mjs

_NEW in pass 5. The shared fixture extracted so two suites can drive the SAME product path on DIFFERENT budgets — and so `coachWorkoutAtomic` could come back under the Rule 4 cap (295 → 255). Read the R2-04 note: it explains why passing a `sequelizeOverride` would NOT redirect the model queries, which is the reason the second suite mocks `database.mjs` instead._

````js
/**
 * coachApprovalFixture.mjs — shared schema, models and helpers for the Coach approval suites.
 *
 * WHY EXTRACTED (pass 5, 2026-09-20). Two suites now need the SAME product path
 * (`approveCoachActionProposal`) running against DIFFERENT connection budgets:
 *
 *   - `coachWorkoutAtomic.postgres.test.mjs`    — the shared harness budgets
 *   - `coachWorkoutPoolBudget.postgres.test.mjs` — a deliberately TIGHT budget, which is the
 *     compensating evidence Astra's **R2-04** asked for
 *
 * A duplicated fixture would drift, and the atomic suite was at 295/300 lines (Rule 4), so the
 * fixture moved here rather than being copied.
 *
 * WHAT STAYS IN THE TEST FILES, AND WHY. The `vi.mock(...)` blocks deliberately remain in each test
 * file: they are file-scoped and hoisted, and they are what SELECTS the sequelize instance — that is
 * the very thing the two suites differ on. This helper therefore takes that instance as an argument
 * and never imports `database.mjs` itself.
 *
 * NOTE ON R2-04 ITSELF. The product code under test resolves its connection through the models,
 * which are bound to whichever instance `database.mjs` was mocked to. Passing a different instance
 * as `sequelizeOverride` would therefore NOT redirect the model queries — it would measure the
 * wrong pool and produce a test that passes without proving anything. The pool-budget suite avoids
 * that by mocking `database.mjs` itself to a tight instance, and then ASSERTING the pool is tight.
 */
import { expect } from 'vitest';
import { DataTypes, QueryTypes } from 'sequelize';
import { randomUUID } from 'node:crypto';
import proposalMigration from '../../migrations/20260506120000-create-coach-intake-items.cjs';

export const ACTOR = { id: 7, role: 'admin' };

/** The canonical synthetic workout. Three sets across two exercises — see `totalSets` assertions. */
export const APPROVAL_PAYLOAD = {
  targetUserId: 42,
  payload: {
    clientId: 42,
    date: '2026-05-05',
    title: 'Synthetic test workout',
    exercises: [
      { exerciseName: 'Squat', sets: [{ reps: 8, weight: 40 }, { reps: 7, weight: 40 }] },
      { exerciseName: 'Row', sets: [{ reps: 10, weight: 20 }] },
    ],
  },
};

/**
 * Build every schema object and service handle the approval path needs, on the given instance.
 * Call from `beforeAll`, after `vi.stubEnv`.
 */
export async function buildCoachApprovalFixture(db) {
  const rawQuery = db.query.bind(db);
  await db.authenticate();

  const User = db.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    role: DataTypes.STRING,
    availableSessions: DataTypes.INTEGER,
    clientSource: DataTypes.STRING,
    timeZone: DataTypes.STRING,
    timeZoneConfigured: DataTypes.BOOLEAN,
  }, { tableName: 'Users', timestamps: false });
  await User.sync();
  await rawQuery('CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY)');
  await rawQuery('CREATE TABLE IF NOT EXISTS workout_plans (id UUID PRIMARY KEY)');
  await rawQuery('CREATE TABLE IF NOT EXISTS workout_plan_days (id UUID PRIMARY KEY)');

  const Form = (await import('../../models/DailyWorkoutForm.mjs')).default;
  const Session = (await import('../../models/WorkoutSession.mjs')).default;
  const Log = (await import('../../models/WorkoutLog.mjs')).default;
  const Assignment = (await import('../../models/ClientTrainerAssignment.mjs')).default;
  await Assignment.sync();
  await Session.sync();
  await Form.sync();
  await Log.sync();
  await proposalMigration.up(db.getQueryInterface());

  const {
    approveCoachActionProposal: approve,
    rejectCoachActionProposal: reject,
    getCoachActionProposal: detail,
  } = await import('../../services/ai/coachActionProposalApprovalService.mjs');
  const { submitAiWorkoutLogAsDailyForm: writer } =
    await import('../../services/workout/aiWorkoutDailyFormService.mjs');
  const { runWorkoutXpAwardStep: xp } = await import('../../services/workout/workoutXpAwardStep.mjs');

  return { db, rawQuery, User, Form, Session, Log, Assignment, approve, reject, detail, writer, xp };
}

/** The two accounts every approval test needs. `availableSessions: 2` makes a double deduction visible. */
export async function seedApprovalActors(User) {
  await User.bulkCreate([
    { id: 7, role: 'admin' },
    { id: 42, role: 'client', availableSessions: 2, clientSource: 'swanstudios',
      timeZone: 'UTC', timeZoneConfigured: true },
  ]);
}

/** Clear everything the fixture owns. Order matters: assignments first, then the user rows. */
export async function resetApprovalState({ Assignment, rawQuery }) {
  await Assignment.destroy({ where: {} });
  await rawQuery('TRUNCATE "Users" CASCADE');
}

/**
 * Insert a proposal and return the exact argument object the product caller expects, including a
 * valid review token minted by the real `detail` path.
 */
export async function createProposal({ rawQuery, detail, db, payload = APPROVAL_PAYLOAD }) {
  const id = randomUUID();
  await rawQuery(`INSERT INTO coach_action_proposals
    (id,created_by_user_id,proposal_type,schema_version,proposal_cipher,proposal_iv,proposal_tag,cipher_key_id)
    VALUES (:id,7,'workout_log','v1',:cipher,:iv,:tag,'TEST')`,
  { replacements: { id, cipher: Buffer.from(JSON.stringify(payload)), iv: Buffer.from('iv'), tag: Buffer.from('tag') } });
  const reviewed = await detail({ id, req: { user: ACTOR }, sequelizeOverride: db });
  return {
    id,
    req: { user: ACTOR, body: { reviewToken: reviewed.body.proposal.reviewToken } },
    sequelizeOverride: db,
  };
}

export async function readProposalState(rawQuery, id) {
  return (await rawQuery('SELECT status, applied_result_json FROM coach_action_proposals WHERE id=:id',
    { replacements: { id }, type: QueryTypes.SELECT }))[0];
}

/** The strongest single assertion available: nothing at all was written, and the credit is intact. */
export async function assertProposalRolledBack({ rawQuery, Form, Session, Log, User }, id) {
  expect((await readProposalState(rawQuery, id)).status).toBe('PENDING');
  expect(await Form.count()).toBe(0);
  expect(await Session.count()).toBe(0);
  expect(await Log.count()).toBe(0);
  expect((await User.findByPk(42)).availableSessions).toBe(2);
}

````

### backend/tests/integration/coachWorkoutPoolBudget.postgres.test.mjs

_NEW in pass 5 — the compensating evidence for R2-04, and the file §3 claims 6 and 7 are about. Seven tests on a pool of 2. **Attack `instrumentPool()`:** it patches `acquire`/`release` AFTER the fixture has already run `authenticate()` and `sync()`._

````js
/** R2-04 COMPENSATING EVIDENCE — the product approval path under a DELIBERATELY TIGHT pool.
 *
 * WHY THIS FILE EXISTS. Astra's Review 2 (R2-04) falsified a claim in the shared harness: the
 * assertion that "raising the connection budgets cannot mask a product defect". It was false,
 * because the suites substitute the enlarged-budget instance as the *application* database via
 * `vi.mock('../../database.mjs', ...)`, so product code acquires connections under the relaxed
 * budgets. The claim was withdrawn — but a withdrawn claim is not evidence, so Astra asked for two
 * things this file supplies:
 *
 *   1. a CONNECTION-RELEASE test through the product caller, and
 *   2. a BOUNDED ACQUISITION-FAILURE test through the product caller.
 *
 * WHAT IT PROVES. That the relaxed budgets in the shared harness are HEADROOM, not a requirement:
 * the real approval path completes on a pool of 2, returns every connection, and — when the pool is
 * genuinely exhausted — fails within a bounded time without writing anything. If any of that were
 * false, the enlarged budgets would indeed be hiding a defect.
 *
 * WHAT IT DOES NOT PROVE. That no other product path leaks, that a different pool configuration is
 * safe, or that the chosen `max: 2` is a production-appropriate value. It is a bound on THIS path.
 *
 * ANTI-NO-OP GUARDS. A test that believes it is exercising a tight budget while the product path
 * quietly uses a different, larger pool would pass while proving nothing — the exact defect class
 * this workstream exists to hunt. So the first test asserts the pool really is tight, and the peak
 * instrument asserts it actually OBSERVED acquisitions (`peak > 0`).
 *
 * The `vi.mock` factory must not reference module-scope consts: it is hoisted, so they are still in
 * the temporal dead zone when the mocked module is first imported. Everything inside it is either a
 * literal or read from `process.env` at call time.
 */
import { beforeAll, beforeEach, afterAll, afterEach, expect, test, vi } from 'vitest';
import {
  APPROVAL_PAYLOAD, buildCoachApprovalFixture, seedApprovalActors, resetApprovalState,
  createProposal, assertProposalRolledBack,
} from '../helpers/coachApprovalFixture.mjs';

/** The tight budget. `acquire` is short so the exhaustion test is fast; the CONNECT budget is left
 * generous because on this Windows PG17 loopback establishment is genuinely slow, and tightening it
 * would introduce flakiness that has nothing to do with the property under test. */
const TIGHT_MAX = 2;
const TIGHT_ACQUIRE_MS = 1500;

vi.mock('../../database.mjs', async () => {
  const { Sequelize } = await import('sequelize');
  const instance = new Sequelize('coach_test_20260906', 'coach_test_admin', '', {
    dialect: 'postgres',
    host: '127.0.0.1',
    port: Number(process.env.SWAN_COACH_TEST_PORT),
    logging: false,
    pool: { max: 2, min: 0, acquire: 1500, idle: 1000 },
    dialectOptions: { connectionTimeoutMillis: 15000 },
  });
  return { default: instance };
});
vi.mock('../../models/index.mjs', async () => {
  const { default: db } = await import('../../database.mjs');
  return { getAllModels: () => db.models };
});
vi.mock('../../utils/logger.mjs', () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));
vi.mock('../../services/plaudCipherService.mjs', async () => ({
  encryptPayload: vi.fn(),
  decryptPayload: ({ cipher }) => JSON.parse(Buffer.from(cipher).toString()),
}));
vi.mock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
  createClientFromCoachOnboardingProposal: vi.fn(), summarizeOnboardingDraftForReview: vi.fn(),
}));
vi.mock('../../services/ai/coachPlanEditApprovalService.mjs', () => ({
  applyPlanEditProposal: vi.fn(), resolveActiveEditablePlan: vi.fn(),
}));
vi.mock('../../services/workout/workoutXpAwardStep.mjs', () => ({ runWorkoutXpAwardStep: vi.fn(async () => null) }));
vi.mock('../../services/workout/workoutPrDetectionService.mjs', () => ({
  detectAndRecordPersonalRecords: vi.fn(async () => ({ prEvents: [] })),
}));
vi.mock('../../services/workout/aiWorkoutChallengeProgressBridge.mjs', () => ({
  applyAiWorkoutChallengeProgress: vi.fn(async () => ({ status: 'none', updates: [] })),
}));
vi.mock('../../services/trainerSessionEarningService.mjs', () => ({ accrueFlatSessionEarning: vi.fn() }));

import db from '../../database.mjs';

const pool = () => db.connectionManager.pool;
let fx;
let peakUsing = 0;

/** High-water mark of checked-out connections. Acquisitions and releases are the only events that
 * change `using`, so sampling after each is exact up to concurrent interleaving (which can only
 * under-count). `peakUsing > 0` is itself an assertion that the instrument observed something. */
function instrumentPool() {
  const p = pool();
  const acquire = p.acquire.bind(p);
  const release = p.release.bind(p);
  const sample = () => { peakUsing = Math.max(peakUsing, p.using); };
  p.acquire = async (...args) => { const r = await acquire(...args); sample(); return r; };
  p.release = (...args) => { const r = release(...args); sample(); return r; };
}

const proposal = (payload) => createProposal({ rawQuery: fx.rawQuery, detail: fx.detail, db: fx.db, payload });

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'synthetic-coach-pool-budget-secret');
  fx = await buildCoachApprovalFixture(db);
  instrumentPool();
});
beforeEach(async () => {
  await resetApprovalState(fx);
  await seedApprovalActors(fx.User);
  peakUsing = 0;
});
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { vi.unstubAllEnvs(); await db.close(); });

test('ANTI-NO-OP: the pool really is tight, so a pass here means something', () => {
  const p = pool();
  expect(p.maxSize).toBe(TIGHT_MAX);
  expect(p.acquireTimeoutMillis).toBe(TIGHT_ACQUIRE_MS);
  expect(p.size).toBeLessThanOrEqual(TIGHT_MAX);
});

test('a single approval completes on a pool of 2 and releases every connection', async () => {
  const input = await proposal();
  const result = await fx.approve(input);
  expect(result.status).toBe(200);
  const p = pool();
  expect(p.using).toBe(0);
  expect(p.waiting).toBe(0);
  expect(peakUsing).toBeGreaterThan(0);
  expect(peakUsing).toBeLessThanOrEqual(TIGHT_MAX);
  expect((await fx.User.findByPk(42)).availableSessions).toBe(1);
});

test('the approval path never needs more than the pool allows, even under concurrency', async () => {
  const input = await proposal();
  const results = await Promise.all(Array.from({ length: 5 }, () => fx.approve(input)));
  expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  const p = pool();
  expect(p.using).toBe(0);
  expect(p.waiting).toBe(0);
  expect(peakUsing).toBeLessThanOrEqual(TIGHT_MAX);
  expect(await fx.Form.count()).toBe(1);
});

test('5 sequential approvals do not leak connections back into the pool', async () => {
  const p = pool();
  for (let i = 0; i < 5; i += 1) {
    // Each iteration must be a LEGITIMATELY DISTINCT workout: same client, different date, and
    // enough credit. Otherwise the product correctly refuses — MEASURED, the second identical
    // approval returns `DUPLICATE_DATE` ("A workout session already exists for this client on this
    // date") — and this test would be measuring a domain rule instead of connection behaviour.
    await fx.User.update({ availableSessions: 2 }, { where: { id: 42 } });
    const dated = { ...APPROVAL_PAYLOAD, payload: { ...APPROVAL_PAYLOAD.payload, date: `2026-06-0${i + 1}` } };
    const input = await proposal(dated);
    const r = await fx.approve(input);
    if (r.status !== 200) throw new Error(`iteration ${i} returned ${r.status}: ${JSON.stringify(r.body)}`);
    expect(p.using).toBe(0);
  }
  expect(p.size).toBeLessThanOrEqual(TIGHT_MAX);
});

test('a FAILED approval releases its connection too', async () => {
  const input = await proposal();
  vi.spyOn(fx.Log, 'bulkCreate').mockRejectedValueOnce(new Error('synthetic insert failure'));
  expect((await fx.approve(input)).status).toBe(400);
  const p = pool();
  expect(p.using).toBe(0);
  expect(p.waiting).toBe(0);
});

test('pool exhaustion fails the caller in BOUNDED time and writes nothing', async () => {
  const input = await proposal();
  const p = pool();
  const held = [];
  for (let i = 0; i < p.maxSize; i += 1) held.push(await p.acquire());
  let outcome;
  let elapsed = 0;
  try {
    expect(p.using).toBe(TIGHT_MAX);
    const started = Date.now();
    try {
      outcome = await fx.approve(input);
    } catch (err) {
      outcome = { threw: err };
    }
    elapsed = Date.now() - started;
  } finally {
    for (const conn of held) p.release(conn);
  }
  // Prove the release actually WORKED. A leak in this suite would hold PostgreSQL backends open and
  // inflate connect pressure for every later suite in the same run, surfacing there as a flake that
  // looks unrelated to this file. That is precisely the kind of cross-suite contamination that
  // makes a suite untrustworthy, so it is asserted rather than assumed.
  expect(p.using).toBe(0);

  // BOUNDEDNESS is the property. The failure mode this guards against is a HANG: the earlier
  // unbounded barrier in the atomic suite turned a budget regression into an infrastructure
  // timeout, which reads as flakiness instead of as the assertion it is.
  const thrown = outcome.threw;
  expect(thrown ? null : outcome.status).not.toBe(200);
  // MEASURED, not assumed: `SequelizeConnectionAcquireTimeoutError: Operation timeout` at 1513 ms —
  // the pool's OWN acquire timeout (configured 1500 ms). Pinning the exact class and a lower time
  // bound is what stops this test from passing for an unrelated reason that merely happened to be
  // fast. If the product ever changes to returning a status instead of throwing, this fails loudly
  // and someone decides — which is the point.
  expect(thrown?.name).toBe('SequelizeConnectionAcquireTimeoutError');
  expect(elapsed).toBeGreaterThanOrEqual(1400);
  expect(elapsed).toBeLessThan(10000);
  // Nothing may be written when the caller could not even get a connection.
  await assertProposalRolledBack(fx, input.id);
});

test('the same fixture still succeeds once the pool is released again', async () => {
  const input = await proposal();
  const p = pool();
  const held = [];
  for (let i = 0; i < p.maxSize; i += 1) held.push(await p.acquire());
  for (const conn of held) p.release(conn);
  expect((await fx.approve(input)).status).toBe(200);
  expect(p.using).toBe(0);
  expect(APPROVAL_PAYLOAD.payload.exercises).toHaveLength(2);
});

````

### backend/tests/integration/coachWorkoutAtomic.postgres.test.mjs

_REWRITTEN in pass 5 against the shared fixture — 295 → 255 lines. **Its 13 tests were re-verified UNCHANGED after the extraction.** Verify that claim: the `vi.mock` blocks stayed in THIS file deliberately, because they are what SELECTS the sequelize instance. One unrequested change was caught and reverted during the refactor._

````js
/** Real canonical form/session/log models and proposal migration, on loopback only.
 * User/assignment/session fixture tables supply account FKs; no production data.
 * Secondary services are isolated; approval, writer, billing and persistence are real.
 *
 * The schema/model/service fixture lives in `../helpers/coachApprovalFixture.mjs` (extracted in
 * pass 5) so that `coachWorkoutPoolBudget.postgres.test.mjs` can drive the SAME product path
 * against a deliberately TIGHT connection budget — the compensating evidence Astra's R2-04 asked
 * for. The `vi.mock` blocks below must stay in this file: they are hoisted, file-scoped, and are
 * what selects the sequelize instance.
 */
import { beforeAll, beforeEach, afterAll, afterEach, expect, test, vi } from 'vitest';
import { QueryTypes } from 'sequelize';
import { randomUUID } from 'node:crypto';
import db from '../helpers/coachTestDatabase.mjs';
import {
  ACTOR, APPROVAL_PAYLOAD, buildCoachApprovalFixture, seedApprovalActors, resetApprovalState,
  createProposal, readProposalState, assertProposalRolledBack,
} from '../helpers/coachApprovalFixture.mjs';

vi.mock('../../database.mjs', async () => ({ default: (await import('../helpers/coachTestDatabase.mjs')).default }));
vi.mock('../../models/index.mjs', () => ({ getAllModels: () => db.models }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));
vi.mock('../../services/plaudCipherService.mjs', () => ({
  encryptPayload: vi.fn(),
  decryptPayload: ({ cipher }) => JSON.parse(Buffer.from(cipher).toString()),
}));
vi.mock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
  createClientFromCoachOnboardingProposal: vi.fn(), summarizeOnboardingDraftForReview: vi.fn(),
}));
vi.mock('../../services/ai/coachPlanEditApprovalService.mjs', () => ({
  applyPlanEditProposal: vi.fn(), resolveActiveEditablePlan: vi.fn(),
}));
vi.mock('../../services/workout/workoutXpAwardStep.mjs', () => ({ runWorkoutXpAwardStep: vi.fn(async () => null) }));
vi.mock('../../services/workout/workoutPrDetectionService.mjs', () => ({
  detectAndRecordPersonalRecords: vi.fn(async () => ({ prEvents: [] })),
}));
vi.mock('../../services/workout/aiWorkoutChallengeProgressBridge.mjs', () => ({
  applyAiWorkoutChallengeProgress: vi.fn(async () => ({ status: 'none', updates: [] })),
}));
vi.mock('../../services/trainerSessionEarningService.mjs', () => ({ accrueFlatSessionEarning: vi.fn() }));

let fx;
const proposal = () => createProposal(fx);
const state = (id) => readProposalState(fx.rawQuery, id);
const assertRolledBack = (id) => assertProposalRolledBack(fx, id);

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'synthetic-coach-atomic-review-secret');
  fx = await buildCoachApprovalFixture(db);
});
beforeEach(async () => {
  await resetApprovalState(fx);
  await seedApprovalActors(fx.User);
});
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { vi.unstubAllEnvs(); await db.close(); });

test('APPLIED and all canonical rows become visible together with one credit deduction', async () => {
  const input = await proposal();
  let observed = false;
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    const result = await fx.rawQuery(sql, opts);
    if (typeof sql === 'string' && sql.includes('UPDATE coach_action_proposals') && opts?.replacements?.status === 'APPLIED') {
      expect(opts.transaction).toBeTruthy();
      expect(await fx.Form.count({ transaction: opts.transaction })).toBe(1);
      expect(await fx.Log.count({ transaction: opts.transaction })).toBe(3);
      expect(await fx.Form.count()).toBe(0);
      expect((await state(input.id)).status).toBe('PENDING');
      observed = true;
    }
    return result;
  });
  const result = await fx.approve(input);
  expect(result.status).toBe(200); expect(observed).toBe(true);
  expect((await state(input.id)).status).toBe('APPLIED');
  expect((await fx.User.findByPk(42)).availableSessions).toBe(1);
  const form = await fx.Form.findOne(), session = await fx.Session.findOne();
  const saved = (await state(input.id)).applied_result_json.workout;
  expect(saved.formId).toBe(form.id); expect(saved.sessionId).toBe(session.id);
  expect(form.sessionId).toBe(session.id); expect(form.sessionDeducted).toBe(true);
  expect(result.body.workout.formId).toBe(form.id);
});

test('log insert failure rolls back the proposal claim and all domain writes', async () => {
  const input = await proposal();
  vi.spyOn(fx.Log, 'bulkCreate').mockRejectedValueOnce(new Error('synthetic insert failure'));
  expect((await fx.approve(input)).status).toBe(400);
  await assertRolledBack(input.id);
});

test('failure after proposal APPLIED SQL rolls back proposal, diary, logs and credit', async () => {
  const input = await proposal();
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    const result = await fx.rawQuery(sql, opts);
    if (typeof sql === 'string' && sql.includes('UPDATE coach_action_proposals') && opts?.replacements?.status === 'APPLIED')
      throw new Error('synthetic after-apply failure');
    return result;
  });
  expect((await fx.approve(input)).status).toBe(400);
  await assertRolledBack(input.id);
});

test('20 approvals produce exactly one canonical workout and one paid deduction', async () => {
  const input = await proposal();
  const results = await Promise.all(Array.from({ length: 20 }, () => fx.approve(input)));
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 409)).toHaveLength(19);
  expect(await fx.Form.count()).toBe(1); expect(await fx.Log.count()).toBe(3);
  expect((await state(input.id)).status).toBe('APPLIED');
  expect((await fx.User.findByPk(42)).availableSessions).toBe(1);
});

test('approval and rejection cannot both win the same proposal', async () => {
  const input = await proposal();
  const results = await Promise.all([fx.approve(input), fx.reject(input)]);
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 409)).toHaveLength(1);
  const status = (await state(input.id)).status;
  expect(['APPLIED', 'REJECTED']).toContain(status);
  expect(await fx.Form.count()).toBe(status === 'APPLIED' ? 1 : 0);
});

test('review token cannot authorize changed encrypted proposal content', async () => {
  const input = await proposal();
  const changed = { ...APPROVAL_PAYLOAD, payload: { ...APPROVAL_PAYLOAD.payload, date: '2026-05-04' } };
  await fx.rawQuery('UPDATE coach_action_proposals SET proposal_cipher=:cipher WHERE id=:id',
    { replacements: { id: input.id, cipher: Buffer.from(JSON.stringify(changed)) } });
  const result = await fx.approve(input);
  expect(result.status).toBe(428);
  await assertRolledBack(input.id);
});

test('access revoked before transaction check prevents the canonical write', async () => {
  const input = await proposal();
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    const result = await fx.rawQuery(sql, opts);
    if (typeof sql === 'string' && sql.includes('FOR UPDATE') && sql.includes('coach_action_proposals'))
      await fx.User.update({ role: 'trainer' }, { where: { id: 42 } });
    return result;
  });
  expect((await fx.approve(input)).status).toBe(403);
  await assertRolledBack(input.id);
});

test('unexpected XP failure after commit preserves APPLIED and successful save', async () => {
  const input = await proposal();
  fx.xp.mockRejectedValueOnce(new Error('synthetic XP unavailable'));
  const result = await fx.approve(input);
  expect(result.status).toBe(200);
  expect((await state(input.id)).status).toBe('APPLIED');
  expect(await fx.Form.count()).toBe(1); expect(await fx.Log.count()).toBe(3);
  expect((await fx.User.findByPk(42)).availableSessions).toBe(1);
});

test('legacy/manual caller with no proposal hooks keeps its existing save contract', async () => {
  const result = await fx.writer({ ...APPROVAL_PAYLOAD.payload, trainerId: 7, userRole: 'admin', sequelize: db });
  expect(result.totalSets).toBe(3); expect(result.formId).toBeTruthy();
  expect(await fx.Form.count()).toBe(1);
  expect((await fx.User.findByPk(42)).availableSessions).toBe(1);
});

test.each(['rejected', 'lost_ack'])('COMMIT %s never publishes intake APPLIED or overwrites the durable outcome', async failure => {
  const input = await proposal();
  const intakeId = randomUUID();
  await fx.rawQuery(`INSERT INTO coach_intake_items
    (id,user_id,created_by_user_id,source_type,latest_proposal_id)
    VALUES (:intakeId,7,7,'typed_note',:proposalId)`, { replacements: { intakeId, proposalId: input.id } });
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    if (typeof sql === 'string' && sql.trim().toUpperCase() === 'COMMIT;') {
      if (failure === 'lost_ack') await fx.rawQuery(sql, opts);
      throw new Error('synthetic commit interruption');
    }
    return fx.rawQuery(sql, opts);
  });
  const result = await fx.approve(input);
  expect(result.status).toBe(503); expect(result.body.code).toBe('WORKOUT_COMMIT_UNKNOWN');
  expect((await state(input.id)).status).toBe(failure === 'rejected' ? 'PENDING' : 'APPLIED');
  expect(await fx.Form.count()).toBe(failure === 'rejected' ? 0 : 1);
  const [intake] = await fx.rawQuery('SELECT metadata_json FROM coach_intake_items WHERE id=:intakeId',
    { replacements: { intakeId }, type: QueryTypes.SELECT });
  expect(intake.metadata_json).not.toHaveProperty('latestProposal.status', 'APPLIED');
  const [count] = await fx.rawQuery('SELECT COUNT(*) AS n FROM coach_intake_events WHERE intake_item_id=:intakeId',
    { replacements: { intakeId }, type: QueryTypes.SELECT });
  expect(Number(count.n)).toBe(0);
});

test('revocation while approval waits on the client row is rechecked before writing', async () => {
  const input = await proposal();
  input.req.user = { id: 7, role: 'trainer' };
  await fx.Assignment.create({ trainerId: 7, clientId: 42, status: 'active' });
  const blocker = await db.transaction();
  // R2-14: the blocker is owned from the instant it exists, so a throw anywhere below cannot
  // leak it. `settled` stops the finally from rolling back a transaction we already committed.
  let settled = false;
  try {
    await fx.User.findByPk(42, { transaction: blocker, lock: blocker.LOCK.UPDATE });
    let entered;
    const enteredPromise = new Promise((resolve) => { entered = resolve; });
    const find = fx.User.findByPk.bind(fx.User);
    vi.spyOn(fx.User, 'findByPk').mockImplementation((id, opts) => {
      if (opts?.transaction && opts.transaction !== blocker) entered();
      return find(id, opts);
    });
    const approval = fx.approve(input);
    // R2-14: BOUNDED barrier. The old `await waiting` had no upper bound — if approval rejected
    // before ever reaching `findByPk`, that promise never settled, so the test hung until the
    // hook timeout and was reported as an infrastructure failure instead of as the assertion it
    // is. That matters here specifically: an approval that fails early is exactly what a
    // connection-budget regression looks like.
    let timer;
    try {
      await Promise.race([
        enteredPromise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('approval never reached the locked client row within 10s')),
            10000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    await fx.Assignment.update({ status: 'inactive' }, { where: { trainerId: 7, clientId: 42 } });
    await blocker.commit();
    settled = true;
    expect((await approval).status).toBe(403);
    await assertRolledBack(input.id);
  } finally {
    if (!settled) { try { await blocker.rollback(); } catch { /* already finished */ } }
  }
});

test('transactional access holds the assignment row against concurrent revocation', async () => {
  await fx.Assignment.create({ trainerId: 7, clientId: 42, status: 'active' });
  const { ensureClientAccess } = await import('../../utils/clientAccess.mjs');
  // R2-14: each transaction is owned the moment it exists. The old form acquired BOTH before
  // entering `try`, so failing to acquire the second leaked the first — and a sequential
  // `finally { await a.rollback(); await b.rollback(); }` skips the second if the first rejects.
  const txs = [];
  try {
    const writerTx = await db.transaction();
    txs.push(writerTx);
    const revokerTx = await db.transaction();
    txs.push(revokerTx);
    expect((await ensureClientAccess({ user: { id: 7, role: 'trainer' } }, 42, { transaction: writerTx })).allowed).toBe(true);
    await fx.rawQuery("SET LOCAL lock_timeout='100ms'", { transaction: revokerTx });
    await expect(fx.Assignment.update({ status: 'inactive' }, {
      where: { trainerId: 7, clientId: 42 }, transaction: revokerTx,
    })).rejects.toMatchObject({ original: { code: '55P03' } });
  } finally {
    // allSettled, not a sequential chain: one rejecting rollback must not skip the other.
    await Promise.allSettled(txs.map((tx) => tx.rollback()));
  }
});

````

### backend/tests/helpers/coachTestDatabase.mjs

_AMENDED in pass 5. This is where the timeout chain and the corrected R2-06/R2-07 measurement live. **§3 claim 12 is about the 30000 in this file.** Note the explicit "ENVIRONMENT ACCOMMODATION, not a root-cause fix" wording and the withdrawn R2-04 claim._

````js
/** Explicit disposable-Postgres connection. Never reads application .env/DB URLs.
 * Test runner supplies the port of its owned container; fixed loopback/test DB.
 */
import { Sequelize } from 'sequelize';
const port = Number(process.env.SWAN_COACH_TEST_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Set SWAN_COACH_TEST_PORT to the owned disposable container port');
const database = 'coach_test_20260906';
const sequelize = new Sequelize(database, 'coach_test_admin', '', {
  dialect: 'postgres', host: '127.0.0.1', port, logging: false,
  // ── THE TIMEOUT CHAIN — keep every link STRICTLY increasing ─────────────────────────────
  //
  //     connectionTimeoutMillis (30000)  <  acquire (45000)  <  hookTimeout/testTimeout (120000)
  //                                                                  ^ in vitest.coach-postgres.config.mjs
  //
  // Break the FIRST link (pool gives up before the connect layer) and the failure surfaces from a
  // `beforeAll` — which converts a file's tests into SKIPS rather than failures, and a skip-blind
  // summary reads that as a pass. Break the SECOND (a legitimate slow acquisition outlasts the hook)
  // and a result is reported as infrastructure rather than as a result. Both have happened here.
  //
  // This is an INTENDED BUDGET ALLOCATION for this harness — NOT a universal invariant, and NOT a
  // guarantee that the connect error wins. Counterexample (Astra R2-05): when every pooled
  // connection is checked out, an acquisition can wait WITHOUT starting a connection at all, so its
  // acquire timer can expire regardless of the connect budget; and a connect attempt that begins
  // only after queueing has a different clock origin. Both error classes are preserved and reported
  // distinctly; do not collapse them.
  pool: { max: 25, min: 0, acquire: 45000, idle: 1000 },
  //
  // WHY 30000 — AND WHAT THE ORIGINAL 3000, THEN 15000, RESTED ON. Corrected 2026-09-19 (R2-07)
  // and widened 2026-09-20 (pass 5).
  //
  // An earlier version of this comment said 3000ms "was below this platform's own p50". That is
  // ARITHMETICALLY FALSE for the measurement it cited: that probe reported p50 2864ms, and
  // 2864 < 3000, so the budget was ABOVE the median, not below it. The claim was backwards, and
  // it appeared in this file, in the config, and in the handoff document.
  //
  // The corrected statement, from `tmp/coach-remediation-20260913/probe-connect-latency.mjs`
  // after fixing three measurement defects (Astra R2-06: it timed connect+close together, pooled
  // failures with successes, and used wall-clock `Date.now()`):
  //   establishment-only, IDLE, synthetic 25-wide burst, n=125 successful connects:
  //     min 1851 / p50 3033 / p95 3797 / max 3823 ms — 69/125 (55.2%) exceeded 3000 ms.
  //   An earlier flawed run reported p50 2864 / 45-of-125. The two samples DISAGREE, so
  //   run-to-run variance is at least ±6% and the median sits within a few percent of 3000ms.
  // The defensible claim is therefore: **3000 ms sat AT the median, not comfortably above it, and
  // a MAJORITY of establishment samples exceeded it.** Not "below the median".
  //
  // WHY 15000 WAS NOT ENOUGH (pass 5, 2026-09-20) — an OBSERVED failure, not a precaution.
  // On the 7th full-cohort run of this session the suite failed with
  //   `SequelizeConnectionError: timeout expired` at 14501 ms (pg/lib/client.js:106)
  // in `coachWorkoutAtomic…`'s `COMMIT lost_ack` case, which is the test that deliberately KILLS a
  // connection mid-commit and therefore forces a cold replacement connect at the worst moment. Two
  // further tests in the same file then failed in 1 ms each, cascading from the broken pool state.
  // Observed rate: **1 failure in 7 full-cohort runs** (3 at 9 files in pass 4, 4 at 10 files in
  // pass 5). The failing file runs FIRST in the cohort, so this is NOT caused by any later suite;
  // and `coachWorkoutAtomic` alone passed 3/3 while `coachWorkoutPoolBudget` alone passed 3/3, so it
  // is intermittent rather than a deterministic break. `SHOW max_connections` = 100 with 2-3 client
  // backends in use, so this is connect LATENCY, not server-side exhaustion.
  // 30000 is ~8x the largest burst sample ever taken (3823 ms) and ~2x the observed outlier.
  //
  // HONESTY ABOUT WHAT THIS CHANGE IS. It is an ENVIRONMENT ACCOMMODATION. Widening a timeout
  // reduces the frequency of an environment-caused flake; it does not eliminate it, and it is not a
  // root-cause fix. The root cause is NOT proven to be environmental — it is merely CONSISTENT with
  // one, and the alternatives that were testable have been ruled out (see above). Treat a
  // recurrence as a live signal, not as noise.
  //
  // `--burst 25` is the pool's `max`, NOT an observed suite demand. That was a synthetic stress
  // measurement; the suites' own peak acquisition concurrency is still not measured, and no
  // workload-derived threshold has been computed. 30000 is chosen, not derived. (Pass 5 did measure
  // the APPROVAL path's peak on a tight pool — ≤ 2, asserted in
  // `coachWorkoutPoolBudget.postgres.test.mjs` — but that is a bound on ONE path, not a
  // workload-derived derivation for this harness.)
  //
  // WHAT RAISING THESE BUDGETS DOES **NOT** LICENCE. Corrected 2026-09-19 (Astra R2-04).
  // An earlier version claimed the connections "are the TESTS' OWN explicit db.transaction()
  // calls, not product code under test, so raising them cannot mask a product defect". That is
  // FALSE as written. The suites substitute THIS instance as the application database
  // (`coachWorkoutAtomic.postgres.test.mjs` mocks `database.mjs` to this module), and several cases
  // call the product entry points (`approve`, `writer`, `ensureClientAccess`) WITHOUT opening a test
  // transaction — so product code does acquire connections from this pool under these enlarged
  // budgets. A product path that needs a longer acquisition, retains connections, or opens too many
  // could therefore pass here and fail in production. The functional assertions remain valid; the
  // impossibility claim is withdrawn.
  //
  // CLOSED IN PASS 5 (2026-09-20). The two tests Astra asked for now EXIST and pass:
  // `tests/integration/coachWorkoutPoolBudget.postgres.test.mjs` drives the real approval path on a
  // pool of 2 whose tightness is asserted in-test, and proves (a) every connection is returned on
  // both the success and the failure path, (b) the path's peak concurrency is ≤ the pool size, and
  // (c) genuine exhaustion surfaces `SequelizeConnectionAcquireTimeoutError` in ~1513 ms with
  // nothing written. That is evidence replacing a withdrawal — still a bound on ONE path, not a
  // proof about the whole system.
  //
  // NOTE ON THE ASYMMETRY: raising `connectionTimeoutMillis` does not weaken the above, because a
  // LEAK or over-acquisition manifests as an ACQUIRE timeout, which is separately bounded and
  // asserted by that suite. The connect budget governs a slow handshake — an environment property,
  // not a product one.
  //
  // SAFETY LIMIT (Astra R2-11). A valid port plus a database name and login identifies a
  // CONNECTION TARGET; it does not prove the target's contents are disposable. The port check
  // below prevents pointing at the wrong *port* — it is NOT an attestation that the database is
  // safe to destroy. Treat the target as disposable by operator policy, not by enforcement.
  dialectOptions: { connectionTimeoutMillis: 30000 },
});
export default sequelize;

````

### backend/vitest.coach-postgres.config.mjs

_AMENDED in pass 5. The aggregate config: `testTimeout`/`hookTimeout` 120000 — the third link of the chain. **§3 claim 10 is about this file:** nothing in the tree ENFORCES the chain; it is prose in three places._

````js
/**
 * Vitest config for the Coach PostgreSQL persistence suites.
 *
 * WHY THIS FILE EXISTS (2026-09-19). These twelve suites were reported as
 * "blocked" for several sessions with the reason "the suites' config
 * expectations were not reconciled". Reconciling them found SIX IDENTIFIED
 * ISSUES — which is a count of what was found, NOT a proof that no seventh
 * exists, since two of the six were found only by re-executing work already
 * recorded green. None was a missing database server. Identifiers are stable so
 * the documents can cite them; `run-coach-postgres.mjs` carries the full list.
 * This config addresses PG-2.
 *
 *   1. `tests/helpers/coachTestDatabase.mjs:5-7` reads `SWAN_COACH_TEST_PORT`
 *      ONLY and throws without it. It never reads `PG_HOST`/`PG_PORT`, so
 *      "point them at the cluster with PG_*" (the previously recorded plan)
 *      could not have worked. (Found by Astra hostile review A1-09.)
 *   2. NO *AGGREGATE* CONFIG EXISTED — and the first draft of this docblock said
 *      "no config included the suites", which was WRONG and is corrected here.
 *      `tests/helpers/` already holds SEVEN per-suite configs, each
 *      `<suite>.postgres.config.mjs`, each including exactly one file:
 *      coachReadAuthorization, coachRuntimeEvidence, coachWorkoutAtomic,
 *      coachWorkoutDraft, coachWorkoutDraft.astraHostile, coachWorkoutIntent,
 *      coachWorkoutReadback. So the suites were NOT config-less. What was
 *      missing is that NOTHING referenced any of them — no npm script, no
 *      runner, no doc. Seven configs that no one can invoke are, for running
 *      purposes, zero configs — but "zero configs" was the wrong sentence, and
 *      a wrong sentence about state is how this repo has lost three sessions.
 *   3. `vitest.config.mjs` EXCLUDES `tests/integration/**`, and
 *      `vitest.integration.config.mjs`'s `include` lists only waiverConstraints
 *      + two plaud suites. A CLI `--exclude` does NOT fix this: vitest APPENDS
 *      it to the config's exclude list rather than replacing it, so
 *      `tests/integration/**` stays excluded. A dedicated aggregate config is
 *      the only clean way in.
 *   4. The twelve suites contaminated each other through one hardcoded database
 *      name. Fixed by `tests/helpers/resetCoachTestSchema.mjs`.
 *   5. Three of the twelve are `node:test` files, not vitest (PG-4) — and running them
 *      with `node --test` let them RACE each other, because `node --test` executes files
 *      concurrently and all three call the same migration `up()` (PG-5). An idempotent
 *      guard is not a race-safe guard. Fixed in the runner, not here.
 *   6. The connection budgets in the shared helper were tuned from a measurement that was
 *      itself wrong (PG-6). See `coachTestDatabase.mjs` — the two values are coupled and
 *      must not be changed independently.
 *
 * THE SEVEN PER-SUITE CONFIGS ARE PRESERVED AS HISTORY, NOT ENDORSED AS EQUIVALENT
 * ENTRY POINTS (revised per R2-10, Astra Review 2). They are pre-existing standalone
 * configurations that the aggregate tooling historically did not discover — which is a
 * statement about tooling coverage, not about the files being unreferenced; they ARE
 * invocable by explicit `--config`. What they are NOT is equivalent to this file: they
 * omit the per-file schema reset, so they do not isolate, and two of them omit
 * `envDir: false`. They are kept as diagnostic artifacts and as evidence of the earlier
 * per-suite approach. **The supported way to run ONE suite is the guarded runner's
 * single-file mode** (`node run-coach-postgres.mjs --file <suite>`), which applies the
 * same reset and the same cohort checks as a full run. Do not route new work through a
 * bare `--config` invocation.
 *
 * The suites are self-provisioning: each does `db.authenticate()`, defines and
 * `sync()`s its own tables in `beforeAll`, and `drop()`s them in `afterAll`.
 * They therefore need an EMPTY, disposable database and nothing else — no
 * migrations, no boot path, no application schema.
 *
 * Requirements to run:
 *   SWAN_COACH_TEST_PORT=<port>   (e.g. 55433 for the isolated trust-auth cluster)
 *   a database `coach_test_20260906` owned by a login role `coach_test_admin`
 *   (empty password; the isolated cluster uses trust auth, so none is needed)
 *
 *   SWAN_COACH_TEST_PORT=55433 npx vitest run --config vitest.coach-postgres.config.mjs
 *
 * DO NOT point this at anything but a disposable database: the suites `sync()`
 * and `drop()` tables by name, and `beforeEach` truncates with `cascade`.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `envDir: false` is adopted from the per-suite configs in tests/helpers/ — SIX of the seven
  // set it. Precisely: `coachWorkoutAtomic.postgres.config.mjs` does NOT, and an earlier draft of
  // this comment said "copied from the seven", which a hostile review correctly flagged as false.
  // Without it Vite loads `.env` from the project root into `import.meta.env`, dropping the
  // "no app env" guarantee those configs assert. There is no `.env` in the repo today (only
  // `.env.template`), so the difference is latent — which is exactly why it is stated here rather
  // than discovered after someone adds one. A latent isolation gap is still an isolation gap.
  //
  // This does NOT claim environment isolation for the omitted loader or for transitive imports:
  // only that Vite will not inject a project `.env`.
  envDir: false,
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/*.postgres.test.mjs'],
    // THREE of the twelve are `node:test` files, not vitest — running them here
    // reports "No test suite found in file", which reads like a defect and is
    // purely a runner mismatch. Measured 2026-09-19: 9 vitest + 3 node:test.
    //
    // R2-09 (Astra Review 2). An earlier draft of this comment told the reader to run
    // them directly:
    //     node --import ./tests/helpers/registerCoachTestDatabase.mjs --test \
    //       tests/integration/coachIntent*.postgres.test.mjs
    // That bypass was REMOVED. It omitted both the schema reset and
    // `--test-concurrency=1`, so it reintroduced the exact concurrency race the runner
    // exists to prevent (PG-5: `node --test` runs files concurrently and all three call
    // the same migration `up()`). Do not re-add a direct command here. The ONLY
    // supported way to run these three is `run-coach-postgres.mjs`, which resets the
    // schema before each file and runs them serially.
    exclude: [
      '**/node_modules/**',
      'tests/integration/coachIntent.postgres.test.mjs',
      'tests/integration/coachIntent.proof.postgres.test.mjs',
      'tests/integration/coachIntentListing.postgres.test.mjs',
    ],
    // Drop + recreate the `public` schema before EVERY file, so no file can observe
    // another's tables and the run is order-independent. See
    // tests/helpers/resetCoachTestSchema.mjs for the mechanism.
    //
    // HONESTY NOTE (2026-09-19). An earlier draft of this comment justified the reset
    // with "measured: 5 failures in a full run, all passing in isolation". That
    // measurement is NOT reproducible — no log of it survives anywhere in `tmp/`, and a
    // search for it returns nothing. It has been removed rather than left standing as
    // evidence. The reset is justified by the mechanism (a shared database name plus
    // per-file `CREATE TABLE IF NOT EXISTS` is a silent-no-op trap), not by that number.
    setupFiles: ['tests/helpers/resetCoachTestSchema.mjs'],
    // THE TIMEOUT CHAIN (pass 5). Must stay STRICTLY greater than the pool's `acquire` budget
    // (45000 in `tests/helpers/coachTestDatabase.mjs`) — and comfortably so, because the reset hook
    // issues TWO sequential queries, each of which can wait a full `acquire`. If a hook timeout
    // fires first, the real `SequelizeConnectionAcquireTimeoutError` is never seen and the whole
    // file's tests become SKIPS, which reads like a pass.
    testTimeout: 120000,
    hookTimeout: 120000,
    // No retries: these assert real transactional and constraint behaviour, and
    // a retry would mask exactly the flakiness they exist to detect.
    retry: 0,
    // Serial: the suites share one database name and truncate between cases, so
    // parallel files would race on each other's tables. `maxWorkers: 1` is belt-and-braces
    // on top of `fileParallelism: false`; it follows `coachRuntimeEvidence.postgres.config.mjs`,
    // which is the ONE of the seven per-suite configs that pins both maxWorkers and minWorkers.
    // An earlier draft said "matching the seven", which a hostile review correctly flagged.
    //
    // R2-02 LIMIT: these are PROCESS-LOCAL controls. They cannot stop a second runner — or a
    // concurrent agent — from dropping the same schema. That is handled by the database lease
    // in `run-coach-postgres.mjs`, not here.
    fileParallelism: false,
    maxWorkers: 1,
    reporters: ['verbose'],
  },
});

````

### backend/tests/helpers/resetCoachTestSchema.mjs

_AMENDED in pass 5. The per-file vitest reset, and the file whose documented coupling (hook must outlast `acquire`) was nearly broken by the pass-5 widening. Its docblock is also where the withdrawn R2-08 measurement is retracted._

````js
/**
 * Per-file schema reset for the VITEST Coach PostgreSQL suites.
 *
 * SCOPE (Astra R2-01). This is a vitest `setupFiles` module. It resets before every VITEST file
 * and nothing else. The three `node:test` suites get no such hook; they are reset by
 * `run-coach-postgres.mjs` invoking `resetCoachTestSchemaNow.mjs` before EACH of them. An earlier
 * version of the runner's docblock said "before every suite" and "order-independent by
 * construction" without that qualifier, which was true of this group only. Do not restate it
 * unqualified.
 *
 * WHY THIS EXISTS. All twelve `*.postgres.test.mjs` suites share ONE database name —
 * `coach_test_20260906`, hardcoded at `coachTestDatabase.mjs` — and each creates its own tables
 * in `beforeAll` and drops them in `afterAll`. That is not sufficient isolation: a suite whose
 * `CREATE TABLE IF NOT EXISTS` meets a differently-shaped leftover table from a previous file
 * gets a SILENT NO-OP, and any later `COMMENT ON COLUMN` or `ALTER` then references something
 * that was never created. That is the same silent-no-op class this repo has been bitten by
 * repeatedly, and it is a property of the mechanism, not of a sample.
 *
 * ON THE MEASUREMENT THAT USED TO BE HERE (Astra R2-08). An earlier version cited
 * "7 files passed, 5 failed (101 passed, 5 failed)" plus "`coachRuntimeEvidence` alone 27/27" as
 * the measured proof. **That measurement is WITHDRAWN.** No log of it survives anywhere in
 * `tmp/`; a search returns nothing; and it cannot be reproduced from a clean checkout. It was
 * cited in this file, in `run-coach-postgres.mjs` and in the handoff document as though it were
 * evidence. The reset is justified by the MECHANISM above, which stands on its own. The one
 * related datum that IS reproducible — the runner now reports 0 skipped and a fixed file cohort,
 * enforced in `run-coach-postgres.mjs` — is a current fact, not a historical one.
 *
 * The original runner shelled out to `work/reset-owned-coach-db.mjs` before every file. That
 * script does not exist in the repository, which is why the recorded "10 suites / 125 tests"
 * matrix result cannot be reproduced from a clean checkout. This file replaces it with something
 * that lives in the tree.
 *
 * MECHANISM. `setupFiles` run once per test file. Dropping and recreating the `public` schema
 * gives each file a genuinely empty database, so no file can observe another's tables. Combined
 * with `fileParallelism: false` and `maxWorkers: 1` in the config (files run one at a time, so
 * they cannot drop the schema under each other), this makes the VITEST group order-independent
 * within a single run. It does NOT protect against a second concurrent runner — that is handled
 * by the database lease in `run-coach-postgres.mjs` (Astra R2-02).
 *
 * SAFETY — AND ITS LIMIT (Astra R2-11). This drops the `public` schema. `coachTestDatabase.mjs`
 * refuses to load without `SWAN_COACH_TEST_PORT`, which prevents pointing at the wrong PORT. That
 * is a targeting check, NOT proof that the database's contents are disposable: a valid port plus
 * a database name and login identifies a connection target and says nothing about what is in it.
 * **Treat disposability as an operator obligation, not as something this file enforces.** Never
 * wire this to a database that holds anything you want to keep.
 */
import { beforeAll } from 'vitest';
import db from './coachTestDatabase.mjs';

beforeAll(async () => {
  await db.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await db.query('CREATE SCHEMA public;');
  // 120000, and the number is COUPLED — do not lower it without re-checking the chain in
  // `coachTestDatabase.mjs`. The full ordering must be strictly increasing:
  //     connectionTimeoutMillis (30000) < acquire (45000) < hookTimeout (120000)
  // This hook issues TWO sequential queries, each of which can wait a full `acquire`, so the hook
  // needs room for both. If the hook times out first, the real
  // `SequelizeConnectionAcquireTimeoutError` is never seen and the entire file's tests become
  // SKIPS — which reads like a pass. That is not hypothetical: it happened on 2026-09-19 when
  // `acquire` was still 10000 and the connect budget had just been raised to 15000.
}, 120000);

````

---

## SECTION 7 — THE NEW UNIT TESTS (verbatim)

These exist because the gates were extracted from a script that executes `main()` at import
time, and **a gate that cannot be tested is a gate that is only believed**. They include,
deliberately, **verbatim reproductions of the pre-pass-4 implementations** so that the
weaknesses F-1 and F-2 describe are **demonstrated by a failing test** rather than asserted in
prose. The tests named `RED:` are expected to FAIL against those old implementations — that is
the point of keeping them.

**Read the fixture provenance notes.** Each fixture is labelled **CAPTURED** (byte-checked
against real output with `od -c`) or **SYNTHETIC**. The distinction carries weight: the F-1
downgrade rests on a CAPTURED zero-test run, and the caller states plainly that a SYNTHETIC
empty-test shape is *not* what vitest actually prints. If the distinction is being used to make
a weakness look smaller than it is, that is a finding.

### backend/tests/unit/cohortChecks.test.mjs

_25 tests. Contains `checkVitestCohort_V1` — the SHIPPED pre-pass-4 gate — so the F-1 weakness is falsifiable rather than asserted._

````js
/**
 * cohortChecks.test.mjs — regression tests for the cohort gates.
 *
 * These gates decide whether a run that exited 0 is allowed to be called green, so they are the
 * last line of defence against exactly the failure this whole workstream exists to fix: a green
 * that is not a green. They were previously untestable (local consts inside a script that executes
 * `main()` at import). This file is the reason they were extracted.
 *
 * Fixtures marked CAPTURED are verbatim excerpts of real logs, byte-checked with `od -c`. Fixtures
 * marked SYNTHETIC exist to isolate a mechanism; they are labelled so nobody mistakes them for
 * evidence that the mechanism is reachable in a real run.
 */
import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  parseVitestTotals,
  checkVitestCohort,
  checkNodeCohort,
} from '../helpers/cohortChecks.mjs';

const ESC = '\u001b';

/** CAPTURED — `coach-pg-final-hardened-1.log` lines 263-264, od-verified ANSI bytes. */
const CAPTURED_FULL_RUN_ANSI =
  `${ESC}[2m Test Files ${ESC}[22m ${ESC}[1m${ESC}[32m9 passed${ESC}[39m${ESC}[22m${ESC}[90m (9)${ESC}[39m\n` +
  `${ESC}[2m       Tests ${ESC}[22m ${ESC}[1m${ESC}[32m124 passed${ESC}[39m${ESC}[22m${ESC}[90m (124)${ESC}[39m\n`;

/** CAPTURED — `coach-pg-file-mode.log`, single-file mode. */
const CAPTURED_FILE_MODE = ' Test Files  1 passed (1)\n      Tests  13 passed (13)\n';

/** CAPTURED — the F-1 probe (`gate-red-empty-file-raw.txt`), a file declaring zero tests. */
const CAPTURED_EMPTY_COHORT = ' Test Files  1 failed (1)\n      Tests  no tests\n';

/** SYNTHETIC — isolates the F-1 mechanism: a benign file line beside an empty test line. */
const SYNTHETIC_EMPTY_TESTS_BENIGN_FILES = ' Test Files  1 passed (1)\n      Tests  no tests\n';

/**
 * The SHIPPED implementation as it stood before pass 4, reproduced verbatim so the test can prove
 * the weakness existed rather than assert that it did. Do not "fix" this function.
 */
const checkVitestCohort_V1 = (raw, expectedFiles) => {
  const out = stripAnsi(raw);
  const bad = [];
  const files = out.match(/Test Files\s+(.+)/);
  const tests = out.match(/\n\s+Tests\s+(.+)/);
  if (!files || !tests) return ['could not find vitest totals — output shape changed'];
  const fileLine = files[1];
  const testLine = tests[1];
  if (!fileLine.includes(`${expectedFiles} passed (${expectedFiles})`)) {
    bad.push(`expected exactly ${expectedFiles} passing vitest file(s), got: ${fileLine.trim()}`);
  }
  for (const word of ['failed', 'skipped', 'todo', 'cancelled']) {
    if (fileLine.includes(word)) bad.push(`vitest file totals report "${word}": ${fileLine.trim()}`);
    if (testLine.includes(word)) bad.push(`vitest test totals report "${word}": ${testLine.trim()}`);
  }
  return bad;
};

describe('F-5 — the runner log must be greppable', () => {
  it('RED: the captured summary cannot be found by a plain text search', () => {
    // This is the defect that produced a false reading of a real evidence extraction in pass 4.
    expect(CAPTURED_FULL_RUN_ANSI.includes('passed (')).toBe(false);
  });

  it('GREEN: stripAnsi makes the same text findable', () => {
    const plain = stripAnsi(CAPTURED_FULL_RUN_ANSI);
    expect(plain.includes('passed (')).toBe(true);
    expect(plain).toContain('Test Files  9 passed (9)');
    expect(plain).toContain('Tests  124 passed (124)');
  });

  it('is idempotent and safe on plain text', () => {
    expect(stripAnsi(stripAnsi(CAPTURED_FULL_RUN_ANSI))).toBe(stripAnsi(CAPTURED_FULL_RUN_ANSI));
    expect(stripAnsi('ordinary text 12 passed (12)')).toBe('ordinary text 12 passed (12)');
  });
});

describe('parseVitestTotals', () => {
  it('parses a clean pass', () => {
    expect(parseVitestTotals('9 passed (9)')).toEqual({ counts: { passed: 9 }, total: 9, empty: false });
  });

  it('parses a mixed line', () => {
    const r = parseVitestTotals('1 failed | 8 passed (9)');
    expect(r.counts).toEqual({ failed: 1, passed: 8 });
    expect(r.total).toBe(9);
  });

  it('recognises the empty cohort', () => {
    expect(parseVitestTotals('no tests').empty).toBe(true);
    expect(parseVitestTotals('no tests').total).toBe(null);
  });
});

describe('checkVitestCohort — accepts the real captures', () => {
  it('accepts the captured full run (9 files / 124 tests)', () => {
    expect(checkVitestCohort(CAPTURED_FULL_RUN_ANSI, 9)).toEqual([]);
  });

  it('accepts the captured single-file run (1 file / 13 tests)', () => {
    expect(checkVitestCohort(CAPTURED_FILE_MODE, 1)).toEqual([]);
  });

  it('accepts a large noisy real-shaped input with surrounding output', () => {
    const noisy = `RUN v4.1.10\n\n ${ESC}[32m✓${ESC}[39m some test\n\n${CAPTURED_FULL_RUN_ANSI}\nstderr | later noise\n`;
    expect(checkVitestCohort(noisy, 9)).toEqual([]);
  });
});

describe('F-1 — the vitest gate must not depend on which words the reporter prints', () => {
  it('RED: the shipped V1 gate ACCEPTED a cohort that ran zero tests', () => {
    // SYNTHETIC input, deliberately chosen so the file line is benign. This proves the MECHANISM.
    // It does NOT prove reachability — see the next test, which measures that.
    expect(checkVitestCohort_V1(SYNTHETIC_EMPTY_TESTS_BENIGN_FILES, 1)).toEqual([]);
  });

  it('GREEN: the current gate REJECTS the same input', () => {
    const violations = checkVitestCohort(SYNTHETIC_EMPTY_TESTS_BENIGN_FILES, 1);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join(' | ')).toMatch(/no tests/);
  });

  it('MEASURED: the real zero-test capture is rejected by BOTH gates (reachability was blocked)', () => {
    // vitest v4.1.10 reports an empty suite as a FAILED FILE, so the V1 word check already caught it.
    // This is why F-1 was downgraded to hardening rather than reported as a live defect.
    expect(checkVitestCohort_V1(CAPTURED_EMPTY_COHORT, 1).join(' ')).toMatch(/failed/);
    expect(checkVitestCohort(CAPTURED_EMPTY_COHORT, 1).join(' ')).toMatch(/no tests/);
  });

  it('rejects a passed/total mismatch with no named failure category', () => {
    expect(checkVitestCohort(' Test Files  1 passed (1)\n      Tests  11 passed (12)\n', 1).join(' '))
      .toMatch(/does not equal total/);
  });
});

describe('R2-12 — the gate must reject every non-pass outcome', () => {
  it.each(['failed', 'skipped', 'todo'])('rejects %s in the test line', (word) => {
    const raw = ` Test Files  1 passed (1)\n      Tests  1 ${word} | 11 passed (12)\n`;
    expect(checkVitestCohort(raw, 1).join(' ')).toMatch(new RegExp(word));
  });

  it('rejects a wrong file count', () => {
    expect(checkVitestCohort(' Test Files  8 passed (8)\n      Tests  124 passed (124)\n', 9).join(' '))
      .toMatch(/expected exactly 9/);
  });

  it('rejects a changed output shape instead of passing silently', () => {
    expect(checkVitestCohort('everything is fine, trust me\n', 9))
      .toEqual(['could not find vitest totals — output shape changed']);
  });

  it('rejects a missing (n) total', () => {
    expect(checkVitestCohort(' Test Files  9 passed\n      Tests  124 passed (124)\n', 9).join(' '))
      .toMatch(/no \(n\) total/);
  });
});

describe('checkNodeCohort', () => {
  const tap = (tests, pass, fail, skipped, todo) =>
    `# tests ${tests}\n# pass ${pass}\n# fail ${fail}\n# skipped ${skipped}\n# todo ${todo}\n`;

  it('accepts the captured shape (8 pass / 0 fail / 0 skipped)', () => {
    expect(checkNodeCohort(tap(8, 8, 0, 0, 0))).toEqual([]);
  });

  it('rejects skips — the skip-blind summary failure mode', () => {
    expect(checkNodeCohort(tap(8, 8, 0, 1, 0)).join(' ')).toMatch(/1 skipped/);
  });

  it('rejects failures', () => {
    expect(checkNodeCohort(tap(8, 7, 1, 0, 0)).join(' ')).toMatch(/1 failure/);
  });

  it('rejects pass not equal to tests', () => {
    expect(checkNodeCohort(tap(8, 6, 0, 0, 0)).join(' ')).toMatch(/does not equal tests/);
  });

  it('rejects a cohort that ran zero tests', () => {
    expect(checkNodeCohort(tap(0, 0, 0, 0, 0)).join(' ')).toMatch(/zero tests/);
  });

  it('rejects unparseable TAP', () => {
    expect(checkNodeCohort('not tap output')).toEqual(['could not find node:test TAP totals']);
  });
});

````

### backend/tests/unit/coachDatabaseLease.test.mjs

_9 tests. Contains `closeLease_V1` — the SHIPPED pre-pass-4 release — plus a `FakeClient` whose release throws. This is where F-2 is proven._

````js
/**
 * coachDatabaseLease.test.mjs — regression tests for the database lease.
 *
 * The claim under test is F-2: a failed lease RELEASE must not be able to change the verdict of a
 * run. Before pass 4 that claim was false — `release` could reject, the caller awaited it inside a
 * `finally`, and the rejection therefore escaped `main()`, suppressed the SUMMARY, and turned an
 * all-passing run into an apparent crash. This file makes the claim executable instead of readable.
 *
 * The client is injected, so no database is required and the failure modes can be forced exactly.
 */
import { describe, it, expect } from 'vitest';
import { acquireLease, releaseLease, LOCK_KEY } from '../helpers/coachDatabaseLease.mjs';

/** Build a stand-in `pg.Client` class that records its calls and can be told to fail on demand. */
const makeClientClass = ({ got = true, failOn = null } = {}) =>
  class FakeClient {
    constructor(config) {
      this.config = config;
      this.calls = [];
    }
    async connect() {
      this.calls.push('connect');
      if (failOn === 'connect') throw new Error('connect boom');
    }
    async query(sql) {
      const isTry = sql.includes('try');
      this.calls.push(isTry ? 'try_lock' : 'unlock');
      if (failOn === 'unlock' && !isTry) throw new Error('unlock boom');
      if (isTry) return { rows: [{ got }] };
      return { rows: [] };
    }
    async end() {
      this.calls.push('end');
      if (failOn === 'end') throw new Error('end boom');
    }
  };

/** The SHIPPED implementation before pass 4, verbatim, so the test proves it rejected. */
const closeLease_V1 = async (client) => {
  if (!client) return;
  try {
    await client.query('SELECT pg_advisory_unlock($1::bigint)', [LOCK_KEY]);
  } finally {
    await client.end();
  }
};

describe('acquireLease', () => {
  it('returns the client and asks PostgreSQL for the lock', async () => {
    const Client = makeClientClass({ got: true });
    const client = await acquireLease(Client, { database: 'x' });
    expect(client).not.toBeNull();
    expect(client.calls).toEqual(['connect', 'try_lock']);
  });

  it('returns null AND closes the connection when another runner holds the lease', async () => {
    const Client = makeClientClass({ got: false });
    const client = await acquireLease(Client, { database: 'x' });
    expect(client).toBeNull();
  });

  it('propagates a connect failure — unreachable is not the same as refused', async () => {
    const Client = makeClientClass({ failOn: 'connect' });
    await expect(acquireLease(Client, { database: 'x' })).rejects.toThrow('connect boom');
  });
});

describe('F-2 — release must not be able to change the verdict', () => {
  it('RED: the shipped V1 release REJECTED when the connection had died', async () => {
    const client = new (makeClientClass({ failOn: 'unlock' }))({});
    await expect(closeLease_V1(client)).rejects.toThrow('unlock boom');
  });

  it('GREEN: releaseLease does NOT reject, and reports what happened', async () => {
    const client = new (makeClientClass({ failOn: 'unlock' }))({});
    const warnings = [];
    const outcome = await releaseLease(client, (m) => warnings.push(m));
    expect(outcome).toBe('released by session close');
    expect(warnings.join(' ')).toMatch(/unlock boom/);
    expect(warnings.join(' ')).toMatch(/does NOT affect the test verdict/);
  });

  it('does not reject when closing the connection throws', async () => {
    const client = new (makeClientClass({ failOn: 'end' }))({});
    const warnings = [];
    const outcome = await releaseLease(client, (m) => warnings.push(m));
    expect(outcome).toBe('released');
    expect(warnings.join(' ')).toMatch(/close failed/);
  });

  it('does not reject when BOTH the unlock and the close throw', async () => {
    const client = new (makeClientClass({ failOn: 'unlock' }))({});
    client.end = async () => {
      client.calls.push('end');
      throw new Error('end boom');
    };
    const warnings = [];
    await expect(releaseLease(client, (m) => warnings.push(m))).resolves.toBe('released by session close');
    expect(warnings.join(' ')).toMatch(/close failed/);
  });

  it('reports the happy path honestly', async () => {
    const client = new (makeClientClass())({});
    expect(await releaseLease(client, () => {})).toBe('released');
    expect(client.calls).toEqual(['unlock', 'end']);
  });

  it('handles a lease that was never acquired', async () => {
    expect(await releaseLease(null)).toBe('not acquired');
  });
});

````

### backend/tests/unit/nodeTestRunnerSeparation.test.mjs

_The pre-existing three-way lock on the runner/node separation, re-run because pass 4 ADDED unit files to the same tree. Included so you can check the new files did not quietly escape a guard that was written before they existed._

````js
/**
 * Runner-separation guard — node:test files and vitest must never see each other.
 * ============================================================================
 *
 * WHY. The Sheen Forge suite is written for node:test. Vitest loads such a file,
 * finds no vitest suites, and reports "No test suite found" — a FAIL. That put 15
 * perfectly green files (175 passing tests) into backend/tests/known-failing-baseline.json,
 * where they sat for weeks making the repo look sicker than it is and hiding real
 * failures behind a wall of fake ones.
 *
 * The fix is a three-way lock, and this test IS the lock:
 *   (a) every *.test.{js,mjs} under tests/ + __tests__/ that imports node:test must
 *       be listed in vitest.config.mjs's exclude — or vitest reds on it again;
 *   (b) every tests/**\/*.test.mjs entry in that exclude must actually BE a
 *       node:test file — so the exclude list cannot become a place to hide a
 *       broken vitest file;
 *   (c) the package.json "test:node" script must run exactly the node:test set —
 *       so excluding a file from vitest never silently removes it from CI.
 *
 * A new node:test file therefore fails HERE (with instructions), never as a
 * confusing "No test suite found" in an unrelated run.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..', '..');

function walkTestFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'integration') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walkTestFiles(full, out);
    else if (/\.test\.(js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * node-test-ONLY files declare themselves by importing node:test and never
 * mentioning vitest. Dual-runner files (they branch on VITEST at runtime and
 * self-adapt — e.g. deterministicCoachCommandIntent.test.mjs) are vitest-capable
 * and stay in the vitest suite. Read the whole file: the discriminating import
 * sits past any head, and the first version of this guard misclassified three
 * files by reading only the first lines.
 */
function isNodeTestOnlyFile(file) {
  const src = readFileSync(file, 'utf8');
  const importsNodeTest = /from\s+['"]node:test['"]|require\(\s*['"]node:test['"]\s*\)/.test(src);
  const vitestCapable = /['"]vitest['"]|VITEST/.test(src);
  return importsNodeTest && !vitestCapable;
}

function relPosix(file) {
  return path.relative(BACKEND, file).replace(/\\/g, '/');
}

const detected = [...walkTestFiles(path.join(BACKEND, 'tests')), ...walkTestFiles(path.join(BACKEND, '__tests__'))]
  .filter(isNodeTestOnlyFile)
  .map(relPosix)
  .sort();

const vitestConfigSrc = readFileSync(path.join(BACKEND, 'vitest.config.mjs'), 'utf8');
const excludeBlock = vitestConfigSrc.match(/exclude:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
const excludedTestFiles = [...excludeBlock.matchAll(/['"]((?:tests|__tests__)\/[^'"]*\.test\.mjs)['"]/g)]
  .map((m) => m[1])
  .sort();

const pkg = JSON.parse(readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
const testNodeScript = pkg.scripts?.['test:node'] ?? '';
const scriptFiles = [...testNodeScript.matchAll(/(?:tests|__tests__)\/\S+\.test\.mjs/g)]
  .map((m) => m[0])
  .sort();

describe('node:test / vitest runner separation', () => {
  it('every node:test file is excluded from vitest (or vitest reds on it as "No test suite found")', () => {
    const missing = detected.filter((f) => !excludedTestFiles.includes(f));
    expect(missing, `node:test files vitest would load: ${missing.join(', ')} — add them to vitest.config.mjs exclude AND the test:node script`).toEqual([]);
  });

  it('every vitest-excluded test file really is a node:test file — the exclude list is not a hiding place', () => {
    const notNodeTest = excludedTestFiles.filter((f) => !detected.includes(f));
    expect(notNodeTest, `excluded but NOT node:test files: ${notNodeTest.join(', ')} — a vitest file in the exclude list is a silently-skipped test`).toEqual([]);
  });

  it('the test:node script runs exactly the node:test set — exclusion from vitest never means exclusion from CI', () => {
    expect(scriptFiles).toEqual(detected);
  });

  it('the guard itself sees a sane world (non-empty set, script present)', () => {
    expect(detected.length).toBeGreaterThan(0);
    expect(testNodeScript).toContain('node --test');
  });
});

````

---

## SECTION 8 — THE FLAKE: THE EVIDENCE

The single most important artifact in this packet. A green that did not reproduce, four
alternatives ruled out by execution, and the before/after for the ANSI defect that was found
**by the caller being misled by its own logs**.

The pre-mitigation logs are in SECTION 10 and the mapping is exact:
`coach-pg-pass5-full`, `coach-pg-pass5-hardened-1`, `coach-pg-pass5-hardened-2` were GREEN at
35.49 / 35.72 / 35.92 s, and `coach-pg-pass5-hardened-3` FAILED at 49.42 s. Post-mitigation
`pass5b-run-1..5` were GREEN at 40.19–41.00 s.

**The question worth the call: is 1-in-7 consistent with a PRODUCT defect?** The trigger is the
`lost_ack` case, which deliberately kills a connection mid-commit. The caller ruled out every
alternative it could test and then labelled the mitigation an environment accommodation. Either
that is the correct disposition or it is a product bug wearing an environment costume.

### EVIDENCE-pass5-flake-and-close.txt

````
EVIDENCE — pass 5: R2-04 closed, and the intermittent flake
captured: 2026-09-20T04:37:28Z

=============== 1. THE FAILURE (pre-mitigation triple, run 3 of 3) ===============
 × tests/integration/coachWorkoutAtomic.postgres.test.mjs > COMMIT lost_ack never publishes intake APPLIED or overwrites the durable outcome 14501ms
 × tests/integration/coachWorkoutAtomic.postgres.test.mjs > revocation while approval waits on the client row is rechecked before writing 1ms
 × tests/integration/coachWorkoutAtomic.postgres.test.mjs > transactional access holds the assignment row against concurrent revocation 1ms
 Test Files  1 failed | 9 passed (10)
      Tests  3 failed | 128 passed (131)
  SequelizeConnectionError: timeout expired  (pg/lib/client.js:106)
  runs 1 and 2 of the same triple were GREEN — a single run would have recorded a false green.

=============== 2. ISOLATION — ruling out the new suite ===============
  pool-budget ALONE  run 1:  Tests 7 passed (7)
  pool-budget ALONE  run 2:  Tests 7 passed (7)
  pool-budget ALONE  run 3:  Tests 7 passed (7)
  atomic ALONE       run 1:  Tests 13 passed (13)
  atomic ALONE       run 2:  Tests 13 passed (13)
  atomic ALONE       run 3:  Tests 13 passed (13)
  cohort file order in the FAILING run (atomic runs FIRST, so a later file cannot be the cause):
    tests/integration/coachWorkoutAtomic.postgres.test.mjs
    tests/integration/coachWorkoutIntent.postgres.test.mjs
    tests/integration/coachWorkoutDraft.postgres.test.mjs

=============== 3. AFTER THE MITIGATION (chain 30000/45000/120000) ===============
  run 1   Tests 131 passed (131)  Duration  40.89s
  run 2   Tests 131 passed (131)  Duration  40.19s
  run 3   Tests 131 passed (131)  Duration  40.80s
  run 4   Tests 131 passed (131)  Duration  40.59s
  run 5   Tests 131 passed (131)  Duration  41.00s
  CAVEAT: at a ~1-in-7 base rate, 5 green runs do NOT prove the flake is gone.

=============== 4. THE EXACT ACQUISITION FAILURE (R2-04, measured) ===============
  SequelizeConnectionAcquireTimeoutError: Operation timeout | elapsed = 1513 ms
  (pool acquire configured 1500 ms — the pool's own timer, not an incidental fast error)

````

### F1-GATE-PROBE-RESULT.txt

````
F-1 PROBE — is the vitest cohort gate's weakness REACHABLE?
pass 4, captured 2026-09-20T04:07Z, vitest v4.1.10

HYPOTHESIS (mine, pass 4)
  `checkVitestCohort` never asserted that any test actually RAN. Unlike `checkNodeCohort`, which
  asserts `pass === tests` and `tests > 0`, the vitest gate only (a) matched a file count and
  (b) looked for the WORDS failed/skipped/todo/cancelled. A summary reading `Tests  no tests`
  contains none of those words, so a cohort that executed zero assertions might satisfy the gate.

PROBE
  A self-contained config + one file that imports vitest but declares no `it`/`test`.
  Raw capture: gate-red-empty-file-raw.txt

RAW OUTPUT (ANSI-stripped)

  ⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯
   FAIL  empty.test.mjs [ empty.test.mjs ]
  Error: No test found in suite empty.test.mjs
   FAIL  empty.test.mjs > declared but deliberately empty
  Error: No test found in suite declared but deliberately empty

   Test Files  1 failed (1)
        Tests  no tests

MEASUREMENT — the wording I predicted IS produced
  `Tests  no tests` is exactly what vitest prints, and the regex `/\n\s+Tests\s+(.+)/` does match
  it (capture: "no tests"), which contains no forbidden word.

MEASUREMENT — but the hypothesis is NOT reachable this way
  The FILE line is `1 failed (1)`. It contains the word `failed`, so the EXISTING gate already
  raises a violation from the file line. The empty-cohort case is caught, not missed.
  A second candidate path was considered and also fails to produce a hole: when the include glob
  matches nothing, the file line becomes `no tests`, which the existing file-count check rejects
  ("expected exactly 9 passing vitest file(s), got: no tests").

VERDICT — DOWNGRADED, not inflated
  F-1's MECHANISM is real: the vitest gate genuinely never asserts a nonzero test count, and it
  depends on vitest continuing to print a NAMED failure category. Its REACHABILITY was NOT
  DEMONSTRATED. It is therefore recorded as a HARDENING fix (symmetry with the node gate, and
  removal of the dependency on vitest's wording), NOT as a live defect.

  This is the same disposition the repo already applies to `ackCommit`'s unreachable mismatch
  branches: real mechanism, no demonstrated path, downgraded and said so.

RESIDUAL RISK, stated rather than closed
  The gate's correctness for the zero-test case currently rests on an implementation detail of
  vitest's reporter (that an empty suite is reported as a FAILED file). A future vitest that
  reports an empty suite as a passing file would silently reopen this. The hardening removes that
  dependency; it cannot prove no other wording change could.

````

### gate-red-empty-file-raw.txt

````

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90mC:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906/backend/gate-red-tmp[39m


[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Suites 2 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m empty.test.mjs[2m [ empty.test.mjs ][22m
[31m[1mError[22m: No test found in suite empty.test.mjs[39m
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯[22m[39m

[41m[1m FAIL [22m[49m empty.test.mjs[2m > [22mdeclared but deliberately empty
[31m[1mError[22m: No test found in suite declared but deliberately empty[39m
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[90m (1)[39m
[2m      Tests [22m [2mno tests[22m
[2m   Start at [22m 21:07:18
[2m   Duration [22m 408ms[2m (transform 13ms, setup 0ms, import 29ms, tests 2ms, environment 0ms)[22m


````

---

## SECTION 9 — THE CALLER'S OWN CLAIM LEDGER (verbatim)

`VERIFICATION-NOTES-REVIEW-2.md` §7 (pass 4) and §8 (pass 5), reproduced in full. **This is NOT
your work and is labelled as not-your-work throughout** — it is not a verdict and must never be
read as one. It is included so you can check its claims against the files rather than take its
word for them. Where it asserts something the files do not support, that is a finding.

Two things to read closely: §7.5 and §8.6 are the caller's own lists of what the passes did
**NOT** do. Those lists are the honest boundary of the claims, and a boundary drawn too
generously is itself a defect.

#### `VERIFICATION-NOTES-REVIEW-2.md` §7 and §8 (lines 301–546)

````markdown
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
trigger is the `lost_ack` case, which deliberately **kills a connection mid-commit** and therefore
forces a cold replacement connect at the worst possible moment — the same establishment cost the
probe measured at p50 3033 / max 3823 ms for a burst.

**Mitigation — the timeout chain widened, and a near-miss caught.** Raising `acquire` silently broke
an invariant documented in a *different* file: `resetCoachTestSchema.mjs` recorded that its hook must
outlast `acquire`, because a hook timeout converts a file's tests into **skips** rather than
failures — the R2-01/R2-03 class. That coupling was found only by grepping every file for the budget
numbers before committing to the change. The chain is now explicit and asserted across three files:

```
connectionTimeoutMillis (30000) < acquire (45000) < hookTimeout/testTimeout (120000)
```

Result: **5/5 green**, durations tightened to ~41 s.

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

- **No external review.** Astra has seen neither pass 4 nor pass 5. The commit gate is Fable's and
  remains **UNSPENT**.
- **No workload-derived threshold** (§4.3). `30000` is chosen, not derived; the measured peak is a
  bound on **one** path.
- **The flake is mitigated, not explained.** See §8.3.
- **The R2-04 tests bound one path, not the system.** They do not prove that no other product path
  leaks, that a different pool configuration is safe, or that `max: 2` resembles production.
- **Astra's `[UNKNOWN]` items** (`19/19` guard cohort, migration chain) remain **UNVERIFIED here**.
````

---

## SECTION 10 — THE RUN LOGS (line-selected, nothing reworded)

Every number quoted anywhere in this packet has its log here, in chronological order, and the
sequence IS the story: a green that held, a green that did NOT, a suite isolated to prove it was
not the cause, a mitigation, and the fresh re-execution performed while this packet was being
assembled.

**Disclosure on how these logs are presented.** They are NOT reproduced in full. Ten full logs
come to ~250 KB, most of it per-test `✓` lines, which would push this packet past the size at
which it risks being truncated — and a truncated packet loses its tail, which is where the
output contract lives. So each log is reduced by **line selection only**: whole lines are kept
or dropped, nothing is reworded, reordered, paraphrased or elided mid-line. Two transformations,
both disclosed:

1. **ANSI colour escapes are stripped.** Formatting only. (In the pass-4 logs this was ALSO a
   fix — see F-5. The pre-pass-4 logs had escapes inside the summary line, which is why
   `grep "passed ("` returned zero on them.)
2. **Lines are selected by a stated rule**, named under each heading as `Selection mode`.
   `full` = every line. `tailfrom` = from the first matching marker to the end. `green` = the
   totals and summary lines only.

The **full** logs remain on disk at
`C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/coach-remediation-20260913/`
beside the script that built this packet. **If you believe a selection has hidden something
material, say so and name the file** — that is a finding, and a fair one.

**A note on what the green runs do and do not license.** The post-mitigation block is five
consecutive greens, and the fresh block appended at the end is this session's re-execution.
At a ~1-in-7 base rate, five greens do **not** prove the flake is gone. The caller says so
itself; **check whether the packet anywhere contradicts that**, including in its own framing.

### coach-pg-pass4-hardened-1.log

_PASS 4, run 1 of 3. `9 passed (9)` / `124 passed (124)`, lease `release: released` (F-4: reported, not asserted), node:test 8+8+2 with zero skips._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 9 files · node:test files: 3
=== vitest suites ===
 Test Files  9 passed (9)
      Tests  124 passed (124)
   Start at  21:10:55
   Duration  35.27s (transform 1.35s, setup 2.27s, import 1.42s, tests 25.97s, environment 0ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4454.2983
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1116.5422
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1161.0108
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass4-hardened-2.log

_PASS 4, run 2 of 3. Identical._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 9 files · node:test files: 3
=== vitest suites ===
 Test Files  9 passed (9)
      Tests  124 passed (124)
   Start at  21:11:48
   Duration  34.31s (transform 1.31s, setup 2.26s, import 1.43s, tests 25.18s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4408.9877
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1163.2961
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1230.51
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass4-hardened-3.log

_PASS 4, run 3 of 3. Identical. **§3 claim 11 asks whether three greens is enough to support "did not regress" — note that the flake below appeared on the THIRD run of a later triple.**_

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 9 files · node:test files: 3
=== vitest suites ===
 Test Files  9 passed (9)
      Tests  124 passed (124)
   Start at  21:12:39
   Duration  33.40s (transform 1.33s, setup 2.25s, import 1.40s, tests 24.08s, environment 0ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4073.3344
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1093.1066
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1200.3755
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass4-file-mode.log

_PASS 4, single-file mode (R2-10). `SINGLE-FILE MODE: coachWorkoutAtomic…`, `1 passed (1)` / `13 passed (13)`, same lease and cohort checks as a full run._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
SINGLE-FILE MODE: coachWorkoutAtomic.postgres.test.mjs
=== coachWorkoutAtomic.postgres.test.mjs ===
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  21:13:29
   Duration  6.84s (transform 726ms, setup 288ms, import 68ms, tests 5.66s, environment 0ms)
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass5-full.log

_PASS 5, pre-mitigation run 1 of 4. `131 passed (131)` at **35.49 s** — this is the cohort that now includes the new pool-budget suite, so 10 files / 131 tests._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:21:31
   Duration  35.49s (transform 1.27s, setup 2.33s, import 1.42s, tests 25.95s, environment 0ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3858.8167
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1166.475
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1091.0456
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass5-hardened-1.log

_PASS 5, pre-mitigation run 2 of 4. `131 passed (131)` at **35.72 s**._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:22:28
   Duration  35.72s (transform 1.26s, setup 2.34s, import 1.36s, tests 26.20s, environment 0ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3947.7239
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1160.6652
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1118.0932
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass5-hardened-2.log

_PASS 5, pre-mitigation run 3 of 4. `131 passed (131)` at **35.92 s**._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:23:20
   Duration  35.92s (transform 1.30s, setup 2.35s, import 1.43s, tests 26.37s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3984.1287
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1073.8092
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1108.6759
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### coach-pg-pass5-hardened-3.log

_**PASS 5, pre-mitigation run 4 of 4 — THE FLAKE.** `1 failed | 9 passed (10)`, `3 failed | 128 passed (131)`, `SequelizeConnectionError: timeout expired` at 14501 ms, total 49.42 s. Shown from the failure block. **Three greens immediately before it, and it is the same tree.** This single log is why the caller does not claim the flake is fixed._

_Selection mode: `tailfrom`._

````
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/coachWorkoutAtomic.postgres.test.mjs > COMMIT lost_ack never publishes intake APPLIED or overwrites the durable outcome
 FAIL  tests/integration/coachWorkoutAtomic.postgres.test.mjs > revocation while approval waits on the client row is rechecked before writing
 FAIL  tests/integration/coachWorkoutAtomic.postgres.test.mjs > transactional access holds the assignment row against concurrent revocation
SequelizeConnectionError: timeout expired
 ❯ Client._connectionCallback node_modules/sequelize/src/dialects/postgres/connection-manager.js:200:19
 ❯ Client._handleErrorWhileConnecting node_modules/pg/lib/client.js:336:19
 ❯ Client._handleErrorEvent node_modules/pg/lib/client.js:346:19
 ❯ Socket.reportStreamError node_modules/pg/lib/connection.js:57:12

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { parent: { stack: 'Error: timeout expired\n    at Timeout._onTimeout (C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT\tmp\worktrees\swan-coach-astra-owned-20260906\backend\node_modules\pg\lib\client.js:106:28)\n    at listOnTimeout (node:internal/timers:585:17)\n    at processTimers (node:internal/timers:521:7)', message: 'timeout expired', constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, original: { stack: 'Error: timeout expired\n    at Timeout._onTimeout (C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT\tmp\worktrees\swan-coach-astra-owned-20260906\backend\node_modules\pg\lib\client.js:106:28)\n    at listOnTimeout (node:internal/timers:585:17)\n    at processTimers (node:internal/timers:521:7)', message: 'timeout expired', constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯


=== schema reset before coachIntent.postgres.test.mjs ===
[reset] public schema dropped and recreated

=== coachIntent.postgres.test.mjs ===
TAP version 13
# Subtest: v2 model and database expose the actual lifecycle proof fields
ok 1 - v2 model and database expose the actual lifecycle proof fields
  ---
  duration_ms: 540.2453
  type: 'test'
  ...
# Subtest: 20 simultaneous claims create one real database row
ok 2 - 20 simultaneous claims create one real database row
  ---
  duration_ms: 42.4855
  type: 'test'
  ...
# Subtest: rollback discards the receipt update and commit persists sanitized data
ok 3 - rollback discards the receipt update and commit persists sanitized data
  ---
  duration_ms: 14.6117
  type: 'test'
  ...
# Subtest: v2 cancel and execution race has one winner at the reviewed revision
ok 4 - v2 cancel and execution race has one winner at the reviewed revision
  ---
  duration_ms: 16.6729
  type: 'test'
  ...
# Subtest: v2 cannot commit without writer transaction or cancel after execution starts
ok 5 - v2 cannot commit without writer transaction or cancel after execution starts
  ---
  duration_ms: 13.2984
  type: 'test'
  ...
# Subtest: one proposal cannot acquire two durable intents under different request keys
ok 6 - one proposal cannot acquire two durable intents under different request keys
  ---
  duration_ms: 11.7603
  type: 'test'
  ...
# Subtest: 20 proposal aliases race to one binding and another actor cannot acquire it
ok 7 - 20 proposal aliases race to one binding and another actor cannot acquire it
  ---
  duration_ms: 61.8905
  type: 'test'
  ...
# Subtest: wrong actor, stale revision and expired approval cannot start or rewrite an intent
ok 8 - wrong actor, stale revision and expired approval cannot start or rewrite an intent
  ---
  duration_ms: 8.2702
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4350.2437

=== schema reset before coachIntent.proof.postgres.test.mjs ===
[reset] public schema dropped and recreated

=== coachIntent.proof.postgres.test.mjs ===
TAP version 13
# Subtest: unauthorized reconciliation reveals no row and never reads an effect
ok 1 - unauthorized reconciliation reveals no row and never reads an effect
  ---
  duration_ms: 609.6553
  type: 'test'
  ...
# Subtest: access revoked during readback blocks promotion and response disclosure
ok 2 - access revoked during readback blocks promotion and response disclosure
  ---
  duration_ms: 2.5176
  type: 'test'
  ...
# Subtest: concurrent receipt revision prevents stale promotion in the real SQL update
ok 3 - concurrent receipt revision prevents stale promotion in the real SQL update
  ---
  duration_ms: 6.3995
  type: 'test'
  ...
# Subtest: stored proof is required and a supplied observation cannot restore missing columns
ok 4 - stored proof is required and a supplied observation cannot restore missing columns
  ---
  duration_ms: 5.0374
  type: 'test'
  ...
# Subtest: readback outage preserves committed-unverified status and reports unavailable
ok 5 - readback outage preserves committed-unverified status and reports unavailable
  ---
  duration_ms: 2.233
  type: 'test'
  ...
# Subtest: matching durable proof promotes once and increments revision
ok 6 - matching durable proof promotes once and increments revision
  ---
  duration_ms: 4.0319
  type: 'test'
  ...
# Subtest: access revoked during successful SQL update prevents disclosure of the returned row
ok 7 - access revoked during successful SQL update prevents disclosure of the returned row
  ---
  duration_ms: 3.1216
  type: 'test'
  ...
# Subtest: read failure after another verifier wins returns the current durable revision
ok 8 - read failure after another verifier wins returns the current durable revision
  ---
  duration_ms: 3.0028
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1154.4387

=== schema reset before coachIntentListing.postgres.test.mjs ===
[reset] public schema dropped and recreated

=== coachIntentListing.postgres.test.mjs ===
TAP version 13
# Subtest: 500 denied rows return opaque continuation and the next page reaches older accessible rows
ok 1 - 500 denied rows return opaque continuation and the next page reaches older accessible rows
  ---
  duration_ms: 611.4883
  type: 'test'
  ...
# Subtest: real UUID tie ordering preserves every readable lookahead without duplicates
ok 2 - real UUID tie ordering preserves every readable lookahead without duplicates
  ---
  duration_ms: 23.4172
  type: 'test'
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1204.7404

=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    FAIL
node:test group: PASS

COHORT VIOLATIONS (4) — exit nonzero even if every process exited 0:
  - vitest: expected exactly 10 passing vitest file(s), got 9: 1 failed | 9 passed (10)
  - vitest: vitest passed (128) does not equal total (131): 3 failed | 128 passed (131)
  - vitest: vitest file totals report "failed": 1 failed | 9 passed (10)
  - vitest: vitest test totals report "failed": 3 failed | 128 passed (131)

````

### diag-pool-1.log

_ISOLATION 1/2 — `coachWorkoutPoolBudget` ALONE. `7 passed (7)`. Rules out the NEW suite as the cause. 3 of 3 runs identical._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
SINGLE-FILE MODE: coachWorkoutPoolBudget.postgres.test.mjs
=== coachWorkoutPoolBudget.postgres.test.mjs ===
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  21:25:51
   Duration  5.20s (transform 673ms, setup 274ms, import 82ms, tests 4.45s, environment 0ms)
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
cohort: all identities and zero-skip checks satisfied.
````

### diag-atomic-1.log

_ISOLATION 2/2 — `coachWorkoutAtomic` ALONE. `13 passed (13)`. Rules out a deterministic break in the failing file. 3 of 3 runs identical._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
SINGLE-FILE MODE: coachWorkoutAtomic.postgres.test.mjs
=== coachWorkoutAtomic.postgres.test.mjs ===
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  21:26:23
   Duration  6.30s (transform 679ms, setup 270ms, import 83ms, tests 5.13s, environment 0ms)
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass5b-run-1.log

_POST-MITIGATION run 1 of 5. `131 passed (131)` at 40.89 s — the widened chain (30000/45000/120000)._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:31:03
   Duration  40.89s (transform 1.46s, setup 2.51s, import 1.69s, tests 30.52s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4807.2055
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1179.5792
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1213.3416
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass5b-run-2.log

_POST-MITIGATION run 2 of 5. `131 passed (131)` at 40.19 s._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:32:04
   Duration  40.19s (transform 1.32s, setup 2.37s, import 1.45s, tests 30.61s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4114.5296
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1072.3322
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1184.1309
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass5b-run-3.log

_POST-MITIGATION run 3 of 5. `131 passed (131)` at 40.80 s._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:33:03
   Duration  40.80s (transform 1.30s, setup 2.38s, import 1.43s, tests 31.20s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4601.5837
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1150.2773
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1248.6724
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass5b-run-4.log

_POST-MITIGATION run 4 of 5. `131 passed (131)` at 40.59 s._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:34:03
   Duration  40.59s (transform 1.35s, setup 2.36s, import 1.42s, tests 30.92s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4885.7613
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1141.3891
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1327.7891
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass5b-run-5.log

_POST-MITIGATION run 5 of 5. `131 passed (131)` at 41.00 s. **Five greens against a 1-in-7 base rate is not a proof — §3 claim 9.**_

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:35:03
   Duration  41.00s (transform 1.29s, setup 2.34s, import 1.44s, tests 31.39s, environment 0ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4635.6773
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1067.1022
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1073.5906
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### lease-refusal.log

_R2-02 — the second runner is REFUSED. `EXIT=5`, "another guarded runner already holds the database lease". The limit is printed at the refusal site: a non-cooperating SQL client is NOT protected against._

_Selection mode: `full`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 9 files · node:test files: 3
REFUSED: another guarded runner already holds the database lease.
         Two runners would drop the same schema under each other. Wait, or use
         a different database. (An arbitrary SQL client is NOT protected against.)

````

### lease-holder.log

_R2-02 — the holder of the lease, run at the same time. `EXIT=0`, both groups PASS, cohort satisfied. The refusal is real, not merely mechanised._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 9 files · node:test files: 3
=== vitest suites ===
 Test Files  9 passed (9)
      Tests  124 passed (124)
   Start at  21:14:05
   Duration  35.01s (transform 1.38s, setup 2.25s, import 1.40s, tests 25.95s, environment 0ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4106.9791
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1137.9693
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1149.0258
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass6-run-1.log

_FRESH — re-executed while this packet was being assembled, on the exact tree you are reviewing. `131 passed (131)` at 40.32 s._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:39:17
   Duration  40.32s (transform 1.30s, setup 2.39s, import 1.44s, tests 30.65s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4535.0578
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1168.3626
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1189.2279
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass6-run-2.log

_FRESH — re-execution 2. `131 passed (131)` at 42.44 s._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:40:14
   Duration  42.44s (transform 1.30s, setup 2.42s, import 1.44s, tests 32.46s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4707.863
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1152.9081
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1115.6612
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

### pass6-run-3.log

_FRESH — re-execution 3. The third of this triple; compare with `coach-pg-pass5-hardened-3` above._

_Selection mode: `green`._

````
target 127.0.0.1:55433/coach_test_20260906
FULL RUN · vitest cohort expectation: 10 files · node:test files: 3
=== vitest suites ===
 Test Files  10 passed (10)
      Tests  131 passed (131)
   Start at  21:41:13
   Duration  44.42s (transform 1.46s, setup 2.87s, import 1.67s, tests 33.81s, environment 1ms)
=== schema reset before coachIntent.postgres.test.mjs ===
=== coachIntent.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4797.3893
=== schema reset before coachIntent.proof.postgres.test.mjs ===
=== coachIntent.proof.postgres.test.mjs ===
# tests 8
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1122.1262
=== schema reset before coachIntentListing.postgres.test.mjs ===
=== coachIntentListing.postgres.test.mjs ===
# tests 2
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1196.8599
=== SUMMARY ===
database lease:  held for the whole run · release: released
vitest group:    PASS
node:test group: PASS
cohort: all identities and zero-skip checks satisfied.
````

---

## SECTION 11 — THE GOVERNING SKILL (verbatim)

This is the full text of the `fable-blueprint-forge` skill that governs this call. It is
reproduced here so that you never need to look it up, and so that a run rooted in a tree that
does not contain `.claude/skills/` behaves identically to one that does. **Treat this as the
loaded skill. Do not stop to request it.**
````markdown
---
name: fable-blueprint-forge
description: Fable-as-architect, cheaper-AI-as-builder. When Sean wants a feature planned so completely that ANY competent builder AI (Codex, ChatGPT, Claude Sonnet, a fresh session with zero repo context) can build it exactly as Fable would — architecture docs, Mermaid flowcharts, sequence diagrams, ERDs, ASCII/HTML wireframes, file-by-file build order, exact signatures/paths/copy/tokens, "do NOT" bans, and executable per-slice acceptance criteria — then Fable reviews each built slice at the boundary. Kills vibe-coding: the plan makes every decision so the builder makes none. Distinct from fable-deep-sight (reads what EXISTS), grill-me (extracts intent), chromie (pressure-tests the bet) — this FORGES the build package. Use when Sean says "blueprint this", "forge the plan", "make it so another AI can build it", or /fable-blueprint-forge.
---

# Fable Blueprint Forge

## Role

Fable (or the strongest available Claude, per the Final Decider fallback chain) is the **architect**.
A cheaper/high-token AI is the **builder**. The builder will fill every gap in the plan with its own
judgment — and a weaker model fills gaps worse. So the Forge's job is to leave **no gaps that
matter**: every place a builder *could* choose, the plan chooses for it. The output is a
self-contained build package a builder with ZERO repo access or context can execute faithfully.

Three laws (the whole skill in one breath):
1. **Decision-dense, not just long.** Exact file paths, exact function signatures, exact API
   request/response shapes, exact copy strings, exact palette tokens, explicit "do NOT" bans.
2. **Executable acceptance criteria per slice.** Not "auth works" — "these N named tests pass;
   this exact curl returns this exact JSON; this viewport renders this wireframe."
3. **Fable checkpoints, not Fable absence.** Builder types; architect reviews every slice
   boundary. Review-a-diff costs a tiny fraction of write-the-code.

## Pipeline position

`grill-me` (intent) → `chromie` (if the bet is unproven) → **`fable-blueprint-forge`** (this skill:
plan package) → builder executes slice-by-slice → **Forge checkpoint** per slice → `closeout-evidence-lock`
+ rule 48 audit record at phase close. The Forge does NOT replace recursive planning (rule 15) — it
IS the maximal form of it.

## When To Use

- Sean wants a substantial feature/system planned by the best brain and built by a cheaper one
  (Codex worktree agent, ChatGPT/GPT-5.x, a fresh Claude session, a Workflow fleet).
- The builder will NOT have repo access, or will have limited context — the package must carry
  everything.
- Sean says "planned, not vibe-coded," "blueprint everything," "wireframes and mermaids," "build it
  exactly like Fable would."

## When NOT to use

- Small slices Claude/Codex can just build under normal rules (15/17/26) — the Forge overhead isn't
  worth it below ~a multi-day feature.
- Intent is still fuzzy → run `grill-me` first. Bet is unproven → `chromie` first. The Forge
  assumes the WHAT is decided; it forges the HOW.
- Auditing existing code → `fable-deep-sight`.

## Phase 1 — Repo Truth Harvest (architect side, before writing a word of plan)

The #1 way handoff plans fail: they cite files/routes/models that don't exist or have drifted.
Before forging, gather with file:line evidence:
- Canonical surfaces the feature touches (rule 26 receipt discipline; route mounts, mounted JSX).
- Real model columns from model files + drift check (rule 58) for every table touched.
- Existing patterns to copy (rule 18): one working in-repo example per pattern the builder will
  need (a styled-component card, a route+controller pair, a Victory chart, a test file shape).
- The mount points: exactly where new routes/components/nav entries plug in.
Paste the relevant excerpts INTO the package — the builder can't grep the repo.

## Phase 2 — Forge the Build Package

Write to `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<feature-slug>-<YYYY-MM-DD>/` as a small doc set
(one dir, numbered files, each ≤~300 lines so any builder can load them piecemeal):

1. `00-README.md` — what this is, build order, how to use the package, the Builder Contract (below).
2. `01-architecture.md` — system overview, component tree, data flow, **Mermaid**: `flowchart` for
   user/data flows, `sequenceDiagram` for every API interaction, `erDiagram` for schema (new +
   touched tables, exact column names/types), state diagrams where state machines exist.
3. `02-wireframes.md` — ASCII wireframes for every screen/state (desktop + 375px mobile), or an
   HTML mockup file per screen for visual surfaces. Every button, label, empty/loading/error state
   drawn. Exact copy strings. Exact palette tokens (`var(--token, #fallback)`).
4. `03-contracts.md` — every API endpoint: method, exact path, auth requirement, request JSON,
   response JSON (success + each error), status codes. Every exported function the builder must
   create: exact signature with types. Every model: full Sequelize definition text.
5. `04-build-order.md` — **file-by-file**: for each file — path, purpose, ≤300-line budget, what it
   imports, what it exports, which in-repo example to mimic (excerpt included), and the slice it
   belongs to. Ordered so every slice leaves the app bootable.
6. `05-slices.md` — the slice plan. Each slice: scope (files), the decisions already made,
   **executable acceptance criteria** (named test files + counts, exact curl + expected JSON,
   exact viewport checks), and STOP line: "do not proceed to slice N+1 until checkpoint passes."
7. `06-bans.md` — the "do NOT" list: house rules restated for a context-free builder (no MUI;
   styled-components only; Victory only; no hardcoded colors; 44px targets; dark-first; no
   yoga/meditation wording; zero PII to LLMs; ≤300 lines/file; `css` helper for shared style
   fragments; FKs reference `"Users"`; no `git add -A`; commit style `type(scope): desc`) PLUS
   feature-specific bans ("do NOT create a new route file for X, mount in Y", "do NOT touch Z").
8. `07-checkpoints.md` — the checkpoint protocol (Phase 3) and the review remit text to reuse.

**Decision-density self-test before calling the package done:** read each slice as a hostile
builder and list every choice you'd still have to make. Each one is either (a) decided in the
package now, or (b) explicitly delegated with bounds ("builder's choice, must satisfy X"). Zero
silent gaps. This is the Forge's rule-17 hostile pass.

**Privacy/secrets:** package is committed — IDs/roles only, no PII, no secrets, no env values
(rules 8/44). Run `bash scripts/scan-secrets.sh` over the package dir.

## Phase 3 — Builder Execution + Checkpoints

**Builder Contract (paste into 00-README.md and the builder's first prompt):**
> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
> results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output.

**Checkpoint (architect side, per slice):** diff review against the package — (1) every acceptance
criterion verified with real output; (2) drift scan: anything built that the package didn't specify,
anything specified that wasn't built, any ban violated; (3) verdict `PASS / REVISE (list) / HALT`.
Checkpoints may run on paid Fable (ask Sean first, rule 16 / free-first ladder) or the free
triangle / strongest local Claude when Sean prefers $0. Log verdicts in
`07-checkpoints.md` or the rule-67 review queue.

## Output Contract (chat, when the package is forged)

```text
BLUEPRINT FORGE: <feature> — PACKAGE READY
Location: docs/ai-workflow/AI-HANDOFF/BLUEPRINT-<slug>-<date>/
Slices: N · Files planned: N · Diagrams: N mermaid + N wireframes
Decision-density self-test: PASS (0 silent gaps / N delegated-with-bounds)
Secret scan: PASS
Builder target: <Codex worktree | ChatGPT | fresh Claude | workflow fleet>
First slice + its acceptance criteria: <one line>
Checkpoint plan: <who reviews, paid or free>
```

## Hard Rules

- Architect never skips Phase 1 — a plan citing unverified repo state is vibe-planning (rules
  26/58 apply to the PLAN, not just code).
- Paid Fable authorship/checkpoints are spend-gated: ask Sean first; offer the free ladder.
- The package must work for a builder with ZERO repo access — no "see CLAUDE.md", no "grep for
  X"; everything needed is IN the package.
- Builder deviations are never merged silently — REVISE or HALT, and drift found at checkpoint
  goes back to the builder, not patched by the architect (or the token economics invert).
- Rule 48 audit record still lands at phase close; the package + checkpoint log feed it directly.

````

---

## CLOSING

You now hold: the remit and the precise scope (§0), the working root and its four hazards (§1),
the disposition of your own 15 findings plus pass 4 and pass 5 (§2), twelve falsifiable claims
(§3), the house rules (§4), nine changed files (§6), the gate and lease tests with their
predecessors (§7), the flake evidence (§8), the caller's claim ledger (§9), every raw log (§10),
and the governing skill (§11).

**Emit PART A (hostile review of the pass-4 and pass-5 revision), PART B (the refreshed package),
PART C (decision-density self-test).**

Three closing constraints, restated because they are the ones most often violated in this repo:

1. **Do not restate this packet back to the operator.** Spend every token on findings and
   decisions. A summary of the packet is not a deliverable.
2. **Do not describe the product as working unless a mounted surface proves it.** If your package
   asserts a capability, it must name the mounted surface and the test that proves it is mounted.
   This workstream's single most expensive recurring failure is a completion claim that outran
   the mount.
3. **Where you could not verify something, write `[UNKNOWN]` and say what would settle it.** An
   honest gap is worth more here than a confident guess — this document exists because three
   passes of confident claims each needed a fourth pass to correct.
