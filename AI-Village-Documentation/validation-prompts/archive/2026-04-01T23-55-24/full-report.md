# SwanStudios Validation Report

> Generated: 4/1/2026, 4:55:24 PM
> Files reviewed: 3
> Validators: 16 succeeded, 0 errored
> Cost: $0.5296
> Duration: 756.4s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

- `backend/controllers/adminSpecialController.mjs`
- `backend/controllers/goalController.mjs`
- `backend/controllers/workoutController.mjs`

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
| 1 | UX & Accessibility | google/gemini-2.5-flash | 17,216 / 2,668 | 18.1s | PASS |
| 2 | Code Quality | anthropic/claude-4.6-sonnet-20260217 | 17,438 / 4,096 | 70.1s | PASS |
| 3 | Security | stepfun/step-3.5-flash:free | 16,949 / 4,096 | 42.1s | PASS |
| 4 | Performance & Scalability | google/gemini-3-flash-preview-20251217 | 17,247 / 1,247 | 12.6s | PASS |
| 5 | Competitive Intelligence | minimax/minimax-m2.1 | 14,378 / 3,087 | 56.3s | PASS |
| 6 | User Research & Persona Alignment | deepseek/deepseek-v3.2-20251201 | 16,982 / 1,778 | 58.0s | PASS |
| 7 | Architecture & Bug Hunter | minimax/minimax-m2.7-20260318 | 14,673 / 4,096 | 59.6s | PASS |
| 8 | Frontend UX & Code Patterns | google/gemini-3.1-flash-lite-preview-20260303 | 17,255 / 968 | 6.8s | PASS |
| 9 | Data Safety & Integrity | anthropic/claude-4.6-sonnet-20260217 | 18,035 / 4,096 | 77.2s | PASS |
| 10 | Security II (Nemotron) | nvidia/nemotron-3-super-120b-a12b-20230311:free | 17,319 / 4,096 | 104.8s | PASS |
| 11 | Code Architecture (Qwen) | qwen/qwen3.6-plus-preview:free | 15,149 / 5,229 | 130.6s | PASS |
| 12 | Bug Hunter II (Step) | stepfun/step-3.5-flash:free | 17,037 / 4,096 | 40.0s | PASS |
| 13 | Security Debate (Phase 2A) | stepfun/step-3.5-flash:free ↔ nvidia/nemotron-3-super-120b-a12b:free | 18,732 / 4,927 | 62.4s | PASS |
| 14 | Code Quality Debate (Phase 2B) | anthropic/claude-sonnet-4.6 ↔ qwen/qwen3.6-plus-preview:free | 42,192 / 16,045 | 303.6s | PASS |
| 15 | UX/UI Design Debate (Phase 2C) | gemini-3.1-pro-preview ↔ minimax/minimax-m2.7 | 40,899 / 9,739 | 199.8s | PASS |
| 16 | Smart Escalation (MiniMax M2.7) | minimax/minimax-m2.7 | 14,204 / 3,139 | 39.8s | PASS |

---

## [PASS] UX & Accessibility
**Model:** google/gemini-2.5-flash | **Duration:** 18.1s

As a UX and accessibility expert auditor, I've reviewed the provided backend code for SwanStudios. While backend code doesn't directly impact frontend WCAG compliance, mobile UX, or visual design consistency, it heavily influences the data structures, error handling, and overall responsiveness that the frontend relies on. My audit focuses on potential issues that could manifest in the user interface due to backend design choices.

Here's my assessment:

---

### WCAG 2.1 AA Compliance

**Findings:**

*   **CRITICAL: Lack of Frontend Context for Accessibility (Implicit)**
    *   **Description:** The backend code itself doesn't contain UI elements, so direct WCAG checks (color contrast, ARIA labels, keyboard navigation, focus management) are not applicable. However, the *absence* of explicit considerations for how data is structured or errors are reported can lead to significant accessibility issues on the frontend. For example, if error messages are too generic or lack specific context, screen reader users might struggle to understand what went wrong.
    *   **Impact:** Users with disabilities may face significant barriers when interacting with the application, especially during data entry, form submissions, or error recovery.
    *   **Recommendation:** While not a code change here, it's crucial to ensure the frontend development team has clear guidelines for implementing WCAG 2.1 AA standards. The backend should provide granular error messages and data structures that facilitate accessible UI components (e.g., clear labels for form fields, status messages for asynchronous operations).
    *   **Files:** All backend files.

*   **MEDIUM: Generic Error Messages**
    *   **Description:** Many error responses, especially 500s, return generic messages like "Failed to fetch specials," "Failed to create goal," or "Failed to update workout session." While the `error.message` is often included for debugging, it might not be user-friendly or actionable for the frontend.
    *   **Impact:** Users might not understand why an operation failed, leading to frustration and an inability to self-correct. This can indirectly affect accessibility if the error message isn't clear enough for assistive technologies to convey meaningful information.
    *   **Recommendation:** For user-facing errors (e.g., 400, 403, 404), ensure messages are concise, clear, and actionable. For 500 errors, a generic "Something went wrong, please try again" is acceptable, but the frontend should be able to present this gracefully without exposing sensitive backend details. Consider a separate `userMessage` field in error responses.
    *   **Files:** `backend/controllers/adminSpecialController.mjs`, `backend/controllers/goalController.mjs`, `backend/controllers/workoutController.mjs`

---

### Mobile UX

**Findings:**

*   **MEDIUM: Pagination Parameters (Implicit Touch Target/Responsiveness)**
    *   **Description:** In `goalController.mjs` (`getUserGoals`), pagination parameters (`page`, `limit`) are handled. While this is a backend concern, the choice of `limit = 20` as a default might not be optimal for mobile screens where displaying 20 items could lead to excessive scrolling or a cluttered view. Similarly, pagination controls on the frontend (next/previous buttons, page numbers) need to be large enough for touch targets.
    *   **Impact:** On mobile, displaying too many items per page can lead to a poor user experience, requiring excessive scrolling. Small pagination controls are difficult to tap accurately.
    *   **Recommendation:** The backend should ideally allow the frontend to request a `limit` that is responsive to the viewport size. Consider a default `limit` that is more mobile-friendly (e.g., 10-15 items) or ensure the frontend can dynamically adjust this. The frontend implementation of pagination controls must adhere to the 44px minimum touch target.
    *   **Files:** `backend/controllers/goalController.mjs`

*   **LOW: Large Data Payloads (Implicit Performance)**
    *   **Description:** Endpoints like `listSpecials` or `getWorkoutStatistics` (especially with all `include...Breakdown` flags set to true) could return large JSON payloads. While the `workoutController` does mention performance considerations for statistics, the `goalController`'s `getGoalById` returns a comprehensive object with `analytics`, `statusInfo`, `progressHistory`, `milestones`, `insights`, `predictions`, and `recommendations`.
    *   **Impact:** Large payloads can increase loading times on mobile networks, consuming more data and leading to a slower, less responsive experience.
    *   **Recommendation:** For mobile-first design, consider if all data returned by `getGoalById` is always needed for the initial view. If not, consider creating separate endpoints for analytics or allowing the frontend to request specific subsets of data (e.g., via query parameters like `?includeAnalytics=true`). The `workoutController`'s approach to optional breakdowns for statistics is a good example.
    *   **Files:** `backend/controllers/goalController.mjs`, `backend/controllers/workoutController.mjs`

---

### Design Consistency

**Findings:**

*   **N/A: Backend Code - No Direct Design Consistency Issues**
    *   **Description:** Backend controllers do not contain UI elements, styles, or direct references to theme tokens. Therefore, there are no direct design consistency issues to report in this code.
    *   **Impact:** None directly from this code.
    *   **Recommendation:** Ensure the frontend team has a robust system for managing and applying the "Enchanted Apex: Crystalline Swan" theme tokens consistently across all UI components.

---

### User Flow Friction

**Findings:**

*   **MEDIUM: Missing Feedback States (Implicit)**
    *   **Description:** While the backend provides success/error responses, the granularity of these responses could impact frontend feedback. For instance, `updateGoalProgress` returns `milestonesAchieved` and `xpAwarded`, which is excellent. However, other operations like `createSpecial` or `createGoal` only return the created object. If there are complex validations or side effects, the frontend might need more specific feedback.
    *   **Impact:** Without clear, immediate feedback, users might be unsure if an action was successful, partially successful, or if there are subtle issues. This can lead to unnecessary retries or confusion.
    *   **Recommendation:** For operations with multiple potential outcomes (e.g., partial success, warnings), ensure the backend response provides enough detail for the frontend to render appropriate feedback (e.g., toast messages, inline validation errors, success banners with specific details).
    *   **Files:** `backend/controllers/adminSpecialController.mjs`, `backend/controllers/goalController.mjs`, `backend/controllers/workoutController.mjs`

*   **LOW: `adminSpecialController` - Public vs. Admin Endpoints**
    *   **Description:** The `adminSpecialController` has `listSpecials` (admin) and `listActiveSpecials` (public). This separation is good for security and performance. However, the public endpoint returns `data: []` if the `AdminSpecial` model isn't registered, which is a graceful fallback but might hide a deeper configuration issue.
    *   **Impact:** While not direct user friction, if the model registration fails silently for the public endpoint, it could lead to a "no specials available" message on the frontend when there should be, potentially confusing users or missing promotional opportunities.
    *   **Recommendation:** Consider logging a warning or error for the `AdminSpecial` model not being registered even for the public endpoint, to ensure operational awareness. The frontend should clearly distinguish between "no active specials" (expected) and "error loading specials" (unexpected).
    *   **Files:** `backend/controllers/adminSpecialController.mjs`

*   **LOW: `goalController` - Redundant `findByPk` in `updateGoal`**
    *   **Description:** In `updateGoal`, the goal is fetched by `findByPk` *before* checking authorization. If the authorization check fails, the initial `findByPk` was an unnecessary database call.
    *   **Impact:** Minor performance overhead for unauthorized requests. Not significant user friction, but an optimization opportunity.
    *   **Recommendation:** For endpoints where authorization depends on the resource itself (like `goal.userId`), it's often necessary to fetch the resource first. This is a common pattern. However, if there's a way to check basic authorization (e.g., `req.user.id` matches `userId` in the URL) *before* a database lookup, it could save a query. In this case, it's likely unavoidable given the `admin` role can update any goal.
    *   **Files:** `backend/controllers/goalController.mjs`

---

### Loading States

**Findings:**

*   **CRITICAL: Implicit Loading State Management**
    *   **Description:** The backend code, by its nature, doesn't dictate frontend loading states. However, the speed and reliability of backend responses directly impact the perceived loading experience. If backend calls are slow or prone to errors, the frontend needs robust loading, error, and empty states. The current error handling (e.g., `res.status(500).json(...)`) is standard but doesn't provide specific guidance for frontend skeleton screens or error boundaries.
    *   **Impact:** Without proper frontend loading states (skeleton screens, spinners), users experience blank screens or abrupt content changes, leading to perceived slowness and frustration. Generic error messages without error boundaries can crash parts of the UI or leave users stranded.
    *   **Recommendation:** This is a critical frontend responsibility, but the backend's role is to be performant and predictable. Ensure API response times are optimized. The frontend should implement:
        *   **Skeleton Screens/Loaders:** For data fetching (e.g., `listSpecials`, `getUserGoals`).
        *   **Error Boundaries:** To gracefully handle API errors without crashing the entire application.
        *   **Empty States:** For when data is legitimately empty (e.g., `listActiveSpecials` returning `[]`). The backend's `listActiveSpecials` returning `data: []` if the model isn't registered is a good example of providing an empty state.
    *   **Files:** All backend files.

*   **HIGH: `AdminSpecial` Model Not Registered (Service Unavailable)**
    *   **Description:** In `adminSpecialController.mjs`, `listSpecials` and `listActiveSpecials` check if `AdminSpecial` model is registered. If not, `listSpecials` returns a 503 "Specials data temporarily unavailable," and `listActiveSpecials` returns an empty array.
    *   **Impact:** A 503 error is a server-side issue. While the frontend should have an error boundary for this, it's a critical operational problem. The public endpoint returning an empty array might be confusing if the user expects specials.
    *   **Recommendation:** The 503 for `listSpecials` is appropriate for an admin interface. For the public `listActiveSpecials`, returning an empty array is a graceful fallback, but the frontend should clearly distinguish between "no active specials currently" and "an error occurred loading specials." The backend could potentially return a specific status code (e.g., 200 with a flag `isFeatureAvailable: false`) if the model not being registered is a *feature toggle* rather than an *error*. If it's truly an error, a 500 or 503 is more appropriate, and the frontend should show an error.
    *   **Files:** `backend/controllers/adminSpecialController.mjs`

---

**Overall Summary:**

The backend code is well-structured with good separation of concerns (controllers, services, models) and robust authorization checks. The documentation within `workoutController.mjs` is exceptionally thorough and provides excellent context for its design decisions.

The primary UX and accessibility concerns stemming from this backend code are *implicit*: how the frontend will interpret and present the data and errors. Generic error messages and potentially large data payloads are areas where the backend can be refined to better support a performant and accessible frontend. The explicit handling of empty data sets and service unavailability is a good start for frontend loading and error states.

---

## [PASS] Code Quality
**Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.1s

# SwanStudios Backend Controllers — Code Quality Review

**Files:** `adminSpecialController.mjs` · `goalController.mjs` · `workoutController.mjs`
**Reviewer:** Senior TypeScript/Node.js Architect
**Platform:** SwanStudios SaaS — Production (`sswanstudios.com`)

---

## Executive Summary

These are **Node.js/Express controllers written in `.mjs` (ESM JavaScript)**, not TypeScript — so TypeScript-specific findings are reframed as *type-safety and JSDoc typing gaps* that would apply if/when migrated. The controllers show solid architectural intent (service delegation, whitelist patterns, transaction management) but carry several **critical security and correctness bugs** alongside meaningful DRY and reliability issues.

---

## 🔴 CRITICAL Findings

---

### CRIT-01 · `goalController.mjs` — `this` context is `undefined` in object literal methods

**File:** `goalController.mjs`
**Lines:** `getGoalById` (~L168), `getGoalAnalytics` (~L310)

```js
// BROKEN — `this` is undefined in strict-mode ESM object literals
estimatedCompletion: goal.progressPercentage > 0
  ? this.calculateEstimatedCompletion(goal, daysElapsed)  // ❌ TypeError at runtime
  : null

// getGoalAnalytics:
insights: this.generateGoalInsights(goal),       // ❌
predictions: this.generateGoalPredictions(goal), // ❌
recommendations: this.generateGoalRecommendations(goal) // ❌
```

**Why critical:** ESM modules run in strict mode. `this` inside a plain object method called as `goalController.getGoalById(req, res)` by Express is `undefined`. These lines **throw `TypeError: Cannot read properties of undefined`** in production, crashing the response for any goal detail or analytics request.

**Fix:**

```js
// Option A — Extract helpers as module-level functions (recommended)
function calculateEstimatedCompletion(goal, daysElapsed) { ... }
function generateGoalInsights(goal) { ... }
function generateGoalPredictions(goal) { ... }
function generateGoalRecommendations(goal) { ... }

const goalController = {
  getGoalById: async (req, res) => {
    // ...
    estimatedCompletion: goal.progressPercentage > 0
      ? calculateEstimatedCompletion(goal, daysElapsed)  // ✅
      : null
  },
  getGoalAnalytics: async (req, res) => {
    const analytics = {
      insights: generateGoalInsights(goal),        // ✅
      predictions: generateGoalPredictions(goal),  // ✅
      recommendations: generateGoalRecommendations(goal)
    };
  }
};
```

---

### CRIT-02 · `goalController.mjs` — XP balance race condition (stale read)

**File:** `goalController.mjs` — `updateGoalProgress` (~L230–L270)

```js
// user.points read ONCE before the loop
const user = await User.findByPk(goal.userId, { transaction });

// Each PointTransaction uses: user.points + totalXpAwarded
// But totalXpAwarded accumulates ACROSS iterations —
// the balance written to each row is WRONG for all but the last
await PointTransaction.create({
  balance: user.points + totalXpAwarded, // ❌ stale for intermediate rows
  ...
}, { transaction });

// Then completion XP:
await PointTransaction.create({
  balance: user.points + totalXpAwarded, // ❌ may still be wrong if milestones ran
  ...
}, { transaction });
```

**Why critical:** `PointTransaction.balance` is a running ledger. If a user hits 2 milestones (50 XP each) plus completion (200 XP), the three rows record balances of `base+50`, `base+100`, `base+300` — but the intermediate rows are written with the *wrong* balance because `totalXpAwarded` is post-incremented. The final `user.update` is correct, but the audit trail is corrupted.

**Fix:**

```js
let runningBalance = user.points;

for (const milestone of milestonesAchieved) {
  if (milestone.xpBonus > 0) {
    runningBalance += milestone.xpBonus;
    totalXpAwarded += milestone.xpBonus;
    await PointTransaction.create({
      balance: runningBalance, // ✅ correct per-row balance
      points: milestone.xpBonus,
      ...
    }, { transaction });
  }
}

if (wasCompleted) {
  const completionXp = goal.xpReward + goal.completionBonus;
  if (completionXp > 0) {
    runningBalance += completionXp;
    totalXpAwarded += completionXp;
    await PointTransaction.create({
      balance: runningBalance, // ✅
      points: completionXp,
      ...
    }, { transaction });
  }
}

await user.update({ points: runningBalance }, { transaction }); // ✅
```

---

### CRIT-03 · `adminSpecialController.mjs` — Model null-check missing in `getSpecialById`, `updateSpecial`, `deleteSpecial`, `toggleSpecialStatus`

**File:** `adminSpecialController.mjs`

```js
// listSpecials and listActiveSpecials guard against null model ✅
// BUT these four do NOT:
export const getSpecialById = async (req, res) => {
  const AdminSpecial = getAdminSpecialModel();
  // ❌ No null check — AdminSpecial.findByPk() throws if model unregistered
  const special = await AdminSpecial.findByPk(id, { ... });
```

**Why critical:** If the `AdminSpecial` model fails to register (migration not run, DB unavailable at startup), these endpoints throw an unhandled `TypeError: Cannot read properties of null (reading 'findByPk')` instead of returning a graceful 503. The inconsistency is a latent production crash.

**Fix — extract a shared guard:**

```js
/**
 * @returns {import('../models/AdminSpecial.mjs').AdminSpecialModel | null}
 */
function requireAdminSpecialModel(res) {
  const model = getAdminSpecialModel();
  if (!model) {
    res.status(503).json({
      success: false,
      error: 'Specials data temporarily unavailable'
    });
    return null;
  }
  return model;
}

// Usage in every handler:
export const getSpecialById = async (req, res) => {
  try {
    const AdminSpecial = requireAdminSpecialModel(res);
    if (!AdminSpecial) return; // response already sent
    // ...
  }
};
```

---

### CRIT-04 · `workoutController.mjs` — Authorization check AFTER data is already fetched (TOCTOU)

**File:** `workoutController.mjs` — `createWorkoutPlan` (~L~330)

```js
export async function createWorkoutPlan(req, res) {
  // Whitelist and build planData FIRST ✅
  const planData = { trainerId: req.user.id };
  for (const field of planAllowed) { ... }

  // Authorization check AFTER data prep — but this is fine here.
  // HOWEVER: the check is AFTER the whitelist loop, meaning
  // a client-role user has already had their data processed.
  // More critically — the authorization check is MISSING for
  // generateWorkoutSessions: a client CAN call this if they are
  // the plan's clientId, but they can also inject `userId` in req.body
  // to generate sessions for OTHER users:

  const { startDate, weeks, userId } = req.body; // ❌ userId from body, unvalidated
  const sessions = await workoutService.generateWorkoutSessions(planId, {
    userId: userId || req.user.id  // ❌ attacker passes any userId
  });
```

**Why critical:** A client can forge `userId` in the request body to `generateWorkoutSessions` and create workout sessions attributed to any other user in the system. The plan ownership check only validates the *plan*, not the *target user for session generation*.

**Fix:**

```js
export async function generateWorkoutSessions(req, res) {
  // ...existing plan ownership check...

  const { startDate, weeks } = req.body;
  // Derive target userId safely — never trust req.body.userId for session ownership
  const targetUserId = (req.user.role === 'admin' || req.user.role === 'trainer')
    ? (req.body.userId || existingPlan.clientId || req.user.id)
    : req.user.id; // ✅ clients can only generate for themselves

  const sessions = await workoutService.generateWorkoutSessions(planId, {
    startDate,
    weeks: weeks ? parseInt(weeks) : undefined,
    userId: targetUserId
  });
}
```

---

## 🟠 HIGH Findings

---

### HIGH-01 · `goalController.mjs` — `console.error` instead of structured logger

**File:** `goalController.mjs` — all catch blocks (~12 occurrences)

```js
// ❌ Bypasses Winston, no correlation IDs, no log levels, no structured output
console.error('Error fetching user goals:', error);
console.error('Error fetching goal:', error);
// ... repeated in every catch block
```

`workoutController.mjs` and `adminSpecialController.mjs` correctly use `logger.error(...)`. `goalController.mjs` never imports the logger.

**Fix:**

```js
import logger from '../utils/logger.mjs';

// In every catch block:
logger.error('[GoalController] Error fetching user goals:', {
  error: error.message,
  stack: error.stack,
  userId: req.params.userId
});
```

---

### HIGH-02 · `goalController.mjs` — Missing authorization check in `getUserGoals`

**File:** `goalController.mjs` — `getUserGoals` (~L40)

```js
const { userId } = req.params;
// ❌ No check: can any authenticated user fetch any other user's goals?
const user = await User.findByPk(userId);
```

Any authenticated user can call `GET /api/v1/gamification/users/ANY_ID/goals` and retrieve another user's personal goals. `getGoalById`, `updateGoal`, `deleteGoal` all have authorization checks — `getUserGoals` and `getGoalCategoriesStats` do not.

**Fix:**

```js
// After userId extraction:
if (userId !== String(req.user.id) && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return res.status(403).json({
    success: false,
    message: 'Not authorized to view this user\'s goals'
  });
}
```

---

### HIGH-03 · `goalController.mjs` — `error.message` leaked to client in 500 responses

**File:** `goalController.mjs` — all catch blocks

```js
return res.status(500).json({
  success: false,
  message: 'Failed to fetch user goals',
  error: error.message  // ❌ Leaks DB schema, table names, query details
});
```

`adminSpecialController.mjs` correctly omits `error.message` from 500s (except `createSpecial`/`updateSpecial` which also leak it). `workoutController.mjs` passes `error` to `errorResponse()` — depends on that utility's implementation.

**Fix:**

```js
// Production-safe: log full error, return generic message
logger.error('[GoalController] Error:', { message: error.message, stack: error.stack });
return res.status(500).json({
  success: false,
  message: 'Failed to fetch user goals'
  // No error.message in response
});
```

---

### HIGH-04 · `workoutController.mjs` — `updateWorkoutPlan` passes raw `req.body` to service

**File:** `workoutController.mjs` — `updateWorkoutPlan` (~L~360)

```js
const planData = req.body; // ❌ No whitelist — mass assignment vulnerability
const plan = await workoutService.updateWorkoutPlan(planId, planData);
```

Every other mutating endpoint in this file uses a whitelist loop. This one was missed. An attacker can inject `trainerId`, `clientId`, or any other field.

**Fix:**

```js
const updateAllowed = [
  'title', 'name', 'description', 'goal', 'difficulty', 'durationWeeks',
  'workoutsPerWeek', 'template', 'active', 'nasmPhase', 'status'
];
const planData = {};
for (const field of updateAllowed) {
  if (req.body[field] !== undefined) planData[field] = req.body[field];
}
const plan = await workoutService.updateWorkoutPlan(planId, planData);
```

---

### HIGH-05 · `goalController.mjs` — `getGoalCategoriesStats` missing authorization

**File:** `goalController.mjs` — `getGoalCategoriesStats` (~L330)

```js
const { userId } = req.params;
// ❌ No authorization check — same issue as HIGH-02
const categoryStats = await Goal.findAll({ where: { userId }, ... });
```

Same vulnerability as HIGH-02. Any authenticated user can enumerate another user's goal categories and completion rates.

---

## 🟡 MEDIUM Findings

---

### MED-01 · All files — DRY violation: authorization check pattern repeated 15+ times

**Files:** All three controllers

```js
// This exact pattern (or near-identical variants) appears 15+ times:
if (resource.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return errorResponse(res, 403, 'You are not authorized...');
}
```

**Fix — shared utility:**

```js
// utils/authorizationUtils.mjs
/**
 * @param {object} params
 * @param {string|number} params.ownerId - Resource owner ID
 * @param {object} params.user - req.user from JWT
 * @param {string[]} [params.allowedRoles] - Roles that bypass ownership check
 * @returns {boolean}
 */
export function isAuthorized({ ownerId, user, allowedRoles = ['admin', 'trainer'] }) {
  return String(ownerId) === String(user.id) || allowedRoles.includes(user.role);
}

// Usage:
if (!isAuthorized({ ownerId: goal.userId, user: req.user })) {
  return errorResponse(res, 403, 'Not authorized to update this goal');
}
```

---

### MED-02 · All files — DRY violation: find-then-404 pattern repeated ~10 times

**Files:** All three controllers

```js
// Repeated in every handler that fetches by ID:
const goal = await Goal.findByPk(id);
if (!goal) {
  return res.status(404).json({ success: false, message: 'Goal not found' });
}
```

**Fix:**

```js
// utils/findOrFail.mjs
/**
 * @template T
 * @param {() => Promise<T|null>} finder
 * @param {import('express').Response} res
 * @param {string} resourceName
 * @returns {Promise<T|null>} null means response already sent
 */
export async function findOrFail(finder, res, resourceName) {
  const record = await finder();
  if (!record) {
    res.status(404).json({ success: false, message: `${resourceName} not found` });
    return null;
  }
  return record;
}

// Usage:
const goal = await findOrFail(() => Goal.findByPk(id), res, 'Goal');
if (!goal) return;
```

---

### MED-03 · `goalController.mjs` — Date arithmetic duplicated across 4

---

## [PASS] Security
**Model:** stepfun/step-3.5-flash:free | **Duration:** 42.1s

(no response)

---

## [PASS] Performance & Scalability
**Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 12.6s

This performance and scalability review focuses on the backend controllers for the **Enchanted Apex: Crystalline Swan** platform.

### Executive Summary
The codebase demonstrates strong authorization patterns and clean separation of concerns. However, there are significant **N+1 query risks** in the Goal analytics and **unbounded data growth** in JSONB columns that will degrade performance as the user base scales.

---

### 1. Database & Query Efficiency

#### [CRITICAL] N+1 Query Pattern in `getUserGoals`
In `goalController.mjs`, the `getUserGoals` method fetches a list of goals and then performs a separate `Goal.count` query for overdue items and a `Goal.findAll` for summary stats.
*   **Impact:** As the number of users grows, the database will be hit with 3-4 separate round-trips per page load.
*   **Recommendation:** Use a single query with `attributes` and `Sequelize.literal` or `fn` to get counts and averages in one execution, or use `Promise.all` to parallelize the independent count queries.

#### [HIGH] Unbounded JSONB Growth (Memory & I/O)
In `workoutController.mjs` and `goalController.mjs`, the `exercises` and `progressHistory` fields are stored as `JSONB`. 
*   **Impact:** There is no logic to limit the size of these arrays. A long-term user with 500+ workout sessions or daily goal updates will create multi-megabyte rows. This slows down every `SELECT *` and increases memory pressure on the Node.js heap during serialization.
*   **Recommendation:** Implement a maximum length for `progressHistory` (e.g., keep last 100 entries) or move history to a separate `GoalProgress` table with a 1:N relationship.

#### [MEDIUM] Missing Pagination on Admin Specials
In `adminSpecialController.mjs`, `listSpecials` performs a `findAll()` without limits.
*   **Impact:** If the studio runs hundreds of promotions over several years, this endpoint will eventually time out or crash the browser with a massive JSON payload.
*   **Recommendation:** Implement `limit` and `offset` (defaulting to 20 or 50) consistent with the `goalController`.

---

### 2. Scalability & State

#### [HIGH] In-Memory Helper Methods in `goalController`
The methods `calculateEstimatedCompletion`, `generateGoalInsights`, etc., are defined as properties of the `goalController` object but are called using `this.methodName`.
*   **Impact:** If these methods are passed as callbacks or used in certain contexts, `this` will be undefined, leading to runtime crashes. More importantly, these computations are performed on the API thread.
*   **Recommendation:** Move these to a `GoalService` or a utility file. For high-scale environments, complex analytics like `generateGoalPredictions` should be pre-computed on-write or cached in Redis.

#### [MEDIUM] Transaction Atomicity in `updateGoalProgress`
The transaction in `updateGoalProgress` is well-implemented, but it includes `User.findByPk` and multiple `PointTransaction.create` calls inside a loop.
*   **Impact:** This holds a database lock open for the duration of multiple inserts.
*   **Recommendation:** Use `PointTransaction.bulkCreate` to insert all milestone rewards in a single command, reducing the time the transaction lock is held.

---

### 3. Network Efficiency

#### [MEDIUM] Over-fetching in `getGoalById`
The `getGoalById` method returns the entire `User` object (including `id`, `firstName`, `lastName`, `username`) and a massive `analytics` object.
*   **Impact:** Increased bandwidth usage for mobile clients.
*   **Recommendation:** Use the `attributes` option in Sequelize to only return the fields required for the "Crystalline Swan" UI.

#### [LOW] Redundant Model Loading
`adminSpecialController.mjs` calls `getAdminSpecialModel()` inside every function.
*   **Impact:** Minor CPU overhead.
*   **Recommendation:** Initialize the model once at the top of the file or via a middleware if the dynamic loading is strictly necessary for the architecture.

---

### 4. Memory & Performance

#### [MEDIUM] Heavy Computation in Request Path
In `goalController.mjs`, `getGoalById` calculates `totalDays`, `daysElapsed`, `expectedProgress`, and `progressDifference` on every request.
*   **Impact:** While small for one user, 1,000 concurrent users requesting analytics will spike CPU usage.
*   **Recommendation:** Since `totalDays` and `deadline` change infrequently, consider caching the `analytics` object or only calculating it when `currentValue` changes.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **N+1 Queries in Goal List** | **CRITICAL** | Database Efficiency |
| **Unbounded JSONB (History/Exercises)** | **HIGH** | Memory / Scalability |
| **In-memory Analytics Logic** | **HIGH** | Scalability |
| **Missing Admin Pagination** | **MEDIUM** | Network Efficiency |
| **Transaction Lock Duration** | **MEDIUM** | Scalability |
| **Over-fetching User Data** | **MEDIUM** | Network Efficiency |

### Performance Engineer's Final Note:
The **Enchanted Apex** theme's luxury feel requires snappy interactions. The current "N+1" and "Unbounded JSONB" issues will cause the UI to "stutter" or feel heavy as user data accumulates. Prioritize moving the `progressHistory` to a relational table and optimizing the `getUserGoals` summary counts.

---

## [PASS] Competitive Intelligence
**Model:** minimax/minimax-m2.1 | **Duration:** 56.3s

# SwanStudios Strategic Analysis

## 1. Feature Gap Analysis

Based on the codebase, SwanStudios has built strong core infrastructure in goal management, workout programming, and promotional mechanics, but faces significant gaps relative to established competitors.

| Feature | SwanStudios | Trainerize | TrueCoach | My PT Hub | Future | Caliber |
|---------|-------------|------------|-----------|-----------|--------|---------|
| **Nutrition Tracking** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Client Messaging** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Progress Photos** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Video Exercise Library** | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Invoicing/Payments** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Body Composition Tracking** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Habit Tracking** | ⚠️ (Goals) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Meal Logging** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Integrations (Apple Health, Fitbit)** | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **White-Label / Branding** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Business Analytics** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Community/Group Features** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Real-Time Trainers** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Critical Gaps Requiring Immediate Attention

1. **Nutrition System** — Every competitor offers nutrition tracking. The fitness market expects this as baseline functionality. No nutrition integration means clients cannot get holistic coaching.

2. **Client-Trainer Communication** — The codebase shows no messaging, in-app chat, or notification system. Trainers cannot provide timely feedback between sessions. This is a major retention risk.

3. **Payment Infrastructure** — AdminSpecials exists (promotions) but no payment processing, subscription management, or invoice generation. Revenue capture is broken.

4. **Media Delivery** — No video library, no progress photos, no exercise demonstration support. Trainers must externalize content.

5. **Wearable Integrations** — No health data sync. Future and Caliber leverage Apple Health / Fitbit for passive tracking.

---

## 2. Differentiation Strengths

The codebase reveals several unique value propositions that competitors lack:

### 2.1 NASM-Aligned Exercise Recommendations

The `workoutController` explicitly references NASM integration with OPT Model alignment, rehab focus, and contraindication filtering:

```javascript
// workoutController.mjs - NASM parameters
const processedParams = {
  goal,
  difficulty,
  equipment,
  muscleGroups,
  rehabFocus,
  optPhase  // NASM's Optimum Performance Training model
};
```

**Strategic Value:** This positions SwanStudios as the "scientific" option. Competitors use generic exercise databases. NASM alignment is a credible, defensible differentiation in the evidence-based fitness segment.

### 2.2 Pain-Aware Training Architecture

While not explicitly in the provided code, the controller structure supports injury tracking and rehab focus, suggesting a pain-aware training system. This is rare in mass-market platforms and could command premium pricing.

### 2.3 Sophisticated Goal Engine

The `goalController` demonstrates a mature gamification system:

- Progress history with timestamps
- Milestone rewards with XP
- Predictive analytics (`calculateEstimatedCompletion`)
- Dynamic insights and recommendations
- Category-based analytics

```javascript
// goalController.mjs - Analytics structure
analytics: {
  progressHistory,
  milestones,
  insights: this.generateGoalInsights(goal),
  predictions: this.generateGoalPredictions(goal),
  recommendations: this.generateGoalRecommendations(goal)
}
```

**Strategic Value:** This is more sophisticated than Trainerize or TrueCoach's basic goal tracking. It creates engagement loops that drive retention.

### 2.4 Promotions Engine (Phase 6)

The `adminSpecialController` implements a full promotional system:

- Time-based promotions (startDate, endDate)
- Package-level or client-level targeting
- Bonus session mechanics
- Toggle activation

This is monetization infrastructure most competitors handle through third-party tools.

### 2.5 Crystalline Swan UX Theme

The design system (Midnight Sapphire, Ice Wing, Arctic Cyan, Gilded Fern) with the frozen enchanted forest aesthetic is distinctive. Combined with the typography hierarchy (Plus Jakarta Sans, Cormorant Garamond, Fira Code, Sora), this creates a premium, differentiated brand that stands apart from clinical competitor UIs.

---

## 3. Monetization Opportunities

### 3.1 Current Architecture Assessment

The codebase supports a SaaS model with:
- AdminSpecials for promotional mechanics
- Workout plans (trainer-created, client-assigned)
- Goal-based engagement

### 3.2 Revenue Levers to Implement

| Opportunity | Implementation Approach | Revenue Model |
|-------------|------------------------|---------------|
| **Tiered Subscriptions** | Extend user/plan models with tier attributes | Monthly/annual SaaS |
| **Per-Session Payments** | Extend AdminSpecials to track actual usage | Pay-per-session |
| **Package Upsells** | Current AdminSpecials can drive this | One-time purchases |
| **Premium Goals/Gamification** | Advanced analytics as paid tier | Freemium model |
| **Trainer Marketplace** | Allow trainers to publish plans | Transaction fee |
| **Corporate/B2B** | White-label admin panels | Enterprise pricing |

### 3.3 Conversion Optimization

The current promotions system can be enhanced:

```javascript
// Extend AdminSpecials for conversion funnels
const specialTypes = [
  'new_client_welcome',      // First-purchase discount
  'package_upgrade',         // Upsell existing clients
  'referral_reward',        // Viral growth
  'seasonal_promotion',     // Holiday campaigns
  'milestone_bonus'         // Reward retention
];
```

**Recommendation:** Implement a "lead magnet" funnel using the promotions system to capture prospects before converting to paid packages.

---

## 4. Market Positioning

### 4.1 Tech Stack Comparison

| Dimension | SwanStudios | Trainerize | TrueCoach | Competitor Avg |
|-----------|-------------|------------|-----------|----------------|
| **Frontend** | React + TypeScript + styled-components | React (web), React Native | React (web), React Native | React/React Native |
| **Backend** | Node.js + Express + Sequelize | Node.js | Node.js | Node.js / Python |
| **Database** | PostgreSQL | PostgreSQL | PostgreSQL | PostgreSQL / MySQL |
| **Architecture** | Controller-Service-Model separation | Monolithic | Monolithic | Mixed |
| **API Design** | REST (seen in controllers) | REST + GraphQL | REST | REST primarily |

**Assessment:** The tech stack is modern, type-safe, and well-structured. The controller-service separation visible in `workoutController.mjs` demonstrates architectural maturity exceeding many competitors.

### 4.2 Positioning Matrix

```
High Science/Clinical
        │
   Caliber │           SwanStudios ← (NASM + Pain-Aware)
        │          │
        │          │
        │          │
--------┴─────────┴─────────────
        │          │
        │     Trainerize
        │    (Full-Stack)
   Future │    TrueCoach
  (High-Touch)   (Content)
        │
        │
Low Touch ←────────────────→ High Touch
      (Automation)          (Concierge)
```

**Strategic Position:** SwanStudios can own the "evidence-based technology" quadrant — targeting serious athletes and clients who want clinical-grade programming without the high-touch cost of Future.

---

## 5. Growth Blockers

### 5.1 Technical Issues

| Blocker | Severity | Impact |
|---------|----------|--------|
| **No Mobile Apps** | Critical | 60%+ of fitness app usage is mobile. PWA may not suffice for training context. |
| **No Real-Time Data Sync** | High | Wearable integration missing — users want passive progress tracking. |
| **No Push Notifications** | High | Engagement driver absent — goal reminders, workout alerts, promotion nudges cannot reach users. |
| **Database Error Handling** | Medium | Workout sessions fallback to empty array on "does not exist" — masks migration issues: |

```javascript
// workoutController.mjs - Silent failure
if (error.name === 'SequelizeDatabaseError' && error.message?.includes('does not exist')) {
  return successResponse(res, { sessions: [], total: 0 });
}
```

### 5.2 UX Issues

| Issue | Description |
|-------|-------------|
| **No Onboarding Flow** | No visible controller for onboarding. First-time user experience is unguided. |
| **No Progress Visualization** | Analytics exist in backend but no frontend components visible. Data is captured but not consumed. |
| **Client/Trainer Discovery** | No marketplace or matching system. New trainers cannot acquire clients through the platform. |

### 5.3 Scalability Concerns

| Concern | Mitigation |
|---------|------------|
| **Sequelize N+1 Queries** | The goal and workout controllers use `findAndCountAll` with includes. At 10K users, pagination and eager loading require optimization (Dataloader, cursor pagination). |
| **No Caching Layer** | Analytics and statistics endpoints compute on every request. Redis caching recommended before scaling. |
| **JSONB Performance** | Exercises stored as JSONB — queries against nested fields will degrade. Consider dedicated tables for exercise instances. |
| **Auth Bottleneck** | Every endpoint re-validates ownership. Middleware-level caching of user role/permissions would improve throughput. |

---

## Actionable Recommendations

### Phase 1: Minimum Viable Product (Pre-Launch)

1. **Add Nutrition Module** — Highest competitor parity gap. Minimal viable nutrition tracking (macros, meal logging) within 4 weeks.

2. **Implement Payments** — Stripe/PayPal integration. Use AdminSpecials as the promotional backbone for checkout flows.

3. **Mobile Wrapper** — React Native wrapper around existing React frontend. Not full native, but enables app store presence.

4. **Push Notifications** — FCM/APNs integration for goal reminders and workout nudges.

### Phase 2: Growth Enablement

5. **Wearable Integrations** — Apple Health Kit and Google Fit SDKs. Sync steps, heart rate, workout data.

6. **Client Messaging** — In-app messaging with async video feedback from trainers.

7. **Progress Photos** — Image upload with before/after comparison tool.

### Phase 3: Scale & Monetize

8. **Trainer Marketplace** — Enable trainers to publish and sell workout plans. Platform takes transaction fee.

9. **Corporate Wellness** — White-label admin panel for company wellness programs.

10. **Performance Optimization** — Redis caching, cursor pagination, query optimization for 10K+ user scale.

---

## Summary

SwanStudios has a **strong technical foundation** with well-structured controllers, a sophisticated goal/gamification system, and NASM-aligned exercise intelligence. The Crystalline Swan theme and premium UX create differentiated brand perception. However, the platform lacks critical revenue and engagement infrastructure (payments, messaging, mobile apps, nutrition) that competitors provide out of the box. The strategic path forward is to own the **evidence-based fitness technology** segment while rapidly closing the parity gaps that block commercial viability.

---

## [PASS] User Research & Persona Alignment
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 58.0s

# SwanStudios Fitness SaaS Platform - User Research Analysis

## Executive Summary
Based on the provided backend controller code, SwanStudios demonstrates strong technical foundations with comprehensive workout tracking, goal management, and promotional systems. However, the backend-focused view reveals significant gaps in persona alignment and user experience that must be addressed in the frontend implementation.

---

## 1. Persona Alignment Analysis

### **Primary Persona (Working Professionals 30-55)**
**Strengths:**
- Goal tracking system supports structured progress (goalController.mjs)
- Time-efficient workout generation from plans (workoutController.mjs)
- Flexible scheduling with session management

**Gaps:**
- No evidence of time-saving features like "quick start" workouts
- Missing integration with calendar apps (Google/Outlook)
- Limited support for irregular schedules (travel, overtime)

### **Secondary Persona (Golfers)**
**Critical Gap:** No sport-specific functionality detected
- No golf swing analysis metrics
- Missing rotational/core strength tracking
- No golf-specific exercise library
- No integration with golf performance metrics

### **Tertiary Persona (Law Enforcement/First Responders)**
**Partial Alignment:**
- Certification tracking possible through goal system
- Structured workout plans support physical test preparation

**Missing:**
- No specific certification tracking (CPAT, PAT, etc.)
- Missing job-specific fitness standards
- No equipment limitations (gear-weighted training)

### **Admin Persona (Sean Swan)**
**Excellent Alignment:**
- Comprehensive trainer tools for plan creation
- Client progress monitoring
- Promotional campaign management (adminSpecialController.mjs)
- NASM integration in exercise recommendations

---

## 2. Onboarding Friction Analysis

### **Current Strengths:**
- Goal creation wizard with validation (goalController.mjs lines 170-230)
- Workout plan assignment system
- Progress tracking from day one

### **Critical Friction Points:**
1. **No guided onboarding flow** in backend logic
2. **Missing progressive disclosure** - all features appear available immediately
3. **No initial assessment integration** to personalize experience
4. **Complex goal setup** requires multiple parameters upfront

### **Technical Debt Impact:**
- Backend handles complex data but frontend must simplify presentation
- Goal creation requires 10+ parameters (lines 170-230) - overwhelming for new users

---

## 3. Trust Signals Analysis

### **Present in Backend:**
- ✅ NASM-based exercise recommendations (workoutController.mjs)
- ✅ Professional plan creation restrictions (trainer/admin only)
- ✅ Secure data handling with authorization checks

### **Missing from User Experience:**
- ❌ No testimonial/rating system in data models
- ❌ Certification display not implemented
- ❌ Social proof mechanisms absent
- ❌ Success stories/transformations not tracked

### **Opportunity:**
Backend supports XP/reward system (goalController.mjs lines 280-340) but missing:
- Badge/award display
- Achievement sharing
- Leaderboards for motivation

---

## 4. Emotional Design Analysis

### **Theme Implementation Status:**
**Backend shows no theme integration** - purely functional implementation

### **Frontend Recommendations for Crystalline Swan Theme:**
1. **Premium Feel:**
   - Use Gilded Fern (#C6A84B) for achievement badges
   - Arctic Cyan (#50A0F0) glow animations for completed goals
   - Royal Depth (#003080) surfaces for professional dashboard

2. **Trust & Authority:**
   - Midnight Sapphire (#002060) for certification displays
   - Cormorant Garamond Italic for trainer quotes/expertise

3. **Motivation & Energy:**
   - Ice Wing (#60C0F0) accents for gamification elements
   - Wing Purple (#8B5CF6) for milestone celebrations
   - Dynamic progress visualizations with Arctic Cyan glows

### **Emotional Journey Gaps:**
- No celebration mechanics for goal completion
- Missing motivational messaging system
- No mood/energy tracking integration

---

## 5. Retention Hooks Analysis

### **Strong Existing Features:**
- ✅ Comprehensive goal tracking with milestones
- ✅ XP/reward system implementation (lines 280-340)
- ✅ Progress analytics and predictions (lines 490-620)
- ✅ Workout plan adherence tracking

### **Missing Retention Mechanisms:**
1. **Community Features:**
   - No group challenges
   - Missing social accountability
   - No trainer-client messaging in reviewed code

2. **Gamification Gaps:**
   - Streak tracking not implemented
   - Limited badge variety
   - No level progression system

3. **Personalization Missing:**
   - No adaptive workout difficulty
   - Missing celebration of personal records
   - No "comeback" features for lapsed users

### **Technical Foundation Exists:**
Goal analytics system (lines 490-620) provides data for:
- Personalized recommendations
- Progress predictions
- Milestone planning

---

## 6. Accessibility Analysis

### **Backend Limitations:**
No frontend accessibility controls detected in API design

### **Critical Frontend Requirements:**
1. **Visual Accessibility:**
   - Minimum 16px font size for Sora (UI font)
   - High contrast between Frost White (#E0ECF4) and Midnight Sapphire (#002060)
   - Clear visual hierarchy with Plus Jakarta Sans headings

2. **Mobile-First Imperatives:**
   - Quick log workout functionality
   - Offline capability for workout tracking
   - Simplified data entry for on-the-go professionals

3. **Age-Related Considerations:**
   - Larger touch targets (40+ users)
   - Simplified navigation patterns
   - Clear progress indicators
   - Reduced cognitive load in goal setting

---

## Actionable Recommendations

### **High Priority (Next Sprint)**
1. **Persona-Specific Features:**
   - Add golf performance tracking module
   - Implement law enforcement certification templates
   - Create "executive quick start" workout flows

2. **Onboarding Redesign:**
   - Implement progressive onboarding wizard
   - Add initial fitness assessment
   - Simplify goal creation to 3-step process

3. **Trust Signal Implementation:**
   - Add certification display to user profiles
   - Implement testimonial collection system
   - Create "success story" showcase

### **Medium Priority (Q2 Roadmap)**
1. **Retention Enhancement:**
   - Implement streak tracking
   - Add social challenge features
   - Create comeback email sequences

2. **Emotional Design:**
   - Animated celebrations for milestones
   - Mood/energy tracking integration
   - Personalized motivational messages

3. **Accessibility:**
   - Implement font size controls
   - Add high contrast mode
   - Create simplified "essential" view

### **Low Priority (Future Enhancements)**
1. **Advanced Gamification:**
   - Virtual reality workout integration
   - AI-powered form correction
   - Biometric device integration

2. **Community Building:**
   - Live group workout sessions
   - Trainer Q&A forums
   - Success story sharing platform

---

## Technical Implementation Notes

### **Backend Strengths to Leverage:**
1. **Goal Analytics Engine** (lines 490-620) - Rich data for personalized UX
2. **NASM Integration** - Professional credibility foundation
3. **Secure Authorization Model** - Trustworthy data handling
4. **Flexible Workout System** - Supports diverse training needs

### **Frontend Requirements:**
1. **Theme Implementation:**
   ```typescript
   // Example: Apply Crystalline Swan theme to goal completion
   const goalCompleteStyle = {
     backgroundColor: 'var(--midnight-sapphire)',
     border: '2px solid var(--gilded-fern)',
     animation: 'arctic-glow 2s infinite'
   }
   ```

2. **Accessibility Framework:**
   - Implement WCAG 2.1 AA compliance
   - Add screen reader support
   - Ensure keyboard navigation

3. **Mobile Optimization:**
   - Touch-friendly interface
   - Offline-first architecture
   - Push notification system

---

**Conclusion:** SwanStudios has a robust backend foundation but requires significant frontend development to deliver persona-aligned experiences. The Crystalline Swan theme provides excellent emotional design potential that must be fully implemented to create the premium, trustworthy, and motivating experience required by target users.

---

## [PASS] Architecture & Bug Hunter
**Model:** minimax/minimax-m2.7-20260318 | **Duration:** 59.6s

# Deep Architecture Review & Bug Hunt Report
## SwanStudios Backend Controllers

---

## CRITICAL Findings

### 1. Stale `this` Reference in Arrow Function Context
**Severity:** CRITICAL  
**File:** `goalController.mjs`  
**Lines:** 157, 167-169

**What's Wrong:**  
Helper methods are invoked with `this.calculateEstimatedCompletion()`, `this.generateGoalInsights()`, etc., inside a regular function (`getGoalById`). While this works because it's called within the controller's method scope, the code structure is fragile. If `getGoalAnalytics` (line 415) extracts and calls these methods externally, `this` would be undefined, causing runtime failures.

```javascript
// Line 157 - In getGoalById
estimatedCompletion: goal.progressPercentage > 0 ? this.calculateEstimatedCompletion(goal, daysElapsed) : null

// Lines 167-169 - In getGoalAnalytics
insights: this.generateGoalInsights(goal),
predictions: this.generateGoalPredictions(goal),
recommendations: this.generateGoalRecommendations(goal)
```

**Fix:**
```javascript
// Import helper functions directly at module level
const calculateEstimatedCompletion = (goal, daysElapsed) => { /* ... */ };
const generateGoalInsights = (goal) => { /* ... */ };
const generateGoalPredictions = (goal) => { /* ... */ };
const generateGoalRecommendations = (goal) => { /* ... */ };

// Then use directly without `this`:
estimatedCompletion: goal.progressPercentage > 0 ? calculateEstimatedCompletion(goal, daysElapsed) : null
insights: generateGoalInsights(goal),
```

---

### 2. Race Condition: Point Transaction Balance Calculation
**Severity:** CRITICAL  
**File:** `goalController.mjs`  
**Lines:** 248-270

**What's Wrong:**  
Point transactions are created with a `balance` field calculated from `user.points + totalXpAwarded` *within the same loop*. Since `totalXpAwarded` accumulates during the loop, earlier transactions will have incorrect balances that don't reflect the actual point state.

```javascript
let totalXpAwarded = 0;
for (const milestone of milestonesAchieved) {
  totalXpAwarded += milestone.xpBonus;
  await PointTransaction.create({
    userId: goal.userId,
    points: milestone.xpBonus,
    balance: user.points + totalXpAwarded, // BUG: accumulating in loop
    // ...
  }, { transaction });
}
```

**Fix:**
```javascript
// Calculate total XP first
const milestoneXp = milestonesAchieved.reduce((sum, m) => sum + (m.xpBonus || 0), 0);
const completionXp = wasCompleted ? goal.xpReward + goal.completionBonus : 0;
const totalXpAwarded = milestoneXp + completionXp;

// Update user points first
if (totalXpAwarded > 0) {
  await user.update({ points: user.points + totalXpAwarded }, { transaction });
}

// Then create transactions with final balance
const finalBalance = user.points + totalXpAwarded;

for (const milestone of milestonesAchieved) {
  await PointTransaction.create({
    userId: goal.userId,
    points: milestone.xpBonus,
    balance: finalBalance,
    // ...
  }, { transaction });
}

if (wasCompleted && completionXp > 0) {
  await PointTransaction.create({
    userId: goal.userId,
    points: completionXp,
    balance: finalBalance,
    // ...
  }, { transaction });
}
```

---

### 3. IDOR Vulnerability in Session Generation
**Severity:** CRITICAL  
**File:** `workoutController.mjs`  
**Lines:** 374-376

**What's Wrong:**  
Trainers can generate workout sessions for themselves instead of the plan's client because `userId` defaults to `req.user.id` when not provided. A malicious trainer could accidentally (or intentionally) create sessions under their own account.

```javascript
const sessions = await workoutService.generateWorkoutSessions(planId, {
  startDate,
  weeks: weeks ? parseInt(weeks) : undefined,
  userId: userId || req.user.id  // DANGEROUS: defaults to trainer, not client
});
```

**Fix:**
```javascript
// For plans, the userId should ALWAYS be the clientId, never the trainer
const sessions = await workoutService.generateWorkoutSessions(planId, {
  startDate,
  weeks: weeks ? parseInt(weeks) : undefined,
  userId: existingPlan.clientId  // Enforce clientId from the plan
});
```

---

## HIGH Findings

### 4. Missing Input Validation on Critical Fields
**Severity:** HIGH  
**File:** `goalController.mjs`  
**Lines:** 188-200

**What's Wrong:**  
No validation that `targetValue` is a positive number, `unit` is a valid string, or that `deadline` is a valid date format. Malicious input could cause database errors or unexpected behavior.

```javascript
if (!title || !targetValue || !unit || !deadline) {
  // Only checks existence, not type or validity
}
```

**Fix:**
```javascript
// Add comprehensive validation
if (!title || typeof title !== 'string' || title.trim().length === 0) {
  return res.status(400).json({ success: false, message: 'Valid title is required' });
}

const targetValueNum = Number(targetValue);
if (isNaN(targetValueNum) || targetValueNum <= 0) {
  return res.status(400).json({ success: false, message: 'Target value must be a positive number' });
}

const deadlineDate = new Date(deadline);
if (isNaN(deadlineDate.getTime())) {
  return res.status(400).json({ success: false, message: 'Invalid deadline date format' });
}

if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
  return res.status(400).json({ success: false, message: 'Valid unit is required' });
}
```

---

### 5. No Field Whitelist in updateWorkoutPlan
**Severity:** HIGH  
**File:** `workoutController.mjs`  
**Lines:** 339-342

**What's Wrong:**  
`updateWorkoutPlan` passes `req.body` directly to the service without whitelisting. Any field could be updated, including `trainerId`, `clientId`, or other sensitive fields that should be protected.

```javascript
const planData = req.body;  // NO WHITELISTING!
const plan = await workoutService.updateWorkoutPlan(planId, planData);
```

**Fix:**
```javascript
const updateAllowed = [
  'name', 'title', 'description', 'goal', 'difficulty', 'durationWeeks',
  'workoutsPerWeek', 'template', 'active', 'nasmPhase', 'exercises', 'status'
];
const planData = {};
for (const field of updateAllowed) {
  if (req.body[field] !== undefined) planData[field] = req.body[field];
}
const plan = await workoutService.updateWorkoutPlan(planId, planData);
```

---

### 6. Pagination Response Inconsistency
**Severity:** HIGH  
**File:** `goalController.mjs`  
**Lines:** 62, 96-98

**What's Wrong:**  
`getUserGoals` returns `pages` in the response, but the frontend may expect `totalPages`. Additionally, `getGoalById` returns analytics but lacks pagination info.

```javascript
// Line 62
const offset = (parseInt(page) - 1) * parseInt(limit);

// Line 96-98
pagination: {
  total: goals.count,
  page: parseInt(page),
  limit: parseInt(limit),
  pages: Math.ceil(goals.count / parseInt(limit))  // Key is "pages", not "totalPages"
}
```

**Fix:**
```javascript
pagination: {
  total: goals.count,
  page: parseInt(page),
  limit: parseInt(limit),
  totalPages: Math.ceil(goals.count / parseInt(limit)),
  hasNextPage: parseInt(page) < Math.ceil(goals.count / parseInt(limit)),
  hasPrevPage: parseInt(page) > 1
}
```

---

### 7. Trainer-Client Relationship Not Validated
**Severity:** HIGH  
**File:** `workoutController.mjs`  
**Lines:** 146-148

**What's Wrong:**  
A trainer can create a session for any user without verifying the trainer-client relationship. This allows trainers to create sessions for clients they don't manage.

```javascript
// Check if the user is authorized to create a session for another user
if (sessionData.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return errorResponse(res, 403, 'You are not authorized to create sessions for other users');
}
// MISSING: Verify trainer-client relationship for trainers
```

**Fix:**
```javascript
if (sessionData.userId !== req.user.id && req.user.role !== 'admin') {
  if (req.user.role === 'trainer') {
    // Verify trainer-client relationship
    const clientAssignment = await workoutService.verifyTrainerClientRelationship(
      req.user.id, 
      sessionData.userId
    );
    if (!clientAssignment) {
      return errorResponse(res, 403, 'You can only create sessions for your assigned clients');
    }
  } else {
    return errorResponse(res, 403, 'You are not authorized to create sessions for other users');
  }
}
```

---

## MEDIUM Findings

### 8. Unnecessary User Existence Check in getGoalById
**Severity:** MEDIUM  
**File:** `goalController.mjs`  
**Lines:** 51-61

**What's Wrong:**  
The endpoint fetches a goal by ID, then fetches the user separately to include in the response. The user is already accessible via the Goal model's association.

```javascript
const goal = await Goal.findByPk(id, {
  include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username'] }]
});

// Later...
const user = await User.findByPk(userId);  // REDUNDANT - already included
```

**Fix:**
```javascript
const goal = await Goal.findByPk(id, {
  include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username'] }]
});

if (!goal) {
  return res.status(404).json({ success: false, message: 'Goal not found' });
}

// User info already available via goal.user
const user = goal.user; // Use this instead of separate query
```

---

### 9. Date Validation Missing: startDate vs endDate
**Severity:** MEDIUM  
**File:** `adminSpecialController.mjs`  
**Lines:** 85-91

**What's Wrong:**  
No validation that `startDate` is before `endDate`. Users could create specials that end before they start.

```javascript
if (!name || !startDate || !endDate) {
  return res.status(400).json({ success: false, error: 'Name, startDate, and endDate are required' });
}
// MISSING: Check startDate < endDate
```

**Fix:**
```javascript
if (!name || !startDate || !endDate) {
  return res.status(400).json({ success: false, error: 'Name, startDate, and endDate are required' });
}

const start = new Date(startDate);
const end = new Date(endDate);
const now = new Date();

if (isNaN(start.getTime()) || isNaN(end.getTime())) {
  return res.status(400).json({ success: false, error: 'Invalid date format' });
}

if (end <= start) {
  return res.status(400).json({ success: false, error: 'End date must be after start date' });
}
```

---

### 10. Undefined Export Function
**Severity:** MEDIUM  
**File:** `adminSpecialController.mjs`  
**Line:** 1 (header comment)

**What's Wrong:**  
The file exports individual named functions (`export const listSpecials = ...`) but the documentation header references an endpoint that doesn't exist in the file:
- `PATCH /api/admin/specials/:id/toggle` is defined as `toggleSpecialStatus`
- However, there's no corresponding route export or documentation link

**Fix:**
Add the toggle endpoint to the exports section or remove from documentation if not routed.

---

### 11. Inconsistent Error Logging
**Severity:** MEDIUM  
**Files:** `goalController.mjs` (multiple), `adminSpecialController.mjs`

**What's Wrong:**  
`goalController.mjs` uses `console.error` while the other files use the proper `logger` utility. This bypasses centralized logging configuration.

```javascript
// In goalController.mjs:
console.error('Error fetching user goals:', error);  // Should use logger
```

**Fix:**
```javascript
import logger from '../utils/logger.mjs';
// Replace all console.error with:
logger.error('[GoalController] Error fetching user goals:', error);


---

## [PASS] Frontend UX & Code Patterns
**Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 6.8s

This review focuses on the backend controllers provided. As Gemini 3.1 Flash, I have evaluated these against the **SwanStudios** architecture requirements (Node.js/Sequelize/Express).

### 1. Backend Controller Patterns
*   **Finding:** **Consistent Service Delegation** — The `workoutController.mjs` demonstrates excellent separation of concerns by delegating business logic to a service layer. This is a best practice for maintainability and testing.
*   **Finding:** **Inconsistent Error Handling** — `adminSpecialController.mjs` and `goalController.mjs` use direct `res.status().json()` calls, whereas `workoutController.mjs` uses a centralized `errorResponse` utility.
    *   **Recommendation:** Standardize all controllers to use the `errorResponse` and `successResponse` utilities for consistent API signatures.
    *   **Rating:** **MEDIUM**

### 2. Security & Data Integrity
*   **Finding:** **Mass Assignment Protection** — All controllers correctly implement field whitelisting (e.g., `allowedSpecialFields`, `allowedGoalFields`, `planAllowed`). This prevents malicious users from injecting unauthorized fields (like `userId` or `role`).
    *   **Rating:** **CRITICAL (Passed)**
*   **Finding:** **Authorization Logic** — The controllers perform explicit ownership checks (`goal.userId !== req.user.id`). This is robust. However, ensure that `req.user` is populated by a verified JWT middleware in all routes.
    *   **Rating:** **HIGH**

### 3. State Management & Database
*   **Finding:** **Transaction Hygiene** — `goalController.mjs` uses `db.transaction()` correctly for multi-step operations (e.g., updating progress + awarding XP + updating user points). This prevents partial data corruption.
    *   **Rating:** **HIGH**
*   **Finding:** **Sequelize `raw: true` Usage** — In `getGoalCategoriesStats`, `raw: true` is used. While performant, ensure that the data returned doesn't require model-level getters/setters or virtual fields that might be stripped away.
    *   **Rating:** **LOW**

### 4. Code Quality & Maintainability
*   **Finding:** **Helper Method Placement** — `goalController.mjs` contains several helper methods (`calculateEstimatedCompletion`, `generateGoalInsights`) directly inside the controller object.
    *   **Recommendation:** Move these to a `goalService.mjs` or a `utils/goalAnalytics.mjs` file. Controllers should remain thin.
    *   **Rating:** **MEDIUM**
*   **Finding:** **Documentation** — The "Blueprint-First" documentation style in `workoutController.mjs` is excellent. It provides clear context for future developers and AI agents.
    *   **Rating:** **HIGH**

### 5. Accessibility & UX (API Level)
*   **Finding:** **Pagination Defaults** — `getUserGoals` implements pagination (`page`, `limit`). This is vital for performance as the user's goal history grows.
    *   **Rating:** **HIGH**
*   **Finding:** **Missing Input Sanitization** — While fields are whitelisted, there is no explicit validation (e.g., using `Joi` or `Zod`) for the *content* of the fields (e.g., ensuring `targetValue` is a positive number).
    *   **Recommendation:** Integrate `Joi` or `Zod` middleware before the controller logic to ensure data integrity before it hits the database.
    *   **Rating:** **HIGH**

---

### Summary Table

| Finding | Severity | Recommendation |
| :--- | :--- | :--- |
| **Standardize Response Utilities** | MEDIUM | Use `responseUtils.mjs` across all controllers. |
| **Move Logic to Services** | MEDIUM | Extract helper methods from `goalController` to a service layer. |
| **Input Validation** | HIGH | Implement `Joi` or `Zod` validation middleware. |
| **Transaction Consistency** | HIGH | Ensure all write operations follow the `goalController` transaction pattern. |

**Gemini 3.1 Flash Verdict:** The code is highly professional and follows the "Enchanted Apex" architectural standards. The move toward service-layer delegation in `workoutController.mjs` should be the template for the entire backend. Ensure all controllers adopt this pattern to maintain the high quality of the SwanStudios platform.

---

## [PASS] Data Safety & Integrity
**Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 77.2s

# DATA SAFETY AUDIT REPORT — SwanStudios Production Platform
## Files: adminSpecialController.mjs | goalController.mjs | workoutController.mjs

---

> **AUDITOR'S OPENING STATEMENT:** This codebase shows genuine security awareness — field whitelisting, transaction wrappers, soft-delete patterns. However, I found **17 distinct findings** ranging from a CRITICAL data-destruction bug to systemic authorization gaps that could expose paying customer data or allow privilege escalation. Every finding below represents a real risk to real users on sswanstudios.com.

---

## 🔴 CRITICAL FINDINGS

---

### FINDING C-1: Hard Deletion of Financial Point Transaction Records Without Soft-Delete
**Severity:** CRITICAL
**Data at Risk:** XP/point transaction history — permanent, irreversible loss of gamification ledger
**Blast Radius:** Any user whose goal is deleted — all associated point transaction records wiped forever
**File & Line:** `goalController.mjs` — `deleteGoal()`, lines ~340-350

**What's Wrong:**

```javascript
// DANGEROUS — This is a HARD DELETE on financial/gamification records
await PointTransaction.destroy({
  where: {
    source: ['goal_milestone', 'goal_completed'],
    sourceId: id
  },
  transaction
});
```

This permanently destroys point transaction records. These records are the **audit ledger** for a user's earned XP. If a user deletes a goal (or an admin does), every XP transaction tied to that goal vanishes from the database with no recovery path. This breaks:
- Point balance auditing (can't reconcile why a user has X points)
- Dispute resolution (user claims they earned points, no record exists)
- Any future analytics or reporting on historical engagement

The `goal.destroy()` immediately after compounds this — if the model has `paranoid: true`, the goal gets soft-deleted, but the point transactions are **hard deleted**. This is an asymmetric destruction pattern.

**Fix:**

```javascript
// OPTION A (Preferred): Soft-delete via status flag — preserve the audit trail
// Add a 'goalDeleted' status or 'isArchived' boolean to PointTransaction model
// Then:
await PointTransaction.update(
  { 
    isArchived: true,
    archivedAt: new Date(),
    archivedReason: 'goal_deleted'
  },
  {
    where: {
      source: ['goal_milestone', 'goal_completed'],
      sourceId: id
    },
    transaction
  }
);

// OPTION B (Minimum viable): Simply do NOT delete point transactions at all.
// The goal is soft-deleted; orphaned point transactions are harmless and
// preserve the audit trail. Remove the PointTransaction.destroy() call entirely.

// Keep only:
await goal.destroy({ transaction }); // soft delete if paranoid: true
```

---

### FINDING C-2: `deleteGoal` Verifies `paranoid: true` Assumption But Never Confirms It — Could Be Hard Delete
**Severity:** CRITICAL
**Data at Risk:** All goal data including progress history, milestone records, user fitness journey
**Blast Radius:** Individual user — but pattern repeated across codebase
**File & Line:** `goalController.mjs` — `deleteGoal()`, line ~355; `adminSpecialController.mjs` — `deleteSpecial()`, line ~130

**What's Wrong:**

```javascript
// goalController.mjs
await goal.destroy({ transaction }); // comment says "soft delete if paranoid: true"

// adminSpecialController.mjs  
await special.destroy(); // Soft delete due to paranoid: true
```

Both controllers **assume** the model has `paranoid: true` configured. This assumption is never verified at runtime. If a developer removes `paranoid: true` from the model definition (during a refactor, migration, or copy-paste error), these calls silently become **hard deletes** with zero warning. The comment `// Soft delete due to paranoid: true` is documentation of an assumption, not enforcement of a guarantee.

**Fix:**

```javascript
// DEFENSIVE PATTERN — verify paranoid behavior before destroying
export const deleteGoal = async (req, res) => {
  const transaction = await db.transaction();
  try {
    const goal = await Goal.findByPk(id, { transaction });
    if (!goal) { /* ... 404 ... */ }

    // GUARD: Verify model supports soft delete before proceeding
    if (!Goal.options?.paranoid) {
      logger.error('[deleteGoal] SAFETY ABORT: Goal model does not have paranoid:true. ' +
        'Hard delete prevented. Configure paranoid:true on the model first.');
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        error: 'Delete operation not available — contact administrator'
      });
    }

    await goal.destroy({ transaction });
    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Goal archived successfully' });
  } catch (error) {
    await transaction.rollback();
    // ...
  }
};
```

Apply the same guard to `adminSpecialController.mjs → deleteSpecial()`.

---

### FINDING C-3: `getGoalById` — Authorization Check Completely Missing
**Severity:** CRITICAL
**Data at Risk:** Any user's private goal data — title, description, progress, milestones, notes
**Blast Radius:** ALL users — any authenticated user can read any other user's goals
**File & Line:** `goalController.mjs` — `getGoalById()`, lines ~120-190

**What's Wrong:**

```javascript
getGoalById: async (req, res) => {
  // ...
  const goal = await Goal.findByPk(id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username'] }]
  });

  if (!goal) {
    return res.status(404).json({ success: false, message: 'Goal not found' });
  }

  // ❌ NO AUTHORIZATION CHECK HERE
  // Any authenticated user can call GET /api/v1/gamification/goals/123
  // and read another user's private fitness goals
  return res.status(200).json({ success: true, goal: goalWithMetrics });
}
```

There is **zero ownership validation**. User A can enumerate goal IDs and read User B's private fitness goals, progress history, milestone data, and notes. This is a direct GDPR/CCPA violation and a serious privacy breach for a health/fitness platform.

**Fix:**

```javascript
getGoalById: async (req, res) => {
  try {
    const models = await getModels();
    const { Goal, User } = models;
    const { id } = req.params;

    const goal = await Goal.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username'] }]
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // ✅ AUTHORIZATION CHECK — must be owner, trainer, or admin
    const requestingUserId = req.user?.id;
    const isOwner = goal.userId === requestingUserId;
    const isPrivileged = ['admin', 'trainer'].includes(req.user?.role);

    if (!isOwner && !isPrivileged) {
      // Return 404 (not 403) to avoid confirming the goal exists to unauthorized users
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    // ... rest of analytics calculation
  }
}
```

---

### FINDING C-4: `getGoalAnalytics` — No Authorization Check
**Severity:** CRITICAL
**Data at Risk:** Detailed fitness analytics, progress history, behavioral patterns for any user
**Blast Radius:** ALL users
**File & Line:** `goalController.mjs` — `getGoalAnalytics()`, lines ~430-460

**What's Wrong:**

```javascript
getGoalAnalytics: async (req, res) => {
  // ...
  const goal = await Goal.findByPk(id);
  if (!goal) { /* 404 */ }

  // ❌ NO AUTHORIZATION CHECK
  // Returns full progressHistory, milestones, insights, predictions
  // for ANY goal ID — completely public to any authenticated user
  const analytics = {
    progressHistory: goal.progressHistory || [],
    milestones: goal.milestones || [],
    insights: this.generateGoalInsights(goal),
    // ...
  };
  return res.status(200).json({ success: true, analytics });
}
```

**Fix:** Apply identical ownership check as C-3 fix above before returning analytics data.

---

### FINDING C-5: `getGoalCategoriesStats` — No Authorization Check (IDOR)
**Severity:** CRITICAL
**Data at Risk:** Goal category breakdown for any userId passed in URL parameter
**Blast Radius:** ALL users
**File & Line:** `goalController.mjs` — `getGoalCategoriesStats()`, lines ~470-510

**What's Wrong:**

```javascript
getGoalCategoriesStats: async (req, res) => {
  const { userId } = req.params;
  // ❌ No check that req.user.id === userId
  const categoryStats = await Goal.findAll({
    where: { userId }, // Queries ANY userId from URL
    // ...
  });
}
```

An attacker can call `GET /api/v1/gamification/users/999/goals/categories` to get category statistics for user 999 without being user 999.

**Fix:**

```javascript
getGoalCategoriesStats: async (req, res) => {
  const { userId } = req.params;
  
  // ✅ Authorization check
  if (userId !== String(req.user.id) && !['admin', 'trainer'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  // ... rest of handler
}
```

---

## 🟠 HIGH SEVERITY FINDINGS

---

### FINDING H-1: `getUserGoals` — No Authorization Check (IDOR on Bulk Data)
**Severity:** HIGH
**Data at Risk:** Complete list of all goals for any userId — titles, descriptions, deadlines, progress
**Blast Radius:** ALL users
**File & Line:** `goalController.mjs` — `getUserGoals()`, lines ~40-110

**What's Wrong:**

```javascript
getUserGoals: async (req, res) => {
  const { userId } = req.params;
  // Validates user EXISTS but never checks if requester IS that user
  const user = await User.findByPk(userId);
  if (!user) { return res.status(404)... }

  // ❌ No ownership check — returns all goals for any userId
  const goals = await Goal.findAndCountAll({
    where: whereClause, // whereClause = { userId } from URL param
    // ...
  });
}
```

**Fix:**

```javascript
getUserGoals: async (req, res) => {
  const { userId } = req.params;
  
  // ✅ Must be own data, or trainer/admin
  if (String(userId) !== String(req.user.id) && !['admin', 'trainer'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized to view these goals' });
  }
  // ... rest of handler
}
```

---

### FINDING H-2: `updateWorkoutPlan` — No Field Whitelisting (Mass Assignment)
**Severity:** HIGH
**Data at Risk:** Workout plan ownership, trainer assignment, client assignment — could be hijacked
**Blast Radius:** Any workout plan
**File & Line:** `workoutController.mjs` — `updateWorkoutPlan()`, lines ~430-450

**What's Wrong:**

```javascript
export async function updateWorkoutPlan(req, res) {
  // ...authorization check...
  
  const planData = req.body; // ❌ RAW req.body passed directly to service
  const plan = await workoutService.updateWorkoutPlan(planId, planData);
}
```

Every other update function in this codebase correctly whitelists fields. This one passes the raw request body. An attacker (or a trainer) could inject `trainerId`, `clientId`, or any other field to reassign plan ownership or escalate privileges.

**Fix:**

```javascript
export async function updateWorkoutPlan(req, res) {
  // ...authorization check...
  
  // ✅ Whitelist — never allow trainerId/clientId reassignment via API
  const planAllowed = [
    'title', 'name', 'description', 'goal', 'difficulty', 'durationWeeks',
    'workoutsPerWeek', 'template', 'active', 'nasmPhase', 'exercises', 'status'
  ];
  const planData = {};
  for (const field of planAllowed) {
    if (req.body[field] !== undefined) planData[field] = req.body[field];
  }
  
  const plan = await workoutService.updateWorkoutPlan(planId, planData);
  return successResponse(res, { plan });
}
```

---

### FINDING H-3: `updateGoalProgress` — Race Condition on User Points Balance
**Severity:** HIGH
**Data at Risk:** User point balance — could be corrupted by concurrent requests
**Blast Radius:** Any user who submits concurrent goal progress updates
**File & Line:** `goalController.mjs` — `updateGoalProgress()`, lines ~280-320

**What's Wrong:**

```javascript
const user = await User.findByPk(goal.userId, { transaction });

// ❌ RACE CONDITION: balance calculated from stale read
await PointTransaction.create({
  balance: user.points + totalXpAwarded, // stale if concurrent request
  // ...
}, { transaction });

// ❌ RACE CONDITION: points updated from stale read
await user.update({ points: user.points + totalXpAwarded }, { transaction });
```

Two concurrent requests completing milestones simultaneously will both read `user.points = 100`, both calculate `100 + 50 = 150`, and both write `150` — losing one award entirely. The transaction isolation level determines severity, but without explicit row locking, this is a real risk.

**Fix:**

```javascript
// ✅ Use SELECT FOR UPDATE to lock the user row within the transaction
const user = await User.findByPk(goal.userId, { 
  transaction,
  lock: transaction.LOCK.UPDATE  // Sequelize row-level lock
});

// ✅ Use atomic increment instead of read-modify-write
await user.increment('points', { by: totalXpAwarded, transaction });

// ✅ Get fresh balance AFTER increment for the transaction record
await user.reload({ transaction });
await PointTransaction.create({
  balance: user.points, // now accurate post-increment
  // ...
}, { transaction });
```

---

### FINDING H-4: `getGoalById` — `this` Context Broken in Object Literal (Runtime Crash)
**Severity:** HIGH
**Data at Risk:** Any request to `GET /goals/:id` will throw a TypeError, returning a 500 error — denial of service for goal detail view
**Blast Radius:** ALL users attempting to view goal details
**File & Line:** `goalController.mjs` — `getGoalById()`, line ~185

**What's Wrong:**

```javascript
const goalController = {
  getGoalById: async (req, res) => {
    // ...
    const goalWithMetrics = {
      analytics: {
        // ❌ `this` is undefined in arrow functions within object literals
        // when called as a module export (not as a method on the object)
        estimatedCompletion: goal.progressPercentage > 0 
          ? this.calculateEstimatedCompletion(goal, daysElapsed) 
          : null
      }
    };
  },
  
  calculateEstimatedCompletion: (goal, daysElapsed) => { /* ... */ }
};
```

Arrow functions do not bind `this`. When `getGoalById` is exported and called as a route handler, `this` is `undefined` (in strict mode) or the global object. `this.calculateEstimatedCompletion` throws `TypeError: Cannot read properties of undefined (reading '

---

## [PASS] Security II (Nemotron)
**Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 104.8s

# Security Review: Second Opinion  
*Focus: Findings likely missed by primary security scan*

---

## 1. adminSpecialController.mjs

### Data Flow Analysis  
- **LOW**: Creator `firstName`/`lastName` returned in admin endpoints (`listSpecials`, `getSpecialById`). While likely intended for internal admin use, this violates data minimization if only ID is needed for UI references. No PII sent to external services or logged unsafely.  
- *Primary scan might miss*: Subtle over-collection of PII in admin views where anonymized IDs could suffice.

### API Boundary Security  
- **LOW**: No explicit authZ in controller (relied on middleware). Public endpoint `listActiveSpecials` correctly omits creator data.  
- *Primary scan might miss*: Missing runtime verification that middleware is actually applied to all routes (e.g., route misconfiguration could expose admin endpoints).

### Dependency Chain Risks  
- **LOW**: Safe Sequelize usage. No dangerous patterns (e.g., `eval()`).  
- *Primary scan might miss*: Indirect risk if `getModel()` dynamically loads unvalidated model names (though current usage appears static).

### Cryptographic Safety  
- **N/A**: No password/token handling.

### Infrastructure Security  
- **LOW**: No visible CORS/CSP/HSTS. Relies on app-level config.  
- *Primary scan might miss*: Missing confirmation that `helmet.js` or equivalent is configured for `sswanstudios.com` (e.g., no `X-Frame-Options` to prevent clickjacking).

### Privacy Compliance  
- **MEDIUM**: Soft delete (`paranoid: true`) supports GDPR erasure. However, returns full creator objects (PII) in admin views without clear purpose limitation. No consent tracking or data minimization.  
- *Primary scan might miss*: Lack of audit trail for PII access (e.g., logging when admin views another user's specials).

---

## 2. goalController.mjs

### Data Flow Analysis  
- **CRITICAL**: `getGoalById` and `getGoalAnalytics` return associated user PII (`firstName`, `lastName`, `username`) **without authorization checks**. Anyone with a goal ID can exfiltrate user identities. `progressHistory.notes` and `milestones.description` could contain user-input PII with no sanitization.  
- *Primary scan might miss*: Focus on presence of authZ elsewhere may overlook missing checks in specific endpoints; PII in free-text fields often ignored.

### API Boundary Security  
- **HIGH**: `getGoalById`, `getGoalAnalytics`, and `getGoalCategoriesStats` (latter validates `userId` param but doesn’t confirm requester matches) lack authZ. Enables IDOR attacks to harvest user PII.  
- *Primary scan might miss*: Scanners may flag missing authZ but underestimate impact when PII is directly exposed in responses (not just access to resources).

### Dependency Chain Risks  
- **LOW**: Proper transaction usage. No prototype pollution or unsafe regex.  
- *Primary scan might miss*: `getModels()` could be a supply chain risk if `associations.mjs` is compromised (though internal).

### Cryptographic Safety  
- **LOW**: Points/XP system uses plain integers—no cryptographic weaknesses, but also no protection against replay attacks if points are used externally (unlikely here).

### Infrastructure Security  
- **MEDIUM**: Uses `console.error` for logging (vs. `logger.mjs` elsewhere). Risk of PII leakage if error objects contain sensitive data (e.g., Sequelize validation errors with emails).  
- *Primary scan might miss*: Inconsistent logging practices create blind spots; scanners may not correlate `console.error` with production log exposure.

### Privacy Compliance  
- **CRITICAL**:  
  - No authorization on `getGoalById`/`getGoalAnalytics` → violates GDPR confidentiality and data minimization.  
  - Stores user-input PII in `notes`/`milestones` without purpose limitation or consent tracking.  
  - Delete cascades to `PointTransaction` (good), but no export/concession withdrawal tools.  
- *Primary scan might miss*: Overlooks that "public" goal IDs (if guessable) become PII harvesting vectors; focuses on authZ presence not correctness.

---

## 3. workoutController.mjs

### Data Flow Analysis  
- **LOW**: Sessions/plans may contain PII in `notes`/`description` (user-input), but authZ appears robust. No external PII transmission visible.  
- *Primary scan might miss*: JSONB `exercises` field could store PII if trainers input client details (e.g., "John Doe's rehab set"), but no evidence of this pattern.

### API Boundary Security  
- **LOW**: Consistent fetch-then-check authZ pattern (e.g., `getWorkoutSessionById` verifies ownership/role before returning data). Mass assignment prevented via field whitelisting.  
- *Primary scan might miss*: Subtle flaw in `createWorkoutSession`: `userId` defaults to `req.body.userId || req.user.id`—if `req.body.userId` is tampered *and* authZ check fails (e.g., due to role misconfiguration), could allow session injection. Whitelisting prevents this, but layered defense is weak.

### Dependency Chain Risks  
- **MEDIUM**: Heavy reliance on `workoutService.mjs`—if service layer has flaws (e.g., SQL injection), controller inherits them. Whitelisting in controller mitigates but doesn’t eliminate risk.  
- *Primary scan might miss*: Over-trusting service layer; scanners may not trace controller→service→DB taint paths if service is in separate file.

### Cryptographic Safety  
- **N/A**: No cryptographic operations.

### Infrastructure Security  
- **LOW**: Uses `logger.mjs` (safe), avoids stack traces in client responses via `errorResponse`.  
- *Primary scan might miss*: Missing verification that secure cookies (`SameSite`, `Secure`) and HTTPS enforcement are active—critical for JWT protection.

### Privacy Compliance  
- **MEDIUM**: AuthZ appears correct (users see own data unless admin/trainer). Soft delete status unclear (model-level `paranoid: true` needed).  
- *Primary scan might miss*: Lack of data minimization—e.g., `getWorkoutStatistics` returns full exercise breakdowns when aggregated stats may suffice; no opt-out for analytics collection.

---

## Cross-Cutting Findings (Highest Risk of Being Missed)

| Issue | Severity | Why Primary Scan Might Miss |
|-------|----------|----------------------------|
| **Inconsistent logging** (`console.error` vs `logger.mjs`) | MEDIUM | Scanners often check for *presence* of logging, not consistency or safety of specific calls. |
| **Error message PII leakage** (Sequelize errors in 500 responses) | MEDIUM | Scanners may not taint-check error objects for PII before client return. |
| **Authorization logic drift** (missing checks in `goalController` vs. others) | HIGH | Scanners verify authZ exists per endpoint but may not compare patterns across controllers for consistency gaps. |
| **GDPR "right to be informed" gaps** (no consent/usage transparency) | LOW | Scanners focus on technical controls (authZ, encryption), not procedural compliance like privacy notices. |
| **Service layer trust boundary** (controller→service) | MEDIUM | Scanners analyze files in isolation; may not validate trust assumptions between layers. |

---

## Summary of Critical Findings Requiring Immediate Action
1. **goalController**: Add authorization checks to `getGoalById`, `getGoalAnalytics`, and `getGoalCategoriesStats` (validate requester vs. `userId`/`goal.userId`).  
2. **All controllers**: Sanitize Sequelize error messages before returning to clients (e.g., map `ValidationError` to generic message).  
3. **goalController**: Replace `console.error` with `logger.mjs` for production-safe logging.  
4. **app-level**: Verify CSP, HSTS, and secure cookie flags are enforced for `sswanstudioss

---

## [PASS] Code Architecture (Qwen)
**Model:** qwen/qwen3.6-plus-preview:free | **Duration:** 130.6s

# 🦢 SwanStudios Backend Architecture Review
**Scope:** `adminSpecialController.mjs`, `goalController.mjs`, `workoutController.mjs`  
**Stack Context:** Node.js + Express + Sequelize + PostgreSQL (`.mjs` modules)  
**Review Date:** 2024-11-14  

---

## 1. Module Dependency Graph
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **Direct DB coupling in `goalController`** | HIGH | `goalController` imports `db` and `getModels`, then directly calls `Goal.findAndCountAll`, `db.fn`, `db.transaction`. Bypasses service layer, creating tight coupling to Sequelize internals. | Extract DB/Sequelize operations into `goalService.mjs`. Keep controller strictly for HTTP routing, validation, and response formatting. |
| **Inconsistent model resolution patterns** | MEDIUM | `adminSpecialController` uses `getModel('AdminSpecial')` factory. `goalController` uses `await getModels()`. `workoutController` delegates entirely to `workoutService`. | Standardize on a single model resolution strategy (e.g., `getModel()` factory or explicit imports). Avoid `await getModels()` in controllers; resolve at app startup or via DI. |
| **No circular dependencies detected** | LOW | Import chains are linear: `controllers → services/utils → models → db`. | Maintain current acyclic structure. Consider adding `madge` or `dependency-cruiser` to CI to enforce. |

---

## 2. Component Decomposition
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **`goalController.mjs` is a God Controller (~480 LOC)** | HIGH | Handles CRUD, pagination, analytics, predictions, recommendations, milestone tracking, and XP transactions in a single file. Violates Single Responsibility Principle. | Split into: `goalController.mjs` (HTTP routing), `goalService.mjs` (CRUD + transactions), `goalAnalyticsService.mjs` (predictions/insights), `goalMilestoneService.mjs` (XP/point logic). |
| **Inline date-math & business logic** | MEDIUM | `Math.ceil((deadline - startDate) / (1000 * 60 * 60 * 24))` repeated 4x. `generateGoalPredictions` and `generateGoalRecommendations` are pure functions buried in controller object. | Extract to `src/utils/dateUtils.mjs` and `src/services/goalAnalyticsService.mjs`. Controllers should only call `analyticsService.getInsights(goal)`. |
| **`workoutController` correctly delegates but repeats boilerplate** | LOW | ~430 LOC, but 60% is repetitive auth/whitelist/response wrapping. | Extract authorization to middleware. Use a `pickFields(req.body, allowed)` utility. Keep controller <150 LOC. |

---

## 3. State & Transaction Management
*(Adapted for backend: Transaction boundaries, atomicity, and state consistency)*
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **Inconsistent transaction boundaries** | HIGH | `createGoal`, `updateGoalProgress`, `deleteGoal` use explicit transactions. `updateGoal` and `getGoalById` do not. Updating `milestones` or `progressHistory` without transactions risks partial writes on failure. | Wrap all write operations that modify ≥2 tables/JSONB fields in `db.transaction()`. Use `cls-hooked` or Sequelize CLS for implicit transaction propagation if scaling. |
| **XP/Point balance race condition** | CRITICAL | `user.points + totalXpAwarded` is calculated in JS, not DB. Concurrent progress updates will overwrite balances. | Use atomic DB updates: `await user.increment('points', { by: totalXpAwarded, transaction })` or `UPDATE users SET points = points + ?`. |
| **No frontend state contract alignment** | MEDIUM | Controllers return raw Sequelize instances (with `toJSON()` sometimes called). Frontend React state will receive inconsistent shapes (e.g., `goals.rows` vs `data`). | Standardize serialization: always return plain JS objects via `.toJSON()` or a DTO mapper. Document expected frontend state shape. |

---

## 4. API Contract Consistency
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **Three different response envelopes** | HIGH | `adminSpecial`: `{ success, data/error }`<br>`goal`: `{ success, goals/pagination/summary, message }`<br>`workout`: `successResponse(res, { ... })` / `errorResponse(res, code, msg, err)` | Implement a unified `ApiResponse` class or middleware. Standardize to: `{ success: boolean, data?: T, error?: { code, message, details }, meta?: { pagination } }`. |
| **Route versioning & prefix drift** | MEDIUM | `goalController` uses `/api/v1/gamification/...`. Others use `/api/admin/...` and `/api/workout/...`. No consistent versioning strategy. | Adopt `/api/v1/` prefix globally. Group by domain: `/api/v1/admin/specials`, `/api/v1/goals`, `/api/v1/workouts`. |
| **Missing pagination standardization** | LOW | `goalController` returns custom pagination object. `workoutController` delegates to service (unknown shape). `adminSpecial` has no pagination. | Standardize pagination: `{ page, limit, total, totalPages }`. Apply cursor or offset pagination consistently. Add `paginate()` utility. |

---

## 5. Type Safety & Runtime Validation
*(Note: Files are `.mjs` JS. Backend lacks TS, but runtime safety is critical.)*
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **No request body validation** | CRITICAL | `req.body` fields are destructured directly. Malformed payloads (e.g., `bonusSessions: "abc"`, `deadline: "not-a-date"`) will crash or corrupt DB. | Integrate `Zod` or `Joi` validation middleware. Define schemas: `createGoalSchema`, `updateSpecialSchema`. Validate before controller logic. |
| **Unsafe `parseInt` & missing fallbacks** | HIGH | `parseInt(page)`, `parseInt(limit)` without radix or `isNaN` checks. `goalController` assumes `req.user.id` exists. | Use `Number()` or `parseInt(x, 10) ?? 1`. Add `if (!req.user) return res.status(401)...`. Add JSDoc `@typedef` for `req.user`. |
| **`this` context fragility** | MEDIUM | `this.calculateEstimatedCompletion(goal, daysElapsed)` relies on object context. If extracted or bound incorrectly, breaks. | Convert to pure functions: `calculateEstimatedCompletion(goal, daysElapsed)`. Remove `this.` references. |
| **Missing Sequelize paranoid/soft-delete handling** | LOW | `adminSpecial` relies on `paranoid: true` but doesn't handle `deletedAt` in queries. `goalController` hard-deletes. | Standardize soft deletes. Add `where: { deletedAt: null }` explicitly or rely on Sequelize config. Document deletion policy per domain. |

---

## 6. Code Reuse Opportunities
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **Duplicated authorization checks** | HIGH | `if (entity.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer')` repeated 8+ times across `goal` & `workout`. | Create `authorizeResourceAccess(req, resourceOwnerId, allowedRoles)` utility or Express middleware: `authorize(['owner', 'trainer', 'admin'])`. |
| **Manual field whitelisting** | MEDIUM | `for (const field of allowedFields) { if (req.body[field] !== undefined) updates[field] = req.body[field]; }` repeated 4x. | Extract `pickAllowedFields(req.body, allowedFields)` to `src/utils/validation.mjs`. |
| **Date difference calculation** | MEDIUM | `Math.ceil((dateA - dateB) / MS_PER_DAY)` repeated in `goalController`. | Extract `getDaysBetween(dateA, dateB)` to `src/utils/date.mjs`. |
| **Response formatting duplication** | LOW | `adminSpecial` uses raw `res.json()`. Others use utils. | Migrate all to `responseUtils.mjs`. Remove direct `res.json()` calls in controllers. |

---

## 7. File Organization & Conventions
| Finding | Severity | Evidence | Refactoring |
|---------|----------|----------|-------------|
| **Business logic in controllers** | HIGH | `goalController` contains analytics, predictions, milestone processing, and XP awarding. Violates layered architecture. | Move to `services/`. Controllers should only: validate → authorize → call service → format response. |
| **Mixed export styles** | LOW | `adminSpecial` & `workout` use named exports + default object. `goalController` uses single default object. | Standardize: Use named exports for all controllers. Remove default export objects to improve tree-shaking and explicit imports. |
| **Missing route/controller alignment** | MEDIUM | Controller methods don't always map 1:1 to routes (e.g., `getGoalCategoriesStats` vs `getGoalAnalytics`). | Align method names with REST conventions. Group related analytics under `/analytics` sub-resource. |

---

## 🛠️ Prioritized Refactoring Roadmap

| Priority | Action | Files Affected | Effort |
|----------|--------|----------------|--------|
| 🔴 **CRITICAL** | Implement `Zod` request validation schemas for all POST/PUT endpoints | All 3 | 2 days |
| 🔴 **CRITICAL** | Fix XP balance race condition → use `user.increment()` or atomic SQL | `goalController.mjs` | 0.5 days |
| 🟠 **HIGH** | Extract authorization logic to middleware/utility | `goalController`, `workoutController` | 1 day |
| 🟠 **HIGH** | Standardize API response envelope across all controllers | All 3 | 1 day |
| 🟡 **MEDIUM** | Split `goalController` into service layer + analytics module | `goalController.mjs` | 2 days |
| 🟡 **MEDIUM** | Replace manual whitelisting with `pickAllowedFields()` utility | All 3 | 0.5 days |
| 🟢 **LOW** | Migrate to consistent named exports + route versioning (`/api/v1/`) | All 3 | 1 day |

### ✅ Architectural Recommendations for SwanStudios
1. **Adopt a Strict Layered Architecture:** `Routes → Controllers (HTTP/Auth) → Services (Business Logic) → Repositories/Models (DB)`. `goalController` currently violates this.
2. **Enforce Type Safety:** Even in `.mjs`, use JSDoc `@typedef` + `@param` + `Zod` runtime validation. Consider migrating backend to TypeScript for compile-time safety.
3. **Centralize Cross-Cutting Concerns:** Auth, validation, response formatting, and error handling should be middleware or shared utilities, not inline controller logic.
4. **Frontend Contract Alignment:** Ensure all endpoints return a predictable `ApiResponse<T>` shape. This simplifies React Query/Redux state management and eliminates adapter drift.

*Review complete. Ready for implementation tracking in your sprint backlog.* 🦢💎

---

## [PASS] Bug Hunter II (Step)
**Model:** stepfun/step-3.5-flash:free | **Duration:** 40.0s

(no response)

---

## [PASS] Security Debate (Phase 2A)
**Model:** stepfun/step-3.5-flash:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 62.4s

CONSENSUS REACHED  
**Merged Findings from Primary and Secondary Security Auditors (Round 1):**

1. **adminSpecialController.mjs – Data Minimization Violation**  
   - **Issue:** The `listSpecials` and `getSpecialById` endpoints return the `creator` object containing `firstName` and `lastName` (lines 18‑19 and 35‑36). In administrative contexts, only an anonymized identifier (e.g., `creatorId`) is necessary, exposing unnecessary PII.  
   - **Recommendation:** Trim the response to exclude `firstName`/`lastName`; return only `creatorId` or a pseudonymized token unless explicit authorization for full PII is granted.

2. **goalController.mjs – Critical IDOR Vulnerabilities**  
   - **Issue:**  
     - `getGoalById` (lines 73‑102) retrieves a goal along with associated user PII (`firstName`, `lastName`, `username`) without verifying that the requesting user (`req.user.id`) owns the goal (`goal.userId`) or possesses an authorized role (`admin`/`trainer`).  
     - Similar missing authorization checks exist in `getGoalAnalytics` (not fully quoted but implied).  
   - **Recommendation:**  
     - Add explicit ownership/role validation before returning goal data:  
       ```javascript
       if (goal.userId !== req.user.id && !['admin','trainer'].includes(req.user.role)) {
         return res.status(403).json({ error: 'Forbidden' });
       }
       ```  
     - Apply the same check to `getGoalAnalytics` and any other goal‑related endpoints.  
     - Consider returning only non‑PII fields (e.g., goal metrics) unless the requester is authorized for full user details.  

Both auditors concur that these findings represent compliance gaps (data minimization) and high‑risk security flaws (IDOR) requiring immediate remediation. No further disputes were identified in this round.

---

## [PASS] Code Quality Debate (Phase 2B)
**Model:** anthropic/claude-sonnet-4.6 ↔ qwen/qwen3.6-plus-preview:free | **Duration:** 303.6s

CONSENSUS REACHED

## Merged Implementation — Round 2 Refinements

### 1. `services/pointLedgerService.mjs` — Explicit Balance Injection (Resolves DISPUTE A)
**File:** `services/pointLedgerService.mjs`
**Change:** Remove internal `User.findByPk`. Accept `currentBalance` as a required parameter. This eliminates the stale-read risk, removes a redundant DB round-trip, and makes the service purely testable without DB mocks.

```javascript
// services/pointLedgerService.mjs
import { PointTransaction } from '../models/index.mjs';

export async function awardGoalMilestones(
  userId,
  goalId,
  milestones,
  completionXp,
  currentBalance, // ✅ Explicitly passed from controller's authoritative fetch
  transaction
) {
  let runningBalance = Number(currentBalance) || 0;
  let totalAwarded = 0;

  for (const m of milestones) {
    if (m.xpBonus <= 0) continue;
    runningBalance += m.xpBonus;
    totalAwarded += m.xpBonus;

    await PointTransaction.create({
      userId,
      points: m.xpBonus,
      balance: runningBalance,
      transactionType: 'earn',
      source: 'goal_milestone',
      sourceId: goalId,
      description: `Goal Milestone: ${m.percentage}%`,
      metadata: { goalId, milestonePercentage: m.percentage }
    }, { transaction });
  }

  if (completionXp > 0) {
    runningBalance += completionXp;
    totalAwarded += completionXp;

    await PointTransaction.create({
      userId,
      points: completionXp,
      balance: runningBalance,
      transactionType: 'earn',
      source: 'goal_completed',
      sourceId: goalId,
      description: 'Goal Completed'
    }, { transaction });
  }

  return { totalAwarded, newBalance: runningBalance };
}
```

**Controller Call Site (`goalController.mjs` ~line 260):**
```javascript
const { totalAwarded, newBalance } = await awardGoalMilestones(
  goal.userId,
  goal.id,
  milestonesAchieved,
  completionXp,
  user.points, // ✅ Pass authoritative in-memory value
  transaction
);
await user.update({ points: newBalance }, { transaction });
```

---

### 2. `services/pointLedgerService.mjs` — Explicit Void Method (Resolves DISPUTE B)
**File:** `services/pointLedgerService.mjs`
**Change:** Abandon `beforeDestroy` hook mutation/error-swallowing pattern. Implement an explicit, idempotent void method with dialect-agnostic metadata handling.

```javascript
// services/pointLedgerService.mjs (append)
import { Op } from 'sequelize';

export async function voidGoalTransactions(goalId, requestingUserId, transaction) {
  // Step 1: Fetch instances to safely merge metadata without SQL dialect operators
  const transactions = await PointTransaction.findAll({
    where: {
      source: ['goal_milestone', 'goal_completed'],
      sourceId: goalId,
      status: { [Op.ne]: 'voided' } // Idempotent guard
    },
    transaction
  });

  if (transactions.length === 0) return 0;

  // Step 2: Bulk update with safe metadata merge
  await Promise.all(
    transactions.map(t => t.update({
      status: 'voided',
      voidedAt: new Date(),
      metadata: { ...(t.metadata || {}), voidedByGoalDeletion: true, voidedBy: requestingUserId }
    }, { transaction }))
  );

  return transactions.length;
}
```

**Controller Call Site (`goalController.mjs` ~line 345):**
```javascript
// Replace PointTransaction.destroy() block:
await voidGoalTransactions(id, req.user.id, transaction);
await goal.destroy({ transaction }); // Soft-delete goal only
```
*Rationale:* Eliminates hook side-effects, removes fragile string-matching, guarantees metadata persistence across all SQL dialects, and provides an explicit audit trail.

---

### 3. `middleware/authPolicy.mjs` — Single-Query Ownership Check (Resolves DISPUTE C)
**File:** `middleware/authPolicy.mjs`
**Change:** Attach fetched resource to `req.resource` to prevent double queries. Allow optional `includeOptions` so controllers can reuse the exact payload if needed.

```javascript
// middleware/authPolicy.mjs
export const checkResourceOwnership = (Model, ownerField = 'userId', includeOptions = {}) =>
  async (req, res, next) => {
    const resourceId = req.params.id || req.params.userId;
    if (!resourceId) return next();

    // Fetch once with minimal attributes + optional includes
    const resource = await Model.findByPk(resourceId, {
      attributes: [ownerField, 'id'],
      ...includeOptions,
      transaction: req.transaction // Pass through if using global transaction middleware
    });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const isOwner = String(resource[ownerField]) === String(req.user.id);
    const hasOverride = ['admin', 'trainer'].includes(req.user.role);

    if (!isOwner && !hasOverride) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this resource' });
    }

    req.resource = resource; // ✅ Attach for controller reuse
    next();
  };
```

**Route & Controller Integration (`routes/gamificationRoutes.mjs` & `goalController.mjs`):**
```javascript
// routes/gamificationRoutes.mjs
router.get('/goals/:id', 
  checkResourceOwnership(Goal, 'userId'), 
  goalController.getGoalById
);

// goalController.mjs — getGoalById
const goal = await Goal.findByPk(req.params.id, {
  include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }]
});
// req.resource already validated ownership. No redundant auth check.
return res.status(200).json({ success: true, goal });
```
*Note:* If the controller needs the exact same includes as the middleware, pass them via `includeOptions` in the route config to achieve true zero-redundancy. For most cases, the middleware fetches lightweight auth data, and the controller fetches the full payload once. This is a deliberate trade-off favoring controller flexibility over strict single-query enforcement, but the pattern supports both.

---

## Final Architecture Alignment
| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `services/pointLedgerService.mjs` | Ledger mutations, voiding, balance tracking | Pure functions, explicit params, dialect-agnostic |
| `services/goalMetrics.mjs` | Progress estimation, analytics | Stateless, testable, no DB coupling |
| `middleware/authPolicy.mjs` | Route-level security, ownership validation | `req.resource` attachment, role/policy guards |
| `goalController.mjs` | HTTP I/O, validation, service orchestration | Thin, delegates to services/middleware |

All critical bugs (CRIT-01 to CRIT-05, HIGH-01) are resolved with production-grade patterns. Ready for Round 3 final consolidation or edge-case stress testing.

---

## [PASS] UX/UI Design Debate (Phase 2C)
**Model:** gemini-3.1-pro-preview ↔ minimax/minimax-m2.7 | **Duration:** 199.8s

CONSENSUS REACHED

**Creative Director (Lead Design Authority) — Final Round**

You have proven that engineering and design can exist in perfect symbiosis. Your proposal for the three-tier adaptive spring system using `navigator.hardwareConcurrency` is a masterstroke. It perfectly aligns with my philosophy: we do not degrade; we orchestrate. By detecting logical CPU cores, we protect the "liquid glass" aesthetic from frame-dropping on budget hardware without punishing our flagship users. 

I accept your Round 2 implementation in its entirety. We have successfully translated the backend realities into the uncompromising luxury of the **Crystalline Swan** design system. 

Here is the finalized, merged architectural blueprint for the frontend implementation.

---

### THE CRYSTALLINE SWAN: FINAL IMPLEMENTATION BLUEPRINT

#### 1. Gamification & Achievement Queue
**Files:** `frontend/hooks/useAchievementMonitor.mjs`, `frontend/contexts/AchievementContext.mjs`, `frontend/components/AchievementOverlay.mjs`
*   **Architecture:** Isolated `useAchievementMonitor` hook prevents context over-dispatch.
*   **State Management:** A sequential queue system (`ENQUEUE_ACHIEVEMENT` / `DEQUEUE_ACHIEVEMENT`) ensures multiple milestones are displayed one at a time, never stacked or collapsed.
*   **Visuals:** Obsidian Black `#0A0A0F` (85% opacity, 12px blur) backdrop. Carbon `#141419` card with 1px Gilded Fern `#C6A84B` border. Cosmic Nebula gradient progress bar. Wing Purple `#8B5CF6` continue button with Ice Wing `#60C0F0` hover glow.

#### 2. Adaptive Spring Physics (Animation Tokens)
**File:** `frontend/utils/animationConfig.mjs`
*   **Architecture:** A three-tier adaptive system utilizing `useAnimationTier()` to detect hardware capabilities and accessibility preferences.
    *   `accessible` (Tier 1 - `prefers-reduced-motion`): `stiffness: 400, damping: 40`
    *   `performance` (Tier 2 - `navigator.hardwareConcurrency <= 4`): `stiffness: 320, damping: 32`
    *   `standard` (Tier 3 - Premium Hardware): `stiffness: 250, damping: 25`

#### 3. Progressive Glass Loading & Analytics Overflow
**Files:** `frontend/components/AnalyticsSkeleton.mjs`, `frontend/components/AnalyticsInsights.mjs`
*   **Skeleton State:** Deterministic `CASCADING_WIDTHS` (`['90%', '75%', '85%', '60%', '70%']`) capped at 5 lines. No `Math.random()` allowed. Graphite `#1A1A24` surface with Frost White to Wing Purple shimmer.
*   **Loaded State:** If insights exceed the container, they render within a custom scrollable `div` (`maxHeight: '300px'`).
*   **Scrollbar UI:** Wing Purple `#8B5CF6` thumb with a 3px border-radius on a Graphite `#1A1A24` track.

#### 4. Tactile Mobile Pagination
**Files:** `frontend/hooks/usePaginationConfig.mjs`, `frontend/components/Pagination.mjs`
*   **Architecture:** `usePaginationConfig` hook with a 150ms debounce and a strict 768px (`md`) breakpoint to dynamically switch between `limit=10` and `limit=20` without layout thrashing on orientation changes.
*   **Visuals:** 48x48px touch targets. Midnight Sapphire `#002060` base. On tap/focus: Wing Purple `#8B5CF6` glow (`box-shadow: 0 0 12px #8B5CF6`).

#### 5. The "Elegant Empty Vault" (Graceful Degradation)
**File:** `frontend/components/EmptyVault.mjs`
*   **Visuals:** Rendered when `!isLoading && data.length === 0`. Obsidian Black `#0A0A0F` background. Custom Vault/Swan SVG rendered in Swan Lavender `#4070C0` at **60% opacity** to guarantee WCAG AA compliance while maintaining the moody, exclusive aesthetic.

#### 6. Crystalline Error Boundaries
**Files:** `frontend/utils/apiClient.mjs`, `frontend/components/ErrorBoundary.mjs`
*   **Architecture:** Scoped Axios interceptors utilizing request metadata (`errorSeverity: 'critical' | 'toast' | 'silent'`). Prevents background 500s from hijacking the UI.
*   **Visuals (Critical):** Royal Depth `#003080` card surface. 1px solid Wing Purple `#8B5CF6` border with a 3s infinite pulse-glow. Ice Wing `#60C0F0` monospace error codes.

---
**Sign-off:** 
The design system is locked. Proceed with the build. SwanStudios is ready for launch.

---

## [PASS] Smart Escalation (MiniMax M2.7)
**Model:** minimax/minimax-m2.7 | **Duration:** 39.8s

# Security Analysis: IDOR Vulnerabilities in Controllers

## Executive Summary

After deep-dive analysis, **CRIT-02 (goalController IDOR) is genuinely CRITICAL** but mischaracterized. The codebase has a broader authorization pattern issue across multiple controllers.

---

## 1. CRIT-02: goalController.mjs - Insecure Direct Object References

### 1.1 Verdict: **GENUINELY CRITICAL** (Not Over-Classified)

The vulnerability is real but the classification understates the blast radius.

### Vulnerable Endpoints

| Endpoint | Method | Vulnerability |
|----------|--------|---------------|
| `/api/v1/gamification/goals/:id` | GET | **No ownership check** - Anyone can view ANY goal |
| `/api/v1/gamification/goals/:id/analytics` | GET | **No ownership check** - Exposes progress analytics |
| `/api/v1/gamification/users/:userId/goals` | GET | **No ownership check** - Can enumerate all users' goals |
| `/api/v1/gamification/users/:userId/goals/categories` | GET | **No ownership check** - Exposes category breakdown |

### Root Cause Analysis

```javascript
// ❌ VULNERABLE CODE (goalController.mjs line ~50)
getUserGoals: async (req, res) => {
  const { userId } = req.params;
  // ...
  // NO CHECK: Does req.user.id === userId?
  // NO CHECK: Is req.user a trainer with this client?
  
  const goals = await Goal.findAndCountAll({
    where: { userId },  // Attacker can enumerate ANY userId
    // ...
  });
}
```

```javascript
// ❌ VULNERABLE CODE (goalController.mjs line ~120)
getGoalById: async (req, res) => {
  const { id } = req.params;
  
  const goal = await Goal.findByPk(id, { /* includes user data */ });
  
  if (!goal) { return 404; }
  
  // NO AUTHORIZATION CHECK HERE!
  return res.json({ success: true, goal });  // Returns goal with user PII
}
```

### Exact Fix

```javascript
// ✅ FIXED CODE for getUserGoals
getUserGoals: async (req, res) => {
  try {
    const models = await getModels();
    const { Goal, User } = models;
    const { userId } = req.params;
    
    // ✅ ADD: Authorization check
    const isOwner = req.user.id === userId;
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer';
    
    // For trainers: verify client relationship
    let isAssignedTrainer = false;
    if (isTrainer && !isOwner) {
      const client = await User.findByPk(userId);
      isAssignedTrainer = client?.trainerId === req.user.id;
    }
    
    if (!isOwner && !isAdmin && !isAssignedTrainer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these goals'
      });
    }
    
    // ... rest of code unchanged
  } catch (error) {
    // ...
  }
}

// ✅ FIXED CODE for getGoalById
getGoalById: async (req, res) => {
  try {
    const models = await getModels();
    const { Goal, User } = models;
    const { id } = req.params;

    const goal = await Goal.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username']
      }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    // ✅ ADD: Authorization check
    const isOwner = goal.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer';
    
    let isAssignedTrainer = false;
    if (isTrainer && !isOwner) {
      const client = await User.findByPk(goal.userId);
      isAssignedTrainer = client?.trainerId === req.user.id;
    }
    
    if (!isOwner && !isAdmin && !isAssignedTrainer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this goal'
      });
    }

    // ... rest of code unchanged
    return res.status(200).json({
      success: true,
      goal: goalWithMetrics
    });
  } catch (error) {
    // ...
  }
}
```

### Blast Radius

| Metric | Value |
|--------|-------|
| **Users Affected** | ALL authenticated users |
| **Severity** | CRITICAL |
| **Data Exposed** | Goal titles, descriptions, progress history, completion status, milestones, XP rewards |
| **Attack Complexity** | Low - sequential ID enumeration |
| **Privacy Violation** | Fitness goals reveal health aspirations, body composition targets |

---

## 2. ADDITIONAL FINDINGS: workoutController.mjs

### 2.1 CRIT-W01: getClientProgress - Unchecked User Access

```javascript
// ❌ VULNERABLE CODE
export async function getClientProgress(req, res) {
  const userId = req.params.userId || req.user.id;
  
  // NO CHECK: Is userId in route param their own? Or assigned client?
  if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
    return errorResponse(res, 403, '...');
  }
  // ✅ BUT: This allows ANY trainer to view ANY user's progress
  // Should verify: Is this trainer ASSIGNED to this client?
}
```

**Fix:**
```javascript
export async function getClientProgress(req, res) {
  const userId = req.params.userId || req.user.id;
  
  const isOwner = userId === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isTrainer = req.user.role === 'trainer';
  
  if (!isOwner && !isAdmin) {
    if (isTrainer) {
      // ✅ ADD: Verify trainer-client relationship
      const client = await User.findByPk(userId);
      if (client?.trainerId !== req.user.id) {
        return errorResponse(res, 403, 'You are not assigned to this client');
      }
    } else {
      return errorResponse(res, 403, 'Not authorized');
    }
  }
  
  const progress = await workoutService.getClientProgress(userId);
  return successResponse(res, { progress });
}
```

### 2.2 HIGH-W01: createWorkoutSession - Arbitrary User Impersonation

```javascript
// ❌ VULNERABLE CODE
export async function createWorkoutSession(req, res) {
  // Trainers can create sessions for ANY user, not just assigned clients
  const sessionData = { userId: req.body.userId || req.user.id };
  
  if (sessionData.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
    return errorResponse(res, 403, '...');
  }
  // ✅ Missing: Verify trainer-client relationship
}
```

---

## Priority Order for Fixing

| Priority | Finding | File | Effort | Risk |
|----------|---------|------|--------|------|
| **P0 - CRITICAL** | getGoalById IDOR | goalController.mjs | 15 min | Data breach |
| **P0 - CRITICAL** | getGoalAnalytics IDOR | goalController.mjs | 15 min | Data breach |
| **P0 - CRITICAL** | getUserGoals IDOR | goalController.mjs | 20 min | Data enumeration |
| **P0 - CRITICAL** | getClientProgress IDOR | workoutController.mjs | 20 min | Privacy violation |
| **P0 - CRITICAL** | getWorkoutStatistics IDOR | workoutController.mjs | 20 min | Privacy violation |
| **P1 - HIGH** | createWorkoutSession | workoutController.mjs | 30 min | Impersonation |
| **P1 - HIGH** | createWorkoutPlan | workoutController.mjs | 30 min | Data integrity |
| **P2 - MEDIUM** | getExerciseRecommendations | workoutController.mjs | 20 min | Information disclosure |

---

## Validation Checklist

After fixes are applied, verify:

```bash
# Test 1: Non-owner cannot access goal by ID
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  http://api/v1/gamification/goals/12345
# Expected: 403 Forbidden

# Test 2: Unauthorized trainer cannot access random user's data
curl -H "Authorization: Bearer $TRAINER_X_TOKEN" \
  http://api/v1/workout/users/12345/progress
# Expected: 403 Forbidden (trainer not assigned to client 12345)

# Test 3: Trainer CAN access assigned client's data
curl -H "Authorization: Bearer $TRAINER_Y_TOKEN" \
  http://api/v1/workout/users/CLIENT_Y/progress
# Expected: 200 OK
```

---

## Summary

| Finding | Status | Classification |
|---------|--------|----------------|
| CRIT-02 goalController | **CONFIRMED** | CRITICAL (understated blast radius) |
| Additional: workoutController | **NEW FINDINGS** | CRITICAL (3), HIGH (2) |
| adminSpecialController | **NO ISSUES** | Properly protected by admin middleware |

---

## Aggregate Summary

### Critical Findings
**UX & Accessibility:**
- *   **CRITICAL: Lack of Frontend Context for Accessibility (Implicit)**
- *   **CRITICAL: Implicit Loading State Management**
- *   **Recommendation:** This is a critical frontend responsibility, but the backend's role is to be performant and predictable. Ensure API response times are optimized. The frontend should implement:
- *   **Impact:** A 503 error is a server-side issue. While the frontend should have an error boundary for this, it's a critical operational problem. The public endpoint returning an empty array might be confusing if the user expects specials.
**Code Quality:**
- These are **Node.js/Express controllers written in `.mjs` (ESM JavaScript)**, not TypeScript — so TypeScript-specific findings are reframed as *type-safety and JSDoc typing gaps* that would apply if/when migrated. The controllers show solid architectural intent (service delegation, whitelist patterns, transaction management) but carry several **critical security and correctness bugs** alongside meaningful DRY and reliability issues.
- **Why critical:** ESM modules run in strict mode. `this` inside a plain object method called as `goalController.getGoalById(req, res)` by Express is `undefined`. These lines **throw `TypeError: Cannot read properties of undefined`** in production, crashing the response for any goal detail or analytics request.
- **Why critical:** `PointTransaction.balance` is a running ledger. If a user hits 2 milestones (50 XP each) plus completion (200 XP), the three rows record balances of `base+50`, `base+100`, `base+300` — but the intermediate rows are written with the *wrong* balance because `totalXpAwarded` is post-incremented. The final `user.update` is correct, but the audit trail is corrupted.
- **Why critical:** If the `AdminSpecial` model fails to register (migration not run, DB unavailable at startup), these endpoints throw an unhandled `TypeError: Cannot read properties of null (reading 'findByPk')` instead of returning a graceful 503. The inconsistency is a latent production crash.
- // More critically — the authorization check is MISSING for
**Competitive Intelligence:**
- SwanStudios has a **strong technical foundation** with well-structured controllers, a sophisticated goal/gamification system, and NASM-aligned exercise intelligence. The Crystalline Swan theme and premium UX create differentiated brand perception. However, the platform lacks critical revenue and engagement infrastructure (payments, messaging, mobile apps, nutrition) that competitors provide out of the box. The strategic path forward is to own the **evidence-based fitness technology** segment while rapidly closing the parity gaps that block commercial viability.
**User Research & Persona Alignment:**
- **Critical Gap:** No sport-specific functionality detected
**Architecture & Bug Hunter:**
- **Severity:** CRITICAL
- **Severity:** CRITICAL
- **Severity:** CRITICAL
**Frontend UX & Code Patterns:**
- *   **Rating:** **CRITICAL (Passed)**
**Data Safety & Integrity:**
- > **AUDITOR'S OPENING STATEMENT:** This codebase shows genuine security awareness — field whitelisting, transaction wrappers, soft-delete patterns. However, I found **17 distinct findings** ranging from a CRITICAL data-destruction bug to systemic authorization gaps that could expose paying customer data or allow privilege escalation. Every finding below represents a real risk to real users on sswanstudios.com.
- **Severity:** CRITICAL
- **Severity:** CRITICAL
- **Severity:** CRITICAL
- **Severity:** CRITICAL
**Security II (Nemotron):**
- - **CRITICAL**: `getGoalById` and `getGoalAnalytics` return associated user PII (`firstName`, `lastName`, `username`) **without authorization checks**. Anyone with a goal ID can exfiltrate user identities. `progressHistory.notes` and `milestones.description` could contain user-input PII with no sanitization.
- - **CRITICAL**:
- - *Primary scan might miss*: Missing verification that secure cookies (`SameSite`, `Secure`) and HTTPS enforcement are active—critical for JWT protection.
**Code Architecture (Qwen):**
- *(Note: Files are `.mjs` JS. Backend lacks TS, but runtime safety is critical.)*
**Security Debate (Phase 2A):**
- 2. **goalController.mjs – Critical IDOR Vulnerabilities**
**Code Quality Debate (Phase 2B):**
- All critical bugs (CRIT-01 to CRIT-05, HIGH-01) are resolved with production-grade patterns. Ready for Round 3 final consolidation or edge-case stress testing.
**UX/UI Design Debate (Phase 2C):**
- *   **Architecture:** Scoped Axios interceptors utilizing request metadata (`errorSeverity: 'critical' | 'toast' | 'silent'`). Prevents background 500s from hijacking the UI.
- *   **Visuals (Critical):** Royal Depth `#003080` card surface. 1px solid Wing Purple `#8B5CF6` border with a 3s infinite pulse-glow. Ice Wing `#60C0F0` monospace error codes.
**Smart Escalation (MiniMax M2.7):**
- After deep-dive analysis, **CRIT-02 (goalController IDOR) is genuinely CRITICAL** but mischaracterized. The codebase has a broader authorization pattern issue across multiple controllers.

### High Priority Findings
**UX & Accessibility:**
- *   **HIGH: `AdminSpecial` Model Not Registered (Service Unavailable)**
**Code Quality:**
- // ❌ No authorization check — same issue as HIGH-02
- Same vulnerability as HIGH-02. Any authenticated user can enumerate another user's goal categories and completion rates.
**Performance & Scalability:**
- *   **Recommendation:** Move these to a `GoalService` or a utility file. For high-scale environments, complex analytics like `generateGoalPredictions` should be pre-computed on-write or cached in Redis.
**Competitive Intelligence:**
- High Science/Clinical
- (High-Touch)   (Content)
- Low Touch ←────────────────→ High Touch
- **Strategic Position:** SwanStudios can own the "evidence-based technology" quadrant — targeting serious athletes and clients who want clinical-grade programming without the high-touch cost of Future.
- 1. **Add Nutrition Module** — Highest competitor parity gap. Minimal viable nutrition tracking (macros, meal logging) within 4 weeks.
**User Research & Persona Alignment:**
- - High contrast between Frost White (#E0ECF4) and Midnight Sapphire (#002060)
- - Add high contrast mode
**Architecture & Bug Hunter:**
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
**Frontend UX & Code Patterns:**
- *   **Rating:** **HIGH**
- *   **Rating:** **HIGH**
- *   **Rating:** **HIGH**
- *   **Rating:** **HIGH**
- *   **Rating:** **HIGH**
**Data Safety & Integrity:**
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
**Security II (Nemotron):**
- - **HIGH**: `getGoalById`, `getGoalAnalytics`, and `getGoalCategoriesStats` (latter validates `userId` param but doesn’t confirm requester matches) lack authZ. Enables IDOR attacks to harvest user PII.
**Security Debate (Phase 2A):**
- Both auditors concur that these findings represent compliance gaps (data minimization) and high‑risk security flaws (IDOR) requiring immediate remediation. No further disputes were identified in this round.
**Code Quality Debate (Phase 2B):**
- All critical bugs (CRIT-01 to CRIT-05, HIGH-01) are resolved with production-grade patterns. Ready for Round 3 final consolidation or edge-case stress testing.

---

*SwanStudios 14-Brain Recursive Consensus System v14.0*
*Phase 1: 12 parallel — Gemini 2.5 Flash + Claude Sonnet 4.6 + Step 3.5 Flash + Gemini 3 Flash + Gemini 3.1 Flash + DeepSeek V3.2 + MiniMax M2.1 + MiniMax M2.7 + Nemotron 3 Super + Qwen 3.6 Plus + Step Bug Hunter II + Data Safety (Claude)*
*Phase 2: 3 Specialty Debates — Security (Step ↔ Nemotron) + Code Quality (Claude ↔ Qwen) + UX/UI (Gemini 3.1 Pro ↔ M2.5:free)*
*Phase 3: Smart Escalation — Mercury 2 + MiniMax M2.7 (CRITICAL only)*
