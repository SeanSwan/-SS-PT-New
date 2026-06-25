/**
 * Workout Planner PDF data shaping helpers.
 *
 * Keeps generated PDFs tied to saved plan truth while keeping client-facing
 * text concise, private, and printable.
 */
import type { PlannerClient } from './WorkoutPlannerTypes';
import { toPositiveInteger, toRecord } from '../../../../utils/objectValueGuards';
import { buildPlanningSignalLines } from './workoutPlannerPlanPdfSignals';

export interface PdfPlanFallbacks {
  goal: string;
  nasmPhase: number;
  durationWeeks: number;
}

export interface BuildPlanPdfFileInput extends PdfPlanFallbacks {
  planData: unknown;
  selectedClient: PlannerClient | null | undefined;
  horizonKey?: string | null;
}

export interface PrintableExercise {
  exerciseName?: string;
  name?: string;
  sets?: number | unknown[];
  reps?: string | number;
  targetReps?: string | number;
  tempo?: string;
  restTime?: number;
  restSeconds?: number;
  notes?: string;
  readinessNote?: string;
  performanceNotes?: string;
}

export interface PrintableDay {
  dayNumber?: number;
  name?: string;
  dayName?: string;
  focus?: string;
  exercises?: PrintableExercise[];
}

export interface PrintableWeek {
  weekNumber?: number;
  focus?: string;
  days?: PrintableDay[];
  sessions?: PrintableDay[];
}

export interface PrintablePlan {
  planSummary: {
    durationWeeks: number;
    sessionsPerWeek: number;
    totalSessions: number;
    primaryGoal: string;
    startingPhase: number;
  };
  weeks: PrintableWeek[];
  recommendations: string[];
  planningSignalLines: string[];
}

const PRIVATE_HISTORY_PATTERN =
  /\b(surgery|diagnosis|diagnosed|arthritis|replacement|medical history|injury history|procedure|medication|doctor|physician|injury|injured|tendonitis|sprain|strain|fracture|tear|torn|rehab|post-op|operation|medical clearance)\b/i;

const cleanPdfString = (value: unknown, maxLength = 260): string =>
  String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const clientSafePdfString = (value: unknown, fallback: string, maxLength = 260): string => {
  const cleaned = cleanPdfString(value, maxLength);
  if (!cleaned) return fallback;
  if (PRIVATE_HISTORY_PATTERN.test(cleaned)) return fallback;
  return cleaned;
};

const toClientSafeRecommendation = (value: unknown): string | null => {
  const cleaned = cleanPdfString(value);
  if (!cleaned) return null;
  if (PRIVATE_HISTORY_PATTERN.test(cleaned)) {
    return 'Based on your readiness profile, follow the listed modifications, keep tempo controlled, and ask your trainer before increasing load.';
  }
  return cleaned;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(toClientSafeRecommendation).filter(Boolean) as string[] : [];

const getWeekDays = (week: unknown): unknown[] => {
  const raw = toRecord(week);
  if (Array.isArray(raw.days)) return raw.days;
  if (Array.isArray(raw.sessions)) return raw.sessions;
  return [];
};

const countSessions = (weeks: unknown[]): number =>
  weeks.reduce<number>((total, week) => total + getWeekDays(week).length, 0);

const inferSessionsPerWeek = (weeks: unknown[]) =>
  Math.max(1, ...weeks.map((week) => getWeekDays(week).length));

const getExerciseSetCount = (exercise: PrintableExercise) =>
  Array.isArray(exercise.sets) ? exercise.sets.length : toPositiveInteger(exercise.sets, 3);

const getExerciseNote = (exercise: PrintableExercise) => {
  const rawNote = exercise.readinessNote ?? exercise.notes ?? exercise.performanceNotes;
  const cleaned = cleanPdfString(rawNote, 120);
  if (!cleaned) return '-';
  if (PRIVATE_HISTORY_PATTERN.test(cleaned)) return 'Trainer modification noted.';
  return cleaned;
};

export const getClientDisplayName = (selectedClient: PlannerClient | null | undefined) => {
  if (!selectedClient) return 'Client';
  return `${selectedClient.firstName} ${selectedClient.lastName}`.trim() || 'Client';
};

export const safeFilenamePart = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'Client';

export const getExerciseName = (exercise: PrintableExercise) =>
  clientSafePdfString(exercise.exerciseName || exercise.name, 'Exercise', 160);

export const getExerciseDose = (exercise: PrintableExercise) => {
  const sets = getExerciseSetCount(exercise);
  const reps = exercise.targetReps ?? exercise.reps ?? '8-12';
  const tempo = cleanPdfString(exercise.tempo, 32) || '-';
  const rest = exercise.restSeconds ?? exercise.restTime;
  return `Sets: ${sets} | Reps: ${reps} | Tempo: ${tempo} | Rest: ${rest ? `${rest}s` : '-'} | Notes: ${getExerciseNote(exercise)}`;
};

export const buildPdfPlanFromPlanData = (
  planData: unknown,
  fallback: PdfPlanFallbacks,
): PrintablePlan | null => {
  const raw = toRecord(planData);
  const weeks = Array.isArray(raw.weeks) ? raw.weeks : [];
  if (weeks.length === 0) return null;

  const summary = toRecord(raw.planSummary);
  const durationWeeks = toPositiveInteger(summary.durationWeeks, fallback.durationWeeks);
  const sessionsPerWeek = toPositiveInteger(summary.sessionsPerWeek, inferSessionsPerWeek(weeks));
  const totalSessions = toPositiveInteger(summary.totalSessions, countSessions(weeks));
  const primaryGoal = clientSafePdfString(summary.primaryGoal || raw.goal || fallback.goal, 'general_fitness', 120);
  const startingPhase = toPositiveInteger(summary.startingPhase, fallback.nasmPhase);

  return {
    planSummary: { durationWeeks, sessionsPerWeek, totalSessions, primaryGoal, startingPhase },
    weeks: weeks as PrintableWeek[],
    recommendations: toStringArray(raw.recommendations),
    planningSignalLines: buildPlanningSignalLines(raw),
  };
};
