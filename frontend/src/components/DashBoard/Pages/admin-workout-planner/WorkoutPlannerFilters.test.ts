import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BODY_PARTS,
  EQUIPMENT_FILTERS,
  EXERCISE_TYPES,
  IMPACT_LEVELS,
  SOURCE_FILTERS,
  getJointImpact,
  parseEquipment,
} from './WorkoutPlannerFilters';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutPlannerFilters', () => {
  it('keeps planner filter lists in a focused module instead of the mounted page', () => {
    const pageSource = read('WorkoutPlannerPage.tsx');

    expect(pageSource).toContain("from './WorkoutPlannerFilters'");
    expect(pageSource).not.toMatch(/const BODY_PARTS\s*=/);
    expect(BODY_PARTS).toContain('Full Body');
    expect(EXERCISE_TYPES).toContain('Calisthenics');
    expect(EQUIPMENT_FILTERS).toContain('Resistance Band');
    expect(SOURCE_FILTERS).toEqual(['All Programs', 'NASM', 'SwanStudios']);
    expect(IMPACT_LEVELS).toEqual(['All Impact', 'Low Impact', 'Medium Impact', 'High Impact']);
  });

  it('preserves equipment parsing for JSON strings, arrays, empty values, and single names', () => {
    expect(parseEquipment('["Cable Machine", "Dumbbell"]')).toEqual(['Cable Machine', 'Dumbbell']);
    expect(parseEquipment(['Bodyweight', '', 'TRX'])).toEqual(['Bodyweight', 'TRX']);
    expect(parseEquipment('Medicine Ball')).toEqual(['Medicine Ball']);
    expect(parseEquipment('[]')).toEqual([]);
    expect(parseEquipment(null)).toEqual([]);
  });

  it('preserves joint-impact classification used by rolodex badges and filters', () => {
    expect(getJointImpact({ exerciseType: 'flexibility', difficulty: 500 })).toBe('Low Impact');
    expect(getJointImpact({ exerciseType: 'compound', difficulty: 550 })).toBe('High Impact');
    expect(getJointImpact({ exerciseType: 'isolation', difficulty: 350 })).toBe('Medium Impact');
  });
});
