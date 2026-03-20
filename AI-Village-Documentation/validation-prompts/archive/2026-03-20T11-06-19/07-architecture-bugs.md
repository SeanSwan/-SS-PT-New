# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 111.4s
> **Files:** backend/services/ai/commandExecutor.mjs, backend/services/ai/intentClassifier.mjs, backend/services/ai/clientResolver.mjs, backend/services/ai/errorLoopPrevention.mjs, backend/routes/aiBffRoutes.mjs
> **Generated:** 3/20/2026, 4:06:19 AM

---

# Deep Code Review: SwanStudios AI Backend

## Executive Summary
The code demonstrates a robust pipeline architecture with strong separation of concerns. However, significant production risks exist, primarily in the BFF layer's internal communication and potential security gaps in client resolution. The intent classification pipeline is well-structured but relies on brittle token limits.

---

## 1. Bug Detection

### CRITICAL
**File:** `backend/routes/aiBffRoutes.mjs`
**Line:** 65, 83, 105
**Issue:** **Internal HTTP Requests (Self-DoS)**
The BFF layer uses `fetch` to call its own internal endpoints (e.g., `/api/admin/dashboard-stats`). This creates unnecessary HTTP overhead (TCP handshake, serialization), doubles server load, and bypasses potential in-memory optimizations. It also relies on `req.protocol` being correct, which fails behind reverse proxies (SSL termination).
```javascript
// Line 83
const protocol = req.protocol || 'http'; // Defaults to http, ignoring X-Forwarded-Proto
const url = `${protocol}://${host}${path}`;
const response = await fetch(url, ...);
```
**Fix:** Refactor to call the service logic/functions directly instead of making HTTP requests to localhost.

---

### HIGH
**File:** `backend/services/ai/commandExecutor.mjs`
**Line:** 204
**Issue:** **Hardcoded Configuration String**
The confirmation message hardcodes "120 seconds", duplicating logic defined elsewhere (likely in `destructiveOperations.mjs`).
```javascript
message: `... The operation expires in 120 seconds.\n\n...`,
```
**Fix:** Import the actual TTL value or the message generator from the destructive operations module.

**File:** `backend/services/ai/intentClassifier.mjs`
**Line:** 74
**Issue:** **Token Limit Risk**
`maxTokens: 300` is likely insufficient if the command list is long. The prompt is injected via `buildCommandSummaryForClassifier`, and JSON output is requested. If the prompt consumes 1500 tokens and the limit is 300, the output will be truncated, causing JSON parse failures.
**Fix:** Increase `maxTokens` to 1000 or dynamically calculate based on prompt length.

---

### MEDIUM
**File:** `backend/services/ai/clientResolver.mjs`
**Line:** 113
**Issue:** **Case-Sensitive Email Match**
Emails are case-insensitive, but the prefix check compares lowercase `refLower` directly to `email.split('@')[0]`.
```javascript
if (email.split('@')[0] === refLower) return { score: 0.2, matchType: 'email_prefix' };
```
**Fix:** Normalize both sides

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
