# Safe Delete Queue

Items in `archive/pending-deletion/` that have passed verification and can be permanently deleted.

**Protocol:** After 7 days with no regressions, items move from "eligible" to "approved for deletion."

---

## Eligible for Permanent Deletion (post-verification)

### Batch 1+2 (archived 2026-02-13, verified same day)

| Category | Files | Size | Verification |
|----------|-------|------|-------------|
| Backend controller backups | 2 | ~51K | 155/155 tests pass |
| Backend archived routes | 2 | ~20K | 155/155 tests pass |
| Backend unused model | 1 | ~8K | 155/155 tests pass |
| Backend unused admin scripts | 13 | ~150K | 155/155 tests pass |
| Backend unified-ai-server | 2 | ~10K | 155/155 tests pass |
| Frontend entry variants | 9 | ~30K | Build succeeds |
| Frontend test components | 8 | ~20K | Build succeeds |
| Frontend old pages | 5 | ~60K | Build succeeds |
| Frontend old shop pages | 12 | ~80K | Build succeeds |
| Frontend old components | 5 | ~40K | Build succeeds |
| Frontend archived Payment | 6 | ~100K | Build succeeds |
| Frontend archived Checkout | 8 | ~80K | Build succeeds |
| Frontend progress backups | 2 | ~30K | Build succeeds |
| Frontend header backups | 2 | ~20K | Build succeeds |
| **Total** | **77** | **~710K** | |

**Earliest safe delete date:** 2026-02-20

### Phase 2 (archived 2026-02-13, verified same day)

| Category | Files | Size | Verification |
|----------|-------|------|-------------|
| Backend mcp_server Python servers | 137 | ~200K | 155/155 tests pass |
| Backend deprecated scripts | 2 | ~8K | 155/155 tests pass |
| Backend backup scripts | 6 | ~15K | 155/155 tests pass |
| Backend root BACKUP files | 2 | ~5K | 155/155 tests pass |
| **Phase 2 Total** | **147** | **~228K** | |

**Earliest safe delete date:** 2026-02-20

---

## Not Yet Eligible

| Item | Reason | Action Needed |
|------|--------|---------------|
| Frontend MCP hooks (11 files) | Actively imported — now conditionally gated via `VITE_ENABLE_MCP_SERVICES` | Verify gating works in production, then decide: keep as opt-in feature or archive |
| Design Playground (~29 files) | Now guarded by `VITE_DESIGN_PLAYGROUND` — not accessible in production | Keep until design phase completes |
| 162 root-level backend scripts | Organizational debt — useful but scattered | Reorganize into subdirectories (future phase) |
| 120+ root screenshots | Untracked — now in .gitignore | User can delete locally |
| .exe files in frontend/assets | Untracked — now in .gitignore | User can delete locally |

---

## Permanent Deletion Command

When items are approved:
```bash
# Remove the entire archive directory
git rm -r archive/pending-deletion/2026-02-13/
git commit -m "chore(refactor): permanently delete verified bloat from 2026-02-13 archive"
```
