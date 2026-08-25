# SWA-200 FINAL-STATE REVIEW PACKET — migration shadow check

**Remit: hostile review. Find what makes this gate fail on its FIRST real run, and find what
makes it PASS VACUOUSLY. A green check that proves nothing is the failure mode this whole
workstream exists to eliminate — it has already happened twice in this codebase.**

## State — read this before reviewing

Three deliverables are committed **locally and unpushed** on a wip branch. **The CI job has
never executed. Not once.** The seeder has never touched a real database; only its DB-free
self-test has run (36/36 pass).

| File | Lines | Review history |
|---|---|---|
| `.github/workflows/migration-shadow-check.yml` | 220 | **NEVER reviewed in this merged form.** It is a 2026-08-24 merge of two rival copies that grew apart on separate branches. |
| `backend/scripts/pre-migrate-guard.mjs` | 366 | **NEVER reviewed by anyone.** Came from the other branch. |
| `backend/scripts/seed-shadow-db.mjs` | 593 | 15 rounds of panel review — the most-reviewed file here. Included for context only; prefer attacking the two above. |

## Verified environment facts (I executed these — do not re-derive, do challenge)

- `render.yaml:20` = `cd backend && npm install && npm run migrate:production`
- `migrate:production` = `node scripts/safe-migrate.mjs production`
- `safe-migrate.mjs:83` = `spawn('npx', ['sequelize-cli','db:migrate',...])`
- `sequelize-cli` is a **devDependency**; `pg` and `sequelize` are regular dependencies
- `NODE_ENV=production npm config get omit` → `dev`  (npm 11.4.2)
- `npm ls --omit=dev sequelize-cli` → **(empty)**
- `render.yaml:26-27` sets `NODE_ENV=production` for the backend service
- `backend/package.json` `main` = `server.mjs`; `type` = `module`
- Neither `pre-migrate-guard.mjs` nor `seed-shadow-db.mjs` is referenced by `render.yaml`,
  `package.json` scripts, or any backend runtime file. Only the CI workflow calls them.

## The plan I intend to execute after this review

The workflow triggers only on `pull_request → main` and `push → main`. The branch holding this
work is **2221 commits behind main** and carries 413 unrelated commits, so a PR from it is
unusable. Plan: cut a clean branch from `origin/main` carrying only these deliverables, open a
PR to main, let the workflow run for the first time, fix what the real run surfaces, merge.

**Attack this plan too**, not just the code.

## My own findings — ATTACK THESE

A finding of mine you can REFUTE is worth more to me than one you confirm. I have been wrong
before in this exact workstream and want the corrections.

- **C1 CRITICAL** — job-level `NODE_ENV: production` (yml:89) + `npm install` (yml:105) omits
  devDeps, so `sequelize-cli` is absent, so every `npm run migrate:production` depends on `npx`
  fetching it from the network mid-job. The gate may fail at step 1 for an environment reason
  and never test a migration. **Corollary: production deploys have this same property today.**
- **C2 CRITICAL** — the seed step (yml:132-137) is dead code under `set -e`. GitHub's default
  shell is `bash -e {0}`. When the seeder exits non-zero, bash aborts at line 134; `status=$?`,
  the `cat` that appends stderr, and `exit $status` never run. **Stderr is discarded exactly
  when the seeder fails**, and `seed-shadow.err` is never uploaded (yml:202 uploads only `.log`).
- **C3 HIGH** — `pre-migrate-guard.mjs` is **wired into nothing**. Its own header calls it "the
  rails that were missing in front of migrate:production" but `render.yaml` never invokes it. It
  guards production zero percent. Its `--run` mode, the whole reason it owns the migration, has
  no caller.
- **C4 HIGH** — guard header cites `render.yaml:66` for the migrate command; the real line is
  **20**. Line 66-67 is the *frontend* build. Wrong citation in a never-reviewed file.
- **C5 HIGH** — `push:` path filter (yml:52-56, 4 entries) is a strict subset of the
  `pull_request:` filter (yml:40-49, 9 entries). A push to main touching `render.yaml`,
  `package.json`, or `pre-migrate-guard.mjs` runs **no** shadow check.
- **C6 HIGH** — on `push → main`, Render auto-deploys **in parallel** with this job. GitHub
  Actions cannot block a Render deploy. So on the push path this is a notification, not a gate.
  It only truly gates via branch protection on PRs.
- **C7 MEDIUM** — entry-point check (yml:180-193): the 20s timeout calls `process.exit(0)`. A
  genuinely hung import is reported as PASS.
- **C8 MEDIUM** — yml:178 computes `ENTRY` from `package.json.main`, prints it, then **discards
  it**: yml:183 reads `process.env.ENTRY`, set to the hardcoded literal at yml:194-195. Prints
  one thing, tests another. Benign today only because both equal `server.mjs`.
- **C9 MEDIUM** — the guard's `--check` step (yml:116) runs BEFORE the first migration, so
  `SELECT name FROM "SequelizeMeta"` throws on an empty DB. The inner catch swallows it. The
  step named "Report the pending migration set" reports nothing and passes green.
- **C10 LOW** — `pendingCount = pending.length;` is duplicated on consecutive lines in the guard.
- **C11 MEDIUM** — the guard's main-module detection (`import.meta.url.endsWith(basename)`)
  fires on basename alone. Note this repo's CLAUDE.md says *local dev uses the production DB via
  `DATABASE_URL`* — so an accidental direct run takes a real advisory lock on production.

## What I want back

Verdict block, then findings. For each finding: file + line, the concrete failure, and how you
would prove it. Severity honestly — do not pad. **Say plainly if a finding of mine does not
reproduce.** If you have nothing new, say so; a dry round is a real result.

---

## FILE 1 — .github/workflows/migration-shadow-check.yml (220 lines, NEVER reviewed merged)

```yaml
     1	name: Migration Shadow Check
     2	
     3	# WHY THIS EXISTS (SWA-200, panel 2026-08-23)
     4	# -------------------------------------------
     5	# Ox Alpha, asked what nobody was proposing: "everyone is guarding the push; nobody is
     6	# guarding the migration." render.yaml builds `main` with `npm run migrate:production`, so a
     7	# push to main runs migrations against the production database, unsupervised.
     8	#
     9	# Every gate built before this one is CLIENT-SIDE — pre-commit and pre-push hooks, living in
    10	# the same clients they police. GLM: "nothing distinguishes 'gate passed' from 'gate not
    11	# installed'." Verified: a fresh clone has core.hooksPath unset and every hook silently skips.
    12	# Kimi, on the local backend audit: "it's a deploy-safety gate wearing a commit-hygiene
    13	# costume. It belongs at the deploy boundary, not the push boundary."
    14	#
    15	# This is that boundary. It runs on GitHub, from the pushed SHA, against a throwaway
    16	# database. It cannot be skipped with --no-verify, cannot be missing because a checkout
    17	# forgot to configure hooks, and — unlike every local gate — it tests THE ARTIFACT THAT
    18	# ACTUALLY DEPLOYS rather than the state of somebody's laptop.
    19	#
    20	# NOT PRODUCTION. The `postgres` service below is an empty ephemeral container that lives and
    21	# dies with the job. No production credential is used, and none should ever be added: the
    22	# whole value is that this is the one place migrations can fail harmlessly.
    23	#
    24	# MERGED SURFACE (2026-08-24, Fable — SWA-200 reconciliation). This file existed twice: this
    25	# branch's rails version (deploy-parity install, SHA-pinned, migrate-twice, entry-point boot
    26	# proof) and an untracked local version carrying a 15-round-panel-reviewed SEEDING layer.
    27	# Neither was a superset. This is the merge: rails as base, the seeder inserted between the
    28	# two migration runs — so the second run now executes against a POPULATED database, which is
    29	# exactly the limitation the original header admitted ("an empty database is not
    30	# production... a NOT NULL added to a populated column, a unique index over existing
    31	# duplicates"). Synthetic deterministic rows, zero PII, no snapshot-handling decision needed.
    32	# Panel items carried: anchored report grep (5), stderr captured without interleaving (10,
    33	# resolved via split streams), selftest as a pre-DB gate (9 — RE-DECIDED to run after
    34	# `npm install`, the deploy-parity install this base uses; the panel ratified "after npm ci"
    35	# against the other copy without knowing install mode was load-bearing).
    36	
    37	on:
    38	  pull_request:
    39	    branches: [main]
    40	    paths:
    41	      - 'backend/migrations/**'
    42	      - 'backend/models/**'
    43	      - 'backend/scripts/safe-migrate.mjs'
    44	      - 'backend/scripts/pre-migrate-guard.mjs'
    45	      - 'backend/scripts/seed-shadow-db.mjs'
    46	      - 'backend/scripts/seed-shadow-db.selftest.mjs'
    47	      - 'backend/package.json'
    48	      - 'render.yaml'
    49	      - '.github/workflows/migration-shadow-check.yml'
    50	  push:
    51	    branches: [main]
    52	    paths:
    53	      - 'backend/migrations/**'
    54	      - 'backend/models/**'
    55	      - 'backend/scripts/safe-migrate.mjs'
    56	      - 'backend/scripts/seed-shadow-db.mjs'
    57	  workflow_dispatch:
    58	
    59	concurrency:
    60	  # One shadow run per ref. A superseded run tells you about a SHA nobody is deploying.
    61	  group: migration-shadow-${{ github.ref }}
    62	  cancel-in-progress: true
    63	
    64	jobs:
    65	  shadow-migrate:
    66	    runs-on: ubuntu-latest
    67	    name: Migrations run clean on a throwaway database — twice, the second time with data
    68	    timeout-minutes: 20
    69	
    70	    services:
    71	      postgres:
    72	        image: postgres:16
    73	        env:
    74	          POSTGRES_USER: shadow
    75	          POSTGRES_PASSWORD: shadow
    76	          POSTGRES_DB: shadow
    77	        ports: ['5432:5432']
    78	        options: >-
    79	          --health-cmd "pg_isready -U shadow"
    80	          --health-interval 5s
    81	          --health-timeout 5s
    82	          --health-retries 10
    83	
    84	    env:
    85	      # Local container only. Never a production credential — see the header. The password
    86	      # and the URL are the SAME literal on purpose (panel item 4): a mismatch here once let
    87	      # an auth check pass vacuously because the broken URL still parsed.
    88	      DATABASE_URL: [db-url: scheme=postgres, user=shadow, password=shadow, host=localhost:5432, db=shadow — throwaway CI container, all three literals deliberately identical]
    89	      NODE_ENV: production
    90	
    91	    steps:
    92	      - name: Check out the pushed SHA
    93	        uses: actions/checkout@v4
    94	
    95	      - uses: actions/setup-node@v4
    96	        with:
    97	          node-version: '22'
    98	
    99	      # Deliberately `npm install`, not `npm ci` — it is what render.yaml runs. A shadow
   100	      # check that installs differently from the deploy is testing a different artifact.
   101	      # (Interim per SWA-200: the durable fix is moving the DEPLOY to a lockfile-exact
   102	      # install and bringing this gate with it — hermetic on both ends. Separate ticket.)
   103	      - name: Install backend dependencies exactly as the deploy does
   104	        working-directory: backend
   105	        run: npm install --no-audit --no-fund
   106	
   107	      # Panel item 9, RE-DECIDED: the seeder's DB-free contract selftest runs before the
   108	      # database is touched. A broken generator contract fails here — cheaply, with full
   109	      # output — instead of surfacing later as a silent empty database.
   110	      - name: Seeder self-test (DB-free core contract)
   111	        working-directory: backend
   112	        run: node scripts/seed-shadow-db.selftest.mjs
   113	
   114	      - name: Report the pending migration set before running it
   115	        working-directory: backend
   116	        run: node scripts/pre-migrate-guard.mjs --check
   117	
   118	      # THE ACTUAL GATE, leg 1. If migrations cannot apply to an empty database from this
   119	      # SHA, the deploy would carry them to production and fail there instead — mid-build,
   120	      # after the push has already been accepted.
   121	      - name: Run migrations against the shadow database (empty)
   122	        working-directory: backend
   123	        run: npm run migrate:production
   124	
   125	      # The seeder's internal gate refuses any URL that is not loopback + "shadow", with no
   126	      # override switch — it structurally cannot point at production. Streams are captured
   127	      # SEPARATELY and concatenated after (panel item 10 as amended): stdout and stderr into
   128	      # one file via `2>&1` can interleave mid-line and break the anchored grep below — the
   129	      # open GLM/Grok finding on the panel's own fix. Split files cannot interleave.
   130	      - name: Seed synthetic rows (shadow-only by internal gate)
   131	        working-directory: backend
   132	        run: |
   133	          set -o pipefail
   134	          node scripts/seed-shadow-db.mjs --rows 5 > seed-shadow.log 2> seed-shadow.err
   135	          status=$?
   136	          cat seed-shadow.err >> seed-shadow.log
   137	          exit $status
   138	
   139	      # Panel item 5: anchor to the exact report shape "SHADOW-SEED {" — the bare prefix
   140	      # also matches OK/SKIP/note lines, and the report is the ONLY line with the JSON body.
   141	      - name: Assert seed actually inserted rows (SHADOW-SEED rows > 0)
   142	        working-directory: backend
   143	        shell: bash
   144	        run: |
   145	          if [ ! -f seed-shadow.log ]; then
   146	            echo "FATAL: seed-shadow.log is missing — the seed step did not run"
   147	            exit 1
   148	          fi
   149	          line=$(grep '^SHADOW-SEED {' seed-shadow.log | tail -1)
   150	          if [ -z "$line" ]; then
   151	            echo "FATAL: no SHADOW-SEED report line found — silent no-op seed"
   152	            cat seed-shadow.log
   153	            exit 1
   154	          fi
   155	          echo "$line"
   156	          rows=$(echo "$line" | sed -E 's/^SHADOW-SEED //' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).rows||0)})")
   157	          echo "rows inserted: $rows"
   158	          if [ "$rows" -le 0 ]; then
   159	            echo "FATAL: seeder reported zero rows — the second migration run would test nothing"
   160	            exit 1
   161	          fi
   162	
   163	      # THE ACTUAL GATE, leg 2 — the reason the seeder exists. Render can rebuild the same
   164	      # SHA (manual redeploy, cache miss, a restart), so migrations must be idempotent; and
   165	      # running them against POPULATED tables is what catches the class an empty database
   166	      # cannot: a NOT NULL added to a filled column, a unique index over existing rows.
   167	      - name: Run migrations AGAIN — idempotent, and now against data
   168	        working-directory: backend
   169	        run: npm run migrate:production
   170	
   171	      # The failure this whole layer exists for is a boot crash: ERR_MODULE_NOT_FOUND from an
   172	      # untracked file, or a missing-export SyntaxError from an uncommitted one. Rule 42's
   173	      # local gate infers that from the pusher's working tree. This imports the entry point
   174	      # from the pushed SHA and finds out.
   175	      - name: Prove the backend entry point actually loads from this SHA
   176	        working-directory: backend
   177	        run: |
   178	          ENTRY=$(node -p "require('./package.json').main || 'server.mjs'")
   179	          echo "entry point: $ENTRY"
   180	          node --input-type=module -e "
   181	            const t = setTimeout(() => { console.log('loaded; exiting before the server settles'); process.exit(0); }, 20000);
   182	            try {
   183	              await import('./' + process.env.ENTRY);
   184	              clearTimeout(t);
   185	              console.log('entry point imported without throwing');
   186	              process.exit(0);
   187	            } catch (e) {
   188	              clearTimeout(t);
   189	              console.error('ENTRY POINT FAILED TO LOAD — this SHA would crash-loop on Render:');
   190	              console.error(e && e.stack || e);
   191	              process.exit(1);
   192	            }
   193	          "
   194	        env:
   195	          ENTRY: server.mjs
   196	
   197	      - name: Upload seed report
   198	        if: always()
   199	        uses: actions/upload-artifact@v4
   200	        with:
   201	          name: seed-shadow-log
   202	          path: backend/seed-shadow.log
   203	          if-no-files-found: ignore
   204	
   205	      - name: Summary
   206	        if: always()
   207	        run: |
   208	          echo "### Migration shadow check" >> $GITHUB_STEP_SUMMARY
   209	          echo "" >> $GITHUB_STEP_SUMMARY
   210	          echo "Ran the pushed SHA's migrations against a throwaway Postgres — once empty," >> $GITHUB_STEP_SUMMARY
   211	          echo "then seeded deterministic synthetic rows and ran them AGAIN against data" >> $GITHUB_STEP_SUMMARY
   212	          echo "(idempotence + populated-schema classes), then imported the backend entry" >> $GITHUB_STEP_SUMMARY
   213	          echo "point to prove this SHA boots." >> $GITHUB_STEP_SUMMARY
   214	          echo "" >> $GITHUB_STEP_SUMMARY
   215	          echo "This tests the artifact that deploys — not the state of anyone's working" >> $GITHUB_STEP_SUMMARY
   216	          echo "tree — and cannot be skipped with \`--no-verify\` or an unconfigured" >> $GITHUB_STEP_SUMMARY
   217	          echo "\`core.hooksPath\`." >> $GITHUB_STEP_SUMMARY
   218	          echo "" >> $GITHUB_STEP_SUMMARY
   219	          echo "**Limit:** synthetic rows are not production data. The stronger version" >> $GITHUB_STEP_SUMMARY
   220	          echo "restores a production snapshot — see SWA-200." >> $GITHUB_STEP_SUMMARY
```

## FILE 2 — backend/scripts/pre-migrate-guard.mjs (366 lines, NEVER reviewed)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * pre-migrate-guard.mjs — the rails that were missing in front of migrate:production.
     4	 *
     5	 * WHY THIS EXISTS (SWA-200, panel 2026-08-23)
     6	 * -------------------------------------------
     7	 * Ox Alpha, answering "what is nobody proposing": **everyone is guarding the push; nobody is
     8	 * guarding the migration.** A full day went into making pushes safe — Rules 42, 6, 45, 59, a
     9	 * pre-push gate, a pre-commit gate. None of it protects the database once the push lands.
    10	 *
    11	 * `render.yaml:66` builds `main` with `npm run migrate:production`, which is
    12	 * `safe-migrate.mjs`. That script is genuinely good at RECOVERING from a bad migration — it
    13	 * carries a quarantine ledger, retry caps and a data-critical lane. Measured, it contains
    14	 * zero occurrences of: backup, advisory lock, pg_dump, rollback, smoke, verify, snapshot.
    15	 * It handles failure well and prevents nothing.
    16	 *
    17	 * So every push to main runs migrations against production with no backup taken first and
    18	 * nothing stopping two deploys from migrating at once.
    19	 *
    20	 * WHAT THIS DOES, IN ORDER
    21	 * ------------------------
    22	 *   1. ADVISORY LOCK  — pg_try_advisory_lock. Concurrent deploys are the one case where
    23	 *                       continuing is worse than stopping, so this HALTS even in warn mode.
    24	 *   2. PENDING SET    — names the migrations that are about to run, before they run.
    25	 *   3. BACKUP         — delegates to backup-db.mjs (SWA-122: proven restorable, not assumed).
    26	 *
    27	 * FAIL-OPEN BY DEFAULT — and that is deliberate
    28	 * ---------------------------------------------
    29	 * This runs inside the Render build. A bug here takes down every deploy, including the one
    30	 * that would fix it. So in the default mode it WARNS and exits 0: a guard that can brick the
    31	 * deploy pipeline gets ripped out within a day, and then there is no guard at all.
    32	 *
    33	 * Set `SWAN_MIGRATE_GUARD=enforce` to make backup failure fatal. The intended path is: ship
    34	 * warning-only, read a few real deploys, then flip it. Earning enforcement beats asserting it.
    35	 *
    36	 * THE ONE EXCEPTION: the advisory lock halts in BOTH modes. Fail-open on concurrency would
    37	 * mean two processes migrating the same database simultaneously — the exact thing the lock
    38	 * exists to prevent, and unrecoverable in a way a missing backup is not.
    39	 *
    40	 * NOT A SUBSTITUTE FOR THE SERVER-SIDE GATE. The panel's stronger recommendation is a CI job
    41	 * that boots the backend from the pushed SHA and migrates a shadow database BEFORE Render
    42	 * deploys (see .github/workflows/migration-shadow-check.yml). This is the last line, not the
    43	 * first. Kimi: "keep the local gate, stop pretending it's the control."
    44	 *
    45	 * Usage:
    46	 *   node scripts/pre-migrate-guard.mjs            # warn-only (default)
    47	 *   SWAN_MIGRATE_GUARD=enforce node scripts/...   # backup failure is fatal
    48	 *   node scripts/pre-migrate-guard.mjs --check    # report only; never backs up, never locks
    49	 */
    50	import { spawnSync } from 'node:child_process';
    51	import { existsSync } from 'node:fs';
    52	import path from 'node:path';
    53	
    54	const ARGS = process.argv.slice(2);
    55	const CHECK_ONLY = ARGS.includes('--check');
    56	const ENFORCE = process.env.SWAN_MIGRATE_GUARD === 'enforce';
    57	const MODE = CHECK_ONLY ? 'check-only' : ENFORCE ? 'enforce' : 'warn-only';
    58	
    59	/**
    60	 * Stable 64-bit key for the deploy-migration lock. Any constant works as long as every
    61	 * deploy uses the SAME one; it is derived from a fixed string rather than a magic number so
    62	 * a reader can see where it came from and nobody "tidies" it into a different value.
    63	 */
    64	export function advisoryLockKey(label = 'swanstudios:deploy-migrate') {
    65	  let h = 0n;
    66	  for (const ch of label) h = (h * 131n + BigInt(ch.codePointAt(0))) % (2n ** 63n - 1n);
    67	  return h;
    68	}
    69	
    70	/** @returns {{ok:boolean, reason:string}} — pure, so the decision table is testable. */
    71	export function decideOutcome({ lockAcquired, lockVerified, backupOk, enforce, checkOnly }) {
    72	  if (checkOnly) return { ok: true, reason: 'check-only: nothing was locked, nothing was backed up' };
    73	  if (!lockAcquired) {
    74	    return {
    75	      ok: false,
    76	      reason: 'another migration holds the deploy lock. Two deploys migrating the same database '
    77	        + 'at once is the one failure this guard will not wave through, in any mode.',
    78	    };
    79	  }
    80	  // A lock the database does not report holding is not a lock. Under a transaction-mode
    81	  // pooler this is the normal case, and it fails in exactly the direction that logs success.
    82	  // Warn mode proceeds and SAYS SO; enforce refuses to pretend concurrency is protected.
    83	  if (lockVerified === false && enforce) {
    84	    return {
    85	      ok: false,
    86	      reason: 'the advisory lock was taken but is NOT visible in pg_locks for this backend — '
    87	        + 'almost certainly a transaction-mode pooler, where session advisory locks do nothing. '
    88	        + 'SWAN_MIGRATE_GUARD=enforce will not proceed as though concurrency were protected.',
    89	    };
    90	  }
    91	  if (lockVerified === false) {
    92	    return {
    93	      ok: true,
    94	      reason: 'lock UNVERIFIED (not visible in pg_locks) — concurrency is effectively '
    95	        + 'unprotected; continuing because this guard is warn-only by default',
    96	    };
    97	  }
    98	  if (!backupOk && enforce) {
    99	    return { ok: false, reason: 'backup failed and SWAN_MIGRATE_GUARD=enforce' };
   100	  }
   101	  if (!backupOk) {
   102	    return { ok: true, reason: 'backup FAILED — continuing because this guard is warn-only by default' };
   103	  }
   104	  return { ok: true, reason: 'lock held and verified, backup verified' };
   105	}
   106	
   107	
   108	/**
   109	 * ATTESTATION — the positive signal (Kimi K3, panel 2026-08-23).
   110	 *
   111	 * "The guard is fail-open with no positive signal, which means its failure state and its
   112	 *  healthy state produce identical output on a successful deploy. You have built a safety
   113	 *  device that cannot distinguish 'I am working' from 'I am dead.' It converts 'we have no
   114	 *  protection' — a known, actionable fact — into 'we believe we have protection', an
   115	 *  unknown, unactionable falsehood."
   116	 *
   117	 * That is correct, and it is the SAME defect GLM found in the hook layer earlier the same
   118	 * day: nothing distinguished "gate passed" from "gate not installed." I fixed that one and
   119	 * then rebuilt it here within hours, in a fail-open guard whose silence means nothing.
   120	 *
   121	 * So the guard now emits one machine-checkable line on every run, including the runs where
   122	 * it stands down. Absence of this line in a deploy log is now itself a finding — which is
   123	 * the whole point: you can check for PRESENCE, not merely for absence of errors.
   124	 */
   125	export const ATTEST_PREFIX = 'PRE-MIGRATE-ATTESTATION';
   126	
   127	export function attestation(fields) {
   128	  return `${ATTEST_PREFIX} ${JSON.stringify({
   129	    v: 1,
   130	    at: new Date(fields.now ?? Date.now()).toISOString(),
   131	    mode: fields.mode,
   132	    locked: Boolean(fields.locked),
   133	    // false here means the lock did not show up in pg_locks for this backend — almost
   134	    // always a transaction-mode pooler, where session advisory locks silently do nothing.
   135	    lockVerified: fields.lockVerified === undefined ? null : Boolean(fields.lockVerified),
   136	    backup: fields.backup,
   137	    pending: fields.pending ?? null,
   138	    outcome: fields.outcome,
   139	  })}`;
   140	}
   141	
   142	/** Parse a deploy log and answer the only question that matters: did the guard run at all? */
   143	export function findAttestation(logText) {
   144	  for (const line of String(logText ?? '').split('\n')) {
   145	    const i = line.indexOf(ATTEST_PREFIX);
   146	    if (i === -1) continue;
   147	    try { return JSON.parse(line.slice(i + ATTEST_PREFIX.length).trim()); } catch { /* keep looking */ }
   148	  }
   149	  return null;
   150	}
   151	
   152	const log = (...m) => console.log('[pre-migrate]', ...m);
   153	const warn = (...m) => console.error('[pre-migrate]', ...m);
   154	
   155	async function main() {
   156	  const url = process.env.DATABASE_URL;
   157	  if (!url) {
   158	    warn('DATABASE_URL is not set — nothing to guard. Exiting 0 so a non-DB build is unaffected.');
   159	    console.log(attestation({ mode: 'no-db-url', locked: false, backup: 'skipped', outcome: 'stood-down' }));
   160	    process.exit(0);
   161	  }
   162	
   163	  log(`mode=${MODE}`);
   164	
   165	  // THE LOCK RIDES A DEDICATED, UNPOOLED CLIENT — NEVER THE SEQUELIZE POOL.
   166	  //
   167	  // GLM 5.3, panel 2026-08-23, on the previous version of this file: "Lock lifetime = TCP
   168	  // session lifetime; the thing it protects = the migration's lifetime; the guard's intent =
   169	  // 'until the child exits.' These are three different clocks and the build assumes they're
   170	  // one. The lock connection is IDLE for the entire migration, and idle sessions are exactly
   171	  // what gets reaped."
   172	  //
   173	  // Confirmed by reading it back: the guard called `new Sequelize(url)` with no pool config,
   174	  // so sequelize's defaults applied — min 0, idle 10000. The connection holding the advisory
   175	  // lock would have been returned to the pool and closed roughly TEN SECONDS into a migration
   176	  // that can run for minutes, while the log line said "deploy lock acquired". The lock was
   177	  // vacuous and the logs asserted otherwise — which is worse than no lock, because a
   178	  // postmortem would cite it as a safeguard that existed.
   179	  //
   180	  // This is the third instance today of the same class: a signal that looks right and
   181	  // discriminates nothing. The phrase is in this file's own comments, written before the
   182	  // defect below it.
   183	  //
   184	  // A raw pg Client has no pool, is never returned to one, and stays open until this process
   185	  // exits. keepAlive stops a NAT or load balancer silently dropping an idle session mid-run.
   186	  //
   187	  // STILL UNPROVEN, and stated rather than assumed: if DATABASE_URL transits a pooler in
   188	  // TRANSACTION mode, session-scoped advisory locks are unsupported and this is void from
   189	  // second zero. That cannot be determined from the repo — the URL lives in Render's
   190	  // dashboard. See SWA-200 for the lease-table alternative, which does not depend on session
   191	  // lifetime at all.
   192	  // Imported inside a guarded block for the same reason sequelize was: an unguarded top-level
   193	  // import makes the guard UNLOADABLE wherever the dependency is absent, so it dies before its
   194	  // own fail-open can run — the opposite of the design. I fixed exactly this for sequelize and
   195	  // then reintroduced it with pg in the same file, which is why the attestation below matters:
   196	  // it is the only thing that makes "the guard was never able to start" visible.
   197	  let pg;
   198	  try {
   199	    ({ default: pg } = await import('pg'));
   200	  } catch (e) {
   201	    console.log(attestation({ mode: MODE, locked: false, backup: 'skipped', outcome: 'stood-down-no-pg' }));
   202	    warn(`pg unavailable (${e.code || e.message}) — cannot guard this migration.`);
   203	    if (ENFORCE) { warn('SWAN_MIGRATE_GUARD=enforce — refusing to migrate unguarded.'); process.exit(1); }
   204	    log('continuing (warn-only). The migration is running UNGUARDED.');
   205	    process.exit(0);
   206	  }
   207	  const lockClient = new pg.Client({
   208	    connectionString: url,
   209	    ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
   210	    keepAlive: true,
   211	    application_name: 'swan-pre-migrate-guard',
   212	  });
   213	
   214	  let lockAcquired = false;
   215	  let lockVerified = false;
   216	  let backupOk = false;
   217	  let pendingCount = null;
   218	
   219	  try {
   220	    await lockClient.connect();
   221	
   222	    // 1. ADVISORY LOCK — session-scoped, so it releases automatically if this process dies.
   223	    //    That matters: a lock that could leak would eventually block every deploy, and the
   224	    //    fix for a stuck deploy is always "remove the guard".
   225	    if (!CHECK_ONLY) {
   226	      const key = advisoryLockKey().toString();
   227	      const res = await lockClient.query(`SELECT pg_try_advisory_lock(${key}) AS locked`);
   228	      const rows = res.rows;
   229	      lockAcquired = Boolean(rows?.[0]?.locked);
   230	      log(lockAcquired ? 'deploy lock acquired' : 'deploy lock BUSY — another migration is running');
   231	      // VERIFY THE LOCK IS ACTUALLY HELD — do not assume the connection is direct.
   232	      //
   233	      // GLM 5.3, panel 2026-08-23: "if DATABASE_URL transits Render's pgBouncer in
   234	      // transaction mode, session advisory locks are *unsupported* and the lock is void from
   235	      // second zero... A control that logs 'held' while guaranteed-vacuous is worse than no
   236	      // control; it will be cited in the postmortem as a safeguard that existed."
   237	      //
   238	      // render.yaml wires DATABASE_URL from a Render MANAGED database via
   239	      // `property: connectionString`, which is a direct connection — so this SHOULD be fine.
   240	      // But that is inference from a blueprint whose `databases:` block is commented out, and
   241	      // the live URL lives in Render's dashboard where this code cannot see it.
   242	      //
   243	      // So the guard stops assuming and MEASURES. Under a transaction-mode pooler, a second
   244	      // query is not guaranteed to land on the backend that took the lock — so the lock will
   245	      // not be visible in pg_locks for this backend. That makes the failure detectable from
   246	      // inside, on every real deploy, instead of being an open question in a document.
   247	      //
   248	      // Cheap, and it answers a question a human would otherwise have to answer by hand.
   249	      if (lockAcquired) {
   250	        try {
   251	          const held = await lockClient.query(
   252	            "SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()) AS held",
   253	          );
   254	          lockVerified = Boolean(held.rows?.[0]?.held);
   255	          if (!lockVerified) {
   256	            warn('LOCK NOT VISIBLE in pg_locks for this backend. The connection is almost');
   257	            warn('certainly transiting a pooler in transaction mode, where session advisory');
   258	            warn('locks do not work. Treat concurrency as UNPROTECTED and see SWA-200 for the');
   259	            warn('lease-table alternative, which does not depend on session lifetime.');
   260	          } else {
   261	            log('lock verified held by this backend');
   262	          }
   263	        } catch (e) {
   264	          warn(`could not verify the lock (${e.message}) — treating it as unverified.`);
   265	          lockVerified = false;
   266	        }
   267	      }
   268	    } else {
   269	      lockAcquired = true;
   270	    }
   271	
   272	    // 2. PENDING SET — say what is about to happen while it can still be stopped.
   273	    try {
   274	      const applied = (await lockClient.query('SELECT name FROM "SequelizeMeta" ORDER BY name')).rows;
   275	      const done = new Set(applied.map((r) => r.name));
   276	      const dir = path.resolve(process.cwd(), 'migrations');
   277	      if (existsSync(dir)) {
   278	        const { readdirSync } = await import('node:fs');
   279	        const pending = readdirSync(dir).filter((f) => /\.(c?js)$/.test(f) && !done.has(f)).sort();
   280	        pendingCount = pending.length;
   281	        pendingCount = pending.length;
   282	        log(`applied=${done.size} pending=${pending.length}`);
   283	        for (const p of pending.slice(0, 25)) log(`  PENDING  ${p}`);
   284	        if (pending.length > 25) log(`  … and ${pending.length - 25} more`);
   285	      }
   286	    } catch (e) {
   287	      warn(`could not read the pending set (${e.message}). Not fatal — this step is informational.`);
   288	    }
   289	
   290	    // 3. BACKUP — delegate. backup-db.mjs is the one that was proven restorable (SWA-122);
   291	    //    backup-database.mjs looks like a backup tool and cannot connect to production.
   292	    if (!CHECK_ONLY && lockAcquired) {
   293	      const r = spawnSync('node', ['scripts/backup-db.mjs'], {
   294	        cwd: process.cwd(), encoding: 'utf8', timeout: 15 * 60 * 1000,
   295	      });
   296	      backupOk = r.status === 0;
   297	      log(backupOk ? 'backup completed' : `backup FAILED (exit ${r.status})`);
   298	      if (!backupOk && r.stderr) warn(String(r.stderr).trim().split('\n').slice(-4).join('\n'));
   299	    } else {
   300	      backupOk = true;
   301	    }
   302	  } catch (e) {
   303	    // Kimi K3: a stand-down that emits nothing is the ambiguity this whole attestation
   304	    // exists to remove. This path — the guard could not reach the database at all — is the
   305	    // MOST important one to announce, because it is the one where protection is fully absent.
   306	    console.log(attestation({ mode: MODE, locked: false, backup: 'skipped', outcome: 'stood-down-guard-error' }));
   307	    warn(`guard could not run: ${e.message}`);
   308	    if (ENFORCE) {
   309	      warn('SWAN_MIGRATE_GUARD=enforce — refusing to migrate behind a guard that did not run.');
   310	      console.log(attestation({ mode: MODE, locked: lockAcquired, backup: 'unknown', pending: pendingCount, outcome: 'halted-guard-error' }));
   311	      await lockClient.end().catch(() => {});
   312	      process.exit(1);
   313	    }
   314	    await lockClient.end().catch(() => {});
   315	    console.log(attestation({ mode: MODE, locked: lockAcquired, backup: 'unknown', pending: pendingCount, outcome: 'stood-down-guard-error' }));
   316	    log('continuing (warn-only). The migration is running UNGUARDED.');
   317	    process.exit(0);
   318	  }
   319	
   320	  const verdict = decideOutcome({ lockAcquired, lockVerified, backupOk, enforce: ENFORCE, checkOnly: CHECK_ONLY });
   321	  log(verdict.reason);
   322	
   323	  if (!verdict.ok) {
   324	    await lockClient.end().catch(() => {});
   325	    console.log(attestation({ mode: MODE, locked: lockAcquired, lockVerified, backup: backupOk ? 'ok' : 'failed', pending: pendingCount, outcome: 'halted' }));
   326	    warn('HALTING before migrate:production.');
   327	    process.exit(1);
   328	  }
   329	
   330	  /**
   331	   * WHY THIS RUNS THE MIGRATION INSTEAD OF EXITING FIRST.
   332	   *
   333	   * A Postgres advisory lock is SESSION-scoped: it is released the moment this connection
   334	   * closes. An earlier draft of this file acquired the lock, closed the connection, exited 0,
   335	   * and let the shell run the migration next — which released the lock before the thing it
   336	   * was protecting had started. It would have detected two deploys colliding in the same
   337	   * half-second and nothing else, while reading in every log line as though a lock were held.
   338	   *
   339	   * That is the same shape as the flush-race fix earlier today: a signal that looks right,
   340	   * passes review, and discriminates nothing. So the guard owns the migration. It holds the
   341	   * session open for the whole run, and Postgres drops the lock on disconnect whether this
   342	   * process exits cleanly or is killed — so a crashed deploy cannot wedge the next one.
   343	   */
   344	  const runIdx = ARGS.indexOf('--run');
   345	  const runCmd = runIdx > -1 ? ARGS.slice(runIdx + 1) : null;
   346	  if (!runCmd || runCmd.length === 0) {
   347	    await lockClient.end().catch(() => {});
   348	    console.log(attestation({ mode: MODE, locked: lockAcquired, backup: backupOk ? 'ok' : 'skipped', pending: pendingCount, outcome: 'reported-only' }));
   349	    log('no --run command given; lock released. Use --run <cmd...> to hold it across the migration.');
   350	    process.exit(0);
   351	  }
   352	
   353	  console.log(attestation({ mode: MODE, locked: lockAcquired, lockVerified, backup: backupOk ? 'ok' : 'failed', pending: pendingCount, outcome: 'proceeding' }));
   354	  log(`holding the deploy lock while running: ${runCmd.join(' ')}`);
   355	  const child = spawnSync(runCmd[0], runCmd.slice(1), { cwd: process.cwd(), stdio: 'inherit' });
   356	  await lockClient.end().catch(() => {});
   357	  log(`migration finished with exit ${child.status}; deploy lock released.`);
   358	  process.exit(child.status ?? 1);
   359	}
   360	
   361	if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
   362	  main().catch((e) => {
   363	    warn(`unexpected: ${e.message}`);
   364	    process.exit(ENFORCE ? 1 : 0);
   365	  });
   366	}
```

## FILE 3 — render.yaml lines 1-30 (the deploy path under discussion)

```yaml
     1	# SwanStudios Render Deployment Configuration
     2	# ==========================================
     3	# Complete configuration for deploying SwanStudios to Render with PostgreSQL
     4	
     5	# Main web service (Node.js backend + frontend)
     6	services:
     7	  - type: web
     8	    name: swanstudios-main
     9	    runtime: node
    10	    repo: https://github.com/SeanSwan/-SS-PT-New
    11	    branch: main
    12	    rootDir: ./
    13	    buildCommand: |
    14	      # Phase 3 PLAUD audio pipeline: ffmpeg + ffprobe binaries are
    15	      # bundled via the ffmpeg-static + ffprobe-static npm packages
    16	      # (see backend/package.json + backend/scripts/render-start.mjs).
    17	      # Render's build sandbox is read-only so apt-get install fails —
    18	      # the npm-bundled binaries sidestep that constraint.
    19	      # Install backend dependencies and run migrations
    20	      cd backend && npm install && npm run migrate:production
    21	      # Install frontend dependencies and build
    22	      cd ../frontend && npm install && npm run build
    23	    startCommand: cd backend && npm start
    24	    plan: starter # or standard/pro based on needs
    25	    env:
    26	      - key: NODE_ENV
    27	        value: production
    28	      - key: PORT
    29	        value: 10000
    30	      - key: FRONTEND_URL
```
