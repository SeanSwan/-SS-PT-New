# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 35.6s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

## Risk Assessment of the Nutrition Decision Logger Implementation Plan  
*Derived exclusively from the supplied plan document (`docs/ai-workflow/AI-HANDOFF/NUTRITION-DECISION-LOGGER-FABLE-READY-BRIEF-2026-07-09.md`).*  

---  

### 1. Dependency Risks  
| Phase / Feature | Blocks / Is Blocked By | Impact if Slipped | Rating | Mitigation |
|-----------------|------------------------|-------------------|--------|------------|
| **Phase 1 – Front‑end capture shell (Slice 1)** | Must be completed before any UI‑level convergence can happen. It also **unlocks** the later barcode/label‑photo integration (Slice 3). | If delayed, all downstream capture‑mode work (barcode, OCR, voice) stalls; release cadence slows dramatically. | **CRITICAL** | • Keep Slice 1 deliberately narrow – only add the Today ribbon and mode‑switching logic. <br>• Feature‑flag the new shell so it can be rolled back without affecting existing routes. |
| **Phase 2 – Shared draft contract (Slice 2)** | Depends on Phase 1 being stable (same component tree). | Delay would push back data‑normalisation and richer `DailyMacroLog` population. | **HIGH** | • Implement Slice 2 as a set of isolated utility modules that can be unit‑tested against mock payloads even before UI changes land. |
| **Phase 3 – Barcode & label‑photo convergence (Slice 3)** | Relies on Phase 2’s richer payload shape and on the backend scanner route (`/api/food-scanner`). | If Phase 2’s payload changes after Slice 3 is built, Slice 3 may need re‑work → re‑testing overhead. | **MEDIUM** | • Design Slice 3 to consume the *draft* contract via a stable interface (`NutritionEntryDraft`) that can be versioned. |
| **Phase 4 – Backend provenance schema (Slice 4)** | Requires Phase 3 to have a stable scanner save path and for `FoodProduct` to remain unchanged (unique `barcode`). | If Phase 3 introduces breaking changes to the scanner payload, the migration in Slice 4 becomes risky. | **MEDIUM** | • Freeze the scanner payload contract before starting Slice 4; use a dedicated “scanner‑payload‑v1” type. |
| **Phase 5 – Reconciliation engine (Slice 5)** | Needs the richer nutrient fields populated by Slice 2 and the source‑record IDs from Slice 4. | If source‑record IDs are not yet available, reconciliation cannot compute reported‑vs‑calculated values. | **LOW** | • Build a lightweight stub in Slice 5 that simply logs the values; replace with real logic once Slice 4 is merged. |

---  

### 2. Technical Unknowns  
| Unknown | Why It Is Uncertain | Potential Impact | Rating | Mitigation |
|---------|--------------------|------------------|--------|------------|
| **USDA / Open Food Facts API key handling** | Plan mentions “proxy/cache through the backend” but does not specify a concrete implementation or existing proxy service. | Exposure of API keys in client code would violate security policy; also may break when rate limits change. | **HIGH** | • Implement a server‑side proxy in a dedicated micro‑service (Slice 0‑prep) and add a unit test that asserts no key appears in the bundled client. |
| **Google ML Kit on‑device barcode & OCR behavior** | The plan assumes on‑device scanning works across all target browsers; actual SDK size and permission requirements are not detailed. | Feature may fail on older Android WebView or iOS Safari, causing dead‑ends for barcode/photo capture. | **MEDIUM** | • Prototype the ML Kit integration early (Slice 1‑prototype) and add a fallback to server‑side scanning if on‑device fails. |
| **Sequelize silent‑ignore of unknown keys** | The plan notes a potential “schema drift” bug but does not confirm whether the current codebase actually drops unknown fields. | If unknown keys are silently ignored, admin edits (`nutritionFacts`, `healthScore`, `allergens`) will not persist → data‑integrity risk. | **CRITICAL** | • Add a regression test that asserts unknown keys are *not* ignored (e.g., a failing test that expects a validation error). |
| **`confidenceScore` scale & semantics** | The contract mentions a `confidenceScore` but does not define its numeric range or how different sources (USDA, OCR, ML Kit) map to it. | Inconsistent scoring could break review‑queue filtering and UI displays. | **LOW** | • Document the scale in the `NutritionEntryDraft` interface and add a unit test that validates the range (0‑1). |
| **Unique `barcode` constraint on `FoodProduct`** | The plan states `barcode` is `unique: true` but does not clarify whether OCR/manual entries will ever need a barcode. | Attempting to insert a record without a barcode would violate the constraint, causing migration failures. | **MEDIUM** | • Keep `FoodProduct` as a *specialised* table for packaged goods; create a separate `NutritionSourceRecord` for non‑barcode items (Slice 4). |

---  

### 3. Scope‑Creep Indicators  
| Area | Why It Is Prone to Expansion | Likely Over‑Estimation | Rating | Mitigation |
|------|-----------------------------|------------------------|--------|------------|
| **Barcode & label‑photo serving‑size handling** | The plan mentions “household measure, package‑serving, weighed quantity” but does not bound the number of supported unit types. | Adding new unit‑type logic later could exceed the 300‑line file budget for `FoodScannerPage.tsx`. | **MEDIUM** | • Scope Slice 3 to support only *label‑serving* and *100 g* default; defer exotic units to a future slice. |
| **Admin data‑quality queues** | The plan lists many possible queue items (duplicate GTIN, source conflict, stale source, etc.). | Implementing *all* queues in v1 would blow past the planned effort for Slice 6. | **HIGH** | • Prioritise only the three essential queues (unmatched scans, low OCR confidence, client‑review) for v1; defer the rest to Phase C. |
| **Local produce / PLU workflow** | The plan treats it as a “draft lane” but does not define a concrete data model or UI flow. | Expanding to full farm‑market integration could require new backend tables and UI components. | **MEDIUM** | • Keep local‑produce as a *placeholder* lane with a simple “manual source” tag; schedule full implementation for a later release. |
| **Trainer‑admin logging identity** | The plan mentions shared trainer routes but does not specify how `targetUserId` will be passed. | Adding full impersonation later may require extensive route changes and permission checks. | **LOW** | • Design the API contract now to accept an optional `targetUserId`; implement only self‑log in v1 and revisit if trainer logging is approved. |

---  

### 4. Effort Accuracy (File / Line Count)  
| File (as listed in plan) | Estimated Lines | Likely Exceeds 300‑line limit? | Reason / Mitigation |
|--------------------------|----------------|------------------------------|---------------------|
| `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx` | ~340 (includes Today ribbon, capture rail, draft panel, source truth panel) | **YES** – exceeds 300 lines. | Split the component into smaller sub‑components (`NutritionHeader`, `CaptureRail`, `DraftPanel`, `SourceTruthPanel`) and lazy‑load where possible. |
| `frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionEstimateReviewPanel.tsx` | ~210 (currently under 300) but will grow when adding review‑queue UI. | **MAY** – watch for additions. | Keep UI modular; add new queue widgets as separate components. |
| `frontend/src/pages/FoodScanner/FoodScannerPage.tsx` | ~460 (includes scanner UI, payload building, API calls) | **YES** – already >300. | Refactor: move API‑call logic to a dedicated hook (`useFoodScanner`) and move OCR/confidence handling to a separate file. |
| `backend/core/routes.mjs` (adds scanner & macro routes) | ~120 (current) but will increase with new provenance endpoints. | **MAY** – keep under 300 by extracting route handlers into separate files (`foodScannerRoutes.js`, `macroTriageRoutes.js`). |
| `backend/models/DailyMacroLog.mjs` (schema extension) | ~150 (current) but will grow with new columns. | **MAY** – monitor. | Use migration scripts that add columns in batches; avoid large schema dumps. |

---  

### 5. Testing Gaps  
| Test Type | Current Coverage (from plan) | Missing Coverage | Rating | Mitigation |
|-----------|-----------------------------|------------------|--------|------------|
| **Unit – hooks / logic** | Mentioned for `useFoodSearchAddToLog`, `useMacro` etc. | No explicit unit tests for the new `NutritionEntryDraft` normalisation or for the draft‑to‑payload conversion. | **MEDIUM** | Add a test suite for `src/hooks/useNutritionDraft.ts` covering serving‑basis math, confidence scoring, and payload shape. |
| **Integration – API contract** | End‑to‑end tests for `/api/macros` POST/PATCH are referenced. | No integration tests that verify the *review queue* triggers correctly after a draft is saved with `verified: false`. | **HIGH** | Write integration tests that simulate a barcode scan → draft → save → queue entry; assert queue item appears. |
| **E2E – UI flows** | Planned for “Today command ribbon” and “capture mode transitions”. | No E2E scenarios for barcode → label‑photo fallback, or for mobile single‑column layout collapse. | **MEDIUM** | Add Cypress tests for the three mobile breakpoints (320 px, 414 px, 768 px) covering the capture rail and review accordion. |
| **Visual regression** | Not mentioned. | No visual regression tests for theme tokens, 44 px touch targets, or dark‑first palette contrast. | **HIGH** | Introduce Storybook + Chromatic visual tests for each theme token and for the responsive layout breakpoints. |
| **Accessibility** | Only a brief note on 44 px controls. | No automated aXe or Lighthouse accessibility audit plan. | **MEDIUM** | Schedule an aXe scan for the new NutritionWorkspace components before merge. |

---  

### 6. Rollback Plan  
| Phase | Rollback Mechanism | Independence | Rating | Mitigation |
|-------|-------------------|--------------|--------|------------|
| **Phase 1 – Capture shell** | Feature‑flag `nutritionCaptureV2`; revert to old tab‑based UI by toggling the flag. | Fully independent – only affects routing and component mounting. | **LOW** | Ensure the flag is persisted in `localStorage` and defaults to `false` on production deploy. |
| **Phase 2 – Draft contract** | No runtime flag needed; simply stop calling the new normalisation utilities. | Independent – can be disabled without touching UI. | **LOW** | Wrap new utilities in a conditional import that checks a feature flag. |
| **Phase 3 – Barcode / label‑photo integration** | Disable the scanner launcher route (`/food-scanner`) and restore the previous standalone scanner page. | Independent – does not affect other routes. | **LOW** | Keep the old `FoodScannerPage` as a fallback route behind a flag. |
| **Phase 4 – Provenance schema migration** | Run a reverse migration script that drops added columns (`sourceRecordId`, `servingBasis`, etc.) and restores the original `DailyMacroLog` shape. | Requires DB rollback; can be scripted and executed via a migration rollback command. | **MEDIUM** | Store migration scripts in version‑controlled folder; test rollback on a staging DB before production. |
| **Phase 5‑6 – Reconciliation & admin queues** | Turn off the queue processor (e.g., disable the background worker) and revert webhook endpoints. | Independent of UI; can be toggled off. | **LOW** | Add a config switch `ENABLE_REVIEW_QUEUE=false`. |

---  

### 7. Database / Backend Risks  
| Claim in Plan | Evidence in Plan | Verdict | Rating | Mitigation |
|---------------|------------------|---------|--------|------------|
| “No backend changes required” (for Phase A) | The plan states “Do not rip out `DailyMacroLog`” and “Phase A – no migration, convergence first”. | **Partially true** – the *shape* of `DailyMacroLog` will be *populated* more fully, but new columns (`sourceRecordId`, `servingBasis`, `confidenceScore`, etc.) are planned for Phase B/C. | **MEDIUM** | Explicitly document that Phase A only *writes* more fields; schema changes are deferred to Phase B and will require a migration. |
| Need for new `NutritionSourceRecord` table | The plan proposes a “hybrid” model but does not confirm table creation. | **Unclear** – the plan mentions “add a new `NutritionSourceRecord` keyed on `(sourceSystem, sourceRecordId)`” but does not state whether a migration will be needed. | **HIGH** | Draft the migration script early; verify that adding the table does not break existing foreign‑key constraints. |
| `/api/macros` route order & triage | `backend/core/routes.mjs` mounts `/api/macros` to `dailyMacroRosterTriageRoutes` *before* the general macro router. | **Validated** – the plan explicitly shows this ordering, so any new endpoints must respect the triage priority. | **LOW** | Keep new macro‑related routes under the triage router or add them after the generic router to avoid accidental overrides. |
| `/api/food-scanner` writes `nutritionFacts`, `healthScore`, `allergens` | `foodScannerRoutes.mjs:375-376` updates those fields. | **Risk** – `FoodProduct` lacks those fields; Sequelize silently drops unknown keys (see Dependency Risks). | **CRITICAL** | Fix the silent‑drop bug (see Phase 4 mitigation) and ensure the write path targets existing fields (`nutritionalInfo`, `overallRating`). |

---  

### 8. Phase Ordering – Is It Optimal?  
| Current Order | Suggested Adjustment | Rationale |
|---------------|----------------------|-----------|
| **0 – Planning packet** → **1 – Capture shell** → **2 – Draft contract** → **3 – Barcode/label‑photo** → **4 – Provenance schema** → **5 – Reconciliation** → **6 – Admin queues** → **7 – Local produce** → **8 – Design QA** | **Move the silent‑data‑loss bug fix (Phase 4‑related) into a *pre‑slice hot‑fix* before any UI work.** <br>**Shift the USDA proxy implementation to a *pre‑Slice 1* task** (security blocker). | • The silent‑drop bug can cause data loss *immediately* if left unaddressed; fixing it early removes a critical production risk. <br>• Proxying external APIs is a hard security requirement; it must be in place before any client‑side API calls are made. |
| **Phase 3 (Barcode integration)** currently depends on Phase 2’s richer payload. | **Decouple**: make Phase 3 consume the *draft* contract directly, without waiting for full Phase 2 completion. | Allows early UI work on scanner while the backend payload shape is still evolving, reducing idle time. |
| **Phase 5 (Reconciliation)** is placed after Phase 4. | **Keep as is**, but **shrink scope** to a stub that only logs values; full engine can be built later. | Prevents over‑engineering while still delivering a visible “reconciliation” UI for QA. |
| **Phase 7 (Local produce)** is low priority but placed near the end. | **Leave as is** – it is a nice‑to‑have that does not affect core data flow. | No change needed. |

---  

## Summary of Ratings  

| Category | Overall Rating |
|----------|----------------|
| Dependency Risks | **CRITICAL** (scanner silent‑data‑loss, capture‑shell blocking) |
| Technical Unknowns | **HIGH** (API‑key exposure, ML Kit compatibility, Sequelize key‑drop) |
| Scope‑Creep Indicators | **MEDIUM–HIGH** (serving‑size expansion, admin queues) |
| Effort Accuracy | **MEDIUM** (several files exceed 300‑line limit) |
| Testing Gaps | **HIGH** (no visual regression, limited E2E, missing unit tests for draft contract) |
| Rollback Plan | **LOW–MEDIUM** (feature‑flags cover most, DB rollback needs scripting) |
| Phase Ordering | **MEDIUM** (benefit in moving bug‑fix and proxy work earlier) |

---  

### Quick Reference Mitigations  

1. **Feature‑flag every new UI shell** – rollback without code changes.  
2. **Add regression test for Sequelize unknown‑key dropping** – catch silent‑data‑loss early.  
3. **Implement server

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
