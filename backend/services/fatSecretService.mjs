/**
 * ============================================================================
 * FILE: fatSecretService.mjs
 * PURPOSE: FatSecret Platform API integration for restaurant & food nutrition
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides food search and restaurant menu nutrition data
 * via the FatSecret Platform API (OAuth 2.0 client credentials).
 * Free tier: 5,000 calls/day.
 *
 * HOW IT FITS IN THE APP: Used by restaurant search routes and AI nutrition context.
 * KEY DECISIONS: OAuth 2.0 token caching (24h), response normalization to match
 * our DailyMacroLog schema fields.
 */
import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Configuration
// ─────────────────────────────────────────────────────────────
const FATSECRET_CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;
const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_BASE = 'https://platform.fatsecret.com/rest/server.api';

let cachedToken = null;
let tokenExpiry = 0;

// ─────────────────────────────────────────────────────────────
// SECTION: OAuth 2.0 Token Management
// ─────────────────────────────────────────────────────────────

/**
 * Check if FatSecret API is configured with credentials.
 */
export function isFatSecretConfigured() {
  return !!(FATSECRET_CLIENT_ID && FATSECRET_CLIENT_SECRET);
}

/**
 * Get OAuth 2.0 access token (cached, refreshes when expired).
 */
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic premier',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FatSecret token error: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh 5 min before actual expiry
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

// ─────────────────────────────────────────────────────────────
// SECTION: API Calls
// ─────────────────────────────────────────────────────────────

/**
 * Make authenticated API call to FatSecret.
 * @param {string} method - API method name (e.g., 'foods.search')
 * @param {Object} params - Additional query parameters
 * @returns {Object} JSON response
 */
async function apiCall(method, params = {}) {
  const token = await getAccessToken();

  const searchParams = new URLSearchParams({
    method,
    format: 'json',
    ...params,
  });

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FatSecret API error: ${res.status} ${text}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────
// SECTION: Public API Methods
// ─────────────────────────────────────────────────────────────

/**
 * Search for foods by name (includes restaurant items, brands, generic foods).
 * @param {string} query - Search term (e.g., "chipotle burrito bowl")
 * @param {number} page - Page number (0-based)
 * @param {number} maxResults - Results per page (max 50)
 * @returns {Object} { foods: [...], totalResults, page }
 */
export async function searchFoods(query, page = 0, maxResults = 20) {
  if (!isFatSecretConfigured()) {
    return { foods: [], totalResults: 0, page: 0, error: 'FatSecret API not configured' };
  }

  try {
    const data = await apiCall('foods.search', {
      search_expression: query,
      page_number: String(page),
      max_results: String(Math.min(maxResults, 50)),
    });

    const foodsContainer = data.foods;
    if (!foodsContainer || !foodsContainer.food) {
      return { foods: [], totalResults: 0, page };
    }

    const rawFoods = Array.isArray(foodsContainer.food) ? foodsContainer.food : [foodsContainer.food];
    const foods = rawFoods.map(normalizeFoodItem);

    return {
      foods,
      totalResults: parseInt(foodsContainer.total_results, 10) || 0,
      page,
    };
  } catch (err) {
    logger.error('[FatSecret] Search error:', err.message);
    return { foods: [], totalResults: 0, page, error: err.message };
  }
}

/**
 * Get detailed nutrition info for a specific food by ID.
 * @param {string} foodId - FatSecret food ID
 * @returns {Object|null} Detailed food item or null
 */
export async function getFoodDetails(foodId) {
  if (!isFatSecretConfigured()) return null;

  try {
    const data = await apiCall('food.get.v4', { food_id: String(foodId) });
    const food = data.food;
    if (!food) return null;

    return normalizeFoodDetail(food);
  } catch (err) {
    logger.error('[FatSecret] Detail error:', err.message);
    return null;
  }
}

/**
 * Search foods with autocomplete (fast, partial matching).
 * @param {string} query - Partial search term
 * @returns {string[]} Array of suggestion strings
 */
export async function autocomplete(query) {
  if (!isFatSecretConfigured()) return [];

  try {
    const data = await apiCall('foods.autocomplete', {
      expression: query,
      max_results: '10',
    });

    const suggestions = data.suggestions?.suggestion;
    if (!suggestions) return [];
    return Array.isArray(suggestions) ? suggestions : [suggestions];
  } catch (err) {
    logger.error('[FatSecret] Autocomplete error:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Response Normalization
// ─────────────────────────────────────────────────────────────

/**
 * Normalize a food search result item to our standard format.
 * FatSecret returns a text description like "Per 1 serving - Calories: 250kcal | Fat: 10g | Carbs: 30g | Protein: 15g"
 */
function normalizeFoodItem(raw) {
  const parsed = parseDescription(raw.food_description || '');

  return {
    id: raw.food_id,
    name: raw.food_name || 'Unknown',
    brand: raw.brand_name || null,
    type: raw.food_type || 'Generic', // 'Brand' or 'Generic'
    servingSize: parsed.servingSize || '1 serving',
    calories: parsed.calories || 0,
    protein: parsed.protein || 0,
    carbs: parsed.carbs || 0,
    fat: parsed.fat || 0,
    source: 'fatsecret',
    url: raw.food_url || null,
  };
}

/**
 * Normalize a detailed food item (from food.get.v4).
 */
function normalizeFoodDetail(raw) {
  const servings = raw.servings?.serving;
  if (!servings) return null;

  const servingList = Array.isArray(servings) ? servings : [servings];
  const primary = servingList[0];

  return {
    id: raw.food_id,
    name: raw.food_name || 'Unknown',
    brand: raw.brand_name || null,
    type: raw.food_type || 'Generic',
    servings: servingList.map(s => ({
      id: s.serving_id,
      description: s.serving_description || '1 serving',
      metricAmount: parseFloat(s.metric_serving_amount) || null,
      metricUnit: s.metric_serving_unit || null,
      calories: parseFloat(s.calories) || 0,
      protein: parseFloat(s.protein) || 0,
      carbs: parseFloat(s.carbohydrate) || 0,
      fat: parseFloat(s.fat) || 0,
      fiber: parseFloat(s.fiber) || 0,
      sugar: parseFloat(s.sugar) || 0,
      sodium: parseFloat(s.sodium) || 0,
      cholesterol: parseFloat(s.cholesterol) || 0,
      saturatedFat: parseFloat(s.saturated_fat) || 0,
      transFat: parseFloat(s.trans_fat) || 0,
      potassium: parseFloat(s.potassium) || 0,
    })),
    primaryServing: {
      description: primary.serving_description || '1 serving',
      calories: parseFloat(primary.calories) || 0,
      protein: parseFloat(primary.protein) || 0,
      carbs: parseFloat(primary.carbohydrate) || 0,
      fat: parseFloat(primary.fat) || 0,
      fiber: parseFloat(primary.fiber) || 0,
      sugar: parseFloat(primary.sugar) || 0,
      sodium: parseFloat(primary.sodium) || 0,
      cholesterol: parseFloat(primary.cholesterol) || 0,
      saturatedFat: parseFloat(primary.saturated_fat) || 0,
    },
    source: 'fatsecret',
    url: raw.food_url || null,
  };
}

/**
 * Parse FatSecret's text description string.
 * Format: "Per 1 cup - Calories: 250kcal | Fat: 10.00g | Carbs: 30.00g | Protein: 15.00g"
 */
function parseDescription(desc) {
  const result = {};

  // Extract serving size
  const servingMatch = desc.match(/^Per\s+(.+?)\s*-/);
  if (servingMatch) result.servingSize = servingMatch[1].trim();

  // Extract macros
  const calMatch = desc.match(/Calories:\s*([\d.]+)/);
  if (calMatch) result.calories = parseFloat(calMatch[1]);

  const fatMatch = desc.match(/Fat:\s*([\d.]+)/);
  if (fatMatch) result.fat = parseFloat(fatMatch[1]);

  const carbMatch = desc.match(/Carbs:\s*([\d.]+)/);
  if (carbMatch) result.carbs = parseFloat(carbMatch[1]);

  const proteinMatch = desc.match(/Protein:\s*([\d.]+)/);
  if (proteinMatch) result.protein = parseFloat(proteinMatch[1]);

  return result;
}

export default {
  isFatSecretConfigured,
  searchFoods,
  getFoodDetails,
  autocomplete,
};
