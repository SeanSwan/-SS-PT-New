/**
 * COMPONENT: TrainerWorkoutForgePage.data
 * PURPOSE: Constants and small pure helpers for the trainer Build Plan route.
 */
import {
  normalizeTrainerClientOptions,
  resolveTrainerClientSource,
  toTrainerClientName,
  type TrainerClientOption,
} from './trainerClientSource';
import {
  getClientHubAudienceConfig,
  type ClientHubAudience,
} from '../../workspaces/clients-team/clientHubAudience';

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

export const TRAINER_SESSION_ASSIGNMENT_DEFAULTS = {
  defaultAssignmentType: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  shouldDeductSession: false,
} as const;

export const TRAINER_SESSION_PLAN_METADATA = {
  assignmentDefault: 'trainer_session',
  billingIntent: 'trainer_led_scheduled_flow',
  defaultShouldDeductSession: false,
} as const;

export type TrainerClient = TrainerClientOption;

export type ManualExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  tempo: string;
  rest: string;
  equipment: string;
};

export type SavedTrainerForgePlan = {
  clientId: number;
  clientName: string;
  title: string;
};

export const buildExerciseId = (index: number) => `manual-exercise-${Date.now()}-${index}`;

/**
 * Build Plan is mounted for BOTH audiences (admin superset closure 2026-07-24),
 * so these handoff paths must resolve by audience. A hardcoded `/dashboard/
 * trainer/*` here would demote an admin into the trainer shell the moment they
 * left Build Plan — activeRole is URL-derived (UniversalDashboardLayout.tsx:77).
 *
 * `audience` is intentionally REQUIRED rather than defaulted: a default is a
 * silent wrong answer for one of the two roles, and TypeScript should refuse to
 * compile a call site that has not decided.
 */
export const buildTrainerForgeLoggerPath = (clientId: number, audience: ClientHubAudience) =>
  `${audience === 'trainer' ? '/dashboard/trainer' : '/dashboard/admin'}/log-workout?clientId=${clientId}&loadPlan=today&source=build-plan`;

export const buildTrainerForgePlannerPath = (clientId: number, audience: ClientHubAudience) =>
  `${getClientHubAudienceConfig(audience).workoutPlannerBase}?clientId=${clientId}&source=build-plan`;

export const parseTrainerForgeClientId = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  const trimmedValue = value?.trim();
  if (!trimmedValue || !/^[1-9]\d*$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

export const toClientName = toTrainerClientName;
export const resolveTrainerForgeClientSource = resolveTrainerClientSource;
export const normalizeTrainerForgeClients = normalizeTrainerClientOptions;
