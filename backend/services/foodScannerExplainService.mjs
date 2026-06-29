import { strictNutritionNumber } from './nutrition/productNutritionValidation.mjs';

const MAX_TEXT = 220;
const MAX_LIST = 8;
const SOURCE_COPY = {
  'Open Food Facts': {
    confidence: 'community',
    detail: 'Open Food Facts data is community-submitted and may be incomplete.',
  },
  FatSecret: {
    confidence: 'provider',
    detail: 'FatSecret provider data should be reviewed against the product label.',
  },
  local: {
    confidence: 'verified',
    detail: 'Swan local product data has been saved for repeat scanner use.',
  },
};

const safeText = (value, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, MAX_TEXT);
};

const safeArray = (value) => (Array.isArray(value) ? value.filter(Boolean).slice(0, MAX_LIST) : []);

const asProduct = (product = {}) => ({
  id: product.id ?? null,
  barcode: safeText(product.barcode),
  name: safeText(product.name, 'Unknown product'),
  brand: safeText(product.brand),
  dataSource: safeText(product.dataSource || product.source || 'Open Food Facts'),
  lastVerified: safeText(product.lastVerified),
  ingredientsList: safeText(product.ingredientsList),
  ingredients: safeArray(product.ingredients),
  nutritionalInfo: product.nutritionalInfo && typeof product.nutritionalInfo === 'object' ? product.nutritionalInfo : {},
  overallRating: ['good', 'okay', 'bad'].includes(product.overallRating) ? product.overallRating : 'okay',
  healthConcerns: safeArray(product.healthConcerns).map((item) => safeText(item)),
  ratingReasons: safeArray(product.ratingReasons).map((item) => safeText(item)),
  healthierAlternatives: safeArray(product.healthierAlternatives).map((item) => safeText(typeof item === 'string' ? item : item?.name)),
  isOrganic: Boolean(product.isOrganic),
  isNonGMO: Boolean(product.isNonGMO),
});

const sourceConfidence = (product) => {
  const matched = SOURCE_COPY[product.dataSource] || SOURCE_COPY[product.dataSource?.split(' ')[0]];
  if (matched) return { provider: product.dataSource, ...matched };
  return {
    provider: product.dataSource || 'provider',
    confidence: 'provider',
    detail: 'Provider nutrition and ingredient data should be reviewed against the package label.',
  };
};

const flag = (label, category, evidence, severity = 'review') => ({
  label: safeText(label),
  category,
  evidence: safeText(evidence),
  severity,
});

const ingredientName = (ingredient) => safeText(ingredient?.name, 'Ingredient');

export const buildProductFlags = (rawProduct = {}) => {
  const product = asProduct(rawProduct);
  const flags = [];

  product.ingredients.forEach((ingredient) => {
    const name = ingredientName(ingredient);
    if (ingredient.iarcGroup) {
      flags.push(flag(`${name}: IARC category ${safeText(ingredient.iarcGroup)}`, 'regulatory', 'Ingredient reference data', ingredient.iarcGroup === '1' ? 'higher' : 'review'));
    }
    if (ingredient.isEUBanned) {
      flags.push(flag(`${name}: EU-banned additive signal`, 'regulatory', 'Ingredient reference data', 'higher'));
    }
    if (ingredient.isProcessed) {
      flags.push(flag(`${name}: processed ingredient signal`, 'processing', 'Ingredient reference data'));
    }
    if (ingredient.isGMO) {
      flags.push(flag(`${name}: bioengineered/GMO disclosure preference`, 'preference', 'Ingredient reference data'));
    }
    safeArray(ingredient.healthConcerns).forEach((concern) => {
      flags.push(flag(`${name}: ${safeText(concern)}`, 'estimate', 'Ingredient reference note'));
    });
  });

  const nutri = product.nutritionalInfo;
  const sugar = strictNutritionNumber(nutri.sugars_100g, nutri.sugars, nutri.sugar);
  const sodium = strictNutritionNumber(nutri.sodium_100g, nutri.sodium);
  const saturatedFat = strictNutritionNumber(nutri['saturated-fat_100g'], nutri.saturatedFat);
  if (sugar !== null && sugar > 12) flags.push(flag('Sugar value above Swan review threshold', 'nutrition threshold', 'Provider nutrition label'));
  if (sodium !== null && ((sodium > 0.8 && sodium < 100) || sodium > 800)) flags.push(flag('Sodium value above Swan review threshold', 'nutrition threshold', 'Provider nutrition label'));
  if (saturatedFat !== null && saturatedFat > 5) flags.push(flag('Saturated fat value above Swan review threshold', 'nutrition threshold', 'Provider nutrition label'));
  product.healthConcerns.forEach((concern) => flags.push(flag(concern, 'estimate', 'Product analysis note')));

  return flags.slice(0, 12);
};

export const buildProductExplanation = (rawProduct = {}) => {
  const product = asProduct(rawProduct);
  const flags = buildProductFlags(product);
  const source = sourceConfidence(product);
  const ingredientNames = product.ingredients.map(ingredientName).slice(0, 5).join(', ');
  const alternatives = product.healthierAlternatives.length > 0
    ? product.healthierAlternatives
    : ['Compare shorter ingredient lists', 'Check organic certification when it matters to your sourcing preferences', 'Choose a similar food with fewer additive flags'];

  return {
    productName: product.name,
    brand: product.brand || null,
    sourceConfidence: source,
    flags,
    sections: [
      {
        title: 'What this is',
        body: `${product.name}${product.brand ? ` by ${product.brand}` : ''} is a packaged-food scanner record. Use this as a review aid and confirm details against the product label.`,
      },
      {
        title: 'How it is commonly made',
        body: product.ingredientsList
          ? `This product is assembled from its listed ingredients${ingredientNames ? `, including ${ingredientNames}` : ''}. Processing details vary by manufacturer.`
          : 'The provider data does not include a full ingredient list, so Swan cannot infer the manufacturing path from this scan alone.',
      },
      {
        title: 'Why companies use it',
        body: 'Packaged foods often use sweeteners, stabilizers, preservatives, flavor systems, or texture agents for shelf life, taste, consistency, and cost control.',
      },
      {
        title: 'What to watch for',
        body: flags.length > 0
          ? `Review ${flags.length} source-tagged signal${flags.length === 1 ? '' : 's'} before logging or repeating this food.`
          : 'No higher-concern regulatory, processing, or nutrition-threshold signals were present in the available provider data.',
      },
      {
        title: 'Cleaner alternatives',
        body: alternatives.join('; '),
      },
      {
        title: 'Coach note',
        body: 'Tie the choice back to training goals, protein consistency, hydration, digestion, and how often this product appears in the week.',
      },
    ],
    guardrails: [
      'Not medical advice.',
      'GMO and bioengineered signals are treated as sourcing and disclosure preferences unless ingredient-specific evidence is present.',
      'Provider data may be incomplete; verify against the label for decisions that matter.',
    ],
  };
};

export const buildIngredientExplanation = ({ ingredient = {}, product = {} } = {}) => {
  const name = ingredientName(ingredient);
  const flags = buildProductFlags({ ...asProduct(product), ingredients: [ingredient] });
  return {
    productName: safeText(product?.name, 'Product'),
    ingredientName: name,
    sourceConfidence: sourceConfidence(asProduct(product)),
    flags,
    sections: [
      { title: 'What this ingredient is', body: safeText(ingredient.description, `${name} appears in this product's ingredient data.`) },
      { title: 'How it is commonly made', body: 'Manufacturing methods vary by supplier. Swan only shows source-backed flags available in the ingredient record.' },
      { title: 'Why companies use it', body: 'Common reasons include flavor, texture, shelf stability, color, sweetness, moisture control, or cost.' },
      { title: 'What to watch for', body: flags.length > 0 ? `Review the ${flags.map((item) => item.category).join(', ')} signal categories.` : 'No source-backed ingredient flags were available for this item.' },
      { title: 'Cleaner alternatives', body: safeArray(ingredient.healthierAlternatives).join('; ') || 'Compare products with shorter ingredient lists or fewer additives when that fits the meal goal.' },
      { title: 'Coach note', body: 'Use this as education, not a diagnosis. Individual tolerance and dietary needs vary.' },
    ],
    guardrails: ['Not medical advice.', 'Ingredient flags are source categories, not absolute safety verdicts.'],
  };
};

export const buildVideoBriefDraft = ({ product = {}, ingredient = null } = {}) => {
  const normalized = asProduct(product);
  const target = ingredient ? ingredientName(ingredient) : normalized.name;
  const flags = ingredient ? buildProductFlags({ ...normalized, ingredients: [ingredient] }) : buildProductFlags(normalized);
  return {
    title: `What is in ${target}?`,
    status: 'draft_not_published',
    sourceConfidence: sourceConfidence(normalized),
    claims: flags,
    scenes: [
      { title: 'Show the product label', notes: 'Name the product and provider source before making any claim.' },
      { title: 'Explain the top signals', notes: 'Group every flag as regulatory, nutrition threshold, processing, allergen, preference, or estimate.' },
      { title: 'Offer practical swaps', notes: 'Compare labels and ingredient lists without presenting unsupported health claims.' },
      { title: 'Coach close', notes: 'Connect the choice to training goals, meal context, and repeat frequency.' },
    ],
    guardrails: [
      'Draft only; nothing is published automatically.',
      'Do not claim a food causes or cures disease.',
      'Treat GMO/BE as sourcing and disclosure preference unless ingredient-specific evidence supports a narrower claim.',
    ],
  };
};
