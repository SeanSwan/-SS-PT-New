/**
 * FILE: useCurrentClientWorkout.ts
 * PURPOSE: Fetch and normalize the active client workout plan for /overview.
 */

import { useEffect, useState } from 'react';
import apiService from '../../../../../services/api.service';
import {
  normalizeTrainingPlanVault,
  primaryPlanLabel,
  type ClientTrainingPlanVault,
  type TrainingPlanCatalogPreview,
} from './clientTrainingPlanVaultNormalizer';
import {
  normalizeClientHomeworkSummary,
  type ClientHomeworkSummary,
} from '../../../shared/client-training/clientHomeworkSummary';

export type { ClientTrainingPlanSlot, ClientTrainingPlanVault } from './clientTrainingPlanVaultNormalizer';
export type { ClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';

interface PlannedExercisePreview {
  name?: string;
  exerciseName?: string;
}

interface CurrentSessionPreview {
  weekNumber?: number | string;
  dayNumber?: number | string;
  dayLabel?: string;
  exercises?: PlannedExercisePreview[];
  session?: {
    dayLabel?: string;
    name?: string;
    exercises?: PlannedExercisePreview[];
  };
}

interface TodayAssignmentPreview {
  assignmentId?: string | number | null;
  assignmentKey?: string | number | null;
  assignmentType?: string;
  status?: string;
  sessionType?: string;
  isLoggable?: boolean;
  title?: string;
  weekNumber?: number | string;
  dayNumber?: number | string;
  dayLabel?: string;
  exerciseCount?: number;
  firstExerciseName?: string;
  ctaLabel?: string;
}

interface CurrentWorkoutPlanPreview {
  title?: string;
  name?: string;
  currentWeek?: number | string;
  currentDay?: number | string;
  currentSession?: CurrentSessionPreview | null;
  todayAssignment?: TodayAssignmentPreview | null;
  homeworkSummary?: unknown;
  trainingPlanCatalog?: TrainingPlanCatalogPreview | null;
}

interface CurrentWorkoutResponse {
  data?: CurrentWorkoutPlanPreview | null;
  plan?: CurrentWorkoutPlanPreview | null;
  currentSession?: CurrentSessionPreview | null;
  todayAssignment?: TodayAssignmentPreview | null;
  homeworkSummary?: unknown;
  trainingPlanCatalog?: TrainingPlanCatalogPreview | null;
}

export interface CurrentClientWorkout {
  title: string;
  assignmentKey?: string;
  assignmentType?: string;
  assignmentStatus?: string;
  sessionType?: string;
  isLoggable: boolean;
  ctaLabel: string;
  weekNumber?: number;
  dayNumber?: number;
  dayLabel?: string;
  exerciseCount: number;
  firstExercise?: string;
  primaryPlanLabel?: string;
  homeworkSummary?: ClientHomeworkSummary | null;
}

export interface CurrentClientWorkoutState {
  workout: CurrentClientWorkout | null;
  planVault: ClientTrainingPlanVault | null;
  loading: boolean;
  error: boolean;
}

function coerceClientId(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : Number(String(raw || '').trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}

function toPositiveInteger(raw: unknown): number | undefined {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function exerciseName(exercise?: PlannedExercisePreview): string | undefined {
  const candidate = exercise?.name || exercise?.exerciseName;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
}

function toNonBlankString(raw: unknown): string | undefined {
  const value = typeof raw === 'number' ? String(raw) : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeCurrentClientWorkout(payload?: CurrentWorkoutResponse | null): CurrentClientWorkout | null {
  const plan = payload?.data || payload?.plan || null;
  const assignment = payload?.todayAssignment || plan?.todayAssignment || null;
  const catalog = payload?.trainingPlanCatalog || plan?.trainingPlanCatalog || null;
  const homeworkSummary = payload?.homeworkSummary || plan?.homeworkSummary || null;
  if (!plan && !assignment) return null;

  const session = payload?.currentSession || plan?.currentSession || null;
  const exercises = Array.isArray(session?.exercises)
    ? session?.exercises || []
    : Array.isArray(session?.session?.exercises)
      ? session?.session?.exercises || []
      : [];
  const assignmentExerciseCount = toPositiveInteger(assignment?.exerciseCount);
  const assignmentFirstExercise = typeof assignment?.firstExerciseName === 'string'
    ? assignment.firstExerciseName
    : undefined;

  return {
    title: assignment?.title || plan?.title || plan?.name || 'Today\'s Assignment',
    assignmentKey: toNonBlankString(assignment?.assignmentKey ?? assignment?.assignmentId),
    assignmentType: assignment?.assignmentType,
    assignmentStatus: assignment?.status,
    sessionType: assignment?.sessionType,
    isLoggable: assignment?.isLoggable ?? exercises.length > 0,
    ctaLabel: assignment?.ctaLabel || 'Start',
    weekNumber: toPositiveInteger(assignment?.weekNumber ?? session?.weekNumber ?? plan?.currentWeek),
    dayNumber: toPositiveInteger(assignment?.dayNumber ?? session?.dayNumber ?? plan?.currentDay),
    dayLabel: assignment?.dayLabel || session?.dayLabel || session?.session?.dayLabel || session?.session?.name,
    exerciseCount: assignmentExerciseCount ?? exercises.length,
    firstExercise: assignmentFirstExercise || exerciseName(exercises[0]),
    primaryPlanLabel: primaryPlanLabel(catalog),
    homeworkSummary: normalizeClientHomeworkSummary(homeworkSummary),
  };
}

export function useCurrentClientWorkout(userId: unknown): CurrentClientWorkoutState {
  const [state, setState] = useState<CurrentClientWorkoutState>({
    workout: null,
    planVault: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    const clientId = coerceClientId(userId);
    if (!clientId) {
      setState({ workout: null, planVault: null, loading: false, error: false });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: false }));

    apiService.get<CurrentWorkoutResponse>(`/api/workouts/${clientId}/current`)
      .then((response) => {
        if (cancelled) return;
        setState({
          workout: normalizeCurrentClientWorkout(response.data),
          planVault: normalizeTrainingPlanVault(response.data),
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ workout: null, planVault: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
