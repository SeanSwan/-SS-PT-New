# MASTER PROMPT v3 — App-Wide Hostile Review · Marvelous Scroll · 30-Phone Pixel-Perfect · Vision Gap Build
**Forged 2026-07-16 by Fable 5 from Sean's directive ("ultra hostile review of the entire app… fix the gummy scroll… pixel perfect on the thirty-phone setup, especially iPhone XR… add all the missing features based off the vision… make sure it's completely safe") + three evidence scouts run against origin/main (0c6cbde08) in worktree C:/tmp/ss-hostile-audit-20260715. Status: ACTIVE — being executed by the forging session.**

> **Kickoff for a fresh agent:** *"Read `docs/ai-workflow/AI-HANDOFF/MASTER-PROMPT-APP-WIDE-HOSTILE-UPGRADE-2026-07-16.md` in full, then execute the next unfinished phase. Fresh worktree off origin/main; Rule 67 lane claim; recursive hostile review until dry per phase; commit per slice, ONE push per batch; verify live on Render."*

## Supersession & dedup map (do NOT redo)
- **Subsumes** `NEXT-CHAT-PROMPT-schedule-coachchat-scrolling-2026-07-15.md` (v2). Its W4 "marvelous scrolling" is replaced by Phase 1 below (now root-caused with file:line evidence). Its W1 (planner dictation intelligence), W2 (Mindbody mobile day-picker), W3 (Coach chat rebuild) carry forward UNCHANGED as Phase 5 here — all of v2's decisions (D1–D5, file pointers, accept gates) remain binding.
- **Already DONE on main — excluded:** 2026-07-15 app-wide SECURITY sweep (groups/auth/money/gamification/PII — 1 CRITICAL + 3 HIGH + ~8 MED shipped); DATA-TRUTH chart cluster (62ce6207f: shared muscleGroupSql, LOWER(TRIM) grouping, bodyweight-drop sanitizer); dictation planner/logger + PD-R1→R5 classifier chain; Coach command lane (rule 52 — re-verify before re-flagging).
- **Codex lane (R8) — findings QUEUE to review-queue.md, never fixed unilaterally:** storefront purchase path internals, Coach core, Social internals.

## Operating contract
Fresh worktree off origin/main, branch `claude/<topic>-<date>`; Rule 67 lane claim + read-before-edit; UI slices route via `swan-design-router` (perf/layout bugfixes = small-polish path, Mobbin gate n/a); every phase ends with recursive hostile review until a round is dry; gates per batch = `tsc --noEmit` 0, affected vitest suites green, full backend suite if backend touched, `npm run build` pass, Rule 42 backend audit, secret scans; commit per slice, ONE push per phase batch (Rule 70), verify deploy LIVE; Rule 48 audit record at batch close; main is advancing daily from parallel sessions — merge origin/main and re-run gates before every push.

---

## PHASE 1 — MARVELOUS SCROLL (Sean's #1 pain; root causes VERIFIED at file:line)
The app's page scroll is hijacked from the browser. Fix in this order; after S1–S3 the document must own vertical scrolling app-wide.

- **S1 — Kill the body-as-scroller (the "pull, then finally scrolls" mechanism).** `styles/signup-fixes.css:10-14` ships an UNSCOPED `html, body { height: 100%; overflow-x: hidden; -webkit-overflow-scrolling: touch; }` imported globally at `App.tsx:72`. `height:100%` + non-visible overflow makes `<body>` an inner viewport-height scroller — the document never scrolls, iOS rubber-bands the dead document first. Delete the block (scope anything auth needs to the auth container). Keep horizontal protection via `overflow-x: clip` (with `hidden` fallback line) on html/body in `index.css` so no new scroll container is created.
- **S2 — Un-nest the dashboard scrollers.** `UniversalDashboardLayout.styles.ts:59-62` re-asserts `html, body { height: 100% }` → change to `min-height`; `:146` `UniversalMainContent` `overflow-y: auto` (the `data-dashboard-scroll-root`) → let the document scroll instead (verify sidebar/fixed-rail expectations at 375/414/1440 before and after; `DashboardRouteScroll.ts:27-36` currently hedges across 5 possible scrollers — after this fix it can target the document and stop guessing). Schedule page third nest `UniversalMasterSchedule.tsx:990-1008`: drop `height: calc(100dvh - 80px)` + `overflow-y: auto`; at minimum `overscroll-behavior: contain` → `auto` so upward gestures chain.
- **S3 — Stop the header fighting every scroll frame.** `useHeaderState.ts:69-89` keeps `lastScrollY` in state → per-frame Header re-render AND (deps `[handleScroll]` at `:171-185`) the window listener is removed/re-added every tick. Move to refs, subscribe once. `header.tsx:76` `transition: all 0.4s` → explicit `transform, background-color`. Gate the two unconditional infinite animations repainting the blur layer (`header.tsx:122` nebulaPulse, `Logo.tsx:67` galaxyFloat) behind desktop + reduced-motion checks.
- **S4 — iOS repaint bombs.** `background-attachment: fixed` inside scrollers: `UniversalMasterSchedule.tsx:1001`, `NewsletterSignup.jsx:46`, `pages/about/About.jsx:107`, `EnhancedContactPage.tsx:119` → static/pseudo-element gradients. Ungated scroll-linked parallax `TestimonialsSection.tsx:90` → gate on animation tier like its siblings.
- **S5 — Global smooth-scroll off.** `index.css:25` + `CosmicEleganceGlobalStyle.ts:509,576-579` `scroll-behavior: smooth` on html/body → remove global (keep opt-in per component). Delete dead `ImprovedGlobalStyle` import (`App.tsx:84`, rendered nowhere).
- **Bans:** NO JS smooth-scroll/inertia libraries — marvelous = native momentum at 60fps. No `will-change` sprinkling.
- **Verify (Rule 55 probe, before + after):** local Playwright run — assert `document.scrollingElement` scrolls (window.scrollY > 0 after gesture/wheel), header hide/show works from window scroll, dashboards + schedule + homepage + store scroll as ONE page at 414×896; DevTools perf trace shows no per-frame React commits from the shell during scroll. Then live-verify on Render on the XR.

## PHASE 2 — SHELL CRITICALS (every user hits these; evidence from shell scout)
- **C1** Header/layout height mismatch: `layout.tsx:18` offsets 56px vs header 64px desktop / 60px ≤768px (`header.tsx:48,82-83`) — top of every page hides under the fixed header → one `--header-height` token, matching breakpoints.
- **C2** Login/Signup double footer + 100vh trap: `main-routes.tsx:311-315` Layout renders full Footer while `EnhancedLoginModal.tsx:654`/`OptimizedSignupModal.tsx:957` wrap `AuthLayout` (`height:100vh; overflow:hidden` + CompactFooter, `AuthLayout.tsx:16-21,58`) → exclude auth routes from Layout's Footer; AuthLayout → `100dvh`, no inner trap.
- **C3** Network blip on boot destroys sessions: `AuthContext.tsx:354-359` any `/api/auth/me` error → `logout()` + `cleanupAllTokens()` → only real 401 logs out; network/5xx keeps tokens + silent retry.
- **C4** Post-deploy stale-chunk dead end: `lazyLoadWithErrorHandling.tsx:87-100` Retry re-imports the same dead URL → one-shot `location.reload()` guarded by sessionStorage flag.
- **H2** Header avatar has no onClick (`ActionIcons.tsx:250-260`) → navigate to the role's dashboard/profile.
- **H3** No `env(safe-area-inset-top)` on fixed header/mobile menu despite `viewport-fit=cover` (`index.html:16`, `header.tsx:42-47`, `MobileMenu.tsx:73-108`) → notch overlap on XR-class phones when installed.
- **H4** Health-check false "Backend Unavailable" banner: `useBackendConnection.tsx:35-36` 1 retry + 300s circuit-breaker + boot-flash of CONNECTING banner → more retries/backoff, banner only after grace period.
- **H5** Unmemoized provider values: `SessionContext.tsx:911` (+ 1Hz timer re-rendering all consumers during workouts), `CartContext.tsx:408-421`, `SocketContext.tsx:79` → `useMemo`, isolate ticking timer into a narrow context.
- **M1** 404 catch-all silently → home (`main-routes.tsx:912-915`) → branded 404 page.
- **M2** RETIRED Galaxy-Swan fallbacks in the shell (`useHeaderState.ts:14-19`, `header.tsx:117`, `MobileMenu.tsx:95,127`, `ActionIcons.tsx:99`, `protected-route.tsx:18,58`) → Crystalline tokens per rule 6.
- **M3/M4/M5/M6** Lazy the statically-imported ShoppingCart + EnhancedNotificationSection out of the header chunk; single SW registration path (currently double: `main.jsx:53` + `spaRoutingFix.js:222`) + kill SW console noise; async font loading (`index.html:77-78`); `width:100vw` → `100%` in `dashboard-global-styles.css:13,66`.
- **Cleanup (Rule 34 — flag, get approval, then delete):** dead router tree `routes/index.ts` + `authentication-routes.tsx`, `DirectAppRoutes.tsx`, `TestApp.tsx`, `test-routes.tsx`, `layouts/MainLayout*`, `MinimalLayout.tsx`, `Header/NotificationSection.tsx`, dead CSS (`final-layout-fixes.css`, `fullscreen-fix.css`, `premium-aaa-layout.css`), legacy HomePage V1/V2 + Hero generations.

## PHASE 3 — 30-PHONE PIXEL-PERFECT (iPhone XR = P1 primary)
Truth discovered: the "30-phone setup" = `frontend/src/styles/device-matrix/` (20 profiles / 30+ phones via aliases; XR 414×896 is `PRIMARY_DEVICE_ID`; 12 canonical buckets P1–P12) + `tools/viewport-sweep/` (Playwright sweep asserting no horizontal overflow, ≥44px targets, no clipped controls). **It works — but only 7 public routes are swept and only ~4 production files use the helpers; 723 files hardcode `@media`.**
- **P3.1** Extend `viewport-sweep.config.mjs` with AUTHED routes (login storage-state or dev bypass): user dashboard home + progress, workout logger, admin schedule (UMS), trainer clients, Coach command center, storefront checkout entry, social feed. Sweep all 12 buckets; artifact the defect ledger.
- **P3.2** Fix every ledger defect, P1 (XR) first, then P2/P3 by US share. 44px targets, no overflow, no clipped controls, safe-area on notched profiles.
- **P3.3** Adoption policy (NOT a mass refactor): every file TOUCHED in this campaign converts its hardcoded `@media` to `device-matrix`/`breakpoints` helpers; net-new styles must use helpers. Record the adoption count in the closeout.
- **P3.4** Wire the sweep into the QA cadence (`npm run qa:viewport-sweep` script + doc pointer) so pixel-perfect is enforceable, not aspirational.

## PHASE 4 — VISION GAP BUILD (missing pieces per Product Core Loop + rule 62 gate)
Rank by: workout-progress-first loop > trainer coaching loop > admin proof-of-value > community. Candidates surfaced by the audit (each needs its own grill/receipt before build):
- User dashboard: progress proof immediately reachable (Home → workout/progress ≤1 tap), streak/milestone celebration surfacing real logged data.
- Post-workout share loop: meaningful milestone → shareable community card (closes the core loop's last leg).
- Trainer: stale-client "needs intervention" surfacing; low-tap live-session logging polish (dictation lane already live — REUSE).
- Admin: proof-of-value truth (who trained / what changed / what's stale) above decorative panels.
- The ranked backlog items already delivered but unbuilt: group invites/notifications, PLAUD status pill, Coach deep-link regression matrix.
Do NOT invent scope beyond the loop; every candidate passes the rule 62 strategy gate; unproven bets route through `chromie`.

## PHASE 5 — CARRIED WORKSTREAMS (from v2, decisions already made — execute as written there)
W1 planner dictation intelligence (D1–D5) · W2 UMS Mindbody mobile day-picker (no arrows ≤768px, 7-day pill strip, swipe week change) · W3 Coach Command Center chat rebuild (Codex-chat baseline, voice visualizer via parallel analyser stream, mobile-first). Read v2 for the full binding spec.

## Safety posture (Sean: "completely safe")
Security fundamentals were swept 2026-07-15 (see dedup map). This campaign's safety scope = don't regress those fixes (run the backend suite when touching anything near auth/money), plus the shell-level safety items in Phase 2 (C3 token destruction, M2 retired-theme fallbacks, SW hygiene). Any NEW auth/billing/multi-tenant finding → flag, Tier-3 Village proposal per Rule 16, never auto-fix silently.

## Order & cadence
Phase 1 → Phase 2 → push+live-verify → Phase 3 → push+live-verify → Phase 4 (Sean picks candidates) → Phase 5 (one workstream at a time). Recursive hostile review until dry after each phase. Rule 48 audit record covers the campaign.
