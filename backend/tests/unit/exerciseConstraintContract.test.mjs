import { describe, expect, it } from 'vitest';
import {
  equipmentRequirementGroups,
  matchesEquipmentRequirements,
} from '../../services/exerciseConstraintContract.mjs';

describe('shared exercise equipment contract', () => {
  it('fails closed on absent, malformed and partially malformed requirements', () => {
    for (const equipment of [undefined, null, {}, [null], ['barbell', {}], '{broken']) {
      expect(matchesEquipmentRequirements({ equipment }, ['barbell'])).toBe(false);
    }
    expect(matchesEquipmentRequirements({ equipmentRequirementGroups: [] }, [])).toBe(false);
    expect(matchesEquipmentRequirements({ equipment: JSON.stringify(JSON.stringify(['bench', 'barbell'])) }, ['bench', 'barbell'])).toBe(true);
  });

  it('does not infer legacy OR from a catalog display name', () => {
    expect(matchesEquipmentRequirements({ name: 'Goblet Squat', equipmentNeeded: ['dumbbell', 'kettlebell'] }, ['dumbbell'])).toBe(false);
    expect(matchesEquipmentRequirements({ equipment: ['No Equipment'] }, [])).toBe(true);
  });
  it('requires every generic equipment token while always allowing bodyweight', () => {
    const exercise = { key: 'supported_dumbbell_row', equipment: ['Dumbbells', 'Flat Bench'] };

    expect(matchesEquipmentRequirements(exercise, ['dumbbell', 'bench'])).toBe(true);
    expect(matchesEquipmentRequirements(exercise, ['dumbbell'])).toBe(false);
    expect(matchesEquipmentRequirements({ equipment: [] }, [])).toBe(true);
  });

  it('keeps explicit legacy alternatives as OR groups', () => {
    expect(equipmentRequirementGroups({ key: 'face_pulls', equipment: ['cable_machine', 'resistance_band'] }))
      .toEqual([['cable_machine', 'resistance_band']]);
    expect(matchesEquipmentRequirements({ key: 'face_pulls', equipment: ['cable_machine', 'resistance_band'] }, ['resistance_band']))
      .toBe(true);
    expect(matchesEquipmentRequirements({ key: 'face_pulls', equipment: ['cable_machine', 'resistance_band'] }, ['dumbbell']))
      .toBe(false);
  });

  it('does not let a bodyweight token erase an additional required implement', () => {
    expect(matchesEquipmentRequirements({ equipment: ['bodyweight', 'rack'] }, ['bodyweight'])).toBe(false);
    expect(matchesEquipmentRequirements({ equipment: ['bodyweight', 'rack'] }, ['rack'])).toBe(true);
  });
});
