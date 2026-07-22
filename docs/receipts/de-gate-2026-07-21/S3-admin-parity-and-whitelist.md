---
decision: enforce-admin-route-and-feature-flag-law
status: verified-local
verified_at: 2026-07-21
baseline_ref: eb4bbdd63794d0d842f5e5c107254f8013544367
---

# S3 Admin Parity and Launch Control Whitelist

## Outcome

- `[VERIFIED]` the live admin sidebar renders `WORKSPACE_CONFIG`: import at `AdminStellarSidebar.tsx:51`, visibility filtering at line 166, and section rendering at line 226.
- `[VERIFIED]` `WORKSPACE_CONFIG` contains 34 entries at `dashboard-tabs.ts:153-212`; every entry is checked against the live admin role registry by `sidebarRouteParity.contract.test.ts:40-47`.
- `[VERIFIED]` Design Studio participates in the same contract: nav entry at `dashboard-tabs.ts:204`, mounted route at `UniversalDashboardLayout.routes.tsx:116`.
- `[VERIFIED]` the deprecated `ADMIN_DASHBOARD_TABS` runtime/config array was removed after a repo-wide consumer search found only its own export and two tests. The workout-first test now locks one admin navigation source of truth.
- `[VERIFIED]` the Launch Control registry is exactly `dashboardV2Finance`, `postSaveHandoff`, and `prismCapture` at `launchControlResolve.mjs:9-18`.
- `[VERIFIED]` the database-backed admin board filters with that registry at `launchControlService.mjs:62-64`.
- `[VERIFIED]` retired-key set and clear mutations are rejected before SQL at `launchControlService.mjs:104` and `launchControlService.mjs:130`; the DELETE route returns that rejection.
- `[VERIFIED]` CI uses the exact failure message: `Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.`

## Test evidence

- TDD red:
  - frontend: 1 intentional failure because the deprecated admin config still existed; the complete 34-entry route-parity test already passed against current code.
  - backend: 1 intentional failure because the approved registry export did not yet exist.
- Focused green before hostile review: 8/8 frontend and 16/16 backend.
- Hostile runtime contract: 20/20 backend across registry, board query/set/clear enforcement, route rejection, and de-gate migration.
- Expanded S1-S3 regression set: 31/31 frontend and 18/18 backend.
- Production build: Vite 6.4.3 transformed 6,707 modules and exited 0.
- TypeScript:
  - the standard `npm run type-check` command reproduced an 8 GB heap OOM with no TypeScript diagnostic.
  - the identical compiler command at a 12 GB heap ceiling exited 0: `node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --pretty false`.
  - no package-script change was made inside this design slice.

## Hostile review loop

1. **REVISE — registry assertion alone was insufficient.** Added a runtime service contract proving the board query consumes the exact whitelist and retired design keys cannot reach a mutation lookup.
2. **REVISE — Windows fallback write corrupted Unicode comments.** Restored only the six S3 files to the S2 commit and reapplied byte-safe UTF-8 writes. Fresh BOM/mojibake grep and `git diff --check` are clean.
3. **VERIFY — Sequelize replacement shape.** The repository already uses array replacements with `IN (:key)`; S3 follows that installed Sequelize 6.37.8 pattern.
4. **VERIFY — no blind 404 repair.** Static parity is 34/34. Sean's authenticated click-pass has not yet supplied a failing live link, so no route was changed on speculation.
5. **DRY — fresh diff, encoding, focused tests, expanded regressions, 12 GB TypeScript, and production build found no additional S3 code defect.**

## Remaining Sean-gated evidence

- The authenticated live sidebar click-pass remains pending.
- No push, deploy, Render environment mutation, or production database action occurred in S3.
