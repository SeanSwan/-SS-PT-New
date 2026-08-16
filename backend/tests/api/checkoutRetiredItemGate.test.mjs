/**
 * Regression: a RETIRED (isActive:false) item must not be checkout-able on ANY rail.
 *
 * Found 2026-08-16 by GLM-5.3 in a full-family review — and it corrects an earlier
 * DISPROOF of the same claim. The earlier pass grepped this line:
 *
 *     if (item?.storefrontItem?.isActive === false || ...) { return UNAVAILABLE }
 *
 * and concluded the v2 card rail rejected retired items. It never read the line
 * directly ABOVE it:
 *
 *     if (!isPhysicalProductLine(item)) continue;
 *
 * `isPhysicalProductLine` is `itemKind === 'physical_product' || Boolean(productVariantId)`.
 * StorefrontItem.itemKind DEFAULTS to 'training_package'. So every training package —
 * the primary product — was `continue`d past and never isActive-checked.
 *
 * Exploit: user adds a package to cart -> admin retires it (isActive:false, which is
 * exactly how a revoked custom deal is killed) -> user checks out anyway at the
 * snapshotted price. The ACH and offline rails enforce isActive at purchase time; the
 * cart rail enforced it only at ADD time, and the checkout gate skipped it entirely.
 *
 * Stock checks stay physical-only (a training package has no inventory). Only the
 * availability check is hoisted.
 */
import { describe, expect, it } from 'vitest';
import {
  validateCheckoutStockAvailability,
  CHECKOUT_ITEM_UNAVAILABLE_CODE,
  CHECKOUT_STOCK_UNAVAILABLE_CODE,
} from '../../services/checkoutStockAvailabilityService.mjs';

const trainingPackage = (overrides = {}) => ({
  storefrontItemId: 7,
  quantity: 1,
  productVariantId: null,
  productVariant: null,
  storefrontItem: {
    id: 7,
    name: 'Gold Swan Elite Package',
    // itemKind DEFAULTS to 'training_package' in the model — the value that made
    // isPhysicalProductLine() false and skipped the availability check.
    itemKind: 'training_package',
    isActive: true,
    stockQuantity: null,
    ...overrides,
  },
});

const physicalProduct = (overrides = {}) => ({
  storefrontItemId: 9,
  quantity: 1,
  productVariantId: 33,
  productVariant: { id: 33, label: 'L', isActive: true, stockQuantity: 5 },
  storefrontItem: {
    id: 9, name: 'Swan Hoodie', itemKind: 'physical_product',
    isActive: true, stockQuantity: 5, ...overrides,
  },
});

describe('checkout availability gate covers every line, not just physical ones', () => {
  it('rejects a RETIRED training package (the primary product)', () => {
    const result = validateCheckoutStockAvailability([
      trainingPackage({ isActive: false }),
    ]);

    expect(result).not.toBeNull();
    expect(result.code).toBe(CHECKOUT_ITEM_UNAVAILABLE_CODE);
    expect(result.status).toBe(409);
  });

  it('rejects a retired package even when a live physical line is also in the cart', () => {
    const result = validateCheckoutStockAvailability([
      physicalProduct(),
      trainingPackage({ isActive: false }),
    ]);

    expect(result?.code).toBe(CHECKOUT_ITEM_UNAVAILABLE_CODE);
  });

  it('still rejects a retired physical product', () => {
    const result = validateCheckoutStockAvailability([
      physicalProduct({ isActive: false }),
    ]);

    expect(result?.code).toBe(CHECKOUT_ITEM_UNAVAILABLE_CODE);
  });

  it('rejects a line whose VARIANT was retired', () => {
    const line = physicalProduct();
    line.productVariant.isActive = false;

    expect(validateCheckoutStockAvailability([line])?.code)
      .toBe(CHECKOUT_ITEM_UNAVAILABLE_CODE);
  });

  it('lets a live training package through', () => {
    expect(validateCheckoutStockAvailability([trainingPackage()])).toBeNull();
  });

  // Training packages carry stockQuantity: null and are not inventoried. Hoisting
  // the availability check must NOT drag the stock check onto them, or every
  // package purchase starts 409ing.
  it('does not apply stock limits to a non-physical line', () => {
    const line = trainingPackage();
    line.quantity = 50;
    line.storefrontItem.stockQuantity = 1; // would fail a stock check if applied

    expect(validateCheckoutStockAvailability([line])).toBeNull();
  });

  it('still enforces stock on physical lines', () => {
    const line = physicalProduct();
    line.quantity = 99;

    expect(validateCheckoutStockAvailability([line])?.code)
      .toBe(CHECKOUT_STOCK_UNAVAILABLE_CODE);
  });

  it('returns null for an empty or absent cart', () => {
    expect(validateCheckoutStockAvailability([])).toBeNull();
    expect(validateCheckoutStockAvailability()).toBeNull();
  });
});
