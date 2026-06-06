# Frontend E2E Map

This folder contains the active Playwright coverage for the SwanStudios
frontend. The canonical smoke suite is intentionally small, production-safe, and
runnable by AI agents without live credentials.

## Canonical Smoke

Run from the repo root:

```bash
npm run qa:smoke
npm run qa:smoke:prod
```

The launcher lives at `scripts/qa/playwright-smoke.mjs` and currently runs:

- `admin-compliance-truth-smoke.spec.ts`
- `admin-workout-surfaces-protected-smoke.spec.ts`
- `client-dashboard-oracle-smoke.spec.ts`
- `gamification-hub-smoke.spec.ts`
- `marketing-native-publishing-smoke.spec.ts`
- `nutrition-workspace-smoke.spec.ts`
- `plaud-playback-smoke.spec.ts`
- `session-allocation-live-smoke.spec.ts`
- `social-challenges-truth-smoke.spec.ts`
- `social-notifications-smoke.spec.ts`
- `storefront-truth-smoke.spec.ts`
- `trainer-my-clients-truth-smoke.spec.ts`
- `trainer-permissions-truth-smoke.spec.ts`
- `workout-logger-error-truth-smoke.spec.ts`

These specs use mocked auth and API responses where appropriate. Their job is
to prove that the routed UI surfaces render, tabs can be used, responsive layout
does not obviously break, and the browser does not throw console/page errors.

Production smoke sets `SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1`; it targets the
production URL and does not start local backend/frontend servers.
Route assertions that are only valid for a current local product branch should
be opt-in with `SWAN_SMOKE_LOCAL_BUNDLE_ROUTES=1` so the default smoke command
does not depend on unstaged or not-yet-deployed product work.

## Mission QA

Mission QA is a separate, opt-in suite under `e2e/mission/`. It tests whether
SwanStudios supports the intended training operations loop, not only whether
routes render.

Run from the repo root:

```bash
npm run qa:mission
npm run qa:mission:prod-readonly
npm run qa:mission:prod-live-readonly
npm run qa:prod-auth:capture:admin
npm run qa:mission:cleanup
npm run qa:mission:report
```

The launcher lives at `scripts/qa/playwright-mission.mjs`. Default mission mode
is contract/read-only: tests use mission-shaped data, block API writes, and tag
coverage with `@mission`, `@contract`, or `@readonly`. Write-heavy staging tests
must use `@write`, isolated QA personas under `@swanstudios-qa.local`, explicit
launcher write flags, and a non-production database.

`qa:mission:prod-readonly` tests the production bundle with mocked mission data.
`qa:mission:prod-live-readonly` hits real production GET routes and blocks every
write method. Authenticated production dashboard checks are skipped unless
`SWAN_PROD_ADMIN_AUTH_STATE`, `SWAN_PROD_TRAINER_AUTH_STATE`, or
`SWAN_PROD_CLIENT_AUTH_STATE` points at a local Playwright storage-state file
under an ignored directory such as `.auth/`. `SWAN_PROD_AUTH_STATE` is still
accepted as a generic client fallback.

`qa:mission:cleanup` is dry-run by default and stays scoped to
`@swanstudios-qa.local` records. `qa:mission:report` writes a markdown evidence
artifact under `docs/qa/reports/`.

## API Specs

Specs under `e2e/api/` are not part of the credential-free canonical smoke
launcher. Authenticated API specs require env-only credentials:
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_CLIENT_EMAIL`, and
`E2E_CLIENT_PASSWORD`. Do not add hardcoded production, personal, or local seed
credentials to active E2E tests.

## Non-Canonical Specs

Legacy root-level specs and one-off audit helpers were moved out of this folder
on 2026-05-17 to:

`archive/pending-deletion/2026-05-17/legacy-live-login-e2e/`

Before restoring one as authoritative, check whether it depends on:

- live production credentials
- seeded production database state
- old route text or exact button copy
- screenshots or manual login timing

If a test depends on those, modernize it into the canonical style before moving
it back into this active folder.
