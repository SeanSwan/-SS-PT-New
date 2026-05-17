# Repo Hygiene Inventory - QA Scripts - 2026-05-17

## Scope

Phase 1 non-destructive inventory for Playwright and QA smoke scripts. Phase 2
execution was approved and completed on 2026-05-17.

## Why This Exists

The repo has multiple generations of QA scripts. Some still look like official
smoke tests, but they depend on live credentials, older routes, seeded database
state, or exact UI copy that has changed. That makes them noisy for AI agents
and for production triage.

## Canonical QA Surface

| Classification | Path | Notes |
|---|---|---|
| active runtime/testing | `scripts/qa/playwright-smoke.mjs` | Canonical launcher for current smoke tests. |
| active runtime/testing | `frontend/e2e/client-dashboard-oracle-smoke.spec.ts` | Production-safe dashboard smoke with mocked auth/API. |
| active runtime/testing | `frontend/e2e/marketing-native-publishing-smoke.spec.ts` | Production-safe Marketing tab smoke with native publishing checks. |
| active config | `frontend/playwright.config.ts` | Shared Playwright config and named browser projects. |
| active API tests | `frontend/e2e/api/` | API coverage surface; fixture cleanup should be reviewed separately. |
| active guide | `frontend/e2e/README.md` | Explains active smoke files and archive location for retired E2E helpers. |
| active guide | `tests/README.md` | Redirects agents away from retired Python QA scripts. |

Canonical commands:

```bash
npm run qa:smoke
npm run qa:smoke:prod
```

## Competing Or Confusing QA Surfaces

| Classification | Path | Phase 1 finding |
|---|---|---|
| archived pending deletion | `archive/pending-deletion/2026-05-17/legacy-playwright-python/` | 24 Python Playwright scripts moved out of active `tests/`. |
| archived pending deletion | `archive/pending-deletion/2026-05-17/legacy-live-login-e2e/` | 10 non-canonical root-level E2E specs/helpers moved out of active `frontend/e2e/`. |
| archived pending deletion | `archive/pending-deletion/2026-05-17/backend-secret-scan-blockers/` | Old direct-production backend repair script removed from active root and sanitized after it blocked secret scanning. |

## Python QA Script Inventory

These were moved in Phase 2 to
`archive/pending-deletion/2026-05-17/legacy-playwright-python/`.

| Path | Initial classification | Phase 1 note |
|---|---|---|
| `tests/comprehensive-smoke.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/live-site-qa.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-ai-assistant-onboarding.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |
| `tests/playwright-auth-dashboard-check.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-claim-flow-smoke.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |
| `tests/playwright-full-workflow-qa.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-live-smoke-test.py` | archived pending deletion | Production URL pattern found. |
| `tests/playwright-login-debug.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-nutrition-ecosystem.py` | archived pending deletion | No longer active QA route; must be reclassified before reuse. |
| `tests/playwright-qa-gamification-security.py` | archived pending deletion | Production URL pattern found; historical doc references only. |
| `tests/playwright-qa-phase2-5-manual-login.py` | archived pending deletion | Production URL pattern found; historical doc references only. |
| `tests/playwright-qa-phase2-5.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |
| `tests/playwright-qa-post-deploy.py` | archived pending deletion | Production URL pattern found. |
| `tests/playwright-qa-session-2026-03-22.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |
| `tests/playwright-qa-social-authenticated.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-qa-social-dashboard.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-qa-social-upgrade.py` | archived pending deletion | No longer active QA route; must be reclassified before reuse. |
| `tests/playwright-qa-social-ux-audit.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |
| `tests/playwright-qa-unauthenticated.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-qa-workout-logger.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-sprint1-qa.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/playwright-userdashboard-check.py` | archived pending deletion | Production URL and hardcoded credential pattern found. |
| `tests/qa-onboarding-implementation.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |
| `tests/qa-rolodex-test.py` | archived pending deletion | Production URL and hardcoded credential pattern found; historical doc references only. |

## Root-Level Artifact Check

| Path | Classification | Note |
|---|---|---|
| `combined.log` | ignored temp artifact | Already covered by `*.log`. Candidate for local cleanup only. |
| `error.log` | ignored temp artifact | Already covered by `*.log`. Candidate for local cleanup only. |
| `frontend/test-results/` | ignored temp artifact | Generated during Playwright verification; candidate for local cleanup only. |
| `tests/__pycache__/` | ignored temp artifact | Python bytecode from retired scripts; candidate for local cleanup only. |
| `tests/qa-screenshots/` | local QA artifact | Screenshots from retired Python QA scripts; candidate for local cleanup only. |
| `tests/screenshots/` | local QA artifact | Screenshots from retired Python QA scripts; candidate for local cleanup only. |

## Gitignore Proposal

No `.gitignore` change is required in this phase. Current ignore rules already
cover root logs, root screenshots, Playwright reports, test results, Python
caches, and legacy QA screenshot folders.

## Phase 2 Candidate Actions

Execution status after Sean approval:

1. Completed: moved 24 `tests/*.py` files to
   `archive/pending-deletion/2026-05-17/legacy-playwright-python/`.
2. Completed: active docs now route agents to the canonical smoke command and
   archive locations. Historical handoff references remain historical context.
3. Completed: moved 10 non-canonical root-level `frontend/e2e/*` specs/helpers
   to `archive/pending-deletion/2026-05-17/legacy-live-login-e2e/`.
4. Completed: approved ignored/local artifacts removed in the Phase 2 cleanup
   pass.
5. Completed: moved `backend/fix-production-admin.mjs` to
   `archive/pending-deletion/2026-05-17/backend-secret-scan-blockers/` and
   removed its credential-shaped database URL fallback.

## Secret-Scan Hardening Addendum

The full tracked-tree secret scan also surfaced older token/key-shaped examples
outside the QA script cleanup surface. These were sanitized in-place because they
blocked the same repository gate:

- `backend/routes/api.http` - replaced JWT literal with placeholder.
- `backend/test-video-library.mjs` - replaced JWT literal with env-only token.
- `backend/test-token.txt` - replaced JWT literal with placeholder.
- `backend/scripts/dev-tool-connection.mjs` - removed interpolated Postgres URL.
- `backend/stripe-key-configurator.mjs` - replaced publishable-key-shaped sample.
- `frontend/.env.production` - replaced tracked Stripe publishable key with
  Render/env placeholder.
- `docs/ai-workflow/VIDEO-LIBRARY-BACKEND-DEPLOYMENT-CHECKLIST.md` - replaced
  credential-shaped database URL example.
- `scripts/deployment/RENDER-ENV-VARIABLES-CHECKLIST.txt` - replaced
  credential-shaped database URL example.

## Hostile Review

- The old test surface was misleading. A file named `comprehensive-smoke.py`
  could fail for stale credentials while the app was healthy, which made it a
  bad smoke gate. It is now outside the active test tree.
- The new launcher fixes discoverability, and Phase 2 removed the biggest
  visual clutter from `tests/` and root-level `frontend/e2e/`.
- The API e2e fixture surface was not cleaned in this pass. It needs its own
  targeted review before any broad claim about all E2E tests being modernized.
