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
import { getNumericClientId } from './clientTabId';
import ClientWorkoutPlanCards from './ClientWorkoutPlanCards';
import ClientWorkoutPlansTeachMe from './ClientWorkoutPlansTeachMe';
import ClientWorkoutPlanPdfDialog, { type ClientPlanPdfViewerState } from './ClientWorkoutPlanPdfDialog';
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
  createProtectedPdfObjectUrl,
  normalizeClientWorkoutPlansResponse,
  type ClientPlanSummary,
  type ClientPlanVaultSummary,
  type ClientWorkoutPlansResponseSummary,
  type PlanPdfAuthClient,
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
  const [pdfViewer, setPdfViewer] = useState<ClientPlanPdfViewerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);
  const [primaryUpdatingId, setPrimaryUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setPlans(nextState.plans);
    } catch (caught) {
      const status = (caught as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setPlans([]);
        setServerPlanVault(null);
        return;
      }
      setError('Unable to load saved plans for this client.');
      setPlans([]);
      setServerPlanVault(null);
    } finally {
      setLoading(false);
    }
  }, [authAxios, safeClientId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans, refreshSignal]);

  useEffect(() => () => {
    if (pdfViewer?.objectUrl) URL.revokeObjectURL(pdfViewer.objectUrl);
  }, [pdfViewer?.objectUrl]);

  const openPlanPdf = useCallback(async (plan: ClientPlanSummary) => {
    if (!authAxios || !plan.pdfFile) return;
    setOpeningPdfId(plan.id);
    setPdfError(null);
    try {
      const objectUrl = await createProtectedPdfObjectUrl(authAxios as PlanPdfAuthClient, plan.pdfFile);
      setPdfViewer({
        objectUrl,
        planName: plan.name,
        fileName: plan.pdfFile.fileName || `${plan.name}.pdf`,
        horizonLabel: plan.horizonLabel,
        nasmPhase: plan.nasmPhase ?? null,
        planningSystem: plan.planningSystem ?? null,
      });
    } catch {
      setPdfError(`Unable to open the PDF for ${plan.name}.`);
    } finally {
      setOpeningPdfId(null);
    }
  }, [authAxios]);

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

  const closePlanPdf = useCallback(() => {
    setPdfViewer(null);
  }, []);

  const openPlanPdfExternal = useCallback((objectUrl: string) => {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  }, []);

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
          <ClientWorkoutPlanVaultSection
            planVault={planVault}
            openingPdfId={openingPdfId}
            primaryUpdatingId={primaryUpdatingId}
            onOpenPdf={openPlanPdf}
            onMakePrimary={makePrimaryPlan}
          />
          <ClientWorkoutPlanCards
            plans={plans}
            openingPdfId={openingPdfId}
            onLogToday={onLogToday}
            onOpenPdf={openPlanPdf}
          />
          <ClientWorkoutPlanPdfDialog
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
