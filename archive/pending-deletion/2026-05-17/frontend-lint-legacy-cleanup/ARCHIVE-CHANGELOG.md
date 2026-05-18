# Frontend Lint Legacy Cleanup Archive - 2026-05-17

Scope: frontend-only archive pass for source files that were no longer mounted or directly imported by the current frontend route tree and were contributing lint noise / AI context confusion.

This pass intentionally did not touch backend files and did not archive ambiguous trainer-dashboard legacy route files because `TrainerDashboardLayout.tsx` still imports `TrainerDashboardRoutes`.

See `ARCHIVE-MANIFEST.tsv` for original and archived paths.
