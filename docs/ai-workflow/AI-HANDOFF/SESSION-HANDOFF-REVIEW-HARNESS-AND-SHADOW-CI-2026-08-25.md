---
decision: Hand off the review-harness + shadow-CI workstream to a fresh session; first job is proving GitHub Actions billing is cleared, then landing PR #71's first green run
status: open
supersedes: none
originating_model: claude-fable-5
created: 2026-08-25
linear: SWA-200 (shadow CI), SWA-196 (review seats), SWA-204 (Hermes corpus review)
---

# Session handoff — review harness, shadow CI, and the dead-Actions discovery

> **Read this top section first. The rest is the evidence trail.**

> ## ⚠ CORRECTED 2026-08-25 by a three-seat hostile review — read that first
>
> **`HOSTILE-REVIEW-SHADOW-CI-HANDOFF-2026-08-25.md`** (Claude Opus 5 + GLM 5.3 +
> Ox Alpha ×2) returned **REJECT** on the plan below. Four corrections override
> what this document says; everything else here stands.
>
> 1. **The billing diagnosis in §0/§3 is wrong.** It is **not** free-tier minutes
>    exhaustion. Included minutes reset monthly, and Actions did **not** revive on
>    1 May, 1 Jun, 1 Jul or 1 Aug — 2,808 attempts, zero executions. It is a
>    **persistent account-level block**. Sean's first action is
>    `github.com/settings/billing` → **failed payment / past-due balance**, not a
>    minutes top-up. The blackout is **~4 months** (dead since 2026-04-20T06:17Z),
>    not "days". Zero of 4,051 runs have ever succeeded.
> 2. **"Merge PR #71 → gate live on `main`" is impossible on this plan.**
>    `branches/main/protection` and `rulesets` both return **403 "Upgrade to
>    GitHub Pro or make this repository public."** Merging yields an advisory
>    badge. §6 below is missing this dependency entirely.
> 3. **§7 step 2 names a superseded version.** `ca8811eb4` landed *after* this
>    handoff was written. Take the newest commit, never a named generation:
>    `git log -1 --oneline -- .github/workflows/migration-shadow-check.yml`
> 4. **The acceptance artifact in §7 step 3 would prove nothing.** PR #71 touches
>    **zero** files under `backend/migrations/` → `DELTA_COUNT=0` → leg B prints
>    "NOT APPLICABLE" → the job goes **green having tested nothing**. Build a
>    canary branch whose migration must break against seeded data, and accept a
>    **RED** as the artifact. Fix `SWAN_MIGRATE_STRICT` scoping first (it currently
>    applies to leg A and will likely red every run).

## 0. The one-screen summary

**What we are doing.** Making SwanStudios' deploy-safety gate real: a GitHub Actions
workflow that runs every migration against a throwaway Postgres — first empty, then
*seeded with synthetic rows* — so a migration that would break production data fails in CI
instead of on Render. Alongside it, we fixed the AI review harness the project uses to
check its own work, because it was lying in three ways.

**Where we've been.** A 15-round, ~$5.43 panel debate built the seeder and left it
**uncommitted, never run, one `git clean` from gone**. This session hostile-reviewed that
work (GLM 5.3 / Grok 4.6 / Ox), rescued and committed everything, merged two competing
copies of the workflow, opened **PR #71** purely to force the first real CI run — and
discovered **every GitHub Actions run in the repo, all workflows, has been failing at
startup for days**. Private repo, free-tier minutes: an account/billing block. Every CI
gate anyone ever built here has been an intention, not a protection.

Along the way three harness defects were found and fixed with proof: the "Ox Alpha"
review seat had **always actually been Grok** (a dropped argv flag); the **spend caps could
never fire** (the ledger had no writer); and two follow-up fixes were themselves fail-open
until a second three-seat review caught them.

**Where we are going — in order.**
1. **Prove billing is cleared** (Sean-owned action; agent-owned verification — §3).
2. The moment it clears: PR #71 gets its first real run. That log is the acceptance
   artifact 15 rounds never produced. A parallel session has since rebuilt the workflow
   (baseline-then-delta, strict mode) — PR #71 must be **updated from that rebuild** first.
3. One three-seat hostile review of *their* rebuilt workflow — the only substantive code in
   this workstream not yet attacked.
4. Merge PR #71 → gate live on `main`.

**What is fixed, right now, on disk and on origin.** Seat identity proven per call;
fail-closed retry with a spend budget; ledger live (other agents' consults already writing
to it); one topic key across guard and writer; a session-start probe that names dead CI.
29 tests across three suites. Everything pushed on `wip/comms-notifications-2026-07-05`.

**What only Sean can do.** GitHub Actions billing/minutes · Render API key rotation
(exposed 2026-08-12, still standing) · DMARC record (SWA-13, still standing) · grant the
`gh` token the `user` scope so an agent can *read* billing without a browser.

---

## 1. Repo facts a fresh session must know before touching anything

| Fact | Value | Why it matters |
|---|---|---|
| Working branch | `wip/comms-notifications-2026-07-05` | **2,226 commits behind `origin/main`, 416 ahead.** Nothing committed here reaches main or Render. It is a rescue/harvest branch. |
| PR branch | `ci/shadow-check-first-run` → **PR #71** (OPEN, mergeable) | Cut from `origin/main` in a worktree; carries the 5 CI files. Its `pull_request` trigger is the acceptance test. **Currently carries the OLDER merged workflow** — must be updated from the rebuild below. |
| Parallel agents | Several Claude/Codex sessions share **one working tree and one git index** | **Never `git add -A`.** Stage explicit paths. Check `git diff --cached --name-only` before every commit — 13 foreign files were found staged this session. Read `.ai-workflow/coordination/*.lane.md`; run `node scripts/lane.mjs digest`. |
| Stale `.git/index.lock` | Happened twice (0 bytes, no git process) | Diagnose (size, mtime, `tasklist | grep git`) — a LIVE lock had 2 git processes and a 90s mtime. Only clear a verified-stale one; harness blocks `rm` inside `.git`, `node -e unlinkSync` works under Sean's explicit order. |
| Rescue copy | `C:/tmp/swan-rescue-20260824` (2,459 files) | Now redundant — everything is committed and pushed. Delete after PR #71 is green. |
| Secret scanner | `.secretignore` has 4 `postgres-url` entries | All verified inert (`shadow:shadow@localhost`, `example.com` fixtures). Never allowlist unread. |
| `gh` token scopes | `gist, read:org, repo, workflow` — **no `user`** | Billing API returns 404 without it. See §3. |

## 2. Where the code stands (all pushed unless marked)

### The review harness (`scripts/debate/`, `scripts/consult-grok.mjs`, `scripts/lib/spend-ledger.mjs`, `scripts/hooks/`)
- **`ox-identity.mjs`** — side-effect-free seat-identity module. `Reviewer:` (requested) AND
  `Served:` (provider-reported, off the SSE stream) must both agree with `OX_MODEL` after
  canonicalisation (case, `:variant`, dated snapshots) — **exact match, empty alias table,
  no prefix matching** (prefix silently passed `gpt-4`→`gpt-4o`). Structured `FAULT` codes
  with explicit `abort`/`retry` flags; **retry is opt-in**; unknown codes neither abort
  nor retry. `oxIdentityFault` exported pre-bound so no seat-binding code lives untested.
- **`ox-final-review.mjs`** — 3× separated Ox calls; seat via `SWAN_GROK_MODEL` env (the
  argv `--model` flag was never parsed → every past "Ox" verdict was Grok). 15s paced,
  ±20% jitter, ONE retry after 60s only on `TRANSIENT`/`TRUNCATED`/`IO_ERROR`, global
  `RETRY_BUDGET=2`, aborts the run on any seat fault, exits 1 unless all calls parse.
- **`consult-grok.mjs`** — shared OpenRouter transport (grok / deepseek / ox). Writes
  `**Served:**` header; **exits 75 (EX_TEMPFAIL) on 429/5xx**, 1 on config errors; calls
  `recordSpend()` with actuals after every completed call (null when unpriced).
- **`spend-ledger.mjs`** — `topicFromPath()` is the ONE topic normalizer (guard + writer);
  `usd: null` = unpriced, **readers count null as `CAPS.perCall`**. Ledger at
  `.ai-workflow/spend/ledger.jsonl` is live — other agents' consults are writing to it.
- **`drift-check-gate.mjs` probe 10** — session-start dead-CI detector: never-ran /
  runs-but-all-fail (startup_failure ⇒ billing) / stale-success; 20s timeout; fail-UNKNOWN.
- **Tests:** `ox-final-review.identity.test.mjs` (21), `spend-ledger.test.mjs` (7 — proves
  cap *accumulation*, not just the write pipe), `drift-check-gate.test.mjs` (1). Run with
  `node --test <file>`.

### The shadow CI (`.github/workflows/migration-shadow-check.yml` + `backend/scripts/`)
- **Seeder** `seed-shadow-db.mjs` + `.selftest.mjs` (36/36) + `.test.mjs` — committed
  verbatim as the panel left it (`5ef9e50d8`). Refuses any non-loopback / non-"shadow"
  URL, no override switch. Enum values read off the DataTypes instance (273 columns would
  otherwise be NULL).
- **Workflow, generation 1 (mine, `cd4bc8b5f`)** — rails base + seeding layer. **Found
  vacuous by a later review:** leg 2 ran zero migrations (leg 1 had applied them all) and
  `migrate:production` exits 0 on failure. Superseded.
- **Workflow, generation 2 (parallel session, now committed on this branch)** —
  `SWAN_MIGRATE_STRICT=1`, **baseline-then-delta** (leg A = base commit's migrations on
  empty DB → seed → leg B = only this change's migrations, against populated tables),
  `pre-migrate-guard --check` moved between the legs, identical path lists for PR and
  push. Adds `backend/scripts/shadow-meta-count.mjs` and a STRICT mode in
  `safe-migrate.mjs`. **This is the version that must reach PR #71.**
- **Never run.** No CI log exists for any generation. That is the whole gap.

### Docs written this workstream (all committed)
- `SURFACE-RECONCILIATION-MIGRATION-SHADOW-CHECK-2026-08-24.md` — why two workflows
  existed and how they merged; `npm install` vs `npm ci` deploy-parity argument.
- `SPEND-LEDGER-AND-HYGIENE-FINDINGS-2026-08-24.md` — dead ledger writer; `.bak` files (all
  recoverable from git); 22 vendored skill trees (now gitignored via `.agents/skills/*/`).
- `HERMES-WORK-ORDER-AI-WEAKEST-LINKS-2026-08-23.md` — SWA-204; Hermes reviews the
  learning corpus for per-seat weaknesses. Delivered via `standing-context.md`.
- Learning packets: `20260824-every-ci-gate-in-the-repo-was-silently-dead.md`,
  `20260823-the-learning-systems-own-best-field-was-never-validated.md`, and the parallel
  session's `…a-control-that-looks-armed-is-worse-than-one-visibly-dead.md`.

## 3. THE BILLING QUESTION — how the next agent proves it is cleared

Sean's instinct was Playwright. **Use it last, not first.** The question is not "what does
the billing page say" but "can a workflow run" — and that is observable without a browser.
Three tiers, cheapest first; stop at the first that answers.

**Tier A — read billing over the API (needs one Sean command, then no browser ever).**
```bash
gh auth refresh -h github.com -s user        # Sean runs this once; interactive device flow
gh api users/SeanSwan/settings/billing/actions   # → total_minutes_used, included_minutes, minutes_used_breakdown
```
If `total_minutes_used >= included_minutes` (2,000/mo free tier, private repo) the cause
is confirmed; the fix is a spending limit > $0 or a plan change at
`github.com/settings/billing`. After Sean acts, re-query: the numbers themselves do not
change, but the next run does — go to Tier B.

**Tier B — fire a cheap workflow deliberately and watch it (no browser, no scope).**
```bash
gh workflow run docs-check.yml --ref main       # any small workflow on main; workflow_dispatch
sleep 30 && gh run list --limit 1 --json status,conclusion,workflowName
```
`startup_failure` in 0s → still blocked. `queued`/`in_progress`/`completed:success` →
**billing is cleared.** Then re-trigger PR #71 (`gh pr close 71 && gh pr reopen 71`, or push
an empty commit to `ci/shadow-check-first-run`) and watch `gh run watch`. Probe 10 in the
session-start drift check reports the same truth automatically every session.

**Tier C — Playwright, supervised (only if Tiers A/B are ambiguous or Sean wants the page
read).** Rule 47 pattern: **Sean authenticates in the browser; the harness observes;
read-only; no clicks that change state.** Use `mcp__playwright__browser_navigate` to
`https://github.com/settings/billing/summary` in a session Sean has logged into, snapshot
the Actions usage panel, redact account identifiers before anything reaches chat. Never
automate the login, never store the session. This tier answers "why" (limit vs failed
payment vs plan); Tier B already answers "is it fixed."

**Sean said "it should be clear."** As of `2026-08-25T02:14Z` it was not — four runs in
the preceding 13 minutes all startup-failed. First action for the next agent: re-run
Tier B before believing either statement.

## 4. Retroactive corrections the next agent must carry

- **Every historical "Ox Alpha" verdict in this project was Grok 4.6.** Consensus counts
  that included Ox were inflated by one, toward agreement. Treat Ox rows as Grok rows in
  any corpus analysis (SWA-204 work order already says so).
- **The 15-round debate's item 9 ("selftest after `npm ci`") was ratified against the
  wrong file** — the deploy runs `npm install`. Re-decided; do not re-adopt.
- **Two ledger numbers are self-reported and unverifiable:** the debate's $5.43 and this
  session's ~$0.50. The ledger recorded none of it (no writer at the time).

## 5. Lessons this session paid for (the ledger of mistakes, for the next agent's benefit)

| Mistake | Times | What actually stops it |
|---|---|---|
| Validated the artifact, not the venue (YAML checked; never asked if ANY workflow had ever run) | 1 | Probe 10 — now mechanical |
| Merged two workflows and never traced whether leg 2 had anything left to migrate — a gate that could not fail | 1 (mine) | Ask "how does this step FAIL?" of every gate step; a parallel session caught it |
| Fail-open defaults in my own safety code (retry predicate, `cost ?? 0`) | 2 | Three seats caught both; opt-in allowlists, null-as-worst-case, tests that prove the cap |
| Heredoc / string-surgery mangling multi-line writes | 4 | **Write/Edit tools for anything with escapes or fences.** Not a heredoc. Ever. |
| `cmd | tail` masking a non-zero exit — a backgrounded Ox run "succeeded" with 2/3 parsed | 1 | The repo's exit-status hook catches foreground; for background, never pipe the command whose status you need |
| Identified a P0 (uncommitted work one `git clean` from gone) and did not mitigate for hours | 1 | Mitigate in the turn you find it; copying files out needs no git |
| Nearly deleted a LIVE index lock by reflex after clearing a stale one | 1 | Diagnose each time: size, mtime, running git processes |
| Committing on a shared index nearly swept 13 foreign files | 1 | `git diff --cached --name-only` before every commit; stage other-owned files by blob if you must touch them |
| Standing reminders (DMARC, Render key) not surfaced all session | 1 | They are in §0. Surface them. |

## 6. Sean-owed queue, in order

1. **GitHub Actions billing** — revives every gate at once (§3). **Corrected:** look
   for a **failed payment / past-due balance**, not exhausted minutes — see the
   banner at the top and the hostile-review doc.
1b. **Plan decision — this is the one that decides whether the gate ever gates.**
   Branch protection is 403 on a free private repo, so the merged gate is advisory
   only. Three options: (a) GitHub Pro; (b) **make the repo public** — free, and
   named by the 403 itself, but **the exposed Render key must be rotated first**
   and the rewritten-history repo audited before any visibility change; (c) accept
   an advisory-only signal and say so plainly instead of claiming a gate.
1c. **Reconcile enforcement with the deploy model.** A required PR check means
   `main` stops taking direct pushes — which is how this project deploys. Exempting
   admins makes it theatre for the person who ships every migration. Sean's call.
2. `gh auth refresh -h github.com -s user` — lets agents read billing without a browser.
3. **Rotate the Render API key** (exposed 2026-08-12) — now also a **prerequisite**
   for option (b) above.
4. **DMARC record** in Namecheap (SWA-13, ~10 min).
5. Dismiss GitGuardian's false positive on PR #71 (`shadow:shadow@localhost` fixtures).
6. Delete `C:/tmp/swan-rescue-20260824` once PR #71 is green.

## 7. Next slices for the agent, in order

> **REORDERED by the 2026-08-25 hostile review.** The original list put the
> acceptance artifact *before* the review — trust preceding scrutiny — and its
> step 4 asked exactly the two right questions (*can leg B ever be empty by
> construction? does STRICT make any legitimate re-run fail?*). **The review has
> now answered both: yes, and yes.** The fixes below come from those answers.

1. **Tier B billing probe** (§3). Do not proceed on "should be clear."
   *(Re-run 2026-08-25T02:26Z: a deliberate `workflow_dispatch` on `main` still
   `startup_failure`d with zero jobs. Still blocked.)*
2. **Fix the four defects the review found before any run** — they are cheap and
   they decide whether the first run means anything:
   - move `SWAN_MIGRATE_STRICT` off the job `env` onto **leg B's step only** (it
     currently makes leg A replay 307 historical migrations under a flag they were
     never written against);
   - redefine the delta as **additions only, extension-filtered**:
     `git diff --name-only --diff-filter=A "$BASE" HEAD -- 'backend/migrations/*.cjs' 'backend/migrations/*.js'`;
   - give `config/config.cjs` the loopback SSL exemption that
     `pre-migrate-guard.mjs:227` already has (its production block forces
     `ssl.require: true` against a container with `ssl = off`);
   - add the integer shape-guard to `after`, as `before`/`BASE_COUNT` already have.
3. **Update PR #71 from the NEWEST workflow commit — never a named generation.**
   `git log -1 --oneline -- .github/workflows/migration-shadow-check.yml`
   Cherry-pick that plus `backend/scripts/safe-migrate.mjs` and
   `backend/scripts/shadow-meta-count.mjs` onto `ci/shadow-check-first-run`
   (worktree from `origin/main`). Verify `node --check` + selftest there. Push.
4. **Canary run = the acceptance artifact, and it must be RED.** A green PR-#71 run
   proves nothing: PR #71 touches zero migrations, so `DELTA_COUNT=0` and leg B
   reports NOT APPLICABLE. Cut a throwaway branch with one migration engineered to
   break against seeded data (a `NOT NULL` column with no default on a populated
   table, or a unique index over colliding seeded values) and require a **red whose
   message names the constraint violation**. Attach that run URL to SWA-200. Then
   take a green run on the real PR as the plumbing check it is.
5. **Re-review after the fixes** (GLM 5.3 + Ox ×3). Free or cents; the spend guard
   is live. Ask the next-layer questions the review left open: can `applied > 0` be
   satisfied by someone else's migration on a stale PR base? does a models-only PR
   ship schema drift through a green NOT-APPLICABLE?
6. Merge PR #71 — **and state honestly that it is advisory until the plan question
   in §6.1b is decided.** Then: gate on `SEED_SKIPPED` ∩ delta, pin `sequelize-cli`
   into the install step, move the deploy to `npm ci` (own ticket), wire
   `recordSpend` into kimi/sol/glm transports when their lanes clear, and the
   deferred cross-process ledger-failure escalation.
7. **Separately, and possibly bigger than this gate:** 32 `.mjs` files in
   `backend/migrations/` are orphans that the deploy never executes — including
   `add-payment-idempotency-unique-indexes`, `add-idempotency-to-shopping-cart` and
   `create-user-consents-table`. Their objects most likely exist via
   `syncDatabaseSafely()` at boot, so this is a schema-provenance question, not a
   confirmed outage. One read-only production query settles whether the payment
   idempotency **unique indexes** are actually there. Do that before relying on them.

## 8. Paste-ready opening prompt for the new chat

```
Read BOTH of these in full before doing anything:
  docs/ai-workflow/AI-HANDOFF/HOSTILE-REVIEW-SHADOW-CI-HANDOFF-2026-08-25.md   <- read FIRST
  docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-REVIEW-HARNESS-AND-SHADOW-CI-2026-08-25.md

You are continuing the review-harness + shadow-CI workstream (SWA-200 / SWA-196).
The review returned REJECT on the handoff's plan; the handoff's own top banner lists
the four corrections. Do not aim at "gate live on main" — branch protection is 403 on
this plan, so a merged PR is advisory until Sean decides the plan question.

Start with §3 Tier B: prove whether Actions can run by firing a cheap workflow_dispatch
and reading the run status — do not trust "it should be clear," and do not repeat the
"free minutes exhausted" diagnosis; it is disproven (four monthly resets, zero
executions). Then follow §7 in its corrected order: fix the four defects BEFORE any
run, take the newest workflow commit rather than a named generation, and make the
acceptance artifact a canary that must come out RED — a green run on PR #71 proves
nothing, because it touches zero migrations.

Verify every volatile fact yourself before repeating it; several in §1 had already
drifted within the hour. Rules that bit us last time: never git add -A (shared index —
check git diff --cached before every commit); use Write/Edit for any multi-line file
content, never heredocs; never pipe a command whose exit status you need. Surface the
Sean-owed queue in §6 at your first closeout — items 1, 1b and 3 are blocking, and the
Render key rotation is a prerequisite for one of the plan options.
```
