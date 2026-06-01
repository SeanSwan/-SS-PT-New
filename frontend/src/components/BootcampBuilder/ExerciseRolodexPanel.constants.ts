export const BODY_PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body', 'Cardio', 'Recovery'];
export const EXERCISE_TYPES = ['All Types', 'Compound', 'Isolation', 'Calisthenics', 'Stability', 'Flexibility', 'Core'];
export const EQUIPMENT_FILTERS = ['All Equipment', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine', 'Cable', 'Resistance Band', 'Kettlebell', 'Sliders', 'Stability Ball', 'Medicine Ball', 'BOSU', 'TRX'];
export const SOURCE_FILTERS = ['All Programs', 'NASM', 'SwanStudios'] as const;
export const IMPACT_LEVELS = ['All Impact', 'Low Impact', 'Medium Impact', 'High Impact'] as const;
export const ROLODEX_ROW_HEIGHT = 76;

export function getJointImpact(ex: { exerciseType?: string | null; difficulty?: number | null }): string {
  const exerciseType = (ex.exerciseType || '').toLowerCase();
  const difficulty = ex.difficulty ?? 0;
  const lowTypes = ['flexibility', 'stability', 'balance'];
  const highTypes = ['calisthenics', 'compound'];

  if (lowTypes.includes(exerciseType) || difficulty <= 200) return 'Low Impact';
  if (highTypes.includes(exerciseType) && difficulty >= 500) return 'High Impact';
  return 'Medium Impact';
}

export function parseEquipment(eq: unknown): string[] {
  if (!eq) return [];
  if (Array.isArray(eq)) return eq.filter(Boolean).map(String);
  if (typeof eq !== 'string') return [];
  if (eq === '[]' || eq === '') return [];

  try {
    const parsed = JSON.parse(eq);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [eq];
  } catch {
    return [eq];
  }
}
