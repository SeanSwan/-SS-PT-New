# Smart Escalation (MiniMax M2.7) — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7 | **Duration:** 39.8s
> **Files:** backend/controllers/adminSpecialController.mjs, backend/controllers/goalController.mjs, backend/controllers/workoutController.mjs
> **Generated:** 4/1/2026, 4:55:24 PM

---

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

*Part of SwanStudios 14-Brain Recursive Consensus System*
