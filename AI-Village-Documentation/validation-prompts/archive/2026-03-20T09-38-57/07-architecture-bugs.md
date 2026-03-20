# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 121.2s
> **Files:** backend/services/ai/aiVillageService.mjs, backend/routes/aiVillageRoutes.mjs
> **Generated:** 3/20/2026, 2:38:57 AM

---

# Deep Code Review: AI Village Service & Routes

## Executive Summary

After thorough analysis of both files, I've identified **multiple critical bugs**, **architecture flaws**, and **production readiness issues** that must be addressed before shipping. The most severe issue is a **race condition** in job management that can cause validation runs to fail silently or produce incorrect results.

---

## 1. Bug Detection

### CRITICAL: Race Condition in Concurrent Validation Prevention

| Attribute | Details |
|-----------|---------|
| **Severity** | CRITICAL |
| **File** | `backend/services/ai/aiVillageService.mjs` |
| **Line** | 68-73 |
| **What's Wrong** | The check for concurrent runs and the state transition to RUNNING are not atomic. Two requests arriving within milliseconds can both pass the `isValidationRunning()` check before either sets `job.state = JOB_STATES.RUNNING`, causing both to proceed and potentially corrupt validation output. |
| **Fix** | Use a mutex/lock pattern or check-and-set atomic operation. Wrap the concurrent check inside the job creation or use a flag that's set synchronously before returning from `startValidation`. |

```javascript
// PROPOSED FIX - Add atomic lock
let validationLock = false;

export function startValidation(options = {}, userId) {
  if (validationLock) {
    throw new Error('A validation is already in progress. Wait for it to complete.');
  }
  
  const jobId = `val_${randomBytes(8).toString('hex')}`;
  const job = {
    id: jobId,
    state: JOB_STATES.PENDING,
    userId,
    // ... rest of job object
  };
  
  activeJobs.set(jobId, job);
  validationLock = true;  // Set lock BEFORE async operation
  
  runValidation(job).finally(() => {
    validationLock = false;  // Release lock on completion
  }).catch(err => {
    // ... error handling
  });
  
  return jobId;
}
```

---

### HIGH: Missing Input Validation for `files` Array Contents

| Attribute | Details |
|-----------|---------|
| **Severity** | HIGH |
| **File** | `backend/routes/aiVillageRoutes.mjs` |
| **Line** | 38-42 |
| **What's Wrong** | The route validates that `files` is an array and checks for directory traversal (`..`), but never validates that each element is actually a string. Malformed requests could crash the service or cause unexpected behavior. |
| **Fix** | Add type validation for array elements: |

```javascript
if (files && files.length > 0) {
  const invalidFile = files.find(f => typeof f !== 'string');
  if (invalidFile) {
    return res.status(400).json({ 
      success: false, 
      error: 'All files must be string paths' 
    });
  }
}
```

---

### HIGH: Unbounded Output Buffer in Child Process

| Attribute | Details |
|-----------|---------|
| **Severity** | HIGH |
| **File** | `backend/services/ai/aiVillageService.mjs` |
| **Line** | 118 |
| **What's Wrong** | `maxBuffer: 5 * 1024 * 1024` (5MB) is set, but there's no handling if the validation output exceeds this limit. The child process will be killed without graceful error handling. |
| **Fix** | Add error handling for buffer overflow or increase limit with proper error message: |

```javascript
if (error.killed) {
  job.error = 'Validation output exceeded 5MB limit';
  job.exitCode = 137;  // SIGKILL
} else {
  job.error = error.message;
  job.exitCode = error.code || 1;
}
```

---

### MEDIUM: Empty Timestamp Causes Archive Directory Traversal

| Attribute | Details |
|-----------|---------|
| **Severity** | MEDIUM |
| **File** | `backend/services/ai/aiVillageService.mjs` |
| **Line** | 217-220 |
| **What's Wrong** | If `timestamp.replace(/[^a-zA-Z0-9T-]/g, '')` returns an empty string (e.g., input is all special characters), the code falls through to `join(ARCHIVE_DIR, '')` which equals `ARCHIVE_DIR`. This could expose the entire archive directory. |
| **Fix** | Validate sanitized output: |

```javascript
const sanitized = timestamp.replace(/[^a-zA-Z0-9T-]/g, '');
if (!sanitized || sanitized.length !== timestamp.length) {
  return { reports: {}, timestamp: '', error: 'Invalid timestamp format' };
}
```

---

### MEDIUM: SSE Connection Leak on Client Disconnect

| Attribute | Details |
|-----------|---------|
| **Severity** | MEDIUM |
| **File** | `backend/routes/aiVillageRoutes.mjs` |
| **Line** | 99-101 |
| **What's Wrong** | The `req.on('close')` handler clears the interval, but if the job is still running when the SSE connection closes, the job remains in `activeJobs` until the 5-minute cleanup timer runs. Under heavy load, this accumulates memory. |
| **Fix** | Add job cleanup reference counting or immediate cleanup for completed jobs: |

```javascript
req.on('close', () => {
  clearInterval(interval);
  // Optionally: remove job reference if completed
  const current = getValidationStatus(jobId);
  if (current && ['complete', 'failed'].includes(current.state)) {
    activeJobs.delete(jobId);
  }
});
```

---

### LOW: Inconsistent Error Response Structure

| Attribute | Details |
|-----------|---------|
| **Severity** | LOW |
| **File** | `backend/routes/aiVillageRoutes.mjs` |
| **Line** | 175, 192, 221 |
| **What's Wrong** | Some endpoints return `{ success: false

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
