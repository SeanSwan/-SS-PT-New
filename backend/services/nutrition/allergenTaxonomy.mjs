/**
 * ============================================================================
 * FILE: allergenTaxonomy.mjs
 * PURPOSE: Canonical allergen taxonomy + normalization (SWA-71 P0 foundation)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * WHY: allergy records were free text ("peanut"/"peanuts"/"tree nuts") that
 * could never match an ingredient check — a safety gate that cannot fire.
 * Canonical slugs make allergen matching deterministic. Slugs are stored
 * PLAINTEXT BY DESIGN: encrypting them would break the ingredient cross-check
 * that is the entire point of the taxonomy (documented privacy tradeoff —
 * free-text notes stay encrypted, the coded slug does not).
 *
 * Taxonomy = FDA major-9 + common clinical additions. `other` is the catch-all
 * for entries that cannot be coded; their free text is preserved (encrypted at
 * the model layer) so nothing is silently dropped.
 */

export const ALLERGENS = Object.freeze({
  peanut: 'Peanut',
  tree_nut: 'Tree nuts',
  milk: 'Milk / dairy',
  egg: 'Egg',
  wheat_gluten: 'Wheat / gluten',
  soy: 'Soy',
  fish: 'Fish',
  shellfish: 'Shellfish',
  sesame: 'Sesame',
  corn: 'Corn',
  sulfites: 'Sulfites',
  mustard: 'Mustard',
  celery: 'Celery',
  lupin: 'Lupin',
  latex_fruit: 'Latex-fruit (avocado/banana/kiwi)',
  nightshade: 'Nightshades',
  other: 'Other (uncoded)',
});

const SYNONYMS = {
  peanut: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis'],
  tree_nut: ['tree nut', 'tree nuts', 'treenut', 'treenuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'pecan', 'pecans', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts', 'macadamia', 'brazil nut', 'nuts'],
  milk: ['milk', 'dairy', 'lactose', 'casein', 'whey', 'cheese'],
  egg: ['egg', 'eggs', 'albumin', 'ovalbumin'],
  wheat_gluten: ['wheat', 'gluten', 'celiac', 'coeliac', 'barley', 'rye'],
  soy: ['soy', 'soya', 'soybean', 'soybeans', 'edamame', 'tofu'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'anchovies'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'crustacean', 'crustaceans', 'clam', 'clams', 'mussel', 'mussels', 'oyster', 'oysters', 'scallop', 'scallops'],
  sesame: ['sesame', 'tahini', 'sesame seed', 'sesame seeds'],
  corn: ['corn', 'maize'],
  sulfites: ['sulfite', 'sulfites', 'sulphite', 'sulphites'],
  mustard: ['mustard'],
  celery: ['celery', 'celeriac'],
  lupin: ['lupin', 'lupine'],
  latex_fruit: ['latex', 'avocado', 'banana', 'kiwi'],
  nightshade: ['nightshade', 'nightshades'],
};

const SYNONYM_INDEX = new Map();
for (const [slug, words] of Object.entries(SYNONYMS)) {
  for (const word of words) SYNONYM_INDEX.set(word, slug);
}

/**
 * Normalize a free-text allergy string to a canonical slug.
 * @returns {{ allergen: string, label: string, rawText: string|null }}
 *   rawText is preserved ONLY for 'other' (uncoded) entries.
 */
export function normalizeAllergen(input) {
  const raw = String(input ?? '').trim();
  const lowered = raw.toLowerCase().replace(/[.,;!]+$/g, '').trim();
  if (!lowered) return null;

  if (ALLERGENS[lowered]) {
    return { allergen: lowered, label: ALLERGENS[lowered], rawText: null };
  }
  const direct = SYNONYM_INDEX.get(lowered);
  if (direct) return { allergen: direct, label: ALLERGENS[direct], rawText: null };

  // Contains-match for compound phrases ("allergic to peanuts", "raw shellfish").
  // LONGEST synonym wins — otherwise "shellfish" would match its substring
  // "fish" first and misclassify (caught by dietaryIdentity.test.mjs).
  let best = null;
  for (const [word, slug] of SYNONYM_INDEX.entries()) {
    if (lowered.includes(word) && (!best || word.length > best.word.length)) {
      best = { word, slug };
    }
  }
  if (best) return { allergen: best.slug, label: ALLERGENS[best.slug], rawText: null };

  return { allergen: 'other', label: ALLERGENS.other, rawText: raw.slice(0, 120) };
}

/** Normalize a list, dropping empties and deduping by slug (keeps first 'other' texts distinct). */
export function normalizeAllergenList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const normalized = normalizeAllergen(item);
    if (!normalized) continue;
    const key = normalized.allergen === 'other' ? `other:${normalized.rawText}` : normalized.allergen;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out.slice(0, 40);
}

export default { ALLERGENS, normalizeAllergen, normalizeAllergenList };
