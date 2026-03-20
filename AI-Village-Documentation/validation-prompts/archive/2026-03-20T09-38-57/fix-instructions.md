# Fix Instructions — Code Quality Consensus

> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)
> Consensus: YES

---

# CEO Response — Round 2

## CONSENSUS REACHED

CTO, you've made an excellent catch. I concede completely.

You're absolutely right: by implementing offset-based delta streaming in Finding #1, the `recentOutput` calculation becomes **dead code**. I was so focused on defending against premature optimization that I failed to recognize the architectural consequence of our own agreed fix.

Your logic is airtight:
1. SSE now streams character deltas via `getValidationOutput(jobId, offset)`
2. Frontend appends these deltas to its own buffer
3. Backend no longer needs to compute 50-line snapshots
4. Therefore, `recentOutput` serves no purpose and wastes cycles

**I accept your proposal in full.**

---

## Final Consolidated Fix Set

### Finding #1: SSE Streaming Logic (CRITICAL)
**File:** `backend/services/ai/aiVillageService.mjs`
```javascript
export function getValidationOutput(jobId, offset = 0) {
  const job = activeJobs.get(jobId);
  if (!job) return null;
  
  const fullOutput = job.output;
  const requestedOutput = offset < fullOutput.length ? fullOutput.slice(offset) : '';
  
  return {
    text: requestedOutput,
    totalLength: fullOutput.length,
    state: job.state,
    hasMore: job.state === JOB_STATES.RUNNING
  };
}
```

**File:** `backend/routes/aiVillageRoutes.mjs` (Lines 117-135)
```javascript
router.get('/jobs/:id/stream', requireAdmin, (req, res) => {
  const { id } = req.params;
  const lastEventId = req.headers['last-event-id'];
  let lastOutputLength = lastEventId ? parseInt(lastEventId, 10) : 0;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const current = getValidationOutput(id, lastOutputLength);
    
    if (!current) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    if (current.text) {
      res.write(`id: ${current.totalLength}\ndata: ${JSON.stringify({ 
        type: 'output', 
        text: current.text 
      })}\n\n`);
      lastOutputLength = current.totalLength;
    }

    if (!current.hasMore) {
      res.write(`data: ${JSON.stringify({ type: 'complete', state: current.state })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  req.on('close', () => clearInterval(interval));
});
```

---

### Finding #2: Output Overwrite & Memory (MEDIUM)
**File:** `backend/services/ai/aiVillageService.mjs` (Lines 120-165)
```javascript
import { spawn } from 'child_process';

async function runValidation(job) {
  job.state = JOB_STATES.RUNNING;
  job.startedAt = Date.now();

  const args = [
    '--mode', job.config.mode,
    '--track', job.config.track,
    '--timestamp', job.config.timestamp
  ];

  const child = spawn('node', [ORCHESTRATOR_PATH, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let outputBuffer = '';
  const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;

  child.stdout.on('data', (chunk) => {
    if (outputBuffer.length < MAX_OUTPUT_SIZE) {
      outputBuffer += chunk.toString();
      job.output = outputBuffer;
    }
  });

  child.stderr.on('data', (chunk) => {
    if (outputBuffer.length < MAX_OUTPUT_SIZE) {
      outputBuffer += chunk.toString();
      job.output = outputBuffer;
    }
  });

  child.on('close', (code) => {
    job.completedAt = Date.now();
    job.exitCode = code;
    job.state = code === 0 ? JOB_STATES.COMPLETE : JOB_STATES.FAILED;
    
    // Extract summary from final output
    const summaryMatch = job.output.match(/=== VALIDATION SUMMARY ===\n([\s\S]*?)(?:\n===|$)/);
    if (summaryMatch) {
      job.summary = summaryMatch[1].trim();
    }
  });

  child.on('error', (err) => {
    job.state = JOB_STATES.FAILED;
    job.output += `\n[ERROR] ${err.message}`;
    job.completedAt = Date.now();
  });
}
```

---

### Finding #3: Race Condition (LOW)
**File:** `backend/services/ai/aiVillageService.mjs` (Lines 68-73)
```javascript
// Check for both PENDING and RUNNING states
for (const job of activeJobs.values()) {
  if (job.state === JOB_STATES.RUNNING || job.state === JOB_STATES.PENDING) {
    throw new Error('A validation is already in progress. Please wait.');
  }
}
```

---

### Finding #4: Dead Code Removal (MEDIUM)
**File:** `backend/services/ai/aiVillageService.mjs` (Line 183 - DELETE)
```javascript
// REMOVE this line entirely:
// recentOutput: job.output.split('\n').slice(-50).join('\n')

// Updated getJobStatus function:
export function getJobStatus(jobId) {
  const job = activeJobs.get(jobId);
  if (!job) return null;
  
  return {
    id: job.id,
    state: job.state,
    totalLength: job.output.length,
    completedAt: job.completedAt,
    exitCode: job.exitCode,
    summary: job.summary
  };
}
```

**Optional:** Add initial log endpoint for page load:
```javascript
// In aiVillageRoutes.mjs
router.get('/jobs/:id/logs', requireAdmin, (req, res) => {
  const job = getJobStatus(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  const fullJob = activeJobs.get(req.params.id);
  const recentLines = fullJob.output.split('\n').slice(-50).join('\n');
  
  res.json({ recentOutput: recentLines, totalLength: job.totalLength });
});
```

---

### Finding #5: Path Sanitization (MEDIUM)
**File:** `backend/services/ai/aiVillageService.mjs` (Lines 268-278)
```javascript
import { basename } from 'path';

export async function readArchivedReport(timestamp, track = null) {
  const sanitizedTimestamp = timestamp.replace(/[^0-9]/g, '');
  const dirPath = join(ARCHIVE_DIR, sanitizedTimestamp);
  
  if (track) {
    const safeTrack = basename(track);
    if (safeTrack !== track) {
      throw new Error('Invalid track name');
    }
    const filePath = join(dirPath, safeTrack);
    // ... rest of implementation
  }
  // ...
}
```

---

## Final Summary

**CONSENSUS REACHED** on all 5 findings.

**Total Changes:**
- 2 Critical fixes (SSE streaming, dead code removal)
- 3 Defensive improvements (memory management, race condition, path sanitization)

**Deployment Status:** Ready for production after code review and testing of SSE reconnection logic.

CTO, excellent technical rigor. This codebase is now production-grade for an internal admin tool.
