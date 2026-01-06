# Phase 0 Design Review: Dashboard Architecture Analysis

## Overview
Purpose: Unified review of admin, client, and trainer dashboard architecture and the Phase 2 backend integration plan.
Status: Active - updated for Option 3 (tab/badge sync) and Option 4 (backend integration).
References:
- docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
- DASHBOARD-DEEP-ANALYSIS-AUDIT-REPORT.md
- DASHBOARD-TAB-ORGANIZATION-VISUAL.md (wireframes + tab map)

## Scope
Files in scope for this phase:
- frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx
- frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx
- frontend/src/components/ClientDashboard/StellarSidebar.tsx
- frontend/src/components/TrainerDashboard/StellarComponents/TrainerStellarSidebar.tsx
- backend/routes/dashboardRoutes.mjs
- backend/routes/dashboardStatsRoutes.mjs
- backend/controllers/scheduleController.mjs
- backend/routes/adminAnalyticsRoutes.mjs (alias endpoints)
- backend/services/trainerAssignmentService.mjs (assignment stats fix)
- backend/routes/adminNotificationsRoutes.mjs (new)
- backend/routes/clientDashboardRoutes.mjs (new)

## Architecture Overview
```mermaid
flowchart LR
  subgraph Frontend
    A[Admin Dashboard] -->|authAxios| AA[/api/admin/statistics/*/]
    A -->|authAxios| AN[/api/admin/notifications/]
    C[Client Dashboard] -->|apiClient| DS[/api/dashboard/stats/]
    C -->|apiClient| DO[/api/dashboard/overview/]
    C -->|apiClient| DR[/api/dashboard/recent-activity/]
    C -->|apiClient| CP[/api/client/progress/]
    C -->|apiClient| CA[/api/client/achievements/]
    C -->|apiClient| CC[/api/client/challenges/]
    C -->|apiClient| CW[/api/client/workout-stats/]
    S[Unified Schedule] -->|api| SCH[/api/schedule/]
  end

  subgraph Backend
    AA --> U[User]
    AA --> O[Order]
    AA --> WS[WorkoutSession]
    AA --> SE[Session]
    AN --> N[Notification]
    DS --> WS
    DS --> SE
    DO --> SE
    DO --> N
    DR --> WS
    CP --> CPD[ClientProgress]
    CA --> CPD
    CC --> CPD
    CW --> WS
    SCH --> SE
  end
```

## Data Flow (Client Dashboard)
```mermaid
sequenceDiagram
  participant UI as Client Dashboard
  participant API as Backend API
  participant DB as PostgreSQL

  UI->>API: GET /api/dashboard/stats
  API->>DB: WorkoutSession + Session aggregates
  DB-->>API: stats
  API-->>UI: { success, stats }

  UI->>API: GET /api/dashboard/overview
  API->>DB: upcoming sessions + notifications
  DB-->>API: overview
  API-->>UI: { success, overview }

  UI->>API: GET /api/dashboard/recent-activity
  API->>DB: recent workouts + notifications
  DB-->>API: activities
  API-->>UI: { success, activities }
```

## Database ERD (Dashboard Metrics)
```mermaid
erDiagram
  users ||--o{ sessions : "client/trainer"
  users ||--o{ workout_sessions : "client"
  users ||--o{ notifications : "recipient"
  users ||--o{ orders : "purchases"
  users ||--|| client_progress : "progress"

  sessions {
    int id
    int userId
    int trainerId
    datetime sessionDate
    string status
  }
  workout_sessions {
    uuid id
    int userId
    datetime startedAt
    string status
  }
  notifications {
    int id
    int userId
    string title
    text message
    bool read
  }
  orders {
    int id
    int userId
    decimal totalAmount
    string status
  }
  client_progress {
    int id
    int userId
    int overallLevel
    text achievements
  }
```

## API Specs (Phase 2 Integration)

### Admin Statistics (new aliases)
- GET /api/admin/statistics/revenue
- GET /api/admin/statistics/users
- GET /api/admin/statistics/workouts
- GET /api/admin/statistics/system-health

### Dashboard
- GET /api/dashboard/stats
- GET /api/dashboard/overview
- GET /api/dashboard/recent-activity

### Client
- GET /api/client/progress
- GET /api/client/achievements
- GET /api/client/challenges
- GET /api/client/workout-stats

### Schedule
- GET /api/schedule (start/end optional; defaults to rolling window)

### Admin Notifications
- GET /api/admin/notifications
- DELETE /api/admin/notifications/:id
- POST /api/admin/notifications/broadcast

## WHY Sections
- WHY add /api/admin/statistics/* aliases?
  - Frontend integration expects these paths from the audit report.
  - Aliases allow reuse of existing analytics logic without breaking current clients.

- WHY allow optional start/end on /api/schedule?
  - Client dashboard service currently fetches without date range; defaults prevent 400 errors.

- WHY standardize dashboard stats endpoints?
  - Eliminates mixed mock/real data and removes dual-state UX confusion.

- WHY add status badges on client/trainer sidebars?
  - Makes incomplete or mock sections visible to avoid user confusion.

## Split Strategy (Non-Monolith Compliance)
Target: keep components <= 300 lines.

1) admin-dashboard-view.tsx
- Move overview logic to: frontend/src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx
- Move styled components to: frontend/src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverview.styles.ts
- Keep admin-dashboard-view.tsx as layout + section routing only

2) UnifiedAdminDashboardLayout.tsx
- Move route config to: frontend/src/components/DashBoard/AdminRouteConfig.tsx
- Move layout shell to: frontend/src/components/DashBoard/AdminLayoutShell.tsx

3) Client StellarSidebar
- Move styled components to: frontend/src/components/ClientDashboard/StellarSidebar.styles.ts
- Move navigation config + status meta to: frontend/src/components/ClientDashboard/StellarSidebar.config.ts

4) Trainer StellarSidebar
- Move styled components to: frontend/src/components/TrainerDashboard/StellarComponents/TrainerStellarSidebar.styles.ts
- Move navigation config + status meta to: frontend/src/components/TrainerDashboard/StellarComponents/TrainerStellarSidebar.config.ts

## Notes
- Use models cache for new routes (import { getAllModels, getModel, Op } from backend/models/index.mjs).
- Do not introduce new mock data. If no records exist, return empty arrays with success.
- Keep current UI structure; update data sources only.

## Review Questions
1) Do endpoints cover all dashboard data needed for 2026 revenue readiness?
2) Any remaining mock data sources after this phase?
3) Any performance hotspots in dashboard aggregates?
