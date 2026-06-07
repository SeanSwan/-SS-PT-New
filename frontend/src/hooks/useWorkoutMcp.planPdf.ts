/**
 * Workout plan PDF attachment bridge
 * ==================================
 *
 * Reuses the existing SwanStudios planner PDF renderer so Program Architect
 * saves attach the same protected PDF artifact as the admin workout planner.
 */

import { logger } from '@/utils/logger';
import { buildPlanPdfFileFromPlanData } from '../components/DashBoard/Pages/admin-workout-planner/workoutPlannerPlanPdfAdapter';

export type WorkoutPlanPdfAttachResult = 'attached' | 'failed' | 'skipped';

interface WorkoutPlanPdfApi {
  post: (url: string, body?: unknown) => Promise<unknown>;
}

interface AttachWorkoutPlanPdfInput {
  api: WorkoutPlanPdfApi;
  planId: string | number;
  planData: unknown;
  clientName?: string;
  goal?: unknown;
  nasmPhase?: unknown;
  durationWeeks: number;
}

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const toGoal = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : 'general_fitness';

const buildSelectedClientFallback = (clientName?: string) => {
  const parts = (clientName || 'Client').trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || 'Client';
  const lastName = parts.join(' ');

  return {
    id: 0,
    firstName,
    lastName,
    username: firstName.toLowerCase(),
  };
};

export const attachWorkoutPlanPdf = async ({
  api,
  planId,
  planData,
  clientName,
  goal,
  nasmPhase,
  durationWeeks,
}: AttachWorkoutPlanPdfInput): Promise<WorkoutPlanPdfAttachResult> => {
  if (typeof FormData === 'undefined') return 'skipped';

  try {
    const file = await buildPlanPdfFileFromPlanData({
      planData,
      selectedClient: buildSelectedClientFallback(clientName),
      goal: toGoal(goal),
      nasmPhase: toPositiveInteger(nasmPhase, 1),
      durationWeeks,
    });
    if (!file) return 'skipped';

    const formData = new FormData();
    formData.append('pdf', file);
    await api.post(`/api/workout-plans/${encodeURIComponent(String(planId))}/pdf/upload`, formData);
    return 'attached';
  } catch (err) {
    logger.warn('[WorkoutAPI] Attach generated workout plan PDF failed:', err);
    return 'failed';
  }
};
