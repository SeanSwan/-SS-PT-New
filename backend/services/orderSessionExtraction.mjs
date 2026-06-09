/**
 * orderSessionExtraction.mjs
 * ==========================
 * Extracts purchased session counts from Order records.
 *
 * Normal cart orders store durable OrderItem rows. Older offline payment
 * orders may only have their item snapshot in Order.notes, so this helper
 * keeps manual payment recovery compatible with both data shapes.
 */

function parseOrderNotes(notes) {
  if (!notes) return null;
  if (typeof notes === 'object') return notes;

  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

function canUsePaymentNoteItems(order, notes) {
  return Array.isArray(notes?.items)
    && notes.items.length > 0
    && (notes.type === 'offline_payment' || notes.type === 'ach_payment' || order?.paymentMethod === 'ach');
}

export function hasPaymentNoteItems(order) {
  const notes = parseOrderNotes(order?.notes);
  return canUsePaymentNoteItems(order, notes);
}

async function buildOrderItemsFromOfflineNotes(order, StorefrontItem, logger, logPrefix) {
  const notes = parseOrderNotes(order?.notes);
  if (!canUsePaymentNoteItems(order, notes)) {
    return [];
  }

  const requestedItems = notes.items
    .map(item => ({
      storefrontItemId: Number(item.storefrontItemId),
      quantity: parseInt(item.quantity, 10),
    }))
    .filter(item => Number.isInteger(item.storefrontItemId) && Number.isInteger(item.quantity) && item.quantity > 0);

  if (requestedItems.length === 0) return [];

  const storefrontItems = await StorefrontItem.findAll({
    where: { id: [...new Set(requestedItems.map(item => item.storefrontItemId))] },
  });
  const storefrontMap = new Map(storefrontItems.map(item => [Number(item.id), item]));

  return requestedItems
    .map(item => {
      const storefrontItem = storefrontMap.get(item.storefrontItemId);
      if (!storefrontItem) {
        logger.warn(`[${logPrefix}] Offline order ${order.id} missing storefront item ${item.storefrontItemId}`);
        return null;
      }

      return {
        id: null,
        storefrontItemId: item.storefrontItemId,
        quantity: item.quantity,
        price: storefrontItem.price || 0,
        storefrontItem,
      };
    })
    .filter(Boolean);
}

export async function extractOrderSessionData(order, { StorefrontItem, logger, logPrefix }) {
  let totalSessions = 0;
  const items = [];
  const orderItems = order.orderItems && order.orderItems.length > 0
    ? order.orderItems
    : await buildOrderItemsFromOfflineNotes(order, StorefrontItem, logger, logPrefix);

  for (const orderItem of orderItems) {
    const storefrontItem = orderItem.storefrontItem;

    if (!storefrontItem) {
      logger.warn(`[${logPrefix}] Order item ${orderItem.id} missing storefront item`);
      continue;
    }

    let sessionCount = 0;
    if (storefrontItem.sessions) {
      sessionCount = storefrontItem.sessions * orderItem.quantity;
    } else if (storefrontItem.totalSessions) {
      sessionCount = storefrontItem.totalSessions * orderItem.quantity;
    } else if (storefrontItem.packageType === 'monthly' && storefrontItem.months && storefrontItem.sessionsPerWeek) {
      sessionCount = (storefrontItem.months * storefrontItem.sessionsPerWeek * 4) * orderItem.quantity;
    }

    if (sessionCount > 0) {
      items.push({
        orderItemId: orderItem.id,
        storefrontItemId: storefrontItem.id,
        name: storefrontItem.name,
        packageType: storefrontItem.packageType,
        sessionsPerItem: sessionCount / orderItem.quantity,
        quantity: orderItem.quantity,
        totalSessions: sessionCount,
        price: orderItem.price,
      });

      totalSessions += sessionCount;
    }
  }

  return { totalSessions, items };
}
