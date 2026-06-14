/**
 * checkoutReceiptSummaryService.mjs
 * ============================================================
 * Builds customer-safe checkout receipt fulfillment summaries from the paid
 * Order/OrderItem records created after Stripe checkout succeeds.
 */

import {
  getOrder,
  getOrderItem,
  getProductVariant,
  getStorefrontItem,
} from '../models/index.mjs';

const NO_FULFILLMENT_SUMMARY = {
  orderId: null,
  orderNumber: null,
  fulfillment: {
    required: false,
    mode: 'none',
    status: 'not_required',
    details: {},
    items: [],
  },
};

const toPlain = (record) => (typeof record?.toJSON === 'function' ? record.toJSON() : record);

const isObjectRecord = (value) => value !== null && typeof value === 'object';

const asObject = (value) => (isObjectRecord(value) ? value : {});

const safeString = (value, max = 240) => (
  value === null || value === undefined ? '' : String(value).trim().slice(0, max)
);

const firstPresent = (values, fallback = null) => {
  const found = values.find((value) => value !== null && value !== undefined && value !== '');
  return found === undefined ? fallback : found;
};

const firstText = (values, max = 240) => safeString(firstPresent(values, ''), max);

const isPhysicalOrderItem = (item) => {
  const metadata = asObject(item?.metadata);
  const storefrontItem = asObject(item?.storefrontItem);
  return [
    item?.itemType,
    metadata.itemKind,
    storefrontItem.itemKind,
  ].includes('physical_product') || Boolean(item?.productVariantId);
};

const fulfillmentIntentFromOrder = (order) => {
  const shippingAddress = asObject(order?.shippingAddress);
  return asObject(shippingAddress.fulfillmentIntent || shippingAddress);
};

const fulfillmentDetailsFromOrder = (order) => {
  const intent = fulfillmentIntentFromOrder(order);
  const details = asObject(intent.details || asObject(order?.shippingAddress).details);
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
};

const physicalItemSummary = (item) => {
  const metadata = asObject(item?.metadata);
  const storefrontItem = asObject(item?.storefrontItem);
  const productVariant = asObject(item?.productVariant);
  return {
    orderItemId: item.id,
    productName: firstText([storefrontItem.name, item.name, 'Physical product'], 160),
    variantLabel: firstPresent([productVariant.label, metadata.productVariantLabel]),
    sku: firstPresent([productVariant.sku, metadata.productVariantSku, storefrontItem.sku]),
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    fulfillmentStatus: firstPresent([
      item.fulfillmentStatus,
      metadata.fulfillmentStatus,
    ], 'pending_fulfillment'),
    fulfilledAt: firstPresent([item.fulfilledAt, metadata.fulfilledAt]),
  };
};

const receiptFulfillmentStatus = (items) => {
  if (!items.length) return 'not_required';
  return items.every((item) => item.fulfillmentStatus === 'fulfilled')
    ? 'fulfilled'
    : 'pending_fulfillment';
};

export function buildCheckoutReceiptSummaryFromOrder(orderRecord) {
  const order = toPlain(orderRecord);
  if (!order) return NO_FULFILLMENT_SUMMARY;

  const items = (order.orderItems || [])
    .map(toPlain)
    .filter(isPhysicalOrderItem)
    .map(physicalItemSummary);
  const intent = fulfillmentIntentFromOrder(order);

  return {
    orderId: order.id || null,
    orderNumber: firstPresent([order.orderNumber]),
    fulfillment: {
      required: items.length > 0,
      mode: items.length > 0 ? firstPresent([intent.mode], 'local_delivery_or_pickup') : 'none',
      status: receiptFulfillmentStatus(items),
      details: items.length > 0 ? fulfillmentDetailsFromOrder(order) : {},
      items,
    },
  };
}

export async function getCheckoutReceiptSummary({ cartId, userId } = {}) {
  const Order = getOrder();
  const OrderItem = getOrderItem();
  const StorefrontItem = getStorefrontItem();
  const ProductVariant = getProductVariant();

  const order = await Order.findOne({
    where: { cartId, userId },
    include: [{
      model: OrderItem,
      as: 'orderItems',
      include: [
        { model: StorefrontItem, as: 'storefrontItem' },
        { model: ProductVariant, as: 'productVariant', required: false },
      ],
    }],
    order: [['createdAt', 'DESC']],
  });

  return buildCheckoutReceiptSummaryFromOrder(order);
}
