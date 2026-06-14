import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_ITEM_UNAVAILABLE_CODE,
  CHECKOUT_STOCK_UNAVAILABLE_CODE,
  validateCheckoutStockAvailability,
} from '../../services/checkoutStockAvailabilityService.mjs';

const line = ({
  itemKind = 'physical_product',
  quantity = 1,
  itemActive = true,
  itemStock = null,
  variantActive = true,
  variantStock = null,
} = {}) => ({
  quantity,
  storefrontItem: {
    id: 10,
    isActive: itemActive,
    itemKind,
    name: itemKind === 'physical_product' ? 'Recovery Drink' : 'Training Pack',
    stockQuantity: itemStock,
  },
  productVariant: variantStock === undefined
    ? null
    : {
        id: 22,
        isActive: variantActive,
        label: '16oz Trial',
        stockQuantity: variantStock,
      },
});

describe('checkout stock availability', () => {
  it('blocks checkout when a tracked product variant is now understocked', () => {
    const error = validateCheckoutStockAvailability([line({ quantity: 3, variantStock: 2 })]);

    expect(error).toMatchObject({
      code: CHECKOUT_STOCK_UNAVAILABLE_CODE,
      status: 409,
      message: 'Selected item quantity exceeds available stock',
      itemName: 'Recovery Drink - 16oz Trial',
      requestedQuantity: 3,
      availableStock: 2,
    });
  });

  it('falls back to parent product stock when the variant is untracked', () => {
    const error = validateCheckoutStockAvailability([line({ quantity: 5, itemStock: 4 })]);

    expect(error).toMatchObject({
      code: CHECKOUT_STOCK_UNAVAILABLE_CODE,
      itemName: 'Recovery Drink - 16oz Trial',
      requestedQuantity: 5,
      availableStock: 4,
    });
  });

  it('allows untracked stock and training-package lines', () => {
    expect(validateCheckoutStockAvailability([line({ quantity: 50 })])).toBeNull();
    expect(validateCheckoutStockAvailability([line({ itemKind: 'training_package', quantity: 50, itemStock: 0 })]))
      .toBeNull();
  });

  it('blocks checkout when a stale cart contains an inactive variant', () => {
    const error = validateCheckoutStockAvailability([line({ variantActive: false })]);

    expect(error).toMatchObject({
      code: CHECKOUT_ITEM_UNAVAILABLE_CODE,
      status: 409,
      message: 'Selected item is no longer available',
      itemName: 'Recovery Drink - 16oz Trial',
    });
  });

  it('blocks checkout when a stale cart contains an inactive product', () => {
    const error = validateCheckoutStockAvailability([line({ itemActive: false })]);

    expect(error).toMatchObject({
      code: CHECKOUT_ITEM_UNAVAILABLE_CODE,
      status: 409,
      message: 'Selected item is no longer available',
      itemName: 'Recovery Drink - 16oz Trial',
    });
  });
});
