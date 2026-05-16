# Legacy Theme Infrastructure Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

`frontend/src/themes/` contained legacy theme-selector and component override infrastructure that appeared to belong to an older MUI/Berry-style theme layer. Reference checks found no active imports from `frontend/src`.

## Files

- `themes/`

## Restore Rule

Restore only after proving a live import path needs it. New theme work should use CSS custom properties and the active Crystalline Swan theme changer contracts.
