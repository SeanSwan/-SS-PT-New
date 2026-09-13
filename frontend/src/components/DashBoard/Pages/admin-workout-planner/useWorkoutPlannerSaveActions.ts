/** Canonical planner save and one-owner PDF fallback. */
import { useCallback, useState } from 'react';
import { usePlannerAsyncScope } from './usePlannerAsyncScope';
import { saveStatusText } from './workoutPlannerSaveActions.messages';
import { logApiError } from '../../../../utils/logApiError';
import type { PlannerClient } from './WorkoutPlannerTypes';
import { buildPlanPdfFileFromPlanData } from './workoutPlannerPlanPdfAdapter';
import { buildWorkoutPlanSaveFields } from './workoutPlannerSavePayload';
import { scrubPlanTemplate } from './plannerLogic/scrubPlanTemplate';
import type {
  PdfAttachResult,
  RunSaveOperationInput,
  SaveActionResponseData,
  UseWorkoutPlannerSaveActionsInput,
} from './useWorkoutPlannerSaveActions.types';
export const useWorkoutPlannerSaveActions = ({
  authAxios,
  selectedClientId,
  planExercisesLength,
  hasGeneratedHorizonPlan,
  loadedPlanId,
  loadedPlanRevision,
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
  setLoadedPlanRevision,
  setStatusMsg,
}: UseWorkoutPlannerSaveActionsInput) => {
  const [saving, setSaving] = useState(false);
  const scope = usePlannerAsyncScope(selectedClientId);
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
      planRevision: Number(data?.plan?.contentRevision),
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
      expectedRevision: loadedPlanRevision,
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
      planRevision: Number(data?.plan?.contentRevision),
      pdfDerivative: data?.pdfDerivative,
    };
  }, [authAxios, buildSaveContext, loadedPlanId, loadedPlanRevision, phaseNumber]);
  const runSaveOperation = useCallback(async ({
    activate,
    requiresLoadedPlan,
    operation,
    successText,
    errorLogLabel,
    errorText,
  }: RunSaveOperationInput) => {
    if (!hasSaveablePlan || !selectedClientId || (requiresLoadedPlan && !loadedPlanId)) return;
    const epoch = scope.current.epoch, request = ++scope.current.request;
    const isCurrent = () => scope.current.epoch === epoch && scope.current.request === request;
    setSaving(true);
    try {
      const result = await operation();
      if (!isCurrent()) return;
      const { client, planData, saveFields, planId, planTitle, planRevision } = result;
      let pdfDerivative = result.pdfDerivative;
      if (activate) {
        if (!planId) throw new Error('Backend returned no plan id');
        const activation = await authAxios.post(
          '/api/workout-plans/' + planId + '/status',
          { action: 'activate' },
        );
        const activationData = activation.data as SaveActionResponseData | undefined;
        pdfDerivative = activationData?.pdfDerivative ?? pdfDerivative;
      }
      if (!isCurrent()) return;
      setSavedSnapshot(currentExercisesSig);
      if (planId && !requiresLoadedPlan) {
        setLoadedPlanId(planId);
        setLoadedPlanName(planTitle ? String(planTitle) : null);
      }
      if (planId && typeof planRevision === 'number' && Number.isSafeInteger(planRevision) && planRevision > 0) {
        setLoadedPlanRevision(planRevision);
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
      if (!isCurrent()) return;
      setStatusMsg({
        type: 'success',
        text: saveStatusText(successText, pdfResult),
        ...(activate ? { nextAction: 'current-plan-ready' as const } : {}),
      });
      await fetchSavedPlans(selectedClientId);
    } catch (err) {
      if (!isCurrent()) return;
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        await fetchSavedPlans(selectedClientId);
        if (!isCurrent()) return;
        setStatusMsg({
          type: 'error',
          text: 'This plan changed on the server. Your draft is preserved. Reload the saved plan explicitly or save this draft as a new plan.',
        });
        return;
      }
      logApiError(errorLogLabel, err);
      setStatusMsg({ type: 'error', text: errorText });
    } finally {
      if (scope.current.request === request) setSaving(false);
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
    setLoadedPlanRevision,
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
  // S24: save the current builder as a client-scrubbed trainer-owned template; the server re-enforces it.
  const handleSaveAsTemplate = useCallback(async () => {
    setSaving(true);
    try {
      const { planData, saveFields } = buildSaveContext();
      const payload = scrubPlanTemplate({
        title: phaseName + ' template',
        planData,
        nasmPhase: phaseNumber,
        durationWeeks: saveFields.durationWeeks,
        goal,
      });
      await authAxios.post('/api/workout-plans', {
        ...payload,
        userId: undefined, // server assigns the trainer as owner
        status: 'draft',
        createdBy: saveFields.createdBy,
      });
      setStatusMsg({ type: 'success', text: 'Template saved — structure only, no client details.' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to save template.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, buildSaveContext, goal, phaseName, phaseNumber, setStatusMsg]);

  return {
    saving,
    handleSaveDraft,
    handleSaveAndActivate,
    handleUpdateLoaded,
    handleUpdateAndActivate,
    handleSaveAsTemplate,
  };
};
