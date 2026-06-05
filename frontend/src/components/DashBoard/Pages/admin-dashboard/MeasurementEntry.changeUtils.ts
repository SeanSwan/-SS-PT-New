/**
 * ============================================================================
 * FILE: MeasurementEntry.changeUtils.ts
 * PURPOSE: Pure measurement change calculations for trend chips.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Converts latest-vs-new measurement values into the minimal state needed by
 * MeasurementEntry's visual change chip.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry renders icons and styled chips; this helper decides only the
 * semantic change kind, display label, and success/error variant.
 */

import { negativeIsBetter } from './MeasurementEntry.config';
import type { BodyMeasurement } from './MeasurementEntry.types';

export type MeasurementChange =
  | { kind: 'empty' }
  | { kind: 'neutral'; label: string }
  | { kind: 'trend'; label: string; variant: 'success' | 'error' };

export const getMeasurementChange = (
  field: keyof BodyMeasurement,
  latestMeasurement: Partial<BodyMeasurement> | null | undefined,
  newMeasurement: Partial<BodyMeasurement> | null | undefined,
): MeasurementChange => {
  const prevValue = latestMeasurement?.[field] as number | undefined;
  const newValue = newMeasurement?.[field] as number | undefined;

  if (prevValue === undefined || newValue === undefined || isNaN(prevValue) || isNaN(newValue)) {
    return { kind: 'empty' };
  }

  const change = newValue - prevValue;
  if (change === 0) {
    return { kind: 'neutral', label: '0.0' };
  }

  const isGood = negativeIsBetter.includes(field) ? change < 0 : change > 0;
  return {
    kind: 'trend',
    label: `${change > 0 ? '+' : ''}${change.toFixed(2)}`,
    variant: isGood ? 'success' : 'error',
  };
};
