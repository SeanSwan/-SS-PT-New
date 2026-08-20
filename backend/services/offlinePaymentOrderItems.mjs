/**
 * offlinePaymentOrderItems.mjs
 * ============================
 * Builds and backfills durable OrderItem rows for offline payment orders.
 *
 * Offline payment checkout is a two-step revenue path: the client creates a
 * pending order, then an admin confirms receipt later. The confirmation flow
 * allocates sessions from OrderItem rows, so this service keeps Check/Zelle/
 * Venmo orders aligned with the same allocation truth as cart orders.
 */
import OrderItem from '../models/OrderItem.mjs';
import logger from '../utils/logger.mjs';
import { resolveUnitPrice } from './store/itemPricing.mjs';

/**
 * Raised when a request line names a catalog row that is not in the resolved
 * set. The backfill path is deliberately unfiltered by `isActive` so replays of
 * real orders still work, which means a row DELETED after purchase arrives here
 * as `undefined`. Dereferencing it turned an idempotency replay of an
 * already-paid order into a TypeError -> 500. Name the condition instead.
 */
export class MissingStorefrontItemError extends Error {
  constructor(storefrontItemId) {
    super(`Storefront item ${storefrontItemId} is no longer in the catalog`);
    this.name = 'MissingStorefrontItemError';
    this.code = 'STOREFRONT_ITEM_MISSING';
    this.status = 409;
    this.storefrontItemId = storefrontItemId;
  }
}

export function buildPaymentOrderItemRows(
  orderId,
  requestItems,
  storefrontItems,
  paymentMethod,
  metadataSource = 'offline_payment',
) {
  const storefrontMap = new Map(storefrontItems.map(item => [Number(item.id), item]));

  return requestItems.map(item => {
    const storefrontItem = storefrontMap.get(Number(item.storefrontItemId));
    if (!storefrontItem) throw new MissingStorefrontItemError(item.storefrontItemId);

    const qty = parseInt(item.quantity, 10);

    // The SAME resolver the charge side uses. This used to be
    // `new Decimal(storefrontItem.price || 0)`, which recorded $0.00 lines for
    // any `price: 0/null, totalCost: 8400` package while the order total was
    // correct — so the admin confirmation flow, per-line refund proration, and
    // revenue-by-item all read zero on money that was really collected.
    // If the charge side and this line ever disagree, that IS the bug.
    const dbPrice = resolveUnitPrice(storefrontItem, item.productVariant ?? null);

    return {
      orderId,
      storefrontItemId: storefrontItem.id,
      name: storefrontItem.name,
      description: storefrontItem.description || null,
      quantity: qty,
      price: dbPrice.toFixed(2),
      subtotal: dbPrice.mul(qty).toFixed(2),
      itemType: storefrontItem.packageType || null,
      imageUrl: storefrontItem.imageUrl || null,
      metadata: {
        source: metadataSource,
        paymentMethod,
        sessions: storefrontItem.sessions ?? null,
        totalSessions: storefrontItem.totalSessions ?? null,
      },
    };
  });
}

export async function createPaymentOrderItems({
  order,
  requestItems,
  storefrontItems,
  paymentMethod,
  metadataSource = 'offline_payment',
  transaction,
}) {
  const rows = buildPaymentOrderItemRows(
    order.id,
    requestItems,
    storefrontItems,
    paymentMethod,
    metadataSource,
  );
  await OrderItem.bulkCreate(rows, {
    validate: true,
    ...(transaction ? { transaction } : {}),
  });
}

export async function backfillMissingPaymentOrderItems({
  order,
  requestItems,
  storefrontItems,
  paymentMethod,
  metadataSource = 'offline_payment',
  transaction,
}) {
  const existingCount = await OrderItem.count({
    where: { orderId: order.id },
    ...(transaction ? { transaction } : {}),
  });

  if (existingCount > 0) return { backfilled: false, reason: 'ALREADY_PRESENT' };

  // BEST-EFFORT BY DESIGN — this must never throw to its caller.
  //
  // Backfill runs on the idempotency REPLAY path, before price validation, on
  // an order that was already legitimately placed and paid. The customer is
  // waiting for their existing clientSecret; reconciling item rows is our
  // bookkeeping, not their transaction. Since rows are re-derived from the live
  // catalog (`notes` stores no price snapshot), a row retired to an unpriceable
  // state or deleted outright will legitimately fail to build — and before this
  // guard, that surfaced as a 500 on a paid order.
  //
  // Creation is the opposite: `createPaymentOrderItems` on the create path DOES
  // throw, because there a bad row means we are about to charge for something we
  // cannot record.
  //
  // The failure is loud in logs rather than silent. Do not "simplify" this back
  // into an unguarded call.
  try {
    await createPaymentOrderItems({
      order,
      requestItems,
      storefrontItems,
      paymentMethod,
      metadataSource,
      transaction,
    });
    return { backfilled: true };
  } catch (error) {
    logger.error('[OrderItemBackfill] Could not reconcile item rows for a placed order', {
      orderId: order?.id,
      orderNumber: order?.orderNumber,
      paymentMethod,
      metadataSource,
      errorCode: error?.code || error?.name || 'UNKNOWN',
      errorMessage: error?.message,
    });
    return { backfilled: false, reason: error?.code || 'BACKFILL_FAILED' };
  }
}

export const buildOfflineOrderItemRows = buildPaymentOrderItemRows;
export const createOfflineOrderItems = createPaymentOrderItems;
export const backfillMissingOfflineOrderItems = backfillMissingPaymentOrderItems;
