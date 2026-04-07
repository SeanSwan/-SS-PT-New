# P0 Blockers Brief

Date: 2026-04-06
Purpose: Isolate the must-fix blockers that currently prevent SwanStudios from operating reliably.
Parent brief: `docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md`

## Goal

Stabilize the app so the core trainer/admin/client workflows stop failing before any wider redesign or feature expansion work begins.

## P0 Definition

A P0 issue is any issue that:

- breaks save/load behavior
- returns `500` or `404` in a core workflow
- traps the user in a broken state
- prevents reliable plan, assessment, scan, schedule, or membership use
- causes runtime crashes in a primary workspace

## Blocker List

## 1. Workout plan save failure

- Symptom: `POST /api/workout/plans` returns `500`
- Impact: trainers/admins cannot reliably save plans
- Related UX impact:
  - save button fails
  - saved plans appear unavailable or unusable
  - client-specific plan history cannot be trusted
- Related code areas:
  - `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx`
  - backend workout plan routes/controllers/services

## 2. Saved plans are not clearly retrievable per client

- Symptom: saved plans are not visible, not clickable, or not clearly tied to the active client
- Impact: even if saving succeeds later, the plan-management workflow still fails operationally
- Required outcome:
  - save to current client
  - view list of saved plans for current client
  - open plan detail
  - load into builder
  - duplicate/copy to another client

## 3. Movement analysis submit failure

- Symptom: `POST /api/movement-analysis` returns `500`
- Impact: assessment intake and AI context for workouts are blocked
- Related user-facing symptom:
  - invalid value errors during assessment submission
- Related code areas:
  - movement analysis routes/controllers/validators
  - `TrainerAssessmentsPage.tsx`

## 4. Equipment scan failure

- Symptom: `POST /api/equipment-profiles/:id/scan` returns `500`
- Impact: the intended AI-assisted equipment workflow is broken
- Required outcome:
  - capture or upload image
  - scan image
  - infer equipment data
  - persist record
  - allow edit/delete afterward

## 5. Session history/upcoming API failures

- Symptom:
  - `GET /api/sessions/upcoming/:id?limit=...` returns `404`
  - `GET /api/sessions/history/:id?limit=...` returns `404`
- Impact: dashboards cannot reliably show session summaries or upcoming/history cards
- Required outcome:
  - consistent routing contract
  - correct authorization and user lookup
  - no repeated `404`s for valid users in active dashboards

## 6. Motion Templates runtime crash

- Symptom: styled-components runtime error in `RemotionTemplateGallery.tsx:482:51`
- Impact:
  - Motion Templates tab crashes
  - back navigation becomes unreliable
  - Content Studio confidence drops because one of its key tabs hard-fails

## 7. Mobile workout builder usability failure

- Symptom:
  - exercise add flow is unreliable
  - exercise names disappear
  - lists are too large and consume the whole page
  - important actions are obscured on iPhone XR
- Impact: even without API failures, the planner is not practically usable on mobile

## 8. Membership/storefront fallback data

- Symptom: `StoreV3.tsx` falls back because no packages are returned from API
- Impact:
  - pricing and plan selection cannot be trusted
  - storefront may show outdated or non-production data

## 9. Navigation trap and back-behavior failures

- Symptom:
  - membership tier pages trap the user
  - Motion Templates errors send the user to unrelated parts of the app
  - some drawers/sidebars require extra taps to dismiss
- Impact: user loses context and cannot complete flows reliably

## Fix Order Recommendation

1. API and backend route failures
2. Save/load plan integrity
3. Runtime crash removal
4. Mobile workflow usability on the planner
5. Navigation and back-behavior recovery
6. Storefront real-data integrity

## Exit Criteria

This P0 track is complete only when:

- workout plans can be saved and reopened reliably
- movement analysis submits without server failure
- equipment scan/upload flow no longer `500`s
- session history/upcoming cards resolve from valid endpoints
- Motion Templates no longer crash
- mobile planner is operable on iPhone XR
- storefront uses real package data or clearly fails with a controlled state

