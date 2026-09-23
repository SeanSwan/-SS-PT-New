import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * E-04 behavioural tests — refundReconciliationService.
 * Policy under test (deliberately conservative, documented in the service):
 * full refund revokes only UNCONSUMED sessions (floor 0, no claw-back);
 * partial refunds never move sessions and are flagged for admin review;
 * everything is idempotent under Stripe webhook retries.
 */

const mocks = vi.hoisted(() => {
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
  };
  return {
    transaction,
    sequelize: {
      transaction: vi.fn(async () => transaction),
      models: {},
    },
    cartModel: {
      findOne: vi.fn(),
      findByPk: vi.fn(),
    },
    userModel: {
      findByPk: vi.fn(),
    },
    ftModel: {
      create: vi.fn(async (row) => row),
      findOne: vi.fn(async () => null),
    },
    orderModel: {
      update: vi.fn(async () => [1]),
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

vi.mock('../../database.mjs', () => ({ default: mocks.sequelize }));
vi.mock('../../models/index.mjs', () => ({
  getShoppingCart: () => mocks.cartModel,
  getUser: () => mocks.userModel,
}));
vi.mock('../../utils/logger.mjs', () => ({ default: mocks.logger }));

const { reconcileRefundedCharge } = await import('../../services/refundReconciliationService.mjs');

function makeCharge(overrides = {}) {
  return {
    id: 'ch_test_1',
    payment_intent: 'pi_test_1',
    amount: 80000,           // $800.00
    amount_refunded: 80000,  // full
    currency: 'usd',
    ...overrides,
  };
}

function makeCart(overrides = {}) {
  return {
    id: 42,
    userId: 7,
    paymentIntentId: 'pi_test_1',
    paymentStatus: 'paid',
    stripeSessionData: JSON.stringify({ sessionsAdded: 10, orderId: 555 }),
    update: vi.fn(async function (fields) { Object.assign(this, fields); }),
    ...overrides,
  };
}

describe('reconcileRefundedCharge (E-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sequelize.models = { FinancialTransaction: mocks.ftModel, Order: mocks.orderModel };
    mocks.transaction.commit.mockClear();
    mocks.transaction.rollback.mockClear();
  });

  it('ignores charges without a payment_intent', async () => {
    const result = await reconcileRefundedCharge(makeCharge({ payment_intent: null }));
    expect(result).toEqual({ processed: false, reason: 'no_payment_intent' });
    expect(mocks.cartModel.findOne).not.toHaveBeenCalled();
  });

  it('writes an audit row and touches nothing when no storefront cart matches', async () => {
    mocks.cartModel.findOne.mockResolvedValue(null);
    const result = await reconcileRefundedCharge(makeCharge());
    expect(result.processed).toBe(true);
    expect(result.reason).toBe('no_cart');
    expect(result.sessionsRevoked).toBe(0);
    expect(mocks.ftModel.create).toHaveBeenCalledTimes(1);
    expect(mocks.ftModel.create.mock.calls[0][0].status).toBe('refunded');
    expect(mocks.ftModel.create.mock.calls[0][0].amount).toBe(800);
  });

  it('full refund revokes only the UNCONSUMED remainder (floor 0, no claw-back)', async () => {
    const cart = makeCart();
    const user = { id: 7, availableSessions: 7, decrement: vi.fn(async () => {}) };
    mocks.cartModel.findOne.mockResolvedValue(cart);
    mocks.cartModel.findByPk.mockResolvedValue(cart);
    mocks.userModel.findByPk.mockResolvedValue(user);

    const result = await reconcileRefundedCharge(makeCharge());

    expect(result.sessionsRevoked).toBe(7); // 10 granted, 3 already consumed — not clawed back
    expect(user.decrement).toHaveBeenCalledWith('availableSessions', { by: 7, transaction: mocks.transaction });
    expect(cart.update).toHaveBeenCalledWith({ paymentStatus: 'refunded' }, { transaction: mocks.transaction });
    expect(mocks.orderModel.update).toHaveBeenCalledWith({ status: 'refunded' }, { where: { id: 555 }, transaction: mocks.transaction });
    expect(mocks.ftModel.create).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.rollback).not.toHaveBeenCalled();
  });

  it('full refund with all sessions consumed revokes zero and flags review', async () => {
    const cart = makeCart();
    const user = { id: 7, availableSessions: 0, decrement: vi.fn(async () => {}) };
    mocks.cartModel.findOne.mockResolvedValue(cart);
    mocks.cartModel.findByPk.mockResolvedValue(cart);
    mocks.userModel.findByPk.mockResolvedValue(user);

    const result = await reconcileRefundedCharge(makeCharge());

    expect(result.sessionsRevoked).toBe(0);
    expect(user.decrement).not.toHaveBeenCalled();
    const audit = mocks.ftModel.create.mock.calls[0][0];
    expect(audit.status).toBe('refunded');
    expect(JSON.parse(audit.metadata).needsAdminReview).toBe(true);
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: a replayed full-refund webhook is a no-op', async () => {
    const cart = makeCart({ paymentStatus: 'refunded' });
    mocks.cartModel.findOne.mockResolvedValue(cart);
    mocks.cartModel.findByPk.mockResolvedValue(cart);

    const result = await reconcileRefundedCharge(makeCharge());

    expect(result.alreadyProcessed).toBe(true);
    expect(result.sessionsRevoked).toBe(0);
    expect(mocks.userModel.findByPk).not.toHaveBeenCalled();
    expect(mocks.ftModel.create).not.toHaveBeenCalled();
  });

  it('partial refund moves NO sessions and flags admin review', async () => {
    const cart = makeCart();
    mocks.cartModel.findOne.mockResolvedValue(cart);
    mocks.cartModel.findByPk.mockResolvedValue(cart);

    const result = await reconcileRefundedCharge(makeCharge({ amount_refunded: 20000 }));

    expect(result.needsReview).toBe(true);
    expect(result.sessionsRevoked).toBe(0);
    expect(mocks.userModel.findByPk).not.toHaveBeenCalled();
    expect(cart.update).not.toHaveBeenCalled();
    expect(mocks.orderModel.update).not.toHaveBeenCalled();
    const audit = mocks.ftModel.create.mock.calls[0][0];
    expect(audit.status).toBe('partially_refunded');
    expect(JSON.parse(audit.metadata).needsAdminReview).toBe(true);
  });

  it('partial-refund replay does not duplicate the audit row', async () => {
    const cart = makeCart();
    mocks.cartModel.findOne.mockResolvedValue(cart);
    mocks.cartModel.findByPk.mockResolvedValue(cart);
    mocks.ftModel.findOne.mockResolvedValue({ id: 1 }); // existing partial audit row

    await reconcileRefundedCharge(makeCharge({ amount_refunded: 20000 }));

    expect(mocks.ftModel.create).not.toHaveBeenCalled();
    expect(mocks.transaction.commit).toHaveBeenCalledTimes(1);
  });

  it('rolls back and rethrows on database failure so Stripe retries', async () => {
    mocks.cartModel.findOne.mockRejectedValue(new Error('connection lost'));
    await expect(reconcileRefundedCharge(makeCharge())).rejects.toThrow('connection lost');
  });

  it('rolls back the transaction when an in-transaction write fails', async () => {
    const cart = makeCart();
    mocks.cartModel.findOne.mockResolvedValue(cart);
    mocks.cartModel.findByPk.mockResolvedValue(cart);
    mocks.userModel.findByPk.mockRejectedValue(new Error('lock timeout'));

    await expect(reconcileRefundedCharge(makeCharge())).rejects.toThrow('lock timeout');
    expect(mocks.transaction.rollback).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.commit).not.toHaveBeenCalled();
  });
});
