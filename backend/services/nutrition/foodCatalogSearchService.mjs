import logger from '../../utils/logger.mjs';
import { parsePlainDecimalNumber } from './numericInputValidation.mjs';

export const FOOD_LOOKUP_UNAVAILABLE = 'Food lookup is temporarily unavailable.';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 25;

const getUsdaKey = () => process.env.USDA_API_KEY || 'DEMO_KEY';

const safePageSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_PAGE_SIZE);
};

const titleCase = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .replace(/(?:^|\s|[-/,(])\S/g, (char) => char.toUpperCase());

const strictFoodMacro = (value) => {
  const parsed = parsePlainDecimalNumber(value);
  return parsed === null ? null : Math.round(parsed);
};

const servingLabel = (value, unit = 'g') => {
  const parsed = parsePlainDecimalNumber(value);
  return parsed === null || parsed <= 0 ? '100g' : `${parsed}${unit || 'g'}`;
};

const usdaNutrient = (nutrients = [], id) => {
  const nutrient = nutrients.find((item) => item?.nutrientNumber === id);
  return nutrient ? strictFoodMacro(nutrient.value) : null;
};

const mapUsdaFood = (item) => ({
  id: `usda-${item.fdcId}`,
  name: titleCase(item.description),
  brand: item.brandOwner || item.brandName || undefined,
  category: item.foodCategory || undefined,
  calories: usdaNutrient(item.foodNutrients, '208'),
  protein: usdaNutrient(item.foodNutrients, '203'),
  fat: usdaNutrient(item.foodNutrients, '204'),
  carbs: usdaNutrient(item.foodNutrients, '205'),
  servingSize: item.servingSize && item.servingSizeUnit
    ? servingLabel(item.servingSize, item.servingSizeUnit)
    : '100g',
  source: 'USDA',
});

const mapOpenFoodFactsProduct = (item) => {
  if (!item?._id || !item.product_name || !item.nutriments) return null;
  const nutrients = item.nutriments;
  return {
    id: `off-${item._id}`,
    name: titleCase(item.product_name),
    brand: item.brands || undefined,
    category: item.categories?.split(',')[0]?.trim() || undefined,
    calories: strictFoodMacro(nutrients['energy-kcal_100g']),
    protein: strictFoodMacro(nutrients.proteins_100g),
    fat: strictFoodMacro(nutrients.fat_100g),
    carbs: strictFoodMacro(nutrients.carbohydrates_100g),
    servingSize: servingLabel(item.serving_quantity),
    source: 'OFF',
  };
};

const deduplicateFoods = (items) => {
  const seen = new Map();
  for (const item of items) {
    if (!item?.id || !item.name) continue;
    const key = String(item.name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
};

const searchUsdaFoods = async (query, pageSize) => {
  const params = new URLSearchParams({
    api_key: getUsdaKey(),
    query,
    pageSize: String(pageSize),
  });
  const response = await fetch(`${USDA_BASE}/foods/search?${params}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`USDA food search failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return (Array.isArray(data.foods) ? data.foods : []).map(mapUsdaFood);
};

const searchOpenFoodFacts = async (query, pageSize) => {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
  });
  const response = await fetch(`${OFF_SEARCH_URL}?${params}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Open Food Facts search failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return (Array.isArray(data.products) ? data.products : [])
    .map(mapOpenFoodFactsProduct)
    .filter(Boolean);
};

export const searchFoodCatalog = async (query, requestedPageSize = DEFAULT_PAGE_SIZE) => {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return { ok: true, foods: [] };

  const pageSize = safePageSize(requestedPageSize);
  const results = await Promise.allSettled([
    searchUsdaFoods(cleanQuery, pageSize),
    searchOpenFoodFacts(cleanQuery, pageSize),
  ]);

  const foods = deduplicateFoods(results.flatMap((result) => (
    result.status === 'fulfilled' ? result.value : []
  )));

  for (const result of results) {
    if (result.status === 'rejected') logger.error('Food catalog provider error:', result.reason);
  }

  if (foods.length === 0 && results.every((result) => result.status === 'rejected')) {
    return { ok: false, error: FOOD_LOOKUP_UNAVAILABLE };
  }

  return { ok: true, foods };
};