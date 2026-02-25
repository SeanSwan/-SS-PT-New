/**
 * AI Output Validator
 * ====================
 * Three-stage validation pipeline for AI provider output:
 *   1. PII detection (reject-on-detect, privacy-first)
 *   2. Zod schema validation (structural correctness)
 *   3. Rule-engine validation (NASM business rules)
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import { z } from 'zod';
import logger from '../../utils/logger.mjs';

// ── PII Detection Patterns ──────────────────────────────────────────────────

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
const PHONE_PATTERN = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;

/**
 * Scan rawText for PII leakage. Returns the first match found, or null.
 *
 * @param {string} rawText - Provider response text
 * @param {Object} [opts]
 * @param {string} [opts.userName] - Original user name to check for
 * @returns {{ piiType: string, match: string } | null}
 */
export function detectPii(rawText, opts = {}) {
  if (!rawText || typeof rawText !== 'string') return null;

  const emailMatch = rawText.match(EMAIL_PATTERN);
  if (emailMatch) {
    return { piiType: 'email', match: emailMatch[0] };
  }

  const phoneMatch = rawText.match(PHONE_PATTERN);
  if (phoneMatch) {
    return { piiType: 'phone', match: phoneMatch[0] };
  }

  if (opts.userName && opts.userName.length >= 2) {
    // Case-insensitive check for the user's real name
    const namePattern = new RegExp(`\\b${escapeRegex(opts.userName)}\\b`, 'i');
    const nameMatch = rawText.match(namePattern);
    if (nameMatch) {
      return { piiType: 'name', match: nameMatch[0] };
    }
  }

  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Zod Schema ───────────────────────────────────────────────────────────────

const ExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  setScheme: z.string().max(100).optional().nullable(),
  repGoal: z.string().max(100).optional().nullable(),
  restPeriod: z.number().min(0).max(600).optional().nullable(),
  tempo: z.string().max(50).optional().nullable(),
  intensityGuideline: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isOptional: z.boolean().optional().nullable(),
}).passthrough(); // Allow extra fields without breaking

const DaySchema = z.object({
  dayNumber: z.number().int().min(1),
  name: z.string().min(1).max(100),
  focus: z.string().max(200).optional().nullable(),
  dayType: z.enum(['training', 'active_recovery', 'rest', 'assessment', 'specialization']).optional().default('training'),
  estimatedDuration: z.number().min(5).max(300).optional().nullable(),
  exercises: z.array(ExerciseSchema).max(30).default([]),
}).passthrough();

export const WorkoutPlanOutputSchema = z.object({
  planName: z.string().min(1).max(200),
  durationWeeks: z.number().int().min(1).max(52),
  summary: z.string().max(2000).optional().default(''),
  days: z.array(DaySchema).min(1).max(30),
}).passthrough();

/**
 * Parse and validate the AI response JSON against the Zod schema.
 *
 * @param {string} rawText
 * @returns {{ ok: true, data: z.infer<typeof WorkoutPlanOutputSchema> } | { ok: false, error: string }}
 */
export function validateSchema(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return { ok: false, error: `JSON parse error: ${err.message}` };
  }

  const result = WorkoutPlanOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }

  return { ok: true, data: result.data };
}

// ── Rule-Engine Validation ───────────────────────────────────────────────────

/**
 * @typedef {Object} RuleEngineResult
 * @property {boolean} ok
 * @property {string[]} errors   - Hard failures (reject)
 * @property {string[]} warnings - Soft issues (log but allow)
 */

/**
 * Apply NASM business rules to the parsed workout plan.
 *
 * @param {z.infer<typeof WorkoutPlanOutputSchema>} plan - Zod-validated plan
 * @returns {RuleEngineResult}
 */
export function validateRules(plan) {
  const errors = [];
  const warnings = [];

  // Rule 1: Day count sanity
  if (plan.days.length > plan.durationWeeks * 7) {
    errors.push(`Too many days (${plan.days.length}) for ${plan.durationWeeks}-week plan (max ${plan.durationWeeks * 7})`);
  }

  // Rule 2: No duplicate day numbers
  const dayNumbers = plan.days.map(d => d.dayNumber);
  const uniqueDayNumbers = new Set(dayNumbers);
  if (uniqueDayNumbers.size !== dayNumbers.length) {
    errors.push('Duplicate day numbers detected');
  }

  // Rule 3: Exercise count per day (warn, don't reject)
  for (const day of plan.days) {
    if (day.exercises && day.exercises.length > 20) {
      warnings.push(`Day ${day.dayNumber} has ${day.exercises.length} exercises (recommended max: 20)`);
    }
  }

  // Rule 4: Rest period bounds (already enforced by Zod, but double-check)
  for (const day of plan.days) {
    for (const ex of (day.exercises || [])) {
      if (ex.restPeriod != null && (ex.restPeriod < 0 || ex.restPeriod > 600)) {
        warnings.push(`Exercise "${ex.name}" has out-of-bounds rest period: ${ex.restPeriod}s`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Full Validation Pipeline ─────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationPipelineResult
 * @property {boolean} ok
 * @property {'pii_leak' | 'parse_error' | 'validation_error' | null} failStage
 * @property {string|null} failReason
 * @property {z.infer<typeof WorkoutPlanOutputSchema>|null} data
 * @property {string[]} warnings
 */

/**
 * Run the full validation pipeline: PII detect → JSON parse + Zod → Rule engine.
 *
 * @param {string} rawText - Provider response text
 * @param {Object} [opts]
 * @param {string} [opts.userName] - For PII detection
 * @returns {ValidationPipelineResult}
 */
export function runValidationPipeline(rawText, opts = {}) {
  // Stage 1: PII detection (reject-on-detect)
  const piiResult = detectPii(rawText, opts);
  if (piiResult) {
    logger.error('[PII Leak] Provider output contains PII', {
      piiType: piiResult.piiType,
    });
    return {
      ok: false,
      failStage: 'pii_leak',
      failReason: `PII detected in provider output (${piiResult.piiType})`,
      data: null,
      warnings: [],
    };
  }

  // Stage 2: JSON parse + Zod schema
  const schemaResult = validateSchema(rawText);
  if (!schemaResult.ok) {
    return {
      ok: false,
      failStage: schemaResult.error.startsWith('JSON parse') ? 'parse_error' : 'validation_error',
      failReason: schemaResult.error,
      data: null,
      warnings: [],
    };
  }

  // Stage 3: Rule-engine validation
  const rulesResult = validateRules(schemaResult.data);
  if (!rulesResult.ok) {
    return {
      ok: false,
      failStage: 'validation_error',
      failReason: `Rule engine: ${rulesResult.errors.join('; ')}`,
      data: null,
      warnings: rulesResult.warnings,
    };
  }

  return {
    ok: true,
    failStage: null,
    failReason: null,
    data: schemaResult.data,
    warnings: rulesResult.warnings,
  };
}
