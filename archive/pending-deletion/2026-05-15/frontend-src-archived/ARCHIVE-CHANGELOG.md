# Frontend Source Archive - 2026-05-15

## Scope

Moved `frontend/src/_archived` out of the active source tree after grep found no runtime imports. This keeps dead and future blueprint code available for reference without polluting TypeScript, Vite, AI search, or route-discovery passes.

## Archived Folders

- `frontend/src/_archived/dead` -> `archive/pending-deletion/2026-05-15/frontend-src-archived/dead`
- `frontend/src/_archived/future` -> `archive/pending-deletion/2026-05-15/frontend-src-archived/future`

## Verification

Before moving, repo grep for `_archived` found documentation references only, plus unrelated model field names such as `isArchived`.
