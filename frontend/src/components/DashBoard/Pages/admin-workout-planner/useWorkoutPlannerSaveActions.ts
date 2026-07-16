/**
 * FILE: useWorkoutPlannerSaveActions.ts | PURPOSE: Canonical save plus one-owner PDF fallback.
 * AUTHOR: Codex GPT-5 | MODIFIED: 2026-07-16 | AI VILLAGE: 2026-07-15
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { logApiError } from '../../../../utils/logApiError';
import type { PlannerClient, PlanDuration, PlanGoal } from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import { buildPlanPdfFileFromPlanData } from './workoutPlannerPlanPdfAdapter';
import { buildWorkoutPlanSaveFields } from './workoutPlannerSavePayload';
type PdfAttachResult = 'attached' | 'failed' | 'queued' | 'skipped';
type WorkoutPlanSaveFields = ReturnType<typeof buildWorkoutPlanSaveFields>;
interface PlannerAuthClient {
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
}
interface PdfDerivativeSummary {
  enabled?: boolean;
  state?: string;
}
interface SaveActionResponseData {
  plan?: {
    id?: unknown;
    title?: unknown;
  };
  pdfDerivative?: PdfDerivativeSummary;
}
interface SaveOperationResult {
  client: PlannerClient | undefined;
  planData: unknown;
  saveFields: WorkoutPlanSaveFields;
  planId: string | null;
  planTitle?: unknown;
  pdfDerivative?: PdfDerivativeSummary;
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
  if (pdfResult === 'queued') return base + ' PDF generation queued.';
  if (pdfResult === 'attached') return base + ' PDF attached from the saved plan.';
  if (pdfResult === 'failed') {
    return base + ' PDF attachment failed; update the PDF from Saved Plans.';
  }
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
  const hasSaveablePlan = Boolean(
    selectedClientId && (planExercisesLength > 0 || hasGeneratedHorizonPlan),
  );
  const attachGeneratedPdf = useCallback(async (
    planId: string,
    planData: unknown,
    client: PlannerClient | undefined,
    durationWeeks: number,
    horizonKey: string | null | undefined,
  ): Promise<PdfAttachResult> => {
    if (typeof FormData === 'undefined') return 'skipped';
    try {
      const file = await buildPlanPdfFileFromPlanData({
        planData,
        selectedClient: client,
        goal,
        nasmPhase: phaseNumber,
        durationWeeks,
        horizonKey,
      });
      if (!file) return 'skipped';
      const formData = new FormData();
      formData.append('pdf', file);
      await authAxios.post('/api/workout-plans/' + planId + '/pdf/upload', formData);
      return 'attached';
    } catch (err) {
      logApiError('Attach generated plan PDF failed', err);
      return 'failed';
    }
  }, [authAxios, goal, phaseNumber]);
  const buildSaveContext = useCallback(() => {
    const client = clients.find((candidate) => candidate.id === selectedClientId);
    const planData = buildPlanData();
    const saveFields = buildWorkoutPlanSaveFields({
      planData,
      planDuration,
      hasGeneratedHorizonPlan,
      userRole,
    });
    return { client, planData, saveFields };
  }, [
    buildPlanData,
    clients,
    hasGeneratedHorizonPlan,
    planDuration,
    selectedClientId,
    userRole,
  ]);
  const createPlan = useCallback(async () => {
    const { client, planData, saveFields } = buildSaveContext();
    const res = await authAxios.post('/api/workout-plans', {
      userId: selectedClientId,
      title: (client?.firstName || 'Client') + "'s " + phaseName + ' Plan',
      description: categoryLabel + ' — ' + goal,
      nasmPhase: phaseNumber,
      durationWeeks: saveFields.durationWeeks,
      status: 'draft',
      planData,
      createdBy: saveFields.createdBy,
      metadata: saveFields.metadata,
    });
    const data = res.data as SaveActionResponseData | undefined;
    return {
      client,
      planData,
      saveFields,
      planId: data?.plan?.id ? String(data.plan.id) : null,
      planTitle: data?.plan?.title,
      pdfDerivative: data?.pdfDerivative,
    };
  }, [
    authAxios,
    buildSaveContext,
    categoryLabel,
    goal,
    phaseName,
    phaseNumber,
    selectedClientId,
  ]);
  const updateLoadedPlan = useCallback(async () => {
    const { client, planData, saveFields } = buildSaveContext();
    const res = await authAxios.put('/api/workout-plans/' + loadedPlanId, {
      nasmPhase: phaseNumber,
      durationWeeks: saveFields.durationWeeks,
      planData,
      metadata: saveFields.metadata,
    });
    const data = res.data as SaveActionResponseData | undefined;
    return {
      client,
      planData,
      saveFields,
      planId: loadedPlanId,
      pdfDerivative: data?.pdfDerivative,
    };
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
      const result = await operation();
      const { client, planData, saveFields, planId, planTitle } = result;
      let pdfDerivative = result.pdfDerivative;
      if (activate) {
        if (!planId) throw new Error('Backend returned no plan id');
        const activation = await authAxios.put('/api/workout-plans/' + planId + '/activate');
        const activationData = activation.data as SaveActionResponseData | undefined;
        pdfDerivative = activationData?.pdfDerivative ?? pdfDerivative;
      }
      setSavedSnapshot(currentExercisesSig);
      if (planId && !requiresLoadedPlan) {
        setLoadedPlanId(planId);
        setLoadedPlanName(planTitle ? String(planTitle) : null);
      }
      const pdfResult: PdfAttachResult = pdfDerivative?.enabled === true
        ? 'queued'
        : planId
          ? await attachGeneratedPdf(
            planId,
            planData,
            client,
            saveFields.durationWeeks,
            saveFields.metadata.planHorizon,
          )
          : 'skipped';
      setStatusMsg({
        type: 'success',
        text: saveStatusText(successText, pdfResult),
        ...(activate ? { nextAction: 'current-plan-ready' as const } : {}),
      });
      await fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError(errorLogLabel, err);
      setStatusMsg({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  }, [
    attachGeneratedPdf,
    authAxios,
    currentExercisesSig,
    fetchSavedPlans,
    hasSaveablePlan,
    loadedPlanId,
    selectedClientId,
    setLoadedPlanId,
    setLoadedPlanName,
    setSavedSnapshot,
    setStatusMsg,
  ]);
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
