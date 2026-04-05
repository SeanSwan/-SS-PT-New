# Comprehensive SwanStudios Application Audit — 2026-04-04

## Scope
Full audit of: Onboarding/Claim Flow, Workout Logger, Workout Creator, Client Dashboard, 
User Dashboard, Trainer Dashboard, Bootcamp Creator. Every click handler, API endpoint, 
console error, and dead button identified.

## CRITICAL BUGS (Will crash or block users)

### 1. Rate Limiting DISABLED in Production
- **File:** `backend/controllers/authController.mjs` line 248-252
- **Bug:** `LOGIN_ATTEMPT_LIMIT = 999999` with `TODO: REVERT TO PRODUCTION VALUES`
- **Impact:** Unlimited brute force login attempts possible
- **Fix:** Set to 5 attempts per 15 minutes

### 2. Generated Passwords Fail Strength Validation
- **File:** `backend/controllers/adminClientController.mjs` line 637
- **Bug:** `crypto.randomBytes(12).toString('base64url')` generates `[A-Za-z0-9_-]` only — no special chars
- **Impact:** Admin-created clients may not be able to login if password validator requires special chars
- **Fix:** Append `!` or `#` to generated password

### 3. No Password Change Endpoint
- **Bug:** `forcePasswordChange` field exists on User model but no `POST /api/auth/change-password` endpoint
- **Impact:** Clients who claim their account can't change their password
- **Fix:** Create change-password endpoint

### 4. Board 2 Accordion .trim() Crash
- **File:** `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx` line 247
- **Bug:** `val.trim()` called when `val` could be `null` (not just string)
- **Fix:** `typeof val === 'string' && val.trim().length > 0`

### 5. SessionDetailModal — 5 Dead API Endpoints
- **File:** `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx`
- **Bug:** Calls `/api/sessions/{id}/cancel`, `/feedback`, `/attendance`, `/cancel-warning`, `DELETE /recurring/{groupId}` — NONE exist in backend
- **Backend has:** `/api/training-sessions/` (different path)
- **Impact:** Cancel, feedback, attendance buttons all return 404
- **Fix:** Update frontend paths to match backend routes

### 6. BootcampExercise Interface Missing elbowMod, footMod, hipMod
- **File:** `frontend/src/hooks/useBootcampAPI.ts`
- **Bug:** Interface doesn't include the 3 new mod fields — Board 2 accordion can't access them
- **Fix:** Add `elbowMod`, `footMod`, `hipMod` to BootcampExercise interface

### 7. Delete Exercise indexOf() Bug
- **File:** `ClassPreviewPanel.tsx` line 514
- **Bug:** `bootcamp.exercises.indexOf(ex)` uses reference equality — fails for duplicate exercises
- **Fix:** Use the mapped `exIdx` from the station grouping, not indexOf

## HIGH PRIORITY BUGS (Degraded functionality)

### 8. Claim Code Flow Incomplete
- No password change UI after claiming (EnhancedLoginModal doesn't render change form)
- Email validation on frontend missing (backend has it)
- No error recovery if token expires after verification step

### 9. Workout Plans API Returns 501
- **File:** `backend/routes/workoutRoutes.mjs` line 51
- **Bug:** `GET /api/workout/plans` returns "Not Implemented"
- **Impact:** "My Plans" feature broken in Workout Planner

### 10. Trainer Dashboard — 4 Dead Buttons
- TrainerWorkoutForgePage: "Add Exercise", "AI Generate", "Save Template" all show `toast.info('coming in Phase 3')`
- TrainerVideosPage: Upload button `console.warn('TODO: implement video upload')`

### 11. Trainer Clients & Sessions Pages Are Stubs
- `TrainerClients.tsx` (59 lines) — placeholder banner only
- `TrainerSessions.tsx` (52 lines) — placeholder banner only

### 12. Mock Data in Production
- `MyClientsView.tsx` lines 684-688: `Math.random() * 100` for client progress
- Shows random progress values to trainers

### 13. Victory Charts Show Demo Data
- All Victory charts fall back to `DEMO_DATA` when real data is empty
- Shows "(Preview)" label but may confuse users into thinking it's real

### 14. RegressionLine Shows Wrong Modification
- Shows kneeMod/backMod as "Easier" when easyVariation is null
- Misleading label — should show the correct modification type

### 15. Rewards Claim Button — No Handler
- `RewardsCard.tsx`: Button exists but no onClick handler
- Users can't claim gamification rewards

### 16. Challenges "View All" Button — Dead
- `ChallengesCard.tsx`: Button renders but no onClick handler
- Can't access full challenge list

## MEDIUM PRIORITY (UX Issues)

### 17. personalBests Always 0
- `useClientDashboardData.ts` line 262: `personalBests: 0 // TODO: compute from PR tracking`

### 18. Bootcamp Delete Timing Wrong
- Missing station transition time in calculation (misses 30s per station rotation)

### 19. handleSelectFromRolodex Hardcodes 35s Duration
- Should use `calcWorkInterval()` to match current format

### 20. Silent API Failures
- WorkoutPlannerPage: saved plans fetch fails silently (no toast)
- Multiple trainer pages catch errors and swallow them

### 21. "Coming Soon" Placeholders (5 instances)
- SecuritySections: 3 placeholders
- Session History: "Detailed session history coming soon"
- Progress Analytics: "Detailed progress analytics coming soon"

### 22. Dual Dashboard Implementations
- `RevolutionaryClientDashboard` (legacy) + `EnhancedClientDashboard` (newer)
- Both active, causing confusion about which is the "real" one

## FILES REQUIRING FIXES (Prioritized)

### Tier 1 — Fix Today (Blocking)
1. `backend/controllers/authController.mjs` — Rate limiting
2. `backend/controllers/adminClientController.mjs` — Password generation
3. `frontend/src/hooks/useBootcampAPI.ts` — Add elbowMod/footMod/hipMod to interface
4. `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx` — .trim() crash + indexOf bug
5. `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx` — Fix API paths

### Tier 2 — Fix This Sprint (Degraded)
6. Create `POST /api/auth/change-password` endpoint
7. Create password change UI in login flow
8. Fix Workout Plans API (501 → real implementation)
9. Remove mock data from MyClientsView
10. Wire Rewards claim handler
11. Wire Challenges "View All" handler

### Tier 3 — Polish
12. Remove dead buttons from Trainer Workout Forge
13. Replace "coming soon" with real features or hide
14. Fix Victory chart demo data labeling
15. Add error toasts for silent failures
16. Consolidate dual client dashboard implementations

## ADMIN DASHBOARD OVERVIEW — UX/UI REDESIGN NEEDED (Owner Request)

### Problem Statement (from Sean, the owner):
The admin dashboard overview section with all the widgets is **tacky**. It needs a complete 
refactor. Specific issues:
- **Too many gaps and spaces** between widgets — wasted screen real estate
- **Components not utilizing full available space** — cards are floating with margins instead
  of filling their grid cells
- **Lack of visual unison** — widgets don't feel like they belong together. Inconsistent 
  card heights, padding, typography scale, and border treatments
- **Not premium enough** for the Crystalline Swan aesthetic — looks like a generic admin 
  template, not a $60/month professional platform

### What Needs to Happen:
1. **Tight bento grid layout** — minimize gaps, maximize information density
2. **Consistent card heights** — within each row, cards should be the same height
3. **Full-width utilization** — no dead space on sides or between cards
4. **Unified visual language** — all cards use the same border radius, padding, shadow, 
   glassmorphism treatment
5. **Information hierarchy** — KPI numbers should be the hero, labels secondary
6. **Crystalline Swan premium feel** — subtle glow, glass surfaces, cyan/purple accents, 
   not plain flat cards with white borders
7. **Responsive** — collapses gracefully from 4K (4-5 columns) down to mobile (1 column)

### Files to Refactor:
- `frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx`
- Related widget components in the admin-dashboard directory
- Any shared card/widget styled components

### Design References:
- The Bootcamp Builder's station cards are a good reference for consistent styling
- Victory chart cards should match the same glass treatment
- KPI numbers: large Fira Code font, cyan glow on dark surface

## TOTAL FINDINGS
- **CRITICAL:** 7
- **HIGH:** 9
- **MEDIUM:** 6
- **LOW:** Multiple code quality items

## RESPONSIVE BREAKPOINTS TO TEST (Playwright QA)
After AI Village analysis and fixes, test at these breakpoints:
- 320px (small phone)
- 375px (iPhone SE/mini)
- 390px (iPhone 14)
- 428px (iPhone 14 Pro Max)
- 768px (iPad portrait)
- 1024px (iPad landscape)
- 1280px (laptop)
- 1440px (desktop)
- 1920px (full HD)
- 2560px (QHD)
- 3840px (4K Ultra)
