import { describe, expect, it, vi } from 'vitest';
import {
  buildCartCheckoutSnapshot,
  hydrateCartCheckoutItems,
} from '../../services/cartCheckoutSnapshotService.mjs';

describe('immutable cart checkout snapshots', () => {
  it('hydrates the paid snapshot instead of later mutable cart rows', async () => {
    const checkoutSnapshot = buildCartCheckoutSnapshot([{
      id: 4,
      storefrontItemId: 10,
      quantity: 1,
      price: 400,
      storefrontItem: {
        id: 10,
        name: 'Private package',
        sessions: 5,
        isSpecialOffer: true,
        itemKind: 'training_package',
      },
    }], 'cs_paid');
    const currentUnpaidItem = { id: 99, quantity: 1, storefrontItem: { id: 11, sessions: 50 } };
    const StorefrontItem = {
      findByPk: vi.fn().mockResolvedValue({ id: 10, stockQuantity: null }),
    };
    const cart = {
      checkoutSessionId: 'cs_paid',
      stripeSessionData: JSON.stringify({ checkoutSnapshot }),
      cartItems: [currentUnpaidItem],
    };

    const hydrated = await hydrateCartCheckoutItems({ cart, StorefrontItem, transaction: {} });

    expect(hydrated).toHaveLength(1);
    expect(hydrated[0]).toMatchObject({ storefrontItemId: 10, quantity: 1, price: 400 });
    expect(hydrated[0].storefrontItem).toMatchObject({ sessions: 5, isSpecialOffer: true });
    expect(hydrated).not.toContain(currentUnpaidItem);
  });

  it('honors the paid snapshot after admin hard-deletes its item and variant', async () => {
    const checkoutSnapshot = buildCartCheckoutSnapshot([{
      id: 5,
      storefrontItemId: 20,
      productVariantId: 30,
      quantity: 2,
      price: 25,
      storefrontItem: { id: 20, name: 'Paid product', itemKind: 'physical_product' },
      productVariant: { id: 30, label: 'Large', sku: 'LARGE' },
    }], 'cs_deleted_catalog');
    const hydrated = await hydrateCartCheckoutItems({
      cart: {
        checkoutSessionId: 'cs_deleted_catalog',
        stripeSessionData: JSON.stringify({ checkoutSnapshot }),
        cartItems: [],
      },
      StorefrontItem: { findByPk: vi.fn().mockResolvedValue(null) },
      ProductVariant: { findByPk: vi.fn().mockResolvedValue(null) },
      transaction: {},
    });

    expect(hydrated[0]).toMatchObject({ storefrontItemId: 20, productVariantId: 30, quantity: 2 });
    expect(hydrated[0].storefrontItem).toMatchObject({ name: 'Paid product', catalogRecordMissing: true });
    expect(hydrated[0].productVariant).toMatchObject({ label: 'Large', catalogRecordMissing: true });
  });

  it('rejects a snapshot belonging to another Stripe session', async () => {
    const checkoutSnapshot = buildCartCheckoutSnapshot([{
      id: 4,
      storefrontItemId: 10,
      quantity: 1,
      price: 400,
      storefrontItem: { id: 10, sessions: 5 },
    }], 'cs_old');

    await expect(hydrateCartCheckoutItems({
      cart: {
        checkoutSessionId: 'cs_new',
        stripeSessionData: JSON.stringify({ checkoutSnapshot }),
        cartItems: [],
      },
      StorefrontItem: { findByPk: vi.fn() },
      transaction: {},
    })).rejects.toMatchObject({ code: 'CHECKOUT_SNAPSHOT_INVALID' });
  });
});
