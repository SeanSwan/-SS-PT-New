# DEBATE ROUND 2 / up to 20

(The per-seat remit + stance were delivered alongside this document. The shared rules, running state, and code packet are below.)

You are ONE seat in a MULTI-ROUND HOSTILE DEBATE (round 2 of up to 20) over the packaged SS-PT subject titled "SWA-200 ROUND 4 — six-seat hostile review of a CI migration gate" below. Your seat stance is stated in the remit above the document; hold THAT lens, do not drift to the other seats'.

RULES OF THIS DEBATE (binding):
1. Every finding needs file + line (or workflow step) evidence FROM THE PACKET. Unlocatable claims will be cut by other seats — make yours locatable.
2. A finding = CLAIM about a defect in the packaged code, severity MAJOR (breaks a correctness/safety/build contract) | MINOR | NOTE.
3. Round 2+: the RUNNING CONSENSUS is quoted. CONSENSUS = you adopt it verbatim except items you REJECT with evidence. DISPUTE = you carry at least one REJECT or a new MAJOR.
4. No hedging. No "should be fine" without a named verified path in the packet. Vague praise is discarded.
5. Builder claims in the packet header are TESTABLE assertions — if the code contradicts one, the contradiction is a finding; cite both sides.
6. Endorse the fixes the way an engineer applies them: WHAT, WHERE (file:line), HOW — no re-derivation needed.

END EVERY REPLY with EXACTLY this verdict block (the orchestrator parses it strictly; keep key lines on one line each, items separated by |):
=== VERDICT ===
status: CONSENSUS
confidence: 92
findings: F1=MAJOR: file.js L123: claim text | F2=MINOR: file.yml step-7: claim text
rebuttals: F1=REJECT: why the evidence is wrong | F3=AGREE          (round 1 may be: rebuttals: (none))
open: Q1=what other seats must decide
consensus_block: REQUIRED when status is CONSENSUS — the complete ruling: findings to fix with exact fixes, findings accepted as intentional, and residual risks. May be multi-line.
=== END-VERDICT ===

## RUNNING STATE (rounds answered: 1)
Unresolved findings: (none)

# THE PACKAGED CODE UNDER REVIEW
# SWA-200 ROUND 4 — six-seat hostile review of a CI migration gate

You are one of six independent reviewers (GLM 5.3, Grok 4.6, DeepSeek V4 Pro, Kimi K3, Tencent
HY3, Ox Alpha) plus the builder. **Review the CURRENT state below. Prior rounds are context,
not conclusions.**

## What this gate is for

`render.yaml:20` builds `main` with `cd backend && npm install && npm run migrate:production`.
Every push to main therefore runs migrations against the **production** database, unsupervised,
with no backup and no lock. This workflow is the attempt to catch a bad migration on a
throwaway database first.

## Rounds 1-3 — all REJECTED. What was found and fixed.

**Round 1** (Claude + Ox ×3 + GLM): the gate could not fail, three independent ways.
1. `npm run migrate:production` exits 0 when migrations genuinely FAIL. `safe-migrate.mjs`
   marks a failed migration as applied and continues; that file holds exactly two
   `process.exit(1)` calls and neither is reachable from `failed > 0`. Both steps the workflow
   labelled "THE ACTUAL GATE" were structurally incapable of failing.
   → FIX: `SWAN_MIGRATE_STRICT=1` in CI only. Production default byte-identical
   (`diff | grep -c '^<'` = 0 — zero lines removed or changed).
2. The second migration leg ran ZERO migrations. Leg 1 applied all 307 to an empty DB, so every
   name was already in `SequelizeMeta` before the seeder inserted a row; leg 2 printed "No
   pending migrations" and returned. Nothing ever migrated against populated tables — the
   entire purpose of the seeding layer.
   → FIX: baseline-then-delta (leg A = BASE migrations+models, seed, leg B = this change's delta).
3. `ALREADY_APPLIED_PATTERNS` swallows `duplicate key value` and `violates foreign key
   constraint` — precisely the errors a migration raises against POPULATED tables, i.e. the two
   classes the seeder exists to surface. → FIX: STRICT disables the heuristic.

**Round 2** (GLM only; Ox 0/3, all calls voided by upstream 429):
- The guard `--check` had been "moved between the legs" to fix round 1 — but the migrations
  DIRECTORY was still at BASE there, so its pending set was (BASE) − (BASE) = ∅ in every run,
  forever, under a step now RENAMED "report the delta". Round-1's defect surviving its own fix,
  and worse: blank became authoritative-and-wrong. → FIX: runs inside leg B after the HEAD
  checkout, the one state where dir=HEAD and meta=BASE.
- A REQUIRED status check skipped by a `paths:` filter never reports success — it waits forever
  and blocks the merge. Since a required check on PRs is this gate's only real enforcement path,
  the filter and the enforcement model were mutually exclusive. → FIX: `pull_request` has no
  paths filter.
- Aggregate-only seed assertion; `.sequelizerc`/`backend/config` in no filter; baseline count
  echoed but never asserted.

**Round 3** (GLM REJECT / Ox 2×CONFIRM — the seats split, and GLM was right; Ox rated the same
defect NOTE and passed the work):
- `DELTA_COUNT` counted CHANGED PATHS while `applied` counted EXECUTED NEW NAMES. A migration
  runs only if its NAME is absent from `SequelizeMeta`, so those sets were never the same shape.
  A PR that ADDS one migration and MODIFIES another passed green with the modification executed
  NOWHERE — here or on Render — while the summary claimed it had been tested against real data.
  Mirror image: deletion-only/modify-only PRs FATAL-ed on legitimate changes.
  → FIX: `shadow-delta-audit.mjs` classifies A/M/D/R and asserts `applied == added`.
- Round-2's "fix" for the skipped-table hole was declared insufficient — "visibility is not
  enforcement"; the printed list was read by zero machine logic. → FIX: an added migration whose
  target table the seeder skipped now FATALs.
- `git diff ... || true` masked a failed diff into a green NOT-APPLICABLE run.

**Three defects the builder introduced in his own round-3 fix**, caught by testing against real
git history rather than trusting the fix:
- the table extractor could not read `createTable(TABLE_NAME, ...)` — and the FIRST added
  migration tested used exactly that. It printed "OK: no added migration targets a skipped
  table" while unable to see the table at all. The vacuous-green defect, reproduced inside the
  helper written to close it.
- it returned `[]` for both "no tables" and "could not read the file" — opposite facts rendering
  as the same OK line. Now `null` vs `string[]`; UNKNOWN coverage FAILS.
- it could not read raw-SQL migrations (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ${CONST}`).

## Still OPEN from round 3 — attack these, and find what nobody has

- **R3-F5** the count assertion compares `find -name '*.cjs' -o -name '*.js'` (307) against
  `SequelizeMeta`. umzug's pattern is `/.*\.(cjs|js|cts|ts)$/`. Holds only while zero `.ts`/`.cts`
  migrations exist. Latent false-red.
- **R3-F6** leg A baselines `migrations`+`models` but runs with HEAD's `.sequelizerc` and
  `backend/config`, which the push filter itself classifies as migration-behavioral.
- **R3-F7** a PR can edit this workflow (delete leg B, `exit 0`) and its own trivially-green run
  satisfies the required check.
- The seeder cannot populate every table; `skipped` is real and the FATAL above depends on
  correctly identifying which tables an added migration touches.

## Verified environment facts — do NOT re-derive. DO challenge.

- `migrate:production` = `node scripts/safe-migrate.mjs production`; `safe-migrate.mjs:83`
  spawns `npx sequelize-cli db:migrate --to <name>` ONCE PER MIGRATION (307 spawns in leg A)
- `sequelize-cli` is a **devDependency**; `NODE_ENV=production npm config get omit` -> `dev`;
  `npm ls --omit=dev sequelize-cli` -> empty. So `npx` fetches it from the registry at migrate
  time — in CI **and on every production deploy today**. Deliberately not fixed here.
- `backend/migrations` holds 343 entries; 307 are `.cjs`/`.js` and execute. The other 36 are
  `.mjs` and execute under NO runner (umzug `/.*\.(cjs|js|cts|ts)$/`; safe-migrate filters to
  `.cjs`/`.js`; all 11 `migrate:*` npm scripts route through one of those two).
- `server.mjs` does its work in an async IIFE, so `await import()` resolves BEFORE the server
  boots. The entry-point step proves the module graph resolves, not that the server starts.
- `pre-migrate-guard.mjs --check` ALWAYS exits 0: `decideOutcome` returns `{ok:true}`
  unconditionally for `checkOnly`, and the terminal path exits 0. Confirmed empirically.
  It is advisory in leg B and can never fail the job.
- `pre-migrate-guard.mjs` is invoked by NOTHING on the deploy path. It guards production 0%.

## HARD CONSTRAINT — factor this into your ruling

**This workflow has NEVER EXECUTED and currently cannot.** All 301 queryable GitHub Actions runs
are `startup_failure` across push / pull_request / schedule back to 2026-08-17, with an empty
`workflowName` — GitHub never parsed any workflow file. Private repo; Actions bill against
account minutes. This is billing, not code, and no change in this packet can clear it.

**Every fix in all four rounds is paper-verified only.** GLM's round-2 note stands: the round-2
defect would have surfaced in one real run as "0 pending" beside a nonzero delta.

## Local proof that DOES exist (current session)

- `shadow-table-extract.selftest.mjs` 12/12 — including "runtime-computed table is UNKNOWN,
  never `[]`" and the declared-escape case
- `shadow-delta-audit.mjs` 6/6 against REAL git history — modify-only delta -> green (the old
  gate false-red'd it); literal / const-resolved / raw-SQL skipped-table hits -> all red;
  `applied != added` -> red; no skipped tables -> green
- `seed-shadow-db.selftest.mjs` 36/36; vitest 31/31; `node --check` clean on 7 files
- YAML parses; 12 steps; `pull_request` has no paths filter; `DELTA_COUNT` fully removed

## What I want from you

1. **Any path where this job goes GREEN while testing nothing.** That is the defined failure
   mode; three rounds have each found one and each fix introduced another.
2. **What the round-3 fixes BROKE.** Assume they did — the last three "fixes" all did.
3. Attack specifically: the leg-A/leg-B `git checkout` juggling of migrations+models; the
   `applied == added` assertion; the skipped-table FATAL and its table extractor; the
   `BASE_COUNT` assertion; the unfiltered `pull_request` trigger; the declared `// shadow-tables:`
   escape hatch.
4. **Say plainly if you find nothing new.** A dry round is a real result and is what is actually
   being tested for. Do not manufacture findings to look useful; do not soften a real one.

Return a verdict block: `status: CONFIRM|REJECT`, `confidence: <0-100>`,
`findings: F1=<SEVERITY>: <file> <loc>: <claim>` (or `(none)`), `evidence:`, `ruling:`.

---

## FILE 1 — .github/workflows/migration-shadow-check.yml

```yaml
     1	name: Migration Shadow Check
     2	
     3	# WHY THIS EXISTS (SWA-200, panel 2026-08-23)
     4	# -------------------------------------------
     5	# Ox Alpha, asked what nobody was proposing: "everyone is guarding the push; nobody is
     6	# guarding the migration." render.yaml:20 builds `main` with `npm run migrate:production`, so
     7	# a push to main runs migrations against the production database, unsupervised.
     8	#
     9	# Every gate built before this one is CLIENT-SIDE — pre-commit and pre-push hooks, living in
    10	# the same clients they police. GLM: "nothing distinguishes 'gate passed' from 'gate not
    11	# installed'." This runs on GitHub, against a throwaway database, and cannot be skipped with
    12	# --no-verify or be missing because a checkout forgot to configure hooks.
    13	#
    14	# NOT PRODUCTION. The `postgres` service below is an empty ephemeral container that lives and
    15	# dies with the job. No production credential is used, and none should ever be added.
    16	#
    17	# ---------------------------------------------------------------------------------------
    18	# REBUILT 2026-08-24 after a three-seat hostile review (Claude / Ox Alpha / GLM 5.3) of the
    19	# merged surface. The review found the previous version was VACUOUS — it could not fail:
    20	#
    21	#   1. `npm run migrate:production` exits 0 even when migrations genuinely fail.
    22	#      safe-migrate.mjs marks a failed migration as applied and continues; that file contains
    23	#      exactly two process.exit(1) calls and neither is reachable from `failed > 0`. Both
    24	#      steps the old file labelled "THE ACTUAL GATE" were incapable of failing.
    25	#      FIX: SWAN_MIGRATE_STRICT=1 (added to safe-migrate.mjs; production default unchanged).
    26	#
    27	#   2. The second migration leg ran ZERO migrations. Leg 1 applied all of them to an empty
    28	#      database, so by the time the seeder inserted rows every migration was already recorded
    29	#      in SequelizeMeta and leg 2 printed "No pending migrations" and returned. Nothing ever
    30	#      migrated against populated tables — the entire purpose of seeding.
    31	#      FIX: baseline-then-delta. Leg A applies the BASE commit's migration set to an empty
    32	#      database; the seeder fills it; leg B then applies ONLY the migrations this change
    33	#      adds, against POPULATED tables. That is the test the seeding layer was built for.
    34	#
    35	#   3. safe-migrate's "already applied" heuristic swallows `duplicate key value` and
    36	#      `violates foreign key constraint` — precisely the errors a migration raises against
    37	#      populated tables, i.e. the two classes the seeder exists to surface.
    38	#      FIX: STRICT disables the heuristic. On a database created empty seconds ago, nothing
    39	#      can legitimately already exist, so there every match hid a real defect.
    40	#
    41	#   4. The guard's `--check` step ran BEFORE any migration, against a fresh container where
    42	#      "SequelizeMeta" never exists — so the step named "report the pending set" was
    43	#      incapable of reporting anything, in any run, ever.
    44	#      FIX: it now runs BETWEEN leg A and leg B, where the pending set is exactly the delta
    45	#      about to meet real data. That is the one place the step is meaningful.
    46	#
    47	# What this still does not prove is stated in the Summary step, not hidden.
    48	
    49	on:
    50	  pull_request:
    51	    branches: [main]
    52	    # NO `paths:` FILTER HERE, DELIBERATELY — and do not add one back.
    53	    #
    54	    # GLM 5.3, round 2: this check is only a real gate when it is a REQUIRED status check on
    55	    # PRs to main (on a direct push, Render deploys in parallel and Actions cannot block it).
    56	    # A required check that a paths filter skips does not report success — it sits as
    57	    # "Expected — Waiting for status report" and blocks the merge forever. The three
    58	    # end-states were: not-required (advisory, bypassable), required-with-paths (every
    59	    # unrelated PR hangs), required-without-paths. Only the third one works.
    60	    #
    61	    # The cost is a few minutes of runner time on PRs touching no migrations. That case is
    62	    # already handled honestly: the delta step reports 0 and leg B prints NOT APPLICABLE
    63	    # instead of implying a test happened. That branch exists for exactly this — round 2
    64	    # pointed out that the previous comment here forbade the fix it was built for.
    65	  push:
    66	    branches: [main]
    67	    # A filter IS kept on push, where the deadlock above cannot happen (nothing waits on a
    68	    # push check) and an unfiltered run would burn minutes on every commit to main. The
    69	    # previous version listed only four paths, so a push touching render.yaml, package.json,
    70	    # the guard — or THIS FILE — ran no check, and the gate's own merge triggered nothing.
    71	    #
    72	    # DO NOT refactor into a YAML anchor: GitHub Actions does not support anchors/aliases in
    73	    # workflow files. The alias would not resolve and the filter would silently stop matching.
    74	    paths:
    75	      - 'backend/migrations/**'
    76	      - 'backend/models/**'
    77	      - 'backend/config/**'
    78	      - '.sequelizerc'
    79	      - 'backend/scripts/safe-migrate.mjs'
    80	      - 'backend/scripts/pre-migrate-guard.mjs'
    81	      - 'backend/scripts/seed-shadow-db.mjs'
    82	      - 'backend/scripts/seed-shadow-db.selftest.mjs'
    83	      - 'backend/scripts/shadow-meta-count.mjs'
    84	      - 'backend/scripts/shadow-delta-audit.mjs'
    85	      - 'backend/scripts/shadow-table-extract.mjs'
    86	      - 'backend/scripts/shadow-table-extract.selftest.mjs'
    87	      - 'backend/package.json'
    88	      - 'render.yaml'
    89	      - '.github/workflows/migration-shadow-check.yml'
    90	  workflow_dispatch:
    91	
    92	concurrency:
    93	  group: migration-shadow-${{ github.ref }}
    94	  cancel-in-progress: true
    95	
    96	jobs:
    97	  shadow-migrate:
    98	    runs-on: ubuntu-latest
    99	    name: Migrations run clean on a throwaway database — baseline, then the delta against data
   100	    # 307 migrations, each a separate `npx sequelize-cli` spawn inside safe-migrate.mjs, plus
   101	    # an npm install and a 217-model seed. 20 minutes was optimistic to the point of being a
   102	    # likely false red.
   103	    timeout-minutes: 45
   104	
   105	    services:
   106	      postgres:
   107	        image: postgres:16
   108	        env:
   109	          POSTGRES_USER: shadow
   110	          POSTGRES_PASSWORD: shadow
   111	          POSTGRES_DB: shadow
   112	        ports: ['5432:5432']
   113	        options: >-
   114	          --health-cmd "pg_isready -U shadow"
   115	          --health-interval 5s
   116	          --health-timeout 5s
   117	          --health-retries 10
   118	
   119	    env:
   120	      # Local container only. Never a production credential. User, password and database name
   121	      # are the SAME literal on purpose (panel item 4): a mismatch here once let an auth check
   122	      # pass vacuously because the broken URL still parsed. The seeder's own safety gate keys
   123	      # off this string — it refuses any URL that is not loopback AND does not contain
   124	      # "shadow", with no override switch.
   125	      DATABASE_URL: <CI throwaway container URL, redacted for egress only. The COMMITTED literal IS a valid postgres:// URL with user=password=dbname="shadow" on loopback. Do NOT report this redaction as a defect - three prior calls wasted a finding on it.>
   126	      NODE_ENV: production
   127	      # THE GATE'S ABILITY TO FAIL AT ALL. Without this, safe-migrate.mjs swallows every
   128	      # migration failure and exits 0 — finding 1 in the header. Production leaves this unset
   129	      # and keeps its deliberate recovery behaviour.
   130	      SWAN_MIGRATE_STRICT: '1'
   131	
   132	    steps:
   133	      - name: Check out the pushed SHA (full history — the base diff needs it)
   134	        uses: actions/checkout@v4
   135	        with:
   136	          fetch-depth: 0
   137	
   138	      - uses: actions/setup-node@v4
   139	        with:
   140	          node-version: '22'
   141	
   142	      # Deliberately `npm install`, not `npm ci` — it is what render.yaml:20 runs. A shadow
   143	      # check that installs differently from the deploy is testing a different artifact.
   144	      #
   145	      # MEASURED, AND DELIBERATELY NOT FIXED HERE: NODE_ENV=production makes npm omit
   146	      # devDependencies (`NODE_ENV=production npm config get omit` -> dev), and sequelize-cli
   147	      # is a devDependency, so it is absent and `npx` fetches it from the registry at migrate
   148	      # time. Production does exactly the same thing today — every Render deploy resolves an
   149	      # unpinned sequelize-cli over the network. Fixing that means moving sequelize-cli into
   150	      # `dependencies`, which changes the production install, so it is a separate ticket
   151	      # rather than a drive-by here. This gate inherits that nondeterminism; it does not add
   152	      # it.
   153	      - name: Install backend dependencies exactly as the deploy does
   154	        working-directory: backend
   155	        run: npm install --no-audit --no-fund
   156	
   157	      # A broken generator contract fails here — cheaply, with full output — instead of
   158	      # surfacing later as a silently empty database.
   159	      - name: DB-free contract self-tests (seeder + table extractor)
   160	        working-directory: backend
   161	        run: |
   162	          set -euo pipefail
   163	          node scripts/seed-shadow-db.selftest.mjs
   164	          # The extractor decides whether an added migration's target table was seeded. Its
   165	          # load-bearing contract is that an unreadable migration returns UNKNOWN, never "no
   166	          # tables" — if that ever regresses, the audit downstream starts printing OK for files
   167	          # nothing has read, which is precisely the vacuous-green defect this gate exists for.
   168	          node scripts/shadow-table-extract.selftest.mjs
   169	
   170	      # -----------------------------------------------------------------------------------
   171	      # Resolve what this change actually adds. Everything below depends on this split:
   172	      # baseline first, seed, THEN the delta against data.
   173	      # -----------------------------------------------------------------------------------
   174	      - name: Resolve the base commit and the migration delta
   175	        id: delta
   176	        shell: bash
   177	        env:
   178	          EVENT_NAME: ${{ github.event_name }}
   179	          PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}
   180	          PUSH_BEFORE: ${{ github.event.before }}
   181	        run: |
   182	          set -euo pipefail
   183	          ZERO=0000000000000000000000000000000000000000
   184	          if [ "$EVENT_NAME" = "pull_request" ] && [ -n "$PR_BASE_SHA" ]; then
   185	            BASE="$PR_BASE_SHA"
   186	          elif [ -n "$PUSH_BEFORE" ] && [ "$PUSH_BEFORE" != "$ZERO" ]; then
   187	            BASE="$PUSH_BEFORE"
   188	          else
   189	            BASE="$(git rev-parse HEAD^ 2>/dev/null || git rev-parse HEAD)"
   190	          fi
   191	          if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
   192	            echo "FATAL: base commit $BASE is not present in this checkout."
   193	            echo "fetch-depth: 0 is required for the baseline-then-delta split."
   194	            exit 1
   195	          fi
   196	          # Classify the delta instead of counting changed paths.
   197	          #
   198	          # GLM 5.3 R3-F1 / Ox Alpha R3-F3 (found independently): the old form counted CHANGED
   199	          # PATHS via --name-only, while the gate downstream counted EXECUTED NEW NAMES. Those
   200	          # are different sets, and comparing them was wrong in BOTH directions — a PR that
   201	          # added one migration and modified another passed green with the modification
   202	          # executed nowhere, and a deletion-only PR FATAL-ed on a legitimate change.
   203	          #
   204	          # Also note the previous line ended in `|| true`, which turned a failed git diff into
   205	          # count=0 and then into a green NOT-APPLICABLE run that had computed nothing
   206	          # (R3-F4) — the masked-failure family already fixed twice elsewhere in this file.
   207	          # The helper exits nonzero instead.
   208	          cd backend
   209	          node scripts/shadow-delta-audit.mjs --base "$BASE" --mode classify | tee ../delta.txt
   210	          cd ..
   211	          ADDED=$(grep -oE '^added_count=[0-9]+' delta.txt | head -1 | cut -d= -f2)
   212	          ADDED=${ADDED:-0}
   213	          echo "base=$BASE" >> "$GITHUB_OUTPUT"
   214	          echo "added=$ADDED" >> "$GITHUB_OUTPUT"
   215	          echo "base commit: $BASE"
   216	          echo "migrations ADDED by this change (the only ones leg B can execute): $ADDED"
   217	
   218	      # LEG A — the baseline. This is the schema the delta will actually meet in production.
   219	      - name: Leg A — apply the BASE migration set to an empty database
   220	        id: lega
   221	        shell: bash
   222	        env:
   223	          BASE: ${{ steps.delta.outputs.base }}
   224	        run: |
   225	          set -euo pipefail
   226	          # Models AND migrations, together. The seeder derives its rows from the MODEL
   227	          # definitions, so leaving models at HEAD while migrations sit at BASE would have the
   228	          # seeder try to insert into tables that this change's not-yet-applied migrations
   229	          # create — a red job caused by the split itself rather than by any real defect.
   230	          # Baseline means baseline on both sides of that pair.
   231	          rm -rf backend/migrations backend/models
   232	          git checkout "$BASE" -- backend/migrations backend/models
   233	          # Count EXACTLY what safe-migrate.mjs counts. getAllMigrationFiles() filters to
   234	          # .cjs/.js (safe-migrate.mjs:145-149); a bare `ls` also counts the 36 .mjs files in
   235	          # this directory that the runner silently ignores. Measured on the current tree:
   236	          # ls = 343, .cjs/.js = 307. Asserting against 343 would have FATAL-ed every single
   237	          # run — a guaranteed false red introduced by the very fix that was supposed to
   238	          # replace an echo with an assertion. Caught by attacking my own patch, not by review.
   239	          #
   240	          # (Those 36 .mjs files are a separate finding: they look like migrations and never
   241	          # execute. Flagged on SWA-200, not touched here.)
   242	          BASE_COUNT=$(find backend/migrations -maxdepth 1 -type f \( -name '*.cjs' -o -name '*.js' \) | wc -l | tr -d ' ')
   243	          echo "base_count=$BASE_COUNT" >> "$GITHUB_OUTPUT"
   244	          echo "baseline migration files (.cjs/.js, as safe-migrate counts them): $BASE_COUNT"
   245	          cd backend
   246	          npm run migrate:production
   247	
   248	      # Streams are captured SEPARATELY and concatenated after. Two reasons: `2>&1` into one
   249	      # file can interleave mid-line and break the anchored grep below, and — the defect the
   250	      # review found — under GitHub's default `bash -e` shell a non-zero seeder exit aborted
   251	      # the step at the node line, so `status=$?`, the concat and `exit $status` were all
   252	      # unreachable, and stderr was discarded exactly when it was needed. `|| status=$?`
   253	      # captures the failure without tripping -e.
   254	      - name: Seed synthetic rows (shadow-only by internal gate)
   255	        working-directory: backend
   256	        shell: bash
   257	        run: |
   258	          set -uo pipefail
   259	          status=0
   260	          node scripts/seed-shadow-db.mjs --rows 5 > seed-shadow.log 2> seed-shadow.err || status=$?
   261	          echo "--- seeder stderr ---"
   262	          cat seed-shadow.err || true
   263	          cat seed-shadow.err >> seed-shadow.log || true
   264	          exit $status
   265	
   266	      - name: Assert seed actually inserted rows (SHADOW-SEED rows > 0)
   267	        working-directory: backend
   268	        shell: bash
   269	        run: |
   270	          set -euo pipefail
   271	          if [ ! -f seed-shadow.log ]; then
   272	            echo "FATAL: seed-shadow.log is missing — the seed step did not run"
   273	            exit 1
   274	          fi
   275	          # Anchor to the exact report shape "SHADOW-SEED {" — the bare prefix also matches
   276	          # OK/SKIP/note lines, and the report is the only line carrying the JSON body.
   277	          line=$(grep '^SHADOW-SEED {' seed-shadow.log | tail -1 || true)
   278	          if [ -z "$line" ]; then
   279	            echo "FATAL: no SHADOW-SEED report line found — silent no-op seed"
   280	            cat seed-shadow.log
   281	            exit 1
   282	          fi
   283	          echo "$line"
   284	          rows=$(printf '%s' "$line" | sed -E 's/^SHADOW-SEED //' | node -e "let s='';process.stdin.on('data',function(d){s+=d;}).on('end',function(){var r=JSON.parse(s).rows;console.log(Number.isInteger(r)?r:'NaN');});")
   285	          echo "rows inserted: $rows"
   286	          # `[ "$x" -le 0 ]` on a non-integer prints "integer expression expected" and returns
   287	          # false — and because a condition inside `if` is exempt from `set -e`, the FATAL
   288	          # branch would be SKIPPED and the step would go GREEN. Validate the shape first.
   289	          case "$rows" in
   290	            ''|*[!0-9]*)
   291	              echo "FATAL: seeder reported a non-integer row count ('$rows') — report shape drifted"
   292	              exit 1
   293	              ;;
   294	          esac
   295	          if [ "$rows" -le 0 ]; then
   296	            echo "FATAL: seeder reported zero rows — the delta would be tested against nothing"
   297	            exit 1
   298	          fi
   299	
   300	          # COVERAGE, not realism — the distinction GLM 5.3 drew in round 2.
   301	          #
   302	          # The assertion above is on the AGGREGATE total. A migration whose target table the
   303	          # seeder SKIPPED still meets an EMPTY table in leg B, passes, and goes green — while
   304	          # in production that table holds rows and the same migration fails. The Summary's
   305	          # "synthetic rows are not production data" frames that as a realism limit. It is a
   306	          # coverage limit, and unlike realism it can be made visible. Any table listed here
   307	          # was NOT covered by leg B, however green this job looks.
   308	          skipped=$(printf '%s' "$line" | sed -E 's/^SHADOW-SEED //' | node -e "let s='';process.stdin.on('data',function(d){s+=d;}).on('end',function(){var j=JSON.parse(s);console.log((j.skipped||[]).join('; ')||'(none)');});")
   309	          echo "tables NOT populated — leg B cannot test these: $skipped"
   310	          echo "SEED_SKIPPED<<EOF" >> "$GITHUB_ENV"
   311	          echo "$skipped" >> "$GITHUB_ENV"
   312	          echo "EOF" >> "$GITHUB_ENV"
   313	
   314	      # LEG B — THE REAL TEST, and the reason the seeder exists. These migrations have never
   315	      # been applied, and they now meet POPULATED tables: a NOT NULL added to a filled column,
   316	      # a unique index over existing rows, an FK that existing data violates. Under
   317	      # SWAN_MIGRATE_STRICT=1 each of those fails the job instead of being marked applied.
   318	      - name: Leg B — apply THIS change's migrations against the populated database
   319	        shell: bash
   320	        env:
   321	          ADDED_COUNT: ${{ steps.delta.outputs.added }}
   322	          BASE_COUNT: ${{ steps.lega.outputs.base_count }}
   323	          BASE: ${{ steps.delta.outputs.base }}
   324	        run: |
   325	          set -euo pipefail
   326	          # Restore this change's migrations AND models before the delta runs.
   327	          rm -rf backend/migrations backend/models
   328	          git checkout HEAD -- backend/migrations backend/models
   329	          cd backend
   330	          before=$(node scripts/shadow-meta-count.mjs)
   331	          echo "SequelizeMeta rows before leg B: $before"
   332	
   333	          # F7 (GLM 5.3 round 2): assert, do not merely echo. SequelizeMeta must hold exactly
   334	          # the BASE file count here. If leg A finished without recording every migration, the
   335	          # relative before/after gate below would be satisfied by BASE leftovers.
   336	          # Validate the shape BEFORE comparing. `[ x -ne 3 ]` on a non-integer prints
   337	          # "integer expression expected" and returns false, and a condition inside `if` is
   338	          # exempt from `set -e` — so the FATAL branch would be SKIPPED and the step would go
   339	          # green. That is the identical mechanism the row-count assertion was fixed for
   340	          # earlier in this same file; I reintroduced it two steps later.
   341	          case "$before$BASE_COUNT" in
   342	            ''|*[!0-9]*)
   343	              echo "FATAL: non-integer counts (before='$before' base='$BASE_COUNT')"
   344	              exit 1
   345	              ;;
   346	          esac
   347	          if [ "$before" -ne "$BASE_COUNT" ]; then
   348	            echo "FATAL: SequelizeMeta holds $before rows but leg A applied $BASE_COUNT files."
   349	            echo "Leg A did not record every migration; the delta assertion cannot be trusted."
   350	            exit 1
   351	          fi
   352	
   353	          # THE GUARD RUNS HERE, AND ONLY HERE.
   354	          #
   355	          # GLM 5.3 round 2 caught round 1's defect surviving its own fix. The guard had been
   356	          # moved "between the legs", but the migrations DIRECTORY was still at BASE there
   357	          # (HEAD is checked out three lines above), so its pending set was
   358	          # (BASE files) minus (BASE files) = EMPTY, in every run, forever. Round 1's version
   359	          # was merely empty; the moved version was renamed "report the delta" and so printed
   360	          # an authoritative "0 pending" next to a delta of N — actively misleading.
   361	          #
   362	          # This is the only state in the job where its arithmetic means anything:
   363	          # directory = HEAD, SequelizeMeta = BASE, so pending == the delta about to meet data.
   364	          node scripts/pre-migrate-guard.mjs --check
   365	
   366	          npm run migrate:production
   367	          after=$(node scripts/shadow-meta-count.mjs)
   368	          echo "SequelizeMeta rows after  leg B: $after"
   369	          applied=$(( after - before ))
   370	          echo "migrations applied against populated data: $applied"
   371	
   372	          # THE HONESTY GATE, rebuilt. It now compares like with like: every migration this
   373	          # change ADDS must have executed here, against populated tables. Modified/deleted/
   374	          # renamed files are reported as untestable rather than counted — a migration already
   375	          # in SequelizeMeta never re-runs, here or on Render, so failing on them was a false
   376	          # red and silently including them in an aggregate was a vacuous green.
   377	          #
   378	          # It also FATALs when an added migration targets a table the seeder could not
   379	          # populate: leg B would have run it against an EMPTY table and proved nothing, while
   380	          # production has rows. Round 2 only printed that fact into a summary no machine reads.
   381	          # GLM 5.3: "visibility is not enforcement."
   382	          node scripts/shadow-delta-audit.mjs \
   383	            --base "$BASE" --mode verify \
   384	            --applied "$applied" --skipped "${SEED_SKIPPED:-}"
   385	          if [ "$ADDED_COUNT" -eq 0 ]; then
   386	            echo "NOTE: this change adds no migrations, so leg B executed nothing."
   387	            echo "The populated-schema test is NOT APPLICABLE here — it is not a pass."
   388	          fi
   389	
   390	      # What this proves: the module graph resolves from this SHA — ERR_MODULE_NOT_FOUND from
   391	      # an untracked file, a missing export from an uncommitted one (the Rule 42 class).
   392	      # What it does NOT prove: that the server boots. server.mjs does its work in an async
   393	      # IIFE, so the import resolves before that IIFE finishes and this step exits first. The
   394	      # step is named for what it actually does, not for what we wish it did.
   395	      - name: Prove the backend module graph resolves from this SHA
   396	        working-directory: backend
   397	        shell: bash
   398	        run: |
   399	          set -euo pipefail
   400	          ENTRY=$(node -p "require('./package.json').main || 'server.mjs'")
   401	          echo "entry point: $ENTRY"
   402	          # The previous version computed ENTRY here, printed it, then imported a HARDCODED
   403	          # literal from an `env:` block — printing one thing while testing another.
   404	          ENTRY="$ENTRY" node --input-type=module -e "
   405	            const t = setTimeout(function () {
   406	              console.error('ENTRY POINT DID NOT RESOLVE within 20s.');
   407	              console.error('The import never settled — a top-level await on something');
   408	              console.error('unreachable, or a module-scope hang. Previously this exited 0,');
   409	              console.error('so a hung import was reported as a PASS.');
   410	              process.exit(1);
   411	            }, 20000);
   412	            try {
   413	              await import('./' + process.env.ENTRY);
   414	              clearTimeout(t);
   415	              console.log('module graph resolved without throwing');
   416	              process.exit(0);
   417	            } catch (e) {
   418	              clearTimeout(t);
   419	              console.error('ENTRY POINT FAILED TO LOAD — this SHA would crash-loop on Render:');
   420	              console.error((e && e.stack) || e);
   421	              process.exit(1);
   422	            }
   423	          "
   424	
   425	      - name: Upload seed report and stderr
   426	        if: always()
   427	        uses: actions/upload-artifact@v4
   428	        with:
   429	          name: seed-shadow-log
   430	          path: |
   431	            backend/seed-shadow.log
   432	            backend/seed-shadow.err
   433	          if-no-files-found: ignore
   434	
   435	      - name: Summary
   436	        if: always()
   437	        shell: bash
   438	        env:
   439	          BASE: ${{ steps.delta.outputs.base }}
   440	          ADDED_COUNT: ${{ steps.delta.outputs.added }}
   441	        run: |
   442	          {
   443	            echo "### Migration shadow check"
   444	            echo ""
   445	            echo "Base commit: \`$BASE\`"
   446	            echo "Migrations **added** by this change (the only ones leg B can execute): **$ADDED_COUNT**"
   447	            echo ""
   448	            echo "1. Applied the BASE migration set to an empty throwaway Postgres."
   449	            echo "2. Seeded deterministic synthetic rows (zero PII)."
   450	            echo "3. Applied **this change's** migrations against those populated tables."
   451	            echo "4. Resolved the backend module graph from this SHA."
   452	            echo ""
   453	            echo "Migration failures fail this job (\`SWAN_MIGRATE_STRICT=1\`). Production keeps"
   454	            echo "its recovery behaviour, which exits 0 on failure by design."
   455	            echo ""
   456	            echo "Tables the seeder could not populate (leg B did **not** test these):"
   457	            echo ""
   458	            echo "\`${SEED_SKIPPED:-unknown}\`"
   459	            echo ""
   460	            echo "**What this does NOT prove:**"
   461	            echo "- Synthetic rows are not production data. A snapshot-restore gate is the stronger form."
   462	            echo "- The module graph resolving is not the server booting."
   463	            echo "- On a direct push to \`main\`, Render deploys in PARALLEL with this job — Actions"
   464	            echo "  cannot block it. This only gates when it is a REQUIRED status check on PRs."
   465	            echo "- A migration already recorded in SequelizeMeta never re-runs. Edits and deletions"
   466	            echo "  to existing migration files are reported above and are **not** tested here."
   467	            echo "- A PR may edit this workflow itself; its own run then satisfies the check."
   468	            echo ""
   469	            echo "> **Do NOT mark this a required check until a run actually reports.** As of"
   470	            echo "> 2026-08-24 every Actions run in this repo ends in \`startup_failure\` (billing),"
   471	            echo "> so requiring it would block every PR instead of gating migrations."
   472	            if [ "$ADDED_COUNT" = "0" ]; then
   473	              echo ""
   474	              echo "> This change adds no migrations, so the populated-schema leg was **not applicable**."
   475	            fi
   476	          } >> "$GITHUB_STEP_SUMMARY"
```

## FILE 2 — backend/scripts/shadow-delta-audit.mjs (new, round 3)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * shadow-delta-audit.mjs — classify this change's migration delta, and say which parts of it
     4	 * the shadow gate can and cannot actually test.
     5	 *
     6	 * WHY THIS EXISTS (SWA-200 round 3 — GLM 5.3 R3-F1 and Ox Alpha R3-F3, found independently)
     7	 * ----------------------------------------------------------------------------------------
     8	 * The workflow compared two different sets and called the result an honesty gate:
     9	 *
    10	 *   DELTA_COUNT  = `git diff --name-only`  = CHANGED PATHS (added + modified + deleted + renamed)
    11	 *   applied      = SequelizeMeta delta     = EXECUTED NEW NAMES
    12	 *
    13	 * A migration executes only when its NAME is absent from SequelizeMeta, so those sets were
    14	 * never the same shape, and the comparison was wrong in BOTH directions:
    15	 *
    16	 *   - VACUOUS GREEN: a PR that ADDS one migration and MODIFIES an existing one passed. The
    17	 *     added file ran (applied=1 > 0, gate satisfied); the modified file's name was already
    18	 *     recorded by leg A, so it never ran — not here, and not on Render either. The single
    19	 *     riskiest artifact in a migration diff, a hand-edit to an already-applied migration, was
    20	 *     executed zero times while the summary claimed it had been tested against real data.
    21	 *   - FALSE RED: a deletion-only or modify-only PR hit `DELTA_COUNT>0 && applied==0` and
    22	 *     FATAL-ed on a legitimate change, blaming the gate for not running.
    23	 *
    24	 * WHAT IT ASSERTS
    25	 *   ADDED migrations MUST execute in leg B. That is the actual test.
    26	 *   MODIFIED / DELETED / RENAMED migrations CANNOT execute — already in SequelizeMeta. They are
    27	 *     reported loudly and are NOT failures; failing on them was the false red above. They are
    28	 *     nonetheless exactly what a human should look at.
    29	 *   An ADDED migration whose target table the seeder SKIPPED is FATAL. That closes the last
    30	 *     known vacuous-green path (round-2 F3): such a migration meets an EMPTY table in leg B,
    31	 *     passes, and goes green, while in production that table holds rows and the same migration
    32	 *     may fail. Round 2 only printed that into a summary no machine reads; GLM 5.3 ruled it
    33	 *     insufficient — "visibility is not enforcement" — and specified this closure.
    34	 *   UNKNOWN coverage is a failure, not an OK line. See shadow-table-extract.mjs.
    35	 *
    36	 * SAFETY: read-only. Runs `git diff` and reads files. Touches no database.
    37	 *
    38	 * USAGE
    39	 *   node scripts/shadow-delta-audit.mjs --base <sha> --mode classify
    40	 *   node scripts/shadow-delta-audit.mjs --base <sha> --mode verify --applied <n> --skipped "<a; b>"
    41	 */
    42	import { execFileSync } from 'node:child_process';
    43	import { existsSync, readFileSync } from 'node:fs';
    44	import path from 'node:path';
    45	import { tablesFromSource } from './shadow-table-extract.mjs';
    46	
    47	const argv = process.argv.slice(2);
    48	const arg = (f, d = '') => {
    49	  const i = argv.indexOf(f);
    50	  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
    51	};
    52	
    53	const base = arg('--base');
    54	const mode = arg('--mode', 'classify');
    55	if (!base) {
    56	  console.error('shadow-delta-audit: --base <sha> is required');
    57	  process.exit(2);
    58	}
    59	
    60	const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    61	
    62	/** Only these extensions ever execute — safe-migrate.mjs getAllMigrationFiles(). */
    63	const RUNS = /\.(cjs|js)$/;
    64	
    65	let raw;
    66	try {
    67	  raw = execFileSync(
    68	    'git',
    69	    ['diff', '--name-status', '-M', base, 'HEAD', '--', 'backend/migrations/'],
    70	    { encoding: 'utf8', cwd: root },
    71	  );
    72	} catch (e) {
    73	  // Deliberately NOT swallowed. The previous shell form ended in `|| true`, which turned a
    74	  // failed diff into count=0 and then into a green NOT-APPLICABLE run that had computed
    75	  // nothing (GLM 5.3 R3-F4) — the masked-failure family already fixed twice in the workflow.
    76	  console.error(`shadow-delta-audit: git diff failed — ${e.message}`);
    77	  process.exit(1);
    78	}
    79	
    80	const added = [];
    81	const modified = [];
    82	const deleted = [];
    83	const renamed = [];
    84	
    85	for (const line of raw.split('\n')) {
    86	  if (!line.trim()) continue;
    87	  const parts = line.split('\t');
    88	  const status = parts[0][0];
    89	  const file = status === 'R' ? parts[2] : parts[1];
    90	  if (!file || !RUNS.test(file)) continue; // the 36 .mjs files here never execute
    91	  if (status === 'A') added.push(file);
    92	  else if (status === 'M') modified.push(file);
    93	  else if (status === 'D') deleted.push(file);
    94	  else if (status === 'R') {
    95	    renamed.push(`${parts[1]} -> ${parts[2]}`);
    96	    added.push(parts[2]); // the new name has never run
    97	  }
    98	}
    99	
   100	/** @returns {string[]|null} null means UNDETERMINABLE, never "no tables". */
   101	function targetTables(file) {
   102	  const p = path.join(root, file);
   103	  if (!existsSync(p)) return null;
   104	  return tablesFromSource(readFileSync(p, 'utf8'));
   105	}
   106	
   107	const report = (extra = {}) =>
   108	  JSON.stringify({
   109	    added: added.length,
   110	    modified: modified.length,
   111	    deleted: deleted.length,
   112	    renamed: renamed.length,
   113	    ...extra,
   114	  });
   115	
   116	if (mode === 'classify') {
   117	  console.log(`SHADOW-DELTA ${report()}`);
   118	  console.log(`added_count=${added.length}`);
   119	  for (const f of added) console.log(`  ADDED     ${f}   (leg B WILL execute this)`);
   120	  for (const f of modified) console.log(`  MODIFIED  ${f}   (already in SequelizeMeta — executes NOWHERE, here or in prod)`);
   121	  for (const f of deleted) console.log(`  DELETED   ${f}   (nothing to execute)`);
   122	  for (const f of renamed) console.log(`  RENAMED   ${f}   (new name executes; old name stays recorded)`);
   123	  process.exit(0);
   124	}
   125	
   126	if (mode === 'verify') {
   127	  const appliedRaw = arg('--applied', '');
   128	  const applied = Number(appliedRaw);
   129	  const skipped = arg('--skipped', '')
   130	    .split(';')
   131	    .map((s) => s.trim())
   132	    .filter(Boolean)
   133	    .map((s) => s.split(':')[0].trim()); // entries look like "Table: reason"
   134	
   135	  if (!Number.isInteger(applied)) {
   136	    console.error(`FATAL: --applied is not an integer ("${appliedRaw}")`);
   137	    process.exit(1);
   138	  }
   139	
   140	  let fatal = false;
   141	
   142	  if (applied !== added.length) {
   143	    console.error(`FATAL: this change ADDS ${added.length} migration(s) but leg B applied ${applied}.`);
   144	    console.error('Every added migration must execute against the populated database. It did not.');
   145	    fatal = true;
   146	  } else if (added.length > 0) {
   147	    console.log(`OK: all ${added.length} added migration(s) executed against populated tables.`);
   148	  }
   149	
   150	  if (modified.length || deleted.length || renamed.length) {
   151	    console.log('');
   152	    console.log('NOT TESTED BY THIS GATE — and untestable by it, by construction:');
   153	    for (const f of modified) console.log(`  MODIFIED  ${f}`);
   154	    for (const f of deleted) console.log(`  DELETED   ${f}`);
   155	    for (const f of renamed) console.log(`  RENAMED   ${f}`);
   156	    console.log('A migration already recorded in SequelizeMeta never re-runs — not here, not on');
   157	    console.log('Render. Editing one changes only what a FRESH install would do. Human review.');
   158	  }
   159	
   160	  if (added.length > 0 && skipped.length > 0) {
   161	    const hits = [];
   162	    const unresolved = [];
   163	    for (const f of added) {
   164	      const tables = targetTables(f);
   165	      if (tables === null) { unresolved.push(f); continue; }
   166	      for (const t of tables) {
   167	        if (skipped.some((s) => s.toLowerCase() === t.toLowerCase())) hits.push(`${f} -> ${t}`);
   168	      }
   169	    }
   170	
   171	    if (hits.length) {
   172	      console.error('');
   173	      console.error('FATAL: added migration(s) target tables the seeder could not populate.');
   174	      console.error('Leg B ran them against an EMPTY table, so this job proves nothing about them —');
   175	      console.error('while in production those tables hold rows and the same migration may fail.');
   176	      for (const h of hits) console.error(`  ${h}`);
   177	      fatal = true;
   178	    }
   179	
   180	    if (unresolved.length) {
   181	      // FAIL CLOSED. "I could not read this migration" is not "this migration is fine", and
   182	      // printing OK for it would be the same vacuous-green shape as the defects that produced
   183	      // three rejected review rounds.
   184	      console.error('');
   185	      console.error(`FATAL: could not determine which tables ${unresolved.length} added migration(s) touch,`);
   186	      console.error(`and the seeder skipped ${skipped.length} table(s). Coverage is UNKNOWN, which this`);
   187	      console.error('gate reports as a failure rather than as an OK line.');
   188	      for (const f of unresolved) console.error(`  UNRESOLVED  ${f}`);
   189	      console.error('');
   190	      console.error('Fix, in order of preference:');
   191	      console.error('  1. Use a string literal, or a file-local const, for the table name.');
   192	      console.error('  2. If the table set is genuinely computed at runtime, declare it in the');
   193	      console.error('     migration:   // shadow-tables: users, sessions');
   194	      console.error('     Deliberate and greppable.');
   195	      fatal = true;
   196	    }
   197	
   198	    if (!hits.length && !unresolved.length) {
   199	      console.log(`OK: no added migration targets a skipped table (${skipped.length} skipped).`);
   200	    }
   201	  }
   202	
   203	  console.log(`SHADOW-DELTA ${report({ applied, verdict: fatal ? 'FAIL' : 'PASS' })}`);
   204	  process.exit(fatal ? 1 : 0);
   205	}
   206	
   207	console.error(`shadow-delta-audit: unknown --mode "${mode}"`);
   208	process.exit(2);
```

## FILE 3 — backend/scripts/shadow-table-extract.mjs (new, round 3 — the FATAL depends on it)

```javascript
     1	/**
     2	 * shadow-table-extract.mjs — which tables does a migration touch?
     3	 *
     4	 * SIDE-EFFECT FREE ON PURPOSE, carved out of shadow-delta-audit.mjs the same way and for the
     5	 * same reason ox-identity.mjs was carved out of ox-final-review.mjs: the audit script does its
     6	 * work at import time, so a test could not import it without running a git diff and exiting.
     7	 * A pure module is testable without a repo range, a database, or a network call.
     8	 *
     9	 * CONTRACT — the important part:
    10	 *   returns string[]  → these are the tables, determined
    11	 *   returns null      → COULD NOT DETERMINE. Not "no tables". The caller must treat this as
    12	 *                       UNKNOWN coverage and fail closed.
    13	 *
    14	 * That distinction is the whole point. An earlier version returned [] for both cases, so a
    15	 * migration this extractor could not read rendered as "OK: no added migration targets a
    16	 * skipped table" — a reassuring line emitted by a check that had seen nothing. That is the
    17	 * vacuous-green shape which produced three rejected review rounds on SWA-200, reproduced
    18	 * inside the very helper written to close it. Found by testing the helper against real repo
    19	 * history rather than trusting it.
    20	 */
    21	
    22	/**
    23	 * @param {string} src  migration file source
    24	 * @returns {string[]|null}  tables, or null when undeterminable
    25	 */
    26	export function tablesFromSource(src) {
    27	  if (typeof src !== 'string' || src.trim() === '') return null;
    28	
    29	  // const X = 'literal' / let X = "literal" — 4 of 125 migrations in this repo name their
    30	  // table through a const rather than inline, and the first one this helper met was one of them.
    31	  const consts = new Map();
    32	  const cre = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([A-Za-z0-9_]+)['"`]/g;
    33	  let cm;
    34	  while ((cm = cre.exec(src)) !== null) consts.set(cm[1], cm[2]);
    35	
    36	  const out = new Set();
    37	
    38	  // queryInterface.<call>('table' | IDENT, ...)
    39	  const CALLS = [
    40	    'createTable', 'dropTable', 'addColumn', 'removeColumn', 'changeColumn', 'renameColumn',
    41	    'addIndex', 'removeIndex', 'addConstraint', 'removeConstraint',
    42	    'bulkUpdate', 'bulkDelete', 'bulkInsert', 'describeTable',
    43	  ];
    44	  for (const c of CALLS) {
    45	    const re = new RegExp(c + String.raw`\(\s*(?:['"\`]([A-Za-z0-9_]+)['"\`]|([A-Za-z_$][\w$]*))`, 'g');
    46	    let m;
    47	    while ((m = re.exec(src)) !== null) {
    48	      if (m[1]) out.add(m[1]);
    49	      else if (m[2] && consts.has(m[2])) out.add(consts.get(m[2]));
    50	      // An identifier we cannot resolve is NOT added — inventing a table name would be worse
    51	      // than admitting we do not know, which is what returning null below does.
    52	    }
    53	  }
    54	
    55	  // Raw SQL: several migrations bypass queryInterface entirely via sequelize.query.
    56	  const SQL = [
    57	    /ALTER\s+TABLE\s+"?([A-Za-z0-9_]+)"?/gi,
    58	    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
    59	    /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
    60	    /INSERT\s+INTO\s+"?([A-Za-z0-9_]+)"?/gi,
    61	    /DELETE\s+FROM\s+"?([A-Za-z0-9_]+)"?/gi,
    62	    /UPDATE\s+"?([A-Za-z0-9_]+)"?\s+SET/gi,
    63	    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+"?([A-Za-z0-9_]+)"?/gi,
    64	  ];
    65	  for (const re of SQL) {
    66	    let m;
    67	    while ((m = re.exec(src)) !== null) out.add(m[1]);
    68	  }
    69	
    70	  // Template interpolation into raw SQL: ALTER TABLE ${TABLE_NAME}
    71	  const interp = /(?:ALTER\s+TABLE|UPDATE|INSERT\s+INTO|DELETE\s+FROM|CREATE\s+TABLE)\s+\$\{\s*([A-Za-z_$][\w$]*)\s*\}/gi;
    72	  let im;
    73	  while ((im = interp.exec(src)) !== null) {
    74	    if (consts.has(im[1])) out.add(consts.get(im[1]));
    75	  }
    76	
    77	  // DECLARED ESCAPE.
    78	  //
    79	  // Some migrations compute their table set at runtime — this repo has one that loops an array
    80	  // of FK descriptors doing `ALTER TABLE ${fk.src}`. No static extractor can read that, and
    81	  // blocking every such migration forever is an outage, not a gate. So the author declares:
    82	  //
    83	  //     // shadow-tables: users, sessions, workout_logs
    84	  //
    85	  // Deliberate, greppable and reviewable — the same shape as the lane guard's --allow-foreign.
    86	  // The alternative was printing OK for a file nothing had read.
    87	  const decl = /\/\/\s*shadow-tables:\s*([^\n]+)/i.exec(src);
    88	  if (decl) {
    89	    for (const t of decl[1].split(',').map((x) => x.trim()).filter(Boolean)) out.add(t);
    90	  }
    91	
    92	  return out.size ? [...out] : null;
    93	}
```
