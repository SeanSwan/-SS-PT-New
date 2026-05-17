# Legacy Root-Level Frontend E2E Specs

Moved here on 2026-05-17 during QA script hygiene Phase 2.

These files were removed from active `frontend/e2e/` because they were
non-canonical root-level specs or one-off audit helpers. Several depended on
manual login, live credentials, stale routes, or narrow historical product
surfaces.

Active smoke now lives in:

- `scripts/qa/playwright-smoke.mjs`
- `frontend/e2e/client-dashboard-oracle-smoke.spec.ts`
- `frontend/e2e/marketing-native-publishing-smoke.spec.ts`

Do not restore one of these files without first verifying the current route,
removing live credential assumptions, and confirming it should run as part of
the active E2E surface.
