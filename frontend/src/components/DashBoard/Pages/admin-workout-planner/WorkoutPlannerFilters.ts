/**
 * WorkoutPlannerFilters.ts
 * ========================
 * Filter lists and pure exercise helpers for the mounted workout planner.
 * Keeping this here prevents the route component from carrying static UI
 * configuration and rolodex classification logic.
 */

export const BODY_PARTS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs',
  'Core', 'Full Body', 'Cardio', 'Recovery',
] as const;

export const EXERCISE_TYPES = [
  'All Types', 'Compound', 'Isolation', 'Calisthenics',
  'Stability', 'Flexibility', 'Core',
] as const;

export const EQUIPMENT_FILTERS = [
  'All Equipment', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine',
  'Cable', 'Resistance Band', 'Kettlebell', 'Sliders',
  'Stability Ball', 'Medicine Ball', 'BOSU', 'TRX',
] as const;

export const SOURCE_FILTERS = ['All Programs', 'NASM', 'SwanStudios'] as const;

export const IMPACT_LEVELS = ['All Impact', 'Low Impact', 'Medium Impact', 'High Impact'] as const;

export function getJointImpact(ex: { exerciseType: string; difficulty: number }): string {
  const lowTypes = ['flexibility', 'stability', 'balance'];
  const highTypes = ['calisthenics', 'compound'];
  if (lowTypes.includes(ex.exerciseType) || ex.difficulty <= 200) return 'Low Impact';
  if (highTypes.includes(ex.exerciseType) && ex.difficulty >= 500) return 'High Impact';
  return 'Medium Impact';
}

export function parseEquipment(eq: unknown): string[] {
  if (!eq) return [];
  if (Array.isArray(eq)) return eq.filter(Boolean);
  if (typeof eq === 'string') {
    if (eq === '[]' || eq === '') return [];
    try {
      const parsed = JSON.parse(eq);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return [eq];
    }
  }
  return [];
}
