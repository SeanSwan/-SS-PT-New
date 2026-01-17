# Admin Dashboard Backend Architecture

Status: Updated - Added Phase 1 Client Onboarding endpoints
Last Updated: 2026-01-15
Owner: ChatGPT-5 (with Phase 1 updates by Claude Code)

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
- **Phase 1: Client Onboarding endpoints** (onboarding questionnaire, movement screen, client data overview)

## References
- docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md
- docs/ai-workflow/reviews/dashboard-architecture-review.md
- docs/ai-workflow/blueprints/ONBOARDING-FLOW.mermaid.md (Phase 1)
- docs/ai-workflow/blueprints/ONBOARDING-WIREFRAMES.md (Phase 1)
- backend/routes/admin/analyticsRevenueRoutes.mjs
- backend/routes/admin/analyticsUserRoutes.mjs
- backend/routes/admin/analyticsSystemRoutes.mjs
- backend/routes/dashboard/sharedDashboardRoutes.mjs
- backend/routes/dashboard/adminDashboardRoutes.mjs
- backend/routes/adminNotificationsRoutes.mjs
- backend/routes/clientDashboardRoutes.mjs
- backend/routes/notificationRoutes.mjs
- backend/routes/onboardingRoutes.mjs (Phase 1 - to be created)
- backend/routes/clientDataRoutes.mjs (Phase 1 - to be created)

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
    OQ[Onboarding Questionnaire] -->|POST/GET /api/onboarding/:userId/questionnaire| ONBOARDING
    MS[Movement Screen Form] -->|POST /api/onboarding/:userId/movement-screen| ONBOARDING
    RCD[Revolutionary Client Dashboard] -->|GET /api/client-data/overview/:userId| CLIENT_DATA
    AOM[Admin Onboarding Manager] -->|POST/GET /api/onboarding/*| ONBOARDING
  end

  subgraph Backend
    STATS[analytics routes] --> DB[(PostgreSQL)]
    NOTIFY_ADMIN[adminNotificationsRoutes] --> DB
    DASH_STATS[sharedDashboardRoutes] --> DB
    DASH_OVERVIEW[sharedDashboardRoutes] --> DB
    DASH_ACTIVITY[sharedDashboardRoutes] --> DB
    CLIENT_API[clientDashboardRoutes] --> DB
    NOTIFY_USER[notificationRoutes] --> DB
    ONBOARDING[onboardingRoutes] --> DB
    CLIENT_DATA[clientDataRoutes] --> DB
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

## Data Flow - Client Onboarding (Phase 1)
```mermaid
sequenceDiagram
  participant Client as Client Browser
  participant Frontend as Onboarding Questionnaire UI
  participant API as onboardingRoutes
  participant Auth as Auth Middleware
  participant RBAC as RBAC Check
  participant DB as PostgreSQL

  Note over Client,DB: Step 1: Submit Questionnaire

  Client->>Frontend: Complete 85 questions (13 sections)
  Frontend->>Frontend: Validate all required fields
  Frontend->>API: POST /api/onboarding/:userId/questionnaire<br/>{questionnaireVersion, responses}

  API->>Auth: Verify JWT token
  Auth-->>API: req.user authenticated

  API->>RBAC: Check role (admin/trainer/client)
  RBAC->>RBAC: Client can only access self<br/>Trainer can access assigned clients<br/>Admin can access any client
  RBAC-->>API: Authorized

  API->>API: Auto-extract indexed fields:<br/>primaryGoal, trainingTier, commitmentLevel,<br/>healthRisk, nutritionPrefs
  API->>DB: INSERT INTO client_onboarding_questionnaires<br/>(userId, responsesJson, primaryGoal, etc.)
  DB-->>API: Questionnaire created (id: 1)
  API-->>Frontend: 201 Created {questionnaire}
  Frontend-->>Client: Show success + redirect to dashboard

  Note over Client,DB: Step 2: Movement Screen (Admin/Trainer Only)

  Client->>Client: Book movement screen appointment

  participant Trainer as Trainer/Admin
  participant AdminUI as Movement Screen Form

  Trainer->>AdminUI: Open movement screen for client
  AdminUI->>API: POST /api/onboarding/:userId/movement-screen<br/>{parqScreening, overheadSquatAssessment,<br/>posturalAssessment, performanceAssessments,<br/>flexibilityNotes, injuryNotes, painLevel}

  API->>Auth: Verify JWT token
  Auth-->>API: req.user authenticated

  API->>RBAC: Check role (admin/trainer only)
  alt Client role
    RBAC-->>API: 403 Forbidden
    API-->>AdminUI: Error: Only trainers can assess
  else Admin or Trainer
    RBAC-->>API: Authorized
    API->>API: Calculate NASM score + OPT phase<br/>Generate corrective exercise strategy
    API->>DB: INSERT INTO client_baseline_measurements<br/>(userId, parqScreening, overheadSquatAssessment,<br/>nasmAssessmentScore, posturalAssessment,<br/>performanceAssessments, correctiveExerciseStrategy, etc.)
    DB-->>API: Movement screen created
    API-->>AdminUI: 201 Created {movementScreen}
    AdminUI-->>Trainer: Show success + NASM score (0-100)
  end

  Note over Client,DB: Step 3: Load Client Dashboard

  Client->>Frontend: Navigate to dashboard
  Frontend->>API: GET /api/client-data/overview/:userId

  API->>Auth: Verify JWT token
  Auth-->>API: req.user authenticated

  API->>RBAC: Check role access
  RBAC-->>API: Authorized

  par Aggregate from 6 tables
    API->>DB: SELECT * FROM client_onboarding_questionnaires<br/>WHERE userId = :userId
    DB-->>API: Questionnaire data

    API->>DB: SELECT * FROM client_baseline_measurements<br/>WHERE userId = :userId ORDER BY createdAt DESC LIMIT 1
    DB-->>API: NASM assessment score

    API->>DB: SELECT * FROM client_nutrition_plans<br/>WHERE userId = :userId AND status = 'active'
    DB-->>API: Nutrition plan

    API->>DB: SELECT COUNT(*) FROM client_photos<br/>WHERE userId = :userId
    DB-->>API: Photos count

    API->>DB: SELECT COUNT(*) FROM client_notes<br/>WHERE userId = :userId
    DB-->>API: Notes count
  end

  API->>API: Build overview object
  API-->>Frontend: 200 OK {overview}
  Frontend-->>Client: Display onboarding status,<br/>NASM score, measurements, etc.
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
  users ||--o{ client_onboarding_questionnaires : "onboarding"
  users ||--o{ client_baseline_measurements : "measurements"
  users ||--o{ client_nutrition_plans : "nutrition"
  users ||--o{ client_photos : "photos"
  users ||--o{ client_notes : "notes"

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
  client_onboarding_questionnaires {
    int id
    int userId
    string questionnaireVersion
    jsonb responsesJson
    string primaryGoal
    string trainingTier
    string commitmentLevel
    string healthRisk
    jsonb nutritionPrefs
    enum status
    datetime submittedAt
  }
  client_baseline_measurements {
    int id
    int userId
    decimal weight
    decimal bodyFatPercentage
    jsonb parqScreening
    jsonb overheadSquatAssessment
    int nasmAssessmentScore
    jsonb posturalAssessment
    jsonb performanceAssessments
    jsonb correctiveExerciseStrategy
    text flexibilityNotes
    text injuryNotes
    int painLevel
  }
  client_nutrition_plans {
    int id
    int userId
    int dailyCalories
    jsonb macros
    jsonb mealPlan
    enum status
    datetime startDate
  }
  client_photos {
    int id
    int userId
    string photoType
    string photoUrl
    text notes
    datetime takenAt
  }
  client_notes {
    int id
    int userId
    int createdBy
    enum noteType
    text content
    bool isPrivate
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

### Client Onboarding (Phase 1)
- POST /api/onboarding/:userId/questionnaire
  - Body: { questionnaireVersion, responses (JSONB with 85 questions) }
  - Auto-extracts: primaryGoal, trainingTier, commitmentLevel, healthRisk, nutritionPrefs
  - RBAC: Admin = any client, Trainer = assigned only, Client = self only
  - Response: { success, questionnaire }
- GET /api/onboarding/:userId/questionnaire
  - Returns most recent questionnaire with all indexed fields
  - RBAC: Admin = any client, Trainer = assigned only, Client = self only
  - Response: { success, questionnaire }
- POST /api/onboarding/:userId/movement-screen
  - Body: { parqScreening, overheadSquatAssessment, posturalAssessment, performanceAssessments, flexibilityNotes, injuryNotes, painLevel }
  - Calculates nasmAssessmentScore (0-100) + correctiveExerciseStrategy
  - RBAC: Admin/Trainer only (clients cannot self-assess)
  - Response: { success, movementScreen }
- GET /api/client-data/overview/:userId
  - Aggregates data from 6 tables: questionnaires, measurements, nutrition, photos, notes
  - RBAC: Admin = any client, Trainer = assigned only, Client = self only
  - Response: { success, overview }

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
- WHY auto-extract indexed fields from questionnaire responsesJson? (Phase 1)
  - Performance: Frequently queried fields (primaryGoal, trainingTier, etc.) need indexing for fast filtering
  - Flexibility: Full questionnaire data stays in JSONB for future changes without schema migrations
  - AI Integration: Indexed fields provide quick context for AI workout generation without parsing 85 questions
- WHY calculate NASM assessment score from OHSA compensations? (Phase 1)
  - Standardization: NASM OHSA scoring provides a certified baseline
  - Clarity: Single 0-100 score is easy to interpret across clients
  - AI Input: Numeric score simplifies training phase selection + progression
- WHY restrict movement screen creation to admin/trainer only? (Phase 1)
  - Safety: Only trained professionals can accurately assess movement patterns
  - Liability: Prevents clients from self-diagnosing injury risks
  - Data Quality: Ensures consistent, professional assessment standards

## Testing Checklist
- Admin overview loads without mock values.
- /api/admin/notifications returns real data and supports broadcast.
- Client dashboard service endpoints respond with real data or empty arrays.
- Notifications PATCH aliases work with frontend service.

### Phase 1 Onboarding Tests (To Be Created)
- POST /api/onboarding/:userId/questionnaire creates record with auto-extracted indexed fields
- GET /api/onboarding/:userId/questionnaire returns most recent questionnaire with completion %
- POST /api/onboarding/:userId/movement-screen calculates NASM score correctly (0-100 from OHSA)
- POST /api/onboarding/:userId/movement-screen rejects client role (403 Forbidden)
- GET /api/client-data/overview/:userId aggregates from 6 tables correctly
- RBAC: Client cannot create questionnaire for another user (403 Forbidden)
- RBAC: Trainer can only access assigned clients (403 for unassigned)
- RBAC: Admin can access any client (200 OK for all endpoints)

---

**Phase 1 Documentation Complete:** 2026-01-15
**Next:** ChatGPT-5 to implement controllers and routes per PHASE-1-START-DIRECTIVE.md
