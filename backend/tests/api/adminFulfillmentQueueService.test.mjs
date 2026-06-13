/**
 * Admin fulfillment queue service tests.
 * ============================================================
 * Locks physical-product fulfillment reads/writes after paid checkout:
 * admins need variant, inventory, pickup/delivery, and completion state.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  orderModel: { findAll: vi.fn() },
  orderItemModel: { findByPk: vi.fn() },
  storefrontItemModel: { name: 'StorefrontItem' },
  productVariantModel: { name: 'ProductVariant' },
  userModel: { name: 'User' },
}));

vi.mock('../../models/index.mjs', () => ({
  getOrder: () => mocks.orderModel,
  getOrderItem: () => mocks.orderItemModel,
  getStorefrontItem: () => mocks.storefrontItemModel,
  getProductVariant: () => mocks.productVariantModel,
  getUser: () => mocks.userModel,
}));

const {
  completeFulfillmentItem,
  getAdminFulfillmentQueue,
} = await import('../../services/adminFulfillmentQueueService.mjs');

const paidOrder = {
  id: 900,
  orderNumber: 'SS-ORDER-900',
  createdAt: '2026-06-13T12:00:00.000Z',
  billingName: 'Buyer One',
  billingEmail: 'buyer@example.com',
  shippingAddress: {
    fulfillmentIntent: {
      mode: 'local_delivery',
      details: {
        recipientName: 'Buyer One',
        phone: '555-0100',
        streetAddress: '100 Main St',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        notes: 'Front desk',
      },
    },
  },
  user: { id: 11, firstName: 'Buyer', lastName: 'One', email: 'buyer@example.com' },
  orderItems: [
    {
      id: 70,
      itemType: 'training_package',
      name: '10-Session Pack',
      quantity: 1,
      price: '175.00',
      subtotal: '175.00',
      metadata: { itemKind: 'training_package', fulfillmentStatus: 'not_required' },
      storefrontItem: { id: 1, name: '10-Session Pack', itemKind: 'training_package' },
    },
    {
      id: 71,
      itemType: 'physical_product',
      name: 'Recovery Drink - 16oz',
      quantity: 2,
      price: '6.50',
      subtotal: '13.00',
      productVariantId: 7,
      fulfillmentStatus: 'pending_fulfillment',
      metadata: {
        itemKind: 'physical_product',
        fulfillmentType: 'local_delivery',
        fulfillmentStatus: 'pending_fulfillment',
        productVariantLabel: '16oz',
        productVariantSku: 'DRINK-16',
      },
      storefrontItem: {
        id: 20,
        name: 'Recovery Drink',
        itemKind: 'physical_product',
        fulfillmentType: 'local_delivery',
      },
      productVariant: {
        id: 7,
        label: '16oz',
        sku: 'DRINK-16',
        stockQuantity: 10,
      },
    },
  ],
};

describe('admin fulfillment queue service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paid physical-product order items with variant, inventory, and delivery details', async () => {
    mocks.orderModel.findAll.mockResolvedValue([paidOrder]);

    const result = await getAdminFulfillmentQueue({ status: 'pending_fulfillment' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      orderId: 900,
      orderNumber: 'SS-ORDER-900',
      orderItemId: 71,
      fulfillmentStatus: 'pending_fulfillment',
      product: { name: 'Recovery Drink', itemType: 'physical_product' },
      variant: { id: 7, label: '16oz', sku: 'DRINK-16', stockQuantity: 10 },
      fulfillment: {
        mode: 'local_delivery',
        type: 'local_delivery',
        details: expect.objectContaining({
          streetAddress: '100 Main St',
          notes: 'Front desk',
        }),
      },
    });
    expect(result.stats).toMatchObject({
      pending: 1,
      fulfilled: 0,
      total: 1,
    });
  });

  it('marks one physical product order item fulfilled without leaking service internals', async () => {
    const update = vi.fn().mockResolvedValue(true);
    mocks.orderItemModel.findByPk.mockResolvedValue({
      id: 71,
      itemType: 'physical_product',
      fulfillmentStatus: 'pending_fulfillment',
      metadata: { itemKind: 'physical_product', fulfillmentStatus: 'pending_fulfillment' },
      update,
    });

    const result = await completeFulfillmentItem({
      orderItemId: 71,
      adminId: 5,
      notes: 'Delivered to front desk',
    });

    expect(result).toMatchObject({ orderItemId: 71, fulfillmentStatus: 'fulfilled' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      fulfillmentStatus: 'fulfilled',
      fulfilledBy: 5,
      fulfillmentNotes: 'Delivered to front desk',
      metadata: expect.objectContaining({
        fulfillmentStatus: 'fulfilled',
        fulfilledBy: 5,
      }),
    }));
  });
});
