/**
 * ============================================================================
 * BLUEPRINT: Trainer Credential Cleanup Worker
 * ============================================================================
 * PURPOSE: Physically delete encrypted uploads that were never attached to an
 *          application, then remove their durable receipts.
 * SAFETY: Only expired uploading/pending rows are eligible. A storage failure
 *         keeps the row for retry, and overlapping sweeps are refused.
 * LIFECYCLE: Starts whenever trainer onboarding is enabled; defaults to hourly.
 * ============================================================================
 */
import { Op } from 'sequelize';

import { getModel } from '../models/index.mjs';
import { deleteTrainerCredential } from '../services/trainerCredentialStorageService.mjs';
import logger from '../utils/logger.mjs';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const MIN_INTERVAL_MS = 5 * 60 * 1000;
const STALE_CLAIM_MS = 15 * 60 * 1000;
let intervalHandle = null;
let running = false;

function resolveIntervalMs() {
  const configured = Number(process.env.TRAINER_CREDENTIAL_CLEANUP_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= MIN_INTERVAL_MS
    ? configured
    : DEFAULT_INTERVAL_MS;
}

export async function pruneExpiredTrainerCredentialUploads({
  now = new Date(),
  getModelFn = getModel,
  deleteCredentialFn = deleteTrainerCredential,
  limit = 100,
} = {}) {
  const TrainerCredentialUpload = getModelFn('TrainerCredentialUpload');
  const staleClaimBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const boundedLimit = Math.max(0, Math.min(1_000, Number(limit) || 100));
  let deleted = 0;
  let failed = 0;
  let examined = 0;

  for (let index = 0; index < boundedLimit; index += 1) {
    const row = await TrainerCredentialUpload.sequelize.transaction(async (transaction) => {
      const claimed = await TrainerCredentialUpload.findOne({
        where: {
          [Op.or]: [
            {
              status: { [Op.in]: ['uploading', 'pending'] },
              expiresAt: { [Op.lte]: now },
            },
            {
              status: 'deleting',
              [Op.or]: [
                { cleanupClaimedAt: null },
                { cleanupClaimedAt: { [Op.lte]: staleClaimBefore } },
              ],
            },
          ],
        },
        order: [['expiresAt', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!claimed) return null;
      await claimed.update({
        status: 'deleting',
        cleanupClaimedAt: now,
      }, { transaction });
      return claimed;
    });
    if (!row) break;
    examined += 1;
    try {
      await deleteCredentialFn(row.storageKey, row.userId, row.kind);
      await row.destroy();
      deleted += 1;
    } catch (error) {
      failed += 1;
      logger.error('[trainerCredentialCleanup] receipt %s retained for retry: %s', row.id, error.message);
    }
  }
  return { examined, deleted, failed };
}

export async function runTrainerCredentialCleanupSweep() {
  if (running) {
    logger.info('[trainerCredentialCleanup] sweep already running; skipping overlap');
    return null;
  }
  running = true;
  try {
    const result = await pruneExpiredTrainerCredentialUploads();
    logger.info(
      '[trainerCredentialCleanup] examined %d; deleted %d; failed %d',
      result.examined, result.deleted, result.failed,
    );
    return result;
  } catch (error) {
    logger.error('[trainerCredentialCleanup] sweep failed: %s', error.message);
    return null;
  } finally {
    running = false;
  }
}

export function startTrainerCredentialCleanupWorker() {
  if (process.env.TRAINER_CREDENTIAL_CLEANUP_ENABLED === 'false') {
    logger.warn('[trainerCredentialCleanup] explicitly disabled; expired private uploads will not be pruned');
    return null;
  }
  if (intervalHandle) return intervalHandle;
  runTrainerCredentialCleanupSweep().catch((error) => {
    logger.error('[trainerCredentialCleanup] startup sweep failed: %s', error.message);
  });
  intervalHandle = setInterval(() => {
    runTrainerCredentialCleanupSweep().catch((error) => {
      logger.error('[trainerCredentialCleanup] interval sweep failed: %s', error.message);
    });
  }, resolveIntervalMs());
  intervalHandle.unref?.();
  return intervalHandle;
}

export function stopTrainerCredentialCleanupWorker() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

export const _internal = { resolveIntervalMs, MIN_INTERVAL_MS, STALE_CLAIM_MS };
