// ============================================================================
// freeApiService.mjs - Free API Integrations
// USDA FoodData Central, Open Food Facts, CalorieNinjas, ExerciseDB, ZenQuotes,
// Open-Meteo
// ============================================================================

import logger from '../utils/logger.mjs';

const FREE_API_UNAVAILABLE = 'Nutrition intelligence is temporarily unavailable.';
const FOOD_LOOKUP_UNAVAILABLE = 'Food lookup is temporarily unavailable.';
const EXERCISE_LOOKUP_UNAVAILABLE = 'Exercise lookup is temporarily unavailable.';
const MOTIVATION_UNAVAILABLE = 'Motivation feed is temporarily unavailable.';
const WEATHER_UNAVAILABLE = 'Weather lookup is temporarily unavailable.';

const freeApiFailure = (error = FREE_API_UNAVAILABLE) => ({ ok: false, error });

// ---------------------------------------------------------------------------
// 1. USDA FoodData Central + Open Food Facts proxy
// ---------------------------------------------------------------------------

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const OPEN_FOOD_FACTS_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';
const getUsdaKey = () => process.env.USDA_API_KEY || 'DEMO_KEY';

const safeInteger = (value) => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
};

const servingNumber = (value) => {
  const parsed = safeInteger(value);
  return parsed === null || parsed <= 0 ? null : parsed;
};

const servingLabel = (value, unit = 'g') => {
  const parsed = servingNumber(value);
  return parsed === null ? '100g' : `${parsed}${unit || 'g'}`;
};

const titleCase = (value = '') => String(value)
  .toLowerCase()
  .replace(/(?:^|\s|[-/,(])\S/g, (char) => char.toUpperCase());

const usdaNutrient = (nutrients = [], number) => {
  const item = nutrients.find((nutrient) => String(nutrient?.nutrientNumber) === number);
  return safeInteger(item?.value);
};

const normalizedFood = ({ id, name, brand, category, calories, protein, carbs, fat, servingSize, servingSizeGrams, source }) => ({
  id,
  name,
  description: name,
  brand: brand || undefined,
  category: category || undefined,
  calories,
  protein,
  carbs,
  fat,
  protein_g: protein,
  carbohydrates_total_g: carbs,
  fat_total_g: fat,
  servingSize,
  serving_size_g: servingSizeGrams,
  source,
});

const mapUsdaFood = (item) => {
  const servingSizeGrams = servingNumber(item?.servingSize);
  return normalizedFood({
    id: `usda-${item.fdcId}`,
    name: titleCase(item.description || 'USDA Food'),
    brand: item.brandOwner || item.brandName || undefined,
    category: item.foodCategory || undefined,
    calories: usdaNutrient(item.foodNutrients, '208'),
    protein: usdaNutrient(item.foodNutrients, '203'),
    fat: usdaNutrient(item.foodNutrients, '204'),
    carbs: usdaNutrient(item.foodNutrients, '205'),
    servingSize: item.servingSize && item.servingSizeUnit
      ? servingLabel(item.servingSize, item.servingSizeUnit)
      : '100g',
    servingSizeGrams,
    source: 'USDA',
  });
};

const mapOpenFoodFactsProduct = (item) => {
  if (!item?._id || !item.product_name || !item.nutriments) return null;
  const nutrients = item.nutriments;
  const servingSizeGrams = servingNumber(item.serving_quantity);
  return normalizedFood({
    id: `off-${item._id}`,
    name: titleCase(item.product_name),
    brand: item.brands || undefined,
    category: item.categories?.split(',')[0]?.trim() || undefined,
    calories: safeInteger(nutrients['energy-kcal_100g'] ?? nutrients['energy-kcal'] ?? nutrients.calories),
    protein: safeInteger(nutrients.proteins_100g ?? nutrients.proteins ?? nutrients.protein),
    fat: safeInteger(nutrients.fat_100g ?? nutrients.fat),
    carbs: safeInteger(nutrients.carbohydrates_100g ?? nutrients.carbohydrates ?? nutrients.carbs),
    servingSize: servingLabel(item.serving_quantity),
    servingSizeGrams,
    source: 'OFF',
  });
};

const deduplicateFoods = (foods) => {
  const seen = new Map();
  for (const food of foods) {
    const key = String(food.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 42);
    if (key && !seen.has(key)) seen.set(key, food);
  }
  return Array.from(seen.values());
};

const fetchUsdaFoodResults = async (query, pageSize) => {
  const params = new URLSearchParams({ api_key: getUsdaKey(), query, pageSize: String(pageSize) });
  const res = await fetch(`${USDA_BASE}/foods/search?${params}`);
  if (!res.ok) {
    const text = await res.text();
    logger.error(`USDA searchFoods failed (${res.status}): ${text}`);
    throw new Error('USDA food search failed');
  }
  const data = await res.json();
  return (Array.isArray(data.foods) ? data.foods : []).map(mapUsdaFood);
};

const fetchOpenFoodFactsResults = async (query, pageSize) => {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
  });
  const res = await fetch(`${OPEN_FOOD_FACTS_BASE}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    logger.error(`Open Food Facts search failed (${res.status}): ${text}`);
    throw new Error('Open Food Facts search failed');
  }
  const data = await res.json();
  return (Array.isArray(data.products) ? data.products : [])
    .map(mapOpenFoodFactsProduct)
    .filter(Boolean);
};

/**
 * Search foods through backend-owned provider calls. The browser never receives
 * provider URLs, API keys, or raw provider exception strings.
 */
export async function searchFoods(query, pageSize = 10) {
  const safeQuery = String(query || '').trim();
  const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 25);
  if (!safeQuery) return { ok: true, data: { foods: [], providers: [] } };

  try {
    const results = await Promise.allSettled([
      fetchUsdaFoodResults(safeQuery, safePageSize),
      fetchOpenFoodFactsResults(safeQuery, safePageSize),
    ]);
    const foods = deduplicateFoods(results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])));
    const providers = [
      results[0].status === 'fulfilled' ? 'USDA' : null,
      results[1].status === 'fulfilled' ? 'OFF' : null,
    ].filter(Boolean);

    if (foods.length === 0 && results.every((result) => result.status === 'rejected')) {
      return freeApiFailure(FOOD_LOOKUP_UNAVAILABLE);
    }
    return { ok: true, data: { foods, providers } };
  } catch (err) {
    logger.error('Food search proxy error:', err);
    return freeApiFailure(FOOD_LOOKUP_UNAVAILABLE);
  }
}

/**
 * Get detailed nutrient info for a specific USDA food.
 * @param {string|number} fdcId - FDC ID of the food
 */
export async function getFoodDetails(fdcId) {
  try {
    const params = new URLSearchParams({ api_key: getUsdaKey() });
    const res = await fetch(`${USDA_BASE}/food/${fdcId}?${params}`);
    if (!res.ok) {
      const text = await res.text();
      logger.error(`USDA getFoodDetails failed (${res.status}): ${text}`);
      return freeApiFailure(FOOD_LOOKUP_UNAVAILABLE);
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('USDA getFoodDetails error:', err);
    return freeApiFailure(FOOD_LOOKUP_UNAVAILABLE);
  }
}

// ---------------------------------------------------------------------------
// 2. CalorieNinjas
//    https://api.calorieninjas.com/v1/nutrition
// ---------------------------------------------------------------------------

const CALORIE_NINJAS_BASE = 'https://api.calorieninjas.com/v1/nutrition';

/**
 * Natural-language nutrition lookup via CalorieNinjas.
 * @param {string} query - e.g. "2 eggs and toast"
 */
export async function getNutrition(query) {
  try {
    const apiKey = process.env.CALORIE_NINJAS_KEY;
    if (!apiKey) {
      logger.error('CalorieNinjas: CALORIE_NINJAS_KEY not set');
      return freeApiFailure();
    }
    const params = new URLSearchParams({ query });
    const res = await fetch(`${CALORIE_NINJAS_BASE}?${params}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error(`CalorieNinjas failed (${res.status}): ${text}`);
      return freeApiFailure();
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('CalorieNinjas error:', err);
    return freeApiFailure();
  }
}

// ---------------------------------------------------------------------------
// 3. ExerciseDB (via API-Ninjas)
//    https://api.api-ninjas.com/v1/exercises
// ---------------------------------------------------------------------------

const EXERCISES_BASE = 'https://api.api-ninjas.com/v1/exercises';

/**
 * Search exercises by name, muscle group, or type.
 * @param {object} opts
 * @param {string} [opts.name] - Exercise name filter
 * @param {string} [opts.muscle] - Target muscle (e.g. "biceps")
 * @param {string} [opts.type] - Exercise type (e.g. "strength")
 */
export async function searchExercises({ name, muscle, type } = {}) {
  try {
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
      logger.error('ExerciseDB: API_NINJAS_KEY not set');
      return freeApiFailure(EXERCISE_LOOKUP_UNAVAILABLE);
    }
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (muscle) params.set('muscle', muscle);
    if (type) params.set('type', type);

    const res = await fetch(`${EXERCISES_BASE}?${params}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error(`ExerciseDB failed (${res.status}): ${text}`);
      return freeApiFailure(EXERCISE_LOOKUP_UNAVAILABLE);
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('ExerciseDB error:', err);
    return freeApiFailure(EXERCISE_LOOKUP_UNAVAILABLE);
  }
}

// ---------------------------------------------------------------------------
// 4. ZenQuotes
//    https://zenquotes.io/api/random
// ---------------------------------------------------------------------------

/**
 * Get a random motivational quote from ZenQuotes.
 */
export async function getMotivationalQuote() {
  try {
    const res = await fetch('https://zenquotes.io/api/random');
    if (!res.ok) {
      const text = await res.text();
      logger.error(`ZenQuotes failed (${res.status}): ${text}`);
      return freeApiFailure(MOTIVATION_UNAVAILABLE);
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('ZenQuotes error:', err);
    return freeApiFailure(MOTIVATION_UNAVAILABLE);
  }
}

// ---------------------------------------------------------------------------
// 5. Open-Meteo Weather
//    https://api.open-meteo.com/v1/forecast
// ---------------------------------------------------------------------------

/**
 * Get current weather for a given location (for outdoor workout recs).
 * @param {number} latitude
 * @param {number} longitude
 */
export async function getWeather(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current_weather: 'true',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) {
      const text = await res.text();
      logger.error(`Open-Meteo failed (${res.status}): ${text}`);
      return freeApiFailure(WEATHER_UNAVAILABLE);
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('Open-Meteo error:', err);
    return freeApiFailure(WEATHER_UNAVAILABLE);
  }
}
