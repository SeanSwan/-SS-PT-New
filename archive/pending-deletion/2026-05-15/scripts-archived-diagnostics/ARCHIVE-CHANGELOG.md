# Scripts Archived Diagnostics Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

The `scripts/archived_diagnostics` folder was already historical, but leaving it under active `scripts/` made old duplicate dashboard code and demo data easier to mistake for runnable production support scripts.

## Restore Rule

Restore only for historical comparison. New diagnostics should live under active scripts with explicit ownership, live API behavior, and no demo-data fallbacks.
