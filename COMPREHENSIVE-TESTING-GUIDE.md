# Comprehensive Testing Guide - SwanStudios Platform
**Generated:** January 2, 2026
**Purpose:** End-to-end feature testing with realistic test data

---

## 🎯 Test User Credentials

### Test Client (Primary Testing Account)
```
Username: clienttest
Email: client@test.com
Password: [Your test password]
Role: client
User ID: 3
```

**Account Status:**
- ✅ Session Credits: 12 remaining (8 already used)
- ✅ Completed Sessions: 6 trainer-led sessions
- ✅ Upcoming Sessions: 2 scheduled
- ✅ Workout History: 12 total workouts (6 trainer-led + 6 solo)

### Test Trainer
```
Username: trainertest
Email: trainer@test.com
Role: trainer
User ID: 2
```

### Test Admin
```
Username: testadmin
Email: testadmin@test.com
Role: admin
User ID: 1
```

---

## 📊 Test Data Overview

### Session History (clienttest)

#### Completed Trainer-Led Sessions (6)
1. **Dec 4, 2025** - Baseline Strength Assessment
   - Duration: 60 min | RPE: 7/10
   - Volume: 4,500 lbs, 85 reps, 15 sets
   - Status: Completed ✅ | Session Deducted ✅

2. **Dec 7, 2025** - Upper Body Strength - Push
   - Duration: 60 min | RPE: 8/10
   - Volume: 5,200 lbs, 92 reps, 16 sets
   - Status: Completed ✅ | Session Deducted ✅

3. **Dec 11, 2025** - Lower Body - Squats & Deadlifts
   - Duration: 60 min | RPE: 9/10
   - Volume: 6,800 lbs, 78 reps, 14 sets
   - Status: Completed ✅ | Session Deducted ✅

4. **Dec 14, 2025** - Full Body Circuit
   - Duration: 60 min | RPE: 8/10
   - Volume: 4,200 lbs, 120 reps, 20 sets
   - Status: Completed ✅ | Session Deducted ✅

5. **Dec 18, 2025** - Upper Body - Progressive Overload
   - Duration: 60 min | RPE: 9/10
   - Volume: 5,800 lbs, 88 reps, 16 sets
   - Status: Completed ✅ | Session Deducted ✅

6. **Dec 21, 2025** - Lower Body - New PR Day
   - Duration: 60 min | RPE: 9/10
   - Volume: 7,200 lbs, 75 reps, 13 sets
   - Status: Completed ✅ | Session Deducted ✅
   - Notes: "New personal record on squats! 225lbs x 5"

#### Upcoming Scheduled Sessions (2)
7. **Jan 5, 2026** - Upper Body Pull Day
   - Status: Scheduled 📅 | Session NOT Yet Deducted

8. **Jan 8, 2026** - Full Body Functional Training
   - Status: Scheduled 📅 | Session NOT Yet Deducted

### Solo Workouts (6 - NO Session Credits Deducted)

1. **Dec 9, 2025** - Solo Cardio & Core
   - Duration: 45 min | RPE: 6/10
   - Type: Cardio | sessionType: 'solo'
   - Notes: "Treadmill 3 miles, ab circuit"

2. **Dec 13, 2025** - Solo Upper Body Accessory Work
   - Duration: 40 min | RPE: 7/10
   - Volume: 2,800 lbs, 95 reps, 12 sets
   - Type: Solo | sessionType: 'solo'

3. **Dec 16, 2025** - Solo Active Recovery
   - Duration: 30 min | RPE: 4/10
   - Type: Recovery | sessionType: 'solo'

4. **Dec 20, 2025** - Solo Leg Day
   - Duration: 50 min | RPE: 8/10
   - Volume: 5,400 lbs, 82 reps, 14 sets
   - Type: Solo | sessionType: 'solo'

5. **Dec 24, 2025** - Solo HIIT Cardio
   - Duration: 35 min | RPE: 9/10
   - Volume: 200 reps, 15 sets
   - Type: Solo | sessionType: 'solo'

6. **Dec 28, 2025** - Solo Full Body Maintenance
   - Duration: 45 min | RPE: 7/10
   - Volume: 3,600 lbs, 105 reps, 15 sets
   - Type: Solo | sessionType: 'solo'

---

## 🧪 Testing Checklist

### 1. CLIENT DASHBOARD TESTING

#### Login & Navigation
- [ ] Login as `clienttest`
- [ ] Verify dashboard loads without errors
- [ ] Check console for JavaScript errors
- [ ] Verify user role displays correctly

#### Session Credits Display
- [ ] **EXPECTED:** Shows "12 sessions remaining"
- [ ] Verify credits display is accurate
- [ ] Check if purchase credits button is visible
- [ ] Test credits purchase flow (if implemented)

#### Workout History Tab
- [ ] Navigate to workout history
- [ ] **EXPECTED:** See 12 total workouts
- [ ] Verify workouts are sorted by date (newest first)
- [ ] Check that trainer-led and solo workouts are distinguishable
- [ ] Click on individual workout to view details
- [ ] Verify workout stats display correctly (weight, reps, sets, RPE)

#### Analytics/Charts Tab
- [ ] Navigate to analytics/charts section
- [ ] **EXPECTED:** "Workout Type Distribution" chart shows:
   - Solo Workouts: 6 (50%)
   - Trainer Sessions: 6 (50%)
- [ ] Verify chart tooltips show percentages
- [ ] Check other analytics charts (if present):
   - [ ] Body Composition Treemap
   - [ ] Strength Profile Radar
   - [ ] Training Volume Over Time
- [ ] Verify charts are responsive (resize browser)

#### Schedule Tab
- [ ] Navigate to schedule view
- [ ] **EXPECTED:** See 2 upcoming sessions:
   - Jan 5, 2026 - Upper Body Pull Day
   - Jan 8, 2026 - Full Body Functional Training
- [ ] Verify past sessions are visible in calendar
- [ ] Test booking a new session:
   - [ ] Select available trainer
   - [ ] Choose date/time
   - [ ] Confirm session credits deduct properly
- [ ] Test cancelling an upcoming session
- [ ] Verify session status updates correctly

#### Profile Tab
- [ ] Navigate to profile settings
- [ ] Verify user information displays correctly
- [ ] Test updating profile details
- [ ] Check notification preferences
- [ ] Test profile photo upload (if implemented)

---

### 2. ADMIN DASHBOARD TESTING

#### Login as Admin
- [ ] Logout from client account
- [ ] Login as `testadmin`
- [ ] Verify admin dashboard loads

#### Client Management
- [ ] Navigate to client list
- [ ] **EXPECTED:** See `clienttest` in client roster
- [ ] Click on `clienttest` profile
- [ ] Verify client details display:
   - [ ] Session credits: 12 remaining
   - [ ] Total workouts: 12
   - [ ] Upcoming sessions: 2
- [ ] Test editing client information
- [ ] Test assigning/removing session credits

#### Session Management
- [ ] Navigate to session management view
- [ ] **EXPECTED:** See all 8 sessions for clienttest
- [ ] Filter by:
   - [ ] Completed sessions (should show 6)
   - [ ] Upcoming sessions (should show 2)
   - [ ] Client name
   - [ ] Trainer name
- [ ] Click on a completed session
- [ ] Verify session details and notes display
- [ ] Test manually marking session as completed
- [ ] Verify session credit deduction logic

#### Workout Session Review
- [ ] Navigate to workout sessions view
- [ ] **EXPECTED:** See distinction between:
   - Trainer-led sessions (linked to paid sessions)
   - Solo workouts (no session linkage)
- [ ] Filter by sessionType:
   - [ ] trainer-led (should show 6)
   - [ ] solo (should show 6)
- [ ] Verify solo workouts have NO sessionId
- [ ] Verify trainer-led workouts link to Session records

#### Analytics Dashboard (Admin View)
- [ ] Navigate to admin analytics
- [ ] **EXPECTED:** Client activity metrics showing:
   - Total clients active
   - Sessions completed this month
   - Revenue from session packages
- [ ] Test date range filters
- [ ] Verify export functionality (if implemented)

---

### 3. TRAINER DASHBOARD TESTING

#### Login as Trainer
- [ ] Logout from admin account
- [ ] Login as `trainertest`
- [ ] Verify trainer dashboard loads

#### Client Roster
- [ ] Navigate to client list
- [ ] **EXPECTED:** See `clienttest` as assigned client
- [ ] View client progress
- [ ] Check workout history for assigned clients

#### Schedule Management
- [ ] Navigate to trainer schedule
- [ ] **EXPECTED:** See upcoming sessions with clienttest:
   - Jan 5, 2026
   - Jan 8, 2026
- [ ] View past completed sessions (6 total)
- [ ] Test marking session as completed
- [ ] Add session notes after completion

#### Workout Logging
- [ ] Navigate to workout logging interface
- [ ] Log a new trainer-led workout for clienttest
- [ ] **VERIFY:** sessionType automatically set to 'trainer-led'
- [ ] **VERIFY:** sessionId is linked to booked Session
- [ ] **VERIFY:** trainerId is set to your ID (2)
- [ ] Save workout and confirm it appears in history

---

### 4. SESSION CREDIT SYSTEM TESTING

#### Credit Deduction Logic
- [ ] As admin, check clienttest current credits: **12**
- [ ] As trainer, complete one of the scheduled sessions
- [ ] **VERIFY:** Session.sessionDeducted changes to `true`
- [ ] **VERIFY:** Client credits decrease by 1 (now 11)
- [ ] **VERIFY:** WorkoutSession shows sessionType='trainer-led'
- [ ] **VERIFY:** WorkoutSession.sessionId links to completed Session

#### Solo Workout Verification
- [ ] As clienttest, log a new solo workout
- [ ] **VERIFY:** sessionType='solo'
- [ ] **VERIFY:** sessionId is NULL
- [ ] **VERIFY:** trainerId is NULL
- [ ] **VERIFY:** Session credits remain unchanged (still 11)

#### Edge Cases
- [ ] Test booking session with 0 credits remaining
   - [ ] **EXPECTED:** Error or prompt to purchase more credits
- [ ] Test completing session that was already completed
   - [ ] **EXPECTED:** No double-deduction of credits
- [ ] Test cancelling session before completion
   - [ ] **VERIFY:** Credits are NOT deducted

---

### 5. SCHEDULE FUNCTIONALITY TESTING

#### Calendar View
- [ ] Switch between day/week/month views
- [ ] Verify sessions display on correct dates
- [ ] Test drag-and-drop rescheduling (if implemented)
- [ ] Check color coding:
   - [ ] Scheduled sessions
   - [ ] Completed sessions
   - [ ] Cancelled sessions

#### Session Booking Flow
- [ ] As client, book a new session
- [ ] Select trainer from dropdown
- [ ] Choose available time slot
- [ ] Add optional session notes
- [ ] Confirm booking
- [ ] **VERIFY:** Session appears in schedule
- [ ] **VERIFY:** Confirmation email sent (if configured)

#### Trainer Availability
- [ ] As trainer, set availability hours
- [ ] Verify clients only see available time slots
- [ ] Test blocking off unavailable times
- [ ] Check overlap detection

---

### 6. WORKOUT LOGGER TESTING

#### Create New Workout (Client View)
- [ ] Navigate to workout logger
- [ ] Select workout type:
   - [ ] Solo (self-logged)
   - [ ] Trainer-Led (link to session)
- [ ] Add exercises:
   - [ ] Exercise name
   - [ ] Sets, reps, weight
   - [ ] RPE per set
- [ ] Calculate total volume
- [ ] Add overall session notes
- [ ] Save workout
- [ ] **VERIFY:** Workout appears in history
- [ ] **VERIFY:** sessionType is correct

#### Edit Existing Workout
- [ ] Find a completed workout
- [ ] Click edit button
- [ ] Modify workout details
- [ ] Save changes
- [ ] Verify changes persist

---

### 7. ANALYTICS CHARTS TESTING

#### Workout Type Distribution Chart
- [ ] Navigate to analytics page
- [ ] Locate "Workout Type Distribution" chart
- [ ] **VERIFY DATA:**
   - Solo Workouts bar: 6 workouts (50%)
   - Trainer Sessions bar: 6 workouts (50%)
- [ ] Hover over bars to see tooltips
- [ ] Check chart colors:
   - Green (#10b981) for Solo
   - Orange (#f59e0b) for Trainer

#### Other Charts (If Present)
- [ ] Body Composition Treemap
   - [ ] Verify data accuracy
   - [ ] Test hover interactions
- [ ] Strength Profile Radar
   - [ ] Check muscle group distribution
- [ ] Training Volume Chart
   - [ ] Verify weekly/monthly volume trends

#### Responsive Design
- [ ] Resize browser to mobile width (< 768px)
- [ ] Verify charts scale properly
- [ ] Test chart interactions on touch devices

---

### 8. ERROR HANDLING & EDGE CASES

#### Network Errors
- [ ] Disable network (simulate offline mode)
- [ ] Try loading dashboard
- [ ] **EXPECTED:** Graceful error message
- [ ] Enable network and retry

#### Invalid Data
- [ ] Try booking session in the past
   - [ ] **EXPECTED:** Validation error
- [ ] Try logging workout with negative weights
   - [ ] **EXPECTED:** Validation error
- [ ] Try creating session without selecting trainer
   - [ ] **EXPECTED:** Required field error

#### Permission Testing
- [ ] As client, try accessing admin-only routes
   - [ ] **EXPECTED:** 403 Forbidden or redirect
- [ ] As trainer, try editing other trainers' sessions
   - [ ] **EXPECTED:** Permission denied

#### Data Consistency
- [ ] Check session credits calculation:
   - Total purchased: 20 (assumed)
   - Total used: 8 (6 completed + theory)
   - Remaining: 12 ✅
- [ ] Verify workout counts match database
- [ ] Check for duplicate session IDs

---

## 🐛 Issues to Document

As you test, document any issues found in this section:

### Critical Issues
*List any bugs that break core functionality*

1. **Issue:** [Description]
   - **Steps to Reproduce:**
   - **Expected Behavior:**
   - **Actual Behavior:**
   - **Severity:** Critical/High/Medium/Low

### Missing Features
*List any expected features that are not implemented*

1. **Feature:** [Description]
   - **User Story:** As a [role], I want [feature] so that [benefit]
   - **Priority:** Must-Have / Should-Have / Nice-to-Have

### UI/UX Issues
*List any design or usability problems*

1. **Issue:** [Description]
   - **Location:** [Page/Component]
   - **Suggestion:** [How to improve]

---

## 🔍 API Endpoint Testing

### Test These Endpoints (via Browser DevTools Network Tab)

#### Session Usage Analytics
```
GET /api/analytics/:userId/session-usage

Expected Response:
{
  "total": 12,
  "solo": {
    "count": 6,
    "percentage": 50.0
  },
  "trainerLed": {
    "count": 6,
    "percentage": 50.0
  }
}
```

#### User Sessions List
```
GET /api/sessions?userId=3

Expected: 8 sessions (6 completed, 2 scheduled)
```

#### Workout Sessions List
```
GET /api/workout/sessions?userId=3

Expected: 12 workouts
```

#### Workout Sessions by Type
```
GET /api/workout/sessions?userId=3&sessionType=solo
Expected: 6 solo workouts

GET /api/workout/sessions?userId=3&sessionType=trainer-led
Expected: 6 trainer-led workouts
```

---

## 📈 Performance Testing

### Page Load Times
- [ ] Dashboard initial load: < 2 seconds
- [ ] Analytics chart render: < 1 second
- [ ] Workout history load: < 1.5 seconds

### Database Query Performance
- [ ] Check browser DevTools > Network tab
- [ ] Verify API responses < 500ms
- [ ] Look for N+1 query problems

---

## ✅ Testing Completion Checklist

- [ ] All client dashboard tabs tested
- [ ] All admin dashboard features tested
- [ ] Session booking flow tested
- [ ] Session credit deduction verified
- [ ] Solo vs trainer-led distinction working
- [ ] Analytics charts displaying correctly
- [ ] Schedule functionality working
- [ ] All documented issues logged
- [ ] Screenshots/videos captured (if needed)
- [ ] Test results documented

---

## 🎯 Key Testing Outcomes

After completing all tests, answer these questions:

1. **Does the session credit system work correctly?**
   - Solo workouts: NO credits deducted ✅
   - Trainer sessions: Credits deducted properly ✅

2. **Can users distinguish between workout types?**
   - UI clearly shows solo vs trainer-led ✅/❌
   - Analytics chart displays distribution ✅/❌

3. **Are all clickable elements functional?**
   - Buttons work without errors ✅/❌
   - Navigation is intuitive ✅/❌

4. **What critical features are missing?**
   - [List here]

5. **What bugs need immediate fixing?**
   - [List here]

---

## 📝 Next Steps After Testing

1. **Document All Findings** - Use this guide to create detailed bug reports
2. **Prioritize Issues** - Critical bugs first, then features, then UX improvements
3. **Create GitHub Issues** - For tracking and assignment
4. **Update Documentation** - Reflect any discovered behavior
5. **Plan Fixes** - Estimate time for each issue

---

## 🔄 Running Tests Again

To reset test data and rerun tests:

```bash
# Clean up existing test data
cd backend
node -e "const sequelize = require('./database.mjs').default; (async () => { await sequelize.query('DELETE FROM workout_sessions WHERE \"userId\" = 3'); await sequelize.query('DELETE FROM sessions WHERE \"userId\" = 3'); await sequelize.query('UPDATE \"Users\" SET \"availableSessions\" = 0 WHERE id = 3'); console.log('✅ Cleaned up'); await sequelize.close(); })()"

# Re-seed test data
npx sequelize-cli db:seed --seed 20260102000002-comprehensive-test-data.cjs
```

---

**Testing Started:** _____________
**Testing Completed:** _____________
**Tester Name:** _____________
**Overall Status:** ✅ Pass / ⚠️ Pass with Issues / ❌ Fail

