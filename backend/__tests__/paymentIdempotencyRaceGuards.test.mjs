/**
 * Payment idempotency race-guard regression tests.
 *
 * These tests cover the DB-backed claim behavior used by ACH, offline,
 * gallery print, and session-package webhook fulfillment paths.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  buildGalleryPrintAttemptKey,
  claimIdempotentRecord,
} from '../utils/paymentIdempotency.mjs';
// Migration retired to quarantine (SWA-115): it never ran in prod (runner cannot load
// .mjs) and its indexes exist live via another path — kept as the reference implementation
// these guards source-lock.
import * as paymentIdempotencyMigration from '../migrations/retired-mjs-20260804/20260520000001-add-payment-idempotency-unique-indexes.mjs';

describe('payment idempotency race guards', () => {
  it('reuses an existing ACH/offline order before creating a duplicate', async () => {
    const existing = { id: 7, idempotencyKey: 'pay-1' };
    const model = {
      findOrCreate: vi.fn().mockResolvedValue([existing, false]),
    };

    const result = await claimIdempotentRecord({
      model,
      lookupWhere: { userId: 4, idempotencyKey: 'pay-1' },
      createValues: { userId: 4, idempotencyKey: 'pay-1' },
    });

    expect(result).toEqual({ record: existing, created: false });
    expect(model.findOrCreate).toHaveBeenCalledWith({
      where: { userId: 4, idempotencyKey: 'pay-1' },
      defaults: { userId: 4, idempotencyKey: 'pay-1' },
    });
  });

  it('uses Sequelize findOrCreate with the caller transaction for race-safe claims', async () => {
    const transaction = { id: 'tx-1' };
    const winner = { id: 9, idempotencyKey: 'pay-2' };
    const model = {
      findOrCreate: vi.fn().mockResolvedValue([winner, false]),
    };

    const result = await claimIdempotentRecord({
      model,
      lookupWhere: { userId: 4, idempotencyKey: 'pay-2' },
      createValues: { userId: 4, idempotencyKey: 'pay-2' },
      transaction,
    });

    expect(result).toEqual({ record: winner, created: false });
    expect(model.findOrCreate).toHaveBeenCalledWith({
      where: { userId: 4, idempotencyKey: 'pay-2' },
      defaults: { userId: 4, idempotencyKey: 'pay-2' },
      transaction,
    });
  });

  it('makes gallery print attempts stable before PrintOrder.id exists', () => {
    const first = buildGalleryPrintAttemptKey({
      visitorId: 11,
      eventId: 22,
      photoId: 33,
      productType: 'canvas',
      size: '16x20',
      quantity: 2,
      totalPrice: '120.00',
      cropData: { y: 1, x: 2 },
    }, { nowMs: 1_000, windowMs: 60_000 });

    const second = buildGalleryPrintAttemptKey({
      totalPrice: '120.00',
      quantity: 2,
      size: '16x20',
      productType: 'canvas',
      photoId: 33,
      eventId: 22,
      visitorId: 11,
      cropData: { x: 2, y: 1 },
    }, { nowMs: 30_000, windowMs: 60_000 });

    const changed = buildGalleryPrintAttemptKey({
      visitorId: 11,
      eventId: 22,
      photoId: 33,
      productType: 'canvas',
      size: '16x20',
      quantity: 3,
      totalPrice: '180.00',
      cropData: { x: 2, y: 1 },
    }, { nowMs: 30_000, windowMs: 60_000 });

    expect(first).toBe(second);
    expect(first).toMatch(/^gallery-print:/);
    expect(first).not.toMatch(/undefined|null/);
    expect(first).not.toBe(changed);
  });

  it('reuses a gallery print winner after a concurrent PrintOrder claim conflict', async () => {
    const winner = { id: 41, idempotencyKey: 'gallery-print:abc', stripeSessionId: 'cs_test_123' };
    const model = {
      findOrCreate: vi.fn().mockResolvedValue([winner, false]),
    };

    const result = await claimIdempotentRecord({
      model,
      lookupWhere: { idempotencyKey: 'gallery-print:abc' },
      createValues: { idempotencyKey: 'gallery-print:abc' },
    });

    expect(result).toEqual({ record: winner, created: false });
    expect(model.findOrCreate).toHaveBeenCalledWith({
      where: { idempotencyKey: 'gallery-print:abc' },
      defaults: { idempotencyKey: 'gallery-print:abc' },
    });
  });

  it('fails the unique-index migration closed when duplicate order keys already exist', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({ id: {}, idempotency_key: {} }),
      addColumn: vi.fn(),
      sequelize: {
        query: vi.fn().mockResolvedValueOnce([[{ key: 'dup-key', count: 2 }]]),
      },
    };

    await expect(paymentIdempotencyMigration.up(queryInterface, { STRING: vi.fn() }))
      .rejects
      .toThrow('duplicate keys exist');
    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(1);
  });

  it('adds unique partial indexes for Order and PrintOrder idempotency keys', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({ id: {} }),
      addColumn: vi.fn(),
      sequelize: {
        query: vi.fn()
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      },
    };

    await paymentIdempotencyMigration.up(queryInterface, { STRING: () => 'STRING(255)' });

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'print_orders',
      'idempotency_key',
      expect.objectContaining({ allowNull: true }),
    );
    const sql = queryInterface.sequelize.query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "idx_orders_idempotency_key"');
    expect(sql).toContain('ON "orders" ("idempotencyKey")');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "idx_print_orders_idempotency_key"');
    expect(sql).toContain('ON "print_orders" ("idempotency_key")');
  });

  it('drops both payment idempotency indexes on rollback', async () => {
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({ id: {}, idempotency_key: {} }),
      removeColumn: vi.fn(),
      sequelize: {
        query: vi.fn().mockResolvedValue([]),
      },
    };

    await paymentIdempotencyMigration.down(queryInterface);

    const sql = queryInterface.sequelize.query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('DROP INDEX IF EXISTS "idx_print_orders_idempotency_key"');
    expect(sql).toContain('DROP INDEX IF EXISTS "idx_orders_idempotency_key"');
  });
});
