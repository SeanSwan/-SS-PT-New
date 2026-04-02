# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.6s
> **Files:** backend/controllers/workoutController.mjs, backend/routes/dailyMacroRoutes.mjs, backend/routes/social/challenges.mjs
> **Generated:** 4/1/2026, 4:25:24 PM

---

# SwanStudios Data Safety Audit Report
## Extreme Paranoia Review — Production Platform

---

## EXECUTIVE SUMMARY

After ruthless review of all three files, I identified **18 findings** ranging from CRITICAL to LOW. The most dangerous issues are in `challenges.mjs` — a `participation.destroy()` with no soft-delete, error messages leaking internal stack traces to clients, missing transaction wrappers on multi-table operations, and a progress update race condition that can corrupt points data. The workout controller has a trainer privilege escalation gap and an unvalidated userId injection vector. The macro routes are the safest of the three but still have a hard-delete on nutritional records.

---

## FINDING #1 — CRITICAL

**Severity:** CRITICAL  
**Data at Risk:** Challenge participation history, points earned, progress records — permanent loss  
**Blast Radius:** Any user who clicks "Leave Challenge" — their entire participation record is gone forever  
**File & Line:** `backend/routes/social/challenges.mjs` — `router.post('/:challengeId/leave')`

**What's Wrong:**
```javascript
// THIS IS A HARD DELETE — NO RECOVERY POSSIBLE
await participation.destroy();
```
`participation.destroy()` issues a physical `DELETE FROM challenge_participants WHERE id = ?`. If the model does not have `paranoid: true` (soft-delete), this record is **gone from the database permanently**. A user's progress, points earned, completion status, and participation history are wiped. If this feeds into a leaderboard, achievement system, or billing/reward calculation, those downstream records now reference a ghost. There is zero audit trail.

**Fix:**
```javascript
// OPTION A: Soft-delete (preferred — requires paranoid: true on model)
// In ChallengeParticipant model definition:
// paranoid: true  ← adds deletedAt column, destroy() becomes soft-delete

// OPTION B: Status update (safe without model changes)
router.post('/:challengeId/leave', async (req, res) => {
  try {
    const { challengeId } = req.params;

    const challenge = await Challenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    // Prevent leaving completed challenges (preserve history)
    if (challenge.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave a completed challenge — history is preserved'
      });
    }

    const participation = await ChallengeParticipant.findOne({
      where: { challengeId, userId: req.user.id }
    });

    if (!participation) {
      return res.status(400).json({
        success: false,
        message: 'You are not participating in this challenge'
      });
    }

    // SAFE: Mark as withdrawn, NEVER hard-delete participation records
    await participation.update({
      status: 'withdrawn',
      withdrawnAt: new Date()
      // progress and pointsEarned preserved for audit/history
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully left the challenge'
    });
  } catch (error) {
    // DO NOT expose error.message to client
    console.error('Error leaving challenge:', error);
    return res.status(500).json({ success: false, message: 'Failed to leave challenge' });
  }
});
```

---

## FINDING #2 — CRITICAL

**Severity:** CRITICAL  
**Data at Risk:** Challenge participation points — double-counting bonus points corrupts reward balances for ALL users who complete a challenge  
**Blast Radius:** Every user who completes any challenge — points data permanently corrupted  
**File & Line:** `backend/routes/social/challenges.mjs` — `router.post('/:challengeId/progress')` — lines calculating `pointsEarned`

**What's Wrong:**
```javascript
// BUG 1: bonusPoints added BEFORE the recalculation overwrites it
if (participation.progress >= challenge.goal && participation.status === 'active') {
  participation.status = 'completed';
  participation.pointsEarned += challenge.bonusPoints; // ← adds bonus
}

// BUG 2: This line then OVERWRITES the above with a fresh calculation
// that adds bonusPoints AGAIN if status === 'completed'
const pointsFromProgress = Math.floor(participation.progress * challenge.pointsPerUnit);
participation.pointsEarned = pointsFromProgress + 
  (participation.status === 'completed' ? challenge.bonusPoints : 0); // ← adds bonus AGAIN
```

The bonus points are added twice on the completion call. If `bonusPoints = 100` and `pointsFromProgress = 500`, the user gets `600` points but the first `+= challenge.bonusPoints` is immediately overwritten — so actually the first addition is silently discarded. The real bug is that the logic is **non-deterministic and wrong**: calling this endpoint multiple times after completion will keep recalculating `pointsFromProgress` from the capped progress value and re-adding bonus, inflating points on every subsequent progress update.

**Additionally:** No transaction wrapper. If `participation.save()` fails after status is set to `completed` in memory, the next call re-enters with `status: 'active'` from the DB and awards bonus again.

**Fix:**
```javascript
router.post('/:challengeId/progress', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { challengeId } = req.params;
    const { progress, overwrite = false } = req.body;

    if (progress === undefined || isNaN(parseFloat(progress))) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Valid progress value is required' });
    }

    const progressValue = Math.max(0, parseFloat(progress));

    // Lock the row for update to prevent race conditions
    const participation = await ChallengeParticipant.findOne({
      where: { challengeId, userId: req.user.id, status: 'active' },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!participation) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'You are not an active participant in this challenge'
      });
    }

    const challenge = await Challenge.findByPk(challengeId, { transaction: t });

    const newProgress = overwrite
      ? progressValue
      : participation.progress + progressValue;
    const cappedProgress = Math.min(newProgress, challenge.goal);

    // Calculate points ONCE, correctly
    const pointsFromProgress = Math.floor(cappedProgress * challenge.pointsPerUnit);
    const wasAlreadyCompleted = participation.status === 'completed';
    const isNowCompleted = cappedProgress >= challenge.goal;
    
    // Only award bonus once — when transitioning from active → completed
    const bonusAwarded = (!wasAlreadyCompleted && isNowCompleted) ? challenge.bonusPoints : 0;

    await participation.update({
      progress: cappedProgress,
      status: isNowCompleted ? 'completed' : 'active',
      pointsEarned: pointsFromProgress + bonusAwarded,
      completedAt: isNowCompleted && !wasAlreadyCompleted ? new Date() : participation.completedAt
    }, { transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      participation,
      isCompleted: isNowCompleted,
      pointsEarned: participation.pointsEarned,
      progress: cappedProgress,
      goal: challenge.goal,
      progressPercentage: Math.min(100, Math.round((cappedProgress / challenge.goal) * 100))
    });
  } catch (error) {
    await t.rollback();
    console.error('Error updating challenge progress:', error);
    return res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
});
```

---

## FINDING #3 — CRITICAL

**Severity:** CRITICAL  
**Data at Risk:** Internal database schema, error stack traces, model names, SQL queries — exposed to any authenticated user  
**Blast Radius:** All users — any authenticated user can trigger errors and read internal system details  
**File & Line:** `backend/routes/social/challenges.mjs` — every `catch` block, e.g.:

```javascript
return res.status(500).json({
  success: false,
  message: 'Failed to fetch active challenges',
  error: error.message  // ← LEAKS INTERNAL DETAILS
});
```

**What's Wrong:**
`error.message` from Sequelize contains table names, column names, SQL syntax, constraint names, and sometimes partial query data. Example real Sequelize error messages:
- `"column \"userId\" of relation \"challenge_participants\" does not exist"`
- `"invalid input syntax for type uuid: \"abc123\""`
- `"null value in column \"challengeId\" violates not-null constraint"`

This is a **reconnaissance goldmine** for attackers. It reveals your exact database schema, column types, and constraint names. This appears in **every single catch block** across the challenges routes — approximately 10 instances.

**Fix:**
```javascript
// Create a safe error handler utility
// backend/utils/safeError.mjs
export const safeErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  // In development, return full error for debugging
  if (process.env.NODE_ENV === 'development') {
    return error.message;
  }
  // In production, NEVER expose internal error details
  return fallback;
};

// Usage in every catch block:
catch (error) {
  console.error('Error fetching active challenges:', error); // Full error in server logs only
  return res.status(500).json({
    success: false,
    message: 'Failed to fetch active challenges'
    // NO error.message field in production
  });
}
```

---

## FINDING #4 — CRITICAL

**Severity:** CRITICAL  
**Data at Risk:** Any user's workout sessions — a trainer can create, read, update, or delete sessions for ANY user without ownership verification  
**Blast Radius:** All clients — any trainer account can access all client data  
**File & Line:** `backend/controllers/workoutController.mjs` — `getWorkoutSessions` (line ~145), `getClientProgress` (~210), `getWorkoutStatistics` (~235), `getExerciseRecommendations` (~265)

**What's Wrong:**
```javascript
// getWorkoutSessions
const userId = req.params.userId || req.user.id;
// NO authorization check follows — any authenticated user gets sessions
const sessions = await workoutService.getWorkoutSessions(userId, { ... });
```

```javascript
// getClientProgress
const userId = req.params.userId || req.user.id;
if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return errorResponse(res, 403, ...);
}
// ↑ Trainer role bypasses ALL ownership checks
// A trainer can query ANY userId — including other trainers' clients
```

The trainer role check is a blanket bypass — there is no verification that the trainer is actually assigned to the client they're querying. A rogue trainer account (or a compromised trainer JWT) can enumerate all user IDs and read every client's workout history, progress metrics, and exercise data.

**Fix:**
```javascript
// Add trainer-client relationship verification
async function verifyTrainerClientAccess(trainerId, clientId) {
  // Check if trainer has an active assignment to this client
  // This requires a trainer_client_assignments table or similar
  const assignment = await TrainerClientAssignment.findOne({
    where: {
      trainerId,
      clientId,
      status: 'active'
    }
  });
  return !!assignment;
}

// In getWorkoutSessions:
export async function getWorkoutSessions(req, res) {
  try {
    const userId = req.params.userId || req.user.id;

    // Authorization check for cross-user access
    if (userId !== req.user.id) {
      if (req.user.role === 'admin') {
        // Admin: full access, no further check needed
      } else if (req.user.role === 'trainer') {
        // Trainer: MUST be assigned to this client
        const hasAccess = await verifyTrainerClientAccess(req.user.id, userId);
        if (!hasAccess) {
          return errorResponse(res, 403, 'You are not assigned to this client');
        }
      } else {
        return errorResponse(res, 403, 'You are not authorized to view these sessions');
      }
    }

    const sessions = await workoutService.getWorkoutSessions(userId, { ... });
    return successResponse(res, { sessions });
  } catch (error) {
    logger.error(`Error getting workout sessions: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get workout sessions');
  }
}
```

---

## FINDING #5 — CRITICAL

**Severity:** CRITICAL  
**Data at Risk:** Workout sessions for any user — a client can create sessions attributed to other users by injecting `userId` in the request body  
**Blast Radius:** Any user's session records can be polluted by any other authenticated user  
**File & Line:** `backend/controllers/workoutController.mjs` — `createWorkoutSession` (~165) and `generateWorkoutSessions` (~390)

**What's Wrong:**
```javascript
// createWorkoutSession
const sessionData = {
  ...req.body,           // ← req.body spread FIRST
  userId: req.body.userId || req.user.id  // ← then userId from body
};

// The spread of req.body means ANY field in the body overwrites sessionData
// A malicious client sends: { "userId": "victim-uuid", "exercises": [...] }
// The check below only catches the userId field, but req.body spread
// could also inject: planId, status, deletedAt, createdAt, etc.
if (sessionData.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return errorResponse(res, 403, ...);
}
```

The `...req.body` spread before the authorization check means a client can inject `planId` pointing to another user's plan, `status: 'completed'` to fake completion, or even `deletedAt: null` to resurrect soft-deleted records. The userId check only catches the userId field — not the other injected fields.

**Fix:**
```javascript
export async function createWorkoutSession(req, res) {
  try {
    // NEVER spread req.body directly — whitelist allowed fields explicitly
    const {
      planId,
      sessionDate,
      duration,
      status,
      exercises,
      notes,
      userId: requestedUserId
    } = req.body;

    // Determine target userId with authorization
    let targetUserId = req.user.id; // Default to authenticated user

    if (requestedUserId && requestedUserId !== req.user.id) {
      if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
        return errorResponse(res, 403, 'You are not authorized to create sessions for other users');
      }
      // Trainer: verify assignment
      if (req.user.role === 'trainer') {
        const hasAccess = await verifyTrainerClientAccess(req.user.id, requestedUserId);
        if (!hasAccess) {
          return errorResponse(res, 403, 'You are not assigned to this client');
        }
      }
      targetUserId = requestedUserId;
    }

    // Build sessionData from WHITELISTED fields only
    const sessionData = {
      userId: targetUserId,  // Always from our controlled variable
      planId: planId || null,
      sessionDate: sessionDate || new Date().toISOString().split('T')[0],
      duration: duration ? Math.max(0, parseInt(duration)) : null,
      status: ['planned', 'in_progress', 'completed', 'skipped'].includes(status) ? status : 'planned',
      exercises: Array.isArray(exercises) ? exercises : [],

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
