# Architecture & Implementation Gap — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 46.7s
> **Files:** docs/ai-workflow/AI-HANDOFF/NUTRITION-DECISION-LOGGER-FABLE-READY-BRIEF-2026-07-09.md
> **Generated:** 7/8/2026, 8:17:40 PM

---

We are reviewing the document: "Nutrition Decision Logger Fable-Ready Brief - 2026-07-09.md"

We must check for:
1. Built vs visible: capabilities discussed as built but not surfaced vs not built at all.
2. False gaps: gaps claimed that actually exist.
3. Backend vs UI: for partial features, is the backend complete even where UI is missing (or vice versa)?
4. Real state: for each capability the document scores, what is the actual implementation state?
5. Data mismatches: for any data discrepancy the document flags, is it a real bug or an artifact?
6. Architecture soundness: are the document's architecture/implementation claims technically correct?

We are to provide severity and specific corrections for each finding.

We are to base our review on the document and the provided context (the SwanStudios platform).

Let's break down the document and cross-check with the provided context.

Note: The document states that it is a planning packet and no production code changes are in this packet. It also says that the audit had no direct repo access, so it separates repo-proven facts from external recommendations.

We are given the attachment caveat: the audit explicitly had no direct repo access. So we must rely on the document's own claims and the provided context (which includes some file paths and code snippets) to verify.

However, note that the document itself provides specific file paths and line numbers for evidence. We can use that to check the claims.

Let's go through the document section by section.

First, the document claims:

- The existing surface is real and valuable, but fragmented. `NutritionWorkspace` is the canonical client nutrition hub and already mounts Today, Log Meal, Voice, Food Search, Hydration, Macros, Meal Plan, Intelligence, and Learn.

We are given evidence for the mounting of `NutritionWorkspace` in the "Canonical Surface Receipt" section.

Now, let's check the claims in the "Primary Gaps" section.

Gap 1: Fragmented capture: Today, manual log, search, voice/photo, meal plan, intelligence, and barcode scanning are separate experiences.

We are told that the barcode scanner is a separate live route at `/food-scanner`, not part of the nutrition tab.

From the document's "Canonical Surface Receipt":
- `/food-scanner` is mounted at `main-routes.tsx:536/:539` and renders `FoodScannerPage`.

And the nutrition tab is at `main-routes.tsx:718/:722` rendering `UserDashboardV3` which then mounts `NutritionWorkspace`.

So the barcode scanner is indeed a separate route. However, note that the document says: "NutritionWorkspace only labels Food Search with a barcode icon." meaning that in the nutrition tab, there is a barcode icon in the Food Search panel that probably links to the scanner? But the scanner itself is not embedded.

We must check if the barcode icon in the Food Search panel actually exists and if it links to the scanner.

The document does not provide evidence for that, but we can assume from the context that it is a design choice.

However, the gap is about fragmentation: the user has to leave the nutrition tab to use the scanner. This is true because the scanner is at a different route.

But note: the document says in the "Canonical Surface Receipt" that the barcode scanner is a separate route. So this gap is real.

Gap 2: Manual logger under-captures data: `FoodIntakeForm.logic.ts:4-11` stores item name, quality, calories, protein, carbs, and fat only. It omits serving basis, grams, fiber, sugar, sodium, source, confidence, barcode/FDC/OFF IDs, and reconciliation status.

We are given a specific file: `frontend/src/components/FoodTracker/FoodIntakeForm.tsx` and lines 4-11.

We don't have the actual code, but the document claims that. We must take it as given for the purpose of this review (since we don't have the repo). However, note that the document says the audit had no direct repo access, so this is based on the attachment (which we don't have the content of, but the document quotes it).

But the document also says: "Attachment reviewed: `<HOME>\.codex\attachments\1654ba11-d4b4-4034-be11-b88947fcf6e6\pasted-text.txt`." and then gives the caveat.

We are to verify the claims against reality. Since we don't have the attachment, we must rely on the document's own evidence and the provided context.

However, note that the document also provides evidence for the backend model: `backend/models/DailyMacroLog.mjs:24-180` has many fields including fiber, sugar, sodium, etc.

So the gap is that the manual form does not use those fields. This is likely true.

Gap 3: Existing model capacity is underused: `DailyMacroLog` can store fiber, sugar, sodium, added sugar, fats, NOVA, brand, meal source, flags, source, and verification, but the primary manual form does not populate most of it.

This is consistent with gap 2 and the model evidence provided.

Gap 4: Search runs too much in the client: `FoodSearchPanel.logic.ts:55` uses USDA endpoint directly, while `:148` fetches the external API from the browser. USDA states API keys must not be publicly exposed, so Swan should proxy/cache through the backend.

We are given specific lines in `FoodSearchPanel.logic.ts`. The document claims that the search is done directly in the browser, exposing the API key.

We must check if this is true. The document says the audit had no direct repo access, but it does quote the attachment. We are to take the document's word for the evidence unless we have contradictory evidence suggests otherwise.

However, note that the document also says: "External reference refresh: FDA Nutrition Facts serving/nutrient semantics, USDA FoodData Central API, Open Food Facts API usage, Google ML Kit barcode/OCR docs." and then "External reference gap: GS1 Sunrise 2027 and local-food directory claims from the attachment still need an official-source refresh before implementation."

So the document is aware of the USDA API key issue and claims that the current implementation exposes it.

This gap is likely real.

Gap 5: Scanner is not in the nutrition tab: `/food-scanner` is live, but NutritionWorkspace only labels Food Search with a barcode icon. This is a UX mismatch and a data-flow mismatch.

We already discussed: the scanner is a separate route. The nutrition tab has a barcode icon in the Food Search panel (presumably to launch the scanner). But the scanner itself is not embedded. So the user leaves the nutrition tab to scan.

This is a UX mismatch because the user expects to stay in the nutrition tab.

Gap 6: Scanner write path assumes a 100g default: `FoodScannerPage.tsx:472-475` posts `servingSizeGrams: 100`; `foodScannerRoutes.mjs:488-493` scales from per-100g values. That is useful but not enough for label-serving, household measure, package-serving, or weighed quantity.

We are given specific lines. The document claims that the scanner always uses 100g as the serving size when logging, and then the backend scales from per-100g values.

This means that if the user scans a product and wants to log a different serving size (like one serving as per the label), they cannot because the scanner forces 100g.

This is a real limitation.

Gap 7: Food catalog lacks pro provenance: `FoodProduct` has source and `lastVerified`, but lacks source version, market country, confidence score, review status, duplicate GTIN conflict handling, serving normalization, and raw source payload linkage.

We are given the model for `FoodProduct` in `backend/models/FoodProduct.mjs:18-108` and it lists the fields. The document claims it lacks those fields.

We can see from the provided model fields in the document: 
`backend/models/FoodProduct.mjs:18-108` has `barcode`, `name`, `brand`, `description`, `ingredientsList`, `ingredients`, `nutritionalInfo`, `overallRating`, `ratingReasons`, `healthConcerns`, `isOrganic`, `isNonGMO`, `category`, `imageUrl`, `healthierAlternatives`, `dataSource`, `lastVerified`, and `scanCount`.

Indeed, it does not have source version, market country, confidence score, review status, etc.

So this gap is real.

Gap 8: Schema drift risk in scanner admin edit: `foodScannerRoutes.mjs:375-376` updates `nutritionFacts`, `healthScore`, and `allergens`, while `FoodProduct.mjs:50/:55` uses `nutritionalInfo` and `overallRating` and has no first-class `allergens` field.

We are given specific lines in the scanner routes and the FoodProduct model.

The document claims that the scanner admin edit route is trying to update fields that don't exist in the FoodProduct model (or are named differently).

Specifically, it says the route updates `nutritionFacts`, `healthScore`, and `allergens`, but the model uses `nutritionalInfo` and `overallRating` and has no `allergens`.

This is a real schema drift: the route is using field names that don't match the model.

Gap 9: Admin review is too narrow: the current review queue is for unverified macro estimates. The pro system needs queues for unmatched scans, low OCR confidence, stale source records, source conflicts, and incomplete nutrient panels.

We are given evidence for the current review queue: 
`frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionEstimateReviewPanel.tsx:87` calls `/api/macros/review-queue`
and `:119` patches `/api/macros/client-timeline/:entryId/verify`.

The document claims that the current review queue is only for unverified macro estimates.

We must check if the backend route `/api/macros/review-queue` indeed only returns unverified macro estimates.

The document does not provide the backend code for that route, but it does say that the triage router claims `/api/macros/review-queue` first (see backend route matches: `backend/core/routes.mjs:632` mounts `/api/macros` to `dailyMacroRosterTriageRoutes` before the general macro router).

Without the actual code, we rely on the document's claim. However, note that the document says the audit had no direct repo access, so this is based on the attachment.

But the document also says: "Admin review exists, but only as a partial estimate-verification queue, not a full food-data quality operation."

This is consistent with the claim.

Gap 10: Local/produce workflows are not tied to diary truth: Farm Finder, Garden, and produce-style intelligence exist as content/tool surfaces, but they do not create source-tagged diary entries with PLU/local source provenance.

The document does not provide specific evidence for this, but it is a reasonable claim if those features exist but are not connected to the nutrition logger.

Now, we must also check for false gaps: gaps that the document claims but actually exist.

Let's look at the document's claims about what is built.

The document says: "The existing surface is real and valuable, but fragmented." and then lists the components that are mounted in the NutritionWorkspace.

It also says: "The barcode scanner is a separate live route at `/food-scanner`".

We have evidence for that.

Now, let's check the "Canonical Surface Receipt" section for any inaccuracies.

It says:
- `frontend/src/routes/main-routes.tsx:708` declares `path: 'user-dashboard'` and `:712` renders `<UserDashboardV3 />`.
- `frontend/src/routes/main-routes.tsx:718` declares `path: 'user-dashboard/:tab'` and `:722` renders `<UserDashboardV3 />`.
- `frontend/src/routes/main-routes.tsx:157-158` lazy-loads `FoodScannerPage`, and `:536/:539` mounts it at `food-scanner`.

We don't have the actual file, but we are to take the document's word for it.

Then it says:
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:58` navigates non-home tabs to `/user-dashboard/${tab}`.
- `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx:43` lazy-loads `NutritionWorkspace`.
- `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx:208` renders `<NutritionWorkspace />` inside the nutrition tab.
- `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:136` defines the workspace component.
- `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:239-261` renders Today, Log Meal, Voice, and Search panels.
- `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:269-288` renders Meal Plan and Intelligence under subscription locks.

This seems consistent.

Now, let's check the shared role routes:
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:106` maps admin `/nutrition/:clientId?` to `NutritionPlanBuilder`.
- `:139` maps admin `/meal-planner` to `NutritionWorkspaceLazy`.
- `:162` maps trainer `/meal-planner` to `NutritionWorkspaceLazy`.
- `:188` maps client `/meal-planner` to `ClientMealPlannerRoute`.

This is about the meal-planner routes, which are shared.

Now, the consumer hooks/services:
- `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:146` refreshes macros after meal log success.
- `frontend/src/components/FoodTracker/FoodIntakeForm.tsx:4` documents manual `/api/macros` logging.
- `:163-169` builds the macro payload and posts/patches `/api/macros`.
- `frontend/src/components/FoodTracker/useFoodSearchAddToLog.ts:28` posts search results to `/api/macros`.
- `frontend/src/components/FoodTracker/mealPhotoLog.ts:6` builds photo/AI estimate payloads for `POST /api/macros`.
- `frontend/src/pages/FoodScanner/FoodScannerPage.tsx:348` calls `/api/food-scanner/scan/:barcode`.
- `:398` calls `/api/food-scanner/search`.
- `:472-475` posts `/api/food-scanner/log-scan` with `servingSizeGrams: 100`.
- `frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionEstimateReviewPanel.tsx:87` calls `/api/macros/review-queue`.
- `:119` patches `/api/macros/client-timeline/:entryId/verify`.

These are all specific claims about the code.

We must verify if these are accurate. Since we don't have the repo, we rely on the document. However, note that the document says the audit had no direct repo access, so it is based on the attachment (which we don't have). But the document is the artifact we are reviewing, and we are to check its claims against reality. Without the repo, we cannot verify the exact lines. However, the document is providing the evidence from the attachment, so we must assume that the attachment (which was reviewed) supports these claims.

But note: the document says "Attachment caveat: the audit explicitly had no direct repo access. This brief separates repo-proven facts from external recommendations."

So the lines and file paths are repo-proven facts (from the attachment). Therefore, we can take them as true for the purpose of this review.

Now, let's check for false gaps.

One potential false gap: the document claims that the manual logger only captures the big four macros. But what if the manual logger actually does capture more? The document provides evidence from `FoodIntakeForm.logic.ts:4-11` that it only stores those. We have to take that as given.

Similarly, for the search running in the client: the document provides evidence from `FoodSearchPanel.logic.ts:55` and `:148`.

Now, let's check the backend vs UI for partial features.

For example, gap 2: manual logger under-captures data. The document says the backend model (`DailyMacroLog`) has the fields (fiber, sugar, etc.) but the manual form does not populate them.

So the backend is complete (the model has the fields) but the UI (manual form) is missing the implementation to use those fields.

This is a backend-complete, UI-missing situation.

Similarly, for gap 4: search runs in the client. The backend might have a proxy set up, but the UI is calling the USDA directly. So the backend might be capable of proxying, but the UI is not using it.

The document does not claim that the backend has a proxy, but it says that Swan should proxy/cache through the backend. So currently, the UI is doing it directly, meaning the backend proxy might not exist or is not being used.

But note: the document says "USDA states API keys must not be publicly exposed, so Swan should proxy/cache through the backend." This implies that currently, it is not proxied (because if it were, the key wouldn't be exposed). So the backend proxy might not exist, or if it does, the UI is not using it.

However, the document provides evidence that the UI is calling the USDA directly (from the browser). So regardless of whether the backend has a proxy, the UI is not using it.

So for gap 4: the UI is making the call directly (so UI is incomplete in terms of security) and the backend might or might not have a proxy. But the document doesn't claim the backend has a proxy, so we cannot say the backend is complete. Actually, the gap is about the UI exposing the key, so the fix is on the UI (to use a backend proxy) and/or the backend (to provide the proxy). The document doesn't specify where the proxy should be, but it says "Swan should proxy/cache through the backend", meaning the backend should provide the proxy and the UI should use it.

So currently, the UI is not using a backend proxy (because it's calling directly), and we don't know if the backend has a proxy endpoint. But the document doesn't claim the backend has a proxy, so we cannot say the backend

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
