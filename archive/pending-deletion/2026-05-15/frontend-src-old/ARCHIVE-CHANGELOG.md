# Frontend Old Folder Archive - 2026-05-15

## Scope

Moved old backup folders out of `frontend/src` after reference checks showed documentation-only references.

## Archived Folders

- `frontend/src/services/old` -> `archive/pending-deletion/2026-05-15/frontend-src-old/services-old`
- `frontend/src/utils/old` -> `archive/pending-deletion/2026-05-15/frontend-src-old/utils-old`

## Removed Empty Source Folders

- `frontend/src/components/old`
- `frontend/src/pages/old`

## Verification

`rg` found references only in archive/refactor documentation and the current hygiene inventory, not in runtime imports.
