# Admin Dashboard Launch Readiness Overhaul (Full Stack)

> **Created:** 2026-02-22 | **Status:** Ready for execution | **Review passes:** 10+

## Context
The client dashboard overhaul is complete (13→7 tabs, fake data removed, real hooks wired). The admin dashboard at `/dashboard/*` has a **C+ health score (70%)**: 14/30 tabs working, 7 broken (API 500/503 errors), 5 mock-only with fabricated data. The user wants all tabs wired up with real data, not hidden.

**Goal:** Fix broken backend endpoints, fix frontend fallback patterns and `$undefined` bugs, gate dev-only UI, hide only pure-mock tabs (where no API exists at all), and make the admin dashboard launch-trustworthy.

---

## Part A: Frontend Fixes (7 files)

### A1. Overview Panel `||` → `??` Fix
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx`
**Lines 72-143:** Replace `|| 0` with `?? 0`, `|| []` with `?? []`, `|| 'Service'` with `?? 'Service'`. Skip `|| undefined` (no-op, not worth the churn).
**Risk:** LOW

### A2. CancelledSessionsWidget `$undefined` Fix
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/components/CancelledSessionsWidget.tsx`
**Lines 329-330, 375, 384, 401, 408:** Add `?? 0` to all price template literal interpolations.
**Risk:** LOW

### A3. Hide Pure-Mock Tabs (No Backend API Exists) with Route Redirects
Only tabs where **no backend API endpoint exists at all** get hidden. Tabs with broken-but-existing APIs stay visible (backend fixes in Part B will wire them up).

**Pure-mock tabs (no API — hide in production):**
- **Performance Reports** (`PerformanceReportsPanel.tsx`) — `<DemoDataBanner noApi />`, pure `mockKPIs`/`mockReports`
- **Security Dashboard** (`SecurityMonitoringPanel.tsx`) — `<DemoDataBanner noApi />`, pure mock metrics

**NOT pure-mock (have real backend APIs — keep visible):**
- Revenue Analytics — `/api/admin/analytics/revenue` (DemoDataBanner fallback)
- BI Drilldowns — `enterpriseAdminApiService` → `/api/admin/business-intelligence/metrics` (line 308 of service, line 29 of `adminEnterpriseRoutes.mjs`) (Demo Mode badge)
- Social Command — `/api/admin/social-media/posts`, `/api/admin/social-media/analytics` via `adminEnterpriseRoutes.mjs`
- MCP Servers — `/api/admin/mcp/servers` (error UI with retry)

**Route-level redirects in `UnifiedAdminRoutes.tsx`:**
```typescript
// Analytics: hide only performance (pure mock, no API)
<Route path="performance" element={
  import.meta.env.DEV ? <PerformanceReportsPanel /> : <Navigate to="/dashboard/analytics" replace />
} />

// System: hide only security (pure mock, no API)
<Route path="security" element={
  import.meta.env.DEV ? <SecurityMonitoringPanel /> : <Navigate to="/dashboard/system" replace />
} />
```

**Tab bar filtering:**
- `AnalyticsWorkspace.tsx` — filter only `performance` in production
- `SystemWorkspace.tsx` — filter only `security` in production

**Legacy redirect updates:**
```typescript
<Route path="/reports" element={<Navigate to={import.meta.env.DEV ? "/dashboard/analytics/performance" : "/dashboard/analytics"} replace />} />
<Route path="/security" element={<Navigate to={import.meta.env.DEV ? "/dashboard/system/security" : "/dashboard/system"} replace />} />
```

**Risk:** MEDIUM

### A4. DEV-Gate Sidebar Badges + Tooltip (Preventative)
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx`

`getAdminNavItems()` (line 850) maps from `WORKSPACE_CONFIG` which has no `status`/`isNew`/`notification` fields — badges are currently inert. This is **preventative** against future regressions.

- **Line 1148:** `{import.meta.env.DEV && item.isNew && (`
- **Line 1170:** `{((import.meta.env.DEV && item.status) || item.notification) && (` — prod-aware container prevents empty `NavigationMeta` slot
- **Line 1172:** `{import.meta.env.DEV && item.status && statusConfig && StatusIcon && (` — gates only status badge, not notification badge
- **Lines 1196-1200:** `{import.meta.env.DEV && statusConfig && (` — gates tooltip status text

**Risk:** LOW (preventative)

### A5. `dashboard-tabs.ts` Status Accuracy (Dead Code)
**File:** `frontend/src/config/dashboard-tabs.ts`
`ADMIN_DASHBOARD_TABS` is `@deprecated`, unused at runtime. Update status values for documentation accuracy.
**Risk:** NONE

---

## Part B: Backend Fixes (7 broken endpoints)

### Diagnostic First Step
Before individual fixes, inventory which DB tables exist and which migrations are pending.

**IMPORTANT: These commands must run against the production database.** Use Render shell (`render ssh`) or ensure `DATABASE_URL` points to the production PostgreSQL instance. Running locally will inspect the local dev DB, which may have different table state and lead to incorrect triage.

```bash
# List pending migrations (do NOT run blindly — must be against production DB)
DATABASE_URL="$PRODUCTION_DATABASE_URL" npx sequelize-cli db:migrate:status

# Check which tables exist (must be against production DB)
DATABASE_URL="$PRODUCTION_DATABASE_URL" node --input-type=module -e "
import sequelize from './database.mjs';
const [tables] = await sequelize.query(\"SELECT tablename FROM pg_tables WHERE schemaname='public'\");
console.log(tables.map(t => t.tablename).sort().join('\\n'));
await sequelize.close();
"
```
Review pending migrations individually before running. Only apply migrations relevant to the broken endpoints.

### B1. Client Management — `GET /api/admin/clients`
**Frontend:** `ClientsManagementSection.tsx` (line 626) calls `authAxios.get('/api/admin/clients', { params: { includeStats, includeRevenue, includeSubscription } })`
**Backend Route:** `backend/routes/adminClientRoutes.mjs` (line 272) → `adminClientController.getClients`
**Controller:** `backend/controllers/adminClientController.mjs` (line 297)

**How it works:** `ensureModels()` destructures `{ User, ClientProgress, Session, WorkoutSession, Order, DailyWorkoutForm }` from `getAllModels()`. Then queries `User.findAndCountAll` with includes for `clientProgress`, `clientSessions`, `workoutSessions`.

**Likely 500 cause:** One of the included models or associations fails. Most likely:
- `ClientProgress` table doesn't exist in production DB
- `WorkoutSession` table doesn't exist
- Association alias mismatch between model definition and `associations.mjs`
- `DailyWorkoutForm` not in model cache (would crash `ensureModels()`)

**Fix approach:** Run diagnostic to check which tables exist. If missing, run targeted migration. If all tables exist, add verbose error logging to `ensureModels()` and the `findAndCountAll` call to identify the exact join failure.

**RBAC:** Already protected by `protect` + `authorize(['admin'])` middleware (lines 268-269).
**Risk:** MEDIUM — requires runtime diagnostic

### B2. Package Management — `GET /api/admin/storefront`
**Backend Route:** `backend/routes/adminPackageRoutes.mjs` (line 32)
**Likely cause:** `getAllModels().StorefrontItem` fails or `rawAttributes` access crashes.
**Fix:** Add null-check. Verify `StorefrontItem` model is in `initializeModelsCache()`.
**RBAC:** Protected by route-level middleware.
**Risk:** LOW

### B3. Pending Orders — `GET /api/admin/orders/pending`
**Frontend:** `PendingOrdersAdminPanel.tsx` (line 386) calls `authAxios.get('/api/admin/orders/pending')`
**Backend Route:** `backend/routes/adminOrdersRoutes.mjs` (line 368)

**Associations verified:** `ShoppingCart.belongsTo(User, { as: 'user' })` (line 364), `ShoppingCart.hasMany(CartItem, { as: 'cartItems' })` (line 365), `CartItem.belongsTo(StorefrontItem, { as: 'storefrontItem' })` (line 367) — all exist in `associations.mjs`.

**Likely 500 cause (NOT associations):** Either:
- `buildOrderQuery` helper crashes with invalid Op usage
- `enrichOrderWithStripeData` fails (Stripe API call or missing config)
- `normalizeOrderShape` receives unexpected data shape
- Missing DB table for `ShoppingCart` or `CartItem`

**Fix approach:** Runtime diagnostic. Wrap `enrichOrderWithStripeData` in try-catch per order (not whole batch). When enrichment fails, mark the order with a degraded flag (e.g., `stripeEnriched: false`) so the UI can distinguish fully enriched orders from partially enriched ones — avoids presenting incomplete data as authoritative under the "no mock / truthful data" rule.
**RBAC:** Protected by route-level middleware.
**Risk:** MEDIUM — requires runtime diagnostic

### B4. Messages — `GET /api/messaging/conversations`
**Backend:** `backend/controllers/messagingController.mjs` (line 17) — raw SQL against `conversations`, `conversation_participants`, `messages`, `message_receipts` tables.
**Likely cause:** Tables don't exist (migration not run).
**Fix:** Check migration status for `20260211000001-create-messaging-tables.cjs`. Run targeted migration. Add graceful 503 return if tables don't exist.
**RBAC:** Protected by `protect` middleware only (`messagingRoutes.mjs` line 19) — **NOT admin-only**. Any authenticated user can access their conversations. Verification must test: authenticated user → 200/[], unauthenticated → 401.
**Risk:** MEDIUM — DB migration

### B5. Admin Specials — `GET /api/admin/specials`
**Backend:** Mounted at `backend/core/routes.mjs` (line 309). Route file imports and mounts cleanly (`adminSpecialRoutes.mjs` line 1, `routes.mjs` lines 82 + 309). Controller uses `getModel('AdminSpecial')` (line 19). Association with `User` (creator alias) exists at `associations.mjs` lines 310-311.
**Likely cause (runtime, NOT import/mount):** The route mounts successfully, but the endpoint fails at runtime. Most likely:
- `AdminSpecial` model not in `getAllModels()` cache (so `getModel('AdminSpecial')` returns undefined)
- `admin_specials` table doesn't exist (migration not run)
- Query/association alias mismatch at runtime
**Fix approach:** Runtime diagnostic — hit the endpoint, read the error log. Check `admin_specials` table existence. Verify `AdminSpecial` is registered in `modelsCache`. Fix whichever layer fails.
**RBAC:** Should be admin-only — verify middleware.
**Risk:** LOW-MEDIUM — requires runtime diagnostic

### B6. Admin Settings — `GET /api/admin/settings/*`
**Backend:** `backend/controllers/adminSettingsController.mjs` (exists) uses raw SQL on `admin_settings` table.
**Likely cause:** `admin_settings` table or `category` column doesn't exist.
**Fix:** Check migration status. The controller already has error handling (returns null on query failure).
**RBAC:** Protected by `protect` + `adminOnly`.
**Risk:** LOW — likely just needs migration

### B7. Notifications — `GET /api/admin/notifications`
**Backend:** `backend/routes/adminNotificationsRoutes.mjs` (line 72)
**Model:** `backend/models/financial/AdminNotification.mjs` — has `getNotificationSummary()` static (line 325).
**Likely cause:** `AdminNotification` not in `getAllModels()` cache, or `admin_notifications` table doesn't exist.
**Fix:** Verify model registration. Run migration if table missing. Route already has fallback logic (line 88-97).
**RBAC:** Protected by `protect` + `adminOnly`.
**Risk:** LOW — likely migration

---

## Files to Modify

### Frontend (7 files)
| # | File | Change |
|---|------|--------|
| A1 | `frontend/.../overview/AdminOverviewPanel.tsx` | `\|\|` → `??` |
| A2 | `frontend/.../components/CancelledSessionsWidget.tsx` | `?? 0` on price templates |
| A3a | `frontend/.../UnifiedAdminRoutes.tsx` | Route redirects for 2 pure-mock tabs |
| A3b | `frontend/.../workspaces/AnalyticsWorkspace.tsx` | Filter `performance` only |
| A3c | `frontend/.../workspaces/SystemWorkspace.tsx` | Filter `security` only |
| A4 | `frontend/.../AdminStellarSidebar.tsx` | DEV-gate badges/dots/tooltip |
| A5 | `frontend/src/config/dashboard-tabs.ts` | Status accuracy (dead code) |

### Backend Code Files (minimum 5 expected; B6/B7 may add files if root cause is code, not just missing tables)
| # | File | Change |
|---|------|--------|
| B1 | `backend/controllers/adminClientController.mjs` | Diagnostic + fix model/table issue |
| B2 | `backend/routes/adminPackageRoutes.mjs` | Null-check StorefrontItem |
| B3 | `backend/routes/adminOrdersRoutes.mjs` | Diagnostic + Stripe enrichment guard |
| B4 | `backend/controllers/messagingController.mjs` | Table-existence check + graceful 503 |
| B5 | `backend/routes/adminSpecialRoutes.mjs` + controller/model | Runtime diagnostic + fix model/table issue |

### Backend Operational Steps (Migrations / Production Diagnostics)
| # | Action | Detail |
|---|--------|--------|
| B4-mig | Run messaging tables migration | `20260211000001-create-messaging-tables.cjs` (if tables missing) |
| B6 | Verify `admin_settings` table exists | Run targeted migration if missing; controller already handles null |
| B7 | Verify `admin_notifications` table + model registration | Run targeted migration if missing; verify `AdminNotification` in `modelsCache` |

---

## Implementation Order

### Phase 1: Frontend Quick Wins (LOW risk)
1. A1 — Overview `??` fix
2. A2 — `$undefined` button fix
3. A4 — Sidebar DEV gate
4. A5 — dashboard-tabs.ts accuracy
5. `cd frontend && npm run build`

### Phase 2: Backend Diagnostic (MUST run against production DB)
All Phase 2 commands require production database context. Use Render shell or explicit `DATABASE_URL="$PRODUCTION_DATABASE_URL"` prefix. Do NOT run against local dev DB.

1. `DATABASE_URL="$PRODUCTION_DATABASE_URL" npx sequelize-cli db:migrate:status` — list pending migrations
2. `DATABASE_URL="$PRODUCTION_DATABASE_URL" node --input-type=module -e "..."` — check which tables exist
3. Review each pending migration — only apply ones relevant to broken endpoints (also against production DB)
4. Re-test each endpoint against production, record results

### Phase 3: Backend Endpoint Fixes (by business priority)
1. B1 — Client Management (P1 — core admin function)
2. B2 — Package Management (P1 — storefront)
3. B3 — Pending Orders (P1 — revenue)
4. B5 — Admin Specials (P2)
5. B6 — Admin Settings (P2)
6. B7 — Notifications (P2)
7. B4 — Messages (P2)
8. `cd backend && npm test`

### Phase 4: Frontend Mock Tab Hiding (after backend verified)
1. A3 — Route redirects + tab filtering for 2 pure-mock tabs only
2. `cd frontend && npm run build`

### Phase 5: Playwright Verification
Endpoint checks should run against the deployed production app (sswanstudios.com) or local app with `DATABASE_URL` pointing to production. All verification calls must be **read-only GETs** — no POSTs/PUTs/DELETEs against production during verification.

1. Login as admin, test each workspace/tab
2. Screenshot all workspaces at 1280px — include source-of-truth screenshots for previously broken tabs (Clients, Packages, Pending Orders, Specials, Settings, Notifications, Messages) to support the health-score update
3. Verify RBAC:
   - Admin-only endpoints (B1-B3, B5-B7): admin → 200, non-admin authenticated → 403, unauthenticated → 401
   - Messaging endpoint (B4): authenticated user → 200/[], unauthenticated → 401

---

## Verification

### Build Gates
```bash
cd frontend && npm run build
cd backend && npm test
```

### Backend Endpoint Checks (positive + RBAC)

**Admin-only endpoints** (admin → 200, non-admin → 403, unauthenticated → 401):
- [ ] `GET /api/admin/clients` — returns paginated clients
- [ ] `GET /api/admin/storefront` — returns items
- [ ] `GET /api/admin/orders/pending` — returns orders
- [ ] `GET /api/admin/specials` — returns specials
- [ ] `GET /api/admin/settings/system` — returns settings
- [ ] `GET /api/admin/notifications` — returns notifications

**Authenticated-user endpoint** (any authenticated user → 200/[], unauthenticated → 401):
- [ ] `GET /api/messaging/conversations` — returns conversations or []

### Frontend Checks
- [ ] Overview metrics render `0` when data is zero
- [ ] CancelledSessionsWidget buttons show real amounts (never `$undefined`)
- [ ] Performance Reports and Security Dashboard hidden in production
- [ ] Revenue, BI, Social Command, MCP tabs remain visible (have real APIs)
- [ ] Direct URLs to hidden tabs redirect to workspace default
- [ ] Notification badges NOT suppressed by DEV gate
- [ ] Legacy URLs to hidden routes redirect to workspace defaults

### Required Documentation Outputs
After implementation, produce these artifacts so future sessions have full context:

1. **Audit Matrix Update** — Update `docs/ai-workflow/AI-HANDOFF/ADMIN-DASHBOARD-REVIEW.md` with the new status of all 30 tabs. Distinguish between: **fixed** (real data now flowing), **hidden** (no API / intentionally deferred from production), and **working** (already functional). Include the final health score with this breakdown so it's clear what "fixed" vs "removed from prod" means.
2. **Endpoint Fix Log** — For each B1-B7 endpoint: what the root cause was, what was changed, and the final HTTP status. Append to the review doc or create a section within it.
3. **Migration Log** — Which migrations were run (if any), in what order, and which tables were created/altered. Record in the review doc.
4. **Handoff Status Update** — Update `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md` with completion status and any deferred items.
