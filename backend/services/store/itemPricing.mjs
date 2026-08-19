/**
 * itemPricing.mjs — ONE unit-price resolution for every purchase rail.
 * ====================================================================
 *
 * WHY THIS EXISTS
 *
 * The cart rail priced defensively:
 *     firstMoney(variant?.price, storefrontItem.totalCost, storefrontItem.price)
 * while the ACH and offline rails priced off `price` alone:
 *     new Decimal(item.price || 0)
 *
 * `StorefrontItem.price` is `allowNull: true`, and the model's own hook backfills
 * it from `totalCost` ONLY when price is null/undefined — an explicit `0` is left
 * alone. So `price: 0, totalCost: 8400` is a persistable row, and on the direct
 * rails `new Decimal(0)` is a TRUTHY object that sails past `if (!unitPrice)`.
 * Result: a real package contributed $0 to the order total, minted a genuine
 * PaymentIntent, and granted its sessions on payment success.
 *
 * Found independently by Kimi K3 (HIGH-2) and GLM-5.3 (§4.7), 2026-08-16.
 *
 * THE RULE: an item this function cannot price is NOT SELLABLE. It throws rather
 * than returning 0, because every zero-returning variant of this logic has ended
 * up charging nothing instead of refusing. Callers convert the throw to a 4xx.
 *
 * Money is Decimal throughout — never float. Do not add a `toNumber()` convenience
 * here; the caller decides where precision stops.
 */

import Decimal from 'decimal.js';

export class UnpriceableItemError extends Error {
  constructor(itemRef) {
    super(`Item ${itemRef ?? 'unknown'} has no usable price`);
    this.name = 'UnpriceableItemError';
    this.code = 'ITEM_NOT_PRICEABLE';
    this.status = 400;
    this.itemRef = itemRef;
  }
}

/**
 * First strictly-positive money value, as a Decimal. Non-numeric, null, NaN,
 * zero and negative candidates are skipped — NOT coerced to 0.
 */
const firstPositiveMoney = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    // Decimal throws on garbage ('free', {}); a bad column must not abort pricing
    // of an otherwise-valid catalog row — just skip the candidate.
    let parsed;
    try {
      parsed = new Decimal(candidate);
    } catch {
      continue;
    }
    if (!parsed.isFinite() || parsed.lessThanOrEqualTo(0)) continue;
    return parsed;
  }
  return null;
};

/**
 * Resolve the unit price for one purchasable line.
 *
 * Precedence — variant price, then the item's totalCost, then its price. This is
 * the cart rail's long-standing order (`firstMoney`), now shared: packages carry
 * the real money in `totalCost`, physical variants override at the variant level.
 *
 * @param {object} storefrontItem
 * @param {object|null} [variant]
 * @returns {Decimal} strictly positive
 * @throws {UnpriceableItemError} when nothing resolves above zero
 */
export function resolveUnitPrice(storefrontItem, variant = null) {
  const price = firstPositiveMoney(
    variant?.price,
    storefrontItem?.totalCost,
    storefrontItem?.price
  );

  if (price === null) {
    throw new UnpriceableItemError(storefrontItem?.id);
  }

  return price;
}

export default { resolveUnitPrice, UnpriceableItemError };
