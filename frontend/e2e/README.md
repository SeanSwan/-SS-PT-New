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

- `client-dashboard-oracle-smoke.spec.ts`
- `marketing-native-publishing-smoke.spec.ts`

These specs use mocked auth and API responses where appropriate. Their job is
to prove that the routed UI surfaces render, tabs can be used, responsive layout
does not obviously break, and the browser does not throw console/page errors.

Production smoke sets `SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1`; it targets the
production URL and does not start local backend/frontend servers.
Route assertions that are only valid for a current local product branch should
be opt-in with `SWAN_SMOKE_LOCAL_BUNDLE_ROUTES=1` so the default smoke command
does not depend on unstaged or not-yet-deployed product work.

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
