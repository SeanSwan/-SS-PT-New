# HOSTILE SEAT REQUEST — attack this five-surface design review

You are GLM 5.3, the hostile seat on a SwanStudios design-review panel. Below is the lead reviewer's (Fable's) full review of the home page + user/client/trainer/admin dashboards, built from five file:line evidence inventories and live production captures. Your job:
1. ATTACK the review itself — wrong severity calls, findings that don't follow from the cited evidence, law misapplications, missed contradictions between findings.
2. ADD up to 8 findings the review missed, grounded ONLY in evidence quoted in the review (do not invent file contents you cannot see).
3. Rank: which 3 fixes buy the most user-visible quality per unit effort?
Verdict format: per-surface AGREE/DISAGREE with the lead verdict + numbered deltas.

---
# Hostile Design Review — Home + User/Client/Trainer/Admin Dashboards

- **Date:** 2026-09-01 · **Lead reviewer:** Claude Fable 5 (Final Decider) · **Panel:** GLM 5.3 (hostile seat) + GLM 5.3 Flash (cross-check) — outputs in `panel-design-brain-style-intelligence-2026-09-01/`
- **Decision:** verdicts + ranked defect list per surface; no code changed by this review
- **Status:** open
- **Supersedes:** none
- **Baseline:** origin/main `4c2fd507e` (worktree `feat/design-brain-style-intelligence`). Live captures: sswanstudios.com 2026-09-01 at 414/1440/2560 CSS px + console log. Evidence packs: five scoped agent inventories (file:line receipts) — treated as hypotheses per Rule 30; load-bearing claims spot-verified by the lead reviewer where noted.
- **Grading law:** router LAWS 1–11 + CLAUDE.md rules 1–11/22–25 + Product Core Loop. Format: `[LAW n]/[Rule n] — evidence — fix`.

## Instrument notes (read before the findings)

1. A full-page Playwright screenshot does NOT fire `useInView`/`whileInView`. The "0+ / 0%" stats and the giant black inter-section gaps in the 1440px full-page capture are **capture artifacts** — `StatsSection.tsx:74` gates `AnimatedCounter` on `useInView`, and STATS values are real claims from `content/marketingStats` (`HomeData:73-80`). Withdrawn as findings. `[VERIFIED]`
2. The header showed an avatar + Logout during capture. The Playwright profile may carry an old session; **not** asserted as an anonymous-state bug. `[HYPOTHESIS — re-probe in a clean profile]`

## What is CLEAN across all five surfaces `[VERIFIED via scoped greps]`

- **Zero** MUI, zero recharts, zero Tailwind, **zero Galaxy-Swan literals** (`#0a0a1a`/`#00FFFF`/`#7851A9`/`rgba(0,255,255,…)`) in any of the five canonical trees. Victory is the only chart library in use (Rule 10 holds).
- No mock data wired into any live-mounted dashboard panel — every checked datum traces to a real API (`/api/workout/sessions`, `/api/client/analytics/chart-*`, admin `Promise.allSettled` fetches). The one `mockClients` array lives in a **dormant orphan** (see T1).
- Reduced-motion coverage is broad in-app (user 69 / client 77 / trainer 65 / admin 18 hits).
- Token-driven styling is pervasive (`var(--…)`: user 1664 / client 2241 / trainer 3128 / admin 1150 hits).

---

## CROSS-CUTTING (the systemic findings — worth more than any single surface)

**X1 — [LAW 5] The signature is missing from every live surface.** `useCrystallizeTransition`/`CrystallizeOverlay`: **0 hits in all five canonical trees.** The primitives exist (`frontend/src/adapters/style-lens-swan/motion/*`) but are consumed only by `workout-design-lab` and the PARKED v2 density surfaces (`DashBoard/v2/densities/*`). Meanwhile the logging path ships a parallel celebration, `WorkoutLogger/handoff/CelebrationBurst.tsx` (one-shot particle burst on save) — exactly the "second celebration" LAW 5 forbids, living where the Crystallize is mandated to live. Classification per Rule 27: **competing signature implementations, resolution required.** Fix options: (a) bless CelebrationBurst as the Crystallize execution and rename/absorb it into the adapter, or (b) mount the real Crystallize on the log/save path and retire the burst. Either way, one celebration, one name. `[VERIFIED — lead reviewer greps]`

**X2 — [LAW 8] World/lens token adoption is one-tree deep.** `--world-`/`--lens-` hits: trainer 133, home 0, user 0, client 0, admin 0. The Appearance-Studio "re-skin with zero code change" contract currently only reaches the trainer/clients-team/WorkoutLogger tree. Every other surface is skinned by local tokens and would not follow a world switch. Fix: a per-surface `*.tokens.ts` bridge migration plan, one surface per slice; do not claim LAW 8 compliance in any receipt until the tree consumes `--world-*`. `[VERIFIED counts via agents; spot-checked trainer hits]`

**X3 — [Rule 6/LAW 9] Raw-hex debt is large and unevenly waivered.** Home: 77 literals under a dated waiver (SWA-206, expires 2026-11-23). Client: 1,832 hits/115 files. Admin: 950/67 — including the theme file itself. Most are `var(--token, #fallback)` (legal), but per-file one-off hexes (e.g. `AiConsentScreen.tsx:38,42`) are palette drift. Fix: extend the SWA-206 strangler backlog to the client/admin trees with the same `swan-guard-allow-hex` annotation + expiry discipline, so drift is at least dated and ticketed. `[LIKELY — mixed legal/illegal; needs the per-file pass]`

**X4 — [Rule 4] The 300-line cap is being gamed at the ceiling.** Trainer tree files sit at 293–298 lines (`TrainingTabContent` 293, `ClientTrainingCommandBar` 296, `CoachCommandCenter.controller` 298); admin at 296–297; client ships outright breaches (`AiConsentScreen` 819, `ClientProfilePage` 419, `ClientDashboardHomeTab` 314, `ClientMyWorkoutsPage` 309); user has `HomeTab` 374. The cap is producing truncation-shaped files, not architecture. Fix: decompose the four client breaches first (largest), using the `CanonicalProgressChartsGrid.*` split pattern already proven in-tree.

**X5 — Dead parallel generations are a standing hazard.** Home carries ~2,700 lines of unmounted predecessors (`HomePage.V3` 1400, `Hero-Section.V2` 468, `CreativeExpressionSection` 464, `ProgramsOverview.V3` 435); client carries a fully-built dormant `ClientObservatoryHome` (297); trainer still lazy-EXPORTS the orphaned `MyClientsView` (mock data inside) from `UniversalDashboardLayout.routeComponents.tsx:54` — a live export means it can ship in the bundle and can be edited in the honest belief it is live. Fix: Rule-34 cleanup pass (classify → grep-check → Sean approves) + delete the orphan export line now (it is one line, provably unrouted).

---

## HOME PAGE — verdict: **REVISE** (live production defect + brand-law violations on the flagship surface)

**H1 — BLOCKER, production error: `GET /api/cart` returns 500 on every homepage load.** Console: `Failed to fetch cart {status: 500}` at page load (captured log, 2026-09-01). An anonymous-or-not visitor's first contact with SwanStudios includes a failing money-path request. This is outside design scope but blocks any "premium" claim — first impressions include a red console and whatever UI degrades from it. Fix path: backend cart route for the sessionless case; regression test the anonymous load. `[VERIFIED — live network response]`

**H2 — [LAW 4] "The Arsenal" section is a literal creature rendering.** The live section shows a full glowing winged-swan/phoenix illustration as its banner media. LAW 4: nature enters as light behavior only; "the swan lives in the Crystallize and nowhere else"; the shipped sanctioned pattern is the About-page dark occluder. This is the exact banned move on the highest-traffic surface. Fix: replace with an optics treatment (caustic field, refraction sweep over training-detail macro footage) per `ArsenalSection`'s emotional job; the C1/C3 asset flow in the router now requires a Step 3.5 STYLE RECEIPT for the replacement. `[VERIFIED — live capture]`

**H3 — [LAW 2] Gold renders as interactive chrome on the hero.** The quick-nav pill row styles "SwanStudios Photography" and "Trainer Staff Review" in gold. Gold's allowlist is: PR numeral, ≤1px filigree, focus ring, one badge per scene. Two gold pills as navigation = two defects per LAW 2's own wording. Fix: pills take standard surface chrome; gold stays scarce. `[VERIFIED — 1440/414 captures]`

**H4 — [LAW 1/LAW 11] The hero's substrate is present but illegible; no impossible phenomenon exists.** `VideoBg` renders `VIDEO.swans` at opacity 0.35 over `#030712` — at 1440px the swans read as noise; at 414px the frame is effectively black (captures). The page's ONE impossible phenomenon is… absent: the hero is headline + 2 CTAs + 6 utility pills, which is "engineer-built" under LAW 11 and grazes the banned "empty centered hero" pattern (the media co-lead exists in code but not in perception). KEEP Swans.mp4 (standing decision) — fix the treatment: raise video luminance/contrast treatment, give the hero one load-bearing phenomenon (e.g., a caustic light pass that condenses into the headline), and relocate utility pills below the fold. `[VERIFIED — captures]`

**H5 — IA: six quick-nav pills on the public hero leak internal surfaces.** "Waiver" and "Trainer Staff Review" are operational/staff links occupying the most expensive pixels on the site, tripling the hero's decision count (2 CTAs + 6 pills on three rows at 414px). Fix: hero keeps exactly the two CTAs; role-specific links live in nav/footer/dashboard. `[VERIFIED — captures]`

**H6 — [Rule 24/router matrix] `min-height:100vh` hero with no `svh`/`dvh`** (`HeroSection.tsx:49`) — mobile browser-chrome jump; the router's own responsive law names `svh`/`dvh`. One-line fix. `[VERIFIED — agent + file read]`

**H7 — Hero video has no `onError` fallback** beyond the poster (`HeroSection.tsx:115-123`); a failed video after first paint leaves the 0.35-opacity black field with nothing behind it. Wire `onError` → `StaticBg`. `[LIKELY]`

Clean notes: V4 architecture is disciplined (15 sections, all <300 lines, tier-gated motion, fail-closed PrismCapture); zero Tailwind/MUI; reduced-motion via central `useAnimationTier`, though only 2 CSS-level guards exist in the tree — the per-section `tier` prop discipline is fragile (H-residual: audit each section for a forgotten gate).

## USER DASHBOARD — verdict: **APPROVE with findings** (best-graded surface)

Product loop holds: Progress is tab #2, one click from Home (`UserDashboardTabBarV3.tsx:36-45`); training-proof widget + charts run on real `/api/workout/sessions`; loading/error/empty triad explicit (`WorkoutsTab.tsx:124-136,181-182`); Victory only.

**U1 — Progress is chart-poor for a progress-first product.** One chart file (`WorkoutsTabCharts.tsx` — bars only) while `ProfileData.chartVisibility` advertises `weightProgression`, `bodyFatTrend`, `strength1RM` that nothing renders (`types/UserDashboardTypes.ts:44-57`). The product's proof-of-progress promise is wider than its render. Fix: trend/line charts for the advertised series, C11 chart-environment treatment. `[LIKELY — agent receipt; render-path unverified]`
**U2 — [Rule 4]** `HomeTab.tsx` 374 lines on the highest-traffic panel. Split.
**U3 — [LAW 9]** 37 inline `style={{` uses bypass tokens (`CrystalProgressRing.fx.tsx:110` etc.). Migrate to styled/transient props.
**U4 — Hard `limit: 200`, no pagination** (`WorkoutsTab.tsx:91`) — long histories silently truncate; an athlete's year disappears without a "load more."
**U5 — [LAW 8]** zero world/lens tokens (X2 applies).

## CLIENT DASHBOARD — verdict: **REVISE** (structure, not data)

Data truth is good: no mocks, client-safe analytics endpoints, skeletons present.

**C1 — Error states masquerade as emptiness.** `ClientProgressDashboardPage.tsx:166,172,178` renders `—` on error — a paying client cannot distinguish "no data yet" from "we failed to load your data." DoD for data-fetch explicitly separates these. Fix: distinct error card + retry, reusing the user-tree `ErrorCard` pattern. `[LIKELY — agent receipt]`
**C2 — [Rule 4] `AiConsentScreen.tsx` = 819 lines** for one consent surface; `ClientProfilePage` 419; `ClientDashboardHomeTab` 314 wiring 9+ hooks (gamification, subscription, macros, social, notifications, messages, workouts, session) — the client home is a coupling hub where any hook failure risks the whole panel. Decompose; give each rail section its own error boundary like admin does.
**C3 — Dormant `ClientObservatoryHome` (297 lines)** competes with the shipped home (X5) — classify and resolve before anyone "fixes" the wrong home.
**C4 — [Rule 6]** heaviest raw-hex tree (1,832) — X3 applies here first.

## TRAINER DASHBOARD — verdict: **APPROVE with findings** (best loop, one bundle hazard)

The coaching loop is genuinely low-click: landing → My Clients → card "Log" quick-action → shared `WorkoutLogger` = **2 clicks** (`ClientsWorkspace.tsx:186-192,101-105`). This is the only tree consuming world/lens tokens (133 hits) and the only one with the Aurora Console root (`CoachCommandCenterPage.tsx:144`).

**T1 — Orphan with mock data still exported.** `UniversalDashboardLayout.routeComponents.tsx:54` lazy-exports `MyClientsView` (superseded by `TrainerClientsWorkspace`); its `MyClientsViewWithFallback.tsx:115-116` carries a `mockClients` array. Unrouted today — but one line of routing drift away from showing a trainer fake clients. Delete the export. `[LIKELY — agent receipt, export line quoted]`
**T2 — Error coverage is thin where it matters most.** ~30 files show loading states; ~3 handle errors. The 2-click loop has no specified failure UX — a failed client-list fetch or failed save mid-session is the highest-stress moment a trainer has. Fix: error+retry states on `ClientsWorkspace` fetch and `WorkoutLogger` save paths first.
**T3 — [LAW 5]** `CelebrationBurst` in the save handoff — see X1; this tree is where the resolution lands.
**T4 — Placeholder page ships live:** `TrainerVideosPage.tsx:36,64` "Placeholder data — replace with API fetch" on a routed tab. Either gate the tab or wire it.
**T5 — 22 routed trainer tabs** (overview→virtual-olympics) — the IA breadth dwarfs the 5-tab coaching core; secondary tabs dilute the loop (Rule 62 kill-or-defer test applies).

## ADMIN DASHBOARD — verdict: **REVISE** (ordering contradicts the product law)

Engineering quality is the strongest here: per-widget `WidgetErrorBoundary`, `metricUnavailable` honesty objects instead of fake numbers, `Promise.allSettled` fan-out, real-API Victory charts ("without demo fallbacks", `RevenueChart.tsx:1-3`).

**A1 — [Rule 62/Core Loop] Proof-of-value is buried 5th of 8.** Landing order: Signal bar → Quick actions → AI Terminal → Alerts → Work Queues → Business Lens → Revenue Integrity → **Operations (who trained / who's stale / who needs intervention)** (`AdminOverviewPanel.tsx:198-268`). The admin priority law says workout/progress truth surfaces before decorative features; an AI terminal panel outranking client-intervention signals is backwards. Fix: reorder — Work Queues + Operations above the fold, terminal below. `[LIKELY — agent receipt of section order]`
**A2 — [Rule 24] No ultra-wide plan on the landing grid.** `AdminOverviewPanel.styles.ts:39-80` stops at a 1280px 6-col; on Sean's own 2560 QHD the bento stretches or islands (the `2560px` pattern exists in-tree at `MeasurementEntry.baseStyles.ts:30` but not here).
**A3 — Motion weight on an operator surface.** `bentoItemAnimation` staggers entry across up to 12 tiles (`AdminOverviewPanel.styles.ts:16-37,87,95,111`). Rule 43 is satisfied — it IS `css``-wrapped now `[VERIFIED — file read, line 16]` — the residual issue is LAW 6 calm-atmosphere budget on an in-app tree with only 18 reduced-motion guards (lowest of the four dashboards).
**A4 — [Rule 4]** `AdminOverviewPanel.tsx` 297 / `AdminStellarSidebar.tsx` 296 — at the ceiling (X4).

---

## Ranked next-slice order (Rule 60)

1. **H1** cart-500 (production, money-path, anonymous first impression)
2. **X1** one-celebration resolution (brand signature; touches trainer save path)
3. **A1** admin landing reorder (pure IA, no new backend)
4. **C1+T2** error-state honesty (client `—`, trainer loop failure UX)
5. **H2–H5** home brand-law pass (Arsenal creature, gold pills, hero treatment/IA)
6. **X2** world/lens bridge migration, one surface per slice
7. **X4/C2** file decomposition, client tree first
8. **X5/T1** dead-generation cleanup (Rule 34 pass, orphan export deletion now)

## Review log

- R1 (this file): Fable lead pass over five evidence packs + live captures; two self-findings withdrawn on instrument grounds (stats zeros, black gaps).
- R2: GLM 5.3 hostile seat — see `panel-design-brain-style-intelligence-2026-09-01/03-glm53-five-surface-review.md`.
- R3: GLM 5.3 Flash cross-check — `04-glm-flash-five-surface-crosscheck.md`.
