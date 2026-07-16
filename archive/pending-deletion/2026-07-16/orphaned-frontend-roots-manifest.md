# Orphaned Frontend Roots and Pseudo-Integration Components Archive - 2026-07-16

## Purpose

This companion manifest records eleven unimported frontend roots, pseudo-integration components, and unused primitives moved during the pre-launch audit. Original paths remain recoverable; no file was deleted.

## Evidence

- Production Fallow classified every file as unreachable.
- Exact symbol/path/import searches found no source consumer or route mount.
- The mounted dashboard is `UniversalDashboardLayout` through `main-routes.tsx:873-877`; the archived `DashboardRoutes.tsx` and `DashboardView` island were not mounted.
- The gated Design Playground route mounts `DesignPlaygroundLayout`, not the archived older root.
- Active `Breadcrumbs.tsx` and `progress.tsx` have real consumers and were explicitly retained.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/TrainerDashboard/WorkoutLogging/IntegrationTest.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/TrainerDashboard/WorkoutLogging/IntegrationTest.tsx` | unlaunched pseudo-integration UI component |
| `frontend/src/components/TrainerDashboard/ClientManagement/IntegrationTest.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/TrainerDashboard/ClientManagement/IntegrationTest.tsx` | unlaunched pseudo-integration UI component |
| `frontend/src/components/DashboardView/DashboardPage.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashboardView/DashboardPage.tsx` | closed legacy dashboard root |
| `frontend/src/routes/DashboardRoutes.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/routes/DashboardRoutes.tsx` | closed legacy dashboard root |
| `frontend/src/components/DashboardWrapper/DashboardWrapper.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashboardWrapper/DashboardWrapper.tsx` | closed legacy dashboard root |
| `frontend/src/components/DashboardWrapper/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashboardWrapper/index.ts` | closed legacy dashboard root |
| `frontend/src/pages/DesignPlayground/DesignPlayground.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/DesignPlayground/DesignPlayground.tsx` | superseded design-playground root |
| `frontend/src/routes/Loadable.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/routes/Loadable.tsx` | unimported helper or primitive |
| `frontend/src/routes/fallback-components/FallbackHomePage.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/routes/fallback-components/FallbackHomePage.tsx` | unimported helper or primitive |
| `frontend/src/components/ui/logo.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/logo.tsx` | unimported helper or primitive |
| `frontend/src/components/ui/pagination.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/pagination.tsx` | unimported helper or primitive |

## Restore procedure

Restore only after proving a mounted consumer and product need, then rerun the relevant dashboard/design route contracts, typecheck, production build, full frontend suite, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
