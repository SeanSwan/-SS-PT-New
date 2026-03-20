# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 67.8s
> **Files:** backend/services/ai/debate/debateOrchestrator.mjs, backend/routes/aiDebateRoutes.mjs, backend/services/voiceTranscriptionService.mjs, frontend/src/components/AIAssistant/DictationOrb.tsx, frontend/src/components/AIAssistant/VoiceUpload.tsx, backend/services/ai/aiVillageService.mjs
> **Generated:** 3/20/2026, 4:23:10 AM

---

# Deep Code Review — SwanStudios Architecture

## Executive Summary
This review identifies **4 CRITICAL bugs**, **7 HIGH severity issues**, and multiple medium/low concerns across the debate orchestration, voice transcription, and frontend AI assistant components. The most urgent issues are a rate limiting bypass in transcription, frontend/backend size mismatch, and missing authentication guards.

---

## 1. Bug Detection

### CRITICAL

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `voiceTranscriptionService.mjs` ~L45-70 | **Rate limiting bypass**: `checkAndRecordTranscription()` increments the counter, but `recordTranscription()` is never called after successful transcription. Users can transcribe unlimited files within the window because the counter only increments on the check, not on success. | Call `recordTranscription(userId)` after successful transcription in the route handler that uses this service, or modify `transcribeAudio` to call it internally. |
| **CRITICAL** | `VoiceUpload.tsx` ~L80 | **Frontend/backend mismatch**: Frontend validates file size as 25MB (`file.size > 25 * 1024 * 1024`) but backend `MAX_FILE_SIZE` is 20MB. Users will upload files that fail on the server. | Change frontend validation to: `if (file.size > 20 * 1024 * 1024)` |
| **CRITICAL** | `aiDebateRoutes.mjs` ~L60 | **Null pointer risk**: `validateDebateOwnership` accesses `req.user.id` and `req.user.role` without null checks. If `protect` middleware fails to set `req.user`, this crashes with 500. | Add null check: `if (!req.user || !req.user.id)` returning 401 before ownership validation. |
| **CRITICAL** | `debateOrchestrator.mjs` ~L295 | **Hardcoded cost tracking**: `job.totalCostUSD += 0.005` is a fixed estimate regardless of actual model used. This will cause incorrect billing tracking and could allow cost limit bypass if actual costs exceed estimates. | Calculate cost from `result.usageMetadata` or use model-specific constants from config. |

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `voiceTranscriptionService.mjs` ~L115 | **Timer leak on sync error**: If `fetch()` throws synchronously before the try block, `timer` is never cleared. | Wrap timer creation inside try, or use try/finally: `try { const timer = ...; try { ... } finally { clearTimeout(timer); } }` |
| **HIGH** | `DictationOrb.tsx` ~L145 | **State inconsistency**: `toggleListening` calls `setInterim('')` outside the `setListening` callback. If render batches differ, interim could show stale data. | Move `setInterim('')` inside the setState callback or use a single state update. |
| **HIGH** | `debateOrchestrator.mjs` ~L350 | **Greedy regex DoS risk**: `const match = cleaned.match(/\{[\s\S]*\}/)` is a greedy match that can cause catastrophic backtracking on large inputs. | Use non-greedy or limit input size: `const match = cleaned.match(/\{[\s\S]{0,50000}\}/)` |
| **HIGH** | `aiDebateRoutes.mjs` ~L90-115 | **No input validation on `options`**: The `options` object from req.body is passed directly to `startDebate`. Malformed options could cause runtime errors in the debate engine. | Add Zod schema validation for options before passing: `const optionsSchema = z.object({ durationWeeks: z.number().optional(), ... })` |
| **HIGH** | `debateOrchestrator.mjs` ~L270 | **TODO: AbortController not implemented**: The comment explicitly states requests continue consuming sockets after timeout. This wastes resources and can cause connection exhaustion under load. | Implement AbortController with `signal` option in fetch calls. |
| **HIGH** | `aiVillageService.mjs` ~L70 | **No input sanitization on job options**: The `options` object is passed directly to CLI args. If `options.files` contains shell metacharacters, command injection is possible. | Sanitize: `args.push('--files', job.options.files.map(f => f.replace(/[^a-zA-Z0-9._-]/g, '')).join(','))` |
| **HIGH** | `DictationOrb.tsx` ~L175 | **Pointer event edge case**: If user holds, drags outside browser window, then releases, `onPointerUp` won't fire and recognition continues indefinitely. | Add `onPointerCancel` handler that calls `stopListening()`. |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `debateOrchestrator.mjs` ~L85 | **Cleanup timer unref but no error handling**: If cleanup callback throws, it could crash the process. | Wrap cleanup logic in try/catch. |
| **MEDIUM** | `aiDebateRoutes.mjs` ~L90-115 | **Inline SQL queries**: Maintenance nightmare. Queries should use Sequelize models with proper typing. | Replace raw queries with `User.findByPk()`, `PainEntry.findAll()`, etc. |
| **MEDIUM** | `VoiceUpload.tsx` ~L55 | **Hardcoded API_BASE fallback**: `import.meta.env.PROD ? '' : 'http://localhost:10000'` — if PROD is misconfigured, requests go to wrong origin. | Use explicit env variable: `import.meta.env.VITE_API_BASE_URL` |
| **MEDIUM** | `DictationOrb.tsx` ~L130 | **Race condition in cleanup**: Events can fire between `abort()` and nulling handlers. | Check for aborted state in handlers before processing. |

---

## 2. Architecture Flaws

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `aiDebateRoutes.mjs` ~L60-120 | **Route handler does too much**: Resolves client, fetches enrichment data, de-identifies, starts debate. Should be a service function. | Extract to `services/ai/debate/startDebateWithContext.mjs` |
| **HIGH** | `debateOrchestrator.mjs` entire file | **God module (~400 lines)**: Handles job creation, state management, execution, cleanup, helpers. Should be split. | Split into: `debateJobStore.mjs`, `debateExecutor.mjs`, `debateCleanup.mjs` |
| **HIGH** | `voiceTranscriptionService.mjs` entire file | **In-memory rate limiting won't scale**: `userTranscriptions` Map doesn't work across multiple server instances. | Use Redis or database-backed rate limiting. |
| **HIGH** | `aiVillageService.mjs` ~L180 | **Tight coupling to filesystem**: Assumes specific directory structure (`AI-Village-Documentation/validation-prompts`). Not testable. | Inject paths or use configuration. |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `debateOrchestrator.mjs` ~L30 | **Hidden dependency**: `sendChatMessage` is imported but interface isn't defined. If it changes, silent failures. | Define interface in `debateTypes.mjs` or use dependency injection. |
| **MEDIUM** | `DictationOrb.tsx` ~L90 | **Web Speech API as only option**: No fallback for browsers without support. Returns null, confusing for users. | Show disabled state with tooltip explaining requirement. |

---

## 3. Integration Issues

### HIGH

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `VoiceUpload.tsx` ↔ `voiceTranscriptionService` | **Size limit mismatch** (see Bug Detection) | Align to 20MB |
| **HIGH** | `debateOrchestrator.mjs` ↔ `aiChatService` | **No contract defined**: `sendChatMessage` interface is implicit. Could break if response format changes. | Define `ChatMessage` and `ChatResponse` types in shared types file. |
| **HIGH** | `aiDebateRoutes.mjs` ↔ frontend | **No loading state contract**: Frontend polls `/status` but there's no guarantee of how quickly states transition. Could show stale data. | Add `lastUpdated` timestamp to status response. |

### MEDIUM

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MED

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
