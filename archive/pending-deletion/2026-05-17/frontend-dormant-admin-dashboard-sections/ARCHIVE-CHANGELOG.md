# Frontend Dormant Admin Dashboard Sections Archive

Date: 2026-05-17

## Decision

Archived the historical `frontend/src/components/DashBoard/Pages/admin-dashboard/sections` folder.

## Import Proof

The folder README already identified these modules as older admin-dashboard sections and pointed new admin UX work to the current workspace modules. Targeted `rg` checks showed the remaining references were the dormant `frontend/src/components/DashBoard/index.ts` re-export and a source-text fixture row in `frontend/src/utils/imageUrl.siblingSweep.test.ts`.

This slice removes those stale active-source references, then archives the section files as a group.

## Reason

These files carried heavy lint and inline-style debt but are not mounted by `UniversalDashboardLayout`. Keeping them active made cleanup passes chase old admin UI variants instead of production-reachable admin workspaces.
