# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 2026-07-18T17:16:53Z
- **Topic:** Swan design-overhaul #2 (Dashboards v2) SHIPPED to main

## What I did / learned
- Shipped surface #2 of the 14-surface Swan design-overhaul program: **Dashboards v2** to `main` `8a8545605` (Sean-gated push). Surface #1 (Swan Lens keystone) already live `cba39192b`.
- Full-stack, flag-gated, reversible: `frontend/src/components/DashBoard/v2/` (4 role densities admin/trainer/client/user, mounted at the ONE `dashboard/*` route seam via a lazy flag-gated `DashboardV2RouteGate`, fail-closed to V1) + backend `GET /api/dashboard/v2/summary` (role-gated real data, HMAC-masked person refs, finance double-gated) + `POST /api/achievements/:id/crystallize` (owner-scoped, idempotent, confirm-first) + migration `achievement_crystallizations` (down = NO-OP) + `GET /api/config/public-flags`.
- Reviews caught real bugs: internal hostile pass found a CRITICAL auth-header bug (the `protect` middleware reads the JWT from the Bearer header ONLY — no cookie fallback — so the new dashboard fetches would have 401'd the whole v2 seam in prod). Codex+Gemini triangle then fixed a future-session over-count and a raw INTEGER `Session.id` leak, and mapped milestone tier to the real `Achievement.rarity` field.

## Why it matters to Hermes
- Dashboards v2 is **dormant in production** — flag defaults off, so users still see V1. It activates only when `DASHBOARD_V2_ENABLED=true` (+ optional `DASHBOARD_V2_FINANCE`, `MASK_SALT`) is set on Render. If Sean asks "why don't I see the new dashboards," that's the reason — the code is live, the switch is off.
- Reusable facts for future backend work: `protect` is Bearer-only (no cookie); Sequelize `DataTypes.DATE` = full timestamp (not date-only); `Order.totalAmount` is DECIMAL dollars (not cents); `Achievement.rarity` ENUM already exists (common/rare/epic/legendary).

## State right now
- Branch `claude/build-swan-lens`; main == `8a8545605`; Render auto-deploying. tsc/eslint/build all clean, Rule 42 backend audit clean.
- Now on surface **#3 Store** (StoreV4) — money path must stay UNTOUCHED. A read-only surface map is running.

## Sean owes / blockers
- Optional: set `DASHBOARD_V2_ENABLED=true` on Render when he wants to preview/activate v2 dashboards (+ `MASK_SALT` for stable person refs, `DASHBOARD_V2_FINANCE=true` to show admin revenue).
- Each subsequent surface push is individually Sean-gated (his standing rule).
