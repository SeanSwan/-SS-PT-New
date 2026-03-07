# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 59.8s
> **Files:** backend/services/clientIntelligenceService.mjs, backend/routes/clientIntelligenceRoutes.mjs, backend/services/workoutBuilderService.mjs, backend/routes/workoutBuilderRoutes.mjs, backend/services/eventBus.mjs, frontend/src/hooks/useWorkoutBuilderAPI.ts, frontend/src/components/WorkoutBuilder/WorkoutBuilderPage.tsx
> **Generated:** 3/6/2026, 4:37:59 PM

---

# Deep Code Review: SwanStudios Phase 9 Architecture

## Executive Summary
This review identifies **critical security vulnerabilities**, **significant architectural coupling**, and **several stability bugs** that pose a risk to production stability and data privacy. The "Intelligent Workout Builder" system relies heavily on the `ClientIntelligenceService`, but lacks proper isolation and input validation.

---

## 1. Bug Detection

### 1.1. Critical Security Flaw: IDOR (Insecure Direct Object Reference)
- **Severity:** CRITICAL
- **File:** `backend/services/clientIntelligenceService.mjs` (Lines 247-310)
- **What's Wrong:** The `getClientContext` function accepts a `trainerId` but **does not use it to filter sensitive client data**. Queries for Pain Entries, Movement Profiles, Form Analyses, and Workouts do not verify that the requesting trainer owns or is assigned to the `clientId`. Any authenticated trainer can query any client ID.
- **Fix:** Add a check at the start of `getClientContext` or in the route to verify the trainer-client relationship. Alternatively, add `trainerId` to the `where` clauses of the queries (e.g., `getClientPainEntry().findAll({ where: { userId: clientId, trainerId: trainerId, isActive: true } })` — *Note: This assumes the schema supports trainerId on these tables, otherwise a separate authorization check is required*).

### 1.2. Stability: Unhandled JSON Parse Errors
- **Severity:** HIGH
- **File:** `backend/services/clientIntelligenceService.mjs` (Lines 350, 380, 450)
- **What's Wrong:** The code assumes `commonCompensations`, `formData`, and `exercisesUsed` are either objects or valid JSON strings. If the database contains malformed JSON (due to previous bugs or manual DB edits), `JSON.parse` will throw an unhandled exception, crashing the entire context fetch.
- **Fix:** Wrap `JSON.parse` in try-catch blocks with fallback defaults.
  ```javascript
  // Example fix for line 350
  let parsedCompensations = [];
  try {
    parsedCompensations = typeof movementProfile.commonCompensations === 'string'
      ? JSON.parse(movementProfile.commonCompensations)
      : movementProfile.commonCompensations;
  } catch (e) {
    logger.error(`Failed to parse compensations for client ${clientId}`, e);
  }
  ```

### 1.3. Frontend: Missing Content-Type Validation
- **Severity:** MEDIUM
- **File:** `frontend/src/hooks/useWorkoutBuilderAPI.ts` (Line 143)
- **What's Wrong:** `apiFetch` calls `res.json()` blindly. If the server returns a 500 error with an HTML body (e.g., "Internal Server Error") or a 204 No Content, `JSON.parse` will throw a SyntaxError, treating it as a network failure rather than an API error.
- **Fix:**
  ```typescript
  if (!res.ok) {
    // Attempt to parse error JSON, fallback to text
    const errorData = res.headers.get('content-type')?.includes('json')
      ? await res.json()
      : { error: await res.text() };
    throw new Error(errorData.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null; // Handle empty responses
  ```

### 1.4. Logic: Incorrect Session Type Toggle
- **Severity:** LOW
- **File:** `backend/services/workoutBuilderService.mjs` (Line 200)
- **What's Wrong:** The logic `context.variation.lastSessionType === 'build' ? 'switch' : 'build'` assumes the last session was strictly 'build' or 'switch'. If `lastSessionType` is `null` (new client), it defaults to 'build'. However, if it is some other string (legacy data), it also defaults to 'build'. This is likely intended but worth noting. The logic is sound for the toggle, but lacks a default 'standard' fallback if the pattern is unknown.

---

## 2. Architecture Flaws

### 2.1. Tight Coupling & God Service
- **Severity:** HIGH
- **File:** `backend/services/workoutBuilderService.mjs`
- **What's Wrong:** `workoutBuilderService` acts as a Facade/God service. It calls `getClientContext` (which runs 7 parallel DB queries), then processes the result, then generates the workout. There is no interface or contract. If `ClientContext` changes (e.g., renaming `excludedMuscles` to `blockedMuscles`), `workoutBuilderService` breaks silently or produces garbage.
- **Fix:** Introduce a typed interface for `ClientContext` shared between services. Consider splitting `workoutBuilderService` into `WorkoutGenerator` (takes strict inputs) and `ContextResolver` (fetches data).

### 2.2. Duplicated Constants
- **Severity:** MEDIUM
- **Files:** `backend/services/clientIntelligenceService.mjs` (Line 40), `backend/services/workoutBuilderService.mjs` (Line 330)
- **What's Wrong:** `PAIN_AUTO_EXCLUDE_SEVERITY` is defined in both files with the same value (7). This violates DRY. If a doctor changes the threshold to 8, the explanation in the workout builder will say 7, causing confusion.
- **Fix:** Move shared constants to a `sharedConstants.mjs` or `config.mjs` file and import them.

---

## 3. Integration Issues

### 3.1. Route Definition Conflict
- **Severity:** HIGH
- **File:** `backend/routes/clientIntelligenceRoutes.mjs`
- **What's Wrong:** The route definitions are ambiguous.
  - `GET /:clientId` (Line 24)
  - `GET /` (Line 45)
  Express matches `GET /` first. However, `GET /` is intended for Admin Overview. If a clientId is passed as an empty string or if the router matches differently, it could lead to confusion. More importantly, the `GET /` route passes `trainerId` from `req.user.id`, but the logic assumes it's an overview. There is no explicit check to ensure the path is correct.
- **Fix:** Change the admin route to `/admin/intelligence/overview` or ensure strict param validation so `/:clientId` rejects non-numeric IDs immediately (which it does, but explicit paths are safer).

### 3.2. Frontend-Backend Type Mismatch Risk
- **Severity:** MEDIUM
- **Files:** `backend/services/clientIntelligenceService.mjs` (Return shape) vs `frontend/src/hooks/use

---

*Part of SwanStudios 7-Brain Validation System*
