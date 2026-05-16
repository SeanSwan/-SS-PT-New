# Bloat Inventory — SwanStudios Refactor Sprint

**Generated:** 2026-02-13
**Status:** Phase 1 — Complete (77 files archived in commit d1818561). Phase 2 in progress.

---

## Category Summary

| Category | Files | Est. Size | Risk | Status |
|----------|-------|-----------|------|--------|
| Backend controller backups | 2 | 51K | LOW | ARCHIVE BATCH 1 |
| Backend archived routes | 2 | ~20K | LOW | ARCHIVE BATCH 1 |
| Backend unused model | 1 | ~8K | LOW | ARCHIVE BATCH 1 |
| Backend unused directory (unified-ai-server) | ~10 | ~50K | LOW | ARCHIVE BATCH 1 |
| Backend Python MCP servers | ~30 | ~200K | MEDIUM | REVIEW_REQUIRED |
| Backend unused admin scripts | 13 | ~150K | LOW | ARCHIVE BATCH 1 |
| Backend unused dependency (mysql2) | 1 pkg | N/A | LOW | ARCHIVE BATCH 1 |
| Frontend main.jsx variants | 6 | ~30K | LOW | ARCHIVE BATCH 2 |
| Frontend App.tsx variants | 3 | ~15K | LOW | ARCHIVE BATCH 2 |
| Frontend test/minimal components | 6 | ~20K | LOW | ARCHIVE BATCH 2 |
| Frontend archived pages (old/) | 5 | ~60K | LOW | ARCHIVE BATCH 2 |
| Frontend archived shop pages | 12 | ~80K | LOW | ARCHIVE BATCH 2 |
| Frontend archived components | 5 | ~40K | LOW | ARCHIVE BATCH 2 |
| Frontend archived Payment components | 6 | ~100K | LOW | ARCHIVE BATCH 2 |
| Frontend archived Checkout components | 8 | ~80K | LOW | ARCHIVE BATCH 2 |
| Frontend progress backups | 2 | ~30K | LOW | ARCHIVE BATCH 2 |
| Frontend header backups | 2 | ~20K | LOW | ARCHIVE BATCH 2 |
| Frontend .exe files (untracked) | 2 | ~550K | LOW | GITIGNORE + NOTE |
| Root screenshots (untracked) | 120+ | 47 MB | LOW | GITIGNORE + NOTE |
| Root temp files (untracked) | 2 | ~64K | LOW | GITIGNORE + NOTE |
| Frontend MCP hooks/services (active) | 11 | ~100K | HIGH | REVIEW_REQUIRED |
| Design Playground (missing guard) | ~25 | ~150K | HIGH | REVIEW_REQUIRED |

**Total identified:** ~275 files, ~49 MB

---

## Batch 1 — Backend Code (LOW risk, verified unused)

### Controllers
| File | Evidence | Risk |
|------|----------|------|
| `controllers/authController-FIXED.mjs` | Zero imports. Active: authController.mjs | LOW |
| `controllers/videoLibraryController-BUGGY-BACKUP.mjs` | Zero imports. Doc says "can be safely deleted" | LOW |

### Routes
| File | Evidence | Risk |
|------|----------|------|
| `routes/_ARCHIVED/checkoutRoutes.mjs` | Commented out in core/routes.mjs. Replaced by v2PaymentRoutes | LOW |
| `routes/_ARCHIVED/paymentRoutes.mjs` | Commented out in core/routes.mjs. Replaced by v2PaymentRoutes | LOW |

### Models
| File | Evidence | Risk |
|------|----------|------|
| `models/WorkoutPlan-Postgres.mjs` | Zero imports. Active model: WorkoutPlan.mjs | LOW |

### Directories
| Directory | Evidence | Risk |
|-----------|----------|------|
| `unified-ai-server/` | Zero references in entire codebase | LOW |

### Scripts (13 unused admin scripts — not in package.json or server.mjs)
| File | Evidence |
|------|----------|
| `scripts/admin-account-check.mjs` | Not in package.json scripts |
| `scripts/admin-management.mjs` | Not in package.json scripts |
| `scripts/check-admin-role.mjs` | Not in package.json scripts |
| `scripts/create-admin.mjs` | Not in package.json scripts |
| `scripts/create-admin-from-env.mjs` | Not in package.json scripts |
| `scripts/create-new-admin.mjs` | Not in package.json scripts |
| `scripts/ensure-admin.mjs` | Not in package.json scripts |
| `scripts/fix-admin-password.mjs` | Not in package.json scripts |
| `scripts/quick-admin-check.mjs` | Not in package.json scripts |
| `scripts/quick-admin-reset.mjs` | Not in package.json scripts |
| `scripts/simple-admin-check.mjs` | Not in package.json scripts |
| `scripts/test-admin-features.mjs` | Not in package.json scripts |
| `scripts/test-admin-login.mjs` | Not in package.json scripts |

### Dependencies
| Package | Evidence | Risk |
|---------|----------|------|
| `mysql2` | Zero imports/requires. Project uses PostgreSQL via `pg` | LOW |

---

## Batch 2 — Frontend Code (LOW risk, verified unused)

### Entry Point Variants (frontend/src/)
| File | Evidence |
|------|----------|
| `main-BACKUP-NUCLEAR.jsx` | Not in index.html or vite config |
| `main-backup.jsx` | Not referenced |
| `main-CLEAN.jsx` | Not referenced |
| `main-ULTRA-MINIMAL.jsx` | Not referenced |
| `main-complex-BACKUP.jsx` | Not referenced |
| `main-test-backup.jsx` | Not referenced |
| `App-EMERGENCY-BACKUP.tsx` | Not imported |
| `App-NUKE.tsx` | Not imported |
| `App-test-backup.tsx` | Not imported |

### Test/Debug Components (frontend/src/)
| File | Evidence |
|------|----------|
| `component-isolation-test.jsx` | Not imported |
| `header-test.jsx` | Not imported |
| `homepage-isolation-test.jsx` | Not imported |
| `nuclear-test.jsx` | Not imported |
| `step1-pure-react-test.jsx` | Not imported |
| `ultra-minimal-test.jsx` | Not imported |

### Archived Pages
| Directory | Files | Evidence |
|-----------|-------|----------|
| `pages/old/` | 5 files (HomePage.BACKUP, HomePage.PRODUCTION, LoginModal, StoreFront.BACKUP, StoreFront.PRODUCTION) | No imports. Active pages use different paths. |
| `pages/shop/old/` | 12 files (8 .tsx + docs) | No imports. Active store: OptimizedGalaxyStoreFront |

### Archived Components
| Directory | Files | Evidence |
|-----------|-------|----------|
| `components/old/` | ~5 files + subdirectories | No imports |
| `components/Payment/_ARCHIVED/` | 6 files | No imports. Active: modern checkout |
| `components/Checkout/_ARCHIVED/` | 8 files | No imports. Active: NewCheckout |
| `components/_BACKUP_PROGRESS_COMPONENTS/` | 2 files | No imports |
| `components/Header/header-ORIGINAL-BACKUP.tsx` | 1 file | No imports. Excluded by tsconfig |
| `components/Header/header-SIMPLIFIED-BACKUP.tsx` | 1 file | No imports. Excluded by tsconfig |

---

## Untracked Artifacts (add to .gitignore)

| Pattern | Count | Notes |
|---------|-------|-------|
| `*.png` (root) | 120+ | Playwright screenshots, not used in code |
| `*.exe` (frontend/src/assets) | 2 | Developer tool installers |
| `tmp_cookbook.ipynb` | 1 | Jupyter notebook |
| `nul` | 1 | Windows stderr redirect artifact |

---

## REVIEW_REQUIRED (do NOT archive yet)

### Backend Python MCP Servers (`mcp_server/`)
- Referenced by name in MasterPromptIntegration.mjs config strings
- Not imported as JavaScript modules
- Python servers are DECOMMISSIONED but code may serve as reference
- **Decision needed:** Archive the entire directory, or keep as dead documentation?

### Frontend MCP Hooks/Services (11 files)
- Still imported unconditionally in production components (sidebar, progress)
- McpStatusDot runs 30s health checks even though backend MCP is disabled
- **Action needed:** Add conditional gating, THEN archive if unused

### Design Playground (~25 files)
- Accessible to admin users in production without VITE_DESIGN_PLAYGROUND guard
- Per CLAUDE.md should be "never shipped to prod" without feature flag
- **Action needed:** Add feature flag guard, keep files until design phase completes
