# Regression Verification — Refactor Sprint

---

## Verification #1 — After Batch 1+2 Archive (2026-02-13)

**Archived:** 77 files (20 backend: controllers, routes, model, scripts, unified-ai-server; 57 frontend: backups, old pages, archived components)
**Removed:** mysql2 dependency

### Backend Tests
```
Test Files  9 passed (9)
Tests       155 passed (155)
Duration    852ms
```
**Result:** PASS — zero regressions

### Frontend Build
```
vite build --mode production
✓ built in 7.54s
```
**Result:** PASS — zero import breakage

### Critical Paths Not Yet Verified (require production deploy)
- [ ] Auth login/logout
- [ ] Store packages load
- [ ] Schedule sessions visible
- [ ] Admin dashboard accessible
- [ ] Inactive user login blocked

**Note:** These archives only moved files already confirmed unused. No production smoke needed for this batch since no runtime code changed.

---

## Verification #2 — Phase 2: Conditional Gating + mcp_server Archive (2026-02-13)

**Changes:**
- Archived `backend/mcp_server/` Python directory (137 files) to `archive/pending-deletion/2026-02-13/backend-mcp-server-python/`
- Archived 10 deprecated/backup scripts (deprecated/, backup/, root BACKUP files)
- Added MCP service-level short-circuit via `VITE_ENABLE_MCP_SERVICES` flag in `mcpConfig.ts`
- Added `VITE_DESIGN_PLAYGROUND` build-time guard to Design Playground routes + dashboard tabs
- Fixed .gitignore scope (*.ipynb → /*.ipynb, *.exe → frontend/src/assets/*.exe)
- Fixed archive count in ARCHIVE-MANIFEST.md and SAFE-DELETE-QUEUE.md (63 → 77)

### Backend Tests
```
Test Files  9 passed (9)
Tests       155 passed (155)
Duration    859ms
```
**Result:** PASS — zero regressions

### Frontend Build
```
vite build --mode production
✓ built in 6.95s
```
**Result:** PASS — zero import breakage

### Production Smoke Required
This phase modifies runtime code (MCP gating, Design Playground guards). Production smoke recommended after deploy:
- [ ] MCP health endpoint returns disabled status
- [ ] McpStatusDot does not poll when VITE_ENABLE_MCP_SERVICES=false
- [ ] Design Playground routes return 404 in production
- [ ] Admin dashboard does not show Design Playground tab in production
- [ ] Auth, Store, Schedule all functional

---

## Verification Template

### Verification #N — [description]
**Date:** YYYY-MM-DD
**Changes:** [what was archived/removed]

#### Backend Tests
```
[paste test output]
```

#### Frontend Build
```
[paste build output]
```

#### Production Smoke (if needed)
| Check | Result |
|-------|--------|
| API Health | |
| Login | |
| Store | |
| Schedule | |
| Dashboard | |

**Result:** PASS / FAIL
