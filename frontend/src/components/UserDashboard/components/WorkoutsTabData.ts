/**
 * ============================================================================
 * FILE: WorkoutsTabData.ts
 * PURPOSE: Mock data and category definitions for WorkoutsTab exercise usage chart
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides mock exercise usage data organized by body-part
 * category for the Overwatch-style horizontal bar chart. When real workout data
 * exists, the parent component transforms API data into this shape.
 *
 * HOW IT FITS IN THE APP: WorkoutsTab imports these constants for chart rendering.
 * KEY DECISIONS: Extracted to keep WorkoutsTab under 300 lines.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Shared types for exercise usage chart
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// SECTION: Category Definitions
// PURPOSE: Icon + color mapping for each body-part category
// ─────────────────────────────────────────────────────────────
export const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Chest:     { icon: '🫁', color: '#8B5CF6' },
  Back:      { icon: '🔙', color: '#60C0F0' },
  Legs:      { icon: '🦵', color: '#C6A84B' },
  Core:      { icon: '🎯', color: '#50A0F0' },
  Arms:      { icon: '💪', color: '#4070C0' },
  Shoulders: { icon: '🏔️', color: '#E0ECF4' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Mock Data
// PURPOSE: Realistic exercise names from 840+ DB for demo state
// WHY: 0 workouts logged yet — chart needs engaging preview
// ─────────────────────────────────────────────────────────────
export const MOCK_CATEGORIES: CategoryData[] = [
  {
    key: 'Chest', label: 'Chest', icon: '🫁', color: '#8B5CF6',
    exercises: [
      { name: 'Barbell Bench Press', count: 47 },
      { name: 'Incline Dumbbell Press', count: 38 },
      { name: 'Cable Flye', count: 31 },
      { name: 'Push-Up', count: 28 },
      { name: 'Dumbbell Pullover', count: 22 },
      { name: 'Decline Bench Press', count: 19 },
      { name: 'Machine Chest Press', count: 15 },
      { name: 'Landmine Press', count: 12 },
      { name: 'Pec Deck Flye', count: 9 },
      { name: 'Svend Press', count: 5 },
    ],
  },
  {
    key: 'Back', label: 'Back', icon: '🔙', color: '#60C0F0',
    exercises: [
      { name: 'Lat Pulldown', count: 52 },
      { name: 'Barbell Deadlift', count: 44 },
      { name: 'Seated Cable Row', count: 39 },
      { name: 'Dumbbell Row', count: 33 },
      { name: 'Pull-Up', count: 29 },
      { name: 'T-Bar Row', count: 24 },
      { name: 'Face Pull', count: 20 },
      { name: 'Straight Arm Pulldown', count: 16 },
      { name: 'Hyperextension', count: 11 },
      { name: 'Inverted Row', count: 7 },
    ],
  },
  {
    key: 'Legs', label: 'Legs', icon: '🦵', color: '#C6A84B',
    exercises: [
      { name: 'Barbell Back Squat', count: 55 },
      { name: 'Romanian Deadlift', count: 42 },
      { name: 'Leg Press', count: 37 },
      { name: 'Walking Lunge', count: 30 },
      { name: 'Leg Extension', count: 26 },
      { name: 'Lying Leg Curl', count: 23 },
      { name: 'Bulgarian Split Squat', count: 18 },
      { name: 'Calf Raise', count: 14 },
      { name: 'Hip Thrust', count: 10 },
      { name: 'Goblet Squat', count: 6 },
    ],
  },
  {
    key: 'Core', label: 'Core', icon: '🎯', color: '#50A0F0',
    exercises: [
      { name: 'Plank', count: 43 },
      { name: 'Cable Woodchop', count: 35 },
      { name: 'Hanging Leg Raise', count: 28 },
      { name: 'Ab Rollout', count: 24 },
      { name: 'Russian Twist', count: 21 },
      { name: 'Dead Bug', count: 17 },
      { name: 'Pallof Press', count: 14 },
      { name: 'Side Plank', count: 11 },
      { name: 'Bird Dog', count: 8 },
      { name: 'Bicycle Crunch', count: 4 },
    ],
  },
  {
    key: 'Arms', label: 'Arms', icon: '💪', color: '#4070C0',
    exercises: [
      { name: 'Barbell Curl', count: 40 },
      { name: 'Tricep Pushdown', count: 36 },
      { name: 'Hammer Curl', count: 30 },
      { name: 'Skull Crusher', count: 25 },
      { name: 'Preacher Curl', count: 21 },
      { name: 'Overhead Tricep Extension', count: 18 },
      { name: 'Concentration Curl', count: 13 },
      { name: 'Close-Grip Bench Press', count: 10 },
      { name: 'Cable Curl', count: 7 },
      { name: 'Diamond Push-Up', count: 3 },
    ],
  },
  {
    key: 'Shoulders', label: 'Shoulders', icon: '🏔️', color: '#E0ECF4',
    exercises: [
      { name: 'Overhead Press', count: 45 },
      { name: 'Lateral Raise', count: 38 },
      { name: 'Face Pull', count: 32 },
      { name: 'Arnold Press', count: 27 },
      { name: 'Front Raise', count: 22 },
      { name: 'Reverse Flye', count: 18 },
      { name: 'Upright Row', count: 14 },
      { name: 'Landmine Lateral Raise', count: 10 },
      { name: 'Cable Lateral Raise', count: 7 },
      { name: 'Band Pull-Apart', count: 4 },
    ],
  },
];

/**
 * Compute summary stats from category data.
 * @param categories - Array of CategoryData to summarize
 * @returns Total exercises, most active category label, top exercise name
 */
export function computeStats(categories: CategoryData[]) {
  let totalExercises = 0;
  let mostActiveLabel = '';
  let mostActiveCount = 0;

  for (const cat of categories) {
    const catTotal = cat.exercises.reduce((s, e) => s + e.count, 0);
    totalExercises += catTotal;
    if (catTotal > mostActiveCount) {
      mostActiveCount = catTotal;
      mostActiveLabel = cat.label;
    }
  }

  return { totalExercises, mostActiveCategory: mostActiveLabel };
}
