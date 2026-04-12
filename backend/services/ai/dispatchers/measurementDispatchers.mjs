/**
 * ============================================================================
 * FILE: dispatchers/measurementDispatchers.mjs
 * PURPOSE: Dispatcher handlers for measurement-domain AI commands
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Houses the three measurement-domain command handlers.
 * Extracted from commandDispatcher.mjs (exec-substrate-v8) to keep that file
 * under the 300-line ceiling.
 *
 * COMMANDS:
 *   D01: viewLatestMeasurements  (v6)  — BodyMeasurement.findOne latest (flat scalar snapshot)
 *   D02: dispatchLogWeighIn      (v6)  — measurementWriteService.logWeighIn confirmed write
 *   D03: viewMeasurementTrends   (v8)  — BodyMeasurement 2x findOne + count (flat scalar delta)
 *   D04: dispatchLogMeasurements (v12) — measurementWriteService.logMeasurements (full voice schema)
 *
 * DECIMAL NORMALIZATION:
 *   PostgreSQL returns DECIMAL columns as strings via the pg driver.
 *   All DECIMAL fields are normalized with parseFloat() before returning.
 */

import { getBodyMeasurement } from '../../../models/index.mjs';
import { logWeighIn, logMeasurements } from '../../measurementWriteService.mjs';

// ── Shared helper ────────────────────────────────────────────────────────────

const n = (v) => v != null ? parseFloat(v) : null;
const toDate = (v) => {
  if (!v) return null;
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
};

// ── D01: view_latest_measurements ────────────────────────────────────────────

/**
 * Returns the most recent measurement snapshot for a client.
 * No confirmation gate (requiresConfirmation: false).
 *
 * @returns {{ userId, measurementDate, weight, weightUnit, bodyFatPercentage }}
 */
export async function viewLatestMeasurements(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  const BodyMeasurement = getBodyMeasurement();
  const row = await BodyMeasurement.findOne({
    where:      { userId: clientId },
    order:      [['measurementDate', 'DESC']],
    attributes: ['measurementDate', 'weight', 'weightUnit', 'bodyFatPercentage'],
  });
  if (!row) {
    return { userId: clientId, measurementDate: null, weight: null, weightUnit: 'lbs', bodyFatPercentage: null };
  }
  return {
    userId:            clientId,
    measurementDate:   toDate(row.measurementDate),
    weight:            n(row.weight),
    weightUnit:        row.weightUnit || 'lbs',
    bodyFatPercentage: n(row.bodyFatPercentage),
  };
}

// ── D02: log_weighin ──────────────────────────────────────────────────────────

/**
 * Creates a weigh-in record via the shared measurement write service.
 * Confirmation-gated (requiresConfirmation: true, destructive: false).
 *
 * @returns {{ measurementId, userId, weight, weightUnit, measurementDate }}
 */
export async function dispatchLogWeighIn(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  return logWeighIn(
    { weight: params.weight, weightUnit: 'lbs' },
    { clientId, trainerId: ctx.user.id },
  );
}

// ── D04: log_measurements ─────────────────────────────────────────────────────

/**
 * Creates a full body-composition measurement record via the shared write service.
 * Confirmation-gated (requiresConfirmation: true, destructive: false).
 * At least one numeric field required — notes alone returns an honest error.
 *
 * Field mapping (voice schema → DB):
 *   weight → weight | bodyFat → bodyFatPercentage
 *   chest → chest   | waist → naturalWaist
 *   hips → hips     | arms → leftBicep+rightBicep | thighs → leftThigh+rightThigh
 *
 * @returns {{ measurementId, userId, measurementDate, weight, weightUnit, bodyFatPercentage, fieldsLogged }}
 */
export async function dispatchLogMeasurements(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  return logMeasurements(
    {
      weight:  params.weight  ?? null,
      bodyFat: params.bodyFat ?? null,
      chest:   params.chest   ?? null,
      waist:   params.waist   ?? null,
      hips:    params.hips    ?? null,
      arms:    params.arms    ?? null,
      thighs:  params.thighs  ?? null,
      notes:   params.notes   ?? null,
    },
    { clientId, trainerId: ctx.user.id },
  );
}

// ── D03: view_measurement_trends ──────────────────────────────────────────────

/**
 * Returns a flat scalar trend summary for a client's full measurement history.
 * Runs 3 queries in parallel (first, latest, count).
 * No confirmation gate (requiresConfirmation: false).
 *
 * Special cases:
 *   - 0 measurements → empty result, all trend fields null
 *   - 1 measurement  → daysSinceStart: 0, weightChange: null, bodyFatChange: null
 *                       (no comparison baseline — do not report 0 as "no change")
 *   - 2+ measurements → signed deltas; negative weight/bodyFat = reduction
 *
 * @returns {{
 *   totalMeasurements, daysSinceStart, firstDate, latestDate,
 *   latestWeight, weightUnit, weightChange, latestBodyFat, bodyFatChange
 * }}
 */
export async function viewMeasurementTrends(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  const BodyMeasurement = getBodyMeasurement();

  const [first, latest, totalMeasurements] = await Promise.all([
    BodyMeasurement.findOne({
      where:      { userId: clientId },
      order:      [['measurementDate', 'ASC']],
      attributes: ['measurementDate', 'weight', 'weightUnit', 'bodyFatPercentage'],
    }),
    BodyMeasurement.findOne({
      where:      { userId: clientId },
      order:      [['measurementDate', 'DESC']],
      attributes: ['measurementDate', 'weight', 'weightUnit', 'bodyFatPercentage'],
    }),
    BodyMeasurement.count({ where: { userId: clientId } }),
  ]);

  // Empty: no measurements at all
  if (!first || !latest || totalMeasurements === 0) {
    return {
      totalMeasurements: 0,
      daysSinceStart:    null,
      firstDate:         null,
      latestDate:        null,
      latestWeight:      null,
      weightUnit:        'lbs',
      weightChange:      null,
      latestBodyFat:     null,
      bodyFatChange:     null,
    };
  }

  const firstDate  = toDate(first.measurementDate);
  const latestDate = toDate(latest.measurementDate);

  const daysSinceStart = (firstDate && latestDate && firstDate !== latestDate)
    ? Math.floor((new Date(latestDate) - new Date(firstDate)) / 86400000)
    : 0;

  const latestWeight  = n(latest.weight);
  const latestBodyFat = n(latest.bodyFatPercentage);
  // weightUnit comes from the latest measurement row — do not default kg users to lbs
  const weightUnit    = latest.weightUnit || 'lbs';

  // Single measurement: no comparison baseline — null not zero
  if (totalMeasurements < 2) {
    return {
      totalMeasurements,
      daysSinceStart: 0,
      firstDate,
      latestDate,
      latestWeight,
      weightUnit,
      weightChange:  null,
      latestBodyFat,
      bodyFatChange: null,
    };
  }

  const round2 = (v) => Math.round(v * 100) / 100;
  const firstWeight  = n(first.weight);
  const firstBodyFat = n(first.bodyFatPercentage);

  return {
    totalMeasurements,
    daysSinceStart,
    firstDate,
    latestDate,
    latestWeight,
    weightUnit,
    weightChange:  (firstWeight  != null && latestWeight  != null) ? round2(latestWeight  - firstWeight)  : null,
    latestBodyFat,
    bodyFatChange: (firstBodyFat != null && latestBodyFat != null) ? round2(latestBodyFat - firstBodyFat) : null,
  };
}
