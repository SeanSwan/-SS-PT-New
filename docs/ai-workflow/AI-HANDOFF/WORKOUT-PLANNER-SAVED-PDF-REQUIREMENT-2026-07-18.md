# Requirement (Sean, 2026-07-18): Workout Planner → Saved-Plan PDF round-trip

**Surface:** Workout Planner (4.3 — `frontend/src/components/DashBoard/Pages/admin-workout-planner/`), NOT the Post-Save Handoff (4.2, in progress). Captured here so it isn't lost; address as part of the Planner slice.

## What Sean expects
1. When the Workout Planner **generates a plan PDF**, that PDF must be **dropped into the "Saved Plans" section at the bottom** of the planner.
2. Sean must be able to **click a saved plan and view the PDF any time**.
3. Sean must be able to **edit the plan** — either **manually** or **with Swan Coach**.

## Likely-relevant existing code (verify state — bug vs partially-built)
- `admin-workout-planner/SavedPlanCard.tsx`, `SavedPlanPdfPanel.tsx`, `WorkoutPlanPdfDialog.tsx`
- `admin-workout-planner/workoutPlannerPlanPdfAdapter.ts` (PDF adapter — also the white-label branding resolution point)
- Save/PDF hooks: `useWorkoutPlannerSaveActions.ts` (`/api/workout-plans/:id/pdf/upload`), `useWorkoutPlannerSavedPlansState.ts`
- Backend: `workoutPlanRoutes.mjs`, `workoutPlanPdfAttachmentService.mjs`

## Open questions to resolve when picked up
- Is the PDF currently NOT dropping into Saved Plans (a bug), or is the view/edit round-trip simply unbuilt?
- "Edit with Swan Coach" — does the saved plan carry the structured `planData` (not just the PDF) so Coach can edit it, then regenerate the PDF? (PDF is a render artifact; the editable source is `planData`.)
- Trainer-indispensability: editing/switching a plan stays trainer-only (clients read + do).

**Status:** captured, NOT started. Sequence after the current Post-Save Handoff slice (or when Sean prioritizes the Planner surface).
