# VERIFICATION-NOTES.md — READ THIS FIRST

**Package:** `BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19`
**Adjudicated:** 2026-09-19 · **Adjudicator:** the Codex/OpenCode seat that commissioned the call
**Reviewer:** `gpt-6-astra` via the ChatGPT subscription (Codex CLI transport)

> **What this package is: ARCHITECTURE AND INSTRUCTIONS, CONDITIONALLY.**
> Astra itself set the status to **FORGED — CONDITIONAL; IMPLEMENTATION ENTRY BLOCKED AT C0**.
> That status is correct and this document endorses it. The package is **not** implementation-ready
> for the slices whose contracts were not supplied. Treat `03-contracts.md` §C0 as a gate, not a
> formality.

---

## 0. Why this file exists

A hostile review is only worth what its **adjudication** is worth. The reviewer could not read this
repository, so every finding it returned is *conditional on the excerpts it was given*. Relaying
those findings to a builder as instructions is how a blueprint becomes fiction.

So: every A1 finding below was opened against the real source and given a verdict —
**CONFIRMED / PARTIALLY CONFIRMED / UNVERIFIED / REFUTED** — with `file:line` evidence.
**Nothing was relayed unverified.** Findings I could not check are marked UNVERIFIED and are
*not* to be treated as instructions.

**Headline result:** of the 20 A1 findings examined, **13 are CONFIRMED**, 2 are partially
confirmed, and 5 are UNVERIFIED. **None were refuted.** That is an unusually high hit rate, and two
of the confirmed findings are ones the commissioning session had missed entirely.

---

## 1. Run provenance

| | |
|---|---|
| Transport | `codex-cli`, `chatgpt-subscription`, `authMode=chatgpt_subscription` |
| Requested model | `gpt-6-astra` |
| **Served model** | **`null` — IDENTITY UNVERIFIED.** The runner records `servedModel: null`. The requested model is provable; the *served* identity is not. Do not report this as a verified Astra-Pro/Astra identity. |
| Marginal cost | $0 (subscription leg, not OpenRouter) |
| Wall | 648.5 s |
| Tokens | in 102,109 · out 21,167 |
| Packet | `CONSULT-PACKET.md`, 286,479 chars, SHA-256 `950379fea604f2c8b60c3aee68064b2883578f7eb3641004e5947d048d302e87` |
| Redaction | 19 matches removed before egress (`<PATH>`×7, `<REDACTED-ID>`×12) |
| Arming | `megaBlueprint=true`, armed by `remit` + `document`; dry-run proved `contract_headings_present=true` **and** `both_hostile_reviews_present=true` before spending |
| Splitter | `split-astra-blueprint.mjs --mega-blueprint`, exit 0, 12 files |

### 1.1 Dispatch 1 FAILED — and the failure is a harness defect, not a model defect

The first dispatch returned **741 output tokens in 53.9 s** and did no work. It refused:

> *"the mandatory `fable-blueprint-forge` skill was not found in the accessible skill locations.
> The additional search failed with Access is denied. My skill-loading instructions require stopping
> when an explicitly required skill is unavailable."*

**The model was right, and the caller was wrong.** The call was deliberately rooted at the git
worktree so the reviewer would read the branch's uncommitted code rather than `main` — and
`.claude/skills/` **exists in the main tree but not in the worktree** (it is untracked, so
`git worktree add` never materialises it). Three corrections were made, and all three are worth
keeping for the next consult:

1. **The governing `SKILL.md` is now INLINED** as `CONSULT-PACKET.md` SECTION 11, and the preamble
   states that it *is* the loaded skill and must not be looked up. This removes the tree dependency
   entirely.
2. **The read-only sandbox is now declared expected**, and the packet states the caller saves and
   files. The same reply had also stopped to report it could not write to `Z:\HostileReviews`.
3. **Repo exploration is now explicitly banned** — see §1.2. It was also stated *why* search is
   unavailable (the sandbox denies the transport's bundled `rg.exe`).

### 1.2 A measured cost lesson: the transport floor is ~35 k, and exploration triples it

| Run | Input tokens | Output tokens | Outcome |
|---|---|---|---|
| One-line probe (`"Reply with exactly: PROBE-OK"`) | **35,409** | 8 | transport floor |
| Dispatch 1 (packet, exploration not banned) | **417,085** | **741** | refused, no work |
| Dispatch 2 (same packet, exploration banned) | **102,109** | **21,167** | full package |

Subtracting the ~35 k floor and the packet leaves roughly **220 k tokens spent in dispatch 1 on the
agent exploring a repository it did not need**, while producing nothing. Dispatch 2 cost **a quarter
of the input and produced 28× the output.** The only substantive change was the instruction
*"Do not explore the repository."* The probe also showed Codex warning that
*"Skill descriptions were shortened to fit the skills context budget."*

---

## 2. Adjudication of PART A1 — review of the existing blueprints

### CONFIRMED — real defects, evidence reproduced

| ID | Verdict | Evidence I reproduced | Why it matters |
|---|---|---|---|
| **A1-05** | **CONFIRMED — CRITICAL** | `backend/migrations/*` edits + `SequelizeMeta` semantics | **The most important finding in the review.** Every repair in this workstream edited a **historical** migration. On any database where that migration is already recorded as applied, it **will never run again** — so the repaired columns and FKs are **not delivered to existing installations**. A green fresh-chain run proves the *repository* is self-consistent; it proves nothing about the *upgrade path*. This was not on the commissioning session's radar at all. |
| **A1-09** | **CONFIRMED — high value** | `backend/tests/helpers/coachTestDatabase.mjs:5,7,8,9` | The helper reads **`process.env.SWAN_COACH_TEST_PORT` only** and **throws** without it (`'Set SWAN_COACH_TEST_PORT to the owned disposable container port'`), and hardcodes database `coach_test_20260906` / user `coach_test_admin`. Docs 84/85 name a **different port (55441)** than the 55433 supplied. **This is the actual reason the Postgres-backed app suites stayed blocked** — the packet's claim that "supplying `PG_HOST`/`PG_PORT` is enough" is **wrong**, because the helper never reads them. |
| **A1-06** | CONFIRMED | `20260301000100-…cjs:129` `removeColumn('UserAchievements','userId')`; `:153` `dropTable('UserAchievements')` | `down()` drops the table unconditionally, and the up-path deletes rows. A "reversible, data-preserving" rollback claim is incompatible with this file. |
| **A1-07** | CONFIRMED | `20260325000001-…cjs:58-60` early `return` when the table exists; `:63` `createTable`; `:175,181,186` three `addIndex`; **no transaction anywhere** | Table creation and its three indexes are not atomic. If an index fails, a re-run sees the table, returns early, and the indexes are **permanently missing** with no error. |
| **A1-14** | CONFIRMED | `coachSelectionLifecycleTypes.ts:21-23` | The union is `'unadmitted' \| 'checking' \| 'ready' \| 'decision' \| 'invalid' \| 'denied' \| 'unavailable' \| 'blocked-return' \| 'committing' \| 'retired'`. **There is no `'settling'` member.** Any diagram treating `settling` as a phase is wrong. |
| **A1-04** | CONFIRMED | `88-…-HANDOFF.md:124` vs its own PART 11 | Line 124 asserts class (d) is *"Invisible to every static check and to guard-checking of any kind — only executing the chain finds it."* PART 11 of the **same document** then adds `migrationFkTypeCompat.test.mjs`, a static check that detects exactly this class. **The document contradicts itself.** |
| **A1-08** | CONFIRMED | `88-…-HANDOFF.md` §11.6 | It states *"36 'new' findings (26 missing tables, 9 missing columns)"*. **26 + 9 = 35.** An arithmetic error in my own handoff — small, but it is the kind of number a downstream agent would quote as fact. |
| **A1-01** | CONFIRMED | `swan-coach-universe-v3/README.md:6` vs `:166-209` | The 2026-09-13 banner says a fresh empty-DB migration *"still fails on missing legacy `orientations`"*, while the README's own 2026-09-17 REVISION 2 block records the chain completing at 218 tables / 381 migrations. **The README contradicts its own banner**, and the banner is the first thing a fresh agent reads. |
| **A1-02** | CONFIRMED | `88-…-HANDOFF.md` PART 6 + §11.8 | The handoff's open-items table still lists *"Class (d) sweep repo-wide — NOT DONE"*, and §11.8 names the raw-`ALTER TABLE` FK sweep as the recommended next step. **Both were completed** in the session that followed (raw form: 23 statements, 0 error-blind swallows, all 5 guarded sites verified landed). The queue is stale. |
| **A1-13** | CONFIRMED | `useCoachSelectionSettledAction.ts:71-86` | The comment explains the added dependency by claiming a re-run would use a **stale** closure. **That is not how React works** — an effect re-run uses the *current* render's closure, so the described failure cannot occur. The dependency is still correct to keep (it forces re-evaluation on epoch advance), but the *explanation* would mislead the next agent. |
| **A1-20** | CONFIRMED | `backend/services/coachFactService.mjs` = **543 lines** | Over the Rule-4 300-line cap. The doc-86 "scoped ≤300 compliance" claim does not cover it. |
| **A1-10** | CONFIRMED | `88-…-HANDOFF.md` PART 6 | The adoption hook exists but its settler wiring is deferred — re-running hook tests cannot close first-message completion. Matches the handoff's own open-items row. |
| **A1-17** | CONFIRMED | packet §2.3 / `03-contracts.md` §C0 | Exact memory route suffixes, response envelopes, auth mounts, helper signatures, transport arguments and test configs were **not** supplied. They cannot be reconstructed from filenames — which is precisely why the reviewer refused to invent them (see A2-02). |

### PARTIALLY CONFIRMED — right diagnosis, incomplete premise

| ID | Verdict | Adjudication |
|---|---|---|
| **A1-03** | PARTIALLY CONFIRMED | Astra is right that "earliest creator wins" is an **assumption**, not a proof: the analyzer picks the earliest declaration per column and does **not** verify that later declarations actually guard-and-skip. That is a genuine unproven premise. **But the limitation is already disclosed** — the test header says *"this is a heuristic source scan, not a SQL parser"* and names the raw-`ALTER TABLE` blind spot, and §11.1 records it. So the fix is to sharpen the wording to "heuristic candidate detector", not to add the disclosure. **Net: the caveat is valid and worth carrying; the finding overstates the omission.** |
| **A1-15** | PARTIALLY CONFIRMED | The guard-cohort count **is** inconsistent inside the packet: the README says **13/13** while the preamble says **19**. (7 `migrationGuardTableNames` + 6 `migrationFkTypeCompat` + 6 `modelTableGuard` = 19.) The 244-file / 1781-test union figure is consistent. The "18 configuration errors is not a passing typecheck" point is **correct and important** — a scoped run with errors is not a pass. |

### UNVERIFIED — recorded honestly, NOT to be treated as instructions

| ID | What it claims | Why I did not confirm it |
|---|---|---|
| **A1-11** | A new hypothesis: on a newly observed blocked key, render-phase capture populates `blockedOperationRef` and the passive `[blockedKey]` effect then clears it without synchronously replacing it — so a valid first **Discard** could be refused. | This is a **new hypothesis, not a re-report**, and testing it needs a real-router regression harness (first committed render → passive-effect flush → actor/operation change). **I did not build that harness.** Astra says the same. Treat as an open question, not a defect. |
| **A1-12** | `shouldBlock()` tests surface-ownership before `next.resolved`, so malformed input could bypass blocking. | The **code order is CONFIRMED** — `useCoachSelectionNavigationBlocker.ts:113` (`isSurfaceOwnedNavigation(next.targetUserId, next.threadId)`) runs **before** `:114` (`if (!next.resolved) return true;`). But whether it is **exploitable** depends on how the callback treats a null tuple, and **mounted reachability is UNVERIFIED** (Astra says so itself). Ordering hazard confirmed; exploitability unproven. |
| **A1-16** | Doc 85 wireframes omit exact 375px layouts and token mappings. | Requires a line-by-line pass over doc 85's wireframes against a viewport checklist. Not done. |
| **A1-18** | `CoachFact` says "rows are never deleted" while a hard-purge path exists. | Requires reconciling the model header, the purge columns and doc 84 §3. Not done. |
| **A1-19** | Static `claude.lane.md` / `codex.lane.md` instructions conflict with a current `node scripts/lane.mjs digest` protocol. | I did not verify that `scripts/lane.mjs` exists or what it does. **Plausible and worth checking** — but unverified, and the packet did quote Rule 67's lane-file protocol, so if the protocol changed the packet is what is stale. |

---

## 3. Adjudication of PART A2 — the self-review

Astra ran one hostile pass over **its own draft** before emitting it, and reported 10 corrections it
applied. The mechanism is verified: the emitted package **does** reflect them, which is the evidence
that the pass ran (the mandate says a self-review that changes nothing did not happen).

Spot-checked against the emitted files:

- **A2-02** (invented memory endpoints) → `03-contracts.md` §C0 now demands a source supplement and marks dependent tests **BLOCKED** rather than inventing routes. **Verified in the emitted file.**
- **A2-05** (`settling` as a real enum) → matches the confirmed union at `coachSelectionLifecycleTypes.ts:21-23`; the package now uses `committing` plus a conceptual substate. **Verified — and it agrees with the source.**
- **A2-10** (status inflation) → `00-README.md` carries **FORGED — CONDITIONAL; IMPLEMENTATION ENTRY BLOCKED AT C0**. **Verified.**
- **A2-04** (stopping a peer-owned cluster) → a real hazard given §A1-09's port confusion; the package now requires ownership checks. **Verified as present.**

A2-01 and A2-03 are the ones that matter most: **A2-01** is the self-review *finding* the same
upgrade-path gap that A1-05 raised, and **A2-03** correctly refuses to let the adoption deadline be
chosen independently of the existing transport.

---

## 4. What this review changed about the plan

Three things, in order of consequence:

1. **The upgrade path is now the top release gate, above any remaining code work.** A1-05 + A2-01
   mean "the migration chain runs clean" was answering the wrong question. The right question is
   *"what does an existing installation need to receive these repairs?"* — and the answer is a new
   **forward** migration, not an edit to history. **This is the single most valuable output of the
   call**, and it came from the reviewer, not from the commissioning session.
2. **The Postgres app suites have a named, concrete blocker** (A1-09) instead of "config
   expectations not reconciled". The suites need `SWAN_COACH_TEST_PORT` and a database/user named
   `coach_test_20260906` / `coach_test_admin` — not `PG_*`.
3. **The package is explicitly conditional.** `03-contracts.md` §C0 is a real gate. A builder must
   not start at C1.

---

## 5. Honest limits of this adjudication

- **The served model is unverified** (`servedModel: null`). The requested model is `gpt-6-astra`.
- **The reviewer had no repository access.** Its findings are conditional on the packet. Every one
  I could check against source held up, which is a point in its favour — but "I could not check it"
  is recorded as UNVERIFIED, not as agreement.
- **5 of 20 findings remain unverified** and are listed above as such. They are hypotheses to test,
  not work to schedule.
- **No test, build, render or database command was run by the reviewer**, and it says so. The
  historical results in the packet remain *packet-reported*, not independently reproduced by it.
- **`01-architecture.md` is 351 lines** — the splitter flagged it as over the ~300-line budget.
  A builder must split it before use.
- **Nothing was committed.** `main` is untouched.

---

## 6. Reading order for the builder

1. **This file.**
2. `00-README.md` — status, builder contract, and the C0 gate.
3. `05-slices.md` — **C0 first**; C1 is not startable until C0's supplement lands.
4. `03-contracts.md` §C0 — the missing inputs.
5. `06-bans.md`, then `07-checkpoints.md`.
6. `01-architecture.md` (split it), `02-wireframes.md`, `09-tests.md`, `04-build-order.md`.
7. `HOSTILE-REVIEW.md` and `08-decision-density-self-test.md` for the raw reasoning.
8. `CONSULT-PACKET.md` — the full evidence base, including the verbatim source excerpts.

---

## 7. Resolution log — what was FIXED after adjudication

A1-09 was not just recorded, it was **resolved**, and resolving it exposed three further
blockers that the review could not see. This is the payoff of adjudicating instead of relaying:
the finding was "the port is wrong", and the real answer was "there were four blockers and none of
them was the database server".

### 7.1 The blocker was four blockers

| # | Blocker | Evidence | Fix |
|---|---|---|---|
| 1 | The helper reads **`SWAN_COACH_TEST_PORT` only** and throws without it. `PG_HOST`/`PG_PORT` are never read — so the recorded plan ("point them at the cluster with `PG_*`") could not have worked. | `backend/tests/helpers/coachTestDatabase.mjs:5-7` | Set `SWAN_COACH_TEST_PORT`; created role `coach_test_admin` + database `coach_test_20260906`. |
| 2 | **No config includes these suites.** The default `vitest.config.mjs` *excludes* `tests/integration/**`; `vitest.integration.config.mjs` includes only waiverConstraints + two plaud suites. A CLI `--exclude` does **not** fix it — vitest *appends* it, so the config's exclude still wins (measured). | both configs | New `backend/vitest.coach-postgres.config.mjs`. |
| 3 | **The suites contaminated each other.** All twelve share one hardcoded database name and did not isolate. Measured: **101 passed / 5 failed** as a group, but `coachRuntimeEvidence` was **27/27 in isolation**. `coachReadAuthorization` failed with `column "bodyMapHeadPhoto" of relation "Users" does not exist` because an earlier suite had already created a differently-shaped `Users`, so the next file's `CREATE TABLE IF NOT EXISTS` was a silent no-op. | full-group run vs isolated run | New `tests/helpers/resetCoachTestSchema.mjs` — drops + recreates the `public` schema before each file, wired via `setupFiles`. |
| 4 | **Three of the twelve are `node:test` files, not vitest.** Running them under vitest reports `No test suite found in file`, which reads like a defect. | `coachIntent`, `coachIntent.proof`, `coachIntentListing` | Excluded from the vitest config and run via `node --test` through the DB-injecting loader. |

The original runner handled blocker 3 by shelling out to `work/reset-owned-coach-db.mjs` **before
every file** — and `work/` **does not exist in the repository**. That is why the recorded
"10 suites / 125 tests" matrix result cannot be reproduced from a clean checkout.

### 7.2 Result — measured, both runners, on a freshly recreated database

```
9 vitest suites    →  Test Files  9 passed (9)      Tests  124 passed (124)
3 node:test suites →  # tests 18   # pass 18   # fail 0
```

**142 tests · 0 failures · 12 of 12 suites green**, reproducible in one command:

```bash
SWAN_COACH_TEST_PORT=55433 node run-coach-postgres.mjs
```

New files: `backend/vitest.coach-postgres.config.mjs`,
`backend/tests/helpers/resetCoachTestSchema.mjs`, `backend/run-coach-postgres.mjs`.

**What this does and does not prove.** It proves the twelve Coach PostgreSQL persistence suites
pass against a **real** PostgreSQL, and that their earlier "blocked" status was environmental rather
than a code defect. It does **not** prove anything about the application schema: these suites are
self-provisioning — each syncs its own tables — so they exercise the *services*, not the migration
chain and not the boot path. It also does not touch A1-05: this is a **test** database, and a green
test suite says nothing about delivering repairs to an **installed** one.

**Still open after this fix:** A1-05 (forward migration — the critical one), A1-06, A1-07, A1-11,
A1-12, and the five UNVERIFIED findings.
