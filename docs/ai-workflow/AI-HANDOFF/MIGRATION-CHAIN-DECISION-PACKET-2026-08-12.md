# Decision packet — the migration chain cannot rebuild the schema

**Reviewer:** Kimi K3 · **Author:** Opus 5 · **Date:** 2026-08-12
**Constraint from the owner, verbatim:** *"Let's be careful and not break production. No breaking
changes, please. We need to be a hundred percent before we push."*

---

## 0. The decision I need from you

**How do we make a fresh environment buildable, without risking the live database?**

Rank the options in §4 (or propose a better one) and say plainly which you would ship. Then:

1. **What would break production** in each option — be specific about the mechanism.
2. **Where is my reasoning wrong?** I have verified the guards in §3; tell me what I have
   misread or what I have not checked.
3. **What is the smallest first slice** that is provably zero-risk to production?
4. **How would you sequence this** so that each slice is independently revertible?

This is a live revenue-generating SaaS with real client data. A wrong answer here is not a
failed test — it is a production incident. Bias hard toward "does nothing to prod".

---

## 1. The finding

367 migrations in `backend/migrations/`. **Not one creates `Users`, `orientations`, or
`WorkoutSessions`.** The first migration in filename order,
`20240115000000-update-orientation-model.cjs`, fails immediately against an empty database:

```
ERROR: relation "orientations" does not exist
```

Verified: `grep -rl "createTable('Users'" migrations/` returns **0 files**.

So the migration history is incremental-only and assumes a pre-existing schema that nothing in
the repo produces. Whatever built production originally (an early `sequelize.sync()`, or
migrations since deleted) is gone.

**Consequences:**
- No fresh environment can be stood up from migrations (this is what blocked the QA lane).
- Migrations alone could not rebuild production in a disaster.
- Any defect that only manifests at environment-creation time is permanently invisible, because
  nobody can create an environment. §2 is an example that had been hiding for an unknown period.

## 2. What building from empty immediately exposed

Building the schema from the MODELS instead (`sequelize.sync()` per model, converging over
retries) produced 160 tables from 164 models — and surfaced six real model defects in one pass:

| Model | Failure | Class |
|---|---|---|
| `daily_workout_forms` | index `fields: ['clientId']` vs column `client_id` | **FIXED** — see below |
| `challenge_participants` | FK `teamId` "cannot be implemented" | type mismatch vs referenced key |
| `PainEntryCorrectiveExercises` | FK `exerciseId` "cannot be implemented" | type mismatch |
| `SocialPosts` | `relation "SocialGroups" does not exist` | model absent/unregistered |
| `SocialComments` | blocked on `SocialPosts` | cascade |
| `daily_macro_logs` | `relation "nutrition_source_records" does not exist` | model absent |

`daily_workout_forms` backs `POST /api/workout-forms` — the trainer-logs-workout endpoint. Its
index definitions used model ATTRIBUTE names while every attribute maps to a snake_case column,
so `CREATE INDEX ... ON daily_workout_forms ("clientId")` ran against a column that does not
exist. **The table could not be created on a fresh database at all.** Fixed by using column
names; all 9 indexes now create.

## 3. Production guards — verified in-repo this session, not assumed

- `backend/core/startup.mjs:199` — `sequelize.sync({ alter: true })` is guarded
  `if (!isProduction && process.env.AUTO_SYNC === 'true')`. Never runs in production.
- Production boot instead calls `syncDatabaseSafely()` (`backend/utils/productionDatabaseSync.mjs:329`):
  - **Step 1 `createMissingTables()` — ADDITIVE, ON.** Creates only tables that do not exist.
  - **Step 2 `addMissingColumns()` — ADDITIVE, ON.**
  - **Step 3 `syncIndexesAndConstraints()` — MUTATIVE `sync({alter})`, OFF BY DEFAULT.** Gated by
    `shouldRunSchemaAlter()` = `process.env.STARTUP_SCHEMA_ALTER === 'true'`.
- That step was disabled by **your own hostile review on 2026-08-04**. The in-code comment records
  that models here have been WRONG relative to the live schema — `Achievement.id`,
  `ProgressData.userId` and `UserFollow` were all corrected UUID→INTEGER *because the models were
  wrong, not the database* — so healing "toward the models" can heal toward the wrong target.
  Named failure modes: uncastable type change aborts boot (restart loop); castable one rewrites
  the table under ACCESS EXCLUSIVE (lock brownout); lossy-but-legal one silently coerces live data.
- A read-only drift auditor already exists: `backend/scripts/audit-schema-drift.mjs`.
- Render's `render.yaml` build/start commands do **not** invoke migrations.

**My conclusion, which I want you to attack:** the `daily_workout_forms` index fix already pushed
is INERT in production — the table exists so `createMissingTables` skips it, and the only path
that would emit those indexes is the ALTER step, which is off. Am I wrong?

## 4. Options

**A. Baseline migration generated from the live schema.** `pg_dump --schema-only` production →
commit as `00000000000000-baseline.cjs` using `CREATE TABLE IF NOT EXISTS`, ordered before
everything. Fresh envs replay baseline then the 367. Production replays nothing (all IF NOT
EXISTS no-ops), but requires a read-only production connection to produce, and bakes today's
drift in as canon.

**B. Baseline generated from the MODELS.** No production connection needed. But §3 establishes
models have been wrong before, so the baseline could encode a schema production does not have —
and future migrations would then be written against a fiction.

**C. Leave migrations alone; make model-sync the official fresh-env path.** Cheapest, zero
production risk, already working (160 tables). Accepts that migrations can never rebuild anything
and that fresh envs may differ from production.

**D. Fix the 6 model defects only, defer the chain.** Narrow, each independently verifiable
against the QA container. Does not solve rebuildability.

**E. Something else you would do instead.**

## 5. Constraints any answer must respect

- **No production writes.** No migration may be authored that mutates live data or types.
- `STARTUP_SCHEMA_ALTER` stays off; nothing may depend on flipping it.
- Every slice independently revertible, with a stated rollback.
- Backups before anything touching a database — the owner asked for this explicitly.
- The QA container is disposable and unlimited; use it freely.
- Do not assume production's Postgres major version — it is not recorded in the repo and I have
  not probed it.
