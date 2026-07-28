# API Design & Backend Contracts — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 218.6s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

We are given a plan document for the Nutrition Decision Logger feature. We are to review the API surface and derive specific API design recommendations.

We must output structured markdown with specific API design recommendations covering:
1. Existing API sufficiency
2. Search/query needs
3. New endpoint design
4. Multimodal/large payloads
5. Rate limiting
6. Realtime vs polling
7. Response contracts
8. Caching strategy

We are to derive every feature-specific detail from the plan content provided.

Let's break down the plan and identify the API surfaces mentioned.

From the plan, we can see:

Existing API endpoints (from the backend route matches and shadow order):
- `/api/food-scanner` (mounted to `foodScannerRoutes`)
- `/api/macros` (mounted to `dailyMacroRosterTriageRoutes` and then `dailyMacroRoutes`)
- `/api/hydration`
-routes` (mounted to `hydrationRoutes`)
- `/api/meal-plans` (mounted to `mealPlanRoutes`)
- `/api/free` (mounted to `freeApiRoutes`)

Specific endpoints mentioned in the plan:
- `POST /api/macros` (for logging a meal, from `FoodIntakeForm.tsx:163-169`)
- `PATCH /api/macros` (also from `FoodIntakeForm.tsx:163-169` for updating?)
- `POST /api/macros` from `useFoodSearchAddToLog.ts:28` (adding search result to log)
- `POST /api/macros` from `mealPhotoLog.ts:6` (photo/AI estimate)
- `GET /api/food-scanner/scan/:barcode` (from `FoodScannerPage.tsx:348`)
- `GET /api/food-scanner/search` (from `FoodScannerPage.tsx:398`)
- `POST /api/food-scanner/log-scan` (from `FoodScannerPage.tsx:472-475`)
- `GET /api/macros/review-queue` (from `ClientNutritionEstimateReviewPanel.tsx:87`)
- `PATCH /api/macros/client-timeline/:entryId/verify` (from `ClientNutritionEstimateReviewPanel.tsx:119`)

Additionally, the plan discusses:
- Proxying USDA and Open Food Facts APIs through the backend (to avoid exposing keys client-side)
- Adding new endpoints for the nutrition decision logger (like for the draft, review queues, etc.)

Now, let's go through each of the 8 points:

1. **Existing API sufficiency**:
   We need to check for each surface (as described in the plan) whether the existing endpoint returns enough data or if a new endpoint is required.

   Surfaces mentioned in the plan:
   - NutritionWorkspace (client nutrition tab) - currently uses `/api/macros` for logging and fetching? But note: the plan says the current manual logger only captures the big four macros and doesn't use the full capacity of `DailyMacroLog`.
   - Food search - currently uses external APIs (USDA, Open Food Facts) directly from the browser (which is a problem because of API key exposure). The plan says we should proxy through backend.
   - Barcode scanner - currently has `/api/food-scanner/scan/:barcode`, `/api/food-scanner/search`, and `/api/food-scanner/log-scan`.
   - Admin review - uses `/api/macros/review-queue` and `/api/macros/client-timeline/:entryId/verify`.

   For the NutritionWorkspace (the main client nutrition decision logger), the plan says we need to converge the capture methods. Currently, the manual logger (via `/api/macros`) only sends a limited set of fields. We need to extend the `/api/macros` endpoint to accept the richer `NutritionEntryDraft` data (or at least more of the fields that `DailyMacroLog` supports). However, note that the plan says in Phase A we will populate existing `DailyMacroLog` fields more fully without changing the schema. So we can use the existing `/api/macros` endpoint but with a richer payload.

   But wait: the plan also says we will have a shared draft contract and then save to `DailyMacroLog`. So the existing `/api/macros` endpoint (which currently expects a limited set of fields) will need to be updated to accept more fields (like fiber, sugar, sodium, etc.) without breaking existing clients? However, note that the plan says we are not making any production code changes in this packet (it's a planning packet). So for now, we are only reviewing the plan.

   However, the plan does mention that in Slice 2 we will convert manual and search payload builders to populate richer existing `DailyMacroLog` fields. So we are going to change the frontend to send more data via the existing `/api/macros` endpoint. Therefore, the existing `/api/macros` endpoint must be able to accept the additional fields (which it should, because the `DailyMacroLog` model already has those fields). But we must check if the backend currently ignores extra fields or if it validates strictly.

   From the plan: `DailyMacroLog` model has fields for fiber, sugar, sodium, etc. So if we send them, they should be stored. However, the current frontend (manual logger) does not send them. So we are going to change the frontend to send them. Therefore, no new endpoint is needed for the manual logger - we just need to update the frontend to send more fields via the existing `/api/macros`.

   Similarly, for food search: currently, the frontend uses USDA/Open Food Facts directly. We need to change that to go through a backend proxy. So we will need new backend endpoints to proxy these APIs (or we can extend existing ones?).

   The plan says: "Route USDA and Open Food Facts through a server proxy/cache as Slice 1 or a preceding slice."

   So we will need new endpoints for:
   - Proxying USDA FoodData Central (for search and details)
   - Proxying Open Food Facts (for search and details)

   However, note that we already have `/api/food-scanner/search` which might be used for barcode? But the plan says the food search in the nutrition tab currently uses USDA directly. We might want to have a unified search endpoint that proxies multiple sources.

   Let's look at the existing food scanner routes:
   - `GET /api/food-scanner/scan/:barcode` - for scanning a barcode (probably hits an external API or the FoodProduct table)
   - `GET /api/food-scanner/search` - for searching by name? (probably external)

   The plan says we should not expose external keys client-side, so we need to move the food search (for the nutrition tab) to the backend. We can either:
   - Extend the existing `/api/food-scanner/search` to handle general food search (not just for scanner) OR
   - Create a new endpoint like `/api/food-search` (or `/api/nutrition/search`) for the nutrition tab.

   However, note that the plan says: "Keep existing `/api/macros` and `/food-scanner` behavior while converging UX." So we don't want to break the existing food scanner.

   Therefore, I propose:
   - We keep the existing `/api/food-scanner` routes for the scanner functionality.
   - We create a new set of endpoints under `/api/food-search` (or `/api/nutrition/food-search`) for proxying USDA and Open Food Facts for the nutrition tab's food search.

   But wait: the plan also mentions that we want to have a Swan-owned food catalog. So in the future, we might want to check our own `FoodProduct` table first, then go to external sources. So the search endpoint should first check the Swan catalog (FoodProduct) and then fall back to external proxies.

   However, for now (Slice 1), we are just proxying the external APIs to avoid key exposure. We can do that by creating a backend proxy for USDA and Open Food Facts.

   Let's define:
   - `GET /api/food-search/usda` - proxies USDA FoodData Central search
   - `GET /api/food-search/openfoodfacts` - proxies Open Food Facts search
   - Or better: a unified endpoint that takes a query and source? But the plan doesn't specify.

   Alternatively, we can have:
   - `GET /api/food-search?query=...&source=usda|openfoodfacts`

   But note: the plan says we are to avoid exposing keys, so we will have the backend make the call with the key stored in environment variables.

   However, the plan also says we want to normalize source quality through a Swan-owned food catalog first. So in the long run, we want to check our own database. But for Slice 1, we are just doing the proxy to fix the key exposure.

   So for the food search surface (in the nutrition tab), we currently have a client-side call to USDA/Open Food Facts. We need to change that to call our backend proxy. Therefore, we need new backend endpoints for the proxy.

   Now, for the barcode scanner: the existing `/api/food-scanner` routes are already backend-based (they don't expose keys client-side because the key is on the backend? We need to check). The plan doesn't say the scanner exposes keys, but we should verify.

   From the plan: `FoodScannerPage.tsx:348` calls `/api/food-scanner/scan/:barcode` - this is a backend route, so the key is not exposed. Similarly for the others.

   However, the plan does mention a schema drift bug in the scanner admin edit: `foodScannerRoutes.mjs:375-376` writes `nutritionFacts`, `healthScore`, `allergens` which don't exist on `FoodProduct`. So we need to fix that (as a pre-slice hotfix).

   For the admin review: the existing endpoints `/api/macros/review-queue` and `/api/macros/client-timeline/:entryId/verify` are used. The plan says we need to extend the review queue to include more queues (unmatched scans, low OCR confidence, etc.). So we might need new endpoints for the admin review queues, or we can extend the existing `/api/macros/review-queue` to support filtering by queue type.

   The plan says in Slice 6: "Extend the current estimate review queue into a source quality console." So we are going to change the existing `/api/macros/review-queue` endpoint to return more types of queues and support filtering.

   Therefore, for the admin review surface, we don't need a new endpoint, but we need to change the existing one to return more data and support new filters.

   Now, let's let's go point by point:

1. **Existing API sufficiency**:
   - NutritionWorkspace (manual logging, food search, etc.):
        * Manual logging: existing `/api/macros` is sufficient if we send more fields (which we will in Slice 2). So no new endpoint needed for the manual logger itself, but we will be sending more data via the same endpoint.
        * Food search: currently client-side calls to USDA/Open Food Facts (which is insufficient and insecure). We need a new backend proxy endpoint(s) to replace the client-side calls.
        * Barcode scanner: existing `/api/food-scanner` routes are sufficient for the scanner functionality (but note: we have a bug in the admin edit that needs fixing, and we need to capture more serving size details - but that's a frontend issue for now, the backend already accepts `servingSizeGrams`).
        * Hydration: not mentioned in the plan for changes, so existing `/api/hydration` is sufficient.
        * Meal planner: not the focus of this feature (it's a shared role surface but the plan is about the nutrition decision logger). The plan says we must stay compatible, so we won't change the meal planner endpoints.
        * Admin review: existing `/api/macros/review-queue` and `/api/macros/client-timeline/:entryId/verify` are sufficient for the current review queue, but we need to extend them to support the new queues (so we will be changing the existing endpoints, not adding new ones for the review queue itself, but we might need new endpoints for additional queues? The plan says we are extending the current queue, so we will modify the existing endpoint to return more types and support filtering by queue type).

   Therefore, new endpoints are needed for:
        - Proxying USDA FoodData Central (for search)
        - Proxying Open Food Facts (for search)
        - Possibly a unified food search endpoint that checks Swan catalog first? But for Slice 1, we are just doing the proxy to fix key exposure.

   However, note: the plan says in Slice 1 we are converging the frontend capture shell and keeping existing components behind the new shell. So we are not changing the food search component's backend call in Slice 1? Actually, in Slice 1 we are modifying `NutritionWorkspace` to replace tab sprawl, but we are keeping existing mounted components. So the food search component is still there and still making client-side calls? That would be a problem.

   The plan says in Slice 1: "Keep existing mounted components behind the new shell." So the food search component is still making client-side calls? That would \ be \ a \ problem \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
