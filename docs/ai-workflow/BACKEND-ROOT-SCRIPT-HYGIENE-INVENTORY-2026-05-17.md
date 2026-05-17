# Backend Root Script Hygiene Inventory - 2026-05-17

## Scope

This inventory covers backend root-level files whose names matched one-off
repair, diagnostic, emergency, verification, test, production, render, seed,
or debug patterns.

The goal was not to delete code. The goal was to make active backend root files
clear enough that AI agents do not treat historical repair scripts as current
production entry points or smoke-test gates.

## Classification

| Class | Count | Action |
|---|---:|---|
| Suspicious backend root matches before cleanup | 122 | Reviewed |
| Referenced by `backend/package.json` | 6 | Left active |
| Referenced outside self after excluding archives | 25 | Left active for later review |
| Active config with conventional tool lookup | 1 | Left active |
| Dirty unrelated file | 1 | Left untouched |
| Archive candidates moved | 89 | Moved to `archive/pending-deletion/2026-05-17/backend-root-oneoff-scripts/` |

## Protected Active Files

These files stayed in `backend/` because they are package-script targets or
active test config:

- `production-luxury-seeder.mjs`
- `production-service-diagnostic.mjs`
- `render-production-seeder.mjs`
- `verify-nasm-migrations.mjs`
- `verify-production-fixes.mjs`
- `vitest.config.mjs`
- `vitest.integration.config.mjs`

## Excluded Dirty File

- `test-commonjs.js` was not moved because it had unrelated unstaged edits in
  the current worktree.

## Moved Files

- `apply-minimal-fix.mjs`
- `check-all-tables.mjs`
- `check-database-status.js`
- `check-local-users.mjs`
- `check-storefront-schema.mjs`
- `check-workout-tables.mjs`
- `debug-associations.mjs`
- `deploy-stripe-fix.mjs`
- `diagnose-assignments-api.mjs`
- `diagnose-missing-models.mjs`
- `diagnose-payment-401-issue.mjs`
- `diagnose-production-stripe.mjs`
- `diagnose-session-data.mjs`
- `diagnostic-p0-fixes.mjs`
- `emergency-payment-recovery.mjs`
- `emergency-pricing-fix.mjs`
- `emergency-production-fix.mjs`
- `emergency-session-fix.mjs`
- `emergency-storefront-fix.mjs`
- `emergency-stripe-customer-fix.mjs`
- `final-fk-constraint-fix.mjs`
- `final-model-fix.mjs`
- `final-tablename-fix.mjs`
- `fix-admin-dashboard.mjs`
- `fix-client-trainer-table.mjs`
- `fix-session-deletedat-production.mjs`
- `master-diagnostic-suite.mjs`
- `production-env-sync.mjs`
- `production-safe-seeder.mjs`
- `quick-payment-check.mjs`
- `quick-redis-test.mjs`
- `quick-server-test.mjs`
- `quick-session-fix.mjs`
- `quickNasmCheck.mjs`
- `render-api-test.mjs`
- `simple-es-test.mjs`
- `simple-session-fix.mjs`
- `simple-stripe-check.mjs`
- `skip-fix-migrations.mjs`
- `stripe-check-clean.mjs`
- `stripe-check-fixed.mjs`
- `stripe-diagnostic.mjs`
- `test-admin-finance-routes.mjs`
- `test-admin-fixes.mjs`
- `test-ai-workout-controller.mjs`
- `test-association-fix.mjs`
- `test-associations-simple.mjs`
- `test-attendance-endpoints.mjs`
- `test-cart-helpers-CORRECT-PRICING.mjs`
- `test-cart-helpers-phase1.mjs`
- `test-cart-helpers-simple.mjs`
- `test-cart-helpers-standalone.mjs`
- `test-client.mjs`
- `test-critical-fixes.mjs`
- `test-custom-package-model.mjs`
- `test-empty.mjs`
- `test-env.mjs`
- `test-fix.sh`
- `test-health-fix.mjs`
- `test-late-cancel-warning.mjs`
- `test-mindbody-parity.mjs`
- `test-output.txt`
- `test-payment-service-activation.mjs`
- `test-payment-system.mjs`
- `test-phase1-onboarding-endpoints.mjs`
- `test-publishable-key.mjs`
- `test-recurring-booking.mjs`
- `test-redis-detection.mjs`
- `test-redis-issue.mjs`
- `test-shopping-cart-status-fix.mjs`
- `test-storefront-phase2-fixed.mjs`
- `test-storefront-phase2.mjs`
- `test-stripe-keys-direct.mjs`
- `test-stripe-simple.mjs`
- `test-video-library-route-fix.mjs`
- `ultra-simple-check.mjs`
- `verify-and-fix-storefront-integration.mjs`
- `verify-cart-total-fix-prod.mjs`
- `verify-cart-total-fix.mjs`
- `verify-database-tables.mjs`
- `verify-key-roles.mjs`
- `verify-migration-fixes.mjs`
- `verify-p0-association-fix.mjs`
- `verify-p0-checkout-fix.mjs`
- `verify-p0-fix.mjs`
- `verify-payment-system-fix.mjs`
- `verify-redis-fix.mjs`
- `verify-stripe-config.mjs`
- `verify-tables.mjs`

## Hostile Notes

- The backend root had too many one-off scripts with names that looked
  operational. That makes future AI work more error-prone because a stale
  emergency file can look more authoritative than maintained scripts.
- Some files were dependency-only: they appeared referenced only by other
  archive candidates. A fixed-point pass was required so those files did not
  stay active by accident.
- This cleanup intentionally did not touch referenced files. Some may still be
  old, but they require a separate reference audit before archival.
- This cleanup also intentionally did not move `test-commonjs.js` because the
  working tree already had unrelated edits there.

## Next Review Hook

The next backend hygiene slice should inspect the 25 remaining referenced
backend root scripts and decide whether each belongs in `backend/scripts/`,
`backend/tests/`, or the pending-deletion archive. Do that as a separate pass.
