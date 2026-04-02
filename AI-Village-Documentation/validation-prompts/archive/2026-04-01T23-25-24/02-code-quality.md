# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 66.7s
> **Files:** backend/controllers/workoutController.mjs, backend/routes/dailyMacroRoutes.mjs, backend/routes/social/challenges.mjs
> **Generated:** 4/1/2026, 4:25:24 PM

---

# SwanStudios Code Quality Review

## Executive Summary

Three backend files reviewed. No React/styled-components code present — findings focus on Node.js/Express/Sequelize patterns. Overall quality is **above average** with solid security awareness, but several architectural and reliability issues require attention.

---

## 🔴 CRITICAL Findings

### C-1 · `challenges.mjs` — Race Condition in Progress Update (Double-Write Bug)
**File:** `backend/routes/social/challenges.mjs` — `POST /:challengeId/progress`

```javascript
// BUG: Points calculated AFTER status already set to 'completed' with bonusPoints added
// Then overwritten by the formula below — bonusPoints added TWICE on completion

if (participation.progress >= challenge.goal && participation.status === 'active') {
  participation.status = 'completed';
  participation.pointsEarned += challenge.bonusPoints; // ← First addition
}

// This then OVERWRITES the above with a recalculation that adds bonusPoints again
const pointsFromProgress = Math.floor(participation.progress * challenge.pointsPerUnit);
participation.pointsEarned = pointsFromProgress + (participation.status === 'completed' ? challenge.bonusPoints : 0);
// ↑ bonusPoints added a second time
```

**Also:** No database transaction — concurrent requests can corrupt `progress` and `pointsEarned`.

**Fix:**
```javascript
router.post('/:challengeId/progress', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { challengeId } = req.params;
    const rawProgress = parseFloat(req.body.progress);
    const overwrite = req.body.overwrite === true;

    if (!Number.isFinite(rawProgress) || rawProgress < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid progress value' });
    }

    const participation = await ChallengeParticipant.findOne({
      where: { challengeId, userId: req.user.id, status: 'active' },
      lock: t.LOCK.UPDATE, // pessimistic lock
      transaction: t,
    });

    if (!participation) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Not an active participant' });
    }

    const challenge = await Challenge.findByPk(challengeId, { transaction: t });

    const newProgress = Math.min(
      overwrite ? rawProgress : participation.progress + rawProgress,
      challenge.goal
    );

    const isNowCompleted = newProgress >= challenge.goal && participation.status === 'active';
    const pointsFromProgress = Math.floor(newProgress * challenge.pointsPerUnit);
    const totalPoints = pointsFromProgress + (isNowCompleted ? challenge.bonusPoints : 0);

    await participation.update({
      progress: newProgress,
      status: isNowCompleted ? 'completed' : 'active',
      pointsEarned: totalPoints,
    }, { transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      participation,
      isCompleted: isNowCompleted,
      pointsEarned: totalPoints,
      progress: newProgress,
      goal: challenge.goal,
      progressPercentage: Math.min(100, Math.round((newProgress / challenge.goal) * 100)),
    });
  } catch (error) {
    await t.rollback();
    console.error('Error updating challenge progress:', error);
    return res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
});
```

---

### C-2 · `challenges.mjs` — Unvalidated `progress` Input Enables Score Manipulation
**File:** `backend/routes/social/challenges.mjs` — `POST /:challengeId/progress`

```javascript
// No bounds check — attacker can send progress: 999999999
const newProgress = overwrite ? parseFloat(progress) : participation.progress + parseFloat(progress);
participation.progress = Math.min(newProgress, challenge.goal); // only capped at goal
```

`parseFloat` on unvalidated input + no rate limiting = leaderboard manipulation. The fix in C-1 adds `Number.isFinite` and `>= 0` checks. Additionally add express-rate-limit on this route.

---

### C-3 · `challenges.mjs` — `console.error` Leaks Internal Error Details to Client
**File:** `backend/routes/social/challenges.mjs` — Multiple routes

```javascript
// EVERY error handler does this:
return res.status(500).json({
  success: false,
  message: 'Failed to create challenge',
  error: error.message  // ← Stack traces, SQL errors, table names exposed to client
});
```

This exposes Sequelize internals, table names, column names, and query structure to any authenticated user. **Fix:** Log full error server-side, return generic message to client.

```javascript
// Shared error handler utility (create utils/routeError.mjs)
export function handleRouteError(res, err, userMessage, logger) {
  logger.error(`[Challenges] ${userMessage}:`, { message: err.message, stack: err.stack });
  return res.status(500).json({ success: false, message: userMessage });
}
```

---

## 🟠 HIGH Findings

### H-1 · `workoutController.mjs` — Authorization Check After Data Assignment (TOCTOU)
**File:** `backend/controllers/workoutController.mjs` — `createWorkoutSession`

```javascript
// userId is set from req.body BEFORE the authorization check
const sessionData = {
  ...req.body,           // ← Attacker controls entire body
  userId: req.body.userId || req.user.id
};

// Authorization check happens AFTER body spread
if (sessionData.userId !== req.user.id && ...) { ... }
```

`req.body` spread means an attacker can inject arbitrary fields (`planId`, `status`, `exercises`, etc.) regardless of the auth check outcome. **Fix:** Whitelist fields explicitly.

```javascript
export async function createWorkoutSession(req, res) {
  try {
    const targetUserId = req.body.userId || req.user.id;

    if (targetUserId !== req.user.id &&
        req.user.role !== 'admin' &&
        req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'Not authorized to create sessions for other users');
    }

    // Explicit whitelist — never spread req.body directly
    const sessionData = {
      userId: targetUserId,
      planId: req.body.planId ?? null,
      sessionDate: req.body.sessionDate,
      duration: req.body.duration,
      status: req.body.status,
      exercises: req.body.exercises,
      notes: req.body.notes,
    };

    const session = await workoutService.createWorkoutSession(sessionData);
    return successResponse(res, { session }, 201);
  } catch (error) {
    logger.error(`Error creating workout session: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to create workout session', error);
  }
}
```

---

### H-2 · `workoutController.mjs` — DRY Violation: Authorization Pattern Repeated 8× 
**File:** `backend/controllers/workoutController.mjs`

The pattern `userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer'` appears in 8 functions with minor variations. This is a maintenance hazard — a role name change or new role requires 8 edits.

```javascript
// DUPLICATED across: getWorkoutSessions, getClientProgress, getWorkoutStatistics,
// getExerciseRecommendations, getWorkoutSessionById, updateWorkoutSession,
// deleteWorkoutSession, generateWorkoutSessions

if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return errorResponse(res, 403, '...');
}
```

**Fix:** Extract authorization helpers.

```javascript
// utils/workoutAuth.mjs
const ELEVATED_ROLES = new Set(['admin', 'trainer']);

export const isElevatedRole = (user) => ELEVATED_ROLES.has(user.role);

export const canAccessUserData = (requestingUser, targetUserId) =>
  requestingUser.id === targetUserId || isElevatedRole(requestingUser);

export const canModifyPlan = (requestingUser, plan) =>
  requestingUser.id === plan.trainerId ||
  requestingUser.role === 'admin';

export const canViewPlan = (requestingUser, plan) =>
  requestingUser.id === plan.clientId ||
  requestingUser.id === plan.trainerId ||
  requestingUser.role === 'admin';

// Usage in controller:
import { canAccessUserData } from '../utils/workoutAuth.mjs';

if (!canAccessUserData(req.user, userId)) {
  return errorResponse(res, 403, 'Not authorized to view this data');
}
```

---

### H-3 · `challenges.mjs` — N+1 Query: `Challenge.count()` Inside Response
**File:** `backend/routes/social/challenges.mjs` — `GET /active`

```javascript
// Runs a separate COUNT query AFTER the main findAll
pagination: {
  total: await Challenge.count({
    where: {
      status: 'active',
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gte]: new Date() }
    }
  })
}
```

The `where` clause is duplicated and the count runs as a second round-trip. Same pattern in `/my-challenges` and `/:challengeId/leaderboard`. **Fix:** Use `findAndCountAll`.

```javascript
const { count, rows: challenges } = await Challenge.findAndCountAll({
  where: activeWhere,
  limit,
  offset,
  order: [['startDate', 'DESC']],
  include: [...],
  distinct: true, // required when using include with count
});

return res.status(200).json({
  success: true,
  challenges: formattedChallenges,
  pagination: { limit, offset, total: count },
});
```

---

### H-4 · `dailyMacroRoutes.mjs` — Business Logic in Route File (No Service Layer)
**File:** `backend/routes/dailyMacroRoutes.mjs`

All macro aggregation logic (summing totals, rounding, grouping by meal type, weekly averaging) lives directly in route handlers. This is inconsistent with the workout controller's service-layer architecture and untestable without HTTP mocking.

```javascript
// 40+ lines of aggregation logic inside a route handler
for (const entry of entries) {
  summary.totalCalories += entry.calories || 0;
  // ... 6 more fields
  if (!summary.meals[entry.mealType]) { ... }
  // ...
}
// Rounding block
summary.totalCalories = Math.round(summary.totalCalories * 10) / 10;
// ... 6 more rounds
```

**Fix:** Extract to `services/macroService.mjs` mirroring the workout pattern.

---

### H-5 · `challenges.mjs` — Unused Imports (Dead Code / Attack Surface)
**File:** `backend/routes/social/challenges.mjs`

```javascript
import path from 'path';       // Only used in multer fileFilter — acceptable
import fs from 'fs';           // ← NEVER USED (was for local disk cleanup, now memory storage)
import { v4 as uuidv4 } from 'uuid'; // ← NEVER USED anywhere in the file
import { deletePhoto } from '../../services/photoStorageService.mjs'; // ← NEVER USED
```

`fs` import is particularly concerning — it signals leftover disk-write code that may have been partially removed, leaving the system in an inconsistent state. `deletePhoto` being unused means challenge images are never cleaned up on challenge deletion.

---

## 🟡 MEDIUM Findings

### M-1 · `workoutController.mjs` — `parseInt` Without Radix / NaN Guard on Query Params

```javascript
limit: limit ? parseInt(limit) : undefined,   // Missing radix 10
offset: offset ? parseInt(offset) : undefined, // Missing radix 10
```

`parseInt('08')` is safe in modern JS but `parseInt` without radix is a lint error and bad practice. More importantly, `parseInt('abc')` returns `NaN` which gets passed to Sequelize. **Fix:**

```javascript
const parsePositiveInt = (val) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

limit: parsePositiveInt(limit),
offset: parsePositiveInt(offset),
```

---

### M-2 · `dailyMacroRoutes.mjs` — DRY Violation: Date Validation Repeated 4×

```javascript
// Repeated in GET /, GET /summary, GET /weekly, and error handler fallback
const rawDate = req.query.date || new Date().toISOString().split('T')[0];
const date = isValidDate(rawDate) ? rawDate : new Date().toISOString().split('T')[0];
```

**Fix:**
```javascript
const getTodayISO = () => new Date().toISOString().split('T')[0];
const parseSafeDate = (raw) => (raw && isValidDate(raw)) ? raw : getTodayISO();

// Usage:
const date = parseSafeDate(req.query.date);
```

---

### M-3 · `dailyMacroRoutes.mjs` — DRY Violation: Admin/Trainer userId Override Repeated 2×

```javascript
// Duplicated in GET /summary and GET /weekly
let targetUserId = req.user.id;
if (req.query.userId && ['admin', 'trainer'].includes(req.user.role)) {
  const qId = parseInt(req.query.userId, 10);
  if (Number.isFinite(qId) && qId > 0) targetUserId = qId;
}
```

**Fix:**
```javascript
const resolveTargetUserId = (req) => {
  if (req.query.userId && ['admin', 'trainer'].includes(req.user.role)) {
    const qId = parseInt(req.query.userId, 10);
    if (Number.isFinite(qId) && qId > 0) return qId;
  }
  return req.user.id;
};
```

---

### M-4 · `dailyMacroRoutes.mjs` — Rounding Block Repeated 7× (Summary + Weekly)

```javascript
// In /summary: 7 manual rounding lines
summary.totalCalories = Math.round(summary.totalCalories * 10) / 10;
summary.totalProtein  = Math.round(summary.totalProtein  * 10) / 10;
// ... 5 more

// In /weekly: same pattern per day
calories: Math.round(d.calories * 10) / 10,
// ...
```

**Fix:**
```javascript
const round1 = (n) => Math.round(n * 10) / 10;

const roundMacros = (obj) => ({
  ...obj,
  calories: round1(obj.calories),
  protein:  round1(obj.protein),
  carbs:    round1(obj.carbs),
  fat:      round1(obj.fat),
  fiber:    round1(obj.fiber ?? 0),
  sugar:    round1(obj.sugar ?? 0),
  sodium:   round1(obj.sodium ?? 0),
});
```

---

### M-5 · `challenges.mjs` — Silent Swallow of R2 Upload Failure

```javascript
try {
  const result = await uploadPhoto(...);
  challengeData.imageUrl = result.url;
} catch (uploadErr) {
  console.error('R2 upload failed for challenge image:', uploadErr.message);
  // ←

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
