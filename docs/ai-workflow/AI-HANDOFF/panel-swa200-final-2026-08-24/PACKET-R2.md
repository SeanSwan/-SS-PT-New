# SWA-200 ROUND 2 — review the REWRITE, not the original

Round 1 (you, Ox Alpha ×3, GLM 5.3) returned REJECT with 16 defects. All were fixed or
explicitly deferred. **This is the rewritten state. Attack it fresh.**

Round-1 defects and what was done:
- Gate could not fail (`migrate:production` exits 0 on failure) -> `SWAN_MIGRATE_STRICT=1`,
  fail-fast, never mark a failure applied, reclassifier disabled. Production default untouched:
  `diff | grep -c '^<'` = 0, zero lines removed or changed.
- Leg 2 ran zero migrations -> baseline-then-delta. Leg A applies the BASE commit's migrations
  AND models to an empty DB; seeder fills it; leg B applies only this change's migrations
  against populated tables. SequelizeMeta counted before/after; a delta that applies nothing
  FAILS rather than reporting a pass.
- "already applied" swallowed `duplicate key value` / FK violations -> disabled under STRICT.
- Guard `--check` was permanently content-free (fresh container, table never existed) -> moved
  BETWEEN the legs.
- Seed step dead code under `bash -e` -> `|| status=$?`; `.err` now uploaded.
- Non-integer row count went GREEN (`if` condition exempt from `set -e`) -> shape validated first.
- Entry-point: exits nonzero on timeout; uses the ENTRY it computes; renamed to "module graph
  resolves" because server.mjs works in an async IIFE so the import resolves before boot.
- push path filter now equals PR filter (was a strict subset).
- Guard: not-wired-in banner, render.yaml:66->:20, dup line removed, ENFORCE double-attestation
  fixed (findAttestation returned the first, so a HALTED deploy reported "stood down").
- validateShadowUrl gated on DATABASE NAME not whole URL (credentials satisfied it; its own
  vitest had been failing 30/31).

Found by MY OWN second pass after round 1, already fixed — attack whether the fixes are right:
- I had used a YAML anchor (`&gate_paths`). GitHub Actions does not support anchors. Removed.
- Leg A originally checked out BASE migrations but left models at HEAD — the seeder derives rows
  from models, so it would insert into tables the not-yet-applied migrations create. Now both.
- Flag was `SWA_MIGRATE_STRICT`; repo convention is `SWAN_*`. Renamed.

DEFERRED ON PURPOSE (argue if wrong):
- sequelize-cli stays a devDependency, so `npx` fetches it at migrate time. Production does the
  same today (render.yaml:20 + NODE_ENV=production). Moving it to `dependencies` changes the
  production install; separate ticket.
- The guard is still wired into nothing. Now stated in a banner rather than implied.

HARD CONSTRAINT you must factor in: **the workflow has never executed and cannot.** All 300
queryable Actions runs are `startup_failure` across push/PR/schedule back to 2026-08-17, empty
workflowName — GitHub never parsed any workflow. The push carrying these fixes produced run
#301, same result. Private repo, so Actions bill against account minutes. This is billing, not
code.

VERIFIED THIS SESSION: vitest 31/31 (was 30/31); selftest 36/36; node --check clean on 4 .mjs;
YAML parses, 13 steps, PR/push paths programmatically identical.

## What I want
Find what is STILL vacuous, what the rewrite BROKE, and any way leg B can pass without testing
anything. Be specific about mechanism. Say plainly if you find nothing new — a dry round is a
real result and is what I am actually testing for.

---

## REWRITTEN FILE 1 — .github/workflows/migration-shadow-check.yml

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
    52	    paths:
    53	      - 'backend/migrations/**'
    54	      - 'backend/models/**'
    55	      - 'backend/scripts/safe-migrate.mjs'
    56	      - 'backend/scripts/pre-migrate-guard.mjs'
    57	      - 'backend/scripts/seed-shadow-db.mjs'
    58	      - 'backend/scripts/seed-shadow-db.selftest.mjs'
    59	      - 'backend/scripts/shadow-meta-count.mjs'
    60	      - 'backend/package.json'
    61	      - 'render.yaml'
    62	      - '.github/workflows/migration-shadow-check.yml'
    63	  push:
    64	    branches: [main]
    65	    # Identical to the PR set on purpose. The previous version listed four paths here and
    66	    # nine above, so a push to main touching render.yaml, package.json, the guard — or THIS
    67	    # FILE — ran no check at all. The gate could be gutted by direct push with nothing
    68	    # meta-checking it, and the gate's own merge commit triggered no run.
    69	    # DO NOT refactor these two lists into a YAML anchor. GitHub Actions does not support
    70	    # anchors/aliases in workflow files — the alias would not resolve and the filter would
    71	    # silently stop matching, which is the failure mode this gate exists to prevent. If you
    72	    # edit one list, edit BOTH; they must stay identical.
    73	    paths:
    74	      - 'backend/migrations/**'
    75	      - 'backend/models/**'
    76	      - 'backend/scripts/safe-migrate.mjs'
    77	      - 'backend/scripts/pre-migrate-guard.mjs'
    78	      - 'backend/scripts/seed-shadow-db.mjs'
    79	      - 'backend/scripts/seed-shadow-db.selftest.mjs'
    80	      - 'backend/scripts/shadow-meta-count.mjs'
    81	      - 'backend/package.json'
    82	      - 'render.yaml'
    83	      - '.github/workflows/migration-shadow-check.yml'
    84	  workflow_dispatch:
    85	
    86	concurrency:
    87	  group: migration-shadow-${{ github.ref }}
    88	  cancel-in-progress: true
    89	
    90	jobs:
    91	  shadow-migrate:
    92	    runs-on: ubuntu-latest
    93	    name: Migrations run clean on a throwaway database — baseline, then the delta against data
    94	    # 307 migrations, each a separate `npx sequelize-cli` spawn inside safe-migrate.mjs, plus
    95	    # an npm install and a 217-model seed. 20 minutes was optimistic to the point of being a
    96	    # likely false red.
    97	    timeout-minutes: 45
    98	
    99	    services:
   100	      postgres:
   101	        image: postgres:16
   102	        env:
   103	          POSTGRES_USER: shadow
   104	          POSTGRES_PASSWORD: shadow
   105	          POSTGRES_DB: shadow
   106	        ports: ['5432:5432']
   107	        options: >-
   108	          --health-cmd "pg_isready -U shadow"
   109	          --health-interval 5s
   110	          --health-timeout 5s
   111	          --health-retries 10
   112	
   113	    env:
   114	      # Local container only. Never a production credential. User, password and database name
   115	      # are the SAME literal on purpose (panel item 4): a mismatch here once let an auth check
   116	      # pass vacuously because the broken URL still parsed. The seeder's own safety gate keys
   117	      # off this string — it refuses any URL that is not loopback AND does not contain
   118	      # "shadow", with no override switch.
   119	      DATABASE_URL: <throwaway CI container URL: user=password=dbname="shadow", loopback only>
   120	      NODE_ENV: production
   121	      # THE GATE'S ABILITY TO FAIL AT ALL. Without this, safe-migrate.mjs swallows every
   122	      # migration failure and exits 0 — finding 1 in the header. Production leaves this unset
   123	      # and keeps its deliberate recovery behaviour.
   124	      SWAN_MIGRATE_STRICT: '1'
   125	
   126	    steps:
   127	      - name: Check out the pushed SHA (full history — the base diff needs it)
   128	        uses: actions/checkout@v4
   129	        with:
   130	          fetch-depth: 0
   131	
   132	      - uses: actions/setup-node@v4
   133	        with:
   134	          node-version: '22'
   135	
   136	      # Deliberately `npm install`, not `npm ci` — it is what render.yaml:20 runs. A shadow
   137	      # check that installs differently from the deploy is testing a different artifact.
   138	      #
   139	      # MEASURED, AND DELIBERATELY NOT FIXED HERE: NODE_ENV=production makes npm omit
   140	      # devDependencies (`NODE_ENV=production npm config get omit` -> dev), and sequelize-cli
   141	      # is a devDependency, so it is absent and `npx` fetches it from the registry at migrate
   142	      # time. Production does exactly the same thing today — every Render deploy resolves an
   143	      # unpinned sequelize-cli over the network. Fixing that means moving sequelize-cli into
   144	      # `dependencies`, which changes the production install, so it is a separate ticket
   145	      # rather than a drive-by here. This gate inherits that nondeterminism; it does not add
   146	      # it.
   147	      - name: Install backend dependencies exactly as the deploy does
   148	        working-directory: backend
   149	        run: npm install --no-audit --no-fund
   150	
   151	      # A broken generator contract fails here — cheaply, with full output — instead of
   152	      # surfacing later as a silently empty database.
   153	      - name: Seeder self-test (DB-free core contract)
   154	        working-directory: backend
   155	        run: node scripts/seed-shadow-db.selftest.mjs
   156	
   157	      # -----------------------------------------------------------------------------------
   158	      # Resolve what this change actually adds. Everything below depends on this split:
   159	      # baseline first, seed, THEN the delta against data.
   160	      # -----------------------------------------------------------------------------------
   161	      - name: Resolve the base commit and the migration delta
   162	        id: delta
   163	        shell: bash
   164	        env:
   165	          EVENT_NAME: ${{ github.event_name }}
   166	          PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}
   167	          PUSH_BEFORE: ${{ github.event.before }}
   168	        run: |
   169	          set -euo pipefail
   170	          ZERO=0000000000000000000000000000000000000000
   171	          if [ "$EVENT_NAME" = "pull_request" ] && [ -n "$PR_BASE_SHA" ]; then
   172	            BASE="$PR_BASE_SHA"
   173	          elif [ -n "$PUSH_BEFORE" ] && [ "$PUSH_BEFORE" != "$ZERO" ]; then
   174	            BASE="$PUSH_BEFORE"
   175	          else
   176	            BASE="$(git rev-parse HEAD^ 2>/dev/null || git rev-parse HEAD)"
   177	          fi
   178	          if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
   179	            echo "FATAL: base commit $BASE is not present in this checkout."
   180	            echo "fetch-depth: 0 is required for the baseline-then-delta split."
   181	            exit 1
   182	          fi
   183	          git diff --name-only "$BASE" HEAD -- backend/migrations/ > delta.txt || true
   184	          COUNT=$(grep -c . delta.txt || true)
   185	          COUNT=${COUNT:-0}
   186	          echo "base=$BASE" >> "$GITHUB_OUTPUT"
   187	          echo "count=$COUNT" >> "$GITHUB_OUTPUT"
   188	          echo "base commit: $BASE"
   189	          echo "migration files changed by this change: $COUNT"
   190	          cat delta.txt
   191	
   192	      # LEG A — the baseline. This is the schema the delta will actually meet in production.
   193	      - name: Leg A — apply the BASE migration set to an empty database
   194	        shell: bash
   195	        env:
   196	          BASE: ${{ steps.delta.outputs.base }}
   197	        run: |
   198	          set -euo pipefail
   199	          # Models AND migrations, together. The seeder derives its rows from the MODEL
   200	          # definitions, so leaving models at HEAD while migrations sit at BASE would have the
   201	          # seeder try to insert into tables that this change's not-yet-applied migrations
   202	          # create — a red job caused by the split itself rather than by any real defect.
   203	          # Baseline means baseline on both sides of that pair.
   204	          rm -rf backend/migrations backend/models
   205	          git checkout "$BASE" -- backend/migrations backend/models
   206	          echo "baseline migration files: $(ls backend/migrations | wc -l)"
   207	          cd backend
   208	          npm run migrate:production
   209	
   210	      # NOW this step can report something. Against a fresh container it never could: the
   211	      # table it reads did not exist until leg A created it.
   212	      - name: Report the migration delta about to run against data
   213	        working-directory: backend
   214	        run: node scripts/pre-migrate-guard.mjs --check
   215	
   216	      # Streams are captured SEPARATELY and concatenated after. Two reasons: `2>&1` into one
   217	      # file can interleave mid-line and break the anchored grep below, and — the defect the
   218	      # review found — under GitHub's default `bash -e` shell a non-zero seeder exit aborted
   219	      # the step at the node line, so `status=$?`, the concat and `exit $status` were all
   220	      # unreachable, and stderr was discarded exactly when it was needed. `|| status=$?`
   221	      # captures the failure without tripping -e.
   222	      - name: Seed synthetic rows (shadow-only by internal gate)
   223	        working-directory: backend
   224	        shell: bash
   225	        run: |
   226	          set -uo pipefail
   227	          status=0
   228	          node scripts/seed-shadow-db.mjs --rows 5 > seed-shadow.log 2> seed-shadow.err || status=$?
   229	          echo "--- seeder stderr ---"
   230	          cat seed-shadow.err || true
   231	          cat seed-shadow.err >> seed-shadow.log || true
   232	          exit $status
   233	
   234	      - name: Assert seed actually inserted rows (SHADOW-SEED rows > 0)
   235	        working-directory: backend
   236	        shell: bash
   237	        run: |
   238	          set -euo pipefail
   239	          if [ ! -f seed-shadow.log ]; then
   240	            echo "FATAL: seed-shadow.log is missing — the seed step did not run"
   241	            exit 1
   242	          fi
   243	          # Anchor to the exact report shape "SHADOW-SEED {" — the bare prefix also matches
   244	          # OK/SKIP/note lines, and the report is the only line carrying the JSON body.
   245	          line=$(grep '^SHADOW-SEED {' seed-shadow.log | tail -1 || true)
   246	          if [ -z "$line" ]; then
   247	            echo "FATAL: no SHADOW-SEED report line found — silent no-op seed"
   248	            cat seed-shadow.log
   249	            exit 1
   250	          fi
   251	          echo "$line"
   252	          rows=$(printf '%s' "$line" | sed -E 's/^SHADOW-SEED //' | node -e "let s='';process.stdin.on('data',function(d){s+=d;}).on('end',function(){var r=JSON.parse(s).rows;console.log(Number.isInteger(r)?r:'NaN');});")
   253	          echo "rows inserted: $rows"
   254	          # `[ "$x" -le 0 ]` on a non-integer prints "integer expression expected" and returns
   255	          # false — and because a condition inside `if` is exempt from `set -e`, the FATAL
   256	          # branch would be SKIPPED and the step would go GREEN. Validate the shape first.
   257	          case "$rows" in
   258	            ''|*[!0-9]*)
   259	              echo "FATAL: seeder reported a non-integer row count ('$rows') — report shape drifted"
   260	              exit 1
   261	              ;;
   262	          esac
   263	          if [ "$rows" -le 0 ]; then
   264	            echo "FATAL: seeder reported zero rows — the delta would be tested against nothing"
   265	            exit 1
   266	          fi
   267	
   268	      # LEG B — THE REAL TEST, and the reason the seeder exists. These migrations have never
   269	      # been applied, and they now meet POPULATED tables: a NOT NULL added to a filled column,
   270	      # a unique index over existing rows, an FK that existing data violates. Under
   271	      # SWAN_MIGRATE_STRICT=1 each of those fails the job instead of being marked applied.
   272	      - name: Leg B — apply THIS change's migrations against the populated database
   273	        shell: bash
   274	        env:
   275	          DELTA_COUNT: ${{ steps.delta.outputs.count }}
   276	        run: |
   277	          set -euo pipefail
   278	          # Restore this change's migrations AND models before the delta runs.
   279	          rm -rf backend/migrations backend/models
   280	          git checkout HEAD -- backend/migrations backend/models
   281	          cd backend
   282	          before=$(node scripts/shadow-meta-count.mjs)
   283	          echo "SequelizeMeta rows before leg B: $before"
   284	          npm run migrate:production
   285	          after=$(node scripts/shadow-meta-count.mjs)
   286	          echo "SequelizeMeta rows after  leg B: $after"
   287	          applied=$(( after - before ))
   288	          echo "migrations applied against populated data: $applied"
   289	          # Honesty gate. If this change adds migrations they MUST have executed here. If it
   290	          # adds none, say so plainly rather than let a green check imply a test that did not
   291	          # happen — that was exactly the old workflow's failure: leg 2 applied nothing and
   292	          # still reported "the second time with data".
   293	          if [ "$DELTA_COUNT" -gt 0 ] && [ "$applied" -le 0 ]; then
   294	            echo "FATAL: this change touches $DELTA_COUNT migration file(s), but leg B applied"
   295	            echo "none of them. The populated-schema test did NOT run."
   296	            exit 1
   297	          fi
   298	          if [ "$DELTA_COUNT" -eq 0 ]; then
   299	            echo "NOTE: this change adds no migrations, so leg B applied nothing."
   300	            echo "The populated-schema test is NOT APPLICABLE here — it is not a pass."
   301	          fi
   302	
   303	      # What this proves: the module graph resolves from this SHA — ERR_MODULE_NOT_FOUND from
   304	      # an untracked file, a missing export from an uncommitted one (the Rule 42 class).
   305	      # What it does NOT prove: that the server boots. server.mjs does its work in an async
   306	      # IIFE, so the import resolves before that IIFE finishes and this step exits first. The
   307	      # step is named for what it actually does, not for what we wish it did.
   308	      - name: Prove the backend module graph resolves from this SHA
   309	        working-directory: backend
   310	        shell: bash
   311	        run: |
   312	          set -euo pipefail
   313	          ENTRY=$(node -p "require('./package.json').main || 'server.mjs'")
   314	          echo "entry point: $ENTRY"
   315	          # The previous version computed ENTRY here, printed it, then imported a HARDCODED
   316	          # literal from an `env:` block — printing one thing while testing another.
   317	          ENTRY="$ENTRY" node --input-type=module -e "
   318	            const t = setTimeout(function () {
   319	              console.error('ENTRY POINT DID NOT RESOLVE within 20s.');
   320	              console.error('The import never settled — a top-level await on something');
   321	              console.error('unreachable, or a module-scope hang. Previously this exited 0,');
   322	              console.error('so a hung import was reported as a PASS.');
   323	              process.exit(1);
   324	            }, 20000);
   325	            try {
   326	              await import('./' + process.env.ENTRY);
   327	              clearTimeout(t);
   328	              console.log('module graph resolved without throwing');
   329	              process.exit(0);
   330	            } catch (e) {
   331	              clearTimeout(t);
   332	              console.error('ENTRY POINT FAILED TO LOAD — this SHA would crash-loop on Render:');
   333	              console.error((e && e.stack) || e);
   334	              process.exit(1);
   335	            }
   336	          "
   337	
   338	      - name: Upload seed report and stderr
   339	        if: always()
   340	        uses: actions/upload-artifact@v4
   341	        with:
   342	          name: seed-shadow-log
   343	          path: |
   344	            backend/seed-shadow.log
   345	            backend/seed-shadow.err
   346	          if-no-files-found: ignore
   347	
   348	      - name: Summary
   349	        if: always()
   350	        shell: bash
   351	        env:
   352	          BASE: ${{ steps.delta.outputs.base }}
   353	          DELTA_COUNT: ${{ steps.delta.outputs.count }}
   354	        run: |
   355	          {
   356	            echo "### Migration shadow check"
   357	            echo ""
   358	            echo "Base commit: \`$BASE\`"
   359	            echo "Migration files changed by this change: **$DELTA_COUNT**"
   360	            echo ""
   361	            echo "1. Applied the BASE migration set to an empty throwaway Postgres."
   362	            echo "2. Seeded deterministic synthetic rows (zero PII)."
   363	            echo "3. Applied **this change's** migrations against those populated tables."
   364	            echo "4. Resolved the backend module graph from this SHA."
   365	            echo ""
   366	            echo "Migration failures fail this job (\`SWAN_MIGRATE_STRICT=1\`). Production keeps"
   367	            echo "its recovery behaviour, which exits 0 on failure by design."
   368	            echo ""
   369	            echo "**What this does NOT prove:**"
   370	            echo "- Synthetic rows are not production data. A snapshot-restore gate is the stronger form."
   371	            echo "- The module graph resolving is not the server booting."
   372	            echo "- On a direct push to \`main\`, Render deploys in PARALLEL with this job — Actions"
   373	            echo "  cannot block it. This only gates when it is a REQUIRED status check on PRs."
   374	            if [ "$DELTA_COUNT" = "0" ]; then
   375	              echo ""
   376	              echo "> This change adds no migrations, so the populated-schema leg was **not applicable**."
   377	            fi
   378	          } >> "$GITHUB_STEP_SUMMARY"
```

## REWRITTEN FILE 2 — backend/scripts/shadow-meta-count.mjs (new)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * shadow-meta-count.mjs — print the number of rows in "SequelizeMeta", nothing else.
     4	 *
     5	 * WHY THIS EXISTS
     6	 * ---------------
     7	 * The migration shadow check has to prove that leg B actually applied migrations against the
     8	 * seeded database. The previous workflow could not: leg 2 ran with an empty pending set,
     9	 * printed "No pending migrations", exited 0, and the job reported "the second time with data"
    10	 * anyway. Counting SequelizeMeta before and after leg B is the difference between asserting
    11	 * that migrations ran and hoping they did.
    12	 *
    13	 * It lives in a file rather than inline in the YAML because the inline form needed nested
    14	 * quoting inside a `run: |` block inside a shell string — the kind of construct that breaks
    15	 * silently and takes a CI round-trip to diagnose.
    16	 *
    17	 * SAFETY: read-only. One SELECT count(*). It takes no lock, writes nothing, and creates
    18	 * nothing. It is nonetheless gated to loopback + "shadow" URLs for the same reason the seeder
    19	 * is: a CI helper that can be pointed at production is a liability even when it only reads.
    20	 *
    21	 * OUTPUT: a single integer on stdout. Any failure exits non-zero with the reason on stderr —
    22	 * never a fallback number, because a plausible-looking zero would make the caller's
    23	 * before/after delta read as "nothing applied" and fail the job for the wrong reason.
    24	 *
    25	 * USAGE:  node scripts/shadow-meta-count.mjs
    26	 */
    27	const url = process.env.DATABASE_URL;
    28	
    29	if (!url) {
    30	  console.error('shadow-meta-count: DATABASE_URL is not set');
    31	  process.exit(1);
    32	}
    33	
    34	// Same contract as seed-shadow-db.mjs: loopback host AND the word "shadow" in the URL, with
    35	// no override switch. Parsed rather than regex-matched so that a hostname merely *containing*
    36	// "localhost" (e.g. "localhost.evil.example") cannot pass.
    37	let host;
    38	try {
    39	  host = new URL(url).hostname;
    40	} catch {
    41	  console.error('shadow-meta-count: DATABASE_URL does not parse as a URL');
    42	  process.exit(1);
    43	}
    44	// The DATABASE NAME must contain "shadow" — not merely the URL somewhere. Matching the whole
    45	// string lets the CREDENTIALS satisfy the check, so `shadow:shadow@localhost/swanstudios`
    46	// would pass. This helper originally copied that defect verbatim from seed-shadow-db.mjs;
    47	// both are fixed together, and the seeder's own test suite had been failing on it.
    48	const dbName = new URL(url).pathname.slice(1);
    49	const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    50	const nameOk = /shadow/i.test(dbName);
    51	if (!isLoopback || !nameOk) {
    52	  console.error('shadow-meta-count: refusing to run — this is a shadow-database-only helper.');
    53	  console.error(`  host=${host} loopback=${isLoopback} database="${dbName}" name-ok=${nameOk}`);
    54	  process.exit(1);
    55	}
    56	
    57	const { default: pg } = await import('pg');
    58	const client = new pg.Client({ connectionString: url });
    59	
    60	try {
    61	  await client.connect();
    62	  const res = await client.query('SELECT count(*)::int AS n FROM "SequelizeMeta"');
    63	  console.log(res.rows[0].n);
    64	} catch (e) {
    65	  console.error(`shadow-meta-count: ${e.message}`);
    66	  process.exitCode = 1;
    67	} finally {
    68	  await client.end().catch(() => {});
    69	}
```

## FILE 3 — safe-migrate.mjs STRICT diff

```diff
diff --git a/backend/scripts/safe-migrate.mjs b/backend/scripts/safe-migrate.mjs
index 44f7b2f7e..26ab35ee4 100644
--- a/backend/scripts/safe-migrate.mjs
+++ b/backend/scripts/safe-migrate.mjs
@@ -27,6 +27,30 @@ const backendDir = path.resolve(__dirname, '..');
 const migrationsDir = path.join(backendDir, 'migrations');
 const env = process.argv[2] || 'production';
 
+/**
+ * STRICT MODE — set SWAN_MIGRATE_STRICT=1. CI / shadow database only.
+ *
+ * Production behaviour is UNCHANGED when this is unset. This runner is
+ * deliberately RECOVERY-oriented: it reclassifies "already exists" failures as
+ * applied and marks genuine failures done, so one bad migration cannot wedge
+ * every future deploy. That is the right trade for a live deploy and exactly
+ * the wrong one for a gate.
+ *
+ * Found 2026-08-24 by hostile review (Claude G1/G15; corroborated by Ox Alpha
+ * and GLM 5.3): under the default behaviour `npm run migrate:production` exits
+ * 0 even when migrations genuinely fail — this file contains exactly two
+ * process.exit(1) calls and neither is reachable from failed > 0. Both steps
+ * the shadow workflow labels "THE ACTUAL GATE" were therefore structurally
+ * incapable of failing on a broken migration.
+ *
+ * Worse, ALREADY_APPLIED_PATTERNS swallows `duplicate key value` and
+ * `violates foreign key constraint` — precisely the errors a migration raises
+ * when it meets POPULATED tables, which is the entire reason the shadow
+ * database is seeded. On a database created empty seconds earlier nothing can
+ * legitimately "already exist", so there every match hides a real defect.
+ */
+const STRICT = process.env.SWAN_MIGRATE_STRICT === '1';
+
 // "Already exists" patterns that indicate the migration was already applied
 const ALREADY_APPLIED_PATTERNS = [
   /already exists/i,
@@ -40,6 +64,9 @@ const ALREADY_APPLIED_PATTERNS = [
 ];
 
 function isAlreadyAppliedError(stderr) {
+  // See STRICT above: on a freshly created shadow database nothing can already
+  // exist, so every one of these patterns would be concealing a real failure.
+  if (STRICT) return false;
   return ALREADY_APPLIED_PATTERNS.some(p => p.test(stderr));
 }
 
@@ -196,6 +223,15 @@ async function main() {
       console.log('FAILED');
       console.error(`    Error: ${result.combined.split('\n').filter(l => l.includes('ERROR')).join('\n    ') || result.combined.slice(-200)}`);
       failed++;
+      if (STRICT) {
+        console.error('');
+        console.error('SWAN_MIGRATE_STRICT=1 — refusing to mark a failed migration as applied.');
+        console.error(`Failing migration: ${migration}`);
+        console.error('--- migration output (last 2000 chars) ---');
+        console.error(result.combined.slice(-2000));
+        await seq.close();
+        process.exit(1);
+      }
       // Mark as done anyway to prevent blocking future deploys
       // The server uses sync({ alter: true }) which handles the schema
       await markAsCompleted(seq, migration);
@@ -212,6 +248,10 @@ async function main() {
   await seq.close();
 
   if (failed > 0) {
+    // Unreachable under STRICT (E3 exits at the first failure) — kept so that any
+    // future path incrementing `failed` without exiting still cannot go green.
+    // A guard that depends on a single call site is not a guard.
+    if (STRICT) { console.error('SWAN_MIGRATE_STRICT=1 — failing the run.'); process.exit(1); }
     console.log('WARNING: Some migrations had genuine failures.');
     console.log('The server sync({ alter: true }) should handle these, but review the errors above.');
   }
```
