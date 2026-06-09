/**
 * ============================================================================
 * FILE: dispatchers/onboardingBaselineDispatcher.mjs
 * PURPOSE: Swan Coach baseline measurement write command handlers
 * OWNER: Codex | CREATED: 2026-06-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Persists trainer/admin dictated baseline measurements for a resolved client.
 *   Keeps onboarding measurement write logic out of the central command map.
 */

import { getAllModels } from '../../../models/index.mjs';
import { toFiniteNumberOrNull } from '../../clientTrainingSafeReadValueService.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const parseBloodPressure = (value) => {
  const match = String(value || '').match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return { systolic: null, diastolic: null };
  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
};

const formatBloodPressure = (systolic, diastolic) => (
  systolic && diastolic ? `${systolic}/${diastolic}` : null
);

const dateOrNow = (value) => (value ? new Date(value) : new Date());

const nullableText = (value) => value || null;

const numberFromFirst = (values) => {
  for (const value of values) {
    const parsed = toFiniteNumberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const buildBaselinePayload = ({ params, ctx, clientId }) => {
  const parsedBloodPressure = parseBloodPressure(params.bloodPressure);
  return {
    userId: clientId,
    recordedBy: ctx.user?.id,
    takenAt: dateOrNow(params.takenAt),
    restingHeartRate: toFiniteNumberOrNull(params.restingHeartRate),
    bloodPressureSystolic: numberFromFirst([params.bloodPressureSystolic, parsedBloodPressure.systolic]),
    bloodPressureDiastolic: numberFromFirst([params.bloodPressureDiastolic, parsedBloodPressure.diastolic]),
    bodyWeight: numberFromFirst([params.bodyWeight, params.weight]),
    bodyFatPercentage: numberFromFirst([params.bodyFatPercentage, params.bodyFat]),
    injuryNotes: nullableText(params.injuryNotes),
    painLevel: toFiniteNumberOrNull(params.painLevel) ?? 0,
    notes: nullableText(params.notes),
  };
};

const readResultValue = (baseline, payload, field) => (
  baseline?.[field] ?? payload[field]
);

const buildBaselineResult = ({ baseline, payload, clientId }) => ({
  baselineId: baseline?.id ?? null,
  clientId,
  bodyWeight: readResultValue(baseline, payload, 'bodyWeight'),
  bodyFatPercentage: readResultValue(baseline, payload, 'bodyFatPercentage'),
  restingHeartRate: readResultValue(baseline, payload, 'restingHeartRate'),
  bloodPressure: formatBloodPressure(
    readResultValue(baseline, payload, 'bloodPressureSystolic'),
    readResultValue(baseline, payload, 'bloodPressureDiastolic')
  ),
});

export const dispatchFillBaselineMeasurements = async (params = {}, ctx = {}) => {
  const { ClientBaselineMeasurements } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const payload = buildBaselinePayload({ params, ctx, clientId });
  const baseline = await ClientBaselineMeasurements.create(payload);

  return buildBaselineResult({ baseline, payload, clientId });
};
