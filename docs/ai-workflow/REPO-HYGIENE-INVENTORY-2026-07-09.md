# Nutrition Decision Logger: Canonical Receipt and Hygiene Inventory

Date: 2026-07-09
Scope: Nutrition Center hostile-review release in `codex/nutrition-seven-star-20260709`
Mode: Phase 1 inventory only. No files were moved, archived, or deleted.

## External Design Reference Gate

`[MOBBIN UNAVAILABLE]` No callable Mobbin or Mobbin-like MCP capability was exposed in this session, and the referenced external-receipt file was not present in the isolated worktree. The implementation therefore uses the Swan cinematic design docs, the locked Fable packet, WCAG checks, and live browser evidence. No Mobbin access is claimed.

## Canonical Surface Receipt

| Required proof | Canonical evidence |
|---|---|
| URL route | `frontend/src/routes/main-routes.tsx:736-750` defines `/user-dashboard` and `/user-dashboard/:tab`. Both render `UserDashboardV3`, not only a lazy declaration. |
| Mounted dashboard page | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:120,166` renders `UserDashboardTabsV3`. |
| Mounted Nutrition workspace | `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx:218` renders `<NutritionWorkspace />` for the Nutrition tab. |
| Role-dashboard aliases | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:140,163` maps `/meal-planner`; `UniversalDashboardLayout.routeComponents.tsx:54,190` lazy-loads and renders the same workspace. |
| Decision logger mount | `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:130` renders `NutritionWorkspaceCapture`; line 224 renders the shared `NutritionReviewDrawer`. |
| Consumer hook | `NutritionWorkspace.tsx:70` consumes `useMacroSummary`; Today and diary consumers use the same persisted macro truth. |
| Exact read API | `frontend/src/components/DashBoard/workspaces/NutritionDiaryTimeline.tsx:128` reads `GET /api/macros?date=...`. |
| Exact atomic write API | `frontend/src/components/FoodTracker/NutritionReviewDrawer.tsx:142` writes `POST /api/macros/drafts`. |
| Backend mount | `backend/core/routes.mjs:639-640` mounts review/triage before daily macros at `/api/macros`. |
| Backend atomic handler | `backend/routes/dailyMacroRoutes.mjs:50` mounts `/drafts`; `backend/routes/dailyMacroDraftRoutes.mjs:15` handles the POST. |
| Authoritative model | Base columns are in `backend/models/DailyMacroLog.mjs:20-181`; additive decision provenance is in `DailyMacroLog.provenance.mjs:8-90`. |

## Backend Mount and Shadow Audit

Mount order for the touched path:

1. `backend/core/routes.mjs:639` - `/api/macros` review/triage router.
2. `backend/core/routes.mjs:640` - `/api/macros` daily router.
3. `backend/routes/dailyMacroRoutes.mjs:50` - authenticated `/drafts` child router.
4. `backend/routes/dailyMacroDraftRoutes.mjs:15` - `POST /`, yielding `POST /api/macros/drafts`.

The earlier router owns `GET /roster-triage`, `PATCH /client-timeline/:entryId/verify`, `GET /review-queue`, and `GET /client-timeline` (`dailyMacroRosterTriageRoutes.mjs:44,98,132,187`). The daily router owns `POST /`, `GET /`, `GET /summary`, `GET /weekly`, `PATCH /:id`, and `DELETE /:id` (`dailyMacroRoutes.mjs:52,127,151,186,244,270`). There is no same-method/same-path collision, and `/drafts` is mounted before `/:id`, so the new POST cannot be consumed by a parameter route.

The scanner route has two ordered mounts: `foodScannerExplainRoutes` then `foodScannerRoutes` at `backend/core/routes.mjs:365-366`. Explain endpoints (`/explain-product`, `/explain-ingredient`, `/video-brief`) do not overlap scanner GET/PUT/POST paths (`foodScannerRoutes.mjs:73-608`). No scanner shadow condition was found.

## Surface Classification

| Surface | Classification | Evidence and disposition |
|---|---|---|
| `NutritionWorkspace.tsx` and extracted modules | active runtime code, canonical | Mounted by user and role route trees above. |
| `NutritionWorkspace.capture.tsx` | active runtime code, canonical | `NutritionWorkspace.tsx:130`; owns five capture modes and live source truth. |
| `NutritionReviewDrawer.tsx` | active runtime code, canonical | `NutritionWorkspace.tsx:224`; only shared atomic review/save drawer. |
| `NutritionBarcodeCapture.tsx` | active runtime code, canonical | `NutritionWorkspace.tsx:51,191`; embeds the canonical scanner primitive. |
| `components/FoodScanner/BarcodeScanner.tsx` | active runtime code, canonical primitive | Imported by `NutritionBarcodeCapture.tsx:4` and standalone scanner page. |
| `/food-scanner` and `FoodScannerPage.tsx` | active runtime code, canonical standalone scanner | `main-routes.tsx:564-567` renders the page; retained for compatibility. |
| `components/FoodTracker/BarcodeScanner.tsx` | dormant | No import consumer found. Candidate for Phase 2 cleanup only after final reference check and approval. |
| `LogFoodCommandCenter.tsx` | dormant | No runtime import consumer after capture convergence. Candidate for Phase 2 cleanup only. |
| dashboard-export copies under `frontend/src/assets/user-dashboard/.../production-context` | QA artifact / reference snapshot | Search results include lookalike Nutrition mounts, but files live under assets and are not runtime imports. Keep as reference unless separately approved. |
| Fable ready brief and final build packet | active reference docs | Ground the locked scope, wireframe, review-first contract, and responsive matrix. |

## DailyMacroLog Authoritative Columns

Quoted from the model definition, not mapper code:

- Identity and diary: `id`, `userId`, `date`, `mealType`, `description` (`DailyMacroLog.mjs:20-51`).
- Nutrients: `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `sodium`, `addedSugar`, `saturatedFat`, `transFat`, `cholesterol` (`DailyMacroLog.mjs:52-106`).
- Food metadata and flags: `novaGroup`, `brandName`, `mealSource`, `flagSodium`, `flagSugar`, `flagCholesterol`, `flagSaturatedFat`, `flagTransFat`, `flagProcessed`, `items`, `source` (`DailyMacroLog.mjs:107-172`).
- AI and trust: `aiConversationId`, `verified` (`DailyMacroLog.mjs:173-185`).
- Provenance: `sourceRecordId`, `loggedByUserId`, `contractVersion`, `draftId`, `workoutProximity`, `servingBasis`, `servingQuantity`, `servingUnit`, `caloriesReported`, `caloriesCalculated`, `reconciliationStatus`, `confidenceScore`, `reviewStatus`, `reviewReason`, `reviewedByUserId`, `reviewedAt` (`DailyMacroLog.provenance.mjs:8-93`).
- Sequelize also supplies `createdAt` and `updatedAt` because `timestamps: true` is set at `DailyMacroLog.mjs:192`.

## Caller Cross-Check

Repository grep scope: `backend/routes`, `backend/controllers`, and `backend/services` for `DailyMacroLog`.

| Direct caller | Referenced fields | Result |
|---|---|---|
| `routes/dailyMacroRoutes.mjs` plus `dailyMacroRoutes.utils.mjs` | `id`, `userId`, `date`, `createdAt`, `mealType`, `description`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `sodium`, `items`, `verified` | match |
| `routes/dailyMacroRosterTriageRoutes.mjs` plus triage service | Base diary fields, `source`, `verified`, every provenance/review field above, `createdAt` | match |
| `services/nutrition/reviewedNutritionDraftService.mjs` | Base write fields plus every persisted provenance/reconciliation field | match |
| `services/nutrition/macroLogService.mjs` | `userId`, `date`, `mealType`, `description`, macro nutrients, `items`, `source`, `aiConversationId`, `verified` | match |
| `controllers/aiWorkoutController.mjs:534-550` | `userId`, `date`, `mealType`, `calories`, `protein`, `carbs`, `fat`, `fiber` | match |
| `services/ai/dispatchers/nutritionDispatchers.mjs:91-249` | `userId`, `date`, `calories`, `protein`, `carbs`, `fat`, `sodium`, `flagSodium`, `mealType` | match |
| `services/supplementService.mjs:57-89` | `userId`, `date`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `sodium` | match |
| `services/encryption/healthDataEncryption.mjs:29-32` | `description` | match |

Reference-only or indirect grep hits do not dereference the model: `fatSecretService.mjs`, `coachNutritionProposalCareCopy.mjs`, `coachNutritionProposalApprovalService.mjs`, `commandDispatcher.mjs`, `coachNutritionContext.mjs`, `nutritionCommands.mjs`, and `clientSelfServiceNutritionDispatchers.mjs`. The approval and client dispatchers call `macroLogService`, whose fields are listed above.

## Drift Table

| Caller field | Real model column | Status |
|---|---|---|
| `aiConversationId` | `aiConversationId` INTEGER FK | match after strict positive-integer repair |
| encrypted nutrition text | `description` | match after removal of nonexistent aliases |
| draft identity | `draftId` | match |
| universal source link | `sourceRecordId` | match |
| serving truth | `servingBasis`, `servingQuantity`, `servingUnit` | match |
| calorie reconciliation | `caloriesReported`, `caloriesCalculated`, `reconciliationStatus` | match |
| confidence and review | `confidenceScore`, `reviewStatus`, `reviewReason`, `reviewedByUserId`, `reviewedAt` | match |
| ordering and receipts | `id`, `createdAt`, `updatedAt` | match |

No unresolved caller-to-column drift remains in the grep scope.

## Root Inventory

Active operating files at root: `ACTIVE-INDEX.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `package-lock.json`, `render.yaml`, and the environment/config examples. Active tool metadata: `.clinerules`, `.fallowrc.json`, `.mcp.json`, `.secretignore`, `skills-lock.json`, `.gitattributes`, and `.gitignore`. No root-level screenshots, ad hoc QA exports, or temp logs were created by this workstream.

The root remains intentionally lean. Runtime code stays under `frontend/` and `backend/`; active handoff/reference docs stay under `docs/ai-workflow/`; generated Playwright evidence stays under ignored `frontend/test-results/` (`.gitignore:56-58`); Vite output stays under ignored `dist/` (`.gitignore:11`). No new ignore rule is required.

## Candidate Cleanup List

These are likely cleanup candidates pending Phase 2 approval and a final reference check:

1. `frontend/src/components/FoodTracker/BarcodeScanner.tsx` - appears unmounted after scanner convergence.
2. `frontend/src/components/FoodTracker/LogFoodCommandCenter.tsx` and its styles - appears unmounted after the five-mode capture rail replaced it.

No destructive cleanup is authorized in this pass. The asset-based dashboard export is not a cleanup candidate by default because it is an intentional reference snapshot.

## Post-Task Hygiene

New durable artifacts: this inventory, new focused tests, migration/model/service files, and the updated Nutrition E2E smoke. Generated screenshots and traces are ignored QA output. No new obsolete runtime file was created, no root artifact was added, and no `.gitignore` edit is proposed.
