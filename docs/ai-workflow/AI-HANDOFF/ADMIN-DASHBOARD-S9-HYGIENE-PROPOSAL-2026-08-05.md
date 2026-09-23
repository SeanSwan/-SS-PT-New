# SWA-138 S9 — Admin Dashboard Hygiene Proposal (Phase 1: PROPOSAL ONLY)

> **decision:** Propose archival of 15 dormant/competing/misfiled admin-dashboard files; NOTHING moves without Sean's explicit Phase-2 approval (Rule 34).
> **status:** open — awaiting Sean's approval
> **supersedes:** none
> **Evidence base:** SWA-138 audit (verified against origin/main `b17e13d90`; classifications re-verified by zero-importer greps). Each row = likely archive candidate pending Phase 2 approval; grep evidence per file was gathered in the audit.

All paths under `frontend/src/components/DashBoard/Pages/admin-dashboard/` unless noted.
Proposed destination: `archive/admin-dashboard-dormant-2026-08/` (git mv, reversible).

| # | File | Class | Why |
|---|---|---|---|
| 1 | `components/ClientActivityWidget.tsx` | dormant + broken | Zero importers; calls unregistered `/api/admin/activity-feed`; duplicates RecentActivityFeed |
| 2 | `components/HighRiskClientsWidget.tsx` | dormant + broken | Zero importers; unregistered endpoint; fake "Mark as Contacted" (comment admits it); superseded by ClientComplianceDashboard |
| 3 | `components/TopTrainersWidget.tsx` | dormant + broken | Zero importers; unregistered endpoint. Concept (trainer performance) lives on in blueprint S11 |
| 4 | `components/BulkModerationPanel.tsx` | dormant | Zero importers; 521 lines; zero tokens; sub-44px controls |
| 5 | `components/AdminSocialManagementView.tsx` | dormant | Zero importers |
| 6 | `components/PaymentSettingsPanel.tsx` | dormant | Zero importers |
| 7 | `AdminDebugPage.tsx` | dormant | Zero importers |
| 8 | `SystemHealthManagementSection.tsx` | dormant | Zero importers |
| 9 | `UsersManagementSection.tsx` | dormant | Zero importers; superseded by EnhancedUserDataManagement |
| 10 | `overview/MetricCard.tsx` | dormant duplicate | Zero importers; AdminOverviewMetrics has its own inline card — edit-the-wrong-file trap |
| 11 | `overview/EmptyState.tsx` | dormant duplicate | Zero importers |
| 12 | `overview/ErrorMessage.tsx` | dormant duplicate | Zero importers |
| 13 | `overview/LoadingSpinner.tsx` | dormant duplicate | Zero importers |
| 14 | `schedule/AdminScheduleTab.tsx` + `admin-sessions/AdminScheduleTab.tsx` shim | legacy dead-end | Only "consumer" is a deprecated shim nothing imports |
| 15 | `adminReportsController.mjs` (TWO copies: `Pages/admin-dashboard/` + `components/`) | **misfiled backend code in frontend tree** | Backend controller, two drifting copies, wired to nothing. Highest-priority removal — actively misleading |
| 16 | `components/TrainerManagement/TrainerPermissionsManager.tsx` | competing duplicate | Dead twin of the live `components/Admin/TrainerPermissionsManager.tsx` |

**Not proposed (explicitly kept):** `WidgetSkeleton.tsx` (live shared utility), everything mounted per the Rule-27 table, and all `.agents`/reference material.

**.gitignore proposal (Rule 39):** none — no recurring artifact class surfaced in this workstream.

**Phase 2 execution plan (ON APPROVAL ONLY):** one commit, `git mv` each file to the archive dir, re-run: full admin-dashboard vitest directory, `tsc --noEmit`, vite build, and a repo-wide grep for each moved basename (final reference check before the move — Rule 34). Any hit = that file stays.

**Sean's one-word options:** "approve hygiene" (all 16) · "approve hygiene except N,M" · "reject".
