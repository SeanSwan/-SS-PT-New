/**
 * Session Deduction Service Tests
 * ================================
 * Targeted tests for payment recovery endpoints:
 * - getClientsNeedingPayment
 * - getClientLastPackage
 * - applyPackagePayment (including inactive package guard)
 * - processSessionDeductions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUsers, testPackages } from '../fixtures/testData.mjs';

// ── Hoisted mocks ──────────────────────────────────────────
const {
  mockTransaction,
  mockUserModel,
  mockSessionModel,
  mockSequelize,
} = vi.hoisted(() => {
  const mockTransaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
  };

  const mockUserModel = {
    findAll: vi.fn(),
    findByPk: vi.fn(),
  };

  const mockSessionModel = {
    findAll: vi.fn(),
  };

  const mockSequelize = {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
    models: {},
  };

  return { mockTransaction, mockUserModel, mockSessionModel, mockSequelize };
});

vi.mock('../../database.mjs', () => ({
  default: mockSequelize,
}));

vi.mock('../../models/index.mjs', () => ({
  getSession: () => mockSessionModel,
  getUser: () => mockUserModel,
  Op: {
    in: Symbol('in'),
    lt: Symbol('lt'),
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    not: Symbol('not'),
  },
}));

import {
  getClientsNeedingPayment,
  getClientLastPackage,
  applyPackagePayment,
  applyPaymentCredits,
  processSessionDeductions,
} from '../../services/sessionDeductionService.mjs';

// ── Helpers ──────────────────────────────────────────────────
function makeClient(id, overrides = {}) {
  return {
    id,
    firstName: 'Test',
    lastName: `Client${id}`,
    email: `client${id}@test.com`,
    phone: '555-0100',
    role: 'client',
    availableSessions: 0,
    clientSessions: [],
    save: vi.fn().mockResolvedValue(true),
    increment: vi.fn().mockResolvedValue(true),
    decrement: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeSession(id, overrides = {}) {
  return {
    id,
    userId: 3,
    status: 'scheduled',
    sessionDate: new Date(Date.now() + 86400000),
    sessionDeducted: false,
    isBlocked: false,
    notes: '',
    client: makeClient(3, { availableSessions: 5 }),
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeStorefrontItem(overrides = {}) {
  return {
    id: 1,
    name: '10-Pack Training Sessions',
    description: 'Test package',
    sessions: 10,
    totalSessions: 10,
    pricePerSession: 175,
    totalCost: 1750,
    price: 1750,
    packageType: 'fixed',
    isActive: true,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────
describe('SessionDeductionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.commit.mockResolvedValue(true);
    mockTransaction.rollback.mockResolvedValue(true);
    // Reset sequelize.models
    mockSequelize.models = {};
  });

  // ═══════════════════════════════════════════════════════════
  // getClientsNeedingPayment
  // ═══════════════════════════════════════════════════════════
  describe('getClientsNeedingPayment', () => {
    it('returns clients with 0 sessions and upcoming bookings', async () => {
      const futureSession = {
        id: 10,
        sessionDate: new Date(Date.now() + 86400000),
        status: 'scheduled',
      };
      const client = makeClient(4, {
        availableSessions: 0,
        clientSessions: [futureSession],
      });
      mockUserModel.findAll.mockResolvedValue([client]);

      const result = await getClientsNeedingPayment();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
      expect(result[0].name).toBe('Test Client4');
      expect(result[0].upcomingSessions).toBe(1);
      expect(result[0].nextSession).toEqual(futureSession.sessionDate);
    });

    it('returns empty array when no clients need payment', async () => {
      mockUserModel.findAll.mockResolvedValue([]);

      const result = await getClientsNeedingPayment();
      expect(result).toEqual([]);
    });

    it('includes both client and user roles in query', async () => {
      mockUserModel.findAll.mockResolvedValue([]);

      await getClientsNeedingPayment();

      // Verify the where clause includes a role filter (not just 'client')
      const callArgs = mockUserModel.findAll.mock.calls[0][0];
      const roleFilter = callArgs.where.role;
      // Role should be an object (Op.in filter), not a plain string
      expect(typeof roleFilter).toBe('object');
      expect(roleFilter).not.toBe('client');
      // Verify the filter contains both 'client' and 'user' via symbol key
      const symbolKeys = Object.getOwnPropertySymbols(roleFilter);
      expect(symbolKeys).toHaveLength(1);
      const filterValues = roleFilter[symbolKeys[0]];
      expect(filterValues).toEqual(['client', 'user']);
    });

    it('orders sessions by date ascending for reliable nextSession', async () => {
      mockUserModel.findAll.mockResolvedValue([]);

      await getClientsNeedingPayment();

      const callArgs = mockUserModel.findAll.mock.calls[0][0];
      expect(callArgs.order).toBeDefined();
      // Verify order includes sessionDate ASC
      const orderEntry = callArgs.order[0];
      expect(orderEntry).toContain('sessionDate');
      expect(orderEntry).toContain('ASC');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getClientLastPackage
  // ═══════════════════════════════════════════════════════════
  describe('getClientLastPackage', () => {
    it('returns null when Order model is not available', async () => {
      mockSequelize.models = {};

      const result = await getClientLastPackage(4);
      expect(result).toBeNull();
    });

    it('returns null when no completed orders exist', async () => {
      const mockOrderModel = {
        findOne: vi.fn().mockResolvedValue(null),
      };
      mockSequelize.models = {
        Order: mockOrderModel,
        OrderItem: {},
        StorefrontItem: {},
      };

      const result = await getClientLastPackage(4);

      expect(result).toBeNull();
      expect(mockOrderModel.findOne).toHaveBeenCalled();
      // Verify status: 'completed' filter
      const where = mockOrderModel.findOne.mock.calls[0][0].where;
      expect(where.status).toBe('completed');
    });

    it('returns package info from last completed order', async () => {
      const pkg = makeStorefrontItem();
      const mockOrderModel = {
        findOne: vi.fn().mockResolvedValue({
          id: 100,
          orderItems: [{ storefrontItem: pkg }],
        }),
      };
      mockSequelize.models = {
        Order: mockOrderModel,
        OrderItem: {},
        StorefrontItem: {},
      };

      const result = await getClientLastPackage(4);

      expect(result).not.toBeNull();
      expect(result.packageId).toBe(1);
      expect(result.packageName).toBe('10-Pack Training Sessions');
      expect(result.sessions).toBe(10);
      expect(result.price).toBe(1750);
      expect(result.orderId).toBe(100);
    });

    it('uses orderItems alias (not items)', async () => {
      const mockOrderModel = {
        findOne: vi.fn().mockResolvedValue(null),
      };
      mockSequelize.models = {
        Order: mockOrderModel,
        OrderItem: {},
        StorefrontItem: {},
      };

      await getClientLastPackage(4);

      const include = mockOrderModel.findOne.mock.calls[0][0].include[0];
      expect(include.as).toBe('orderItems');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // applyPackagePayment
  // ═══════════════════════════════════════════════════════════
  describe('applyPackagePayment', () => {
    const baseParams = {
      clientId: 4,
      storefrontItemId: 1,
      paymentMethod: 'cash',
      paymentReference: 'CASH-001',
      adminNotes: 'Test recovery',
      adminUserId: 1,
    };

    it('throws when required models are missing', async () => {
      mockSequelize.models = {};

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'Required models'
      );
    });

    it('throws when ShoppingCart model is missing', async () => {
      mockSequelize.models = {
        Order: {},
        StorefrontItem: {},
        // ShoppingCart intentionally missing
      };

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'Required models (Order, StorefrontItem, ShoppingCart) not available'
      );
    });

    it('throws when client is not found', async () => {
      const pkg = makeStorefrontItem();
      mockSequelize.models = {
        Order: { create: vi.fn() },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };
      mockUserModel.findByPk.mockResolvedValue(null);

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'Client not found'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('rejects non-client/user roles', async () => {
      const trainerUser = makeClient(2, { role: 'trainer' });
      mockUserModel.findByPk.mockResolvedValue(trainerUser);
      mockSequelize.models = {
        Order: { create: vi.fn() },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(makeStorefrontItem()) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'User is not a client or user'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('rejects inactive packages', async () => {
      const client = makeClient(4);
      const inactivePkg = makeStorefrontItem({ isActive: false });
      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn(), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(inactivePkg) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'Package is inactive and cannot be applied'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('rejects packages with zero sessions', async () => {
      const client = makeClient(4);
      const zeroPkg = makeStorefrontItem({ sessions: 0, totalSessions: 0 });
      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn(), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(zeroPkg) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'Package has no sessions to grant'
      );
    });

    it('creates full audit trail and grants sessions on success', async () => {
      const client = makeClient(4, { availableSessions: 2 });
      const pkg = makeStorefrontItem();
      const mockOrder = { id: 50 };
      const mockCart = { id: 99 };

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn().mockResolvedValue(mockOrder), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn().mockResolvedValue({}) },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue(mockCart) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      const result = await applyPackagePayment(baseParams);

      // Verify result shape
      expect(result.orderId).toBe(50);
      expect(result.sessionsAdded).toBe(10);
      expect(result.previousBalance).toBe(2);
      expect(result.newBalance).toBe(12);
      expect(result.packageName).toBe('10-Pack Training Sessions');
      expect(result.totalAmount).toBe(1750);

      // Verify all records were created
      expect(mockSequelize.models.ShoppingCart.create).toHaveBeenCalledTimes(1);
      expect(mockSequelize.models.Order.create).toHaveBeenCalledTimes(1);
      expect(mockSequelize.models.OrderItem.create).toHaveBeenCalledTimes(1);
      expect(mockSequelize.models.FinancialTransaction.create).toHaveBeenCalledTimes(1);

      // Verify session increment
      expect(client.increment).toHaveBeenCalledWith('availableSessions', {
        by: 10,
        transaction: mockTransaction,
      });

      // Verify transaction committed (not rolled back)
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it('upgrades user role to client on purchase', async () => {
      const userRoleClient = makeClient(5, { role: 'user' });
      const pkg = makeStorefrontItem();

      mockUserModel.findByPk.mockResolvedValue(userRoleClient);
      mockSequelize.models = {
        Order: { create: vi.fn().mockResolvedValue({ id: 51 }), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn().mockResolvedValue({}) },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue({ id: 100 }) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      await applyPackagePayment({ ...baseParams, clientId: 5 });

      expect(userRoleClient.role).toBe('client');
      expect(userRoleClient.save).toHaveBeenCalled();
    });

    it('does not call save for role upgrade if already client', async () => {
      const client = makeClient(4, { role: 'client' });
      const pkg = makeStorefrontItem();

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn().mockResolvedValue({ id: 52 }), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn().mockResolvedValue({}) },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue({ id: 101 }) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      await applyPackagePayment(baseParams);

      // save should NOT be called for role upgrade (role is already 'client')
      expect(client.save).not.toHaveBeenCalled();
    });

    it('rejects duplicate payment within 60-second window', async () => {
      const client = makeClient(4);
      const pkg = makeStorefrontItem();
      const recentOrder = {
        id: 99,
        orderNumber: 'REC-EXISTING-ABCD',
        completedAt: new Date(Date.now() - 10000), // 10 seconds ago
      };

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn(), findOne: vi.fn().mockResolvedValue(recentOrder) },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };

      await expect(applyPackagePayment(baseParams)).rejects.toThrow(
        'Duplicate payment detected'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
      // Should NOT have created any records
      expect(mockSequelize.models.Order.create).not.toHaveBeenCalled();
      expect(mockSequelize.models.ShoppingCart.create).not.toHaveBeenCalled();
    });

    it('OrderItem.metadata is a plain object (not JSON.stringify)', async () => {
      const client = makeClient(4);
      const pkg = makeStorefrontItem();

      mockUserModel.findByPk.mockResolvedValue(client);
      const orderItemCreate = vi.fn().mockResolvedValue({});
      mockSequelize.models = {
        Order: { create: vi.fn().mockResolvedValue({ id: 53 }), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: orderItemCreate },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue({ id: 102 }) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      await applyPackagePayment(baseParams);

      const createArgs = orderItemCreate.mock.calls[0][0];
      expect(typeof createArgs.metadata).toBe('object');
      expect(typeof createArgs.metadata).not.toBe('string');
      expect(createArgs.metadata.sessionsGranted).toBe(10);
      expect(createArgs.metadata.adminRecovery).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // applyPaymentCredits (legacy manual mode)
  // ═══════════════════════════════════════════════════════════
  describe('applyPaymentCredits', () => {
    it('accepts both client and user roles', async () => {
      const userClient = makeClient(5, { role: 'user', availableSessions: 0 });
      mockUserModel.findByPk.mockResolvedValue(userClient);

      const result = await applyPaymentCredits(5, 10, 'manual test');

      expect(result.creditsAdded).toBe(10);
      expect(result.previousCredits).toBe(0);
      expect(result.newBalance).toBe(10);
      expect(userClient.increment).toHaveBeenCalledWith('availableSessions', {
        by: 10,
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('rejects trainer role', async () => {
      const trainer = makeClient(2, { role: 'trainer' });
      mockUserModel.findByPk.mockResolvedValue(trainer);

      await expect(applyPaymentCredits(2, 5)).rejects.toThrow(
        'User is not a client or user'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('uses atomic increment with row lock (not read-modify-write)', async () => {
      const client = makeClient(4, { availableSessions: 3 });
      mockUserModel.findByPk.mockResolvedValue(client);

      await applyPaymentCredits(4, 7);

      // Should use findByPk with lock
      expect(mockUserModel.findByPk).toHaveBeenCalledWith(4, {
        lock: mockTransaction.LOCK.UPDATE,
        transaction: mockTransaction,
      });
      // Should use atomic increment, not manual save
      expect(client.increment).toHaveBeenCalledWith('availableSessions', {
        by: 7,
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('rolls back on error', async () => {
      mockUserModel.findByPk.mockResolvedValue(null);

      await expect(applyPaymentCredits(999, 5)).rejects.toThrow('Client not found');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // processSessionDeductions
  // ═══════════════════════════════════════════════════════════
  describe('processSessionDeductions', () => {
    it('deducts credits from eligible past sessions', async () => {
      const client = makeClient(3, { availableSessions: 5 });
      const session = makeSession(1, {
        sessionDate: new Date(Date.now() - 86400000), // yesterday
        client,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      // Refetch with row lock returns the real client
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(1);
      expect(result.deducted).toBe(1);
      expect(session.status).toBe('completed');
      expect(session.sessionDeducted).toBe(true);
      // Uses atomic decrement instead of manual -= 1
      expect(client.decrement).toHaveBeenCalledWith('availableSessions', {
        by: 1,
        transaction: mockTransaction,
      });
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('marks session completed but tracks no-credit clients', async () => {
      const client = makeClient(4, { availableSessions: 0 });
      const session = makeSession(2, {
        sessionDate: new Date(Date.now() - 86400000),
        client,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(1);
      expect(result.deducted).toBe(0);
      expect(result.noCredits).toHaveLength(1);
      expect(result.noCredits[0].clientId).toBe(4);
      expect(session.status).toBe('completed');
      expect(session.sessionDeducted).toBeFalsy();
    });

    it('returns empty results when no eligible sessions', async () => {
      mockSessionModel.findAll.mockResolvedValue([]);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(0);
      expect(result.deducted).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.noCredits).toEqual([]);
    });

    // ─────────────────────────────────────────────────────────
    // P0 REGRESSION: Multi-session-same-client deduction bug
    // Sequelize creates separate JS objects per session row for
    // the same client FK. Without grouping, read-modify-write
    // on session.client loses deductions (3 sessions -> only 1 deducted).
    // ─────────────────────────────────────────────────────────
    it('deducts ALL sessions for same client in one batch (atomic)', async () => {
      const client3 = makeClient(3, { availableSessions: 5 });
      // Simulate Sequelize creating SEPARATE client objects per row
      const clientCopy1 = makeClient(3, { availableSessions: 5 });
      const clientCopy2 = makeClient(3, { availableSessions: 5 });
      const clientCopy3 = makeClient(3, { availableSessions: 5 });

      const sessions = [
        makeSession(10, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: clientCopy1 }),
        makeSession(11, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: clientCopy2 }),
        makeSession(12, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: clientCopy3 }),
      ];
      mockSessionModel.findAll.mockResolvedValue(sessions);
      // Refetch returns the REAL client (row-locked, single object)
      mockUserModel.findByPk.mockResolvedValue(client3);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(3);
      expect(result.deducted).toBe(3);
      // CRITICAL: atomic decrement by 3, NOT 3 separate -= 1
      expect(client3.decrement).toHaveBeenCalledTimes(1);
      expect(client3.decrement).toHaveBeenCalledWith('availableSessions', {
        by: 3,
        transaction: mockTransaction,
      });
      // All sessions marked as deducted
      expect(sessions[0].sessionDeducted).toBe(true);
      expect(sessions[1].sessionDeducted).toBe(true);
      expect(sessions[2].sessionDeducted).toBe(true);
    });

    it('partial deduction: deducts up to available credits, marks rest as no-credit', async () => {
      const client = makeClient(3, { availableSessions: 2 });
      const clientCopy1 = makeClient(3, { availableSessions: 2 });
      const clientCopy2 = makeClient(3, { availableSessions: 2 });
      const clientCopy3 = makeClient(3, { availableSessions: 2 });

      const sessions = [
        makeSession(20, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: clientCopy1 }),
        makeSession(21, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: clientCopy2 }),
        makeSession(22, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: clientCopy3 }),
      ];
      mockSessionModel.findAll.mockResolvedValue(sessions);
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(3);
      expect(result.deducted).toBe(2); // Only 2 credits available
      expect(result.noCredits).toHaveLength(1); // 3rd session had no credits
      expect(result.noCredits[0].sessionId).toBe(22);
      // Atomic decrement by 2 (not 3)
      expect(client.decrement).toHaveBeenCalledWith('availableSessions', {
        by: 2,
        transaction: mockTransaction,
      });
      // First two deducted, third not
      expect(sessions[0].sessionDeducted).toBe(true);
      expect(sessions[1].sessionDeducted).toBe(true);
      expect(sessions[2].sessionDeducted).toBeFalsy();
    });

    it('uses row lock when refetching client for deduction', async () => {
      const client = makeClient(3, { availableSessions: 5 });
      const session = makeSession(30, {
        userId: 3,
        sessionDate: new Date(Date.now() - 86400000),
        client: makeClient(3, { availableSessions: 5 }),
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);

      await processSessionDeductions();

      expect(mockUserModel.findByPk).toHaveBeenCalledWith(3, {
        lock: mockTransaction.LOCK.UPDATE,
        transaction: mockTransaction,
      });
    });

    it('handles multiple clients in same batch independently', async () => {
      const client3 = makeClient(3, { availableSessions: 2 });
      const client4 = makeClient(4, { availableSessions: 1 });

      const sessions = [
        makeSession(40, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: makeClient(3, { availableSessions: 2 }) }),
        makeSession(41, { userId: 4, sessionDate: new Date(Date.now() - 86400000), client: makeClient(4, { availableSessions: 1 }) }),
        makeSession(42, { userId: 3, sessionDate: new Date(Date.now() - 86400000), client: makeClient(3, { availableSessions: 2 }) }),
      ];
      mockSessionModel.findAll.mockResolvedValue(sessions);
      mockUserModel.findByPk
        .mockResolvedValueOnce(client3)  // first client refetch (id=3)
        .mockResolvedValueOnce(client4); // second client refetch (id=4)

      const result = await processSessionDeductions();

      expect(result.processed).toBe(3);
      expect(result.deducted).toBe(3);
      // Client 3: decrement by 2
      expect(client3.decrement).toHaveBeenCalledWith('availableSessions', {
        by: 2,
        transaction: mockTransaction,
      });
      // Client 4: decrement by 1
      expect(client4.decrement).toHaveBeenCalledWith('availableSessions', {
        by: 1,
        transaction: mockTransaction,
      });
    });
  });
});
