# Frontend Shop Stale Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

`OrderHistory.tsx` was unreferenced by the active frontend tree and displayed hardcoded package orders instead of reading `/api/orders`. Leaving it under `frontend/src` made the storefront look more wired than it was.

## Files

- `OrderHistory.tsx`

## Restore Rule

Restore only if it is rewired to the canonical authenticated orders endpoint and mounted through a verified route or storefront account surface.
