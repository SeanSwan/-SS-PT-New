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

interface ClientWorkoutPlansPanelContentProps {
  loading: boolean;
  error: string | null;
  actionError: string | null;
  pdfError: string | null;
  homeworkSummary: ClientHomeworkSummary | null;
  planVault: ClientPlanVaultSummary;
  plans: ClientPlanSummary[];
  activatingPlanId: string | null;
  openingPdfId: string | null;
  primaryUpdatingId: string | null;
  todayAssignment: ClientTodayAssignmentSummary | null;
  pdfViewer: ReturnType<typeof useProtectedPlanPdfViewer>['viewer'];
  onActivate: (plan: ClientPlanSummary) => Promise<void>;
  onClosePdf: ReturnType<typeof useProtectedPlanPdfViewer>['closePlanPdf'];
  onLogToday?: () => void;
  onMakePrimary: (plan: ClientPlanSummary) => Promise<void>;
  onOpenExternalPdf: ReturnType<typeof useProtectedPlanPdfViewer>['openPlanPdfExternal'];
  onOpenPdf: (plan: ClientPlanSummary) => Promise<void>;
}

const panelStateCard = (loading: boolean, error: string | null) => {
  if (loading) return <StateCard role="status">Loading saved plans...</StateCard>;
  if (error) return <StateCard role="alert">{error}</StateCard>;
  return null;
};

const panelActionAlerts = (actionError: string | null, pdfError: string | null) => (
  <>
    {actionError ? <StateCard role="alert">{actionError}</StateCard> : null}
    {pdfError ? <StateCard role="alert">{pdfError}</StateCard> : null}
  </>
);

// fallow-ignore-next-line complexity
const ClientWorkoutPlansPanelContent: React.FC<ClientWorkoutPlansPanelContentProps> = ({
  loading,
  error,
  actionError,
  pdfError,
  homeworkSummary,
  planVault,
  plans,
  activatingPlanId,
  openingPdfId,
  primaryUpdatingId,
  todayAssignment,
  pdfViewer,
  onActivate,
  onClosePdf,
  onLogToday,
  onMakePrimary,
  onOpenExternalPdf,
  onOpenPdf,
}) => {
  const stateCard = panelStateCard(loading, error);
  if (stateCard) return stateCard;

  return (
    <>
      {panelActionAlerts(actionError, pdfError)}
      <ClientWorkoutHomeworkSummary homeworkSummary={homeworkSummary} />
      <ClientWorkoutPlanVaultSection
        planVault={planVault}
        activatingPlanId={activatingPlanId}
        openingPdfId={openingPdfId}
        primaryUpdatingId={primaryUpdatingId}
        onActivate={onActivate}
        onOpenPdf={onOpenPdf}
        onMakePrimary={onMakePrimary}
      />
      <ClientWorkoutPlanCards
        plans={plans}
        openingPdfId={openingPdfId}
        todayAssignment={todayAssignment}
        onLogToday={onLogToday}
        onOpenPdf={onOpenPdf}
      />
      <ProtectedPlanPdfDialog
        viewer={pdfViewer}
        onClose={onClosePdf}
        onOpenExternal={onOpenExternalPdf}
      />
    </>
  );
};

// fallow-ignore-next-line complexity
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

  // fallow-ignore-next-line complexity
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

  // fallow-ignore-next-line complexity
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

  const runPlanMutation = useCallback(async ({
    endpoint,
    errorMessage,
    plan,
    setBusyPlanId,
  }: {
    endpoint: 'activate' | 'primary';
    errorMessage: string;
    plan: ClientPlanSummary;
    setBusyPlanId: React.Dispatch<React.SetStateAction<string | null>>;
  }) => {
    if (!authAxios || !plan.id) return;
    setBusyPlanId(plan.id);
    setActionError(null);
    try {
      await authAxios.put(`/api/workout-plans/${encodeURIComponent(plan.id)}/${endpoint}`);
      await loadPlans();
    } catch {
      setActionError(errorMessage);
    } finally {
      setBusyPlanId(null);
    }
  }, [authAxios, loadPlans]);

  const makePrimaryPlan = useCallback((plan: ClientPlanSummary) => runPlanMutation({
    endpoint: 'primary',
    errorMessage: `Unable to make ${plan.name} the primary arc.`,
    plan,
    setBusyPlanId: setPrimaryUpdatingId,
  }), [runPlanMutation]);

  const activatePlan = useCallback((plan: ClientPlanSummary) => runPlanMutation({
    endpoint: 'activate',
    errorMessage: `Unable to activate ${plan.name}.`,
    plan,
    setBusyPlanId: setActivatingPlanId,
  }), [runPlanMutation]);

  const selectActiveArc = useCallback((plan: ClientPlanSummary) => {
    const isActive = plan.status.trim().toLowerCase() === 'active';
    if (isActive && !plan.isPrimary) {
      makePrimaryPlan(plan);
      return;
    }
    activatePlan(plan);
  }, [activatePlan, makePrimaryPlan]);

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
          updatingPlanId={activatingPlanId || primaryUpdatingId}
          onSelectActiveArc={selectActiveArc}
        />
        <RefreshButton type="button" onClick={loadPlans} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </RefreshButton>
      </Header>
      <ClientWorkoutPlansTeachMe />
      <ClientWorkoutPlansPanelContent
        loading={loading}
        error={error}
        actionError={actionError}
        pdfError={pdfError}
        homeworkSummary={homeworkSummary}
        planVault={planVault}
        plans={plans}
        activatingPlanId={activatingPlanId}
        openingPdfId={openingPdfId}
        primaryUpdatingId={primaryUpdatingId}
        todayAssignment={todayAssignment}
        pdfViewer={pdfViewer}
        onActivate={activatePlan}
        onClosePdf={closePlanPdf}
        onLogToday={onLogToday}
        onMakePrimary={makePrimaryPlan}
        onOpenExternalPdf={openPlanPdfExternal}
        onOpenPdf={openPlanPdf}
      />
    </Panel>
  );
};

export default ClientWorkoutPlansPanel;
