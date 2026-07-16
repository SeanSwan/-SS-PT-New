# Orphaned Frontend Utilities and Modals Archive - 2026-07-16

## Purpose

This companion manifest records 23 callerless standalone components, modal prototypes, and report helpers moved during the pre-launch audit. Original paths remain recoverable; no source file was permanently deleted.

## Evidence

- Production dead-code analysis classified every file as unreachable.
- Exact path, symbol, import, route, package-script, and barrel searches found no runtime consumer.
- The active nutrition routes mount `NutritionWorkspace` and `NutritionPlanBuilder`, not the archived NutritionPlanning modal.
- The active video, profile, workout-progress, and messaging surfaces use separately mounted implementations.
- Source-only contract references were updated to assert archive state or retain only live files.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/Admin/VideoCard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Admin/VideoCard.tsx` | unconsumed legacy admin video component |
| `frontend/src/components/Admin/VideoPlayerModal.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Admin/VideoPlayerModal.tsx` | unconsumed legacy admin video modal |
| `frontend/src/components/FoodTracker/QuickAddFood.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/FoodTracker/QuickAddFood.tsx` | unconsumed food-entry prototype |
| `frontend/src/components/Profile/ProfilePhotoUploader.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Profile/ProfilePhotoUploader.tsx` | unconsumed legacy profile uploader |
| `frontend/src/components/VideoChat/WearableDataPanel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/VideoChat/WearableDataPanel.tsx` | explicitly unmounted wearable prototype |
| `frontend/src/components/ui/cards/training-progress-dark-card.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/cards/training-progress-dark-card.tsx` | unconsumed showcase card |
| `frontend/src/components/ui/cards/training-progress-light-card.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/cards/training-progress-light-card.tsx` | unconsumed showcase card |
| `frontend/src/components/ProgressAnalysis/ProgressAnalysis.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ProgressAnalysis/ProgressAnalysis.tsx` | unmounted legacy AI modal |
| `frontend/src/components/NutritionPlanning/NutritionPlanning.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/NutritionPlanning/NutritionPlanning.tsx` | unmounted legacy AI modal |
| `frontend/src/components/ExerciseAlternatives/ExerciseAlternatives.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ExerciseAlternatives/ExerciseAlternatives.tsx` | unmounted legacy AI modal |
| `frontend/src/AnimatedText/animated-text.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/AnimatedText/animated-text.component.jsx` | unconsumed visual prototype |
| `frontend/src/Marquee/MotivationalMarquee.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/Marquee/MotivationalMarquee.jsx` | unconsumed visual prototype |
| `frontend/src/ResizeImage/resize-image.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/ResizeImage/resize-image.component.jsx` | unconsumed image utility UI |
| `frontend/src/ResizeImage/resize-image.styles.css` | `archive/pending-deletion/2026-07-16/frontend/src/ResizeImage/resize-image.styles.css` | style dependency used only by archived ResizeImage |
| `frontend/src/components/Reports/ClientSelector.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Reports/ClientSelector.tsx` | unconsumed report helper |
| `frontend/src/components/Reports/ColorPicker.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Reports/ColorPicker.tsx` | unconsumed report helper |
| `frontend/src/components/Reports/DragDropImageUpload.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Reports/DragDropImageUpload.tsx` | unconsumed report helper |
| `frontend/src/components/Reports/PreviewPanel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Reports/PreviewPanel.tsx` | unconsumed report helper |
| `frontend/src/components/Reports/PropertyInfoPage.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Reports/PropertyInfoPage.tsx` | unconsumed report helper |
| `frontend/src/components/Reports/WeeklyReportForm.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Reports/WeeklyReportForm.jsx` | unconsumed report helper |

| `frontend/src/components/ui/toast.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/toast.ts` | unconsumed Sonner placeholder that only logged instead of rendering notifications |
| `frontend/src/components/ui/toaster.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/toaster.tsx` | unconsumed incompatible toast facade with no mounted provider |
| `frontend/src/components/ui/install-instructions.md` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/install-instructions.md` | stale install note for an uninstalled and unmounted toast experiment |
## Restore procedure

Restore only after proving a mounted product need and reconnecting the complete caller chain, then rerun the relevant route contracts, typecheck, build, full frontend tests, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
