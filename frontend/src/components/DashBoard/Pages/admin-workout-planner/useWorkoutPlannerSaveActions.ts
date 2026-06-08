/**
 * Hook: useWorkoutPlannerSaveActions
 * Purpose: Own Workout Planner save/update network actions and their saving
 * state so the mounted page can stay focused on route and builder wiring.
 */

import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type { PlannerClient, PlanDuration, PlanGoal } from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { buildPlanPdfFileFromPlanData } from './workoutPlannerPlanPdfAdapter';
import { buildWorkoutPlanSaveFields } from './workoutPlannerSavePayload';

type PdfAttachResult = 'attached' | 'failed' | 'skipped';
type WorkoutPlanSaveFields = ReturnType<typeof buildWorkoutPlanSaveFields>;

interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}

interface SaveActionResponseData {
  plan?: {
    id?: unknown;
    title?: unknown;
  };
}

interface SaveOperationResult {
  client: PlannerClient | undefined;
  planData: unknown;
  saveFields: WorkoutPlanSaveFields;
  planId: string | null;
  planTitle?: unknown;
}

interface RunSaveOperationInput {
  activate: boolean;
  requiresLoadedPlan: boolean;
  operation: () => Promise<SaveOperationResult>;
  successText: string;
  errorLogLabel: string;
  errorText: string;
}

interface UseWorkoutPlannerSaveActionsInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  planExercisesLength: number;
  hasGeneratedHorizonPlan: boolean;
  loadedPlanId: string | null;
  planDuration: PlanDuration;
  userRole?: string;
  phaseName: string;
  phaseNumber: number;
  categoryLabel: string;
  goal: PlanGoal;
  clients: PlannerClient[];
  buildPlanData: () => unknown;
  currentExercisesSig: string;
  fetchSavedPlans: (clientId: number | null) => Promise<void>;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanId: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
}

const saveStatusText = (base: string, pdfResult: PdfAttachResult) => {
  if (pdfResult === 'attached') return `${base} PDF attached from the saved plan.`;
  if (pdfResult === 'failed') return `${base} PDF attachment failed; update the PDF from Saved Plans.`;
  return base;
};

export const useWorkoutPlannerSaveActions = ({
  authAxios,
  selectedClientId,
  planExercisesLength,
  hasGeneratedHorizonPlan,
  loadedPlanId,
  planDuration,
  userRole,
  phaseName,
  phaseNumber,
  categoryLabel,
  goal,
  clients,
  buildPlanData,
  currentExercisesSig,
  fetchSavedPlans,
  setSavedSnapshot,
  setLoadedPlanId,
  setLoadedPlanName,
  setStatusMsg,
}: UseWorkoutPlannerSaveActionsInput) => {
  const [saving, setSaving] = useState(false);

  const hasSaveablePlan = Boolean(selectedClientId && (planExercisesLength > 0 || hasGeneratedHorizonPlan));

  const attachGeneratedPdf = useCallback(async (
    planId: string,
    planData: unknown,
    client: PlannerClient | undefined,
    durationWeeks: number,
  ): Promise<PdfAttachResult> => {
    if (typeof FormData === 'undefined') return 'skipped';
    try {
      const file = await buildPlanPdfFileFromPlanData({
        planData,
        selectedClient: client,
        goal,
        nasmPhase: phaseNumber,
        durationWeeks,
      });
      if (!file) return 'skipped';

      const formData = new FormData();
      formData.append('pdf', file);
      await authAxios.post(`/api/workout-plans/${planId}/pdf/upload`, formData);
      return 'attached';
    } catch (err) {
      logApiError('Attach generated plan PDF failed', err);
      return 'failed';
    }
  }, [authAxios, goal, phaseNumber]);

  const buildSaveContext = useCallback(() => {
    const client = clients.find(c => c.id === selectedClientId);
    const planData = buildPlanData();
    const saveFields = buildWorkoutPlanSaveFields({
      planData,
      planDuration,
      hasGeneratedHorizonPlan,
      userRole,
    });
    return { client, planData, saveFields };
  }, [buildPlanData, clients, hasGeneratedHorizonPlan, planDuration, selectedClientId, userRole]);

  const createPlan = useCallback(async () => {
    const { client, planData, saveFields } = buildSaveContext();
    const res = await authAxios.post('/api/workout-plans', {
      userId: selectedClientId,
      title: `${client?.firstName || 'Client'}'s ${phaseName} Plan`,
      description: `${categoryLabel} \u2014 ${goal}`,
      nasmPhase: phaseNumber,
      durationWeeks: saveFields.durationWeeks,
      status: 'draft',
      planData,
      createdBy: saveFields.createdBy,
      metadata: saveFields.metadata,
    });
    const data = res.data as SaveActionResponseData | undefined;
    const newId = data?.plan?.id ? String(data.plan.id) : null;
    return { client, planData, saveFields, planId: newId, planTitle: data?.plan?.title };
  }, [authAxios, buildSaveContext, categoryLabel, goal, phaseName, phaseNumber, selectedClientId]);

  const updateLoadedPlan = useCallback(async () => {
    const { client, planData, saveFields } = buildSaveContext();
    await authAxios.put(`/api/workout-plans/${loadedPlanId}`, {
      nasmPhase: phaseNumber,
      durationWeeks: saveFields.durationWeeks,
      planData,
      metadata: saveFields.metadata,
    });
    return { client, planData, saveFields, planId: loadedPlanId };
  }, [authAxios, buildSaveContext, loadedPlanId, phaseNumber]);

  const runSaveOperation = useCallback(async ({
    activate,
    requiresLoadedPlan,
    operation,
    successText,
    errorLogLabel,
    errorText,
  }: RunSaveOperationInput) => {
    if (!hasSaveablePlan || !selectedClientId || (requiresLoadedPlan && !loadedPlanId)) return;
    setSaving(true);
    try {
      const { client, planData, saveFields, planId, planTitle } = await operation();
      if (activate) {
        if (!planId) throw new Error('Backend returned no plan id');
        await authAxios.put(`/api/workout-plans/${planId}/activate`);
      }
      setSavedSnapshot(currentExercisesSig);
      if (planId && !requiresLoadedPlan) {
        setLoadedPlanId(planId);
        setLoadedPlanName(planTitle ? String(planTitle) : null);
      }
      const pdfResult = planId
        ? await attachGeneratedPdf(planId, planData, client, saveFields.durationWeeks)
        : 'skipped';
      setStatusMsg({ type: 'success', text: saveStatusText(successText, pdfResult) });
      await fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError(errorLogLabel, err);
      setStatusMsg({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  }, [attachGeneratedPdf, authAxios, currentExercisesSig, fetchSavedPlans, hasSaveablePlan, loadedPlanId, selectedClientId, setLoadedPlanId, setLoadedPlanName, setSavedSnapshot, setStatusMsg]);

  const handleSaveDraft = useCallback(async () => {
    await runSaveOperation({
      activate: false,
      requiresLoadedPlan: false,
      operation: createPlan,
      successText: 'Plan saved as draft.',
      errorLogLabel: 'Save draft failed',
      errorText: 'Failed to save plan. Please try again.',
    });
  }, [createPlan, runSaveOperation]);

  const handleSaveAndActivate = useCallback(async () => {
    await runSaveOperation({
      activate: true,
      requiresLoadedPlan: false,
      operation: createPlan,
      successText: 'Plan saved and made current.',
      errorLogLabel: 'Save & activate failed',
      errorText: 'Failed to save & activate plan.',
    });
  }, [createPlan, runSaveOperation]);

  const handleUpdateLoaded = useCallback(async () => {
    await runSaveOperation({
      activate: false,
      requiresLoadedPlan: true,
      operation: updateLoadedPlan,
      successText: 'Plan updated.',
      errorLogLabel: 'Update plan failed',
      errorText: 'Failed to update plan.',
    });
  }, [runSaveOperation, updateLoadedPlan]);

  const handleUpdateAndActivate = useCallback(async () => {
    await runSaveOperation({
      activate: true,
      requiresLoadedPlan: true,
      operation: updateLoadedPlan,
      successText: 'Plan updated and made current.',
      errorLogLabel: 'Update & activate failed',
      errorText: 'Failed to update & activate plan.',
    });
  }, [runSaveOperation, updateLoadedPlan]);

  return {
    saving,
    handleSaveDraft,
    handleSaveAndActivate,
    handleUpdateLoaded,
    handleUpdateAndActivate,
  };
};
