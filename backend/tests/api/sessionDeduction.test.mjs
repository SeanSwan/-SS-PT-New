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
  mockSessionTypeModel,
  mockAssignmentModel,
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

  const mockSessionTypeModel = {
    findByPk: vi.fn(),
  };

  const mockAssignmentModel = {
    findAll: vi.fn(),
  };

  const mockSequelize = {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
    query: vi.fn().mockResolvedValue([]),  // advisory lock
    models: {},
  };

  return { mockTransaction, mockUserModel, mockSessionModel, mockSessionTypeModel, mockAssignmentModel, mockSequelize };
});

vi.mock('../../database.mjs', () => ({
  default: mockSequelize,
}));

vi.mock('../../models/index.mjs', () => ({
  getClientTrainerAssignment: () => mockAssignmentModel,
  getSession: () => mockSessionModel,
  getSessionType: () => mockSessionTypeModel,
  getUser: () => mockUserModel,
  Op: {
    in: Symbol('in'),
    lt: Symbol('lt'),
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    not: Symbol('not'),
    notIn: Symbol('notIn'),
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

function pastDueSettlementDate() {
  return new Date(Date.now() - (26 * 60 * 60 * 1000));
}

function makeDueAttendedSession(id, overrides = {}) {
  return makeSession(id, {
    sessionDate: pastDueSettlementDate(),
    attendanceStatus: 'present',
    ...overrides,
  });
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
    mockSequelize.query.mockResolvedValue([]);
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

    it('scopes trainer reads to assigned clients only', async () => {
      mockAssignmentModel.findAll.mockResolvedValue([{ clientId: 4 }, { clientId: 8 }]);
      mockUserModel.findAll.mockResolvedValue([]);

      const result = await getClientsNeedingPayment({ id: '12', role: 'trainer' });

      expect(result).toEqual([]);
      expect(mockAssignmentModel.findAll).toHaveBeenCalledWith({
        where: { trainerId: 12, status: 'active' },
        attributes: ['clientId']
      });

      const callArgs = mockUserModel.findAll.mock.calls[0][0];
      const idFilter = callArgs.where.id;
      const symbolKeys = Object.getOwnPropertySymbols(idFilter);
      expect(symbolKeys).toHaveLength(1);
      expect(idFilter[symbolKeys[0]]).toEqual([4, 8]);
    });

    it('returns no clients for trainers with no active assignments', async () => {
      mockAssignmentModel.findAll.mockResolvedValue([]);

      const result = await getClientsNeedingPayment({ id: '12', role: 'trainer' });

      expect(result).toEqual([]);
      expect(mockUserModel.findAll).not.toHaveBeenCalled();
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

    it('excludes Move Fitness and external clients from payment recovery debt lists', async () => {
      mockUserModel.findAll.mockResolvedValue([]);

      await getClientsNeedingPayment();

      const callArgs = mockUserModel.findAll.mock.calls[0][0];
      expect(callArgs.attributes).toContain('clientSource');
      const sourceFilter = callArgs.where.clientSource;
      expect(sourceFilter).toBeDefined();
      const symbolKeys = Object.getOwnPropertySymbols(sourceFilter);
      expect(symbolKeys).toHaveLength(1);
      expect(sourceFilter[symbolKeys[0]]).toEqual(['move_fitness', 'external']);
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
    const VALID_TOKEN = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
    const baseParams = {
      clientId: 4,
      storefrontItemId: 1,
      paymentMethod: 'cash',
      paymentReference: 'CASH-001',
      adminNotes: 'Test recovery',
      adminUserId: 1,
      idempotencyToken: VALID_TOKEN,
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

    it('rejects payment recovery package grants for non-deducting client sources', async () => {
      const freeTrackingClient = makeClient(4, { clientSource: 'move_fitness' });
      const orderCreate = vi.fn();
      mockUserModel.findByPk.mockResolvedValue(freeTrackingClient);
      mockSequelize.models = {
        Order: { create: orderCreate, findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(makeStorefrontItem()) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };

      let caughtError;
      await applyPackagePayment(baseParams).catch((error) => {
        caughtError = error;
      });

      expect(caughtError).toMatchObject({ code: 'NON_BILLABLE_CLIENT_SOURCE' });
      expect(caughtError).toHaveProperty(
        'message',
        'Paid session credits are disabled for no-pay/free-tracking clients'
      );
      expect(freeTrackingClient.increment).not.toHaveBeenCalled();
      expect(orderCreate).not.toHaveBeenCalled();
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

    // ─── Error code tests (v9.5 additions) ─────────────────────

    it('throws INVALID_IDEMPOTENCY_TOKEN for missing token', async () => {
      mockSequelize.models = {
        Order: {}, StorefrontItem: {}, ShoppingCart: {},
      };

      const paramsNoToken = { ...baseParams, idempotencyToken: undefined };
      try {
        await applyPackagePayment(paramsNoToken);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('INVALID_IDEMPOTENCY_TOKEN');
      }
    });

    it('throws INVALID_IDEMPOTENCY_TOKEN for malformed UUID', async () => {
      mockSequelize.models = {
        Order: {}, StorefrontItem: {}, ShoppingCart: {},
      };

      const paramsBadToken = { ...baseParams, idempotencyToken: 'not-a-uuid' };
      try {
        await applyPackagePayment(paramsBadToken);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('INVALID_IDEMPOTENCY_TOKEN');
      }
    });

    it('throws INVALID_PAYMENT_METHOD for invalid method', async () => {
      mockSequelize.models = {
        Order: {}, StorefrontItem: {}, ShoppingCart: {},
      };

      const paramsBadMethod = { ...baseParams, paymentMethod: 'bitcoin' };
      try {
        await applyPackagePayment(paramsBadMethod);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('INVALID_PAYMENT_METHOD');
      }
    });

    it('throws MISSING_PAYMENT_REFERENCE for venmo without reference', async () => {
      mockSequelize.models = {
        Order: {}, StorefrontItem: {}, ShoppingCart: {},
      };

      const paramsNoRef = { ...baseParams, paymentMethod: 'venmo', paymentReference: '' };
      try {
        await applyPackagePayment(paramsNoRef);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('MISSING_PAYMENT_REFERENCE');
      }
    });

    it('throws MISSING_FORCE_REASON when force=true without reason', async () => {
      mockSequelize.models = {
        Order: {}, StorefrontItem: {}, ShoppingCart: {},
      };

      const paramsForceNoReason = { ...baseParams, force: true, forceReason: '' };
      try {
        await applyPackagePayment(paramsForceNoReason);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('MISSING_FORCE_REASON');
      }
    });

    it('throws MISSING_FORCE_REASON when forceReason is too short', async () => {
      mockSequelize.models = {
        Order: {}, StorefrontItem: {}, ShoppingCart: {},
      };

      const paramsShortReason = { ...baseParams, force: true, forceReason: 'short' };
      try {
        await applyPackagePayment(paramsShortReason);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('MISSING_FORCE_REASON');
      }
    });

    it('allows force=true with valid reason and bypasses duplicate guard', async () => {
      const client = makeClient(4);
      const pkg = makeStorefrontItem();
      const recentOrder = {
        id: 99,
        orderNumber: 'REC-EXISTING-ABCD',
        completedAt: new Date(Date.now() - 10000),
      };

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn().mockResolvedValue({ id: 60 }), findOne: vi.fn().mockResolvedValue(recentOrder) },
        OrderItem: { create: vi.fn().mockResolvedValue({}) },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue({ id: 110 }) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      // Should NOT throw despite recent duplicate — force bypasses the guard
      const result = await applyPackagePayment({
        ...baseParams,
        force: true,
        forceReason: 'Client paid twice intentionally for double sessions'
      });

      expect(result.orderId).toBe(60);
      expect(result.sessionsAdded).toBe(10);
    });

    it('throws DUPLICATE_PAYMENT_WINDOW with correct error code', async () => {
      const client = makeClient(4);
      const pkg = makeStorefrontItem();
      const recentOrder = {
        id: 99,
        orderNumber: 'REC-EXISTING-ABCD',
        completedAt: new Date(Date.now() - 10000),
      };

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn(), findOne: vi.fn().mockResolvedValue(recentOrder) },
        OrderItem: { create: vi.fn() },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn() },
        FinancialTransaction: { create: vi.fn() },
      };

      try {
        await applyPackagePayment(baseParams);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('DUPLICATE_PAYMENT_WINDOW');
        expect(err.message).toContain('Duplicate payment detected');
      }
    });

    it('throws MODELS_UNAVAILABLE with correct error code', async () => {
      mockSequelize.models = {};

      try {
        await applyPackagePayment(baseParams);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.code).toBe('MODELS_UNAVAILABLE');
      }
    });

    it('stores idempotencyKey on Order.create', async () => {
      const client = makeClient(4);
      const pkg = makeStorefrontItem();
      const orderCreate = vi.fn().mockResolvedValue({ id: 70 });

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: orderCreate, findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn().mockResolvedValue({}) },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue({ id: 120 }) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      await applyPackagePayment(baseParams);

      const createArgs = orderCreate.mock.calls[0][0];
      expect(createArgs.idempotencyKey).toBe(VALID_TOKEN);
    });

    it('calls advisory lock with clientId and storefrontItemId', async () => {
      const client = makeClient(4);
      const pkg = makeStorefrontItem();

      mockUserModel.findByPk.mockResolvedValue(client);
      mockSequelize.models = {
        Order: { create: vi.fn().mockResolvedValue({ id: 71 }), findOne: vi.fn().mockResolvedValue(null) },
        OrderItem: { create: vi.fn().mockResolvedValue({}) },
        StorefrontItem: { findByPk: vi.fn().mockResolvedValue(pkg) },
        ShoppingCart: { create: vi.fn().mockResolvedValue({ id: 121 }) },
        FinancialTransaction: { create: vi.fn().mockResolvedValue({}) },
      };

      await applyPackagePayment(baseParams);

      expect(mockSequelize.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock($1, $2)',
        { bind: [4, 1], transaction: mockTransaction }
      );
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

    it('rejects legacy payment credit grants for non-deducting client sources', async () => {
      const freeTrackingClient = makeClient(4, { clientSource: 'external' });
      mockUserModel.findByPk.mockResolvedValue(freeTrackingClient);

      let caughtError;
      await applyPaymentCredits(4, 7).catch((error) => {
        caughtError = error;
      });

      expect(caughtError).toMatchObject({ code: 'NON_BILLABLE_CLIENT_SOURCE' });
      expect(caughtError).toHaveProperty(
        'message',
        'Paid session credits are disabled for no-pay/free-tracking clients'
      );
      expect(freeTrackingClient.increment).not.toHaveBeenCalled();
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
      const session = makeDueAttendedSession(1, {
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

    it('deducts and persists the configured multi-credit session cost', async () => {
      const client = makeClient(3, { availableSessions: 3 });
      const session = makeDueAttendedSession(11, {
        client,
        sessionTypeId: 22,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);
      mockSessionTypeModel.findByPk.mockResolvedValue({ id: 22, creditsRequired: 2 });

      const result = await processSessionDeductions();

      expect(result.deducted).toBe(1);
      expect(client.decrement).toHaveBeenCalledWith('availableSessions', {
        by: 2,
        transaction: mockTransaction,
      });
      expect(session.sessionDeducted).toBe(true);
      expect(session.creditsDeducted).toBe(2);
    });

    it('marks session completed but tracks no-credit clients', async () => {
      const client = makeClient(4, { availableSessions: 0 });
      const session = makeDueAttendedSession(2, {
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

    it('treats malformed batch deduction balances as no usable credits', async () => {
      const client = makeClient(4, { availableSessions: 'unknown' });
      const session = makeDueAttendedSession(3, {
        client,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(1);
      expect(result.deducted).toBe(0);
      expect(result.noCredits).toHaveLength(1);
      expect(result.noCredits[0].sessionId).toBe(3);
      expect(session.status).toBe('completed');
      expect(session.sessionDeducted).toBeFalsy();
      expect(client.decrement).not.toHaveBeenCalled();
    });

    it('completes Move Fitness sessions without paid-credit deduction or no-credit debt', async () => {
      const client = makeClient(6, {
        availableSessions: 0,
        clientSource: 'move_fitness',
      });
      const session = makeDueAttendedSession(6, {
        userId: 6,
        client,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(1);
      expect(result.deducted).toBe(0);
      expect(result.noCredits).toEqual([]);
      expect(session.status).toBe('completed');
      expect(session.sessionDeducted).toBe(false);
      expect(client.decrement).not.toHaveBeenCalled();
      expect(session.notes).toContain('No paid session credit required');
    });

    it('returns empty results when no eligible sessions', async () => {
      mockSessionModel.findAll.mockResolvedValue([]);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(0);
      expect(result.deducted).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.noCredits).toEqual([]);
    });

    it('defers attended sessions until 24 hours after the scheduled end', async () => {
      const client = makeClient(3, { availableSessions: 5 });
      const session = makeSession(7, {
        sessionDate: new Date(Date.now() - (60 * 60 * 1000)),
        duration: 60,
        attendanceStatus: 'present',
        client,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(0);
      expect(result.deferred).toHaveLength(1);
      expect(result.deferred[0]).toMatchObject({
        sessionId: 7,
        reason: 'settlement_not_due',
      });
      expect(session.status).toBe('scheduled');
      expect(session.save).not.toHaveBeenCalled();
      expect(client.decrement).not.toHaveBeenCalled();
      expect(mockUserModel.findByPk).not.toHaveBeenCalled();
    });

    it('defers sessions with missing attendance after cutoff for review', async () => {
      const client = makeClient(3, { availableSessions: 5 });
      const session = makeSession(8, {
        sessionDate: pastDueSettlementDate(),
        duration: 60,
        attendanceStatus: null,
        client,
      });
      mockSessionModel.findAll.mockResolvedValue([session]);
      mockUserModel.findByPk.mockResolvedValue(client);

      const result = await processSessionDeductions();

      expect(result.processed).toBe(0);
      expect(result.deferred).toHaveLength(1);
      expect(result.deferred[0]).toMatchObject({
        sessionId: 8,
        reason: 'attendance_missing_after_cutoff',
        recommendedAction: 'open_attendance_review',
      });
      expect(session.status).toBe('scheduled');
      expect(session.save).not.toHaveBeenCalled();
      expect(client.decrement).not.toHaveBeenCalled();
      expect(mockUserModel.findByPk).not.toHaveBeenCalled();
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
        makeDueAttendedSession(10, { userId: 3, client: clientCopy1 }),
        makeDueAttendedSession(11, { userId: 3, client: clientCopy2 }),
        makeDueAttendedSession(12, { userId: 3, client: clientCopy3 }),
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
        makeDueAttendedSession(20, { userId: 3, client: clientCopy1 }),
        makeDueAttendedSession(21, { userId: 3, client: clientCopy2 }),
        makeDueAttendedSession(22, { userId: 3, client: clientCopy3 }),
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
      const session = makeDueAttendedSession(30, {
        userId: 3,
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
        makeDueAttendedSession(40, { userId: 3, client: makeClient(3, { availableSessions: 2 }) }),
        makeDueAttendedSession(41, { userId: 4, client: makeClient(4, { availableSessions: 1 }) }),
        makeDueAttendedSession(42, { userId: 3, client: makeClient(3, { availableSessions: 2 }) }),
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
