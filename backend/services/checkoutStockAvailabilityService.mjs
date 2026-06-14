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
    if (!isPhysicalProductLine(item)) continue;
    if (item?.storefrontItem?.isActive === false || item?.productVariant?.isActive === false) {
      return {
        code: CHECKOUT_ITEM_UNAVAILABLE_CODE,
        status: 409,
        message: CHECKOUT_ITEM_UNAVAILABLE_MESSAGE,
        itemName: checkoutItemName(item),
      };
    }
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
