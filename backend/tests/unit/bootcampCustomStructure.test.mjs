import { describe, expect, it } from 'vitest';
import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';

describe('bootcamp custom station structure', () => {
  it('resolves trainer-selected station and exercise counts as a custom station format', () => {
    const structure = __testing__.resolveBootcampStructure({
      classFormat: '4x4_r2',
      stationCount: 6,
      exercisesPerStation: 5,
      targetDuration: 40,
    });

    expect(structure.classFormat).toBe('custom');
    expect(structure.stationCount).toBe(6);
    expect(structure.format.fixedStations).toBe(6);
    expect(structure.format.exercisesPerStation).toBe(5);
    expect(structure.format.durationSec).toBeGreaterThanOrEqual(20);
    expect(structure.format.durationSec).toBeLessThanOrEqual(60);
  });

  it('clamps custom station structure into the builder-supported range', () => {
    const structure = __testing__.resolveBootcampStructure({
      classFormat: 'custom',
      stationCount: 99,
      exercisesPerStation: 0,
      targetDuration: 40,
    });

    expect(structure.stationCount).toBe(6);
    expect(structure.format.fixedStations).toBe(6);
    expect(structure.format.exercisesPerStation).toBe(1);
  });
});
