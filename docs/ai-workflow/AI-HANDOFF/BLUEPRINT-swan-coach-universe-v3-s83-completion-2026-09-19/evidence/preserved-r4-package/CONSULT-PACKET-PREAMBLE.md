# CONSULT PACKET — Swan Coach Universe V3 / S83 completion
**Prepared:** 2026-09-19 · **Operator:** Sean · **Repo:** SwanStudios (SS-PT) · **Caller:** the Codex/OpenCode seat in the remediation worktree

> Read this packet as the source of truth for WHAT is being built. The arming mandate that
> precedes this remit governs HOW it must be documented.

---

## SECTION 0.5 — OPERATING CONDITIONS (read before anything else)

A previous dispatch of this exact packet **stopped before doing any work** and returned 741 tokens.
It stopped for three reasons, and all three are now fixed. Read them so you do not repeat the stop:

1. **THE GOVERNING SKILL IS INLINED IN THIS PACKET.** The previous run halted because it could not
   find `fable-blueprint-forge` on disk and its instructions require stopping when a required skill
   is unavailable. **You do not need to find it.** Its full `SKILL.md` is reproduced verbatim at
   **SECTION 11 — THE GOVERNING SKILL**. Treat that text as the loaded skill. Do not search for it,
   do not ask for its path, and do not stop for it.
2. **DO NOT EXPLORE THE REPOSITORY. THIS IS THE MOST IMPORTANT INSTRUCTION HERE.** The previous run
   spent roughly **382,000 input tokens against a 35,000-token baseline** exploring a repo it did
   not need to explore, and then produced no work. Repository search is also **unavailable to you** —
   the sandbox blocks the `rg` binary, so any search fails with "Access is denied". Everything you
   need is in this packet. **Read the packet. Do not read the repository. Do not list directories.
   Do not run shell commands.** If a fact you need is genuinely absent from this packet, say so in
   PART A as an UNVERIFIED gap — that is a correct, useful answer. Silence filled with a guess is not.
3. **THE SANDBOX IS READ-ONLY BY DESIGN, AND THAT IS NOT A BLOCKER.** You cannot save files, and you
   must not try. **Emit the entire package in your reply text.** The operator saves it and files the
   review; you are not responsible for filing anything, and you must not stop to report that you
   cannot write to `Z:\HostileReviews` or anywhere else. A read-only filesystem is the expected
   condition for this call.

**In short: no skill lookup, no repo exploration, no file writing, no archiving. Read the packet and
answer it.** Those four things are the only reasons the last attempt failed.

---

## SECTION 0 — REMIT

**Mega Blueprint**

You are being asked to do two things in ONE reply:

**(A) HOSTILE REVIEW** of the existing blueprints carried in this packet. They are REVIEW TARGETS,
not background reading. Several of them are known to have drifted from the code — at least one
carries a headline claim that is now false (see SECTION 3). Attack them: contradictions between
documents, diagrams that disagree with the real schema, slices whose acceptance criteria cannot be
executed, decisions stated but never enforced, bans that contradict the plan, and completion claims
that outrun the mounts. Every finding carries `file:line` or `doc#section` evidence **plus a
concrete fix**. A finding without a fix is not a finding.

**(B) FORGE THE BUILD PACKAGE** for the remaining work. The remaining work is NOT "invent a new
feature". It is: **finish the S83→S90 remediation to a releasable state, and close the open items
listed in SECTION 2.** The builder is a **fresh AI with ZERO repo context** — it cannot grep this
repo, cannot read `CLAUDE.md`, and will fill every gap you leave with its own judgment. Leave no gap
that matters.

The single most important constraint: **the product must not be described as working unless a
mounted surface proves it.** This workstream has a documented history of completion claims exceeding
mounted behaviour (doc 48, "capability truth"). Your package must not repeat that.

---

## SECTION 1 — WORKING ROOT AND CITATION CONVENTION

**Work with this root:**

```
C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906
```

Branch `codex/swan-coach-astra-owned-20260906`. **All remediation work is UNCOMMITTED in this
worktree. `main` is untouched and Render auto-deploys from `main`.**

Three conventions that matter:

1. **Paths in this packet are relative to the worktree root.** `backend/...` means
   `<root>/backend/...`.
2. **This repo has worktrees, and they differ.** The `main` tree and this worktree do NOT have the
   same file contents. A finding that is true of `main` can be false here, and vice versa. If you
   assert something about the code, say which tree you mean.
3. **Do not propose a commit or a push.** The commit gate is a separate reviewer (Rule 46: the Final
   Decider). Your output is architecture and instructions, not a release.

---

## SECTION 2 — STATE OF THE WORK, AS OF 2026-09-19

This section is the caller's own synthesis and is the fastest orientation. It is written to be
**falsifiable** — if you think it is wrong, say so in PART A with evidence.

### 2.1 Verified DONE (executed, not reasoned)

| # | Item | Evidence |
|---|---|---|
| 1 | **Empty-database migration chain now EXECUTES to completion.** | Isolated PostgreSQL 17, port 55433, trust auth, data under `%TEMP%\swan-verify-pg`. Full `sequelize-cli db:migrate` against a genuinely **0-table** UTF8 database: **exit 0, 218 tables, 381 migrations applied, 0 ERROR lines.** |
| 2 | **Nine defects repaired** — seven migration empty-chain guards that were permanent no-ops, plus a stale-capture re-arm and a dead-dialog trap in the data-router navigation blocker. | `backend/migrations/*` (see 2.4) + `frontend/.../hooks/useCoachSelectionSettledAction.ts`, `.../useCoachSelectionNavigationBlocker.ts` |
| 3 | **Defect sub-class (d) — unsatisfiable FK types — swept repo-wide, both forms.** | Sequelize `references:` form: 2 findings, 0 false positives (earliest-filename-wins authority rule). Raw `ALTER TABLE ... FOREIGN KEY` form: 23 statements, **0 error-blind swallows**, 5 guarded and all 5 verified to have actually landed (355 FKs total in the built database). |
| 4 | **A permanent static regression net exists** for the class. | `backend/tests/unit/migrationFkTypeCompat.test.mjs` (6 tests, both RED proofs captured) + `backend/tests/unit/migrationGuardTableNames.test.mjs` (7 tests) + `modelTableGuard` (6 tests) = **19 guard tests** |
| 5 | **Two downstream deferrals reclaimed** — they existed only because of the broken table. | `backend/utils/tableCreationOrder.mjs` gained `PainEntryCorrectiveExercises` (PHASE 14); `backend/utils/modelTableGuard.mjs` dropped its SWA-115 allowlist entry, so the table's absence now reports as NEW drift instead of info-level wallpaper. |

### 2.2 The class-(d) sweep in detail — because the two findings behaved differently

This is the highest-signal technical content in the session, and the honest handling of the second
finding is the point.

- **Finding A — REAL, load-bearing, repaired.**
  `UserAchievements.achievementId` was declared `UUID` while `Achievements.id` is `INTEGER`.
  Corroborated by three independent sources: the creating migration
  (`20260302050000-gamification-bootstrap.cjs:97`), `backend/models/Achievement.mjs` ("live DB
  verified 2026-08-03 … 1,067 live rows"), and `backend/models/UserAchievement.mjs` with commit
  `f8f17ddd5` ("verified against information_schema 2026-07-29 … both id columns are INTEGERS").
  **No migration anywhere ALTERs `UserAchievements.achievementId`**, and the `createTable` that
  declares it has **no try/catch** — so on any database where `Achievements` exists but
  `UserAchievements` does not, this migration **throws and halts the entire chain**.
  Repaired in `20260301000100-fix-user-achievement-userid-type.cjs` and, because that migration
  defers to it on a fresh chain, also in the authoritative creator
  `20260302050000-gamification-bootstrap.cjs`.

- **Finding C — REAL defect, but self-healed downstream ⇒ DOWNGRADED to hardening.**
  `bootcamp_exercises.exerciseLibraryId` was `INTEGER` pointing at `exercise_library.id` `UUID`,
  hidden behind an error-blind `.catch()` whose comment blamed "the exercise_library table doesn't
  exist". A **counterfactual run** (revert the fix, re-run the chain) produced the real reason:
  `foreign key constraint … cannot be implemented`. The comment was a **false explanation**. But
  `20260618000100-add-bootcamp-preview-media-fields.cjs` already ALTERs the column to `UUID` and
  re-points the FK to `Exercises` — so the schema was never actually broken. Verdict recorded as
  **hardening, not a repair**. The `.catch()` now takes `(err)` and logs the real message.

**The transferable lesson, and you should test it against the package you forge:** a guard being
*correct* does NOT make a migration *work*. One defect here was declared fixed **twice** by two
different agents and was still live both times. **Only executing the chain falsified it.** If your
package contains any verification step that reasons about a migration instead of running it, that
step is defective.

### 2.3 Open items — the actual scope of PART B

| Item | Status | Why it is open |
|---|---|---|
| **Postgres-backed *application* suites** | BLOCKED, but no longer for lack of a server | `*.postgres.test.mjs` (`coachMemoryPersistence`, `coachConsentPersistence`) and `evidence/remediation-20260913/run-owned-postgres-matrix.mjs` were never run against a real server. The isolated cluster (port 55433, user `swanverify`, trust auth) now exists — the blocker is the suites' own config expectations, not credentials. **Do not leave the cluster running.** |
| **Full-repo test baseline** | UNVERIFIED | Only a **244-file union** is verified (1781 tests PASS). Rule 56 requires disclosing this: the union is **not** the full repo. |
| **Rule 4 line-cap, repo-wide** | NOT RE-AUDITED | Doc 77 §D records that Rule 4 is violated by **786 tracked files** — the "six" in an earlier slice-local count was a Rule-56 baseline-disclosure failure. |
| **Whole-project `tsc --noEmit`** | UNRUNNABLE in this environment | OOM at 8 GB heap. Changed files were verified with a standalone scoped config instead. |
| **Fable 5.1 final decider gate** | UNSPENT | Rule 46: no commit may be made without it. Codex's verdict is advisory, never the gate. |
| **Production / live proof** | NONE | No deployment, no live smoke test. |
| **`adoptCreatedThread` settler wiring** | DEFERRED | The adoption hook is implemented (`useCoachCreatedThreadAdoption.ts`) but its settler wiring is the deferred piece. |
| **Doc 77 §F3's disposition choice** | PARTIALLY TAKEN, never formally adjudicated | See SECTION 3 — this is the item most likely to be mis-stated by a reviewer who reads the old docs. |

### 2.4 The files that carry the S83 remediation (for citation)

```
# Backend — migrations repaired
backend/migrations/20240115000000-update-orientation-model.cjs
backend/migrations/20250107000000-create-clients-pii.cjs                       (comment)
backend/migrations/20250201000000-create-trainer-availability.cjs              (comment)
backend/migrations/20260212000005-add-coaching-cues-to-exercises.cjs
backend/migrations/20260301000100-fix-user-achievement-userid-type.cjs
backend/migrations/20260302050000-gamification-bootstrap.cjs
backend/migrations/20260308-add-enhancement-credits.cjs
backend/migrations/20260308-add-gallery-visitor-user-link.cjs
backend/migrations/20260308-create-leads-tables.cjs
backend/migrations/20260325000001-create-pain-entry-corrective-exercises.cjs   (THREE passes; exerciseId INTEGER -> UUID)
backend/migrations/20260401000001-bootcamp-upgrade-phase0.cjs                  (downgraded finding; catch now logs)

# Backend — deferrals reclaimed
backend/utils/tableCreationOrder.mjs
backend/utils/modelTableGuard.mjs

# Backend — regression tests
backend/tests/unit/migrationGuardTableNames.test.mjs
backend/tests/unit/migrationFkTypeCompat.test.mjs

# Frontend — lifecycle hardening
frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionNavigationBlocker.ts
frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionSettledAction.ts
frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionNavigationBlocker.test.tsx
frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionSettledAction.epoch.test.tsx
```

---

## SECTION 3 — KNOWN-STALE CLAIMS (verify before you repeat any of these)

These are **live traps for a reviewer**. Each was true when written and is now misleading. Do not
report them as current findings, and do not "fix" the code to match them. If you disagree, argue it
in PART A with evidence — but do not simply repeat the stale text.

| Stale claim | Where | Why it is stale |
|---|---|---|
| "A fresh empty-database migration still fails on missing legacy `orientations`; no baseline schema was invented." | `swan-coach-universe-v3/README.md` line 6 (a 2026-09-13 banner) | **Falsified by execution on this worktree.** `20240115000000-update-orientation-model.cjs` now probes `information_schema` and, when `orientations` is absent, **creates the model-shape table before altering it**. A 0-table database now runs the full chain: exit 0 / 218 tables / 381 migrations. Note the README's own later section (the 2026-09-17 REVISION 2 block) **contradicts its own banner** — that internal contradiction is itself a legitimate A1 finding. |
| "The migration gate — RUN, and it FAILS at the first migration … zero of the 376 migrations apply to an empty database." | `77-open-findings-register.md` §F3 | **Dispositioned.** §F3 itself named two candidate dispositions: (a) declare a dump-baseline as a mandatory runbook step, or (b) add a genuine baseline so the chain is self-contained — calling (b) "the durable fix and a real slice". **Option (b) has been taken for the first blocker.** The migration count also moved 376 → 381. |
| "Rule 4 is violated by six tracked files." | slice-local counts | **Corrected by measurement in doc 77 itself**: the real repo-wide figure is **786 tracked files**. The six was a slice-local count presented as the repo's state. |
| `USE_BULLMQ_RECONCILIATION` as a live control | packets 69/70 | **The control does not exist.** Its *line references are real*; only its names are wrong. Corrected in doc 76. Do not re-raise the phantom control, and do not re-raise "the subject does not exist" either — that was also too strong. |
| HR16 was an auth-binding race; CA-0 was a live cross-client exposure | docs 71, 72 | **Both corrected in place.** HR16 was `React.StrictMode`'s dev double-invoke plus a latch; CA-0 is admin-gated with zero consumers (latent, not reachable). |
| "The clientAccess sweep found 69 hits." | doc 72 | **Not reproducible** — an independent re-derivation got 99 raw / 76 runtime. The count is pattern-dependent and should not have been stated as a fact. |

**Also do not re-raise, because they were ruled out with evidence:** see the "Verified as
NON-defects" ledger in the spine document (`88-…-HANDOFF-20260917.md`, PART 2C). Re-raising a
ruled-out item without new evidence is a review failure, not diligence.

---

## SECTION 4 — HOUSE RULES THAT BIND THE FORGED PACKAGE

Restated here because the builder will have zero repo context and these are non-negotiable in this
repo. Your PART B package must not violate any of them.

- **Rule 4:** **300-line maximum per module.** New files you plan must be sized under it, and a
  split must not be proposed purely to satisfy the number — an earlier deviation was justified with
  an unsupported rationale and corrected.
- **Rule 56:** always disclose the difference between a **union** of files and the **full repo**.
  Never present a scoped run as a full baseline.
- **Rule 58:** fix models toward the **live** schema, never toward whatever makes `sync()` happy.
  Decide schema direction from `information_schema` evidence, not from memory.
- **Rule 67:** parallel AI agents share this tree. Read
  `.ai-workflow/coordination/claude.lane.md` before editing; claim your own lane in
  `codex.lane.md`; **never `git add -A`** while another agent holds locks.
- **Rule 46:** the review chain is builder → Gemini → Codex hostile review (mandatory input) →
  **Fable = Final Decider and commit gate.** Codex's verdict is advisory, never the gate.
- **Frontend bans:** no MUI; `styled-components` only; Victory for charts; no hardcoded colors
  (use theme tokens, dark-first); 44px minimum touch targets; no yoga/meditation wording; no
  hardcoded palette values.
- **Backend bans:** no new generic SQL executor and no arbitrary tool executor; foreign keys
  reference the canonical `"Users"` table; no PII to LLMs; existing
  `coach_action_proposals` remains the reviewed domain-write authority, and an intent ledger
  coordinates execution but **cannot approve a workout or bypass the proposal service**.
- **Process bans:** never commit or push without Sean's explicit approval (`main` auto-deploys);
  never claim a criterion passed without pasting its output.

---

## SECTION 5 — WHAT FOLLOWS

1. **SECTION 6 — the spine document** (`88-…-HANDOFF-20260917.md`): the current continuation
   contract. It contains the defect ledger, the non-defect ledger, the architecture of every
   touched surface, the open/blocked table, and the exact resume commands.
2. **SECTION 7 — the slice blueprints** (docs 83, 84, 85, 86): the plan packages for the S83
   remediation, persistence/completion, rest-adjust/mobile, and lifecycle maintainability.
3. **SECTION 8 — the package index** (`README.md`), including its stale banner.
4. **SECTION 9 — G0 SOURCE EXCERPTS**: verbatim code, so your forged package can cite real
   signatures, real column types, and real test shapes instead of plausible ones. **You cannot grep
   this repo.** If a fact you need is not in the excerpts, say so and mark it UNVERIFIED rather than
   inventing it.
5. **SECTION 10 — CLOSING**, and **SECTION 11 — THE GOVERNING SKILL** (`fable-blueprint-forge`,
   reproduced verbatim so you never need to look it up).

**Your output is PART A (hostile review) + PART B (the forged package) + PART C (the
decision-density self-test), per the output contract in the arming mandate.**
