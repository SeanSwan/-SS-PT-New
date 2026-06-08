/**
 * FILE: useCurrentClientWorkout.ts
 * PURPOSE: Fetch and normalize the active client workout plan for /overview.
 */

import { useEffect, useState } from 'react';
import apiService from '../../../../../services/api.service';
import { normalizeWorkoutPlanUse } from '../../../../../utils/workoutPlanAssignmentSemantics';
import { normalizeProtectedPlanPdfUrl } from '../../../shared/plan-pdf/workoutPlanPdfUrl';

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

interface CurrentWorkoutPlanPreview {
  title?: string;
  name?: string;
  currentWeek?: number | string;
  currentDay?: number | string;
  currentSession?: CurrentSessionPreview | null;
  todayAssignment?: TodayAssignmentPreview | null;
  trainingPlanCatalog?: TrainingPlanCatalogPreview | null;
}

interface CurrentWorkoutResponse {
  data?: CurrentWorkoutPlanPreview | null;
  plan?: CurrentWorkoutPlanPreview | null;
  currentSession?: CurrentSessionPreview | null;
  todayAssignment?: TodayAssignmentPreview | null;
  trainingPlanCatalog?: TrainingPlanCatalogPreview | null;
}

interface ClientPlanPdfPreview {
  url?: string;
  fileName?: string;
  contentType?: string;
  updatedAt?: string | null;
}

interface TodayAssignmentPreview {
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

interface TrainingPlanSlotPreview {
  horizonKey?: string;
  label?: string;
  durationWeeks?: number;
  durationDays?: number;
  isDefaultHorizon?: boolean;
  isPrimary?: boolean;
  isFilled?: boolean;
  plan?: {
    id?: string | number | null;
    title?: string;
    status?: string;
    currentWeek?: number | string | null;
    currentDay?: number | string | null;
    pdfFile?: ClientPlanPdfPreview | null;
    planPdf?: ClientPlanPdfPreview | null;
    assignmentDefault?: string | null;
    billingIntent?: string | null;
    defaultShouldDeductSession?: boolean;
    metadata?: Record<string, unknown> | null;
    planData?: Record<string, unknown> | null;
  } | null;
}

interface TrainingPlanCatalogPreview {
  defaultHorizonKey?: string;
  primaryPlanId?: string | number | null;
  primaryHorizonKey?: string | null;
  filledHorizonKeys?: string[];
  slots?: TrainingPlanSlotPreview[];
}

export interface ClientTrainingPlanSlot {
  horizonKey: string;
  label: string;
  durationWeeks?: number;
  durationDays?: number;
  isDefaultHorizon: boolean;
  isFilled: boolean;
  isPrimary: boolean;
  planId?: string | number | null;
  planTitle?: string;
  planStatus?: string;
  assignmentDefault?: string | null;
  billingIntent?: string | null;
  defaultShouldDeductSession?: boolean;
  currentWeek?: number;
  currentDay?: number;
  pdfFile?: {
    url: string;
    fileName: string;
    contentType: string;
    updatedAt?: string | null;
  } | null;
}

export interface ClientTrainingPlanVault {
  defaultHorizonKey: string;
  primaryPlanId?: string | number | null;
  primaryHorizonKey?: string | null;
  filledHorizonKeys: string[];
  filledCount: number;
  slots: ClientTrainingPlanSlot[];
}

export interface CurrentClientWorkout {
  title: string;
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

function normalizePlanPdfFile(raw?: ClientPlanPdfPreview | null): ClientTrainingPlanSlot['pdfFile'] {
  const url = normalizeProtectedPlanPdfUrl(raw?.url);
  if (!url) return null;
  return {
    url,
    fileName: typeof raw?.fileName === 'string' && raw.fileName.trim()
      ? raw.fileName.trim()
      : 'Workout Plan.pdf',
    contentType: typeof raw?.contentType === 'string' && raw.contentType.trim()
      ? raw.contentType.trim()
      : 'application/pdf',
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

function primaryPlanLabel(catalog?: TrainingPlanCatalogPreview | null): string | undefined {
  const slot = Array.isArray(catalog?.slots)
    ? catalog?.slots?.find((item) => item?.isPrimary && item?.isFilled)
    : null;
  return typeof slot?.label === 'string' && slot.label.trim() ? slot.label.trim() : undefined;
}

function normalizeCurrentClientWorkout(payload?: CurrentWorkoutResponse | null): CurrentClientWorkout | null {
  const plan = payload?.data || payload?.plan || null;
  const assignment = payload?.todayAssignment || plan?.todayAssignment || null;
  const catalog = payload?.trainingPlanCatalog || plan?.trainingPlanCatalog || null;
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
  };
}

function normalizeTrainingPlanVault(payload?: CurrentWorkoutResponse | null): ClientTrainingPlanVault | null {
  const plan = payload?.data || payload?.plan || null;
  const catalog = payload?.trainingPlanCatalog || plan?.trainingPlanCatalog || null;
  const slots = Array.isArray(catalog?.slots) ? catalog.slots : [];
  if (!slots.length) return null;

  const normalizedSlots = slots.map((slot) => {
    const planUse = slot.plan ? normalizeWorkoutPlanUse(slot.plan) : {};
    return {
      horizonKey: slot.horizonKey || 'unknown',
      label: slot.label || 'Plan',
      durationWeeks: slot.durationWeeks,
      durationDays: slot.durationDays,
      isDefaultHorizon: Boolean(slot.isDefaultHorizon),
      isFilled: Boolean(slot.isFilled),
      isPrimary: Boolean(slot.isPrimary),
      planId: slot.plan?.id,
      planTitle: slot.plan?.title,
      planStatus: slot.plan?.status,
      assignmentDefault: planUse.assignmentDefault,
      billingIntent: planUse.billingIntent,
      defaultShouldDeductSession: planUse.defaultShouldDeductSession,
      currentWeek: toPositiveInteger(slot.plan?.currentWeek),
      currentDay: toPositiveInteger(slot.plan?.currentDay),
      pdfFile: normalizePlanPdfFile(slot.plan?.pdfFile || slot.plan?.planPdf),
    };
  });
  const filledHorizonKeys = Array.isArray(catalog?.filledHorizonKeys)
    ? catalog.filledHorizonKeys
    : normalizedSlots.filter((slot) => slot.isFilled).map((slot) => slot.horizonKey);

  return {
    defaultHorizonKey: catalog?.defaultHorizonKey || 'six_month',
    primaryPlanId: catalog?.primaryPlanId,
    primaryHorizonKey: catalog?.primaryHorizonKey || normalizedSlots.find((slot) => slot.isPrimary)?.horizonKey || null,
    filledHorizonKeys,
    filledCount: normalizedSlots.filter((slot) => slot.isFilled).length,
    slots: normalizedSlots,
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
