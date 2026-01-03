# Session Tracking System - Solo vs Trainer-Led Workouts

## Overview

The SwanStudios platform distinguishes between two types of workout activities:

1. **Solo Workouts** - Self-logged training sessions (NO session credits deducted)
2. **Trainer-Led Sessions** - Paid sessions with a trainer (session credits ARE deducted)

## Database Schema

### WorkoutSession Model

```typescript
{
  id: UUID,
  userId: INTEGER,              // Client who performed the workout
  title: STRING,
  date: DATE,
  duration: INTEGER,
  intensity: INTEGER,
  status: ENUM('planned', 'in_progress', 'completed', 'skipped', 'cancelled'),

  // NEW FIELDS FOR SESSION TRACKING
  sessionType: STRING,          // 'solo' | 'trainer-led'
  sessionId: INTEGER,           // FK to Session table (null for solo)
  trainerId: INTEGER,           // FK to User (trainer) - null for solo

  // Stats
  totalWeight: FLOAT,
  totalReps: INTEGER,
  totalSets: INTEGER,
  experiencePoints: INTEGER
}
```

### Session Model (Paid Sessions)

```typescript
{
  id: INTEGER,
  sessionDate: DATE,
  duration: INTEGER,
  userId: INTEGER,              // Client who booked
  trainerId: INTEGER,           // Assigned trainer
  status: STRING,               // 'scheduled', 'completed', 'cancelled', etc.
  sessionDeducted: BOOLEAN,     // Whether session credit was deducted
  location: STRING,
  notes: TEXT
}
```

## Business Logic

### Solo Workouts (`sessionType: 'solo'`)

**Characteristics:**
- Client logs workout independently through the app
- NO trainer involvement
- NO session credits deducted from client's package
- `sessionId` is NULL
- `trainerId` is NULL
- Used for tracking personal training progress

**Example Use Cases:**
- Client works out at home following a plan
- Client goes to gym solo and logs exercises
- Client tracks cardio, yoga, or other independent activities

**Data Flow:**
```
Client → Workout Logger UI → POST /api/workout/sessions
{
  userId: 123,
  sessionType: 'solo',    // DEFAULT
  sessionId: null,
  trainerId: null,
  title: "Morning Chest Day",
  exercises: [...]
}
→ WorkoutSession created (no session deducted)
```

### Trainer-Led Sessions (`sessionType: 'trainer-led'`)

**Characteristics:**
- Client meets with trainer for paid session
- Linked to a booked `Session` record
- Session credit IS deducted from client's package (via Session.sessionDeducted)
- `sessionId` references the Session record
- `trainerId` references the trainer
- Trainer logs workout or client logs with session link

**Example Use Cases:**
- In-person training session at gym
- Virtual 1-on-1 session via video call
- Trainer-supervised workout with real-time guidance

**Data Flow:**
```
1. Client books session:
   POST /api/sessions
   {
     userId: 123,
     trainerId: 456,
     sessionDate: "2026-01-15T10:00:00Z"
   }
   → Session created with status='scheduled'

2. Session starts:
   PATCH /api/sessions/:id
   { status: 'in_progress' }

3. Workout logged during/after session:
   POST /api/workout/sessions
   {
     userId: 123,
     sessionType: 'trainer-led',
     sessionId: 789,           // Links to booked Session
     trainerId: 456,
     title: "Personal Training Session",
     exercises: [...]
   }
   → WorkoutSession created
   → Session.sessionDeducted = true
   → Client's remaining session credits -= 1
```

## Migration

### Database Migration
File: `backend/migrations/20260102000001-add-session-type-to-workout-sessions.cjs`

**Changes:**
1. Add `sessionType` column (default: 'solo')
2. Add `sessionId` foreign key (references `sessions.id`)
3. Add `trainerId` foreign key (references `Users.id`)
4. Add indexes for performance
5. Add constraint: `sessionType='trainer-led'` requires `sessionId IS NOT NULL`

**Backward Compatibility:**
- All existing WorkoutSession records default to `sessionType='solo'`
- Existing data remains valid (solo workouts)

### Running Migration
```bash
cd backend
npx sequelize-cli db:migrate
```

### Rollback (if needed)
```bash
npx sequelize-cli db:migrate:undo
```

## API Endpoints

### Analytics - Session Usage Stats
**GET** `/api/analytics/:userId/session-usage`

**Response:**
```json
{
  "total": 45,
  "solo": {
    "count": 30,
    "percentage": 66.7
  },
  "trainerLed": {
    "count": 15,
    "percentage": 33.3
  }
}
```

**Backend Implementation:**
```javascript
// backend/services/analyticsService.mjs
export async function calculateSessionUsageStats(userId, options = {}) {
  const [soloCount, trainerLedCount, totalWorkouts] = await Promise.all([
    WorkoutSession.count({
      where: { userId, status: 'completed', sessionType: 'solo' }
    }),
    WorkoutSession.count({
      where: { userId, status: 'completed', sessionType: 'trainer-led' }
    }),
    WorkoutSession.count({
      where: { userId, status: 'completed' }
    })
  ]);

  return {
    total: totalWorkouts,
    solo: {
      count: soloCount,
      percentage: (soloCount / totalWorkouts) * 100
    },
    trainerLed: {
      count: trainerLedCount,
      percentage: (trainerLedCount / totalWorkouts) * 100
    }
  };
}
```

## Frontend Display

### Workout Type Distribution Chart
Location: `frontend/src/components/DashBoard/Pages/admin-dashboard/WorkoutProgressCharts.tsx`

**Chart Title:** "Workout Type Distribution"

**Display:**
- Green bar: "Solo Workouts" (count + percentage)
- Orange bar: "Trainer Sessions" (count + percentage)

**Tooltip:**
Shows: `"X workouts (Y%)"` where Y is percentage of total

**Example:**
```
Solo Workouts:    ████████████████ 30 workouts (66.7%)
Trainer Sessions: ████████         15 workouts (33.3%)
```

## Session Credit Deduction

### Current Logic (Session Model)
The `Session.sessionDeducted` field tracks whether a session credit was deducted:

```javascript
// When session is completed
if (session.status === 'completed' && !session.sessionDeducted) {
  // Deduct session credit from client's package
  await deductSessionCredit(session.userId);
  session.sessionDeducted = true;
  await session.save();
}
```

### Relationship to WorkoutSession
```
Session (Booked Training)
  ↓
  ├─ sessionDeducted: true/false
  ↓
WorkoutSession (Logged Workout)
  ↓
  ├─ sessionType: 'trainer-led'
  └─ sessionId: FK → Session.id
```

**Important:**
- A `Session` can exist WITHOUT a `WorkoutSession` (e.g., cancelled, no-show)
- A `WorkoutSession` with `sessionType='trainer-led'` MUST have a `sessionId`
- Solo workouts (`sessionType='solo'`) have NO `sessionId`

## Use Cases & Examples

### Example 1: Client with 10-Session Package

**Package:** 10 trainer-led sessions purchased

**Activity Log:**
```
Week 1:
- Monday: Solo workout (chest/triceps) → sessionType='solo', NO credit used
- Wednesday: Trainer session → sessionType='trainer-led', 1 credit used (9 left)
- Friday: Solo workout (back/biceps) → sessionType='solo', NO credit used

Week 2:
- Monday: Solo workout (legs) → sessionType='solo', NO credit used
- Thursday: Trainer session → sessionType='trainer-led', 1 credit used (8 left)
- Saturday: Solo workout (shoulders) → sessionType='solo', NO credit used

Result:
- Total workouts: 6
- Solo: 4 (66.7%)
- Trainer-led: 2 (33.3%)
- Session credits remaining: 8
```

### Example 2: Analytics Dashboard

**Client Profile:**
- Total workouts logged: 45
- Solo workouts: 30
- Trainer-led sessions: 15
- Session package: 20 sessions purchased, 5 remaining

**Chart Display:**
```
Workout Type Distribution
─────────────────────────
Solo Workouts:    ██████████████ 30 (66.7%)
Trainer Sessions: ███████        15 (33.3%)

Session Credits
─────────────────────────
Used:      ███████        15
Remaining: █████           5
Total:     ████████████   20
```

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Existing WorkoutSession records default to 'solo'
- [ ] Can create solo workout (sessionId=null, trainerId=null)
- [ ] Can create trainer-led workout (sessionId required, trainerId required)
- [ ] Constraint prevents trainer-led workout without sessionId
- [ ] Analytics API returns correct counts
- [ ] Chart displays both workout types
- [ ] Solo workouts do NOT deduct session credits
- [ ] Trainer-led workouts DO deduct session credits (via Session.sessionDeducted)
- [ ] Indexes improve query performance

## Future Enhancements

### 1. Hybrid Sessions
Some sessions may be "trainer-assisted" (trainer provides plan, client executes solo):
```javascript
sessionType: 'trainer-assisted',
sessionId: null,
trainerId: 456,  // Trainer who provided the plan
planId: 789      // Reference to assigned WorkoutPlan
```

### 2. Group Sessions
Multiple clients in one session:
```javascript
sessionType: 'group',
sessionId: 789,
trainerId: 456,
groupSize: 5
```

### 3. Session Credit Packages
Different package types:
- Solo-only: Unlimited solo logging, no trainer sessions
- Hybrid: X solo workouts + Y trainer sessions
- Unlimited: Unlimited everything

## Files Modified

1. **Migration:** `backend/migrations/20260102000001-add-session-type-to-workout-sessions.cjs`
2. **Model:** `backend/models/WorkoutSession.mjs`
3. **Service:** `backend/services/analyticsService.mjs` (already expects sessionType)
4. **Chart:** `frontend/src/components/DashBoard/Pages/admin-dashboard/WorkoutProgressCharts.tsx`

## Summary

✅ **Solo workouts** = Client self-logs, NO session credits deducted, sessionType='solo'
✅ **Trainer sessions** = Paid training, session credits deducted, sessionType='trainer-led'
✅ **Chart updated** to show "Workout Type Distribution" (not "Session Usage")
✅ **Database migration** adds sessionType, sessionId, trainerId fields
✅ **Backward compatible** - existing records default to 'solo'
✅ **Analytics ready** - service already queries by sessionType

The system now properly distinguishes between free self-logging and paid trainer sessions!
