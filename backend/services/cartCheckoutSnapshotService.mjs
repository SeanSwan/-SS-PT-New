/**
 * cartCheckoutSnapshotService.mjs
 * =================================
 * Freezes the exact cart facts priced by Stripe so fulfillment never trusts
 * mutable CartItem rows after checkout begins.
 */

const SNAPSHOT_VERSION = 1;
const STOREFRONT_FIELDS = [
  'id', 'name', 'description', 'imageUrl', 'sessions', 'totalSessions',
  'isSpecialOffer', 'itemKind', 'type', 'packageType', 'fulfillmentType',
];
const VARIANT_FIELDS = ['id', 'label', 'sku'];

function pick(source, fields) {
  return Object.fromEntries(fields.map((field) => [field, source?.[field] ?? null]));
}

export class CartCheckoutSnapshotError extends Error {
  constructor(message, code = 'CHECKOUT_SNAPSHOT_INVALID') {
    super(message);
    this.name = 'CartCheckoutSnapshotError';
    this.code = code;
  }
}

export function buildCartCheckoutSnapshot(cartItems, checkoutSessionId) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new CartCheckoutSnapshotError('Cannot snapshot an empty cart');
  }

  return {
    version: SNAPSHOT_VERSION,
    checkoutSessionId,
    items: cartItems.map((item) => ({
      cartItemId: item.id ?? null,
      storefrontItemId: Number(item.storefrontItemId || item.storefrontItem?.id),
      productVariantId: item.productVariantId || item.productVariant?.id || null,
      quantity: Number(item.quantity),
      price: Number(item.price),
      storefrontItem: pick(item.storefrontItem, STOREFRONT_FIELDS),
      productVariant: item.productVariant ? pick(item.productVariant, VARIANT_FIELDS) : null,
    })),
  };
}

export function readCartCheckoutSnapshot(cart) {
  if (!cart?.stripeSessionData) return null;
  try {
    const parsed = typeof cart.stripeSessionData === 'string'
      ? JSON.parse(cart.stripeSessionData)
      : cart.stripeSessionData;
    return parsed?.checkoutSnapshot?.version === SNAPSHOT_VERSION
      ? parsed.checkoutSnapshot
      : null;
  } catch {
    throw new CartCheckoutSnapshotError('Stored checkout snapshot is unreadable');
  }
}

function inventoryAwareSnapshot(snapshot, record) {
  if (!record) return snapshot;
  return {
    ...snapshot,
    stockQuantity: record.stockQuantity,
    ...(typeof record.reload === 'function' && { reload: record.reload.bind(record) }),
    ...(typeof record.decrement === 'function' && { decrement: record.decrement.bind(record) }),
  };
}

export async function hydrateCartCheckoutItems({
  cart,
  StorefrontItem,
  ProductVariant,
  transaction,
}) {
  const snapshot = readCartCheckoutSnapshot(cart);
  if (!snapshot) return cart.cartItems;
  if (snapshot.checkoutSessionId !== cart.checkoutSessionId) {
    throw new CartCheckoutSnapshotError('Checkout snapshot does not match the payable session');
  }

  return Promise.all(snapshot.items.map(async (item) => {
    const storefrontRecord = await StorefrontItem.findByPk(item.storefrontItemId, { transaction });
    const variantRecord = item.productVariantId && ProductVariant
      ? await ProductVariant.findByPk(item.productVariantId, { transaction })
      : null;

    return {
      id: item.cartItemId,
      storefrontItemId: item.storefrontItemId,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      price: item.price,
      storefrontItem: {
        ...inventoryAwareSnapshot(item.storefrontItem, storefrontRecord),
        catalogRecordMissing: !storefrontRecord,
      },
      productVariant: item.productVariant
        ? {
            ...inventoryAwareSnapshot(item.productVariant, variantRecord),
            catalogRecordMissing: !variantRecord,
          }
        : null,
    };
  }));
}
