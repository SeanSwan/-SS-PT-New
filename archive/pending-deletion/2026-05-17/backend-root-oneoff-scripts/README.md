# Backend Root One-Off Scripts Archive

Archived on 2026-05-17 during the backend root-script hygiene slice.

These files were moved out of `backend/` because they matched one-off repair,
debug, emergency, verification, or ad hoc test naming patterns and had no
non-archive references outside themselves at the time of the cleanup.

Protected files intentionally left in `backend/`:
- `production-luxury-seeder.mjs`
- `production-service-diagnostic.mjs`
- `render-production-seeder.mjs`
- `verify-nasm-migrations.mjs`
- `verify-production-fixes.mjs`
- `vitest.config.mjs`
- `vitest.integration.config.mjs`

Files intentionally not moved:
- `test-commonjs.js` had unrelated unstaged edits and was excluded from this
  cleanup slice.

Restore rule: do not restore any file from this folder into active runtime
paths without first re-checking references, package scripts, secret scan
status, and whether the task belongs in a maintained `backend/scripts/` tool
instead of the backend root.
