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

function isObjectRecord(value) {
  return value !== null && typeof value === 'object';
}

function objectOrEmpty(value) {
  return isObjectRecord(value) ? value : {};
}

function parseJsonObject(value) {
  try {
    return objectOrEmpty(JSON.parse(value));
  } catch {
    return {};
  }
}

function asObject(value) {
  if (isObjectRecord(value)) return value;
  return typeof value === 'string' ? parseJsonObject(value) : {};
}

function safeString(value, max = 240) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

function isPresent(value) {
  return value !== null && value !== undefined && value !== '';
}

function isPhysicalKind(value) {
  return value === 'physical_product';
}

function firstPresent(values, fallback = null) {
  const found = values.find(isPresent);
  return found === undefined ? fallback : found;
}

function firstText(values, max = 240) {
  return safeString(firstPresent(values, ''), max);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPhysicalOrderItem(item) {
  const record = objectOrEmpty(item);
  const metadata = asObject(record.metadata);
  const storefrontItem = objectOrEmpty(record.storefrontItem);
  const kindSignals = [record.itemType, metadata.itemKind, storefrontItem.itemKind];
  return kindSignals.some(isPhysicalKind) || Boolean(record.productVariantId);
}

function itemStatus(item) {
  const metadata = asObject(item?.metadata);
  const status = firstPresent([item?.fulfillmentStatus, metadata.fulfillmentStatus]);
  return FULFILLMENT_STATUSES.has(status) ? status : 'pending_fulfillment';
}

function fulfillmentError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertFound(item) {
  if (item) return;
  throw fulfillmentError('Fulfillment item not found', 404);
}

function assertPhysicalItem(item) {
  if (isPhysicalOrderItem(item)) return;
  throw fulfillmentError('Only physical product items require fulfillment', 409);
}

function assertCompletedOrder(item) {
  if (item?.order?.status === 'completed') return;
  throw fulfillmentError('Only completed paid orders can be fulfilled', 409);
}

function orderFulfillmentIntent(order) {
  const shippingAddress = asObject(order?.shippingAddress);
  return asObject(shippingAddress.fulfillmentIntent);
}

function userFullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

function customerFromOrder(order) {
  const record = objectOrEmpty(order);
  const user = objectOrEmpty(record.user);
  return {
    id: firstPresent([user.id, record.userId]),
    name: firstText([userFullName(user), record.billingName, 'Unknown customer'], 120),
    email: firstPresent([user.email, record.billingEmail]),
  };
}

function fulfillmentDetailPayload(order, details) {
  return {
    recipientName: firstText([details.recipientName, order?.billingName], 120),
    phone: safeString(details.phone, 40),
    streetAddress: safeString(details.streetAddress, 160),
    city: safeString(details.city, 80),
    state: safeString(details.state, 40),
    postalCode: safeString(details.postalCode, 24),
    pickupWindow: safeString(details.pickupWindow, 120),
    notes: safeString(details.notes, 240),
  };
}

function fulfillmentDetails(order, item) {
  const metadata = asObject(item?.metadata);
  const intent = orderFulfillmentIntent(order);
  const details = asObject(intent.details);
  return {
    mode: firstPresent([intent.mode, metadata.fulfillmentType], 'local_delivery_or_pickup'),
    type: firstPresent([metadata.fulfillmentType, item?.storefrontItem?.fulfillmentType], 'local_delivery'),
    details: fulfillmentDetailPayload(order, details),
  };
}

function productSnapshot(item, metadata, storefrontItem) {
  return {
    id: firstPresent([item.storefrontItemId, storefrontItem.id]),
    name: firstText([storefrontItem.name, item.name, 'Physical product'], 160),
    itemType: firstPresent([item.itemType, metadata.itemKind, storefrontItem.itemKind], 'physical_product'),
  };
}

function variantSnapshot(item, metadata, storefrontItem, variant) {
  return {
    id: firstPresent([item.productVariantId, variant.id]),
    label: firstPresent([variant.label, metadata.productVariantLabel]),
    sku: firstPresent([variant.sku, metadata.productVariantSku, storefrontItem.sku]),
    stockQuantity: firstPresent([variant.stockQuantity, storefrontItem.stockQuantity]),
  };
}

function queueItem(order, item) {
  const metadata = asObject(item?.metadata);
  const storefrontItem = objectOrEmpty(item?.storefrontItem);
  const variant = objectOrEmpty(item?.productVariant);
  return {
    orderId: order.id,
    orderNumber: firstText([order.orderNumber, `Order #${order.id}`], 80),
    orderDate: firstPresent([order.completedAt, order.createdAt]),
    orderItemId: item.id,
    customer: customerFromOrder(order),
    product: productSnapshot(item, metadata, storefrontItem),
    variant: variantSnapshot(item, metadata, storefrontItem, variant),
    quantity: toNumber(item.quantity, 1),
    price: toNumber(item.price),
    subtotal: toNumber(item.subtotal),
    fulfillmentStatus: itemStatus(item),
    fulfilledAt: firstPresent([item.fulfilledAt]),
    fulfilledBy: firstPresent([item.fulfilledBy]),
    fulfillmentNotes: firstPresent([item.fulfillmentNotes, metadata.fulfillmentNotes]),
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

function orderInclude(Order) {
  return [{ model: Order, as: 'order', attributes: ['id', 'status', 'completedAt'] }];
}

async function findFulfillmentItem(OrderItem, Order, orderItemId) {
  return OrderItem.findByPk(orderItemId, { include: orderInclude(Order) });
}

function fulfilledUpdatePayload(plainItem, { adminId, fulfilledAt, notes }) {
  const fulfillmentNotes = safeString(notes, 240) || null;
  const fulfilledBy = adminId || null;
  return {
    fulfillmentStatus: 'fulfilled',
    fulfilledAt,
    fulfilledBy,
    fulfillmentNotes,
    metadata: {
      ...asObject(plainItem.metadata),
      fulfillmentStatus: 'fulfilled',
      fulfilledAt: fulfilledAt.toISOString(),
      fulfilledBy,
      fulfillmentNotes,
    },
  };
}

function fulfilledResult(plainItem, fulfilledAt) {
  return {
    orderItemId: plainItem.id,
    fulfillmentStatus: 'fulfilled',
    fulfilledAt: fulfilledAt.toISOString(),
    alreadyFulfilled: false,
  };
}

export async function completeFulfillmentItem({ orderItemId, adminId, notes = '' } = {}) {
  const Order = getOrder();
  const OrderItem = getOrderItem();
  const item = await findFulfillmentItem(OrderItem, Order, orderItemId);

  assertFound(item);

  const plainItem = toPlain(item);

  assertPhysicalItem(plainItem);
  assertCompletedOrder(plainItem);

  if (itemStatus(plainItem) === 'fulfilled') {
    return { orderItemId: plainItem.id, fulfillmentStatus: 'fulfilled', alreadyFulfilled: true };
  }

  const fulfilledAt = new Date();
  await item.update(fulfilledUpdatePayload(plainItem, { adminId, fulfilledAt, notes }));

  return fulfilledResult(plainItem, fulfilledAt);
}
