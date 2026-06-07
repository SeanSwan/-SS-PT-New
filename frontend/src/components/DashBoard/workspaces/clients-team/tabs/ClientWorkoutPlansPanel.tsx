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
import { CheckCircle2, ClipboardList, Dumbbell, ExternalLink, Layers3, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getNumericClientId } from './clientTabId';
import ClientWorkoutPlansTeachMe from './ClientWorkoutPlansTeachMe';
import ClientWorkoutPlanPdfDialog, { type ClientPlanPdfViewerState } from './ClientWorkoutPlanPdfDialog';
import ClientWorkoutPlanVaultSlot from './ClientWorkoutPlanVaultSlot';
import { formatPlanUseLabel } from './ClientWorkoutPlanUse.logic';
import {
  Eyebrow,
  Header,
  Hint,
  Meta,
  Panel,
  PlanActionButton,
  PlanActions,
  PlanCard,
  PlanGrid,
  PlanTitle,
  RefreshButton,
  StateCard,
  StatusBadge,
  Title,
  TitleBlock,
  VaultGrid,
  VaultHeader,
  VaultMeta,
  VaultSection,
  VaultTitle,
} from './ClientWorkoutPlansPanel.styles';
import {
  buildClientPlanVault,
  createProtectedPdfObjectUrl,
  formatClientPlanUpdated,
  normalizeClientWorkoutPlan,
  normalizeTrainingPlanCatalog,
  type ClientPlanSummary,
  type ClientPlanVaultSummary,
  type PlanPdfAuthClient,
} from './ClientWorkoutPlansPanel.logic';

interface ClientWorkoutPlansPanelProps {
  clientId: number | string;
  clientName?: string;
  onLogToday?: () => void;
}

const ClientWorkoutPlansPanel: React.FC<ClientWorkoutPlansPanelProps> = ({ clientId, clientName, onLogToday }) => {
  const { authAxios } = useAuth() as {
    authAxios?: {
      get: (
        url: string,
        config?: { params?: Record<string, number>; responseType?: 'blob' },
      ) => Promise<{ data?: { plans?: unknown[]; plan?: unknown; trainingPlanCatalog?: unknown } }>;
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
      const responseData: { plans?: unknown[]; plan?: unknown; trainingPlanCatalog?: unknown } = response.data ?? {};
      const canonicalVault = normalizeTrainingPlanCatalog(responseData.trainingPlanCatalog);
      const canonicalPlans = canonicalVault
        ? canonicalVault.slots
            .map((slot) => slot.plan)
            .filter((plan): plan is ClientPlanSummary => plan !== null)
        : null;
      const rawPlans = Array.isArray(responseData.plans)
        ? responseData.plans
        : responseData.plan && typeof responseData.plan === 'object'
          ? [responseData.plan]
          : [];
      const normalizedRawPlans = rawPlans
        .map((plan: unknown) => (
          plan && typeof plan === 'object'
            ? normalizeClientWorkoutPlan(plan as Record<string, unknown>)
            : null
        ))
        .filter((plan: ClientPlanSummary | null): plan is ClientPlanSummary => plan !== null);
      const nextPlans = canonicalPlans ?? normalizedRawPlans;
      setServerPlanVault(canonicalVault);
      setPlans(nextPlans);
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
  }, [loadPlans]);

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
          <VaultSection aria-label="Plan Arc Vault">
            <VaultHeader>
              <VaultTitle><Layers3 size={16} /> Plan Arc Vault</VaultTitle>
              <VaultMeta>{planVault.filledCount} of 7 arcs filled</VaultMeta>
            </VaultHeader>
            <VaultGrid>
              {planVault.slots.map((slot) => (
                <ClientWorkoutPlanVaultSlot
                  key={slot.horizonKey}
                  slot={slot}
                  openingPdfId={openingPdfId}
                  primaryUpdatingId={primaryUpdatingId}
                  onOpenPdf={openPlanPdf}
                  onMakePrimary={makePrimaryPlan}
                />
              ))}
            </VaultGrid>
          </VaultSection>

          {plans.length === 0 ? (
            <StateCard>No saved plans for this client yet. Use Plan Next to create the next block.</StateCard>
          ) : (
            <PlanGrid>
              {plans.map((plan) => {
                const active = plan.status === 'active';
                return (
                  <PlanCard key={plan.id}>
                    <StatusBadge $active={active}>
                      {active && <CheckCircle2 size={13} />}
                      {plan.isPrimary ? 'Primary Arc' : active ? 'Current' : plan.status}
                    </StatusBadge>
                    <PlanTitle>{plan.name}</PlanTitle>
                    <Meta>
                      {plan.nasmPhase && <span>NASM phase {plan.nasmPhase}</span>}
                      {plan.horizonLabel && <span>{plan.horizonLabel}</span>}
                      {plan.durationWeeks && <span>{plan.durationWeeks} weeks</span>}
                      <span>{formatClientPlanUpdated(plan.createdAt)}</span>
                      {plan.assignmentDefault && <span>{formatPlanUseLabel(plan.assignmentDefault)}</span>}
                      <span>{plan.goal}</span>
                    </Meta>
                    <PlanActions>
                      {active && onLogToday && (
                        <PlanActionButton
                          type="button"
                          $variant="primary"
                          aria-label={`Log Today from ${plan.name}`}
                          onClick={onLogToday}
                        >
                          <Dumbbell size={14} /> Log Today
                        </PlanActionButton>
                      )}
                      {plan.pdfFile && (
                        <PlanActionButton
                          type="button"
                          disabled={openingPdfId === plan.id}
                          aria-label={`Open ${plan.name} PDF`}
                          onClick={() => { void openPlanPdf(plan); }}
                        >
                          <ExternalLink size={14} /> {openingPdfId === plan.id ? 'Opening PDF' : 'Open PDF'}
                        </PlanActionButton>
                      )}
                    </PlanActions>
                  </PlanCard>
                );
              })}
            </PlanGrid>
          )}
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
