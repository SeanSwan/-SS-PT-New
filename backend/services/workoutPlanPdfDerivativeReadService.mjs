/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeReadService.mjs
 * PURPOSE: Batch safe PDF derivative status reads for staff plan surfaces.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * Staff plan lists call one bounded query for every visible plan. The summary
 * deliberately omits storage keys, checksums, and raw worker errors.
 */

const compactString = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

export const summarizeWorkoutPlanPdfDerivative = (row, enabled = true) => {
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

const statusFromRows = (rows = []) => {
  const latestGenerated = rows.find((row) => row.source_type === 'generated') || null;
  const latestManual = rows.find((row) => row.source_type === 'manual') || null;
  return {
    enabled: true,
    state: latestGenerated?.state || latestManual?.state || 'missing',
    latestGenerated: summarizeWorkoutPlanPdfDerivative(latestGenerated),
    latestManual: summarizeWorkoutPlanPdfDerivative(latestManual),
  };
};

const boundedPlanIds = (planIds) => Array.from(new Set(
  (Array.isArray(planIds) ? planIds : [])
    .map((planId) => String(planId || '').trim())
    .filter(Boolean),
)).slice(0, 50);

export async function getWorkoutPlanPdfDerivativeStatusesForPlans({
  sequelize,
  planIds,
  enabled = true,
} = {}) {
  const ids = boundedPlanIds(planIds);
  if (ids.length === 0) return {};
  if (!enabled) {
    return Object.fromEntries(ids.map((planId) => [
      planId,
      { enabled: false, state: 'legacy' },
    ]));
  }
  if (typeof sequelize?.query !== 'function') throw new Error('Sequelize query is required');

  const [rows = []] = await sequelize.query([
    'SELECT plan_id, id, state, source_type, source_revision, source_hash,',
    '  render_hash, renderer_version, needs_review, attempt_count,',
    '  safe_error_code, ready_at, created_at',
    'FROM workout_plan_pdf_derivatives',
    'WHERE plan_id IN (:planIds)',
    'ORDER BY plan_id ASC, created_at DESC',
  ].join('\n'), { replacements: { planIds: ids } });
  const byPlanId = new Map(ids.map((planId) => [planId, []]));
  for (const row of Array.isArray(rows) ? rows : []) {
    const planRows = byPlanId.get(String(row.plan_id))
      || (ids.length === 1 ? byPlanId.get(ids[0]) : null);
    if (planRows) planRows.push(row);
  }

  return Object.fromEntries(ids.map((planId) => [
    planId,
    statusFromRows(byPlanId.get(planId)),
  ]));
}

export async function getWorkoutPlanPdfDerivativeStatus({
  sequelize,
  planId,
  enabled = true,
} = {}) {
  const normalizedPlanId = String(planId || '').trim();
  if (!normalizedPlanId) return enabled ? null : { enabled: false, state: 'legacy' };
  const statuses = await getWorkoutPlanPdfDerivativeStatusesForPlans({
    sequelize,
    planIds: [normalizedPlanId],
    enabled,
  });
  return statuses[normalizedPlanId];
}