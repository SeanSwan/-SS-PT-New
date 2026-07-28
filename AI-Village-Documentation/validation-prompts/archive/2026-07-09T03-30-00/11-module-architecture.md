# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 34.1s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

We are given a plan document for the Nutrition Decision Logger feature. We are to review the file organization and derive the proposed files/folders/hooks from the plan.

We must output a structured markdown with:
- A proposed file tree and line budget.
- Answers to the 7 specific questions (Decomposition, styles/organization, hooks/ separation, 300-line budget, Import graph, Barrel exports, Shared vs local).

However, note that the plan document does not explicitly list the proposed file structure. We have to infer from the plan what files and folders are being proposed.

Let's break down the plan:

The plan is divided into slices (0 to 8). Each slice describes changes to be made.

We are to derive the actual proposed files/folders/hooks from the plan content.

We note that the plan mentions several existing files and components. We are to focus on the new changes.

From the plan, we can infer the following:

Slice 1: converge frontend capture shell
- Modify `NutritionWorkspace` to replace tab sprawl with a Today command ribbon plus capture modes.
- Keep existing mounted components behind the new shell.
- Add scanner launcher/integration decision without deleting `/food-scanner`.

This implies changes to:
- `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx` (the main workspace)
- Possibly new components for the capture rail, today command ribbon, etc.

Slice 2: shared draft contract
- Add `NutritionEntryDraft` utilities and unit tests.
- Convert manual and search payload builders to populate richer existing `DailyMacroLog` fields.

This implies:
- A new utility file for `NutritionEntryDraft` (maybe in `frontend/src/utils/nutrition` or `frontend/src/components/DashBoard/workspaces/nutrition/utils`)
- Changes to existing payload builders (like in `FoodIntakeForm.logic.ts` and `FoodSearchPanel.logic.ts`)

Slice 3: barcode and label-photo convergence
- Move barcode capture into the nutrition shell or embed a stable launcher to `/food-scanner` with return-to-nutrition state.
- Label-photo path creates a draft with OCR confidence and client confirmation before save.

This implies:
- Changes to `NutritionWorkspace` to include barcode capture (or a launcher)
- Possibly a new component for label-photo OCR (if not already existing) or changes to existing scanner components.

Slice 4: backend provenance schema
- Fable-approved migration only.
- Add source record/reconciliation fields, or add a dedicated source-record table if preferred.
- Fix `foodScannerRoutes.mjs:375-376` schema drift.

This implies backend changes (which we are not focusing on for the frontend file structure, but note that the plan is for the full stack).

Slice 5: calculation and reconciliation engine
- Store raw source nutrients and display totals separately.
- Add calories reported vs calories calculated with reconciliation status.

This implies:
- Changes to the draft builder and possibly to the UI to show the comparison.

Slice 6: admin data-quality layer
- Extend the current estimate review queue into a source quality console.
- Queues: unmatched scans, low OCR confidence, duplicate GTIN/source conflict, stale source, incomplete nutrients, local item verification.

This implies:
- New admin components/pages for the review queue.

Slice 7: local produce/farm mode
- Add PLU/name/local-source draft lane.

This implies:
- New capture mode for local produce.

Slice 8: design QA and release hardening
- Responsive matrix, accessibility, etc.

Now, we are to focus on the frontend file structure because the constraints (like 300 lines/file, styled-components, etc.) are frontend-specific.

We are to derive the proposed file tree for the frontend.

Let's list the existing files mentioned in the plan that are in the frontend:

- `frontend/src/routes/main-routes.tsx`
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`
- `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx`
- `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx`
- `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx`
- `frontend/src/components/FoodTracker/FoodIntakeForm.tsx`
- `frontend/src/components/FoodTracker/useFoodSearchAddToLog.ts`
- `frontend/src/components/FoodTracker/mealPhotoLog.ts`
- `frontend/src/pages/FoodScanner/FoodScannerPage.tsx`
- `frontend/src/components/DashBoard/workspaces/clients-team/ClientNutritionEstimateReviewPanel.tsx`

We are also told about the current structure of `NutritionWorkspace` (which mounts several panels: Today, Log Meal, Voice, Food Search, Hydration, Macros, Meal Plan, Intelligence, Learn).

The plan wants to converge these into a single decision logger with a capture rail, draft/review panel, and source truth panel.

We are to propose a new file organization for the nutrition feature.

Given the constraints (max 300 lines/file), we must break down large components.

Let's propose a file structure for the nutrition feature under `frontend/src/components/DashBoard/workspaces/nutrition` (or similar) to keep it feature-local.

We note that the plan does not explicitly state the new file structure, so we have to infer from the slices and the described responsibilities.

We'll create a proposed file tree based on the slices and the need to keep files under 300 lines.

Proposed frontend file structure for the nutrition feature:

```
frontend/
└── src/
    └── components/
        └── DashBoard/
            └── workspaces/
                └── nutrition/   # New folder for the nutrition feature (to avoid cluttering the workspaces folder)
                    ├── components/
                    │   ├── CaptureRail.tsx
                    │   ├── TodayCommandRibbon.tsx
                    │   ├── DraftReviewPanel.tsx
                    │   ├── SourceTruthPanel.tsx
                    │   ├── DiaryTimeline.tsx
                    │   ├── CaptureModeButton.tsx   # for each capture mode (quick add, search, barcode, etc.)
                    │   ├── NutritionEntryForm.tsx   # form for manual entry (if needed)
                    │   ├── FoodSearchBar.tsx
                    │   ├── BarcodeScannerLauncher.tsx   # if we are launching the scanner page
                    │   ├── LabelPhotoOCR.tsx
                    │   ├── VoiceMeal.tsx
                    │   ├── RecipeBuilder.tsx
                    │   ├── LocalProduceMode.tsx
                    │   └── RepeatRecent.tsx
                    ├── hooks/
                    │   ├── useNutritionEntryDraft.ts   # hook to build and manage the draft
                    │   ├── useCaptureModes.ts          # hook to manage the active capture mode
                    │   ├── useNutritionValidation.ts   # hook for validation and reconciliation
                    │   └── useNutritionSave.ts         # hook to handle saving the entry
                    ├── utils/
                    │   ├── nutritionEntryDraft.ts      # utilities for the draft (types, builders, normalizers)
                    │   ├── servingBasis.ts             # utilities for serving basis conversion
                    │   └── nutrientCalculation.ts      # utilities for calculating nutrients from raw data
                    ├── styles/
                    │   ├── index.ts                    # barrel for styles
                    │   ├── tokens.ts                   # CSS custom properties (tokens) for the nutrition feature
                    │   ├── CaptureRail.styles.ts
                    │   ├── TodayCommandRibbon.styles.ts
                    │   ├── DraftReviewPanel.styles.ts
                    │   ├── SourceTruthPanel.styles.ts
                    │   └── DiaryTimeline.styles.ts
                    ├── NutritionWorkspace.tsx          # the main workspace component (now simplified to just orchestrate the panels)
                    ├── index.ts                        # barrel export for the nutrition feature
                    └── types.ts                        # shared types for the nutrition feature (like NutritionEntryDraft)
```

However, note that the plan says to keep existing mounted components behind the new shell. So we might not want to break up the existing panels (like Today, Log Meal, etc.) if they are already under 300 lines. But the plan is to change the structure.

Alternatively, we might keep the existing component files and just change how they are composed in `NutritionWorkspace`.

But the plan says: "Modify `NutritionWorkspace` to replace tab sprawl with a Today command ribbon plus capture modes."

So we are going to change the structure of `NutritionWorkspace` to have a new layout.

Given the 300-line constraint, we must break down `NutritionWorkspace` if it is currently long.

Looking at the plan: `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx:136` defines the workspace component, and it has lines 239-261 and 269-288 for rendering panels. We don't have the full file, but we can assume it might be long.

We are to propose a file tree and then answer the questions.

Let's answer the questions one by one.

1. **Decomposition** — Is the plan's file breakdown right? Any files that should be merged, or that are too thin?

   The plan does not explicitly propose a file breakdown. We are inferring one.

   We note that the plan mentions several existing files that are going to be changed. We are proposing a new folder structure for the nutrition feature to keep related files together.

   We believe that the current structure (with everything in the workspaces folder) is becoming cluttered. Creating a dedicated `nutrition` folder under workspaces is a good idea.

   However, we must avoid over-fragmentation. We propose to group by concern (components, hooks, utils, styles) and then by feature within components.

   We do not see any files that are too thin in our proposal, but we must check the line counts.

2. **styles/ organization** — Are the proposed style files / barrels well-organized, or over-fragmented?

   We propose a `styles` folder under the nutrition feature with:
   - `index.ts` (barrel)
   - `tokens.ts` (for the CSS custom properties specific to this feature, but note: the theme is global, so tokens might be better in a global styles folder? However, the plan says every color must be a CSS custom property with a brand fallback. We are to use the global theme tokens. So we might not need a tokens.ts in the nutrition feature. Instead, we use the global tokens.

   Actually, the plan says: "EVERY color must be a CSS custom property with a brand fallback (var(--token, #fallback)) — never hardcode hex except as the fallback."

   So we should be using the global theme tokens. Therefore, we don't need a `tokens.ts` in the nutrition feature. We can remove that.

   We propose:
   - `styles/index.ts`: exports all the style components (styled-components) for the nutrition feature.
   - Individual style files for each component (e.g., `CaptureRail.styles.ts`).

   This is not over-fragmented because each component has its own style file, and we are keeping them together.

3. **hooks/ separation** — For the plan's proposed hooks, is the separation of concerns clean (data-fetch vs UI-state vs business-logic)?

   We proposed:
   - `useNutritionEntryDraft.ts`: manages the draft state (UI-state and business-logic for the draft)
   - `useCaptureModes.ts`: manages the active capture mode (UI-state)
   - `useNutritionValidation.ts`: business-logic for validation and reconciliation (could be split into validation and calculation, but we keep it together for now)
   - `useNutritionSave.ts`: handles the saving (data-fetch and business-logic for saving)

   This separation seems clean: 
   - UI-state: `useCaptureModes`
   - Business-logic (draft management, validation, saving): the others
   - Data-fetch: `useNutritionSave` (which would call the API)

   However, note that `useNutritionEntryDraft` might also involve some data-fetch (if we are fetching source data) but the plan says the draft is built from the capture. So it's mostly UI-state and business-logic.

   We might consider splitting `useNutritionValidation` into `useNutrientCalculation` and `useReconciliation` but the plan doesn't require that level of detail.

   We'll keep it as is for now.

4. **300-line budget** — Based on the plan's described responsibilities, which files are at risk of exceeding 300 lines? Name them and propose the split.

   We must look at the responsibilities of each file.

   - `NutritionWorkspace.tsx`: This will be the main orchestrator. It will render the TodayCommandRibbon, the capture rail, the draft review panel, the source truth panel, and the diary timeline. It should be relatively thin (just composing the panels and managing some state). We expect it to be under 300 lines.

   - `CaptureRail.tsx`: This will contain the buttons for each capture mode. It might be a simple horizontal list of buttons. Under 300 lines.

   - `TodayCommandRibbon.tsx`: This will show the date, next action, macro ring, hydration, streak, review. It might be a bit complex but we expect under 300 lines.

   - `DraftReviewPanel.tsx`: This will show the editable food lines, serving basis, nutrient comparison, raw vs calculated calories, and save/needs review controls. This could be complex because it has to handle multiple food lines and dynamic fields. We must watch this.

   - `SourceTruthPanel.tsx`: This will show source system, confidence, conflicts, trainer notes, admin queue tags. This might be simpler.

   - `DiaryTimeline.tsx`: This will show meals, verification chips, quick repeat, trainer/admin review. This could be complex if it has a lot of interactivity.

   - The hooks: 
        * `useNutritionEntryDraft.ts`: This will manage the draft state (which is a complex object) and might have a lot of logic for updating the draft from different capture modes. This could be long.
        * `useNutritionValidation.ts`: This will have the logic for normalization, reconciliation, etc. This could be long.

   We propose the following splits if any file is at risk:

   - If `DraftReviewPanel.tsx` exceeds 300 lines, we can split it into:
        * `DraftReviewPanel.tsx` (the container)
        * `FoodLineItem.tsx` (for each food line in the draft)
        * `NutrientComparison.tsx` (for showing the nutrient comparison)
        * `SaveControls.tsx` (for the save and review controls)

   - If `useNutritionEntryDraft.ts` exceeds 300 lines, we can split it into:
        * `useNutritionEntryDraft.ts` (the main hook)
        * `useDraftUpdateFromCapture.ts` (a hook for updating the draft from a specific capture mode) - but this might be overkill.

   Alternatively, we can move some of the complex logic to utils.

   We note that the plan has a `utils` folder. We can put complex pure functions there.

   So, for example, the nutrient calculation and serving basis conversion can go to `utils/nutrientCalculation.ts` and `utils/servingBasis.ts`.

   Then the hooks would be thinner.

   We'll assume that with the utils, the hooks and panels can stay under 300 lines.

   However, to be safe, we note the following files as at risk and propose splits:

   - `DraftReviewPanel.tsx`: if it grows beyond 300 lines, split into subcomponents as above.
   - `useNutritionEntryDraft.ts`: if it grows beyond 300 lines, we can move some of the update logic to a separate utility or hook per capture mode? But we don't want to over-complicate.

   We'll propose:

   - `DraftReviewPanel.tsx` -> if over 300 lines, split into:
        * `DraftReviewPanel.tsx`
        * `FoodLineItem.tsx`
        * `NutrientComparison.tsx`
        * `DraftActions.tsx` (for save and review)

   - `useNutritionEntryDraft.ts` -> if over 300 lines, we can split the update logic per capture mode into separate files? But that might not be necessary. Instead, we can move the complex validation rules to `utils/validationRules.ts`.

   We'll leave it at that for now.

5. **Import graph** — Sketch the dependency tree the plan implies. Any circular risks or deep import chains?

   We'll sketch a simplified import graph for the nutrition feature:

   ```
   NutritionWorkspace.tsx
   ├── imports: TodayCommandRibbon, CaptureRail, DraftReviewPanel, SourceTruthPanel, DiaryTimeline
   │
   ├── TodayCommandRibbon.tsx
   │   ├── imports: (global hooks, maybe useNutritionSave for next action?)
   │
   ├── CaptureRail.tsx
   │   ├── imports: CaptureModeButton (for each mode)
   │   │   ├── QuickAddButton.tsx
   │   │   ├── SearchButton.tsx
   │   │   ├── BarcodeButton.tsx
   │   │   ├── ... etc.
   │
   ├── DraftReviewPanel.tsx
   │   ├── imports: FoodLineItem, NutrientComparison, SaveControls
   │   │   ├── FoodLineItem.tsx
   │   │   │   ├── imports: (hooks for updating draft, maybe useNutritionEntryDraft)
   │   │   ├── NutrientComparison.tsx
   │   │   │   ├── imports: (utils for nutrient calculation)
   │   │   └── SaveControls.tsx
   │   │       ├── imports: (useNutritionSave)
   │
   ├── SourceTruthPanel.tsx
   │   ├── imports: (maybe hooks for fetching source data?)
   │
   └── DiaryTimeline.tsx
       ├── imports: (maybe hooks for fetching diary entries)
   ```

   The hooks:
   - `useNutritionEntryDraft.ts` might be imported by:
        * `CaptureRail.tsx` (via the capture mode buttons to update the draft)
        * `DraftReviewPanel.tsx` (to display and edit the draft)
        * `FoodLineItem.tsx` (to update a specific food line)
   - `useNutritionSave.ts` might be imported by:
        * `SaveControls.tsx` (to handle the save action)
        * `TodayCommandRibbon.tsx` (if there's a quick save?)

   We see a potential circular risk if:
        * `useNutritionEntryDraft` imports something that imports `NutritionWorkspace` (which is unlikely because hooks are usually leaf nodes).

   We don't see an obvious circular risk. The import chains are not deep (max 3-4 levels).

6. **Barrel exports** — Where do barrels help vs hurt? Any directory that should/shouldn't have an index.ts?

   Barrels (index.ts) are helpful for:
        - Public API of a

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
