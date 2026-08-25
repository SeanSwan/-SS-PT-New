---
decision: The migration shadow check is structurally vacuous as built — both "ACTUAL GATE" steps are incapable of failing on a broken migration, and the seeded data is never migrated against.
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-24
rule_basis: Rule 73 (proof-before-done), Rule 17/61 (hostile pass), Rule 51 (confidence tags)
---

# Claude hostile review R1 — SWA-200 migration shadow check

Reviewer note: I built part of the merge I am reviewing. Findings below are proven by
execution or by unambiguous code path, not by reading intent.

## The two findings that invalidate the gate

### G1 [CRITICAL] `npm run migrate:production` exits 0 when migrations genuinely fail

`backend/scripts/safe-migrate.mjs:195-203` — on a genuine migration failure the runner:

```
failed++;
// Mark as done anyway to prevent blocking future deploys
await markAsCompleted(seq, migration);
```

and then at `:214-217`:

```
if (failed > 0) {
  console.log('WARNING: Some migrations had genuine failures.');
}
```

...and returns. **`[VERIFIED]` the entire file contains exactly two `process.exit(1)` calls —
`:160` (database *connection* failure) and `:222` (inside `main().catch`, an unhandled throw).
Neither is reachable from `failed > 0`.** The process exits 0.

**Consequence:** workflow steps `Run migrations against the shadow database (empty)` (yml:121)
and `Run migrations AGAIN` (yml:167) — both labelled "THE ACTUAL GATE" in their own comments —
**cannot fail on a broken migration.** A PR whose migration drops a column goes green.

**Second consequence, production, and it is worse:** the same code runs on every Render deploy.
A migration that fails in production is *recorded in `SequelizeMeta` as applied* and never
retried. That is silent schema drift with a green deploy log.

### G2 [CRITICAL] Leg 2 runs zero migrations, so the seeded rows are never tested

`safe-migrate.mjs:165` — `const pending = allFiles.filter(f => !executed.has(f))`, and `:171-175`
returns early when `pending.length === 0`.

Leg 1 (yml:121) applies all **307** migrations to an empty database. The seeder then inserts
rows into the resulting schema. Leg 2 (yml:167) recomputes `pending` — every migration is now in
`SequelizeMeta`, including the ones marked done after failing — so `pending` is empty and it
prints *"No pending migrations. All up to date!"* and returns.

**Nothing migrates against the seeded data.** The classes the workflow comment claims to catch
at yml:163-166 — *"a NOT NULL added to a filled column, a unique index over existing rows"* —
each ran during leg 1 against **empty** tables and never run again.

The seeding layer is the entire reason the two workflow surfaces were merged, and the target of
15 rounds of panel review. As wired, it does not achieve its stated purpose. To work, the split
must be **migrations that exist on main → seed → migrations new in this change**.

## Environment findings — the gate may not survive its first run

### G3 [CRITICAL] `sequelize-cli` is absent at migrate time

`[VERIFIED]` by execution:
- `NODE_ENV=production npm config get omit` → `dev` (npm 11.4.2)
- `npm ls --omit=dev sequelize-cli` → **(empty)** — devDependency only, not transitively reachable

yml:89 sets `NODE_ENV: production` job-wide; yml:105 runs `npm install`. So `sequelize-cli` is
not installed, and `safe-migrate.mjs:83` spawns `npx sequelize-cli` **once per migration**.
Every invocation depends on npx resolving the package over the network mid-job.

`[VERIFIED]` `render.yaml:26-27` sets the same `NODE_ENV=production`, so **production deploys
have this property today** — every deploy's migration step depends on a live npm registry fetch.

### G4 [HIGH] The 20-minute job timeout is likely unreachable

307 migrations × one `npx` spawn each (`safe-migrate.mjs:68-83`, `shell: true`) = 307 sequential
process launches in leg 1, each paying shell + npx + sequelize-cli + config + connect cost.
`timeout-minutes: 20` (yml:68) also has to cover `npm install` and seeding 217 models.
`[LIKELY]` timeout. Compounded by G3 if each npx also resolves over the network.

## Workflow defects

- **G5 [HIGH]** yml:132-137 — the seed step has no `shell:`, so GitHub's default `bash -e {0}`
  applies. When the seeder exits non-zero bash aborts at yml:134; `status=$?`, the `cat` that
  appends stderr, and `exit $status` are **unreachable**. Stderr is discarded exactly when the
  seeder fails, and yml:197-203 uploads only `seed-shadow.log` — `seed-shadow.err` is never
  uploaded. The diagnostic is lost precisely when it is needed.
- **G6 [HIGH]** yml:52-56 — the `push:` path filter (4 entries) is a strict subset of the
  `pull_request:` filter at yml:40-49 (9 entries). A push to main touching `render.yaml`,
  `backend/package.json`, `pre-migrate-guard.mjs`, or the workflow itself runs **no** check.
- **G7 [HIGH]** On `push → main`, Render auto-deploys in parallel; GitHub Actions cannot block
  it. On that path this is a notification, not a gate. It gates only via **branch protection on
  PRs**, which is not configured and is not a repo file — it is a GitHub setting Sean must set.
- **G8 [MEDIUM]** yml:178 computes `ENTRY` from `package.json.main`, prints it, then discards
  it — yml:183 reads `process.env.ENTRY`, hardcoded at yml:194-195. Prints one thing, tests
  another. Benign only because both currently equal `server.mjs`.
- **G9 [MEDIUM]** yml:180-193 — the 20s timeout calls `process.exit(0)`. A hung import passes.
- **G10 [MEDIUM]** yml:114-116 runs the guard's `--check` **before** the first migration, so
  `SELECT name FROM "SequelizeMeta"` throws on the empty database. The guard's inner catch
  swallows it and exits 0. The step named *"Report the pending migration set before running it"*
  reports nothing and passes green.

## `pre-migrate-guard.mjs` — never reviewed by anyone

- **G11 [HIGH]** `[VERIFIED]` it is wired into **nothing**. Its header calls it *"the rails that
  were missing in front of migrate:production"*, but `render.yaml:20` runs
  `npm run migrate:production` directly. Its `--run` mode — the whole reason it owns the
  migration to hold the advisory lock — has no caller. It guards production zero percent.
  Rule 75 (trailhead-truth): the file's documentation describes rails that are not installed.
- **G12 [MEDIUM]** its header cites `render.yaml:66` for the migrate command twice. `[VERIFIED]`
  the real line is **20**; line 66-67 is the *frontend* build command.
- **G13 [MEDIUM]** `:361` detects main-module by basename
  (`import.meta.url.endsWith(argv[1] basename)`). Combined with this repo's documented practice
  that *local dev uses the production database via `DATABASE_URL`*, an accidental direct run
  takes a real advisory lock on production.
- **G14 [LOW]** `pendingCount = pending.length;` is duplicated on consecutive lines.

## What I have NOT proven

- `[UNVERIFIED]` whether `npx` in a non-TTY CI shell auto-installs `sequelize-cli` or errors.
  Only the first real run settles it. This is the single largest unknown.
- `[UNVERIFIED]` actual wall-clock for 307 migrations on a GitHub runner. G4 is an estimate.
- `[UNVERIFIED]` whether production deploys currently succeed *because* npx fetches
  sequelize-cli, or because of something not visible in the repo.

## G15 [CRITICAL] — added after G1/G2: the failure classifier swallows the exact errors the seeder exists to produce

`safe-migrate.mjs:30-39` classifies a migration failure as "already applied" — marks it done in
`SequelizeMeta`, counts it as `skipped`, and continues — when stderr matches any of:

```
/duplicate key value/i
/violates foreign key constraint/i     // commented: "FK refs existing data = table was already set up"
/already exists/i  /relation .+ already exists/i  /column .+ ... already exists/i
/index .+ already exists/i  /constraint .+ already exists/i  /type .+ already exists/i
```

The workflow's own justification for the seeding leg (yml:163-166) is that a populated database
catches *"a NOT NULL added to a filled column, a unique index over existing rows."*

**A unique index created over duplicate rows fails with `duplicate key value`.** That string is
pattern #2. So the seeder's headline failure class is explicitly classified as success, marked
applied, and skipped.

Likewise, with rows present, a migration adding a bad FK fails with
`violates foreign key constraint` — pattern #8, also classified as success.

**This is independent of G1 and survives the obvious fix for it.** Making the runner exit
non-zero on `failed > 0` would not catch either case, because both increment `skipped`, not
`failed`. A correct gate must narrow these patterns (or disable the heuristic entirely) when
running against a shadow database, where "already exists" cannot legitimately occur — the
database was created empty seconds earlier.

**Severity rationale:** the seeding layer is the reason two workflow surfaces were merged and
the subject of 15 rounds of review. G2 means it never runs; G15 means that even once it runs,
its two headline classes are swallowed. Both must be fixed or the layer is decorative.
