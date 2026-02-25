# Phase 3: AI Provider Router — Design Proposal

**Author:** Claude Code (Opus 4.6)
**Date:** 2026-02-24
**Status:** PROPOSAL R2 — Patched per GPT-5.3-Codex review (2 HIGH, 2 MEDIUM, 1 LOW resolved)
**Prerequisite:** Phase 1 Privacy Foundation (COMPLETE, 2 review rounds passed)

---

## Table of Contents

1. [Provider Adapter Interface](#1-provider-adapter-interface)
2. [Router Contract](#2-router-contract)
3. [Fallback Semantics](#3-fallback-semantics)
4. [Normalized Error Model](#4-normalized-error-model)
5. [Degraded-Mode Response Contract](#5-degraded-mode-response-contract)
6. [Validation Pipeline Placement](#6-validation-pipeline-placement)
7. [Audit Log Lifecycle Integration](#7-audit-log-lifecycle-integration)
8. [Rate Limiting / Abuse Controls](#8-rate-limiting--abuse-controls)
9. [Test Plan](#9-test-plan)
10. [File-by-File Implementation Plan](#10-file-by-file-implementation-plan)

---

## 1. Provider Adapter Interface

### Types

```typescript
// --- Request context (provider-agnostic) ---

type AiRequestType = 'workout_generation';
// Future: 'nutrition_planning' | 'progress_analysis'

interface AiGenerationContext {
  requestType: AiRequestType;
  userId: number;                 // internal only — never sent to provider
  deidentifiedPayload: object;    // output of Phase 1 deIdentify()
  serverConstraints: object;      // NASM constraints (server-derived only)
  payloadHash: string;            // SHA-256 of deidentifiedPayload
  promptVersion: string;          // e.g. "1.0.0"
  ruleEngineVersion: string;      // e.g. "1.0.0"
  modelPreference?: string;       // optional override (admin use)
  maxOutputTokens?: number;       // default: 2000
  timeoutMs?: number;             // default: per-provider config
}

// --- Provider result (success path) ---

interface AiProviderResult {
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;                  // e.g. "gpt-4", "claude-sonnet-4-6"
  rawText: string;                // provider text before parse — server-side only
  latencyMs: number;
  finishReason: string;           // e.g. "stop", "length", "content_filter"
  tokenUsage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
  };
}

// --- Provider error (normalized) ---

type AiProviderErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_AUTH'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'PROVIDER_CONTENT_FILTER'
  | 'PROVIDER_NETWORK'
  | 'UNKNOWN_PROVIDER_ERROR';

interface AiProviderError {
  provider: 'openai' | 'anthropic' | 'gemini';
  code: AiProviderErrorCode;
  message: string;                // sanitized — no raw SDK internals leaked
  retryable: boolean;
  statusCode: number | null;      // HTTP status from provider (if applicable)
}
```

### Adapter Interface

```javascript
/**
 * @interface AiProviderAdapter
 * Each provider implements this interface. The router calls adapters
 * polymorphically — the controller never touches provider SDKs.
 */
{
  /** Provider name (used in audit logs and failover trace) */
  name: 'openai' | 'anthropic' | 'gemini',

  /** Whether this adapter is configured (API key present, SDK available) */
  isConfigured(): boolean,

  /**
   * Generate a workout draft from de-identified context.
   *
   * @param {AiGenerationContext} ctx - De-identified payload + constraints
   * @returns {Promise<AiProviderResult>} - Normalized success result
   * @throws {AiProviderError} - Normalized error (never raw SDK exception)
   *
   * Contract:
   *   - ctx.deidentifiedPayload has ALREADY been de-identified
   *   - ctx.userId is for audit/logging only — NEVER included in provider call
   *   - Adapter builds its own prompt format from ctx.deidentifiedPayload + ctx.serverConstraints
   *   - rawText is the verbatim provider response text (for downstream JSON parse)
   *   - Adapter catches all SDK exceptions and normalizes to AiProviderError
   */
  generateWorkoutDraft(ctx: AiGenerationContext): Promise<AiProviderResult>,
}
```

### Adapter Implementations (Phase 3 MVP)

| Adapter | SDK | Config Env Var | Model Default | Notes |
|---------|-----|----------------|---------------|-------|
| `OpenAiAdapter` | `openai@^6.x` (already installed) | `OPENAI_API_KEY` | `gpt-4` | Current provider, migrate existing logic |
| `AnthropicAdapter` | `@anthropic-ai/sdk` (to install) | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | Messages API |
| `GeminiAdapter` | `@google/generative-ai` (to install) | `GEMINI_API_KEY` | `gemini-2.0-flash` | generateContent API |

Each adapter is a thin wrapper (~80-120 lines) that:
1. Builds the provider-specific prompt format from `ctx.deidentifiedPayload` + `ctx.serverConstraints`
2. Calls the provider SDK with timeout
3. Normalizes the response to `AiProviderResult`
4. Catches SDK exceptions and throws `AiProviderError` with normalized `code`

### Prompt Building

The current `buildPrompt()` logic in `aiWorkoutController.mjs:108-150` will be extracted into a shared `buildWorkoutPrompt(deidentifiedPayload, serverConstraints)` function. Each adapter calls this to get the prompt text, then wraps it in the provider's message format.

This ensures all providers get the **same de-identified prompt content** — only the message envelope differs.

---

## 2. Router Contract

### Router Outcome (normalized envelope)

```javascript
/**
 * The router returns ONE of these two shapes.
 * The controller pattern-matches on `ok` and never touches provider internals.
 */

// Success: at least one provider returned a valid response
{
  ok: true,
  result: AiProviderResult,       // from the provider that succeeded
  failoverTrace: string[],        // e.g. ["openai:PROVIDER_TIMEOUT", "anthropic:success"]
}

// Failure: all providers failed → degraded mode activated
{
  ok: false,
  errors: AiProviderError[],      // one per provider attempted
  degraded: true,
  failoverTrace: string[],        // e.g. ["openai:PROVIDER_TIMEOUT", "anthropic:PROVIDER_RATE_LIMIT", "gemini:not_configured"]
}
```

### Router Function Signature

```javascript
/**
 * Route an AI generation request through the provider chain.
 *
 * @param {AiGenerationContext} ctx - De-identified context (from controller)
 * @returns {Promise<AiRouterOutcome>} - Normalized success or degraded envelope
 *
 * Guarantees:
 *   - Never throws — all provider errors caught and normalized
 *   - failoverTrace always populated (even on first-try success)
 *   - On ok:false, caller can safely render degraded-mode response
 *   - Global timeout budget enforced (ctx never runs longer than GLOBAL_TIMEOUT_MS)
 */
async function routeAiGeneration(ctx: AiGenerationContext): Promise<AiRouterOutcome>
```

---

## 3. Fallback Semantics

### Provider Order

```
OpenAI → Anthropic → Gemini → Degraded Mode
```

Configurable via env var `AI_PROVIDER_ORDER` (comma-separated, default: `openai,anthropic,gemini`).
Only configured providers (API key present) are included in the chain.

### Retry Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| Max retries per provider | 1 | Phase 3 MVP — keep latency bounded |
| Retry on | `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMIT`, `PROVIDER_NETWORK` | Transient errors only |
| Do NOT retry on | `PROVIDER_AUTH`, `PROVIDER_CONTENT_FILTER`, `PROVIDER_INVALID_RESPONSE` | Config errors / non-transient |
| Retry delay | 500ms (fixed, no jitter for MVP) | Simple, predictable |
| Between-provider delay | 0ms | Fail fast to next provider |

### Timeout Budgets

| Scope | Default | Env Var | Notes |
|-------|---------|---------|-------|
| Per-provider call | 10,000ms | `AI_PROVIDER_TIMEOUT_MS` | Includes retry delay |
| Global route budget | 25,000ms | `AI_GLOBAL_TIMEOUT_MS` | Hard cap — router aborts remaining providers |
| Provider retry | 8,000ms | — | Shortened on retry to fit budget |

The router tracks elapsed time. If the global budget is exhausted mid-chain, remaining providers are skipped with `failoverTrace` entry `"gemini:budget_exhausted"`.

### Circuit Breaker

Per-provider circuit breaker with three states: **closed** (normal), **open** (skip), **half-open** (probe).

| Parameter | Value | Notes |
|-----------|-------|-------|
| Failure threshold | 3 consecutive failures | Opens the circuit |
| Rolling window | 5 minutes | Failures outside window don't count |
| Open duration | 60 seconds | After which → half-open (allow 1 probe) |
| Half-open success | 1 success → close | Back to normal |
| Half-open failure | 1 failure → re-open | Back to 60s cooldown |
| Storage | In-memory Map | Reset on server restart (acceptable for MVP) |

When a provider's circuit is open, the router skips it immediately and records `"openai:circuit_open"` in `failoverTrace`.

---

## 4. Normalized Error Model

### Provider Error → Controller Response Mapping

The controller does NOT branch on provider SDK types. It reads `AiRouterOutcome` and maps to HTTP responses:

| Router Outcome | HTTP Status | Response Body | When |
|----------------|-------------|---------------|------|
| `ok: true` | 200 | Standard success response (workout plan) | Any provider succeeded |
| `ok: false`, all errors are `PROVIDER_RATE_LIMIT` | 429 | `{ success: false, code: 'AI_RATE_LIMITED', message: '...' }` | All providers rate-limited |
| `ok: false`, at least one `PROVIDER_UNAVAILABLE` or `PROVIDER_NETWORK` | 200 | Degraded-mode response (see §5): `success: true, degraded: true` | Providers down — manual fallback |
| `ok: false`, at least one `PROVIDER_TIMEOUT` | 200 | Degraded-mode response (see §5): `success: true, degraded: true` | Providers timed out — manual fallback |
| `ok: false`, all `PROVIDER_AUTH` | 502 | `{ success: false, code: 'AI_CONFIG_ERROR', message: '...' }` | All provider keys misconfigured |
| `ok: false`, mixed errors (not all auth) | 200 | Degraded-mode response (see §5): `success: true, degraded: true` | General fallback — manual mode |
| Parse error on `ok: true` result | 502 | `{ success: false, code: 'AI_PARSE_ERROR', message: '...' }` | Provider returned non-JSON |
| Validation error on parsed result | 422 | `{ success: false, code: 'AI_VALIDATION_ERROR', message: '...' }` | AI output fails schema/rule check |
| PII detected in provider output | 422 | `{ success: false, code: 'AI_PII_LEAK', message: '...' }` | Privacy violation — reject (see §6) |

> **R2 PATCH (HIGH):** All degraded-mode responses use HTTP 200 (not 503). The request was processed correctly — AI was just unavailable. `success: true, degraded: true` signals the frontend to render manual-mode UI instead of retrying.

### Error Code Enum (for `code` field in responses)

```
AI_RATE_LIMITED       — all providers rate-limited
AI_CONFIG_ERROR       — all provider API keys misconfigured
AI_PARSE_ERROR        — provider returned text that isn't valid JSON
AI_VALIDATION_ERROR   — parsed output fails Zod/rule-engine checks
AI_DEGRADED_MODE      — all providers failed, manual fallback activated
AI_CONSENT_MISSING    — (existing Phase 1)
AI_CONSENT_DISABLED   — (existing Phase 1)
AI_CONSENT_WITHDRAWN  — (existing Phase 1)
AI_FEATURE_DISABLED   — (existing Phase 1, kill switch)
DEIDENTIFICATION_FAILED — (existing Phase 1)
```

---

## 5. Degraded-Mode Response Contract

When all providers fail (`ok: false`), the controller returns a structured degraded response. This is **first-class behavior**, not an exception-only path.

```javascript
// HTTP 200 with degraded flag — UI renders manual-mode card instead of AI plan
{
  success: true,                  // request was processed correctly
  degraded: true,                 // no AI draft was generated
  code: 'AI_DEGRADED_MODE',
  message: 'AI providers are temporarily unavailable. You can use manual templates or wait for AI to recover.',
  fallback: {
    type: 'manual_template_only',
    templateSuggestions: [
      { id: 'opt-1-stabilization', label: 'OPT Phase 1: Stabilization Endurance', category: 'OPT' },
      { id: 'opt-2-strength',      label: 'OPT Phase 2: Strength Endurance',      category: 'OPT' },
      { id: 'opt-3-hypertrophy',   label: 'OPT Phase 3: Hypertrophy',             category: 'OPT' },
      { id: 'opt-4-maxstrength',   label: 'OPT Phase 4: Maximal Strength',        category: 'OPT' },
      { id: 'opt-5-power',         label: 'OPT Phase 5: Power',                   category: 'OPT' },
      { id: 'ces-general',         label: 'Corrective Exercise Strategy',          category: 'CES' },
      { id: 'general-beginner',    label: 'General Fitness: Beginner',             category: 'GENERAL' },
      { id: 'general-intermediate',label: 'General Fitness: Intermediate',         category: 'GENERAL' },
    ],
    reasons: [
      // Human-readable reasons from failoverTrace
      // e.g. "OpenAI: request timed out", "Anthropic: rate limit exceeded"
    ],
  },
  failoverTrace: [
    // Raw trace for debugging (admin-visible, not client-facing)
    'openai:PROVIDER_TIMEOUT',
    'anthropic:PROVIDER_RATE_LIMIT',
    'gemini:not_configured',
  ],
}
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `success: true` for degraded | Yes | The request was processed correctly — AI was just unavailable. Client can distinguish via `degraded: true`. |
| HTTP 200 (not 503) | Yes | The server successfully evaluated the request and returned actionable data. 503 implies "retry later" and breaks some client retry logic. |
| Template suggestions | Static list (OPT-aligned) | NASM OPT phases map directly to template categories. No DB query needed for MVP. |
| `reasons` array | Human-readable | For UI display. Technical details in `failoverTrace`. |
| `failoverTrace` | Always present | Admin dashboard can show this; client UI ignores it. |

### Degraded Mode Does NOT

- Return an AI-generated plan of any kind
- Retry in the background and push later (Phase 4+)
- Auto-select a template (user must choose)
- Block the manual workout creation flow

---

## 6. Validation Pipeline Placement

### Full Request Lifecycle (exact order)

```
 1. Request enters POST /api/ai/workout-generation
 2. Middleware: protect (auth)
 3. Middleware: aiKillSwitch (env toggle → 503)
 4. Controller: RBAC check (client/trainer/admin role + assignment)
 5. Controller: Per-user consent check (AiPrivacyProfile)
 6. Controller: Resolve masterPromptJson from User model
 7. Controller: De-identify payload (deIdentify() → fail-closed on null)
 8. Controller: Build server-derived NASM constraints (buildNasmConstraints)
 9. Controller: Create audit log (status: 'pending')
10. Controller: Call router (routeAiGeneration)
    ├── Router: Try provider chain (OpenAI → Anthropic → Gemini)
    ├── Router: Each adapter builds prompt from de-identified payload
    ├── Router: Circuit breaker + retry logic
    └── Router: Return AiRouterOutcome
11. Controller: If ok:false → return degraded response (§5) + update audit log (status: 'degraded')
12. Controller: PII detection scan on result.rawText (reject if detected — see policy below)
13. Controller: JSON parse of result.rawText
14. Controller: Zod schema validation of parsed output
15. Controller: Rule-engine validation (NASM constraints, exercise safety)
16. Controller: Persist workout plan (WorkoutPlan + days + exercises)
17. Controller: Update audit log (status: 'success', outputHash, tokenUsage)
18. Controller: Return success response
```

### Key Enforcement Points

| Step | What's Blocked | Why |
|------|----------------|-----|
| 2-3 | Unauthenticated + kill switch | Upstream of everything |
| 4-5 | Unauthorized + unconsented | RBAC-before-consent (Phase 1 pattern) |
| 7 | Raw PII reaching provider | De-identification is mandatory, fail-closed |
| 8 | User-supplied constraints | Only server-derived NASM constraints used |
| 12 | PII in AI response | **Reject** (422 + `AI_PII_LEAK`) — privacy-first policy |
| 14 | Malformed AI output | Zod rejects before persistence |
| 15 | Unsafe exercises | Rule engine checks NASM alignment |

### PII Detection (step 12) — Reject Policy

> **R2 PATCH (MEDIUM):** Changed from "strip and continue" to "reject on detection." Silent text surgery risks corrupting JSON structure or hiding serious privacy leakage. Privacy-first means PII in provider output is a hard failure.

Before parsing, scan `rawText` for potential PII leakage:
- Check for email patterns (`\b\S+@\S+\.\S+\b`)
- Check for phone patterns (`\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`)
- Check for the user's real name (if available from request context, i.e. the original name that was replaced during de-identification)

**Policy: REJECT on detection.**
- Log `logger.error('[PII Leak] Provider output contains PII', { provider, piiType, userId })`
- Update audit log: `status: 'pii_leak', errorCode: 'pii_detected'`
- Return HTTP 422: `{ success: false, code: 'AI_PII_LEAK', message: 'AI output contained personal information and was rejected for privacy.' }`
- Do NOT parse, persist, or return the tainted output
- This is defense-in-depth — the de-identification step should prevent PII from appearing in output, so any detection indicates a serious pipeline failure worth investigating

### Zod Schema (step 14)

```javascript
const WorkoutPlanOutputSchema = z.object({
  planName: z.string().min(1).max(200),
  durationWeeks: z.number().int().min(1).max(52),
  summary: z.string().max(2000),
  days: z.array(z.object({
    dayNumber: z.number().int().min(1),
    name: z.string().min(1).max(100),
    focus: z.string().max(200).optional(),
    dayType: z.enum(['training', 'active_recovery', 'rest', 'assessment', 'specialization']),
    estimatedDuration: z.number().min(5).max(300).optional(),
    exercises: z.array(z.object({
      name: z.string().min(1).max(200),
      setScheme: z.string().max(100).optional(),
      repGoal: z.string().max(100).optional(),
      restPeriod: z.number().min(0).max(600).optional(),
      tempo: z.string().max(50).optional(),
      intensityGuideline: z.string().max(500).optional(),
      notes: z.string().max(1000).optional(),
      isOptional: z.boolean().optional(),
    })).min(0).max(30),
  })).min(1).max(30),
});
```

### Rule-Engine Validation (step 15)

Phase 3 MVP rules (applied after Zod parse):

| Rule | Check | Action on Fail |
|------|-------|----------------|
| Day count sanity | `days.length <= durationWeeks * 7` | Reject (422) |
| Exercise count per day | `day.exercises.length <= 20` | Trim + warn |
| Rest period range | `restPeriod ∈ [0, 600]` | Clamp to bounds |
| OPT phase alignment | If NASM baseline has optPhase, validate exercise choices match | Warn only (Phase 3 MVP) |
| No duplicate day numbers | All `dayNumber` values unique | Reject (422) |

---

## 7. Audit Log Lifecycle Integration

### Reusing Phase 1 `AiInteractionLog` Model

The existing model (`backend/models/AiInteractionLog.mjs`) already has the fields needed. Phase 3 adds two columns via migration:

| New Column | Type | Purpose |
|------------|------|---------|
| `promptVersion` | `STRING(20)` | Track which prompt template version was used |
| `tokenUsage` | `JSONB` | `{ inputTokens, outputTokens, totalTokens, estimatedCostUsd }` |

### Status Lifecycle

> **R2 PATCH (MEDIUM):** Unified audit status semantics. `degraded` is the canonical status for all-provider-fail paths. `provider_error` is removed as a separate audit status — the router always resolves to either `success` or `degraded` (never a raw provider error to the controller).

```
pending           → created at step 9 (before router call)
  ↓
success           → step 17 (plan persisted, all validations passed)
degraded          → step 11 (ok:false from router, degraded response sent to client)
parse_error       → step 13 (rawText is not valid JSON)
validation_error  → step 14-15 (Zod or rule-engine rejection)
pii_leak          → step 12 (PII detected in provider output — rejected)
```

### Audit Log Update Fields (on each status transition)

| Status | Fields Updated |
|--------|----------------|
| `pending` | `userId, provider: 'pending', model: 'pending', requestType, payloadHash` |
| `success` | `provider, model, status: 'success', outputHash, durationMs, tokenUsage, promptVersion` |
| `degraded` | `provider: 'degraded', model: 'none', status: 'degraded', errorCode: (first normalized error code from failoverTrace), durationMs` |
| `parse_error` | `provider, model, status: 'parse_error', errorCode: 'parse_error', durationMs` |
| `validation_error` | `provider, model, status: 'validation_error', errorCode: 'zod_error' \| 'rule_engine_error', durationMs, outputHash` |
| `pii_leak` | `provider, model, status: 'pii_leak', errorCode: 'pii_detected', durationMs` |

### Failover Trace Logging

The `failoverTrace` array is logged to `logger.info` (structured JSON) but NOT stored in the audit log table. If persistent failover analysis is needed later, a separate `ai_failover_events` table can be added (Phase 4+).

---

## 8. Rate Limiting / Abuse Controls

### Per-User Rate Limits (Phase 3 MVP)

| Limit | Value | Enforcement | Response |
|-------|-------|-------------|----------|
| Per-user per minute | 3 requests | In-memory sliding window (per userId) | 429 + `{ code: 'AI_USER_RATE_LIMITED' }` |
| Per-user per hour | 20 requests | In-memory sliding window | 429 + `{ code: 'AI_USER_RATE_LIMITED' }` |
| Concurrent per user | 1 | In-memory Set of active userIds | 429 + `{ code: 'AI_CONCURRENT_LIMIT' }` |

### Global Rate Limits

| Limit | Value | Enforcement | Response |
|-------|-------|-------------|----------|
| Global per minute | 30 requests | In-memory counter | 503 + `{ code: 'AI_GLOBAL_RATE_LIMITED' }` |

### Timeout + Cancellation

- If a client disconnects mid-request (`req.socket.destroyed`), the router aborts remaining provider calls
- AbortController is passed to each provider adapter
- Timed-out requests update audit log with `status: 'provider_error', errorCode: 'PROVIDER_TIMEOUT'`

### Suspicious Activity Logging

Log a warning when:
- Same user hits rate limit 3+ times in 5 minutes
- Same user triggers 5+ `parse_error` or `validation_error` in 1 hour (possible adversarial prompt injection)
- Any request takes > 20 seconds

These are **log-only** in Phase 3 MVP. Automatic blocking is Phase 4+.

### Implementation

Rate limiting is a lightweight middleware function placed in the route chain AFTER auth but BEFORE the controller. Uses in-memory Maps with TTL cleanup (no Redis dependency for MVP).

```
POST /api/ai/workout-generation
  → protect
  → aiKillSwitch
  → aiRateLimiter        ← NEW (Phase 3)
  → generateWorkoutPlan
```

---

## 9. Test Plan

### Unit Tests (`backend/tests/unit/aiProviderRouter.test.mjs`)

| # | Test | What's Verified |
|---|------|-----------------|
| 1 | OpenAI adapter normalizes success result | `AiProviderResult` shape: provider, model, rawText, latencyMs, tokenUsage |
| 2 | OpenAI adapter maps 429 SDK error to `PROVIDER_RATE_LIMIT` | Normalized error code + `retryable: true` |
| 3 | OpenAI adapter maps 401 SDK error to `PROVIDER_AUTH` | Normalized error code + `retryable: false` |
| 4 | OpenAI adapter maps timeout to `PROVIDER_TIMEOUT` | Normalized error code + `retryable: true` |
| 5 | OpenAI adapter maps network error to `PROVIDER_NETWORK` | Normalized error code + `retryable: true` |
| 6 | Anthropic adapter normalizes success result | Same shape as OpenAI test |
| 7 | Gemini adapter normalizes success result | Same shape as OpenAI test |
| 8 | Router follows configured provider order | `failoverTrace` matches `AI_PROVIDER_ORDER` |
| 9 | Router retries on retryable errors (max 1) | `failoverTrace` shows retry entry |
| 10 | Router does NOT retry on non-retryable errors | `failoverTrace` shows single attempt |
| 11 | Router skips providers with open circuit | `failoverTrace` shows `"openai:circuit_open"` |
| 12 | Router respects global timeout budget | Remaining providers skipped after budget exhaustion |
| 13 | Router returns `ok: false` when all providers fail | `degraded: true`, `errors` array populated |
| 14 | Circuit breaker opens after 3 failures | Subsequent calls skip the provider |
| 15 | Circuit breaker half-open after cooldown | 1 probe request allowed |
| 16 | Degraded-mode response has correct shape | `templateSuggestions`, `reasons`, `failoverTrace` |
| 17 | Zod schema rejects missing `planName` | `validation_error` returned |
| 18 | Zod schema rejects empty `days` array | `validation_error` returned |
| 19 | Rule engine rejects duplicate day numbers | `validation_error` returned |
| 20 | Output sanitizer strips email patterns from rawText | PII removed before parse |
| 21 | Rate limiter blocks 4th request in 1 minute | 429 response |
| 22 | Concurrent limiter blocks second simultaneous request | 429 response |
| 23 | `isConfigured()` returns false when API key missing | Provider skipped with `"openai:not_configured"` |

### Integration Tests (`backend/tests/api/aiProviderRouterIntegration.test.mjs`)

All tests use **mocked provider SDKs** (no real API calls).

| # | Test | What's Verified |
|---|------|-----------------|
| 1 | OpenAI success path (end-to-end) | De-id → router → parse → validate → persist → audit log `success` |
| 2 | OpenAI fail → Anthropic success | `failoverTrace: ["openai:PROVIDER_TIMEOUT", "anthropic:success"]` |
| 3 | All providers fail → degraded mode | HTTP 200, `degraded: true`, template suggestions present |
| 4 | Malformed provider output → parse error | HTTP 502, audit log `parse_error`, no workout persisted |
| 5 | Valid JSON but fails Zod → validation error | HTTP 422, audit log `validation_error` |
| 6 | Valid JSON but fails rule engine → validation error | HTTP 422, audit log `validation_error` |
| 7 | Audit log status: `pending` → `success` | Status transitions correct, `durationMs` populated |
| 8 | Audit log status: `pending` → `provider_error` | Error code matches normalized code |
| 9 | Audit log status: `pending` → `degraded` | Provider is `'degraded'`, model is `'none'` |
| 10 | Token usage recorded in audit log | `tokenUsage` JSONB populated on success |
| 11 | Rate limiter enforces per-user per-minute limit | 4th request in 60s returns 429 |
| 12 | Concurrent limiter enforces 1-at-a-time | Second simultaneous request returns 429 |
| 13 | Kill switch blocks before router is called | 503, no audit log created |
| 14 | Consent check blocks before router is called | 403, no audit log created |

### Regression Tests (Critical — Privacy)

| # | Test | What's Verified |
|---|------|-----------------|
| R1 | Adapter input uses `deidentifiedPayload` only | Assert adapter never receives `client.name`, `client.contact.email`, etc. |
| R2 | `userId` is NOT included in any provider prompt | Assert userId absent from all message content |
| R3 | User-supplied `constraints` from req.body are NOT forwarded | Assert only `serverConstraints` (NASM) reach provider |
| R4 | Output sanitizer catches PII in AI response | Inject email in mock response, verify stripped |
| R5 | Consent check still enforced in router path | Phase 1 consent tests still pass with router wired in |

---

## 10. File-by-File Implementation Plan

### New Files

| # | File | Purpose | Est. Lines |
|---|------|---------|------------|
| 1 | `backend/services/ai/providerRouter.mjs` | Router core: provider chain, circuit breaker, timeout, failover | ~200 |
| 2 | `backend/services/ai/adapters/openaiAdapter.mjs` | OpenAI adapter (migrate from controller) | ~100 |
| 3 | `backend/services/ai/adapters/anthropicAdapter.mjs` | Anthropic adapter | ~100 |
| 4 | `backend/services/ai/adapters/geminiAdapter.mjs` | Gemini adapter | ~100 |
| 5 | `backend/services/ai/circuitBreaker.mjs` | Per-provider circuit breaker state machine | ~80 |
| 6 | `backend/services/ai/rateLimiter.mjs` | Per-user + global rate limiting (in-memory) | ~90 |
| 7 | `backend/services/ai/promptBuilder.mjs` | Extracted `buildPrompt` + `buildWorkoutPrompt` (shared across adapters) | ~80 |
| 8 | `backend/services/ai/outputValidator.mjs` | Zod schema + rule engine + PII sanitizer | ~150 |
| 9 | `backend/services/ai/types.mjs` | JSDoc type definitions (AiGenerationContext, AiProviderResult, etc.) | ~60 |
| 10 | `backend/services/ai/degradedResponse.mjs` | Build degraded-mode response with template suggestions | ~40 |
| 11 | `backend/middleware/aiRateLimiter.mjs` | Express middleware wrapper for rate limiter | ~40 |
| 12 | `backend/migrations/20260225000003-add-ai-log-router-columns.cjs` | Add `promptVersion`, `tokenUsage` to `ai_interaction_logs` | ~30 |
| 13 | `backend/tests/unit/aiProviderRouter.test.mjs` | Unit tests (23 tests) | ~500 |
| 14 | `backend/tests/api/aiProviderRouterIntegration.test.mjs` | Integration tests (14 tests) + regression tests (5 tests) | ~600 |

### Modified Files

| # | File | Changes | Risk |
|---|------|---------|------|
| 1 | `backend/controllers/aiWorkoutController.mjs` | Replace direct OpenAI call (lines 455-568) with `routeAiGeneration()` call. Remove `getOpenAIClient`, `buildPrompt`. Add Zod + rule-engine validation after router. Add degraded-mode response branch. | **HIGH** — core generation logic refactored. Extensive test coverage mitigates. |
| 2 | `backend/routes/aiRoutes.mjs` | Add `aiRateLimiter` middleware to workout-generation route. | LOW |
| 3 | `backend/models/AiInteractionLog.mjs` | Add `promptVersion` (STRING) and `tokenUsage` (JSONB) fields. | LOW |
| 4 | `backend/routes/aiMonitoringRoutes.mjs` | Update `updateMetrics` to accept provider info from router. | LOW |
| 5 | `backend/package.json` | Add `zod` dependency. Anthropic/Gemini SDKs deferred to Phase 3B. | LOW |

### NOT Modified (preserved as-is)

| File | Why |
|------|-----|
| `backend/services/deIdentificationService.mjs` | Upstream of router — no changes needed |
| `backend/middleware/aiConsent.mjs` | Upstream of router — no changes needed |
| `backend/controllers/aiConsentController.mjs` | Consent management is independent of provider routing |
| `backend/models/AiPrivacyProfile.mjs` | Consent model unchanged |

### Frontend Follow-Up (Phase 3B — minimal)

> **R2 PATCH (HIGH):** The degraded-mode response introduces a new payload shape (`success: true, degraded: true, fallback: {...}`) that the current frontend AI workout caller does not handle. Phase 3A is backend-first: the router, adapters, and validation stack are implemented and tested backend-only. Phase 3B adds minimal frontend handling to render the degraded response (template picker instead of AI plan). This is acknowledged as a required follow-up, not "no frontend changes."

| File | Change | Effort |
|------|--------|--------|
| AI workout generation caller (TBD — wherever the frontend triggers `POST /api/ai/workout-generation`) | Check `response.degraded === true` → render template picker instead of AI plan | Small |

### Implementation Order

```
Phase 3A (OpenAI + router + validation — this implementation pass):
1. backend/services/ai/types.mjs               (type definitions — no dependencies)
2. backend/services/ai/promptBuilder.mjs        (extract from controller — depends on types)
3. backend/services/ai/circuitBreaker.mjs       (standalone utility)
4. backend/services/ai/adapters/openaiAdapter.mjs  (migrate existing logic)
5. backend/services/ai/outputValidator.mjs      (Zod + rules + PII reject)
6. backend/services/ai/degradedResponse.mjs     (static template list)
7. backend/services/ai/providerRouter.mjs       (depends on 3, 4, 6)
8. backend/services/ai/rateLimiter.mjs          (standalone utility)
9. backend/middleware/aiRateLimiter.mjs          (depends on 8)
10. backend/migrations/20260225000003-*          (DB schema addition)
11. backend/models/AiInteractionLog.mjs          (add new columns)
12. backend/tests/unit/aiProviderRouter.test.mjs       (scaffold alongside services — TDD)
13. backend/controllers/aiWorkoutController.mjs  (integrate router — depends on 2, 5, 7)
14. backend/routes/aiRoutes.mjs                  (wire rate limiter)
15. backend/tests/api/aiProviderRouterIntegration.test.mjs (integration + privacy regression)

Phase 3B (deferred — after Phase 3A verified):
16. backend/services/ai/adapters/anthropicAdapter.mjs
17. backend/services/ai/adapters/geminiAdapter.mjs
18. Frontend degraded-mode handler (minimal — template picker on degraded: true)

> **R2 PATCH (LOW):** Tests moved earlier (step 12, before controller integration at step 13). Unit tests are scaffolded alongside service implementations per TDD workflow.
```

---

## Constraints Checklist

| Constraint | How It's Met |
|------------|--------------|
| Server-side AI calls only | All provider calls in `backend/services/ai/adapters/` — no browser SDK |
| No raw masterPromptJson past de-id boundary | `deIdentify()` runs at step 7; adapters receive `ctx.deidentifiedPayload` only |
| Manual/template workflow when providers fail | Degraded-mode response (§5) returns template suggestions, `success: true` |
| Preserve Phase 1 consent enforcement | Steps 4-5 run BEFORE router; consent middleware unchanged |
| Preserve Phase 1 de-identification | Step 7 unchanged; `deIdentificationService.mjs` not modified |
| Preserve Phase 1 audit logging | Same `AiInteractionLog` model, extended with 2 columns |
| Backend-first, minimal frontend follow-up | Phase 3A is backend-only. Phase 3B adds frontend handling for `degraded: true` response. |
| Reuse existing de-id + consent | Steps 5, 7 are identical to current controller logic |

---

## Open Questions for Reviewer

1. **Degraded-mode HTTP status:** This proposal uses HTTP 200 with `degraded: true` (the request succeeded, just no AI draft). Alternative: HTTP 503 with degraded body. Which is preferred?

2. **Template suggestions source:** MVP uses a static list of NASM OPT templates. Should these come from a DB table (`workout_templates`) for future extensibility, or is static fine for Phase 3?

3. **Retry delay strategy:** MVP uses fixed 500ms. Should we use exponential backoff (500ms → 1s) even for MVP, or keep it simple?

4. **Circuit breaker persistence:** In-memory state resets on server restart. Is this acceptable for Phase 3, or should we use Redis?

5. **Token cost tracking:** `estimatedCostUsd` requires maintaining a cost table per model. Should this be a separate config file, or hardcoded for MVP?
