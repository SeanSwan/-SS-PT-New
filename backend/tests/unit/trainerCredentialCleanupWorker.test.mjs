/**
 * ============================================================================
 * BLUEPRINT: Trainer credential expiry worker
 * ============================================================================
 * PURPOSE: Prove expired unattached credential receipts delete their encrypted
 *          object and database receipt, while transient failures remain retryable.
 * SCOPE: Deterministic worker sweep with model/storage boundaries injected.
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';

import {
  pruneExpiredTrainerCredentialUploads,
} from '../../jobs/trainerCredentialCleanupWorker.mjs';

describe('trainerCredentialCleanupWorker', () => {
  it('claims each receipt transactionally before deletion and keeps failures leased for retry', async () => {
    const events = [];
    const makeRow = (id, kind) => {
      const row = {
        id,
        userId: 42,
        kind,
        storageKey: `private/trainer-credentials/42/${kind}/2026-08/${id}.pdf.enc`,
        status: 'pending',
        update: vi.fn(async (values) => {
          Object.assign(row, values);
          events.push(`claim-${id}`);
        }),
        destroy: vi.fn(async () => {
          events.push(`destroy-${id}`);
        }),
      };
      return row;
    };
    const rows = [
      makeRow('ok', 'certification'),
      makeRow('retry', 'insurance'),
    ];
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const findOne = vi.fn()
      .mockResolvedValueOnce(rows[0])
      .mockResolvedValueOnce(rows[1])
      .mockResolvedValueOnce(null);
    const TrainerCredentialUpload = {
      sequelize: { transaction: vi.fn(async (callback) => callback(transaction)) },
      findOne,
    };
    const deleteCredentialFn = vi.fn(async (key) => {
      const id = key.includes('/retry.') ? 'retry' : 'ok';
      events.push(`delete-${id}`);
      if (id === 'retry') throw new Error('temporary R2 failure');
    });

    const result = await pruneExpiredTrainerCredentialUploads({
      now: new Date('2026-08-28T20:00:00.000Z'),
      getModelFn: () => TrainerCredentialUpload,
      deleteCredentialFn,
      limit: 100,
    });

    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
      order: [['expiresAt', 'ASC']],
      transaction,
      lock: 'UPDATE',
      skipLocked: true,
    }));
    expect(rows[0].update).toHaveBeenCalledWith(
      {
        status: 'deleting',
        cleanupClaimedAt: new Date('2026-08-28T20:00:00.000Z'),
      },
      { transaction },
    );
    expect(events.slice(0, 3)).toEqual(['claim-ok', 'delete-ok', 'destroy-ok']);
    expect(rows[0].destroy).toHaveBeenCalledTimes(1);
    expect(rows[1].status).toBe('deleting');
    expect(rows[1].destroy).not.toHaveBeenCalled();
    expect(result).toEqual({ examined: 2, deleted: 1, failed: 1 });
  });

  it('does not claim a receipt locked by an in-flight application transaction', async () => {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const findOne = vi.fn(async () => null);
    const deleteCredentialFn = vi.fn();
    const result = await pruneExpiredTrainerCredentialUploads({
      getModelFn: () => ({
        sequelize: { transaction: async (callback) => callback(transaction) },
        findOne,
      }),
      deleteCredentialFn,
      limit: 1,
    });

    expect(findOne.mock.calls[0][0]).toMatchObject({
      lock: 'UPDATE',
      skipLocked: true,
      transaction,
    });
    expect(deleteCredentialFn).not.toHaveBeenCalled();
    expect(result).toEqual({ examined: 0, deleted: 0, failed: 0 });
  });
});
