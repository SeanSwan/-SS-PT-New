# SwanStudios Repo Hygiene Inventory - 2026-05-15

## Scope

This is a non-destructive Phase 1 cleanup inventory for SwanStudios. It focuses on old dashboards, old server monitors, stale launchers, deployable public artifacts, MCP leftovers, broken package scripts, and duplicate surfaces that make the repo harder for humans and AI agents to reason about.

No files were moved or deleted in this inventory pass.

## Commands Run

- `Get-ChildItem -Force`
- `rg --files | Measure-Object`
- `git status --short`
- `rg --files frontend/public`
- `git ls-files frontend/public/...`
- `rg -n "test-routing\.html|vite\.svg|react\.svg|VIDEO_POSTER_MISSING|vercel\.json|clear-cache\.js|emergency-bootstrap"`
- `rg -n "gamification-backend|backend/mcp_server|mcp_server|START-ALL-MCP|GAMIFICATION_MCP_URL|WORKOUT_MCP_URL|ENABLE_MCP"`
- `git ls-files frontend/src/_archived frontend/src/components/old frontend/src/pages/old frontend/src/services/old frontend/src/utils/old gamification-backend`
- `rg -n "_archived|services/old|utils/old|gamification-backend"`
- `rg -n "DashboardRoutes|UnifiedAdminRoutes|UserDashboard\.V3|client-dashboard|dashboard/client"`
- package script existence check for `node <file>` targets
- cleanup-directory secret pattern scan for public/reference/archive candidates

## High-Level Counts

| Area | Count / Finding | Interpretation |
|---|---:|---|
| Repo files visible to `rg --files` | 6146 | Large enough that stale surfaces materially affect AI navigation. |
| Tracked files | 7245 | Includes runtime, docs, tests, archived docs, and old surfaces. |
| `frontend/public` files | 46 visible through `rg --files`, plus hidden `.htaccess` | Public folder is cleaner than before, but still ships old emergency/test artifacts. |
| `frontend/src/_archived` | 42 tracked files | Already classified as archived/dead/future but still inside `src`, which keeps it in TypeScript/tooling search scope. |
| `gamification-backend` | 8 tracked files | Separate old service with no active repo references found outside hygiene docs. |
| `scripts` files | 297 tracked files | Many are already under archived folders, but active script roots still contain stale/broken launchers and broad one-off utilities. |

## Root Directory Classification

| Path | Classification | Evidence | Recommendation |
|---|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md` | active operating docs | Required by project instructions and continuity workflow. | Keep at root. |
| `package.json`, `render.yaml`, `render.env.example`, `.env.example` | active deployment/setup docs | Root build and Render config depend on these. | Keep, but update MCP wording in `.env.example` in a separate config cleanup. |
| `.mcp.json` | active local AI tool config | Contains only Playwright MCP config, not old Swan MCP services. | Keep; not part of Swan MCP retirement. |
| `run-seeder.bat` | orphaned candidate | Calls `restore-swan-packages.mjs`, which does not exist. | Archive after approval, or replace with a valid launcher if still needed. |
| root `coach-assistant-mobile-dock-v2-*.png` | local QA artifacts | Ignored by `.gitignore` root `/*.png`; not tracked. | Delete locally or move to QA archive after approval. |
| root `combined.log`, `error.log` | local temp artifacts | Ignored by `*.log`; not tracked. | Delete locally after approval. |

## Public Folder Findings

These files ship with the frontend static site because Vite copies `frontend/public` into `dist`.

| Path | Classification | Evidence | Risk | Recommendation |
|---|---|---|---|---|
| `frontend/public/emergency-bootstrap.html` | orphaned public artifact | Tracked; no source references found. Contains localStorage admin/emergency bypass flags. | High confusion/security posture risk if someone finds or copies it. | Archive/remove from public in first cleanup slice. |
| `frontend/public/clear-cache.js` | orphaned public artifact | Tracked; no source references found. Clears localStorage/sessionStorage/cache if visited. | High user-data disruption risk if exposed. | Archive/remove from public in first cleanup slice. |
| `frontend/public/test-routing.html` | orphaned public artifact | Tracked; no source references found. Uses retired Galaxy colors. | Low-to-medium public polish/confusion risk. | Archive/remove from public. |
| `frontend/public/VIDEO_POSTER_MISSING.md` | orphaned public artifact | Tracked; only self-references and archived docs mention it. | Low public polish risk; docs should not ship as web assets. | Move to docs/archive or delete after approval. |
| `frontend/public/vercel.json` | wrong-host public artifact | Tracked and copied to dist; Render uses `render.yaml`, not public Vercel config. | Medium host-config confusion. | Move to deployment docs/archive unless still intentionally used for a Vercel mirror. |
| `frontend/public/vite.svg`, `frontend/public/react.svg` | default template assets | Tracked; no active source references found. | Low polish/confusion risk. | Archive/remove from public. |
| `frontend/public/.htaccess` | legacy Apache deploy config | Tracked; public search only finds old docs. | Low-to-medium host confusion; Render does not need Apache rewrite config. | Archive unless a separate Apache deployment still exists. |
| `frontend/public/_headers` | ambiguous deploy config | Netlify-style headers; Render config already has static routes, but headers may be harmless. | Ambiguous. | Keep until hosting behavior is confirmed. |
| `frontend/public/_redirects` | ambiguous deploy config | Says Render SPA redirect; Render also has `render.yaml` routes. | Ambiguous. | Keep until hosting behavior is confirmed. |
| `frontend/public/spa-sw.js` | active runtime public asset | Registered by `frontend/src/utils/spaRoutingFix.js` and `frontend/src/utils/serviceWorkerRegistration.js`. | Active. | Keep. |
| `frontend/public/badge-manifest.json` | active runtime data | Referenced by badge/gallery docs and frontend badge components. | Active. | Keep. |
| `frontend/public/browserconfig.xml`, `robots.txt`, `sitemap.xml`, favicons, logos | active public metadata/assets | Referenced by `frontend/index.html` or SEO docs. | Active. | Keep, review content separately. |

## Old Dashboard / Route Surface Classification

| Surface | Classification | Evidence | Recommendation |
|---|---|---|---|
| `/dashboard/*` -> `UniversalDashboardLayout` | canonical active | `frontend/src/routes/main-routes.tsx` mounts `path: 'dashboard/*'` to `UniversalDashboardLayout`; client route map lives in `UniversalDashboardLayout.tsx`. | Keep as source of truth. |
| `/dashboard/client/*` client route set | canonical active | `UniversalDashboardLayout.tsx` mounts overview, workouts, log-workout, progress, schedule, community, messages, profile, rewards, etc. | Keep and continue feature work here. |
| `/user-dashboard` | legacy redirect | `main-routes.tsx` redirects `path: 'user-dashboard'` to `/dashboard/client/overview`. | Keep redirect; do not reintroduce competing shell without a route decision. |
| `frontend/src/components/UserDashboard` | active shared/reference, not canonical route | `/user-dashboard` no longer imports it, but canonical client profile uses pieces such as `ProfileChartsGrid` and chart toggles. Tests also enforce route redirect and dashboard contracts. | Do not archive wholesale. Later split reusable pieces from dormant V3 shell code. |
| `frontend/src/assets/user-dashboard/dashboard-export` | active design reference | 54 tracked files; docs and Oracle packet cite it as the visual target. | Keep for now. Later move to `docs/design/reference/` only after code import checks. |
| `frontend/src/components/ClientDashboard` | legacy/ambiguous | `main-routes.tsx` defines lazy imports for `RevolutionaryClientDashboard` and `NewDashboard`, but only `EmergencyDashboard` is rendered at `emergency-admin`; several files still reference MCP compatibility hooks. | Do not archive wholesale. First remove unused lazy declarations and classify each exported section. |
| `frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx` + `UnifiedAdminRoutes.tsx` | legacy/dormant candidate | `main-routes.tsx` defines `AdminDashboardLayout` lazy import but no mount was found; comments/tests say UnifiedAdminRoutes went dead when UniversalDashboardLayout became live. | Archive in a dedicated admin-route cleanup slice after updating tests that intentionally read these files. |
| `frontend/src/routes/DashboardRoutes.tsx` | dormant route file | No import found outside comments/tests. It separately mounts `/dashboard/*`, duplicating main route behavior. | Archive after a route-tree test confirms `main-routes.tsx` is the only app route source. |
| `frontend/src/components/DashBoard/routes/AdminRoutes.tsx` | dormant route file | No active import found; only verification script and comments reference it. | Archive after admin route smoke confirms no active consumer. |
| `frontend/src/_archived/dead` | archive-only historical record, currently in `src` | 27 dead files, and past docs note `_archived/dead/*` caused type-check baseline noise. | Move out of `frontend/src` to repo archive after approval. |
| `frontend/src/_archived/future` | planned/unimplemented blueprint, currently in `src` | 15 reports blueprint files under `_archived/future`. | Move to `docs/blueprints` or repo archive after approval. |
| `frontend/src/services/old`, `frontend/src/utils/old` | archive-only historical records | Only archive docs reference these old backup files. | Move out of `frontend/src` after approval. |

## MCP Retirement Findings

| Path / Surface | Classification | Evidence | Recommendation |
|---|---|---|---|
| `backend/routes/mcpRoutes.mjs`, `backend/routes/adminMcpRoutes.mjs` | active fail-closed adapters | Still imported by `backend/core/routes.mjs`; gated by `ENABLE_MCP_ROUTES === 'true'` and return retired responses. | Keep. |
| `backend/utils/monitoring/mcpHealthManager.mjs`, `backend/services/monitoring/MCPAnalytics.mjs` | active fail-closed/compatibility code | Still imported by AI services and tests; master switch is `ENABLE_MCP_SERVICES === 'true'`. | Keep until AI monitoring refactor replaces names. |
| `frontend/src/services/mcp/*` | active compatibility adapters | Imported by `AIDashboard`, `OverwatchGamificationHub`, `useGamificationMcp`, `GamificationDisplay`, and tests. | Keep; do not archive in broad MCP cleanup. |
| `scripts/development/start-quick.mjs` | active stale launcher candidate | Still contains `mcp` command and references deleted `backend/mcp_server` paths. | Patch or archive MCP mode in next cleanup slice. |
| `.env.example` | active setup doc with stale MCP URLs | Contains localhost MCP URL defaults. | Patch to blank/retired wording in config cleanup slice. |
| `docs/current/*MCP*` and `docs/ai-workflow/MCP-*` | active/legacy docs, mixed | Several current docs still present MCP as active architecture. | Move outdated MCP docs to archive and update `docs/current/CURRENT_ARCHITECTURE.md`. |
| `archive/pending-deletion/2026-05-15/mcp-retirement` | pending-deletion archive | Created by prior MCP archive pass. | Keep until Sean approves final deletion or long-term archive retention. |

## Old Separate Services

| Path | Classification | Evidence | Recommendation |
|---|---|---|---|
| `gamification-backend/` | orphaned candidate | 8 tracked files; no active references found outside old hygiene docs. Main backend now owns gamification API routes. | Archive in a backend cleanup slice after backend tests pass. |

## Broken Package Scripts

The backend package has script targets that no longer exist. These are not runtime imports, but they create false affordances and will waste future debugging time.

| Package | Script | Missing Target |
|---|---|---|
| `backend/package.json` | `seed-storefront` | `backend/scripts/seed-storefront-items.mjs` |
| `backend/package.json` | `fix-server` | `backend/fix-server.mjs` |
| `backend/package.json` | `fix-models` | `backend/fix-remaining-models.mjs` |
| `backend/package.json` | `fix-all` | `backend/fix-server.mjs`, `backend/fix-remaining-models.mjs` |
| `backend/package.json` | `start-fixed` | `backend/fix-server.mjs`, `backend/fix-remaining-models.mjs` |
| `backend/package.json` | `seed-final-packages` | `backend/seeders/20250517-final-storefront-packages.mjs` |
| `backend/package.json` | `verify-packages` | `verify-packages.mjs` at repo root |
| `backend/package.json` | `production-debug` / `render-debug` | `backend/render-production-debug.mjs` |
| `backend/package.json` | `production-verify` / `render-verify` | `backend/render-production-verify.mjs` |

Recommendation: remove or replace these scripts in a package-hygiene slice. Keep `start`, `dev`, migrations, tests, evals, and current Render start scripts.

## Active Product Truth Risks Found During Cleanup Audit

These are not archive candidates by themselves, but they are examples of old code still shaping the product.

| Surface | Finding | Risk | Recommendation |
|---|---|---|---|
| `/gamification` | `AdvancedGamificationPage.tsx` is a build-safe temporary page with hardcoded stats and "coming soon" copy. | Sean/admin/client cannot use this as a real gamification validation surface. | Replace route with canonical gamification data UI or redirect to `/dashboard/client/rewards` / admin gamification route. |
| `AdvancedGamification` component set | Several hooks/components use mock/sample data and TODO API comments. | Conflicts with goal that points/levels/challenges are real. | Audit and either wire to `useGamificationData`/API or archive as blueprint. |
| `frontend/src/components/ClientDashboard` | Some legacy sections still import MCP compatibility hooks. | Can confuse future fixes if touched instead of canonical `/dashboard/client/*` pages. | Classify per-file before moving; keep adapters until no active consumer remains. |
| public emergency/test artifacts | Old emergency HTML and cache reset script ship publicly. | Public artifact and operator confusion risk. | First cleanup slice should remove these from `frontend/public`. |

## Proposed Cleanup Slices

### Slice A - Public Deployable Junk

Archive/remove from `frontend/public` after approval:

- `emergency-bootstrap.html`
- `clear-cache.js`
- `test-routing.html`
- `VIDEO_POSTER_MISSING.md`
- `vercel.json`
- `vite.svg`
- `react.svg`
- `.htaccess`

Keep pending verification:

- `_headers`
- `_redirects`
- `spa-sw.js`
- `badge-manifest.json`
- metadata/assets referenced by `index.html`, manifest, or runtime fetches

Verification:

- `cd frontend && npm run build`
- Confirm `dist` no longer contains public emergency/test files.
- Production smoke: `/`, `/dashboard/client/overview`, `/dashboard/admin/overview`, static assets, service worker.

### Slice B - Broken Scripts and Launchers

Patch:

- remove or repair missing backend package scripts
- remove MCP mode from `scripts/development/start-quick.mjs`
- update `.env.example` MCP URL defaults to retired/blank behavior
- classify `run-seeder.bat`

Verification:

- package script existence checker returns no missing `node <file>` targets for active scripts.
- backend tests for MCP retirement still pass.
- root and backend `npm run` smoke for kept scripts.

### Slice C - Move Archived Code Out Of `frontend/src`

Move after approval:

- `frontend/src/_archived/dead` -> `archive/pending-deletion/2026-05-15/frontend-src-archived/dead`
- `frontend/src/_archived/future` -> `docs/ai-workflow/blueprints/frontend-future-reports` or archive
- `frontend/src/services/old`
- `frontend/src/utils/old`

Verification:

- `rg -n "_archived|services/old|utils/old" frontend/src` only returns docs/tests that were intentionally updated.
- `cd frontend && npm run build`
- `cd frontend && npx tsc --noEmit` if baseline is recoverable.

### Slice D - Dormant Route Shells

Candidate archive after approval and route tests:

- `frontend/src/routes/DashboardRoutes.tsx`
- `frontend/src/components/DashBoard/routes/AdminRoutes.tsx`
- `frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx`
- `frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx`

Do not move until:

- tests that intentionally read `UnifiedAdminRoutes.tsx` are updated or retired
- `main-routes.tsx` and `UniversalDashboardLayout.tsx` route receipts are refreshed
- admin dashboard Playwright smoke passes

### Slice E - Old Separate Gamification Service

Archive after backend verification:

- `gamification-backend/`

Verification:

- `rg -n "gamification-backend"` only returns this inventory and prior archive docs.
- backend gamification tests pass.
- production/backend build still starts.

### Slice F - Active Product Truth Cleanup

Not a pure archive slice:

- Replace `/gamification` hardcoded temporary page.
- Audit `AdvancedGamification` mock-data hooks/components.
- Decide whether UserDashboard V3 files are active shared component library, design reference, or archive candidate after route migration is complete.

## .gitignore Proposal

Current `.gitignore` already covers:

- root `/*.png`
- `*.log`
- `.playwright-mcp/`
- `.codex-smoke/*.log` via `*.log`
- `tmp/`, `temp/`

Recommended addition in a later approved `.gitignore` slice:

- root `/*.jpg`, `/*.jpeg`, `/*.webp` for accidental screenshot drops
- `.codex-smoke/` entire directory
- `frontend/.playwright-screenshots/` if still generated
- root `*-smoke-*.json` / `*-qa-*.json` if recurring QA dumps reappear

## Hostile Review

Verdict: REVISE BEFORE PHYSICAL CLEANUP.

Findings:

1. The public folder has high-confidence cleanup targets that should not ship with the static site, especially `emergency-bootstrap.html` and `clear-cache.js`.
2. The MCP cleanup must not move fail-closed adapters that are still imported by backend and frontend compatibility paths.
3. `frontend/src/_archived` is already archived in intent but still harms tooling/search because it lives under `src`.
4. Several dormant route shells are real cleanup candidates, but tests still intentionally read at least `UnifiedAdminRoutes.tsx`, so moving those files must be a coordinated test/code cleanup slice.
5. The active `/gamification` route is not enterprise-ready; it shows hardcoded stats and "coming soon" copy. That is a product truth problem, not just file clutter.
6. Backend package scripts contain missing targets. This is a concrete broken affordance and should be fixed before future production debugging.

Conclusion: The safest next move is Slice A, then Slice B. Do not attempt a single giant deletion commit.
