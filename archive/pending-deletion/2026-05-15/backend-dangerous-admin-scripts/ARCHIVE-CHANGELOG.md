# Backend Dangerous Admin Scripts Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These one-off production/admin/debug scripts contained hardcoded admin credentials, password reset flows, emergency production mutation helpers, or local database reset instructions. They were not safe to leave in active `backend/` or `scripts/` paths where they could be run accidentally or used as guidance by future agents.

## Files

- `backend/create-admin-prod.mjs`
- `backend/complete-p0-fix.mjs`
- `backend/fix-login-production.mjs`
- `backend/production-auth-fix.mjs`
- `backend/test-badge-system.mjs`
- `backend/test-bcrypt.mjs`
- `backend/test-hash.mjs`
- `backend/test-password.mjs`
- `backend/test-passwords.mjs`
- `backend/verify-backend-url.mjs`
- `backend/scripts/comprehensive-password-test.mjs`
- `backend/scripts/create-comprehensive-env.mjs`
- `backend/scripts/debug-login-server.mjs`
- `backend/scripts/direct-password-reset.mjs`
- `backend/scripts/ensure-simple-admin.mjs`
- `backend/scripts/find-all-env-files.mjs`
- `backend/scripts/fix-all-server-issues.mjs`
- `backend/scripts/reset-postgres-completely.mjs`
- `backend/scripts/seed-test-accounts.mjs`
- `backend/scripts/setup-prod-admin-raw.mjs`
- `backend/scripts/setup-prod-admin.mjs`
- `backend/scripts/simple-login-test.mjs`
- `scripts/authentication/login-diagnosis.mjs`
- `scripts/deployment/PRODUCTION-DEPLOYMENT-CHECKLIST.bat`
- `scripts/deployment/run-emergency-fix.sh`
- `scripts/utilities/CURRENT-DEPLOYMENT-STATUS.mjs`
- `scripts/utilities/create-admin-prod.mjs`
- `scripts/utilities/create-production-user.mjs`

## Restore Rule

Do not restore these as runnable scripts. If an admin/bootstrap workflow is needed, rebuild it around explicit environment variables, dry-run mode, audit logging, and a fail-closed confirmation gate.
