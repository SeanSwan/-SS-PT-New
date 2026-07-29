# Backend-Wide SQL Existence Sweep — 2026-07-29 (cleanup loop iteration 6)

- **Linear:** SWA-71 · **Lane:** raw SQL vs live production schema (generalizes iteration 5)
- **Result: 2 confirmed live defects. NEITHER FIXED — both need a decision that is not mine to make.**
- Method: extract every SQL literal from the shipped backend source, execute each against the
  production DB inside a `READ ONLY` transaction, keep only existence failures.

---

## Why this sweep exists

Iteration 5 found two hand-spotted defects where raw SQL referenced tables/columns that do not
exist. Both had been live for months, invisible because graceful degradation absorbed them. A
hostile review then found a **third** in the same file that the first pass never checked.

That was a method failure, not an attention failure. So this iteration replaced hypothesis-driven
checking with **enumerate-and-execute**: every SQL literal in the backend gets run against the
real schema, so a query cannot pass by not being looked at.

**Safety, three ways over** — writes were impossible by construction:
1. Only literals whose first keyword is `SELECT` were considered.
2. Any literal containing `INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY` skipped.
3. Every statement ran inside `BEGIN; SET TRANSACTION READ ONLY; … ROLLBACK` — Postgres itself
   rejects a write in a read-only transaction — plus a 5s `statement_timeout`.

**Coverage, stated honestly:** 1,014 files scanned, **201 SELECT literals executed**, 146 clean.
**46 literals were skipped because they are assembled at runtime** (`${}` interpolation) and 5
were non-SELECT. Those 51 are NOT covered by this sweep. Write statements are also not covered —
which matters, because one of the two findings below was only fully understood by reading an
`INSERT` by hand.

**Noise warning, recorded because it nearly buried the signal:** pass 1 reported **44 failures**.
Nearly all were `operator does not exist: character varying = integer` — my harness binding an
integer user-id into every named parameter regardless of its real type. That is harness fallout,
not drift. Only errors of the form `relation … does not exist` / `column … does not exist` fail
*regardless of what you bind*, and only those were kept. **Two survived.** This is the second
time today a sweep of mine produced ~95% false positives (the first reported 596/665). Confirm
the sweep before confirming the failure.

---

## FINDING 1 — `exercise_library`: two migrations, incompatible schemas, controller wrote to the loser

**Live and mounted:** `backend/core/routes.mjs:487-488` mounts `videoLibraryRoutes` at BOTH
`/api/admin/videos` and `/api/admin/exercise-library`.

**Proven against production:**
```
SELECT * FROM exercise_library WHERE name = :name AND "deletedAt" IS NULL
  -> column "name" does not exist
SELECT * FROM exercise_library WHERE exercise_name = :name AND "deletedAt" IS NULL
  -> OK
```

### Root cause: competing migrations, one day apart

| Migration | Creates `exercise_library` with | Outcome |
|---|---|---|
| `20251112000000-create-nasm-integration-tables.cjs:351,376` | `exercise_name`, `primary_body_part` | **WON — this is what the DB has** |
| `20251113000000-create-exercise-library-table.cjs:363,370` | `name`, `primary_muscle`, `secondary_muscles`, `equipment`, `difficulty` | lost (table already existed) |

`videoLibraryController.mjs` was written against the **second** schema.

### The mechanism is worse than "a migration failed" — it is recorded as APPLIED

`SequelizeMeta` says **both** migrations applied successfully:

```
applied   20251112000000-create-nasm-integration-tables.cjs
applied   20251113000000-create-exercise-library-table.cjs     <-- but its schema is NOT in the DB
applied   20251118000003-enhance-exercise-library-table.cjs
```

`20251113000000` wraps its work in a transaction with a `catch` (it has no `tableExists`
pre-check). So it ran, `createTable('exercise_library')` threw because the table already existed,
the `catch` **swallowed the error**, and Sequelize recorded the migration as successful.

**A catch-all in a migration converts a schema conflict into a permanently "applied" migration
that did nothing.** Nobody will ever re-run it, because the ledger says it is done. This is the
generalizable defect — worth checking other migrations for the same swallow pattern.

*(Correction: an earlier draft of this doc claimed the migration had no guard and therefore could
not have applied. That came from grepping the first 30 lines of a 400-line file whose `createTable`
is at line 363. It does have a transaction+catch; `SequelizeMeta` then settled what actually
happened. Recorded because "I grepped and found nothing" is only as good as the range grepped.)*

### This is NOT a one-column typo — the mismatch is wholesale

`videoLibraryController.mjs:149` inserts:
```sql
INSERT INTO exercise_library
 (name, description, primary_muscle, secondary_muscles, equipment, difficulty,
  movement_patterns, nasm_phases, contraindications, acute_variables, created_at, updated_at)
```
Real columns: `id, exercise_name, opt_phases, exercise_type, primary_body_part, movement_pattern,
primary_equipment, alternative_equipment, contraindications, acute_variables_defaults,
demo_video_url, coaching_cues, approved, created_by_admin_id, created_at, updated_at, nasm_phases,
movement_patterns, acute_variables, deletedAt, is_active, created_by`

| Controller column | Real schema |
|---|---|
| `name` | `exercise_name` |
| `primary_muscle` | `primary_body_part` |
| `equipment` | `primary_equipment` |
| `description` | **no equivalent** |
| `secondary_muscles` | **no equivalent** |
| `difficulty` | **no equivalent** |
| `primary_video_id` (UPDATE at :219) | **no equivalent** |

### NOT FIXED, deliberately

Renaming `name` → `exercise_name` fixes line 132 and the `INSERT` three lines later still fails.
**A partial fix moves the failure one line down** — the exact trap recorded this morning, where
correcting a table name without its columns turned `relation does not exist` into `column does
not exist`. Still broken, still silent.

Three columns (`description`, `secondary_muscles`, `difficulty`) plus `primary_video_id` have **no
home in the live schema**. Deciding where they go is a product/schema call, not a rename:

- **Option A** — rewrite the controller to the NASM schema and drop the four homeless fields.
  No migration, but the admin video-library loses description/difficulty/secondary-muscle data.
- **Option B** — migrate `exercise_library` to add the missing columns. Keeps the feature whole;
  touches a table the NASM integration also owns.
- **Option C** — retire whichever surface is not wanted. Two migrations for one table means one of
  these features was probably superseded and nobody deleted the other.

**Recommend Option A or C, not B** — B grows a table two subsystems share, and the losing
migration suggests this controller may already be superseded. But that is Sean's call.

## FINDING 2 — `user_follows`: the table was never created, and the follow feature depends on it

**Proven:** `user_follows` **MISSING** from the production DB. So are `follows`, `Follows`,
`UserFollows`. **There is no migration that creates it anywhere in `backend/migrations/`.**

**But a model and live routes depend on it:**
- `backend/models/UserFollow.mjs:340` — `tableName: 'user_follows'`
- `backend/controllers/socialController.mjs:44,74,91` — `UserFollow.findOne()`, `UserFollow.create()`
- `backend/controllers/socialController.mjs:498-499` — raw SQL `FROM "user_follows"`
- Mounted routes: `gamificationV1Routes.mjs:507` `/users/:userId/followers`,
  `:514` `/users/:userId/following`, `profileRoutes.mjs:234` `/follow-stats`

The raw SQL at :498 is a bare `await` inside the `mutualFollows === 'true'` branch, so that path
500s. The `UserFollow.findOne()`/`.create()` calls are the follow/unfollow actions themselves.

### The candidate replacement is an exact shape match — which is why I am not just applying it

`SocialConnections` **exists** and has `followerId`, `followingId`, **and** `status` — precisely
the three columns the broken query uses. A rename would compile and run.

**It would also be wrong to do blind.** `SocialConnections` has **0 rows** and ~50 columns
(privacy flags, mutual tracking, AI compatibility scoring, moderation). `UserFollow` is a
narrow follow-edge model. Pointing a lightweight follow feature at a rich connections table is
a data-model decision with privacy implications (`privacyLevel`, `canSeeProfile`, `canSeePosts`),
not a typo fix. Rule 8 territory.

- **Option A** — write a migration creating `user_follows` to match `UserFollow.mjs`. Smallest
  change, honours the model that already exists, keeps follow edges separate from rich connections.
- **Option B** — retire `UserFollow` and move the follow feature onto `SocialConnections`. One
  social graph instead of two, but every call site changes and the privacy columns need defaults.

**Recommend Option A.** `SocialConnections` having 0 rows suggests it was built and never adopted;
adding a second consumer to an unused rich table is how you get two half-used social graphs.
Sean decides.

---

## What this sweep did NOT cover

- **46 runtime-interpolated literals** (`${}`) were skipped. Finding 1's severity was only fully
  visible after reading an `INSERT` by hand, so this gap is load-bearing, not cosmetic.
- **Write statements** (INSERT/UPDATE/DELETE) were never executed — correctly, but it means write
  paths are unverified. A follow-up could validate write column lists against
  `information_schema` statically, without executing anything.
- **Parameter-type correctness** is out of scope. Binding NULL/dummy values proves a query
  *parses and resolves*, not that it returns the right rows.
- Models with `sync()`-created tables may exist that no migration declares — `user_follows` is
  itself an example of the inverse (model with neither migration nor table).

---

## Side sweep: 20 tables have multiple `createTable` migrations — and that is mostly FINE

The `exercise_library` conflict prompted a static check for duplicate `createTable` targets
(cheap, deterministic, no DB needed). 20 tables matched, including `shopping_carts` ×6,
`cart_items` ×5, `orders` ×4, `notifications` ×4, `sessions` ×3.

**This is NOT a 20-item defect list, and reporting it as one would have been wrong.** The
discriminator is guarding, and the pattern is historical:

| Table | Unguarded migration | Is it the oldest in its chain? |
|---|---|---|
| `shopping_carts` | `20250213192604-create-shopping-carts.cjs` | **yes** |
| `orders` | `20250506000001-create-orders.cjs` | **yes** |
| `notifications` | `20250508123457-create-notifications.cjs` | **yes** |

In every case the unguarded `createTable` is the **original** migration — unguarded was correct
then, because the table did not exist. Every later duplicate is a guarded repair/hotfix
(`repair-`, `hotfix-`, `EMERGENCY-DATABASE-REPAIR`). That is a normal, healthy pattern for a
production DB that has been repaired over time.

`exercise_library` is different: two migrations **one day apart** declaring *incompatible column
sets* for a brand-new table, neither one a repair of the other.

**So the useful static check is not "duplicate createTable" — it is "duplicate createTable with
disjoint column sets", or better, "migration with a catch that swallows a createTable failure".**
The naive version of this check would have produced 20 findings, ~19 of them noise. Recorded so
the next agent builds the discriminating version, not the naive one.

## Iteration note

Second iteration in a row where the *method* was the finding. Iteration 5's lesson was
"enumerate the surface, don't check your hypotheses." This iteration did that — and the sweep it
produced still had a ~95% false-positive rate on first pass, and still missed severity that only
a hand-read of an `INSERT` revealed. **Automated enumeration widens coverage; it does not remove
the need to read the code around a hit.**