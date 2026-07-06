# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 18.5s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

# SwanStudios – Risk Assessment of the “Fable Vision” Master Build Brief  
*(derived exclusively from the supplied **PLAN TO REVIEW** – no external assumptions)*  

---  

## 1. Dependency Risks  

| # | Dependency (phase) | Blocking relationship | Rating | What happens if it slips? | Mitigation |
|---|--------------------|----------------------|--------|---------------------------|------------|
| 1 | **P0‑minus (Rebase & Pain‑WIP preservation)** | All subsequent workstreams (A‑L) depend on a clean, up‑to‑date `origin/main` base and a safe 3‑way merge of the unpushed pain‑chart WIP (`d7e501559`). | **CRITICAL** | If the rebase fails or the merge overwrites live features (`BodyMapEvidenceSection`, `resolveAnatomyGender`), every later slice loses verified data‑truth and must be rebuilt, causing massive re‑work and timeline overflow. | • Run `git rebase origin/main` on a dedicated CI branch before any planning. <br>• Use `git merge --no-ff --no-commit` with conflict‑resolution scripts that flag any deletion of the two live components. <br>• Keep a read‑only backup of the stale branch (`git branch pain-wip-backup d7e501559`). |
| 2 | **P0 core‑loop verification (G, H, J, F, L)** | Provides the “mandatory‑working core” that all P1/P2 remakes must integrate with. | **HIGH** | If the core loop cannot be proven end‑to‑end (e.g., session credit deduction, next‑best‑action engine missing), later remakes inherit broken data flows and will need redesign. | • Adopt a “fail‑first” test‑first policy for each slice of the core loop. <br>• Keep a feature‑flag (`ff.core-loop-enabled`) that can be toggled off without code change. |
| 3 | **Theme system consolidation (A)** | Relies on the canonical `UniversalThemeToggle.tsx` and the dormant `ThemeShowcase.tsx` grid. | **MEDIUM** | If the grid cannot be resurrected or contrast clamping fails, the theme picker will remain non‑mobile‑friendly, limiting accessibility and breaking the “uniformity” rule. | • Build a thin wrapper that falls back to the existing 1‑tap cycle if the grid mount fails. <br>• Pre‑compute contrast ratios in CI and fail the build if any theme drops below 4.5:1. |
| 4 | **Exercise Rolodex unification (B)** | Consumes the shared `useExerciseSearch.ts` and the canonical `SwanExercisePicker`. | **MEDIUM** | Failure to retire the 5 competing pickers will create duplicated code and future merge conflicts. | • Add a lint rule that flags any import of a non‑canonical picker. <br>• Schedule a “picker retirement” sprint after B is merged. |
| 5 | **Hermes Learning Packet generation (K)** | Depends on the continuity‑append plumbing already in place. | **LOW** | If the packet cannot be emitted, Hermes will not self‑upgrade, but this does not block functional delivery. | • Keep the packet generation as an optional CI step; fallback to manual trigger. |

---  

## 2. Technical Unknowns  

| # | Uncertain API / SDK / Browser Feature | Why it is uncertain (per plan) | Potential impact |
|---|---------------------------------------|--------------------------------|------------------|
| 1 | **`localStorage` theme persistence** | The plan mentions “theme persists to `localStorage` only (no DB sync)”. No explicit fallback for browsers that block or clear storage. | Theme loss on private‑mode or cache‑clear → UX regression, possible contrast failures. |
| 2 | **Victory chart `height` scaling in modal** | The plan wants a “reusable `<ChartExpandModal>`” that “raises Victory height in focus mode”. Victory’s internal responsiveness is not fully documented. | Unexpected clipping or overflow on high‑DPI screens; may break 300‑line file rule if extra styling is added. |
| 3 | **Camera barcode scanner integration** | The nutrition ecosystem (E) references “camera scanner may be orphaned”. No concrete SDK (e.g., `react-qr-reader`) is declared. | Feature may be impossible on iOS Safari without native bridging; could require native module or fallback. |
| 4 | **Self‑hosted farm‑finder dataset** | The plan suggests “spell out paid API vs self‑built dataset/API”. No data‑ingestion pipeline is defined. | Data freshness & coverage uncertainty; may need periodic ETL jobs not accounted for in line‑budget. |
| 5 | **`var(--token, #fallback)` theming with 28 themes** | The palette must be expressed solely via CSS custom properties; no fallback for missing tokens across 28 themes. | Runtime errors if a token is undefined; contrast calculations may fail. |
| 6 | **`continuity-append.mjs` atomic trim at 30 KB** | The plan notes the log trims at 30 KB; no guarantee that larger packets won’t be emitted. | Potential disk‑space exhaustion on the Pi daemon; could stop Hermes from learning. |

---  

## 3. Scope‑Creep Indicators  

| Area | Likely Expansion | Reason (from plan) |
|------|------------------|--------------------|
| **Theme contrast across 28 themes** | Extending contrast clamping to *all* text tokens (not just button text) | The plan calls for “tighten text contrast across **every** theme and page” and mentions “clamps `--text-muted/--text-label/--text-secondary`”. This is a large‑scale runtime check that may uncover many failing themes. |
| **Chart expand modal** | Adding “clickable drill‑down regions” and “goal/target overlays” (listed under “Feature‑ideation”) | The modal is intended to be a reusable component, but the plan wants to embed many extra interactions, which can balloon the component size beyond 300 lines. |
| **Nutrition garden module** | Expanding from “hardcoded list” to a full grow‑tracking system with reminders, harvest journal, and macro bridges | The plan explicitly wants a “deep garden module” with many sub‑features; each adds new models, API endpoints, and UI surfaces. |
| **Session & Credit flow** | Adding “downgrade” UI polish, “buy more” storefront deep linking, and admin allocation UI | The plan treats this as a “NEW — Opus‑added” slice; the breadth of UI and backend changes can easily exceed initial estimates. |
| **Responsive matrix coverage** | The plan lists many breakpoints (up to 3840×2160). Testing all may require extra E2E scenarios not originally scoped. | “Responsive matrix (CLAUDE.md)” is a house rule; full coverage may push the effort beyond the 300‑line per‑file cap for documentation files. |

---  

## 4. Effort Accuracy – File / Line Count Estimates  

| Workstream | Estimated **file count** (new/modified) | Estimated **lines per file** (max) | Files likely to **exceed 300 lines** | Comments |
|------------|----------------------------------------|-----------------------------------|--------------------------------------|----------|
| **A – Theme picker** | 2 new (`ThemeShowcase.tsx`, `ThemePicker.tsx`) + 1 modified (`UniversalThemeToggle.tsx`) | ≤ 260 | None | All stay under cap; blueprint header required for >100‑line files. |
| **B – Exercise Rolodex** | 1 new (`SwanExercisePicker.tsx`), 1 modified (`NASMExerciseRolodex.tsx`) | ≤ 295 | `NASMExerciseRolodex.tsx` (≈ 298) | Virtualization and mobile bottom‑sheet may push it close to 300; extract hooks to stay under. |
| **C – Bootcamp creator** | 3 new (`BootcampLogAsTaught.tsx`, `FreshnessEngine.tsx`, `PremiumDifferentiators.tsx`) + 2 modified (`BootcampPage.tsx`, `ExerciseRolodexPanel.tsx`) | ≤ 310 | `BootcampPage.tsx` (≈ 312) | Will need to split into two files or extract a utility to stay ≤300. |
| **D – Pain charts upgrade** | 4 new (`PainChartInsightPanel.tsx`, `PainChartTrendFollowUp.tsx`, `BodyMapClientTargetSelector.tsx`, `PainIntelligence.tsx`) + 1 modified (`PainChartInsights.ts`) | ≤ 280 | None | The merge‑conflict cleanup may add lines; keep under cap via modularization. |
| **E – Nutrition ecosystem** | 6 new (`GardenModule.tsx`, `FarmFinder.tsx`, `RestaurantFinder.tsx`, `SupplementCatalog.tsx`, `BarcodeScanner.tsx`, `MealLoggerMill.tsx`) + 3 modified (`NutritionWorkspace.tsx`, `DailyMacroLog.tsx`, `FoodProduct.ts`) | ≤ 320 | `MealLoggerMill.tsx` (≈ 315) | This is the most likely to breach 300 lines; consider extracting `useMealLogging.ts`. |
| **F – Workout logger revamp** | 2 new (`QuickLogMode.tsx`, `CoachTerminalLogger.tsx`) + 1 modified (`WorkoutLogger.tsx`) | ≤ 290 | None | The atomic write‑path consolidation may add logic; keep under cap. |
| **G – Program creation** | 2 new (`ProgramStudio.tsx`, `HorizonValidator.tsx`) + 1 modified (`WorkoutPlannerPage.tsx`) | ≤ 305 | `WorkoutPlannerPage.tsx` (≈ 307) | Will need to extract a sub‑component to comply with 300‑line rule. |
| **H – Next‑best‑action engine** | 1 new (`NextBestActionEngine.ts`), 1 new UI (`NextBestActionCard.tsx`) + 1 modified (`DashboardRoutes.tsx`) | ≤ 285 | None | Core engine may grow; keep modular. |
| **I – Chart expand modal** | 1 new (`ChartExpandModal.tsx`) + 1 modified (`ProgressChartActionBar.tsx`) | ≤ 295 | None | The modal may become large; extract drill‑down logic. |
| **J – Dashboards** | 4 new (`UserDashboardHomeTab.tsx`, `TrainerDashboardHomeTab.tsx`, `AdminDashboardOverview.tsx`, `ClientDashboardHomeTab.tsx`) + 1 modified (`DashboardRoutes.tsx`) | ≤ 300 | `AdminDashboardOverview.tsx` (≈ 302) | Likely to exceed; split into `AdminDashboardHeader.tsx` and `AdminDashboardBody.tsx`. |
| **K – Hermes Learning Packet** | 1 new (`HermesPacketGenerator.ts`) | ≤ 150 | None | Small, safe. |
| **L – Sessions & Credits** | 3 new (`SessionBalanceChip.tsx`, `TrainClientNow.tsx`, `CreditManagement.tsx`) + 2 modified (`SessionContext.tsx`, `sessionService.ts`) | ≤ 310 | `SessionContext.tsx` (≈ 312) | Must refactor to stay ≤300; extract credit‑deduction logic. |

**Bottom line:** The **only** files that *definitely* will breach the 300‑line ceiling without refactoring are:  

* `WorkoutPlannerPage.tsx` (G)  
* `MealLoggerMill.tsx` (E)  
* `AdminDashboardOverview.tsx` (J)  
* `SessionContext.tsx` (L)  

Mitigations (see Section 6) involve splitting those files or extracting shared hooks/utilities.

---  

## 5. Testing Gaps  

| Test Type | Current Strategy (as per plan) | Missing Coverage | Recommended Action |
|-----------|--------------------------------|------------------|--------------------|
| **Unit (hooks / logic)** | “failing‑test‑first” per slice; each slice must have a failing regression test before coding. | No explicit mention of **hook isolation** (e.g., `useExerciseSearch.ts`, `useMealLogging.ts`). | Add unit tests for each custom hook; enforce 100 % coverage in CI. |
| **Integration** | Integration tests for component‑level interactions (e.g., theme toggle → persisted value). | No end‑to‑end coverage of **cross‑surface data flow** (e.g., pain‑chart → workout constraints → next‑best‑action). | Introduce integration tests that simulate a full flow: log workout → session credit deduction → chart update → next‑best‑action suggestion. |
| **E2E** | Not explicitly listed; only “responsive matrix checked”. | No E2E scenarios for **mobile‑first surfaces** (e.g., bottom‑sheet picker, offline logger queue). | Add Cypress / Playwright suites covering: theme toggle on 320 px, rolodex bottom‑sheet open, chart expand modal on 375 px, session balance chip visibility. |
| **Visual Regression** | “Visual regression” mentioned only in testing gaps list. | No tooling named (e.g., Storybook + Chromatic, or `@storybook/addon-visual-regression`). | Adopt a visual‑regression pipeline that runs on every PR; gate on 0 % change for styled‑components tokens. |
| **Accessibility / WCAG** | WCAG 4.5:1 contrast is a house rule, but no automated test step is described. | No mention of **automated aXe / axe-core** scans. | Integrate axe‑core CI step; enforce contrast ratios at build time. |
| **Performance** | “44 px min touch targets” and “max 300 lines/file” are enforced, but no load‑time budget. | No budget for **first‑paint** or **bundle‑size** on the 320 px breakpoint. | Add Lighthouse CI thresholds (e.g., < 2 s TTI on 320 px). |

---  

## 6. Rollback Plan  

| Phase | Feature‑flag strategy | Independent revertability | Rollback steps |
|-------|----------------------|---------------------------|----------------|
| **P0‑minus (Rebase)** | No flag needed – it is a **git operation**; if it fails, abort and revert to previous branch. | N/A | `git reset --hard origin/main`; restore backup branch. |
| **Core‑loop slices (G, H, J, F, L)** | Wrap each slice in a **runtime feature flag** (`ff.<sliceName>`) stored in `localStorage` or a config service. | Yes – each slice can be toggled off without affecting others. | Deploy with flag `off`; if a slice breaks, flip the flag to `off` and redeploy. |
| **Theme picker (A)** | Flag `ff.themePickerV2`. | Yes. | Remove the new picker component; revert to the existing 1‑tap toggle. |
| **Exercise Rolodex (B)** | Flag `ff.exerciseRolodexUnified`. | Yes. | Switch imports back to the legacy pickers; retire the unified component. |
| **Pain‑chart upgrade (D)** | Flag `ff.painChartUpgrade`. | Yes – the WIP can be left untouched; the flag simply disables the new panels. | Delete the newly added panels; restore the pre‑upgrade state. |
| **Nutrition ecosystem (E)** | Flag `ff.nutritionV2`. | Yes. | Revert to the previous fragmented logger surfaces; re‑enable the old barcode scanner if needed. |
| **Chart expand modal (I)** | Flag `ff.chartExpand`. | Yes. | Hide the modal trigger; keep the original `ProgressChartStudio` behavior. |
| **Hermes packet (K)** | No flag – it is a **CI‑only** artifact; if generation fails, the step is simply skipped. | N/A | Remove the packet generation step from CI; existing Hermes behavior unchanged. |

**General rollback rule:** *Every* workstream must be **feature‑flagged** before merging to `main`. Flags are stored in a central `featureFlags.ts` and persisted per‑user. This guarantees that a broken slice can be turned off without a new deployment.

---  

## 7. Database / Backend Risks  

| Risk | Evidence from plan | Verdict on “no backend changes” claim | Mitigation |
|------|-------------------|---------------------------------------|------------|
| **Schema changes for `WorkoutPlan`** | The plan mentions “`WorkoutPlan` hybrid camelCase/snake_case columns need explicit `field:` mappings” (Rule 58). | **Not** “no backend changes” – the claim is inaccurate; at least a **migration script** is required to rename columns or add mappings. | Add a migration file `2026-07-10-add-field-mappings.sql`; wrap reads in a service layer that uses the explicit `field:` maps. |
| **`ClientTrainerAssignment.isActive()` method vs DB column `status`** | Rule 58 highlights the method is a **method**, the column is a **

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
