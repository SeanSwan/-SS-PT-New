# Phase Audit Record — Storefront Pricing-Inquiry Button + Admin Account-Access Remount

> Rule-48 permanent audit artifact. Self-contained: a future reviewer (Sean / Codex / Gemini / Fable) should be able to security-review, perf-review, or roll back this phase from THIS file alone.

## 1. Phase header
- **Phase:** Two shipped slices in one deploy — (A) storefront **pricing-inquiry button** on price-hidden package cards; (B) admin **account-access ("skeleton key") remount** onto the admin dashboard.
- **Scope:** Frontend only. No backend/DB/migration changes. Reuses existing public `POST /api/contact` (Slice A) and existing owner-gated impersonation endpoints (Slice B).
- **Dates:** built + shipped + live-verified 2026-07-11 (single session).
- **Reviewers:** Claude (builder + slice-internal hostile review per Rule 61). Codex R7 hostile review **queued** on the pushed branch (`review-queue.md`) — advisory to Fable gate, not yet returned. No Gemini/Village run (Sean scoped Slice B to "hostile review" only).
- **Final verdict:** SHIPPED to `main`; Slice A **VERIFIED LIVE end-to-end** (browser on prod); Slice B shipped + verified in build/test, live admin-UI check pending Sean's admin login.
- **Commits on `main`:** `438e7077a` (inquiry button) · `3dde0f81c` (admin remount). Deploy bundle flipped from `index.B0Ji-_Ye.js` → new build, confirmed live.

## 2. Files involved
**Slice A — storefront inquiry button**
- `frontend/src/pages/shop/components/PricingInquiryModal.tsx` (298) — NEW. Accessible inquiry dialog; POSTs to `/api/contact`.
- `frontend/src/pages/shop/components/PricingInquiryModal.styles.ts` (186) — NEW. Extracted styled-components (Rule-4 compliance).
- `frontend/src/pages/shop/components/PricingInquiryModal.test.tsx` — NEW. 6 tests (submit payload, validation, close).
- `frontend/src/pages/shop/components/PackageCard.inquiry.test.tsx` — NEW. 4 tests (CTA swap logic).
- `frontend/src/pages/shop/components/PackageCard.tsx` — MOD (+`onInquire` prop; swaps disabled cart → "Ask About Pricing" when prices hidden; copy tweak). ~712 lines (pre-existing over-cap file; addition minimal).
- `frontend/src/pages/shop/components/PackagesGrid.tsx` — MOD (+threads `onInquire` to package cards only, not products).
- `frontend/src/pages/shop/StoreV3.tsx` (~1026) — MOD (+inquiry state/handler; renders modal in MODALS `AnimatePresence`; prefills name/email for logged-in users).

**Slice B — admin account-access remount**
- `frontend/src/components/DashBoard/Pages/admin-account-access/AdminAccountAccessPage.tsx` (99) — NEW. Thin page wrapper (heading + context) rendering the existing `AdminAccountSwitcher`.
- `frontend/src/components/DashBoard/AdminAccountAccessRoute.source.test.ts` — NEW. 5 tests (route + lazy import + page import + additive-to-Coach + WORKSPACE_CONFIG sidebar entry).
- `frontend/src/components/Admin/AdminAccountSwitcher.enterToGo.test.tsx` — NEW. 2 tests (Enter-to-go fires impersonation start; refuses when owner gate unconfigured).
- `frontend/src/components/Admin/AdminAccountSwitcher.tsx` (298) — MOD (+`handleSearchKeyDown` Enter-to-go fast path; no impersonation-logic change).
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx` — MOD (+lazy import of the page).
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx` — MOD (+`/account-access` admin route).
- `frontend/src/config/dashboard-tabs.ts` — MOD (+`WORKSPACE_CONFIG` entry `account-access`, System section — the config the LIVE `AdminStellarSidebar` renders).
- `frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx` — MOD (+`KeyRound` icon in lucide import + `iconMap`).

## 3. Architecture & runtime flow
**Slice A (inquiry):** signed-out/non-granted visitor → `StoreV3` fetches `/api/storefront`, `pricesVisible=false` (server truth, `priceVisibilityService`) → `PackagesGrid` → `PackageCard` renders "Ask About Pricing" (because `!canViewPrices && onInquire`) instead of disabled cart → click → `StoreV3.handleInquire(pkg)` sets `inquiryPackage` → `PricingInquiryModal` opens → submit → `api.post('/api/contact', {name,email,message,consultationType:pkg.name,priority:'high'})` → backend stores `Contact` + `createAdminNotification` (in-app) + SendGrid/Twilio to admin + `captureLeadFromContact` (CRM). Admin then sets per-client price in `/admin-specials` ("Client Deals") → surfaces as `YourSpecialCard` on that client's `StoreV3`.

**Slice B (skeleton key):** admin → sidebar `WORKSPACE_CONFIG` "Account Access" → `AdminStellarSidebar` `handleNav(prefix)` → `navigate('/dashboard/admin/account-access')` → route (`routes.tsx`) → `AdminAccountAccessPage` → existing `AdminAccountSwitcher` → `GET /api/auth/admin/accounts/access` (owner-gate check) → target search `GET .../accounts/targets` → "Open Dashboard" OR Enter-to-go → `POST /api/auth/admin/impersonation/start {targetUserId}` → `startAdminImpersonationSession` → navigate into target dashboard. Coach Command Center ops-rail mount remains a parallel entry point.

## 4. Security logic & posture
- **Price gating (A):** server-side (`priceVisibilityService`), fail-closed; prices stripped for non-granted callers on public routes; purchase endpoints refuse. Inquiry button only appears in the already-gated state; adds no price exposure. **Breaks if:** a future change reads price client-side instead of the `pricesVisible` server signal (guarded by `storePriceGating.contract.test.ts`).
- **Public endpoint reuse (A):** `POST /api/contact` is intentionally public (prospects aren't logged in). WHAT it allows: anyone to submit a contact/lead. WHY: prospect inquiry. **Abuse vector:** no captcha/rate-limit on `/api/contact` (PRE-EXISTING property, not introduced here) → spam leads/emails. HOW to harden: add rate-limit/captcha to `/api/contact` (separate slice). No PII-to-LLM, no auth bypass (no auth involved).
- **Impersonation (B) — unchanged, defense-in-depth:** route guard `adminOnly` **+** owner allowlist `requireOwnerAdmin` (`OWNER_ADMIN_EMAILS`/`OWNER_ADMIN_IDS`); JWT **re-issue** (new 45-min access token, `impersonation:true`, `impersonatedBy:<adminId>`, **no refresh token** → self-expires); can only target `client|trainer|user`, active + unlocked; every start writes `AdminAccountAuditLog`. **Fail-closed:** if owner env unset → `IMPERSONATION_OWNER_GATE_NOT_CONFIGURED`, module renders but inert. This phase adds **zero new impersonation capability** — only a second UI entry point + an Enter-to-go shortcut guarded identically to the existing button.
- **Remount is additive:** did NOT revert `50155c018`/`0d5ecce19` or touch the Coach mount; `AdminImpersonation.source.test.ts` (the placement lock) still passes.

## 5. Best practices applied
Rule 3 (surgical), Rule 4 (300-line cap — modal 298, page 99, switcher held at 298 via handler extraction), Rule 6 (token-with-fallback CSS), Rule 8 (no PII to LLMs), Rule 18 (existing-pattern-first: reused `/api/contact`, `AdminAccountSwitcher`, route/menu configs), Rule 19/28/51 (evidence-tagged claims, no live-fixed claim without browser proof), Rule 26/27 (canonical surface receipts for both mounts; classified live `WORKSPACE_CONFIG` vs legacy `ADMIN_DASHBOARD_TABS`), Rule 42 (N/A — frontend only), Rule 44/59 (secret scan clean), Rule 50 (Tier-A: tsc + vitest + vite build + secret scan), Rule 56 (baseline disclosed: 2 pre-existing `@zxing` errors), Rule 61 (slice-internal hostile review with concrete fixes), Rule 67 (lane claim/release + R7 review request). OWASP A01 access control via server-side fail-closed owner gate.

## 6. Known limitations / non-goals
- `/api/contact` rate-limit/captcha NOT added (pre-existing gap; out of scope).
- Slice B live admin-UI NOT browser-verified (needs admin auth; not requested to use Sean's creds).
- Owner-gate env presence in prod NOT confirmed (self-reported by the page's status line).
- Did NOT remove the Coach Command Center mount (deliberate — locked contract + Sean's prior decision).
- No new backend, DB, or migration work (intentional — reuse only).

## 7. Performance & UX considerations
- Inquiry: 1 tap to open, prefilled for logged-in users, `priority:'high'` so pricing inquiries stand out in the admin inbox. Modal: focus trap, Escape/backdrop close, 44px targets, reduced-motion, dark-first, responsive (max-width 480 + scroll). Verified live: opens with correct tier summary; Escape closes.
- Skeleton key: 1 sidebar click (vs 3 clicks buried in Coach); Enter-to-go removes the final click (Sean's least-clicks mandate). Owner-gate status surfaced inline so the admin knows immediately if it's inert.

## 8. Test coverage summary
42/42 green across 10 files. New: `PricingInquiryModal.test.tsx` (6), `PackageCard.inquiry.test.tsx` (4), `AdminAccountAccessRoute.source.test.ts` (5), `AdminAccountSwitcher.enterToGo.test.tsx` (2). Regression-guarded (still green): `storePriceGating.contract.test.ts`, `StoreV3.fallbackTruth.test.tsx`, `AdminImpersonation.source.test.ts` (placement lock), `AdminStellarSidebar.workoutFirst.test.ts`, `UniversalDashboardLayout.routeRegistry.test.ts`, `PackageCard.test.tsx`. `tsc --noEmit` 0 errors in slice files (2 pre-existing `@zxing` baseline). `vite build` exit 0. NOT tested: live admin impersonation start on prod (needs admin session); `/api/contact` load/abuse.

## 9. Rollback plan
Both slices are additive and independently revertable by commit:
- Revert Slice B (admin): `git revert 3dde0f81c` → removes the `/account-access` route + sidebar entry + Enter-to-go + page. Impersonation remains available via Coach Command Center (untouched). No data impact.
- Revert Slice A (inquiry): `git revert 438e7077a` → price-hidden cards return to the passive text + disabled cart. No data impact.
- Push revert to `main` → Render redeploys. No env flip, no migration rollback needed (none were added). No feature flag.

## 10. Future review hooks (act on these)
1. **Confirm `OWNER_ADMIN_EMAILS`/`OWNER_ADMIN_IDS` is set on the Render backend** — if unset, the skeleton key is silently inert. (Page self-reports; verify in prod.)
2. **Rate-limit / captcha on `POST /api/contact`** — the inquiry button makes this public endpoint easier to hit; evaluate abuse feasibility and add throttling if lead-spam appears.
3. **Enter-to-go accidental-impersonation risk** — re-examine whether type-name-→-Enter can enter the wrong account under fast typing; today it's guarded == the Open Dashboard button and the token is temporary/reversible, but revisit if support staff (non-owner admins) ever get impersonation.
4. **Dual entry point** — Account Access is in both the admin sidebar and Coach ops rail; if that ever confuses operators or widens exposure, consolidate (would require updating `AdminImpersonation.source.test.ts`).
5. **Impersonation audit completeness** — verify downstream actions taken *while impersonating* are attributable via the `impersonatedBy` JWT claim in backend logs (does every mutating route log it?).
6. **`/api/contact` PII handling** — inquiry messages contain prospect name/email/phone; confirm retention/export/deletion posture as lead volume grows (Rule 62 privacy-by-design).

## 11. Codex / AI review log
- Rev 1 (build): both slices implemented.
- Slice-internal hostile review (Rule 61) caught & fixed, pre-report: (a) copy change broke the locked P1-1 price-gating contract → reverted to keep "Pricing is by invitation" (+ backend parity); (b) modal 468 lines > cap → extracted `.styles.ts` → 298; (c) `AdminAccountSwitcher` 296→309 over cap → handler extracted → 298; (d) route-alone would be invisible → discovered live sidebar reads `WORKSPACE_CONFIG` not `ADMIN_DASHBOARD_TABS` → added sidebar entry; (e) icon fallback → added `KeyRound` to `iconMap`; (f) `GlowButton type="submit"` forwarding + no-preventDefault verified.
- Deploy false-alarm: local `vite build` failed on `@zxing` (stale junction) → confirmed declared dep present on Render → re-build after install = exit 0.
- Codex R7 (queued, not yet returned): covers `/api/contact` reuse, dual entry point, Enter-to-go risk, label, prefix match. Advisory to Fable gate.

## 12. Sign-off
- Sean approved the production deploy 2026-07-10/11 ("push the render") and requested this audit record + session closeout.
- Shipping SHAs: `438e7077a`, `3dde0f81c` on `main`.
- Next action pointer: (1) Sean reads owner-gate status line on Account Access; (2) optional label/dual-entry decisions; (3) Codex R7 review; (4) optional `/api/contact` hardening slice. Audit doc lives on branch `claude/store-inquiry-button`, folds to `main` on next real push.
