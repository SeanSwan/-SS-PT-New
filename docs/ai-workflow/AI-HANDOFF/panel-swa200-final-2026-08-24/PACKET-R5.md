# HOSTILE REVIEW — a CI diagnosis, an architecture recommendation, and a stuck operator

Two questions, one of which matters more than the code.

**Q1. Is the billing diagnosis correct, and — more usefully — how does the operator get
unblocked, including if the billing fix is slow, refused, or does not work?**

**Q2. Is the "measure before choosing" schema-authority recommendation sound, or is it
procrastination dressed as rigour?**

Attack both. Say plainly if you find nothing.

---

## Q1 — The CI diagnosis

### Observed, all `[VERIFIED]` by API this session

| Measurement | Result |
|---|---|
| Runs in queryable history | **500** |
| Conclusions | **`startup_failure`: 500.** Zero successes, ever. |
| Oldest queryable | 2026-08-14 · newest 2026-08-26 00:34 |
| Events | `push`, `pull_request`, **`schedule`** |
| Branches | includes `main` |
| Jobs created | **zero** · check-runs **zero** · annotations **none** |
| Run `name` | empty string · Run `path` | `BuildFailed` |
| Repo Actions permissions | `{"enabled": true, "allowed_actions": "all"}` |
| Workflows registered on main | 4, all `state: active` |
| Repo | **private**, owned by a **personal** account |

### Eliminated, each by measurement not assumption

- **Repo-level disable** — permissions API says enabled.
- **YAML syntax** — all local workflow files parse. Decisively: a malformed workflow produces an
  **annotation naming file and line**; this produces silence.
- **GitHub cannot see the workflows** — it lists 4 as `state: active`.
- **One workflow poisoning others** — workflows are independent; all fail identically.
- **Branch/event-specific** — `main` fails; `schedule` fails, and schedule has no human, no
  branch and no diff.
- **Transient** — 500 consecutive over 12 days, 0% success.

### The conclusion I drew

Account-level billing / spending-limit block. `path: "BuildFailed"` with zero jobs and no
annotation is what GitHub emits when it declines to build a run *before parsing anything*, and a
private repo on a personal account bills Actions against the account allowance.

### What I could NOT verify — state this back to me if it changes the ruling

- `[UNVERIFIED]` **the billing page itself.** `/users/{u}/settings/billing/actions` needs the
  `user` OAuth scope; this token lacks it. The core claim rests on **elimination, not
  observation.**
- `[INCONCLUSIVE]` **the cross-repo control.** I tried to test whether Actions fail on the
  operator's OTHER private repos — the natural discriminator between account-level and
  repo-level. All four returned zero runs, and then I found they contain **zero workflows**, so
  the absence is fully explained and the test yielded **no information in either direction.**
  I nearly reported this as confirmation. It is not.

**So: is there any cause consistent with ALL the observations above that is NOT billing?**
Name it, and name the cheapest command that would distinguish it.

### Q1b — the operator question, which matters more

The operator has been told "go to the billing page" and it has not happened. Assume it may not
happen soon. **What gets this project unblocked anyway?** Candidates I see — attack them, rank
them, and add what I have missed:

1. **Self-hosted runner** on a machine the operator already owns (there is a powerful desktop).
   Self-hosted minutes are free and unmetered even for private repos. Cost: a runner process,
   and a real security consideration — self-hosted runners on a repo that accepts PRs can
   execute untrusted code. Is that acceptable for a solo private repo?
2. **Run the gate locally instead of in CI.** The shadow check needs a Postgres container and the
   repo; nothing about it requires GitHub. A local script would validate the four rounds of work
   **today**, with no billing dependency at all. This looks like the highest-value move and I
   want it attacked.
3. **Make the repo public.** Free unlimited Actions. Almost certainly wrong — the repo holds a
   production SaaS with client PII paths and has a documented credential-leak incident.
4. **Reduce minute burn** so the free allowance stretches: `paths` filters, concurrency
   cancellation, fewer triggers. Useless if the allowance is already exhausted, and this gate
   deliberately removed its PR `paths` filter for a correctness reason (a required check behind a
   paths filter deadlocks the merge).
5. Something better that I have not thought of.

For each: does it actually work given the observations, what does it cost, and what does it
break?

---

## Q2 — The schema-authority recommendation

### The situation, `[VERIFIED]` in source

Production runs three schema-mutating steps on **every boot**, gated only by
`NODE_ENV === 'production'`:

1. `createMissingTables()` → `model.sync({force:false})` — **model-driven**, creates any table a
   model declares and the DB lacks.
2. `addMissingColumns()` — a **hardcoded list of 21 columns**, each carrying a comment naming the
   migration that was supposed to add it
   (`// gallery_photos.source_type — added in 20260311000000 migration`).
3. `syncIndexesAndConstraints()` → `sequelize.sync({alter:{drop:false}})` — **model-driven and
   broad**: adds columns, changes types, adds indexes and constraints across every model.
   `drop:false` prevents removal, not modification.

Alongside this: **38 migration files that execute under no runner** (32 `.mjs`, 2 `.sql`, 4
inside subdirectories `readdirSync` never reads), dating 2025-05 → 2026-05. And
`safe-migrate.mjs` marks a genuinely failed migration as applied, commenting *"sync will handle
schema"* — which, given the above, is **true**.

Reading: the migration system has been unreliable for a long time and a self-healing layer grew
around it. Each layer makes the other's failures invisible.

### The recommendation I made

Do **not** choose between "model-sync is authoritative" and "migrations are authoritative" yet.
Instead:

1. Add `STARTUP_DATABASE_REPAIR=report` — compute the diff, **log what it would change, change
   nothing.** The on/off switch already exists and honours `=false`, so a third mode is small.
2. Read two weeks of real deploys. Empty log ⇒ schema already matches models ⇒ switching to
   migrations-authoritative is safe. Non-empty ⇒ each line is a real drift migrations should own;
   write those, land them, watch it go quiet, then switch.
3. Delete the 21-entry patch list **last**, never first.

### Attack this specifically

- **Is it procrastination?** Two weeks is a long time to not decide. Is there a faster
  measurement that answers the same question — e.g. one read-only `information_schema` query
  diffed against model definitions offline, today, with no deploys at all? If so, my
  recommendation is worse than it needs to be and I want to know.
- **Is `report` mode even implementable safely?** Sequelize `alter` computes its diff internally;
  getting "what would change" without changing it may require a rolled-back transaction or a
  hand-rolled `information_schema` comparison. Does the easy version silently under-report?
- **Is the two-week window meaningful?** Deploys are frequent, but a drift only shows when a
  model changes. An empty log might mean "consistent" or might mean "nobody touched a model for
  two weeks." How would the operator tell those apart?
- **Am I wrong that Option B is dangerous?** `drop:false` means the healing layer only ever
  ADDS. If so, turning it off cannot break an existing query — it can only fail to fix a future
  gap. That would make Option B much safer than I claimed, and my caution unjustified.
  **This is the finding I would most like someone to land.**

---

## What I want back

`status: CONFIRM|REJECT` · `confidence` · `findings: F1=<SEV>: <claim>` (or `(none)`) ·
`evidence:` · `ruling:` — and for Q1b specifically, a **ranked, concrete unblock plan**, because
that is the thing the operator actually needs and four review rounds have not delivered.

## APPENDIX A — the production sync layer (the Q2 subject)

```javascript
     1	 * Add missing columns that migrations may not have applied in production.
     2	 * Each entry is checked individually — if the column already exists, it's skipped.
     3	 */
     4	const MISSING_COLUMNS = [
     5	  // gallery_photos.source_type — added in 20260311000000 migration
     6	  {
     7	    table: 'gallery_photos',
     8	    column: 'source_type',
     9	    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "source_type" VARCHAR(20) NOT NULL DEFAULT 'jpeg';`,
    10	  },
    11	  // gallery_photos thumbnail variant columns — added in 20260312000002 migration
    12	  {
    13	    table: 'gallery_photos',
    14	    column: 'medium_key',
    15	    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "medium_key" VARCHAR(500);`,
    16	  },
    17	  {
    18	    table: 'gallery_photos',
    19	    column: 'medium_url',
    20	    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "medium_url" TEXT;`,
    21	  },
    22	  {
    23	    table: 'gallery_photos',
    24	    column: 'thumb_key',
    25	    sql: `ALTER TABLE "gallery_photos" ADD COLUMN "thumb_key" VARCHAR(500);`,
    26	  },
    27	  // gallery_visitors geo columns — added in 20260311000100 migration
    28	  {
    29	    table: 'gallery_visitors',
    30	    column: 'country',
    31	    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "country" VARCHAR(100);`,
    32	  },
    33	  {
    34	    table: 'gallery_visitors',
    35	    column: 'city',
    36	    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "city" VARCHAR(100);`,
    37	  },
    38	  {
    39	    table: 'gallery_visitors',
    40	    column: 'region',
    41	    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "region" VARCHAR(100);`,
    42	  },
    43	  {
    44	    table: 'gallery_visitors',
    45	    column: 'latitude',
    46	    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "latitude" DOUBLE PRECISION;`,
    47	  },
    48	  {
    49	    table: 'gallery_visitors',
    50	    column: 'longitude',
    51	    sql: `ALTER TABLE "gallery_visitors" ADD COLUMN "longitude" DOUBLE PRECISION;`,
...
     1	const addMissingColumns = async () => {
     2	  const added = [];
     3	  const skipped = [];
     4	  const errors = [];
     5	
     6	  for (const { table, column, sql } of MISSING_COLUMNS) {
     7	    try {
     8	      // Check whether the table exists first
     9	      const [tableRows] = await sequelize.query(
    10	        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}';`
    11	      );
    12	      if (tableRows.length === 0) {
    13	        skipped.push(`${table}.${column} (table does not exist yet)`);
    14	        continue;
    15	      }
    16	
    17	      // Check whether the column already exists
    18	      const [colRows] = await sequelize.query(
    19	        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}';`
    20	      );
    21	      if (colRows.length > 0) {
    22	        skipped.push(`${table}.${column}`);
    23	        continue;
    24	      }
    25	
    26	      // Column is missing — add it
    27	      await sequelize.query(sql);
    28	      added.push(`${table}.${column}`);
    29	      logger.info(`  ✅ Added missing column: ${table}.${column}`);
    30	    } catch (err) {
    31	      // "already exists" is fine — treat as skipped
    32	      if (err.message && err.message.includes('already exists')) {
    33	        skipped.push(`${table}.${column}`);
    34	      } else {
    35	        errors.push({ table, column, error: err.message });
    36	        logger.warn(`  ⚠️  Failed to add column ${table}.${column}: ${err.message}`);
    37	      }
    38	    }
    39	  }
    40	
    41	  logger.info(`🔧 Missing-column check: ${added.length} added, ${skipped.length} already present, ${errors.length} errors`);
    42	  return { added, skipped, errors };
    43	};
    44	
    45	/**
    46	 * Sync indexes and foreign keys safely
    47	 * ENHANCED: Better error handling for constraint creation with detailed categorization
    48	 */
    49	const syncIndexesAndConstraints = async () => {
    50	  try {
    51	    logger.info('🔗 ENHANCED: Syncing database indexes and constraints with enhanced error handling...');
    52	    
    53	    // Use safer sync options that won't drop existing constraints
    54	    await sequelize.sync({ 
    55	      alter: { 
    56	        drop: false  // Never drop existing constraints
    57	      },
    58	      hooks: false,  // Skip hooks for performance
    59	      logging: (sql) => {
    60	        // Only log constraint-related operations
    61	        if (sql.includes('CONSTRAINT') || sql.includes('INDEX')) {
    62	          logger.debug(`DB Constraint: ${sql}`);
    63	        }
    64	      }
```

## APPENDIX B — the gating

```javascript
     1	
     2	export const shouldRunProductionDatabaseSync = ({
     3	  nodeEnv = process.env.NODE_ENV,
     4	  startupDatabaseRepair = process.env.STARTUP_DATABASE_REPAIR,
     5	} = {}) => {
     6	  if (startupDatabaseRepair === 'true') return true;
     7	  if (startupDatabaseRepair === 'false') return false;
     8	  return nodeEnv === 'production';
     9	};
    10	
    11	export const validateAdminAccessCode = ({
    12	  nodeEnv = process.env.NODE_ENV,
    13	  adminAccessCode = process.env.ADMIN_ACCESS_CODE,
    14	} = {}) => {
    15	  if (nodeEnv !== 'production') return { ok: true, skipped: true };
    16	
    17	  const code = typeof adminAccessCode === 'string' ? adminAccessCode.trim() : '';
...
     1	
     2	    // Development database sync (NEVER in production)
     3	    if (!isProduction && process.env.AUTO_SYNC === 'true') {
     4	      try {
     5	        await sequelize.sync({ alter: true }); 
     6	        logger.info('Database synchronized in development mode');
     7	      } catch (syncError) {
     8	        logger.error(`Error syncing database: ${syncError.message}`);
     9	      }
    10	    } else if (!shouldRunProductionDatabaseSync()) {
    11	      logger.info(
    12	        'Database repair sync skipped outside production; set STARTUP_DATABASE_REPAIR=true to run it locally.',
    13	      );
    14	    } else {
    15	      // ENHANCED: Production-safe database sync with dependency-aware table creation
    16	      try {
    17	      const syncResult = await syncDatabaseSafely();
    18	      if (syncResult.success) {
```
