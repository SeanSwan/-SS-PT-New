/**
 * Public storefront display DTOs.
 *
 * Display money must be resolved by the same Decimal-backed precedence as the
 * cart: variant.price -> storefrontItem.totalCost -> storefrontItem.price.
 * A missing or malformed candidate is unavailable, never a fabricated $0.
 * Price visibility is applied by the route after this normalization.
 */
import Decimal from 'decimal.js';
import { resolveUnitPrice, UnpriceableItemError } from './itemPricing.mjs';

const EMPTY_MONEY_VALUES = new Set([null, undefined, '']);

function parsePositiveMoney(value) {
  if (EMPTY_MONEY_VALUES.has(value)) return null;

  try {
    const parsed = new Decimal(value);
    if (!parsed.isFinite() || parsed.lessThanOrEqualTo(0)) return null;
    return parsed.toNumber();
  } catch {
    return null;
  }
}

/**
 * Resolve a public display amount without allowing an unpriceable record to
 * become a free item. The cart-facing resolver remains the authority.
 */
export function resolveDisplayPrice(storefrontItem, variant = null) {
  try {
    return resolveUnitPrice(storefrontItem, variant).toNumber();
  } catch (error) {
    if (error instanceof UnpriceableItemError) return null;
    throw error;
  }
}

const valueOrFallback = (value, fallback) => value || fallback;
const nullishOrFallback = (value, fallback) => value ?? fallback;

const sanitizeStorefrontDescription = (value) => {
  if (typeof value !== 'string') return value ?? null;

  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const mapProductVariant = (storefrontItem, variant) => ({
  id: variant.id,
  storefrontItemId: variant.storefrontItemId,
  label: variant.label,
  sku: variant.sku ?? null,
  price: resolveDisplayPrice(storefrontItem, variant),
  stockQuantity: variant.stockQuantity ?? null,
  attributes: variant.attributes ?? null,
  displayOrder: variant.displayOrder ?? 0,
  isActive: variant.isActive !== false,
});

function mapProductVariants(storefrontItem) {
  if (!Array.isArray(storefrontItem?.variants)) return [];

  return storefrontItem.variants
    .map((variant) => mapProductVariant(storefrontItem, variant))
    .sort((left, right) => (left.displayOrder - right.displayOrder) || (left.id - right.id));
}

const resolveStorefrontItemType = (itemKind, packageType) => {
  if (itemKind === 'physical_product') return 'PHYSICAL_PRODUCT';
  const trainingItemTypes = {
    fixed: 'TRAINING_PACKAGE_FIXED',
    monthly: 'TRAINING_PACKAGE_SUBSCRIPTION',
    custom: 'TRAINING_PACKAGE_SUBSCRIPTION',
  };
  return trainingItemTypes[packageType] || trainingItemTypes.monthly;
};

/**
 * Convert one model/fixture into the public storefront DTO. All charge-like
 * parent fields intentionally agree on the canonical resolved amount; the
 * per-session rate remains its own strict, nullable metadata field.
 */
export function mapStorefrontItem(storefrontItem) {
  const itemKind = valueOrFallback(storefrontItem?.itemKind, 'training_package');
  const itemType = resolveStorefrontItemType(itemKind, storefrontItem?.packageType);
  const displayPrice = resolveDisplayPrice(storefrontItem);

  return {
    id: storefrontItem?.id,
    name: storefrontItem?.name,
    description: sanitizeStorefrontDescription(storefrontItem?.description),
    totalCost: displayPrice,
    displayPrice,
    pricePerSession: parsePositiveMoney(storefrontItem?.pricePerSession),
    price: displayPrice,
    priceDetails: storefrontItem?.packageType === 'monthly'
      && [storefrontItem?.months, storefrontItem?.sessionsPerWeek].every(value => Number.isInteger(value) && value > 0)
      ? `${storefrontItem?.months} months, ${storefrontItem?.sessionsPerWeek} sessions/week`
      : null,
    imageUrl: storefrontItem?.imageUrl,
    theme: valueOrFallback(storefrontItem?.theme, 'cosmic'),
    sessions: storefrontItem?.sessions,
    months: storefrontItem?.months,
    sessionsPerWeek: storefrontItem?.sessionsPerWeek,
    totalSessions: storefrontItem?.totalSessions,
    category: null,
    itemType,
    includedFeatures: valueOrFallback(storefrontItem?.includedFeatures, null),
    packageType: storefrontItem?.packageType,
    isActive: storefrontItem?.isActive,
    displayOrder: nullishOrFallback(storefrontItem?.displayOrder, 0),
    itemKind,
    isTaxable: storefrontItem?.isTaxable === true,
    fulfillmentType: valueOrFallback(storefrontItem?.fulfillmentType, 'none'),
    stockQuantity: nullishOrFallback(storefrontItem?.stockQuantity, null),
    variants: mapProductVariants(storefrontItem),
  };
}

export default { mapStorefrontItem, resolveDisplayPrice };
