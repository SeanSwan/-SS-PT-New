# Canonical Playwright Smoke

Last updated: 2026-05-17

## Purpose

This is the current SwanStudios smoke path for AI agents and humans. It replaces
the old habit of choosing a random `tests/playwright-*.py` or ad hoc e2e file.

## Commands

From the repo root:

```bash
npm run qa:smoke
npm run qa:smoke:prod
```

Equivalent direct command:

```bash
node scripts/qa/playwright-smoke.mjs --prod
```

## Included Specs

- `frontend/e2e/client-dashboard-oracle-smoke.spec.ts`
- `frontend/e2e/marketing-native-publishing-smoke.spec.ts`

The launcher runs both specs against Desktop Chrome and Mobile Chrome by
default.

`npm run qa:smoke:prod` sets `SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1`, so Playwright
does not start local backend/frontend servers while targeting production.
Specs may skip local-bundle assertions so smoke checks only routes that are
expected to exist on the target bundle. Opt into stricter local route checks with
`SWAN_SMOKE_LOCAL_BUNDLE_ROUTES=1 npm run qa:smoke` after the matching product
route changes are part of the local branch.

## Smoke Standard

Canonical smoke specs should:

- use mocked auth and mocked API responses unless the test is explicitly an
  authenticated live-production check
- avoid stored passwords, seeded user assumptions, and live account state
- assert stable product landmarks instead of brittle exact body copy
- fail on real browser/page errors
- capture screenshots through Playwright's output folder, not repo root
- verify at least one desktop and one mobile viewport

## When A Smoke Test Fails

1. Confirm the failing command is `npm run qa:smoke` or
   `npm run qa:smoke:prod`.
2. Read the Playwright failure and screenshot from the test output.
3. Check whether the app surface broke, the mock contract drifted, or a
   selector became stale.
4. Fix the canonical spec or the app surface. Do not switch to a legacy Python
   script to get a passing result.

## Legacy Script Rule

The old `tests/*.py` scripts were moved to
`archive/pending-deletion/2026-05-17/legacy-playwright-python/`.

The old non-canonical `frontend/e2e/*.spec.ts` and one-off audit helpers were
moved to `archive/pending-deletion/2026-05-17/legacy-live-login-e2e/`.

Those files are historical QA scripts unless individually modernized and moved
back. They should not be used as the smoke gate.
