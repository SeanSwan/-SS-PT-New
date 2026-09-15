---
decision: Executable handoff for Qwen 3.8 — build a synthetic seed for the CI shadow database so the migration gate can catch destructive and data migrations, then run a 4-seat hostile panel and apply its fixes.
status: open
supersedes: none
---

# HANDOFF — synthetic shadow-database seed (for Qwen 3.8)

**You are the builder.** This document is self-contained: everything you need is here. Do not ask follow-up questions — where a decision was genuinely open it has already been made below, and where something is unknown that is stated explicitly so you can work around it.

**Read this whole document before writing a line of code.** Section 9 exists because a previous agent on this exact codebase repeatedly shipped things that looked correct and did nothing.

---

## 1. The one-sentence job

The CI migration gate runs migrations against an **empty** database, so a migration that deletes a column or rewrites data passes it and then damages production. **Put realistic rows in that database before the migrations run.**

---

## 2. Why this matters (read it, don't skim it)

`render.yaml` deploys `main` and builds with `npm run migrate:production`. Every push to main runs migrations against the production database.

PR #68 added `.github/workflows/migration-shadow-check.yml`, which runs the pushed commit's migrations against a throwaway Postgres container in CI. That catches "does this migration run at all."

It cannot catch anything else, and a five-model panel said so in almost identical words:

> **GLM 5.3:** *"The green check is a multiplier, not a floor — it substitutes for reviewer scrutiny with a signal that certifies 'syntactically applies to void.'"*

> **Grok 4.6:** *"A destructive migration — `removeColumn`, `dropTable`, `changeColumn`, or any `DELETE`/`UPDATE` data migration — goes green on the empty shadow DB, twice, idempotently. Someone merges. Production data is gone. `SequelizeMeta` says success. App boots. Nobody is paged."*

`removeColumn` on an empty table is indistinguishable from `removeColumn` on 40,000 client records. **Your job is to make those two things distinguishable.**

---

## 3. Decisions already made — do not revisit these

| Question | Decision | Why |
|---|---|---|
| Real production data in CI? | **NO. Never.** | This app holds payment and biometric data. Production PII must never enter a GitHub Actions container. If you find yourself writing code that connects to a production database, you have gone wrong. |
| Sanitised production snapshot? | **Not now.** | Needs a scrubber that must be perfect; a scrubber with a gap is a client-data leak. Deferred deliberately. |
| Synthetic generated rows? | **YES. This is the job.** | Zero privacy surface, catches most of the gap. |
| Hand-write a seed per table? | **NO.** | There are **217 models**. A hand-written seed would be wrong before it was finished. **Derive it from the models.** |
| Where does the seed run? | **CI only**, inside the shadow-check workflow, against the throwaway container. | |

---

## 4. Ground truth — verified 2026-08-23, do not re-derive

- Base branch: **`main`**. Work from a fresh branch off `origin/main`.
- **217** model files in `backend/models/*.mjs`
- **373** migration files in `backend/migrations/`
- Existing CI job: `.github/workflows/migration-shadow-check.yml` (from PR #68 — **may not be merged yet**; if absent on main, base your work on the PR #68 branch `claude/swa200-migration-rails-20260823`)
- The shadow container in that workflow uses user/password/database all named `shadow` on `localhost:5432`
- Existing seeders live in `backend/seeders/` — **read one for style, do not extend them.** They are for dev/demo data, not this.
- `scripts/schema-snapshot.mjs` **exists only on a stale branch, not on `main`.** Do not depend on it.
- `pg` is a real backend dependency (`^8.13.3`). `sequelize` is available in `backend/`.

### The trap that has already caused one silent-corruption incident

Postgres folds unquoted identifiers to lower case.

- The canonical users table is **`"Users"`** — quoted, capital U.
- A bare `users` table **also exists in production** and is a stale duplicate.
- `REFERENCES Users(id)` resolves to `users` — **the wrong table**, silently.
- Always write `REFERENCES "Users"(id)`.
- `"Users".id` is **INTEGER**, not UUID.

If your seed writes to `users` instead of `"Users"`, it will appear to work and prove nothing.

---

## 5. What to build

### 5.1 `backend/scripts/seed-shadow-db.mjs`

A script that fills an **empty** database with synthetic rows derived from the Sequelize models.

**Required behaviour:**

1. **Refuse to run against anything but a shadow database.** First thing in the file, before any connection:
   - Require `process.env.DATABASE_URL` to match `/localhost|127\.0\.0\.1/`
   - Require it to contain the word `shadow`
   - If either fails: print a loud error and `process.exit(1)`. **No environment variable may override this.** A seeder that can point at production is worse than no seeder.

2. **Load the models and read their attributes.** Use Sequelize's model definitions (`Model.rawAttributes` or `Model.getAttributes()`) to learn each table's columns, types, nullability, primary keys, and foreign keys. Do not parse the model files as text.

3. **Insert in foreign-key dependency order.** Build a dependency graph from the FK definitions and topologically sort it. **FK cycles exist in real schemas** — when you detect one, insert the row with nullable FKs set to NULL first, then UPDATE them afterwards. If a cycle has no nullable edge, skip that table and report it (see 5.3).

4. **Generate values by column type:**
   - `INTEGER`/`BIGINT` → sequential integers
   - `STRING`/`TEXT` → `'seed-' + tableName + '-' + rowIndex` (never a real-looking name or email)
   - `BOOLEAN` → alternate true/false
   - `DATE`/`DATEONLY` → fixed dates derived from the row index. **Never `new Date()`** — a seed that changes run to run makes CI failures irreproducible.
   - `ENUM` → the first value in the enum's allowed list
   - `JSON`/`JSONB` → `{}`
   - `DECIMAL`/`FLOAT` → a fixed number
   - `UUID` → a deterministic UUID derived from table + index, not random
   - Nullable columns with no obvious value → NULL
   - FK columns → an id that exists in the parent table you already inserted

5. **Default 5 rows per table**, overridable with `--rows N`.

6. **Never invent PII.** No realistic names, emails, phone numbers, addresses, or health values. `seed-user-1` is correct; `john.smith@gmail.com` is not — even fake-looking PII trains people to treat the file as harmless when it is copied somewhere real.

7. **Report what it did**, machine-readably, on one line:
   `SHADOW-SEED {"tables":N,"rows":N,"skipped":[...],"failed":[...]}`
   This exists so CI can assert the seed actually ran rather than silently doing nothing.

### 5.2 `backend/scripts/seed-shadow-db.test.mjs`

Tests that run **without a database**. Export the pure functions and test them:

- The safety check **rejects** a production-looking URL, a URL without `shadow`, and a non-localhost host — and **accepts** a valid shadow URL. This is the most important test in the file.
- Topological sort produces parents before children
- A cycle is detected and handled, not hung on
- Value generation is **deterministic** — same input, same output, twice
- No generated string matches an email pattern or looks like a real name

### 5.3 Wire it into the CI workflow

In `.github/workflows/migration-shadow-check.yml`, the current order is:

```
install deps → pre-migrate-guard --check → migrate → migrate again → import entry point
```

**The seed cannot run before the migrations**, because the tables do not exist yet. The correct order is:

```
install deps → migrate (creates schema) → SEED → migrate again (idempotence, now WITH DATA) → import entry point
```

This is the point of the whole exercise: the **second** migration run now happens against a populated database, so a destructive or data migration has something to destroy.

Add a step after the seed that asserts the `SHADOW-SEED` line appeared and reported a non-zero row count. **A seed that silently seeded nothing would make the whole job green and meaningless** — that failure mode is the entire reason this document exists.

---

## 6. Explicit non-goals — do not do these

- Do not connect to, read from, or snapshot the production database.
- Do not modify `render.yaml`. It changes what runs against production and is not yours.
- Do not modify `pre-migrate-guard.mjs`, the hooks in `scripts/hooks/`, or anything in `.githooks/`.
- Do not add a way to bypass the shadow-URL safety check.
- Do not seed `SequelizeMeta` — the migration runner owns that table.

---

## 7. Acceptance criteria — you are done when ALL of these hold

- [ ] `node backend/scripts/seed-shadow-db.mjs` **exits 1** with a clear error when `DATABASE_URL` is unset, is not localhost, or does not contain `shadow`
- [ ] The test suite passes and covers every case in 5.2
- [ ] Running the seed twice in a row does not crash and does not duplicate primary keys
- [ ] The CI workflow YAML parses (`python -c "import yaml;yaml.safe_load(open('.github/workflows/migration-shadow-check.yml'))"`)
- [ ] The workflow's step order matches 5.3 — seed **between** the two migration runs
- [ ] No generated value contains an `@`, a realistic personal name, or a plausible phone number
- [ ] `grep -rn "REFERENCES users" backend/scripts/seed-shadow-db.mjs` returns **nothing** (lower-case `users` is the stale duplicate table)
- [ ] `bash scripts/scan-secrets.sh --file <each file you created>` reports CLEAN

---

## 8. The hostile review — run this when the build is done

Four seats. **Run the free ones first.** Total expected cost: **well under $0.20**.

Write your review packet to `docs/ai-workflow/AI-HANDOFF/SHADOW-SEED-REVIEW-PACKET.md`. It must contain: what you built, the exact acceptance criteria you met, the criteria you could **not** meet and why, and the specific things you want attacked.

```bash
D=docs/ai-workflow/AI-HANDOFF/SHADOW-SEED-REVIEW-PACKET.md
O=docs/ai-workflow/AI-HANDOFF/panel-shadow-seed
mkdir -p $O
R="Hostile review. Verdict (APPROVE/REVISE/REJECT) plus your single strongest objection stated plainly. Then: what fails SILENTLY — what breaks in a way nobody notices until production is already wrong. Attack the safety check that stops this seeder pointing at production, and attack whether a seeded shadow database actually catches a destructive migration or only appears to."

# FREE seats first — always
node scripts/consult-qwen.mjs --document "$D" --out "$O/QWEN-REVIEW.md" --max-tokens 4000 --remit "$R"
node scripts/consult-glm.mjs  --document "$D" --out "$O/GLM-REVIEW.md"  --max-tokens 30000 --remit "$R"

# PAID seats
SWAN_GROK_MODEL=x-ai/grok-4.6            node scripts/consult-grok.mjs --document "$D" --out "$O/GROK-REVIEW.md"     --remit "$R" --effort high
SWAN_GROK_MODEL=deepseek/deepseek-v4-pro node scripts/consult-grok.mjs --document "$D" --out "$O/DEEPSEEK-REVIEW.md" --remit "$R" --effort high
node scripts/consult-kimi.mjs --document "$D" --out "$O/KIMI-REVIEW.md" --confirm-spend --remit "$R"
```

**Known seat behaviour, so you are not surprised:**
- **GLM will return an EMPTY file if you give it too small a token budget.** It spends its entire allowance on internal reasoning and emits nothing. Use `--max-tokens 30000` and tell it to keep reasoning short. If it comes back empty, that is this bug — re-run it, do not skip it. It produced the single best finding in the last two panels.
- **Kimi requires `--confirm-spend`** and is capped. One review per topic.
- A seat returning REVISE is the normal outcome. Every panel on this work has returned mostly REVISE, and every one found something real.

---

## 9. How to handle the findings — this section is the important one

**Verify every finding before you fix it.** A model's finding is a *hypothesis*, not a fact. On this codebase, reviewers have been confidently wrong — and confidently right about things the author swore were fine. The rule is the same either way: **reproduce it, then fix it.**

For each finding:

1. **Try to reproduce it.** Write the smallest thing that demonstrates the defect.
2. **If it reproduces** — fix it, then prove the fix by re-running the reproduction.
3. **If it does NOT reproduce** — say so plainly in your report, with the command you ran and its output. Do not fix a defect you could not observe, and do not quietly drop a finding you disproved.
4. **If it is a design decision rather than a defect** (e.g. "synthetic data is weaker than a real snapshot" — yes, and that was decided in §3), record it as accepted-and-deferred with the reason. Do not silently ignore it.

### Four traps this codebase has actually fallen into. Do not repeat them.

**A signal that is always true detects nothing.** A previous fix keyed on a condition that was true in *both* states it claimed to distinguish. It passed a syntax check, it read correctly, and it detected nothing. **Before trusting any check you write, run it against real examples of both cases and confirm the results differ.**

**A mutation that changes no outcome proves nothing.** When you break your code on purpose to confirm the tests notice, make sure the break actually changes behaviour. Three separate "mutation tests" on this codebase left the suite green because the mutation was inert — and each time the green result was briefly read as *"the tests are honest."*

**A gate that reports green while inspecting the wrong surface is worse than no gate.** It buys confidence it has not earned. If your seed reports success, prove it actually inserted rows.

**Your instruments lie.** Specifically, on this machine:
- `$?` after a pipe reports the **last** command's status, not the one you care about. Redirect to a file and check `$?` on the next line.
- A too-tight timeout is indistinguishable from a real failure. One test here legitimately takes 61 seconds.
- Python strings turn `\b` into a **backspace character**. When patching a file that contains a regex, write the replacement to a file with a quoted heredoc and splice it — never patch a regex through a language whose escape rules differ from the target's.

---

## 10. Deliverable

One PR against `main` containing:

1. `backend/scripts/seed-shadow-db.mjs`
2. `backend/scripts/seed-shadow-db.test.mjs`
3. The updated `.github/workflows/migration-shadow-check.yml`
4. `docs/ai-workflow/AI-HANDOFF/SHADOW-SEED-REVIEW-PACKET.md` and the `panel-shadow-seed/` reviews

**The PR body must state:**
- What you built and what it now catches that the empty-database version did not
- Each panel finding: **reproduced / not reproduced / accepted-and-deferred**, and what you did about it
- **What you could not verify**, stated plainly rather than glossed. You cannot run a real deploy, and you cannot test against production data. Say so.

**Do not merge it.** Sean merges.

---

## 11. If you get stuck

Stop and write down what you tried and what happened. A partial PR with an honest "I could not get the topological sort to handle this cycle, here is the failing case" is far more useful than a complete-looking one that seeds nothing.

The single worst outcome is a seed that runs, reports success, inserts nothing, and turns the CI job green forever. **Everything in §9 exists to prevent exactly that.**
