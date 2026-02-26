/**
 * Long-Horizon Output Validator — Phase 5C-C
 * ============================================
 * Three-stage validation pipeline for AI long-horizon plan output:
 *   1. PII detection (reuses detectPii from outputValidator)
 *   2. Zod schema validation (mesocycle block structure)
 *   3. Rule-engine validation (NASM business rules for periodization)
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { z } from 'zod';
import { detectPii } from './outputValidator.mjs';
import logger from '../../utils/logger.mjs';

// ── Zod Schema ───────────────────────────────────────────────────────────────

const NASM_FRAMEWORKS = ['OPT', 'CES', 'GENERAL'];

const MesocycleBlockSchema = z.object({
  sequence: z.number().int().min(1),
  nasmFramework: z.enum(NASM_FRAMEWORKS),
  optPhase: z.number().int().min(1).max(5).nullable().optional().default(null),
  phaseName: z.string().min(1).max(100),
  focus: z.string().max(500).nullable().optional().default(null),
  durationWeeks: z.number().int().min(1).max(16),
  sessionsPerWeek: z.number().int().min(1).max(7).nullable().optional().default(null),
  entryCriteria: z.string().max(500).nullable().optional().default(null),
  exitCriteria: z.string().max(500).nullable().optional().default(null),
  notes: z.string().max(2000).nullable().optional().default(null),
}).passthrough();

export const LongHorizonPlanOutputSchema = z.object({
  planName: z.string().min(1).max(200),
  horizonMonths: z.number().int().refine(v => [3, 6, 12].includes(v), {
    message: 'horizonMonths must be 3, 6, or 12',
  }),
  summary: z.string().max(2000).optional().default(''),
  blocks: z.array(MesocycleBlockSchema).min(1).max(20),
}).passthrough();

/**
 * Parse and validate the AI response JSON against the long-horizon Zod schema.
 *
 * @param {string} rawText
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateLongHorizonSchema(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return { ok: false, error: `JSON parse error: ${err.message}` };
  }

  const result = LongHorizonPlanOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }

  return { ok: true, data: result.data };
}

// ── Rule-Engine Validation ───────────────────────────────────────────────────

/**
 * Apply NASM business rules to a parsed long-horizon plan.
 *
 * @param {object} plan - Zod-validated plan
 * @param {3|6|12} requestedHorizon - Horizon from the request
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateLongHorizonRules(plan, requestedHorizon) {
  const errors = [];
  const warnings = [];

  // Rule 1: horizonMonths must match request
  if (plan.horizonMonths !== requestedHorizon) {
    errors.push(`AI returned horizonMonths=${plan.horizonMonths} but request was ${requestedHorizon}`);
  }

  // Rule 2: Sequence numbers must be contiguous starting from 1
  const sequences = plan.blocks.map(b => b.sequence).sort((a, b) => a - b);
  for (let i = 0; i < sequences.length; i++) {
    if (sequences[i] !== i + 1) {
      errors.push(`Block sequence numbers must be contiguous starting from 1 (found gap at position ${i + 1})`);
      break;
    }
  }

  // Rule 3: No duplicate sequence numbers
  const uniqueSequences = new Set(sequences);
  if (uniqueSequences.size !== sequences.length) {
    errors.push('Duplicate block sequence numbers detected');
  }

  // Rule 4: Total weeks must not exceed horizon
  const maxWeeks = { 3: 13, 6: 26, 12: 52 };
  const totalWeeks = plan.blocks.reduce((sum, b) => sum + b.durationWeeks, 0);
  if (totalWeeks > (maxWeeks[requestedHorizon] || 52)) {
    errors.push(`Total block duration (${totalWeeks}w) exceeds ${requestedHorizon}-month horizon (max ${maxWeeks[requestedHorizon]}w)`);
  }

  // Rule 5: OPT framework requires optPhase; non-OPT must have null optPhase
  for (const block of plan.blocks) {
    if (block.nasmFramework === 'OPT' && (block.optPhase == null)) {
      errors.push(`Block ${block.sequence} (${block.phaseName}): OPT framework requires optPhase (1-5)`);
    }
    if (block.nasmFramework !== 'OPT' && block.optPhase != null) {
      errors.push(`Block ${block.sequence} (${block.phaseName}): optPhase must be null for ${block.nasmFramework} framework`);
    }
  }

  // Rule 6: Warn if total weeks is significantly less than horizon
  const minWeeks = { 3: 8, 6: 16, 12: 36 };
  if (totalWeeks < (minWeeks[requestedHorizon] || 8)) {
    warnings.push(`Total block duration (${totalWeeks}w) is short for a ${requestedHorizon}-month plan (expected ≥${minWeeks[requestedHorizon]}w)`);
  }

  // Rule 7: Warn on very long individual blocks
  for (const block of plan.blocks) {
    if (block.durationWeeks > 8) {
      warnings.push(`Block ${block.sequence} (${block.phaseName}): ${block.durationWeeks}w is longer than typical mesocycle (4-6w)`);
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
 * @typedef {Object} LongHorizonValidationResult
 * @property {boolean} ok
 * @property {'pii_leak' | 'parse_error' | 'validation_error' | null} failStage
 * @property {string|null} failReason
 * @property {object|null} data
 * @property {string[]} warnings
 */

/**
 * Run the full long-horizon validation pipeline:
 * PII detect → JSON parse + Zod → Rule engine.
 *
 * @param {string} rawText - Provider response text
 * @param {object} [opts]
 * @param {string} [opts.userName] - For PII detection
 * @param {3|6|12} [opts.requestedHorizon] - Horizon from request
 * @returns {LongHorizonValidationResult}
 */
export function runLongHorizonValidationPipeline(rawText, opts = {}) {
  // Stage 1: PII detection (reject-on-detect)
  const piiResult = detectPii(rawText, opts);
  if (piiResult) {
    logger.error('[PII Leak] Long-horizon plan output contains PII', {
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
  const schemaResult = validateLongHorizonSchema(rawText);
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
  const rulesResult = validateLongHorizonRules(
    schemaResult.data,
    opts.requestedHorizon || schemaResult.data.horizonMonths,
  );
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
