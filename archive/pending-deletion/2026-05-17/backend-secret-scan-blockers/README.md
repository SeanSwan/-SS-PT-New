# Backend Secret-Scan Blockers

Moved here on 2026-05-17 during the QA cleanup hardening slice.

`fix-production-admin.mjs` was removed from the active backend root because it
was an old direct-production repair script and contained a credential-shaped
PostgreSQL fallback that blocked the repository secret scan.

The archived copy has been sanitized so it can be reviewed without preserving
the scanner-blocking fallback. Do not restore this script to active backend
code. Rebuild any needed production repair workflow as a guarded launcher or
migration with no hardcoded database URL shape.
