import type { FoodProduct, Ingredient, IngredientFlag, RatingTone } from './productAnalysis.types';

export const foodScannerRatingLabel = (rating: FoodProduct['overallRating'] | string): string => {
  if (rating === 'good') return 'Lower concern';
  if (rating === 'okay') return 'Review';
  if (rating === 'bad') return 'Higher concern';
  return 'Needs review';
};

export const ratingTone = (rating: string): RatingTone => {
  if (rating === 'good' || rating === 'bad') return rating;
  return 'okay';
};

export const sourceConfidenceForProduct = (product: FoodProduct) => {
  const provider = product.dataSource || 'Open Food Facts';
  if (/open food facts/i.test(provider)) {
    return {
      provider,
      confidence: 'community' as const,
      detail: 'Community provider data. Confirm against the package label when details matter.',
    };
  }
  if (/fatsecret/i.test(provider)) {
    return {
      provider,
      confidence: 'provider' as const,
      detail: 'Provider data. Review serving size and label values before logging.',
    };
  }
  return {
    provider,
    confidence: 'provider' as const,
    detail: 'Scanner data source. Use as a review aid, not an absolute verdict.',
  };
};

export const ingredientCounts = (ingredients: Ingredient[] | null | undefined) => {
  const list = ingredients || [];
  return {
    total: list.length,
    good: list.filter((item) => item.healthRating === 'good').length,
    okay: list.filter((item) => item.healthRating === 'okay').length,
    bad: list.filter((item) => item.healthRating === 'bad').length,
  };
};

export const ingredientFlags = (ingredient: Ingredient): IngredientFlag[] => {
  const flags: IngredientFlag[] = [];
  if (ingredient.iarcGroup) {
    flags.push({ label: `IARC category ${ingredient.iarcGroup}`, category: 'regulatory', evidence: 'Ingredient reference data', severity: ingredient.iarcGroup === '1' ? 'higher' : 'review' });
  }
  if (ingredient.isEUBanned) flags.push({ label: 'EU-banned additive signal', category: 'regulatory', evidence: 'Ingredient reference data', severity: 'higher' });
  if (ingredient.isProcessed) flags.push({ label: 'Processed ingredient signal', category: 'processing', evidence: 'Ingredient reference data' });
  if (ingredient.isGMO) flags.push({ label: 'Bioengineered/GMO disclosure preference', category: 'preference', evidence: 'Ingredient reference data' });
  (ingredient.allergens || []).forEach((allergen) => flags.push({ label: `${allergen} allergen signal`, category: 'allergen', evidence: 'Provider label data' }));
  return flags;
};

const plainNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const nutritionValue = (product: FoodProduct, ...keys: string[]): number | null => {
  const info = product.nutritionalInfo || {};
  for (const key of keys) {
    const value = plainNumber(info[key]);
    if (value !== null) return value;
  }
  return null;
};

export const productFlags = (product: FoodProduct): IngredientFlag[] => {
  const flags = (product.ingredients || []).flatMap((ingredient) =>
    ingredientFlags(ingredient).map((flag) => ({ ...flag, label: `${ingredient.name}: ${flag.label}` })),
  );
  const sugar = nutritionValue(product, 'sugars_100g', 'sugars', 'sugar');
  const sodium = nutritionValue(product, 'sodium_100g', 'sodium');
  const saturatedFat = nutritionValue(product, 'saturated-fat_100g', 'saturatedFat');
  if (sugar !== null && sugar > 12) flags.push({ label: 'Sugar value above Swan review threshold', category: 'nutrition threshold', evidence: 'Provider nutrition label' });
  if (sodium !== null && ((sodium > 0.8 && sodium < 100) || sodium > 800)) flags.push({ label: 'Sodium value above Swan review threshold', category: 'nutrition threshold', evidence: 'Provider nutrition label' });
  if (saturatedFat !== null && saturatedFat > 5) flags.push({ label: 'Saturated fat value above Swan review threshold', category: 'nutrition threshold', evidence: 'Provider nutrition label' });
  (product.healthConcerns || []).forEach((concern) => flags.push({ label: concern, category: 'estimate', evidence: 'Product analysis note' }));
  return flags.slice(0, 12);
};

export const nutritionRows = (product: FoodProduct) => {
  const rows = [
    ['Calories', nutritionValue(product, 'calories', 'energy-kcal_100g'), 'kcal'],
    ['Protein', nutritionValue(product, 'protein', 'proteins_100g', 'proteins'), 'g'],
    ['Carbohydrates', nutritionValue(product, 'carbohydrates', 'carbohydrates_100g', 'carbs'), 'g'],
    ['Fat', nutritionValue(product, 'fat', 'fat_100g'), 'g'],
    ['Saturated Fat', nutritionValue(product, 'saturatedFat', 'saturated-fat_100g'), 'g'],
    ['Sugars', nutritionValue(product, 'sugars', 'sugars_100g', 'sugar'), 'g'],
    ['Fiber', nutritionValue(product, 'fiber', 'fiber_100g'), 'g'],
    ['Sodium', nutritionValue(product, 'sodium', 'sodium_100g'), 'g'],
  ] as const;
  return rows.filter(([, value]) => value !== null).map(([label, value, unit]) => ({ label, value: `${value} ${unit}` }));
};

export const alternativeLabel = (alternative: string | { name?: string }) =>
  typeof alternative === 'string' ? alternative : alternative.name || 'Compare a similar product';
