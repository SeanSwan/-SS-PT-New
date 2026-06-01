import { describe, expect, it } from 'vitest';
import { sanitizeMuscleGroupBalanceRows } from './MuscleGroupBalanceBars';

describe('sanitizeMuscleGroupBalanceRows', () => {
  it('drops non-finite muscle volume rows before width scaling', () => {
    const rows = sanitizeMuscleGroupBalanceRows([
      { x: '  Legs  ', y: '1000', sets: '8' },
      { x: 'Infinity row', y: Infinity, sets: 4 },
      { x: 'NaN row', y: Number.NaN, sets: 4 },
      { x: 'Zero row', y: 0, sets: 4 },
      { x: '', y: 500, sets: 4 },
      { x: 'Chest', y: 500, sets: 'bad' },
    ]);

    expect(rows).toEqual([
      { x: 'Legs', y: 1000, sets: 8 },
      { x: 'Chest', y: 500, sets: 0 },
    ]);
  });
});
