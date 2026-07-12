---
surface: vs-claude
utc: 20260712T070119Z
topic: Hostile round 5 — admin revenue dashboards show $0/500 in PROD ('paid' phantom enum); schedule "Book" double-charges a session credit; 34 bugs fixed total
tags: [admin-revenue, orders-enum, session-credits, scheduling, stripe-analytics, social-points]
---

## What I did / learned
- Round 5 of the hostile-review loop (3 fresh reviews + a peer Claude session's admin audit). Fixed **15 more verified bugs** (34 total across all rounds). Branch `claude/storefront-custom-deals-20260708` @ `165e19640`, 3 commits, **not pushed**. Backend 847 files / 6178 tests, 0 fail, 0 unhandled.
- **PROD FACT #1 — admin revenue dashboards read $0 (or 500) right now.** `orders.status` is a Postgres enum = (pending, processing, completed, refunded, failed, pending_payment). Several admin queries filtered `status = 'paid'` / `IN ('completed','paid')`, but **'paid' is not a valid label and is never written** (payment success writes 'completed'). Postgres THROWS on an invalid enum comparison, and each caller's catch turned it into $0 revenue (adminEnterpriseRoutes x4, adminComplianceRoutes, dashboardCommandDispatchers, aiChatService "revenue this month") or an HTTP 500 (analyticsRevenueRoutes /revenue panel; adminFinanceRoutes /metrics panel via a separate raw-SQL bug). All fixed to 'completed'. **The compliance CI test mocks `sequelize.query`, so it was green the whole time the SQL was broken in prod.**
- **PROD FACT #2 — the schedule "Book" button double-charges a session credit.** `POST /api/sessions/:id/book` has no route in canonical `sessions.mjs`, so it falls through to a legacy handler in `sessionRoutes.mjs` that a comment (`core/routes.mjs:290`) claims is "REMOVED" but is **still live via api.mjs**. It deducted `availableSessions -= 1` but never set `session.sessionDeducted = true` — the flag the whole money system keys off. So a schedule-booked session was deducted AGAIN at completion / the 24h settlement sweep, and its credit was **silently lost on cancel** (cancel only restores when the flag is true). A 10-credit client could pay 2 credits ($350) for one workout. Fixed (sets the flag in the same txn).
- **PROD FACT #3 — admin "Allocate from order" double-grants.** `allocateSessionsFromOrder` had no idempotency guard; the admin route calls the service directly (the webhook's `paymentAppliedAt` guard doesn't cover it), so a re-click granted the sessions twice + wrote a duplicate FinancialTransaction ($16,800 pkg -> $33,600 recorded). Fixed with a FinancialTransaction-by-orderId guard + `FOR UPDATE OF "Order"` lock — same two-writers-one-record class as the storefront revenue double-count.
- Also fixed: Stripe revenue counted refunds as income (didn't subtract amount_refunded) + MRR/active-sub capped at the first 100; dashboard revenue.growth was SESSION growth and revenue.monthly was the full-timeframe total; a social reaction point-farm (3 reaction types -> 3x self / 6x owner, permanent); an unbounded post-comments query; a null-rewards badge crash.

## Why it matters to Hermes
- **When Sean or an AI reads admin revenue for any period before this fix deploys: it is WRONG.** Most panels showed $0; the revenue-analytics and finance-metrics panels were throwing 500s. The real sales existed; the dashboards just couldn't render them. Do not quote admin revenue KPIs until the push lands + a re-check.
- **Session credit balances booked via the schedule are also suspect** — some were double-deducted at settlement, some lost on cancel. If a client disputes their remaining sessions for the pre-fix window, believe the client; the ledger over-charged.
- Same unifying law as round 4 (identity-function drift): a query asking for an identity the data never has ('paid') fails as badly as one asking for the wrong identity. Written as a learning packet.

## State right now
- All fixes committed locally, **not pushed** (Sean gates every push). Prod keeps showing $0 revenue + double-charging booked sessions until it lands.
- ⚠ One fix (adminFinanceRoutes customerSegments raw correlated SQL) is committed but **needs a staging probe** (Rule 55) — it can't be verified against the mocked query in CI.
- 6 items left OPEN for Codex/Sean (in review-queue.md): session F3 (a no-op `updateUserSessionBalance` that logs success — fixing it risks a double-grant depending on order routing I couldn't probe), the "REMOVED"-but-live dead-file cleanup, social challenge points that are never credited, and 3 admin-analytics count-inflation issues (COUNT over hasMany without distinct -> negative churn; summary from one paginated page; utilization diluted by open slots).

## Sean owes / blockers (if any)
- **The push** — prod admin revenue reads $0 and booked sessions double-charge until it deploys.
- **Staging probe** of the finance-metrics raw SQL before trusting that panel's number.
- Still-open earlier decisions: honor-vs-refund on a cancelled-then-paid deal; remove 'admin' from public self-registration; reconcile the historical duplicate Order rows (revenue double-count) AND any double-deducted/lost session credits from the pre-fix window.
