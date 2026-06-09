/**
 * clientBaselineMeasurementService.mjs
 * ====================================
 * Builds and persists admin-created baseline measurement records.
 *
 * Purpose:
 * - Keep the baseline measurement controller focused on route access.
 * - Preserve the existing field contract for POST /api/admin/baseline-measurements.
 * - Centralize JSON-object normalization for range-of-motion data.
 */

import { isPlainObject } from '../utils/onboardingHelpers.mjs';

const normalizeJsonObject = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return isPlainObject(value) ? value : null;
};

const nullableValue = (value) => value || null;

export const buildBaselineMeasurementCreatePayload = ({
  targetUserId,
  recordedByUserId,
  measurementData = {},
}) => ({
  userId: targetUserId,
  recordedBy: recordedByUserId,
  takenAt: measurementData.takenAt || new Date(),
  restingHeartRate: nullableValue(measurementData.restingHeartRate),
  bloodPressureSystolic: nullableValue(measurementData.bloodPressureSystolic),
  bloodPressureDiastolic: nullableValue(measurementData.bloodPressureDiastolic),
  bodyWeight: nullableValue(measurementData.bodyWeight),
  bodyFatPercentage: nullableValue(measurementData.bodyFatPercentage),
  benchPressWeight: nullableValue(measurementData.benchPressWeight),
  benchPressReps: nullableValue(measurementData.benchPressReps),
  squatWeight: nullableValue(measurementData.squatWeight),
  squatReps: nullableValue(measurementData.squatReps),
  deadliftWeight: nullableValue(measurementData.deadliftWeight),
  deadliftReps: nullableValue(measurementData.deadliftReps),
  pullUpsReps: nullableValue(measurementData.pullUpsReps),
  plankDuration: nullableValue(measurementData.plankDuration),
  flexibilityNotes: nullableValue(measurementData.flexibilityNotes),
  rangeOfMotion: normalizeJsonObject(measurementData.rangeOfMotion),
  injuryNotes: nullableValue(measurementData.injuryNotes),
  painLevel: measurementData.painLevel || 0,
});

export const createBaselineMeasurementRecord = async ({
  models,
  targetUserId,
  recordedByUserId,
  measurementData,
}) => {
  const { ClientBaselineMeasurements } = models;
  const payload = buildBaselineMeasurementCreatePayload({
    targetUserId,
    recordedByUserId,
    measurementData,
  });

  return ClientBaselineMeasurements.create(payload);
};
