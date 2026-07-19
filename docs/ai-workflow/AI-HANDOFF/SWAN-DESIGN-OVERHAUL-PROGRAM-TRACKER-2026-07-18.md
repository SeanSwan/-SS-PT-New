# Swan Design-Overhaul Program — 14-surface build tracker (resumable)

**Purpose:** Sean directed (2026-07-18) "build ALL 14 blueprints autonomously in sequence." This is the
load-bearing tracker so any session resumes the next surface cheaply. Authoritative order:
`PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN-2026-07-17.md`. Branch: `claude/build-swan-lens` off origin/main.

## The discipline (per surface — non-negotiable, it caught 5 real bugs on the lens)
1. **Reground** the blind blueprint via `consult-kimi.mjs` with a REAL-substrate seed (relative paths — the
   consult scripts mangle absolute Windows paths). Serialize consults (concurrency truncates responses).
2. **Fidelity-verify** the reground against real code before building; build VERBATIM (Kimi=architect, zero
   design decisions from the builder). Ambiguity → re-consult, don't improvise.
3. **Build** additive + reversible (new-version dir + feature flag + fail-closed; V1 untouched; Lane-A files
   untouched; money/PII paths untouched or runtime-config reversible).
4. **Hostile-review until dry** (Rule 61) + **triangle** (Claude+Codex+Gemini via consult-gemini/codex on a
   repo-RELATIVE packet) before any push. Fix all confirmed findings + regression-test.
5. **Gate the production push with Sean** (frontend/tsc/eslint/de-Galaxy clean + Vite build passes + fast-forward).
6. Commit per slice; Hermes memo + this tracker updated per surface.

## The SHIPPED keystone (surface #1 — DONE, live main cba39192b)
Swan Lens: `frontend/src/adapters/style-lens-swan/` — value spine + design guard, monolith split (27 lens files,
console skin preserved), Crystallize (`useCrystallizeTransition`/`CrystallizeOverlay`), `useLensViewport`,
`lensViewportCss`/`lensSurfaceCss`, `resolveLensVictoryTheme`. Real `--world-*` names only; `--world-data-*`/
`--world-z-*` are Lane-A/Chart-Charter PROPOSALS (not emitted). All the other 13 surfaces CONSUME this.

## Status board
| # | Surface | Blueprint | Reground | Build | Triangle | Pushed |
|---|---|---|---|---|---|---|
| 1 | Swan Lens (keystone) | — | ✅ x4 | ✅ | ✅ (5 bugs fixed) | ✅ cba39192b |
| 2 | **Dashboards** (4 roles + backend) | KIMI-DASHBOARDS-CORRECTED + INTEGRATION-GAPFIX | ✅ done | ✅ FULL (S1 frontend+mount, S2 real densities, S3 backend) | ✅ Codex+Gemini (2 confirmed fixed, false-positive rejected) | ✅ SHIPPED main 8a8545605 (flag off → V1 until DASHBOARD_V2_ENABLED=true) |
| 3 | Store (StoreV4, money-path UNTOUCHED) | KIMI-STORE + CORRECTED | ✅ reground (SEND-BACK→pedestal+F4) | ✅ FULL (S1 gate+seam, S2 sections+money bindings) | ✅ Codex (2 fixed) + Gemini (polish deferred/rejected) | ✅ SHIPPED main bf00e721f (flag off → StoreV3 until STORE_V4_ENABLED=true) |
| 4 | Home (was SEND-BACK → Kimi generated direction) | KIMI-HOME-DIRECTION | ✅ direction (medium-effort, transcript vision) | ✅ FULL (optics hero + capsule rail + reused sections, flag-gated) | ✅ Codex (3 fixed) + Gemini (polish deferred) | ✅ SHIPPED main 0606edc23 (flag off → V4 until HOME_VNEXT_ENABLED=true) |
| 5 | About (was SEND-BACK → Kimi generated direction) | KIMI-ABOUT-DIRECTION | ✅ direction (caustic swan-occluder) | ✅ FULL (occluder hero + reused sections, flag-gated) | ✅ Codex (2 fixed) + Gemini (polish deferred) | ✅ SHIPPED main 816cce70e (flag off → About.V4 until ABOUT_VNEXT_ENABLED=true) |
| 6 | Video (was SEND-BACK → Kimi direction) | KIMI-VIDEO-DIRECTION | ✅ direction (refraction=access) | ✅ FULL (channel-split hero + semantic glass cards, catalog/auth reused) | ✅ Codex (1 fixed) + Gemini (polish deferred) | ✅ SHIPPED main 7b2b84184 (flag off → V3 until VIDEO_VNEXT_ENABLED=true) |
| 7 | Contact (ship-with-changes) | KIMI-CONTACT | ✅ blueprint (Crystallize Submit) | ✅ FULL (crystallize-submit form + gate, /api/contact reused) | ✅ Codex (1 fixed) + Gemini (REJECTED per rule 46) | ✅ SHIPPED main 4e116d3c6 (flag off → V3 until CONTACT_VNEXT_ENABLED=true) |
| 8 | Cover/Gallery (SEND-BACK, Core-Loop rewire) | KIMI-COVER-GALLERY | — | — | — | — |
| 9 | Photography (decompose 2219L, rename Cosmic Gate) | KIMI-PHOTOGRAPHY | — | — | — | — |
| 10 | Design Skill redo (swap on Sean confirm) | KIMI-DESIGN-SKILL-REDO | — | review+propose only | — | — |
| 11 | Design Brain enhance (swap on Sean confirm) | KIMI-DESIGN-BRAIN-ENHANCED | — | review+propose only | — | — |

## Cross-cutting DEFERRED (need Sean/Lane-A rulings; do not block surfaces)
- Lane-A wiring of the lens (Crystallize into Apply handler; viewport/surface CSS mounts; motion licences).
- Chart Charter multi-series `--world-data-*` tokens; `--world-z-*` promotion.
- Deferred Playwright pass (computed-cascade/flicker/forced-colors).

## Gotchas (inherit)
- consult-*.mjs mangle absolute Windows paths → RELATIVE only. Serialize consults. Background-task "exit 0" can be
  the wrapper's echo — read the real redirected output. Worktree node_modules junction via PowerShell not mklink.
  Honest tsc = real exit code. styled-components speedy insertRule hides CSS text in jsdom (test the contract).

## Dashboards (#2) precise resume state — 2026-07-18
Both design docs are final: `KIMI-DASHBOARDS-CORRECTED-2026-07-18.md` (full blueprint) +
`KIMI-DASHBOARDS-INTEGRATION-GAPFIX-2026-07-18.md` (the corrected §2.2 shell-through-gate + §4
Crystallize wiring — these OVERRIDE the corresponding sections of CORRECTED). Build VERBATIM.
- **Built + committed (0de2e32a3), tsc-clean:** `DashBoard/v2/{lensBindings,flags,types}.ts` +
  `v2/shell/{dashboardManifests,DashboardShell.theme}.ts`. Foundation only; nothing mounts it yet.
- **Verified integration facts:** SurfaceLensGate = `{manifest,ariaLabel,children}` (use `makeLensFrame`,
  NOT `surfaceId`); manifest needs `{surfaceId,hostId,version,profiles:CONTAINER_PROFILES,slots:{},templates:{}}`
  (empty slots valid — look comes from `[data-style-lens-shell]` world scoping). `CrystallizeOverlay` takes
  NO children → overlay+panel are SIBLINGS, panel owns focus-trap/Esc/testid. Achievement/Milestone models
  EXIST (`backend/models/`). `resolveMotionTier`/`useAnimationTier` are the motion source.
- **Slice-1 frontend SPINE COMPLETE + committed (tsc/eslint clean), NOT yet mounted:** all of
  `DashBoard/v2/` — lensBindings, flags, types, useWorldKey, motion/useDensityMotion, shell/*
  (dashboardManifests, DashboardShell.theme/.grid/.nav/.a11y, useDashboardSummary, DashboardShell),
  sections/* (accents, SectionHeader, StatCard, EmptyState, AlertList, DataTable, NextBestActionCard,
  TrendChart[Victory via `theme` prop, not `style=`]), DashboardGate, densities/AdminDensity (real) +
  Trainer/Client/User (Slice-2 placeholders). Victory colors flow through the `theme` prop (the inline-
  `style=` ban forbids per-mark style). react-refresh warning on DashboardShell (DENSITY_CONFIG export) is benign.
- **SEAM DONE + build-verified (8 commits ahead):** reality = ONE `dashboard/*` catch-all (not 4 routes);
  wrapped `<UniversalDashboardLayout/>` in `<DashboardV2RouteGate>` (derives role from URL) + one import in
  `main-routes.tsx`; V1 untouched. Vite build PASSES (DashboardShell lazy chunk 22kB emitted). Flag off by
  default → V1. **Dashboards v2 FRONTEND is complete + mounted + build-verified.**
- **BACKEND PART 1 DONE (10 commits ahead, node --check clean):** migration
  `20260718120000-create-achievement-crystallizations.cjs` (additive, FK→"Users"/"Achievements", UNIQUE, down NO-OP),
  `routes/publicConfigRoutes.mjs` (GET /api/config/public-flags), mounted in `core/routes.mjs`. **Backend is built by
  CLAUDE, NOT Kimi** (consult-kimi is design-scoped; provider policy forbids auth/finance/PII to it) — triangle-review
  (Codex/Gemini, allowed) before the gated push.
- **Verified backend patterns:** auth = `backend/middleware/adminAuth.mjs` exports `protect`, `adminOnly`,
  `authorize(roles)`; `req.user.role` after protect. Composable services EXIST: `adminUserAnalyticsService`
  (`generateUserAnalytics`, `generateWorkoutStatistics`), `adminSystemAnalyticsService` (`buildExecutiveSummary`,
  `buildSystemHealthSnapshot`). But `analyticsUserRoutes`/`analyticsRevenueRoutes` are MODEL-INLINE (no service) →
  thin-query models (Session, WorkoutLog, User, Achievement, UserAchievement[userId INT, achievementId UUID]) where
  no service exists. Routes mount in `backend/core/routes.mjs` via `app.use('/api/...')`.
- **NEXT — Slice-3 BACKEND part 2 (highest-stakes):**
- **NEXT — Slice-3 BACKEND (higher-stakes; the flag-on dashboard needs it for real data):**
  `backend/routes/dashboardV2Routes.mjs` + `controllers/dashboardV2Controller.mjs` +
  `services/dashboardV2Service.mjs` (COMPOSE existing `admin/analytics{User,Revenue}`, `adminFinance`,
  `adminCompliance` services — do NOT re-query; verify their exact exports first) returning the
  `DashboardSummary` union per §2.3 with server-side HMAC ref masking (`maskRef(id)=HMAC(id, env MASK_SALT)
  →C-1042/T-07`), `revenue_today` ONLY when `DASHBOARD_V2_FINANCE=true` (server-enforced), `?as={role}`
  admin-only + audit-logged; `GET /api/config/public-flags`; `POST /api/achievements/:id/crystallize`
  (owner/admin, idempotent on UNIQUE(user,achievement), confirm-first) + `crystallizeRoutes/Controller/Service`
  + migration `achievement_crystallizations` (down = NO-OP). Rule 42 pre-push audit. Rule 50: money/PII → the
  push gate is Sean's review. **Then Slice-2 real densities** (RosterStrip, LogSessionHero, ProgressRing,
  MilestoneTile, SparkChart replacing the 3 placeholder densities). **Then hostile → triangle → gate push.**
- **Then Slice-2** densities (trainer/client/user + charts + responsive matrix). **Then Slice-3** backend
  (`backend/routes/dashboardV2Routes.mjs` etc. + `crystallizeRoutes` + migration `achievement_crystallizations`,
  down=NO-OP; COMPOSE existing `admin/analytics{User,Revenue}`, `adminFinance`, `adminCompliance` services;
  HMAC PII masking `MASK_SALT`; finance flag server-enforced) → hostile → triangle → gate push (Sean).
- **Higher-stakes flags:** money-adjacent (`DASHBOARD_V2_FINANCE`) + DB migration + PII → the push gate is
  where Sean reviews the backend before it deploys.

## Resume procedure (fresh session)
Read this tracker → find the first surface not ✅-pushed → for Dashboards read the two design docs +
"precise resume state" above → follow "the discipline" → update the board + Hermes.

## RESUME NOTE (2026-07-18) — 7 surfaces SHIPPED; #8 Gallery is billing-critical → recommend fresh session
**Shipped to main (all flag-off, gated):** lens cba39192b, Dashboards 8a8545605, Store bf00e721f, Home 0606edc23, About 816cce70e, Video 7b2b84184, Contact 4e116d3c6. Each: reground/direction → build reversible → hostile → triangle (Codex+Gemini) → Sean-gated push. Env flags to activate: DASHBOARD_V2_ENABLED / STORE_V4_ENABLED / HOME_VNEXT_ENABLED / ABOUT_VNEXT_ENABLED / VIDEO_VNEXT_ENABLED / CONTACT_VNEXT_ENABLED.

**#8 Cover/Gallery — DO CAREFULLY (billing-critical):** `GalleryPage.tsx` (~2000L) runs an enhancement-CREDIT PURCHASE system (`/api/gallery/credits`), VIP conversion modal, checkout-return feedback, referral modal, support actions — all money-path with truth tests (`gallery/*.truth.test.ts`). SEND-BACK + "Core-Loop rewire" (architectural). Approach when resumed: study the credit/checkout/referral/VIP logic FIRST; a visual reskin must keep ALL of it BIND-ONLY (money-path untouched, like Store); the "Core-Loop rewire" architectural part needs Sean's explicit scoping. Recommend a FRESH session (full context) for this one — do not rush a billing surface at the tail of a long session.

**Remaining after #8:** #9 Photography (2219L decompose, non-billing), #10/11 Design Skill/Brain (review+propose only, not builds).

**Reusable per-surface recipe (proven x7):** foundation = lensBindings/flags/tokens(ZERO-hex or one sanctioned literal)/manifest/gate (mirror any shipped surface) + backend flag in publicConfigRoutes.mjs; SEND-BACK surfaces → `consult-kimi --effort medium` for creative direction (high-effort empties the budget); data/money surfaces → reuse the pure logic helpers + reimplement fetch/state in vNext (V-prev untouched, same API path); Gemini is a design AUTHOR not the gate (Rule 46 — reject "delete the token bridge / use theme-provider hex").

## CORRECTION (2026-07-19) — #8 Cover/Gallery and #9 Photography are the SAME FILE (GalleryPage.tsx)
Both `KIMI-COVER-GALLERY-BLUEPRINT` and `KIMI-PHOTOGRAPHY-BLUEPRINT` target `frontend/src/pages/GalleryPage.tsx`
(2219 lines). There is NO separate non-billing "Photography" page — the earlier "#9 non-billing" note was WRONG.
This ONE surface is billing-critical (enhancement-credit purchase `/api/gallery/credits`, VIP conversion,
referral, donations) AND requires a NEW additive backend (photo dimension columns + thumb/preview/full
rendition pipeline, or expose existing media metadata) or it violates Rule 1 (justified grid needs intrinsic
ratios before load). KIMI-PHOTOGRAPHY is SHIP-WITH-CHANGES with a full ~19-file decomposition map + THE key
change (d): make the Crystallize REVEAL the hero, gate-as-setup (email = unlock achievement), photos-first IA,
rename off "Cosmic Gate". Approach: careful, fresh, focused session; visual reskin with credit/checkout/VIP/
referral/donation logic BIND-ONLY (money-path untouched, like Store); scope the new backend rendition slice
with Sean first. Remaining after this: #10/#11 Design Skill/Brain (review+propose only, not builds).
