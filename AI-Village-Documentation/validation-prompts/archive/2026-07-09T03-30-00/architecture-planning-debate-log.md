# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 22,761 input / 8,192 output

---

## Senior Architecture Lead — Round 1

# Architecture Authority Review — Nutrition Decision Logger
## SwanStudios Production SaaS | Round 1 Analysis

---

## Preliminary Scope Declaration

Every finding below is derived exclusively from the plan document and the 12 specialist inputs. I am treating the Free-Brain Synthesis as reviewed seed context, not as authority over repo evidence. Where the synthesis and specialist inputs conflict, I cite the stronger file-line evidence.

---

## Executive Verdict

**APPROVE WITH CHANGES — DO NOT CODE YET.**

The plan's architecture is directionally correct. The phasing logic (frontend convergence → backend provenance → review ops) is sound. The `NutritionEntryDraft` contract is a genuine improvement over the current fragmented state. However, **seven findings rise to CRITICAL or HIGH severity** and must be resolved before Slice 1 begins. Three of them are live production bugs today, not future risks.

---

## Finding 1 — Live Silent Data Loss in Scanner Admin Edit

**Severity: CRITICAL — Production Bug Today**
**File: `backend/core/foodScannerRoutes.mjs:375-376`**
**Model: `backend/models/FoodProduct.mjs:50/55`**

### Issue

The synthesis correctly identifies this as a live no-op. `foodScannerRoutes.mjs:375-376` calls `product.update({ nutritionFacts, healthScore, allergens })`. `FoodProduct.mjs` defines `nutritionalInfo` (not `nutritionFacts`), `overallRating` (not `healthScore`), and has no `allergens` field at all. Sequelize silently drops unknown keys on `update()` — it does not throw. Every admin edit to these three fields has been a no-op since this code shipped.

This is independent of any schema decision in Slice 4. It requires no migration. It is a two-line field-name remap.

### Fix

```typescript
// foodScannerRoutes.mjs — pre-slice hotfix
// BEFORE (silent no-op):
await product.update({ nutritionFacts, healthScore, allergens });

// AFTER (maps to actual FoodProduct columns):
await product.update({
  nutritionalInfo: nutritionFacts,   // FoodProduct.mjs:50
  overallRating: healthScore,        // FoodProduct.mjs:55
  // allergens: no column exists — reject explicitly or add to Phase B
});

// If allergens is submitted, return 400 until the column exists:
if (allergens !== undefined) {
  return res.status(400).json({
    error: 'allergens field not yet supported — pending Phase B schema'
  });
}
```

**Write a failing regression test first** (per the bugfix standard). The test must assert that `product.update({ nutritionFacts: 'x' })` does NOT silently succeed — it must verify the actual `nutritionalInfo` column changed. This locks the Sequelize-drops-unknown-keys behavior.

**Action: Ship as a pre-Slice-1 hotfix. Do not bundle into Slice 4.**

---

## Finding 2 — Client-Side API Key Exposure

**Severity: CRITICAL — Security Violation Today**
**Files: `frontend/src/components/FoodTracker/FoodSearchPanel.logic.ts:55` and `:148`**

### Issue

`FoodSearchPanel.logic.ts:55` and `:148` call USDA FoodData Central directly from the browser. USDA's API guide explicitly states keys must not be publicly exposed. This is a Rule 8 violation (no public keys) and is live in production at sswanstudios.com today.

The plan acknowledges this in Gap #4 and Acceptance Criteria but does not assign it to a specific slice with a hard gate. The synthesis correctly elevates this to the singular top-priority blocker.

### Fix

Create a backend proxy before any other Slice 1 work begins:

```
backend/
  routes/
    nutritionProxyRoutes.mjs     ← NEW, <100 lines
      GET /api/nutrition/search?q=&source=usda|off
      GET /api/nutrition/detail/:sourceSystem/:id
```

The proxy:
- Reads `USDA_API_KEY` and `OFF_USER_AGENT` from environment variables only
- Caches responses in Redis or a simple in-memory TTL cache (USDA rate limits apply)
- Never forwards the raw API key in any response body or header
- Returns a normalized shape that the frontend consumes — the frontend never knows which external source was called

```typescript
// frontend — after proxy exists
// BEFORE (exposes key):
const res = await fetch(
  `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${q}`
);

// AFTER (backend-proxied):
const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}&source=usda`);
```

**Action: This is Slice 0.5 — a mandatory pre-gate before Slice 1 UI work begins. Gate Slice 1 on this being merged and deployed.**

---

## Finding 3 — `NutritionEntryDraft` Nutrient Fields Are JSON Soup

**Severity: CRITICAL — Type Safety**
**Plan Section: North Star System — `NutritionEntryDraft` contract**

### Issue

```typescript
// Current plan contract — PROBLEMATIC:
nutrientsReported: Record<string, number | null>;
nutrientsCalculated: Record<string, number | null>;
```

This is stringly-typed. It reproduces the exact `proteins_100g` / `proteins` / `protein` key-name chaos already present at `foodScannerRoutes.mjs:495`. The "truth layer" becomes decorative if the nutrient map has no enforced shape. Any capture lane can write any key name and the TypeScript compiler will not catch it.

`DailyMacroLog.mjs:24-180` already defines the canonical column set: `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `sodium`, `addedSugar`, `saturatedFat`, `transFat`, `cholesterol`. These are the known nutrients. Everything else is genuinely extra.

### Fix

```typescript
// types/nutrition.ts — NEW, replaces the Record<string, ...> fields
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
  extra:          Record<string, number>; // escape hatch for USDA/OFF extras
}

interface NutritionEntryDraft {
  // ... all other fields unchanged ...
  nutrientsReported:   NutrientPanel;
  nutrientsCalculated: NutrientPanel;
  // REMOVE: Record<string, number | null>
}
```

The `extra` field absorbs any source-specific nutrients (e.g., `potassium`, `vitaminC`) without polluting the typed core. The typed core maps 1:1 to `DailyMacroLog` columns, making the draft-to-save transform a straightforward field copy with no key-name guessing.

**Action: Fix the contract in Slice 2 before any capture lane builds against it. All 9 capture cards depend on this shape.**

---

## Finding 4 — No Target User Identity for Trainer/Admin Logging

**Severity: HIGH — Functional Correctness**
**Files: `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:139/162/188`**
**Backend: `backend/core/foodScannerRoutes.mjs:445`**

### Issue

The plan scopes trainer and admin meal-planner routes as canonical shared surfaces. `foodScannerRoutes.mjs:445` sets `userId` from `req.user.id` — correct for self-logging, broken the instant a trainer logs for a client. The `NutritionEntryDraft` contract has no `targetUserId` field. Open Question #4 in the plan covers trainer *verification*, not trainer *logging*. These are different operations.

If a trainer logs a meal for a client from the `/meal-planner` route, the entry will be saved against the trainer's own `userId`. This is a silent data integrity failure — no error, wrong user.

### Fix

**Option A (recommended for v1): Explicitly scope trainer-logging-for-client OUT of v1.** Add a clear `// TODO: trainer-logging-for-client requires targetUserId — deferred to v2` comment in the draft contract and the backend handler. The trainer role in v1 can only *verify* and *review*, not *log on behalf of*.

**Option B (if trainer logging is required in v1):**

```typescript
// Add to NutritionEntryDraft:
targetUserId: number | null; // null = self-log; non-null = trainer logging for client

// Backend validation:
if (targetUserId !== null) {
  // Verify req.user has trainer/admin role
  // Verify req.user has an active relationship with targetUserId
  // Log the action to audit trail with req.user.id as actor
  // Save DailyMacroLog with userId = targetUserId
}
```

**Action: Make an explicit decision before Slice 1. The ambiguity will cause a silent data bug if trainer-logging routes are exercised before this is resolved.**

---

## Finding 5 — `NutritionWorkspace.tsx` Will Exceed 300 Lines

**Severity: HIGH — File Budget Violation**
**File: `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx`**
**Current: line 288 (plan evidence)**

### Issue

The Architecture specialist correctly identifies this. The plan asks `NutritionWorkspace` to host a Today command ribbon, a capture rail with 9 modes, a draft/review panel, a source-truth panel, and a diary timeline. The current file is at line 288. Adding the new shell, mode-switching logic, and panel orchestration will push it to 600–800 lines. This violates the 300-line hard limit.

### Fix — Mandatory Decomposition

```
frontend/src/components/DashBoard/workspaces/
  NutritionWorkspace.tsx                 ← orchestrator ONLY, <100 lines
  nutrition/
    NutritionTodayRibbon.tsx             ← date, macro ring, hydration, streak
    NutritionCaptureRail.tsx             ← mode selector, 44px controls
    NutritionDraftPanel.tsx              ← editable draft, serving basis
    NutritionSourceTruthPanel.tsx        ← source system, confidence, conflicts
    NutritionDiaryTimeline.tsx           ← diary rows, verification chips
    capture/
      ManualCaptureCard.tsx
      SearchCaptureCard.tsx
      BarcodeCaptureCard.tsx
      LabelPhotoCaptureCard.tsx
      VoiceCaptureCard.tsx
      RecipeCaptureCard.tsx
      LocalProduceCaptureCard.tsx
      RepeatCaptureCard.tsx
    hooks/
      useNutritionDraft.ts               ← draft state + submit
      useNutritionDiaryFeed.ts           ← diary rows fetch + pagination
      useCaptureModeRouter.ts            ← active mode state machine
    types/
      nutrition.ts                       ← NutritionEntryDraft, NutrientPanel
    styles/
      NutritionWorkspace.styles.ts       ← all styled-components for workspace
```

`NutritionWorkspace.tsx` becomes:

```typescript
// NutritionWorkspace.tsx — orchestrator only
// Target: <100 lines

const NutritionWorkspace: React.FC = () => {
  const { activeMode, setActiveMode } = useCaptureModeRouter();
  const draft = useNutritionDraft();

  return (
    <WorkspaceShell>
      <NutritionTodayRibbon />
      <WorkspaceBody>
        <NutritionCaptureRail activeMode={activeMode} onModeChange={setActiveMode} />
        <NutritionDraftPanel draft={draft} />
        <NutritionSourceTruthPanel draft={draft} />
      </WorkspaceBody>
      <NutritionDiaryTimeline />
    </WorkspaceShell>
  );
};
```

Each capture card is independently lazy-loadable. The heavy ones (barcode, label-photo, voice) must be `React.lazy()` — they carry ML Kit / OCR / audio dependencies that must not land in the main bundle.

---

## Finding 6 — State Management: Three Parallel Write Paths to `/api/macros`

**Severity: HIGH — Shared-Path Integrity Violation**
**Files:**
- `frontend/src/components/FoodTracker/FoodIntakeForm.tsx:163-169`
- `frontend/src/components/FoodTracker/useFoodSearchAddToLog.ts:28`
- `frontend/src/components/FoodTracker/mealPhotoLog.ts:6`

### Issue

Three separate files independently build payloads and POST to `/api/macros`. Each builds a different shape. `FoodIntakeForm.tsx` captures only the big-four macros. `useFoodSearchAddToLog.ts` captures search-result fields. `mealPhotoLog.ts` captures photo/AI estimate fields. There is no shared normalization layer. This is the root cause of the under-capture problem described in Gap #2 and Gap #3.

The plan proposes `NutritionEntryDraft` as the shared contract, but does not explicitly mandate that ALL write paths go through a single service function. If the three files are simply updated in parallel, the divergence will recur.

### Fix — Single Service Path

```typescript
// hooks/useNutritionDraft.ts — THE single write path
// All capture lanes call this; nothing else calls /api/macros directly

interface UseNutritionDraft {
  draft: NutritionEntryDraft;
  updateDraft: (partial: Partial<NutritionEntryDraft>) => void;
  validateDraft: () => ValidationResult;
  submitDraft: () => Promise<void>;
  resetDraft: () => void;
}

// submitDraft() is the ONLY function that calls POST /api/macros
// It normalizes the NutritionEntryDraft → DailyMacroLog payload shape
// It sets verified: false for all estimated lanes
// It handles the clientDraftId idempotency key
```

`FoodIntakeForm.tsx`, `useFoodSearchAddToLog.ts`, and `mealPhotoLog.ts` are refactored to populate the draft via `updateDraft()` and call `submitDraft()`. They do not call `/api/macros` directly. This is the architectural enforcement of the single-path rule.

**The plan must explicitly state this constraint. It currently implies it through the draft contract but does not prohibit direct API calls from capture components.**

---

## Finding 7 — Undefined `confidenceScore` Scale and Contradictory Enum States

**Severity: HIGH — Data Integrity**
**Plan Section: `NutritionEntryDraft` contract**

### Issue A — `confidenceScore` Has No Defined Scale

ML Kit Text Recognition v2 returns confidence per text block (0.0–1.0). USDA FoodData Central returns no confidence value. Open Food Facts returns a `nutriscore_grade` and completeness percentage, not a 0–1 confidence. Manual entry has no source confidence at all.

If `confidenceScore: number | null` is stored without a defined scale and per-source semantics, the value is meaningless for the review queue. A `0.85` from ML Kit means something completely different from a `0.85` derived from Open Food Facts completeness.

### Issue B — Contradictory Enum States Are Possible

The current contract allows combinations like:
- `sourceSystem: 'swan_verified'` + `reviewStatus: 'needs_admin_source_review'` — contradictory
- `reconciliationStatus: 'matched'` + `reviewStatus: 'needs_trainer_review'` — ambiguous
- `sourceSystem: 'manual'` + `confidenceScore: 0.95` — meaningless

These combinations will reach the review queue and confuse trainers and admins.

### Fix

```typescript
// types/nutrition

---

## Code Architecture Specialist (1M context) — Round 2

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

