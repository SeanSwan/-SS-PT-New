/**
 * Nutrition calorie reconciliation.
 * Compares reported calories with the Atwater 4-4-9 estimate while allowing
 * normal label rounding. Inputs are intentionally strict to prevent numeric
 * coercion from turning malformed provider data into trusted nutrition data.
 */

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const roundOne = (value) => Math.round(value * 10) / 10;

const strictNonNegativeNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const calculateAtwaterCalories = ({ protein, carbs, fat } = {}) => {
  const safeProtein = strictNonNegativeNumber(protein);
  const safeCarbs = strictNonNegativeNumber(carbs);
  const safeFat = strictNonNegativeNumber(fat);
  if (safeProtein === null || safeCarbs === null || safeFat === null) return null;
  return roundOne((safeProtein * 4) + (safeCarbs * 4) + (safeFat * 9));
};

export const reconcileNutritionCalories = (nutrients = {}) => {
  const reportedCalories = strictNonNegativeNumber(nutrients.calories);
  const calculatedCalories = calculateAtwaterCalories(nutrients);

  if (calculatedCalories === null) {
    return {
      reportedCalories,
      calculatedCalories: null,
      differenceCalories: null,
      differencePercent: null,
      status: 'not_applicable',
    };
  }

  if (reportedCalories === null) {
    return {
      reportedCalories: null,
      calculatedCalories,
      differenceCalories: null,
      differencePercent: null,
      status: 'calculated_only',
    };
  }

  const differenceCalories = roundOne(Math.abs(reportedCalories - calculatedCalories));
  const differencePercent = reportedCalories === 0
    ? (differenceCalories === 0 ? 0 : 100)
    : roundOne((differenceCalories / reportedCalories) * 100);
  const labelTolerance = Math.max(20, reportedCalories * 0.1);

  return {
    reportedCalories,
    calculatedCalories,
    differenceCalories,
    differencePercent,
    status: differenceCalories <= labelTolerance
      ? 'within_tolerance'
      : 'metabolic_deviation',
  };
};
