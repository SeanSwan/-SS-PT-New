# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.1s
> **Files:** backend/controllers/adminSpecialController.mjs, backend/controllers/goalController.mjs, backend/controllers/workoutController.mjs
> **Generated:** 4/1/2026, 4:55:24 PM

---

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

*Part of SwanStudios 14-Brain Recursive Consensus System*
