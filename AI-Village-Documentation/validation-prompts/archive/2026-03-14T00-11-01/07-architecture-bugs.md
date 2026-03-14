# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 127.8s
> **Files:** scripts/validation-orchestrator.mjs, scripts/lib/recursive-consensus.mjs
> **Generated:** 3/13/2026, 5:11:01 PM

---

# Deep Code Review: SwanStudios Validation Orchestrator

## Executive Summary

I've completed a thorough review of both files. There are **several critical bugs** that will cause the system to malfunction, along with security concerns, architecture issues, and production readiness problems.

---

## CRITICAL BUGS

### 1. Missing `provider` Field Causes All Validators to Use Wrong API

| Severity | File | Line |
|----------|------|------|
| **CRITICAL** | `validation-orchestrator.mjs` | ~285-380 (buildValidatorTracks) |

**What's Wrong:**  
The `buildValidatorTracks()` function creates validator tracks but **never sets the `provider` field**. However, `runValidator()` checks `track.provider === 'gemini-direct'` to decide which API to call:

```javascript
// Line 485-488 in runValidator()
if (track.provider === 'gemini-direct') {
  const geminiKey = getGeminiKey();
  result = await callGeminiDirect(geminiKey, track.model, track.prompt);
} else {
  result = await callOpenRouter(apiKey, track.model, track.prompt);
}
```

Since no track has `provider` set, **ALL validators will use OpenRouter**, even if they should use Google GenAI directly. This breaks the entire Phase 2+3 debate system architecture.

**Fix:** Add `provider: 'openrouter'` to all Phase 1 tracks in `buildValidatorTracks()`:

```javascript
const tracks = [
  {
    name: 'UX & Accessibility',
    model: MODELS.gemini25Flash,
    provider: 'openrouter',  // ADD THIS
    prompt: `...`,
  },
  // ... repeat for all tracks
];
```

---

### 2. step35Flash Marked as Paid When Comment Says FREE

| Severity | File | Line |
|----------|------|------|
| **CRITICAL** | `validation-orchestrator.mjs` | ~498-502 |

**What's Wrong:**  
The code marks `step35Flash` as a paid model for cost tracking:

```javascript
const isPaidModel = track.model === MODELS.minimaxM25 || 
                    track.model === MODELS.gemini31Pro || 
                    track.model === MODELS.step35Flash;  // ← step-3.5-flash marked paid
```

But the model configuration comments clearly state it's **FREE**:

```javascript
step35Flash: 'stepfun/step-3.5-flash:free',  // FREE — 256K ctx, 74.4% SWE-bench
```

This causes a warning to be logged on every run for a free model, and the cost calculation will be wrong.

**Fix:** Remove `step35Flash` from the paid model check:

```javascript
const isPaidModel = track.model === MODELS.minimaxM25 || 
                    track.model === MODELS.gemini31Pro;
```

---

### 3. JSON Parse Error Will Crash Validators

| Severity | File | Line |
|----------|------|------|
| **HIGH** | `validation-orchestrator.mjs` | ~458-459 |

**What's Wrong:**  
Both `callOpenRouter()` and `callGeminiDirect()` call `await res.json()` without try/catch. If the API returns malformed JSON (which happens with rate limiting or server errors), the entire validator crashes:

```javascript
// callOpenRouter - lines 455-462
const data = await res.json();  // ← Can throw SyntaxError on bad JSON

if (data.error) {
  throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`);
}
```

**Fix:** Wrap JSON parsing in try/catch:

```javascript
let data;
try {
  data = await res.json();
} catch (parseErr) {
  throw new Error(`OpenRouter ${res.status}: Failed to parse response: ${parseErr.message}. Body: ${errBody.slice(0, 500)}`);
}
```

---

### 4. No Retry Logic for Expensive API Calls

| Severity | File | Line |
|----------|------|------|
| **HIGH** | `validation-orchestrator.mjs` | ~445-475 |

**What's Wrong:**  
Each validator makes a single API call with no retry mechanism. OpenRouter and Google GenAI frequently return 429 (rate limited) or 503 (service unavailable) errors. The system has no resilience:

```javascript
// Single attempt - no retries
let result;
if (track.provider === 'gemini-direct') {
  result = await callGeminiDirect(geminiKey, track.model, track.prompt);
} else {
  result = await callOpenRouter(apiKey, track.model, track.prompt);
}
```

**Fix:** Add exponential backoff retry:

```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const isRetryable = err.message.includes('429') || 
                          err.message.includes('503') || 
                          err.message.includes('timeout');
      if (!isRetryable) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`    Retry ${attempt}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
}
```

---

## SECURITY ISSUES

### 5. Example API Keys in Comments

| Severity | File | Line |
|----------|------|------|
| **HIGH** | `validation-orchestrator.mjs` | ~18-20, 95 |

**What's Wrong:**  
The file contains example API key patterns that could be mistaken for real keys or scanned by automated security tools:

```javascript
// Line 18-20
//    OPENROUTER_API_KEY=sk-or-v1-xxxxx                            ║
//    GEMINI_API_KEY=AIzaSy... (enables Phase 2+3 debates)        ║
```

**Fix:** Use clearly fake values with obvious placeholder text:

```javascript
//    OPENROUTER_API_KEY=your_key_here
//    GEMINI_API_KEY=your_google_ai_key_here
```

---

### 6. Hardcoded Referer Header

| Severity | File | Line |
|----------|------|------|
| **MEDIUM** | `validation-orchestrator.mjs` | ~447-448 |

**What's Wrong:**  
The HTTP referer is hardcoded to the production domain:

```javascript
'HTTP-Referer': 'https://sswanstudios.com',
```

This will cause issues when running locally or in staging, and could be flagged as a security issue.

**Fix:** Make it environment-aware:

```javascript
const referer = process.env.VALIDATION_REFERER || 'https://sswanstudios.com';
// ...
'HTTP-Referer': referer,
```

---

## ARCHITECTURE FLAWS

### 7. Unbounded Memory Growth in Debate History

| Severity | File | Line |
|----------|------|------|
| **HIGH** | `recursive-consensus.mjs` | ~60-90 |

**What's Wrong:**  
The `conversationHistory` string grows with each round without any limit. With 5 rounds of debate, each producing 4000+ tokens, this can consume significant memory:

```javascript
let conversationHistory = '';
// ...
// Each round appends:
conversationHistory += `\n\n## ${currentModel.role} (${currentModel.name}) — Round ${debateRound}\n${result.text}`;
```

For MAX_ROUNDS = 5, this could be 40KB+ of accumulated context, passed to every subsequent call.

**Fix:** Implement sliding window or summarize older rounds:

```javascript
// Keep only last 2 rounds + summaries
const MAX_HISTORY_ROUNDS = 2;
if (rounds.length > MAX_HISTORY_ROUNDS * 2) {
  const summary = summarizeDebate(rounds.slice(0, -MAX_HISTORY_ROUNDS * 2));
  conversationHistory = `Earlier rounds summary:\n${summary}\n\n` + 
    rounds.slice(-MAX_HISTORY_ROUNDS * 2).map(r => 
      `## ${r.role} — Round ${r.round}\n${r.text}`
    ).join('\n\n');
}
```

---

### 8. No Input Validation for Debate Config

| Severity | File | Line |
|----------|------|------|
| **MEDIUM** | `recursive-consensus.mjs` | ~45-55 |

**What's Wrong:**  
The `runRecursiveConsensus()` function doesn't validate its input config. Missing fields will cause cryptic errors deep in the execution:

```javascript
export async function runRecursiveConsensus(config) {
  const { topic, modelA, modelB, finalAuthority, initialPrompt, callModel, onRound } = config;
  // No validation - will throw on first access if fields missing
```

**Fix:** Add validation at the start:

```javascript
if (!config.modelA || !config.modelB) {
  throw new Error('DebateConfig requires modelA and modelB');
}
if (!['A', 'B'].includes(config.finalAuthority)) {
  throw new Error('finalAuthority must be "A" or "B"');
}
if (typeof config.callModel !== 'function') {
  throw new Error('callModel must be an async function');
}
```

---

### 9. Consensus Detection is Fragile

| Severity | File | Line |
|----------|------|------|
| **MEDIUM** | `recursive-consensus.mjs` | ~115-119 |

**What's Wrong:**  
Consensus detection only looks for exact phrases:

```javascript
function detectConsensus(text) {
  const upper = text.toUpperCase();
  return upper.includes('CONSENSUS REACHED') || upper.includes('FULL CONSENSUS');
}
```

This can produce false positives (model mentions "no consensus reached") or miss consensus when phrased differently.

**Fix:** Use more robust detection:

```javascript
function detectConsensus(text) {
  const upper = text.toUpperCase();
  // Must have positive consensus language, not just mentions
  const hasConsensus = /^(?:FULL\s+)?CONSENSUS\s+REACHED/im.test(text);
  const hasAgreement = /^(?:WE\s+)?AGREE(?:D)?(?:\s+ON|\s+THAT)/im.test(text);
  return hasConsensus || hasAgreement;
}
```

---

## PRODUCTION READINESS

### 10. No Request Timeout on fetch Calls

| Severity | File | Line |
|----------|------|------|
| **HIGH** | `validation-orchestrator.mjs` | ~445-475 |

**What's Wrong:**  
While there's an `AbortSignal.timeout(CONFIG.timeout)`, this only works if the request hangs. It doesn't handle slow responses well, and there's no overall timeout for the entire validation run.

**Fix:** Add a wrapper with proper timeout handling:

```javascript
async function callWithTimeout(promise, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
```

---

### 11. Archive Rotation Silently Swallows Errors

| Severity | File | Line |
|----------|------|------|
| **LOW** | `validation-orchestrator.mjs` | ~720-735 |

**What's Wrong:**  
The `rotateArchive()` function has a broad catch that hides all

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
