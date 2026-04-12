/**
 * ============================================================================
 * FILE: measurementWriteService.mjs
 * PURPOSE: Shared measurement write service for AI command dispatcher
 * OWNER: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the canonical write paths for measurement
 * AI commands (exec-substrate-v6 + v12).
 *
 * EXPORTS:
 *   logWeighIn        (v6)  — weight-only write, narrow schema
 *   logMeasurements   (v12) — full body-composition write, narrow voice schema
 *
 * LIVE WRITE BEHAVIOR PRESERVED:
 *   Mirrors the createMeasurement controller's post-commit enrichment pattern:
 *   1. BodyMeasurement.create()    — the write
 *   2. runEnrichment()             — shared fire-and-forget helper:
 *        calculateComparisons()   → non-blocking, failure is a warning
 *        detectMilestones()       → non-blocking, failure is a warning
 *        syncMeasurementDates()   → non-blocking, failure is a warning
 *
 * KNOWN INTENTIONAL DELTA vs. HTTP controller:
 *   The persistent notification clear (NotificationModel.update read=true) is
 *   omitted — it is a UI concern, not write correctness. The measurement row
 *   itself is identical to what the HTTP route would create.
 *
 * DECIMAL NORMALIZATION:
 *   PostgreSQL returns DECIMAL columns as strings via the pg driver.
 *   All DECIMAL fields are normalized with parseFloat() before returning.
 *
 * FIELD MAPPING (log_measurements voice schema → DB columns):
 *   weight  → weight
 *   bodyFat → bodyFatPercentage
 *   chest   → chest
 *   waist   → naturalWaist   (most common tape point; explicit choice)
 *   hips    → hips
 *   arms    → leftBicep + rightBicep   (bilateral; same value)
 *   thighs  → leftThigh + rightThigh   (bilateral; same value)
 *   notes   → notes
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

/**
 * Shared fire-and-forget post-create enrichment.
 * Used by both logWeighIn and logMeasurements — single canonical path.
 * Failures are non-fatal warnings; the measurement row is already committed.
 *
 * @param {number} clientId
 * @param {object} row - Sequelize BodyMeasurement instance
 */
function runEnrichment(clientId, row) {
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
}

/**
 * Normalize a measurementDate from DB row to YYYY-MM-DD string or null.
 *
 * @param {Date|string|null} val
 * @returns {string|null}
 */
function toDateString(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

// ── Service: logWeighIn ───────────────────────────────────────────────────────

/**
 * Create a minimal weigh-in record for a client.
 * Called by the log_weighin command dispatcher (exec-substrate-v6).
 *
 * @param {{ weight: number, weightUnit?: string }} data
 * @param {{ clientId: number, trainerId: number }} opts
 * @returns {Promise<{ measurementId: number, userId: number, weight: number|null, weightUnit: string, measurementDate: string }>}
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

  runEnrichment(clientId, row);

  logger.info('[MeasurementWriteService] Weigh-in created', {
    measurementId: row.id,
    clientId,
    trainerId,
  });

  return {
    measurementId:  row.id,
    userId:         clientId,
    weight:         decimalToNumber(row.weight),
    weightUnit:     row.weightUnit || 'lbs',
    measurementDate: toDateString(row.measurementDate),
  };
}

// ── Service: logMeasurements ──────────────────────────────────────────────────

/**
 * Circumference field keys exposed by the voice schema.
 * Used by both the validation guard and fieldsLogged counter.
 */
const CIRC_FIELDS = ['chest', 'waist', 'hips', 'arms', 'thighs'];

/**
 * Create a full body-composition measurement record for a client.
 * Called by the log_measurements command dispatcher (exec-substrate-v12).
 *
 * VALIDATION: At least one actual measurement field must be present.
 * notes alone is not sufficient — it must accompany a real data point.
 *
 * FIELD MAPPING (voice schema → DB columns):
 *   weight  → weight
 *   bodyFat → bodyFatPercentage
 *   chest   → chest
 *   waist   → naturalWaist
 *   hips    → hips
 *   arms    → leftBicep + rightBicep  (symmetric bilateral assignment)
 *   thighs  → leftThigh + rightThigh  (symmetric bilateral assignment)
 *   notes   → notes
 *
 * @param {{
 *   weight?: number, bodyFat?: number, chest?: number, waist?: number,
 *   hips?: number, arms?: number, thighs?: number, notes?: string
 * }} data
 * @param {{ clientId: number, trainerId: number }} opts
 * @returns {Promise<{
 *   measurementId, userId, measurementDate, weight, weightUnit,
 *   bodyFatPercentage, fieldsLogged
 * }>}
 */
export async function logMeasurements(data, { clientId, trainerId }) {
  // Validation: at least one numeric measurement field required.
  // notes is metadata — it does not constitute a measurement.
  const hasMeasurement = (
    data.weight  != null ||
    data.bodyFat != null ||
    data.chest   != null ||
    data.waist   != null ||
    data.hips    != null ||
    data.arms    != null ||
    data.thighs  != null
  );

  if (!hasMeasurement) {
    throw new Error(
      'At least one measurement value is required (weight, bodyFat, chest, waist, hips, arms, or thighs). ' +
      'Notes alone cannot create a measurement record.'
    );
  }

  const BodyMeasurement = getBodyMeasurement();

  const row = await BodyMeasurement.create({
    userId:            clientId,
    recordedBy:        trainerId,
    measurementDate:   new Date(),
    weightUnit:        'lbs',
    circumferenceUnit: 'inches',
    measurementMethod: 'manual_tape',
    isVerified:        true,
    // Numeric fields — null if not provided
    weight:            data.weight  ?? null,
    bodyFatPercentage: data.bodyFat ?? null,
    chest:             data.chest   ?? null,
    naturalWaist:      data.waist   ?? null,   // waist → naturalWaist (explicit)
    hips:              data.hips    ?? null,
    leftBicep:         data.arms    ?? null,   // symmetric bilateral
    rightBicep:        data.arms    ?? null,
    leftThigh:         data.thighs  ?? null,   // symmetric bilateral
    rightThigh:        data.thighs  ?? null,
    notes:             data.notes   ?? null,
  });

  runEnrichment(clientId, row);

  // Count only the five voice-schema circumference groups (not bilateral pairs)
  const fieldsLogged = CIRC_FIELDS.filter(f => data[f] != null).length;

  logger.info('[MeasurementWriteService] Full measurement created', {
    measurementId: row.id,
    clientId,
    trainerId,
    fieldsLogged,
  });

  return {
    measurementId:     row.id,
    userId:            clientId,
    measurementDate:   toDateString(row.measurementDate),
    weight:            decimalToNumber(row.weight),
    weightUnit:        'lbs',
    bodyFatPercentage: decimalToNumber(row.bodyFatPercentage),
    fieldsLogged,
  };
}
