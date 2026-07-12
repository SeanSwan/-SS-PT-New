# Hostile-Review Reconciliation — Handover to Codex (2026-07-12)

> **Purpose:** hand the branch `claude/storefront-custom-deals-20260708` to Codex to finish the
> open lanes and ship. Written by Fable/Claude. Everything below is verified; the branch is
> reconciled with current `main` and push-ready. Read this file alone + `review-queue.md` to pick up.

---

## 0. TL;DR for Codex

- **Branch:** `claude/storefront-custom-deals-20260708` @ **`aaa913d8c`** (worktree `c:/tmp/ss-storefront-deals`).
- **State:** merged with current `origin/main` (proper 2-parent merge), **0 behind / 15 ahead**, clean tree.
- **Verified GREEN on the combined tree:** backend **854 files / 6231 tests, 0 fail, 0 unhandled**; frontend `tsc` **0 errors**; Rule-42 audit clean (no untracked/uncommitted backend drift).
- **Push is a clean fast-forward.** Command (Sean-gated): `git push origin claude/storefront-custom-deals-20260708:main`
- **What's landing:** ~30 UNIQUE hostile-review fixes NOT already on main (several CRITICAL money/data-truth bugs), on top of your 43 commits of parallel work.
- **What's left for you:** 6 open lanes (below) + a staging probe + Sean decisions. None block the push.

---

## 1. What Fable did (5 hostile-review rounds, ~34 bugs)

A continuous hostile-review loop (`/loop`, Sean's "we don't stop until there are no bugs"). Each finding re-verified from code before fixing (Rule 30); the highest-severity regressions were **proven to fail on pre-fix code** before being locked. Rounds:

- **R1 — Stripe cart money path (6):** revenue **double-count** on every cart sale since 2026-06-13 (dual `completed` Order rows, deduped on different keys); merch-only cart **500-loops** the webhook (Stripe would disable the endpoint); revoked/expired special granted at the paid boundary (now honor + loud anomaly log); inactive-item stale-price purchase; unbounded bonus ($1 typo = 36,400 sessions → 2000 ceiling); legacy `/api/cart/webhook` skipped commission.
- **R2 — auth/IDOR (3):** trainer could read **every** client's onboarding + baseline body measurements (health PII) via `GET /api/admin/onboarding`; public register could mint admin behind a **non-constant-time** compare → `crypto.timingSafeEqual`; R2 CORS infra → admin-only.
- **R3 — workout data truth (3):** **silent PR data-loss** (synthetic backfill fabricated sets that beat + overwrote real PRs, and undo destroyed them → `suppressPersonalRecords`); est-1RM PRs **froze forever** (clamped to 1500 → now returns null); PR "first lift" celebrated a row that never persisted.
- **R4 — charts/nutrition/equipment (4):** heatmap timezone, PR case-sensitivity, equipment 409, nutrition diary refresh. **← YOU (Codex) independently fixed these on main; Fable's versions were dropped in the merge (see §3).**
- **R5 — admin-KPI + social + `'paid'` enum + session credits (15+):** the **`'paid'` phantom-enum cluster** (orders.status has no `'paid'` label → admin revenue reads **$0 / 500** in prod across 6 files); cart-analytics counted abandoned carts as revenue; finance `/metrics` panel 500 (raw-SQL); Stripe net-revenue (refunds) + MRR 100-cap; revenue growth/monthly mislabels; **session F1** (schedule Book → legacy handler deducted without `sessionDeducted` → double-deduct + lost credit); **session F2** (allocate-from-order no idempotency → double-grant); social reaction point-farm; unbounded comments; null-rewards crash.

Full evidence: Hermes learning packets `docs/ai-workflow/hermes-learning-packets/2026-07-11-*` + `2026-07-12-enum-contract-drift-and-catch-to-zero.md`, and inbox memos under `.ai-workflow/hermes-inbox/pending/`.

---

## 2. UNIQUE fixes landing in this push (git-verified NOT on old main)

These are Fable's; several are CRITICAL and were **not** in your parallel main work:

- **Revenue double-count** — `stripeWebhook.mjs` reuses the grant's Order + claims side-effects via `paymentAppliedAt` (natural-key idempotency).
- **Silent PR data-loss** — `workoutLogSourcePolicy.mjs` `suppressPersonalRecords` for `ai_generated_backfill` (you fixed case-sensitivity; this is the *data destruction*, which was separate).
- **est-1RM freeze** — `oneRepMaxService.mjs` returns null past the ceiling.
- **PR false-celebration guard** — `workoutPrDetectionService.mjs` (kept in the merge on top of your case-insensitive + legacy-dupe-robust `existingByKey`).
- **merch-cart webhook loop**, **special paid-boundary anomaly log**, **unbounded bonus ceiling**.
- **session F2** allocate-from-order idempotency (`session.service.mjs`: FinancialTransaction-by-orderId guard + `FOR UPDATE OF "Order"`).
- **`'paid'`-enum** in `analyticsRevenueRoutes`, `adminOrdersRoutes`, `adminFinanceRoutes`, `dashboardCommandDispatchers`, `aiChatService` (you fixed enterprise + compliance; these 5 were still broken).
- **StripeAnalyticsService** net-revenue + MRR pagination; **adminDashboardMetricsController** growth/monthly; **adminClientController** per-client order status filter.
- **trainer-onboarding IDOR**, **admin-code timingSafeEqual**, **social point-farm / unbounded comments / null-rewards**.

---

## 3. The reconciliation merge (what was dropped, and the one design call)

Merged `origin/main` @ `6c632d97d` → resolved 5 conflicts:
- **Took YOUR (main) version, dropped Fable's redundant duplicate:** heatmap (`chartDataController` + `WorkoutHeatmapCalendar`), equipment 409 (`equipmentRoutes`), nutrition diary (`NutritionWorkspace`).
- **`workoutPrDetectionService.mjs` — merged BOTH:** kept your case-insensitive lookup + legacy-dupe-robust `existingByKey` (it's better — defends against pre-existing case-variant rows), AND kept Fable's unique **false-celebration guard** (`if (!created) continue`, which was NOT on main). Verified key format consistent (`lower::metric` both sides).

**⚠ ONE DESIGN CALL Sean should confirm — heatmap day bucketing.** Your shipped version buckets on the **backend UTC day** (`iso` field; consistent with the `DATE_TRUNC('week')` UTC charts, but a Sun-22:00-PT workout renders on **Monday**). Fable's dropped alternative bucketed on the **user's local day** (`ts` field; shows the real training day, but can disagree with the UTC weekly charts at the boundary). **Fable deferred to your shipped UTC version** to avoid overriding shipped work. If Sean wants the heatmap to show the *actual* training day, the local-day approach is in git history at `7d2c049a1` — re-apply only if Sean asks.

---

## 4. OPEN LANES for Codex to finish + ship

Posted in full in `.ai-workflow/coordination/review-queue.md` (search "ROUND 5" + "OPEN"). Priority order:

1. **`adminFinanceRoutes` customerSegments raw SQL — NEEDS A STAGING PROBE (Rule 55).** Fable fixed the 3 errors (`shopping_carts` / `'completed'` / `"userId"="User"."id"`) but the raw correlated subquery can't be verified against a mocked query. **Run it against staging before trusting that panel's number.**
2. **Session F3 (MED, grant-path — NOT fixed):** `SessionAllocationService.updateUserSessionBalance` is a NO-OP (increment commented out, logs success) → that legacy path creates Session rows but never raises `availableSessions`; clients can't book what they paid for. Safe fix = delegate to the now-idempotent `unifiedSessionService.allocateSessionsFromOrder`, BUT whether that double-grants depends on whether `SessionGrantService`-granted orders create a FinancialTransaction the F2 guard detects — **needs a routing probe** before shipping a grant-path change.
3. **Dead-file cleanup (Rule 34):** `sessionRoutes.mjs` is "REMOVED" in a `core/routes.mjs:290` comment but **still live via `api.mjs:26`** — it serves the schedule's booking traffic. F1 patched the flag; the real un-mount + delete is a Sean-gated slice. F4 (legacy reschedule non-atomic deduct, `sessionRoutes.mjs:1814`) dies with it.
4. **Social challenge data-truth:** `/api/social/challenges` shows `pointsEarned` but never credits the ledger (System B cosmetic vs System A real). Wire-it-up vs remove-the-fake-points is a **product decision**.
5. **Dormant landmine (Rule 34):** `models/social/ChallengeParticipant.mjs` `updateProgress` = unkeyed `User.increment` + invalid enum `'challenge_progress'`; zero callers. Delete-or-fix before anything wires it.
6. **adminFinance H2/H3 + adminEnterprise M1 (peer-found, not fixed):** COUNT over hasMany without `distinct` → inflated customers + negative churn; `/transactions` summary from one paginated page; `utilizationRate` denominator diluted by `'available'` slots. Admin-analytics data-truth, none money-loss.

---

## 5. Migrations that run at Render build (deploy note)

8 pending migrations (yours + Fable's), incl.:
- `20260711000000-enforce-one-open-shopping-cart.cjs` — **FAILS CLOSED** if any user has 2+ `pending_payment` carts (halts deploy, zero corruption, re-runnable). Fable probed prod earlier: **0 affected** — but re-probe or accept the safe-halt.
- `20260711000001-make-order-item-catalog-reference-tombstone-safe.cjs`, plus equipment CI/partial-unique indexes (yours), nutrition provenance + macro-encryption backfill, legacy-user FK repoint.

---

## 6. Ship checklist (for whoever pushes — Sean-gated)

1. `cd c:/tmp/ss-storefront-deals && git fetch origin main && git merge origin/main --no-edit` (re-sync if you've pushed more to main since `6c632d97d`; expect clean or trivial conflicts).
2. Re-run `cd backend && npx vitest run` (expect 854/6231) + `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (expect 0).
3. Rule 42: `git ls-files --others --exclude-standard backend/` + `git diff --name-only HEAD backend/` (expect empty).
4. **Push:** `git push origin claude/storefront-custom-deals-20260708:main` (fast-forward).
5. **Deploy verify:** `/api/health` 200; the 8 migrations landed; spot-check a fixed surface (admin revenue now non-zero; a cart sale writes ONE Order row).

---

## 7. Pending Sean decisions (not blockers)

- **Heatmap** UTC (shipped) vs user-local (§3).
- **Honor vs refund** when a client pays for a deal cancelled after their Stripe checkout was minted (§R1; currently honor + alert).
- **Remove `'admin'` from public self-registration?** (compare is now constant-time + fail-closed regardless).
- **Historical data cleanup:** reconcile the duplicate Order rows (revenue double-count, 2026-06-13→fix) AND any double-deducted/lost session credits from the pre-fix window. Needs prod access.

---

## 8. Sign-off

- **Author:** Fable/Claude (claude-fable-5). **Verdict:** branch reconciled, verified green, push-ready.
- **Verification:** backend 854/6231 0-fail; frontend tsc 0; Rule-42 clean; merge is a proper 2-parent commit with `origin/main` as ancestor.
- **Next action:** Sean's push decision → Codex owns the 6 open lanes (§4) + the staging probe (§4.1) + the pending decisions (§7).
