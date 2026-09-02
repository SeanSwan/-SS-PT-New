# Hostile Design Review — Home + User/Client/Trainer/Admin Dashboards (rev 2)

- **Date:** 2026-09-01 · **Lead reviewer:** Claude Fable 5 (Final Decider) · **Panel:** GLM 5.3 (hostile seat, R2) + GLM 5.3 Flash (cross-check, R3) — outputs in `panel-design-brain-style-intelligence-2026-09-01/`
- **Decision:** verdicts + ranked defect list per surface; no code changed by this review
- **Status:** open
- **Supersedes:** rev 1 (same file, superseded in place after R2 arbitration — see Review log)
- **Baseline:** origin/main `4c2fd507e` (worktree `feat/design-brain-style-intelligence`). Live captures: sswanstudios.com 2026-09-01 at 414/1440/2560 CSS px + console log + one anonymous curl probe and two settled greps (Instrument note 3). Evidence packs: five scoped agent inventories (file:line receipts) — hypotheses per Rule 30; load-bearing claims spot-verified where noted.
- **Grading law (full declaration, per R2 ATK-1):** router LAWS 1–11, the complete CLAUDE.md numbered rules (4, 6, 10, 24, 27, 30, 34, 43, 60, 62 are cited below), the Product Core Loop, and the task-type Definitions of Done.

## Instrument notes (read before the findings)

1. A full-page Playwright screenshot does NOT fire `useInView`/`whileInView`. The "0+ / 0%" stats and the giant black inter-section gaps in the 1440px full-page capture are **capture artifacts** — `StatsSection.tsx:74` gates `AnimatedCounter` on `useInView`, and STATS values are real claims from `content/marketingStats` (`HomeData:73-80`). Withdrawn as display findings — but see H8: the gating itself is a real SEO/no-JS defect. `[VERIFIED]`
2. The capture session carried an avatar + Logout — an authenticated (possibly stale) session, not a clean anonymous visit. Every live-capture claim below inherits that caveat; an anonymous clean-profile capture is a gate on the home slices. `[VERIFIED — session state observed]`
3. **Settled probes (post-R2):** anonymous `GET /api/cart` returns **401** `{"Not authorized, no token"}` — clean refusal, no 500 `[VERIFIED — curl]`. `chartVisibility` IS user-surfaced (`UserDashboard/components/EditProfileChartToggles.tsx`, `ChartTogglePanel.tsx`, `EditProfileModal.tsx`) `[VERIFIED — grep]`. `UniversalDashboardLayout.routeComponents.tsx` is consumed by `UniversalDashboardLayout.routes.tsx`, which serves ALL FOUR roles `[VERIFIED — grep]`.

## What is CLEAN across the five surfaces `[VERIFIED via scoped greps]`

- **Zero** MUI, recharts, Tailwind, and **zero Galaxy-Swan literals** in all five canonical trees. Victory is the only chart library (Rule 10 holds).
- Every checked **dashboard-panel** datum traces to a real API — with one exception the trainer verdict now carries: the routed Videos tab ships placeholder data (T4). Outside T4, the only mock dataset found lives in an unrouted orphan (T1).
- Reduced-motion coverage is broad in-app (user 69 / client 77 / trainer 65 / admin 18 grep hits — grep counts, not motion-weight proof).
- Token-driven styling is pervasive (`var(--…)`: user 1664 / client 2241 / trainer 3128 / admin 1150).

---

## CROSS-CUTTING

**X1 — [LAW 5 + Rule 27] The signature is absent from every live surface; one unsanctioned celebration exists.** `useCrystallizeTransition`/`CrystallizeOverlay`: 0 hits in all five live trees. The primitives exist (`adapters/style-lens-swan/motion/*`) but are consumed only by workout-design-lab and the PARKED v2 densities. The only celebration a user ever sees is `WorkoutLogger/handoff/CelebrationBurst.tsx` — disciplined (one-shot, ~900ms, lens-recolorable) but not the spec'd Crystallize. Framing per R2: this is an **absent signature**, not a live double-celebration — the competition exists in the codebase, not the experience. Cheap resolution (recommended): **bless CelebrationBurst as the Crystallize execution** — absorb it into the adapter, bind it to the `pending→forming→formed→resting` contract, one celebration, one name. `[VERIFIED — lead greps]`

**X2 — [LAW 8] World/lens re-skin silently dies at tree boundaries — a live inconsistency, not backlog.** `--world-`/`--lens-` hits: trainer 133, all four other trees 0. A trainer whose world/lens is active (Aurora root, `CoachCommandCenterPage.tsx:144`) crosses to any other dashboard and the "re-skin with zero code change" contract drops mid-session — same user, two skins, today. Fix: per-surface `*.tokens.ts` bridge migration, one surface per slice; no LAW-8 compliance claims until a tree consumes `--world-*`.

**X3 — [Rule 6] Hex debt: fix the SOURCES, not the counts.** Raw grep totals (client 1,832 / admin 950 / home 77) are dominated by legal `var(--token, #fallback)` forms and cannot drive triage. What the evidence actually convicts: (1) **admin's theme file itself carries raw hex** (`admin-dashboard-theme.ts:8-12`) — drift at the token source propagates to every consumer; (2) the one cited per-file drift sits on the **AI consent surface** (`AiConsentScreen.tsx:38,42`) — palette drift on a legal-trust screen. Order: theme file, consent screen, then extend the SWA-206 annotate-and-expire strangler pattern outward.

**X4 — [Rule 4] Five outright cap breaches.** Client `AiConsentScreen` 819, `ClientProfilePage` 419, `ClientDashboardHomeTab` 314, `ClientMyWorkoutsPage` 309; user `HomeTab` 374. Decompose using the in-tree `CanonicalProgressChartsGrid.*` split pattern; consent screen first (it is also X3's trust surface). (Near-cap files at 293–298 are compliant; no finding without interior evidence — R2 ATK-7 sustained.)

**X5 — [Rule 34] Dead parallel generations + one shared-shell orphan.** Home: ~2,700 unmounted lines (`HomePage.V3` 1400, `Hero-Section.V2` 468, `CreativeExpressionSection` 464, `ProgramsOverview.V3` 435). Client: dormant `ClientObservatoryHome` (297). Shared shell: `UniversalDashboardLayout.routeComponents.tsx:54` still lazy-exports the superseded `MyClientsView` (whose fallback carries `mockClients`) — as `lazy()` it is a chunk fetched only on navigation, so the hazard is **routing drift in a file all four roles route through**, not runtime weight. Delete the export line now (provably unrouted); the rest goes through a Rule-34 classify→grep→approve pass.

---

## HOME PAGE — verdict: **REVISE**

**H2 — BLOCKER [LAW 4]: "The Arsenal" is a literal creature rendering on the flagship surface.** Live section media is a full glowing winged-swan illustration. LAW 4: nature enters as light behavior only; the sanctioned pattern is the About occluder ("the swan is bent light, never a drawn silhouette"). This is the highest-traffic surface violating the brand's most identity-defining law, on-capture, on-evidence. Fix: replace with an optics treatment (caustic field / refraction sweep over real training-detail macro); the replacement brief now requires a Step 3.5 STYLE RECEIPT. `[VERIFIED — live capture]`

**H1 — production error, rescoped per R2+probe: authenticated cart fetch 500s.** The captured (authenticated) session logged `GET /api/cart → 500` on page load; the anonymous path returns a clean 401 `[VERIFIED — console log + curl]`. So the defect is scoped to **logged-in users' cart bootstrap** — possibly a stale/corrupt session record, possibly every session. Gate before slicing: reproduce with a fresh login. Money-path severity stands; "every homepage load" does not.

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

**U1+U4 (one defect, sequenced together per R2 N3) — advertised progress charts don't render, and their feed truncates.** `ProfileData.chartVisibility` exposes `weightProgression`, `bodyFatTrend`, `strength1RM` — and these toggles ARE user-facing (`EditProfileChartToggles.tsx`, `ChartTogglePanel.tsx` `[VERIFIED — grep]`) — while the Progress tab renders only `WorkoutsTabCharts.tsx` bar charts: **live dead controls on the core-promise surface.** The same panel fetches with hard `limit: 200`, no pagination (`WorkoutsTab.tsx:91`) — build the trend charts on that and they'd be confidently wrong for long histories. Fix as one slice: pagination/windowing first, then the advertised trend series in a C11 chart environment.
**U2 — [Rule 4]** `HomeTab.tsx` 374 lines on the highest-traffic panel. Split.
**U3 — [LAW 9]** 37 inline `style={{` uses (`CrystalProgressRing.fx.tsx:110` etc.).
**U5 — [LAW 8]** zero world/lens tokens (X2).

## CLIENT DASHBOARD — verdict: **REVISE**

Data truth is good: no mocks, client-safe analytics endpoints, skeletons present.

**C1 — Error states masquerade as emptiness.** `ClientProgressDashboardPage.tsx:166,172,178` renders `—` on error — a paying client cannot distinguish "no data yet" from "we failed to load your data." Fix: one reuse source — the user-tree `ErrorCard` + retry (chosen over admin's `metricUnavailable`, which is a value-level pattern, per R2). `[LIKELY — agent receipt]`
**C2 — [Rule 4]** breaches per X4 — consent screen first (819 lines AND palette drift on a trust surface, X3/N6); `ClientDashboardHomeTab` (314) is a 9-hook coupling hub — decompose and give each rail section its own error boundary as admin does.
**C3 —** dormant `ClientObservatoryHome` (X5) — classify before anyone edits the wrong home.

## TRAINER DASHBOARD — verdict: **REVISE** (downgraded from APPROVE per R2 ATK-9/10 — user-visible severity must outrank dormant-code severity)

The coaching loop is the best in the product: landing → My Clients → card "Log" → shared `WorkoutLogger` = **2 clicks** (`ClientsWorkspace.tsx:186-192,101-105`). Only tree consuming world/lens tokens; Aurora Console root present.

**T4 — a routed tab ships fake data.** `TrainerVideosPage.tsx:36,64` — "Placeholder data — replace with API fetch" on a live nav destination. Minutes-cost fix: gate/hide the tab until wired. This is the finding that qualifies the no-mocks clean claim. `[LIKELY — agent receipt, quoted comment]`
**T2 — no failure UX on the money loop.** ~30 files show loading states; ~3 handle errors. A failed client-list fetch or failed save mid-session — the trainer's highest-stress moment — has no specified UX. Error+retry on `ClientsWorkspace` fetch and `WorkoutLogger` save paths first.
**T1 —** shared-shell orphan export (X5) — delete `routeComponents.tsx:54`.
**T5 — [Rule 62]** 22 routed trainer tabs dwarf the 5-tab coaching core; run the kill-or-defer test on the tail.
APPROVE becomes available when T4 is gated and T2's two paths are specified.

## ADMIN DASHBOARD — verdict: **REVISE**

Strongest engineering: per-widget `WidgetErrorBoundary`, `metricUnavailable` honesty objects, `Promise.allSettled`, real-API Victory charts.

**A1 — [Rule 62/Core Loop] Proof-of-value is LAST — 8th of 8 (corrected per R2 ATK-4).** Landing order: Signal bar → Quick actions → AI Terminal → Alerts → Work Queues → Business Lens → Revenue Integrity → **Operations (who trained / who's stale / who needs intervention)** (`AdminOverviewPanel.tsx:198-268`). The admin law says workout/progress truth surfaces before decorative features; the intervention band trails everything including an AI terminal. Rule-30 gate: verify the section order in-file before scheduling the reorder (agent receipt, not yet lead-verified). Fix: Work Queues + Operations above the fold.
**A2 — [Rule 24]** landing grid stops at a 1280px 6-col (`AdminOverviewPanel.styles.ts:39-80`); behavior at 2560 unestablished (stretch vs island decides the fix — capture first, then slice).
**A3 — (demoted to note per R2 ATK-11)** `bentoItemAnimation` is `css``-wrapped `[VERIFIED — styles.ts:16]` — Rule 43 satisfied; motion-weight concern recorded, no LAW-6 breach asserted without a measured budget violation.
**A4 — [Rule 4]** none breach in the sampled admin set; watch the two at 296–297.

---

## Ranked next-slice order (Rule 60, rebuilt after R2)

1. **Hero mobile-honesty triad — H3 + H5 + H6** (+ the N8 clean-profile anonymous capture as its gate). Hours of diffs on the highest-traffic surface: 8 interactive elements over a near-black field → 2 CTAs above the fold, de-golded, `svh`-stable.
2. **T4 — gate the Videos tab.** Minutes; removes user-visible fake data from a live product.
3. **C1 — error-vs-empty card on the client progress page.** Converts "silently wrong" into "honest + retryable" for paying clients.
4. **H1 — reproduce authenticated cart-500 with a fresh login, then fix.** Money-path; scope now honest.
5. **A1 — admin landing reorder** (after in-file order verification).
6. **H2 — Arsenal creature replacement** (needs a Seedance asset run — bigger slice; STYLE RECEIPT required).
7. **X1 — bless CelebrationBurst as the Crystallize execution** (option a).
8. **U1+U4 — pagination + advertised trend charts, one slice.**
9. **X2 — world/lens bridge, one surface per slice** (user tree first — biggest contract gap).
10. **X4 — decomposition, consent screen first** · 11. **X5 — Rule-34 cleanup pass + orphan export deletion.**

## Review log

- **R1** — Fable lead pass over five evidence packs + live captures; two self-findings withdrawn on instrument grounds (stats zeros, black gaps).
- **R2** — GLM 5.3 hostile seat (`03-glm53-five-surface-review.md`): 12 attacks, 8 new findings, 3 verdict challenges. **Arbitration:** ATK-1..12 sustained except ATK-12 (partially — capture unavailable for authed admin at 2560, disambiguation kept as gate); N1–N8 adopted (N1→H8, N2→X2, N3→U1+U4, N4→X5/T1, N5→H9, N6/N7→X3, N8→slice-1 gate). Verdicts changed: USER APPROVE→REVISE (settled by `chartVisibility` probe), TRAINER APPROVE→REVISE (severity consistency). A1 corrected 5th→8th of 8. H1 rescoped by anonymous-curl probe (401, not 500).
- **R3** — GLM 5.3 Flash cross-check of rev 2 (`04-glm-flash-five-surface-crosscheck.md`).
