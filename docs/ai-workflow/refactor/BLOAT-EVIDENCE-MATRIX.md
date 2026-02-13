# Bloat Evidence Matrix

Evidence for every bloat candidate. Each item has: search method, results, risk score, and decision.

---

## Legend
- **Search:** How we verified unused status
- **Risk:** LOW = safe to archive, MEDIUM = needs review, HIGH = actively used
- **Decision:** ARCHIVED / REVIEW_REQUIRED / KEEP

---

## Backend

| # | File | Search Method | Result | Risk | Decision |
|---|------|---------------|--------|------|----------|
| B1 | controllers/authController-FIXED.mjs | `grep -r "authController-FIXED"` | 0 matches | LOW | ARCHIVED |
| B2 | controllers/videoLibraryController-BUGGY-BACKUP.mjs | `grep -r "videoLibraryController-BUGGY"` | Docs only (says "safely deleted") | LOW | ARCHIVED |
| B3 | routes/_ARCHIVED/checkoutRoutes.mjs | Checked core/routes.mjs | Commented out, replaced by v2PaymentRoutes | LOW | ARCHIVED |
| B4 | routes/_ARCHIVED/paymentRoutes.mjs | Checked core/routes.mjs | Commented out, replaced by v2PaymentRoutes | LOW | ARCHIVED |
| B5 | models/WorkoutPlan-Postgres.mjs | `grep -r "WorkoutPlan-Postgres"` | 0 matches | LOW | ARCHIVED |
| B6 | unified-ai-server/ | `grep -r "unified-ai-server"` | 0 matches (not git-tracked) | LOW | GITIGNORE |
| B7-B19 | 13 admin scripts | Checked package.json scripts section | Not referenced in any npm script | LOW | ARCHIVED |
| B20 | mysql2 package | `grep -r "mysql2"` in .mjs files | 0 imports (project uses pg) | LOW | REMOVED |
| B21 | mcp_server/ (Python) | `grep -r` for Python filenames | Config strings in MasterPromptIntegration.mjs | MEDIUM | REVIEW_REQUIRED |

---

## Frontend

| # | File | Search Method | Result | Risk | Decision |
|---|------|---------------|--------|------|----------|
| F1-F6 | 6 main.jsx variants | Checked index.html, vite.config | Not entry points | LOW | ARCHIVED |
| F7-F9 | 3 App.tsx variants | `grep -r "App-EMERGENCY"` etc. | 0 matches | LOW | ARCHIVED |
| F10-F17 | 8 test/debug components | `grep -r` for each filename | 0 matches | LOW | ARCHIVED |
| F18-F22 | 5 pages/old/ files | `grep -r` for component names | 0 imports; active pages differ | LOW | ARCHIVED |
| F23-F34 | 12 shop/old/ files | Checked main-routes.tsx | Active: OptimizedGalaxyStoreFront | LOW | ARCHIVED |
| F35-F39 | 5 components/old/ files | `grep -r` for filenames | 0 matches | LOW | ARCHIVED |
| F40-F45 | 6 Payment/_ARCHIVED/ files | `grep -r` for component names | 0 matches | LOW | ARCHIVED |
| F46-F53 | 8 Checkout/_ARCHIVED/ files | `grep -r` for component names | 0 matches; active: NewCheckout | LOW | ARCHIVED |
| F54-F55 | 2 progress backups | `grep -r` for BACKUP filenames | 0 matches | LOW | ARCHIVED |
| F56-F57 | 2 header backups | `grep -r` + tsconfig excludes | 0 matches | LOW | ARCHIVED |
| F58-F68 | 11 MCP hooks/services | `grep -r` for import paths | ACTIVELY IMPORTED in 28+ components | HIGH | CONDITIONALLY GATED (Phase 2) |
| F69+ | ~29 Design Playground files | Checked route guards | Admin-only, now VITE_DESIGN_PLAYGROUND guarded | HIGH | GUARDED (Phase 2) |

---

## Root / Untracked

| # | Item | Search Method | Result | Risk | Decision |
|---|------|---------------|--------|------|----------|
| R1 | 120+ root .png files | `grep -r` for sample filenames | Docs references only, no code imports | LOW | GITIGNORE |
| R2 | tmp_cookbook.ipynb | `grep -r "cookbook"` | 0 matches | LOW | GITIGNORE |
| R3 | nul (Windows artifact) | `grep -r "nul"` | Stale stderr output | LOW | GITIGNORE |
| R4 | 2 .exe files in assets | `grep -r "darktable" "tixati"` | 0 code references | LOW | GITIGNORE |
| R5 | .mcp.json vs .claude/mcp.json | Read both files | Same Playwright config, minor format diff | LOW | KEEP BOTH |

---

## Phase 2 Additions

| # | Item | Search Method | Result | Risk | Decision |
|---|------|---------------|--------|------|----------|
| P2-B1 | `backend/mcp_server/` (137 Python files) | `grep -r "mcp_server"` in backend .mjs | Config strings only in MasterPromptIntegration.mjs; zero runtime imports | LOW | ARCHIVED |
| P2-B2 | `backend/scripts/deprecated/` (2 files) | `grep -r` for filenames | Zero references; explicitly deprecated | LOW | ARCHIVED |
| P2-B3 | `backend/scripts/backup/` (6 files) | Checked package.json scripts | Zero references | LOW | ARCHIVED |
| P2-B4 | Root BACKUP .mjs files (2 files) | `grep -r` for filenames | Zero references; explicit BACKUP suffix | LOW | ARCHIVED |
| P2-B5 | 162 root-level backend scripts | Counted files in backend/ root | Many are one-time diagnostics; some referenced in package.json | MEDIUM | REORGANIZE (future) |
