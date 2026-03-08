// ============================================================================
// freeApiService.mjs — Free API Integrations
// USDA FoodData Central, CalorieNinjas, ExerciseDB, ZenQuotes, Open-Meteo
// ============================================================================

import logger from '../utils/logger.mjs';

// ---------------------------------------------------------------------------
// 1. USDA FoodData Central
//    https://api.nal.usda.gov/fdc/v1/
// ---------------------------------------------------------------------------

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const getUsdaKey = () => process.env.USDA_API_KEY || 'DEMO_KEY';

/**
 * Search foods via USDA FoodData Central.
 * @param {string} query - Search term (e.g. "chicken breast")
 * @param {number} pageSize - Results per page (default 10)
 */
export async function searchFoods(query, pageSize = 10) {
  try {
    const params = new URLSearchParams({
      api_key: getUsdaKey(),
      query,
      pageSize: String(pageSize),
    });
    const res = await fetch(`${USDA_BASE}/foods/search?${params}`);
    if (!res.ok) {
      const text = await res.text();
      logger.error(`USDA searchFoods failed (${res.status}): ${text}`);
      return { ok: false, error: `USDA API returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('USDA searchFoods error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Get detailed nutrient info for a specific food.
 * @param {string|number} fdcId - FDC ID of the food
 */
export async function getFoodDetails(fdcId) {
  try {
    const params = new URLSearchParams({ api_key: getUsdaKey() });
    const res = await fetch(`${USDA_BASE}/food/${fdcId}?${params}`);
    if (!res.ok) {
      const text = await res.text();
      logger.error(`USDA getFoodDetails failed (${res.status}): ${text}`);
      return { ok: false, error: `USDA API returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('USDA getFoodDetails error:', err);
    return { ok: false, error: err.message };
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
      return { ok: false, error: 'CALORIE_NINJAS_KEY not configured' };
    }
    const params = new URLSearchParams({ query });
    const res = await fetch(`${CALORIE_NINJAS_BASE}?${params}`, {
      headers: { 'X-Api-Key': apiKey },
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error(`CalorieNinjas failed (${res.status}): ${text}`);
      return { ok: false, error: `CalorieNinjas API returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('CalorieNinjas error:', err);
    return { ok: false, error: err.message };
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
      return { ok: false, error: 'API_NINJAS_KEY not configured' };
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
      return { ok: false, error: `ExerciseDB API returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('ExerciseDB error:', err);
    return { ok: false, error: err.message };
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
      return { ok: false, error: `ZenQuotes API returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('ZenQuotes error:', err);
    return { ok: false, error: err.message };
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
      return { ok: false, error: `Open-Meteo API returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    logger.error('Open-Meteo error:', err);
    return { ok: false, error: err.message };
  }
}
