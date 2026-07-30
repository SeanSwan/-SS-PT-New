# SWA-71 Cleanup Loop — Continuation Handoff (2026-07-30)

**For:** the next agent continuing the hostile-review cleanup loop
**From:** Claude Opus 5, session 2026-07-29 → 2026-07-30
**Reads with:** `SWA-71-CLEANUP-LOOP-HANDOFF-2026-07-29.md` — that doc is still accurate on the
trap, the tooling, the hooks, and the process. **This doc is a delta, not a replacement.**
**Branch state:** everything below is on `origin/main` (`08d0a3e3b`, `05d56251e`). Nothing uncommitted.

---

## 0. The 2026-07-29 handoff's §0 trap is still live — and it caught me too

The main tree (`…/Desktop/quick-pt/SS-PT`) is still on `wip/comms-notifications-2026-07-05`.
Work in `C:/tmp/ss-nutrition-safety-20260728`.

**New form of the same trap, worth adding:** a *probe script* that imports with a relative path
(`await import('./models/X.mjs')`) reads whatever tree the **script** lives in — which is the stale
main tree, because that is the only tree with `node_modules`. I nearly reported an
already-fixed model as broken because of it. Probes must take the target root as `argv` and join
paths from it (`path.join(ROOT, 'backend', 'models')`), never resolve relatively.

Second gotcha: probes load `.env` **relative to cwd**. Run them with cwd = `…/SS-PT/backend`
and pass the worktree path as an argument. Running from the worktree makes them die silently.

---

## 1. What shipped (2 commits, both on main)

| Commit | What |
|---|---|
| `08d0a3e3b` | **P0** — client onboarding returned 201 while persisting nothing; + workout-form INSERT |
| `05d56251e` | **fix** — video analytics threw on every view (one wrong column) |

### The P0 mechanism — worth internalising, it will recur
`POST /api/clients/onboard`: `assignToSelf` **defaults to true** and the Coach client service sends
it explicitly, so nearly every onboard hit this.

1. transaction opens; `User.create()` stages the client inside it
2. `to_regclass('client_trainer_assignments')` returns non-null → the guard **passes**
3. the INSERT used snake_case columns against a quoted-camelCase table → **42703**
4. `catch` logged `'Non-fatal'`, execution continued
5. transaction was now **aborted (25P02)**; `commit()` **resolved without error** (Postgres turns
   COMMIT on an aborted tx into ROLLBACK)
6. handler returned **201** with `newUser.id` + an access handoff

**A caught error inside a Postgres transaction is not a contained error.** `try/catch` +
"Non-fatal" is a silent-data-loss generator unless wrapped in `SAVEPOINT` /
`ROLLBACK TO SAVEPOINT`. All three "non-fatal" blocks now have savepoints — including
`ClientProgress`, which was not otherwise broken but carried the identical latent risk.

**Also:** the note INSERT needed *two* fixes. Correcting the columns swapped `42703` for `22P02` —
`'onboarding'` is not a member of `enum_client_notes_noteType`
(`observation|red_flag|achievement|concern|general`). A column-only fix would have compiled, run,
still failed, and still looked complete. **When identifiers are wrong, check the value literals too.**

---

## 2. OPEN — Sean's decision, do NOT fix unilaterally

### 2a. Three migrations recorded APPLIED whose table does not exist
Detector: compare `SequelizeMeta` against `pg_tables` + each migration's `createTable` targets.

| Migration | Missing table | Impact |
|---|---|---|
| `20260718120000-create-achievement-crystallizations.cjs` | `achievement_crystallizations` | **LIVE + user-facing** |
| `20260325000001-create-pain-entry-corrective-exercises.cjs` | `PainEntryCorrectiveExercises` | model exists, junction table |
| `20250614000000-enhanced-financial-tracking.cjs` | `payment_method_analytics` | **zero** runtime consumers |

Because the ledger says applied, **they will never re-run**. Fix = a new additive migration
(production DDL → Sean's call).

**Mechanism is [UNKNOWN] — and my first two hypotheses were both wrong.** The crystallize
migration's catch **rethrows** (`throw error`), so it is *not* the handoff §4a swallowed-catch
pattern. `scripts/mark-completed-migrations.mjs` (which does stamp `SequelizeMeta` by hand)
does not reference any of the three. Do not assume a mechanism; two plausible ones are already
disproved.

Crystallize causation is closed: `POST /api/achievements/:id/crystallize` → `crystallizeAchievement`
→ INSERT → `42P01` → `SequelizeDatabaseError` has no `statusCode` → controller's
`err?.statusCode || 500` → **HTTP 500**. Real frontend caller:
`frontend/src/components/DashBoard/v2/sections/useCrystallizeMilestone.ts:24`. The Dashboards-v2
Crystallize feature has never worked in production.

### 2b. `BadgeCollections.badgeCount` does not exist
`badgeService.mjs:974` (`updateCollectionBadgeCount`, 3 call sites) updates a column absent from the
live table. Its migration `20260104000002-create-badge-collections-table.mjs` declares `badgeCount`
and is **not in `SequelizeMeta`** — the table was created by something else. Fix = migration to add
the column, or compute the count on read. Decision needed.

### 2c. A completed fix for 3 production-broken models is stranded off `main`
Independent runtime model↔DB sweep confirms `main` still has:

| Model | Live truth |
|---|---|
| `TrainerPermissions` | maps `field: 'trainer_id'`; DB has `trainerId`. Also declares `deactivatedBy`/`deactivatedAt`/`reason`; DB has `revokedAt`/`notes` |
| `FoodScanHistory` | 8 attrs absent (`productId`, `barcode`, `notes`, `userRating`, `isFavorite`, `wasConsumed`, `location`, `metadata`) |
| `UserAchievement` | ~24 attrs absent |

The fix exists as `5ad5fd4fc` on `fix/swa87-schema-truth-20260729` (and `94da72ce8` on the wip
branch). `git merge-base --is-ancestor 94da72ce8 origin/main` → **NO**. **Committed ≠ shipped.**
Landing SWA-87 is that lane's call, not this one's.

### 2d. `backend/clean-duplicate-tables.mjs` — destructive, unreferenced, still advertised
Does `DROP TABLE IF EXISTS "${drop}" CASCADE` and `INSERT INTO "${keep}" SELECT * FROM "${drop}"`
(which also assumes identical column order). Not referenced by `package.json`/`render.yaml`, but
`backend/check-table-names.mjs:180` and `backend/fix-workout-models.mjs:241` **tell operators to run
it**. Its sibling `complete-p0-fix.mjs` was already archived to
`archive/pending-deletion/2026-05-15/backend-dangerous-admin-scripts/` — this one was left behind.
Per Rule 34: **archive candidate pending reference check + Sean's approval**, not "safe to delete".

### 2e. Other agent's lane — flagged, not touched
`backend/socket/socket.mjs:169` INSERTs into `notifications` using `user_id`, `content`,
`created_at`. Live columns are `userId`, `message`, `createdAt` — and there is **no `content`
column at all**, so mapping it needs a shape decision (a JSON blob currently goes into it while the
frontend reads `message` as text). File has 2 recent SWA-75 commits; left alone deliberately.

### 2f. Unchanged from the 2026-07-29 handoff
`exercise_library` competing migrations (§4a) — still open. My sweep **added** to it:
`exercise_videos` (`is_public`, `original_filename`, `file_size_bytes`) is broken in the same
controller. `video_analytics` was *separable* and is now fixed; the rest is not.
`/api/packages`, `user_follows`, and the rest of §4b are untouched.

---

## 3. Tooling built this session (rebuild; scratch files deleted)

1. **Live schema snapshot** → `.schema-snapshot.json` (234 tables / 3,948 columns). Generate once,
   reuse everywhere. This is the single source of truth for "does this column exist" and it makes
   every later sweep static, fast, and offline.
2. **Write-statement validator** (static, no execution): parses `INSERT INTO t (cols)` and
   `UPDATE t SET col =` out of backtick literals and diffs against the snapshot. Honours Postgres
   quoting rules (quoted = case-sensitive, unquoted = folded).
3. **Blind-spot sweep**: `ON CONFLICT (...)`, `RETURNING`, `DELETE FROM` targets, and
   `${}`-interpolated writes. Result: ON CONFLICT 28/28 clean, DELETE 25/25 clean.
4. **Ledger probe**: `SequelizeMeta` vs `pg_tables` vs each migration's `createTable` targets.
5. **Runtime model↔DB drift probe**: imports each model and diffs
   `Model.rawAttributes[k].field || k` against the snapshot. Authoritative — beats regex.
   Coverage last run: 170 files, 170 loaded, 165 models, 154 compared, 11 table-missing.
6. **Shipped-source EXPLAIN prover** — the most valuable one. Extracts SQL from the **shipped
   file** (not a hand copy) and `EXPLAIN`s it through the production path
   (`sequelize.query` + `:named` replacements). `EXPLAIN` does full parse + analyze + plan and
   resolves every identifier and literal **without executing**. Pair it with `git stash` for a
   fail→pass control.

**Classify probe failures by SQLSTATE.** Postgres resolves identifiers *before* type-checking
values, so `42804`/`22P02`/`22007` mean "identifiers all resolved, my synthetic value was the wrong
type" while `42703`/`42P01` are real. Verified this discriminates: the same target reported `42703`
pre-fix and `42804` post-fix.

---

## 4. Harness bugs I caught before believing their output — the actual skill

The 2026-07-29 handoff's lesson #1 earned its place. Four instances in one session:

1. **`information_schema.tables` returns rows as ARRAYS** here (`["notifications"]`), so
   `r.table_name` is `undefined` and a naive `new Set(...)` collapses 234 tables to **1** — making
   ~30 tables look missing. `pg_tables` returns proper objects. `information_schema.columns` is
   fine. **Fix applied: the probe now self-aborts when its own table count disagrees with the
   snapshot.** Make harnesses fail loudly against a known-good reference.
2. **A substring precondition matched English prose.** Filtering literals on `/UPDATE\s/` also
   matched log messages — `"Failed to update order to processing"`, `"allocation update
   broadcasted"`. That inflated one bucket from **1 to 17**. Requiring the literal to *begin* with
   the verb fixed it, and `ON CONFLICT`/`RETURNING` coverage held steady (28/48), proving the
   tightening removed noise rather than reach. Same class as the handoff's `FROM`/`JOIN`-in-prose trap.
3. **Alias-qualified `RETURNING j.clip_id`** read as a bare column name → phantom finding.
4. **A relative import read the stale tree** (see §0).

Plus two false positives in the reported findings themselves: a `//`-in-SQL hit that was actually a
**JavaScript source template being generated to disk**, and `manual-update-role-enum.mjs` updating
`role_new`, a column **the same script creates two statements earlier**.

**Honest 46-finding ledger:** 20 fixed · 2 false positives (mine) · 3 other agent's lane ·
14 Sean's decision · 7 real-but-dormant in an unreferenced ops script.

---

## 5. Suggested next lanes

1. **Frontend dead-file / dead-route sweep** — still untouched by either session. Prior art:
   `BACKEND-ORPHAN-INVENTORY-2026-07-28.md`.
2. **`SELECT`/`WHERE` column validation.** Both sweeps so far validated *write* column lists; the
   prior session validated SELECT *existence*. Column-level validation of `WHERE`/`JOIN`/`ORDER BY`
   identifiers is unexplored — and needs alias resolution (see harness bug 3).
3. **`/api/trainer/stats`** → 404, `fetchTrainerStats` has no consumer. Implement or remove.
4. The **17 `${}`-interpolated write literals** are down to **1** real one after the precondition
   fix (`clean-duplicate-tables.mjs`, §2d). That lane is effectively closed — do not re-chase 17.

---

## 6. Honest state of the loop

The 2026-07-29 handoff predicted "the cheap safely-fixable defects in this class are gone." That
was **half right**. The *SELECT* class was mined out; the **write** class was not — it yielded a
P0 on the first sweep, because nothing had ever validated `INSERT`/`UPDATE` column lists.

What is now genuinely thin: the write class is swept (INSERT/UPDATE/ON CONFLICT/RETURNING/DELETE,
all clean post-fix). The remaining backlog is **decision-shaped, not typo-shaped** — production
DDL, a stranded branch, a taxonomy question, an archive approval. That matches the prior session's
read, one layer deeper.

**The pattern to expect:** each new *vantage* still finds real defects; re-running an existing
vantage does not. Pick a surface nothing has measured yet, and build the harness so it self-aborts
when it disagrees with a known-good reference.
