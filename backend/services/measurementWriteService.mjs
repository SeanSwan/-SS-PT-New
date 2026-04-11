/**
 * ============================================================================
 * FILE: measurementWriteService.mjs
 * PURPOSE: Shared narrow measurement write service for AI command dispatcher
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-10
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the canonical write path for log_weighin.
 * Used by the AI command dispatcher (exec-substrate-v6).
 *
 * LIVE WRITE BEHAVIOR PRESERVED:
 *   Mirrors the createMeasurement controller's post-commit pattern:
 *   1. BodyMeasurement.create() — the write
 *   2. calculateComparisons()    — fire-and-forget, failure is non-fatal
 *   3. detectMilestones()        — fire-and-forget, failure is non-fatal
 *   4. syncMeasurementDates()    — fire-and-forget, failure is non-fatal
 *
 * KNOWN INTENTIONAL DELTA vs. HTTP controller:
 *   The persistent notification clear (NotificationModel.update read=true) is
 *   omitted here — it is a UI concern, not write correctness. The measurement
 *   row itself is identical to what the HTTP route would create.
 *
 * DECIMAL NORMALIZATION:
 *   PostgreSQL returns DECIMAL columns as strings via the pg driver.
 *   All DECIMAL fields are normalized with parseFloat() before returning.
 */

import { getBodyMeasurement, getUser } from '../models/index.mjs';
import { calculateComparisons } from './measurementComparisonService.mjs';
import { detectMilestones } from './measurementMilestoneService.mjs';
import { syncMeasurementDates } from './measurementScheduleService.mjs';
import logger from '../utils/logger.mjs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely coerce a DECIMAL model value to a JS number or null.
 * Sequelize/pg returns DECIMAL as string — parseFloat normalizes this.
 *
 * @param {string|number|null|undefined} val
 * @returns {number|null}
 */
function decimalToNumber(val) {
  if (val == null) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Create a minimal weigh-in record for a client.
 * Called by the log_weighin command dispatcher entry.
 *
 * @param {{ weight: number, weightUnit?: string }} data
 * @param {{ clientId: number, trainerId: number }} opts
 * @returns {Promise<{ measurementId: number, userId: number, weight: number|null, weightUnit: string, measurementDate: string }>}
 * @throws {Error} If BodyMeasurement.create() fails — caller receives the error
 */
export async function logWeighIn(data, { clientId, trainerId }) {
  const BodyMeasurement = getBodyMeasurement();

  const row = await BodyMeasurement.create({
    userId:            clientId,
    recordedBy:        trainerId,
    weight:            data.weight,
    weightUnit:        data.weightUnit || 'lbs',
    measurementDate:   new Date(),
    isVerified:        true,
    measurementMethod: 'manual_tape',
  });

  // Non-blocking enrichment — same fire-and-forget pattern as createMeasurement controller.
  // Failures are warnings, not write errors.
  calculateComparisons(clientId, row.id)
    .then(compResult =>
      row.update({
        comparisonData: compResult.comparisonData,
        hasProgress:    compResult.hasProgress,
        progressScore:  compResult.progressScore,
      })
    )
    .catch(err =>
      logger.warn('[MeasurementWriteService] Comparison calculation failed', { clientId, error: err.message })
    );

  detectMilestones(clientId, row)
    .catch(err =>
      logger.warn('[MeasurementWriteService] Milestone detection failed', { clientId, error: err.message })
    );

  syncMeasurementDates(getUser(), clientId, row)
    .catch(err =>
      logger.warn('[MeasurementWriteService] Schedule sync failed', { clientId, error: err.message })
    );

  logger.info('[MeasurementWriteService] Weigh-in created', {
    measurementId: row.id,
    clientId,
    trainerId,
  });

  const measurementDate = row.measurementDate instanceof Date
    ? row.measurementDate.toISOString().slice(0, 10)
    : row.measurementDate ? String(row.measurementDate).slice(0, 10) : null;

  return {
    measurementId:  row.id,
    userId:         clientId,
    weight:         decimalToNumber(row.weight),
    weightUnit:     row.weightUnit || 'lbs',
    measurementDate,
  };
}
