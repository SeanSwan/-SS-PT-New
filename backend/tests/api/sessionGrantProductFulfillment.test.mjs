/**
 * SessionGrantService product fulfillment tests.
 * ============================================================
 * Locks the shared Stripe fulfillment path for mixed carts:
 * training items grant sessions, physical products become order items, and
 * tracked variants decrement inventory exactly once through the cart lock.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };

  return {
    transaction,
    shoppingCart: { name: 'ShoppingCart', findOne: vi.fn() },
    cartItem: { name: 'CartItem' },
    storefrontItem: { name: 'StorefrontItem' },
    productVariant: { name: 'ProductVariant' },
    userModel: { findByPk: vi.fn() },
    orderModel: {
      findOne: vi.fn(),
      create: vi.fn(),
    },
    orderItemModel: {
      bulkCreate: vi.fn(),
    },
  };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mocks.transaction),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/orderNumber.mjs', () => ({
  generateSwanOrderNumber: () => 'SS-TEST-000001',
}));

vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => mocks.shoppingCart,
  getCartItem: () => mocks.cartItem,
  getStorefrontItem: () => mocks.storefrontItem,
  getProductVariant: () => mocks.productVariant,
  getUser: () => mocks.userModel,
  getOrder: () => mocks.orderModel,
  getOrderItem: () => mocks.orderItemModel,
}));

const { grantSessionsForCart } = await import('../../services/SessionGrantService.mjs');

function makeUser() {
  return {
    id: 55,
    role: 'user',
    clientSource: 'swanstudios',
    increment: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(true),
  };
}

function makeMixedCart() {
  const variantDecrement = vi.fn().mockResolvedValue(true);
  const variantReload = vi.fn(function reloadVariant() {
    return Promise.resolve(this);
  });

  return {
    id: 700,
    userId: 55,
    status: 'pending_payment',
    paymentStatus: 'pending',
    sessionsGranted: false,
    checkoutSessionId: 'cs_test_mixed',
    paymentIntentId: 'pi_test_mixed',
    total: '188.00',
    customerInfo: JSON.stringify({
      name: 'Store Buyer',
      email: 'buyer@example.com',
      phone: '555-0100',
      fulfillmentIntent: {
        required: true,
        mode: 'local_delivery_or_pickup',
        itemCount: 1,
        fulfillmentTypes: ['local_delivery'],
      },
    }),
    cartItems: [
      {
        id: 1,
        storefrontItemId: 10,
        productVariantId: null,
        quantity: 1,
        price: '175.00',
        storefrontItem: {
          id: 10,
          name: '10-Session Pack',
          description: 'Training package',
          itemKind: 'training_package',
          packageType: 'fixed',
          sessions: 10,
          totalSessions: null,
          imageUrl: '/pack.png',
        },
      },
      {
        id: 2,
        storefrontItemId: 20,
        productVariantId: 7,
        quantity: 2,
        price: '6.50',
        storefrontItem: {
          id: 20,
          name: 'Recovery Drink',
          description: 'Local product',
          itemKind: 'physical_product',
          fulfillmentType: 'local_delivery',
          sessions: null,
          totalSessions: null,
          imageUrl: '/drink.png',
        },
        productVariant: {
          id: 7,
          label: '16oz',
          sku: 'DRINK-16',
          stockQuantity: 12,
          reload: variantReload,
          decrement: variantDecrement,
        },
      },
    ],
    update: vi.fn().mockResolvedValue(true),
    variantDecrement,
    variantReload,
  };
}

describe('SessionGrantService product fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.commit.mockResolvedValue(true);
    mocks.transaction.rollback.mockResolvedValue(true);
    mocks.orderModel.findOne.mockResolvedValue(null);
    mocks.orderModel.create.mockResolvedValue({ id: 900, orderNumber: 'SS-TEST-000001' });
    mocks.orderItemModel.bulkCreate.mockResolvedValue([]);
  });

  it('creates variant-aware order items and decrements product inventory while granting only training sessions', async () => {
    const cart = makeMixedCart();
    const user = makeUser();
    mocks.shoppingCart.findOne.mockResolvedValue(cart);
    mocks.userModel.findByPk.mockResolvedValue(user);

    const result = await grantSessionsForCart(cart.id, user.id, 'webhook');

    expect(result).toMatchObject({
      granted: true,
      sessionsAdded: 10,
      alreadyProcessed: false,
      productItemsFulfilled: 1,
    });
    expect(user.increment).toHaveBeenCalledWith('availableSessions', {
      by: 10,
      transaction: mocks.transaction,
    });
    expect(mocks.orderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 55,
        cartId: 700,
        orderNumber: 'SS-TEST-000001',
        totalAmount: 188,
        status: 'completed',
        paymentMethod: 'stripe',
        paymentId: 'pi_test_mixed',
        billingEmail: 'buyer@example.com',
        billingName: 'Store Buyer',
        idempotencyKey: 'cart-fulfillment:700',
      }),
      { transaction: mocks.transaction },
    );
    expect(mocks.orderItemModel.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: 900,
          storefrontItemId: 20,
          productVariantId: 7,
          name: 'Recovery Drink - 16oz',
          quantity: 2,
          price: 6.5,
          subtotal: 13,
          itemType: 'physical_product',
          fulfillmentStatus: 'pending_fulfillment',
          metadata: expect.objectContaining({
            fulfillmentStatus: 'pending_fulfillment',
            productVariantLabel: '16oz',
            productVariantSku: 'DRINK-16',
          }),
        }),
      ]),
      { transaction: mocks.transaction },
    );
    expect(cart.variantReload).toHaveBeenCalledWith({
      transaction: mocks.transaction,
      lock: mocks.transaction.LOCK.UPDATE,
    });
    expect(cart.variantDecrement).toHaveBeenCalledWith('stockQuantity', {
      by: 2,
      transaction: mocks.transaction,
    });
  });

  it('does not create duplicate order items or decrement stock for an already-processed cart', async () => {
    const cart = makeMixedCart();
    cart.sessionsGranted = true;
    mocks.shoppingCart.findOne.mockResolvedValue(cart);

    const result = await grantSessionsForCart(cart.id, cart.userId, 'verify-session');

    expect(result).toMatchObject({
      granted: false,
      sessionsAdded: 0,
      alreadyProcessed: true,
    });
    expect(mocks.orderModel.create).not.toHaveBeenCalled();
    expect(mocks.orderItemModel.bulkCreate).not.toHaveBeenCalled();
    expect(cart.variantDecrement).not.toHaveBeenCalled();
  });

  it('rolls back instead of decrementing tracked variant stock below zero', async () => {
    const cart = makeMixedCart();
    cart.cartItems[1].quantity = 13;
    mocks.shoppingCart.findOne.mockResolvedValue(cart);
    mocks.userModel.findByPk.mockResolvedValue(makeUser());

    await expect(grantSessionsForCart(cart.id, cart.userId, 'verify-session'))
      .rejects.toThrow('Insufficient stock');

    expect(cart.variantDecrement).not.toHaveBeenCalled();
    expect(cart.update).not.toHaveBeenCalled();
    expect(mocks.transaction.commit).not.toHaveBeenCalled();
    expect(mocks.transaction.rollback).toHaveBeenCalled();
  });

  it('does not decrement untracked physical-product inventory', async () => {
    const cart = makeMixedCart();
    cart.cartItems[1].productVariant.stockQuantity = null;
    mocks.shoppingCart.findOne.mockResolvedValue(cart);
    mocks.userModel.findByPk.mockResolvedValue(makeUser());

    const result = await grantSessionsForCart(cart.id, cart.userId, 'verify-session');

    expect(result).toMatchObject({
      granted: true,
      alreadyProcessed: false,
      productItemsFulfilled: 1,
    });
    expect(cart.variantDecrement).not.toHaveBeenCalled();
    expect(cart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        paymentStatus: 'paid',
        sessionsGranted: true,
      }),
      { transaction: mocks.transaction },
    );
  });
});
