import { describe, expect, it } from 'vitest';
import { __testing__ } from '../services/bootcamp/bootcampGenerator.mjs';

describe('bootcamp equipment profile matching', () => {
  it('builds exercise-filter tokens from scanned equipment names, categories, and resistance types', () => {
    const available = __testing__.buildAvailableEquipmentList([
      { name: 'Adjustable Dumbbells', category: 'dumbbell', resistanceType: 'dumbbell' },
      { name: 'Cable Station', category: 'cable_machine', resistanceType: 'cable' },
      { name: 'Flat Bench', category: 'bench', resistanceType: null },
    ]);

    expect(available).toEqual(expect.arrayContaining([
      'adjustable dumbbells',
      'dumbbell',
      'cable station',
      'cable_machine',
      'cable machine',
      'cable',
      'flat bench',
      'bench',
      'bodyweight',
      'none',
    ]));
    expect(new Set(available).size).toBe(available.length);
  });
});
