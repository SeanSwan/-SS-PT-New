---
decision: Three-seat REJECT — the handoff's billing diagnosis is wrong, its terminal step is impossible on this plan, and the acceptance artifact it is built around would go green having tested nothing
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-25
linear: SWA-200 (shadow CI), SWA-196 (review seats)
reviews: docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-REVIEW-HARNESS-AND-SHADOW-CI-2026-08-25.md @ 5706e3f43
---

# Hostile review — the shadow-CI handoff and the generation-3 workflow

**Targets.** The session handoff at `5706e3f43`, and the workflow as it stands at
`ca8811eb4` — which landed *after* the handoff was written.

**Seats.** Claude Opus 5 (me, builder-adversarial) · GLM 5.3 · Ox Alpha
(`stealth/ox-alpha`, 3 separated calls, 2 parsed). Ox had **never voted on
generation 3** — round 2's three calls were all voided by upstream 429s, so that
loop was never dry. This closes it.

| Seat | Verdict |
|---|---|
| Claude Opus 5 | REVISE |
| GLM 5.3 | **REJECT** |
| Ox Alpha call 2 | **REJECT** (confidence 84) |
| Ox Alpha call 3 | **REJECT** (confidence 82) |
| Ox Alpha call 1 | void — 1,403 completion tokens, empty body |

**Consolidated: REJECT the plan as written.** The engineering underneath is
genuinely strong — better than most of what this repo ships, and the vacuity
defect of generations 1–2 does appear closed. But the *plan* aims at an endpoint
that does not exist on this account, and the *acceptance artifact* it is built
around would pass without testing anything.

All findings below were verified against the live API and the working tree.
Inference is labelled as inference.

---

## Part 1 — The two findings that change what happens next

### P1 — "free-tier minutes exhausted" is the wrong diagnosis, and it points Sean at the wrong page

*(Found by Claude. Not visible to the other seats — the evidence was gathered
after their packet was sent.)*

The handoff says *"Private repo, free-tier minutes: an account/billing block"*,
fix = *"a spending limit > \$0 or a plan change."* The evidence does not support
that mechanism.

**Measured `[VERIFIED]` 2026-08-25 ~02:30–02:55Z:**

| Query | Result |
|---|---|
| Total workflow runs, all time | **4,051** |
| `?status=success` | **0** |
| `?status=failure` (jobs actually executed) | 1,018 |
| `?status=startup_failure` (never started) | 3,026 |
| Last run that executed a job | **2026-04-20T02:26:45Z** |
| First `startup_failure` after it | **2026-04-20T06:17:10Z** |
| Executed runs May / Jun / Jul / Aug | **0 / 0 / 0 / 0** (of 211 / 1,008 / 912 / 677) |

**The reasoning that kills the minutes hypothesis:** included Actions minutes
reset on the first of each billing month. If April's had simply run out, Actions
would have resumed on 1 May. **It did not resume in May, June, July or August —
four consecutive resets, 2,808 attempts, zero executions.** A quota that never
refills is not a quota.

`[VERIFIED]` **a persistent account-level block, not monthly exhaustion.** The
causes that behave this way are a failed payment method, a past-due invoice, or an
account restriction.

**What changes for Sean:** the first thing to look at is
**`github.com/settings/billing` → payment method and outstanding balance**, not a
minutes top-up. If a charge failed, raising a spending limit fixes nothing.

Two facts to carry forward:

- **The blackout is ~4 months, not "days."** Dead since **2026-04-20**.
- It began inside a **3h50m window on 2026-04-20** — the same 24 hours as the
  credential remediation (`SECURITY-REMEDIATION-2026-04-19.md`, 2,179 commits
  rewritten and force-pushed). `[HYPOTHESIS]` — correlation only, no causal
  evidence — but it is a specific window to give GitHub Support, and cheaper to
  ask than to guess.

### P2 — "Merge PR #71 → gate live on `main`" is impossible on this plan

*(Claude; independently confirmed CRITICAL by GLM (A3) and MAJOR by both Ox calls (F3).
The only finding all three seats ranked at top severity.)*

The workflow's own summary is explicit:

> On a direct push to `main`, the PaaS deploys in PARALLEL with this job — Actions
> cannot block it. **This only gates when it is a REQUIRED status check on PRs.**

```
gh api repos/<owner>/<repo>/branches/main/protection  -> 403 "Upgrade to GitHub Pro
                                                          or make this repository public"
gh api repos/<owner>/<repo>/rulesets                  -> 403  (same)
```

Branch protection is **not available on a free plan for a private repo**. The
workstream's terminal step therefore produces an **advisory badge**. §6 of the
handoff never mentions the dependency — it is absent, not deferred.

GLM's scenario, which is the one that matters: *PR merged, no protection →
someone opens a PR with a data-destroying migration → red X appears → nothing
blocks → merge → push to main → deploy runs it unsupervised.* The gate observes.

Three consequences:

1. **There is a free path nobody considered.** The 403 itself offers it: *"or make
   this repository public."* GLM flagged this with the correct hard ordering
   constraint — **rotate the exposed Render key (standing since 2026-08-12)
   BEFORE any visibility change**, and account for the rewritten-history repo
   having carried credentials. This is Sean's call, not an agent's, and the
   ordering is not optional.
2. **Plan upgrade vs. billing fix may or may not be one action.** I asserted they
   were; GLM and both Ox calls independently marked that **OVERSTATED**. They are
   right — it is `[HYPOTHESIS]` until the billing page is read.
3. **The enforcement model collides with the deploy model.** This project deploys
   by pushing to main. A required PR check means main stops taking direct pushes;
   exempting administrators makes the gate theatre for the one person who ships
   essentially all migrations. Nobody has reconciled these. Sean's decision.

---

## Part 2 — Defects in the generation-3 workflow

### W1 — the delta counter and the runner count different universes `[VERIFIED]`

*(Claude; confirmed HIGH by GLM, MAJOR by both Ox calls — unanimous.)*

```bash
# DELTA_COUNT — unfiltered, all change types
git diff --name-only "$BASE" HEAD -- backend/migrations/
# BASE_COUNT and the runner — .cjs/.js only
find backend/migrations -maxdepth 1 -type f \( -name '*.cjs' -o -name '*.js' \)
```

341 files in that directory: **307** `.cjs`/`.js`, **32** `.mjs`, **2** `.sql`. The
34 inert files are counted by the delta and never executed. A PR touching one of
them → `DELTA_COUNT=1`, `applied=0` → the honesty gate FATALs.

Reproduction from real history: commit `5a942cd8a` → `DELTA_COUNT=2` for **one**
executable migration.

### W2 — the gate fails on its own remediation loop `[VERIFIED]`

*(Claude; confirmed by GLM and both Ox calls.)*

`--name-only` reports modified and deleted paths. But pending is computed by
**filename**:

```js
// backend/scripts/safe-migrate.mjs:192
const pending = allFiles.filter(f => !executed.has(f));
```

Edit an already-applied migration → the filename is in SequelizeMeta from leg A →
not pending → `applied=0` → `FATAL: leg B applied none of them.`

**Six real commits in this repo have exactly that shape** (`cdc89f72b`,
`68a710b41`, `11cb02ca3`, `3c5094b4f`, `db3392f2e`, `b7b96020a`), all editing
`20260730120000-repoint-user-fks-to-canonical-Users.cjs`.

Editing a migration is exactly what you do *after* the gate catches a bug in it.
The gate reds your fix, with a message saying the test did not run. GLM's fair
nuance: for a migration already deployed to production, failing there is
*defensible* — but the message gives the developer no indication of the real
cause, so the class stands even where the outcome is arguably right.

**W1 + W2 share one fix** — and all three seats named it the highest-value
workflow change: define the delta as **additions only, extension-filtered**:

```bash
git diff --name-only --diff-filter=A "$BASE" HEAD -- \
  'backend/migrations/*.cjs' 'backend/migrations/*.js'
```

If modified migrations should red the build, make that its **own named check with
its own message**, not a side effect of a counter.

### W3 — `SWAN_MIGRATE_STRICT` is job-scoped, so it poisons the baseline `[VERIFIED mechanism]`

*(GLM N1 — the best finding in this review, and one I missed.)*

`SWAN_MIGRATE_STRICT: '1'` sits in the **job** `env` block, so it applies to leg A
as well as leg B. Leg A replays **307 historical migrations under a flag they were
never written against**:

```js
// backend/scripts/safe-migrate.mjs:67-70
function isAlreadyAppliedError(stderr) {
  if (STRICT) return false;          // <- heuristic disabled for leg A too
  return ALREADY_APPLIED_PATTERNS.some(p => p.test(stderr));
}
```

…and the disabled patterns are `/already exists/i`, `/duplicate key value/i`,
`/violates foreign key constraint/i`, `/relation .+ already exists/i`. The
heuristic exists *because migrations in this repo historically hit those errors
and were waved through.*

The workflow's defence is: "on a freshly created shadow database nothing can
already exist, so every match hid a real defect." That is true for a database
built **only** by migrations. **This database was not** — see W5/P3: production
schema is also shaped by a boot-time repair sync, and 32 orphan `.mjs` migrations
never ran at all. Any `.cjs` migration that depends on an object created by the
sync or by an orphan will fail on an empty DB, and under STRICT leg A exits 1 —
**every run, forever**, with the blame landing on the migration or the parity
check rather than on strict mode.

**Fix:** move `SWAN_MIGRATE_STRICT` off the job and onto leg B's migrate step
only. Leg A should replicate the code path production actually used.

### W4 — there is no positive control, and the acceptance run will be a NOT-APPLICABLE green `[VERIFIED]`

*(GLM N2, rated CRITICAL; Ox F4. Neither I nor the handoff saw it.)*

PR #71 changes `.github/workflows/`, `.secretignore` and `backend/scripts/` —
**zero files under `backend/migrations/`.** Measured:

```
gh pr view 71 --json files --jq '[.files[].path
  | select(startswith("backend/migrations/"))] | length'   ->  0
```

So `DELTA_COUNT=0` → leg B applies nothing → *"NOT APPLICABLE — it is not a pass"*
→ **step exits 0 → the job goes green.**

The handoff calls that run *"the acceptance artifact 15 rounds never produced."*
It would prove the plumbing runs. It would prove **nothing** about detection.
After two generations killed for being unable to fail, accepting generation 3 on a
green that tested nothing repeats the same defect one level up.

**Fix (all three seats' top recommendation, and mine):** before merging, run a
**canary** — a throwaway branch with one migration engineered to break against
seeded data (a `NOT NULL` column with no default added to a populated table, or a
unique index over colliding seeded values) — and require a **red** whose message
names the constraint violation. *That* run URL is the acceptance artifact. W3 must
be fixed first or the canary may never survive leg A.

### W5 — a models-only PR goes green while shipping real schema drift `[VERIFIED]`

*(Ox F6. Compounds with P3 below — neither seat had both halves.)*

The delta is scoped to `backend/migrations/` only. A PR that changes
`backend/models/**` with no migration → `DELTA_COUNT=0` → green NOT-APPLICABLE.

That would be harmless if models did not touch production schema. **They do:**
`backend/core/startup.mjs` calls `syncDatabaseSafely()`, which *creates missing
tables, adds missing columns, and syncs indexes and constraints* at boot
(`backend/utils/productionDatabaseSync.mjs:313`). A models-only change is a
production schema change on this stack — and it is exactly the class the gate
exists for, passing green.

### W6 — seed coverage is reported but never enforced

*(GLM N3 HIGH, Ox F5.)* The assert gates on aggregate `.rows > 0`. `SEED_SKIPPED`
is exported and printed; **no step consumes it to fail.** A migration whose target
table the seeder skipped meets an *empty* table in leg B, passes trivially, and
goes green while production has rows. Leg B is vacuous by construction for exactly
the tables the seeder missed. **Fix:** hard-fail (or require an explicit waiver)
when a delta migration touches a `SEED_SKIPPED` table.

### W7 — `applied > 0` can be satisfied by somebody else's migration

*(GLM N4 HIGH. New.)* `pull_request.base.sha` is the base head at PR creation and
goes stale as main advances. PR opened Monday; Wednesday main merges a colleague's
migration; PR pushes a one-line edit to an already-applied file. `delta.txt` =
{colleague's file, your edit}; leg B applies the colleague's file → `applied=1` →
green — and your change was never executed. The check that exists to catch vacuity
is satisfiable by proxy.

### W8 — `config.cjs` forces SSL against a container that cannot serve it `[LIKELY]`

*(Claude, while disproving Ox's F5. Not stated by either seat.)*

Migrations run as `npx sequelize-cli db:migrate --config config/config.cjs --env
production`. That config's production block:

```js
// backend/config/config.cjs:22-32
production: {
  use_env_variable: 'DATABASE_URL',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
```

There is **no loopback exemption** — while the two sibling shadow helpers both
have one:

```js
// backend/scripts/pre-migrate-guard.mjs:227
ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
```

The `postgres:16` service container ships with `ssl = off`. With `ssl` truthy,
node-postgres sends an SSLRequest and errors when the server declines. **Leg A
would then fail on migration #1, every run.**

`[LIKELY]`, not `[VERIFIED]` — the Docker daemon is not running on this machine so
I could not execute it. The mechanism and the in-repo asymmetry are verified; the
runtime outcome is not. **The fix already exists in this repo** (Rule 18): apply
the guard's loopback conditional to `config.cjs`.

This also disposes of **Ox F5** (*"no assertion the target is the shadow DB; leg A
could migrate an unintended host"*): **disproven** — `use_env_variable:
'DATABASE_URL'` means sequelize-cli connects to whatever the workflow set, which
is the loopback container. Ox's instinct pointed at the right file for the wrong
reason.

### W9 — the step the comments call THE GUARD cannot fail

*(Claude.)* The workflow's most emphatic comment block introduces
`pre-migrate-guard.mjs --check` as *"THE GUARD RUNS HERE, AND ONLY HERE."* But:

```js
// backend/scripts/pre-migrate-guard.mjs:89-90
if (checkOnly) return { ok: true, reason: 'check-only: nothing was locked, nothing was backed up' };
```

`--check` returns ok unconditionally; the error path is warn-only (`exit 0`). It
**prints**; it cannot fail the build. Not a bug — but the framing is precisely the
class this workstream exists to eliminate, named in its own learning packet: *a
control that looks armed is worse than one visibly dead*. Rename it, or give
check-mode a failing condition.

### W10–W12 — smaller, still worth fixing

- **W10** *(Claude; both seats confirm, severity diagnostic)* — after a force-push
  `github.event.before` is unreachable; the FATAL blames `fetch-depth`, which is
  already correct. This repo force-pushed `main` during the 2026-04-19
  remediation. Distinguish *unreachable base* from *shallow checkout*.
- **W11** *(GLM N7)* — the non-integer shape guard protects `before`/`BASE_COUNT`
  but **not `after`**. A stray stdout line makes `$(( after - before ))` a bash
  syntax error — the same class the guard two steps earlier was written to prevent.
- **W12** *(Ox F7)* — `NODE_ENV=production` omits devDependencies, so
  `sequelize-cli` is fetched **unpinned** by `npx` at migrate time. Network flake =
  false red; silent version drift interacts with STRICT semantics. Pin it into the
  install step.

---

## Part 3 — A finding larger than the gate

### P3 — 32 migrations in the deploy directory never execute `[VERIFIED]`

`migrate:production` is `node scripts/safe-migrate.mjs production`, and
`getAllMigrationFiles()` filters to `.cjs`/`.js` (`safe-migrate.mjs:145-149`).
**All 32 `.mjs` files in `backend/migrations/` are orphans — none has a
`.cjs`/`.js` twin.** They have never run through the deploy path. Among them:

- `20260520000001-add-payment-idempotency-unique-indexes.mjs`
- `20260206-add-idempotency-to-shopping-cart.mjs`
- `20260104000006-create-user-consents-table.mjs`
- the NASM/workout-plan tables, badges, challenges, gamification

An idempotency **key** without the unique **index** is not enforcement, and consent
records are a legal surface. The round-2 commit set this aside as *"a separate
finding, not touched."*

**Do not conclude the tables are missing.** `syncDatabaseSafely()` creates missing
tables and columns at boot, so the objects most likely exist — created by a path
that leaves no migration record. The real finding is therefore about **scope**:

> Production schema here is shaped by **two** mechanisms — migrations and a
> boot-time repair sync. The shadow gate covers only the first. W5 is the same
> gap seen from the CI side; W3 is what it does to leg A.

Whether the payment-idempotency **unique indexes actually exist in production** is
`[UNKNOWN]`. One read-only query answers it, and it is the highest-value action in
this document after the billing check.

---

## Part 4 — The handoff as a handoff

- **H1 — it went stale within minutes and names a superseded version.** The handoff
  is `5706e3f43`; **`ca8811eb4` landed after it** (*"round 2 — the round-1 fix
  reintroduced the round-1 defect"*). §7 step 2 tells the next agent to cherry-pick
  the generation-2 rebuild — i.e. **a version whose own successor says its lead fix
  was defective.** Fix: point at *"the newest commit touching the workflow"* with
  the command to find it, not at a generation.
- **H2 — volatile facts carry no as-of stamps.** §1 says 2,226 behind / 416 ahead;
  measured 2,229 / 424 an hour later. §1 says PR #71 is `mergeable`; it now reports
  `UNKNOWN`. GLM's scenario: a later agent reads the doc after a monthly reset,
  sees green runs, concludes billing was fixed, and never learns the cause.
- **H3 — the review is scheduled after the acceptance artifact.** §7 puts the
  three-seat hostile review at step 4, *after* "first green run" at step 3. Trust
  precedes review. Both Ox calls flagged the ordering independently.
- **H4 — no minutes budget** *(GLM H2)*. Each PR run replays 307 migrations in leg A.
  On a 2,000-minute bucket that is plausibly 50–130 runs/month. No spend decision is
  pre-made, and "no check reported" silently replaces "check passed" when it runs out.
- **H5 — no rollback runbook.** W1/W2 guarantee false reds. Nobody owns turning the
  gate off when it blocks merges.
- **H6 — "first green run" is not a realistic acceptance artifact**, beyond W4:
  1,018 runs in this repo actually executed and **all 1,018 failed**; `docs-check`
  has been red since 2025-10-29. When billing clears, five never-passing workflows
  wake at once. Expect a wall of red and plan the triage.

**What the handoff gets right and must keep:** the mistake ledger with repeat
counts (§5) — the highest-signal artifact in it; the retroactive correction that
*every historical "Ox Alpha" verdict was Grok*, which invalidates consensus counts
across the corpus; the refusal to trust "it should be clear"; and tiering the
billing proof cheapest-first with Playwright **last**. That ordering was correct —
every piece of evidence in this review was gathered at tier B, no browser involved.

---

## Part 5 — Seat calibration

Recorded so the routing table is learned from evidence, not asserted.

- **GLM 5.3** — REJECT, 22,318 reasoning tokens, 525s, subscription. Produced the
  two best findings in the review (**W3**, **W4**), both of which I missed and
  neither Ox call found. Also correctly marked my plan-coupling claim OVERSTATED.
  Two of its findings (missing `--health-cmd`, missing `GITHUB_ENV` heredoc) were
  **artifacts of my abridged packet** — the real file has both. That is my defect,
  not GLM's, and it is the cost of abridging.
- **Ox Alpha** — 2/3 parsed, both REJECT, **$0.00**, 280–330s each. Contributed
  **W5** (models-only green), the delta-fix formulation all seats converged on, and
  the review-ordering catch. Call 1 returned 1,403 completion tokens with an empty
  body.
  - **Ox was wrong once, in both calls independently:** it marked my
    "307 separate `npx` spawns" OVERSTATED, asserting `sequelize-cli db:migrate`
    runs all pending migrations in one process. It does not here —
    `runSingleMigration()` spawns `npx sequelize-cli db:migrate --to <name>` **per
    migration** inside the pending loop (`safe-migrate.mjs:96-114`, called at
    `:211`). Two independent calls making the same wrong call is a correlated
    error, not two votes.
  - **Ox F5 disproven** (see W8) — but chasing it produced W8, which matters more.
- **Claude (me)** — REVISE. Contributed P1, P2, W2's reproduction, W8, W9, P3.
  **Self-disproved one hypothesis before publishing it:** I suspected
  `consult-grok.mjs` read the wrong SSE field and that Ox had never returned real
  content. A $0 probe showed `stealth/ox-alpha` returns text normally in
  `delta.content`. The transport is fine.
- **Harness finding:** `ox-final-review.mjs` collapses *rate-limited*,
  *empty-content* and *unparseable* into one `INCOMPLETE`. Honest — it refuses to
  report a silent pass — but not diagnostic. Round 2's 0/3 was 429s; this round's
  void call was an empty body. A reader will misattribute one to the other. Record
  HTTP status, completion tokens and content length per call.

---

## Ranked action list

| # | Action | Owner | Why |
|---|---|---|---|
| 1 | Check `github.com/settings/billing` for a **failed payment / past-due balance** — not a minutes top-up | Sean | P1: four missed monthly resets say this is not a quota |
| 2 | Decide the plan question — Pro, or make the repo public (**rotate the exposed Render key first**), or accept advisory-only | Sean | P2: the terminal step is otherwise unreachable |
| 3 | Move `SWAN_MIGRATE_STRICT` to leg B's step only | agent | W3: otherwise leg A likely reds every run |
| 4 | Redefine the delta as `--diff-filter=A` + `*.cjs`/`*.js` pathspec; split "modified migration" into its own check | agent | W1+W2, one fix, unanimous |
| 5 | Apply the guard's loopback SSL conditional to `config.cjs` | agent | W8: probable leg-A failure on migration #1 |
| 6 | Build the **canary branch** and require a RED as the acceptance artifact | agent | W4: a green PR-#71 run proves nothing |
| 7 | One read-only query: do the payment-idempotency unique indexes exist in production? | agent, Sean-approved | P3: money-path enforcement is `[UNKNOWN]` |
| 8 | Gate on `SEED_SKIPPED` ∩ delta; add the integer guard to `after`; pin `sequelize-cli`; fix the force-push message | agent | W6, W11, W12, W10 |
| 9 | Correct the handoff: as-of stamps, "newest commit" not "generation 2", review before acceptance, rollback runbook, minutes budget | agent | H1–H6 |
| 10 | `gh auth refresh -h github.com -s user` | Sean | still correct; unblocks tier A permanently |

Standing and overdue from §6: **rotate the Render API key** (exposed 2026-08-12 —
now also a *prerequisite* for the public-repo option) and **the DMARC record**
(SWA-13).

---

## What could not be proven

- **Why** the account is blocked. The billing API needs the `user` scope; the token
  has `gist, read:org, repo, workflow`. The *mechanism* (persistent, not monthly) is
  proven; the *cause* is not.
- **W8's runtime outcome.** Docker is not running on this machine. The config
  asymmetry is verified; the connection failure is inferred.
- Whether the orphan `.mjs` migrations' schema objects exist in production.
- **Anything about the gate's behaviour in a real run.** No job has executed since
  2026-04-20. Every finding here is read from source, git history and the API. The
  first genuinely-failing canary run is the only thing that retires that caveat —
  which is the handoff's own central point, and it survives this review intact.
