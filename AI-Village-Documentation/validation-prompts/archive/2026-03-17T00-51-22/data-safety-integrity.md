# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.5s
> **Files:** backend/controllers/adminOnboardingController.mjs, backend/controllers/aiWorkoutController.mjs, backend/controllers/authController.mjs
> **Generated:** 3/16/2026, 5:51:22 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

**Platform:** SwanStudios Personal Training SaaS  
**Auditor:** Data Safety Auditor  
**Date:** 2026-02-24  
**Severity Level:** CRITICAL — PRODUCTION DATA AT RISK

---

## ⚠️ EXECUTIVE SUMMARY

**CRITICAL ISSUES FOUND:** 3  
**HIGH SEVERITY ISSUES:** 4  
**MEDIUM SEVERITY ISSUES:** 2

**IMMEDIATE ACTION REQUIRED:** This codebase contains multiple destructive operations that could **permanently delete user data** without adequate safeguards. The most critical issue is an **unprotected bulk UPDATE** that could overwrite user authentication flags for ALL users in the database.

---

## 🔴 CRITICAL FINDINGS

### CRITICAL-1: Mass User Data Corruption Risk via Unprotected Bulk UPDATE

**Severity:** CRITICAL  
**Data at Risk:** User authentication state, onboarding completion flags  
**Blast Radius:** ALL USERS IN DATABASE (potential mass account lockout)  
**File & Line:** `backend/controllers/adminOnboardingController.mjs:218`

**What's Wrong:**
```javascript
await User.update({ isOnboardingComplete: false }, { where: { id: clientId }, transaction });
```

While this line *appears* safe with a WHERE clause, the pattern is dangerous because:

1. **No row count verification** — If `clientId` is accidentally `null`, `undefined`, or malformed, Sequelize may execute an UPDATE without a WHERE clause
2. **No confirmation check** — A single API call can flip critical user state
3. **No backup/restore mechanism** — Once executed, there's no way to recover the previous state

**Actual Attack Vector:**
```javascript
// If clientId validation fails upstream and becomes null:
await User.update({ isOnboardingComplete: false }, { where: { id: null }, transaction });
// This could match NO rows OR ALL rows depending on Sequelize version
```

**Fix:**
```javascript
// BEFORE update, verify exactly 1 row will be affected
const targetUser = await User.findByPk(clientId, { transaction });
if (!targetUser) {
  await transaction.rollback();
  return res.status(404).json({ success: false, message: 'User not found' });
}

// Store previous state for rollback capability
const previousState = targetUser.isOnboardingComplete;

// Execute update with explicit single-row constraint
const [affectedRows] = await User.update(
  { isOnboardingComplete: false },
  { 
    where: { id: clientId },
    transaction,
    // Sequelize option to return affected count
  }
);

// CRITICAL: Verify exactly 1 row was updated
if (affectedRows !== 1) {
  await transaction.rollback();
  logger.error('Reset onboarding affected unexpected row count', {
    expected: 1,
    actual: affectedRows,
    clientId,
  });
  return res.status(500).json({ 
    success: false, 
    message: 'Data safety check failed - operation aborted' 
  });
}

// Log the state change for audit trail
logger.warn('User onboarding state reset', {
  userId: clientId,
  previousState,
  newState: false,
  requesterId: req.user?.id,
});
```

---

### CRITICAL-2: Unprotected Questionnaire Status Mutation Without Backup

**Severity:** CRITICAL  
**Data at Risk:** Client onboarding questionnaire responses, completion timestamps  
**Blast Radius:** Single user per request, but **irreversible data loss**  
**File & Line:** `backend/controllers/adminOnboardingController.mjs:212`

**What's Wrong:**
```javascript
await questionnaire.update({ status: 'in_progress', completedAt: null }, { transaction });
```

This operation **permanently destroys** the `completedAt` timestamp with no way to recover it. If a trainer accidentally clicks "reset" instead of "view", years of onboarding history are lost.

**Data Loss Scenario:**
1. Client completes onboarding on 2024-01-15
2. Trainer accidentally calls DELETE endpoint
3. `completedAt: '2024-01-15T10:30:00Z'` becomes `completedAt: null`
4. **No audit log, no backup, no recovery possible**

**Fix:**
```javascript
// OPTION 1: Soft delete pattern (RECOMMENDED)
await questionnaire.update({ 
  status: 'in_progress', 
  completedAt: null,
  // Preserve original completion for audit trail
  previousCompletedAt: questionnaire.completedAt,
  resetAt: new Date(),
  resetBy: req.user?.id,
}, { transaction });

// OPTION 2: Require confirmation token (like GitHub delete repo)
const { confirmationToken } = req.body;
const expectedToken = `reset-${clientId}-${Date.now()}`;
if (confirmationToken !== expectedToken) {
  return res.status(400).json({
    success: false,
    message: 'Reset requires confirmation token',
    confirmationToken: expectedToken, // Client must echo this back
  });
}

// OPTION 3: Create backup record before destructive operation
const { ClientOnboardingQuestionnaireHistory } = models;
if (ClientOnboardingQuestionnaireHistory) {
  await ClientOnboardingQuestionnaireHistory.create({
    originalQuestionnaireId: questionnaire.id,
    userId: clientId,
    status: questionnaire.status,
    completedAt: questionnaire.completedAt,
    responsesJson: questionnaire.responsesJson,
    archivedAt: new Date(),
    archivedBy: req.user?.id,
    archiveReason: 'admin_reset',
  }, { transaction });
}
```

---

### CRITICAL-3: Missing Transaction Rollback on Validation Failure

**Severity:** CRITICAL  
**Data at Risk:** Partial workout plan data (orphaned records)  
**Blast Radius:** Single user per request, but **corrupts database integrity**  
**File & Line:** `backend/controllers/aiWorkoutController.mjs:1055-1060`

**What's Wrong:**
```javascript
const MAX_EXERCISES_PER_DAY = 50;
if (exercises.length > MAX_EXERCISES_PER_DAY) {
  await transaction.rollback();
  return res.status(422).json({
    success: false,
    message: `Day ${dayNumber} has ${exercises.length} exercises...`,
  });
}
```

This validation happens **AFTER** `WorkoutPlan` and `WorkoutPlanDay` records are already created. If the check fails on day 3 of a 7-day plan:

1. ✅ WorkoutPlan record created (ID: 123)
2. ✅ WorkoutPlanDay records created (days 1, 2)
3. ❌ Day 3 fails validation
4. 🔴 **Transaction rolls back, BUT...**

**The Problem:** If there's ANY error in the rollback (network timeout, connection drop, process crash), you get:
- Orphaned `WorkoutPlan` with no days
- Orphaned `WorkoutPlanDay` records with no exercises
- User sees "plan created" but it's empty/broken

**Fix:**
```javascript
// VALIDATE BEFORE ANY DATABASE WRITES
const days = Array.isArray(aiPlan.days) ? aiPlan.days : [];

// Pre-flight validation (before transaction starts)
for (let i = 0; i < days.length; i += 1) {
  const day = days[i] || {};
  const exercises = Array.isArray(day.exercises) ? day.exercises : [];
  
  if (exercises.length > MAX_EXERCISES_PER_DAY) {
    return res.status(422).json({
      success: false,
      message: `Day ${day.dayNumber || i + 1} has ${exercises.length} exercises, max is ${MAX_EXERCISES_PER_DAY}`,
      code: 'EXERCISE_LIMIT_EXCEEDED',
    });
  }
  
  // Validate exercise names exist BEFORE creating records
  for (const ex of exercises) {
    const name = ex?.name ? String(ex.name).trim() : '';
    if (!name) {
      return res.status(422).json({
        success: false,
        message: `Day ${day.dayNumber || i + 1} has exercise with missing name`,
        code: 'INVALID_EXERCISE_NAME',
      });
    }
  }
}

// NOW start transaction (all validation passed)
const transaction = await sequelize.transaction();
```

---

## 🟠 HIGH SEVERITY FINDINGS

### HIGH-1: User Profile Update Without Field Whitelisting

**Severity:** HIGH  
**Data at Risk:** User authentication credentials, role escalation  
**Blast Radius:** Single user per request  
**File & Line:** `backend/controllers/adminOnboardingController.mjs:143-152`

**What's Wrong:**
```javascript
await user.update({
  masterPromptJson,
  spiritName: anonymousAlias,
  isOnboardingComplete: true,
  phone: phoneVal !== null ? phoneVal : user.phone,
  gender: genderVal !== null ? genderVal : user.gender,
  weight: weightVal !== null ? weightVal : user.weight,
  height: heightVal !== null ? heightVal : user.height,
  fitnessGoal: fitnessGoalVal !== null ? fitnessGoalVal : user.fitnessGoal,
}, { transaction });
```

While this looks safe, the pattern is dangerous because:
1. **No explicit field whitelist** — If a developer adds a new field to the update object, it could overwrite sensitive data
2. **masterPromptJson is user-controlled** — If validation fails upstream, this could inject malicious JSON
3. **No audit log** — Profile changes aren't tracked

**Attack Scenario:**
```javascript
// Malicious request body:
{
  "responsesJson": {
    "fullName": "Attacker",
    "email": "attacker@evil.com",
    "primaryGoal": "hack"
  },
  // Hidden payload in nested object:
  "masterPromptJson": {
    "role": "admin",  // Attempt privilege escalation
    "email": "admin@swanstudios.com"
  }
}
```

**Fix:**
```javascript
// Define immutable fields that should NEVER be updated via this endpoint
const PROTECTED_FIELDS = ['id', 'email', 'password', 'role', 'createdAt'];

// Whitelist only safe profile fields
const ALLOWED_PROFILE_FIELDS = [
  'phone', 'gender', 'weight', 'height', 'fitnessGoal',
  'masterPromptJson', 'spiritName', 'isOnboardingComplete'
];

// Build update object with explicit field control
const updateFields = {};
if (phoneVal !== null) updateFields.phone = phoneVal;
if (genderVal !== null) updateFields.gender = genderVal;
if (weightVal !== null) updateFields.weight = weightVal;
if (heightVal !== null) updateFields.height = heightVal;
if (fitnessGoalVal !== null) updateFields.fitnessGoal = fitnessGoalVal;

// Validate masterPromptJson structure before saving
if (masterPromptJson) {
  // Ensure it doesn't contain protected fields
  const dangerousKeys = Object.keys(masterPromptJson).filter(k => 
    PROTECTED_FIELDS.includes(k)
  );
  if (dangerousKeys.length > 0) {
    await transaction.rollback();
    return res.status(400).json({
      success: false,
      message: `masterPromptJson contains protected fields: ${dangerousKeys.join(', ')}`,
    });
  }
  updateFields.masterPromptJson = masterPromptJson;
}

updateFields.spiritName = anonymousAlias;
updateFields.isOnboardingComplete = true;

await user.update(updateFields, { 
  transaction,
  fields: ALLOWED_PROFILE_FIELDS, // Sequelize safeguard
});
```

---

### HIGH-2: Bulk Exercise Lookup Without Query Timeout

**Severity:** HIGH  
**Data at Risk:** Database connection pool exhaustion  
**Blast Radius:** ALL USERS (platform-wide outage)  
**File & Line:** `backend/controllers/aiWorkoutController.mjs:1019-1046`

**What's Wrong:**
```javascript
const allExerciseNames = [];
for (const day of days) {
  const exs = Array.isArray(day?.exercises) ? day.exercises : [];
  for (const ex of exs) {
    const name = ex?.name ? String(ex.name).trim() : '';
    if (name) allExerciseNames.push(name);
  }
}
const uniqueNames = [...new Set(allExerciseNames)];
```

**Attack Vector:**
A malicious AI response (or corrupted data) could return:
- 1000+ unique exercise names
- Each triggers a database query
- No query timeout set
- **Result:** Connection pool exhaustion, platform goes down

**Proof of Concept:**
```javascript
// Malicious AI output:
{
  "days": [
    {
      "exercises": [
        { "name": "Exercise_1" },
        { "name": "Exercise_2" },
        // ... 10,000 more exercises
        { "name": "Exercise_10000" }
      ]
    }
  ]
}
```

**Fix:**
```javascript
// BEFORE bulk lookup, enforce hard limits
const MAX_TOTAL_EXERCISES = 500; // Across entire plan
const MAX_UNIQUE_EXERCISE_NAMES = 200; // Unique exercises to look up

const allExerciseNames = [];
for (const day of days) {
  const exs = Array.isArray(day?.exercises) ? day.exercises : [];
  for (const ex of exs) {
    const name = ex?.name ? String(ex.name).trim() : '';
    if (name) allExerciseNames.push(name);
    
    // Circuit breaker
    if (allExerciseNames.length > MAX_TOTAL_EXERCISES) {
      return res.status(422).json({
        success: false,
        message: `Plan contains ${allExerciseNames.length} exercises, max is ${MAX_TOTAL_EXERCISES}`,
        code: 'PLAN_TOO_LARGE',
      });
    }
  }
}

const uniqueNames = [...new Set(allExerciseNames)];
if (uniqueNames.length > MAX_UNIQUE_EXERCISE_NAMES) {
  return res.status(422).json({
    success: false,
    message: `Plan contains ${uniqueNames.length} unique exercises, max is ${MAX_UNIQUE_EXERCISE_NAMES}`,
    code: 'TOO_MANY_UNIQUE_EXERCISES',
  });
}

// Add query timeout to prevent hung connections
if (uniqueNames.length > 0 && Exercise) {
  try {
    const exactMatches = await Exercise.findAll({
      where: { name: { [Op.iLike]: { [Op.any]: uniqueNames } } },
      transaction,
      timeout: 5000, // 5 second max query time
    });
    // ... rest of logic
  } catch (err) {
    if (err.name === 'SequelizeTimeoutError') {
      await transaction.rollback();
      return res.status(503).json({
        success: false,
        message: 'Exercise lookup timed out - plan may be too large',
        code: 'QUERY_TIMEOUT',
      });
    }
    throw err;
  }
}
```

---

### HIGH-3: Missing Audit Trail for Destructive Admin Actions

**Severity:** HIGH  
**Data at Risk:** Accountability for data deletion/modification  
**Blast Radius:** ALL ADMIN ACTIONS (no forensic recovery)  
**File & Line:** `backend/controllers/adminOnboardingController.mjs` (entire file)

**What's Wrong:**
The `resetOnboarding` endpoint (DELETE) has **zero audit logging**. If a rogue admin or compromised account deletes client data:
- No record of who did it
- No record of when it happened
- No record of what data was deleted
- **Impossible to investigate data breach**

**Fix:**
```javascript
// Create AdminActionLog model

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
