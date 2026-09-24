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
