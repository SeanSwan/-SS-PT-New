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
import Decimal from 'decimal.js';
import OrderItem from '../models/OrderItem.mjs';

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
    const qty = parseInt(item.quantity, 10);
    const dbPrice = new Decimal(storefrontItem.price || 0);

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

  if (existingCount > 0) return;

  await createPaymentOrderItems({
    order,
    requestItems,
    storefrontItems,
    paymentMethod,
    metadataSource,
    transaction,
  });
}

export const buildOfflineOrderItemRows = buildPaymentOrderItemRows;
export const createOfflineOrderItems = createPaymentOrderItems;
export const backfillMissingOfflineOrderItems = backfillMissingPaymentOrderItems;
