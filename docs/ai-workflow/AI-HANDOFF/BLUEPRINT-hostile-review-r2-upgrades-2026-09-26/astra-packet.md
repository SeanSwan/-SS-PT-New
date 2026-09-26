# Astra Hostile Review Packet — hostile-review-the-review + upgrade/enhancement blueprint

## REMIT

Mega Blueprint — you are reviewing a completed security/money-integrity review campaign on the
SwanStudios production SaaS (two review waves, five fix commits, all pushed to the feature
branch). Your job has THREE layers:

1. **HOSTILE-REVIEW THE REVIEW (A1).** Two AI review waves ran; both missed things, and wave 1's
   fixes were themselves broken (a second reviewer broke the headline fix in minutes). Assume
   BOTH waves are incomplete. You have REPOSITORY ACCESS through this transport: do NOT trust
   this packet's characterizations — open the code, run the read-only commands below, and
   re-derive. Attack the shipped fixes for residual holes; identify the lens BOTH waves still
   lack; find what a 3rd wave must look at.
2. **UPGRADE / ENHANCEMENT BLUEPRINT (the deliverable Sean builds next).** Emit the prioritized
   build plan for hardening and upgrading this application: P0 security, P1 money integrity,
   P2 data-truth/product correctness, P3 ops/reliability, P4 explicit kill-list (what NOT to
   build). For each item: what to build, which finding motivates it, surfaces/files touched,
   test plan, deploy/rollback note. Emit blueprints, wireframes, Mermaid flows and test-plan
   documents — not descriptions of them. Declare `N/A — <reason>` only where genuinely true.
3. **Decision-density self-test** and a hostile review of your own package (A2) before finalizing.

## CONTEXT (orientation — verify everything yourself against the repo)

- Repo: SwanStudios (SS-PT), branch `creator-brains-engine-r2-20260915`, HEAD `ad268c2d4`,
  PUSHED (origin tip = HEAD; `main` is behind and auto-deploys to Render production — nothing
  here has reached production yet).
- Stack: React 18 + TS + styled-components frontend (`frontend/`), Node/Express/Sequelize/
  PostgreSQL backend (`backend/`), Render hosting, Cloudflare R2 media, Stripe payments.
- Trainer-led B2B2C coaching SaaS: real client PII, real money path, real production users.
- 2026-09-22 incident: a git race destroyed 23 unpushed commits (content survived in the working
  tree; since recovered). `START-HERE-INCIDENT-2026-09-22.md` at repo root. Object-store
  discipline: no `git clean/reset --hard/stash/gc/worktree add` in this tree.
- House constraints that bind any blueprint you emit: files max 300 lines; styled-components +
  CSS tokens (no MUI); Victory for charts; 44px touch targets; dark-first theme; WCAG 4.5:1;
  zero PII to LLM providers; fail-closed defaults; tests written before fixes; prod DB DDL
  requires Sean's explicit approval; `main` push = production deploy (Sean-gated).

## THE CAMPAIGN YOU ARE REVIEWING

### Wave 1 — eight lens-rounds (parallel subagent fan-out, ZCode seat)
Lenses: authz/IDOR · money path · injection · schema drift · cross-tenant privacy · public
surface · infra/config · concurrency/races. Consolidated findings (file:line in the repo):
- **C1 CRITICAL** — cart mutable after Stripe checkout; fulfillment re-reads current rows;
  no charge-vs-cart reconciliation → pay-1x-grant-Nx.
- **H1-H3 HIGH** — trainer role alone granted cross-tenant access (workout sessions incl.
  client emails + private notes; variation logs; AI form analyses).
- **H4/H5 HIGH** — session allocation had no order-level idempotency (ACH webhook retries +
  admin status toggles double-granted); admin apply-payment pre-set its idempotency marker.
- **H6-H11 HIGH** — Layer-1 request logging bypassed URL redaction (tokens into logs);
  failed migrations non-fatal at 3 layers; no global rate limiter (anon third-party quota
  burn); anonymous waiver records attributable to real clients; unauthenticated photo proxy
  serving body-composition photos; onboarding dictation sending names/phones/DOB/medications
  to LLM providers.
- **MEDIUM/LOW** — follow feature broken (notification enum drift); onboarding INSERTs writing
  to nonexistent snake_case columns (silent data loss); badge double-award (no unique index);
  challenge join TOCTOU; immortal polling intervals; stale activeClient across logout;
  orders mintable without payment; refund webhook gap; `new_follower`/ghost-table FKs;
  contradictory unhandledRejection handlers; error middleware discarding 4xx statuses;
  cron overlap guards per-process; multer 1.x; PII in retained log files.

### Wave 1 fixes (commits, all pushed)
- `b2a898f9f` — cart freeze during pending checkout (4 mutation routes → 409
  CART_CHECKOUT_LOCKED; releases on `checkout.session.expired` or 24h) + charge-vs-cart
  reconciliation in `grantSessionsForCart` (webhook ACKs on mismatch, verify-session → 409).
- `b35da21e0` — `assertAssignmentOrAdmin` gates on 12 cross-tenant route paths across
  workoutSession/variation/formAnalysis.
- `22a2240c5` — allocation idempotency: one transaction, Order row `FOR UPDATE`,
  `paymentAppliedAt` claimed inside the transaction; apply-payment stops pre-setting the marker.

### Wave 2 — hostile-review-of-the-review (a second reviewer attacked the fixes)
It broke wave 1 in three places — proof that "tests green" is not "attack-survived":
- **BLOCKER** — reconciliation compared against `cart.subtotal`, frozen at checkout creation,
  while mutations only update `cart.total` (`backend/utils/cartHelpers.mjs:195-203`) — the
  check could never fire. → now compares the charge against the LIVE rows value
  (`chargeCoversCartValue`, `backend/services/SessionGrantService.mjs`).
- **BLOCKER** — `checkoutSessionExpired` was never reset (one abandoned checkout disarmed the
  freeze forever) and a stale session's expiry could disarm a NEWER session's lock. →
  re-armed at `create-checkout-session` (`backend/routes/v2PaymentRoutes.mjs` Step 6); both
  expiry handlers match `checkoutSessionId === session.id`.
- **REGRESSION** — formAnalysis `/:id` + `/:id/reprocess` 404'd trainers/'user'-role on their
  OWN uploads (no self branch in the gate). → self short-circuit added.
- **HAZARD** — financial-record INSERT swallowed errors INSIDE the allocation transaction
  (Postgres aborted-transaction poisoning). → FT writes moved post-commit, best-effort, in
  BOTH allocation services.

### Wave 2 fixes (commits, all pushed)
- `039a09693` — all of the above hardening + `unifiedSessionService.allocateSessionsFromOrder`
  (sibling service, `backend/services/sessions/session.service.mjs:2295`) gets the same claim.
- `ad268c2d4` — site-truth fixes: `NOTIFICATION_TYPES` exported with `new_follower` (follow
  feature un-broken; admin test-broadcast pre-validates); onboarding INSERTs use quoted
  camelCase columns (`backend/routes/clientOnboardRoutes.mjs:250,281`); Layer-1 logging routed
  through `redactRequestUrl` (`backend/core/app.mjs:87-94`); logout clears `ss-active-client`
  (`frontend/src/context/AuthContext.tsx`); SuccessPage routes `AMOUNT_MISMATCH` to
  support-review state (`frontend/src/components/NewCheckout/SuccessPage.tsx:120`).

### Verification state
Backend vitest: 6764 pass / 14 fail — the 14 are the pre-existing baseline (awardWorkoutXP,
coachActionProposal×2, goalGamificationCommandDispatcher, socialPostMediaProxy,
adminStorefrontImageUpload — files untouched by the campaign). Frontend `tsc --noEmit` clean
(requires ~8GB heap — OOMs at default). New regression suites:
`backend/tests/api/cartCheckoutFreeze.contract.test.mjs`,
`sessionGrantAmountReconciliation.test.mjs`, `trainerCrossTenantGates.contract.test.mjs`,
`sessionAllocationIdempotency.test.mjs`, `siteTruthRound2Fixes.contract.test.mjs`.

## KNOWN-OPEN BACKLOG (deliberately NOT fixed in this campaign — your blueprint owns these)

- **Photo media auth**: `/api/serve-photo` proxy + `/uploads` static mount serve profiles,
  banners, `measurements` (body-composition photos), social media with NO auth — UUID-key
  capability is the only barrier (`backend/core/routes.mjs:549`,
  `backend/core/photoServeCategories.mjs`, `backend/core/middleware/index.mjs:110`).
- **Waiver forgery**: anonymous waiver submission creates 0.9-confidence PendingWaiverMatch
  records attributable to real clients from email+DOB; no email-ownership proof
  (`backend/controllers/publicWaiverController.mjs:344-377`).
- **Rate limiting**: `apiLimiter` mounted nowhere; `uploadLimiter` imported by nothing; legacy
  in-memory limiter on contact/register; `/api/free/*` burns paid third-party quotas
  anonymously (USDA falls back to DEMO_KEY) (`backend/middleware/rateLimiter.mjs:102,171`,
  `backend/routes/freeApiRoutes.mjs:43-68`).
- **Migration fatality**: failed migrations are non-fatal at 3 layers; deploys boot green on
  drifted schema (`backend/scripts/render-start.mjs:95-100`, `backend/utils/startupMigrations.mjs`,
  `backend/core/startup.mjs:532`); production also runs `sequelize.sync({alter})` at every boot
  (`backend/core/startup.mjs:207`).
- **PII to LLMs**: new-client onboarding dictation intentionally bypasses the de-identifier —
  names, phones, DOB, medications, emergency contacts go to the provider
  (`backend/services/aiChatService.mjs:970-1000`; the existing-client path is properly
  de-identified via `deIdentifier.mjs`).
- **DB-level fixes needing migrations/DDL** (Sean-gated): badge award unique index + guard
  (`backend/services/badgeService.mjs:336-369`); challenge join row locks
  (`backend/controllers/challengeController.mjs:370,441-467`); `notifications_userId_fkey`
  still references ghost lowercase `users` table
  (`backend/migrations/20260205100000-repair-notifications-table.cjs:66`,
  repoint migration `20260730120000-repoint-user-fks-to-canonical-Users.cjs` missed it);
  one-time backfill `UPDATE "Orders" SET "paymentAppliedAt" = "completedAt" WHERE
  status='completed' AND "paymentAppliedAt" IS NULL` (pre-deploy completed orders).
- **Refund path**: `charge.refunded` handled only on legacy cart webhook
  (`backend/routes/cartRoutes.mjs:975+`); main webhook has no case; refund-vs-grant
  reconciliation (`backend/services/refundReconciliationService.mjs`) matches carts by
  `paymentIntentId` which `SessionGrantService.markCartCompleted` never persists.
- **Order minting**: `POST /api/orders/create-from-cart` creates pending orders + completes
  carts with zero payment, no transaction, no idempotency
  (`backend/routes/orderRoutes.mjs:98`, `backend/controllers/orderController.mjs:14-110`).
- **Assorted**: leaderboard exposes real names platform-wide
  (`backend/controllers/clientProgressController.mjs:88-102`); access JWTs 24h not 15m
  (`backend/controllers/authController.mjs:255`); immortal polling interval
  (`frontend/src/hooks/useEnhancedClientDashboard.ts:416-428`); contradictory
  unhandledRejection policies (`backend/server.mjs:67` vs
  `backend/core/middleware/errorHandler.mjs:75`); error handler turns custom 4xx into 500
  (`backend/core/middleware/errorHandler.mjs:56`); per-instance cron overlap guards; multer
  1.x; `test-token.txt` in backend tree; PII in retained `backend/combined.log`;
  historical trainer access lost when assignments end (product call);
  `getUsers` dead-code email dump (`backend/controllers/userController.mjs:15-20`).

## HOW TO USE YOUR REPO ACCESS (you are a Codex-exec agent rooted at the repo)

Re-derive; do not trust. Useful read-only commands:
- `git show b2a898f9f|b35da21e0|22a2240c5|039a09693|ad268c2d4` — the five fix commits.
- `git show <sha> -- <path>` for per-file diffs; `rg <pattern> backend/` for sweeps.
- Read the regression suites listed above; read any cited file:line.
- You MAY run `npx vitest run tests/api/<specific>.test.mjs` inside `backend/` (suite is
  fully mocked; never connects to a DB).

HARD SAFETY RAILS (violating any of these invalidates the review):
- READ-ONLY: no file writes, no `git add/commit/push/checkout/reset/stash/clean/gc/worktree`.
- NEVER read/cat/grep `.env` or any secrets file; never print a secret value.
- NEVER run `npm test`/`npm run dev`, anything connecting to `DATABASE_URL` (it is the
  PRODUCTION database), or any network-mutating command.
- This is a production SaaS with real users: treat every file you read accordingly.

## RETURN CONTRACT

PART A — hostile review of the campaign: what BOTH waves missed (lens-level), which shipped
fixes still carry attack surface (with file:line), what a wave 3 must do differently, and any
fix you would REDESIGN rather than keep. PART B — the upgrade/enhancement blueprint per the
remit (P0-P3 + kill list, as `### NN-*.md` documents per the Mega Blueprint contract). PART C
— decision-density self-test + your own package's hostile review. Every claim carries
file:line evidence or an explicit confidence tag; "could not verify" is an acceptable answer;
a verdict without evidence is invalid.
