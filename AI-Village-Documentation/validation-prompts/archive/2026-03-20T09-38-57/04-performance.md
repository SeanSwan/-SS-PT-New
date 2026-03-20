# Performance & Scalability — Validation Report

> **Status:** PASS | **Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 11.2s
> **Files:** backend/services/ai/aiVillageService.mjs, backend/routes/aiVillageRoutes.mjs
> **Generated:** 3/20/2026, 2:38:57 AM

---

This performance and scalability review focuses on the **AI Village Validation System**. While the architecture is clean for a single-instance admin tool, several bottlenecks will emerge under load or in a multi-instance production environment.

### Executive Summary: Performance & Scalability Rating
**Overall Rating: MEDIUM/HIGH RISK**
The primary concerns are **In-Memory State (Scalability)**, **Synchronous File I/O (Event Loop Blocking)**, and **Memory Bloat** from uncurated log buffers.

---

### 1. Scalability: In-Memory Job Tracking
**Rating: CRITICAL**
*   **Finding:** The `activeJobs` Map is local to the Node.js process memory.
*   **Impact:** If SwanStudios scales to multiple containers/instances (e.g., behind a Load Balancer), a user might start a job on Instance A but poll for status on Instance B, resulting in a `404 Not Found`.
*   **Recommendation:** Move job states to **Redis** or the **PostgreSQL** database. Since you want to avoid BullMQ for now, a simple `validation_jobs` table in Sequelize is the most scalable path.

### 2. Network & Memory: Unbounded Output Buffering
**Rating: HIGH**
*   **Finding:** `job.output += chunk.toString()` and `maxBuffer: 5 * 1024 * 1024`.
*   **Impact:** If a validation run produces 5MB of logs, and 10 jobs are stored in memory for an hour, you are holding 50MB+ of raw strings in the heap. Furthermore, `getValidationStatus` performs `.split('\n').slice(-50)`, which is an $O(N)$ operation on a potentially massive string every time the UI polls.
*   **Recommendation:** 
    1.  Stream logs directly to a temporary file instead of a variable.
    2.  Use a **Circular Buffer** or fixed-size array for "recent output" to keep memory footprint constant.

### 3. Render Performance (Backend-Driven): SSE Polling Efficiency
**Rating: MEDIUM**
*   **Finding:** The `/stream/:jobId` endpoint uses a `setInterval` that performs string slicing (`current.recentOutput.slice(lastOutputLength)`) every 2 seconds.
*   **Impact:** This creates unnecessary CPU churn. If 5 admins open the dashboard, the server is constantly slicing large strings in memory.
*   **Recommendation:** Use an `EventEmitter`. When the child process emits data, immediately push it to all active SSE listeners. This removes the need for `setInterval` and slicing.

### 4. Database & I/O: Synchronous File System Calls
**Rating: HIGH**
*   **Finding:** Extensive use of `readFileSync`, `readdirSync`, and `existsSync` inside route handlers (e.g., `readLatestReport`, `listArchiveRuns`).
*   **Impact:** These are **blocking calls**. While reading a small Markdown file is fast, `readdirSync` on a growing archive folder or reading 16 files sequentially (as seen in `readLatestReport`) will block the Node.js Event Loop, increasing latency for *all* users on the platform (including personal trainers/clients).
*   **Recommendation:** Switch to `fs.promises` (e.g., `await fs.readFile()`).

### 5. Memory Leaks: SSE Interval Cleanup
**Rating: LOW**
*   **Finding:** Cleanup logic is present (`req.on('close')`), which is good.
*   **Impact:** Low risk, but ensure that if the job fails/completes *before* the user closes the connection, the interval is cleared (currently handled, but logic is brittle).
*   **Recommendation:** Wrap the SSE logic in a try-finally block to ensure `clearInterval` always fires.

### 6. Security & Path Traversal
**Rating: MEDIUM**
*   **Finding:** Manual sanitization `sanitized = timestamp.replace(/[^a-zA-Z0-9T-]/g, '')`.
*   **Impact:** While better than nothing, manual regex for path safety is risky.
*   **Recommendation:** Use `path.resolve` and verify the resulting path starts with the intended `ARCHIVE_DIR` prefix to prevent any logic bypass.

---

### Suggested Code Optimizations

#### Optimized SSE (backend/routes/aiVillageRoutes.mjs)
Replace the interval with an Event-based approach:
```javascript
// In Service:
import { EventEmitter } from 'events';
export const villageEvents = new EventEmitter();

// In runValidation:
child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  job.output += text; 
  villageEvents.emit(`output:${job.id}`, text);
});

// In Route:
const onOutput = (text) => {
  res.write(`data: ${JSON.stringify({ type: 'output', text })}\n\n`);
};
villageEvents.on(`output:${jobId}`, onOutput);
req.on('close', () => villageEvents.off(`output:${jobId}`, onOutput));
```

#### Async File I/O (backend/services/ai/aiVillageService.mjs)
```javascript
import { promises as fs } from 'fs';

export async function readLatestReport(track) {
  if (!(await fs.access(LATEST_DIR).catch(() => false))) {
    return { summary: null, reports: {}, timestamp: null };
  }
  // Use Promise.all for parallel file reads
  const reportData = await Promise.all(REPORT_FILES.map(async (file) => {
     const content = await fs.readFile(join(LATEST_DIR, file), 'utf-8').catch(() => null);
     return { file, content };
  }));
  // ... rest of logic
}
```

### Final Performance Checklist
1.  [ ] **Move `activeJobs` to Database:** Essential for multi-instance production.
2.  [ ] **Promisify FS:** Prevent Event Loop starvation during report generation.
3.  [ ] **Limit Log Size:** Cap `job.output` at 1MB or offload to a file.
4.  [ ] **Index Archive:** If the archive grows to thousands of runs, `readdirSync` will become a major bottleneck; consider a DB manifest for archives.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
