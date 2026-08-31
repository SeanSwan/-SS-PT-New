/**
 * ============================================================================
 * BLUEPRINT: Trainer Credential Receipt Service
 * ============================================================================
 * PURPOSE: Bound unattached credential storage and atomically consume uploads.
 * SECURITY:
 *   - A locked User row serializes quota reservations for the same account.
 *   - Encrypted object persistence begins only after a durable receipt exists.
 *   - Only live pending receipts with exact owner + kind can be attached.
 *   - Application creation and receipt attachment share one DB transaction.
 * RECOVERY: uploading receipts cover crash windows and expire after 24 hours.
 * ============================================================================
 */
import { Op } from 'sequelize';

import { getModel } from '../models/index.mjs';
import { trainerCredentialStorage } from './trainerCredentialStorageService.mjs';
import logger from '../utils/logger.mjs';

export const MAX_PENDING_CREDENTIAL_BYTES = 30 * 1024 * 1024;
export const PENDING_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_STATUSES = ['uploading', 'pending', 'deleting'];

export class CredentialReceiptError extends Error {
  constructor(message, { code = 'CREDENTIAL_RECEIPT_ERROR', statusCode = 400 } = {}) {
    super(message);
    this.name = 'CredentialReceiptError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function assertUserId(userId) {
  if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
    throw new CredentialReceiptError('Authenticated user is invalid.', {
      code: 'INVALID_USER', statusCode: 401,
    });
  }
}

function modelBundle(getModelFn) {
  const User = getModelFn('User');
  const TrainerCredentialUpload = getModelFn('TrainerCredentialUpload');
  if (!User || !TrainerCredentialUpload?.sequelize) {
    throw new CredentialReceiptError('Credential receipt storage is unavailable.', {
      code: 'RECEIPT_STORAGE_UNAVAILABLE', statusCode: 503,
    });
  }
  return { User, TrainerCredentialUpload };
}

export function createTrainerCredentialReceiptService({
  getModelFn = getModel,
  storage = trainerCredentialStorage,
  now = () => new Date(),
} = {}) {
  async function storeTrainerCredentialUpload(buffer, options) {
    const { userId, kind } = options;
    assertUserId(userId);
    const prepared = storage.prepareCredentialUpload(buffer, options);
    const { User, TrainerCredentialUpload } = modelBundle(getModelFn);
    let receipt;

    await TrainerCredentialUpload.sequelize.transaction(async (transaction) => {
      const owner = await User.findByPk(userId, {
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!owner) {
        throw new CredentialReceiptError('Authenticated user was not found.', {
          code: 'USER_NOT_FOUND', statusCode: 401,
        });
      }
      const pendingBytes = Number(await TrainerCredentialUpload.sum('byteSize', {
        where: {
          userId,
          status: { [Op.in]: PENDING_STATUSES },
        },
        transaction,
      })) || 0;
      if (pendingBytes + prepared.byteSize > MAX_PENDING_CREDENTIAL_BYTES) {
        throw new CredentialReceiptError('Pending credential upload quota exceeded.', {
          code: 'PENDING_CREDENTIAL_QUOTA_EXCEEDED', statusCode: 409,
        });
      }
      receipt = await TrainerCredentialUpload.create({
        userId,
        kind,
        storageKey: prepared.storageKey,
        byteSize: prepared.byteSize,
        status: 'uploading',
        expiresAt: new Date(now().getTime() + PENDING_CREDENTIAL_TTL_MS),
      }, { transaction });
    });

    try {
      const persisted = await storage.persistPreparedCredential(prepared);
      await receipt.update({ status: 'pending' });
      return {
        storageKey: receipt.storageKey,
        storage: persisted.storage,
        expiresAt: receipt.expiresAt,
      };
    } catch (error) {
      let objectDeleted = false;
      try {
        await storage.deleteCredential(prepared.storageKey, userId, kind);
        objectDeleted = true;
      } catch (cleanupError) {
        logger.error('[trainerCredentialReceipt] failed-object cleanup deferred: %s', cleanupError.message);
      }
      if (objectDeleted) {
        try {
          await receipt.destroy();
        } catch (cleanupError) {
          logger.error('[trainerCredentialReceipt] failed-receipt cleanup deferred: %s', cleanupError.message);
        }
      }
      throw error;
    }
  }

  async function createApplicationWithCredentialReceipts({
    userId,
    credentialKeys,
    applicationModel,
    applicationPayload,
  }) {
    assertUserId(userId);
    const expected = [
      ['certificationFileKey', 'certification'],
      ['insuranceFileKey', 'insurance'],
    ].flatMap(([field, kind]) => {
      const storageKey = credentialKeys[field];
      return storageKey ? [{ field, kind, storageKey }] : [];
    });
    if (new Set(expected.map(({ storageKey }) => storageKey)).size !== expected.length) {
      throw new CredentialReceiptError('Each credential requires a distinct upload.', {
        code: 'DUPLICATE_CREDENTIAL_KEY', statusCode: 400,
      });
    }

    const { User, TrainerCredentialUpload } = modelBundle(getModelFn);
    return TrainerCredentialUpload.sequelize.transaction(async (transaction) => {
      const owner = await User.findByPk(userId, {
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!owner) {
        throw new CredentialReceiptError('Authenticated user was not found.', {
          code: 'USER_NOT_FOUND', statusCode: 401,
        });
      }

      const keys = expected.map(({ storageKey }) => storageKey);
      const receipts = keys.length
        ? await TrainerCredentialUpload.findAll({
          where: {
            userId,
            storageKey: { [Op.in]: keys },
            status: 'pending',
            expiresAt: { [Op.gt]: now() },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        : [];
      if (receipts.length !== expected.length) {
        throw new CredentialReceiptError('A credential upload is missing, expired, or already used.', {
          code: 'INVALID_CREDENTIAL_RECEIPT', statusCode: 400,
        });
      }

      for (const item of expected) {
        const receipt = receipts.find((row) => row.storageKey === item.storageKey);
        if (!receipt || receipt.kind !== item.kind
          || !(await storage.credentialExistsForUser(item.storageKey, userId, item.kind))) {
          throw new CredentialReceiptError('A credential upload is missing or belongs to another field.', {
            code: 'INVALID_CREDENTIAL_RECEIPT', statusCode: 400,
          });
        }
      }

      const application = await applicationModel.create({
        ...applicationPayload,
        userId,
      }, { transaction });
      await Promise.all(receipts.map((receipt) => receipt.update({
        status: 'attached',
        attachedApplicationId: application.id,
        expiresAt: null,
      }, { transaction })));
      return application;
    });
  }

  return { storeTrainerCredentialUpload, createApplicationWithCredentialReceipts };
}

const service = createTrainerCredentialReceiptService();
export const storeTrainerCredentialUpload = (...args) => service.storeTrainerCredentialUpload(...args);
export const createApplicationWithCredentialReceipts = (...args) => (
  service.createApplicationWithCredentialReceipts(...args)
);
