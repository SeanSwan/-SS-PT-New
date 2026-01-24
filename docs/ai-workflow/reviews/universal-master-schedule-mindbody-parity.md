# Universal Master Schedule - MindBody Feature Parity Upgrade - Phase 0 Design Review

**Date Started:** 2026-01-22
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
- Universal Master Schedule exists with single view and basic create flows.
- Missing multi-view calendar, drag-and-drop rescheduling, conflict detection, waitlist, and trainer availability.

**Business Requirements:**
- Match MindBody scheduling parity with a Galaxy-Swan premium UX.
- Increase admin and trainer efficiency; reduce scheduling time and errors.
- Maintain role-specific access and client privacy.

**Reference Docs:**
- `docs/systems/UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md`
- `docs/ai-workflow/reviews/universal-schedule-architecture.md`

---

## 2. Design Artifacts

### A. Wireframe/Mockup (ASCII)

View selector header:
```
| [Month] [Week] [Day] [Agenda]    < Jan 2026 >    [Today] |
```

Month view (cosmic grid):
```
| SUN | MON | TUE | WED | THU | FRI | SAT |
|  29 |  30 |  31 |  1  |  2  |  3  |  4  |
|     |     |     | [2] | [3] | [1] |     |
|  5  |  6  |  7  |  8  |  9  | 10  | 11  |
| [1] | [4] | [2] | [3] | BLK | [5] |     |
Legend: [N] = count, dot = session, BLK = blocked
```

Day view (trainer lanes):
```
| TIME | Sean Swan | Trainer 2 | Trainer 3 |
| 7am  | AVAILABLE |           | AVAILABLE |
| 8am  | BOOKED    | BOOKED    | AVAILABLE |
| 9am  | BLOCKED   |           | AVAILABLE |
```

Agenda view (timeline):
```
| TODAY |
| 8:00 AM  John Doe  Scheduled  [Edit] [Cancel] |
| 9:30 AM  Open Slot Available  [Book]          |
```

Conflict modal:
```
| Conflict Detected |
| Existing: 8:00-9:00 AM (Trainer conflict) |
| Suggested: 9:00 AM, 10:00 AM, 2:00 PM |
| [Cancel] [Force Override] [Pick Time] |
```

### B. Visual Design Specs

- **Colors:** Galaxy-Swan theme (cyan primary, purple secondary, deep space backgrounds).
- **Typography:** Display serif for H1/H2, sans for body.
- **Motion:** 120-180ms micro interactions, 300ms card hover, spring drag.
- **Glass:** translucent cards, blur(10px), gradient borders.

### C. User Stories

```
As an admin,
I want to switch between month/week/day/agenda views,
So that I can manage sessions at different levels of detail.
```

```
As a trainer,
I want to see my schedule in day and agenda views,
So that I can plan sessions without conflicts.
```

```
As a client (Phase 2),
I want to join a waitlist for a full session,
So that I can be notified when a spot opens.
```

**Acceptance Criteria:**
- [ ] View selector switches between Month/Week/Day/Agenda without reload.
- [ ] Day view supports trainer lanes with distinct availability states.
- [ ] Drag-and-drop reschedule validates conflicts and shows a modal.
- [ ] Month view shows counts and blocked indicators.
- [ ] Agenda view groups by day with status badges.

### D. API Specification (P0/P1)

```yaml
GET /api/sessions/calendar
  query:
    view: month|week|day|agenda
    date: ISO date
    trainerId: optional
    locationId: optional
  response:
    sessions: Session[]
    availability: TrainerAvailability[]
    trainers: Trainer[]

PUT /api/sessions/:id/reschedule
  body:
    newDate: ISO datetime
    newTrainerId: optional
    notifyClient: boolean
  response:
    session: Session
    notification: { sent: boolean, channels: string[] }

POST /api/sessions/check-conflicts
  body:
    trainerId: number
    startTime: ISO datetime
    endTime: ISO datetime
    excludeSessionId: optional
  response:
    hasConflicts: boolean
    conflicts: Conflict[]
    suggestions: TimeSlot[]

POST /api/sessions/:id/waitlist
  response:
    entry: WaitlistEntry
    position: number
    estimatedWait: string

DELETE /api/sessions/:id/waitlist
  response:
    success: boolean

POST /api/sessions/:id/waitlist/:entryId/offer
  body:
    expiresInHours: number
  response:
    entry: WaitlistEntry
    notification: { sent: boolean }

POST /api/sessions/:id/waitlist/accept
  response:
    session: Session
    creditUsed: boolean

GET /api/trainers/:id/availability
  query:
    startDate: ISO date
    endDate: ISO date
  response:
    weekly: TrainerAvailability[]
    exceptions: TrainerAvailability[]
    availableSlots: TimeSlot[]

PUT /api/trainers/:id/availability/weekly
  body:
    schedule: { dayOfWeek, startTime, endTime }[]
  response:
    availability: TrainerAvailability[]

POST /api/trainers/:id/availability/exception
  body:
    startDate: ISO datetime
    endDate: ISO datetime
    type: unavailable|vacation
    reason: string
  response:
    exception: TrainerAvailability
```

### E. Database Schema (P0/P1)

```sql
CREATE TABLE "TrainerAvailability" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER REFERENCES "Users"(id) ON DELETE CASCADE,
  "dayOfWeek" INTEGER CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6),
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  "isRecurring" BOOLEAN DEFAULT true,
  "effectiveFrom" DATE,
  "effectiveTo" DATE,
  "type" VARCHAR(20) DEFAULT 'available',
  "reason" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "WaitlistEntries" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" INTEGER REFERENCES "Sessions"(id) ON DELETE CASCADE,
  "userId" INTEGER REFERENCES "Users"(id) ON DELETE CASCADE,
  "position" INTEGER NOT NULL,
  "joinedAt" TIMESTAMP DEFAULT NOW(),
  "notified" BOOLEAN DEFAULT false,
  "notifiedAt" TIMESTAMP,
  "status" VARCHAR(20) DEFAULT 'waiting',
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("sessionId", "userId")
);

CREATE TABLE "SessionTypes" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 60,
  "bufferBefore" INTEGER DEFAULT 0,
  "bufferAfter" INTEGER DEFAULT 0,
  "totalCapacity" INTEGER DEFAULT 1,
  "onlineCapacity" INTEGER DEFAULT 1,
  "reservedCapacity" INTEGER DEFAULT 0,
  "price" DECIMAL(10,2),
  "color" VARCHAR(7) DEFAULT '#00FFFF',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "CancellationFees" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" INTEGER REFERENCES "Sessions"(id),
  "userId" INTEGER REFERENCES "Users"(id),
  "amount" DECIMAL(10,2) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending',
  "cancelledAt" TIMESTAMP,
  "paidAt" TIMESTAMP,
  "waivedAt" TIMESTAMP,
  "waivedBy" INTEGER REFERENCES "Users"(id),
  "waiverReason" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "Locations" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "address" TEXT,
  "capacity" INTEGER,
  "parentId" INTEGER REFERENCES "Locations"(id),
  "type" VARCHAR(20) DEFAULT 'room',
  "equipment" TEXT[],
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

ALTER TABLE "Sessions" ADD COLUMN "sessionTypeId" INTEGER REFERENCES "SessionTypes"(id);
ALTER TABLE "Sessions" ADD COLUMN "locationId" INTEGER REFERENCES "Locations"(id);
ALTER TABLE "Sessions" ADD COLUMN "capacity" INTEGER DEFAULT 1;
ALTER TABLE "Sessions" ADD COLUMN "bookedCount" INTEGER DEFAULT 0;
ALTER TABLE "Sessions" ADD COLUMN "waitlistEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Sessions" ADD COLUMN "bufferBefore" INTEGER DEFAULT 0;
ALTER TABLE "Sessions" ADD COLUMN "bufferAfter" INTEGER DEFAULT 0;
ALTER TABLE "Sessions" ADD COLUMN "cancelledAt" TIMESTAMP;
ALTER TABLE "Sessions" ADD COLUMN "cancelledBy" INTEGER REFERENCES "Users"(id);
ALTER TABLE "Sessions" ADD COLUMN "cancellationReason" TEXT;

CREATE INDEX "idx_sessions_trainer_date" ON "Sessions"("trainerId", "sessionDate");
CREATE INDEX "idx_sessions_status" ON "Sessions"("status");
CREATE INDEX "idx_waitlist_session" ON "WaitlistEntries"("sessionId", "position");
```

### F. ERD (ASCII)

```
Users (id) 1---* Sessions (userId, trainerId)
Users (id) 1---* TrainerAvailability (trainerId)
Users (id) 1---* WaitlistEntries (userId)
Sessions (id) 1---* WaitlistEntries (sessionId)
SessionTypes (id) 1---* Sessions (sessionTypeId)
Locations (id) 1---* Sessions (locationId)
Sessions (id) 1---* CancellationFees (sessionId)
Users (id) 1---* CancellationFees (userId)
```

### G. Flowchart (Booking + Conflict + Waitlist)

```mermaid
flowchart TD
  A[User selects time slot] --> B{Conflict check}
  B -->|No conflict| C[Create or reschedule session]
  B -->|Conflict| D[Show Conflict Modal]
  D --> E{Admin override?}
  E -->|Yes| C
  E -->|No| F[Suggest alternatives]
  F --> G{User selects alternative?}
  G -->|Yes| C
  G -->|No| H{Join waitlist?}
  H -->|Yes| I[Create waitlist entry]
  H -->|No| J[Cancel action]
```

### H. Component Structure (frontend)

```
components/UniversalMasterSchedule/
  Views/
    ViewSelector.tsx
    MonthView.tsx
    WeekView.tsx
    DayView.tsx
    AgendaView.tsx
    TrainerColumnView.tsx
  DnD/
    DraggableSession.tsx
    DropZone.tsx
  Modals/
    ConflictModal.tsx
  Waitlist/
    WaitlistPanel.tsx
    WaitlistJoinModal.tsx
  Availability/
    AvailabilityEditor.tsx
    TimeRangeSlider.tsx
  Config/
    SessionTypeConfig.tsx
    BufferVisualizer.tsx
```

---

## 3. Technical Requirements

**Galaxy-Swan Theme Compliance:**
- [ ] Cyan primary + purple secondary accents
- [ ] Glassmorphic cards with glow borders
- [ ] Cosmic micro-interactions (120-180ms)
- [ ] Display serif for H1/H2
- [ ] Subtle starfield background where applicable

**Performance:**
- [ ] Virtualize agenda list for large datasets
- [ ] Range-based fetch for month/week/day views
- [ ] Debounce conflict checks (300ms)

**Accessibility:**
- [ ] Keyboard navigation for view selector and agenda list
- [ ] Focus states and ARIA labels on controls
- [ ] Reduced motion mode for drag and pulses

**Security:**
- [ ] RBAC for admin/trainer/client view access
- [ ] Validate trainerId and userId ownership
- [ ] Rate limiting for conflict checks

---

## 4. Error Handling Matrix

| Scenario | Status | UI Response |
|----------|--------|-------------|
| Conflict detected | 409 | Conflict modal with alternatives |
| Invalid date range | 400 | Inline field error |
| Unauthorized access | 403 | Access denied message |
| Waitlist full | 409 | Show "waitlist full" toast |
| Session not found | 404 | "Session not found" toast |
| Server error | 500 | Fallback error banner |

---

## 5. Edge Cases

1. **Overlapping trainer sessions:** Block drag drop with conflict modal.
2. **Waitlist entry duplication:** Enforce unique (sessionId, userId).
3. **Buffer overlap:** Adjust availability to account for buffers.
4. **Day view with no trainers:** Show empty state with add trainer CTA.
5. **Session capacity > 1:** Show bookedCount and capacity.

---

## 6. Out of Scope (Phase 2+)

- Cancellation fees automation
- External calendar sync (Google/Outlook)
- Client waitlist join flow (Phase 2)

---

## 7. WHY Sections

**WHY multi-view (month/week/day/agenda)?**
- Enables fast scanning (month), operational control (day), and list review (agenda).

**WHY conflict detection before saving?**
- Prevents double booking and preserves trainer/client trust.

**WHY waitlist?**
- Increases session fill rate and reduces revenue loss.

**WHY buffers and capacity?**
- Enforces realistic transitions and supports group sessions.

---

## 8. AI Reviews (APPEND ONLY)

### Claude Code (Integration)
**Date:** 2026-01-22 12:00
**Verdict:** PENDING

[Review content]

---

### Roo Code (Backend)
**Date:** 2026-01-22 12:00
**Verdict:** PENDING

[Review content]

---

### ChatGPT-5 (QA)
**Date:** 2026-01-22 12:00
**Verdict:** PENDING

[Review content]

---

### Claude Desktop (Orchestrator & Security)
**Date:** 2026-01-22 12:00
**Verdict:** PENDING

[Review content]

---

### Gemini Code Assist (Frontend)
**Date:** 2026-01-22 12:00
**Verdict:** PENDING

[Review content]

---

## 9. Resolution Log

**Issue #1:** TBA
- **Raised by:** TBA
- **Severity:** CONCERN / BLOCKER
- **Resolution:** TBA
- **Status:** IN PROGRESS / RESOLVED

---

## 10. Consensus Summary

**Status:** PENDING

**Approvals:** 0/5
- Claude Code: PENDING
- Roo Code: PENDING
- ChatGPT-5: PENDING
- Claude Desktop: PENDING
- Gemini: PENDING

**Issues Resolved:** 0/0 (0%)

**Final Consensus Date:** TBD

**Next Step:** Move to Phase 1-7 implementation after approvals.

**Implementation Branch:** `feature/schedule-parity-upgrade`

---

**File Size:** Keep this file focused. If it exceeds 800 lines, split artifacts into separate docs.
