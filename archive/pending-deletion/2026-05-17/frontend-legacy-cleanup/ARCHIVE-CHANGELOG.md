# Frontend Legacy Archive Changelog - 2026-05-17

Scope: frontend-only relocation of legacy/orphaned surfaces out of `frontend/src`.

Verification rule: only items with route/import checks showing no current route mount were moved. `frontend/src/components/AdvancedGamification` was restored after the post-move reference check proved active admin/trainer/client gamification imports still use it.

## Directory Moves

| Original path | Archived path | Classification |
|---|---|---|
| `frontend/src/components/ClientDashboard/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/ClientDashboard/` | legacy dashboard tree; active emergency fallback was moved out before archive |
| `frontend/src/components/WearableData/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/WearableData/` | orphaned candidate based on current grep |
| `frontend/src/components/DashBoard/Pages/admin-gallery/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/DashBoard/Pages/admin-gallery/` | orphaned candidate based on current grep |
| `frontend/src/components/Client/NASM/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/Client/NASM/` | orphaned candidate based on current grep |
| `frontend/src/components/DashBoard/Pages/client-gamification/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/DashBoard/Pages/client-gamification/` | dormant gamification surface; active gamification routes use other components |
| `frontend/src/components/DashBoard/Pages/client-dashboard/components/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/DashBoard/Pages/client-dashboard/components/` | old client-dashboard component set consumed only by archived fallback dashboard |
| `frontend/src/components/DashBoard/Pages/client-dashboard/hooks/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/DashBoard/Pages/client-dashboard/hooks/` | old fallback dashboard hook consumed only by archived fallback dashboard |
| `frontend/src/components/DashBoard/Pages/client-dashboard/types/` | `archive/pending-deletion/2026-05-17/frontend-legacy-cleanup/frontend/src/components/DashBoard/Pages/client-dashboard/types/` | old fallback dashboard types consumed only by archived fallback dashboard |

## File Moves

See `ARCHIVE-MANIFEST.tsv` in this folder for the full file-by-file `original_path -> archived_path` list.

Not archived in this pass:

- `frontend/src/components/AdvancedGamification/` because active admin/trainer/client gamification surfaces still import component modules from it.
- Current `/user-dashboard` V3 files.
- Current `/dashboard/client/*` route-mounted files.
- Backend files.
