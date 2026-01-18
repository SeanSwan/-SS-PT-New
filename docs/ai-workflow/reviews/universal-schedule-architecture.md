# Universal Schedule Architecture - Phase 0 Design Review

**Date Started:** 2026-01-17
**Status:** IN REVIEW
**Priority:** HIGH
**Owner:** AI Village

---

## Quick Links

- Registry: [PHASE-0-REGISTRY.md](../PHASE-0-REGISTRY.md)
- Prompts: [AI-ROLE-PROMPTS.md](../AI-ROLE-PROMPTS.md)
- Process Guide: [PHASE-0-DESIGN-APPROVAL.md](../PHASE-0-DESIGN-APPROVAL.md)

---

## 1. Context & Background

**Current Situation:**
- Scheduling is split across AdminScheduleTab, TrainerScheduleTab, and ClientScheduleTab.
- Mobile experience is inconsistent and recurring sessions are missing.
- Features differ by role, causing gaps and support load.

**Business Requirements:**
- MindBody parity: recurring sessions, time blocking, notification toggles.
- One calendar with role-based views and permissions.
- Mobile-first usability on phone and tablet.
- Store is the source of truth for credits and session limits.
- Replace all existing schedule components once UniversalSchedule is ready.

**Decisions (User Confirmed):**
- Replace ALL existing schedule components with UniversalSchedule.
- Notification channels: Email, SMS, Push.
- Implementation order: Backend and frontend in parallel.
- Recurring limit: Max 52 occurrences or 12 months, whichever comes first.

**Reference Docs:**
- docs/systems/UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md (business logic source of truth)
- docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md (priority tracking)

---

## 2. Design Artifacts

### A. Architecture Diagram (Mermaid)

```mermaid
graph TD
  subgraph Frontend
    A[UniversalSchedule]
    A --> B[ScheduleCalendar]
    A --> C[SessionModal]
    A --> D[RecurringOptions]
    A --> E[ScheduleFilters]
  end

  subgraph Backend
    F[Session Controller]
    G[Session Service]
    H[Notification Service]
    I[Credit Service]
  end

  subgraph Database
    J[(Sessions)]
    K[(Users)]
    L[(Orders/Credits)]
  end

  A -->|REST| F
  F --> G
  G --> J
  G --> H
  G --> I
  I --> L
  G --> K
```

### B. ERD (Mermaid)

```mermaid
erDiagram
  USERS ||--o{ SESSIONS : books
  USERS ||--o{ SESSIONS : trains
  USERS {
    int id
    string role
    jsonb notificationPreferences
  }
  SESSIONS {
    int id
    datetime sessionDate
    int duration
    string status
    int userId
    int trainerId
    boolean isRecurring
    uuid recurringGroupId
    string recurrenceRule
    boolean notifyClient
    boolean isBlocked
  }
```

### C. User Flow (Mermaid)

```mermaid
flowchart TD
  A[Open Schedule] --> B{Role}
  B -->|Admin| C[View All Sessions]
  B -->|Trainer| D[View Assigned + Availability]
  B -->|Client| E[View Bookable Slots]
  E --> F{Has Credits}
  F -->|Yes| G[Book Session]
  F -->|No| H[Show Store CTA]
  G --> I[Create Session Record]
  I --> J{notifyClient}
  J -->|true| K[Send Email/SMS/Push]
  J -->|false| L[Silent Booking]
  K --> M[Update UI]
  L --> M
```

### D. Wireframe/Mockup (ASCII)

```
+------------------------------------------------------------+
| Universal Schedule (Month/Week/Day/Agenda)                 |
+----------------------+----------------------+--------------+
| Filters              | Calendar             | Details      |
| - Trainer            | [Calendar Grid]      | Session Card |
| - Location           |                      | - Status     |
| - Type               |                      | - Actions    |
+----------------------+----------------------+--------------+
| Mobile: Agenda list with "Book" and "Block" actions        |
+------------------------------------------------------------+
```

### E. Visual Design Specs

- Colors: Galaxy core background, cyan/purple accents, glass surfaces.
- Typography: Display serif for headings, sans serif for body.
- Motion: 120-180ms hover/selection transitions.

### F. User Stories

```
As an admin,
I want to create and edit recurring sessions,
So that I can manage schedules at scale.

As a trainer,
I want to block out time,
So that I can prevent booking conflicts.

As a client,
I want to book sessions on mobile,
So that I can schedule quickly without calling.
```

**Acceptance Criteria:**
- [ ] Admin can create a recurring series with an RRule string.
- [ ] Trainer can block time and it shows as unavailable.
- [ ] Client cannot book with zero credits.
- [ ] All roles can use the schedule on mobile.

### G. API Specification (Draft)

```yaml
# Session Endpoints (Universal Schedule)
GET    /api/sessions
GET    /api/sessions/:id
POST   /api/sessions
PUT    /api/sessions/:id
DELETE /api/sessions/:id

# Recurring
POST   /api/sessions/recurring
PUT    /api/sessions/recurring/:groupId
DELETE /api/sessions/recurring/:groupId

# Blocking
POST   /api/sessions/block
DELETE /api/sessions/block/:id

# Actions
POST   /api/sessions/:id/book
POST   /api/sessions/:id/complete
```

### H. Database Schema (Session + User Additions)

```sql
ALTER TABLE "Sessions" ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;
ALTER TABLE "Sessions" ADD COLUMN "recurringGroupId" UUID NULL;
ALTER TABLE "Sessions" ADD COLUMN "recurrenceRule" TEXT NULL; -- RFC 5545
ALTER TABLE "Sessions" ADD COLUMN "notifyClient" BOOLEAN DEFAULT true;
ALTER TABLE "Sessions" ADD COLUMN "isBlocked" BOOLEAN DEFAULT false;

ALTER TABLE "Users" ADD COLUMN "notificationPreferences" JSONB;
```

### I. Component Structure (Frontend)

```
frontend/src/components/Schedule/
|-- UniversalSchedule.tsx
|-- ScheduleCalendar.tsx
|-- SessionModal.tsx
|-- RecurringOptions.tsx
`-- ScheduleFilters.tsx
```

---

## 3. Technical Requirements

**Galaxy-Swan Theme Compliance:**
- [ ] Galaxy core gradient + starfield background
- [ ] Glass surfaces with gradient borders
- [ ] Micro-interactions within 120-180ms
- [ ] Display serif for H1/H2
- [ ] Swan motifs in key UI accents

**Performance:**
- [ ] Fetch sessions by date range (month window).
- [ ] Debounce filter changes.
- [ ] Avoid rerenders on drag and drop.

**Accessibility:**
- [ ] Keyboard navigation for calendar grid.
- [ ] ARIA labels for slots and events.
- [ ] Reduced motion support.

**Security:**
- [ ] RBAC on all endpoints.
- [ ] Input validation and conflict checks.
- [ ] Rate limit booking endpoints.

---

## 4. Error Handling Matrix

| Scenario | Status | Response | UI Behavior |
|---------|--------|----------|-------------|
| Double-book conflict | 409 | Conflict | Show conflict message + retry |
| No credits | 402 | Payment Required | Show store CTA |
| Unauthorized | 401 | Unauthorized | Redirect to login |
| Forbidden role | 403 | Forbidden | Access denied message |
| Invalid recurrenceRule | 400 | Bad Request | Validation error in modal |
| Server error | 500 | Server Error | Show retry and log |

---

## 5. Edge Cases

1. Double booking (same trainer, same time): reject with 409.
2. Client has zero credits: block booking and prompt store CTA.
3. Cancel within 24 hours: no refund unless admin override.
4. Edit recurring series: choose "this event" or "all events".
5. Timezone mismatch: store UTC, display local time.
6. Recurring limit reached: prevent further generation beyond cap.

---

## 6. Out of Scope (Phase 2)

- Waitlist.
- Late cancel fees.
- External calendar sync (Google/Outlook).

---

## 7. Success Metrics

- Mobile booking flow under 30 seconds.
- Zero double bookings in production.
- 100 percent of scheduling flows migrated to UniversalSchedule.

---

## 8. Notification System

**Storage:**
- Per-session: notifyClient boolean on Session model.
- Per-user: notificationPreferences JSONB on User model.

Example notificationPreferences:
```json
{
  "email": true,
  "sms": true,
  "push": true,
  "quietHours": { "start": "22:00", "end": "07:00" }
}
```

**Triggers:**
| Event | Notify Client | Notify Trainer |
|-------|---------------|----------------|
| Session booked | If notifyClient=true | Always |
| Session canceled (>24h) | If notifyClient=true | Always |
| Session canceled (<24h) | Always | Always |
| Session rescheduled | If notifyClient=true | Always |
| Reminder (24h prior) | Per user prefs | Per user prefs |

---

## 9. AI Reviews (APPEND ONLY)

### Claude Code (Integration)
**Date:** 2026-01-17 00:00
**Verdict:** PENDING

[Review content]

---

### Roo Code (Backend)
**Date:** 2026-01-17 00:00
**Verdict:** PENDING

[Review content]

---

### ChatGPT-5 (QA)
**Date:** 2026-01-17 00:00
**Verdict:** PENDING

[Review content]

---

### Claude Desktop (Orchestrator and Security)
**Date:** 2026-01-17 00:00
**Verdict:** PENDING

[Review content]

---

### Gemini Code Assist (Frontend)
**Date:** 2026-01-17 00:00
**Verdict:** PENDING

[Review content]

---

## 10. Resolution Log

**Issue #1:** [Description]
- **Raised by:** [AI name]
- **Severity:** CONCERN / BLOCKER
- **Resolution:** [What was changed]
- **Status:** RESOLVED / IN PROGRESS

---

## 11. Consensus Summary

**Status:** PENDING / CONSENSUS REACHED / BLOCKED

**Approvals:** [X/5]
- Claude Code: [APPROVED/CONCERNS/BLOCKED/PENDING]
- Roo Code: [APPROVED/CONCERNS/BLOCKED/PENDING]
- ChatGPT-5: [APPROVED/CONCERNS/BLOCKED/PENDING]
- Claude Desktop: [APPROVED/CONCERNS/BLOCKED/PENDING]
- Gemini: [APPROVED/CONCERNS/BLOCKED/PENDING]

**Issues Resolved:** [X/X] (100%)

**Final Consensus Date:** [YYYY-MM-DD]

**Next Step:** Move to Phase 1-7 implementation via `docs/ai-workflow/FEATURE-TEMPLATE.md`.

**Implementation Branch:** `feature/universal-schedule`

---

**File Size:** Keep this file focused. If it exceeds 800 lines, consider splitting artifacts into separate docs.
