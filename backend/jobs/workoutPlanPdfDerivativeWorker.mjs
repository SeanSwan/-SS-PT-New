/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeWorker.mjs
 * PURPOSE: Recover, claim, render, and safely promote PDF derivative jobs.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';
import { getUser, getWorkoutPlan } from '../models/index.mjs';
import { sanitizeWorkoutPlanMetadataForPersistence } from '../services/workoutPlanDataPrivacyService.mjs';
import {
  buildWorkoutPlanPdfDerivativeIdentity,
  normalizeWorkoutPlanPdfBrandKey,
  workoutPlanPdfDerivativesEnabled,
} from '../services/workoutPlanPdfDerivativeService.mjs';
import { buildAndStoreGeneratedWorkoutPlanPdf } from '../services/workoutPlanPdfGenerationService.mjs';
import { resolveWorkoutPlanPdfBrand } from '../services/workoutPlanExerciseGuideService.mjs';
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 5;
const POLL_INTERVAL_MS = 30_000;
const STALE_RENDER_MINUTES = 5;
const BACKOFF_SECONDS = [30, 60, 300, 1800, 7200];
const SAFE_ERROR_CODES = new Set([
  'WORKOUT_PLAN_PDF_RENDER_FAILED',
  'WORKOUT_PLAN_PDF_STORAGE_FAILED',
  'WORKOUT_PLAN_PDF_PROMOTION_FAILED',
  'WORKOUT_PLAN_PDF_STALE_RECOVERED',
]);
let intervalHandle = null;
let running = false;
const rowsFrom = (result) => (Array.isArray(result?.[0]) ? result[0] : []);
const plainMetadata = (plan) => (
  plan?.metadata && typeof plan.metadata === 'object' && !Array.isArray(plan.metadata)
    ? plan.metadata
    : {}
);
export const classifyWorkoutPlanPdfDerivativeError = (error) => (
  SAFE_ERROR_CODES.has(error?.code) ? error.code : 'WORKOUT_PLAN_PDF_RENDER_FAILED'
);
export const shouldPromoteGeneratedPdf = ({
  currentPdf,
  promoteGenerated = false,
} = {}) => {
  if (promoteGenerated) return true;
  if (!currentPdf) return true;
  return currentPdf.sourceType === 'generated';
};
export const isWorkoutPlanPdfJobCurrent = ({
  job,
  plan,
  brandKey,
  renderHash,
} = {}) => (
  Boolean(job && plan)
  && String(job.plan_id) === String(plan.id)
  && String(plan.status || '').toLowerCase() !== 'archived'
  && Number(job.source_revision) === Number(plan.contentRevision)
  && String(job.source_hash || '').toLowerCase() === String(plan.contentHash || '').toLowerCase()
  && String(job.brand_key) === String(brandKey)
  && String(job.render_hash) === String(renderHash)
);
async function loadRenderContext({ plan, User, transaction, lock = false }) {
  const client = await User.findByPk(plan.userId, {
    attributes: ['id', 'clientSource'],
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  const brandKey = normalizeWorkoutPlanPdfBrandKey(client?.clientSource);
  const identity = buildWorkoutPlanPdfDerivativeIdentity({ plan, brandKey });
  return {
    brandKey,
    brand: resolveWorkoutPlanPdfBrand(client?.clientSource),
    renderHash: identity.renderHash,
  };
}
async function markSuperseded(sequelizeInstance, job, artifact = {}, transaction) {
  await sequelizeInstance.query([
    'UPDATE workout_plan_pdf_derivatives SET',
    "  state = 'superseded', safe_error_code = NULL,",
    '  storage_key = COALESCE(:storageKey, storage_key),',
    '  byte_size = COALESCE(:byteSize, byte_size),',
    '  checksum = COALESCE(:checksum, checksum), updated_at = NOW()',
    'WHERE id = :id',
  ].join('\n'), {
    replacements: {
      id: job.id,
      storageKey: artifact.planPdf?.storageKey || null,
      byteSize: Number(artifact.planPdf?.size) || null,
      checksum: artifact.checksum || null,
    },
    transaction,
  });
}
async function recordFailure(sequelizeInstance, job, error, artifact = {}) {
  const attemptCount = Number(job.attempt_count) || 1;
  const delaySeconds = BACKOFF_SECONDS[Math.min(attemptCount - 1, BACKOFF_SECONDS.length - 1)];
  await sequelizeInstance.query([
    'UPDATE workout_plan_pdf_derivatives SET',
    "  state = 'failed', safe_error_code = :safeErrorCode,",
    "  next_attempt_at = NOW() + (:delaySeconds || ' seconds')::INTERVAL,",
    '  storage_key = COALESCE(:storageKey, storage_key),',
    '  byte_size = COALESCE(:byteSize, byte_size),',
    '  checksum = COALESCE(:checksum, checksum), updated_at = NOW()',
    'WHERE id = :id',
  ].join('\n'), {
    replacements: {
      id: job.id,
      safeErrorCode: classifyWorkoutPlanPdfDerivativeError(error),
      delaySeconds: String(delaySeconds),
      storageKey: artifact.planPdf?.storageKey || null,
      byteSize: Number(artifact.planPdf?.size) || null,
      checksum: artifact.checksum || null,
    },
  });
}
async function promoteReadyArtifact({
  sequelizeInstance,
  WorkoutPlan,
  User,
  job,
  artifact,
}) {
  return sequelizeInstance.transaction(async (transaction) => {
    const plan = await WorkoutPlan.findByPk(job.plan_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!plan) {
      await markSuperseded(sequelizeInstance, job, artifact, transaction);
      return { state: 'superseded' };
    }
    const context = await loadRenderContext({ plan, User, transaction, lock: true });
    if (!isWorkoutPlanPdfJobCurrent({
      job,
      plan,
      brandKey: context.brandKey,
      renderHash: context.renderHash,
    })) {
      await markSuperseded(sequelizeInstance, job, artifact, transaction);
      return { state: 'superseded' };
    }
    const currentMetadata = plainMetadata(plan);
    const currentPdf = currentMetadata.planPdf && typeof currentMetadata.planPdf === 'object'
      ? currentMetadata.planPdf
      : null;
    const promoted = shouldPromoteGeneratedPdf({
      currentPdf,
      promoteGenerated: job.promote_generated === true,
    });
    const generatedPdf = {
      ...artifact.planPdf,
      sourceType: 'generated',
      state: 'ready',
      derivativeId: job.id,
      sourceRevision: Number(job.source_revision),
      sourceHash: job.source_hash,
      renderHash: job.render_hash,
      rendererVersion: job.renderer_version,
      checksum: artifact.checksum,
      needsReview: false,
    };
    if (promoted) {
      await plan.update({
        metadata: sanitizeWorkoutPlanMetadataForPersistence({
          ...currentMetadata,
          planPdf: generatedPdf,
        }),
      }, { transaction });
    }
    await sequelizeInstance.query([
      'UPDATE workout_plan_pdf_derivatives SET',
      "  state = 'ready', safe_error_code = NULL,",
      '  storage_key = :storageKey, byte_size = :byteSize, checksum = :checksum,',
      '  ready_at = NOW(), updated_at = NOW()',
      'WHERE id = :id',
    ].join('\n'), {
      replacements: {
        id: job.id,
        storageKey: artifact.planPdf.storageKey,
        byteSize: Number(artifact.planPdf.size),
        checksum: artifact.checksum,
      },
      transaction,
    });
    return { state: 'ready', promoted };
  });
}
export async function processWorkoutPlanPdfDerivativeJob(job, {
  sequelizeInstance = sequelize,
  WorkoutPlan = getWorkoutPlan(),
  User = getUser(),
  renderAndStore = buildAndStoreGeneratedWorkoutPlanPdf,
} = {}) {
  let artifact = null;
  try {
    const plan = await WorkoutPlan.findByPk(job.plan_id);
    if (!plan) {
      await markSuperseded(sequelizeInstance, job);
      return { state: 'superseded' };
    }
    const context = await loadRenderContext({ plan, User });
    if (!isWorkoutPlanPdfJobCurrent({
      job,
      plan,
      brandKey: context.brandKey,
      renderHash: context.renderHash,
    })) {
      await markSuperseded(sequelizeInstance, job);
      return { state: 'superseded' };
    }
    artifact = await renderAndStore({
      plan,
      brand: context.brand,
      uploadedBy: job.requested_by || plan.trainerId,
    });
    return await promoteReadyArtifact({
      sequelizeInstance,
      WorkoutPlan,
      User,
      job,
      artifact,
    });
  } catch (error) {
    await recordFailure(sequelizeInstance, job, error, artifact || {});
    logger.warn('[WorkoutPlanPdfWorker] job=%s failed code=%s attempt=%d',
      job.id, classifyWorkoutPlanPdfDerivativeError(error), Number(job.attempt_count) || 1);
    return { state: 'failed', safeErrorCode: classifyWorkoutPlanPdfDerivativeError(error) };
  }
}
export async function recoverStaleWorkoutPlanPdfJobs(sequelizeInstance = sequelize) {
  await sequelizeInstance.query([
    'UPDATE workout_plan_pdf_derivatives SET',
    "  state = 'failed', safe_error_code = 'WORKOUT_PLAN_PDF_STALE_RECOVERED',",
    '  next_attempt_at = NOW(), updated_at = NOW()',
    "WHERE state = 'rendering'",
    "  AND updated_at < NOW() - INTERVAL '" + STALE_RENDER_MINUTES + " minutes'",
  ].join('\n'));
}
export async function claimWorkoutPlanPdfJobs(sequelizeInstance = sequelize) {
  const result = await sequelizeInstance.query([
    'WITH candidates AS (',
    '  SELECT id FROM workout_plan_pdf_derivatives',
    "  WHERE state IN ('pending','failed')",
    '    AND attempt_count < :maxAttempts AND next_attempt_at <= NOW()',
    '  ORDER BY next_attempt_at ASC, created_at ASC',
    '  LIMIT :limit FOR UPDATE SKIP LOCKED',
    ')',
    'UPDATE workout_plan_pdf_derivatives d SET',
    "  state = 'rendering', attempt_count = d.attempt_count + 1,",
    '  claimed_at = NOW(), updated_at = NOW()',
    'FROM candidates c WHERE d.id = c.id RETURNING d.*',
  ].join('\n'), {
    replacements: { maxAttempts: MAX_ATTEMPTS, limit: BATCH_SIZE },
  });
  return rowsFrom(result);
}
export async function runWorkoutPlanPdfDerivativeSweep(dependencies = {}) {
  const sequelizeInstance = dependencies.sequelizeInstance || sequelize;
  await recoverStaleWorkoutPlanPdfJobs(sequelizeInstance);
  const jobs = await claimWorkoutPlanPdfJobs(sequelizeInstance);
  for (const job of jobs) {
    await processWorkoutPlanPdfDerivativeJob(job, { ...dependencies, sequelizeInstance });
  }
  return { processed: jobs.length };
}
export function startWorkoutPlanPdfDerivativeWorker() {
  if (!workoutPlanPdfDerivativesEnabled()) return;
  if (intervalHandle) return;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runWorkoutPlanPdfDerivativeSweep();
    } catch (error) {
      logger.error('[WorkoutPlanPdfWorker] sweep failed: %s', error.message);
    } finally {
      running = false;
    }
  };
  run();
  intervalHandle = setInterval(run, POLL_INTERVAL_MS);
  if (intervalHandle.unref) intervalHandle.unref();
}
export function stopWorkoutPlanPdfDerivativeWorker() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
  running = false;
}
export const _internal = {
  BACKOFF_SECONDS,
  BATCH_SIZE,
  MAX_ATTEMPTS,
  POLL_INTERVAL_MS,
  STALE_RENDER_MINUTES,
};
