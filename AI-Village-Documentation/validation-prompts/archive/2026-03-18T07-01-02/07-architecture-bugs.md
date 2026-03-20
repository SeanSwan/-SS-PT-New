# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 117.2s
> **Files:** AI-Village-Documentation/GOD-LEVEL-AI-UPGRADE-PROMPT-V2.md
> **Generated:** 3/18/2026, 12:01:02 AM

---

# Deep Architecture Review: GOD-LEVEL-AI-UPGRADE-PROMPT-V2.md

This is a **specification document**, not executable code. I will review the proposed architecture, design patterns, and implementation plans for bugs, flaws, and production blockers that would manifest when this spec is coded.

---

## 1. BUG DETECTION

### 1.1 Race Conditions & Timing Issues

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Section 3.3 - Debate Pipeline | No handling for partial model responses during circuit breaker activation. If Round 2 fails mid-stream, the debate continues with incomplete context from Round 1, potentially generating unsafe workout plans. | Add state machine: `debateState = 'partial' | 'complete'`. If circuit breaker trips mid-round, discard all results from that round and previous rounds, fall back to authority immediately. |
| **HIGH** | Section 3.5 - DestructiveOperationManager | `OPERATION_SECRET` is used directly without null check. If env var is missing, `crypto.createHmac()` throws at runtime, breaking ALL destructive operations. | Add startup validation: `if (!process.env.OPERATION_SIGNING_KEY) throw new Error('OPERATION_SIGNING_KEY required');` |
| **HIGH** | Section 3.6 - BFF Aggregator | `Promise.allSettled` returns results but the code filters `sourcesAvailable` without distinguishing between "timeout" and "actual error". A downstream service being down looks identical to a timeout. | Add discriminated result type: `{ status: 'fulfilled' | 'rejected', reason?: 'timeout' | 'error', data?: T }`. Log distinct failure reasons. |
| **MEDIUM** | Section 3.2 - De-Identification Pipeline | Step 8 "Re-hydrate" uses high-performance string replace but doesn't specify HOW to map "Client-61" back to "Jackie". If multiple clients have same alias pattern, wrong client could be displayed. | Implement bidirectional mapping: `Map<clientAlias, { id: number, name: string, version: number }>`. Store alias→client snapshot at de-identification time, not at rehydration time. |
| **MEDIUM** | Section 5.1 - Error Loop Prevention | Redis `lpush` + `ltrim` is not atomic. Under high concurrency, actions could be lost between the two operations. | Use Lua script: `redisClient.eval('redis.call(\"lpush\", KEYS[1], ARGV[1]); redis.call(\"ltrim\", KEYS[1], 0, 49); redis.call(\"expire\", KEYS[1], 3600); return 1;', 1, key, JSON.stringify(action))` |

### 1.2 Null/Undefined Access Without Guards

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Section 3.4 - Command Pipeline Step 5 | Client resolution says "Multiple: ask user" but doesn't handle the case where fuzzy match returns ZERO matches. The pipeline would proceed with undefined client, causing API failures downstream. | Add explicit null guard: `if (candidates.length === 0) return { error: 'CLIENT_NOT_FOUND', message: 'No client matches "[name]". Did you mean...?' }`. Implement "did you mean" suggestions using Levenshtein distance against active client names. |
| **HIGH** | Section 3.3 - Debate Config | `circuitBreaker.failureThreshold` is checked but there's no code showing how `failureCount` is incremented or reset. The circuit breaker cannot function as described. | Add explicit state management: `const circuitState = { failureCount: 0, lastFailure: 0, state: 'closed' };` Increment on any timeout/exception, reset on successful round completion. |
| **HIGH** | Section 3.7 - WebSocket Protocol | The protocol defines `trackName` as optional but doesn't handle the case where a job has no tracks (empty validation). | Add `trackName?: string` with fallback: `trackName: job.tracks?.[0]?.name || 'unknown'` |

### 1.3 Async/Await Mistakes

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Section 3.6 - BFF Aggregator | `fetchWithTimeout` is called but not defined in this document. If it returns `undefined` on timeout, the `stats.value` access will throw. | Define `fetchWithTimeout(url, ms)` to return `{ status: 'rejected', reason: 'timeout' }` object instead of throwing, matching Promise.allSettled pattern. |
| **MEDIUM** | Section 4 - Phase 3 Transcription | `result.response.text()` could throw if the response is malformed or the model returns a refusal. No try-catch around transcription. | Wrap in try-catch: `try { return result.response.text().trim(); } catch (e) { logger.error('Transcription failed', e); return null; }` |

---

## 2. ARCHITECTURE FLAWS

### 2.1 Circular Dependencies

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Section 4 - Command Registry Structure | `commandRegistry/index.ts` "merges all registries" but each domain file (clientCommands.ts, workoutCommands.ts, etc.) may need to import shared types from `types/commands.ts`. If index.ts re-exports types, circular imports can occur during build. | Use barrel exports with explicit type-only imports: `import type { CommandRegistry } from './types/commands.js';` in each domain file. Keep index.ts as type-only re-export. |
| **MEDIUM** | Section 3.2 - Privacy Architecture | `deIdentifier.mjs` likely needs to import from `privacy.ts` for branded types, but `privacy.ts` may import from data models that import from services. | Create separate `types/privacy.ts` that contains ONLY type definitions with no runtime dependencies. Move transformation logic to `services/ai/deIdentifier.mjs`. |

### 2.2 God Components / God Objects

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Section 4 - Phase 1 File List | The spec proposes 14 separate command registry files + index + executor + de-identifier + PHI scanner + destructive ops + classifier + sanitizer + BFF routes. This is **over-engineering**. A developer adding a new command must touch 3+ files. | Consolidate into 3 files: `commands/registry.ts` (all command definitions), `commands/executor.ts` (execution logic), `commands/validation.ts` (Zod schemas). Use code generation to create Zod schemas from command definitions. |
| **HIGH** | Section 3.4 - Command Pipeline | The pipeline has 9 steps in sequence. This is a "god function" that does too much. Testing any single step requires mocking 8 others. | Decompose into middleware chain: `InputSanitizer → PhiScanner → IntentClassifier → ZodValidator → RbacChecker → ClientResolver → ConfirmationGenerator → Executor → Auditor`. Each middleware is independently testable. |

### 2.3 Prop Drilling / Missing Context

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **N/A** | This is a backend spec | Prop drilling doesn't apply to backend-first architecture. | N/A |

### 2.4 Tight Coupling

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Section 3.3 - Debate Pipeline | `workoutDebate.ts` and `nutritionDebate.ts` are hardcoded to specific models. If a model becomes unavailable, the entire debate fails. | Implement model abstraction: `interface ModelProvider { complete(prompt: string, config: DebateConfig): Promise<ModelResponse>; }`. Register providers by model name. Add `fallbackModelMap: Record<string, string>` config. |
| **MEDIUM** | Section 3.5 - Destructive Operations | `internalApiClient.execute()` is called but not defined. The operation is tightly coupled to a specific HTTP client implementation. | Define `interface OperationExecutor { execute(endpoint: string, params: unknown): Promise<ExecutionResult>; }`. Inject via dependency injection. |

---

## 3. INTEGRATION ISSUES

### 3.1 Frontend-Backend Contract Mismatches

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Section 3.2 - Re-hydration | The spec says "Frontend re-hydrates client IDs to names" but the frontend receives the AI response BEFORE the backend resolves the alias. The frontend cannot re-hydrate without an API call to fetch client names. | Backend must include `rehydrationMap: Record<string, { id: number, displayName: string }>` in every response. Frontend uses this map for display, never makes separate API calls. |
| **HIGH** | Section 2.2 - Command Taxonomy | Commands like "Show me [client name]'s profile" map to `GET /api/admin/clients/:id` but the AI sends client NAME, not ID. The backend must resolve name→id, but this isn't explicitly in the pipeline. | Add explicit "Client Resolution" step in pipeline (already in Section 3.4 step 5, but ensure it's in the taxonomy mapping table). The command schema must accept `clientRef: string` and resolve to `clientId: number`. |
| **MEDIUM** | Section 7.2 - Action Confirmation Cards | The UI spec says "Confirm button: 44px min-height" but doesn't specify the API contract for the confirmation. How does the frontend send the confirmation token? | Add `POST /api/ai/confirm` endpoint accepting `{ operationId: string, confirmationToken: string }`. The token proves user intent. |

### 3.2 Missing Loading/Error/Empty States

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Section 3.7 - WebSocket Protocol | Protocol defines `progress` messages but doesn't define error states. If transcription fails mid-stream, what does the client receive? | Add error protocol: `{ type: 'error', jobId: string, phase: 1|2|3, errorCode: 'TRANSCRIPTION_FAILED' | 'MODEL_UNAVAILABLE' | 'TIMEOUT', message: string, recoverable: boolean }` |
| **MEDIUM** | Section 2.2 - Category G Dashboard | "Scan my Command Center" returns aggregated data but doesn't specify what happens if ONE underlying service fails. The BFF returns `{ error: 'unavailable' }` but the UI doesn't have guidance on displaying this. | Add UI state enum: `DataState = 'loading' | 'loaded' | 'partial' | 'error'`. The BFF response should include `partial: boolean` flag. UI shows "2 of 4 services available" banner when partial. |

### 3.3 Route Guards

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Section 3.4 - RBAC Check | RBAC happens AFTER intent classification but BEFORE execution. However, the classification itself could reveal sensitive data (e.g., "Schedule session for Client-X" reveals client exists). | Add "pre-classification privacy": Strip client names before sending to intent classifier. Use "a client" placeholder. Classifier only sees intent, not target. |
| **MEDIUM** | Section 6.1 - Authentication | "All AI actions use the REQUESTING USER'S JWT" but the AI can execute admin commands if the user is admin. What prevents a trainer from escalating to admin? | The RBAC check in pipeline step 4 must verify the role in the JWT matches `command.roleRequired`. Add middleware: `if (!jwt.roles.some(r => command.roleRequired.includes(r))) throw new ForbiddenError()` |

---

## 4. DEAD CODE & TECH DEBT

### 4.1 Unused / Commented Code

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **LOW** | Section 8.1 - Track 6 Model | The document says "Replace DeepSeek (Privacy)" but Track 6 is now Nemotron. The old DeepSeek reference is dead documentation. | Remove "Replace DeepSeek" language. Change to "Track 6: Nemotron 3 Super (US-based, privacy-compliant)" |
| **LOW** | Section 1.1 - DictationOrb | Mentions "(has memory leak — fix in Phase 5)" but the fix is in Phase 3. Inconsistent. | Update to "(memory leak FIXED in Phase 3)" |

### 4.2 TODO/FIXME/HACK Indicators

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Section 3.4 - Input Sanitizer | "Strip prompt injection markers ('ignore previous', 'you are now', etc.)" is a TODO without implementation. This is a CRITICAL security gap. | Implement explicit blocklist: `const INJECTION_PATTERNS = [/^ignore\s+(previous|all|instructions)/i, /^you\s+are\s+now/i, /^\[SYSTEM\]/i, /^<\/?system/i];`. Reject any prompt matching these patterns with 400 error. |
| **MEDIUM** | Section 3.2 - PHI Scanner | The regex patterns are hardcoded but there's no mechanism to update them when new medical terms emerge. | Create `PHI_PATTERNS` as externalized config loaded from database or environment variable. Add admin UI to manage patterns. |

### 4.3 Duplicated Logic

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Section 2.2 - Command Taxonomy | The 94 commands are listed twice: once in the taxonomy table and again in the implementation file list. If a command is added, both must be updated. | Generate the taxonomy table from the command registry at build time. Use TypeScript to emit JSON schema that becomes the documentation. |
| **MEDIUM** | Section 3.3 - Debate Config | `timeoutMs: 30000` and `maxTotalTimeMs: 180000` appear in the config object but are also mentioned in the prose. Duplication risks drift. | Remove magic numbers from prose. Reference `DEBATE_CONFIGS.workout_plan.timeoutMs` in documentation. |

---

## 5. PRODUCTION READINESS

### 5.1 Console.log Statements

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Throughout document | The spec uses "logger.error" and "logger.warn" but doesn't define the logger. If developers use `console.log`, sensitive data could leak to production

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
