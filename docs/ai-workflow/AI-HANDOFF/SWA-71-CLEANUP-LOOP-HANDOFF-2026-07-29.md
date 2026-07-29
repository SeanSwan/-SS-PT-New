# SWA-71 Cleanup Loop — Continuation Handoff (2026-07-29)

**For:** the next agent continuing the hostile-review cleanup loop
**From:** Claude Opus 5, session 2026-07-27 → 2026-07-29
**Linear:** SWA-71 (all findings commented there, newest last)
**Branch state:** everything below is **already on `origin/main`**. Nothing is uncommitted.

---

## 0. Read this first — the one thing that will bite you

**The main working tree is on a stale branch.**

```
c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT   -> branch wip/comms-notifications-2026-07-05
                                                  ~1,229 commits BEHIND origin/main
```

I made this mistake **three times** in one session. Editing files there and reasoning about `main`
is invalid. One of those times I "fixed" a bug that `main` already had fixed.

**Use the worktree, which IS on main:**
```
C:/tmp/ss-nutrition-safety-20260728    <- branch claude/nutrition-safety-p0-20260728, tracks main
```
Workflow: `cd C:/tmp/ss-nutrition-safety-20260728 && git fetch origin main -q && git rebase origin/main`,
edit, commit, `git push origin HEAD:main`.

**Verify branch freshness BEFORE editing, not before committing.** That is the procedural fix.

**One exception:** the worktree has **no `node_modules`**. To run DB probes or node scripts, write
the script into `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/backend/` (which has deps), point it
at the worktree path via `process.argv[2]`, run it, then delete it. Every probe I wrote used this
pattern.

---

## 1. What this loop is

Sean's standing instruction, re-issued several times:

> "continuous site cleanup — dead routes, dead files, dirty trees, smoothness — coordinating around
> other active agents. Don't stop; keep finding and fixing. Check the other agent's recent COMMITS
> (not just their stale lane file) each iteration and pick a disjoint lane."

Latest instruction (the one you are continuing):

> "do another 40 runs of hostile review on this until dry"

**"Up to 40" is a ceiling, not a quota.** Sean explicitly said "unless there is nothing then stop."
Iteration 7 shipped **zero** fixes because nothing was safely fixable, and that was accepted as
correct. Do not manufacture fixes to hit a number.

---

## 2. Coordination — you are NOT alone in this repo (Rule 67)

Another agent works the **same working tree** concurrently, on **SWA-75**.

Their lane (verified by commits, 2026-07-29):
- `backend/services/monitoring/errorReporter.mjs`
- `backend/services/admin/accountDataRightsService.mjs`
- `backend/core/middleware/errorHandler.mjs`
- messaging: `controllers/messaging/*`, `services/messaging*`
- frontend contract tests

**Do not edit those files.** Check their *commits* each iteration, not their lane file (it goes
stale):
```bash
git log origin/main --since='6 hours ago' --pretty='%h %s' | grep -v SWA-71
git log origin/main --since='12 hours ago' --name-only --pretty=format: -- backend/ frontend/ | sort | uniq -c | sort -rn | head -15
```
My lane file (yours to overwrite): `.ai-workflow/coordination/claude.lane.md`.
Never write theirs (`codex.lane.md`).

---

## 3. What shipped this session (all on `main`)

| Commit | What |
|---|---|
| `093072b11` | **fix** — 7 queries hit nonexistent tables; pain + goals never loaded into Coach |
| `9205f0c54` / `699fed381` | docs — schema-drift sweep + resolution |
| `57ee7006e` | **fix** — the profile query was broken too; debate start was 500ing on every request |
| `213ecad04` | Hermes memo — hostile review found my own fix incomplete |
| `e91955dd8` | docs — SQL existence sweep (2 findings, unfixed by design) |
| `da8d3f95b` | docs — missing-table hunt (9 findings, 1 root cause, unfixed by design) |

### Fix 1 — `093072b11` (pain + goals context)
Three files had raw SQL referencing tables/columns that **do not exist**:

| SQL said | Reality |
|---|---|
| `"Goals"` | `goals` (lowercase — Postgres quoted identifiers are case-sensitive) |
| `progress` | `progressPercentage` |
| `"PainEntries"` | `client_pain_entries` |
| `bodyPart` | `bodyRegion` |

Fixed by correcting **source** identifiers and **aliasing back to the old names**, so the output
shape is byte-identical and no consumer changed. `::float` cast added because `progressPercentage`
is NUMERIC and node-postgres returns NUMERIC as a **string** (`"0.00"` vs `0`).

Files: `services/ai/contextEngine/coachContextEngine.mjs`,
`services/ai/debate/debateClientContextService.mjs`, `routes/aiDebateRoutes.mjs`.

### Fix 2 — `57ee7006e` (profile query — found by hostile review of Fix 1)
Same three files, `FROM "Users"`. `"Users"` has **no `age`**, **no `nasmPhase`**, and the column is
singular **`fitnessGoal`**:
- `age` → `"dateOfBirth"` (`deIdentifyClient` already does `calculateAge(client.dateOfBirth)`)
- `nasmPhase` → **dropped** (lives on `MovementProfile`/`WorkoutPlan`; deIdentifier falls back to null)
- `fitnessGoals` → `"fitnessGoal" AS "fitnessGoals"` (so `extractGoals()` is unchanged)

**Severity was higher than Fix 1.** Pain/goals degraded silently under `Promise.allSettled`; these
profile queries are **bare `await` with no `.catch()`**, so `POST /api/ai/debate/start` returned
**500 on every request**.

Tests: `backend/tests/unit/coachContextTableNames.test.mjs` (new, pins all of the above) and
`coachContextEngine.test.mjs` (mocks repointed).

---

## 4. OPEN — needs Sean's decision, do NOT fix unilaterally

I deliberately shipped no fix for these. Each needs a decision, and for two of them **the wrong fix
would still compile and run clean** — which is precisely when to stop and ask.

### 4a. `exercise_library` — competing migrations + a lying migration ledger
- `20251112000000-create-nasm-integration-tables.cjs` created it with `exercise_name`,
  `primary_body_part` → **this is the live schema**
- `20251113000000-create-exercise-library-table.cjs` declares `name`, `primary_muscle`,
  `secondary_muscles`, `equipment`, `difficulty` → **lost**
- `videoLibraryController.mjs` was written against the **loser**. Mounted live at BOTH
  `/api/admin/videos` and `/api/admin/exercise-library` (`core/routes.mjs:487-488`).
- **`SequelizeMeta` records the losing migration as APPLIED.** It ran, `createTable` threw (table
  existed), its transaction `catch` **swallowed** the error, Sequelize wrote the success record.
  **A catch-all in a migration converts a schema conflict into a permanently "applied" migration
  that did nothing.** Nobody will re-run it.
- Four controller fields have **no home** in the live schema: `description`, `secondary_muscles`,
  `difficulty`, `primary_video_id`.
- **Do not do the one-column rename.** `name`→`exercise_name` fixes line 132 and the `INSERT` three
  lines later still fails. That only changes the error message.
- Options: **(A)** rewrite controller to NASM schema, drop 4 fields · **(B)** migrate table to add
  them · **(C)** retire the superseded surface. **Recommended A or C.**

### 4b. Nine models whose tables do not exist — ONE root cause
`backend/core/startup.mjs:198-210`: production table creation is **gated behind
`STARTUP_DATABASE_REPAIR=true`**; `sequelize.sync()` only runs when `!isProduction && AUTO_SYNC`.
**Any model registered without a migration never gets a table.** The gate is correct design; the
bug is models added assuming sync would create them.

**PROVEN live:** `GET /api/packages` → **HTTP 500** in production (`/api/health` → 200 control).
Causal chain closed: handler's only DB op is `Package.findAll({where:{isActive:true},
order:[['price','ASC']]})` → its catch returns the exact observed body → that SQL against
production → `relation "packages" does not exist`. Public route, **no frontend caller**, superseded
by `StorefrontItem`. Error body carries no schema/stack (checked — **not** a security finding).

**Real but impact-unproven (behind 401):** `user_follows` (UserFollow — `/followers`, `/following`,
`/follow-stats`), `progress_data`, `marketing_calendar_items`, `session_packages`, `LiveStreams`,
`CreatorProfiles`, `video_sessions`, `olympic_events`.

For `user_follows`: `SocialConnections` **exists** with `followerId` + `followingId` + `status` — an
exact shape match, so a rename **would compile and run**. It also has **0 rows, ~50 columns**, and
privacy flags (`privacyLevel`, `canSeeProfile`, `canSeePosts`). That is a data-model + privacy
decision (Rule 8), not a typo fix. Recommended: migration creating `user_follows` to match the
existing model.

Decision order: `/api/packages` → `user_follows` → triage LiveStreams/CreatorProfiles/VideoSessions
as "build or unmount".

### 4c. Other agent's lane — flagged, not touched
Six messaging tables (`conversation_mutes`, `message_attachments`, `message_pins`,
`message_reactions`, `message_reports`, `message_saves`) do not exist in the DB, but are created at
runtime by `services/messagingSchemaRepository.mjs` — **bootstrap, not drift**. Whether that
bootstrap actually runs in production is genuinely open. Their area; noted in my lane file.

---

## 5. HARD-WON LESSONS — read before your first sweep

These cost real time. Every one came from being wrong.

1. **A sweep that grows as you verify it is measuring your harness, not the system.** My sweeps
   produced **596/665**, then **44** (42 noise), then **42** (33 noise) false positives. Every layer
   of real evidence should *narrow* the claim. If it widens, fix the harness.
2. **Confirm the sweep before confirming the failure.** Specific traps hit:
   - grep matching only single-quoted paths (repo mixes `'` and `"`) → 22 phantom dead routes
   - regex matching the words `FROM`/`JOIN` in English prose → `ADMIN_PASSWORD`, `Authorization`
   - binding an integer into every named param → `operator does not exist: character varying = integer`
   - a fixed 6000-char extraction window bleeding into the next `createTable` block
3. **"I grepped and found nothing" is only as strong as the range grepped.** I claimed a migration
   had no guard — from the first 30 lines of a 400-line file whose `createTable` is at line 363.
4. **A function can look unsafe in isolation and be safe in composition.** `safeQuery()` has no
   try/catch; the safety is one layer out (`Promise.allSettled` + an explicit
   `{domain,status:'degraded'}` marker that `briefClientDispatcher.mjs:99` surfaces). **Better** than
   a local try/catch. Read the caller before judging a helper.
5. **Good resilience can mask a real defect.** That same degradation design hid the pain/goals
   breakage for months — a broken domain is externally indistinguishable from an empty one.
   **Resilience and observability must ship together.**
6. **A test pinned to the broken string does not verify the code — it photocopies it.** The mocks
   matched `/"Goals"/` and `/PainEntries/`, returning fixtures for SQL that could never run. Green
   the whole time.
7. **When a table name is wrong, check the columns too.** The same drift event usually moved both. A
   rename-only fix turns `relation does not exist` into `column does not exist`.
8. **When the wrong fix would still run clean, that is when to stop and ask.** Compilation is not
   consent.
9. **"I fixed the bug I found" ≠ "this file is correct" — and proof of the first reads identical to
   proof of the second.** Fix 1 had live-DB proof, 26/26 assertions and two clean rounds, and was
   still incomplete: I checked 2 of 7 domains. **Enumerate the whole surface and execute every item.**
10. **Verify through the path production actually uses.** My first proof used raw `pg` with
    positional `$1`; production uses `sequelize.query({replacements})` with `:named` params. That
    mattered — `::float` contains `:float`, which Sequelize could have parsed as a placeholder (it
    does not; verified, with `CAST(... AS float)` as the fallback).
11. **`node --check` will NOT catch a `//` comment inside a SQL template literal** — it is
    syntactically valid and silently becomes part of the SQL. Put comments *before* the backtick.
    There is an assertion for this in the verifier below.

---

## 6. Reusable tooling (rebuild these; I deleted the scratch files)

### DB probe skeleton — READ-ONLY, writes impossible by construction
Write into `…/SS-PT/backend/.probe.mjs` (has `node_modules`), run, delete.
```js
import 'dotenv/config';
import { Sequelize } from 'sequelize';
const s = new Sequelize(process.env.DATABASE_URL, { dialect:'postgres', logging:false,
  dialectOptions:{ ssl:{ require:true, rejectUnauthorized:false } } });
const tx = await s.transaction();
try {
  await s.query('SET TRANSACTION READ ONLY', { transaction: tx });   // Postgres rejects any write
  await s.query("SET LOCAL statement_timeout = '5s'", { transaction: tx });
  const rows = await s.query(SQL, { replacements, type: s.QueryTypes.SELECT, transaction: tx });
} finally { await tx.rollback(); }
await s.close();
```
**Rule 59:** never `grep`/`cat` `.env` or echo `DATABASE_URL`. Load it *inside* the script. Pipe all
probe output through `grep -Ev 'password|postgres(ql)?://'`.

### Whole-surface SQL verifier (the tool that found Fix 2's gap)
Parse every backtick literal out of the shipped source, keep those starting with `SELECT`, execute
each. Also assert **no `//` inside any SQL literal**:
```js
const leaked = [...src.matchAll(/`([^`]*)`/g)].map(m => m[1])
  .filter(b => /\bSELECT\b/i.test(b) && /^\s*\/\//m.test(b)).length;
```
Skip literals containing `${` (runtime-built) and **report that count** — 46 of 201 were skipped
last run; do not let `201/201 OK` imply completeness. Test both branches of any `${cond ? … : …}`
query separately.

### Live HTTP probe (closes the "does a user see this" gap)
```bash
for ep in /api/health /api/packages /api/whatever; do
  echo "$ep $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://sswanstudios.com$ep")"
done
```
**Always include controls:** `/api/health` (known 200) and a known-bad path (404). Read the 500
**body** before escalating — `/api/packages` leaks nothing, which downgraded a suspected security
finding to a non-finding.

### Vitest cannot run in this environment
`backend/node_modules/@rollup/` ships **Linux-only** binaries; this is Windows. Pre-existing,
verified against an untouched test file. **Workaround:** execute the assertions with plain `node`
(regex-based source checks). Always disclose this gap in the closeout — do not imply tests ran.

---

## 7. Non-negotiable process rules (hooks WILL block you)

Two `Stop` hooks fire on every turn that changes files. Both blocked me repeatedly.

1. **Hermes memo (Rule 69).** Any substantial turn must write a privacy-safe memo to
   `.ai-workflow/hermes-inbox/pending/<UTC-YYYYMMDDThhmmssZ>-<surface>-<slug>.md`, IDs/roles only,
   then `bash scripts/scan-secrets.sh <file>`. Report the path in the closeout. **No learning
   packet** — Opus provenance is sub-Fable and routes to working-memo only (Rule 68, fail-closed).
2. **Dry-loop + Proof-Before-Done (Rules 73/74).** Hostile rounds until a round finds nothing, then
   **one more confirmation round** (two consecutive CLEAN = dry). **Each round must use a NEW
   vantage** — re-reading code is not a round. End with the ledger and the literal marker
   `DRY-LOOP: CLEAN×2 (rounds: N)`, or `DRY-LOOP: N/A — <reason>` for docs-only turns. Then a
   `PROOF:` line with current-session reproducible evidence, plus an explicit `PROOF gap:` line for
   anything you could not prove.

Vantages that worked: different worktree/branch · `information_schema` vs direct `SELECT` ·
raw `pg` positional vs Sequelize `:named` · source-read vs live HTTP · static grep vs executed
query · reading the *caller* rather than the helper.

Other hard rules in play: **Rule 34** — never say "safe to delete"; grep-check references and get
Sean's approval. **Rule 42** — before any backend push run
`git ls-files --others --exclude-standard backend/` and `git diff --name-only HEAD backend/`.
**Rule 20/54** — sibling sweeps must show the literal search command and enumerate every hit.

Commit style: `type(scope): description (SWA-71)`, body explaining the *why* and any retraction,
footer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. Push straight to
`main` (Render auto-deploys). Batch per Rule 70 — commit per slice, push once at batch end.

---

## 8. Suggested next lanes (all disjoint from SWA-75)

1. **Write-statement column validation.** My sweep executed SELECTs only. Validate
   `INSERT`/`UPDATE` column lists against `information_schema` **statically** (no execution). This
   is where `exercise_library`'s real severity was hiding — highest expected yield.
2. **Brace-balanced migration parser** → generalise the lying-ledger check properly. Two useful
   signals: *duplicate `createTable` with disjoint column sets*, and *a `catch` that swallows a
   `createTable` failure*. **Do not ship the naive duplicate check** — 20 tables match and ~19 are
   benign (in every case checked, the unguarded `createTable` is the *original* and later ones are
   guarded `repair-`/`hotfix-` migrations).
3. **The 46 runtime-interpolated SQL literals** the sweep skipped — unverified territory.
4. **Frontend dead-file / dead-route sweep.** Untouched by me this session. Prior art:
   `BACKEND-ORPHAN-INVENTORY-2026-07-28.md` (19 candidates, zero deleted — Rule 77 Tier 2).
5. **`/api/trainer/stats`** → 404, caller `SessionContext.tsx:872` fails silently and
   `fetchTrainerStats` has **no consumer anywhere**. Decision: implement or remove.
6. **`/api/users/profile`** → 404 in `DevTools/ApiDebugger.tsx:233`; `/api/user/profile` also 404.
   Cosmetic.

---

## 9. Prior-art docs on `main` (read before re-investigating)

Do not re-run these sweeps; they are recorded with their false-positive traps.

- `docs/ai-workflow/AI-HANDOFF/SCHEMA-DRIFT-SWEEP-2026-07-29.md` — the sweep + its resolution
- `docs/ai-workflow/AI-HANDOFF/SQL-EXISTENCE-SWEEP-2026-07-29.md` — 201 literals, 2 findings
- `docs/ai-workflow/AI-HANDOFF/MISSING-TABLE-HUNT-2026-07-29.md` — 9 findings, 1 root cause
- `docs/ai-workflow/AI-HANDOFF/API-CONTRACT-DRIFT-AUDIT-2026-07-29.md` — 478/480 paths resolve
- `docs/ai-workflow/AI-HANDOFF/ROUTE-SHADOW-AUDIT-2026-07-28.md` — mount-order shadowing
- `docs/ai-workflow/AI-HANDOFF/BACKEND-ORPHAN-INVENTORY-2026-07-28.md` — 19 orphan candidates
- `docs/ai-workflow/AI-HANDOFF/CLEANUP-LOOP-ITERATION-3-2026-07-29.md` — 3 hypotheses disproven
- `.ai-workflow/hermes-inbox/pending/2026072*` — the session's lesson memos

**Two route aggregators exist:** `backend/core/routes.mjs` (~188 mounts) and `backend/routes/api.mjs`
(~18 mounts, mounted LAST as a fallback around line 793). Check both when tracing any path.

---

## 10. Honest state of the loop

Iterations 1-4: mostly disproven hypotheses (recorded so they are not re-chased).
Iteration 5: 7 real query defects fixed.
Hostile review of 5: 3 more fixed — **my "done" was wrong**.
Iterations 6-7: 11 findings, **zero fixed** — all need Sean's decision.

**The trend is real:** the cheap, safely-fixable defects in this class are gone. What remains needs
product/schema decisions. If your sweeps keep returning "needs a decision", that is the well running
dry — say so plainly rather than inventing work. Sean has explicitly accepted zero-fix iterations
when the reasoning was sound.