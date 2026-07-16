/**
 * Client plan-library orchestration.
 * =================================
 *
 * Owns the mounted staff surface's reads, protected PDF viewer, revision-aware
 * PDF generation, and audited lifecycle transitions. UI components receive
 * explicit commands and never call legacy mutation endpoints directly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  useProtectedPlanPdfViewer,
  type ProtectedPlanPdfAuthClient,
} from '../../../shared/plan-pdf/useProtectedPlanPdfViewer';
import type { ClientPlanLifecycleAction } from './ClientWorkoutPlanActions';
import {
  buildClientPlanVault,
  isClientPlanActiveStatus,
  normalizeClientWorkoutPlansResponse,
} from './ClientWorkoutPlansPanel.logic';
import type {
  ClientHomeworkSummary,
  ClientPlanSummary,
  ClientPlanVaultSummary,
  ClientTodayAssignmentSummary,
  ClientWorkoutPlansResponseSummary,
} from './ClientWorkoutPlansPanel.types';

interface ClientWorkoutPlansApi {
  get: (url: string, config?: Record<string, unknown>) => Promise<{ data?: unknown }>;
  post: (url: string, body?: Record<string, unknown>) => Promise<{ data?: unknown }>;
}

interface UseClientWorkoutPlansPanelInput {
  refreshSignal: number;
  safeClientId: number | null;
}

const responseStatus = (caught: unknown) => (
  (caught as { response?: { status?: number } })?.response?.status
);

const conflictMessage = (
  'This plan changed on the server. The library was refreshed; review the latest status and retry.'
);

export const useClientWorkoutPlansPanel = ({
  refreshSignal,
  safeClientId,
}: UseClientWorkoutPlansPanelInput) => {
  const { authAxios } = useAuth() as { authAxios?: ClientWorkoutPlansApi };
  const [plans, setPlans] = useState<ClientPlanSummary[]>([]);
  const [serverPlanVault, setServerPlanVault] = useState<ClientPlanVaultSummary | null>(null);
  const [homeworkSummary, setHomeworkSummary] = useState<ClientHomeworkSummary | null>(null);
  const [todayAssignment, setTodayAssignment] = useState<ClientTodayAssignmentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const operationInFlight = useRef(false);
  const protectedPdfClient = authAxios as unknown as ProtectedPlanPdfAuthClient | undefined;
  const {
    viewer: pdfViewer,
    openPlanPdf: openProtectedPlanPdf,
    closePlanPdf,
    openPlanPdfExternal,
  } = useProtectedPlanPdfViewer(protectedPdfClient);

  const activeCount = useMemo(
    () => plans.filter((plan) => isClientPlanActiveStatus(plan.status)).length,
    [plans],
  );
  const planVault = useMemo(
    () => serverPlanVault || buildClientPlanVault(plans),
    [plans, serverPlanVault],
  );

  const clearPlanState = useCallback(() => {
    setPlans([]);
    setServerPlanVault(null);
    setHomeworkSummary(null);
    setTodayAssignment(null);
  }, []);

  const loadPlans = useCallback(async () => {
    if (!authAxios || safeClientId === null) return;
    setLoading(true);
    setError(null);
    setPdfError(null);
    setActionError(null);
    try {
      const response = await authAxios.get(`/api/workout-plans/client/${safeClientId}`);
      const nextState = normalizeClientWorkoutPlansResponse(
        response.data as ClientWorkoutPlansResponseSummary | undefined,
      );
      setServerPlanVault(nextState.serverPlanVault);
      setHomeworkSummary(nextState.homeworkSummary);
      setTodayAssignment(nextState.todayAssignment);
      setPlans(nextState.plans);
    } catch (caught) {
      clearPlanState();
      if (responseStatus(caught) !== 404) {
        setError('Unable to load saved plans for this client.');
      }
    } finally {
      setLoading(false);
    }
  }, [authAxios, clearPlanState, safeClientId]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans, refreshSignal]);

  const openPlanPdf = useCallback(async (plan: ClientPlanSummary) => {
    if (!authAxios || !plan.pdfFile) return;
    setOpeningPdfId(plan.id);
    setPdfError(null);
    const opened = await openProtectedPlanPdf({
      pdfFile: plan.pdfFile,
      planName: plan.name,
      fileName: plan.pdfFile.fileName || `${plan.name}.pdf`,
      horizonLabel: plan.horizonLabel,
      nasmPhase: plan.nasmPhase ?? null,
      planningSystem: plan.planningSystem ?? null,
    });
    if (!opened) setPdfError(`Unable to open the PDF for ${plan.name}.`);
    setOpeningPdfId(null);
  }, [authAxios, openProtectedPlanPdf]);

  const refreshConflict = useCallback(async () => {
    await loadPlans();
    setActionError(conflictMessage);
  }, [loadPlans]);

  const transitionPlan = useCallback(async (
    plan: ClientPlanSummary,
    action: ClientPlanLifecycleAction,
  ) => {
    if (!authAxios || !plan.id || operationInFlight.current) return;
    operationInFlight.current = true;
    setBusyActionKey(`${plan.id}:${action}`);
    setActionError(null);
    try {
      await authAxios.post(`/api/workout-plans/${encodeURIComponent(plan.id)}/status`, { action });
      await loadPlans();
    } catch (caught) {
      if (responseStatus(caught) === 409) await refreshConflict();
      else setActionError(`Unable to ${action} ${plan.name}.`);
    } finally {
      operationInFlight.current = false;
      setBusyActionKey(null);
    }
  }, [authAxios, loadPlans, refreshConflict]);

  const generatePlanPdf = useCallback(async (plan: ClientPlanSummary) => {
    if (!authAxios || !plan.id || operationInFlight.current) return;
    operationInFlight.current = true;
    setBusyActionKey(`${plan.id}:pdf`);
    setActionError(null);
    setPdfError(null);
    try {
      await authAxios.post(`/api/workout-plans/${encodeURIComponent(plan.id)}/pdf/generate`, {
        expectedRevision: plan.contentRevision ?? 1,
      });
      await loadPlans();
    } catch (caught) {
      if (responseStatus(caught) === 409) await refreshConflict();
      else setPdfError(`Unable to request a current PDF for ${plan.name}.`);
    } finally {
      operationInFlight.current = false;
      setBusyActionKey(null);
    }
  }, [authAxios, loadPlans, refreshConflict]);

  const activatePlan = useCallback(
    (plan: ClientPlanSummary) => transitionPlan(plan, 'activate'),
    [transitionPlan],
  );

  return {
    activeCount, actionError, activatePlan, busyActionKey, closePlanPdf,
    error, generatePlanPdf, homeworkSummary, loadPlans, loading, openPlanPdf,
    openPlanPdfExternal, openingPdfId, pdfError, pdfViewer, plans, planVault,
    todayAssignment, transitionPlan,
  };
};
