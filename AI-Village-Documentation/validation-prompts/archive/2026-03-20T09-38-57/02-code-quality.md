# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.4s
> **Files:** backend/services/ai/aiVillageService.mjs, backend/routes/aiVillageRoutes.mjs
> **Generated:** 3/20/2026, 2:38:57 AM

---

# Code Review: AI Village Service & Routes

## Executive Summary
**Overall Quality**: HIGH — Well-architected service with strong separation of concerns, proper async handling, and security-conscious design. Minor improvements needed for type safety, error handling, and resource management.

---

## 1. TypeScript Best Practices

### ❌ CRITICAL: Missing TypeScript
**File**: Both files  
**Issue**: Files use `.mjs` extension with no TypeScript types whatsoever.

```mjs
// Current - no type safety
export function startValidation(options = {}, userId) {
  // ...
}

// Should be .ts with:
interface ValidationOptions {
  files?: string[];
  since?: string;
  staged?: boolean;
}

export function startValidation(
  options: ValidationOptions = {},
  userId: number
): string {
  // ...
}
```

**Impact**: No compile-time type checking, no IDE autocomplete, runtime errors not caught during development.

**Recommendation**: Convert to `.ts` files or at minimum add JSDoc type annotations:
```javascript
/**
 * @param {ValidationOptions} options
 * @param {number} userId
 * @returns {string} jobId
 */
export function startValidation(options = {}, userId) {
```

---

### 🟡 MEDIUM: Implicit Any Types
**File**: `aiVillageService.mjs` lines 88-100  
**Issue**: Job object has no defined interface.

```javascript
// Current - implicit any on all properties
const job = {
  id: jobId,
  state: JOB_STATES.PENDING,
  userId,
  options,
  // ... 8 more properties
};
```

**Recommendation**:
```typescript
interface ValidationJob {
  id: string;
  state: keyof typeof JOB_STATES;
  userId: number;
  options: ValidationOptions;
  startedAt: number | null;
  completedAt: number | null;
  output: string;
  error: string | null;
  exitCode: number | null;
  summary: string | null;
}

const activeJobs = new Map<string, ValidationJob>();
```

---

## 2. Error Handling

### 🔴 HIGH: Unhandled Promise Rejection in Cleanup
**File**: `aiVillageService.mjs` lines 47-53  
**Issue**: `cleanupTimer` interval has no error handling.

```javascript
const cleanupTimer = setInterval(() => {
  const threshold = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of activeJobs.entries()) {
    if (job.completedAt && job.completedAt < threshold) {
      activeJobs.delete(id); // Could throw if Map is corrupted
    }
  }
}, 5 * 60 * 1000);
```

**Recommendation**:
```javascript
const cleanupTimer = setInterval(() => {
  try {
    const threshold = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of activeJobs.entries()) {
      if (job.completedAt && job.completedAt < threshold) {
        activeJobs.delete(id);
        logger.debug('[AIVillage] Cleaned up job', { jobId: id });
      }
    }
  } catch (err) {
    logger.error('[AIVillage] Cleanup error', { error: err.message });
  }
}, 5 * 60 * 1000);
```

---

### 🔴 HIGH: Silent Failure in Summary Parsing
**File**: `aiVillageService.mjs` lines 152-156  
**Issue**: Empty catch block swallows errors without logging.

```javascript
try {
  job.summary = readLatestSummary();
} catch {
  job.summary = null; // Why did it fail? No logging!
}
```

**Recommendation**:
```javascript
try {
  job.summary = readLatestSummary();
} catch (err) {
  logger.warn('[AIVillage] Failed to read summary', {
    jobId: job.id,
    error: err.message,
  });
  job.summary = null;
}
```

---

### 🟡 MEDIUM: Race Condition in Concurrent Validation Check
**File**: `aiVillageService.mjs` lines 71-76  
**Issue**: Check-then-act race condition.

```javascript
// Thread 1 checks: no running jobs ✓
for (const job of activeJobs.values()) {
  if (job.state === JOB_STATES.RUNNING) {
    throw new Error('...');
  }
}
// Thread 2 starts job here (race!)
// Thread 1 starts job here (duplicate!)
```

**Recommendation**: Use atomic flag or mutex:
```javascript
let validationLock = false;

export function startValidation(options = {}, userId) {
  if (validationLock) {
    throw new Error('A validation is already in progress.');
  }
  
  validationLock = true;
  
  try {
    const jobId = `val_${randomBytes(8).toString('hex')}`;
    // ... rest of setup
    
    runValidation(job)
      .catch(err => { /* ... */ })
      .finally(() => { validationLock = false; });
    
    return jobId;
  } catch (err) {
    validationLock = false;
    throw err;
  }
}
```

---

### 🟡 MEDIUM: SSE Stream Memory Leak
**File**: `aiVillageRoutes.mjs` lines 117-165  
**Issue**: Interval not cleared if client disconnects before job completes.

```javascript
const interval = setInterval(() => {
  // ... polling logic
}, 2000);

req.on('close', () => {
  clearInterval(interval); // ✓ Good
});

// BUT: if job completes, interval clears itself
// If client disconnects DURING completion check, both clear → no issue
// If server crashes, interval orphaned → LEAK
```

**Recommendation**: Add timeout safety:
```javascript
const interval = setInterval(() => { /* ... */ }, 2000);
const timeout = setTimeout(() => {
  clearInterval(interval);
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({ type: 'timeout' })}\n\n`);
    res.end();
  }
}, 15 * 60 * 1000); // 15 min max

req.on('close', () => {
  clearInterval(interval);
  clearTimeout(timeout);
});
```

---

## 3. Security Issues

### 🔴 HIGH: Path Traversal in Archive Reading
**File**: `aiVillageService.mjs` lines 282-285  
**Issue**: Sanitization is insufficient.

```javascript
// Current sanitization
const sanitized = timestamp.replace(/[^a-zA-Z0-9T-]/g, '');
const dirPath = join(ARCHIVE_DIR, sanitized);
```

**Attack Vector**:
```javascript
// Input: "../../etc/passwd" 
// After sanitization: "etcpasswd"
// Result: join(ARCHIVE_DIR, "etcpasswd") → safe ✓

// BUT: Input: "2026-03-20T08-49-00" (valid)
// If ARCHIVE_DIR is compromised or misconfigured → still vulnerable
```

**Recommendation**: Use `path.resolve()` and verify result is within allowed directory:
```javascript
import { resolve, relative } from 'path';

function sanitizeArchivePath(timestamp) {
  const sanitized = timestamp.replace(/[^a-zA-Z0-9T-]/g, '');
  const resolved = resolve(ARCHIVE_DIR, sanitized);
  
  // Ensure resolved path is within ARCHIVE_DIR
  const rel = relative(ARCHIVE_DIR, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid archive path');
  }
  
  return resolved;
}
```

---

### 🟡 MEDIUM: File Path Validation Incomplete
**File**: `aiVillageRoutes.mjs` lines 48-53  
**Issue**: Blacklist approach misses edge cases.

```javascript
if (f.includes('..') || f.startsWith('/') || f.includes('\\..')) {
  return res.status(400).json({ success: false, error: 'Invalid file path' });
}
// Missing: "....", "/..", "./../", URL-encoded variants
```

**Recommendation**: Whitelist approach:
```javascript
const ALLOWED_EXTENSIONS = ['.js', '.mjs', '.ts', '.tsx', '.jsx', '.css'];
const ALLOWED_DIRS = ['frontend/', 'backend/', 'shared/'];

function validateFilePath(filePath) {
  // Normalize path
  const normalized = path.normalize(filePath).replace(/\\/g, '/');
  
  // Must start with allowed directory
  if (!ALLOWED_DIRS.some(dir => normalized.startsWith(dir))) {
    return false;
  }
  
  // Must have allowed extension
  if (!ALLOWED_EXTENSIONS.some(ext => normalized.endsWith(ext))) {
    return false;
  }
  
  // No traversal
  if (normalized.includes('..')) {
    return false;
  }
  
  return true;
}
```

---

## 4. Performance & Resource Management

### 🔴 HIGH: Child Process Timeout Not Enforced Properly
**File**: `aiVillageService.mjs` lines 123-126  
**Issue**: `execFile` timeout kills process but doesn't clean up job state properly.

```javascript
const child = execFile('node', [ORCHESTRATOR_PATH, ...args], {
  timeout: 10 * 60 * 1000, // Kills process after 10min
}, (error, stdout, stderr) => {
  // error.killed === true if timeout
  // But job.state might not reflect timeout vs failure
});
```

**Recommendation**:
```javascript
const child = execFile('node', [ORCHESTRATOR_PATH, ...args], {
  timeout: 10 * 60 * 1000,
}, (error, stdout, stderr) => {
  job.output = stdout || '';
  job.completedAt = Date.now();

  if (error) {
    job.state = JOB_STATES.FAILED;
    
    // Distinguish timeout from other failures
    if (error.killed && error.signal === 'SIGTERM') {
      job.error = 'Validation timed out after 10 minutes';
      job.exitCode = -1;
    } else {
      job.error = error.message;
      job.exitCode = error.code || 1;
    }
    
    logger.error('[AIVillage] Validation failed', {
      jobId: job.id,
      timeout: error.killed,
      error: job.error,
    });
  } else {
    // ... success handling
  }
});
```

---

### 🟡 MEDIUM: Unbounded Output Buffer Growth
**File**: `aiVillageService.mjs` lines 166-174  
**Issue**: `job.output` grows unbounded during long validations.

```javascript
if (child.stdout) {
  child.stdout.on('data', (chunk) => {
    job.output += chunk.toString(); // Can grow to GBs
  });
}
```

**Recommendation**: Implement circular buffer:
```javascript
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

if (child.stdout) {
  child.stdout.on('data', (chunk) => {
    job.output += chunk.toString();
    
    // Keep only last 1MB
    if (job.output.length > MAX_OUTPUT_SIZE) {
      job.output = job.output.slice(-MAX_OUTPUT_SIZE);
      job.outputTruncated = true;
    }
  });
}
```

---

### 🟡 MEDIUM: Synchronous File Operations Block Event Loop
**File**: `aiVillageService.mjs` — multiple locations  
**Issue**: All file reads use `readFileSync`, blocking event loop.

```javascript
// Lines 217, 244, 262, 290, 304
return readFileSync(path, 'utf-8'); // BLOCKS!
```

**Impact**: During large report reads (multi-MB markdown files), server becomes unresponsive.

**Recommendation**: Use async file operations:
```javascript
import { readFile } from 'fs/promises';

export async function readLatestReport(track) {
  if (!existsSync(LATEST_DIR)) {
    return { summary: null, reports: {}, timestamp: null };
  }

  let timestamp = null;
  try {
    const summary = await readFile(join(LATEST_DIR, 'summary.md'), 'utf-8');
    const match = summary.match(/# Validation Summary — (.+)/);
    if (match) timestamp = match[1].trim();
  } catch { /* ignore */ }

  // ... rest of async logic
}
```

**Update routes**:
```javascript
router.get('/latest', async (req, res) => {
  try {
    const report = await readLatestReport(); // Now async
    // ...
  } catch (err) {
    // ...
  }
});
```

---

## 5. Code Quality & DRY Violations

### 🟡 MEDIUM: Duplicated Path Validation Logic
**Files**: `aiVillageRoutes.mjs` lines 48-53, 189-192, 233-236  
**Issue**: Same validation repeated 3 times.

```javascript
// Repeated in 3 routes:
if (!track.endsWith('.md') || track.includes('..') || track.includes('/')) {
  return res.status(400).json({ success: false, error: 'Invalid track name' });
}
```

**Recommendation**: Extract to middleware:
```javascript
// middleware/validateTrackName.mjs
export function validateTrackName(req, res, next) {
  const track = req.params.track;
  
  if (!track) {
    return next(); // No track param, skip validation
  }
  
  if (!track.endsWith('.md') || track.includes('..') || track.includes('/')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid track name. Must be a .md file without path traversal.',
    });
  }
  
  next();
}

// In routes:
router.get('/latest/:track', validateTrackName, (req, res) => {
  // Validation already done
});
```

---

### 🟡 MEDIUM: Duplicated Error Response Pattern
**Files**: `aiVillageRoutes.mjs` — all routes  
**Issue**: Same error response structure repeated 15+ times.

```javascript
// Repeated pattern:
res.status(404).json({ success: false, error: 'Not found' });
res.status(500).json({ success: false, error: 'Failed' });
```

**Recommendation**: Create error handler utility:
```javascript
// utils/apiResponse.mjs
export function errorResponse(res, statusCode, message, details = {}) {
  logger.error(`[API Error] ${message}`, { statusCode, ...details });
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details }),
  });
}

export function successResponse(res, data) {
  return res.json({ success: true, ...data });
}

// Usage:
router.get('/latest', async (req, res) => {
  try {
    const report = await readLatestReport();
    if (!report.summary && Object.keys(report.reports).length === 0) {
      return errorResponse(res, 404, 'No validation reports found');
    }
    return successResponse(res, { timestamp: report.timestamp, ... });
  } catch (err) {
    return errorResponse(res, 500, 'Failed to read latest report', { error: err.message });
  }
});
```

---

### 🟢 LOW: Magic Numbers
**File**: `aiVillageService.mjs` lines 47, 53, 125-126  

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
