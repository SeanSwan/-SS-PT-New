# Repo Hygiene Inventory - 2026-05-26

## Trigger

Golden Path Lockdown dashboard audit for SwanStudios admin, trainer, and client personal-training workflows.

This is Phase 1 only: non-destructive inventory. No files were moved, deleted, archived, or ignored as part of this record.

## Scope

Target workflows:

- Admin: client management, onboarding, coach command center, workout assignment/logging, progress review, schedule, sessions.
- Trainer: client list, workout logging, progress review, schedule, coach assistant.
- Client: assigned workouts, self logging, progress, schedule, coach assistant.

## Root-Level Inventory

| Class | Examples | Classification | Action |
| --- | --- | --- | --- |
| Operating docs | `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md` | active reference docs | keep |
| Runtime/config | `package.json`, `package-lock.json`, `render.yaml`, `backend/`, `frontend/` | active runtime code/config | keep |
| Workflow docs | `docs/ai-workflow/`, `.ai-workflow/` | active reference and handoff docs | keep |
| Temp logs | `combined.log`, `error.log` | QA/temp output | cleanup candidate after approval |
| Root QA screenshots | `kintrust-*.png`, `phase*.png` | QA artifact/temp output | cleanup candidate after approval |
| Responsive notes | `responsive-*.md` | QA artifact or analysis note | classify in cleanup pass before moving |

## Canonical Dashboard Surface Inventory

`frontend/src/components/DashBoard/UniversalDashboardLayout.tsx` is the canonical role-dashboard route tree for this audit.

| Surface | Canonical file/component | Classification | Evidence |
| --- | --- | --- | --- |
| Admin coach command center | `CoachCommandCenterPage` | active runtime code | mounted from admin `/coach-assistant` |
| Admin clients and team | `ClientsWorkspace` | active runtime code | mounted from admin `/client-management` |
| Admin client onboarding | `ClientOnboardingWizard` | active runtime code | mounted from admin `/client-onboarding` |
| Admin progress tracking | `AdminClientProgressView` | active runtime code | mounted from admin `/client-progress-tracking` |
| Admin workout planning | `WorkoutPlanBuilder` | active runtime code | mounted from admin `/workouts/:clientId?` |
| Admin workout logging | `EnhancedWorkoutLogger` | active runtime code | mounted from admin `/log-workout` |
| Admin schedule | `UniversalSchedule` | active runtime code | mounted from admin `/master-schedule` |
| Trainer clients | `MyClientsView` | active runtime code | mounted from trainer `/clients` |
| Trainer workout logging | `EnhancedWorkoutLogger` | active runtime code | mounted from trainer `/log-workout` |
| Trainer progress | `EnhancedClientProgressView` | active runtime code | mounted from trainer `/client-progress` |
| Trainer schedule | `UniversalSchedule` | active runtime code | mounted from trainer `/schedule` |
| Trainer coach assistant | `SwanCoachAssistantPage` | active runtime code | mounted from trainer `/coach-assistant` |
| Client workouts | `ClientMyWorkoutsPage` | active runtime code | mounted from client `/workouts` |
| Client workout logging | `WorkoutLogger` | active runtime code | mounted from client `/log-workout` |
| Client progress | `ClientProgressDashboardPage` | active runtime code | mounted from client `/progress` |
| Client schedule | `UniversalSchedule` | active runtime code | mounted from client `/schedule` |
| Client coach assistant | `SwanCoachAssistantPage` | active runtime code | mounted from client `/coach-assistant` |

## Parallel Or Ambiguous Surfaces

| File or surface | Classification | Notes |
| --- | --- | --- |
| `frontend/src/routes/main-routes.tsx` | active runtime route tree, parallel to dashboard roles | Do not use as proof for role-dashboard surfaces unless the target URL is outside `/dashboard/...`. |
| Admin `/client-details` route | legacy redirect | Redirects to `/dashboard/admin/client-management`; not a separate active client-detail workspace. |
| Older workout builder surfaces outside role dashboard | ambiguous | Must be classified per route before any direct edits. |
| Coach assistant files shared by trainer/client | active runtime code | Separate from admin `CoachCommandCenterPage`; do not mix claims between them. |

## Proposed Cleanup Backlog

No cleanup is approved or performed here. If Sean approves a later Phase 2 cleanup, verify references again before moving anything.

- Move root QA screenshots into an approved QA archive folder.
- Move or delete temp logs after confirming they are not active diagnostics.
- Classify `responsive-*.md` notes before relocating.
- Consider a `.gitignore` update for recurring root temp artifacts such as `combined.log`, `error.log`, and root QA screenshot patterns.

## Next Slice Gate

Before coding the first Golden Path slice, produce the task-specific Canonical Surface Receipt for the exact caller path being changed:

1. Role route mount in `UniversalDashboardLayout.tsx`.
2. Mounted JSX page/component.
3. Consumer hook/service.
4. Exact frontend API path or navigation string.
5. Backend route/model evidence if the slice crosses the API boundary.
6. Competing-surface classification if any sibling file appears to do the same job.
