# CONSULT PACKET (REVIEW 2) — hostile review of the FIXES

**Prepared:** 2026-09-19 · **Operator:** Sean · **Repo:** SwanStudios (SS-PT)
**Purpose:** you previously returned 20 A1 findings on the S83 blueprints. **This call reviews the fixes made in response** — not the blueprints again.

> Read the arming mandate above as governing HOW to document. This preamble is the WHAT.

---

## SECTION 0 — REMIT

**Mega Blueprint**

You reviewed a set of blueprints and returned 20 A1 findings. The caller then **acted on them**. Your
job now is to **attack the fixes** — the code, the config, the helper, the documents, and above all
**the claims of verification**.

Be adversarial in a specific way. The failure mode that matters most here is **a fix that appears to
work and does not**: a test that passes because the harness was weakened, a reset that runs once
instead of per-file, a documented flag that does not exist, a green number that measures the wrong
thing. This repository has already been bitten by each of those:

- a migration declared fixed **twice** by two different agents that was still broken both times;
- a static guard test that was **permanently green** because its regex could never match;
- a control (`USE_BULLMQ_RECONCILIATION`) that was **documented but never existed**;
- a recorded test matrix that **cannot be reproduced** from a clean checkout.

**That last one happened again, here, in this workstream — twice in one week.** §2.4 is the confession.
Read §2.3 through §2.7 before anything else; they are why this packet exists in its current shape. The
first draft of THIS document contained a claim the caller subsequently falsified, and a recorded green
that did not survive re-execution. Both are disclosed rather than quietly edited.

Two constraints on your reply:

1. **Do not re-raise a finding you already made unless the fix failed.** If a fix is adequate, say so
   in one line and move on. A re-report is not a finding.
2. **Every finding needs a concrete fix**, and where you assert that a fix is inadequate you must
   name the specific mechanism that defeats it — not the general risk.

---

## SECTION 1 — WORKING ROOT

```
C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906
```

**Operational notes, and two of them are live hazards:**

- The sandbox is **read-only**; emit your package as reply text. The operator saves and files it.
- **Repo search is unavailable by design** (the sandbox denies the transport's `rg` binary). Do not
  try to explore the repository — everything you need is in this packet. Mark anything absent as
  UNVERIFIED rather than inventing it. Last time, exploring cost ~382,000 input tokens and produced
  no work.
- **This worktree has been PRUNED from git by a concurrent agent.** Its `.git` file still points at
  `.git/worktrees/swan-coach-astra-owned-20260906`, but that registry entry no longer exists, so
  `git status` and `git diff` **fail with `not a git repository: (NULL)`**. The **files are intact**;
  only git's view of them is gone. **Consequence for you: no diff is available, so every "before"
  state is given to you explicitly below. Do not assume you can recover a before/after yourself.**
  The branch `codex/swan-coach-astra-owned-20260906` still exists at `70547685c`.
- **Rule 56 disclosure — this is an UNMERGED branch.** Every file discussed below lives ONLY on
  `codex/swan-coach-astra-owned-20260906`. The main working tree has **no** `backend/tests/helpers/coachTestDatabase.mjs`
  and **no** `backend/tests/integration/*.postgres.test.mjs` at all — its `tests/integration/` holds
  four unrelated files (`aiFeatures`, `plaudApplaudSchemaDrift`, `plaudApplaudWebhookIntegration`,
  `waiverConstraints`). So "pre-existing" in this packet means **pre-existing on this unmerged
  branch**, never "pre-existing on `main`". Do not let the caller's language blur that.

---

## SECTION 2 — WHAT WAS CHANGED, AND WHY

### 2.1 Fixes to the documents (from your own A1 findings)

| Your finding | Fix applied | Exact change |
|---|---|---|
| **A1-01** — the README banner contradicted the README's own later block | `swan-coach-universe-v3/README.md` line 6 | The false sentence is **struck through with `~~…~~`**, followed by a **SUPERSEDED 2026-09-19** note recording the executed result. |
| **A1-04** — "invisible to every static check" contradicted PART 11 of the same document | `88-…-HANDOFF-20260917.md` line 124 | Replaced with: no static check *was looking for it*, and PART 11 added one afterwards. |
| **A1-08** — the arithmetic error | `88-…-HANDOFF-20260917.md` §11.6 | `36` → `35`, with the correction left **visible** rather than silently edited. |
| **A1-15** — the guard-cohort count had drifted | `swan-coach-universe-v3/README.md` | `13/13` → **`19/19`**, and the figure was then **proven by execution** (7 + 6 + 6). |
| **A1-09** — the Postgres suites' real blocker | `88-…-HANDOFF-20260917.md` PART 6 | The "STILL BLOCKED" row replaced with the resolved state and the full blocker list. |

### 2.2 The Postgres unblock — the substantive fix

**Your A1-09 was the trigger, and resolving it found SIX blockers in total.** The first draft of this
packet said "three", then "four". Both were wrong; the honest count is six.

| # | Blocker | Evidence | Fix |
|---|---|---|---|
| 1 | The helper reads **`SWAN_COACH_TEST_PORT` only** and throws without it; `PG_HOST`/`PG_PORT` are **never read** — so the previously recorded plan could not have worked | `backend/tests/helpers/coachTestDatabase.mjs:5-7` | Set the variable; created role `coach_test_admin` + database `coach_test_20260906` |
| 2 | **No *aggregate* config existed.** See §2.3 — the first draft said "no config included the suites", which was **false** | both obvious configs | **NEW** `backend/vitest.coach-postgres.config.mjs` |
| 3 | **The twelve suites contaminated each other.** All share one hardcoded database name and do not isolate | §2.4 | **NEW** `backend/tests/helpers/resetCoachTestSchema.mjs` — drops + recreates `public` before each file via `setupFiles` |
| 4 | **Three of the twelve are `node:test` files, not vitest** | `coachIntent`, `coachIntent.proof`, `coachIntentListing` | Excluded from the vitest config; run via `node --test` through the DB-injecting loader |
| 5 | **The connection budgets were below the platform's own median**, then were **inverted** | §2.5, §2.6 | `connectionTimeoutMillis` 3000 → **15000**; `pool.acquire` 10000 → **30000** (the two are coupled) |
| 6 | **The `node:test` group raced itself.** `node --test` runs files concurrently and all three call the same migration `up()` | §2.6 | `--test-concurrency=1`; plus a **NEW** `tests/helpers/resetCoachTestSchemaNow.mjs` so the group no longer inherits the vitest group's tables |

**NEW** `backend/run-coach-postgres.mjs` runs both runner groups behind one command, and is now
reachable as `npm run test:coach-postgres`.

### 2.3 Self-caught correction #1 — the claim "no config included the suites" was FALSE

The first draft of this packet asserted, in three files, that **no config included these suites**. On
re-inspection that sentence is wrong, and it is wrong in the direction that matters: it read as
thorough.

**`backend/tests/helpers/` already contains SEVEN per-suite configs**, each including exactly one file:

```
coachReadAuthorization.postgres.config.mjs      coachWorkoutDraft.postgres.config.mjs
coachRuntimeEvidence.postgres.config.mjs        coachWorkoutDraft.astraHostile.postgres.config.mjs
coachWorkoutAtomic.postgres.config.mjs          coachWorkoutIntent.postgres.config.mjs
coachWorkoutReadback.postgres.config.mjs
```

So the suites were **not** config-less. The accurate statement is:

- The seven per-suite configs exist, and **nothing references any of them** — no npm script, no
  runner, no doc. Verified by searching every `.mjs`/`.json`/`.md` under `backend/` for
  `postgres.config.mjs`: the only hits are the new files this session added.
- Neither obvious aggregate config reaches these files: `vitest.config.mjs` **excludes**
  `tests/integration/**`, and `vitest.integration.config.mjs`'s `include` lists three unrelated files.
- Therefore what was missing is an **aggregate** config, not configs as such.

Seven configs that nothing can invoke are, for running purposes, zero configs — but "zero configs" was
the wrong sentence. Corrected in `vitest.coach-postgres.config.mjs`, `run-coach-postgres.mjs`, and the
PART 6 row of the handoff doc.

**Attack this:** is the correction now *complete*, or does the same over-generalisation survive
somewhere else in those three files or in §2.2's table?

### 2.4 Self-caught correction #2 — **THE RECORDED GREEN DID NOT REPRODUCE**

**This is the headline finding of this review round, and the caller found it, not you.**

The previously recorded result — carried into the handoff document, into the new config's docblock,
and into the first draft of this packet — was:

> `9 vitest suites → Test Files 9 passed (9) · Tests 124 passed (124)`
> `3 node:test suites → 18/18`
> **142 tests · 0 failures · 12 of 12 suites green**

On re-execution **today, on an idle machine, with no other node process running**, that was false:

```
=== 9 vitest suites ===
 Test Files  1 failed | 8 passed (9)
      Tests  4 failed | 120 passed (124)
```

The four failures were all in **`coachWorkoutAtomic.postgres.test.mjs`**, all with
`SequelizeConnectionError: timeout expired` — infrastructure, not assertions. Three controls:

| Control | Result | What it rules out |
|---|---|---|
| `coachWorkoutAtomic` **alone**, aggregate config | `1 failed (1)` — same 3 tests | Cross-suite contamination |
| `coachWorkoutAtomic` **alone**, its **own** pre-existing per-suite config (`setupFiles: []`, no reset) | `1 failed (1)` — **same 3 tests** | That the caller's new config, reset, `envDir` or `maxWorkers` caused it |
| Same isolated command, **repeated** | same 3 tests again | Load-induced flakiness (no other node process was running) |

**And a negative result that must be stated:** the *older* recorded before-state — `5 failed | 101 passed | 18 skipped (124)` across `5 failed | 7 passed (12)` files, with `coachRuntimeEvidence` 27/27 alone — **has no surviving log anywhere in `tmp/`**; a search for it returns nothing. It is **UNREPRODUCIBLE AS RECORDED**, and this packet's earlier draft presented it as measured evidence. Today's RED was a *different* failure set with a *different* mechanism. **Treat the old "18 skipped" number as unsupported; do not build on it.**

### 2.5 The mechanism, quantified

The three failing tests hold a transaction open while opening **additional** connections. The shared
helper capped connection **establishment** at 3000 ms. So the caller measured whether 3000 ms is a
satisfiable budget on this platform at all — with `pg` directly, so that no shared file or test file
was touched:

```
ALL ROUNDS (idle machine): n=125  min=2001ms p50=2864ms p95=3824ms max=3850ms
connections exceeding the 3000ms budget the helper sets: 45
```

**The budget was below the platform's own median.** 45 of 125 connections exceeded it. PostgreSQL is
process-per-connection and the Windows postmaster spawns each backend via `CreateProcess` rather than
`fork(2)`, so a burst of simultaneous connects is inherently slow here.

### 2.6 Two iterations were needed, and the first one made things WORSE

**Iteration 1 — raise the connect budget only.** `connectionTimeoutMillis` 3000 → 15000, leaving
`pool.acquire` at 10000. This **inverted a race between two coupled budgets**: the pool now gave up
(10 s) *before* the connect layer did (15 s). The result was worse than the original defect — and it is
the single most instructive artifact in this packet:

```
FAIL  tests/integration/coachWorkoutReadback.postgres.test.mjs [ … ]
SequelizeConnectionAcquireTimeoutError: Operation timeout
 ❯ tests/helpers/resetCoachTestSchema.mjs:40:3
     40|   await db.query('DROP SCHEMA IF EXISTS public CASCADE;');
```

**The per-file reset itself could not get a connection, so its `beforeAll` threw, and all 15 tests in
that file became SKIPS — not failures.** `Test Files 1 failed | 8 passed (9)`, `Tests 109 passed | 15 skipped (124)`.
A file-level `FAIL` with zero failed tests and 15 skips reads like a pass in any summary that only
counts failures. **This is precisely the attack §3.4 and §3.5 exist to force, and it landed on the
caller's own fix.**

**Iteration 2 — couple the budgets and fix the runner race.**
- `pool.acquire` 10000 → **30000**, strictly greater than `connectionTimeoutMillis: 15000`, so the
  informative connect error always wins the race and the pool timeout can never mask it.
- `resetCoachTestSchema.mjs` hook timeout 30000 → **60000**, so a slow acquire reports as the real
  `SequelizeConnectionAcquireTimeoutError` rather than as a hook timeout.
- `--test-concurrency=1` on the `node:test` group. **Third, independent defect:** `node --test` runs
  test FILES concurrently by default. All three files share one database and all three call
  `migrations/20260904000000-create-coach-intents.cjs`'s `up()`. That migration *is* idempotent
  (`describeTable` → only `createTable` when absent) but **idempotent is not race-safe**: two processes
  can both observe "absent" and both create, and the loser dies with
  `SequelizeUniqueConstraintError` from `createTable`. Measured on consecutive aggregate runs:
  **18/18 pass, then 10/18 fail**, failures starting at the second file's `before` hook.
- **NEW** `tests/helpers/resetCoachTestSchemaNow.mjs` resets the schema before the `node:test` group,
  which previously inherited whatever the last vitest file left behind. Before this, the runner could
  only *warn* the operator to recreate the database by hand — a manual step in the middle of a
  recorded result, which is exactly how a result stops being reproducible.

### 2.7 The final state — and its honest strength

**Three consecutive aggregate runs, `exit 0` each:**

```
 Test Files  9 passed (9)
      Tests  124 passed (124)        ← and 0 skipped
# tests 18   # pass 18   # fail 0   # skipped 0
schema reset:   PASS      vitest group:   PASS      node:test group: PASS
```

**142 tests · 0 failures · 0 skips · 12 of 12 suites**, on a freshly recreated database, three times in
a row.

**Attack the strength of that claim.** Three consecutive green runs is *not* a proof of
order-independence, and this packet has just shown that a 3000 ms budget sat below the platform median
for an unknown length of time while the result was recorded as green. Ask: what run-to-run variance is
still unmeasured? Is 15000 ms justified, or merely large enough to be green? (Under aggregate load the
caller measured a maximum of **9072 ms**, so the headroom is only ~1.65x.) Should the value be
*derived* from a measurement of the suites' actual peak concurrency rather than chosen?

### 2.8 A self-identified phantom control, already fixed

The first draft of `run-coach-postgres.mjs` documented a `--reset` flag in its usage block and **the
script never read `argv`** — a documented-but-nonexistent control, the same class as the phantom
`USE_BULLMQ_RECONCILIATION`. It has been removed and the docblock now says why it is unnecessary.
**Confirm it is gone, and look for any other claim in these files that the code does not implement.**

### 2.9 What these fixes explicitly do NOT claim

The suites are **self-provisioning** — each `sync()`s its own tables in `beforeAll`. The caller
therefore claims the green proves the **services** pass and proves **nothing** about the migration
chain, the boot/schema-reconciliation path, or the **upgrade path for an already-installed database**.

**Attack that scoping too.** Is it correctly narrow, or too generous — i.e. does a green run here
license some claim the caller has not made? Note in particular that raising connection budgets is a
change to a **test helper**, and ask whether it can mask a *product-level* connection defect. The
caller's argument is that the connections in question are the tests' own explicit `db.transaction()`
calls, not product code — **check that argument against the failing tests, which are reproduced
verbatim in SECTION 8.**

---

## SECTION 3 — CLAIMS TO ATTACK (restated as assertions)

1. The per-file schema reset runs **before every file**, not once per run.
2. `fileParallelism: false` plus `maxWorkers: 1` is **sufficient** to stop files dropping the schema
   under each other.
3. The reset does not **mask** any real defect.
4. `124 passed` and `18/18` are genuine pass counts with **no newly-skipped** tests hiding in them.
   *(§2.6 shows this exact claim was false one iteration ago.)*
5. The six blockers were **all six** necessary — i.e. no seventh is waiting behind them.
6. Raising the two connection budgets **cannot mask a product defect** because the connections are the
   tests' own. (§2.9 — attack hardest.)
7. `15000` and `30000` are **justified** constants, not merely numbers large enough to be green.
8. `pool.acquire` **must** exceed `connectionTimeoutMillis` — i.e. the coupling is a real invariant and
   not a post-hoc rationalisation of two magic numbers.
9. `--test-concurrency=1` fixes the `node:test` race rather than merely hiding it.
10. The seven orphaned per-suite configs are now **correctly characterised** and are not a second
    source of truth.
11. The §2.3 correction is **complete** — no instance of the false claim survives.
12. `run-coach-postgres.mjs` contains **no other unimplemented claim**.
13. The scoping in §2.9 is **correct and sufficient**.
14. The document fixes are **accurate**, including that A1-01's struck-through sentence is the *only*
    false claim on that line.

---

## SECTION 4 — HOUSE RULES THAT BIND YOUR FIXES

- **Rule 4:** 300-line maximum per module. `run-coach-postgres.mjs` 115, `vitest.coach-postgres.config.mjs` 110,
  `resetCoachTestSchema.mjs` 48, `coachTestDatabase.mjs` 39, `resetCoachTestSchemaNow.mjs` 22.
- **Rule 56:** disclose union-vs-full-repo. §1 discloses that this is an unmerged branch. Do not
  present a scoped run as a full baseline.
- **Rule 58:** schema direction comes from `information_schema` evidence, never from memory.
- **Rule 67:** parallel AI agents share this tree. **This is live**: a concurrent agent pruned this
  worktree's git registration *during this session*. Do not instruct the operator to run git commands
  that could disturb other agents' work.
- **Rule 46:** builder → Gemini → Codex hostile review → **Fable = Final Decider and commit gate**.
  Your verdict is **advisory**, never the gate. Do not propose a commit or a push.
- **Never claim a criterion passed without pasting its output.** This packet follows that rule
  throughout, including where the output is unflattering.

---

## SECTION 5 — WHAT FOLLOWS

- **SECTION 6** — the four new or amended files, verbatim.
- **SECTION 7** — the two existing configs and all seven orphaned per-suite configs, verbatim.
- **SECTION 8** — the failing suite's setup, the four failing tests, and the probe, verbatim.
- **SECTION 9** — the exact document edits.
- **SECTION 10** — **the raw run logs, unedited, in chronological order**: the RED aggregate run, the
  two isolated RED controls, the iteration-1 log where 15 tests became SKIPS, and the three
  consecutive GREEN runs. Verbatim, because you should not have to take any number above on trust.
- **SECTION 11** — the governing skill, inlined.

**Emit PART A (hostile review of the fixes), PART B (the refreshed package), PART C
(decision-density self-test), per the output contract in the arming mandate.**
