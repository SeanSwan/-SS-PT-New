# Frontend UX & Code Patterns — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 7.6s
> **Files:** backend/services/ai/aiVillageService.mjs, backend/routes/aiVillageRoutes.mjs
> **Generated:** 3/20/2026, 2:38:57 AM

---

This review focuses on the backend service and routing architecture for the `aiVillage` module. Since this is a server-side implementation, the review prioritizes **System Reliability, Security, and API Design**.

### 1. System Reliability & Process Management
*   **Finding: Unbounded Memory Growth (CRITICAL)**
    *   **Issue:** The `activeJobs` Map stores the full `output` string for every job. If a validation run produces massive logs (e.g., 5MB buffer), and multiple users trigger jobs, you risk heap exhaustion.
    *   **Recommendation:** Store only the last N lines or a truncated version of the output in memory. Stream the full output to a temporary file on disk instead of keeping it in a variable.
*   **Finding: Child Process Orphanage (HIGH)**
    *   **Issue:** If the Node.js process crashes or restarts, the `activeJobs` state is lost, but the child process (the orchestrator) may continue running as a zombie process.
    *   **Recommendation:** Implement a "recovery" check on startup that scans for existing orchestrator processes or uses a PID file to track and clean up orphaned validations.

### 2. Security & Input Validation
*   **Finding: Path Traversal Vulnerability (HIGH)**
    *   **Issue:** While you have basic checks, `path.join` combined with user-provided strings is dangerous. In `readArchivedReport`, the `sanitized` variable still allows for potential directory traversal if the regex is bypassed or if `ARCHIVE_DIR` is misconfigured.
    *   **Recommendation:** Use `path.basename()` on the `timestamp` and `track` parameters to ensure they cannot contain directory separators, regardless of the regex.
*   **Finding: Command Injection Risk (MEDIUM)**
    *   **Issue:** You are passing `options.files` directly into an array for `execFile`. While `execFile` is safer than `exec` (it doesn't spawn a shell), if the orchestrator script itself uses `eval` or shell interpolation on those arguments, you are vulnerable.
    *   **Recommendation:** Validate that file paths exist on the filesystem using `fs.existsSync()` before passing them to the orchestrator.

### 3. API Design & UX
*   **Finding: SSE Connection Management (MEDIUM)**
    *   **Issue:** The SSE stream uses a `setInterval` to poll the `activeJobs` Map. This is inefficient and creates "ghost" connections if the client disconnects abruptly without triggering the `close` event.
    *   **Recommendation:** Use an `EventEmitter` pattern. Have the `runValidation` function emit events (`output`, `done`, `error`) and have the SSE route subscribe to that specific `jobId` emitter. This removes the need for polling.
*   **Finding: Lack of Rate Limiting (MEDIUM)**
    *   **Issue:** The `/run` endpoint is protected by `adminOnly`, but it is a heavy operation (spawning child processes). An admin could accidentally (or maliciously) trigger a DoS by spamming this endpoint.
    *   **Recommendation:** Implement a simple `express-rate-limit` on the `/run` route specifically.

### 4. Code Quality & Maintainability
*   **Finding: Synchronous File I/O (MEDIUM)**
    *   **Issue:** `readFileSync` and `readdirSync` are used throughout the service. While these are likely fast, they block the Event Loop. In a high-traffic scenario, this will cause latency spikes for other users.
    *   **Recommendation:** Refactor to `fs.promises` (e.g., `await readFile(...)`).
*   **Finding: Hardcoded Configuration (LOW)**
    *   **Issue:** `REPORT_FILES` and directory paths are hardcoded.
    *   **Recommendation:** Move these to a `config.mjs` file or environment variables to keep the service logic clean.

---

### Summary of Ratings

| Finding | Severity | Category |
| :--- | :--- | :--- |
| **Unbounded Memory Growth** | **CRITICAL** | State Management |
| **Path Traversal Risk** | **HIGH** | Security |
| **Child Process Orphanage** | **HIGH** | System Reliability |
| **Synchronous I/O Blocking** | **MEDIUM** | Performance |
| **SSE Polling Inefficiency** | **MEDIUM** | API Design |
| **Command Injection Potential** | **MEDIUM** | Security |
| **Hardcoded Config** | **LOW** | Maintainability |

### Implementation Note for the "Crystalline Swan" Theme:
When you build the frontend for this, ensure the **SSE stream** updates the UI with the `Arctic Cyan` glow effect for active logs and `Wing Purple` for completion states. Use a `Fira Code` monospace container for the output stream to maintain the "Data Vault" aesthetic. Ensure the `adminOnly` UI components are hidden via `display: none` rather than just conditional rendering to prevent any potential DOM-based information leakage.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
