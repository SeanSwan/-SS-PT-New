/**
 * Hook: useWorkoutPlannerSavedPlansState
 * Purpose: Own saved-plan list loading and card-level saved-plan actions for
 * the admin/trainer Workout Planner while keeping the mounted page focused on
 * builder orchestration.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { logApiError } from '../../../../utils/logApiError';
import type { WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import type { WorkoutPlanPdfDialogMode } from './WorkoutPlanPdfDialog';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';
import {
  createProtectedPlanPdfObjectUrl,
  type ProtectedPlanPdfAuthClient,
} from '../../shared/plan-pdf/useProtectedPlanPdfViewer';
import { mapSavedPlan } from './workoutPlannerSavedPlanMapping';
import { isWorkoutPlanActiveStatus } from './workoutPlanStatus';

interface PlannerAuthClient {
  get: (url: string, config?: AxiosRequestConfig) => Promise<{ data?: unknown }>;
  post: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  put: (url: string, body?: unknown) => Promise<{ data?: unknown }>;
  delete: (url: string) => Promise<{ data?: unknown }>;
}

interface SavedPlansApiData {
  success?: boolean;
  plans?: Array<Record<string, unknown>>;
}

interface UseWorkoutPlannerSavedPlansStateInput {
  authAxios: PlannerAuthClient;
  selectedClientId: number | null;
  loadedPlanId: string | null;
  currentExercisesSig: string;
  setSavedSnapshot: Dispatch<SetStateAction<string | null>>;
  setLoadedPlanName: Dispatch<SetStateAction<string | null>>;
  resetLoadedPlanState: () => void;
  setStatusMsg: Dispatch<SetStateAction<WorkoutPlannerStatusMessage | null>>;
  setConfirmRequest: Dispatch<SetStateAction<WorkoutPlannerConfirmRequest | null>>;
}

export const useWorkoutPlannerSavedPlansState = ({
  authAxios,
  selectedClientId,
  loadedPlanId,
  currentExercisesSig,
  setSavedSnapshot,
  setLoadedPlanName,
  resetLoadedPlanState,
  setStatusMsg,
  setConfirmRequest,
}: UseWorkoutPlannerSavedPlansStateInput) => {
  const [savedPlans, setSavedPlans] = useState<SavedPlanSummary[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [pdfDialogPlan, setPdfDialogPlan] = useState<SavedPlanSummary | null>(null);
  const [pdfDialogMode, setPdfDialogMode] = useState<WorkoutPlanPdfDialogMode>('view');
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfOpening, setPdfOpening] = useState(false);
  const pdfObjectUrlRef = useRef<string | null>(null);
  const pdfViewRequestRef = useRef(0);

  const revokePdfObjectUrl = useCallback(() => {
    if (pdfObjectUrlRef.current && typeof URL !== 'undefined') {
      URL.revokeObjectURL(pdfObjectUrlRef.current);
    }
    pdfObjectUrlRef.current = null;
  }, []);

  const fetchSavedPlans = useCallback(async (clientId: number | null) => {
    if (!clientId) {
      setSavedPlans([]);
      return;
    }

    setSavedPlansLoading(true);
    try {
      const res = await authAxios.get(`/api/workout/plans?clientId=${clientId}`);
      const data = res.data as SavedPlansApiData | undefined;
      if (data?.success && Array.isArray(data.plans)) {
        setSavedPlans(data.plans.map(mapSavedPlan));
      } else {
        setSavedPlans([]);
      }
    } catch {
      setSavedPlans([]);
    } finally {
      setSavedPlansLoading(false);
    }
  }, [authAxios]);

  const handleCardActivate = useCallback(async (planId: string, planName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}/activate`);
      setStatusMsg({ type: 'success', text: `${planName} is now the current plan.` });
      if (loadedPlanId === planId) {
        setSavedSnapshot(currentExercisesSig);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Activate plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to make plan current. Please try again.' });
    }
  }, [authAxios, currentExercisesSig, fetchSavedPlans, loadedPlanId, selectedClientId, setSavedSnapshot, setStatusMsg]);

  const handlePlanSetPrimary = useCallback(async (planId: string, planName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}/primary`);
      setStatusMsg({ type: 'success', text: `${planName} is now the primary training arc.` });
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Set primary training arc failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to update the primary training arc.' });
    }
  }, [authAxios, fetchSavedPlans, selectedClientId, setStatusMsg]);

  const handleCardRename = useCallback(async (planId: string, newName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}`, { title: newName });
      setStatusMsg({ type: 'success', text: `Renamed to "${newName}".` });
      if (loadedPlanId === planId) {
        setLoadedPlanName(newName);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Rename plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to rename plan.' });
    }
  }, [authAxios, fetchSavedPlans, loadedPlanId, selectedClientId, setLoadedPlanName, setStatusMsg]);

  const handleCardDuplicate = useCallback(async (
    planId: string,
    planName: string,
    targetClientId?: number | null,
    durationWeeks?: number | null,
  ) => {
    if (!selectedClientId) return;
    const destinationClientId = targetClientId || selectedClientId;
    const body: { targetClientId: number; durationWeeks?: number } = { targetClientId: destinationClientId };
    if (durationWeeks) body.durationWeeks = durationWeeks;

    try {
      await authAxios.post(`/api/workout-plans/${planId}/duplicate`, body);
      setStatusMsg({
        type: 'success',
        text: `Copied "${planName}" to client #${destinationClientId} as a draft.`,
      });
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Duplicate plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to duplicate plan.' });
    }
  }, [authAxios, fetchSavedPlans, selectedClientId, setStatusMsg]);

  const handleCardArchive = useCallback((planId: string, planName: string) => {
    if (!selectedClientId) return;
    setConfirmRequest({
      title: `Archive "${planName}"?`,
      message: 'This moves the plan to the archive while keeping client history available.',
      confirmLabel: 'Archive plan',
      tone: 'warning',
      onConfirm: async () => {
        try {
          await authAxios.delete(`/api/workout-plans/${planId}`);
          setStatusMsg({ type: 'success', text: `Archived "${planName}".` });
          if (loadedPlanId === planId) {
            resetLoadedPlanState();
          }
          fetchSavedPlans(selectedClientId);
        } catch (err) {
          logApiError('Archive plan failed', err);
          setStatusMsg({ type: 'error', text: 'Failed to archive plan.' });
        }
      },
    });
  }, [authAxios, fetchSavedPlans, loadedPlanId, resetLoadedPlanState, selectedClientId, setConfirmRequest, setStatusMsg]);

  const handlePlanPdfView = useCallback(async (plan: SavedPlanSummary) => {
    const requestId = pdfViewRequestRef.current + 1;
    pdfViewRequestRef.current = requestId;
    revokePdfObjectUrl();
    setPdfDialogPlan({ ...plan, pdfFile: null });
    setPdfDialogMode('view');
    const pdfFile = plan.pdfFile;
    if (!pdfFile) {
      setPdfOpening(false);
      setStatusMsg({ type: 'error', text: 'No PDF plan is attached yet.' });
      return;
    }

    setPdfOpening(true);
    try {
      const objectUrl = await createProtectedPlanPdfObjectUrl(
        authAxios as ProtectedPlanPdfAuthClient,
        pdfFile,
      );
      if (pdfViewRequestRef.current !== requestId) {
        if (typeof URL !== 'undefined') URL.revokeObjectURL(objectUrl);
        return;
      }
      pdfObjectUrlRef.current = objectUrl;
      setPdfDialogPlan({ ...plan, pdfFile: { ...pdfFile, url: objectUrl } });
    } catch (err) {
      if (pdfViewRequestRef.current !== requestId) return;
      logApiError('View plan PDF failed', err);
      setPdfDialogPlan(null);
      setStatusMsg({ type: 'error', text: 'Failed to open the PDF plan.' });
    } finally {
      if (pdfViewRequestRef.current === requestId) setPdfOpening(false);
    }
  }, [authAxios, revokePdfObjectUrl, setStatusMsg]);

  const handlePlanPdfUpdate = useCallback((plan: SavedPlanSummary) => {
    revokePdfObjectUrl();
    setPdfDialogPlan(plan);
    setPdfDialogMode('edit');
  }, [revokePdfObjectUrl]);

  const closePlanPdfDialog = useCallback(() => {
    if (pdfSaving) return;
    pdfViewRequestRef.current += 1;
    setPdfOpening(false);
    revokePdfObjectUrl();
    setPdfDialogPlan(null);
    setPdfDialogMode('view');
  }, [pdfSaving, revokePdfObjectUrl]);

  const handlePlanPdfSave = useCallback(async (planId: string, pdfUrl: string, fileName: string) => {
    if (!selectedClientId) return;
    setPdfSaving(true);
    try {
      await authAxios.put(`/api/workout-plans/${planId}/pdf`, { pdfUrl, fileName });
      setStatusMsg({ type: 'success', text: 'PDF plan updated.' });
      await fetchSavedPlans(selectedClientId);
      revokePdfObjectUrl();
      setPdfDialogPlan(null);
      setPdfDialogMode('view');
    } catch (err) {
      logApiError('Update plan PDF failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to update the PDF plan.' });
    } finally {
      setPdfSaving(false);
    }
  }, [authAxios, fetchSavedPlans, revokePdfObjectUrl, selectedClientId, setStatusMsg]);

  const handlePlanPdfUpload = useCallback(async (planId: string, file: File) => {
    if (!selectedClientId) return;
    const formData = new FormData();
    formData.append('pdf', file);
    setPdfSaving(true);
    try {
      await authAxios.post(`/api/workout-plans/${planId}/pdf/upload`, formData);
      setStatusMsg({ type: 'success', text: 'PDF plan uploaded.' });
      await fetchSavedPlans(selectedClientId);
      revokePdfObjectUrl();
      setPdfDialogPlan(null);
      setPdfDialogMode('view');
    } catch (err) {
      logApiError('Upload plan PDF failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to upload the PDF plan.' });
    } finally {
      setPdfSaving(false);
    }
  }, [authAxios, fetchSavedPlans, revokePdfObjectUrl, selectedClientId, setStatusMsg]);

  const activePlanCount = useMemo(
    () => savedPlans.filter(plan => isWorkoutPlanActiveStatus(plan.status)).length,
    [savedPlans],
  );

  const archiveBlockedFor = useCallback((planStatus: string) =>
    isWorkoutPlanActiveStatus(planStatus) && activePlanCount <= 1,
    [activePlanCount],
  );

  useEffect(() => {
    fetchSavedPlans(selectedClientId);
  }, [fetchSavedPlans, selectedClientId]);

  return {
    savedPlans,
    savedPlansLoading,
    fetchSavedPlans,
    archiveBlockedFor,
    handleCardActivate,
    handlePlanSetPrimary,
    handleCardRename,
    handleCardDuplicate,
    handleCardArchive,
    pdfDialogPlan,
    pdfDialogMode,
    pdfSaving,
    pdfOpening,
    handlePlanPdfView,
    handlePlanPdfUpdate,
    handlePlanPdfSave,
    handlePlanPdfUpload,
    closePlanPdfDialog,
  };
};
