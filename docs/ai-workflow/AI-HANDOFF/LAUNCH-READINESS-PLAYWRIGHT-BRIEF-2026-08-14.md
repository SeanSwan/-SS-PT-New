# Mission brief — four-role production Playwright audit for launch clearance

You are auditing **sswanstudios.com** (SwanStudios, a production personal-training SaaS) to decide
whether it is safe to launch. The owner wants clearance, not reassurance. Your job is to find what
is broken before real clients do.

**Read this whole brief before running anything.** It contains the environment, the exact commands,
the traps that will otherwise cost you hours, and — most importantly — what this harness *cannot*
tell you, which you must cover separately or explicitly declare uncovered.

---

## 1. The standard you are held to

- **No completion claim without proof.** Never write "done", "working", "passing", or "ready"
  unless the same message contains the exact command you ran and its output. A green suite is not
  proof that an assertion exercised what it claims.
- **Verify every finding against source before reporting it.** A failure message names a symptom,
  never a cause. In the previous audit, 4 of 17 externally-reported findings were false, including
  one that alleged a production risk that did not exist.
- **Classify every failure before fixing anything** as one of:
  - `SITE` — a real product defect,
  - `HARNESS` — the test is stale or wrong and the product is fine,
  - `ENVIRONMENT` — missing auth state, no backend, port conflict, network.
  The previous audit's headline "12 failures" was 4 HARNESS + 8 ENVIRONMENT and **0 SITE**.
  Misclassifying wastes the owner's time and erodes trust in the gate.
- **Never make a gate pass by weakening it.** Do not add suppressions, do not set
  `SWAN_DASHBOARD_CRAWL_ALLOW_MISSING_AUTH=1`, do not raise
  `SWAN_DASHBOARD_CRAWL_ALLOWED_TRUNCATIONS`, do not delete assertions. If a gate is wrong, say so
  and show why.

---

## 2. Environment — read carefully, this is where people lose time

**Use this worktree, not the main checkout:**

```
C:/tmp/ss-qa-harness-slice0        branch: claude/qa-harness-slice0-20260811
```

The harness was substantially rebuilt on 2026-08-13/14 and **those commits are not on `main`**. If
you run from the main checkout you will use a version that is blind to 39 dashboard routes and has
a stale write-allowlist.

**Confirm by FILE, not by commit SHA.** This branch has been rebased at least once — commit hashes
recorded earlier in the session are already orphaned, so a SHA check reports "wrong branch" on a
perfectly correct tree and sends you back to `main`, which is the exact mistake this section exists
to prevent.

```bash
cd C:/tmp/ss-qa-harness-slice0
ls frontend/e2e/mission/dashboardRouteManifest.ts \
   frontend/e2e/mission/benignBeacons.ts \
   frontend/e2e/mission/productNoise.ts \
   frontend/e2e/mission/uncrawledRoutes.ts \
   backend/utils/modelRegistryAudit.mjs \
   backend/models/dormantModels.mjs
grep -c "user-dashboard/groups" frontend/e2e/mission/production-dashboard-crawl.routes.ts   # expect 1
```

All six files present and the grep returning 1 means you have the current harness. Any missing file
means you are on an older tree — stop and ask the owner to push the branch rather than falling back
to `main`.

**Other agents commit into this repo concurrently.** Before you edit anything, read the coordination
ledger (`node scripts/lane.mjs` from the main checkout) and claim your files. Do not `git add -A`,
and do not rebase or amend shared history.

**Known traps — all of these have already cost someone hours:**

| Trap | Symptom | What to do |
|---|---|---|
| Long runs die when backgrounded | zero-byte output file, no error | Run in the **foreground** with bounded `--grep`. The runner buffers through `spawnSync` and emits nothing until it exits. |
| Port 5173 occupied | `Port 5173 is already in use`, run hangs | `SWAN_PLAYWRIGHT_FRONTEND_PORT=5271` (or any free port). Do **not** kill the process on 5173 — another agent may own it. |
| Whole-frontend typecheck | OOM at 8 GB heap | Use `cd frontend && npx tsc -p tsconfig.mission-check.json` (scoped to `e2e/`). |
| `.env` is not in the worktree | `OPENROUTER_API_KEY not found`, `LINEAR_API_KEY is not set` | Secrets live in the **main** repo `.env` and in Windows **user** env vars. Load them into the child process; never echo a secret value into chat or a file. |
| 21 backend test files never run | vitest reports "No test suite found" | They use `node:test`. Run with `node --test <file>`. Pre-existing, not yours. |
| `client-proof-loop.contract.mission.spec.ts` fails | contract mode, "Connecting to Server" | Pre-existing — needs a backend that contract mode does not start. Verified failing on a clean tree. Do not chase it. |

---

## 3. Step 0 — the owner must capture auth states (you cannot)

**Without these, the entire authenticated audit is impossible** and the harness will correctly fail
rather than report a false green. No credential passes through any agent — a real browser opens and
the owner logs in.

Ask the owner to run these **from the repo root** (they are in the root `package.json`, *not*
`frontend/`):

```powershell
cd C:\tmp\ss-qa-harness-slice0
npm run qa:prod-auth:capture:admin
npm run qa:prod-auth:capture:trainer
npm run qa:prod-auth:capture:client
npm run qa:prod-auth:capture:user
```

Each opens a headed browser, waits for a real login, and writes a Playwright storage state into
`.auth/`. Then confirm all four exist before proceeding. If any role is missing, **say so and do not
audit that role** — do not substitute another role's session.

---

## 4. The runs, in order

### 4.1 Contract suite — no auth, no network, ~5s. Proves the harness itself is sound.

```bash
cd C:/tmp/ss-qa-harness-slice0
SWAN_PLAYWRIGHT_FRONTEND_PORT=5271 node scripts/qa/playwright-mission.mjs \
  --grep="dashboard route manifest drift|product-noise suppression|benign write-beacon|dashboard crawl report contract|qa findings worklist" \
  --reporter=line
```
Expect **124 passed**. If the route-manifest drift gate fails, the app has gained or renamed routes
since 2026-08-14 — that is a real finding and the crawl table must be updated before the crawl means
anything.

### 4.2 Unauthenticated production checks — public surface + auth boundary.

```bash
node scripts/qa/playwright-mission.mjs --prod-live-readonly --reporter=line
```
Baseline as of 2026-08-14: **4 passed / 8 failed (all "no auth state") / 6 skipped**. Once step 0 is
done, all 18 should run. Any *new* failure here is a SITE finding.

### 4.3 The four-role authenticated crawl — the core of this audit.

```bash
node scripts/qa/playwright-mission.mjs --prod-live-readonly \
  --require-prod-auth-roles=admin,trainer,client,user \
  --grep=@dashboard-crawl --reporter=line
```

This visits **124 routes** across admin / trainer / client / user, blocking every write, and reports
console errors, page errors, failed requests, read failures, route failures, and unreached routes.

**Expect real findings.** 39 of those routes have *never been visited by any audit* — they were
added on 2026-08-14 when a drift gate revealed the crawl had been blind to them while reporting
100% coverage. Among them are money-path surfaces: `/dashboard/trainer/earnings` (commission
ledger), `/dashboard/admin/trainer-payouts`, `/dashboard/admin/session-allocation`,
`/dashboard/admin/client-trainer-assignments`, `/dashboard/admin/trainer-permissions`,
`/dashboard/admin/support`, and `/user-dashboard/groups`. **Findings on these are the expected
outcome, not a regression.**

Evidence is written per-route as the crawl proceeds (crash-durable), plus a ranked worklist. Read
`test-results/` and the attached crawl report rather than relying on console scrollback.

### 4.4 Report

```bash
node scripts/qa/mission-report.mjs
```
Exit code is the contract: non-zero means blocking findings or an incomplete role.

---

## 5. What this harness CANNOT clear — cover these or declare them uncovered

A read-only crawl proves pages load without errors. **That is not a launch.** Do not let a green
crawl be read as clearance. Each item below is either tested by you separately or explicitly listed
as "NOT VERIFIED" in your report:

1. **Every write path.** Signup, login, checkout/payment, booking, workout logging, messaging,
   uploads. The harness blocks all writes by design. These must be exercised against **staging**,
   never production — the runner has `--staging-write` with explicit gates for this. **Never pass
   `--allow-prod-write`.**
2. **Payments.** Stripe checkout, webhook handling, failure and refund paths. There is a
   `qa:render-payment-preflight` and a `qa:stripe-testmode-replay` script — use test mode.
3. **Authorization boundaries.** Can a client reach an admin route? Can a trainer read another
   trainer's clients? Can a logged-out user reach anything protected? The crawl visits each role's
   *own* routes; it does not attempt cross-role access. **For a launch this is the highest-risk
   untested area** — a data-exposure bug here is worse than any broken page.
4. **Email/SMS delivery.** Verification, password reset, receipts, notifications.
5. **Mobile reality.** The crawl runs Desktop Chrome + Mobile Chrome. Check real breakpoints —
   320 / 375 / 414 / 768 / 1024 / 1440 / 1920 — for overflow, tap targets under 44px, and anything
   that requires hover to operate.
6. **Accessibility.** Contrast (4.5:1), keyboard navigation, focus traps, screen-reader labels.
7. **Empty / loading / error states.** A new account sees empty everything. Log in as a *fresh*
   user, not a seeded one, and confirm nothing renders as a crash, a spinner forever, or fake demo
   data.
8. **Data truthfulness.** SwanStudios is workout-progress-first. Charts must come from real logged
   workouts. Any placeholder or mock data visible to a user is a launch blocker, not a polish item.
   Look specifically for the strings "demo mode", "Sarah Johnson", "coming soon".
9. **Performance under a cold cache**, and behaviour when an API call fails.

---

## 6. Severity rubric — use these words exactly

- **LAUNCH BLOCKER** — data exposure across users, payment can take money without delivering,
  auth bypass, a core loop (sign up → book → train → log → see progress) is broken, or a user sees
  another user's data. Also: fabricated data presented as real.
- **HIGH** — a major surface is unusable for one role, a money-path page errors, a form silently
  fails to save.
- **MEDIUM** — degraded but workable; layout breaks at a common width; confusing error handling.
- **LOW** — cosmetic, console noise with no user impact.

For every finding give: **role · route · what you did · what happened · what should have happened ·
severity · SITE/HARNESS/ENVIRONMENT · the evidence** (screenshot path, console text, network entry).

---

## 7. Deliverable

A single markdown report containing:

1. **Verdict up front**: CLEARED / CLEARED WITH CONDITIONS / NOT CLEARED, and the one-line reason.
2. **Launch blockers**, each with reproduction steps a developer can follow without asking you
   anything.
3. **Everything else**, ranked, with the same evidence standard.
4. **Coverage statement** — which of the four roles were actually audited, how many of the 124
   routes were visited, and which were not reached and why.
5. **NOT VERIFIED** — an explicit list from section 5. Anything you did not test must appear here.
   A launch decision made against a report that hides its gaps is worse than no report.
6. **Harness findings** kept separate from site findings, so the owner is never handed a test bug
   dressed up as a product bug.

---

## 8. Hard rules

- **Read-only against production.** No writes, no `--allow-prod-write`, no schema changes, no
  migrations, no seeders, no destructive database commands. Ever.
- **No secret ever reaches chat, a file, or a commit.** Presence checks only (`grep -c`, length).
- **Do not weaken a gate to make it green.**
- **Do not report a subagent's or a tool's claim as fact** — verify it yourself first.
- If you cannot prove something, write "NOT VERIFIED" and say why. That sentence is worth more to
  this launch than a confident guess.
