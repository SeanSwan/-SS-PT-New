/**
 * adminFulfillmentQueueService.mjs
 * ============================================================
 * Builds the admin physical-product fulfillment queue from paid Order records.
 * The queue is item-level so one mixed order can fulfill products separately
 * from training-session credits without changing session deduction behavior.
 */

import {
  getOrder,
  getOrderItem,
  getProductVariant,
  getStorefrontItem,
  getUser,
} from '../models/index.mjs';

const FULFILLMENT_STATUSES = new Set(['pending_fulfillment', 'fulfilled', 'not_required']);

function toPlain(record) {
  return typeof record?.toJSON === 'function' ? record.toJSON() : record;
}

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeString(value, max = 240) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPhysicalOrderItem(item) {
  const metadata = asObject(item?.metadata);
  return item?.itemType === 'physical_product'
    || metadata.itemKind === 'physical_product'
    || item?.storefrontItem?.itemKind === 'physical_product'
    || Boolean(item?.productVariantId);
}

function itemStatus(item) {
  const metadata = asObject(item?.metadata);
  const status = item?.fulfillmentStatus || metadata.fulfillmentStatus;
  return FULFILLMENT_STATUSES.has(status) ? status : 'pending_fulfillment';
}

function orderFulfillmentIntent(order) {
  const shippingAddress = asObject(order?.shippingAddress);
  return asObject(shippingAddress.fulfillmentIntent);
}

function customerFromOrder(order) {
  const user = order?.user || {};
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return {
    id: user.id || order?.userId || null,
    name: fullName || order?.billingName || 'Unknown customer',
    email: user.email || order?.billingEmail || null,
  };
}

function fulfillmentDetails(order, item) {
  const metadata = asObject(item?.metadata);
  const intent = orderFulfillmentIntent(order);
  const details = asObject(intent.details);
  return {
    mode: intent.mode || metadata.fulfillmentType || 'local_delivery_or_pickup',
    type: metadata.fulfillmentType || item?.storefrontItem?.fulfillmentType || 'local_delivery',
    details: {
      recipientName: safeString(details.recipientName || order?.billingName, 120),
      phone: safeString(details.phone, 40),
      streetAddress: safeString(details.streetAddress, 160),
      city: safeString(details.city, 80),
      state: safeString(details.state, 40),
      postalCode: safeString(details.postalCode, 24),
      pickupWindow: safeString(details.pickupWindow, 120),
      notes: safeString(details.notes, 240),
    },
  };
}

function queueItem(order, item) {
  const metadata = asObject(item?.metadata);
  const storefrontItem = item?.storefrontItem || {};
  const variant = item?.productVariant || {};
  return {
    orderId: order.id,
    orderNumber: order.orderNumber || `Order #${order.id}`,
    orderDate: order.completedAt || order.createdAt || null,
    orderItemId: item.id,
    customer: customerFromOrder(order),
    product: {
      id: item.storefrontItemId || storefrontItem.id || null,
      name: storefrontItem.name || item.name || 'Physical product',
      itemType: item.itemType || metadata.itemKind || storefrontItem.itemKind || 'physical_product',
    },
    variant: {
      id: item.productVariantId || variant.id || null,
      label: variant.label || metadata.productVariantLabel || null,
      sku: variant.sku || metadata.productVariantSku || storefrontItem.sku || null,
      stockQuantity: variant.stockQuantity ?? storefrontItem.stockQuantity ?? null,
    },
    quantity: toNumber(item.quantity, 1),
    price: toNumber(item.price),
    subtotal: toNumber(item.subtotal),
    fulfillmentStatus: itemStatus(item),
    fulfilledAt: item.fulfilledAt || null,
    fulfilledBy: item.fulfilledBy || null,
    fulfillmentNotes: item.fulfillmentNotes || metadata.fulfillmentNotes || null,
    fulfillment: fulfillmentDetails(order, item),
  };
}

function matchesSearch(item, search) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [
    item.orderNumber,
    item.customer.name,
    item.customer.email,
    item.product.name,
    item.variant.label,
    item.variant.sku,
  ].some((value) => String(value || '').toLowerCase().includes(needle));
}

export async function getAdminFulfillmentQueue({ status = 'pending_fulfillment', search = '', limit = 50 } = {}) {
  const Order = getOrder();
  const OrderItem = getOrderItem();
  const StorefrontItem = getStorefrontItem();
  const ProductVariant = getProductVariant();
  const User = getUser();

  const orders = await Order.findAll({
    where: { status: 'completed' },
    include: [
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      {
        model: OrderItem,
        as: 'orderItems',
        include: [
          { model: StorefrontItem, as: 'storefrontItem' },
          { model: ProductVariant, as: 'productVariant', required: false },
        ],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
  });

  const requestedStatus = status === 'all' ? 'all' : status;
  const items = orders
    .map(toPlain)
    .flatMap((order) => (order.orderItems || [])
      .filter(isPhysicalOrderItem)
      .map((item) => queueItem(order, item)))
    .filter((item) => requestedStatus === 'all' || item.fulfillmentStatus === requestedStatus)
    .filter((item) => matchesSearch(item, safeString(search, 120)));

  return {
    items,
    stats: {
      pending: items.filter((item) => item.fulfillmentStatus === 'pending_fulfillment').length,
      fulfilled: items.filter((item) => item.fulfillmentStatus === 'fulfilled').length,
      total: items.length,
    },
  };
}

export async function completeFulfillmentItem({ orderItemId, adminId, notes = '' } = {}) {
  const OrderItem = getOrderItem();
  const item = await OrderItem.findByPk(orderItemId);
  const plainItem = toPlain(item);

  if (!item) {
    const error = new Error('Fulfillment item not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isPhysicalOrderItem(plainItem)) {
    const error = new Error('Only physical product items require fulfillment');
    error.statusCode = 409;
    throw error;
  }

  if (itemStatus(plainItem) === 'fulfilled') {
    return { orderItemId: plainItem.id, fulfillmentStatus: 'fulfilled', alreadyFulfilled: true };
  }

  const fulfilledAt = new Date();
  const metadata = {
    ...asObject(plainItem.metadata),
    fulfillmentStatus: 'fulfilled',
    fulfilledAt: fulfilledAt.toISOString(),
    fulfilledBy: adminId || null,
    fulfillmentNotes: safeString(notes, 240) || null,
  };

  await item.update({
    fulfillmentStatus: 'fulfilled',
    fulfilledAt,
    fulfilledBy: adminId || null,
    fulfillmentNotes: safeString(notes, 240) || null,
    metadata,
  });

  return {
    orderItemId: plainItem.id,
    fulfillmentStatus: 'fulfilled',
    fulfilledAt: fulfilledAt.toISOString(),
    alreadyFulfilled: false,
  };
}
