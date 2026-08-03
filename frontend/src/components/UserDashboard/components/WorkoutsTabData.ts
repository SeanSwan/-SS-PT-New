/**
 * Data definitions for the active UserDashboard V3 workout-usage panel.
 */

export interface ExerciseUsage {
  name: string;
  count: number;
}

export interface CategoryData {
  key: string;
  label: string;
  icon: string;
  color: string;
  exercises: ExerciseUsage[];
}

export interface WorkoutSummaryStats {
  totalExercises: number;
  mostActiveCategory: string;
}

export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Chest: { icon: 'CH', color: 'var(--accent-purple, #8B5CF6)' },
  Back: { icon: 'BK', color: 'var(--accent-primary, #60C0F0)' },
  Legs: { icon: 'LG', color: 'var(--accent-gold, #C6A84B)' },
  Core: { icon: 'CR', color: 'var(--arctic-cyan, #50A0F0)' },
  Arms: { icon: 'AR', color: 'var(--swan-lavender, #4070C0)' },
  Shoulders: { icon: 'SH', color: 'var(--text-primary, #E0ECF4)' },
  'Full Body': { icon: 'FB', color: 'var(--accent-primary, #60C0F0)' },
  Cardio: { icon: 'HR', color: 'var(--accent-gold, #C6A84B)' },
  Other: { icon: 'OT', color: 'var(--text-muted, #b8c9db)' },
};

export function computeStats(categories: CategoryData[]): WorkoutSummaryStats {
  let totalExercises = 0;
  let mostActiveCategory = '';
  let mostActiveCount = 0;

  for (const category of categories) {
    const categoryTotal = category.exercises.reduce((sum, exercise) => sum + exercise.count, 0);
    totalExercises += categoryTotal;
    if (categoryTotal > mostActiveCount) {
      mostActiveCount = categoryTotal;
      mostActiveCategory = category.label;
    }
  }

  return { totalExercises, mostActiveCategory };
}
