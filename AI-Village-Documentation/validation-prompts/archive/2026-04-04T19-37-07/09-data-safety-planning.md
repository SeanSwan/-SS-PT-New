# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 80.5s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-FORMAT-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 12:37:07 PM

---

# Data Safety Audit Report: Bootcamp Class Format & Style Comprehensive Upgrade Plan

**Auditor:** Data Safety Review System
**Platform:** SwanStudios SaaS (sswanstudios.com)
**Date:** 2025
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW

---

## ⚠️ EXECUTIVE SUMMARY

**This plan is primarily a frontend/backend configuration upgrade for a Bootcamp Builder feature — not an AI chat, file storage, or conversation system.** The 8 audit questions submitted appear to have been written for a *different plan* (likely an AI Chat upgrade plan involving JSONB conversation storage, R2 file attachments, voice recording, and sidebar UI). **The plan document provided contains none of those systems.**

This creates its own data safety risk: **audit questions mismatched to the plan under review can create false confidence** — real risks in the actual plan go unexamined while phantom risks in a different system consume review bandwidth.

**I will:**
1. Flag the mismatch explicitly (CRITICAL process finding)
2. Answer each question as it *actually applies* to this plan
3. Audit the *real* data safety risks present in this plan

---

## FINDING 0 — PROCESS INTEGRITY

### 🔴 CRITICAL: Audit Questions Do Not Match Plan Under Review

**Description:**
The 8 audit questions reference systems that do not exist in the submitted plan:
- JSONB conversation message arrays → **Not in this plan**
- R2 storage for file attachments → **Not in this plan**
- Voice recording storage → **Not in this plan**
- Sidebar listing with soft-delete → **Not in this plan**
- Concurrent tab message race conditions → **Not in this plan**
- Token usage tracking → **Not in this plan**

The submitted plan is a **Bootcamp Builder format configuration upgrade** affecting:
- `bootcampConstants.mjs` / `BootcampBuilderConstants.ts` (format config objects)
- `bootcampGenerator.mjs` (workout generation logic)
- Several React UI components (dropdowns, preview panels)
- A `unilateral` boolean flag on exercise metadata

**Risk of mismatch:**
Real vulnerabilities in this plan (enumerated below) would be missed entirely if the audit stopped at "these questions don't apply."

**Recommendation:**
- Maintain a plan-to-audit-question mapping document
- Require plan authors to tag plans with system domains (`CHAT`, `STORAGE`, `WORKOUT_BUILDER`, `AUTH`, etc.)
- Route audit questions to the correct plan before review begins
- If the AI Chat upgrade plan exists separately, submit it for its own audit

---

## AUDIT QUESTIONS — APPLIED TO THIS PLAN

Each question answered in context of what this plan *actually* touches:

---

### 1. Conversation JSONB Growth

**Applicability to this plan:** ❌ Not applicable
**This plan's equivalent risk:** Format config objects stored in DB or session

**Actual finding:**

```javascript
// bootcampConstants.mjs — new format library
export const FORMAT_CONFIG = {
  '2x8_r3': { stations: 8, exercisesPerStation: 2, rounds: 3, durationSec: 30, restSec: 15 },
  // ... 14+ more formats
  'mixed_unilateral': { stations: [7,1], exercisesPerStation: [2,3], rounds: [3,1], ... }
};
```

The `mixed_unilateral` format has **heterogeneous array values** where other formats have scalars. If generated workout data is stored in PostgreSQL (likely as JSONB in a sessions or workouts table), this inconsistent schema will cause:
- Type assertion failures in TypeScript consumers
- Unpredictable behavior in `bootcampGenerator.mjs` if it assumes scalar values
- Potential NULL or undefined errors when calculating timing for mixed formats

### 🟡 MEDIUM: Inconsistent Format Config Schema

**Recommendation:**

```typescript
// BootcampBuilderConstants.ts — enforce discriminated union
type StationConfig =
  | { kind: 'uniform'; stations: number; exercisesPerStation: number; rounds: number; durationSec: number; restSec: number }
  | { kind: 'mixed'; segments: Array<{ stations: number; exercisesPerStation: number; rounds: number; durationSec: number; restSec: number; unilateral?: boolean }> };

// Never use parallel arrays — they desync silently
// BAD:  stations: [7, 1], exercisesPerStation: [2, 3], rounds: [3, 1]
// GOOD: segments: [{ stations: 7, ex: 2, rounds: 3 }, { stations: 1, ex: 3, rounds: 1, unilateral: true }]
```

---

### 2. Soft Delete Integrity

**Applicability to this plan:** ❌ Not applicable
**This plan's equivalent risk:** Stale format configs in cached/stored workouts

### 🟡 MEDIUM: No Migration Strategy for Existing Saved Workouts

**Description:**
If users have saved workouts using the old format IDs (`stations_4x`, `stations_3x5`, etc.), and the plan renames or restructures these formats, those saved workouts will reference **orphaned format IDs** that no longer exist in `FORMAT_CONFIG`.

The plan does not address:
- What happens when `bootcampGenerator.mjs` receives a legacy format ID
- Whether saved workout records in the database retain the old format string
- Whether the UI will crash or silently fail when loading a saved workout with an unknown format

**Recommendation:**

```javascript
// bootcampGenerator.mjs — add format ID migration map
const LEGACY_FORMAT_MAP = {
  'stations_4x':  '4x4_r2',   // closest equivalent
  'stations_3x5': '3x5_r2',
  'stations_2x7': '2x7_r3',
  'stations_3x4': '3x4_r3',
  'stations_5x3': '5x4_r1',
  // full_group, emom, tabata, amrap, circuit, partner, hybrid — unchanged
};

function resolveFormatId(rawId) {
  if (FORMAT_CONFIG[rawId]) return rawId;
  const migrated = LEGACY_FORMAT_MAP[rawId];
  if (migrated) {
    logger.warn(`Legacy format ID "${rawId}" migrated to "${migrated}"`);
    return migrated;
  }
  throw new Error(`Unknown format ID: ${rawId}`);
}
```

```sql
-- Before deploying: audit how many saved workouts use legacy format IDs
SELECT format_id, COUNT(*) as count
FROM workouts  -- or sessions, bootcamp_plans — whatever table stores this
GROUP BY format_id
ORDER BY count DESC;
```

---

### 3. R2 Storage for Attachments

**Applicability to this plan:** ❌ Not applicable
**This plan's equivalent risk:** Exercise database integrity with new `unilateral` flag

### 🟠 HIGH: `unilateral` Boolean Addition to 840+ Exercise Database

**Description:**
The plan proposes adding a `unilateral` boolean to exercise metadata. With 840+ exercises:

- **Default value risk:** If `unilateral` defaults to `false` (or NULL), all existing exercises are treated as bilateral. This is correct for most, but any exercise that *is* unilateral will silently produce **incorrect timing calculations** until manually flagged.
- **No audit trail:** There's no mention of who flags exercises as unilateral, when, or how errors are corrected.
- **Timing calculation impact:** A unilateral exercise incorrectly flagged as bilateral will generate workouts that are **50% shorter than planned** for that station. A bilateral exercise incorrectly flagged as unilateral will generate workouts **50% longer than planned**.

**Recommendation:**

```sql
-- Migration: add column with explicit default and comment
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unilateral_reviewed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unilateral_reviewed_by INTEGER REFERENCES users(id);

COMMENT ON COLUMN exercises.is_unilateral IS
  'TRUE if exercise works one limb at a time (requires 2x time for bilateral equivalence).
   NULL-safe: unreviewed exercises default to FALSE (bilateral assumption).';

-- Create a review queue for Sean to audit
CREATE VIEW exercises_pending_unilateral_review AS
SELECT id, name, category, muscle_groups
FROM exercises
WHERE unilateral_reviewed_at IS NULL
ORDER BY name;
```

```typescript
// In timing calculator — be explicit about the assumption
function calculateStationTime(exercise: Exercise, durationSec: number): number {
  // ASSUMPTION: unreviewed exercises (is_unilateral = false by default) are treated as bilateral
  // This may UNDERESTIMATE time for unreviewed unilateral exercises
  // Trainer should review the unilateral flag for all exercises before relying on timing preview
  return exercise.is_unilateral ? durationSec * 2 : durationSec;
}
```

---

### 4. Voice Recording Storage

**Applicability to this plan:** ❌ Not applicable
**This plan's equivalent risk:** N/A — no audio in this plan

**Note for completeness:** This plan contains no voice, audio, or media components. If a voice-first AI coach feature is planned separately, it requires its own dedicated privacy audit covering GDPR Article 9 (biometric data), CCPA, and retention policies.

---

### 5. Migration Safety / "Zero Backend Changes" Claim

**Applicability to this plan:** ✅ Directly applicable — plan modifies backend files

### 🔴 CRITICAL: Plan Modifies Backend But Has No Migration Safety Gates

**Description:**
The plan explicitly lists `backend/services/bootcamp/bootcampConstants.mjs` and `backend/services/bootcamp/bootcampGenerator.mjs` as files requiring changes. This is **not** zero backend changes. The plan does not include:

- A database migration file for the `unilateral` flag
- A rollback procedure if the new format configs break generation
- A feature flag to enable new formats without affecting existing users
- Any mention of testing the generator with new format IDs before production deployment

**The specific risk:** `bootcampGenerator.mjs` receives a format ID and generates a workout. If a new format ID is sent to an **undeployed backend** (e.g., frontend deployed first), the generator will hit the `resolveFormatId` error path — or worse, silently return a malformed workout if there's no validation.

**Recommendation:**

```javascript
// bootcampGenerator.mjs — add strict input validation
import { FORMAT_CONFIG } from './bootcampConstants.mjs';

export function validateFormatId(formatId) {
  if (!formatId || typeof formatId !== 'string') {
    throw new ValidationError('format_id must be a non-empty string');
  }
  if (!FORMAT_CONFIG[formatId]) {
    // Log for monitoring — this fires if frontend is ahead of backend
    logger.error('UNKNOWN_FORMAT_ID', { formatId, availableFormats: Object.keys(FORMAT_CONFIG) });
    throw new ValidationError(`Unknown format: "${formatId}". Valid formats: ${Object.keys(FORMAT_CONFIG).join(', ')}`);
  }
  return FORMAT_CONFIG[formatId];
}
```

```bash
# Deployment order MUST be:
# 1. Deploy backend with new FORMAT_CONFIG (new IDs available, old IDs still work via LEGACY_FORMAT_MAP)
# 2. Run database migration for is_unilateral column
# 3. Deploy frontend with new format dropdown
# 4. Monitor error logs for UNKNOWN_FORMAT_ID events for 24 hours
```

---

### 6. Concurrent Access / Race Conditions

**Applicability to this plan:** ✅ Partially applicable

### 🟡 MEDIUM: Concurrent Workout Generation Requests

**Description:**
If a trainer double-clicks "Generate Workout" or has two tabs open, two simultaneous requests to `bootcampGenerator.mjs` with the same session/workout ID could:
- Overwrite each other's results if the generator writes to a shared record
- Create duplicate workout records
- Leave a workout in a partial state if generation is not atomic

**Recommendation:**

```javascript
// bootcampGenerator.mjs — idempotency key pattern
export async function generateBootcampWorkout(params) {
  const { formatId, sessionId, idempotencyKey } = params;

  // Check if this exact request was already processed
  const existing = await WorkoutGeneration.findOne({
    where: { idempotency_key: idempotencyKey },
  });
  if (existing) {
    logger.info('Returning cached generation result', { idempotencyKey });
    return existing.result;
  }

  // Acquire advisory lock on sessionId to prevent concurrent generation
  await sequelize.query('SELECT pg_advisory_xact_lock($1)', {
    bind: [hashToInt(sessionId)],
    type: QueryTypes.SELECT,
  });

  // Generate and store with idempotency key
  const result = await doGenerate(formatId, params);
  await WorkoutGeneration.create({ idempotency_key: idempotencyKey, result });
  return result;
}
```

```typescript
// Frontend — prevent double submission
const [isGenerating, setIsGenerating] = useState(false);

async function handleGenerate() {
  if (isGenerating) return; // Guard against double-click
  setIsGenerating(true);
  try {
    await generateWorkout({ idempotencyKey: crypto.randomUUID() });
  } finally {
    setIsGenerating(false);
  }
}
```

---

### 7. Token Usage Tracking

**Applicability to this plan:** ⚠️ Marginal — only if AI generation uses LLM tokens

### 🟢 LOW: New Formats May Increase AI Generation Token Consumption

**Description:**
The plan adds 14+ new format IDs and 8 new class styles. If `bootcampGenerator.mjs` uses an LLM (Gemini/GPT) to generate exercise selections, the expanded format descriptions sent in the system prompt will increase token consumption per request. The plan does not budget for this increase.

**Recommendation:**

```javascript
// bootcampGenerator.mjs — log token usage per format for cost monitoring
logger.info('AI_GENERATION_TOKENS', {
  formatId,
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
  totalTokens: response.usage.total_tokens,
  estimatedCostUSD: (response.usage.total_tokens / 1000) * TOKEN_COST_PER_1K,
});
```

Monitor for 30 days post-launch. If average tokens per generation increases >20%, optimize the system prompt to reference format IDs by key only, not full descriptions.

---

### 8. Rate Limiting Adequacy

**Applicability to this plan:** ✅ Applicable

### 🟠 HIGH: No Rate Limiting on Workout Generation Endpoint

**Description:**
Workout generation (especially if LLM-backed) is the most expensive operation in this system. The plan adds 14+ new formats and 8 new styles, potentially making generation more complex. There is no mention of:
- Rate limiting on the generation endpoint
- Per-user generation quotas
- Cost caps for LLM-backed generation
- Abuse prevention if a client loops generation requests

**A single user rapidly generating workouts with `death_by` or `chipper` formats (which may require more complex LLM reasoning) could incur significant API costs.**

**Recommendation:**

```javascript
// backend/middleware/rateLimiter.mjs — add generation-specific limiter
import rateLimit from 'express-rate-limit';

export const bootcampGenerationLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute window
  max: 5,                        // 5 generations per minute per user
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many workout generations. Please wait before generating again.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('GENERATION_RATE_LIMIT_HIT', {
      userId: req.user?.id,
      ip: req.ip,
      formatId: req.body?.formatId,
    });
    res.status(429).json(options.message);

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
