/**
 * checkoutStockAvailabilityService.mjs
 * ============================================================
 * Re-checks physical-product inventory at Stripe Checkout creation time.
 * Cart add/update guards are not enough because stock can change while a cart
 * is sitting open.
 */

export const CHECKOUT_STOCK_UNAVAILABLE_CODE = 'CHECKOUT_STOCK_UNAVAILABLE';
export const CHECKOUT_STOCK_UNAVAILABLE_MESSAGE = 'Selected item quantity exceeds available stock';
export const CHECKOUT_ITEM_UNAVAILABLE_CODE = 'CHECKOUT_ITEM_UNAVAILABLE';
export const CHECKOUT_ITEM_UNAVAILABLE_MESSAGE = 'Selected item is no longer available';

const isPhysicalProductLine = (item) => (
  item?.storefrontItem?.itemKind === 'physical_product' || Boolean(item?.productVariantId)
);

const toPositiveQuantity = (quantity) => {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const trackedStock = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const resolveCheckoutAvailableStock = (item) => {
  const variantStock = trackedStock(item?.productVariant?.stockQuantity);
  if (variantStock !== null) return variantStock;
  return trackedStock(item?.storefrontItem?.stockQuantity);
};

const checkoutItemName = (item) => {
  const productName = item?.storefrontItem?.name || `Storefront Item #${item?.storefrontItemId || 'unknown'}`;
  const variantLabel = item?.productVariant?.label;
  return variantLabel ? `${productName} - ${variantLabel}` : productName;
};

export function validateCheckoutStockAvailability(cartItems = []) {
  for (const item of cartItems || []) {
    // AVAILABILITY applies to EVERY line. This check used to sit BELOW the
    // physical-only `continue`, so a training package — itemKind defaults to
    // 'training_package', no variant — was skipped entirely and a RETIRED
    // package stayed checkout-able from a stale cart at its snapshot price
    // (GLM full-family review 2026-08-16, H1). The ACH and offline rails
    // enforce isActive at purchase time; the cart rail enforced it only at ADD
    // time, which left this the only gate — and it was not checking.
    // Retiring an item is how a revoked deal is killed, so this must bind here.
    //
    // ABSENCE is not the same as inactive. `item?.storefrontItem?.isActive ===
    // false` yields `undefined === false` -> false when the catalog row was
    // DELETED after add-to-cart, so a deleted item sailed through. The grant
    // side deliberately tolerates a missing catalog record
    // (`catalogRecordMissing`), which made such an item not just purchasable
    // but fulfillable, from a stale cart, at its snapshot price. `isActive:
    // false` was handled; row-absence was the unhandled state (Kimi K3 M3,
    // 2026-08-19).
    //
    // A variant is only REQUIRED when the line claims one: `productVariantId`
    // set with no `productVariant` loaded means the variant row is gone. A line
    // that never had a variant is not missing anything.
    const catalogRowMissing = !item?.storefrontItem
      || (Boolean(item?.productVariantId) && !item?.productVariant);

    if (
      catalogRowMissing
      || item?.storefrontItem?.isActive === false
      || item?.productVariant?.isActive === false
    ) {
      return {
        code: CHECKOUT_ITEM_UNAVAILABLE_CODE,
        status: 409,
        message: CHECKOUT_ITEM_UNAVAILABLE_MESSAGE,
        itemName: checkoutItemName(item),
      };
    }

    // STOCK stays physical-only: training packages carry stockQuantity: null and
    // are not inventoried. Do not hoist this one.
    if (!isPhysicalProductLine(item)) continue;

    const availableStock = resolveCheckoutAvailableStock(item);
    const requestedQuantity = toPositiveQuantity(item?.quantity);
    if (availableStock !== null && requestedQuantity > availableStock) {
      return {
        code: CHECKOUT_STOCK_UNAVAILABLE_CODE,
        status: 409,
        message: CHECKOUT_STOCK_UNAVAILABLE_MESSAGE,
        itemName: checkoutItemName(item),
        requestedQuantity,
        availableStock,
      };
    }
  }
  return null;
}

export default {
  CHECKOUT_ITEM_UNAVAILABLE_CODE,
  CHECKOUT_ITEM_UNAVAILABLE_MESSAGE,
  CHECKOUT_STOCK_UNAVAILABLE_CODE,
  CHECKOUT_STOCK_UNAVAILABLE_MESSAGE,
  resolveCheckoutAvailableStock,
  validateCheckoutStockAvailability,
};
