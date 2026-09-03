# Hostile Design Review — Home + User/Client/Trainer/Admin Dashboards (rev 3)

- **Date:** 2026-09-01, rev 3 2026-09-02 · **Lead reviewer:** Claude Fable 5 (Final Decider) · **Panel:** GLM 5.3 (hostile seat, R2) + GLM 5.3 Flash (cross-check, R3) + GPT-5.6 Sol (filesystem hostile pass, R4) — outputs in `panel-design-brain-style-intelligence-2026-09-01/`
- **Decision:** verdicts + ranked defect list per surface; no code changed by this review
- **Status:** open
- **Supersedes:** rev 1 (R2 arbitration) and rev 2 (R4/Sol arbitration — T4 withdrawn as FALSE, A1 corrected to 8-of-11, C1 narrowed; see Review log + `05-sol-arbitration-and-corrections.md`)
- **Baseline:** origin/main `4c2fd507e` (worktree `feat/design-brain-style-intelligence`). Live captures: sswanstudios.com 2026-09-01 at 414/1440/2560 CSS px + console log + one anonymous curl probe and two settled greps (Instrument note 3). Evidence packs: five scoped agent inventories (file:line receipts) — hypotheses per Rule 30; load-bearing claims spot-verified where noted.
- **Grading law (full declaration, per R2 ATK-1):** router LAWS 1–11, the complete CLAUDE.md numbered rules (4, 6, 10, 24, 27, 30, 34, 43, 60, 62 are cited below), the Product Core Loop, and the task-type Definitions of Done.

## Instrument notes (read before the findings)

1. A full-page Playwright screenshot does NOT fire `useInView`/`whileInView`. The "0+ / 0%" stats and the giant black inter-section gaps in the 1440px full-page capture are **capture artifacts** — `StatsSection.tsx:74` gates `AnimatedCounter` on `useInView`, and STATS values are real claims from `content/marketingStats` (`HomeData:73-80`). Withdrawn as display findings — but see H8: the gating itself is a real SEO/no-JS defect. `[VERIFIED]`
2. The capture session carried an avatar + Logout — an authenticated (possibly stale) session, not a clean anonymous visit. Every live-capture claim below inherits that caveat; an anonymous clean-profile capture is a gate on the home slices. `[VERIFIED — session state observed]`
3. **Capture artifacts (session-local, sha256-prefixed):** scratchpad `home-captures/` — `home-1440-above-fold.png` df26228b9d40 · `home-414-above-fold.png` 41623ed164c8 · `home-2560-above-fold.jpeg` e2e5d28750f7 · `home-1440-full.jpeg` f69291f8df5a (full-page: instrument-limited per note 1). All taken 2026-09-01, authenticated-session caveat per note 2. Visual claims cite these; they live outside the repo, so a re-reviewer without them should re-capture rather than trust prose.
4. **Settled probes (post-R2):** anonymous `GET /api/cart` returns **401** `{"Not authorized, no token"}` — clean refusal, no 500 `[VERIFIED — curl]`. `chartVisibility` IS user-surfaced (`UserDashboard/components/EditProfileChartToggles.tsx`, `ChartTogglePanel.tsx`, `EditProfileModal.tsx`) `[VERIFIED — grep]`. `UniversalDashboardLayout.routeComponents.tsx` is consumed by `UniversalDashboardLayout.routes.tsx`, which serves ALL FOUR roles `[VERIFIED — grep]`.

## What is CLEAN across the five surfaces `[VERIFIED via scoped greps]`

- **Zero** MUI, recharts, Tailwind, and **zero Galaxy-Swan literals** in all five canonical trees. Victory is the only chart library (Rule 10 holds).
- Every checked **dashboard-panel** datum traces to a real API. The only placeholder/mock datasets found live in UNROUTED orphans — `MyClientsViewWithFallback` and `TrainerVideosPage` (X5); no routed surface was proven to ship fake data. `[VERIFIED — R4 route walk]`
- Reduced-motion coverage is broad in-app (user 69 / client 77 / trainer 65 / admin 18 grep hits — grep counts, not motion-weight proof).
- Token-driven styling is pervasive (`var(--…)`: user 1664 / client 2241 / trainer 3128 / admin 1150).

---

## CROSS-CUTTING

**X1 — [LAW 5 + Rule 27] The signature is absent from every live surface; one unsanctioned celebration exists.** `useCrystallizeTransition`/`CrystallizeOverlay`: 0 hits in all five live trees. The primitives exist (`adapters/style-lens-swan/motion/*`) but are consumed only by workout-design-lab and the PARKED v2 densities. The only celebration a user ever sees is `WorkoutLogger/handoff/CelebrationBurst.tsx` — disciplined (one-shot, ~900ms, lens-recolorable) but not the spec'd Crystallize. Framing per R2: this is an **absent signature**, not a live double-celebration — the competition exists in the codebase, not the experience. Cheap resolution (recommended): **bless CelebrationBurst as the Crystallize execution** — absorb it into the adapter, bind it to the `pending→forming→formed→resting` contract, one celebration, one name. `[VERIFIED — lead greps]` **CORRECTION (Fable 5.1, 2026-09-02, blueprint v2 G1):** `useCrystallizeTransition` is a settings/appearance theme-switch transition (`CRYSTALLIZE_SURFACE_ID = 'settings.appearance'`, phases idle→charging→settling) — NOT the LAW-5 record artifact. The record artifact exists nowhere; S7 in the blueprint BUILDS it around CelebrationBurst + a new `CrystallizeRecord` chip.

**X2 — [LAW 8] World/lens re-skin silently dies at tree boundaries — a live inconsistency, not backlog.** `--world-`/`--lens-` hits: trainer 133, all four other trees 0. A trainer whose world/lens is active (Aurora root, `CoachCommandCenterPage.tsx:144`) crosses to any other dashboard and the "re-skin with zero code change" contract drops mid-session — same user, two skins, today. Fix: per-surface `*.tokens.ts` bridge migration, one surface per slice; no LAW-8 compliance claims until a tree consumes `--world-*`.

**X3 — [Rule 6] Hex debt: fix the SOURCES, not the counts.** Raw grep totals (client 1,832 / admin 950 / home 77) are dominated by legal `var(--token, #fallback)` forms and cannot drive triage. What the evidence actually convicts: (1) **admin's theme file itself carries raw hex** (`admin-dashboard-theme.ts:8-12`) — drift at the token source propagates to every consumer; (2) the one cited per-file drift sits on the **AI consent surface** (`AiConsentScreen.tsx:38,42`) — palette drift on a legal-trust screen. Order: theme file, consent screen, then extend the SWA-206 annotate-and-expire strangler pattern outward.

**X4 — [Rule 4] Five outright cap breaches.** Client `AiConsentScreen` 819, `ClientProfilePage` 419, `ClientDashboardHomeTab` 314, `ClientMyWorkoutsPage` 309; user `HomeTab` 374. Decompose using the in-tree `CanonicalProgressChartsGrid.*` split pattern; consent screen first (it is also X3's trust surface). (Near-cap files at 293–298 are compliant; no finding without interior evidence — R2 ATK-7 sustained.)

**X5 — [Rule 34] Dead parallel generations + one shared-shell orphan.** Home: ~2,700 unmounted lines (`HomePage.V3` 1400, `Hero-Section.V2` 468, `CreativeExpressionSection` 464, `ProgramsOverview.V3` 435). Client: dormant `ClientObservatoryHome` (297). Shared shell: `UniversalDashboardLayout.routeComponents.tsx:54` still lazy-exports the superseded `MyClientsView` (whose fallback carries `mockClients`), and `:84` lazy-exports the unrouted `TrainerVideosPage` (placeholder data inside — the file behind rev 2's withdrawn T4) — as `lazy()` it is a chunk fetched only on navigation, so the hazard is **routing drift in a file all four roles route through**, not runtime weight. Delete the export line now (provably unrouted); the rest goes through a Rule-34 classify→grep→approve pass.

**X6 — P0 PRODUCTION (found by probe 0b, 2026-09-02, FIXED on this branch): an infinite fetch cycle hammered `/api/sessions` + `/api/sessions/analytics` from every page.** `SessionContext.tsx` — `fetchSessionAnalytics` listed `sessions` in its `useCallback` deps (:392 pre-fix) while the login-load effect (:472) depended on `fetchSessionAnalytics` and called `fetchSessions` → `setSessions` → new callback identity → effect re-ran, forever, ~2 pairs/sec for the life of the tab (350+ pairs observed in one page view). `SessionProvider` wraps the entire app (`App.tsx:266`), so every authenticated visitor ran this loop continuously against the paid Render Postgres. Fix shipped: analytics fallback reads through `sessionsRef`, `sessions` dropped from the deps; contract test `sessionContextPollingLoop.contract.test.ts` pins the cycle broken. Anonymous attribution is `[LIKELY]` (timeline strongly indicates the loop also ran on the anonymous page, but the network log accumulates across navigations — instrument limitation; post-deploy re-probe will settle it). `[VERIFIED — live log + mechanism in source]`

---

## HOME PAGE — verdict: **REVISE**

**H2 — BLOCKER [LAW 4]: "The Arsenal" is a literal creature rendering on the flagship surface.** Live section media is a full glowing winged-swan illustration. LAW 4: nature enters as light behavior only; the sanctioned pattern is the About occluder ("the swan is bent light, never a drawn silhouette"). This is the highest-traffic surface violating the brand's most identity-defining law, on-capture, on-evidence. Fix: replace with an optics treatment (caustic field / refraction sweep over real training-detail macro); the replacement brief now requires a Step 3.5 STYLE RECEIPT. `[VERIFIED — live capture]`

**H1 — production error, rescoped per R2+probe: authenticated cart fetch 500s.** The captured (authenticated) session logged `GET /api/cart → 500` on page load; the anonymous path returns a clean 401 `[VERIFIED — console log + curl]`. Probe 0a ran 2026-09-02: the capture session's token REFRESHED successfully (`/api/auth/refresh-token` → 200, `/api/auth/me` → 200) and `GET /api/cart` still returned **500** on the same load — so "stale session" is largely dead: a live, refresh-capable session fails cart bootstrap. `[VERIFIED — live network log]`. Residual UNPROVEN: whether EVERY account reproduces (probe used one account); a fresh-credential login remains the final confirmation. Money-path fix slice is GO.

**H3 — [LAW 2] Gold as interactive chrome:** "SwanStudios Photography" and "Trainer Staff Review" pills render gold. Allowlist is PR numeral / ≤1px filigree / focus ring / one badge. De-gold. `[VERIFIED — captures]`

**H4 — [LAW 1/11, scoped to the hero-static state per R2 ATK-3]:** `VideoBg` at opacity 0.35 over `#030712` renders near-black at 414px and muddy at 1440px; the hero's visible composition is headline + 2 CTAs + 6 utility pills — no legible media co-lead, no impossible phenomenon **in the hero**. (Page-wide phenomenon claims withdrawn — `whileInView` content is invisible to the instrument.) KEEP Swans.mp4 (standing decision); fix the treatment: luminance/contrast pass, one load-bearing phenomenon, pills relocated. `[VERIFIED — captures]`

**H5 — IA: six quick-nav pills leak internal surfaces onto the hero.** "Waiver" and "Trainer Staff Review" are operational links occupying the most expensive pixels on the site; at 414px the hero carries 8 interactive elements on 3 rows. Hero keeps 2 CTAs; role links live in nav/footer/dashboards. `[VERIFIED — captures]`

**H6 — [Rule 24] `min-height:100vh` hero, no `svh`/`dvh`** (`HeroSection.tsx:49`). One line. `[VERIFIED]`

**H7 — No `onError` on the hero video** (`HeroSection.tsx:115-123`) — post-poster failure leaves a black field. Wire `onError` → `StaticBg`. `[LIKELY]`

**H8 — (adopted from R2 N1) Marketing claims render as zeros in the initial DOM.** `AnimatedCounter` gated on `useInView` means crawlers, link previews, print, and no-JS see "0+ Years Experience / 0% Satisfaction." Animate toward seeded final values; never gate content itself on observation. `[VERIFIED — mechanism read]`

**H9 — (adopted from R2 N5) Reduced-motion is opt-out-by-memory.** Only 2 CSS-level guards in the tree; every section must remember its `tier` prop. Default the tier at the layout wrapper so forgetting is the active choice. `[LIKELY]`

Clean notes: V4 architecture is disciplined (15 sections all <300 lines, fail-closed PrismCapture, V3 auto-fallback); zero Tailwind/MUI.

## USER DASHBOARD — verdict: **REVISE** (flipped from APPROVE by settled probe, per R2's condition)

Product loop holds: Progress is tab #2, one click from Home; training-proof runs on real `/api/workout/sessions`; loading/error/empty triad explicit; Victory only.

**U1 — WITHDRAWN as FALSE (Opus 5, 2026-09-03, during S8 build; same defect class as T4).** The claim was "advertised progress charts don't render — live dead controls". The render path says otherwise:
- `bodyFatTrend` IS wired — `pages/Social/components/ProfileChartsSection.tsx:95` maps it to a lazy-loaded `BodyFatTrendLine` (`components/Charts/charts/live/BodyFatTrendLine.tsx`), gated `requiresPro: true`.
- `weightProgression` IS rendered — it is one of only two default-visible canonical charts (`ProfileChartsGrid.tsx:70-73`), kept precisely because it has "proven truthful SQL" (fed by `body_measurements`).
- `strength1RM` is offered to NOBODY — it exists in the `UserDashboardTypes` interface and appears in no toggle UI and no chart. Nothing advertises it, so it cannot be a dead control.

A prior chart-truth pass had already done this work deliberately: `ProfileChartsGrid.tsx:60-69` records that `muscleRadar` was REMOVED from defaults because its data chain is schema-drifted and its tables are empty in production, while the registry entry was kept so an opt-in user gets an honest empty state rather than a missing control. The review graded that considered design as neglect.

How it survived three rounds: the settling probe asked "is `chartVisibility` user-surfaced?" and a grep answered yes (a toggle panel exists). That is not the same question as "does each named key render", and the verdict flip (USER APPROVE→REVISE) rode on the narrower one. **Nothing was built on it** — the blueprint's `TrendChart.tsx` would have duplicated `BodyFatTrendLine` and created exactly the competing-surface hazard X5 warns about. U4 (pagination) was real and shipped on its own merits.

**U2 — [Rule 4]** `HomeTab.tsx` 374 lines on the highest-traffic panel. Split.
**U3 — [LAW 9]** 37 inline `style={{` uses (`CrystalProgressRing.fx.tsx:110` etc.).
**U5 — [LAW 8]** zero world/lens tokens (X2).

## CLIENT DASHBOARD — verdict: **REVISE**

Data truth is good: no mocks, client-safe analytics endpoints, skeletons present.

**C1 — narrowed (R4/Sol + lead verification): stat tiles are honest; the recap card is not.** The stat strip DOES distinguish states — `weeklyRecapError ? '—' : value` (`ClientProgressDashboardPage.tsx:159-180`), so rev 2's "error is indistinguishable from no data" was overbroad. The real defect: `WeeklyRecapCard` receives no error state and renders "No weekly recap available yet." after a network FAILURE (`ClientProgressDashboardPage.cards.tsx:68` area) — a paying client reads a failed fetch as an empty week, with no retry. Fix: failure copy + retry on the recap card (user-tree `ErrorCard` pattern); do NOT redesign the whole progress state model. `[VERIFIED — lead file read 2026-09-02]`
**C2 — [Rule 4]** breaches per X4 — consent screen first (819 lines AND palette drift on a trust surface, X3/N6); `ClientDashboardHomeTab` (314) is a 9-hook coupling hub — decompose and give each rail section its own error boundary as admin does.
**C3 —** dormant `ClientObservatoryHome` (X5) — classify before anyone edits the wrong home.

## TRAINER DASHBOARD — verdict: **REVISE** (rev 3: driver is T2 — the money loop has no failure UX; rev 2's T4 is WITHDRAWN as false)

The coaching loop is the best in the product: landing → My Clients → card "Log" → shared `WorkoutLogger` = **2 clicks** (`ClientsWorkspace.tsx:186-192,101-105`). Only tree consuming world/lens tokens; Aurora Console root present.

**T4 — WITHDRAWN (R4/Sol, route-walk verified).** Trainer `/videos` mounts `VideoLibraryPage` → `VideoLibraryV3` (real `/api/v2/videos` + error handling) at `UniversalDashboardLayout.routes.tsx:193`; `TrainerVideosPage` (the placeholder file) is an UNROUTED lazy export at `routeComponents.tsx:84` — an orphan, not a live tab. Rev 2 accepted an agent receipt at `[LIKELY]` without opening the route map. The orphan folds into X5. `[VERIFIED — routes.tsx:179,193 + routeComponents.tsx:84-85]`
**T2 — no failure UX on the money loop (the REVISE driver).** ~30 files show loading states; ~3 handle errors. A failed client-list fetch or failed save mid-session — the trainer's highest-stress moment — has no specified UX. Error+retry on `ClientsWorkspace` fetch and `WorkoutLogger` save paths first.
**T1 —** shared-shell orphan export (X5) — delete `routeComponents.tsx:54`.
**T5 — [Rule 62]** 22 routed trainer tabs dwarf the 5-tab coaching core; run the kill-or-defer test on the tail.
APPROVE becomes available when T2's two paths (client-list fetch, workout save) have specified error+retry UX — the same error-honesty bar C1 holds the client surface to.

## ADMIN DASHBOARD — verdict: **REVISE**

Strongest engineering: per-widget `WidgetErrorBoundary`, `metricUnavailable` honesty objects, `Promise.allSettled`, real-API Victory charts.

**A1 — [Rule 62/Core Loop] Proof-of-value renders 8th of ELEVEN top-level bands (rev 3, now lead-verified in-file).** Landing order: Signal bar → Quick actions → AI Terminal → Alerts → Work Queues → Business Lens → Revenue Integrity → **Operations (who trained / who's stale / who needs intervention)** → Ops Intelligence → Community/Content Safety → Telemetry (`AdminOverviewPanel.tsx:198-292`). Rev 2 called it "8th of 8 — last": FALSE (R4/Sol) — three bands follow it. The corrected argument stands on the real order: the intervention band still sits below an AI terminal and three money bands, and the admin law says client workout/progress truth outranks decorative utility. Fix: Work Queues + Operations above the fold. `[VERIFIED — lead file read 2026-09-02]`
**A2 — [Rule 24]** landing grid stops at a 1280px 6-col (`AdminOverviewPanel.styles.ts:39-80`); behavior at 2560 unestablished (stretch vs island decides the fix — capture first, then slice).
**A3 — (demoted to note per R2 ATK-11)** `bentoItemAnimation` is `css``-wrapped `[VERIFIED — styles.ts:16]` — Rule 43 satisfied; motion-weight concern recorded, no LAW-6 breach asserted without a measured budget violation.
**A4 — [Rule 4]** none breach in the sampled admin set; watch the two at 296–297.

---

## Ranked next-slice order — SUPERSEDED 2026-09-02 by `DESIGN-BRAIN-FIVE-SURFACE-BLUEPRINT-V2-2026-09-02.md` §4 (Fable 5.1 build spec, S1–S9); kept for history (Rule 60, rebuilt after R4 — rev 2's "gate the Videos tab" slice is DELETED with its false finding)

0. ~~Two probes~~ **RAN 2026-09-02:** 0a → cart-500 confirmed on a refresh-capable session (H1 fix is GO); 0b → anonymous baseline captured (`home-anon-414.png` sha256 c23920bb89a4, scratchpad `home-captures/`; pills rendered for logged-out visitors too — now relocated) AND exposed X6, the app-wide fetch cycle — fixed on this branch.
1. ~~Hero mobile-honesty triad — H3 + H5 + H6~~ **SHIPPED on this branch:** pills relocated to `QuickLinksStrip` below the fold (hero = 2 CTAs), de-golded to one calm sapphire treatment, `min-height:100svh` with `100vh` fallback. Contract test re-anchored (`trainerRecruitmentLinks.contract.test.ts` — intent preserved, anchor followed the link).
2. **Error-honesty pair — C1 (client recap card) + T2 (trainer fetch/save paths).** Same defect class, same `ErrorCard` reuse; converts "silently wrong" into "honest + retryable" on both core loops.
3. **H1 — fix the authenticated cart-500** (probe confirms GO; backend slice).
4. **A1 — admin landing reorder** (order now lead-verified; pure IA change).
5. **H2 — Arsenal creature replacement** (Seedance asset run; STYLE RECEIPT required).
6. **X1 — bless CelebrationBurst as the Crystallize execution** (option a).
7. **U1+U4 — pagination + advertised trend charts, one slice.**
8. **X2 — world/lens bridge, one surface per slice** (user tree first — biggest contract gap).
9. **X4 — decomposition, consent screen first** · 10. **X5 — Rule-34 cleanup pass + deletion of BOTH orphan exports (`routeComponents.tsx:54` and `:84`).**

## Review log

- **R1** — Fable lead pass over five evidence packs + live captures; two self-findings withdrawn on instrument grounds (stats zeros, black gaps).
- **R2** — GLM 5.3 hostile seat (`03-glm53-five-surface-review.md`): 12 attacks, 8 new findings, 3 verdict challenges. **Arbitration:** ATK-1..12 sustained except ATK-12 (partially — capture unavailable for authed admin at 2560, disambiguation kept as gate); N1–N8 adopted (N1→H8, N2→X2, N3→U1+U4, N4→X5/T1, N5→H9, N6/N7→X3, N8→slice-1 gate). Verdicts changed: USER APPROVE→REVISE (settled by `chartVisibility` probe), TRAINER APPROVE→REVISE (severity consistency). A1 corrected 5th→8th of 8. H1 rescoped by anonymous-curl probe (401, not 500).
- **R3** — GLM 5.3 Flash cross-check of rev 2 (`04-glm-flash-five-surface-crosscheck.md`): PASS + 2 wording nits (fixed in rev 2.1). Scope caveat (per R4): R2 was evidence-restricted to the review's own quotes and R3 verified arbitration fidelity — neither re-opened source files; they validate editorial integrity, not ground truth.
- **R4** — GPT-5.6 Sol, filesystem hostile pass (`05-sol-arbitration-and-corrections.md` carries the full arbitration): 10/10 findings verified REAL by lead re-reads + a live `compileProfile({write:false})` probe. Rev 3 changes: **T4 withdrawn as FALSE** (trainer `/videos` → `VideoLibraryPage`; the placeholder file is an unrouted orphan), **A1 corrected** to 8th-of-11 with lead-verified order, **C1 narrowed** to the recap card, **H1 breadth marked UNPROVEN** with the fresh-login repro as gate 0, capture artifacts now cited with sha256 prefixes, ranked list rebuilt. The taste bridge and Step 3.5 were repaired in the same pass (real `taste-snapshot/1` + `sourceHash` contract, last-known-good preservation, 12 regression tests) — see the branch commits.
