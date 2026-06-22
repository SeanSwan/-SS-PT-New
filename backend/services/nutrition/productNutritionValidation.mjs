import { parsePlainDecimalNumber } from './numericInputValidation.mjs';

const hasNutritionValue = (value) => value !== undefined && value !== null && value !== '';
const firstNutritionValue = (...values) => values.find(hasNutritionValue);

export const strictNutritionNumber = (...values) => {
  const raw = firstNutritionValue(...values);
  if (raw === undefined) return 0;
  return parsePlainDecimalNumber(raw);
};

export const scaledNutritionValueOrRaw = (multiplier, ...values) => {
  const raw = firstNutritionValue(...values);
  if (raw === undefined) return 0;

  const parsed = parsePlainDecimalNumber(raw);
  return parsed === null ? raw : parsed * multiplier;
};

const publicNutritionNumber = (value) => {
  const parsed = parsePlainDecimalNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
};

const publicNovaGroup = (value) => {
  const parsed = parsePlainDecimalNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null;
};

export const hasProductNutritionValue = hasNutritionValue;

export const publicMacroLog = (data) => ({
  ...data,
  calories: publicNutritionNumber(data.calories),
  protein: publicNutritionNumber(data.protein),
  carbs: publicNutritionNumber(data.carbs),
  fat: publicNutritionNumber(data.fat),
  fiber: publicNutritionNumber(data.fiber),
  sugar: publicNutritionNumber(data.sugar),
  sodium: publicNutritionNumber(data.sodium),
  addedSugar: publicNutritionNumber(data.addedSugar),
  cholesterol: publicNutritionNumber(data.cholesterol),
  saturatedFat: publicNutritionNumber(data.saturatedFat),
  transFat: publicNutritionNumber(data.transFat),
  novaGroup: publicNovaGroup(data.novaGroup),
});
