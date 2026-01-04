# 🎯 AI VILLAGE MASTER PROMPT: UNIVERSAL MASTER SCHEDULE SYSTEM
## Complete Testing, Enhancement & MindBody Feature Parity

**Date Created:** 2025-12-31
**Priority:** CRITICAL
**Estimated Time:** 3-5 days
**Status:** Ready for AI Village Execution

---

## 📋 EXECUTIVE SUMMARY

You are tasked with testing, debugging, and enhancing the Universal Master Schedule system for SwanStudios Personal Training Platform. The goal is to achieve feature parity with the MindBody app (industry-standard scheduling software) while making the UX more fluid, easier to use, and visually superior.

**Key Deliverables:**
1. ✅ Create test client seed data for comprehensive testing
2. ✅ Fix calendar view switching (Day/Week/Month views not working)
3. ✅ Implement session credit tracking and management
4. ✅ Add 30-minute session support
5. ✅ Implement MindBody-equivalent features for admin + client
6. ✅ Update master handbook with all scheduling system documentation
7. ✅ Create comprehensive test suite and validation reports

---

## 📚 CRITICAL CONTEXT & DOCUMENTATION

### Documentation You MUST Read First:

1. **Phase 1 Scheduling Improvements** (COMPLETED - Your Foundation)
   - Location: `PHASE-1-COMPLETION-REPORT.md`
   - Location: `IMPLEMENTATION-STATUS-SUMMARY.md`
   - Location: `PHASE-1-IMPLEMENTATION-GUIDE.md`
   - Summary: All visual UX/UI improvements completed, design tokens created, WCAG AA compliance achieved

2. **Comprehensive Scheduling Analysis**
   - Location: `SCHEDULING-SYSTEM-ANALYSIS.md`
   - Contains: Full system architecture, 5 calendar implementations found, current issues, recommended fixes

3. **Dashboard Audit Results**
   - Location: `DASHBOARD-AUDIT-RESULTS.md`
   - Location: `DASHBOARD-AUDIT-SUMMARY.md`
   - Contains: Complete feature audit, critical issues, cross-dashboard problems

4. **Current Schedule Component Files:**
   - **Core Calendar:** `frontend/src/components/Schedule/schedule.tsx` (2520 lines)
   - **Admin Schedule:** `frontend/src/components/DashBoard/Pages/admin-dashboard/schedule/AdminScheduleTab.tsx`
   - **Trainer Schedule:** `frontend/src/components/DashBoard/Pages/trainer-dashboard/schedule/TrainerScheduleTab.tsx`
   - **Client Schedule:** `frontend/src/components/DashBoard/Pages/client-dashboard/schedule/ClientScheduleTab.tsx`
   - **Design Tokens:** `frontend/src/theme/tokens.ts`

5. **Backend Session Management:**
   - **Models:** `backend/models/Session.cjs`
   - **Routes:** `backend/routes/sessions.cjs`
   - **Controllers:** Search for session controller files
   - **Existing Seeders:** `backend/seeders/` (check for session-related seeders)

---

## 🎯 TASK 1: CREATE TEST CLIENT SEED DATA

### Objective:
Create a comprehensive test client user with sessions, credits, and realistic data for thorough schedule testing.

### Requirements:

**Test Client User:**
```javascript
{
  email: "testclient@swanstudios.com",
  password: "TestClient2025!",
  firstName: "Sarah",
  lastName: "TestClient",
  role: "client",
  phone: "555-0123",

  // Session Credits
  totalSessionsAllocated: 20,      // Total sessions purchased
  sessionsRemaining: 15,            // Available to book
  sessionsCompleted: 3,             // Already completed
  sessionsScheduled: 2,             // Booked but not completed
  sessionsCancelled: 0,

  // Package Assignment
  packageId: <reference to existing package>,
  packagePurchaseDate: "2025-01-01",
  packageExpirationDate: "2025-07-01", // 6 months

  // Client Details
  fitnessGoals: "Weight loss and strength training",
  medicalConditions: "None",
  emergencyContact: {
    name: "John TestClient",
    phone: "555-0124",
    relationship: "Spouse"
  }
}
```

**Test Sessions for This Client:**
Create 5 test sessions with varied statuses:

1. **Completed Session (Past):**
   - Date: 7 days ago
   - Duration: 60 minutes
   - Status: "completed"
   - Trainer: <assign to existing admin/trainer>
   - Notes: "Great progress on deadlifts"

2. **Scheduled Session (Tomorrow):**
   - Date: Tomorrow, 10:00 AM
   - Duration: 60 minutes
   - Status: "confirmed"
   - Trainer: <assign to existing admin/trainer>

3. **Scheduled 30-Min Session (3 days from now):**
   - Date: 3 days from now, 2:00 PM
   - Duration: 30 minutes
   - Status: "confirmed"
   - Trainer: <assign to existing admin/trainer>
   - Notes: "Quick form check - upper body"

4. **Requested Session (Pending Admin Approval):**
   - Date: 5 days from now, 9:00 AM
   - Duration: 60 minutes
   - Status: "requested"
   - Trainer: null (client requested, admin needs to assign)

5. **Available Time Slot (Admin Created):**
   - Date: 7 days from now, 11:00 AM
   - Duration: 60 minutes
   - Status: "available"
   - Trainer: <assign to existing admin/trainer>
   - userId: null (open for booking)

**Seeder File Location:**
Create: `backend/seeders/20250101-test-client-comprehensive.mjs`

**Testing Instructions in Seeder:**
Include detailed comments explaining:
- How to login as test client
- What sessions should be visible
- Expected session counts in each status
- How session credits should decrement when booking

---

## 🎯 TASK 2: FIX CALENDAR VIEW SWITCHING (Day/Week/Month)

### Issue:
The Universal Master Schedule calendar is not properly switching between Day, Week, and Month views. Users should be able to toggle between these views seamlessly.

### Current Implementation Analysis Needed:

1. **Read the Core Calendar Component:**
   - File: `frontend/src/components/Schedule/schedule.tsx`
   - Line ~2520: Check react-big-calendar configuration
   - Look for `views` prop and view state management
   - Check if `onView` handler is properly implemented

2. **Check for View Configuration:**
```typescript
// Expected configuration (check if this exists):
const [currentView, setCurrentView] = useState('week');

<Calendar
  views={['month', 'week', 'day', 'agenda']}
  view={currentView}
  onView={(view) => setCurrentView(view)}
  // ... other props
/>
```

3. **Responsive View Logic:**
According to `SCHEDULING-SYSTEM-ANALYSIS.md`, there should be responsive view limiting:
```typescript
// Mobile (<600px): Only Day + Agenda
// Tablet (600-1024px): Week + Day + Agenda
// Desktop (>1024px): All views (Month + Week + Day + Agenda)
```

### Implementation Steps:

1. **Add View State Management:**
   - Import `useState` for view tracking
   - Add view selection buttons/dropdown in toolbar
   - Persist view preference to localStorage

2. **Add View Switcher UI:**
```typescript
const ViewSwitcher = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  background: rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  padding: 4px;
`;

const ViewButton = styled.button<{ isActive: boolean }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  min-height: 44px;
  background: ${props => props.isActive ? theme.colors.brand.gradient : 'transparent'};
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: ${theme.typography.scale.sm};
  transition: all 0.2s;

  &:hover {
    background: ${props => props.isActive
      ? theme.colors.brand.gradient
      : 'rgba(0, 255, 255, 0.15)'};
  }
`;

// Usage:
<ViewSwitcher>
  <ViewButton
    isActive={currentView === 'month'}
    onClick={() => handleViewChange('month')}
  >
    Month
  </ViewButton>
  <ViewButton
    isActive={currentView === 'week'}
    onClick={() => handleViewChange('week')}
  >
    Week
  </ViewButton>
  <ViewButton
    isActive={currentView === 'day'}
    onClick={() => handleViewChange('day')}
  >
    Day
  </ViewButton>
</ViewSwitcher>
```

3. **Implement Responsive View Logic:**
```typescript
const getAvailableViews = () => {
  const width = window.innerWidth;

  if (width < 600) {
    return ['day', 'agenda']; // Mobile
  } else if (width < 1024) {
    return ['week', 'day', 'agenda']; // Tablet
  } else {
    return ['month', 'week', 'day', 'agenda']; // Desktop
  }
};

const [availableViews, setAvailableViews] = useState(getAvailableViews());

useEffect(() => {
  const handleResize = () => {
    const newViews = getAvailableViews();
    setAvailableViews(newViews);

    // If current view is not available on new screen size, switch to first available
    if (!newViews.includes(currentView)) {
      setCurrentView(newViews[0]);
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [currentView]);
```

4. **Testing Checklist:**
   - [ ] Month view displays correctly (all days of month visible)
   - [ ] Week view shows 7 days with time slots
   - [ ] Day view shows single day with hourly breakdown
   - [ ] Agenda view shows list of upcoming sessions
   - [ ] View buttons update active state correctly
   - [ ] View preference persists across page refreshes
   - [ ] Responsive view limiting works on mobile/tablet/desktop
   - [ ] Sessions appear in all views correctly
   - [ ] Clicking on a time slot works in all views

---

## 🎯 TASK 3: IMPLEMENT SESSION CREDIT TRACKING & MANAGEMENT

### Objective:
Implement real-time session credit tracking so users can see how many sessions they have remaining, and credits automatically decrement when sessions are scheduled.

### Current State Analysis:

**Check Existing Implementation:**
1. Read `backend/models/Session.cjs` - Does it track userId associations?
2. Read `backend/models/User.cjs` or `Client.cjs` - Are session credits stored here?
3. Check if packages have session allocations
4. Verify API endpoints for session booking/cancellation

### Backend Implementation:

**1. User/Client Model Updates:**
```javascript
// In User or Client model (backend/models/)
{
  // Session Credit Fields
  totalSessionsAllocated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total sessions purchased across all packages'
  },
  sessionsRemaining: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Available sessions to book'
  },
  sessionsCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Sessions completed'
  },
  sessionsScheduled: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Sessions booked but not yet completed'
  },
  sessionsCancelled: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Sessions cancelled (may or may not refund based on policy)'
  },

  // Package Tracking
  activePackageId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Packages',
      key: 'id'
    }
  },
  packagePurchaseDate: DataTypes.DATE,
  packageExpirationDate: DataTypes.DATE
}
```

**2. Session Lifecycle Hooks:**

Create session status change handlers:

```javascript
// backend/controllers/sessionController.js

/**
 * Book a session (client claims an available slot)
 */
async bookSession(req, res) {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const session = await Session.findByPk(sessionId);
    const user = await User.findByPk(userId);

    // Validation
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'available') {
      return res.status(400).json({ error: 'Session is not available' });
    }

    if (user.sessionsRemaining <= 0) {
      return res.status(400).json({
        error: 'No sessions remaining. Please purchase a package.'
      });
    }

    // Use transaction for atomic update
    await sequelize.transaction(async (t) => {
      // Update session
      await session.update({
        userId: userId,
        status: 'scheduled',
        bookedAt: new Date()
      }, { transaction: t });

      // Decrement user credits
      await user.decrement('sessionsRemaining', { transaction: t });
      await user.increment('sessionsScheduled', { transaction: t });
    });

    // Fetch updated data
    await user.reload();

    res.json({
      message: 'Session booked successfully',
      session,
      creditsRemaining: user.sessionsRemaining
    });

  } catch (error) {
    console.error('Error booking session:', error);
    res.status(500).json({ error: 'Failed to book session' });
  }
}

/**
 * Cancel a session (client cancels, credits may be refunded based on policy)
 */
async cancelSession(req, res) {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const session = await Session.findByPk(sessionId);
    const user = await User.findByPk(userId);

    // Validation
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check cancellation policy (24 hours before session)
    const sessionTime = new Date(session.sessionDate);
    const now = new Date();
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);

    const refundCredit = hoursUntilSession >= 24; // 24-hour cancellation policy

    await sequelize.transaction(async (t) => {
      // Update session
      await session.update({
        userId: null,
        status: 'available', // Return to available pool
        cancelledAt: new Date(),
        cancellationReason: req.body.reason || 'Client cancellation'
      }, { transaction: t });

      // Update user credits
      await user.decrement('sessionsScheduled', { transaction: t });
      await user.increment('sessionsCancelled', { transaction: t });

      if (refundCredit) {
        await user.increment('sessionsRemaining', { transaction: t });
      }
    });

    await user.reload();

    res.json({
      message: 'Session cancelled successfully',
      creditRefunded: refundCredit,
      creditsRemaining: user.sessionsRemaining
    });

  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
}

/**
 * Mark session as completed (trainer/admin only)
 */
async completeSession(req, res) {
  const { sessionId } = req.params;

  try {
    const session = await Session.findByPk(sessionId);
    const user = await User.findByPk(session.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await sequelize.transaction(async (t) => {
      // Update session
      await session.update({
        status: 'completed',
        completedAt: new Date(),
        trainerNotes: req.body.notes || ''
      }, { transaction: t });

      // Update user stats
      await user.decrement('sessionsScheduled', { transaction: t });
      await user.increment('sessionsCompleted', { transaction: t });
    });

    await user.reload();

    res.json({
      message: 'Session marked as completed',
      session,
      userStats: {
        completed: user.sessionsCompleted,
        scheduled: user.sessionsScheduled,
        remaining: user.sessionsRemaining
      }
    });

  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
}
```

**3. API Endpoints:**

Add to `backend/routes/sessions.cjs`:

```javascript
// Client actions
router.post('/:sessionId/book', authenticate, sessionController.bookSession);
router.post('/:sessionId/cancel', authenticate, sessionController.cancelSession);

// Trainer/Admin actions
router.post('/:sessionId/complete', authenticate, requireRole(['admin', 'trainer']), sessionController.completeSession);
router.post('/:sessionId/confirm', authenticate, requireRole(['admin', 'trainer']), sessionController.confirmSession);

// Get user session stats
router.get('/stats', authenticate, sessionController.getUserSessionStats);
```

### Frontend Implementation:

**1. Session Stats Display:**

Update all 3 dashboard schedule tabs to show real-time stats:

```typescript
// In ClientScheduleTab.tsx, AdminScheduleTab.tsx, TrainerScheduleTab.tsx

const [sessionStats, setSessionStats] = useState({
  mySessionsCount: 0,
  creditsRemaining: 0,
  upcomingThisWeek: 0,
  totalAllocated: 0,
  completed: 0
});

useEffect(() => {
  const fetchSessionStats = async () => {
    try {
      const response = await authAxios.get('/api/sessions/stats');
      setSessionStats(response.data);
    } catch (error) {
      console.error('Failed to fetch session stats:', error);
    }
  };

  fetchSessionStats();

  // Refresh stats every 30 seconds
  const interval = setInterval(fetchSessionStats, 30000);
  return () => clearInterval(interval);
}, []);

// Update stats display to use real data:
<StatItem>
  <Calendar />
  <span>My Sessions: {sessionStats.mySessionsCount}</span>
</StatItem>
<StatItem>
  <CreditCard />
  <span>Credits: {sessionStats.creditsRemaining}/{sessionStats.totalAllocated}</span>
</StatItem>
<StatItem>
  <Clock />
  <span>This Week: {sessionStats.upcomingThisWeek}</span>
</StatItem>
```

**2. Session Booking Flow:**

When client clicks "Quick Book" or an available slot:

```typescript
const handleBookSession = async (sessionId: string) => {
  try {
    // Show confirmation modal first
    const confirmed = await showConfirmDialog({
      title: 'Book Session',
      message: `You have ${sessionStats.creditsRemaining} credits remaining. Confirm booking?`,
      confirmText: 'Book Session',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    // Book the session
    const response = await authAxios.post(`/api/sessions/${sessionId}/book`);

    // Show success toast
    toast({
      variant: 'success',
      title: 'Session Booked!',
      description: `You have ${response.data.creditsRemaining} credits remaining.`
    });

    // Refresh calendar and stats
    await refreshSessions();
    await fetchSessionStats();

  } catch (error) {
    console.error('Booking failed:', error);

    toast({
      variant: 'destructive',
      title: 'Booking Failed',
      description: error.response?.data?.error || 'Failed to book session. Please try again.'
    });
  }
};
```

**3. Credit Warning System:**

Add visual warnings when credits are low:

```typescript
// In ClientScheduleTab.tsx
const creditWarningLevel = sessionStats.creditsRemaining <= 3;

{creditWarningLevel && (
  <CreditWarningBanner>
    <AlertTriangle size={20} />
    <span>
      You have only {sessionStats.creditsRemaining} session credits remaining.
      <Link to="/store">Purchase more sessions</Link>
    </span>
  </CreditWarningBanner>
)}
```

---

## 🎯 TASK 4: ADD 30-MINUTE SESSION SUPPORT

### Objective:
Allow admins to create both 30-minute and 60-minute training sessions, with proper time slot management.

### Implementation:

**1. Session Model Update:**

```javascript
// backend/models/Session.cjs

{
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
    validate: {
      isIn: [[30, 60, 90, 120]] // Support 30min, 1hr, 1.5hr, 2hr sessions
    },
    comment: 'Session duration in minutes'
  },

  // Calculate end time automatically
  sessionEndTime: {
    type: DataTypes.VIRTUAL,
    get() {
      const startTime = new Date(this.sessionDate);
      const endTime = new Date(startTime.getTime() + (this.duration * 60000));
      return endTime;
    }
  }
}
```

**2. Admin Session Creation Form:**

Update the create session modal to include duration selection:

```typescript
// In schedule.tsx or admin session creation modal

const [sessionDuration, setSessionDuration] = useState(60);

<FormField>
  <FormLabel>Session Duration</FormLabel>
  <DurationSelector>
    <DurationOption
      isActive={sessionDuration === 30}
      onClick={() => setSessionDuration(30)}
    >
      30 min
      <DurationBadge>Quick Check</DurationBadge>
    </DurationOption>

    <DurationOption
      isActive={sessionDuration === 60}
      onClick={() => setSessionDuration(60)}
    >
      60 min
      <DurationBadge>Standard</DurationBadge>
    </DurationOption>

    <DurationOption
      isActive={sessionDuration === 90}
      onClick={() => setSessionDuration(90)}
    >
      90 min
      <DurationBadge>Extended</DurationBadge>
    </DurationOption>
  </DurationSelector>
</FormField>
```

**3. Calendar Time Slot Configuration:**

Update react-big-calendar to support 30-minute slots:

```typescript
// In schedule.tsx

<Calendar
  step={30}           // 30-minute time slots
  timeslots={2}       // 2 slots per hour (30 min each)
  min={new Date(0, 0, 0, 6, 0, 0)}   // 6:00 AM
  max={new Date(0, 0, 0, 22, 0, 0)}  // 10:00 PM
  // ... other props
/>
```

**4. Visual Duration Indicators:**

Sessions should visually indicate their duration:

```typescript
const eventStyleGetter = (event: SessionEvent) => {
  const baseStyle = {
    borderRadius: '8px',
    padding: '6px 8px',
    border: 'none',
    borderLeft: '4px solid',
    fontSize: '0.875rem',
    fontWeight: 500,
  };

  // Add duration indicator
  const durationBadge = event.duration === 30 ? '⚡' : event.duration >= 90 ? '⏱️' : '';

  return {
    style: {
      ...baseStyle,
      // ... existing color logic
    },
    title: `${durationBadge} ${event.title} (${event.duration}min)`
  };
};
```

**5. Conflict Detection:**

Prevent overlapping sessions:

```javascript
// backend/controllers/sessionController.js

async createSession(req, res) {
  const { sessionDate, duration, trainerId } = req.body;

  const startTime = new Date(sessionDate);
  const endTime = new Date(startTime.getTime() + (duration * 60000));

  // Check for conflicts
  const conflicts = await Session.findAll({
    where: {
      trainerId,
      status: { [Op.in]: ['available', 'scheduled', 'confirmed'] },
      [Op.or]: [
        // New session starts during existing session
        {
          sessionDate: { [Op.lte]: startTime },
          // Use raw query to calculate end time
          [Op.and]: sequelize.literal(`DATE_ADD(sessionDate, INTERVAL duration MINUTE) > '${startTime.toISOString()}'`)
        },
        // New session ends during existing session
        {
          sessionDate: { [Op.lt]: endTime },
          [Op.and]: sequelize.literal(`DATE_ADD(sessionDate, INTERVAL duration MINUTE) >= '${endTime.toISOString()}'`)
        }
      ]
    }
  });

  if (conflicts.length > 0) {
    return res.status(400).json({
      error: 'Time slot conflict detected',
      conflicts: conflicts.map(s => ({
        id: s.id,
        startTime: s.sessionDate,
        endTime: new Date(new Date(s.sessionDate).getTime() + (s.duration * 60000))
      }))
    });
  }

  // Create session if no conflicts
  const session = await Session.create(req.body);
  res.status(201).json(session);
}
```

---

## 🎯 TASK 5: IMPLEMENT MINDBODY FEATURE PARITY

### MindBody App Core Features Analysis:

Based on industry research, MindBody scheduling includes:

**Admin/Business Features:**
1. ✅ Create available time slots
2. ✅ Assign trainers to sessions
3. ✅ Block time (trainer unavailable)
4. ✅ Recurring session creation (weekly repeats)
5. ✅ Waitlist management
6. ✅ Session package assignment
7. ✅ Late cancellation fees
8. ✅ No-show tracking
9. ✅ Client session history
10. ✅ Revenue reporting by session
11. ✅ Trainer schedule conflicts
12. ✅ Multi-location support (if applicable)

**Client Features:**
1. ✅ View available sessions
2. ✅ Book sessions (with credit check)
3. ✅ Cancel sessions (with policy enforcement)
4. ✅ Reschedule sessions
5. ✅ Add to calendar (Google, Apple, Outlook)
6. ✅ Session reminders (email/SMS)
7. ✅ View session history
8. ✅ Rate/review trainers after session
9. ✅ See trainer bios/specialties
10. ✅ Filter by trainer, time, location

### Enhanced Features Beyond MindBody:

**Make It Better & Easier:**

1. **Quick Actions Dashboard Widget:**
```typescript
// Add to client dashboard
<QuickActionsWidget>
  <QuickAction onClick={handleQuickBookNextAvailable}>
    <Zap />
    <span>Book Next Available</span>
  </QuickAction>

  <QuickAction onClick={handleRescheduleMostRecent}>
    <RefreshCw />
    <span>Reschedule Upcoming</span>
  </QuickAction>

  <QuickAction onClick={handleViewHistory}>
    <History />
    <span>Session History</span>
  </QuickAction>
</QuickActionsWidget>
```

2. **Smart Scheduling Suggestions:**
```typescript
// AI-powered suggestions based on client history
const suggestedTimes = [
  { day: 'Monday', time: '10:00 AM', reason: 'You usually book Mondays' },
  { day: 'Wednesday', time: '2:00 PM', reason: 'Your trainer is available' },
  { day: 'Friday', time: '9:00 AM', reason: 'End your week strong!' }
];
```

3. **Visual Session Timeline:**
```typescript
// Show client's week at a glance
<WeekTimeline>
  {weekDays.map(day => (
    <DayColumn key={day.date}>
      <DayHeader>{day.name}</DayHeader>
      {day.sessions.map(session => (
        <SessionBlock
          status={session.status}
          time={session.time}
          trainer={session.trainer}
        />
      ))}
    </DayColumn>
  ))}
</WeekTimeline>
```

4. **Trainer Preference System:**
```typescript
// Allow clients to set preferred trainers
const [preferredTrainers, setPreferredTrainers] = useState([]);

// Filter sessions by preferred trainers
const filteredSessions = sessions.filter(s =>
  preferredTrainers.length === 0 || preferredTrainers.includes(s.trainerId)
);
```

5. **Session Package Progress Bar:**
```typescript
<PackageProgressCard>
  <PackageHeader>
    <h3>Current Package: {packageName}</h3>
    <span>Expires: {expirationDate}</span>
  </PackageHeader>

  <ProgressBar>
    <ProgressFill
      width={`${(sessionsCompleted / totalSessions) * 100}%`}
      variant="success"
    />
    <ProgressFill
      width={`${(sessionsScheduled / totalSessions) * 100}%`}
      variant="warning"
    />
  </ProgressBar>

  <ProgressStats>
    <StatBadge variant="success">{sessionsCompleted} Completed</StatBadge>
    <StatBadge variant="warning">{sessionsScheduled} Scheduled</StatBadge>
    <StatBadge variant="info">{sessionsRemaining} Remaining</StatBadge>
  </ProgressStats>
</PackageProgressCard>
```

### Features to Implement:

**Priority 1 (Critical - This Sprint):**
- [x] View switching (Day/Week/Month)
- [x] Session credit tracking
- [x] 30-minute sessions
- [ ] Recurring session creation
- [ ] Cancellation policy enforcement (24-hour rule)
- [ ] Session conflict detection
- [ ] "Book Next Available" quick action
- [ ] Session history view

**Priority 2 (Important - Next Sprint):**
- [ ] Waitlist for full sessions
- [ ] Session reschedule flow
- [ ] Trainer assignment/reassignment
- [ ] No-show tracking
- [ ] Late cancellation fees
- [ ] Email/SMS reminders
- [ ] Add to calendar (ICS export)
- [ ] Trainer preference filtering

**Priority 3 (Nice to Have):**
- [ ] Multi-trainer sessions (group training)
- [ ] Location selection
- [ ] Session notes/goals
- [ ] Post-session trainer feedback
- [ ] Client rating/review system
- [ ] Session photo upload

---

## 🎯 TASK 6: COMPREHENSIVE TESTING SUITE

### Test Cases to Execute:

**1. Visual Tests (All 3 Dashboards):**
- [ ] Admin schedule loads without errors
- [ ] Trainer schedule loads without errors
- [ ] Client schedule loads without errors
- [ ] All 3 dashboards have consistent styling
- [ ] Calendar displays sessions correctly
- [ ] View switcher works (Month/Week/Day)
- [ ] Stats bar shows correct counts
- [ ] Mobile responsive layout works

**2. Session Credit Tests:**

Login as test client (`testclient@swanstudios.com` / `TestClient2025!`):

- [ ] Stats show: 15 credits remaining, 2 scheduled, 3 completed
- [ ] Can book an available session
- [ ] Credits decrement to 14 after booking
- [ ] Scheduled count increments to 3
- [ ] Cannot book when credits = 0
- [ ] Cancel session refunds credit (if >24hrs before)
- [ ] Cancel session doesn't refund credit (if <24hrs before)

**3. Session CRUD Tests (Admin):**

Login as admin:

- [ ] Can create 60-minute session
- [ ] Can create 30-minute session
- [ ] Cannot create overlapping sessions for same trainer
- [ ] Can assign trainer to session
- [ ] Can block time (trainer unavailable)
- [ ] Can view all sessions (all clients/trainers)
- [ ] Can filter sessions by trainer
- [ ] Can filter sessions by status
- [ ] Can mark session as completed
- [ ] Can cancel session
- [ ] Can edit session details

**4. Client Booking Flow Tests:**

Login as test client:

- [ ] Can see available sessions
- [ ] Can click "Quick Book" button
- [ ] Booking confirmation modal appears
- [ ] Shows credit count in confirmation
- [ ] Successful booking shows toast notification
- [ ] Calendar refreshes to show new booking
- [ ] Can view session details
- [ ] Can cancel upcoming session
- [ ] Cannot cancel session <24 hours before
- [ ] Can view session history
- [ ] Past sessions show "completed" status

**5. Calendar View Tests:**

- [ ] Month view shows all days of month
- [ ] Week view shows 7 days with time slots
- [ ] Day view shows single day, 6am-10pm
- [ ] Sessions appear in correct time slots
- [ ] 30-min sessions show correct duration
- [ ] 60-min sessions show correct duration
- [ ] Can navigate prev/next month
- [ ] Can navigate prev/next week
- [ ] Can click "Today" to return to current date
- [ ] Mobile shows only Day/Agenda views
- [ ] Tablet shows Week/Day/Agenda views
- [ ] Desktop shows all views

**6. Edge Cases:**

- [ ] What happens if client has 0 credits?
- [ ] What happens if all time slots are booked?
- [ ] What happens if trainer is deleted?
- [ ] What happens if session date is in the past?
- [ ] What happens on package expiration?
- [ ] What happens with multiple concurrent bookings?
- [ ] What happens if database is slow to respond?

---

## 🎯 TASK 7: UPDATE MASTER HANDBOOK

### Documentation to Create/Update:

**1. Create: `UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md`**

Location: `docs/systems/UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md`

Contents:
```markdown
# Universal Master Schedule System - Complete Handbook

## System Overview
[Describe the entire scheduling system architecture]

## User Roles & Permissions
### Admin
- Create sessions
- Assign trainers
- View all sessions
- Manage client credits
- Generate reports

### Trainer
- View assigned sessions
- Mark sessions complete
- Block personal time
- View client history

### Client
- View available sessions
- Book sessions (if credits available)
- Cancel sessions (24hr policy)
- View session history
- Track remaining credits

## Session Lifecycle

[Flowchart or detailed description]

1. Admin creates available time slot
2. Session status: "available"
3. Client books session
4. Session status: "scheduled"
5. Trainer confirms (optional)
6. Session status: "confirmed"
7. Session occurs
8. Trainer marks complete
9. Session status: "completed"
10. Credits updated

## Session Credit System

### How Credits Work
- Credits allocated when package purchased
- 1 credit = 1 session (regardless of duration)
- Credits decrement when booking
- Credits may refund if cancelled >24hrs before
- No refund if cancelled <24hrs before
- Credits expire with package expiration

### Database Schema
[Provide User model fields, Session model fields]

## API Endpoints

### GET /api/sessions
Get all sessions (admin) or user's sessions (client/trainer)

### POST /api/sessions
Create new session (admin only)

### POST /api/sessions/:id/book
Book an available session (client)

### POST /api/sessions/:id/cancel
Cancel a scheduled session

### POST /api/sessions/:id/complete
Mark session as completed (trainer/admin)

### GET /api/sessions/stats
Get user's session statistics

## Frontend Components

### Core Calendar Component
File: `frontend/src/components/Schedule/schedule.tsx`
- Uses react-big-calendar v1.8.2
- Supports Month/Week/Day/Agenda views
- 30-minute time slots
- 6am-10pm working hours

### Admin Schedule Tab
File: `frontend/src/components/DashBoard/Pages/admin-dashboard/schedule/AdminScheduleTab.tsx`

### Trainer Schedule Tab
File: `frontend/src/components/DashBoard/Pages/trainer-dashboard/schedule/TrainerScheduleTab.tsx`

### Client Schedule Tab
File: `frontend/src/components/DashBoard/Pages/client-dashboard/schedule/ClientScheduleTab.tsx`

## MindBody Feature Parity

[List all MindBody features and their implementation status]

## Testing Guide

[Reference test cases from TASK 6]

## Troubleshooting

Common Issues:
1. Views not switching
2. Sessions not appearing
3. Credits not updating
4. Booking conflicts

## Future Enhancements

- Recurring sessions
- Waitlist management
- SMS/Email reminders
- Multi-location support
- Group training sessions
```

**2. Update: `docs/MASTER-HANDBOOK.md`**

Add new section:

```markdown
## 🗓️ Scheduling System

**Status:** ✅ Phase 1 Complete, Phase 2 In Progress

**Documentation:**
- [Universal Master Schedule Handbook](systems/UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md)
- [Phase 1 Completion Report](../PHASE-1-COMPLETION-REPORT.md)
- [Scheduling System Analysis](../SCHEDULING-SYSTEM-ANALYSIS.md)

**Features:**
- ✅ Day/Week/Month/Agenda views
- ✅ 30-minute and 60-minute sessions
- ✅ Session credit tracking
- ✅ Real-time stats display
- ✅ WCAG AA accessibility
- ✅ Mobile responsive
- 🚧 Recurring sessions
- 🚧 Waitlist management
- 🚧 Email/SMS reminders

**Test Client:**
- Email: `testclient@swanstudios.com`
- Password: `TestClient2025!`
- Credits: 15 remaining
```

---

## 📊 DELIVERABLES & REPORTING

### Upon Completion, Provide:

**1. Test Client Seeder File:**
- Location: `backend/seeders/20250101-test-client-comprehensive.mjs`
- Include: Login credentials, expected data, testing instructions

**2. Test Results Report:**
- File: `SCHEDULING-SYSTEM-TEST-RESULTS.md`
- Include: All test cases (passed/failed), screenshots, bugs found

**3. Implementation Summary:**
- File: `SCHEDULING-PHASE-2-COMPLETION-REPORT.md`
- Include: What was built, what was fixed, what remains, time spent

**4. Updated Handbook:**
- File: `docs/systems/UNIVERSAL-MASTER-SCHEDULE-HANDBOOK.md`
- Complete system documentation

**5. Migration Files:**
- Any new database migrations for session credits, duration, etc.

**6. Bug List:**
- File: `SCHEDULING-BUGS-FOUND.md`
- Any issues discovered during testing

---

## 🚨 CRITICAL RULES

### DO:
- ✅ Read ALL documentation files listed in "Critical Context" section
- ✅ Test thoroughly with the test client
- ✅ Document everything you build
- ✅ Ask questions if requirements are unclear
- ✅ Follow existing code patterns and design tokens
- ✅ Keep mobile responsiveness in mind
- ✅ Ensure WCAG AA accessibility compliance
- ✅ Use meaningful commit messages
- ✅ Test on multiple screen sizes

### DON'T:
- ❌ Skip reading the existing documentation
- ❌ Break existing Phase 1 improvements
- ❌ Hardcode values (use design tokens)
- ❌ Add infinite animations
- ❌ Skip accessibility testing
- ❌ Create duplicate implementations
- ❌ Modify backend without migrations
- ❌ Commit broken code
- ❌ Forget to update the handbook

---

## 🎯 SUCCESS CRITERIA

This task is complete when:

1. ✅ Test client seeded successfully
2. ✅ Can login as test client and see correct stats (15 credits, 2 scheduled, 3 completed)
3. ✅ Calendar view switching works (Month/Week/Day)
4. ✅ Can book a session as client, credits decrement
5. ✅ Can cancel session, credits refund (if >24hrs)
6. ✅ 30-minute sessions display correctly
7. ✅ Admin can create both 30min and 60min sessions
8. ✅ Session conflict detection works
9. ✅ All test cases pass
10. ✅ Master handbook updated with complete documentation
11. ✅ No TypeScript errors
12. ✅ Build succeeds
13. ✅ Mobile responsive
14. ✅ Accessible (WCAG AA)

---

## 📞 QUESTIONS?

If you encounter issues or need clarification:

1. **Check documentation first:**
   - `SCHEDULING-SYSTEM-ANALYSIS.md`
   - `PHASE-1-COMPLETION-REPORT.md`
   - `DASHBOARD-AUDIT-RESULTS.md`

2. **Search the codebase:**
   - Use `Grep` to find existing implementations
   - Look for similar features in other dashboards

3. **Ask specific questions:**
   - Include file paths
   - Include line numbers
   - Include error messages
   - Include what you've already tried

---

**Good luck, AI Village! Build something amazing. 🚀**

---

*Document Version: 1.0*
*Created: 2025-12-31*
*Author: Claude Code + Sean (Product Owner)*
