# Performance & Bundle Impact — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 10.5s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

As a Web Performance Engineer, I have reviewed the **Nutrition Decision Logger - AI Village Input (2026-07-09)**. This plan introduces significant data-heavy surfaces and external API integrations.

### Performance Review Summary
The plan is architecturally sound but introduces risks regarding **bundle bloat** (OCR/Scanning libraries) and **render thrashing** (complex draft reconciliation). The transition from a simple macro logger to a "Control Tower" requires strict virtualization and memoization.

---

### 1. Bundle Size & Dependency Tally
The plan introduces several heavy-hitters for capture modes.
*   **Google ML Kit (Barcode/OCR):** ~200KB - 500KB (gzip). *Critical.*
*   **Victory Charts (Nutrition Rings/Trends):** ~150KB (gzip).
*   **Fuzzy Search / Fuse.js (Local search):** ~5KB (gzip).
*   **Proposed `NutrientPanel` Logic:** ~10KB (logic for reconciliation).

**Optimization:**
*   **[CRITICAL]** `BarcodeScanner` and `OCR/Photo` components **must** be `React.lazy()` loaded. Do not include ML Kit in the main `UserDashboardV3` bundle.
*   **[HIGH]** Use `import type` for the `NutritionEntryDraft` to ensure no logic leaks into the type-only bundles.

### 2. Render Performance
The "Nutrition Control Tower" (Direction 1) introduces a three-pane layout (Capture, Draft, Truth).
*   **The Draft Review Panel:** This will re-render on every keystroke as users reconcile "Reported vs Calculated" calories.
*   **Diary Timeline:** As a "Decision Logger," this list will grow with "Verification Chips" and "Source Warnings."

**Optimization:**
*   **[HIGH]** Use `React.memo` for individual `FoodItemRow` components within the Draft Panel.
*   **[MEDIUM]** Implement `react-window` or `react-virtuoso` for the **Diary Timeline** if a user has >20 entries/day (common for snackers/bio-hackers).
*   **[MEDIUM]** Debounce the "Calculated Calories" derivation logic (Slice 5) to avoid UI lag during rapid manual entry.

### 3. Memory Management
*   **Media Streams:** The Barcode/OCR scanner uses the camera.
*   **Photo OCR:** High-res images of labels stored in memory during the "Draft" state.

**Optimization:**
*   **[HIGH]** Ensure `track.stop()` is called on all camera streams in the `useEffect` cleanup of the scanner component.
*   **[MEDIUM]** Explicitly nullify image blobs/URLs once the `NutritionEntryDraft` is converted to a `POST` payload to prevent heap growth in long-lived SPA sessions.

### 4. Expensive Computation
*   **Reconciliation Engine (Slice 5):** Calculating `caloriesCalculated` based on 4/4/9/2 (Atwater factors) across multiple items in a draft.
*   **Confidence Scoring:** Normalizing scores from ML Kit vs. USDA.

**Optimization:**
*   **[LOW]** Memoize the reconciliation results using `useMemo` keyed to the `items` array. The cost is low per item, but O(n) across a large meal.

### 5. Network Waterfall
The plan correctly identifies the need to proxy USDA/OFF to hide API keys.
*   **Sequential Risk:** Search -> Select -> Fetch Details -> Reconcile.

**Optimization:**
*   **[HIGH]** **BFF Pattern:** Create a single `GET /api/nutrition/lookup?query=...` endpoint that searches Swan Cache, USDA, and OFF in parallel on the Node.js backend, returning a unified `NutritionEntryDraft` shape. This reduces 3-4 client-side roundtrips to 1.
*   **[MEDIUM]** SWR/React Query caching for `FoodProduct` lookups to prevent redundant fetches for the same barcode.

### 6. Media Handling
*   **Label Photos:** The plan mentions "Label Photo OCR."

**Optimization:**
*   **[MEDIUM]** Perform client-side downscaling (Canvas API) before sending label photos to the backend/OCR engine. There is no need to upload a 12MP photo to parse 100 bytes of text.

### 7. Code Splitting Boundaries
*   **Boundary A:** `/food-scanner` (Already lazy-loaded).
*   **Boundary B:** `NutritionWorkspace` (Lazy-loaded via `UserDashboardTabsV3`).
*   **Boundary C (New):** `LabelPhotoCapture` and `RecipeBuilder`. These are heavy "modes" that should be split from the main `NutritionWorkspace` bundle.

### 8. Animation Budget
*   **Dual-Button Glow:** (Blue -> Purple / Purple -> Cyan).
*   **Transitioning Capture Modes:** Sliding panels.

**Optimization:**
*   **[LOW]** Use `will-change: transform` on the Capture Rail transitions.
*   **[LOW]** Ensure the "Glow" effect uses `box-shadow` or `filter: drop-shadow` on a GPU layer (opacity animation) rather than animating the `background-color` directly to maintain 60fps.

---

### Final Performance Verdict & Blockers

| Finding | Rating | Optimization |
| :--- | :--- | :--- |
| **API Key Exposure** | **CRITICAL** | Move USDA/OFF fetches to backend immediately (Slice 1). |
| **ML Kit Bundle Size** | **HIGH** | Strict `React.lazy` for all scanner/OCR components. |
| **Silent Data Loss** | **HIGH** | Fix `FoodProduct` schema drift before Slice 4 to prevent unnecessary re-renders/retries. |
| **Network Waterfall** | **MEDIUM** | Implement a backend aggregator for multi-source food searches. |

**Verdict: APPROVE WITH CHANGES.** 
The plan is performant-ready *if* the external library loading is strictly gated behind user interaction and the data-fetching is consolidated on the backend.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
