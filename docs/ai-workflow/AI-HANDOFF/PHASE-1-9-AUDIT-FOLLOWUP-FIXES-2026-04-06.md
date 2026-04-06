# Phase 1-9 Audit Follow-Up Fixes - 2026-04-06

## Scope
This pass implements the four remaining follow-up items called out from:

- `docs/ai-workflow/AI-HANDOFF/PHASE-1-9-AUDIT-2026-04-05.md`

Items fixed:

1. Phase 9 eval harness regression (`warnings_05`)
2. Theme token bypass in `MarketingWorkspace` and `SecurityWorkspace`
3. Legacy admin route metadata drift for marketing/security
4. Final Phase 4 rebrand miss in `TeachMeToggle`

## Files Changed

- `backend/eval/goldenDataset.mjs`
- `frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx`
- `frontend/src/components/DashBoard/workspaces/SecurityWorkspace.tsx`
- `frontend/src/config/dashboard-tabs.ts`
- `frontend/src/components/DashBoard/index.ts`
- `frontend/src/components/Shared/TeachMeToggle.tsx`

## What Changed

### 1. Eval Harness Regression
- Root cause: `warnings_05` used exercise fixtures with missing `tempo` and `restPeriod`, so self-heal corrections were being counted as warnings.
- Fix: added a small valid exercise helper in `goldenDataset.mjs` and updated `warnings_05` and `warnings_06` to use already-valid exercises.
- Result: the warnings scenarios now isolate the intended rule (`>20 exercises`) instead of triggering unrelated self-heal warnings.

### 2. Theme Token Bypass
- Replaced hardcoded workspace-shell purple/cyan literals with tokenized forms:
  - `var(--accent-secondary, #8B5CF6)`
  - `var(--accent-primary, #60C0F0)`
  - `var(--bg-surface, rgba(...))`
- Applied to title gradients, active tab states, hover states, and mobile tab-bar background in:
  - `MarketingWorkspace.tsx`
  - `SecurityWorkspace.tsx`

### 3. Route Metadata Drift
- Updated legacy security metadata route from `/dashboard/security` to `/dashboard/admin/security` in `dashboard-tabs.ts`.
- Added admin-prefixed title-map entries in `frontend/src/components/DashBoard/index.ts` for:
  - `/dashboard/admin/marketing`
  - `/dashboard/admin/security`

### 4. Rebrand Miss
- Changed `Ask AI Coach for help` to `Ask Swan Coach for help` in `TeachMeToggle.tsx`.

## Validation

### Frontend
- Command: `cd frontend && npx vite build`
- Result: passed

### Backend
- Command: `cd backend && npm test`
- Result: passed
- Final status: `54/54` test files passed, `1380/1380` tests passed

## Claude Review Prompt

Review only. Do not edit or fix code.

Inspect these files:

- `backend/eval/goldenDataset.mjs`
- `frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx`
- `frontend/src/components/DashBoard/workspaces/SecurityWorkspace.tsx`
- `frontend/src/config/dashboard-tabs.ts`
- `frontend/src/components/DashBoard/index.ts`
- `frontend/src/components/Shared/TeachMeToggle.tsx`

Confirm or challenge these claims:

1. `warnings_05` no longer fails because the scenario fixture is now valid before self-heal runs.
2. `warnings_06` now isolates the intended `>20 exercises` warning instead of relying on correction noise.
3. The new Marketing and Security workspace shells now use tokenized theme colors instead of hardcoded purple/cyan literals.
4. Legacy metadata now recognizes the admin-prefixed marketing/security routes.
5. The last `AI Coach` rebrand miss is removed in `TeachMeToggle.tsx`.

If you see residual risk, report findings only. Do not propose code edits unless explicitly requested.
