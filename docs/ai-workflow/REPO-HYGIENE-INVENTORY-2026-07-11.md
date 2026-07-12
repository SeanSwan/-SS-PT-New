# Repository Hygiene Inventory ? Style Lens OS Foundation

- Date: 2026-07-11
- Phase: 1, non-destructive inventory only
- Scope: dashboard appearance, theme, Workout Design Lab, and Lens Foundry surfaces
- Worktree: isolated Style Lens OS foundation branch

## Root classification

| Class | Evidence | Classification | Action |
|---|---|---|---|
| Runtime roots | `frontend/`, `backend/`, `shared/` | active runtime code | Keep in place |
| Operating roots | `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md` | active reference docs | Keep in place |
| Workflow roots | `.ai-workflow/`, `.claude/`, `.agents/`, `docs/ai-workflow/` | active workflow/reference material | Keep in place |
| QA/archive roots | `AI-Village-Documentation/`, `archive/` | mixed active QA and archive records | No movement in this feature slice |
| Configuration | `package.json`, `render.yaml`, env examples | active build/deploy config | Keep in place |

## Competing-surface inventory

| Surface | Evidence | Classification |
|---|---|---|
| `/dashboard/*` | `frontend/src/routes/main-routes.tsx:868-878` mounts `UniversalDashboardLayout` | canonical admin/trainer/client shell |
| `/user-dashboard` | `frontend/src/routes/main-routes.tsx:731-753` mounts `UserDashboard.V3` | canonical user-home shell |
| Workout Design Lab | `UniversalDashboardLayout.routes.tsx:132` and `routeComponents.tsx:62` | canonical admin design lab |
| Global palette picker | `Header/components/ActionIcons.tsx:243` and user-dashboard home sections | canonical palette/motion control |
| Dashboard export copies | `frontend/src/assets/user-dashboard/dashboard-export/` | active reference/QA artifacts, not runtime targets |
| Lens Foundry | local prototype files are not mounted on current `origin/main` | dormant prototype; excluded from S0-S2 |

## Duplicate-route and theme inventory

- The canonical dashboard and user-dashboard routes are separate active shells, not duplicates.
- `DashboardRoutes.tsx` is an alternate wrapper reference; `main-routes.tsx` is the verified application mount.
- The global `UniversalThemeProvider` is canonical.
- `UniversalDashboardLayout.shell.tsx` adds a nested styled-components provider that currently shadows outer palette fields. This is an active defect to remediate, not a cleanup candidate.
- Page-local theme providers outside the shared shell are out of scope and require their own receipts before any future change.

## Candidate archive/move list

No files are proposed for movement during this feature slice. Dashboard export copies and historical Village output require a separate Phase 1 classification pass before any relocation.

## Recurring artifact classes

No new recurring root artifact class was created by this inventory. No `.gitignore` proposal is warranted for S0.

## Phase boundary

This document authorizes no movement, rename, deletion, archive operation, or runtime cleanup. Feature implementation remains surgically scoped to new Style Lens OS files and the verified shared-shell theme boundary.
