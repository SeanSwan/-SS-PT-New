# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 123.7s
> **Files:** backend/services/ai/commandExecutor.mjs, backend/services/ai/intentClassifier.mjs, backend/services/ai/inputSanitizer.mjs, backend/services/ai/phiScanner.mjs, backend/services/ai/deIdentifier.mjs, backend/services/ai/destructiveOperations.mjs, backend/services/ai/clientResolver.mjs, backend/services/ai/commandRegistry/index.mjs
> **Generated:** 3/20/2026, 4:16:16 AM

---

# Deep Architecture Review — SwanStudios AI Command Pipeline

This is the most important review. Think step-by-step using your reasoning capabilities.

---

## 1. BUG DETECTION

### CRITICAL: Fuzzy Matching Fails on Multi-Word Medical Terms

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `phiScanner.mjs:99-105` | Fuzzy matching calculates Levenshtein distance against the ENTIRE search string. For "rotator cuff" (12 chars), "rotatr cuff" (11 chars) has `Math.abs(11-12)=1 <= 3` which passes the length check, BUT the algorithm compares "rotatr" (word split) vs "rotator cuff" (full string) which will never match. The fuzzy match is completely broken for multi-word medical terms because it splits on whitespace then compares each word to the ENTIRE term. | Rewrite fuzzy matching to split both the term and input into words, then compare individual words or use a different matching strategy. For "rotator cuff" input, split into ["rotator", "cuff"], compare each to "rotator cuff" separately. |

### CRITICAL: Same Fuzzy Match Bug in Client Resolver

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `clientResolver.mjs:37-48` | The `scoreMatch` function has identical fuzzy logic bug. When user types "John Smith" but with typo, the word-splitting comparison will fail. More critically, client names with 3+ words or hyphenated names will never fuzzy match. | Same fix as phiScanner — split input into words, compare each word to name components separately. |

### HIGH: Direct Client ID Bypasses Existence Check

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `clientResolver.mjs:75-90` | When user provides `clientId` directly (e.g., "schedule client 61 for Tuesday"), the code on line 162-166 sets `ctx.resolvedClient = { id: clientId }` BEFORE calling `resolveClient`. Then on line 177, `resolveClient('#' + clientId)` is called which queries the DB. However, if the DB query returns no rows (client doesn't exist or is soft-deleted), `ctx.resolvedClient` was already partially set to `{ id: 61 }` with no name, and `resolved` will be null. The code then tries `ctx.intent.params.clientId = resolved.id` on line 180 which throws TypeError. | Add explicit null check after resolveClient call: `if (!resolved) { ctx.error = error || 'Client not found'; return ctx; }` before using `resolved.id`. Also fix the early-return logic - if `clientId` is provided without `clientRef`, the null check on line 169 doesn't trigger because `clientId` is truthy. |

### HIGH: SQL Injection Vulnerability in Client Resolver

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `clientResolver.mjs:75-90` (raw SQL query) | The query string is built with string concatenation on line 77-79: `WHERE "isActive" = true AND role = 'client'`. While no user input is directly interpolated HERE, this is a raw SQL pattern that's dangerous if extended. The direct ID query on lines 77-79 DOES use parameterized queries correctly. But the comment on line 72 mentions "trainerId" filtering that was never implemented - future developers might add it unsafely. | Add explicit comment warning about parameterized queries, or convert to Sequelize ORM entirely. |

### HIGH: Malformed Client ID Regex Accepts Invalid Input

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `clientResolver.mjs:72-73` | Regex `/(?:client\s*#?\s*|#)?(\d+)$/i` with `$` anchor SHOULD be safe, but let's trace: Input "client123abc" → matches "client" (group 1), then `\d+` matches "123", then `$` should fail because "abc" remains. Actually this IS safe due to `$`. But "client #61session" would match "#61" and ignore "session". The regex needs tightening. | Change to `/^(?:client\s*#?\s*|#)?(\d+)$/` with `^` anchor to ensure entire string is the ID reference. |

### MEDIUM: Intent Classifier Timeout Not Applied Consistently

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `commandExecutor.mjs` (missing) | `MAX_CLASSIFICATION_TIMEOUT_MS = 10000` is used in `intentClassifier.mjs` via `Promise.race`, but NO other pipeline steps have timeouts. If `resolveClient` hangs on slow DB query, entire pipeline blocks. | Add timeout wrapper to each async pipeline step in commandExecutor.mjs: `await Promise.race([step(ctx), timeout(5000)])`. |

### MEDIUM: PHI Scanner Abbreviations Not Matched

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `phiScanner.mjs:99` | The fuzzy matching function `if (word.length < 3) return null` explicitly skips all abbreviations like "ACL", "MCL", "PCL" which are 3 characters. While the regex pattern catches these via `MEDICAL_PATTERNS`, if a user misspells "ACL" as "ACL" it's handled, but misspellings like "ACK" won't be caught by fuzzy. | Remove the `word.length < 3` early return, or add explicit abbreviation list that bypasses length check. |

---

## 2. ARCHITECTURE FLAWS

### CRITICAL: No Step Timeout Protection in Pipeline

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `commandExecutor.mjs:276-285` | The main pipeline loop `for (const step of PIPELINE_STEPS)` has no timeout protection. A slow DB query in `resolveClient` can hang the entire request indefinitely. While intent classification has its own timeout, other steps don't. | Wrap each step execution in `Promise.race` with configurable timeout per step type. |

### CRITICAL: In-Memory Pending Operations Store

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `destructiveOperations.mjs:24-30` | `pendingOps` is a `Map()` stored in server memory. In production (multi-instance deployment), operations prepared on server A cannot be verified on server B. This causes random "Operation expired" errors in load-balanced environments. | Integrate Redis for operation storage. Add conditional: `const store = process.env.REDIS_URL ? await createRedisClient() : new Map()`. |

### HIGH: Command Executor Has Prop Drilling

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `commandExecutor.mjs` | The `ctx.options` object is passed through with many optional fields: `selectedClientName`, `selectedClientId`, `previousContext`, `sequelize`, `conversationId`. These come from HTTP request context but are loosely typed. | Create a `PipelineOptions` interface and validate options at pipeline entry point. Consider extracting `sequelize` into a dependency-injected service. |

### HIGH: Duplicate Levenshtein Implementations

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `phiScanner.mjs:40-55`, `clientResolver.mjs:10-25` | Both files have nearly identical `levenshtein` function. This is a DRY violation. The implementations differ slightly: phiScanner uses `Array.from({ length: la + 1 }, ...)` while clientResolver uses the "single-row optimization". Both work but are maintained separately. | Create shared utility: `backend/utils/stringDistance.mjs` with both

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
