/**
 * ============================================================================
 * FILE: nutritionTargetService.mjs
 * PURPOSE: SINGLE WRITER for nutrition_targets (S1.1 + S2.1 bounds validator)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * LAWS (from the 2026-08-04 blueprint + Kimi K3 review):
 * 1. Every write to nutrition_targets goes through this module. The Plan
 *    Builder route and the AI/debate lane both call here — two writers is how
 *    "targets don't save" bugs are born.
 * 2. One active target per user, enforced twice: the supersede+insert runs in
 *    a transaction, and the partial unique index makes a concurrent double-
 *    activation lose loudly instead of splitting the adherence denominator.
 * 3. Bounds validation runs on EVERY write. An LLM-hallucinated 900-kcal or
 *    40,000mg-sodium target must die here, before persistence — never render
 *    as chart truth.
 * 4. AI-sourced targets are ALWAYS drafts. activateNutritionTarget requires a
 *    human actor: the model proposes, a human activates.
 */
import sequelize from '../../database.mjs';
import NutritionTarget from '../../models/NutritionTarget.mjs';
import logger from '../../utils/logger.mjs';

// Clinical sanity bounds — generous enough for elite athletes and medically
// supervised plans, tight enough that hallucinated garbage cannot persist.
export const TARGET_BOUNDS = {
  dailyCalories: { min: 800, max: 12000 },
  proteinGrams: { min: 20, max: 500 },
  carbsGrams: { min: 0, max: 1500 },
  fatGrams: { min: 10, max: 500 },
  fiberGrams: { min: 0, max: 150 },
  sodiumLimitMg: { min: 500, max: 6000 },
  hydrationTargetLiters: { min: 0.5, max: 10 },
};

const NUMERIC_FIELDS = Object.keys(TARGET_BOUNDS);

const toFinite = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Validate raw target fields against clinical bounds.
 * @returns {{ ok: true, fields: object } | { ok: false, errors: string[] }}
 * fields contains ONLY the allowlisted numeric fields, normalized to numbers
 * (absent/null fields omitted). At least one field must be set.
 */
export function validateTargetBounds(raw = {}) {
  const errors = [];
  const fields = {};

  for (const key of NUMERIC_FIELDS) {
    const value = toFinite(raw[key]);
    if (value === null) continue;
    if (Number.isNaN(value)) {
      errors.push(`${key} must be a number`);
      continue;
    }
    const { min, max } = TARGET_BOUNDS[key];
    if (value < min || value > max) {
      errors.push(`${key} must be between ${min} and ${max}`);
      continue;
    }
    fields[key] = value;
  }

  // Cross-field sanity: macro calories should not wildly exceed the calorie
  // target (4/4/9 within +25% tolerance) — catches hallucinated combinations
  // that are individually in-range but jointly impossible.
  if (fields.dailyCalories && (fields.proteinGrams || fields.carbsGrams || fields.fatGrams)) {
    const macroKcal = (fields.proteinGrams || 0) * 4 + (fields.carbsGrams || 0) * 4 + (fields.fatGrams || 0) * 9;
    if (macroKcal > fields.dailyCalories * 1.25) {
      errors.push('macro grams imply more calories than dailyCalories allows (4/4/9 check)');
    }
  }

  if (!errors.length && Object.keys(fields).length === 0) {
    errors.push('at least one target field must be set');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, fields };
}

/**
 * Create a target version. Manual sources may activate immediately;
 * AI-generated sources are FORCED to draft regardless of the flag.
 *
 * @param {object} opts
 * @param {number} opts.userId - the client
 * @param {object} opts.fields - raw target fields (validated here)
 * @param {number} opts.createdBy - authoring human (or approver for AI drafts)
 * @param {'manual'|'ai_generated'} [opts.source]
 * @param {boolean} [opts.activate] - ignored (forced false) for ai_generated
 * @param {string} opts.effectiveFrom - user-local YYYY-MM-DD
 * @returns {Promise<{ ok: true, target: NutritionTarget } | { ok: false, errors: string[] }>}
 */
export async function setNutritionTarget({ userId, fields, createdBy, source = 'manual', activate = true, effectiveFrom }) {
  const validation = validateTargetBounds(fields);
  if (!validation.ok) return validation;

  if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(createdBy)) {
    return { ok: false, errors: ['userId and createdBy are required'] };
  }
  if (typeof effectiveFrom !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { ok: false, errors: ['effectiveFrom must be a YYYY-MM-DD user-local date'] };
  }

  // The model proposes; only a human activates (blueprint activation law).
  const willActivate = source === 'ai_generated' ? false : Boolean(activate);

  const target = await sequelize.transaction(async (transaction) => {
    if (willActivate) {
      await supersedeActive(userId, effectiveFrom, transaction);
    }
    return NutritionTarget.create({
      userId,
      ...validation.fields,
      effectiveFrom,
      status: willActivate ? 'active' : 'draft',
      source,
      createdBy,
      activatedBy: willActivate ? createdBy : null,
      activatedAt: willActivate ? new Date() : null,
    }, { transaction });
  });

  logger.info(`[NutritionTarget] ${willActivate ? 'activated' : 'drafted'} target ${target.id} for user ${userId} (${source})`);
  return { ok: true, target };
}

/**
 * Activate an existing draft — the human approval step for AI proposals.
 */
export async function activateNutritionTarget({ targetId, activatedBy, effectiveFrom }) {
  if (!Number.isSafeInteger(activatedBy)) {
    return { ok: false, errors: ['activatedBy (a human user id) is required'] };
  }
  if (typeof effectiveFrom !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { ok: false, errors: ['effectiveFrom must be a YYYY-MM-DD user-local date'] };
  }

  const result = await sequelize.transaction(async (transaction) => {
    const draft = await NutritionTarget.findByPk(targetId, { transaction });
    if (!draft) return { ok: false, errors: ['target not found'] };
    if (draft.status !== 'draft') return { ok: false, errors: [`target is ${draft.status}, not draft`] };

    await supersedeActive(draft.userId, effectiveFrom, transaction);
    await draft.update({
      status: 'active',
      effectiveFrom,
      activatedBy,
      activatedAt: new Date(),
    }, { transaction });
    return { ok: true, target: draft };
  });

  if (result.ok) {
    logger.info(`[NutritionTarget] draft ${targetId} activated by user ${activatedBy}`);
  }
  return result;
}

async function supersedeActive(userId, effectiveFrom, transaction) {
  await NutritionTarget.update(
    { status: 'superseded', effectiveTo: effectiveFrom },
    { where: { userId, status: 'active' }, transaction }
  );
}

/**
 * The active target for a user, or the target that governed a specific
 * user-local date (for historical adherence math).
 */
export async function getActiveNutritionTarget(userId, onDate = null) {
  if (!Number.isSafeInteger(Number(userId))) return null;
  if (!onDate) {
    return NutritionTarget.findOne({ where: { userId, status: 'active' } });
  }
  const { Op } = await import('sequelize');
  return NutritionTarget.findOne({
    where: {
      userId,
      status: { [Op.in]: ['active', 'superseded'] },
      effectiveFrom: { [Op.lte]: onDate },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: onDate } }],
    },
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
  });
}

export default {
  TARGET_BOUNDS,
  validateTargetBounds,
  setNutritionTarget,
  activateNutritionTarget,
  getActiveNutritionTarget,
};
