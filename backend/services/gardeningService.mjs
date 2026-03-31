/**
 * ============================================================================
 * FILE: gardeningService.mjs
 * PURPOSE: USDA Plant Hardiness Zone lookup + plant recommendations
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Looks up USDA hardiness zone by zip code via phzmapi.org,
 * returns zone-appropriate plant recommendations with growing season data.
 *
 * HOW IT FITS IN THE APP: Used by gardening routes for the GardeningTab UI.
 * KEY DECISIONS: phzmapi.org for zone lookup (free, no key). Plant data is
 * bundled statically — zero external dependency for recommendations.
 */
import logger from '../utils/logger.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Zone Lookup (phzmapi.org — free, no key)
// ─────────────────────────────────────────────────────────────

/**
 * Look up USDA Plant Hardiness Zone by zip code.
 * @param {string} zipCode - 5-digit US zip code
 * @returns {Object|null} { zone, temperature_range, coordinates }
 */
export async function getHardinessZone(zipCode) {
  try {
    const res = await fetch(`https://phzmapi.org/${zipCode}.json`);
    if (!res.ok) {
      logger.warn(`[Gardening] Zone lookup failed for zip ${zipCode}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return {
      zone: data.zone || null,
      temperatureRange: data.temperature_range || null,
      coordinates: data.coordinates || null,
    };
  } catch (err) {
    logger.error(`[Gardening] Zone lookup error: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Plant Database (bundled — no external API)
// ─────────────────────────────────────────────────────────────

/**
 * Static plant database with zone compatibility, growing info, and nutrition.
 * Each plant includes: zones it thrives in, space type, difficulty, days to
 * harvest, nutritional highlights, and container compatibility.
 */
const PLANT_DATABASE = [
  // ── Herbs (easy, container-friendly) ──
  {
    id: 'basil',
    name: 'Basil',
    category: 'herb',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 30,
    sunHours: 6,
    waterFrequency: 'daily',
    seasonStart: 'spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Rich in Vitamin K (56 mcg/cup), anti-inflammatory',
    yieldPerPlant: '~0.5 cups fresh leaves/week',
    companionPlants: ['tomatoes', 'peppers'],
    imageEmoji: '🌿',
  },
  {
    id: 'mint',
    name: 'Mint',
    category: 'herb',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 21,
    sunHours: 4,
    waterFrequency: 'daily',
    seasonStart: 'spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Aids digestion, contains menthol, iron, manganese',
    yieldPerPlant: '~1 cup fresh leaves/week',
    companionPlants: ['cabbage', 'tomatoes'],
    imageEmoji: '🍃',
  },
  {
    id: 'cilantro',
    name: 'Cilantro',
    category: 'herb',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 21,
    sunHours: 6,
    waterFrequency: 'regular',
    seasonStart: 'spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Vitamin A, K, C. Natural heavy metal chelator',
    yieldPerPlant: '~0.25 cups/week',
    companionPlants: ['tomatoes', 'spinach'],
    imageEmoji: '🌱',
  },
  {
    id: 'rosemary',
    name: 'Rosemary',
    category: 'herb',
    zones: ['6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 90,
    sunHours: 6,
    waterFrequency: 'weekly',
    seasonStart: 'spring',
    seasonEnd: 'year-round in zones 8+',
    nutritionHighlight: 'Antioxidants, carnosic acid, memory support',
    yieldPerPlant: 'Perennial — continuous harvest',
    companionPlants: ['sage', 'thyme'],
    imageEmoji: '🌲',
  },
  // ── Vegetables (moderate, high nutrition) ──
  {
    id: 'tomato',
    name: 'Tomatoes',
    category: 'vegetable',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
    difficulty: 'moderate',
    spaceType: ['balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 70,
    sunHours: 8,
    waterFrequency: 'daily',
    seasonStart: 'late spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Lycopene (antioxidant), Vitamin C, potassium',
    yieldPerPlant: '~10-15 lbs/season',
    companionPlants: ['basil', 'carrots'],
    imageEmoji: '🍅',
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    category: 'vegetable',
    zones: ['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 30,
    sunHours: 4,
    waterFrequency: 'daily',
    seasonStart: 'early spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Vitamin A, K, folate. Low calorie, high fiber',
    yieldPerPlant: '~1 head or continuous cut-and-come-again',
    companionPlants: ['carrots', 'radishes'],
    imageEmoji: '🥬',
  },
  {
    id: 'peppers',
    name: 'Bell Peppers',
    category: 'vegetable',
    zones: ['4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
    difficulty: 'moderate',
    spaceType: ['balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 75,
    sunHours: 8,
    waterFrequency: 'regular',
    seasonStart: 'late spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Vitamin C (169mg/pepper — 3x daily value!), Vitamin A',
    yieldPerPlant: '~5-10 peppers/season',
    companionPlants: ['tomatoes', 'basil'],
    imageEmoji: '🫑',
  },
  {
    id: 'spinach',
    name: 'Spinach',
    category: 'vegetable',
    zones: ['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 35,
    sunHours: 4,
    waterFrequency: 'regular',
    seasonStart: 'early spring',
    seasonEnd: 'late fall',
    nutritionHighlight: 'Iron, calcium, Vitamin K (145mcg/cup), folate',
    yieldPerPlant: '~3 cups leaves/season',
    companionPlants: ['strawberries', 'peas'],
    imageEmoji: '🥗',
  },
  {
    id: 'kale',
    name: 'Kale',
    category: 'vegetable',
    zones: ['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
    difficulty: 'easy',
    spaceType: ['balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 55,
    sunHours: 6,
    waterFrequency: 'regular',
    seasonStart: 'early spring',
    seasonEnd: 'winter (frost tolerant)',
    nutritionHighlight: 'Vitamin K (684mcg/cup), Vitamin A, C, calcium',
    yieldPerPlant: '~1 lb/season with continuous harvest',
    companionPlants: ['beets', 'celery'],
    imageEmoji: '🥬',
  },
  {
    id: 'carrots',
    name: 'Carrots',
    category: 'vegetable',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
    difficulty: 'moderate',
    spaceType: ['outdoor'],
    containerFriendly: true,
    daysToHarvest: 70,
    sunHours: 6,
    waterFrequency: 'regular',
    seasonStart: 'spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Beta-carotene (Vitamin A — 428mcg/carrot), fiber',
    yieldPerPlant: '~1 carrot per plant, sow many',
    companionPlants: ['lettuce', 'tomatoes'],
    imageEmoji: '🥕',
  },
  // ── Fruits (moderate-advanced) ──
  {
    id: 'strawberries',
    name: 'Strawberries',
    category: 'fruit',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
    difficulty: 'moderate',
    spaceType: ['balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 60,
    sunHours: 8,
    waterFrequency: 'daily',
    seasonStart: 'spring',
    seasonEnd: 'summer',
    nutritionHighlight: 'Vitamin C (97mg/cup), manganese, antioxidants',
    yieldPerPlant: '~1 pint/season',
    companionPlants: ['spinach', 'lettuce'],
    imageEmoji: '🍓',
  },
  {
    id: 'blueberries',
    name: 'Blueberries',
    category: 'fruit',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
    difficulty: 'moderate',
    spaceType: ['outdoor'],
    containerFriendly: true,
    daysToHarvest: 365,
    sunHours: 6,
    waterFrequency: 'regular',
    seasonStart: 'spring (plant)',
    seasonEnd: 'summer (harvest year 2+)',
    nutritionHighlight: 'Anthocyanins, Vitamin K, C, manganese. Top brain food.',
    yieldPerPlant: '~5-10 lbs/year (mature bush)',
    companionPlants: ['azaleas', 'rhododendrons'],
    imageEmoji: '🫐',
  },
  // ── Microgreens (fastest, indoor-perfect) ──
  {
    id: 'microgreens',
    name: 'Microgreens',
    category: 'microgreen',
    zones: ['1a','1b','2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b','12a','12b','13a','13b'],
    difficulty: 'easy',
    spaceType: ['indoor'],
    containerFriendly: true,
    daysToHarvest: 10,
    sunHours: 4,
    waterFrequency: 'daily',
    seasonStart: 'year-round',
    seasonEnd: 'year-round',
    nutritionHighlight: '4-40x more nutrients than mature plants. Vitamins C, E, K.',
    yieldPerPlant: '~2 oz per tray every 10 days',
    companionPlants: [],
    imageEmoji: '🌱',
  },
  {
    id: 'green-onions',
    name: 'Green Onions',
    category: 'vegetable',
    zones: ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b','11a','11b'],
    difficulty: 'easy',
    spaceType: ['indoor', 'balcony', 'outdoor'],
    containerFriendly: true,
    daysToHarvest: 21,
    sunHours: 6,
    waterFrequency: 'regular',
    seasonStart: 'spring',
    seasonEnd: 'fall',
    nutritionHighlight: 'Vitamin K, C, folate. Regrows from scraps!',
    yieldPerPlant: 'Continuous — cut and regrow',
    companionPlants: ['carrots', 'lettuce'],
    imageEmoji: '🧅',
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Plant Recommendations
// ─────────────────────────────────────────────────────────────

/**
 * Get plants recommended for a given hardiness zone.
 * @param {string} zone - USDA zone (e.g., '7b')
 * @param {Object} filters - Optional filters
 * @param {string} filters.spaceType - 'indoor' | 'balcony' | 'outdoor'
 * @param {string} filters.difficulty - 'easy' | 'moderate' | 'advanced'
 * @param {string} filters.category - 'herb' | 'vegetable' | 'fruit' | 'microgreen'
 * @returns {Object[]} Matching plants sorted by difficulty
 */
export function getPlantRecommendations(zone, filters = {}) {
  let plants = PLANT_DATABASE.filter(p => p.zones.includes(zone));

  if (filters.spaceType) {
    plants = plants.filter(p => p.spaceType.includes(filters.spaceType));
  }
  if (filters.difficulty) {
    plants = plants.filter(p => p.difficulty === filters.difficulty);
  }
  if (filters.category) {
    plants = plants.filter(p => p.category === filters.category);
  }

  // Sort: easy first, then by days to harvest
  const diffOrder = { easy: 0, moderate: 1, advanced: 2 };
  plants.sort((a, b) => (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0) || a.daysToHarvest - b.daysToHarvest);

  return plants;
}

/**
 * Get all available filter options.
 */
export function getFilterOptions() {
  return {
    categories: ['herb', 'vegetable', 'fruit', 'microgreen'],
    spaceTypes: ['indoor', 'balcony', 'outdoor'],
    difficulties: ['easy', 'moderate', 'advanced'],
  };
}

export default {
  getHardinessZone,
  getPlantRecommendations,
  getFilterOptions,
};
