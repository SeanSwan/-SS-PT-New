# Admin Overview Console Errors - 2026-04-06

## Task
Investigate and fix the admin-dashboard/runtime errors reported from production:

- `api.service.ts` logging canceled `/api/oracle/news` requests as errors
- `GET /api/gamification/activity-feed?limit=10` returning `500`
- Victory SVG errors with `NaN` coordinates in admin overview charts

## Root Causes

### 1. Oracle news cancellations were normal, but the API interceptor logged them as failures
- `OracleInsightsWidget` aborts stale requests on tab/query changes.
- `frontend/src/services/api.service.ts` treated Axios cancelation (`ERR_CANCELED`) like a real response failure and printed noisy console errors.

### 2. Activity feed backend was missing the Sequelize association it depended on
- `backend/controllers/gamificationController.mjs` queried `PointTransaction.findAll(... include: [{ model: User, as: 'user' }])`.
- `backend/models/associations.mjs` did not register `PointTransaction.belongsTo(User, { as: 'user' })`.
- The duplicate-prevention early return also did not consider `PointTransaction` associations, so the missing relation could stay broken even when other associations were present.

### 3. Admin overview charts were not hardened against payload drift
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/RevenueChart.tsx` trusted backend history rows without normalizing numeric values.
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/UserGrowthChart.tsx` expected a `history` shape that did not match the backend's actual `/api/admin/analytics/users` payload (`overview` + `userActivity`).
- Result: invalid values could propagate into Victory and produce `NaN` SVG path/text errors.

## Files Changed

- `backend/models/associations.mjs`
- `backend/controllers/gamificationController.mjs`
- `frontend/src/services/api.service.ts`
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/RevenueChart.tsx`
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/UserGrowthChart.tsx`

## What Changed

### Backend
- Added `User.hasMany(PointTransaction, { as: 'pointTransactions' })`.
- Added `PointTransaction.belongsTo(User, { as: 'user' })`.
- Added `awardedBy` association coverage for point transactions.
- Expanded the association duplicate-prevention guard so missing point-transaction relations force full setup instead of early return.
- Normalized `/api/gamification/activity-feed` output to the shape the frontend feed expects:
  - `id`
  - `type`
  - `message`
  - `timestamp`
  - `timeAgo`
  - `meta`

### Frontend
- Suppressed error logging for intentionally canceled Axios requests.
- Normalized revenue analytics payloads before rendering Victory charts.
- Mapped user-growth data to the backend's real `overview` and `userActivity` contract.
- Added finite-number guards so chart series do not render `NaN` values.

## Verification

### Passed
- `frontend: npm run build`

### Backend suite status
- `backend: npm test`
- Result: `53/54` test files passed, `1379/1380` tests passed.
- Remaining failure is pre-existing and unrelated to this fix pass:
  - `tests/unit/evalHarness.test.mjs`
  - `36 - warnings_05 exactly 20 exercises -> no warning`

## Expected Outcome In App

- `/api/oracle/news` request aborts no longer spam the console.
- `/api/gamification/activity-feed` should stop returning `500` and should render real feed items.
- Admin overview charts should stop producing Victory `NaN` SVG errors when analytics payloads are partial or slightly malformed.

## Claude Review Prompt

Review only. Do not edit or fix code.

Inspect these files:

- `backend/models/associations.mjs`
- `backend/controllers/gamificationController.mjs`
- `frontend/src/services/api.service.ts`
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/RevenueChart.tsx`
- `frontend/src/components/DashBoard/Pages/admin-dashboard/components/UserGrowthChart.tsx`

Confirm or challenge these claims:

1. Axios cancelation errors for `/api/oracle/news` are now intentionally ignored and no longer logged as failures.
2. `PointTransaction -> User` association now exists and the duplicate-prevention guard will not skip it on startup.
3. `/api/gamification/activity-feed` now returns a frontend-usable feed contract instead of raw point-transaction rows.
4. `RevenueChart` and `UserGrowthChart` now normalize backend payloads and block `NaN` values from reaching Victory.
5. Any remaining risks are review findings only; do not propose or apply code changes yet unless explicitly requested.
