# Unmounted Dashboard Shells Archive - 2026-05-15

## Scope

Moved dashboard route shells that are no longer mounted by the active route tree. The canonical dashboard shell is `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`.

## Archived Files

- `frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx`
- `frontend/src/components/DashBoard/UnifiedAdminRoutes.tsx`
- `frontend/src/components/DashBoard/routes/AdminRoutes.tsx`
- `frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx`

## Active Replacements

- Admin/client/trainer role routes: `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`
- Clients & Team workspace: `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx`

## Verification

Before moving, grep showed these files were referenced by tests, docs, comments, or their own unmounted parent only. Runtime mounts resolve through `main-routes.tsx` -> `UniversalDashboardLayout.tsx`.
