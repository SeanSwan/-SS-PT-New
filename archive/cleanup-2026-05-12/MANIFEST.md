# SwanStudios Cleanup Archive - 2026-05-12

This archive was created during Sean's approved repo cleanup pass on 2026-05-12.
The cleanup moved dormant code and historical reference artifacts out of active
runtime paths while preserving them for restoration if needed.

## Tracked Archive Contents

- `root-dashboard-snapshots/`
  - Root-level dashboard browser snapshot YAML files for admin, client, trainer,
    and user dashboards.
- `root-ad-hoc-notes/`
  - Root-level ad hoc markdown notes that are not part of the active load order.
- `frontend-dead-code/`
  - Dormant user dashboard implementations and legacy subcomponents no longer
    mounted by the canonical `/user-dashboard` route.
  - The active route remains `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`.

## Related QA Archive

- `docs/qa/archive/2026-05-12/root-captures/`
  - Tracked root capture moved out of the repo root.
- `docs/qa/archive/2026-05-12/qa-screenshots-2026-04-04/`
  - Dated QA screenshot run moved out of the repo root.

## Local Ignored Archive

Generated captures, logs, temp files, root-level orphan drafts, and Playwright MCP
captures were moved to:

`<REPO>/.swan/archive/cleanup-2026-05-12/`

That folder is intentionally gitignored. It preserves local recovery copies while
keeping regenerated logs, screenshots, and potentially sensitive browser-capture
artifacts out of tracked project paths.

## Reference Checks

Before archiving the UserDashboard files, the active frontend tree was searched
for imports/references to the dormant implementations and old subcomponents.
The only mounted dashboard route continues to import `UserDashboard.V3`.
