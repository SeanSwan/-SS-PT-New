/**
 * cartCheckoutFulfillmentService.mjs
 * ============================================================
 * Purpose:
 * - Create order/order-item audit records for paid cart checkout fulfillment.
 * - Preserve product variant IDs on order items for fulfillment/admin views.
 * - Decrement tracked physical-product inventory inside the caller transaction.
 *
 * Data flow:
 * - Called by SessionGrantService after cart/user rows are locked.
 * - Uses the existing Order and OrderItem models when available.
 * - Stores fulfillment status in order shippingAddress / order-item metadata.
 */

import { generateSwanOrderNumber } from '../utils/orderNumber.mjs';

const CART_FULFILLMENT_KEY_PREFIX = 'cart-fulfillment';

function toFiniteMoney(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : fallback;
}

function parseCartCustomerInfo(cart) {
  if (!cart?.customerInfo) return {};
  if (typeof cart.customerInfo === 'object') return cart.customerInfo;

  try {
    const parsed = JSON.parse(cart.customerInfo);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function itemKind(cartItem) {
  return cartItem?.storefrontItem?.itemKind || cartItem?.storefrontItem?.type || 'training_package';
}

function isPhysicalCartItem(cartItem) {
  return itemKind(cartItem) === 'physical_product';
}

function cartItemQuantity(cartItem) {
  const quantity = Number(cartItem?.quantity || 0);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function cartItemName(cartItem) {
  const baseName = cartItem?.storefrontItem?.name || 'SwanStudios item';
  const variantLabel = cartItem?.productVariant?.label;
  return variantLabel ? `${baseName} - ${variantLabel}` : baseName;
}

function cartTotalAmount(cart) {
  const cartTotal = toFiniteMoney(cart?.total, null);
  if (cartTotal !== null && cartTotal > 0) return cartTotal;

  return toFiniteMoney((cart?.cartItems || []).reduce((sum, item) => (
    sum + (toFiniteMoney(item?.price) * cartItemQuantity(item))
  ), 0));
}

function orderItemPayload(orderId, cartItem, getCartItemSessionCredits) {
  const quantity = cartItemQuantity(cartItem);
  const price = toFiniteMoney(cartItem?.price);
  const kind = itemKind(cartItem);
  const productVariant = cartItem?.productVariant || null;

  return {
    orderId,
    storefrontItemId: cartItem.storefrontItemId || cartItem?.storefrontItem?.id,
    productVariantId: cartItem.productVariantId || productVariant?.id || null,
    name: cartItemName(cartItem),
    description: cartItem?.storefrontItem?.description || null,
    quantity,
    price,
    subtotal: Number((price * quantity).toFixed(2)),
    itemType: kind,
    imageUrl: cartItem?.storefrontItem?.imageUrl || null,
    fulfillmentStatus: isPhysicalCartItem(cartItem) ? 'pending_fulfillment' : 'not_required',
    metadata: {
      cartItemId: cartItem.id || null,
      itemKind: kind,
      packageType: cartItem?.storefrontItem?.packageType || null,
      fulfillmentType: cartItem?.storefrontItem?.fulfillmentType || null,
      fulfillmentStatus: isPhysicalCartItem(cartItem) ? 'pending_fulfillment' : 'not_required',
      sessionsGranted: getCartItemSessionCredits(cartItem),
      productVariantLabel: productVariant?.label || null,
      productVariantSku: productVariant?.sku || null,
    },
  };
}

function orderNotes({ cart, grantedBy, sessionsToAdd, productItemsFulfilled }) {
  return JSON.stringify({
    source: 'stripe_checkout',
    cartId: cart.id,
    checkoutSessionId: cart.checkoutSessionId || null,
    grantedBy,
    sessionsAdded: sessionsToAdd,
    productItemsFulfilled,
  });
}

function getInventoryTarget(cartItem) {
  if (cartItem?.productVariant?.decrement && Number.isFinite(Number(cartItem.productVariant.stockQuantity))) {
    return cartItem.productVariant;
  }

  if (cartItem?.storefrontItem?.decrement && Number.isFinite(Number(cartItem.storefrontItem.stockQuantity))) {
    return cartItem.storefrontItem;
  }

  return null;
}

export async function loadOptionalFulfillmentModels() {
  try {
    const modelIndex = await import('../models/index.mjs');
    const safeGet = (getter) => {
      try {
        return typeof getter === 'function' ? getter() : null;
      } catch {
        return null;
      }
    };

    return {
      ProductVariant: safeGet(modelIndex.getProductVariant),
      Order: safeGet(modelIndex.getOrder),
      OrderItem: safeGet(modelIndex.getOrderItem),
    };
  } catch {
    return { ProductVariant: null, Order: null, OrderItem: null };
  }
}

async function decrementPhysicalInventory(cartItems, transaction) {
  let productItemsFulfilled = 0;

  for (const cartItem of cartItems || []) {
    if (!isPhysicalCartItem(cartItem)) continue;

    productItemsFulfilled += 1;
    const quantity = cartItemQuantity(cartItem);
    const inventoryTarget = getInventoryTarget(cartItem);

    if (quantity > 0 && inventoryTarget) {
      await inventoryTarget.decrement('stockQuantity', { by: quantity, transaction });
    }
  }

  return productItemsFulfilled;
}

export async function createCartOrderIfPossible({
  cart,
  user,
  grantedBy,
  sessionsToAdd,
  transaction,
  Order,
  OrderItem,
  getCartItemSessionCredits = () => 0,
}) {
  const productItemCount = (cart.cartItems || []).filter(isPhysicalCartItem).length;

  if (!Order || !OrderItem) {
    return { orderId: null, productItemsFulfilled: productItemCount };
  }

  const existingOrder = await Order.findOne({
    where: { cartId: cart.id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existingOrder) {
    return {
      orderId: existingOrder.id || null,
      productItemsFulfilled: productItemCount,
    };
  }

  const customerInfo = parseCartCustomerInfo(cart);
  const order = await Order.create({
    userId: cart.userId,
    cartId: cart.id,
    orderNumber: generateSwanOrderNumber(),
    totalAmount: cartTotalAmount(cart),
    status: 'completed',
    paymentMethod: 'stripe',
    paymentId: cart.paymentIntentId || cart.checkoutSessionId || null,
    billingEmail: customerInfo.email || user?.email || null,
    billingName: customerInfo.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null,
    shippingAddress: customerInfo.fulfillmentIntent
      ? {
          fulfillmentIntent: customerInfo.fulfillmentIntent,
          details: customerInfo.fulfillmentIntent.details || null,
          fulfillmentStatus: productItemCount > 0 ? 'pending_fulfillment' : 'not_required',
        }
      : null,
    notes: orderNotes({ cart, grantedBy, sessionsToAdd, productItemsFulfilled: productItemCount }),
    completedAt: new Date(),
    idempotencyKey: `${CART_FULFILLMENT_KEY_PREFIX}:${cart.id}`,
  }, { transaction });

  const orderItems = (cart.cartItems || [])
    .filter((item) => cartItemQuantity(item) > 0 && (item.storefrontItemId || item?.storefrontItem?.id))
    .map((item) => orderItemPayload(order.id, item, getCartItemSessionCredits));

  if (orderItems.length > 0) {
    await OrderItem.bulkCreate(orderItems, { transaction });
  }

  const productItemsFulfilled = await decrementPhysicalInventory(cart.cartItems, transaction);
  return { orderId: order.id || null, productItemsFulfilled };
}
