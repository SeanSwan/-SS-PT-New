# 🗓️ UNIVERSAL MASTER SCHEDULE - COMPLETE SYSTEM HANDBOOK

**SwanStudios Personal Training Platform**
**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Status:** Phase 1 Complete ✅ | Phase 2 In Progress 🚧

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Session Lifecycle](#session-lifecycle)
4. [Session Credit System](#session-credit-system)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [MindBody Feature Parity](#mindbody-feature-parity)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)
11. [Future Enhancements](#future-enhancements)

---

## SYSTEM OVERVIEW

### What is the Universal Master Schedule?

The Universal Master Schedule is SwanStudios' comprehensive session booking and management system. It provides:

- **Real-time calendar view** of all training sessions
- **Session credit tracking** for clients
- **Multi-role access** (Admin, Trainer, Client)
- **Automated credit management** when booking/cancelling
- **30-minute and 60-minute sessions**
- **MindBody-equivalent features** (industry standard)

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)          │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │Admin Schedule│  │Trainer       │  │Client     │ │
│  │Dashboard     │  │Schedule      │  │Schedule   │ │
│  │              │  │Dashboard     │  │Dashboard  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │   Core Calendar Component (schedule.tsx)     │  │
│  │   - react-big-calendar v1.8.2                │  │
│  │   - Month/Week/Day/Agenda views              │  │
│  │   - 30-minute time slots                     │  │
│  │   - 6am-10pm working hours                   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)            │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │Session       │  │User/Client   │  │Package    │ │
│  │Controller    │  │Model         │  │Model      │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         Session Management Logic             │  │
│  │   - Credit tracking                          │  │
│  │   - Conflict detection                       │  │
│  │   - Status transitions                       │  │
│  │   - Cancellation policy enforcement          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│            Database (PostgreSQL/MySQL)              │
├─────────────────────────────────────────────────────┤
│  - Sessions table                                   │
│  - Users table (with credit fields)                 │
│  - Packages table                                   │
│  - SessionPackages join table                       │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- styled-components (CSS-in-JS)
- react-big-calendar v1.8.2
- Framer Motion (animations)
- Design tokens system (`frontend/src/theme/tokens.ts`)

**Backend:**
- Node.js + Express
- Sequelize ORM
- PostgreSQL/MySQL database
- JWT authentication

---

## USER ROLES & PERMISSIONS

### 👑 Admin

**Can:**
- ✅ Create available training sessions
- ✅ Assign trainers to sessions
- ✅ Block time (mark trainer unavailable)
- ✅ View ALL sessions (all clients, all trainers)
- ✅ Manually adjust client session credits
- ✅ Mark sessions as completed
- ✅ Cancel any session
- ✅ Edit session details
- ✅ Generate session reports
- ✅ View revenue by session
- ✅ Manage client packages

**Cannot:**
- ❌ Book sessions for themselves (unless also a client)

**Dashboard Location:**
`/dashboard/admin` → Schedule Tab

**Key Features:**
- Create Session button
- Block Time button
- View all sessions across all trainers
- Filter by trainer, client, status, date range
- Bulk actions (cancel multiple sessions)

---

### 💪 Trainer

**Can:**
- ✅ View assigned sessions
- ✅ Mark sessions as completed
- ✅ Add notes to completed sessions
- ✅ Block personal time (unavailable slots)
- ✅ View client history
- ✅ Confirm requested sessions
- ✅ See upcoming sessions for the day/week

**Cannot:**
- ❌ Create sessions for other trainers
- ❌ View sessions not assigned to them
- ❌ Modify client session credits
- ❌ Delete sessions (can only cancel)

**Dashboard Location:**
`/dashboard/trainer` → Schedule Tab

**Key Features:**
- "Today's Sessions" quick filter
- Block Time button
- Session completion workflow
- Client session history view

---

### 🏋️ Client

**Can:**
- ✅ View available training sessions
- ✅ Book sessions (if credits available)
- ✅ Cancel sessions (with policy enforcement)
- ✅ Reschedule sessions
- ✅ View session history
- ✅ See remaining session credits
- ✅ Track upcoming sessions
- ✅ Filter by trainer preference
- ✅ Add sessions to personal calendar

**Cannot:**
- ❌ Create sessions
- ❌ View other clients' sessions
- ❌ Bypass cancellation policy (<24hrs)
- ❌ Book without sufficient credits
- ❌ Modify completed sessions

**Dashboard Location:**
`/dashboard/client` → Schedule Tab

**Key Features:**
- "Quick Book" button (book next available)
- Credit counter (e.g., "15/20 credits remaining")
- Upcoming sessions this week
- Session history timeline
- Trainer filtering

---

## SESSION LIFECYCLE

### Status Progression

```
┌─────────────┐
│  AVAILABLE  │  ← Admin creates open time slot
└──────┬──────┘
       │ Client books
       ↓
┌─────────────┐
│  SCHEDULED  │  ← Session booked, client assigned
└──────┬──────┘
       │ (Optional) Trainer confirms
       ↓
┌─────────────┐
│  CONFIRMED  │  ← Trainer acknowledged session
└──────┬──────┘
       │ Session occurs + trainer marks complete
       ↓
┌─────────────┐
│  COMPLETED  │  ← Session finished, credits updated
└─────────────┘

       Alternative paths:

┌─────────────┐        ┌─────────────┐
│ CANCELLED   │  or    │  NO-SHOW    │
│ (by client/ │        │ (client     │
│  admin)     │        │  didn't     │
└─────────────┘        │  attend)    │
                       └─────────────┘
```

### Detailed Flow

#### 1. Session Creation (Admin)

**Admin creates a new available time slot:**

```typescript
POST /api/sessions

{
  sessionDate: "2025-01-15T10:00:00Z",
  duration: 60,                    // 30, 60, 90, or 120 minutes
  trainerId: 5,
  status: "available",
  location: "Main Gym",
  sessionType: "Personal Training",
  notes: "Upper body focus"
}
```

**Database updates:**
- New Session record created
- Status: "available"
- userId: null (no client yet)

---

#### 2. Session Booking (Client)

**Client clicks "Book Session" or "Quick Book":**

```typescript
POST /api/sessions/123/book

{
  userId: 42  // From auth token
}
```

**Backend validation:**
1. ✅ Session exists and status = "available"
2. ✅ Client has credits remaining (user.sessionsRemaining > 0)
3. ✅ No scheduling conflicts for client
4. ✅ Session date is in the future

**If valid, transaction executes:**
```javascript
await sequelize.transaction(async (t) => {
  // Update session
  await session.update({
    userId: 42,
    status: 'scheduled',
    bookedAt: new Date()
  }, { transaction: t });

  // Update client credits
  await user.decrement('sessionsRemaining', { by: 1, transaction: t });
  await user.increment('sessionsScheduled', { by: 1, transaction: t });
});
```

**Result:**
- Session status: "scheduled"
- Client credits: 15 → 14
- Client's scheduled count: 2 → 3

---

#### 3. Session Confirmation (Optional - Trainer)

**Trainer confirms they'll attend:**

```typescript
POST /api/sessions/123/confirm
```

**Database updates:**
- Status: "scheduled" → "confirmed"
- confirmedAt: current timestamp
- Confirmation email sent to client

---

#### 4. Session Completion (Trainer/Admin)

**After session occurs, trainer marks complete:**

```typescript
POST /api/sessions/123/complete

{
  trainerNotes: "Client showed great form on squats. Increase weight next session.",
  exercisesCompleted: ["Squats", "Deadlifts", "Bench Press"],
  clientFeedback: "Challenging but great!"
}
```

**Backend transaction:**
```javascript
await sequelize.transaction(async (t) => {
  await session.update({
    status: 'completed',
    completedAt: new Date(),
    trainerNotes: req.body.trainerNotes
  }, { transaction: t });

  await user.decrement('sessionsScheduled', { transaction: t });
  await user.increment('sessionsCompleted', { transaction: t });
});
```

**Result:**
- Status: "completed"
- Client's scheduled: 3 → 2
- Client's completed: 3 → 4

---

#### 5. Session Cancellation (Client/Admin)

**Client cancels upcoming session:**

```typescript
POST /api/sessions/123/cancel

{
  reason: "Scheduling conflict",
  cancelledBy: "client"  // or "admin"
}
```

**Cancellation Policy Check:**

```javascript
const sessionTime = new Date(session.sessionDate);
const now = new Date();
const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);

const refundCredit = hoursUntilSession >= 24; // 24-hour cancellation policy
```

**If >24 hours before session:**
- ✅ Credit refunded
- Session status: "available" (returned to pool)
- sessionsScheduled: 3 → 2
- sessionsRemaining: 14 → 15

**If <24 hours before session:**
- ❌ No credit refund (late cancellation)
- Session status: "cancelled"
- sessionsScheduled: 3 → 2
- sessionsCancelled: 0 → 1
- sessionsRemaining: 14 (unchanged)

---

## SESSION CREDIT SYSTEM

### How Credits Work

**Purchase Package → Receive Credits:**

When a client purchases a package:
```javascript
// Example: 20-session package
{
  packageName: "20 Session Pack",
  sessionsIncluded: 20,
  price: 1400.00,
  expirationMonths: 6
}
```

**Upon purchase, user record updated:**
```javascript
user.totalSessionsAllocated += 20;  // 0 → 20
user.sessionsRemaining += 20;       // 0 → 20
user.activePackageId = packageId;
user.packagePurchaseDate = new Date();
user.packageExpirationDate = new Date(+6 months);
```

---

### Credit Accounting

**Session Lifecycle Impact on Credits:**

| Event | sessionsRemaining | sessionsScheduled | sessionsCompleted | sessionsCancelled |
|-------|-------------------|-------------------|-------------------|-------------------|
| **Initial state** | 20 | 0 | 0 | 0 |
| Book session | -1 (19) | +1 (1) | 0 | 0 |
| Complete session | 0 (19) | -1 (0) | +1 (1) | 0 |
| Cancel (>24hrs) | +1 (20) | -1 (0) | 0 (1) | 0 |
| Cancel (<24hrs) | 0 (19) | -1 (0) | 0 (1) | +1 (1) |

---

### Credit Validation Rules

**Before booking:**

1. ✅ `user.sessionsRemaining > 0`
2. ✅ `user.packageExpirationDate > NOW()`
3. ✅ Session is "available"
4. ✅ No scheduling conflicts

**If validation fails:**
```json
{
  "error": "Insufficient credits",
  "creditsRemaining": 0,
  "suggestedAction": "Purchase a new package",
  "packageUrl": "/store"
}
```

---

### Credit Display (Client Dashboard)

**Real-time stats:**

```typescript
const [sessionStats, setSessionStats] = useState({
  mySessionsCount: 0,         // Total booked + completed
  creditsRemaining: 0,        // Available to book
  upcomingThisWeek: 0,        // Scheduled this week
  totalAllocated: 0,          // From all packages
  completed: 0,               // Successfully completed
  packageExpiration: null     // Expiry date
});

// Displayed as:
┌───────────────────────────────────────────┐
│  Session Credits                          │
├───────────────────────────────────────────┤
│  📊 15/20 Remaining                       │
│  ✅ 3 Completed                           │
│  📅 2 Scheduled                           │
│  ⏰ Expires: 2025-07-01                   │
└───────────────────────────────────────────┘
```

---

## DATABASE SCHEMA

### Sessions Table

```sql
CREATE TABLE Sessions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,

  -- Session Details
  sessionDate DATETIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,  -- 30, 60, 90, 120 minutes
  location VARCHAR(255),
  sessionType VARCHAR(100) DEFAULT 'Personal Training',

  -- Relationships
  userId INTEGER,  -- Client (null if available)
  trainerId INTEGER NOT NULL,
  packageId INTEGER,

  -- Status Tracking
  status ENUM('available', 'requested', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no-show') DEFAULT 'available',

  -- Timestamps
  createdAt DATETIME DEFAULT NOW(),
  bookedAt DATETIME,
  confirmedAt DATETIME,
  completedAt DATETIME,
  cancelledAt DATETIME,

  -- Notes
  notes TEXT,
  trainerNotes TEXT,
  cancellationReason TEXT,

  -- Constraints
  FOREIGN KEY (userId) REFERENCES Users(id),
  FOREIGN KEY (trainerId) REFERENCES Users(id),
  FOREIGN KEY (packageId) REFERENCES Packages(id),

  INDEX idx_session_date (sessionDate),
  INDEX idx_user_id (userId),
  INDEX idx_trainer_id (trainerId),
  INDEX idx_status (status)
);
```

---

### Users Table (Credit Fields)

```sql
ALTER TABLE Users ADD COLUMN (
  -- Session Credits
  totalSessionsAllocated INTEGER DEFAULT 0,
  sessionsRemaining INTEGER DEFAULT 0,
  sessionsCompleted INTEGER DEFAULT 0,
  sessionsScheduled INTEGER DEFAULT 0,
  sessionsCancelled INTEGER DEFAULT 0,

  -- Package Tracking
  activePackageId INTEGER,
  packagePurchaseDate DATETIME,
  packageExpirationDate DATETIME,

  FOREIGN KEY (activePackageId) REFERENCES Packages(id)
);
```

---

## API ENDPOINTS

### Session Management

#### **GET /api/sessions**

Get all sessions (filtered by role)

**Admin:** Returns all sessions
**Trainer:** Returns only sessions where `trainerId = user.id`
**Client:** Returns only sessions where `userId = user.id` OR `status = 'available'`

**Query Parameters:**
- `status` - Filter by status (e.g., `?status=available`)
- `trainerId` - Filter by trainer
- `startDate` - Filter sessions after date
- `endDate` - Filter sessions before date
- `view` - Calendar view (`month`, `week`, `day`)

**Response:**
```json
{
  "sessions": [
    {
      "id": 123,
      "sessionDate": "2025-01-15T10:00:00Z",
      "duration": 60,
      "status": "available",
      "trainer": {
        "id": 5,
        "firstName": "John",
        "lastName": "Trainer",
        "photo": "/uploads/trainers/john.jpg"
      },
      "client": null,
      "location": "Main Gym"
    }
  ],
  "total": 45,
  "page": 1,
  "perPage": 50
}
```

---

#### **POST /api/sessions**

Create new session (Admin only)

**Request Body:**
```json
{
  "sessionDate": "2025-01-20T14:00:00Z",
  "duration": 60,
  "trainerId": 5,
  "location": "Main Gym",
  "sessionType": "Personal Training",
  "notes": "Leg day focus"
}
```

**Validation:**
- ✅ `sessionDate` is in the future
- ✅ `duration` is valid (30, 60, 90, 120)
- ✅ `trainerId` exists and role = 'trainer' or 'admin'
- ✅ No scheduling conflicts for trainer

**Response:**
```json
{
  "message": "Session created successfully",
  "session": {
    "id": 456,
    "sessionDate": "2025-01-20T14:00:00Z",
    "duration": 60,
    "status": "available",
    "trainerId": 5
  }
}
```

---

#### **POST /api/sessions/:id/book**

Book a session (Client)

**Authorization:** Client only, must have credits

**Response (Success):**
```json
{
  "message": "Session booked successfully",
  "session": {
    "id": 123,
    "status": "scheduled",
    "bookedAt": "2025-01-10T15:30:00Z"
  },
  "creditsRemaining": 14
}
```

**Response (Insufficient Credits):**
```json
{
  "error": "No sessions remaining. Please purchase a package.",
  "creditsRemaining": 0,
  "packageUrl": "/store"
}
```

---

#### **POST /api/sessions/:id/cancel**

Cancel a session

**Authorization:** Client (own session) or Admin (any session)

**Request Body:**
```json
{
  "reason": "Scheduling conflict"
}
```

**Response:**
```json
{
  "message": "Session cancelled successfully",
  "creditRefunded": true,  // or false if <24hrs
  "creditsRemaining": 15,
  "cancellationPolicy": "Cancelled >24 hours before session, credit refunded"
}
```

---

#### **POST /api/sessions/:id/complete**

Mark session as completed (Trainer/Admin)

**Request Body:**
```json
{
  "trainerNotes": "Great progress on form. Client is ready for heavier weights.",
  "exercisesCompleted": ["Squats", "Deadlifts", "Bench Press"],
  "clientPerformance": "Excellent"
}
```

**Response:**
```json
{
  "message": "Session marked as completed",
  "session": {
    "id": 123,
    "status": "completed",
    "completedAt": "2025-01-15T11:00:00Z"
  },
  "userStats": {
    "completed": 4,
    "scheduled": 2,
    "remaining": 14
  }
}
```

---

#### **GET /api/sessions/stats**

Get user's session statistics

**Authorization:** Authenticated user

**Response:**
```json
{
  "mySessionsCount": 5,        // Total booked + completed
  "creditsRemaining": 14,
  "upcomingThisWeek": 2,
  "totalAllocated": 20,
  "completed": 3,
  "scheduled": 2,
  "cancelled": 1,
  "packageExpiration": "2025-07-01T00:00:00Z"
}
```

---

## FRONTEND COMPONENTS

### Core Calendar Component

**File:** `frontend/src/components/Schedule/schedule.tsx` (2520 lines)

**Key Features:**
- react-big-calendar v1.8.2
- Month/Week/Day/Agenda views
- 30-minute time slots
- 6am-10pm working hours
- Event color coding by status
- Click to book/view details
- Responsive design

**Configuration:**
```typescript
<Calendar
  localizer={momentLocalizer(moment)}
  events={sessions}
  startAccessor="sessionDate"
  endAccessor="sessionEndTime"
  views={['month', 'week', 'day', 'agenda']}
  view={currentView}
  onView={setCurrentView}
  step={30}              // 30-minute intervals
  timeslots={2}          // 2 slots per hour
  min={new Date(0, 0, 0, 6, 0, 0)}   // 6:00 AM
  max={new Date(0, 0, 0, 22, 0, 0)}  // 10:00 PM
  eventPropGetter={eventStyleGetter}
  onSelectEvent={handleEventClick}
  onSelectSlot={handleSlotClick}
  selectable
/>
```

**Event Styling (by status):**
```typescript
const statusColors = {
  available: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e' },   // Green
  booked: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6' },     // Blue
  confirmed: { bg: 'rgba(124, 58, 237, 0.2)', border: '#7c3aed' },  // Purple
  completed: { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280' }, // Gray
  cancelled: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' },   // Red
};
```

---

### Admin Schedule Tab

**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/schedule/AdminScheduleTab.tsx`

**Unique Features:**
- "Create Session" button
- "Block Time" button
- View all sessions (all trainers, all clients)
- Filter by trainer dropdown
- Filter by status dropdown
- Bulk actions (select multiple, cancel all)

**Stats Display:**
```typescript
<StatsBar>
  <StatItem>
    <Calendar />
    <span>Total Sessions: {totalSessionsCount}</span>
  </StatItem>
  <StatItem>
    <Users />
    <span>Active Trainers: {activeTrainersCount}</span>
  </StatItem>
  <StatItem>
    <Clock />
    <span>This Week: {sessionsThisWeek}</span>
  </StatItem>
</StatsBar>
```

---

### Trainer Schedule Tab

**File:** `frontend/src/components/DashBoard/Pages/trainer-dashboard/schedule/TrainerScheduleTab.tsx`

**Unique Features:**
- "Today's Sessions" quick filter button
- "Block Time" button
- Only shows sessions assigned to logged-in trainer
- Session completion workflow
- Client session history view

**Today's Sessions Filter:**
```typescript
const handleTodayFilter = () => {
  const today = moment().startOf('day');
  const todaySessions = sessions.filter(s =>
    moment(s.sessionDate).isSame(today, 'day')
  );
  setFilteredSessions(todaySessions);
  setCurrentView('day');
};
```

---

### Client Schedule Tab

**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/schedule/ClientScheduleTab.tsx`

**Unique Features:**
- "Quick Book" button (book next available)
- Session credit counter display
- Only shows: available sessions OR client's own sessions
- Filter by trainer preference
- Session history timeline
- Package expiration warning

**Quick Book Handler:**
```typescript
const handleQuickBook = async () => {
  const nextAvailable = sessions.find(s =>
    s.status === 'available' &&
    new Date(s.sessionDate) > new Date()
  );

  if (!nextAvailable) {
    toast({
      variant: 'warning',
      title: 'No Available Sessions',
      description: 'Check back later or contact us to schedule.'
    });
    return;
  }

  await handleBookSession(nextAvailable.id);
};
```

**Credit Warning:**
```typescript
{sessionStats.creditsRemaining <= 3 && (
  <CreditWarningBanner>
    <AlertTriangle />
    <span>
      Only {sessionStats.creditsRemaining} credits remaining!
      <Link to="/store">Purchase more</Link>
    </span>
  </CreditWarningBanner>
)}
```

---

## MINDBODY FEATURE PARITY

### MindBody App Reference

[MindBody](https://www.mindbodyonline.com/) is the industry-standard scheduling platform for fitness studios. Our goal is to match or exceed their features.

### Feature Comparison Matrix

| Feature | MindBody | SwanStudios | Status |
|---------|----------|-------------|--------|
| **Core Scheduling** |
| Create sessions | ✅ | ✅ | Complete |
| Book sessions | ✅ | ✅ | Complete |
| Cancel sessions | ✅ | ✅ | Complete |
| 24-hour cancellation policy | ✅ | ✅ | Complete |
| Session credits tracking | ✅ | ✅ | Complete |
| Multiple session durations | ✅ | ✅ | Complete (30/60/90/120min) |
| **Calendar Views** |
| Month view | ✅ | ✅ | Complete |
| Week view | ✅ | ✅ | Complete |
| Day view | ✅ | ✅ | Complete |
| Agenda/List view | ✅ | ✅ | Complete |
| **Admin Features** |
| Assign trainers | ✅ | ✅ | Complete |
| Block trainer time | ✅ | 🚧 | In Progress |
| Recurring sessions | ✅ | ❌ | Not Started |
| Waitlist management | ✅ | ❌ | Not Started |
| No-show tracking | ✅ | ❌ | Not Started |
| Late cancel fees | ✅ | ❌ | Not Started |
| Revenue reports | ✅ | ❌ | Not Started |
| **Client Features** |
| View available times | ✅ | ✅ | Complete |
| Filter by trainer | ✅ | 🚧 | In Progress |
| Session history | ✅ | ✅ | Complete |
| Add to calendar (ICS) | ✅ | ❌ | Not Started |
| Email reminders | ✅ | ❌ | Not Started |
| SMS reminders | ✅ | ❌ | Not Started |
| Rate/review trainer | ✅ | ❌ | Not Started |
| **Enhanced Beyond MindBody** |
| "Quick Book Next Available" | ❌ | ✅ | Complete |
| Real-time credit counter | ❌ | ✅ | Complete |
| Smart time suggestions | ❌ | 🚧 | In Progress |
| Week timeline view | ❌ | 🚧 | In Progress |
| Package progress bar | ❌ | 🚧 | In Progress |

**Legend:**
- ✅ Complete
- 🚧 In Progress
- ❌ Not Started

---

## TESTING GUIDE

### Test Client Credentials

**Email:** `testclient@swanstudios.com`
**Password:** `TestClient2025!`

**Expected Initial State:**
- 20 total sessions allocated
- 15 sessions remaining
- 3 sessions completed
- 2 sessions scheduled
- 0 sessions cancelled
- Package expires: 2025-07-01

### Test Scenarios

#### Scenario 1: View Sessions as Client

1. Login as test client
2. Navigate to Dashboard → Schedule Tab
3. ✅ Verify stats show: 15 credits, 2 scheduled, 3 completed
4. ✅ Verify calendar displays available sessions (green)
5. ✅ Verify calendar displays client's scheduled sessions (blue)
6. ✅ Switch to Week view - verify 7 days shown
7. ✅ Switch to Day view - verify single day with time slots
8. ✅ Switch to Month view - verify full month calendar

---

#### Scenario 2: Book a Session

1. As test client, find an available session (green)
2. Click on the session
3. ✅ Modal opens with session details
4. Click "Book Session"
5. ✅ Confirmation prompt shows current credit count
6. Confirm booking
7. ✅ Success toast appears
8. ✅ Calendar refreshes, session now blue (scheduled)
9. ✅ Stats update: 14 credits, 3 scheduled, 3 completed

---

#### Scenario 3: Cancel Session (>24 hours)

1. As test client, click on a scheduled session (tomorrow)
2. ✅ Modal shows session details + "Cancel" button
3. Click "Cancel Session"
4. ✅ Confirmation prompt with cancellation policy
5. Confirm cancellation
6. ✅ Success toast: "Credit refunded"
7. ✅ Session disappears or changes to "cancelled"
8. ✅ Stats update: 15 credits (refunded), 2 scheduled

---

#### Scenario 4: Cancel Session (<24 hours)

1. As test client, click on a session scheduled in 12 hours
2. Click "Cancel Session"
3. ✅ Warning message: "Less than 24 hours, credit will NOT be refunded"
4. Confirm cancellation
5. ✅ Session cancelled but no credit refund
6. ✅ Stats: 14 credits (no change), 2 scheduled, 1 cancelled

---

#### Scenario 5: Book with Insufficient Credits

1. As test client, book sessions until credits = 0
2. Attempt to book one more session
3. ✅ Error message: "No credits remaining"
4. ✅ Link to store: "Purchase a package"
5. ✅ Booking blocked

---

#### Scenario 6: Admin Create Session

1. Login as admin
2. Navigate to Dashboard → Schedule Tab
3. Click "Create Session"
4. ✅ Modal opens with form
5. Fill in:
   - Date: 3 days from now
   - Time: 2:00 PM
   - Duration: 30 minutes
   - Trainer: Select from dropdown
   - Location: "Main Gym"
6. Click "Create"
7. ✅ Session appears in calendar (green, available)
8. ✅ Duration displays as "30 min" badge

---

#### Scenario 7: Session Conflict Detection

1. As admin, create session:
   - Date: Tomorrow 10:00 AM
   - Duration: 60 min
   - Trainer: John Trainer
2. Attempt to create another session:
   - Date: Tomorrow 10:30 AM (overlaps!)
   - Duration: 60 min
   - Trainer: John Trainer (same!)
3. ✅ Error: "Time slot conflict detected"
4. ✅ Shows conflicting session details

---

#### Scenario 8: Mark Session Complete (Trainer)

1. Login as trainer
2. View scheduled session from yesterday
3. Click on session
4. ✅ "Mark Complete" button visible
5. Click "Mark Complete"
6. Add trainer notes: "Great progress on squats"
7. Submit
8. ✅ Session status: "completed" (gray)
9. ✅ Client's stats update: 1 more completed, 1 less scheduled

---

#### Scenario 9: Mobile Responsive View

1. Resize browser to 375px width (iPhone)
2. As client, view schedule
3. ✅ Only Day and Agenda views available (no Month/Week)
4. ✅ Stats bar wraps to 2 rows
5. ✅ Quick Book button full-width
6. ✅ Touch targets >= 44px
7. ✅ Calendar scrolls horizontally if needed

---

#### Scenario 10: Package Expiration Warning

1. As test client (package expires 2025-07-01)
2. View schedule on 2025-06-25 (6 days before expiry)
3. ✅ Warning banner: "Package expires in 6 days"
4. ✅ Link to purchase new package
5. After expiry date:
6. ✅ Cannot book sessions
7. ✅ Error: "Package expired, please renew"

---

## TROUBLESHOOTING

### Issue: Calendar Views Not Switching

**Symptoms:**
- Clicking "Month/Week/Day" buttons doesn't change view
- View stays on one setting

**Diagnosis:**
1. Check browser console for errors
2. Verify `currentView` state is updating:
   ```typescript
   console.log('Current view:', currentView);
   ```
3. Check if `onView` handler is wired correctly:
   ```typescript
   onView={(view) => {
     console.log('View changed to:', view);
     setCurrentView(view);
   }}
   ```

**Solutions:**
- Ensure `view` and `onView` props are both present
- Check if view state is being reset elsewhere
- Verify react-big-calendar version (should be v1.8.2)

---

### Issue: Sessions Not Appearing in Calendar

**Symptoms:**
- Calendar is blank even though sessions exist in database

**Diagnosis:**
1. Check API response in Network tab:
   ```
   GET /api/sessions → 200 OK
   Response: { sessions: [...] }
   ```
2. Check session data format:
   ```typescript
   console.log('Sessions:', sessions);
   // Verify sessionDate is valid Date object
   ```
3. Verify event mapping:
   ```typescript
   const events = sessions.map(s => ({
     title: s.sessionType,
     start: new Date(s.sessionDate),
     end: new Date(s.sessionEndTime),
     resource: s
   }));
   ```

**Solutions:**
- Ensure `sessionDate` is ISO string or Date object
- Check if sessions are filtered out by date range
- Verify `start` and `end` accessors match event structure

---

### Issue: Credits Not Updating After Booking

**Symptoms:**
- Session books successfully but credit count doesn't change

**Diagnosis:**
1. Check API response after booking:
   ```json
   { "creditsRemaining": 14 }  // Should be new count
   ```
2. Check if stats are being refetched:
   ```typescript
   await fetchSessionStats(); // Called after booking?
   ```
3. Verify backend transaction completed:
   ```javascript
   // Check database directly
   SELECT sessionsRemaining FROM Users WHERE id = 42;
   ```

**Solutions:**
- Add stats refresh after booking:
  ```typescript
  await handleBookSession(sessionId);
  await fetchSessionStats(); // Refresh
  ```
- Check if transaction rolled back due to error
- Verify database triggers/hooks are working

---

### Issue: Cancellation Policy Not Enforced

**Symptoms:**
- Can cancel session <24 hours and still get refund

**Diagnosis:**
1. Check cancellation time calculation:
   ```javascript
   const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
   console.log('Hours until session:', hoursUntilSession);
   ```
2. Verify timezone handling:
   ```javascript
   // Session times should be UTC
   const sessionTime = new Date(session.sessionDate);
   console.log('Session time (UTC):', sessionTime.toISOString());
   ```

**Solutions:**
- Ensure all dates are in UTC
- Check server time vs client time
- Add explicit timezone conversion if needed

---

### Issue: Session Conflicts Not Detected

**Symptoms:**
- Can create overlapping sessions for same trainer

**Diagnosis:**
1. Check conflict detection query:
   ```javascript
   console.log('Checking conflicts for:', {
     trainerId,
     startTime,
     endTime
   });
   ```
2. Verify SQL query logic:
   ```sql
   -- Should catch overlaps
   WHERE trainerId = ? AND (
     (sessionDate <= ? AND DATE_ADD(sessionDate, INTERVAL duration MINUTE) > ?) OR
     (sessionDate < ? AND DATE_ADD(sessionDate, INTERVAL duration MINUTE) >= ?)
   )
   ```

**Solutions:**
- Check if query includes all session statuses
- Verify date arithmetic (MySQL vs PostgreSQL syntax)
- Add unit tests for conflict detection logic

---

### Issue: 30-Minute Sessions Display Incorrectly

**Symptoms:**
- 30-minute sessions show as 60 minutes in calendar
- Time slots don't align properly

**Diagnosis:**
1. Check session duration field:
   ```javascript
   console.log('Session duration:', session.duration); // Should be 30
   ```
2. Verify end time calculation:
   ```javascript
   const endTime = new Date(session.sessionDate.getTime() + (session.duration * 60000));
   console.log('End time:', endTime);
   ```

**Solutions:**
- Ensure `duration` is in minutes (not hours)
- Check calendar step configuration (should be 30)
- Verify event end time accessor

---

## FUTURE ENHANCEMENTS

### Phase 2 (Next 2-4 Weeks)

**Recurring Sessions:**
- Admin can create weekly repeating sessions
- "Repeat every Monday at 10 AM for 12 weeks"
- Bulk create with conflict checking

**Waitlist Management:**
- Clients can join waitlist if session full
- Auto-notify when slot opens
- Admin can manually assign from waitlist

**Email/SMS Reminders:**
- 24-hour reminder before session
- Configurable reminder times
- Include trainer info + location

**Add to Calendar:**
- Export session as .ics file
- One-click add to Google Calendar
- One-click add to Apple Calendar

**Session Reschedule Flow:**
- Client can reschedule instead of cancel+rebook
- Shows available alternative times
- Preserves session notes/history

---

### Phase 3 (1-2 Months)

**Advanced Reporting:**
- Revenue by trainer
- Client attendance trends
- Peak booking times
- Package utilization rates

**No-Show Tracking:**
- Mark sessions as "no-show"
- Track client no-show history
- Automated penalties (e.g., forfeit credit)

**Late Cancellation Fees:**
- Charge fee for cancellations <24hrs
- Configurable fee amount
- Payment integration

**Multi-Location Support:**
- Different gyms/studios
- Filter sessions by location
- Location-specific trainers

**Group Training Sessions:**
- Sessions with multiple clients
- Capacity limits (e.g., max 5 clients)
- Group pricing

---

### Phase 4 (Future)

**AI-Powered Features:**
- Smart scheduling suggestions
- Optimal workout timing based on client history
- Predictive no-show alerts

**Trainer Specialties Matching:**
- Tag trainers with specialties (yoga, powerlifting, etc.)
- Match clients to best-fit trainers
- Preference learning

**Client Performance Tracking:**
- Link sessions to workout logs
- Progress photos with sessions
- Goal tracking integration

**Video Call Integration:**
- Virtual training sessions
- Zoom/Meet integration
- Screen sharing for form checks

---

## APPENDIX

### Related Documentation

- [Phase 1 Completion Report](../../PHASE-1-COMPLETION-REPORT.md)
- [Scheduling System Analysis](../../SCHEDULING-SYSTEM-ANALYSIS.md)
- [Dashboard Audit Results](../../DASHBOARD-AUDIT-RESULTS.md)
- [Implementation Status Summary](../../IMPLEMENTATION-STATUS-SUMMARY.md)

### Code Locations

**Frontend:**
- Core Calendar: `frontend/src/components/Schedule/schedule.tsx`
- Design Tokens: `frontend/src/theme/tokens.ts`
- Admin Schedule: `frontend/src/components/DashBoard/Pages/admin-dashboard/schedule/AdminScheduleTab.tsx`
- Trainer Schedule: `frontend/src/components/DashBoard/Pages/trainer-dashboard/schedule/TrainerScheduleTab.tsx`
- Client Schedule: `frontend/src/components/DashBoard/Pages/client-dashboard/schedule/ClientScheduleTab.tsx`

**Backend:**
- Session Model: `backend/models/Session.cjs`
- Session Routes: `backend/routes/sessions.cjs`
- Session Controller: `backend/controllers/sessionController.js` (if exists)
- Test Seeder: `backend/seeders/20250101-test-client-comprehensive.mjs`

### Support

For questions or issues:
1. Check this handbook first
2. Review related documentation
3. Check existing GitHub issues
4. Contact development team

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Maintained By:** SwanStudios Development Team
**Next Review Date:** 2025-02-01
