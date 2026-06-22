/**
 * Hook: useWorkoutPlannerPdfActions
 * Purpose: create a downloadable PDF from the current mounted builder state.
 */

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type { PlannerClient, PlanDuration, PlanGoal } from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { buildPlanPdfFileFromPlanData } from './workoutPlannerPlanPdfAdapter';
import { buildWorkoutPlanSaveFields } from './workoutPlannerSavePayload';

interface UseWorkoutPlannerPdfActionsInput {
  selectedClient: PlannerClient | null;
  planExercisesLength: number;
  hasGeneratedHorizonPlan: boolean;
  planDuration: PlanDuration;
  userRole?: string;
  goal: PlanGoal;
  phaseNumber: number;
  buildPlanData: () => unknown;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

const hasPrintablePlan = (planExercisesLength: number, hasGeneratedHorizonPlan: boolean) =>
  planExercisesLength > 0 || hasGeneratedHorizonPlan;

const downloadPdfFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const useWorkoutPlannerPdfActions = ({
  selectedClient,
  planExercisesLength,
  hasGeneratedHorizonPlan,
  planDuration,
  userRole,
  goal,
  phaseNumber,
  buildPlanData,
  setStatusMsg,
}: UseWorkoutPlannerPdfActionsInput) => {
  const handleCreateBuilderPdf = useCallback(async () => {
    if (!hasPrintablePlan(planExercisesLength, hasGeneratedHorizonPlan)) {
      setStatusMsg({ type: 'error', text: 'Add exercises before creating a PDF.' });
      return;
    }

    try {
      const planData = buildPlanData();
      const saveFields = buildWorkoutPlanSaveFields({
        planData,
        planDuration,
        hasGeneratedHorizonPlan,
        userRole,
      });
      const file = await buildPlanPdfFileFromPlanData({
        planData,
        selectedClient,
        goal,
        nasmPhase: phaseNumber,
        durationWeeks: saveFields.durationWeeks,
        horizonKey: saveFields.metadata.planHorizon,
      });
      if (!file) {
        setStatusMsg({ type: 'error', text: 'PDF could not be created until the builder has printable exercises.' });
        return;
      }
      downloadPdfFile(file);
      setStatusMsg({ type: 'success', text: 'PDF created from the current builder.' });
    } catch (err) {
      logApiError('Create builder PDF failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to create PDF. Please try again.' });
    }
  }, [buildPlanData, goal, hasGeneratedHorizonPlan, phaseNumber, planDuration, planExercisesLength, selectedClient, setStatusMsg, userRole]);

  return { handleCreateBuilderPdf };
};
