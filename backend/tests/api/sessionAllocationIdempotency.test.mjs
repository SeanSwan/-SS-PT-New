import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Money-path safety — order-level allocation idempotency (H4/H5).
 * ============================================================================
 * INVARIANT: an order's sessions are allocated AT MOST ONCE, no matter which
 * writer fires (ACH webhook, admin apply-payment, admin status toggle, manual
 * retry) or how often it retries.
 *
 * Mechanism: paymentAppliedAt is the ALLOCATION CLAIM, taken inside the
 * allocation transaction under an Order row lock:
 *   lock order → marker set? → idempotent no-op
 *            └→ no? allocate sessions + financial record + claim marker → commit
 * Allocation and claim commit or roll back together: a crashed attempt leaves
 * NO marker and NO sessions (retry safe); a committed attempt leaves both
 * (retry is a no-op). Callers that pre-set the marker before allocating would
 * permanently suppress the grant, so applyOrderPayment must NOT pre-set it —
 * the grep contracts below pin both wiring facts.
 *
 * Behavioral harness mocks the sequelize model layer (no DB).
 */
const { mockTransaction, mockOrderModel, mockUserModel, mockSessionModel, mockFinancialTransactionModel, mockStorefrontItemModel, mockOrderItemModel } = vi.hoisted(() => {
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };
  const mockOrderModel = { findOne: vi.fn() };
  const mockUserModel = { findByPk: vi.fn() };
  const mockSessionModel = { bulkCreate: vi.fn() };
  const mockFinancialTransactionModel = { create: vi.fn() };
  const mockStorefrontItemModel = { findAll: vi.fn().mockResolvedValue([]) };
  const mockOrderItemModel = {};
  return { mockTransaction, mockOrderModel, mockUserModel, mockSessionModel, mockFinancialTransactionModel, mockStorefrontItemModel, mockOrderItemModel };
});

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: () => mockUserModel,
  getOrder: () => mockOrderModel,
  getOrderItem: () => mockOrderItemModel,
  getStorefrontItem: () => mockStorefrontItemModel,
  getSession: () => mockSessionModel,
  getFinancialTransaction: () => mockFinancialTransactionModel,
}));

import sessionAllocationService from '../../services/SessionAllocationService.mjs';

// ── Helpers ──────────────────────────────────────────────────
function makeOrder(orderId, userId, overrides = {}) {
  return {
    id: orderId,
    userId,
    orderNumber: `ORD-${orderId}`,
    status: 'completed',
    totalAmount: 2000,
    paymentMethod: 'ach',
    paymentAppliedAt: null,
    notes: null,
    orderItems: [
      { quantity: 1, storefrontItem: { id: 7, itemKind: 'training_package', sessions: 40 } },
    ],
    update: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.commit.mockResolvedValue(true);
  mockTransaction.rollback.mockResolvedValue(true);
  mockSessionModel.bulkCreate.mockImplementation(async (rows) => rows.map((r, i) => ({ id: 1000 + i, ...r })));
  mockFinancialTransactionModel.create.mockResolvedValue({ id: 1 });
});

describe('allocateSessionsFromOrder: order-level idempotency', () => {
  it('allocates and claims the marker on first call', async () => {
    const order = makeOrder(1, 100);
    mockOrderModel.findOne.mockResolvedValue(order);
    mockUserModel.findByPk.mockResolvedValue({ id: 100, firstName: 'A', lastName: 'B', availableSessions: 0 });

    const result = await sessionAllocationService.allocateSessionsFromOrder(1, 100);

    expect(result.success).toBe(true);
    expect(result.alreadyAllocated).toBeFalsy();
    expect(result.allocated).toBe(40);
    expect(mockSessionModel.bulkCreate).toHaveBeenCalledTimes(1);
    // the marker is claimed as part of the SAME transaction as the allocation
    expect(order.update).toHaveBeenCalledWith(
      expect.objectContaining({ paymentAppliedAt: expect.any(Date) }),
      expect.objectContaining({ transaction: mockTransaction })
    );
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('is a no-op on retry: marker set means already allocated, no second bulkCreate', async () => {
    const order = makeOrder(1, 100, { paymentAppliedAt: new Date('2026-09-25T10:00:00Z') });
    mockOrderModel.findOne.mockResolvedValue(order);

    const result = await sessionAllocationService.allocateSessionsFromOrder(1, 100);

    expect(result.alreadyAllocated).toBe(true);
    expect(result.allocated).toBe(0);
    expect(mockSessionModel.bulkCreate).not.toHaveBeenCalled();
    expect(mockFinancialTransactionModel.create).not.toHaveBeenCalled();
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it('rolls back and leaves the marker UNCLAIMED when allocation fails (retry safe)', async () => {
    const order = makeOrder(1, 100);
    mockOrderModel.findOne.mockResolvedValue(order);
    mockUserModel.findByPk.mockResolvedValue({ id: 100, firstName: 'A', lastName: 'B', availableSessions: 0 });
    mockSessionModel.bulkCreate.mockRejectedValue(new Error('db connection lost'));

    await expect(sessionAllocationService.allocateSessionsFromOrder(1, 100)).rejects.toThrow('Session allocation failed');

    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalled();
    expect(order.update).not.toHaveBeenCalled();
  });

  it('holds the order row lock while checking the claim (concurrent deliveries serialize)', async () => {
    const order = makeOrder(1, 100);
    mockOrderModel.findOne.mockResolvedValue(order);
    mockUserModel.findByPk.mockResolvedValue({ id: 100, firstName: 'A', lastName: 'B', availableSessions: 0 });

    await sessionAllocationService.allocateSessionsFromOrder(1, 100);

    expect(mockOrderModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: expect.objectContaining({ level: 'UPDATE' }),
        transaction: mockTransaction,
      })
    );
  });
});

describe('writer wiring: the claim belongs to the service, not the callers', () => {
  it('orderRoutes PUT /:id skips allocation when the order was already applied', () => {
    const source = readFileSync(resolve(process.cwd(), 'routes/orderRoutes.mjs'), 'utf8');
    const putStart = source.indexOf("router.put('/:id'");
    const applyPaymentStart = source.indexOf("router.post('/:id/apply-payment'");
    const putSection = source.slice(putStart, applyPaymentStart);
    // the route must consult the marker BEFORE delegating allocation
    expect(putSection).toMatch(/paymentAppliedAt/);
    expect(putSection.indexOf('paymentAppliedAt')).toBeLessThan(putSection.indexOf('allocateSessionsFromOrder'));
  });

  it('applyOrderPayment no longer pre-sets paymentAppliedAt (the service claims it inside the transaction)', () => {
    const source = readFileSync(resolve(process.cwd(), 'controllers/orderController.mjs'), 'utf8');
    const fnStart = source.indexOf('export const applyOrderPayment');
    const fnEnd = source.indexOf('export const', fnStart + 10);
    const fn = source.slice(fnStart, fnEnd);
    expect(fn).not.toMatch(/order\.paymentAppliedAt\s*=\s*new Date\(\)/);
    // attribution fields stay (the service does not write these)
    expect(fn).toMatch(/paymentAppliedBy/);
    expect(fn).toMatch(/allocateSessionsFromOrder/);
  });
});
