# Comprehensive Testing Prompt for Roo AI

## Your Mission
Perform systematic end-to-end testing of the SwanStudios PT platform. Test all clickable elements, navigation flows, and key features to identify bugs, missing functionality, and UX issues.

---

## 🔐 Test Credentials

### Client Account (Primary Test User)
```
Email: client@test.com
Password: [Check TEST-CREDENTIALS.md for password]
Role: Client
User ID: 3
```

**Expected Data:**
- ✅ 12 session credits remaining
- ✅ 6 completed trainer-led sessions
- ✅ 6 solo workouts logged
- ✅ 2 upcoming scheduled sessions

### Admin Account
```
Email: admin@test.com
Password: [Check TEST-CREDENTIALS.md for password]
Role: Admin
```

### Trainer Account
```
Email: trainer@test.com
Password: [Check TEST-CREDENTIALS.md for password]
Role: Trainer
```

---

## 🎯 Testing Scope

### Priority 1: Core User Flows (MUST TEST)
1. **Authentication Flow**
   - Login/logout for all roles
   - Token refresh
   - Password reset flow

2. **Session Credit System**
   - View remaining credits
   - Book a session (credits should decrement)
   - Cancel session >24hrs (credits should refund)
   - Cancel session <24hrs (credits should NOT refund)

3. **Workout Logging**
   - Solo workout entry (should NOT deduct credits)
   - Trainer-led workout entry (should be linked to session)
   - View workout history

4. **Schedule Management**
   - Client: View schedule, book sessions, cancel sessions
   - Trainer: Create availability, approve requests
   - Admin: Manage all schedules

5. **Profile Management**
   - Update profile information
   - Upload profile photo
   - View user stats

### Priority 2: Admin Dashboard Features
1. Client management
2. Trainer management
3. Session package management
4. Analytics/reports
5. Exercise library management

### Priority 3: Edge Cases & Error Handling
1. Network failures
2. Invalid input validation
3. Permission boundaries
4. Concurrent session booking
5. Expired sessions

---

## 📂 Critical File Locations

### Frontend Routes & Components

#### Authentication
```
frontend/src/pages/Login.tsx
frontend/src/pages/Register.tsx
frontend/src/components/Auth/
```

#### Client Dashboard
```
frontend/src/components/DashBoard/Pages/client-dashboard/client-dashboard-view.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/schedule/ClientScheduleTab.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/schedule/ClientSessionHistory.tsx
```

#### Admin Dashboard
```
frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx
frontend/src/components/DashBoard/Pages/admin-dashboard/EnterpriseAdminSidebar.tsx
frontend/src/components/DashBoard/Pages/admin-dashboard/schedule/AdminScheduleTab.tsx
```

#### Admin Sessions Management
```
frontend/src/components/DashBoard/Pages/admin-sessions/enhanced-admin-sessions-view.tsx
```

#### Workout & Progress Charts
```
frontend/src/components/ClientProgressCharts/charts/NASMCategoryRadar.tsx
frontend/src/components/ClientProgressCharts/charts/OneRepMaxChart.tsx
frontend/src/components/ClientProgressCharts/charts/VolumeOverTimeChart.tsx
```

#### Schedule Component
```
frontend/src/components/Schedule/schedule.tsx
```

#### Exercise Management
```
frontend/src/components/Admin/CreateExerciseWizard.tsx
```

---

### Backend API Endpoints

#### Authentication Routes
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

#### Session Routes
```
GET /api/sessions - Get all sessions
GET /api/sessions/:id - Get specific session
POST /api/sessions - Create session
PUT /api/sessions/:id - Update session
DELETE /api/sessions/:id - Delete session
POST /api/sessions/book - Book a session (client)
POST /api/sessions/cancel - Cancel a session
```

#### Workout Session Routes
```
GET /api/workout-sessions - Get workout history
GET /api/workout-sessions/:id - Get specific workout
POST /api/workout-sessions - Log new workout
PUT /api/workout-sessions/:id - Update workout
DELETE /api/workout-sessions/:id - Delete workout
```

**Key Implementation:**
```
backend/routes/workoutSessionRoutes.mjs
backend/controllers/workoutSessionController.mjs
backend/models/WorkoutSession.mjs
```

#### Profile Routes
```
GET /api/profile - Get user profile
PUT /api/profile - Update profile
POST /api/profile/upload-profile-photo - Upload photo
GET /api/profile/stats - Get user stats
GET /api/profile/posts - Get user posts
GET /api/profile/achievements - Get achievements
```

**Key Implementation:**
```
backend/routes/profileRoutes.mjs
backend/controllers/profileController.mjs
```

#### Admin Routes
```
GET /api/admin/users - Get all users
PUT /api/admin/users/:id - Update user
GET /api/admin/trainers - Get all trainers
GET /api/admin/clients - Get all clients
PUT /api/admin/clients/:clientId/credits - Update client credits
GET /api/admin/contacts - Get contact submissions
```

**Key Implementation:**
```
backend/routes/adminRoutes.mjs
backend/controllers/adminController.mjs
backend/controllers/userManagementController.mjs
```

#### Session Package Routes
```
POST /api/session-packages/add-sessions/:clientId - Manually add credits
```

**Key Implementation:**
```
backend/routes/sessionPackageRoutes.mjs
backend/controllers/sessionPackageController.mjs
```

---

### Database Models & Schema

#### Core Models
```
backend/models/User.mjs - User accounts (clients, trainers, admins)
backend/models/Session.mjs - Training sessions
backend/models/WorkoutSession.mjs - Workout logging
backend/models/SessionPackage.mjs - Session credit packages
backend/models/Exercise.mjs - Exercise library
backend/models/Set.mjs - Exercise sets
backend/models/WorkoutExercise.mjs - Exercises in workouts
```

#### Session Tracking System
**CRITICAL BUSINESS LOGIC:**
- `WorkoutSession.sessionType` can be `'solo'` or `'trainer-led'`
- Solo workouts do NOT deduct session credits
- Trainer-led workouts require `sessionId` and `sessionDeducted` flag
- See: `SESSION-TRACKING-SYSTEM.md` for full documentation

#### Social & Gamification Models
```
backend/models/UserFollow.mjs
backend/models/Goal.mjs
backend/models/Achievement.mjs
backend/models/UserAchievement.mjs
backend/models/social/SocialPost.mjs
backend/models/social/Friendship.mjs
```

---

## 🧪 Test Data Verification

### Pre-Test Database Checks
Run these queries to verify test data exists:

```sql
-- Check client test user
SELECT id, email, "availableSessions", "totalSessionsAllocated"
FROM "Users"
WHERE email = 'client@test.com';

-- Check sessions for test client
SELECT id, "sessionDate", status, duration, "sessionDeducted"
FROM sessions
WHERE "userId" = 3
ORDER BY "sessionDate" DESC;

-- Check workout sessions
SELECT id, "sessionType", title, "avgRPE", status, "totalWeight"
FROM workout_sessions
WHERE "userId" = 3
ORDER BY "workoutDate" DESC;
```

**Expected Results:**
- Client should have `availableSessions = 12`
- Should have 8 sessions (6 completed, 2 scheduled)
- Should have 12 workout sessions (6 solo, 6 trainer-led)

---

## 📋 Testing Checklist

### Authentication Testing
- [ ] Login with valid credentials (all roles)
- [ ] Login with invalid credentials (should fail gracefully)
- [ ] Logout functionality
- [ ] Token expiration handling
- [ ] Unauthorized access protection (try accessing admin routes as client)

### Client Dashboard Testing
- [ ] View session credits (should show 12 remaining)
- [ ] View upcoming sessions (should show 2)
- [ ] View completed sessions (should show 6)
- [ ] Navigate to Schedule tab
- [ ] Navigate to Workout History tab
- [ ] Navigate to Progress Charts tab
- [ ] All charts render without errors
- [ ] Profile section displays correctly

### Schedule Functionality Testing
- [ ] View calendar with all sessions
- [ ] Filter by status (completed, scheduled, available)
- [ ] Book an available session
  - Verify credits decrement (12 → 11)
  - Verify session appears in "My Sessions"
- [ ] Cancel a session >24 hours away
  - Verify credits refunded (11 → 12)
  - Verify session status changes
- [ ] Try to book session with insufficient credits (test edge case)
- [ ] View session details modal

### Workout Logging Testing
- [ ] Log a solo workout (no session link)
  - Verify credits remain unchanged
  - Verify `sessionType = 'solo'`
  - Verify workout appears in history
- [ ] Log a trainer-led workout (linked to session)
  - Verify `sessionId` is set
  - Verify `sessionType = 'trainer-led'`
  - Verify session credit was deducted
- [ ] View workout history
- [ ] Edit existing workout
- [ ] Delete workout

### Progress Charts Testing
- [ ] NASM Category Radar chart renders
- [ ] One Rep Max chart renders with data
- [ ] Volume Over Time chart renders
- [ ] All charts update when date range changes
- [ ] Export chart functionality (if exists)

### Admin Dashboard Testing
- [ ] View all clients with credits
- [ ] Update client credits manually
- [ ] View all trainers
- [ ] View all sessions
- [ ] Bulk delete sessions
- [ ] Create new exercise in library
- [ ] View analytics/reports
- [ ] Manage contact form submissions

### Exercise Library Testing
- [ ] View exercise library
- [ ] Search/filter exercises
- [ ] Create new exercise (admin only)
- [ ] Edit existing exercise
- [ ] Delete exercise
- [ ] Upload exercise media

### Profile Testing
- [ ] View profile
- [ ] Update profile information
- [ ] Upload profile photo
- [ ] View user statistics
- [ ] View achievements (if exists)
- [ ] View follow stats (if social features enabled)

### Error Handling Testing
- [ ] Submit forms with invalid data
- [ ] Test required field validation
- [ ] Test with network disconnected
- [ ] Test concurrent booking (two users book same session)
- [ ] Test expired session handling
- [ ] Test file upload with invalid file types
- [ ] Test file upload exceeding size limit

### Permission Boundary Testing
- [ ] Client tries to access admin routes (should fail)
- [ ] Client tries to access another user's data (should fail)
- [ ] Trainer tries to access admin-only features (should fail)
- [ ] Unauthenticated user tries to access protected routes (should redirect to login)

---

## 🐛 Bug Reporting Format

When you find issues, document them using this format:

```markdown
### Bug #[Number]: [Brief Description]

**Severity:** Critical | High | Medium | Low

**Location:**
- Frontend: [File path]
- Backend: [File path or API endpoint]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Error Messages:**
```
[Any console errors, API errors, or stack traces]
```

**Screenshots/Evidence:**
[Describe what you observed]

**Suggested Fix:**
[If you can identify the root cause]
```

---

## 📊 Expected API Response Formats

### GET /api/sessions (Client)
```json
{
  "success": true,
  "sessions": [
    {
      "id": 101,
      "sessionDate": "2025-12-15T10:00:00Z",
      "duration": 60,
      "status": "completed",
      "trainerId": 2,
      "userId": 3,
      "sessionDeducted": true,
      "location": "Main Gym - Room A",
      "notes": "Great session!"
    }
  ]
}
```

### GET /api/workout-sessions (Client)
```json
{
  "success": true,
  "data": {
    "workouts": [
      {
        "id": "uuid-here",
        "userId": 3,
        "trainerId": 2,
        "sessionId": 101,
        "sessionType": "trainer-led",
        "title": "Strength Training",
        "avgRPE": 7,
        "status": "completed",
        "totalWeight": 4500,
        "totalReps": 85,
        "totalSets": 15,
        "workoutDate": "2025-12-15T10:00:00Z"
      }
    ],
    "total": 12,
    "hasMore": false
  }
}
```

### PUT /api/admin/clients/:clientId/credits
```json
{
  "success": true,
  "message": "Successfully updated credits for John Doe.",
  "data": {
    "id": 3,
    "name": "John Doe",
    "credits": 15
  }
}
```

---

## 🚀 Testing Environment Setup

### Backend Server
```bash
cd backend
npm install
npm start
# Should be running on http://localhost:10000
```

### Frontend Server
```bash
cd frontend
npm install
npm run dev
# Should be running on http://localhost:5173 (or similar)
```

### Database
- PostgreSQL running on `localhost:5432`
- Database: `swanstudios`
- Ensure test data seeder has been run

---

## 📖 Reference Documentation

### Architecture & System Docs
- `SESSION-TRACKING-SYSTEM.md` - Session credit and workout tracking logic
- `COMPREHENSIVE-TESTING-GUIDE.md` - Detailed 300+ point testing checklist
- `TEST-CREDENTIALS.md` - All test account credentials
- `TESTING-READY-SUMMARY.md` - System status and overview

### Recent Implementation Docs
- `CLIENT-SESSION-HISTORY-IMPLEMENTATION.md` - Session history feature
- `RECHARTS-IMPLEMENTATION-COMPLETE.md` - Progress charts implementation
- `DASHBOARD-AUDIT-SUMMARY.md` - Dashboard audit results

### Known Issues
- `GEMINI-BROKEN-CODE-REPORT.md` - Recent code issues that were fixed
- Check git history for recent fixes

---

## ⚠️ Known Limitations

1. **Stripe Integration:** Not configured in test environment (payments will fail)
2. **Email Services:** Not configured (password reset emails won't send)
3. **SMS Notifications:** Not configured (Twilio not set up)
4. **File Uploads:** Limited to 5MB, certain file types only
5. **"nul" files:** Phantom files exist in codebase - ignore them

---

## 🎯 Success Criteria

Your testing is complete when you have:

1. ✅ Tested all user flows for all 3 roles (client, trainer, admin)
2. ✅ Verified session credit system works correctly
3. ✅ Verified workout logging distinguishes solo vs trainer-led
4. ✅ Tested all clickable elements in dashboards
5. ✅ Identified and documented all bugs found
6. ✅ Tested error handling and edge cases
7. ✅ Verified responsive design on mobile viewport
8. ✅ Checked browser console for errors
9. ✅ Verified network requests succeed
10. ✅ Created comprehensive bug report

---

## 📝 Deliverables Expected

1. **Bug Report Document** - List of all issues found with severity ratings
2. **Feature Gap Analysis** - Missing features that users expect
3. **UX Issues Report** - Confusing UI, poor labeling, broken layouts
4. **Performance Notes** - Slow loading, inefficient queries
5. **Security Concerns** - Any potential vulnerabilities noticed
6. **Recommendations** - Priority fixes and improvements

---

## 🚨 CRITICAL BUSINESS LOGIC TO VERIFY

### Session Credit Deduction Rules
```javascript
// Solo workouts should NEVER deduct credits
if (sessionType === 'solo') {
  // No credit deduction
  // sessionId should be NULL
}

// Trainer-led workouts should deduct ONE credit per session
if (sessionType === 'trainer-led') {
  // Requires sessionId (foreign key)
  // session.sessionDeducted should be true
  // User.availableSessions should decrement by 1
}
```

### Cancellation Policy
```javascript
const hoursUntilSession = (sessionDate - now) / (1000 * 60 * 60);

if (hoursUntilSession > 24) {
  // Refund credit
  user.availableSessions += 1;
} else {
  // No refund - within 24 hour window
  // Credit is lost
}
```

### Session Booking Validation
```javascript
// Cannot book if insufficient credits
if (user.availableSessions <= 0) {
  return error("Insufficient session credits");
}

// Cannot book already booked session
if (session.status !== 'available') {
  return error("Session not available");
}

// Cannot double-book same time slot
// Check for conflicts with user's existing sessions
```

---

## 💡 Testing Tips

1. **Open browser DevTools** - Monitor Network tab and Console
2. **Test in incognito mode** - Avoid cached auth tokens
3. **Use multiple browser tabs** - Test concurrent access
4. **Check database after actions** - Verify state changes persist
5. **Test with slow network** - Use Chrome DevTools throttling
6. **Take screenshots** - Document visual bugs
7. **Note performance** - Flag any slow operations (>3 seconds)

---

## 🎬 Start Testing Here

1. **Login as client@test.com**
2. **Verify you see 12 credits remaining**
3. **Navigate through all dashboard tabs**
4. **Book one available session**
5. **Verify credits decreased to 11**
6. **Log a solo workout**
7. **Verify credits stayed at 11**
8. **Continue with full checklist...**

Good luck! Be thorough, document everything, and help us ship a bug-free product! 🚀
