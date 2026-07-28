# Architecture Planning Debate (Phase 2B) — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 129.6s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

CONSENSUS REACHED

Merged Findings (all points agreed upon):

1. **Live Silent Data Loss in Scanner Admin Edit**  
   - **Files**: `backend/core/foodScannerRoutes.mjs:375-376`, `backend/models/FoodProduct.mjs:50/55`  
   - **Fix**:  
     ```typescript
     // foodScannerRoutes.mjs
     await product.update({
       nutritionalInfo: nutritionFacts,   // Maps to FoodProduct.mjs:50
       overallRating: healthScore,        // Maps to FoodProduct.mjs:55
     });
     // Explicitly reject allergens until Phase B schema exists
     if (allergens !== undefined) {
       return res.status(400).json({ error: 'allergens field not yet supported' });
     }
     ```
   - **Test**: Write regression test verifying `nutritionalInfo` column updates (not silent drop).

2. **Client-Side API Key Exposure**  
   - **Files**: `frontend/src/components/FoodTracker/FoodSearchPanel.logic.ts:55`, `:148`  
   - **Fix**: Create backend proxy before Slice 1:  
     - New file: `backend/routes/nutritionProxyRoutes.mjs`  
     - Endpoints: `GET /api/nutrition/search`, `GET /api/nutrition/detail/:sourceSystem/:id`  
     - Proxy reads `USDA_API_KEY` from env, caches responses, never exposes key.  
   - **Frontend change**:  
     ```typescript
     // After proxy exists
     const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}&source=usda`);
     ```

3. **`NutritionEntryDraft` Nutrient Fields Type Safety**  
   - **Fix**: Replace `Record<string, number | null>` with structured `NutrientPanel`:  
     ```typescript
     // types/nutrition.ts
     interface NutrientPanel {
       calories:       number | null;
       protein:        number | null;
       carbs:          number | null;
       fat:            number | null;
       fiber:          number | null;
       sugar:          number | null;
       sodium:         number | null;
       addedSugar:     number | null;
       saturatedFat:   number | null;
       transFat:       number | null;
       cholesterol:    number | null;
       extra:          Record<string, number>; // For source-specific nutrients
     }
     interface NutritionEntryDraft {
       nutrientsReported:   NutrientPanel;
       nutrientsCalculated: NutrientPanel;
       // ... other fields unchanged ...
     }
     ```

4. **Target User Identity for Trainer/Admin Logging**  
   - **Fix**: Add `targetUserId` with validation (Option B for v1):  
     ```typescript
     // NutritionEntryDraft
     targetUserId: number | null; // null = self-log; non-null = trainer logging for client
     ```
     ```typescript
     // Backend validation in foodScannerRoutes.mjs
     if (targetUserId !== null) {
       // Verify req.user has trainer/admin role
       // Verify active relationship with targetUserId
       // Audit log: actor = req.user.id, action = 'trainer_logged_for_client'
       // Save DailyMacroLog with userId = targetUserId
     }
     ```

5. **`NutritionWorkspace.tsx` File Budget Violation**  
   - **Fix**: Decompose into:  
     ```
     frontend/src/components/DashBoard/workspaces/
       NutritionWorkspace.tsx          // <100 lines (orchestrator)
       nutrition/
         NutritionTodayRibbon.tsx
         NutritionCaptureRail.tsx
         NutritionDraftPanel.tsx
         NutritionSourceTruthPanel.tsx
         NutritionDiaryTimeline.tsx
         capture/                      // All 9 capture cards

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
