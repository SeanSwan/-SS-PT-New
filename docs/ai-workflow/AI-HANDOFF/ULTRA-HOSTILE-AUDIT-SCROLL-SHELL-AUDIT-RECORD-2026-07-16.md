# ULTRA-HOSTILE-AUDIT — Scroll Overhaul + Shell Criticals — Audit Record (2026-07-16)

## 1. Phase header
- **Phase:** Ultra Hostile App Review, Phases 1–3 of `MASTER-PROMPT-APP-WIDE-HOSTILE-UPGRADE-2026-07-16.md` (marvelous scroll · shell criticals · 30-phone sweep verification)
- **Scope:** frontend shell + global CSS + auth first-touch + scroll physics. No backend runtime changes.
- **Dates:** 2026-07-15 → 2026-07-16 (single session)
- **Reviewed by:** Claude Fable 5 (builder + hostile self-review + 3 evidence scout agents); **Codex review PENDING** for the auth-touching slice (review-queue REQ 2026-07-16) — rule 46 solo-pass recorded.
- **Verdict:** SHIPPED to main pending final gate + push (this record rides the batch).

## 2. Files involved
Commit 1 `c8fc413dd` (scroll root causes): `frontend/src/styles/signup-fixes.css` (unscoped html/body block removed), `frontend/src/index.css` (overflow-x clip; global smooth-scroll removed), `frontend/src/styles/CosmicEleganceGlobalStyle.ts` (2 live smooth-scroll sites removed), `frontend/src/styles/responsive-fixes.css` (clip), `frontend/src/App.tsx` (dead ImprovedGlobalStyle import), `frontend/src/components/DashBoard/UniversalDashboardLayout.styles.ts` (body min-height; main no longer nested scroller), `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` (phone flow-layout; desktop keeps app-height; bg-attachment removed), `frontend/src/components/Header/useHeaderState.ts` (lastScrollY ref; single listener; variants hoisted), `frontend/src/components/Header/header.tsx` (explicit transitions; nebula gated), `frontend/src/components/Header/components/Logo.tsx` (float gated), `NewsletterSignup.jsx`/`About.jsx`/`EnhancedContactPage.tsx` (bg-attachment removed), + master prompt doc.
Commit 2 `99356efea` (shell criticals): `frontend/src/styles/tokens.css` (--header-height + breakpoints), `Header/header.tsx` + `Layout/layout.tsx` (token + safe-area; auth-route footer exclusion), `Header/components/MobileMenu.tsx`/`ActionIcons.tsx`/`NavigationLinks.tsx`/`useHeaderState.ts` (safe-area, avatar nav, Crystalline fallbacks), `DashBoard/UniversalDashboardLayout.styles.ts` (safe-area strip token), `layouts/AuthLayout.tsx` + `styles/auth-page-fixes.css` + `styles/signup-fixes.css` (scroll-trap removal), `context/AuthContext.tsx` (network-blip resilience), `routes/lazyLoadWithErrorHandling.tsx` (one-shot reload), `routes/main-routes.tsx` + `pages/NotFoundPage.tsx` (NEW, 98 lines — branded 404), `hooks/useBackendConnection.tsx` (retries/backoff/grace), `utils/spaRoutingFix.js` + `public/spa-sw.js` (single SW registration; no fetch listener), `frontend/index.html` (async fonts), `styles/dashboard-global-styles.css` (100vw→100%).

## 3. Architecture & runtime flow (the load-bearing change)
Before: `signup-fixes.css` (global import) pinned `html, body` to viewport height with non-visible overflow → `<body>` became an inner scroller; the document NEVER scrolled anywhere in the app. Dashboards nested two more scrollers below that (`UniversalMainContent` overflow-y:auto → `ScheduleContainer` overflow-y:auto + overscroll-contain). iOS therefore rubber-banded a dead document before engaging the body scroller = Sean's "pulls, then finally scrolls" gummy scroll.
After: the DOCUMENT owns vertical scrolling on every route. Overflow guards use `overflow-x: clip` (never creates a scroll container; `hidden` fallback line kept for old engines). Sidebars are `position: fixed` so dashboards scroll as one page; the schedule keeps a desktop-only (≥1025px) fixed-height calendar container. Header reads `window.scrollY` (works again now that the window scrolls) via a ref, one listener, committing renders only when `isScrolled`/`isVisible` flip.

## 4. Security logic & posture
- **AuthContext boot check (CHANGED — the one security-relevant edit):** WHAT: only 401/403/`isAuthSessionExpired` destroys tokens; network/5xx keeps tokens and serves the localStorage-cached user. WHY: transient boot failures were destroying refresh tokens (forced re-login epidemic on mobile). HOW IT BREAKS IF WRONG: if a revoked session could produce a non-401 error forever, a stale UI session would persist — mitigated because every real API call still carries the token through `apiClientFactory`'s 401 interceptor (refresh → clearAuthData → redirect). The cached user object only paints UI; role-gated data still comes from the server. **Codex verify hook queued.**
- Stale-chunk reload: one-shot, sessionStorage-guarded (60s) — no reload loops if the server is down; storage-unavailable → no reload (fail-safe to manual UI).
- Kill-switch SW: no fetch listener at all now (was passive) — removes a per-request dispatch layer; still cache-clearing on activate.
- No secrets touched; pre-commit secret scans CLEAN on both commits.

## 5. Best practices applied
Rule 6 (Crystalline fallbacks replace retired Galaxy hexes in shell), Rule 2/7 (44px CTA + tokened contrast on 404 page), Rule 20 (sibling sweep over ALL 12 globally-imported CSS files, not just the two the scout named — caught `responsive-fixes.css` re-assertion + dead `dashboard-mode`/`dashboard-full-space` classes), Rule 26/27 (canonical layout proven: `components/Layout/layout.tsx` mounted at `main-routes.tsx:312`; `layouts/MainLayout*`/`MinimalLayout` classified orphaned), Rule 30 (scout claim that TestimonialsSection parallax was ungated REFUTED by direct read — it is tier-gated), Rule 55 (runtime Playwright probe, below), Rule 70 (batch push).

## 6. Known limitations / non-goals
- H5 (SessionContext/CartContext/SocketContext unmemoized provider values + 1Hz workout timer) NOT done — needs its own careful slice with consumer-render tests.
- M3 (lazy-load ShoppingCart + EnhancedNotificationSection out of the header chunk) NOT done — bundle-shape change, own slice.
- Rule 34 cleanup backlog flagged, NOT executed (needs Sean's approval): dead router tree (`routes/index.ts`, `authentication-routes.tsx`), `DirectAppRoutes.tsx`, `TestApp.tsx`, `test-routes.tsx`, `layouts/MainLayout*`, `MinimalLayout.tsx`, `Header/NotificationSection.tsx`, dead CSS (`final-layout-fixes.css`, `fullscreen-fix.css`, `premium-aaa-layout.css`, most of `dashboard-global-styles.css`), legacy HomePage V1/V2.
- Viewport sweep covers the 7 public routes only; authed-route sweep (storage state) = master prompt Phase 3.1, not yet built.
- 723 files still hardcode `@media`; adoption policy (convert-on-touch) is in the master prompt, not retrofitted.

## 7. Performance & UX considerations
Native momentum scrolling restored app-wide (no JS smooth-scroll libs — banned). Header no longer re-renders per scroll frame; blur-layer infinite animations off on phones; `background-attachment: fixed` (iOS repaint bomb, ignored by iOS anyway) removed at 4 sites. First paint: Google Fonts async. First-touch: login/signup single footer, no scroll trap, iOS keyboard-safe (100dvh). Notch safe-area on header + mobile menu. 404 is a page, not a silent redirect.

## 8. Test coverage summary
- Suites green post-change and post-merge: Header suites, Layout, UniversalDashboardLayout retry/mobileSidebar contracts, DashboardRouteScroll, AuthContext refreshSession + clientSource, EnhancedLoginModal claimHandoff + forcePasswordChange, ScheduleDayStrip. `tsc --noEmit` 0 (slice-clean AND repo-clean at merge point [VERIFIED]); production build green.
- **Rule 55 runtime probe (Playwright, vite preview of the real build, 414×896):** `document.scrollingElement` = html; body height 14,899px (content-sized, not viewport-pinned); `window.scrollTo(0,800)` → `window.scrollY=800`, `body.scrollTop=0`; `--header-height` 56px = content offset exactly; horizontal overflow 0 on `/` and `/login`; login footerCount=1. Header auto-hide observed working from window scroll.
- **Viewport sweep:** 84/84 GREEN (12 buckets P1–P12 × 7 public routes; no overflow, ≥44px targets, no clipped controls). Ledger: `tools/viewport-sweep/output/sweep-2026-07-16T17-05-20.md` (local artifact).
- NOT tested: authed dashboard surfaces in the sweep (no storage state yet); real-device iOS feel (Sean's XR is the final judge).

## 9. Rollback plan
All frontend-only. `git revert 99356efea c8fc413dd` (in that order) on main → Render auto-deploys the pre-change shell. No migrations, no env vars, no flags. The SW change is backward-safe (kill-switch drains regardless).

## 10. Future review hooks
- Codex: the AuthContext catch — try to construct a path where a revoked session survives past the 401 interceptor (e.g., an app used fully offline against cached UI).
- Re-probe scroll on a REAL iPhone XR after deploy (Safari, not Chromium): address-bar collapse behavior and momentum feel are the two things the desktop probe cannot prove.
- After any new global CSS file is added to App.tsx imports, re-run the "unscoped html/body selector" grep — this bug class recurs (`signup-fixes.css` was written as a scoped fix file and drifted global).
- When Coach Command Center rebuild (master prompt Phase 5/W3) lands, verify its dock doesn't reintroduce a nested full-height scroller under the un-nested dashboard shell.
- Sweep Phase 3.1: add authed routes with storage state; then wire `npm run qa:viewport-sweep` into the pre-push cadence.
- The 60s stale-chunk reload guard: revisit if Render deploys ever take >60s to serve a coherent new bundle set (could double-reload).

## 11. AI review log
- Scout agents (3, read-only): scroll root-cause hunter (ranked hypotheses, minimal fix list — largely confirmed), 30-phone system mapper (found device-matrix + sweep truth), shell hostile reviewer (4 CRITICAL / 6 HIGH — C1–C4, H1–H6, M1–M6, L1–L6). One scout claim refuted on verification (Testimonials parallax WAS tier-gated) — Rule 30 upheld.
- Builder hostile pass: sibling sweep widened the scout's fix list (responsive-fixes.css re-assertion; MobileDashboardSafeArea hardcoded top; auth-page-fixes.css pins; custom AuthSessionExpiredError shape in the C3 condition).
- Codex: PENDING (queued REQ in review-queue.md — auth slice focus).

## 12. Sign-off
- Commits: `c8fc413dd` (scroll), `99356efea` (shell), merge `11da3c152` (origin/main 33 commits in, fixes verified intact post-merge). Push to main: pending final post-merge gate (in flight at record time; push follows green).
- Next action: batch push → Render deploy → Sean verifies scroll feel on his XR → Codex auth verdict → master prompt Phases 3.1/4/5.
