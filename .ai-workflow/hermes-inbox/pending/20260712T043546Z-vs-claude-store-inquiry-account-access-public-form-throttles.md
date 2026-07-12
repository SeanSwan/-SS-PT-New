---
surface: vs-claude
utc: 20260712T043546Z
topic: Pricing-inquiry button + account-access remount shipped; both public lead forms now rate-limited
tags: [storefront, admin-nav, account-access, contact, orientation, cost-abuse]
---

## What I did / learned
- **Storefront pricing-inquiry loop is LIVE** (browser-verified on prod). Price-hidden `PackageCard`
  now renders an "Ask About Pricing" CTA instead of a disabled cart → `PricingInquiryModal` →
  `POST /api/contact` (stores Contact + in-app admin notification + SendGrid/Twilio + CRM lead).
  Closes the gap between the existing price gate and the existing per-client deal creator.
- **Admin "skeleton key" was never deleted — it was relocated.** Owner's own June commits
  (`50155c018`, `0d5ecce19`) moved `AdminAccountSwitcher` off the admin dashboard into the Coach
  Command Center ops-rail toggle. Remounted it **additively** at `/dashboard/admin/account-access`
  (new route + page); the Coach mount is LOCKED by `AdminImpersonation.source.test.ts`, so it was
  NOT reverted. Reachable from both now.
- **Nav trap (high-value, will bite again):** the LIVE admin sidebar (`AdminStellarSidebar`) renders
  **`WORKSPACE_CONFIG`** in `frontend/src/config/dashboard-tabs.ts`. `ADMIN_DASHBOARD_TABS` is
  explicitly `@deprecated` and NOT rendered. **A route without a `WORKSPACE_CONFIG` entry is
  URL-only and invisible in the nav.** Also: `AdminStellarSidebar` resolves icons through a
  **curated `iconMap` with a `|| Shield` fallback** — an unregistered icon name silently degrades to
  a generic shield. Registered `KeyRound` + `Unlock`. Surfaced `Feature Access` the same way (it had
  the same invisible-route bug).
- **Owner gate:** account-control/impersonation is fail-closed behind `OWNER_ADMIN_EMAILS` /
  `OWNER_ADMIN_IDS` — these must be set on the **Render BACKEND service** (frontend env does
  nothing). Unset → `OWNER_GATE_NOT_CONFIGURED` and the module renders but is inert.
  **Dual-table trap:** the gate compares against the canonical `"Users"` table (owner id = 2);
  the legacy lowercase `users` table has a DIFFERENT id 2 (a test admin). Don't conflate them.
- **Cost/abuse sweep (both public lead forms were exposed):**
  - `POST /api/contact` — public, and each accepted submission spends **Twilio SMS + SendGrid** and
    notifies BOTH owner recipients, and creates a CRM lead. Route never fails on notification error,
    so a flood is invisible to the attacker. → `contactLimiter` **5 req/15min per IP**.
  - `POST /api/orientation/submit` — public, intakes **health data + waiver initials**, writes an
    Orientation row and raises an admin notification. → `orientationLimiter` **5 req/15min per IP**.
  - Per-IP keying is sound because `core/app.mjs` sets **`trust proxy` = 1** (req.ip is the real
    client, not Render's proxy). Without that, all visitors would share one bucket.
- **Audited and already safe (do not re-flag):** `aiRoutes` (protect + aiKillSwitch +
  requireSubscription + aiRateLimiter — LLM spend well defended), SMS webhook `/inbound` (Twilio
  signature verified), newsletter subscribe (20/hr), waiver (10/15min), adminSettings (admin-only),
  all `admin*` routes (router-level auth — `adminEnterpriseRoutes` imports `protect as
  authMiddleware`, which reads as unprotected to a naive grep; it IS protected).

## Why it matters to Hermes
- The **money path now works end to end**: a price-hidden prospect can reach the owner, and the
  owner sets their price via the per-client deal creator (personal card) or by granting catalog
  price visibility. Acquisition was the stated #1 gap; this is its top of funnel.
- The **`WORKSPACE_CONFIG` vs `ADMIN_DASHBOARD_TABS`** fact explains a whole class of "the feature
  exists but I can't find it" reports. Two features were invisible for exactly this reason. Check
  the sidebar config before concluding a surface is missing/deleted.
- "It's gone" often means **relocated, not deleted** — check git history for a scoping/gating commit
  before rebuilding anything.
- Public forms that fan out to paid services are a recurring cost-abuse class; the owner explicitly
  cares ("we can't pay for unnecessary fees").

## State right now
- LIVE on main: inquiry button (verified in browser), account-access route + sidebar entry, Feature
  Access sidebar entry, `contactLimiter` (verified live via `ratelimit-policy: 5;w=900`).
- `orientationLimiter` pushed; backend redeploy in flight, verification pending.
- Rule-48 audit record landed for the first two slices. Rule-42 backend audit clean on every push.

## Sean owes / blockers (if any)
- Set `OWNER_ADMIN_IDS` on the Render **backend** service (in progress) — until then the skeleton
  key renders but stays inert. Confirm the page's status line flips to "ready".
- Decide: keep the dual entry point (admin sidebar + Coach ops rail) or remove the Coach mount
  (would require updating the locked contract test). Also optional label rename.
- Open question: whether to fire one real test inquiry to prove the notification reaches him —
  deferred because the alert fans out to a second owner recipient as well.
- Codex hostile review (R7) of these slices is queued on the branch, not yet returned.
