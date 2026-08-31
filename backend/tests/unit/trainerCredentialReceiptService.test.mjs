/**
 * ============================================================================
 * BLUEPRINT: Trainer credential upload receipt lifecycle
 * ============================================================================
 * PURPOSE: Prove pending credential objects are durably reserved, owner-bounded,
 *          and atomically attached to a submitted trainer application.
 * SECURITY: Per-user locking prevents quota races; expired/wrong-kind receipts
 *           cannot be attached; failed persistence cannot leave a live receipt.
 * STORAGE: The storage boundary is mocked. Dedicated storage tests pin crypto/R2.
 * ============================================================================
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CredentialReceiptError,
  MAX_PENDING_CREDENTIAL_BYTES,
  createTrainerCredentialReceiptService,
} from '../../services/trainerCredentialReceiptService.mjs';

const NOW = new Date('2026-08-27T20:00:00.000Z');
const USER_ID = 42;
const transaction = { LOCK: { UPDATE: 'UPDATE' } };

function makeReceipt(overrides = {}) {
  const row = {
    id: overrides.id || 'receipt-1',
    userId: USER_ID,
    kind: 'certification',
    storageKey: 'private/trainer-credentials/42/certification/2026-08/a.pdf.enc',
    byteSize: 1024,
    status: 'uploading',
    expiresAt: new Date(NOW.getTime() + 86_400_000),
    update: vi.fn(async (values) => Object.assign(row, values)),
    destroy: vi.fn(async () => {}),
    ...overrides,
  };
  return row;
}

function harness({
  pendingBytes = 0, receipts = [], persistError = null, deleteError = null,
} = {}) {
  const events = [];
  const createdReceipts = [];
  const User = {
    findByPk: vi.fn(async () => {
      events.push('user-lock');
      return { id: USER_ID };
    }),
  };
  const TrainerCredentialUpload = {
    sequelize: { transaction: vi.fn(async (callback) => callback(transaction)) },
    sum: vi.fn(async () => pendingBytes),
    create: vi.fn(async (values) => {
      events.push('receipt-create');
      const row = makeReceipt(values);
      createdReceipts.push(row);
      return row;
    }),
    findAll: vi.fn(async () => receipts),
  };
  const storage = {
    prepareCredentialUpload: vi.fn(() => ({
      storageKey: 'private/trainer-credentials/42/certification/2026-08/new.pdf.enc',
      byteSize: 1024,
      encryptedBody: Buffer.from('ciphertext'),
      userId: USER_ID,
      kind: 'certification',
      detectedMime: 'application/pdf',
    })),
    persistPreparedCredential: vi.fn(async () => {
      events.push('object-persist');
      if (persistError) throw persistError;
      return { storage: 'r2' };
    }),
    deleteCredential: vi.fn(async () => {
      events.push('object-delete');
      if (deleteError) throw deleteError;
    }),
    credentialExistsForUser: vi.fn(async () => true),
  };
  const getModelFn = vi.fn((name) => ({
    User,
    TrainerCredentialUpload,
  }[name]));
  const service = createTrainerCredentialReceiptService({ getModelFn, storage, now: () => NOW });
  return { service, storage, User, TrainerCredentialUpload, createdReceipts, events };
}

describe('trainer credential receipt lifecycle', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates an uploading receipt under a user lock before persisting, then marks it pending', async () => {
    const h = harness();
    const result = await h.service.storeTrainerCredentialUpload(Buffer.from('%PDF-123'), {
      userId: USER_ID,
      kind: 'certification',
      declaredMime: 'application/pdf',
    });

    expect(h.events).toEqual(['user-lock', 'receipt-create', 'object-persist']);
    expect(h.User.findByPk).toHaveBeenCalledWith(USER_ID, {
      attributes: ['id'],
      transaction,
      lock: 'UPDATE',
    });
    const pendingStatusFilter = h.TrainerCredentialUpload.sum.mock.calls[0][1].where.status;
    const opIn = Object.getOwnPropertySymbols(pendingStatusFilter)[0];
    expect(pendingStatusFilter[opIn]).toContain('deleting');
    expect(h.TrainerCredentialUpload.sum.mock.calls[0][1].where).not.toHaveProperty('expiresAt');
    expect(h.createdReceipts[0].status).toBe('pending');
    expect(result.storageKey).toContain('/42/certification/');
  });

  it('rejects aggregate pending bytes over the owner quota before object persistence', async () => {
    const h = harness({ pendingBytes: MAX_PENDING_CREDENTIAL_BYTES });

    await expect(h.service.storeTrainerCredentialUpload(Buffer.from('%PDF-123'), {
      userId: USER_ID,
      kind: 'certification',
      declaredMime: 'application/pdf',
    })).rejects.toMatchObject({
      name: 'CredentialReceiptError',
      code: 'PENDING_CREDENTIAL_QUOTA_EXCEEDED',
      statusCode: 409,
    });

    expect(h.storage.persistPreparedCredential).not.toHaveBeenCalled();
    expect(h.TrainerCredentialUpload.create).not.toHaveBeenCalled();
  });

  it('removes the reservation and any partial object when persistence fails', async () => {
    const h = harness({ persistError: new Error('r2 timeout') });

    await expect(h.service.storeTrainerCredentialUpload(Buffer.from('%PDF-123'), {
      userId: USER_ID,
      kind: 'certification',
      declaredMime: 'application/pdf',
    })).rejects.toThrow('r2 timeout');

    expect(h.createdReceipts[0].destroy).toHaveBeenCalled();
    expect(h.storage.deleteCredential).toHaveBeenCalledWith(
      h.createdReceipts[0].storageKey,
      USER_ID,
      'certification',
    );
  });

  it('retains the durable receipt when compensating object deletion also fails', async () => {
    const h = harness({
      persistError: new Error('ambiguous r2 timeout'),
      deleteError: new Error('delete timeout'),
    });

    await expect(h.service.storeTrainerCredentialUpload(Buffer.from('%PDF-123'), {
      userId: USER_ID,
      kind: 'certification',
      declaredMime: 'application/pdf',
    })).rejects.toThrow('ambiguous r2 timeout');

    expect(h.createdReceipts[0].destroy).not.toHaveBeenCalled();
    expect(h.createdReceipts[0].status).toBe('uploading');
  });

  it('atomically creates the application and marks exact pending receipts attached', async () => {
    const certification = makeReceipt();
    const h = harness({ receipts: [certification] });
    const applicationModel = {
      create: vi.fn(async (values, options) => ({ id: 91, ...values, options })),
    };

    const application = await h.service.createApplicationWithCredentialReceipts({
      userId: USER_ID,
      credentialKeys: { certificationFileKey: certification.storageKey, insuranceFileKey: null },
      applicationModel,
      applicationPayload: { userId: USER_ID, status: 'pending_review' },
    });

    expect(h.storage.credentialExistsForUser).toHaveBeenCalledWith(
      certification.storageKey,
      USER_ID,
      'certification',
    );
    expect(applicationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
      { transaction },
    );
    expect(certification.update).toHaveBeenCalledWith({
      status: 'attached',
      attachedApplicationId: 91,
      expiresAt: null,
    }, { transaction });
    expect(application.id).toBe(91);
  });

  it('rejects an expired or wrong-kind receipt before application creation', async () => {
    const wrong = makeReceipt({ kind: 'insurance', expiresAt: new Date(NOW.getTime() - 1) });
    const h = harness({ receipts: [wrong] });
    const applicationModel = { create: vi.fn() };

    await expect(h.service.createApplicationWithCredentialReceipts({
      userId: USER_ID,
      credentialKeys: { certificationFileKey: wrong.storageKey, insuranceFileKey: null },
      applicationModel,
      applicationPayload: { userId: USER_ID },
    })).rejects.toBeInstanceOf(CredentialReceiptError);

    expect(applicationModel.create).not.toHaveBeenCalled();
  });
});
