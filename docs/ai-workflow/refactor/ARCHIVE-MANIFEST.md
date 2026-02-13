# Archive Manifest — Refactor Sprint 2026-02-13

**Archive location:** `archive/pending-deletion/2026-02-13/`
**Total files archived:** 63
**Verification:** Backend 155/155 tests pass, frontend build succeeds

---

## Batch 1 — Backend Code

### backend-controllers/ (2 files)
| Original Path | Why Bloat | Evidence |
|---------------|-----------|----------|
| `backend/controllers/authController-FIXED.mjs` | Backup controller never imported | Zero imports; active: authController.mjs |
| `backend/controllers/videoLibraryController-BUGGY-BACKUP.mjs` | Backup of buggy version | Doc says "can be safely deleted after testing" |

### backend-routes-archived/ (2 files)
| Original Path | Why Bloat | Evidence |
|---------------|-----------|----------|
| `backend/routes/_ARCHIVED/checkoutRoutes.mjs` | Replaced by v2PaymentRoutes | Commented out in core/routes.mjs |
| `backend/routes/_ARCHIVED/paymentRoutes.mjs` | Replaced by v2PaymentRoutes | Commented out in core/routes.mjs |

### backend-models/ (1 file)
| Original Path | Why Bloat | Evidence |
|---------------|-----------|----------|
| `backend/models/WorkoutPlan-Postgres.mjs` | Legacy PostgreSQL-specific model | Zero imports; active: WorkoutPlan.mjs |

### backend-scripts-unused-admin/ (13 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `backend/scripts/admin-account-check.mjs` | Not in package.json scripts |
| `backend/scripts/admin-management.mjs` | Not in package.json scripts |
| `backend/scripts/check-admin-role.mjs` | Not in package.json scripts |
| `backend/scripts/create-admin.mjs` | Not in package.json scripts |
| `backend/scripts/create-admin-from-env.mjs` | Not in package.json scripts |
| `backend/scripts/create-new-admin.mjs` | Not in package.json scripts |
| `backend/scripts/ensure-admin.mjs` | Not in package.json scripts |
| `backend/scripts/fix-admin-password.mjs` | Not in package.json scripts |
| `backend/scripts/quick-admin-check.mjs` | Not in package.json scripts |
| `backend/scripts/quick-admin-reset.mjs` | Not in package.json scripts |
| `backend/scripts/simple-admin-check.mjs` | Not in package.json scripts |
| `backend/scripts/test-admin-features.mjs` | Not in package.json scripts |
| `backend/scripts/test-admin-login.mjs` | Not in package.json scripts |

### Dependency removed
| Package | Why | Evidence |
|---------|-----|----------|
| `mysql2` | Project uses PostgreSQL, not MySQL | Zero imports/requires in entire backend |

---

## Batch 2 — Frontend Code

### frontend-entry-variants/ (9 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `frontend/src/main-BACKUP-NUCLEAR.jsx` | Debug variant, not in index.html |
| `frontend/src/main-backup.jsx` | Backup, not referenced |
| `frontend/src/main-CLEAN.jsx` | Debug variant |
| `frontend/src/main-ULTRA-MINIMAL.jsx` | Debug variant |
| `frontend/src/main-complex-BACKUP.jsx` | Backup, not referenced |
| `frontend/src/main-test-backup.jsx` | Backup, not referenced |
| `frontend/src/App-EMERGENCY-BACKUP.tsx` | Debug backup |
| `frontend/src/App-NUKE.tsx` | Debug backup |
| `frontend/src/App-test-backup.tsx` | Debug backup |

### frontend-test-components/ (8 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `frontend/src/component-isolation-test.jsx` | One-off debug file |
| `frontend/src/header-test.jsx` | One-off debug file |
| `frontend/src/homepage-isolation-test.jsx` | One-off debug file |
| `frontend/src/nuclear-test.jsx` | One-off debug file |
| `frontend/src/ultra-minimal-test.jsx` | One-off debug file |
| `frontend/src/EmergencyTest.jsx` | One-off debug file |
| `frontend/src/minimal-swanstudios.jsx` | One-off debug file |
| `frontend/src/step1-pure-react-test.jsx` | One-off debug file |

### frontend-pages-old/ (5 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `frontend/src/pages/old/HomePage.BACKUP.tsx` | Active: HomePage.V2.component.tsx |
| `frontend/src/pages/old/HomePage.PRODUCTION.tsx` | Active: HomePage.V2.component.tsx |
| `frontend/src/pages/old/LoginModal.component.tsx` | Active: EnhancedLoginModal.tsx |
| `frontend/src/pages/old/StoreFront.BACKUP.tsx` | Active: OptimizedGalaxyStoreFront.tsx |
| `frontend/src/pages/old/StoreFront.PRODUCTION.tsx` | Active: OptimizedGalaxyStoreFront.tsx |

### frontend-shop-old/ (12 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `frontend/src/pages/shop/old/DebugStoreFront.component.tsx` | Debug variant |
| `frontend/src/pages/shop/old/GalaxyStoreFrontFixed.component.tsx` | Superseded |
| `frontend/src/pages/shop/old/HeroPageStore.tsx` | Superseded |
| `frontend/src/pages/shop/old/RawPackageViewer.tsx` | Debug variant |
| `frontend/src/pages/shop/old/ShopPage.tsx` | Superseded |
| `frontend/src/pages/shop/old/SimpleStoreFront.tsx` | Superseded |
| `frontend/src/pages/shop/old/StoreFront-FIXED.component.tsx` | Superseded |
| `frontend/src/pages/shop/old/StoreFront.component.tsx` | Superseded |
| Plus 4 markdown docs about old storefronts | Historical only |

### frontend-components-old/ (5 files)
All files from `components/old/` directory — backup components with zero imports.

### frontend-payment-archived/ (6 files)
All files from `components/Payment/_ARCHIVED/` — replaced by modern checkout system.

### frontend-checkout-archived/ (8 files)
All files from `components/Checkout/_ARCHIVED/` — replaced by NewCheckout/CheckoutView.

### frontend-progress-backup/ (2 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `components/_BACKUP_PROGRESS_COMPONENTS/FitnessStatsProgressDashboard_BACKUP.tsx` | Backup |
| `components/_BACKUP_PROGRESS_COMPONENTS/NASMProgressCharts_BACKUP.tsx` | Backup |

### frontend-header-backup/ (2 files)
| Original Path | Why Bloat |
|---------------|-----------|
| `components/Header/header-ORIGINAL-BACKUP.tsx` | Excluded by tsconfig |
| `components/Header/header-SIMPLIFIED-BACKUP.tsx` | Excluded by tsconfig |

---

## Rollback

To restore any archived file:
```bash
git mv archive/pending-deletion/2026-02-13/<category>/<filename> <original-path>
```

To restore mysql2:
```bash
cd backend && npm install mysql2
```

To restore everything:
```bash
git revert <THIS_COMMIT> --no-edit
```
