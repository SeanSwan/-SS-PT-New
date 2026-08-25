# SWA-200 ROUND 3 — review the post-round-2 state

Round 1 (Claude + Ox Alpha ×3 + GLM 5.3): REJECT, 16 defects. Fixed.
Round 2 (GLM 5.3 only — **Ox returned 0/3, all calls voided by upstream 429**): REJECT, 7 more.
Fixed. **This is that state. Attack it fresh.**

## Round-2 findings and what was done

- **F1 (HIGH) — round 1's defect survived its own fix.** The guard's `--check` had been moved
  "between the legs" to fix round 1's vacuity, but the migrations DIRECTORY was still at BASE
  there (`git checkout HEAD` ran two steps later), so its pending set was
  (BASE files) − (BASE files) = ∅ in every run, forever. Worse, the step had been *renamed*
  "report the delta", so it printed an authoritative `0 pending` next to `DELTA_COUNT=N`.
  **FIX:** it now runs inside leg B, after the HEAD checkout — the one state where
  dir=HEAD and meta=BASE, so pending == the delta about to meet data.
- **F2 (HIGH) — required-check × paths-filter deadlock.** A required status check skipped by a
  `paths:` filter never reports success; it waits forever and blocks the merge. Since a required
  check on PRs is this gate's only real enforcement path, the filter and the enforcement model
  were mutually exclusive — and a comment in the file demanding both lists stay identical
  forbade the only fix. **FIX:** `pull_request` now has NO paths filter; the `DELTA_COUNT=0`
  NOT-APPLICABLE branch covers migration-free PRs. `push` keeps its filter (nothing waits on it).
- **F3 (HIGH) — the live vacuous-pass path.** The seed assertion is on the AGGREGATE row total,
  so a migration whose target table the seeder SKIPPED meets an EMPTY table in leg B, passes,
  and goes green while production has rows and the same migration fails. Coverage limit, not a
  realism limit. **FIX (partial, by design):** the skipped list is now printed and carried into
  the job summary so an uncovered target table is visible at review time. **The underlying hole
  is NOT closed — attack whether making it visible is enough, and whether there is a cheap way
  to actually close it.**
- **F6** `backend/config/**` + `.sequelizerc` added to the push filter (were in neither list).
- **F7** leg A's baseline count is now ASSERTED against `SequelizeMeta`, not merely echoed.

## Two defects I introduced in my own F7 fix, caught before commit — attack the fixes

- `ls backend/migrations | wc -l` = **343**, but `safe-migrate.mjs:145-149` filters to
  `.cjs`/`.js` = **307**. Asserting 343 against 307 would have FATAL-ed **every run** — a
  guaranteed false red introduced by the fix meant to replace an echo with an assertion.
  Now `find -maxdepth 1 -type f \( -name '*.cjs' -o -name '*.js' \)`; verified 307 == 307.
- `[ "$before" -ne "$BASE_COUNT" ]` on a non-integer returns false, and a condition inside `if`
  is exempt from `set -e`, so the FATAL branch would be skipped and the step would go GREEN —
  the identical mechanism already fixed for the row-count assertion 60 lines earlier in the same
  file. Shape is now validated first.

## Verified environment facts — do not re-derive, DO challenge

- `render.yaml:20` = `cd backend && npm install && npm run migrate:production`
- `migrate:production` = `node scripts/safe-migrate.mjs production`; `safe-migrate.mjs:83`
  spawns `npx sequelize-cli db:migrate --to <name>`, **once per migration**
- `sequelize-cli` is a devDependency; `NODE_ENV=production npm config get omit` → `dev`;
  `npm ls --omit=dev sequelize-cli` → empty
- 307 eligible migration files; `backend/migrations` holds 343 entries — the other 36 are `.mjs`
  and execute under NO runner (umzug pattern `migrator.js:52` = `/.*\.(cjs|js|cts|ts)$/`;
  safe-migrate filters identically). Separate finding, deliberately not touched here.
- `backend/package.json` `main` = `server.mjs`, `type` = `module`; `server.mjs` does its work in
  an async IIFE, so `await import()` resolves before the server actually boots
- `SWAN_MIGRATE_STRICT` is set ONLY in this workflow; production leaves it unset and keeps its
  recovery behaviour. The safe-migrate diff removes/changes **zero** lines.

## HARD CONSTRAINT

**The workflow has never executed and cannot.** All 301 queryable Actions runs are
`startup_failure` across push/PR/schedule back to 2026-08-17, with an empty `workflowName` —
GitHub never parsed any workflow file. Private repo; Actions bill against account minutes.
Billing, not code. **So every fix in all three rounds is paper-verified only.** GLM's round-2
note stands: F1 would have surfaced in one real run as "0 pending" beside `DELTA_COUNT>0`.

## What I want back

1. What is STILL vacuous — any path where this job goes green while testing nothing.
2. What the round-2 fixes BROKE. Two of my last three "fixes" introduced new defects; assume
   this batch did too and find them.
3. Specifically attack: the leg-A/leg-B `git checkout` juggling of `migrations`+`models`; the
   guard's new position; the `BASE_COUNT` assertion; the unfiltered `pull_request` trigger.
4. **Say plainly if you find nothing new.** A dry round is a real result and is what I am
   actually testing for. Do not manufacture findings to look useful — but do not soften a real
   one either.

Verdict block: `status: CONFIRM|REJECT`, `confidence`, `findings: F1=<SEV>: <file> <loc>: <claim>`,
`evidence:`, `ruling:`.

---

## CURRENT FILE — .github/workflows/migration-shadow-check.yml

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
    84	      - 'backend/package.json'
    85	      - 'render.yaml'
    86	      - '.github/workflows/migration-shadow-check.yml'
    87	  workflow_dispatch:
    88	
    89	concurrency:
    90	  group: migration-shadow-${{ github.ref }}
    91	  cancel-in-progress: true
    92	
    93	jobs:
    94	  shadow-migrate:
    95	    runs-on: ubuntu-latest
    96	    name: Migrations run clean on a throwaway database — baseline, then the delta against data
    97	    # 307 migrations, each a separate `npx sequelize-cli` spawn inside safe-migrate.mjs, plus
    98	    # an npm install and a 217-model seed. 20 minutes was optimistic to the point of being a
    99	    # likely false red.
   100	    timeout-minutes: 45
   101	
   102	    services:
   103	      postgres:
   104	        image: postgres:16
   105	        env:
   106	          POSTGRES_USER: shadow
   107	          POSTGRES_PASSWORD: shadow
   108	          POSTGRES_DB: shadow
   109	        ports: ['5432:5432']
   110	        options: >-
   111	          --health-cmd "pg_isready -U shadow"
   112	          --health-interval 5s
   113	          --health-timeout 5s
   114	          --health-retries 10
   115	
   116	    env:
   117	      # Local container only. Never a production credential. User, password and database name
   118	      # are the SAME literal on purpose (panel item 4): a mismatch here once let an auth check
   119	      # pass vacuously because the broken URL still parsed. The seeder's own safety gate keys
   120	      # off this string — it refuses any URL that is not loopback AND does not contain
   121	      # "shadow", with no override switch.
   122	      DATABASE_URL: <CI throwaway container URL, redacted for egress: user=password=dbname="shadow", loopback only. The COMMITTED literal is a valid postgres:// URL — three round-1 calls flagged this redaction as a defect; it is not one.>
   123	      NODE_ENV: production
   124	      # THE GATE'S ABILITY TO FAIL AT ALL. Without this, safe-migrate.mjs swallows every
   125	      # migration failure and exits 0 — finding 1 in the header. Production leaves this unset
   126	      # and keeps its deliberate recovery behaviour.
   127	      SWAN_MIGRATE_STRICT: '1'
   128	
   129	    steps:
   130	      - name: Check out the pushed SHA (full history — the base diff needs it)
   131	        uses: actions/checkout@v4
   132	        with:
   133	          fetch-depth: 0
   134	
   135	      - uses: actions/setup-node@v4
   136	        with:
   137	          node-version: '22'
   138	
   139	      # Deliberately `npm install`, not `npm ci` — it is what render.yaml:20 runs. A shadow
   140	      # check that installs differently from the deploy is testing a different artifact.
   141	      #
   142	      # MEASURED, AND DELIBERATELY NOT FIXED HERE: NODE_ENV=production makes npm omit
   143	      # devDependencies (`NODE_ENV=production npm config get omit` -> dev), and sequelize-cli
   144	      # is a devDependency, so it is absent and `npx` fetches it from the registry at migrate
   145	      # time. Production does exactly the same thing today — every Render deploy resolves an
   146	      # unpinned sequelize-cli over the network. Fixing that means moving sequelize-cli into
   147	      # `dependencies`, which changes the production install, so it is a separate ticket
   148	      # rather than a drive-by here. This gate inherits that nondeterminism; it does not add
   149	      # it.
   150	      - name: Install backend dependencies exactly as the deploy does
   151	        working-directory: backend
   152	        run: npm install --no-audit --no-fund
   153	
   154	      # A broken generator contract fails here — cheaply, with full output — instead of
   155	      # surfacing later as a silently empty database.
   156	      - name: Seeder self-test (DB-free core contract)
   157	        working-directory: backend
   158	        run: node scripts/seed-shadow-db.selftest.mjs
   159	
   160	      # -----------------------------------------------------------------------------------
   161	      # Resolve what this change actually adds. Everything below depends on this split:
   162	      # baseline first, seed, THEN the delta against data.
   163	      # -----------------------------------------------------------------------------------
   164	      - name: Resolve the base commit and the migration delta
   165	        id: delta
   166	        shell: bash
   167	        env:
   168	          EVENT_NAME: ${{ github.event_name }}
   169	          PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}
   170	          PUSH_BEFORE: ${{ github.event.before }}
   171	        run: |
   172	          set -euo pipefail
   173	          ZERO=0000000000000000000000000000000000000000
   174	          if [ "$EVENT_NAME" = "pull_request" ] && [ -n "$PR_BASE_SHA" ]; then
   175	            BASE="$PR_BASE_SHA"
   176	          elif [ -n "$PUSH_BEFORE" ] && [ "$PUSH_BEFORE" != "$ZERO" ]; then
   177	            BASE="$PUSH_BEFORE"
   178	          else
   179	            BASE="$(git rev-parse HEAD^ 2>/dev/null || git rev-parse HEAD)"
   180	          fi
   181	          if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
   182	            echo "FATAL: base commit $BASE is not present in this checkout."
   183	            echo "fetch-depth: 0 is required for the baseline-then-delta split."
   184	            exit 1
   185	          fi
   186	          git diff --name-only "$BASE" HEAD -- backend/migrations/ > delta.txt || true
   187	          COUNT=$(grep -c . delta.txt || true)
   188	          COUNT=${COUNT:-0}
   189	          echo "base=$BASE" >> "$GITHUB_OUTPUT"
   190	          echo "count=$COUNT" >> "$GITHUB_OUTPUT"
   191	          echo "base commit: $BASE"
   192	          echo "migration files changed by this change: $COUNT"
   193	          cat delta.txt
   194	
   195	      # LEG A — the baseline. This is the schema the delta will actually meet in production.
   196	      - name: Leg A — apply the BASE migration set to an empty database
   197	        id: lega
   198	        shell: bash
   199	        env:
   200	          BASE: ${{ steps.delta.outputs.base }}
   201	        run: |
   202	          set -euo pipefail
   203	          # Models AND migrations, together. The seeder derives its rows from the MODEL
   204	          # definitions, so leaving models at HEAD while migrations sit at BASE would have the
   205	          # seeder try to insert into tables that this change's not-yet-applied migrations
   206	          # create — a red job caused by the split itself rather than by any real defect.
   207	          # Baseline means baseline on both sides of that pair.
   208	          rm -rf backend/migrations backend/models
   209	          git checkout "$BASE" -- backend/migrations backend/models
   210	          # Count EXACTLY what safe-migrate.mjs counts. getAllMigrationFiles() filters to
   211	          # .cjs/.js (safe-migrate.mjs:145-149); a bare `ls` also counts the 36 .mjs files in
   212	          # this directory that the runner silently ignores. Measured on the current tree:
   213	          # ls = 343, .cjs/.js = 307. Asserting against 343 would have FATAL-ed every single
   214	          # run — a guaranteed false red introduced by the very fix that was supposed to
   215	          # replace an echo with an assertion. Caught by attacking my own patch, not by review.
   216	          #
   217	          # (Those 36 .mjs files are a separate finding: they look like migrations and never
   218	          # execute. Flagged on SWA-200, not touched here.)
   219	          BASE_COUNT=$(find backend/migrations -maxdepth 1 -type f \( -name '*.cjs' -o -name '*.js' \) | wc -l | tr -d ' ')
   220	          echo "base_count=$BASE_COUNT" >> "$GITHUB_OUTPUT"
   221	          echo "baseline migration files (.cjs/.js, as safe-migrate counts them): $BASE_COUNT"
   222	          cd backend
   223	          npm run migrate:production
   224	
   225	      # Streams are captured SEPARATELY and concatenated after. Two reasons: `2>&1` into one
   226	      # file can interleave mid-line and break the anchored grep below, and — the defect the
   227	      # review found — under GitHub's default `bash -e` shell a non-zero seeder exit aborted
   228	      # the step at the node line, so `status=$?`, the concat and `exit $status` were all
   229	      # unreachable, and stderr was discarded exactly when it was needed. `|| status=$?`
   230	      # captures the failure without tripping -e.
   231	      - name: Seed synthetic rows (shadow-only by internal gate)
   232	        working-directory: backend
   233	        shell: bash
   234	        run: |
   235	          set -uo pipefail
   236	          status=0
   237	          node scripts/seed-shadow-db.mjs --rows 5 > seed-shadow.log 2> seed-shadow.err || status=$?
   238	          echo "--- seeder stderr ---"
   239	          cat seed-shadow.err || true
   240	          cat seed-shadow.err >> seed-shadow.log || true
   241	          exit $status
   242	
   243	      - name: Assert seed actually inserted rows (SHADOW-SEED rows > 0)
   244	        working-directory: backend
   245	        shell: bash
   246	        run: |
   247	          set -euo pipefail
   248	          if [ ! -f seed-shadow.log ]; then
   249	            echo "FATAL: seed-shadow.log is missing — the seed step did not run"
   250	            exit 1
   251	          fi
   252	          # Anchor to the exact report shape "SHADOW-SEED {" — the bare prefix also matches
   253	          # OK/SKIP/note lines, and the report is the only line carrying the JSON body.
   254	          line=$(grep '^SHADOW-SEED {' seed-shadow.log | tail -1 || true)
   255	          if [ -z "$line" ]; then
   256	            echo "FATAL: no SHADOW-SEED report line found — silent no-op seed"
   257	            cat seed-shadow.log
   258	            exit 1
   259	          fi
   260	          echo "$line"
   261	          rows=$(printf '%s' "$line" | sed -E 's/^SHADOW-SEED //' | node -e "let s='';process.stdin.on('data',function(d){s+=d;}).on('end',function(){var r=JSON.parse(s).rows;console.log(Number.isInteger(r)?r:'NaN');});")
   262	          echo "rows inserted: $rows"
   263	          # `[ "$x" -le 0 ]` on a non-integer prints "integer expression expected" and returns
   264	          # false — and because a condition inside `if` is exempt from `set -e`, the FATAL
   265	          # branch would be SKIPPED and the step would go GREEN. Validate the shape first.
   266	          case "$rows" in
   267	            ''|*[!0-9]*)
   268	              echo "FATAL: seeder reported a non-integer row count ('$rows') — report shape drifted"
   269	              exit 1
   270	              ;;
   271	          esac
   272	          if [ "$rows" -le 0 ]; then
   273	            echo "FATAL: seeder reported zero rows — the delta would be tested against nothing"
   274	            exit 1
   275	          fi
   276	
   277	          # COVERAGE, not realism — the distinction GLM 5.3 drew in round 2.
   278	          #
   279	          # The assertion above is on the AGGREGATE total. A migration whose target table the
   280	          # seeder SKIPPED still meets an EMPTY table in leg B, passes, and goes green — while
   281	          # in production that table holds rows and the same migration fails. The Summary's
   282	          # "synthetic rows are not production data" frames that as a realism limit. It is a
   283	          # coverage limit, and unlike realism it can be made visible. Any table listed here
   284	          # was NOT covered by leg B, however green this job looks.
   285	          skipped=$(printf '%s' "$line" | sed -E 's/^SHADOW-SEED //' | node -e "let s='';process.stdin.on('data',function(d){s+=d;}).on('end',function(){var j=JSON.parse(s);console.log((j.skipped||[]).join('; ')||'(none)');});")
   286	          echo "tables NOT populated — leg B cannot test these: $skipped"
   287	          echo "SEED_SKIPPED<<EOF" >> "$GITHUB_ENV"
   288	          echo "$skipped" >> "$GITHUB_ENV"
   289	          echo "EOF" >> "$GITHUB_ENV"
   290	
   291	      # LEG B — THE REAL TEST, and the reason the seeder exists. These migrations have never
   292	      # been applied, and they now meet POPULATED tables: a NOT NULL added to a filled column,
   293	      # a unique index over existing rows, an FK that existing data violates. Under
   294	      # SWAN_MIGRATE_STRICT=1 each of those fails the job instead of being marked applied.
   295	      - name: Leg B — apply THIS change's migrations against the populated database
   296	        shell: bash
   297	        env:
   298	          DELTA_COUNT: ${{ steps.delta.outputs.count }}
   299	          BASE_COUNT: ${{ steps.lega.outputs.base_count }}
   300	        run: |
   301	          set -euo pipefail
   302	          # Restore this change's migrations AND models before the delta runs.
   303	          rm -rf backend/migrations backend/models
   304	          git checkout HEAD -- backend/migrations backend/models
   305	          cd backend
   306	          before=$(node scripts/shadow-meta-count.mjs)
   307	          echo "SequelizeMeta rows before leg B: $before"
   308	
   309	          # F7 (GLM 5.3 round 2): assert, do not merely echo. SequelizeMeta must hold exactly
   310	          # the BASE file count here. If leg A finished without recording every migration, the
   311	          # relative before/after gate below would be satisfied by BASE leftovers.
   312	          # Validate the shape BEFORE comparing. `[ x -ne 3 ]` on a non-integer prints
   313	          # "integer expression expected" and returns false, and a condition inside `if` is
   314	          # exempt from `set -e` — so the FATAL branch would be SKIPPED and the step would go
   315	          # green. That is the identical mechanism the row-count assertion was fixed for
   316	          # earlier in this same file; I reintroduced it two steps later.
   317	          case "$before$BASE_COUNT" in
   318	            ''|*[!0-9]*)
   319	              echo "FATAL: non-integer counts (before='$before' base='$BASE_COUNT')"
   320	              exit 1
   321	              ;;
   322	          esac
   323	          if [ "$before" -ne "$BASE_COUNT" ]; then
   324	            echo "FATAL: SequelizeMeta holds $before rows but leg A applied $BASE_COUNT files."
   325	            echo "Leg A did not record every migration; the delta assertion cannot be trusted."
   326	            exit 1
   327	          fi
   328	
   329	          # THE GUARD RUNS HERE, AND ONLY HERE.
   330	          #
   331	          # GLM 5.3 round 2 caught round 1's defect surviving its own fix. The guard had been
   332	          # moved "between the legs", but the migrations DIRECTORY was still at BASE there
   333	          # (HEAD is checked out three lines above), so its pending set was
   334	          # (BASE files) minus (BASE files) = EMPTY, in every run, forever. Round 1's version
   335	          # was merely empty; the moved version was renamed "report the delta" and so printed
   336	          # an authoritative "0 pending" next to DELTA_COUNT=N — actively misleading.
   337	          #
   338	          # This is the only state in the job where its arithmetic means anything:
   339	          # directory = HEAD, SequelizeMeta = BASE, so pending == the delta about to meet data.
   340	          node scripts/pre-migrate-guard.mjs --check
   341	
   342	          npm run migrate:production
   343	          after=$(node scripts/shadow-meta-count.mjs)
   344	          echo "SequelizeMeta rows after  leg B: $after"
   345	          applied=$(( after - before ))
   346	          echo "migrations applied against populated data: $applied"
   347	          # Honesty gate. If this change adds migrations they MUST have executed here. If it
   348	          # adds none, say so plainly rather than let a green check imply a test that did not
   349	          # happen — that was exactly the old workflow's failure: leg 2 applied nothing and
   350	          # still reported "the second time with data".
   351	          if [ "$DELTA_COUNT" -gt 0 ] && [ "$applied" -le 0 ]; then
   352	            echo "FATAL: this change touches $DELTA_COUNT migration file(s), but leg B applied"
   353	            echo "none of them. The populated-schema test did NOT run."
   354	            exit 1
   355	          fi
   356	          if [ "$DELTA_COUNT" -eq 0 ]; then
   357	            echo "NOTE: this change adds no migrations, so leg B applied nothing."
   358	            echo "The populated-schema test is NOT APPLICABLE here — it is not a pass."
   359	          fi
   360	
   361	      # What this proves: the module graph resolves from this SHA — ERR_MODULE_NOT_FOUND from
   362	      # an untracked file, a missing export from an uncommitted one (the Rule 42 class).
   363	      # What it does NOT prove: that the server boots. server.mjs does its work in an async
   364	      # IIFE, so the import resolves before that IIFE finishes and this step exits first. The
   365	      # step is named for what it actually does, not for what we wish it did.
   366	      - name: Prove the backend module graph resolves from this SHA
   367	        working-directory: backend
   368	        shell: bash
   369	        run: |
   370	          set -euo pipefail
   371	          ENTRY=$(node -p "require('./package.json').main || 'server.mjs'")
   372	          echo "entry point: $ENTRY"
   373	          # The previous version computed ENTRY here, printed it, then imported a HARDCODED
   374	          # literal from an `env:` block — printing one thing while testing another.
   375	          ENTRY="$ENTRY" node --input-type=module -e "
   376	            const t = setTimeout(function () {
   377	              console.error('ENTRY POINT DID NOT RESOLVE within 20s.');
   378	              console.error('The import never settled — a top-level await on something');
   379	              console.error('unreachable, or a module-scope hang. Previously this exited 0,');
   380	              console.error('so a hung import was reported as a PASS.');
   381	              process.exit(1);
   382	            }, 20000);
   383	            try {
   384	              await import('./' + process.env.ENTRY);
   385	              clearTimeout(t);
   386	              console.log('module graph resolved without throwing');
   387	              process.exit(0);
   388	            } catch (e) {
   389	              clearTimeout(t);
   390	              console.error('ENTRY POINT FAILED TO LOAD — this SHA would crash-loop on Render:');
   391	              console.error((e && e.stack) || e);
   392	              process.exit(1);
   393	            }
   394	          "
   395	
   396	      - name: Upload seed report and stderr
   397	        if: always()
   398	        uses: actions/upload-artifact@v4
   399	        with:
   400	          name: seed-shadow-log
   401	          path: |
   402	            backend/seed-shadow.log
   403	            backend/seed-shadow.err
   404	          if-no-files-found: ignore
   405	
   406	      - name: Summary
   407	        if: always()
   408	        shell: bash
   409	        env:
   410	          BASE: ${{ steps.delta.outputs.base }}
   411	          DELTA_COUNT: ${{ steps.delta.outputs.count }}
   412	        run: |
   413	          {
   414	            echo "### Migration shadow check"
   415	            echo ""
   416	            echo "Base commit: \`$BASE\`"
   417	            echo "Migration files changed by this change: **$DELTA_COUNT**"
   418	            echo ""
   419	            echo "1. Applied the BASE migration set to an empty throwaway Postgres."
   420	            echo "2. Seeded deterministic synthetic rows (zero PII)."
   421	            echo "3. Applied **this change's** migrations against those populated tables."
   422	            echo "4. Resolved the backend module graph from this SHA."
   423	            echo ""
   424	            echo "Migration failures fail this job (\`SWAN_MIGRATE_STRICT=1\`). Production keeps"
   425	            echo "its recovery behaviour, which exits 0 on failure by design."
   426	            echo ""
   427	            echo "Tables the seeder could not populate (leg B did **not** test these):"
   428	            echo ""
   429	            echo "\`${SEED_SKIPPED:-unknown}\`"
   430	            echo ""
   431	            echo "**What this does NOT prove:**"
   432	            echo "- Synthetic rows are not production data. A snapshot-restore gate is the stronger form."
   433	            echo "- The module graph resolving is not the server booting."
   434	            echo "- On a direct push to \`main\`, Render deploys in PARALLEL with this job — Actions"
   435	            echo "  cannot block it. This only gates when it is a REQUIRED status check on PRs."
   436	            if [ "$DELTA_COUNT" = "0" ]; then
   437	              echo ""
   438	              echo "> This change adds no migrations, so the populated-schema leg was **not applicable**."
   439	            fi
   440	          } >> "$GITHUB_STEP_SUMMARY"
```
