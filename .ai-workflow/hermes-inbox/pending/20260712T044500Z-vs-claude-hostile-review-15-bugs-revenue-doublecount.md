---
surface: vs-claude
utc: 20260712T044500Z
topic: 3-round hostile review — 15 verified bugs fixed; LIVE prod revenue double-count since 2026-06-13 (fix committed, NOT pushed)
tags: [billing, stripe-webhook, storefront-specials, auth, idor, workout-pr, nutrition]
---

## What I did / learned
- Ran 3 hostile-review rounds (money path · auth/IDOR · launch-charter + nutrition). Found and fixed **15 real bugs**, each re-verified from code before fixing (Rule 30). Branch `claude/storefront-custom-deals-20260708` @ `bf6a93eae`, 7 commits ahead, **NOT pushed**.
- **LIVE PRODUCTION DATA-TRUTH FACT (biggest one):** every cart sale since **2026-06-13** has written **TWO** `completed` Order rows. The session grant writes the order under idempotency key `cart-fulfillment:<cartId>`; the Stripe webhook re-claimed under `stripe-webhook-cart:<cartId>`. Different keys → the webhook never saw the grant's row → duplicate. Every revenue read that does `Order.sum('totalAmount', {status:'completed'})` (admin dashboard, `analyticsRevenueRoutes`, `adminDashboardMetricsController`, AI chat context) reports **~2x** for cart sales. Session-package purchases use a different single-order path and are NOT affected.
- Other high-impact fixes: a merch-only cart threw in the webhook AFTER the grant committed → permanent 500-loop → Stripe eventually **disables the endpoint**, which would kill server-side fulfillment for ALL sales · any **trainer** could read **every** client's onboarding row incl. questionnaire + baseline body measurements (health data) via the unscoped `GET /api/admin/onboarding` list · public `POST /api/auth/register` could mint a full admin behind a **non-constant-time** compare on the admin access code · the workout **backfill silently destroyed clients' real personal records** (it fabricates sets by pairing MAX(weight) with an unrelated MAX(reps), which out-scores the real est-1RM PR, overwrites it, repoints it at a filler session — and backfill *undo* then deletes it) · est-1RM PRs **froze forever** once a garbage entry stored the clamped 1500 cap.

## Why it matters to Hermes
- **Do not trust cart revenue figures from the admin dashboard for 2026-06-13 → the fix deploy.** They are inflated ~2x. If Sean (or an AI) quotes revenue for that window, caveat it. Session-package revenue is fine.
- The code fix stops **new** duplicates. It does **NOT** remove the duplicate rows already written to prod. **A data cleanup is still owed** — historical revenue stays inflated until the extra `stripe-webhook-cart:<cartId>`-keyed Order rows are reconciled/removed. Treat as an open production data-integrity item.
- Production is **still double-counting right now**, because the fix is committed locally and unpushed (Sean gates every push).

## State right now
- Backend **844 files / 6170 tests, 0 failures, 0 unhandled errors** (+13 regression tests; the double-order, merch-loop and IDOR regressions were **proven to fail on the pre-fix code**). Frontend `tsc` 0 errors. The 3 frontend suite failures are parallel-run flakes (pass 18/18 in isolation).
- Reviews could NOT break: double-grant/webhook replay, client-forged price, special-offer IDOR, cart reopen, gamification double-award, session billing, the nutrition encryption + schema-drift work, or the Move-Fitness PDF white-labeling.
- 7 findings left OPEN and posted to Codex in `review-queue.md`: paid-boundary `NO_REDEMPTIONS_LEFT` throw (latent paid-customer-stranding; unreachable only via the one-open-cart unique index) · heatmap timezone (UTC label vs browser-local bucketing puts evening workouts on the wrong day AND week) · PR engine case-sensitivity → duplicate baselines · equipment 500-vs-409 · nutrition diary never refetches when the summary endpoint errors · unauthenticated `/api/serve-photo/*` serves `measurements` (health) photos — not enumerable (uuid keys) so LOW, but naive `protect` would break `<img>` tags; needs short-TTL signed URLs.

## Sean owes / blockers (if any)
- **The push.** 7 commits are local-only; prod keeps double-counting revenue until he pushes.
- **Decision 1 — honor vs refund:** if a client pays for a deal that was cancelled *after* their Stripe checkout was minted (session stays valid ~24h), do we honor it or refund? Today it is honored + a loud anomaly is logged. The prevention layer (expire the in-flight Stripe session at cancel; cap checkout expiry) is unbuilt and depends on his answer.
- **Decision 2 — remove `admin` from public self-registration?** Recommended (bootstrap admins via CLI/seed instead), but it changes how he creates admin accounts, so it's his call. The compare itself is now constant-time + fail-closed.
- **Owed cleanup:** reconcile/remove the duplicate historical Order rows (see above) so past revenue reports read true.
