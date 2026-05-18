# Frontend Dormant Schedule Dialogs Archive

Date: 2026-05-17

## Decision

Archived the old `frontend/src/components/UniversalMasterSchedule/Dialogs` components instead of fixing lint inside them.

## Import Proof

`rg` checks found no active imports of `UniversalMasterSchedule/Dialogs`, `AdvancedFilterDialog`, `BulkActionsConfirmationDialog`, or `SessionFormDialog` outside the dialog folder itself. The components were only self-referenced and barrel-exported.

## Reason

The active Universal Master Schedule path uses newer modal/drawer components directly. These older dialog surfaces carried substantial inline-style and accessibility lint debt but were not production-reachable through active imports.
