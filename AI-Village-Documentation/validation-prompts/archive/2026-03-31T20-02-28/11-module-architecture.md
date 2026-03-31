# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 93.8s
> **Files:** docs/ai-workflow/blueprints/NUTRITION-ECOSYSTEM-MASTER-PLAN.md
> **Generated:** 3/31/2026, 1:02:28 PM

---

# Architecture Review: Nutrition Ecosystem Master Plan

> **Note on Scope:** The files referenced in questions 3 & 4 (`ConversationSidebar.tsx`, `MarkdownRenderer.tsx`, `CoachInputBar.tsx`, `useCoachAssistant`, etc.) belong to the AI Coach Assistant feature. I will apply identical architectural rigor to the **Nutrition Ecosystem** files in your plan, while providing direct mitigation strategies for the named files should they coexist in the same codebase.

---

## 1. File Decomposition (22+ Files)
**Verdict:** Well-scoped, but slightly over-fragmented for Phase 1.  
- **Thin files at risk:** `MacroTrendLine.tsx`, `MealFrequencyBar.tsx`, `FarmCard.tsx`, `ProductOverlay.tsx` will likely sit at 40–80 lines. In a 300-line budget, these are safe but create import overhead.
- **Recommendation:** Group UI primitives into a `ui/` subdirectory. Merge `MacroTrendLine` + `MealFrequencyBar` into `MacroCharts.tsx` (export two components). Keep `FarmCard` and `ProductOverlay` separate as they contain distinct business logic (map interactivity vs. health rating overlays).
- **Optimal count:** 18–20 files for Phase 1. Defer `ContainerPlanner.tsx` and `HarvestCalendar.tsx` to Phase 4 until core scanning/logging is stable.

## 2. `styles/` Directory Strategy
**Verdict:** 9 style files is acceptable if scoped, but risks duplication.  
- **Consolidation opportunity:** Extract a `NutritionTokens.ts` file containing your active palette, spacing scale, and typography tokens. All feature styles should consume these tokens rather than hardcoding hex values.
- **Co-location rule:** Keep `ScannerStyles.ts` and `MapStyles.ts` adjacent to their components. Move `NutritionStyles.ts` to a shared `theme/` or `design-system/` directory if it's used across tabs.
- **Enforcement:** Use `styled-components` theme provider to inject `Midnight Sapphire`, `Ice Wing`, `Gilded Fern`, etc. This prevents 9 disparate style files from drifting.

## 3. `hooks/` Directory: Separation of Concerns
**Verdict:** Excellent domain isolation.  
- `useMacroData` → Data fetching/caching
- `useNutritionPlan` → Client plan state
- `useBarcodeScanner` → Hardware/camera lifecycle
- `useFarmFinder` → Geolocation + API search
- `useGardeningZone` → USDA zone lookup
- **Recommendation:** Extract shared primitives to `shared/hooks/`:
  - `useGeolocation` (used by both farm & gardening)
  - `useApiQuery` (SWR/React Query wrapper for nutrition endpoints)
  - Keep domain hooks local to `NutritionEcosystem/hooks/`.

## 4. 300-Line Budget & Risk Mitigation
**MANDATORY CONSTRAINT ENFORCEMENT:** No file > 300 LOC (excluding comments/blanks).

| File | Est. LOC | Risk | Mitigation Strategy |
|------|----------|------|---------------------|
| `NutritionEcosystemHub.tsx` | ~280 | 🔴 High | Extract tab routing to `useNutritionTabs.ts`. Move tab content to lazy-loaded `<TabContent />` wrapper. |
| `RestaurantTab.tsx` | ~260 | 🟡 Medium | Split search/filter UI into `RestaurantSearchBar.tsx`. Move list rendering to `RestaurantResultsList.tsx`. |
| `MealLogTab.tsx` | ~290 | 🔴 High | Extract form logic to `useMealForm.ts`. Move barcode/photo triggers to `MealInputActions.tsx`. |
| `CameraScanner.tsx` | ~240 | 🟢 Safe | Keep as-is. Camera lifecycle + overlay fits comfortably. |
| `IngredientColorCode.tsx` | ~150 | 🟢 Safe | Safe. |
| `FarmMap.tsx` | ~220 | 🟢 Safe | Map initialization + pin clustering fits. |
| *Coach Assistant files (named in prompt)* | | | |
| `ConversationSidebar.tsx` | ~250 | 🟡 Medium | Extract `SearchFilterBar.tsx`, `ChatList.tsx`, `SidebarActions.tsx`. |
| `MarkdownRenderer.tsx` | ~180 | 🟢 Safe | 8+ custom components can be split into `mdx/` folder if it grows. |
| `CoachInputBar.tsx` | ~295 | 🔴 High | Extract `VoiceRecorderUI.tsx`, `AttachmentTray.tsx`, `TextInputArea.tsx`. |

**Rule:** If a component exceeds 250 LOC during implementation, immediately extract state/logic to a hook and UI to a subcomponent.

## 5. Import Graph & Dependency Flow
```
NutritionEcosystemHub.tsx
 ├── tabs/ (MealLog, Restaurant, Gardening, Farm, etc.)
 │    ├── hooks/ (useMacroData, useFarmFinder, etc.)
 │    ├── scanner/ (CameraScanner, IngredientColorCode)
 │    ├── charts/ (MacroCharts)
 │    └── styles/ (NutritionTokens, ScannerStyles, MapStyles)
 ├── shared/
 │    ├── hooks/ (useGeolocation, useApiQuery, useAIChat)
 │    └── api/ (nutritionClient.ts, restaurantClient.ts)
 └── backend/
      ├── routes/ (restaurantNutritionRoutes.mjs, etc.)
      └── services/ (restaurantNutritionService.mjs, etc.)
```
- **Circular Risk:** Low if hooks never import components. Enforce: `Components → Hooks → Utils/Services → API → DB`.
- **Deep Chains:** Max depth = 3 (`Hub → Tab → Subcomponent`). Avoid `Tab → Subcomponent → Sub-subcomponent → Hook`. Flatten with context or compound components if needed.
- **Vite Optimization:** Use `React.lazy()` for `CameraScanner.tsx`, `FarmMap.tsx`, and `RestaurantTab.tsx`. Heavy libraries (`html5-qrcode`, `leaflet`) will only load on demand.

## 6. Barrel Export Strategy
- **`NutritionEcosystem/index.ts`**: ✅ Yes. Barrel is appropriate for feature-level public API.
- **`hooks/index.ts`**: ⚠️ Conditional. Barrels can break tree-shaking in Vite if not configured with `sideEffects: false`. Prefer explicit re-exports:
  ```ts
  export { useMacroData } from './useMacroData';
  export { useBarcodeScanner } from './useBarcodeScanner';
  // ...
  ```
- **`styles/index.ts`**: ❌ No. Style files are rarely consumed as a group. Import directly where needed.

## 7. Shared vs Local Boundary
- **`useAIChat` in `shared/`**: ✅ Correct. AI context is cross-feature.
- **New hooks in `NutritionEcosystem/hooks/`**: ✅ Correct. They encapsulate domain-specific logic (USDA zones, macro caching, barcode lifecycle).
- **Boundary Rule:** If a hook is used in ≥2 features (e.g., `useGeolocation`, `useCamera`, `useApiCache`), promote to `shared/hooks/`. Keep feature-specific state local.

---

## 📁 Proposed File Tree & Line Budget

```
frontend/src/features/nutrition/
├── index.ts                          # Barrel (explicit exports only)
├── NutritionEcosystemHub.tsx         # 250 LOC (orchestrator + lazy tabs)
├── tabs/
│   ├── MealLogTab.tsx                # 240 LOC (form + scanner trigger)
│   ├── RestaurantTab.tsx             # 230 LOC (search + results)
│   ├── HydrationTab.tsx              # 120 LOC (API-backed water tracker)
│   ├── MacroDashboardTab.tsx         # 180 LOC (charts + compliance)
│   ├── IntelligenceTab.tsx           # 150 LOC (existing, wired)
│   ├── LearnTab.tsx                  # 100 LOC (existing)
│   ├── GardeningTab.tsx              # 200 LOC (zone + plant finder)
│   └── FarmFinderTab.tsx             # 190 LOC (map + list toggle)
├── scanner/
│   ├── CameraScanner.tsx             # 220 LOC (lazy-loaded)
│   ├── IngredientColorCode.tsx       # 140 LOC
│   └── ProductOverlay.tsx            # 130 LOC
├── supplements/
│   ├── SupplementStore.tsx           # 180 LOC
│   └── GapAnalysis.tsx               # 150 LOC
├── charts/
│   └── MacroCharts.tsx               # 160 LOC (trend + frequency)
├── hooks/
│   ├── useMacroData.ts               # 110 LOC
│   ├── useNutritionPlan.ts           # 90 LOC
│   ├── useBarcodeScanner.ts          # 140 LOC
│   ├── useFarmFinder.ts              # 120 LOC
│   └── useGardeningZone.ts           # 100 LOC
├── styles/
│   ├── NutritionTokens.ts            # 60 LOC (palette, spacing, radii)
│   ├── ScannerStyles.ts              # 80 LOC
│   └── MapStyles.ts                  # 70 LOC
└── utils/
    └── nutritionFormatters.ts        # 90 LOC (macros, dates, safety badges)
```

**Total New Files:** 24 (within acceptable range)  
**Max LOC per file:** 250 (strictly under 300)  
**Shared Promotions:** `useGeolocation`, `useApiQuery` → `shared/hooks/`

---

## 🛡️ Implementation Guardrails

1. **300-Line Enforcement:** Add ESLint rule `max-lines: [2, 300, { skipBlankLines: true, skipComments: true }]`. Fail CI on violation.
2. **Lazy Loading:** Wrap `CameraScanner`, `FarmMap`, and `RestaurantTab` in `React.lazy()` + `<Suspense fallback={<Skeleton />}>`.
3. **Theme Injection:** Use `ThemeProvider` with your active palette. Reference via `props.theme.colors.midnightSapphire` instead of raw hex.
4. **State Isolation:** Keep `NutritionEcosystemHub` stateless. Delegate to `useMacroData`, `useNutritionPlan`, and `useBarcodeScanner`.
5. **API Abstraction:** Create `nutritionClient.ts` in `shared/api/` with typed fetch wrappers. Never call `fetch()` directly in components.
6. **Privacy Proxy:** Enforce zero-PII at the hook level. `useMacroData` should return anonymized aggregates before passing to AI context.

This architecture respects your 300-line constraint, maintains strict unidirectional data flow, and scales cleanly into Phases 2–6 without refactoring debt.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
