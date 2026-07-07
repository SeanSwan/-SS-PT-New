# Launch-Readiness Audit — Phase 0 of the Launch Charter

**Date:** 2026-07-06 · **Baseline:** `origin/main` @ `6e730975d`, audited in isolated worktree `c:/tmp/ss-launch-20260706` (branch `claude/launch-charter-20260706`)
**Charter (mission file):** `docs/ai-workflow/brainstorms/launch-readiness-master-prompt-2026-07-06.md` (shared tree; §11 status log)
**Produced by:** Fable 5 — 6-agent stale-tree recon → 3-agent main re-receipt lanes + live-production probes. Every finding re-verified on main with file:line unless tagged otherwise.

---

## 1. Defect Ledger (P0 blocks launch → P3 polish)

### P0 — block launch
| ID | Defect | Evidence | Fix shape |
|---|---|---|---|
| P0-1 | **Fabricated health vitals shown as real in live video sessions** — random HR/steps/sleep/HRV generated and POSTed | `frontend/src/components/VideoChat/WearableDataPanel.tsx:208-215`, rendered `VideoRoom.tsx:465` [VERIFIED on main] | Remove panel from VideoRoom (default, charter D-E) or wire to real `/api/wearable-data` |
| P0-2 | **False "NASM-certified" credential claim live on About** — contradicts the site's own timeline (`AboutData.ts:34`: NASM *workshops*) and Sean's standing rule | `AboutData.ts:96`; `About.V4.tsx:51` meta [VERIFIED on main] | Rule-53 wording-class scrub: 2 live sites + legacy files (HomePage.V3, About.V3, AboutContent, cinematic content, VIPConversionModal) |

### P1 — fix before/at launch
| ID | Defect | Evidence | Fix shape |
|---|---|---|---|
| P1-1 | **Prices leak to logged-out callers on LIVE production** — per-user price gating (Sean's intent) does not exist anywhere | **Live probe 2026-07-06:** unauthenticated `GET https://ss-pt-new.onrender.com/api/storefront` returned full `price`/`displayPrice`/`pricePerSession` for all packages [VERIFIED live]. Code: `StoreV3.tsx:637` (`canViewPrices = isAuthenticated`), `storeFrontRoutes.mjs:268` GET public, `mapStorefrontItem:220-253` serializes all price fields. Zero backend gating. | Charter §5 spec: `store-prices` UserFeatureFlag key (system exists — `UserFeatureFlag.mjs`, controller hardcodes only `content-studio` at `featureFlagController.mjs:157`), server-side field stripping, `pricesVisible` signal, admin grant UI, purchase gate, sibling sweep |
| P1-2 | **Marketing stats contradict themselves** — clients 500+ vs 1000+, satisfaction 98% vs 97%, exercises 840+ vs 900+ (DB ~736), years 26 vs 25+ | `HomeData.ts:75,79,94` vs `AboutData.ts:21,22,99`; `HeroSection.tsx:95` [VERIFIED] | One shared stats module; **needs Sean's real numbers (charter D-F)** — flagged `[NEEDS-SEAN-NUMBER]` |
| P1-3 | **Reduced-motion/essential visitors get a blank hero** — `<video poster="/swans-poster.webp">` with no src; poster file absent from `frontend/public/` | `HeroSection.tsx:102`; Glob confirms no `swans-poster.webp` [VERIFIED] | Generate/commit poster + no-R2 graceful fallback |
| P1-4 | **One bad chart datum can blank the whole progress grid** — canonical + admin grids import Victory statically, zero SafeChart/error boundaries; `ClientProgressCharts` bare Suspense | `CanonicalProgressChartsGrid.primaryCards.tsx:8-16`, `AdminProgressChartsGrid.primaryCards.tsx:17`, `ClientProgressCharts.tsx:959-1128`; `SafeChart.tsx` exists, used only by `ClientAnalyticsPanel` [VERIFIED] | Wrap every card: SafeChart + lazy (house gotcha) — feeds the §6 ChartFrame primitive |
| P1-5 | **Trainer logger diverges from canonical** — trainers log via `EnhancedWorkoutLogger` while client+admin share `WorkoutLogger` (admin `/log-workout` is now a redirect — improved since recon) | `UniversalDashboardLayout.routes.tsx:154` vs `:184`/`:130` [VERIFIED] | Phase 3a convergence w/ parity checklist |
| P1-6 | **Logger data-loss + dead-scaffold gaps** — no autosave (`autoSaveInterval` defined `WorkoutLoggerTypes.ts:374`, referenced nowhere), PR stub永 empty (`useSessionStats.ts:47,82`), supersets display-only (`ExerciseCardComponent.tsx:76`), client voice logging gated off (`WorkoutLogger.tsx:1012-1018`) | [VERIFIED] | Phase 3c |
| P1-7 | **Coach Draft "never works" — root-caused (ranked)** | Receipt: UI `trainingWorkflowModes.ts:64` → `WorkoutCopilotPanel` → `POST /api/ai/workout-generation` (`aiRoutes.mjs:51-58`) → `aiWorkoutController.mjs:215` → `providerRouter.mjs:136` → 4 adapters, ALL env-key-gated | See §2. Fix = honesty UI + trap fix + **Sean: set AI provider key on Render** |

**Coach Draft ranked causes (§2 detail):** (1) **No provider key in prod → silent degrade to generic NASM templates with HTTP 200** — router marks adapters `not_configured` without recording errors (`providerRouter.mjs:163-167`), controller returns degraded 200 (`aiWorkoutController.mjs:770-772`), UI shows canned templates ("high AI demand" message). No AI key documented in `render.yaml`/`.env.example`; local `.env` has only `GEMINI_API_KEY` (presence-checked, count=1). (2) **Two-click consent-override trap:** first Generate for a non-consented client returns `MISSING_OVERRIDE_REASON`, which the hook swallows and resets to idle — the button visibly does nothing (`useCopilotSingleWorkoutActions.ts:91-100`). (3) Invalid key → 502. (4) Kill-switch flag. (5) Trainer-assignment 403. When a provider DOES run, the pipeline already assembles rich real data: 90-day session+log history, measurements, pain entries, 30-day macros, waiver history, movement analyses, equipment (`aiWorkoutController.mjs:455-636`) — Sean's "real data" requirement is already engineered; it's the provider layer that's dead.

### P2 — post-launch (or pull forward per charter phases)
| ID | Item | Evidence |
|---|---|---|
| P2-1 | Wearable last-mile: typed client `wearableDataService.ts` imported by zero components; backend mounted (`routes.mjs:368`) | Phase 7 |
| P2-2 | Nutrition: dead camera scanner twin (`FoodTracker/BarcodeScanner.tsx` 540L) vs the NOW-WIRED `/food-scanner` page (CHANGED since recon: mounted + reachable via `NutritionWorkspace.tsx:114`); hydration still localStorage despite `/api/hydration` mounted (`routes.mjs:641`); `NutritionPlanning.tsx` 899L dead | Phase 5 |
| P2-3 | PR celebration: SaveSuccessPanel now exists (streak/XP/share) but milestones are count/streak/duration only (`awardWorkoutXPSupport.mjs:171-207`) — **lift-PR detection still absent end-to-end** | Phase 4a |
| P2-4 | Planner fleet: 5 mounted builders confirmed; `Admin/WorkoutPlanBuilder.tsx` 628L orphaned | Phase 3b |
| P2-5 | `Lacrosse Ball` referenced by exercises but absent from `EquipmentItem` category enum → equipment filtering can never match those SMR drills | Phase 4B |

### P3 — polish/debt
Orphaned 50-chart `DEMO_DATA` gallery (archive); dead profile charts (heatmap/bullet render blank in prod); off-palette hex on About stats; two admin nutrition destinations; "Coming soon" copy in CommunityTab; `useWorkoutMcp.ts:91` hardcodes `trainerId:'current-trainer'`.

---

## 2. Receipts — Coach Draft / Plan Library / Build Plan (Sean asks #15-17)

- **Coach Draft** = the Copilot flow in Client Hub Training tab ("Plan" mode). Full hop-by-hop receipt + failure ranking captured above. A second surface ("Swan Coach proposals", `/api/coach/proposals`) is deterministic-approval, no LLM — different failure class if Sean means that one.
- **Plan Library** = TWO sibling surfaces over the same `WorkoutPlan` store: planner "Saved Plans" (`WorkoutPlannerSavedPlansSection.tsx:94-165` — cards w/ load/activate/primary/rename/duplicate/archive/PDF) and Client Hub "Plan Library" (`ClientWorkoutPlansPanel.tsx:294` — reads a different endpoint, only activate/primary/PDF/log-today, swallows 404s). **No search, no filters, no pagination anywhere.** Unsurfaced model fields = the upgrade inventory: description, nasmPhase, start/end dates, durationWeeks, currentWeek/Day progress cursor, progressNotes, createdBy provenance (AI vs trainer), day-count/duration summaries (`WorkoutPlan.mjs:59-145`, `WorkoutPlanDay.mjs:42-63`). Phase 3e consolidates both into ONE feature-rich library.
- **Build Plan** (`WorkoutManagement/WorkoutPlanBuilder`, 4-step stepper) verdict: **MERGE** — writes to the same `/api/workout-plans` store, duplicates authoring the planner owns, lacks its management actions; unique bits worth keeping = stepper UX + `/api/workout-builder/plan` generator (which is a thinner AI path w/ a hardcoded trainer id — fold into canonical, then retire per Rule 34).

## 3. Mobility Board feasibility (Sean ask #13) — GOOD NEWS

The syndrome→exercise engine **already exists and is live-wired**: OHSA wizard → `movementAnalysisController.mjs:65` → `ohsaCompensationAggregator.mjs` → `MovementProfile.commonCompensations` → `correctiveExerciseService.getCorrectiveExercisesForCompensations` (`:175`, returns inhibit/lengthen/activate/integrate groups) → rendered today by `CorrectiveRecommendationsPanel.tsx`. Exercise model has the CES fields (`nasmCorrectiveCategory`, `cesProtocolStep` — `Exercise.mjs:252-267`).
**The gap is content + a view, not architecture:** only **32 of ~150** recovery/mobility rows carry syndrome tags (starter seeder `20260504-seed-nasm-corrective-starter.mjs` is the sole tagged source; targets were ~120-155 per `NASM-CES-TAXONOMY.md` §4.1). Untagged-but-existing: ~36 SMR/foam-roll entries, ~50-70 static stretches, ~30-40 mobility drills (`20260309000001-seed-nasm-stretches.cjs` etc.). Specific holes: piriformis work exists untagged; `knees_bow` maps to zero exercises; no "tight lower back" grouping; muscle-name vocabulary inconsistent (Lats vs Latissimus Dorsi…); lacrosse ball missing from equipment enum; and `MovementAnalysis.generateCorrectiveStrategy` (`:241-308`) is a parallel hardcoded mapping to reconcile onto the registry path. **Phase 4B = tagging backfill + canonical-path consolidation + the Board view + rest-day trigger.**

## 4. Verified-good (no action)

Zero mock data on prod chart surfaces; Recharts fully purged; payments production-complete (Stripe v2 + webhook + ACH + offline, server-side price recalc, idempotency); cart `/api/cart/add` path matches and is contract-locked (prod 404 not reproducible — closed pending one authed probe); `/food-scanner` now mounted + reachable (improved since recon); admin `/log-workout` now redirects to canonical (improved); backend healthy on `6e730975d`.

## 5. Deferred probes (need auth/browser or Sean)

Rule-55 items not yet run: authed browser E2E of money paths (checkout test-mode, booking), mobile viewport browser sweep (code-level checks done; device-level pending), a11y/contrast scan, Lighthouse perf, legal-pages inventory, Render env check for AI provider keys (**Sean or launcher**), authed Coach Draft live repro, testimonial consent confirmation (Sean). These run during/after Phase 1 as surfaces stabilize.

## 6. Phase 1 slice order (loop execution queue)

1. **1.1** Fake-vitals removal (P0-1, small) + **1.2** NASM-certified scrub (P0-2, small) — same batch.
2. **1.3** Price privacy build (P1-1, charter §5 — money-path-adjacent: failing-first tests, Codex REQ mandatory).
3. **1.4** Hero poster/fallback (P1-3, small).
4. **1.5** SafeChart wrap → birth of the `ChartFrame` primitive (P1-4).
5. **1.6** Coach Draft honesty: degraded-state truthful UI + override-trap fix + Sean env action (P1-7).
6. **1.7** Stats truth module scaffold w/ `[NEEDS-SEAN-NUMBER]` flags (P1-2).
Then Phase 2 blueprints per charter. Batch push happens only after the final all-phases hostile review per Sean's loop directive (Rule 70).
