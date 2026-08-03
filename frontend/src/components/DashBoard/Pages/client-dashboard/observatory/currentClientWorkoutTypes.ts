/**
 * ============================================================================
 * FILE: currentClientWorkoutTypes.ts
 * PURPOSE: Share current-workout API preview and dashboard contract types.
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-08
 * AI VILLAGE VALIDATED: Not run - scoped refactor with local tests.
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the loose read-model fragments accepted from
 * /api/workouts/:clientId/current plus the strict shape rendered by the client
 * observatory cards.
 * HOW IT FITS IN THE APP: currentClientWorkoutNormalizer consumes these types,
 * useCurrentClientWorkout exposes the normalized result, and card view models
 * render the public CurrentClientWorkout contract.
 * KEY DECISIONS: Keep preview payloads permissive because production has
 * canonical, legacy, and assignment-only response shapes.
 * NASM PROTOCOL CONTEXT: Carries planned exercise metadata without applying
 * NASM interpretation in type declarations.
 */

import type { ClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';
import type { TrainingPlanCatalogPreview } from './clientTrainingPlanVaultNormalizer';

export interface PlannedExercisePreview {
  name?: string;
  exerciseName?: string;
}

export interface CurrentSessionPreview {
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

export interface TodayAssignmentPreview {
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
  exercises?: PlannedExercisePreview[];
  scheduledDate?: string;
  prescribedRevision?: number | string;
  ctaLabel?: string;
}

export interface CurrentWorkoutPlanPreview {
  title?: string;
  name?: string;
  currentWeek?: number | string;
  currentDay?: number | string;
  currentSession?: CurrentSessionPreview | null;
  todayAssignment?: TodayAssignmentPreview | null;
  homeworkSummary?: unknown;
  trainingPlanCatalog?: TrainingPlanCatalogPreview | null;
  /** current-week day list from toCurrentWorkoutPlanResponse — its length is
      the plan's REAL weekly session volume */
  days?: unknown[];
}

export interface CurrentWorkoutResponse {
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
  exerciseNames: string[];
  scheduledDate?: string;
  prescribedRevision?: number;
  primaryPlanLabel?: string;
  homeworkSummary?: ClientHomeworkSummary | null;
  /** sessions in the plan's current week (real planData truth); undefined when
      the payload carries no week structure — consumers must NOT substitute a
      hardcoded target (launch panel 2026-08-03, gap b) */
  weeklyPlanVolume?: number;
}
