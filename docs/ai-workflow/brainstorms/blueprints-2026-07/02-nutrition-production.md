# Blueprint 02 — Nutrition to Production (Phase 5)

**Status:** blueprint / executable. Charter Phase 5, D-D default locked (wire-what's-built + polish; supplements/garden deferred).
**Evidence base:** dedicated read-only recon on `claude/launch-charter-20260706` (all file:line verified 2026-07-07).
**Executable-spec contract (§10):** an AI who never saw this conversation can build from this doc alone.

---

## 1. Corrections to the Phase-0 audit (Rule 52 — evidence beats memory)

Two of the charter's 5a/5b premises are STALE; the blueprint re-scopes accordingly:

1. **Hydration is NOT localStorage-only.** `useHydration.ts:81-107` calls `GET/PUT /api/hydration` for authed users; localStorage (`ss-hydration-<date>` keys) is only the unauth/failure fallback. The "localStorage for MVP" notes at `NutritionHydrationTab.tsx:12` and `DailyHydration.mjs:10` are outdated comments. → 5b re-scopes from "kill the localStorage fork" to "wire the orphaned weekly endpoint + delete stale comments."
2. **The live `/food-scanner` page already HAS a camera scanner.** `FoodScanner/BarcodeScanner.tsx` (203L, mounted via `FoodScannerPage.tsx:7`) uses `useBarcodeCamera` (native `BarcodeDetector` + ZXing fallback, `:74-82`) plus manual UPC entry (`:171-197`). The dead 540L `FoodTracker/BarcodeScanner.tsx` twin has ZERO unique live value except an env-gated `IngredientSafetyPanel` (itself orphaned). → 5a re-scopes from "wire the orphaned camera scanner" to "reachability polish + retire the dead twin chain."

## 2. Current-state inventory (parity baseline — nothing here may regress)

- **Hub:** `NutritionWorkspace` (259L) mounted `/meal-planner` for admin/trainer/client (`UniversalDashboardLayout.routes.tsx:139/:162/:188`) + embedded in user dashboard tabs (`UserDashboardTabsV3.tsx:44,218`). 13 tabs (`NutritionWorkspace.tabs.tsx:39-56`): today, log, voice*, search, restaurant, hydration, macros, meal-plan*, intelligence*, learn, garden/farms/supplements (* = tier-gated via `CrystallineLockOverlay`, `NutritionWorkspace.tsx:210-249`; gate = `isPro||isElite||isTrial`, `:71-72`).
- **Scanner page:** `/food-scanner` PUBLIC route (`main-routes.tsx:536-542`, no ProtectedRoute), reached from workspace via `window.location.href='/food-scanner'` (`NutritionWorkspace.tsx:113-115`). Camera + manual entry + text search + history + favorite + add-to-diary (`FoodScannerPage.tsx:321-459`).
- **Meal logging:** 8 surfaces all writing `POST /api/macros` (FoodIntakeForm, FoodSearchPanel, VoiceNutritionPanel, MealPlanTab, MealPhotoReview, NutritionReviewDrawer, NutritionTodayPanel quick-log + repeat-meal).
- **Targets:** `ClientNutritionPlan` via `GET /api/nutrition/:userId/current` (`clientNutritionRoutes.mjs:27`) — **the sole personalized-target source, never joined to logged macros anywhere.**
- **Trainer/admin oversight:** roster triage + review-queue + client timeline (`dailyMacroRosterTriageRoutes.mjs`) all live and consumed; admin `NutritionSummaryWidget` in ClientDetailsPanel.

## 3. The ONE real product gap: adherence (macros logged vs target)

No live chart compares logged macros to the client's plan targets. `NutritionGoalBullet.tsx:22-27` (the only logged-vs-target component) uses **hardcoded static references** (2200 cal/150g protein…) and is mounted only in the dead `ChartGallery`. The Macros tab shows composition (`MacroDonut`) — only hydration has a real target comparison (`NutritionWorkspace.macroCharts.tsx:23-56`).

**This is the Phase-5 headline build (5d′): the Adherence module.** It also feeds charter Phase 4g (nutrition-adherence chart card).

## 4. Slices (order = value; each slice independently shippable)

### 5.1 — Adherence engine + Macros-tab upgrade (M)
- NEW `useNutritionAdherence` hook: parallel-fetch `GET /api/nutrition/:userId/current` (targets) + `GET /api/macros/weekly` (logged) → per-day + 7-day adherence % per macro (calories/protein/carbs/fat + hydration via existing `useHydration`). Null-degrading: no plan → "no targets set" honest state with CTA (client: "ask your trainer"; trainer/admin: link to NutritionPlanBuilder).
- Macros tab: replace static-reference framing with real targets — target line on `MacroDonut` context, NEW `MacroAdherenceBars` (logged vs target per macro, Victory or CSS bars per house pattern), keep `NutritionBalanceRadar`.
- Rewire `NutritionGoalBullet` to real targets OR retire it with the gallery (Rule 34 — prefer retire; the new bars supersede it).
- **REUSABLE-CORE marking:** adherence math = pure function `computeMacroAdherence(targets, loggedDays)` in a zero-app-import util (portability doctrine §6).
- Data contract: no new endpoints — composes two existing GETs. (Optional later: server-side `/api/macros/adherence` if trainer roster needs it batch.)
- ⚠️ BUILD-TIME VERIFY: confirm `GET /api/nutrition/:userId/current` permits CLIENT SELF-ACCESS (recon confirmed the consumer + trainer/admin write gate, not the read gate). If it 403s for self, add the `assertAssignmentOrAdmin`-style self-allow before building the hook.

### 5.2 — Hydration finish (S)
- Wire `GET /api/hydration/weekly` (`hydrationRoutes.mjs:150`, currently ZERO consumers) into a 7-day hydration trend strip on the Hydration tab + adherence module input.
- Delete the stale "localStorage MVP" comments (`NutritionHydrationTab.tsx:12`, `DailyHydration.mjs:10`) — comment-only truth fix, zero behavior.

### 5.3 — Scanner reachability + truth (S)
- Workspace "scan" action: replace `window.location.href='/food-scanner'` full-page reload with SPA `navigate('/food-scanner')` (keeps auth context, faster).
- Fix the admin health widget LIE: `AdminClientManagementView.tsx:825` labels the Food Scanner API "decommissioned" while it is mounted + live (`core/routes.mjs:365-366`) — correct the status row.
- DECISION (default): `/food-scanner` stays public (acquisition funnel; scan history/log already auth-gated). Flag to Sean if he wants it authed.

### 5.4 — Admin destination consolidation (S)
The two admin destinations serve DIFFERENT jobs: `/nutrition/:clientId` = NutritionPlanBuilder (admin-only target authoring, `UniversalDashboardLayout.routes.tsx:106`) vs `/meal-planner` = the shared workspace (`:139`). Consolidation = navigation clarity, not deletion:
- Make NutritionPlanBuilder reachable IN CONTEXT: "Set targets" button on the workspace (trainer/admin only) + from Client Hub nutrition tab → `/nutrition/:clientId`.
- Keep ONE nav entry (the workspace); the builder becomes a context-reached editor, not a competing sidebar destination. Trainer role gap: builder route group is admin-only — extend to trainer with assignment check (matches `assertAssignmentOrAdmin` pattern in `dailyMacroRoutes.mjs:70-86`) OR keep admin-only (flag to Sean; default: extend to trainer — trainers own client nutrition per Core Loop).

### 5.5 — Dead-code retirement (S, Rule 34 — LAST, after 5.1-5.4 prove nothing references)
Grep-verified 0-importer candidates (~2,464L): `FoodTracker/BarcodeScanner.tsx` (540) → `IngredientSafetyPanel.tsx` (278) → `IngredientDetailModal.tsx` (441) chain; `NutritionPlanning/NutritionPlanning.tsx` (899, only string-ref = retirement contract test `mcp-retirement.contract.test.ts:82`); `FoodTracker/QuickAddFood.tsx` (306). Sean approval required before deletion; archive path per FILE-CLEANUP-PROTOCOL.
- Zero-consumer backend endpoints — classify: RETIRE `POST /analyze-ingredients`, `POST /ai-analyze`, `GET /ingredient/:id`, `GET /stats` (unless 5.3 wires them); KEEP admin CRUD `/admin/*` (dormant-by-design content-ops); `GET /hydration/weekly` gets wired by 5.2.

### 5.6 — Production polish pass (M)
States audit on every live tab (loading/empty/error per Definition of Done), mobile 320/375/414 one-thumb check, tier-gate verification (locked tabs render lock overlay not blank), Gentle Mode still hides macro charts incl. the NEW adherence bars (`nutritionGentleModePreference` respected), 44px targets, dark-first tokens.

## 5. Wireframe — Macros tab after 5.1 (mobile-first)

```
┌─ My Macros ────────────────────────────┐
│ [Today ▾]  ring: kcal logged/target    │  ← honest "No targets set → CTA" state
│ ▓▓▓▓▓▓░░ Protein 112/150g   75%        │
│ ▓▓▓▓▓▓▓░ Carbs   180/220g   82%        │  ← MacroAdherenceBars (44px rows)
│ ▓▓▓▓░░░░ Fat      45/80g    56%        │
│ ▓▓▓▓▓▓▓▓ Water     7/8 glasses         │  ← from useHydration (real target)
│ ── 7-day adherence strip (S M T W T F S)│  ← per-day % dots, tap → that day
│ [MacroDonut composition]  [Radar]      │  ← existing, kept
└────────────────────────────────────────┘
Trainer/admin viewing a client: same module + "Set targets →" (NutritionPlanBuilder)
```

## 6. Acceptance criteria

- [ ] Client with a nutrition plan sees real logged-vs-target adherence (per-macro + 7-day) on the Macros tab; client without a plan sees the honest no-targets state with role-correct CTA.
- [ ] Hydration weekly trend renders from `/api/hydration/weekly` (endpoint gains its first consumer).
- [ ] Workspace→scanner is SPA navigation; admin health widget no longer claims the API is decommissioned.
- [ ] Exactly one nav destination for nutrition per role; target authoring reachable in ≤2 taps from the workspace (trainer/admin).
- [ ] Dead chain removed (post-approval): repo loses ~2,464L; `mcp-retirement.contract.test.ts` updated; no import breaks (`tsc` 0, build OK).
- [ ] Gentle Mode hides all macro-number surfaces including new ones; tier gates verified; mobile matrix pass.
- [ ] No regression on the 8 existing logging surfaces (each still writes `POST /api/macros` successfully — smoke per surface).

## 7. Effort + sequencing

5.1 M (the build) → 5.2 S → 5.3 S → 5.4 S (needs a Sean default-confirm on trainer access) → 5.6 M polish → 5.5 S retire (LAST, Sean-gated). Total ≈ 2 focused sessions. No migrations. No new endpoints (5.1 composes existing).
