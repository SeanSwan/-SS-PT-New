# Smart Escalation (MiniMax M2.7) — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7 | **Duration:** 50.3s
> **Files:** backend/controllers/workoutController.mjs, backend/routes/dailyMacroRoutes.mjs, backend/routes/social/challenges.mjs
> **Generated:** 4/1/2026, 4:25:24 PM

---

# Security Deep-Dive Analysis: SwanStudios Platform

Based on the code provided, I'll analyze the actual security posture and provide accurate severity classifications.

---

## Finding #1: Incomplete Authorization Check in `getWorkoutSessions`

### 1. Severity Assessment: **HIGH** (Not Over-Classified)

The `getWorkoutSessions` function allows arbitrary user ID injection without ownership verification.

```javascript
// CURRENT CODE (workoutController.mjs line ~48)
export async function getWorkoutSessions(req, res) {
  try {
    const userId = req.params.userId || req.user.id;  // ❌ No authorization check!
    
    const sessions = await workoutService.getWorkoutSessions(userId, {...});
```

Compare with `getWorkoutStatistics` which correctly checks authorization:

```javascript
// CORRECT PATTERN (already exists in file)
if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer') {
  return errorResponse(res, 403, 'You are not authorized to view these statistics');
}
```

### 2. Exact Fix

```javascript
export async function getWorkoutSessions(req, res) {
  try {
    const requestedUserId = req.params.userId || req.user.id;
    
    // Add authorization check
    if (requestedUserId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'trainer') {
      return errorResponse(res, 403, 'You are not authorized to view these workout sessions');
    }
    
    const { limit, offset, status, startDate, endDate, sort, order } = req.query;
    
    const sessions = await workoutService.getWorkoutSessions(requestedUserId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      status,
      startDate,
      endDate,
      sort,
      order
    });
    
    return successResponse(res, { sessions });
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' && error.message?.includes('does not exist')) {
      return successResponse(res, { sessions: [], total: 0 });
    }
    logger.error(`Error getting workout sessions: ${error.message}`, { stack: error.stack });
    return errorResponse(res, 500, 'Failed to get workout sessions', error);
  }
}
```

### 3. Blast Radius

- **All authenticated users** can enumerate workout sessions of any other user
- **Attack Vector**: `GET /api/workout/sessions?userId=123`
- **Impact**: Workout history exposure (fitness routines, schedules, progress data)
- **Severity Scale**: Affects any user whose ID an attacker can guess or enumerate

### 4. Priority: **P1 - IMMEDIATE**

---

## Finding #2: Error Response Schema Leakage

### 1. Severity Assessment: **MEDIUM** (Properly Classified)

The error handling passes the full error object to the client:

```javascript
// CURRENT CODE - potential info leak
logger.error(`Error getting workout sessions: ${error.message}`, { stack: error.stack });
return errorResponse(res, 500, 'Failed to get workout sessions', error);  // ❌ Leaks error
```

If `errorResponse` serializes the `error` parameter to JSON, this exposes:
- Database table/column names
- SQL query fragments
- Internal file paths
- Stack traces

### 2. Exact Fix

```javascript
// Option A: Don't pass error to client (recommended)
return errorResponse(res, 500, 'Failed to get workout sessions');

// Option B: Sanitized error response
return errorResponse(res, 500, 'Failed to get workout sessions', {
  code: 'INTERNAL_ERROR',
  requestId: req.id // If you have request ID tracking
});

// Option C: Development vs Production
return errorResponse(res, 500, 'Failed to get workout sessions', 
  process.env.NODE_ENV === 'development' ? error.message : undefined
);
```

Update `errorResponse` utility to not automatically serialize third parameter:

```javascript
// utils/responseUtils.mjs
export const errorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  // Only include details in non-production or if explicitly safe
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};
```

### 3. Blast Radius

- **Low user impact**: Server-side information disclosure
- **High reconnaissance value**: Helps attackers map database schema, identify injection points
- **Exposed in**: All 500 errors across the platform

### 4. Priority: **P2 - HIGH**

---

## Finding #3: Missing Rate Limiting on Macro Endpoints

### 1. Severity Assessment: **MEDIUM** (Properly Classified)

The `dailyMacroRoutes.mjs` has no rate limiting despite handling user health data with multiple operations per day.

```javascript
// CURRENT CODE - no rate limit
router.post('/', async (req, res) => {...});
router.get('/', async (req, res) => {...});
router.get('/summary', async (req, res) => {...});
router.get('/weekly', async (req, res) => {...});
router.patch('/:id', async (req, res) => {...});
router.delete('/:id', async (req, res) => {...});
```

### 2. Exact Fix

```javascript
import rateLimit from 'express-rate-limit';

// Rate limiter for macro endpoints
const macroLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { 
    success: false, 
    error: 'Too many macro requests, please try again later' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id, // Rate limit per user
  skip: (req) => req.user.role === 'admin' // Skip for admins
});

// Stricter limiter for write operations
const macroWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 writes per minute
  message: { 
    success: false, 
    error: 'Too many macro updates, please slow down' 
  }
});

router.use(macroLimiter);
router.post('/', macroWriteLimiter, async (req, res) => {...});
router.patch('/:id', macroWriteLimiter, async (req, res) => {...});
router.delete('/:id', macroWriteLimiter, async (req, res) => {...});
```

### 3. Blast Radius

- **Enumeration attacks**: Bulk data harvesting
- **Denial of Service**: Resource exhaustion via repeated queries
- **Data Harvesting**: Automated collection of dietary habits

### 4. Priority: **P3 - MEDIUM**

---

## Finding #4: Trainer Can Access ANY User's Macro Data

### 1. Severity Assessment: **MEDIUM** (Potentially Over-Classified as CRITICAL)

The current code allows trainers to view any user's data by ID:

```javascript
// dailyMacroRoutes.mjs line ~92
let targetUserId = req.user.id;
if (req.query.userId && ['admin', 'trainer'].includes(req.user.role)) {
  const qId = parseInt(req.query.userId, 10);
  if (Number.isFinite(qId) && qId > 0) targetUserId = qId;  // ❌ No client-trainer relationship check
}
```

### 2. Exact Fix

```javascript
// Option A: Check trainer-client relationship (requires relationship table)
import { TrainerClient } from '../models/index.mjs';

const canAccessUserData = async (accessorId, targetUserId, accessorRole) => {
  if (accessorRole === 'admin') return true;
  if (accessorRole === 'trainer') {
    const relationship = await TrainerClient.findOne({
      where: {
        trainerId: accessorId,
        clientId: targetUserId,
        status: 'active'
      }
    });
    return !!relationship;
  }
  return accessorId === targetUserId;
};

// Usage in endpoints
let targetUserId = req.user.id;
if (req.query.userId && req.query.userId !== req.user.id) {
  const canAccess = await canAccessUserData(req.user.id, req.query.userId, req.user.role);
  if (!canAccess) {
    return res.status(403).json({ 
      success: false, 
      error: 'Not authorized to access this user\'s data' 
    });
  }
  targetUserId = parseInt(req.query.userId, 10);
}
```

### 3. Blast Radius

- **Internal threat**: Malicious trainer accessing any client's data
- **Compliance**: May violate HIPAA/GDPR if trainer-client relationship isn't validated
- **Scope**: Only affects multi-trainer deployments where trainers shouldn't access each other's clients

### 4. Priority: **P3 - MEDIUM**

---

## Finding #5: Challenge Image Upload Silent Failure

### 1. Severity Assessment: **LOW** (Not Over-Classified)

```javascript
// challenges.mjs - uploads image but doesn't fail if R2 upload fails
if (req.file) {
  try {
    const result = await uploadPhoto(req.file.buffer, {...});
    challengeData.imageUrl = result.url;
  } catch (uploadErr) {
    console.error('R2 upload failed for challenge image:', uploadErr.message);
    // ❌ Continues without failing - challenge created without image
  }
}

const challenge = await Challenge.create(challengeData);  // Succeeds without imageUrl
```

### 2. Exact Fix

```javascript
if (req.file) {
  try {
    const result = await uploadPhoto(req.file.buffer, {
      userId: req.user.id,
      category: 'challenges',
      originalFilename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    challengeData.imageUrl = result.url;
  } catch (uploadErr) {
    console.error('R2 upload failed for challenge image:', uploadErr.message);
    // FAIL FAST: Don't create challenge without required image
    return res.status(500).json({
      success: false,
      message: 'Failed to upload challenge image. Please try again.',
      error: 'IMAGE_UPLOAD_FAILED'
    });
  }
}
```

### 3. Blast Radius

- **User Experience**: Challenge created but displays incorrectly
- **Data Integrity**: Inconsistent state (challenge exists without required media)
- **Not a security issue**: More of a robustness/defensive coding concern

### 4. Priority: **P4 - LOW**

---

## Priority Order Summary

| Priority | Finding | Severity | Effort | Impact |
|----------|---------|----------|--------|--------|
| **P1** | Missing auth check in `getWorkoutSessions` | HIGH | Low | Data breach vector |
| **P2** | Error response schema leakage | MEDIUM | Low | Reconnaissance |
| **P3** | Missing rate limiting | MEDIUM | Medium | DoS/Enumeration |
| **P4** | Trainer access to any user | MEDIUM | High | Compliance |
| **P5** | Silent upload failure | LOW | Low | Data integrity |

---

## Things That Are NOT Issues

| Claimed Issue | Reality |
|---------------|---------|
| Schema leakage via graceful table-not-found handling | ✅ **Good pattern** - returns empty arrays safely |
| `verified` field accepting client input | ✅ **Acceptable** - client-side flag for UI, server can override |
| Date range limits on weekly queries | ✅ **Already implemented** - `MAX_WEEKLY_RANGE_DAYS = 90` |
| Multer memory storage | ✅ **Secure** - no local temp files, direct to R2 |

---

## Immediate Action Items

```bash
# 1. Patch getWorkoutSessions authorization (P1)
git diff backend/controllers/workoutController.mjs
# Apply fix #1 above

# 2. Audit errorResponse calls
grep -r "errorResponse.*error" backend/

# 3. Add rate limiting
npm install express-rate-limit
```

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
