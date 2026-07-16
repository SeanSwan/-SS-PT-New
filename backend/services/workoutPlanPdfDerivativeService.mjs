/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeService.mjs
 * PURPOSE: Own PDF render identity, durable requests, and safe status summaries.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * Plan writes call this service inside their transaction. The browser never
 * receives private storage keys; workers consume the durable outbox rows.
 */

import { createHash } from 'node:crypto';
import { hashWorkoutPlanContent } from './workoutPlanRevisionService.mjs';

export const PDF_RENDERER_VERSION = 'swan-plan-pdf-v1';

const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const positiveRevision = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const queryRows = async (sequelize, sql, options) => {
  const result = await sequelize.query(sql, options);
  return Array.isArray(result?.[0]) ? result[0] : [];
};

export const workoutPlanPdfDerivativesEnabled = (env = process.env) => (
  String(env.TRAINING_PLAN_PDF_DERIVATIVES || '').trim().toLowerCase() === 'true'
);

export const normalizeWorkoutPlanPdfBrandKey = (clientSource) => (
  String(clientSource || '').trim().toLowerCase().replace(/[\s-]+/g, '_') === 'move_fitness'
    ? 'move_fitness'
    : 'swanstudios'
);

const sourceHashForPlan = (plan) => (
  HASH_PATTERN.test(String(plan?.contentHash || ''))
    ? String(plan.contentHash).toLowerCase()
    : hashWorkoutPlanContent(plan?.planData)
);

export const buildWorkoutPlanPdfDerivativeIdentity = ({
  plan,
  brandKey = 'swanstudios',
  rendererVersion = PDF_RENDERER_VERSION,
} = {}) => {
  if (!plan?.id) throw new Error('Workout plan id is required for PDF generation');
  const sourceRevision = positiveRevision(plan.contentRevision);
  const sourceHash = sourceHashForPlan(plan);
  const normalizedBrandKey = normalizeWorkoutPlanPdfBrandKey(brandKey);
  const renderHash = sha256(JSON.stringify({
    rendererVersion,
    brandKey: normalizedBrandKey,
    sourceHash,
    title: compactString(plan.title) || '',
    description: compactString(plan.description) || '',
    durationWeeks: Number(plan.durationWeeks) || 0,
    nasmPhase: Number(plan.nasmPhase) || null,
  }));

  return {
    sourceRevision,
    sourceHash,
    renderHash,
    rendererVersion,
    brandKey: normalizedBrandKey,
    idempotencyKey: (
      String(plan.id) + ':' + sourceRevision + ':' + renderHash + ':' + rendererVersion
    ),
  };
};

const derivativeSummary = (row, enabled = true) => {
  if (!row) return enabled ? null : { enabled: false, state: 'legacy' };
  return {
    enabled,
    id: row.id,
    state: row.state,
    sourceType: row.source_type,
    sourceRevision: Number(row.source_revision) || null,
    sourceHash: compactString(row.source_hash),
    renderHash: compactString(row.render_hash),
    rendererVersion: compactString(row.renderer_version),
    needsReview: row.needs_review === true,
    attemptCount: Number(row.attempt_count) || 0,
    safeErrorCode: compactString(row.safe_error_code),
    readyAt: row.ready_at || null,
  };
};

const readClientSource = async ({ sequelize, userId, transaction }) => {
  const rows = await queryRows(
    sequelize,
    'SELECT "clientSource" FROM "Users" WHERE id = :userId LIMIT 1',
    { replacements: { userId }, transaction },
  );
  return rows[0]?.clientSource;
};

export async function requestWorkoutPlanPdfDerivative({
  sequelize,
  plan,
  requestedBy,
  reason = 'plan_mutation',
  promoteGenerated = false,
  clientSource,
  transaction,
  enabled = workoutPlanPdfDerivativesEnabled(),
} = {}) {
  if (!enabled) return { enabled: false, state: 'legacy' };
  if (typeof sequelize?.query !== 'function') throw new Error('Sequelize query is required');

  const resolvedClientSource = clientSource ?? await readClientSource({
    sequelize,
    userId: plan?.userId,
    transaction,
  });
  const identity = buildWorkoutPlanPdfDerivativeIdentity({
    plan,
    brandKey: normalizeWorkoutPlanPdfBrandKey(resolvedClientSource),
  });
  const sql = [
    'INSERT INTO workout_plan_pdf_derivatives (',
    '  plan_id, source_revision, source_hash, render_hash, renderer_version,',
    '  brand_key, source_type, state, idempotency_key, reason, requested_by,',
    '  promote_generated, next_attempt_at, created_at, updated_at',
    ') VALUES (',
    "  :planId, :sourceRevision, :sourceHash, :renderHash, :rendererVersion,",
    "  :brandKey, 'generated', 'pending', :idempotencyKey, :reason, :requestedBy,",
    '  :promoteGenerated, NOW(), NOW(), NOW()',
    ')',
    'ON CONFLICT (idempotency_key) DO UPDATE SET',
    "  state = CASE",
    "    WHEN workout_plan_pdf_derivatives.state IN ('failed','superseded')",
    "      OR (EXCLUDED.promote_generated AND workout_plan_pdf_derivatives.state = 'ready')",
    "    THEN 'pending' ELSE workout_plan_pdf_derivatives.state END,",
    "  attempt_count = CASE",
    "    WHEN workout_plan_pdf_derivatives.state IN ('failed','superseded')",
    "      OR (EXCLUDED.promote_generated AND workout_plan_pdf_derivatives.state = 'ready')",
    '    THEN 0 ELSE workout_plan_pdf_derivatives.attempt_count END,',
    '  safe_error_code = NULL,',
    '  next_attempt_at = CASE',
    "    WHEN workout_plan_pdf_derivatives.state IN ('failed','superseded','ready')",
    '    THEN NOW() ELSE workout_plan_pdf_derivatives.next_attempt_at END,',
    '  promote_generated = workout_plan_pdf_derivatives.promote_generated',
    '    OR EXCLUDED.promote_generated,',
    '  requested_by = COALESCE(EXCLUDED.requested_by, workout_plan_pdf_derivatives.requested_by),',
    '  reason = EXCLUDED.reason, updated_at = NOW()',
    'RETURNING *',
  ].join('\n');
  const rows = await queryRows(sequelize, sql, {
    replacements: {
      planId: plan.id,
      ...identity,
      reason: String(reason).slice(0, 64),
      requestedBy: Number.isSafeInteger(Number(requestedBy)) ? Number(requestedBy) : null,
      promoteGenerated: promoteGenerated === true,
    },
    transaction,
  });
  return derivativeSummary(rows[0]);
}

export async function markManualWorkoutPlanPdfNeedsReview({
  sequelize,
  planId,
  transaction,
  enabled = workoutPlanPdfDerivativesEnabled(),
} = {}) {
  if (!enabled) return 0;
  const [, metadata] = await sequelize.query(
    [
      'UPDATE workout_plan_pdf_derivatives',
      'SET needs_review = TRUE, updated_at = NOW()',
      'WHERE plan_id = :planId',
      "  AND source_type = 'manual'",
      "  AND state = 'ready'",
      '  AND needs_review = FALSE',
    ].join('\n'),
    { replacements: { planId }, transaction },
  );
  return Number(metadata?.rowCount) || 0;
}

export const markManualPdfMetadataNeedsReview = (metadata = {}) => {
  const current = metadata && typeof metadata === 'object' ? metadata : {};
  const planPdf = current.planPdf && typeof current.planPdf === 'object'
    ? current.planPdf
    : null;
  if (!planPdf || planPdf.sourceType === 'generated') return current;
  return {
    ...current,
    planPdf: {
      ...planPdf,
      sourceType: 'manual',
      state: 'ready',
      needsReview: true,
    },
  };
};

export async function recordManualWorkoutPlanPdfDerivative({
  sequelize,
  plan,
  planPdf,
  checksum,
  requestedBy,
  transaction,
  enabled = workoutPlanPdfDerivativesEnabled(),
} = {}) {
  if (!enabled) return { enabled: false, state: 'legacy' };
  const sourceHash = sourceHashForPlan(plan);
  const storageKey = compactString(planPdf?.storageKey);
  const manualHash = sha256(storageKey + ':' + String(planPdf?.updatedAt || ''));
  const idempotencyKey = (
    String(plan.id) + ':manual:' + (compactString(checksum) || manualHash)
    + ':' + sha256(storageKey || manualHash)
  );
  const rows = await queryRows(sequelize, [
    'INSERT INTO workout_plan_pdf_derivatives (',
    '  plan_id, source_revision, source_hash, render_hash, renderer_version, brand_key,',
    '  source_type, state, idempotency_key, reason, requested_by, storage_key,',
    '  byte_size, checksum, ready_at, next_attempt_at, created_at, updated_at',
    ') VALUES (',
    '  :planId, :sourceRevision, :sourceHash, :renderHash, :rendererVersion, :brandKey,',
    "  'manual', 'ready', :idempotencyKey, 'manual_upload', :requestedBy, :storageKey,",
    '  :byteSize, :checksum, NOW(), NOW(), NOW(), NOW()',
    ') ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()',
    'RETURNING *',
  ].join('\n'), {
    replacements: {
      planId: plan.id,
      sourceRevision: positiveRevision(plan.contentRevision),
      sourceHash,
      renderHash: manualHash,
      rendererVersion: 'manual-upload-v1',
      brandKey: 'manual',
      idempotencyKey,
      requestedBy: Number(requestedBy) || null,
      storageKey,
      byteSize: Number(planPdf?.size) || null,
      checksum: compactString(checksum),
    },
    transaction,
  });
  return derivativeSummary(rows[0]);
}

export async function getWorkoutPlanPdfDerivativeStatus({
  sequelize,
  planId,
  enabled = workoutPlanPdfDerivativesEnabled(),
} = {}) {
  if (!enabled) return { enabled: false, state: 'legacy' };
  const rows = await queryRows(sequelize, [
    'SELECT * FROM workout_plan_pdf_derivatives',
    'WHERE plan_id = :planId',
    'ORDER BY created_at DESC LIMIT 20',
  ].join('\n'), { replacements: { planId } });
  const latestGenerated = rows.find((row) => row.source_type === 'generated') || null;
  const latestManual = rows.find((row) => row.source_type === 'manual') || null;
  return {
    enabled: true,
    state: latestGenerated?.state || latestManual?.state || 'missing',
    latestGenerated: derivativeSummary(latestGenerated),
    latestManual: derivativeSummary(latestManual),
  };
}
