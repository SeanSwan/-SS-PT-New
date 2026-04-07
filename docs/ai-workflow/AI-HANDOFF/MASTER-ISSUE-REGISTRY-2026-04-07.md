# Master Issue Registry — 2026-04-07
## Source: Sean's iPhone XR Field Test + Codex Source Audit + Opus CEO Analysis

**Purpose:** Comprehensive single-source-of-truth for every issue identified during Sean's live iPhone XR testing session on 2026-04-07, cross-referenced with Codex's source-only audit (`LINGERING-ISSUES-AUDIT-2026-04-07.md`) and Opus CEO's triage analysis. Nothing omitted.

**Method:** Sean tested every major section of the production app on an iPhone XR (375px viewport). Console errors were captured. Codex performed a source-only code inspection. Opus categorized, prioritized, and cross-referenced all findings.

**Status Legend:**
- `BROKEN` — Production down, 500 error, crash, or completely non-functional
- `BLOCKED` — Feature exists but user cannot complete the workflow
- `DEGRADED` — Works but poorly (bad UX, unreadable, sticky scroll, etc.)
- `MISSING` — Feature was planned/discussed but never implemented
- `SHALLOW` — Feature exists but is too basic for production use
- `MOCK` — Using fake/demo data instead of real data
- `DESIGN` — Contrast, layout, or visual issue
- `VISION` — Future feature requiring AI Village research and planning

---

## SECTION 1: PRODUCTION BROKEN (500 Errors / Crashes)

### 1.1 Workout Planner Save Fails
- **Status:** BROKEN
- **Error:** `POST /api/workout/plans` → 500 Internal Server Error
- **Console:** `WorkoutPlannerPage.tsx:442 Save failed: AxiosError ERR_BAD_RESPONSE`
- **Impact:** Cannot save any workout plans at all
- **Codex verified:** Still lingering #2 — saved plans are fetched but cards are non-interactive (`cursor: 'default'`), load/copy workflow not present
- **Files:**
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:413` (POST call)
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:442` (error handler)
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:450` (saved plans fetch)
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:1043-1044` (rendered cards)
  - `backend/routes/workoutPlanRoutes.mjs` (POST handler — needs investigation)
- **Sean's full requirement for saved plans:**
  1. Save button must work (currently 500s)
  2. Saved plans go under the client's profile — whichever client is selected
  3. Saved plans displayed as scrollable cards (Rolodex style, not a flat list)
  4. Click a card → opens a modal showing the full saved plan
  5. Modal has "Use This Plan" button → loads it into the main workout page
  6. Modal has "Copy" button → copies plan, user switches to another client, pastes it, saves for that client
  7. When viewing a client, their saved plans should be visible/accessible

### 1.2 Movement Analysis / Assessment Submit Fails
- **Status:** BROKEN
- **Error:** `POST /api/movement-analysis` → 500 Internal Server Error
- **Console:** `TrainerAssessmentsPage.tsx:533 Failed to submit assessment`
- **Impact:** Cannot submit any assessments (postural analysis, performance tests, movement screens)
- **Codex verified:** Still lingering #3 — frontend/backend response shape mismatch
- **Files:**
  - `frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerAssessmentsPage.tsx:450` (expects `res.data.data` or `res.data.assessments`)
  - `frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerAssessmentsPage.tsx:529` (submit handler)
  - `backend/controllers/movementAnalysisController.mjs:187` (returns `data: { analyses, pagination }`)
  - `backend/controllers/movementAnalysisController.mjs:190`
- **Additional Sean notes:**
  - "Invalid value errors" when trying to submit with QA bot tester
  - No way to see recent assessments even though none have been recorded — needs verification that history rendering works
  - Assessments (postural analysis, performance tests, movement screen) should be connected to the AI Hive Mind so the AI knows client issues when creating workouts
  - This is a premium feature — could differentiate the $24.99/mo tier (requires trainer analysis)

### 1.3 Equipment Scan Fails
- **Status:** BROKEN
- **Error:** `POST /api/equipment-profiles/2/scan` → 500 Internal Server Error
- **Console:** Two consecutive 500 errors on scan attempt
- **Impact:** Swan Coach scan feature doesn't work — can't auto-identify equipment from photos
- **Codex verified:** Scan route now fails gracefully when AI key missing (Fixed #4), but the actual scan still fails
- **Files:**
  - `backend/routes/equipmentRoutes.mjs:482` (missing `GOOGLE_API_KEY` check)
  - `backend/routes/equipmentRoutes.mjs:491`
  - `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx:937` (scan trigger)
- **Root cause likely:** `GOOGLE_API_KEY` not set on Render, or the Vision API endpoint configuration is wrong

### 1.4 Content Studio Motion Templates Crash
- **Status:** BROKEN
- **Error:** `RemotionTemplateGallery.tsx:482:51` — styled-components error #12
- **Console:** `Error: An error occurred. See styled-components errors.md#12. Args: nytvr`
- **Impact:** Clicking any Motion Template crashes the page, error boundary catches it, back button sends to Coach Assistant instead of previous page
- **Files:**
  - `frontend/src/components/DashBoard/Pages/content-studio/RemotionTemplateGallery.tsx:482`
- **Additional Sean notes:** When pressing back after error, it doesn't return to Content Studio — goes to Coach Assistant. Should preserve navigation stack even on errors.

### 1.5 Store Packages API Failure
- **Status:** BROKEN (gracefully degraded to fallback)
- **Error:** `StoreV3.tsx:664 Failed to fetch packages from API, using fallback data`
- **Console:** "No packages returned from API"
- **Impact:** Store shows hardcoded fallback package data instead of real database packages
- **Codex verified:** Still lingering #10 — fallback pattern still present
- **Files:**
  - `frontend/src/pages/shop/StoreV3.tsx:641` (API call)
  - `frontend/src/pages/shop/StoreV3.tsx:664` (fallback trigger)
  - `frontend/src/pages/shop/StoreV3.tsx:667` (hardcoded data used)
  - `backend/routes/storeFrontRoutes.mjs` (GET handler — needs investigation)

### 1.6 Sessions Upcoming/History 404s
- **Status:** BROKEN → Codex says FIXED in source
- **Error:** Multiple `GET /api/sessions/upcoming/:id` and `/history/:id` → 404
- **Console:** 14+ 404 errors across various user IDs (89, 35, 91, 61, 57, 84, 90)
- **Codex verified:** Fixed #2 — routes now exist at `sessions.mjs:366` and `sessions.mjs:421`
- **Needs:** Production deployment verification — source fix may not be deployed yet
- **Files:**
  - `backend/routes/sessions.mjs:366` (upcoming)
  - `backend/routes/sessions.mjs:404`
  - `backend/routes/sessions.mjs:421` (history)
  - `backend/routes/sessions.mjs:458`

---

## SECTION 2: MOBILE UX BLOCKERS (iPhone XR — 375px)

### 2.1 Workout Planner — No + Button, Auto-Add on Click
- **Status:** BLOCKED
- **Device:** iPhone XR
- **Problem:** On desktop, exercises are added by double-clicking. On mobile, there's no visible + button to add exercises. The auto-add on click/double-click is not intuitive.
- **Codex verified:** Still lingering #1 — "no clear visible + button pattern like the boot camp rolodex has"
- **Sean's requirement:** Should have a visible + button per exercise (like the Bootcamp Creator already has)
- **Files:**
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:716` (click handler)
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:721`
- **Note:** The Bootcamp Creator's `ExerciseRolodexPanel.tsx` already has this pattern — should be copied to the Workout Planner

### 2.2 Workout Planner — Exercise Names Disappear on Mobile
- **Status:** DEGRADED
- **Device:** iPhone XR
- **Problem:** On mobile, the exercise name disappears from the workout builder. Only shows sets, reps, tempo, rest, and the exercise number (1, 2, 3...). Cannot tell which exercise is which.
- **Codex noted:** "Exercise names now render" — but Sean still sees this issue, suggesting the fix may not be deployed or there's a conditional rendering issue at 375px
- **Files:**
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` (exercise card rendering)

### 2.3 Exercise Rolodex Not Contained — Fills Entire Page
- **Status:** DEGRADED
- **Device:** iPhone XR
- **Problem:** The exercise list shows all ~100+ exercises in a full-height panel. On a small phone screen, scrolling through all of them takes forever and pushes the workout builder out of view.
- **Codex verified:** Still lingering #1 — "still a full panel with `overflow-y: auto`, not the tighter 5-7-item rolodex"
- **Sean's requirement:**
  1. Show 5-7 exercises visible at a time in a contained box (like a real Rolodex)
  2. Scrolling within that box reveals more exercises — top ones disappear, bottom ones appear
  3. The box has a fixed height so the rest of the page (workout builder, teach mode) is visible
  4. This same Rolodex pattern should be used everywhere exercises are listed:
     - Workout Planner
     - Bootcamp Creator (already partially done per Codex)
     - Content Studio Coverage Tracker
     - Bootcamp Manual Mode
- **Files:**
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts:222`
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts:268`

### 2.4 Sidebar Doesn't Auto-Close After Tab Selection
- **Status:** Codex says FIXED — needs device verification
- **Problem:** When clicking a tab in the sidebar (e.g., Coach Assistant), the sidebar stays open. Have to tap the main content area to dismiss it.
- **Codex verified:** Fixed #1 — nav items now close drawer on mobile
- **Files:**
  - `frontend/src/components/DashBoard/MenuList/NavItem/nav-item.tsx:141`
  - `frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx:539`
- **Needs:** iPhone XR live verification

### 2.5 Bootcamp Creator Sticky Scroll
- **Status:** DEGRADED
- **Device:** iPhone XR
- **Problem:** Scroll gets stuck or is very slow when scrolling through the Bootcamp Creator. Could be performance-related on weaker phones.
- **Codex:** Flagged as "needs live QA"
- **Sean's note:** "My phone could be weak so we need to make sure we can utilize this app on weaker phones as well"
- **Possible causes:** Heavy animations, backdrop-filter, too many DOM elements, no virtualization

### 2.6 Client Progress Dashboard Smashed on Mobile
- **Status:** DEGRADED
- **Device:** iPhone XR
- **Problem:** When turning on overview, everything is smashed up / overlapping in mobile mode
- **Codex:** Not audited
- **Files:** Need investigation — likely in `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx` or related

### 2.7 Pain Charts — Sticky Scroll + Missing from Admin Dashboard
- **Status:** DEGRADED + MISSING
- **Device:** iPhone XR
- **Problem:** 
  1. Scroll is sticky — doesn't scroll smoothly up and down
  2. Pain Charts tab is not in the Admin dashboard sidebar — only in Trainer dashboard
- **Sean's requirement:** Admin (who is also a trainer) needs access to Pain Charts from the admin dashboard
- **Files:**
  - `frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx` (missing Pain Charts nav item)
  - Body Map component needs mobile scroll investigation

### 2.8 Find a Trainer — Clipped on Mobile
- **Status:** DEGRADED
- **Device:** iPhone XR
- **Problem:** When clicking "Find a Trainer" on the Hero dashboard, a third of the screen is cut off and the top is never visible
- **Codex:** Flagged as "needs live QA"

### 2.9 Store Membership — No Back Button, Stuck
- **Status:** BLOCKED
- **Device:** iPhone XR
- **Problem:** After choosing a membership tier, there's no way to go back. Stuck on that page.
- **Codex:** Flagged as "needs live QA"
- **Sean's additional notes on pricing:**
  - Two tiers are giving basically the same thing — needs differentiation
  - Wants more generous trial to get people locked in
  - Wants competitive research + AI Village 14-brain planning for tier structure

### 2.10 My Profile Section — Terrible on Mobile
- **Status:** DEGRADED
- **Device:** iPhone XR
- **Problem:** 
  - Layout looks terrible on mobile
  - Email/push notification toggle sliders are ugly
  - Workout calendar and other sections have mock data — needs reset to real data
  - Companion (Frost SW) text is extremely small, unreadable
- **Sean's requirement for Companion:** Should be clickable → opens its own modal where things are readable

### 2.11 Swan Studios Workout Builder Breaks Layout
- **Status:** DEGRADED
- **Device:** iPhone XR (within Bootcamp Creator page)
- **Problem:** When opening the Swan Studios Workout Builder at the bottom of the Bootcamp page, it messes up all columns above it. Content gets cut off to the right, not pixel-perfect.

### 2.12 Equipment Manager — No Back Navigation, No Camera Upload
- **Status:** BLOCKED
- **Device:** iPhone XR
- **Problem:**
  1. No way to exit and go back to the previous screen after creating a location
  2. Camera doesn't open for photo upload
  3. Pictures don't save
  4. No default locations (should have: Move Fitness, Home, Gym pre-made)
  5. Can't add to default locations — locked out
  6. Manual add has no image upload option
- **Codex verified:** Still lingering #8 — back button and camera capture exist now but:
  - Manual add modal still has no image upload
  - Default locations are generic (`Gym`, `Park/Outdoor`, `Home Gym`) not the exact ones Sean wanted (`Move Fitness`)
  - No batch-first workflow (take 15 photos, then classify each)
  - No AI-first auto-fill pipeline
- **Sean's full workflow vision:**
  1. Go to gym → take pictures of all equipment first (batch)
  2. Upload all pictures at once
  3. For each picture, Swan Coach AI scans it and auto-fills: name, category, resistance type
  4. User reviews and edits AI's suggestions
  5. Save permanently
  6. Manual fill-out is secondary fallback only
  7. Full CRUD: create, read, update, delete
- **Files:**
  - `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx:753-937`

### 2.13 Tabs Not Horizontally Scrollable
- **Status:** Codex says FIXED — needs device verification
- **Problem:** Content Studio, Marketing, and other tab rows were stuck on mobile — couldn't swipe to see additional tabs
- **Codex verified:** Fixed #5 — tab rows are now horizontally scrollable
- **Files:**
  - `frontend/src/components/DashBoard/Pages/content-studio/ContentStudioHub.styles.ts:122`
  - `frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx:100`
  - `frontend/src/components/DashBoard/workspaces/SecurityWorkspace.tsx:94`
- **Needs:** iPhone XR live verification

---

## SECTION 3: AI / VOICE / COACH ISSUES

### 3.1 Read Button Doesn't Work
- **Status:** BROKEN
- **Device:** iPhone XR
- **Problem:** In Coach Assistant, sent a message asking for a workout for a 65-year-old client with a busted knee. AI gave the workout, but clicking the Read button doesn't read the text aloud.
- **Codex:** Flagged as "needs live QA" — code paths exist but need device/browser permission verification on iPhone XR / Safari
- **Files:**
  - `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx:202`
  - `frontend/src/components/Shared/CrystallineVoicePill.tsx:317`

### 3.2 TTS Truncates to ~3 Sentences
- **Status:** DEGRADED (by design)
- **Problem:** Coach reads partial text then says "check the rest of the details in the terminal"
- **Codex verified:** Still lingering #7 — `useTextToSpeech.ts:145` intentionally truncates to first 3 sentences
- **Sean's question:** "Does this cost a lot more tokens or what is the issue?"
- **Answer:** TTS cost scales with character count. Reading a full workout plan (500+ words) costs more than 3 sentences. This was a deliberate cost-saving measure. Options:
  1. Remove the cap (higher cost per read)
  2. Increase to 10 sentences
  3. Add a "Read More" button that continues reading the rest
- **Files:**
  - `frontend/src/hooks/useTextToSpeech.ts:145`
  - `frontend/src/hooks/useTextToSpeech.ts:149`

### 3.3 Voice Sounds Robotic
- **Status:** DEGRADED
- **Problem:** The TTS voice doesn't sound natural. Sean expected voice selection options.
- **Sean's question:** "I thought we were able to choose which voices that we wanted"
- **Needs:** Investigation into which TTS provider is being used (Web Speech API vs ElevenLabs vs other) and whether voice selection is implemented

### 3.4 Microphone Doesn't Work
- **Status:** BROKEN
- **Device:** iPhone XR
- **Problem:** Microphone button in multiple locations doesn't work:
  - Swan Studios Workout Builder (Bootcamp page bottom)
  - Coach Assistant
- **Codex:** Flagged as "needs live QA"
- **Possible causes:** Safari microphone permissions, MediaRecorder API compatibility, missing HTTPS requirement
- **Files:**
  - `frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx:121`

### 3.5 Raw HTML Tags Visible in AI Responses
- **Status:** DEGRADED
- **Problem:** AI responses show raw HTML tags like `<strong>`, `<h1>`, `<u>` as text instead of rendering them. Tags are visible but not functioning.
- **Needs:** All AI terminals should render markdown/HTML properly — likely missing a markdown renderer or dangerouslySetInnerHTML with sanitization

### 3.6 AI Terminals Not Unified
- **Status:** DEGRADED
- **Problem:** Multiple different AI terminal implementations across the app. They look different, behave differently, and have different capabilities.
- **Sean's requirement:** ALL AI terminals should be normalized to match the Coach Assistant terminal. One unified terminal system.
- **Codex verified:** Still lingering #6 — multiple AI terminal surfaces still exist
- **Files:**
  - `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx:341`
  - `frontend/src/components/Shared/AITerminalPanel.tsx:141`
  - `frontend/src/components/Shared/AIPersistentPanel/AIPersistentPanel.tsx:12`

### 3.7 AI Terminal Z-Index / Can't Exit
- **Status:** BLOCKED
- **Device:** iPhone XR
- **Problem:** When using the AI terminal (Swan Studios Coach), the previous conversation gets stuck behind it and can't be accessed. No easy way to exit. Need to make sure:
  1. Z-index is correct — terminal is always on top
  2. Terminal has a clearly visible exit button
  3. Can always get back to the previous page

### 3.8 Coach Assistant Action Buttons Wasting Space
- **Status:** DEGRADED
- **Problem:** The action buttons at the top of Coach Assistant (Coach Workouts, Log Meal, etc.) are unnecessary since the coach handles all these through conversation. They take up valuable screen space on mobile.
- **Codex verified:** Still lingering #6 — response style selector and voice settings bar still present
- **Sean's requirement:** Remove or collapse these buttons on mobile — the space is needed for the actual conversation
- **Files:**
  - `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx:346`

### 3.9 Select Dropdown Not Working in Coach
- **Status:** BROKEN
- **Device:** iPhone XR
- **Problem:** The select dropdown in the Coach Assistant page is not functional
- **Needs:** Investigation — could be a mobile touch event issue

---

## SECTION 4: MISSING FUNCTIONALITY / ROUTING ISSUES

### 4.1 Bootcamp Creator — Joint-Friendly Alternatives Duplicate Main Board
- **Status:** MISSING (partially implemented wrong)
- **Problem:** The section that should show alternate exercises (joint-friendly for wrist, back, elbows, ankles, feet, kneecaps, shoulders) is just duplicating the main board's exercises with modification accordions.
- **Codex verified:** Still lingering #4 — Board 2 is "same exercises as Board 1 with modification options"
- **Sean's requirement:** Should use the backend system that was built for joint/body-part specific alternatives. If a client has knee issues, show exercises that avoid knee stress — completely different exercises, not the same ones with modifications.
- **Files:**
  - `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx:242`
  - `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx:407`
  - `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx:431`

### 4.2 Bootcamp Creator — No Template Browser
- **Status:** MISSING
- **Problem:** Can save a template, but there's nowhere to browse/view/load saved templates
- **Codex verified:** Still lingering #5 — save exists, but no companion template browser/list/reload flow
- **Files:**
  - `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx:270`

### 4.3 Sprint Planner — Routes to Wrong Dashboard
- **Status:** BROKEN (routing)
- **Problem:** In Trainer dashboard, clicking Sprint Planner takes user to Swan Studios Coach Chat page AND switches them to the Admin dashboard. Should stay in Trainer dashboard.
- **Codex verified:** Still lingering #11 — routes through shared `/dashboard/workouts/...` workspace structure
- **Files:**
  - `frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerStellarSidebar.tsx:458`
  - `frontend/src/components/DashBoard/workspaces/WorkoutsWorkspace.tsx:37`

### 4.4 Messages — No User Dropdown / Search
- **Status:** DEGRADED → Codex says IMPROVED
- **Problem:** When creating a message, there's no dropdown of available clients/trainers/users. Just a free-text name field.
- **Codex verified:** Fixed #7 — messaging now has searchable user lookup
- **Needs:** iPhone XR live verification
- **Files:**
  - `backend/routes/messagingRoutes.mjs:42`
  - `backend/controllers/messagingController.mjs:365`
  - `frontend/src/components/Messaging/NewConversationModal.tsx:62`
- **Sean's additional requirement:** Admin (Sean Swan) should be findable and messageable by everyone regardless of permissions

### 4.5 User Dashboard Social Search Not Wired
- **Status:** MISSING
- **Problem:** Sean knows the search/social code was created but it's not connected or routed. Can't search who's online, can't find other users even as admin.
- **Needs:** Code audit to find unrouted social/search components

### 4.6 Schedule — No 30-Min or 45-Min Slots
- **Status:** MISSING
- **Problem:** Can only book 1-hour sessions. Need 30-minute and 45-minute options.
- **Files:**
  - Schedule configuration — needs investigation

### 4.7 Schedule — No Name/Avatar Showing Whose Schedule
- **Status:** DEGRADED
- **Problem:** Schedule just says "My Schedule" with no indication of whose schedule is displayed. Should show:
  1. User's name
  2. Profile picture (same small bubble as in the header)
  3. For "All Trainers" dropdown — name and avatar at the top
- **Codex verified:** Still lingering #9 — header still says "Universal Master Schedule" with scope toggles but no explicit identity
- **Files:**
  - `frontend/src/components/UniversalMasterSchedule/components/ScheduleHeader.tsx:93-129`

### 4.8 Homepage V5 Preview — DELETE
- **Status:** DEAD CODE
- **Problem:** Still in admin sidebar. Uses mock data. Is completely unused and should be deleted.
- **Sean's instruction:** "Can just be completely deleted. Dead code. Trying to use mock data."

### 4.9 Admin Dashboard Missing Tabs
- **Status:** MISSING
- **Problem:** Several tabs available in Trainer dashboard are missing from Admin dashboard:
  1. Pain Charts (Body Map) — admin as trainer needs this
  2. Equipment Profiles — admin should have this
  3. Nutrition Intelligence — available in Trainer and Client dashboards but NOT Admin
  4. Messages — not clearly in admin sidebar
- **Sean's note:** As admin/trainer, he should have access to everything trainers and clients have

### 4.10 Admin "My Training" Routes to Client Mode
- **Status:** DEGRADED
- **Problem:** When admin clicks "My Training", it switches them to client role instead of showing client tabs within the admin account context.
- **Sean's requirement:** Admin should see all client dashboard tabs but remain connected to their admin account (Sean Swan). Should not role-switch.

### 4.11 Trainer Workout Intelligence — Should Merge with Workout Planner
- **Status:** REDUNDANT
- **Problem:** Trainer dashboard has "Workout Intelligence" which is basically another workout planner with client dropdown and phase selection. Meanwhile the main Workout Planner (NASM Rolodex) exists separately.
- **Sean's requirement:** Take the best features from both and merge into one unified workout tab. Eliminate redundancy.

### 4.12 Content Studio Coverage Tracker — Needs Rolodex
- **Status:** DEGRADED
- **Problem:** Shows all exercises without video coverage but displays them in a long list. Should use the same 7-item Rolodex pattern.
- **Sean's requirement:**
  1. 7 exercises visible at a time, scrollable container
  2. + button per exercise → opens upload dialog for video
  3. Uploaded video fills the "no video" gap
  4. Should show only one status (not "catalog video" vs "legacy video" — there's no legacy, all fresh)
  5. Should be able to add new exercises that aren't in the list
  6. Every exercise should be CRUD editable
  7. Teach Me section should be editable too

---

## SECTION 5: DESIGN / CONTRAST ISSUES

### 5.1 Form Assessments — Blue Contrast Terrible
- **Status:** DESIGN
- **Problem:** Form assessment tab colors are still blue — terrible contrast on default theme. Cannot read content.
- **Applies to:** Postural analysis, performance tests, movement screen sections

### 5.2 Bootcamp Creator Class Preview — Blue on Light Blue
- **Status:** DESIGN
- **Problem:** Class preview text is blue on light blue background. Completely unreadable.
- **Sean's quote:** "I can't even read it at all to be honest with you"

### 5.3 Marketing Tabs — Bad Contrast on Default Theme
- **Status:** DESIGN
- **Problem:** Keyword research and other marketing sub-tabs have poor color contrast
- **Applies to:** SEO Audit, Keyword Research, Blog Writer

### 5.4 Email Digest — Terrible Contrast
- **Status:** DESIGN
- **Problem:** Email digest section has terrible contrast on default theme

### 5.5 Security Alerts — Confirm Real vs Mock Data
- **Status:** MOCK + DESIGN
- **Problem:** Security alerts look scary (showing active attacks) but it's all mock/demo data. Sean needs to know what's real.
- **Codex verified:** Still lingering #13 — alerts feed and vulnerability scanner are demo-backed
- **Sean's requirement:** NO mock data anywhere. All real data only. If there's no real data yet, show empty state with explanation.
- **Files:**
  - `frontend/src/components/DashBoard/workspaces/security/SecurityAlertsFeed.tsx:34`
  - `frontend/src/components/DashBoard/workspaces/security/VulnerabilityScannerPanel.tsx:22`

### 5.6 All Themes Need Contrast Audit
- **Status:** DESIGN
- **Problem:** Multiple sections have contrast issues on the default theme. Need a comprehensive contrast audit across ALL themes to ensure WCAG 4.5:1 minimum everywhere.

---

## SECTION 6: AI VILLAGE PLANNING REQUIRED (Vision Items)

These items require AI Village 14-brain deep research and multi-round debate before implementation.

### 6.1 Subscription Tier Restructuring
- **Scope:** Full competitive research + tier differentiation
- **Sean's notes:**
  - Current two tiers give basically the same thing
  - Wants more generous trial/free tier to get people locked in
  - Needs competitive analysis of PT app pricing
  - Premium tier ($24.99/mo) should include trainer-analyzed assessments (movement screen, postural analysis)
  - AI Village 14-brain planning requested
- **Debate rounds:** 20 allowed

### 6.2 Gamification / Avatar System — Sims-Like Vision
- **Scope:** Massive feature — 3D environment, companion pets, virtual Olympics
- **Sean's full vision:**
  1. Create your own avatar that looks like you (character creator)
  2. Avatar lives in a Sims-like 3D environment (a "little house")
  3. Companion pet lives with avatar
  4. As user progresses (workouts, posts, activity), avatar and companion level up
  5. Rewards: better bed, bigger refrigerator, better food for companion, clothes/accessories
  6. Levels 1 to 1,000,000 — each level substantial
  7. Badges give ability point boosts in different areas
  8. Active users who complete badge requirements beat inactive high-level users
  9. Virtual Olympics: avatars compete in track & field, pull-ups, push-ups, exercises
  10. Unranked games (open) and competitive games (level-based matchmaking)
  11. Companion has its own module with feeding, care, happiness
- **Reference:** Existing gamification docs need enhancement
- **AI Village debate:** 20 rounds allowed

### 6.3 Badge Creator — MidLibrary.io Integration
- **Scope:** Comprehensive style library for badge/icon creation
- **Sean's requirements:**
  1. Integrate styles from https://midlibrary.io/art-styles
  2. Should be more like MidJourney — see pictures being created
  3. Create custom icons for ALL app tabs (workout, bootcamp, etc.)
  4. Create avatar icons (flame, etc.) for virtual pets
  5. Save created icons → update app icons one by one
  6. More visual, more comprehensive than current preset-only model
- **Codex noted:** Still lingering #14 — limited preset model
- **AI Village research required**

### 6.4 Social Media Publishing — Platform API Integration
- **Scope:** Connect to real social media APIs
- **Sean's platforms:** Instagram, Facebook, BlueSky, TikTok, Nextdoor, YouTube
- **NOT wanted:** Twitter/X (Sean doesn't use it)
- **Requirements:**
  1. Connect actual accounts via OAuth/API
  2. Post directly from the app to all platforms
  3. Never need to open those websites
  4. YouTube integration exists (API key set up) — use for video uploads that build YouTube traffic
- **Codex verified:** Still lingering #12 — only models instagram, facebook, x. No BlueSky, TikTok, Nextdoor, YouTube
- **AI Village research required** for API integration feasibility

### 6.5 Nutrition Intelligence — Barcode Scanner + Food Rating System
- **Scope:** Comprehensive nutrition overhaul
- **Sean's requirements:**
  1. Barcode scanner to scan food items
  2. Food rating system 1-100 (100 = excellent, 1 = terrible chemicals)
  3. Color-coded ingredient list (green = good, red = bad)
  4. Research existing food apps for competitive features
  5. Build upon current basic implementation
- **AI Village research required**

### 6.6 Content Studio Comprehensive Overhaul
- **Scope:** Major refactor of Content Studio
- **Issues:**
  1. Voice Studio tab grayed out — needs API setup investigation
  2. AI Video tab grayed out — needs API setup investigation
  3. Distribution tab grayed out — needs API setup
  4. Settings tab too shallow — needs more enterprise options
  5. Blog Writer is basic — needs AI Village research for comprehensive version
  6. Social Post Composer is weak — not comprehensive
  7. Duplicate functionality with Marketing tab (Blog Writer, Social Poster exist in both)
- **Sean's suggestion:** Merge Marketing tab content INTO Content Studio under a Marketing section. Eliminate the separate Marketing tab entirely.
- **AI Village research required**

### 6.7 Calendar System Overhaul
- **Scope:** Calendar + Universal Master Schedule unification
- **Sean's requirements:**
  1. Calendar needs 24-hour support (currently capped 5 AM - 10 PM)
  2. Default display: 5 AM - 10 PM. Off-hours available for filming/content creation.
  3. Calendar should sync bidirectionally with Universal Master Schedule
  4. Calendar items visible only to admin (admin-only section)
  5. Clients and trainers cannot see admin calendar items
  6. AI suggestions in calendar should be Swan Studios Coach connected to Hive Mind
- **AI Village planning needed**

### 6.8 Teach Me Mode — Every Tab
- **Scope:** App-wide feature
- **Sean's requirement:** EVERY single tab across the entire app should have a "Teach Me" mode that:
  1. Explains what every element is
  2. Explains what every category means
  3. Breaks down all information so user can understand it
  4. Helps distinguish real data from mock data
  5. Especially critical in Security tab
- **AI Village planning needed**

### 6.9 Client Dashboard Consolidation
- **Scope:** UX restructure
- **Sean's requirements:**
  1. Overview should be widget-based with the most important charts, latest workouts, etc.
  2. Community & Challenges content should move INTO the Overview as widgets
  3. My Progress content should merge into Overview widgets
  4. Companion should have its own modal/module (not inline)
  5. Book Session, View Progress, Log Workout in current overview are redundant with dedicated tabs
  6. Fitness/Creative/Community sub-tabs don't add value — consolidate

### 6.10 Video Chat / WebRTC for Remote Assessments
- **Scope:** New feature
- **Sean's requirement:** Need web chat capability for remote movement screens, posture analysis, and performance tests. Minimum viable way to do assessments without in-person visits.
- **Business tie-in:** This differentiates the $24.99/mo premium tier

### 6.11 Playwright QA Comprehensive Test Suite
- **Scope:** Test infrastructure
- **Sean's requirement:** EVERY issue described in this document needs a corresponding Playwright test that:
  1. Checks the issue is fixed
  2. Smoke tests the feature
  3. Runs on every deploy
  4. Tests on 375px (iPhone XR) viewport minimum

---

## SECTION 7: CONSOLE ERRORS (Raw Capture)

```
RemotionTemplateGallery.tsx:482:51 — styled-components error #12 (Args: nytvr)
POST /api/movement-analysis → 500
POST /api/equipment-profiles/2/scan → 500 (×2)
StoreV3.tsx:664 — Failed to fetch packages, using fallback
GET /api/sessions/upcoming/:id → 404 (×7 user IDs)
GET /api/sessions/history/:id → 404 (×7 user IDs)
POST /api/workout/plans → 500
WorkoutPlannerPage.tsx:442 — Save failed: AxiosError ERR_BAD_RESPONSE
```

---

## SECTION 8: CODEX AUDIT CROSS-REFERENCE

### Confirmed Fixed by Codex (need device verification):
1. Sidebar auto-close on mobile navigation
2. Sessions upcoming/history endpoints (404 → exist now)
3. API canceled-request console noise
4. Equipment scan missing-key failure mode (graceful fail)
5. Content/Marketing/Security tab rows horizontally scrollable
6. Bootcamp manual add + button and contained Rolodex
7. Messaging user search infrastructure

### Confirmed Still Lingering by Codex:
1. Workout planner add UX / Rolodex not contained
2. Saved plans not loadable/copyable
3. Trainer assessment history shape mismatch
4. Bootcamp joint-friendly alternatives = duplicate
5. Bootcamp template browsing missing
6. Coach controls wasting space / terminals not unified
7. TTS truncates to 3 sentences
8. Equipment workflow partial
9. Schedule no identity context
10. Store fallback data
11. Sprint Planner routing
12. Content Studio distribution/social shallow
13. Security workspace mock data
14. Badge creator shallow

### Not Covered by Codex (Sean-only reports):
1. Microphone not working (iPhone XR)
2. Voice sounds robotic / no voice selection
3. Raw HTML tags in AI responses
4. AI terminal z-index / can't exit
5. Bootcamp sticky scroll on iPhone
6. Client Progress dashboard smashed on mobile
7. Pain Charts sticky scroll + missing from admin
8. Find a Trainer clipped on mobile
9. Store membership stuck, no back button
10. My Profile terrible on mobile
11. Companion text too small
12. Workout Builder breaks columns
13. 30/45 min scheduling slots
14. Calendar weak / no 24hr / no UMS sync
15. Homepage V5 Preview (delete)
16. User Dashboard social search not wired
17. Admin missing tabs
18. Admin "My Training" role-switch issue
19. Trainer Workout Intelligence redundancy
20. Content Studio Coverage Tracker needs Rolodex
21. Content Studio Voice/AI Video grayed out
22. Contrast issues (4+ tabs)
23. Select dropdown not working in Coach
24. Content Studio Motion Template back-navigation
25. Marketing/Content Studio duplicate functionality
26. All themes contrast audit needed

---

## SECTION 9: PRIORITY MATRIX

### Tier 1 — Production Broken (Fix First)
| # | Issue | Effort |
|---|-------|--------|
| 1.1 | Workout Planner save 500 | Backend investigation |
| 1.2 | Movement Analysis submit 500 + shape mismatch | Backend + frontend fix |
| 1.3 | Equipment scan 500 | API key config |
| 1.4 | Remotion template crash | Styled-components fix |
| 1.5 | Store packages fallback | Backend/DB investigation |
| 1.6 | Sessions 404 | Verify deployment |

### Tier 2 — Mobile UX Blockers (Sean's Primary Device)
| # | Issue | Effort |
|---|-------|--------|
| 2.1 | Workout Planner no + button | Frontend — copy Bootcamp pattern |
| 2.2 | Exercise names disappear on mobile | Frontend — CSS/rendering |
| 2.3 | Exercise Rolodex not contained | Frontend — virtualized scroll component |
| 2.9 | Store membership stuck | Frontend — add back navigation |
| 2.12 | Equipment Manager incomplete | Frontend + backend |
| 3.1 | Read button doesn't work | TTS/Safari investigation |
| 3.4 | Microphone doesn't work | Safari permissions investigation |
| 3.5 | Raw HTML tags in AI responses | Markdown renderer |
| 3.7 | AI terminal z-index / exit | CSS z-index + UI |

### Tier 3 — Feature Completion
| # | Issue | Effort |
|---|-------|--------|
| 4.1 | Joint-friendly alternatives | Backend exercise system |
| 4.3 | Sprint Planner routing | Routing fix |
| 4.6 | 30/45 min schedule slots | Schedule config |
| 4.7 | Schedule identity (name/avatar) | Frontend UI |
| 4.8 | Delete Homepage V5 | Cleanup |
| 4.9 | Admin missing tabs | Sidebar config |
| 4.11 | Merge Workout Intelligence + Planner | Major refactor |

### Tier 4 — Design / Contrast
| # | Issue | Effort |
|---|-------|--------|
| 5.1-5.6 | All contrast issues | Theme audit |

### Tier 5 — AI Village Planning (Research First, Build Later)
| # | Issue | Rounds |
|---|-------|--------|
| 6.1 | Subscription tiers | 20 rounds |
| 6.2 | Gamification/Avatar Sims | 20 rounds |
| 6.3 | Badge Creator + MidLibrary | Research |
| 6.4 | Social media API integration | Research |
| 6.5 | Nutrition barcode scanner | Research |
| 6.6 | Content Studio overhaul | Research |
| 6.7 | Calendar system overhaul | Research |
| 6.8 | Teach Me mode | Research |
| 6.9 | Client dashboard consolidation | Research |
| 6.10 | Video chat / WebRTC | Research |
| 6.11 | Playwright QA suite | After all fixes |

---

## SECTION 10: FILE INDEX

All files referenced in this document:

### Frontend
```
frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx
frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStyles.ts
frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerAssessmentsPage.tsx
frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerStellarSidebar.tsx
frontend/src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.tsx
frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx
frontend/src/components/DashBoard/Pages/coach-assistant/CoachInputBar.tsx
frontend/src/components/DashBoard/Pages/content-studio/RemotionTemplateGallery.tsx
frontend/src/components/DashBoard/Pages/content-studio/ContentStudioHub.styles.ts
frontend/src/components/DashBoard/Pages/content-studio/DistributionHubPanel.tsx
frontend/src/components/DashBoard/Pages/content-studio/SocialDistributionPanel.tsx
frontend/src/components/DashBoard/Pages/content-studio/NanoBananaBadgeCreator.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx
frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx
frontend/src/components/DashBoard/workspaces/SecurityWorkspace.tsx
frontend/src/components/DashBoard/workspaces/WorkoutsWorkspace.tsx
frontend/src/components/DashBoard/workspaces/security/SecurityAlertsFeed.tsx
frontend/src/components/DashBoard/workspaces/security/VulnerabilityScannerPanel.tsx
frontend/src/components/DashBoard/MenuList/NavItem/nav-item.tsx
frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx
frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx
frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx
frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx
frontend/src/components/UniversalMasterSchedule/components/ScheduleHeader.tsx
frontend/src/components/Messaging/NewConversationModal.tsx
frontend/src/components/Social/Messaging/NewConversationModal.tsx
frontend/src/components/Shared/AITerminalPanel.tsx
frontend/src/components/Shared/AIPersistentPanel/AIPersistentPanel.tsx
frontend/src/components/Shared/CrystallineVoicePill.tsx
frontend/src/hooks/useTextToSpeech.ts
frontend/src/pages/shop/StoreV3.tsx
frontend/src/services/api.service.ts
```

### Backend
```
backend/routes/workoutPlanRoutes.mjs
backend/routes/storeFrontRoutes.mjs
backend/routes/sessions.mjs
backend/routes/equipmentRoutes.mjs
backend/routes/messagingRoutes.mjs
backend/controllers/movementAnalysisController.mjs
backend/controllers/messagingController.mjs
```

---

**Document created:** 2026-04-07
**Author:** Claude Opus 4.6 (CEO) — synthesizing Sean's field test + Codex source audit
**Total issues:** 55+
**Next step:** Clear context → start fresh session with this document as the single source of truth
