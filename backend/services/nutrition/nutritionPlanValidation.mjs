/**
 * Nutrition Plan Write Validation (S0.2, nutrition blueprint 2026-08-04)
 * =====================================================================
 * POST /api/nutrition/:userId previously passed 14 destructured body fields
 * straight into ClientNutritionPlan.create with no type, bound, or size checks:
 * a string in a DECIMAL column 500'd instead of 400'ing, and the four JSONB
 * fields accepted arbitrarily large, arbitrarily shaped payloads on a
 * PHI-adjacent table. This module owns the allowlist + bounds so the route
 * stays thin and the rules are testable in isolation.
 *
 * Shape contract is the real Plan Builder payload (NutritionPlanBuilder.logic.ts):
 * mealsJson is an ARRAY of { name, time, foods: [{ name, portion }] };
 * groceryListJson / dietaryRestrictions / allergies are string arrays;
 * gram fields arrive as Number(...) and may be NaN on bad input — NaN is a 400,
 * not a silent null.
 */

const GRAM_MAX = 9999.99;        // DECIMAL(6,2) ceiling
const CALORIES_MAX = 20000;
const NOTES_MAX = 10000;
const PLAN_NAME_MAX = 150;       // STRING(150) column
const STRING_LIST_ITEM_MAX = 300;
const GROCERY_MAX_ITEMS = 300;
const TAG_LIST_MAX_ITEMS = 50;
const MEALS_MAX = 50;
const MEAL_FOODS_MAX = 100;
const MEALS_JSON_MAX_BYTES = 32 * 1024;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const finiteInRange = (value, min, max) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function validateOptionalNumber(errors, out, field, value, max) {
  if (value === undefined || value === null || value === '') return;
  if (!finiteInRange(Number(value), 0, max) || typeof value === 'boolean') {
    errors.push(`${field} must be a number between 0 and ${max}`);
    return;
  }
  out[field] = Number(value);
}

function validateStringList(errors, out, field, value, { maxItems, itemMax }) {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.length > maxItems) {
    errors.push(`${field} must be an array of at most ${maxItems} items`);
    return;
  }
  const cleaned = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length > itemMax) {
      errors.push(`${field} items must be strings of at most ${itemMax} characters`);
      return;
    }
    const trimmed = item.trim();
    if (trimmed) cleaned.push(trimmed);
  }
  out[field] = cleaned;
}

function validateMealsJson(errors, out, value) {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.length > MEALS_MAX) {
    errors.push(`mealsJson must be an array of at most ${MEALS_MAX} meals`);
    return;
  }
  for (const meal of value) {
    if (!isPlainObject(meal)) {
      errors.push('mealsJson entries must be objects');
      return;
    }
    if (meal.name !== undefined && typeof meal.name !== 'string') {
      errors.push('mealsJson meal name must be a string');
      return;
    }
    if (meal.time !== undefined && typeof meal.time !== 'string') {
      errors.push('mealsJson meal time must be a string');
      return;
    }
    if (meal.foods !== undefined) {
      if (!Array.isArray(meal.foods) || meal.foods.length > MEAL_FOODS_MAX) {
        errors.push(`mealsJson meal foods must be an array of at most ${MEAL_FOODS_MAX} items`);
        return;
      }
      for (const food of meal.foods) {
        if (!isPlainObject(food) || (food.name !== undefined && typeof food.name !== 'string')) {
          errors.push('mealsJson food entries must be objects with string names');
          return;
        }
      }
    }
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > MEALS_JSON_MAX_BYTES) {
    errors.push('mealsJson exceeds the 32KB size limit');
    return;
  }
  out.mealsJson = value;
}

function validateDate(errors, out, field, value) {
  if (value === undefined || value === null || value === '') return;
  const parsed = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(parsed.getTime())) {
    errors.push(`${field} must be a valid date string`);
    return;
  }
  out[field] = parsed;
}

/**
 * Returns { ok: true, plan } with ONLY allowlisted, validated fields, or
 * { ok: false, errors } when any provided field is out of contract. Absent
 * optional fields are simply omitted so model defaults apply. Never copies
 * unknown keys — id/userId/createdBy/source/status/masterPromptVersion cannot
 * be set from a request body.
 */
export function validateNutritionPlanBody(body = {}) {
  const errors = [];
  const plan = {};

  if (body.planName !== undefined && body.planName !== null) {
    if (typeof body.planName !== 'string' || body.planName.length > PLAN_NAME_MAX) {
      errors.push(`planName must be a string of at most ${PLAN_NAME_MAX} characters`);
    } else if (body.planName.trim()) {
      plan.planName = body.planName.trim();
    }
  }

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string' || body.notes.length > NOTES_MAX) {
      errors.push(`notes must be a string of at most ${NOTES_MAX} characters`);
    } else {
      plan.notes = body.notes;
    }
  }

  validateOptionalNumber(errors, plan, 'dailyCalories', body.dailyCalories, CALORIES_MAX);
  validateOptionalNumber(errors, plan, 'proteinGrams', body.proteinGrams, GRAM_MAX);
  validateOptionalNumber(errors, plan, 'carbsGrams', body.carbsGrams, GRAM_MAX);
  validateOptionalNumber(errors, plan, 'fatGrams', body.fatGrams, GRAM_MAX);
  validateOptionalNumber(errors, plan, 'fiberGrams', body.fiberGrams, GRAM_MAX);
  validateOptionalNumber(errors, plan, 'hydrationTarget', body.hydrationTarget, GRAM_MAX);

  validateMealsJson(errors, plan, body.mealsJson);
  validateStringList(errors, plan, 'groceryListJson', body.groceryListJson, {
    maxItems: GROCERY_MAX_ITEMS,
    itemMax: STRING_LIST_ITEM_MAX,
  });
  validateStringList(errors, plan, 'dietaryRestrictions', body.dietaryRestrictions, {
    maxItems: TAG_LIST_MAX_ITEMS,
    itemMax: STRING_LIST_ITEM_MAX,
  });
  validateStringList(errors, plan, 'allergies', body.allergies, {
    maxItems: TAG_LIST_MAX_ITEMS,
    itemMax: STRING_LIST_ITEM_MAX,
  });

  validateDate(errors, plan, 'startDate', body.startDate);
  validateDate(errors, plan, 'endDate', body.endDate);
  if (plan.startDate && plan.endDate && plan.endDate < plan.startDate) {
    errors.push('endDate must not be before startDate');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, plan };
}

export default { validateNutritionPlanBody };
