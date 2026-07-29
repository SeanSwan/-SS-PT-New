# SwanStudios — Open Slices Packet for Independent Review
**Date:** 2026-07-29 · **Linear:** SWA-75 · **Base:** `origin/main@c39adab88`
**Reviewer target:** decide what to build/fix next and in what order.

Sean is live and taking real client work. He wants the remaining slices done to the highest standard, not merely closed. Everything below is verified in-session; no PII.

---

## 1. What has already shipped (do NOT re-recommend)

Across four audit passes, all on `origin/main`, each regression-proven:

- **Dead code purge** — 6 unmounted route modules (1,321 lines) + 44 unreferenced backend-root scripts (6,956 lines). A commented-out mount under a comment claiming "kept for backward compatibility" had already caused one wasted security fix.
- **Messaging safety** — `Friendship.status='blocked'` was set but never read on *either* send path. Now enforced on REST **and** socket. Send had no rate limit on either path; now throttled (30/min burst, 600/hr, per-user).
- **Throttle eviction bypass** — bounded tracker evicted first-inserted rather than LRU, resetting an *active* throttle. Fixed to skip actively-throttled victims.
- **Financial ledger** — `POST /api/financial/log-transaction` was `protect`-only and could overwrite *another user's* transaction (no ownership check on `stripePaymentIntentId`), fabricate rows from client `amount`, and forge its own `ipAddress`. Now `adminOnly`; audit fields observed, not accepted.
- **Display-ref collisions** — dashboard privacy refs were 4-digit (`% 10000`); measured 13 colliding pairs at 500 clients, and `RosterStrip` uses the ref as a **React key**. Widened to 6-digit; 0 collisions at 500.
- **Onboarding** — the 8-section NASM wizard was built and routed but *nothing linked to it*, and it lost all answers if the tab closed. Now: entry card on client home, per-user draft autosave, and a role gate (staff were being invited to fill in a client assessment).
- **Trainer-permission trap** — 563-line system wired to zero routes whose `hasTrainerPermission` returned false with no grant row, while `trainer_permissions` has never had a row in production. Wiring it would have 403'd every trainer. Semantic replaced with the production-proven permissive-until-configured version; a test keeps it unwired until a grant UI exists.
- **Verified strong, not changed:** auth (`protect` re-reads role from DB, so demotion is immediate), impersonation (owner-gated, 45-min, audited, de-escalating), password reset (hashed tokens, expiry, single-use), checkout price integrity (server-derived), all three Stripe webhooks (signature-verified, paid-only fulfilment), session-credit idempotency.

---

## 2. Open slices — the actual question

### 2.1 Observability — the precise gap
Earlier notes said "no observability." That was **imprecise**, corrected here:
- **AI features ARE monitored.** `services/monitoring/alertEngine.mjs` evaluates thresholds (`AI_MONITOR_HIGH_ERROR_RATE` 0.25, elevated 0.10), persists alerts, and is wired via `monitoringService` + `aiMonitoringRoutes`.
- **General HTTP 5xx are NOT.** The global handler (`core/middleware/errorHandler.mjs`) logs `Unhandled error` and shuts down on uncaught exceptions — but there is **no 5xx rate tracking, no aggregation, no alert** (verified: zero matches for 5xx/errorRate outside the AI path).
- **No error-tracking SDK** (Sentry/Rollbar/Bugsnag) declared in either package.json.

Net: if a client-facing route starts 500ing at 6am, nobody is told.

### 2.2 Frontend orphans — 236 files, ~41,600 lines
Inventory shipped, **zero deleted**, deliberately. Classified: superseded-predecessor / built-but-unwired-feature / genuinely-dead / ambiguous.

The blocker is class 2. `NASMAdminDashboard.tsx` is 1,128 lines with no importer — structurally identical to `trainerPermissionMiddleware`, which looked like junk and was a complete permission system. Sean owes a wire/park/archive ruling.

### 2.3 Docs-vs-code truth (Rule 75)
Not yet swept. This codebase has repeatedly shipped comments that describe intent the code abandoned — the "kept for backward compatibility" line on a commented-out mount cost a full wasted fix cycle.

### 2.4 Error / empty / loading states
Never audited. Sean's clients hit an empty account on day one; that IS launch day for every signup.

### 2.5 Mobile responsive matrix
Never audited. Trainers work from phones during sessions.

### 2.6 House-style compliance repo-wide
One self-audit found my own new file at 299 of the 300-line cap. Several existing client-dashboard files exceed it (`AiConsentScreen.tsx` 770).

### 2.7 Owner-gated, still open
Stripe key rotation (scripts that read/rewrote live key material existed in the repo root; deleting them changed nothing about exposure), the live $1 charge→webhook→refund proof, and running the backup/restore drill (tooling shipped and guard-tested, never executed against production).

---

## 3. Known baseline, so it is not mistaken for regression
`tests/unit` + `tests/api`: **6,229 passing**, 16 failing across 5 files (commandRegistry, consoleRedaction, evalHarness, logRedactionShared, loggerRedaction) — verified **identical on a pristine `origin/main` worktree**. Grew 7 → 11 → 16 across two days from other agents' in-flight logging work. Repo-wide `tsc --noEmit` OOMs at 8GB (pre-existing).

---

## 4. What I want challenged

1. **Sequencing.** Given a live product with real clients starting now, what order maximises reduction in expected harm — observability, states, mobile, orphans, docs-truth?
2. **Observability shape.** Is an error-tracking SDK worth it here, or is the higher-value move 5xx aggregation + alerting on the existing logger, given a solo operator on a paid Render plan?
3. **The 236 orphans.** Is inventory-then-owner-ruling right, or is that over-caution for a pre-launch product where dead weight actively misleads agents?
4. **What is missing entirely** from these six slices that a launching trainer-led SaaS demands?
5. **Anything above that is over-engineering** for a solo operator with a handful of clients in week one.

---

## 5. Constraints
Production live; 5+ AI agents work this repo in parallel (no `git add -A`, explicit paths, isolated worktree, rebase before push). Handles minors' data, payments, PII — zero PII to LLMs. styled-components only (no MUI), Crystalline Swan dark-first, 44px targets, Victory charts. Batch-push cadence: commit per slice, one push, one deploy verification.
