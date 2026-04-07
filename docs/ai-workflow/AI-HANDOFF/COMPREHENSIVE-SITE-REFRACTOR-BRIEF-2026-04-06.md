# Comprehensive Site Refactor Brief

Date: 2026-04-06
Purpose: Convert raw bug notes, UX concerns, product ideas, and console errors into a readable brief an AI can execute against without missing key context.
Mode: Planning, audit, redesign, and QA specification. Not an implementation brief yet.

## Companion Briefs

Use these split handoffs when a narrower AI pass is more useful than the full master brief:

- `docs/ai-workflow/AI-HANDOFF/P0-BLOCKERS-BRIEF-2026-04-06.md`
- `docs/ai-workflow/AI-HANDOFF/UX-MOBILE-REFACTOR-BRIEF-2026-04-06.md`
- `docs/ai-workflow/AI-HANDOFF/AI-PRODUCT-STRATEGY-BRIEF-2026-04-06.md`
- `docs/ai-workflow/AI-HANDOFF/PLAYWRIGHT-QA-SPEC-2026-04-06.md`

## 1. Core Objective

SwanStudios needs a comprehensive enterprise-grade review and refactor plan focused on:

- mobile usability, especially on iPhone XR
- broken workflows and runtime errors
- admin, trainer, and client dashboard consistency
- AI terminal consistency and usability
- content and marketing tool maturity
- workout planning and exercise management
- equipment scanning and CRUD
- scheduling and calendar depth
- dashboard consolidation and widget strategy
- real data vs mock data validation
- strong Playwright QA coverage after fixes

The desired end state is not “good enough.” The goal is premium, polished, enterprise-level quality with clear UX, stable logic, and strong automated QA coverage.

## 2. Test Context

- Primary device tested: iPhone XR
- Main concern: mobile responsiveness, interaction fidelity, readability, and scroll behavior
- Important requirement: weak or older phones must still have a smooth experience
- Important architectural expectation: all AI-driven surfaces should feel unified, not fragmented

## 3. What Success Looks Like

The site should be:

- fully usable on mobile without clipped layouts, unreadable contrast, sticky scrolling, or hidden controls
- functionally correct across admin, trainer, and client workflows
- consistent in navigation, back behavior, overlays, z-index, drawers, modals, and AI terminals
- free of known critical API failures, route mismatches, and save/load blockers
- using real data where real data is expected, not mock data
- covered by Playwright smoke tests, flow tests, and regression tests for every major issue listed here

## 4. Highest-Priority Blockers

These are the most important issues because they block core operations:

1. Workout plans cannot be reliably saved or viewed.
2. Saved plans are not clearly tied to the current client profile.
3. Movement analysis submission returns `500`.
4. Equipment scan returns `500`.
5. Multiple session history and upcoming endpoints return `404`.
6. Workout plan save endpoint returns `500`.
7. Motion Templates crash with a styled-components runtime error.
8. Mobile dashboard and builder layouts are clipped, unreadable, or hard to use.

## 5. Cleaned Issue Inventory

## A. Workout Planner and Exercise Rolodex

- On desktop, adding an exercise appears to require double-click instead of an explicit plus button.
- On mobile, the exercise name disappears after adding it to the workout builder and only sets, reps, tempo, rest, and numeric ordering remain visible.
- The exercise list is too long and takes over the whole screen.
- The intended “Rolodex” behavior should show only about 5 to 7 exercises at a time on small screens.
- The Rolodex should scroll inside a contained panel instead of extending the whole page.
- The smaller exercise panel should leave more room for the builder and Teach Mode.
- Saved plans are not reliably visible.
- The saved plans control appears non-clickable.
- Saved plans should live under the current client profile.
- Saved plans should be displayed as scrollable cards.
- Clicking a saved plan should open a modal or detail view.
- From that view, the trainer/admin should be able to load the plan into the main builder.
- There should be a copy workflow to reuse a plan for another client.
- The workout builder and workout intelligence experiences likely need to be merged into one stronger planning surface.
- Manual mode already has plus buttons and should inform the final planner UX.

## B. Coach Assistant

- The admin sidebar should close immediately after choosing a destination instead of requiring an extra tap on the page.
- When requesting a workout for a client with a knee issue, the assistant generates text but the read-aloud button does not read it.
- The copy button works.
- The select dropdown is not working.
- The top action buttons like coach, workouts, log, and meal may be wasting space if the assistant already handles those by natural language.
- All AI terminals across the app should be normalized to the same experience as the Coach Assistant.
- The microphone does not seem reliable in several AI areas.
- Some responses show raw HTML tags like `strong`, header tags, and underline tags instead of rendering them properly.
- Some AI terminal overlays get stuck over prior content.
- Z-index and exit behavior need review.
- The floating dashboard button or AI opener is covering content and needs better placement.

## C. Boot Camp Creator

- Scrolling gets sticky or sluggish on iPhone XR.
- “Save as template” does not make it obvious where templates are stored.
- There is no clear previous template browser.
- Joint-friendly alternative exercise logic appears to be duplicating the main exercise list instead of using true substitutions from the backend logic for knees, back, wrists, elbows, ankles, feet, shoulders, and related joint issues.
- The workout rolodex problem exists here too and should use the same compact scrollable panel approach.
- Class preview contrast is poor on the default theme.

## D. Swan Coach Workout Builder

- The microphone does not work reliably.
- Read-aloud cuts off early and says to check the terminal for the rest.
- Voice quality feels robotic.
- Voice selection and voice settings feel incomplete.
- Opening the builder can cause the surrounding layout columns to break or clip to the right.
- The builder should inherit the same unified AI terminal system as Coach Assistant.

## E. Equipment Profiles and AI Scan

- Move Fitness should be the default location set.
- “Get started” does not appear to save correctly.
- Camera upload is expected to work and upload to Cloudflare R2 automatically.
- Uploaded equipment images do not seem to be saving.
- Default locations should exist: Gym, Move Fitness, Home.
- Those default locations should still be editable and extensible.
- There should be a clear way to go back after entering a location.
- Manual equipment add flow lacks image upload.
- Desired workflow is batch-first:
  - take many pictures first
  - upload them
  - let AI identify them
  - then edit/finalize each item
- The intended workflow is AI-assisted scan-first, manual entry second.
- There should be persistent CRUD:
  - create
  - scan
  - edit
  - delete
- Equipment scan currently returns `500`.

## F. Scheduling and Calendar

- Need 30-minute and 45-minute session support, not just one-hour booking.
- Schedule should show whose schedule is being viewed.
- It should show at least a name, initials, or ideally a profile picture bubble.
- “My schedule” labeling is too generic.
- Universal Master Schedule should be upgraded to 24-hour capability.
- Current default visible hours can stay 5:00 AM to 10:00 PM, but the system itself should support off-hours.
- Content Studio calendar and marketing calendar should be connected conceptually to the master schedule.
- Admin-only planning entries should remain permission-scoped and not leak to trainers or clients.

## G. Hero and Storefront

- “Find a trainer” is not fully mobile responsive and is clipped on iPhone XR.
- Membership tier selection traps the user without a clear way to go back.
- Tier pricing and value ladder need review.
- The offers feel too similar and need better differentiation.
- A more thoughtful trial and upgrade strategy is needed.
- Storefront is falling back to default package data because the API returns no packages.

## H. Client Dashboard and Enhanced Client Progress

- Enhanced Client Progress dashboard is smashed in mobile mode.
- Pain charts and related client-progress tooling do not appear where expected in the admin experience.
- Scroll behavior is sticky or sluggish.
- Form assessment contrast is poor on the default theme.
- Postural analysis, performance tests, and movement screens should feed the AI workout system and the AI context layer.
- Movement analysis currently returns invalid value issues and `500`s.
- Recent assessments visibility needs review.
- Messaging features feel missing or not fully wired.
- My Profile mobile layout is poor.
- Notification sliders are visually weak.
- Companion text is too small to read on mobile.
- Some modules should open in larger dedicated modals instead of tiny compressed panels.

## I. Trainer Dashboard

- Sprint Planner sends the user into the admin experience unexpectedly.
- Trainer overview should be a more powerful widget-based hub.
- Admin and trainer role blending needs review so the admin can access trainer/client capabilities without confusing context switching.
- Trainer has tabs like Equipment Profiles and Nutrition Intelligence that the admin experience should also surface appropriately.
- Workout Intelligence appears redundant and should likely merge into the stronger workout planning experience rather than stay separate.

## J. Content Studio

- Coverage Tracker should use the same compact Rolodex pattern.
- Each exercise should support:
  - upload video
  - fill video gaps
  - edit exercise metadata
  - create new exercise
  - delete/update exercise
  - connect Teach Me content
- “Legacy video” vs “catalog video” likely needs simplification if all new content is from scratch.
- Motion Template tab throws a styled-components error and breaks navigation expectations.
- Back behavior after errors is wrong and dumps the user somewhere unrelated.
- Horizontal tab bars are not mobile-scrollable, so many tabs are inaccessible on phone.
- Badge Creator is too limited and needs much broader style coverage.
- Icon generation and avatar asset generation should probably live here too.
- Voice Studio and AI Video are greyed out and need both:
  - API readiness review
  - deeper product design review
- Calendar is too weak and should be more comprehensive.
- Distribution is greyed out and likely blocked by missing API setup, but still needs enterprise-level planning.
- Settings tab is too shallow for the range of tools expected here.

## K. Marketing Workspace

- The content calendar should align with the larger scheduling/calendar ecosystem.
- Tabs are not mobile-scrollable.
- SEO audit is too shallow.
- Keyword research needs Teach Me support and better contrast.
- Blog Writer and Social Post features may be duplicated between Marketing and Content Studio and need consolidation.
- Email Digest needs deeper functionality and likely Twilio/SendGrid integration planning.
- Competitor analysis is too shallow.

## L. Security Workspace

- Need confirmation whether the alerts feed is real or mock data.
- Mock data should not masquerade as real security events.
- Contrast and readability need work.
- Every security area should have Teach Me support.

## M. Messages and Social Wiring

- Messages section is not clearly surfaced in admin where expected.
- Recipient selection should allow real searchable users, clients, trainers, and admins.
- Admin should always be reachable by default in message search.
- The user dashboard social and people-search flows seem incompletely wired.
- Need routing and integration review for features that were built but may not be connected.

## N. Gamification, Avatars, Companion, and Overview Architecture

- Community, challenges, and progress are too fragmented.
- Many of these should become overview widgets instead of separate weak tabs.
- Companion should likely have its own richer module.
- The long-term direction is much deeper:
  - user avatar
  - companion pet
  - home/base/room progression
  - unlockables
  - virtual events and avatar competition
  - badges as stat modifiers
  - long-range leveling and progression
- Current gamification is too shallow for that vision and needs a clearer foundation.

## O. Dead Code and Cleanup

- HomePage V5 preview in admin is considered dead and should likely be removed during cleanup.
- Mock data should be removed or clearly flagged wherever production functionality is expected.

## 6. Console and API Errors Observed

These should be explicitly included in the planning brief:

- `styled-components` runtime error in `RemotionTemplateGallery.tsx:482:51`
- `POST /api/movement-analysis` returns `500`
- `POST /api/equipment-profiles/2/scan` returns `500`
- StoreV3 falls back because no packages are returned from API
- `GET /api/sessions/upcoming/:id` returns `404` for multiple IDs
- `GET /api/sessions/history/:id` returns `404` for multiple IDs
- `POST /api/workout/plans` returns `500`

## 7. Missing Context the Next AI Should Explicitly Consider

The next AI pass should not just fix bugs blindly. It should understand these higher-level product expectations:

- The app must feel premium and enterprise-grade, not prototype-grade.
- Mobile-first refinement is mandatory, especially on older/smaller iPhones.
- Many tabs probably need consolidation, not just fixes.
- AI tools should feel unified across the app.
- Teach Me should exist across more surfaces.
- Real data must replace mock data wherever the feature is meant to be usable.
- Routing, back behavior, and modal/drawer consistency are a core UX problem.
- Accessibility and readability matter:
  - contrast
  - text size
  - tap targets
  - scroll performance
- Performance on weaker phones is a first-class requirement.

## 8. Required Deliverables From the Next AI Pass

The next AI should produce:

1. A full categorized audit of all issues in this brief
2. A deduplicated issue list with priorities:
   - P0 blockers
   - P1 major workflow breaks
   - P2 polish and redesign
   - P3 strategic enhancements
3. A proposed refactor strategy by workspace/module
4. A consolidation plan for overlapping tabs and duplicated features
5. A real-data vs mock-data audit
6. A backend/API gap audit for the listed 404 and 500 errors
7. A mobile UX redesign plan
8. A unified AI terminal design plan
9. A Playwright QA strategy that covers all critical flows

## 9. Required Playwright Coverage

The Playwright plan should include at minimum:

- workout planner add/remove/save/load/copy flows
- mobile Rolodex behavior
- bootcamp template save/load behavior
- coach assistant onboarding handoff behavior
- claim/login/password-change flows
- equipment scan/upload/edit/delete flows
- schedule booking with 30/45/60-minute options
- store tier selection and exit/back flows
- content studio tab navigation and mobile horizontal scroll
- motion template crash regression
- movement analysis submit flow
- saved assessment visibility
- messaging recipient search flow
- marketing/content studio tab accessibility on mobile
- security workspace real-data vs mock-data verification hooks
- global console error detection
- layout clipping and overflow regression checks on iPhone XR viewport

## 10. AI-Ready Prompt

Use this as the cleaned prompt for the next AI pass:

```text
Task: Perform a comprehensive enterprise-grade planning and audit pass for SwanStudios based on the attached issue brief. This is not a quick bugfix review. I want a premium, mobile-first, enterprise-level refactor strategy with exhaustive QA planning.

Read this file first:
- docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md

Goals:
- deduplicate and structure every issue
- identify missing context and hidden dependencies
- find related code areas that will also need refactor
- separate true bugs from UX redesign needs from long-term product enhancements
- produce a phased execution plan
- produce a Playwright QA and smoke-test plan for all critical workflows

Important context:
- Primary testing device is iPhone XR
- Mobile responsiveness is a major concern
- Weak/older phone performance matters
- The app should feel enterprise-grade, polished, premium, and unified
- All AI terminals should be normalized to one best-in-class experience
- Teach Me functionality should be considered across key modules
- Real data is required where real functionality is expected
- Many modules may need consolidation rather than patch-by-patch fixes

You must analyze all of these areas:
- workout planner
- exercise rolodex UX
- saved plans and client-specific plan management
- coach assistant
- AI terminal consistency
- bootcamp creator
- equipment profiles and AI scan
- scheduling and universal master schedule
- storefront and membership flow
- client dashboard
- trainer dashboard
- admin dashboard overlap and role blending
- content studio
- marketing workspace
- security workspace
- messaging and recipient search
- gamification, companion, avatars, long-range progression
- mock data vs real data
- routing, overlays, z-index, back behavior
- all listed 404 and 500 API/runtime errors

Required output:
1. Executive summary
2. Deduplicated issue matrix grouped by module
3. Priority levels: P0, P1, P2, P3
4. Missing-context section
5. Refactor architecture recommendations
6. UX consolidation recommendations
7. API/backend gap analysis
8. Real-data vs mock-data audit recommendations
9. Mobile-first redesign recommendations
10. Playwright automation plan and coverage map

For every issue:
- give the problem
- explain impact
- explain likely root cause
- identify probable code areas
- give recommended fix direction

Do not glaze over anything. Do not compress away important details. Preserve the intent of the brief while making it technically actionable.
```

## 11. Recommended Next Step

Before any code changes, run one AI pass whose only job is:

- structuring
- deduplicating
- prioritizing
- identifying hidden dependencies
- defining the Playwright matrix

Then do implementation in phases, not all at once.
