/**
 * Long-Horizon Approval Validator — Phase 5C-D
 * ==============================================
 * Validates an already-parsed plan object at approval time.
 * Unlike the generation pipeline (which processes raw provider text),
 * this validates the plan object the coach may have edited.
 *
 * Stages:
 *   1. Shape check (non-null object)
 *   2. Horizon mismatch (body vs plan)
 *   2b. Pre-trim strings (catch whitespace-only before Zod)
 *   3. Zod schema re-validation
 *   4. Rule-engine re-validation (NASM business rules)
 *   5. Normalization (deep-clone, trim)
 *
 * Response format (frozen for 5C-E):
 *   { valid, errors: [{code, field?, message}], warnings: string[], normalizedPlan }
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { LongHorizonPlanOutputSchema, validateLongHorizonRules } from './longHorizonOutputValidator.mjs';

/**
 * Validate and normalize a long-horizon plan at approval time.
 *
 * @param {Object} params
 * @param {unknown} params.plan - The plan object (possibly edited by coach)
 * @param {3|6|12} params.requestedHorizon - horizonMonths from request body
 * @returns {{
 *   valid: boolean,
 *   errors: Array<{code: string, field?: string, message: string}>,
 *   warnings: string[],
 *   normalizedPlan: object|null
 * }}
 */
export function validateLongHorizonApproval({ plan, requestedHorizon }) {
  const errors = [];
  const warnings = [];

  // ── Stage 1: Shape check ─────────────────────────────────
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    errors.push({
      code: 'INVALID_DRAFT_PAYLOAD',
      message: 'Plan must be a non-null object',
    });
    return { valid: false, errors, warnings, normalizedPlan: null };
  }

  // ── Stage 2: Horizon mismatch ─────────────────────────────
  if (plan.horizonMonths !== requestedHorizon) {
    errors.push({
      code: 'HORIZON_MISMATCH',
      field: 'horizonMonths',
      message: `Request horizonMonths (${requestedHorizon}) does not match plan horizonMonths (${plan.horizonMonths})`,
    });
    return { valid: false, errors, warnings, normalizedPlan: null };
  }

  // ── Stage 2b: Pre-trim strings before Zod ────────────────
  // Whitespace-only strings like "  " pass Zod .min(1) but become ""
  // after normalization, violating Sequelize notEmpty. Trim first so
  // Zod catches them as validation errors (422) instead of DB errors (500).
  const preTrimmed = JSON.parse(JSON.stringify(plan));
  if (typeof preTrimmed.planName === 'string') {
    preTrimmed.planName = preTrimmed.planName.trim();
  }
  if (typeof preTrimmed.summary === 'string') {
    preTrimmed.summary = preTrimmed.summary.trim();
  }
  if (Array.isArray(preTrimmed.blocks)) {
    for (const block of preTrimmed.blocks) {
      if (typeof block.phaseName === 'string') block.phaseName = block.phaseName.trim();
      if (typeof block.focus === 'string') block.focus = block.focus.trim();
    }
  }

  // ── Stage 3: Zod schema re-validation ─────────────────────
  const zodResult = LongHorizonPlanOutputSchema.safeParse(preTrimmed);
  if (!zodResult.success) {
    const zodErrors = zodResult.error.issues.map(i => ({
      code: 'AI_VALIDATION_ERROR',
      field: i.path.join('.'),
      message: i.message,
    }));
    errors.push(...zodErrors);
    return { valid: false, errors, warnings, normalizedPlan: null };
  }

  const validatedPlan = zodResult.data;

  // ── Stage 4: Rule-engine re-validation ────────────────────
  const rulesResult = validateLongHorizonRules(validatedPlan, requestedHorizon);

  if (!rulesResult.ok) {
    for (const errMsg of rulesResult.errors) {
      // Classify sequence errors specifically
      if (errMsg.includes('sequence') || errMsg.includes('contiguous') || errMsg.includes('Duplicate block')) {
        errors.push({ code: 'INVALID_BLOCK_SEQUENCE', message: errMsg });
      } else {
        errors.push({ code: 'AI_VALIDATION_ERROR', message: errMsg });
      }
    }
    warnings.push(...rulesResult.warnings);
    return { valid: false, errors, warnings, normalizedPlan: null };
  }

  warnings.push(...rulesResult.warnings);

  // ── Stage 5: Normalize (deep-clone, trim strings) ─────────
  const normalizedPlan = JSON.parse(JSON.stringify(validatedPlan));
  if (typeof normalizedPlan.planName === 'string') {
    normalizedPlan.planName = normalizedPlan.planName.trim();
  }
  if (typeof normalizedPlan.summary === 'string') {
    normalizedPlan.summary = normalizedPlan.summary.trim();
  }
  for (const block of normalizedPlan.blocks) {
    if (typeof block.phaseName === 'string') {
      block.phaseName = block.phaseName.trim();
    }
    if (typeof block.focus === 'string') {
      block.focus = block.focus.trim();
    }
  }

  return { valid: true, errors: [], warnings, normalizedPlan };
}
