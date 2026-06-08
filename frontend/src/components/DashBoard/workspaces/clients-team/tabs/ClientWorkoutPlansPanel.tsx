/**
 * ============================================================================
 * FILE: ClientWorkoutPlansPanel.tsx
 * PURPOSE: Selected-client saved plan receipt inside the Client Hub.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Loads the selected client's workout plans from the canonical workout-plan
 * list API and gives trainers/admins a quick proof that Plan Next saved.
 *
 * HOW IT FITS IN THE APP:
 * ClientsWorkspace -> TrainingTabContent -> ClientWorkoutPlansPanel.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import ProtectedPlanPdfDialog from '../../../shared/plan-pdf/ProtectedPlanPdfDialog';
import {
  useProtectedPlanPdfViewer,
  type ProtectedPlanPdfAuthClient,
} from '../../../shared/plan-pdf/useProtectedPlanPdfViewer';
import { getNumericClientId } from './clientTabId';
import ClientWorkoutHomeworkSummary from './ClientWorkoutHomeworkSummary';
import ClientWorkoutPlanActiveArcSelector from './ClientWorkoutPlanActiveArcSelector';
import ClientWorkoutPlanCards from './ClientWorkoutPlanCards';
import ClientWorkoutPlansTeachMe from './ClientWorkoutPlansTeachMe';
import ClientWorkoutPlanVaultSection from './ClientWorkoutPlanVaultSection';
import {
  Eyebrow,
  Header,
  Hint,
  Panel,
  RefreshButton,
  StateCard,
  Title,
  TitleBlock,
} from './ClientWorkoutPlansPanel.styles';
import {
  buildClientPlanVault,
  normalizeClientWorkoutPlansResponse,
  type ClientHomeworkSummary,
  type ClientPlanSummary,
  type ClientPlanVaultSummary,
  type ClientTodayAssignmentSummary,
  type ClientWorkoutPlansResponseSummary,
} from './ClientWorkoutPlansPanel.logic';

interface ClientWorkoutPlansPanelProps {
  clientId: number | string;
  clientName?: string;
  onLogToday?: () => void;
  refreshSignal?: number;
}

const ClientWorkoutPlansPanel: React.FC<ClientWorkoutPlansPanelProps> = ({
  clientId,
  clientName,
  onLogToday,
  refreshSignal = 0,
}) => {
  const { authAxios } = useAuth() as {
    authAxios?: {
      get: (
        url: string,
        config?: { params?: Record<string, number>; responseType?: 'blob' },
      ) => Promise<{ data?: ClientWorkoutPlansResponseSummary }>;
      put: (url: string) => Promise<unknown>;
    };
  };
  const safeClientId = getNumericClientId(clientId);
  const [plans, setPlans] = useState<ClientPlanSummary[]>([]);
  const [serverPlanVault, setServerPlanVault] = useState<ClientPlanVaultSummary | null>(null);
  const [homeworkSummary, setHomeworkSummary] = useState<ClientHomeworkSummary | null>(null);
  const [todayAssignment, setTodayAssignment] = useState<ClientTodayAssignmentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);
  const [primaryUpdatingId, setPrimaryUpdatingId] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    viewer: pdfViewer,
    openPlanPdf: openProtectedPlanPdf,
    closePlanPdf,
    openPlanPdfExternal,
  } = useProtectedPlanPdfViewer(authAxios as ProtectedPlanPdfAuthClient | undefined);

  const activeCount = useMemo(() => plans.filter((plan) => plan.status === 'active').length, [plans]);
  const planVault = useMemo(() => serverPlanVault || buildClientPlanVault(plans), [plans, serverPlanVault]);

  const loadPlans = useCallback(async () => {
    if (!authAxios || safeClientId === null) return;
    setLoading(true);
    setError(null);
    setPdfError(null);
    setActionError(null);
    try {
      const response = await authAxios.get(`/api/workout-plans/client/${safeClientId}`);
      const nextState = normalizeClientWorkoutPlansResponse(response.data);
      setServerPlanVault(nextState.serverPlanVault);
      setHomeworkSummary(nextState.homeworkSummary);
      setTodayAssignment(nextState.todayAssignment);
      setPlans(nextState.plans);
    } catch (caught) {
      const status = (caught as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setPlans([]);
        setServerPlanVault(null);
        setHomeworkSummary(null);
        setTodayAssignment(null);
        return;
      }
      setError('Unable to load saved plans for this client.');
      setPlans([]);
      setServerPlanVault(null);
      setHomeworkSummary(null);
      setTodayAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [authAxios, safeClientId]);

  useEffect(() => {
    loadPlans();
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
    if (!opened) {
      setPdfError(`Unable to open the PDF for ${plan.name}.`);
    }
    setOpeningPdfId(null);
  }, [authAxios, openProtectedPlanPdf]);

  const makePrimaryPlan = useCallback(async (plan: ClientPlanSummary) => {
    if (!authAxios || !plan.id) return;
    setPrimaryUpdatingId(plan.id);
    setActionError(null);
    try {
      await authAxios.put(`/api/workout-plans/${encodeURIComponent(plan.id)}/primary`);
      await loadPlans();
    } catch {
      setActionError(`Unable to make ${plan.name} the primary arc.`);
    } finally {
      setPrimaryUpdatingId(null);
    }
  }, [authAxios, loadPlans]);

  const activatePlan = useCallback(async (plan: ClientPlanSummary) => {
    if (!authAxios || !plan.id) return;
    setActivatingPlanId(plan.id);
    setActionError(null);
    try {
      await authAxios.put(`/api/workout-plans/${encodeURIComponent(plan.id)}/activate`);
      await loadPlans();
    } catch {
      setActionError(`Unable to activate ${plan.name}.`);
    } finally {
      setActivatingPlanId(null);
    }
  }, [authAxios, loadPlans]);

  if (safeClientId === null) {
    return <StateCard role="alert">Select a valid client before reviewing saved plans.</StateCard>;
  }

  return (
    <Panel aria-label={`${clientName || 'Client'} saved workout plans`}>
      <Header>
        <TitleBlock>
          <Eyebrow><ClipboardList size={14} /> Client plan library</Eyebrow>
          <Title>Training Plans</Title>
          <Hint>{activeCount} current plan{activeCount === 1 ? '' : 's'} for {clientName || `client #${safeClientId}`}</Hint>
        </TitleBlock>
        <ClientWorkoutPlanActiveArcSelector
          planVault={planVault}
          updatingPlanId={primaryUpdatingId}
          onMakePrimary={makePrimaryPlan}
        />
        <RefreshButton type="button" onClick={loadPlans} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </RefreshButton>
      </Header>
      <ClientWorkoutPlansTeachMe />

      {loading ? (
        <StateCard role="status">Loading saved plans...</StateCard>
      ) : error ? (
        <StateCard role="alert">{error}</StateCard>
      ) : (
        <>
          {actionError && <StateCard role="alert">{actionError}</StateCard>}
          {pdfError && <StateCard role="alert">{pdfError}</StateCard>}
          <ClientWorkoutHomeworkSummary homeworkSummary={homeworkSummary} />
          <ClientWorkoutPlanVaultSection
            planVault={planVault}
            activatingPlanId={activatingPlanId}
            openingPdfId={openingPdfId}
            primaryUpdatingId={primaryUpdatingId}
            onActivate={activatePlan}
            onOpenPdf={openPlanPdf}
            onMakePrimary={makePrimaryPlan}
          />
          <ClientWorkoutPlanCards
            plans={plans}
            openingPdfId={openingPdfId}
            todayAssignment={todayAssignment}
            onLogToday={onLogToday}
            onOpenPdf={openPlanPdf}
          />
          <ProtectedPlanPdfDialog
            viewer={pdfViewer}
            onClose={closePlanPdf}
            onOpenExternal={openPlanPdfExternal}
          />
        </>
      )}
    </Panel>
  );
};

export default ClientWorkoutPlansPanel;
