/**
 * COMPONENT: TrainerWorkoutForgePage.data
 * PURPOSE: Constants and small pure helpers for the trainer Workout Forge.
 */

export const OPT_PHASES = [
  { phase: 1, name: 'Stabilization Endurance', reps: '12-20', sets: '1-3', tempo: '4/2/1', rest: '0-90s' },
  { phase: 2, name: 'Strength Endurance', reps: '8-12', sets: '2-4', tempo: '2/0/2', rest: '0-60s' },
  { phase: 3, name: 'Hypertrophy', reps: '6-12', sets: '3-5', tempo: '2/0/2', rest: '0-60s' },
  { phase: 4, name: 'Maximal Strength', reps: '1-5', sets: '4-6', tempo: 'X/0/X', rest: '3-5min' },
  { phase: 5, name: 'Power', reps: '1-5 / 8-10', sets: '3-6', tempo: 'X/0/X', rest: '3-5min' },
] as const;

export const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'Resistance Band',
  'Stability Ball',
  'Medicine Ball',
  'BOSU Ball',
];

export type TrainerClient = {
  id: number;
  name: string;
};

export type ManualExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  equipment: string;
};

export const buildExerciseId = (index: number) => `manual-exercise-${Date.now()}-${index}`;

export const toClientName = (client: any) =>
  `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username || `Client ${client.id}`;
