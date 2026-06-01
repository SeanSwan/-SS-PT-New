import { describe, expect, it } from 'vitest';

import {
  buildEquipmentProfileTokens,
  exerciseMatchesEquipmentProfile,
} from './BootcampEquipmentProfileFilter';

describe('Bootcamp equipment profile filtering', () => {
  it('builds searchable tokens from trainer equipment profile items', () => {
    const tokens = buildEquipmentProfileTokens([
      { name: 'Adjustable Dumbbells', trainerLabel: 'Home DBs', category: 'Dumbbell', resistanceType: 'free_weight' },
      { name: 'TRX Straps', trainerLabel: null, category: 'Suspension', resistanceType: null },
    ]);

    expect(tokens).toEqual(expect.arrayContaining(['adjustable dumbbells', 'home dbs', 'dumbbell', 'trx straps', 'suspension']));
  });

  it('keeps bodyweight exercises and filters unavailable equipment exercises', () => {
    const tokens = buildEquipmentProfileTokens([
      { name: 'Adjustable Dumbbells', trainerLabel: null, category: 'Dumbbell', resistanceType: null },
    ]);

    expect(exerciseMatchesEquipmentProfile({ equipment: [] }, tokens)).toBe(true);
    expect(exerciseMatchesEquipmentProfile({ equipmentNeeded: ['Dumbbell'] }, tokens)).toBe(true);
    expect(exerciseMatchesEquipmentProfile({ equipmentNeeded: ['Barbell'] }, tokens)).toBe(false);
  });
});
