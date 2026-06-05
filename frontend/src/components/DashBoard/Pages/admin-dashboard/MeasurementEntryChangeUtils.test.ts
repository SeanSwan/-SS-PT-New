import { describe, expect, it } from 'vitest';
import { getMeasurementChange } from './MeasurementEntry.changeUtils';

describe('MeasurementEntry change helpers', () => {
  it('returns empty change state when either measurement value is missing', () => {
    expect(getMeasurementChange('weight', {}, { weight: 190 })).toEqual({ kind: 'empty' });
    expect(getMeasurementChange('weight', { weight: 200 }, {})).toEqual({ kind: 'empty' });
  });

  it('returns neutral change state for unchanged values', () => {
    expect(getMeasurementChange('chest', { chest: 42 }, { chest: 42 })).toEqual({
      kind: 'neutral',
      label: '0.0',
    });
  });

  it('marks lower-is-better fields as success when they decrease', () => {
    expect(getMeasurementChange('naturalWaist', { naturalWaist: 36 }, { naturalWaist: 34 })).toEqual({
      kind: 'trend',
      label: '-2.00',
      variant: 'success',
    });
  });

  it('marks standard fields as success when they increase', () => {
    expect(getMeasurementChange('rightBicep', { rightBicep: 15 }, { rightBicep: 16.25 })).toEqual({
      kind: 'trend',
      label: '+1.25',
      variant: 'success',
    });
  });
});
