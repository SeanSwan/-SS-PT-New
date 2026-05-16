# AI System Map — SwanStudios (SS-PT)

**Generated:** 2026-02-13
**Purpose:** Help AI and humans navigate the codebase quickly

---

## Architecture Overview

```
SwanStudios (2.4 GB total)
├── backend/          Node.js + Express + Sequelize + PostgreSQL
│   ├── core/         App factory, route registration, middleware setup
│   ├── routes/       82 route files (Express routers)
│   ├── controllers/  46 controllers (business logic)
│   ├── models/       61 Sequelize models + associations.mjs + index.mjs
│   ├── services/     52+ service modules (payments, analytics, gamification, MCP)
│   ├── middleware/    11 middleware (auth, RBAC, validation, error handling)
│   ├── utils/        29 utilities (logging, config, database helpers)
│   ├── scripts/      88 CLI scripts (admin, migration, seeding, diagnostics)
│   ├── migrations/   118+ Sequelize migrations (.cjs)
│   ├── mcp_server/   ARCHIVED to archive/pending-deletion/ (Phase 2)
│   └── tests/        18 test files (vitest)
├── frontend/         React 18 + TypeScript + Vite + styled-components
│   └── src/
│       ├── pages/        113 page files (10 page groups)
│       ├── components/   637 component files (60+ directories)
│       ├── services/     44 API/domain service files
│       ├── hooks/        43 custom hooks
│       ├── store/        Redux (9 slices) + React Context (8 providers)
│       ├── styles/       45+ CSS/TS theme files
│       ├── utils/        44 utility files
│       ├── routes/       8 route config files
│       ├── types/        7 TypeScript definition files
│       └── assets/       69 media files (526 MB — videos, images)
├── docs/             320 documentation files
└── render.yaml       Render deployment config
```

---

## Critical Runtime Paths (DO NOT BREAK)

| Path | Entry | Key Files |
|------|-------|-----------|
| **Auth** | POST /api/auth/login | authController.mjs → authMiddleware.mjs → User.mjs |
| **Payments** | POST /api/v2/payments/* | v2PaymentRoutes.mjs → stripeWebhook.mjs → ShoppingCart.mjs |
| **Sessions** | GET/POST /api/sessions | sessionsRoutes.mjs → SessionGrantService.mjs → Session.mjs |
| **Schedule** | GET /api/sessions | sessionsRoutes.mjs → UniversalMasterSchedule (frontend) |
| **Store** | GET /api/storefront/* | storeFrontRoutes.mjs → StorefrontItem.mjs |
| **Admin** | GET /api/admin/* | adminRoutes.mjs + adminClientController.mjs |
| **Dashboard** | Frontend route /dashboard | DashBoard/ components + API calls |

---

## Route Registration

**Single source of truth:** `backend/core/routes.mjs`
Mounts 75+ route modules in order: Core Auth → User Management → Business Logic → Communication → Fitness → Gamification → Admin → Dashboards → Webhooks

---

## Key Singletons / Import Chains

| Singleton | File | Triggered By |
|-----------|------|-------------|
| MCPHealthManager | utils/monitoring/mcpHealthManager.mjs | Import chain: core/routes → masterPrompt → ethicalAI → mcpHealthManager |
| MCPAnalytics | services/monitoring/MCPAnalytics.mjs | Import from monitoring module |
| Database | database.mjs | server.mjs startup |
| Redis | config/session.mjs | core/app.mjs |

---

## MCP Integration Status (DECOMMISSIONED)

- Backend: Health checks disabled in production (opt-IN via `ENABLE_MCP_SERVICES=true`)
- Frontend: `VITE_ENABLE_MCP_SERVICES=false` in .env.production
- Frontend gating: `mcpConfig.ts` short-circuits all API calls when disabled (Phase 2)
- McpHealthMonitor: Skips 30s polling when `VITE_ENABLE_MCP_SERVICES !== 'true'` (Phase 2)
- Python MCP servers: Archived to `archive/pending-deletion/2026-02-13/backend-mcp-server-python/`
- Routes: Return `production-fallback` / `disabled` data

---

## Database Models (61 total)

**Core:** User, Session, SessionType, SessionPackage
**Commerce:** StorefrontItem, ShoppingCart, CartItem, Order, OrderItem
**Fitness:** Workout*, Exercise*, BodyMeasurement, DailyWorkoutForm, Goal, Badge
**Social:** SocialPost, SocialComment, Friendship, Challenge, Community (enhanced/)
**Admin:** AdminSettings, AdminSpecial, Orientation
**Finance:** FinancialTransaction, TrainerCommission, TaxConfig
**Notifications:** Notification, NotificationSettings

---

## Frontend Route Structure

| Route | Component | Guard |
|-------|-----------|-------|
| / | HomePage | Public |
| /login, /signup | Auth modals | Public |
| /store | OptimizedGalaxyStoreFront | Public |
| /checkout/* | CheckoutView | Auth |
| /schedule | Schedule | Auth |
| /dashboard | Role-based dashboard | Auth + RBAC |
| /dashboard/admin/* | Admin sections | Admin only |
| /designs/:id | DesignPlayground | Admin + VITE_DESIGN_PLAYGROUND=true |

---

## Test Suites

**Backend (155 tests, 9 files):** auth, payments, sessions, RBAC, password hashing, session grants, purchase attribution, storefront pricing, post-deploy smoke
**Frontend:** vitest + @testing-library/react (scattered test files)

---

## Known Technical Debt

1. ~~MCP frontend hooks run unconditionally~~ — **FIXED Phase 2**: `mcpConfig.ts` short-circuits when `VITE_ENABLE_MCP_SERVICES=false`
2. **Material-UI in package.json** — @mui/material installed despite "No MUI" design constraint
3. **162 root-level backend scripts** — Organizational debt; should be in subdirectories
4. ~~52+ backup/archived files in frontend~~ — **FIXED Phase 1**: Archived to pending-deletion/
5. **526 MB frontend assets** — Videos should be in CDN, .exe files now gitignored
6. ~~Design Playground routes accessible in prod~~ — **FIXED Phase 2**: Guarded by `VITE_DESIGN_PLAYGROUND`
