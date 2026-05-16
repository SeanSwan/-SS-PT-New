# Backend Debug Artifacts Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These files were not part of the active backend route/controller graph and contained local debug/test affordances or obsolete controller code. Keeping them in backend/public or controller folders makes production scans and AI route analysis noisier.

## Files

- `login-test.html`
- `public-debug.html`
- `enhancedSessionController.mjs.obsolete`
- `direct-password-fix.mjs`
- `create-test-users.mjs`
- `NASM_BACKEND_VERIFICATION_COMPLETE.md`
- `test-auth.html`
- `reset-admin-password.mjs`
- `test-auth.mjs`
- `enhancedScheduleRoutes.mjs.obsolete`
- `scheduleRoutes.mjs.obsolete`
- `TrainingSessionService.mjs.obsolete`
- `session.service.mjs.backup`
- `populateDatabase.mjs`
- `test-passwords2.mjs`
- `test-universal-master-schedule-api.mjs`

## Restore Rule

Restore only for a deliberate local debugging task, and do not serve these from production static folders.
