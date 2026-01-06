# Admin Dashboard Backend Architecture

Status: Draft - Documentation-first remediation for dashboard backend integration.
Last Updated: 2026-01-04
Owner: ChatGPT-5

## Purpose
Provide architecture diagrams and backend specifications for the admin dashboard
integration work so future changes follow the documentation-first protocol.

## Scope
This document covers:
- Admin statistics and health endpoints
- Dashboard stats and overview data
- Admin notifications and broadcast workflow
- Client dashboard endpoints used by the frontend service
- Notifications API alignment

## References
- docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
- docs/ai-workflow/reviews/dashboard-architecture-review.md
- backend/routes/admin/analyticsRevenueRoutes.mjs
- backend/routes/admin/analyticsUserRoutes.mjs
- backend/routes/admin/analyticsSystemRoutes.mjs
- backend/routes/dashboard/sharedDashboardRoutes.mjs
- backend/routes/dashboard/adminDashboardRoutes.mjs
- backend/routes/adminNotificationsRoutes.mjs
- backend/routes/clientDashboardRoutes.mjs
- backend/routes/notificationRoutes.mjs

## Architecture Overview
```mermaid
flowchart LR
  subgraph Frontend
    AO[Admin Overview Panel] -->|GET /api/admin/statistics/*| STATS
    AN[Admin Notifications UI] -->|GET/POST/DELETE /api/admin/notifications| NOTIFY_ADMIN
    CD[Client Dashboard Service] -->|GET /api/dashboard/stats| DASH_STATS
    CD -->|GET /api/dashboard/overview| DASH_OVERVIEW
    CD -->|GET /api/dashboard/recent-activity| DASH_ACTIVITY
    CD -->|GET /api/client/*| CLIENT_API
    CD -->|GET/PUT/PATCH /api/notifications| NOTIFY_USER
  end

  subgraph Backend
    STATS[analytics routes] --> DB[(PostgreSQL)]
    NOTIFY_ADMIN[adminNotificationsRoutes] --> DB
    DASH_STATS[sharedDashboardRoutes] --> DB
    DASH_OVERVIEW[sharedDashboardRoutes] --> DB
    DASH_ACTIVITY[sharedDashboardRoutes] --> DB
    CLIENT_API[clientDashboardRoutes] --> DB
    NOTIFY_USER[notificationRoutes] --> DB
  end
```

## Data Flow - Admin Overview Metrics
```mermaid
sequenceDiagram
  participant UI as Admin Overview Panel
  participant API as analyticsRoutes
  participant DB as PostgreSQL

  UI->>API: GET /api/admin/statistics/revenue?timeRange=30d
  API->>DB: SUM orders.totalAmount by date range
  DB-->>API: revenue totals + trend
  API-->>UI: { totalRevenue, changePercent, trend }

  UI->>API: GET /api/admin/statistics/users
  API->>DB: COUNT users + active users
  DB-->>API: totals + trend
  API-->>UI: { totalUsers, activeUsers, changePercent, trend }

  UI->>API: GET /api/admin/statistics/workouts
  API->>DB: COUNT sessions by status
  DB-->>API: completion rate + trend
  API-->>UI: { completionRate, changePercent, trend }

  UI->>API: GET /api/admin/statistics/system-health
  API->>DB: authenticate + response time
  DB-->>API: health metrics
  API-->>UI: { uptime, responseTime, services }
```

## Data Flow - Admin Notification Broadcast
```mermaid
sequenceDiagram
  participant Admin as Admin UI
  participant API as adminNotificationsRoutes
  participant DB as PostgreSQL

  Admin->>API: POST /api/admin/notifications/broadcast
  API->>DB: SELECT users by audience
  API->>DB: INSERT notifications (per user)
  API->>DB: INSERT admin_notifications (audit)
  DB-->>API: created records
  API-->>Admin: { success, notificationsCreated }
```

## Database ERD (Dashboard-Relevant)
```mermaid
erDiagram
  users ||--o{ sessions : "trainer and client"
  users ||--o{ workout_sessions : "client"
  users ||--o{ notifications : "recipient"
  users ||--o{ client_progress : "progress"
  users ||--o{ orders : "purchases"
  users ||--o{ admin_notifications : "admin alerts"

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
    datetime date
    string status
  }
  notifications {
    int id
    int userId
    string title
    text message
    bool read
  }
  client_progress {
    int id
    int userId
    text achievements
  }
  orders {
    int id
    int userId
    decimal totalAmount
    string status
  }
  admin_notifications {
    uuid id
    string type
    string priority
    bool isRead
  }
```

## API Specifications

### Admin Statistics
- GET /api/admin/statistics/revenue
  - Query: timeRange (24h, 7d, 30d, 90d, 1y)
  - Response: { totalRevenue, changePercent, trend, target }
- GET /api/admin/statistics/users
  - Response: { totalUsers, activeUsers, changePercent, trend, target }
- GET /api/admin/statistics/workouts
  - Response: { completionRate, changePercent, trend, target }
- GET /api/admin/statistics/system-health
  - Response: { uptime, responseTime, services, trend }

### Dashboard
- GET /api/dashboard/stats
  - Response: { stats: { totalWorkouts, weeklyWorkouts, ... } }
- GET /api/dashboard/overview
  - Response: { overview: { recentActivity, upcomingSessions, notifications } }
- GET /api/dashboard/recent-activity
  - Response: { activities: [] }

### Admin Notifications
- GET /api/admin/notifications
  - Response: { notifications, stats }
- POST /api/admin/notifications/broadcast
  - Body: { title, content, type, audience, channels, userIds }
  - Response: { notificationsCreated, notification }
- DELETE /api/admin/notifications/:id
  - Response: { message }

### Client Dashboard
- GET /api/client/progress
  - Response: { progress }
- GET /api/client/achievements
  - Response: { achievements, count }
- GET /api/client/challenges
  - Response: { challenges }
- GET /api/client/workout-stats
  - Response: { stats: { totalWorkouts, totalMinutes, averageDuration, lastWorkoutDate } }

### Notifications (User)
- GET /api/notifications
- PUT or PATCH /api/notifications/:id/read
- PUT or PATCH /api/notifications/read-all
- GET /api/notifications/count
- DELETE /api/notifications/:id

## Security Model
- All routes require JWT auth (protect middleware).
- Admin-only routes use adminOnly middleware.
- Trainer or admin metrics use trainerOrAdminOnly middleware.
- User notifications restrict to req.user.id ownership.

## Error Handling
- 400: invalid user ID or missing required fields
- 401: unauthenticated request
- 403: unauthorized (non-admin)
- 404: notification not found
- 500: server errors, DB failures

## Performance Considerations
- Use indexed fields for counts and date filtering.
- Trend queries aggregate by DATE to reduce payload.
- System health uses lightweight DB authenticate for response time.

## WHY Decisions
- WHY replace mock data with real aggregates?
  - Prevents dual-state UX and aligns with revenue readiness goals.
- WHY add /statistics aliases?
  - Frontend expects /api/admin/statistics/* from audit recommendations.
- WHY broadcast creates both notifications and admin_notifications?
  - User notifications deliver messages; admin_notifications keep audit trail.
- WHY default schedule date range?
  - Avoids 400 errors when clients fetch without dates.

## Testing Checklist
- Admin overview loads without mock values.
- /api/admin/notifications returns real data and supports broadcast.
- Client dashboard service endpoints respond with real data or empty arrays.
- Notifications PATCH aliases work with frontend service.
