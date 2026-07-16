/**
 * ============================================================================
 * FILE: ClientWorkoutPlansPanel.tsx
 * PURPOSE: Canonical staff command surface for one client's saved plans.
 * ============================================================================
 *
 * Mounted by TrainingTabSectionContent in the Client Hub. Reads the batched
 * plan overview, renders safe PDF state, and delegates all writes to the
 * audited status/PDF endpoints through useClientWorkoutPlansPanel.
 */

import React from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import type { ClientHubAudience } from '../clientHubAudience';
import ProtectedPlanPdfDialog from '../../../shared/plan-pdf/ProtectedPlanPdfDialog';
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
import { useClientWorkoutPlansPanel } from './useClientWorkoutPlansPanel';

interface ClientWorkoutPlansPanelProps {
  audience?: ClientHubAudience;
  clientId: number | string;
  clientName?: string;
  onLogToday?: () => void;
  refreshSignal?: number;
}

const PanelAlerts: React.FC<{
  actionError: string | null;
  error: string | null;
  loading: boolean;
  pdfError: string | null;
}> = ({ actionError, error, loading, pdfError }) => {
  if (loading) return <StateCard role="status">Loading saved plans...</StateCard>;
  if (error) return <StateCard role="alert">{error}</StateCard>;
  return (
    <>
      {actionError ? <StateCard role="alert">{actionError}</StateCard> : null}
      {pdfError ? <StateCard role="alert">{pdfError}</StateCard> : null}
    </>
  );
};

const ClientWorkoutPlansPanel: React.FC<ClientWorkoutPlansPanelProps> = ({
  audience = 'admin',
  clientId,
  clientName,
  onLogToday,
  refreshSignal = 0,
}) => {
  const safeClientId = getNumericClientId(clientId);
  const panel = useClientWorkoutPlansPanel({ refreshSignal, safeClientId });

  if (safeClientId === null) {
    return <StateCard role="alert">Select a valid client before reviewing saved plans.</StateCard>;
  }

  const activatingPlanId = panel.busyActionKey?.endsWith(':activate')
    ? panel.busyActionKey.slice(0, -':activate'.length)
    : null;

  return (
    <Panel aria-label={`${clientName || 'Client'} saved workout plans`}>
      <Header>
        <TitleBlock>
          <Eyebrow><ClipboardList size={14} /> Client plan library</Eyebrow>
          <Title>Plan Library</Title>
          <Hint>
            {panel.activeCount} current plan{panel.activeCount === 1 ? '' : 's'} for{' '}
            {clientName || `client #${safeClientId}`}
          </Hint>
        </TitleBlock>
        <ClientWorkoutPlanActiveArcSelector
          loading={panel.loading}
          planVault={panel.planVault}
          updatingPlanId={activatingPlanId}
          onSelectActiveArc={panel.activatePlan}
        />
        <RefreshButton type="button" onClick={() => void panel.loadPlans()} disabled={panel.loading}>
          <RefreshCw size={15} /> Refresh
        </RefreshButton>
      </Header>

      <ClientWorkoutPlansTeachMe />
      <PanelAlerts
        actionError={panel.actionError}
        error={panel.error}
        loading={panel.loading}
        pdfError={panel.pdfError}
      />

      {!panel.loading && !panel.error && (
        <>
          <ClientWorkoutHomeworkSummary homeworkSummary={panel.homeworkSummary} />
          <ClientWorkoutPlanVaultSection
            planVault={panel.planVault}
            activatingPlanId={activatingPlanId}
            openingPdfId={panel.openingPdfId}
            onActivate={panel.activatePlan}
            onOpenPdf={panel.openPlanPdf}
          />
          <ClientWorkoutPlanCards
            audience={audience}
            busyActionKey={panel.busyActionKey}
            clientId={safeClientId}
            plans={panel.plans}
            openingPdfId={panel.openingPdfId}
            todayAssignment={panel.todayAssignment}
            onGeneratePdf={panel.generatePlanPdf}
            onLifecycle={panel.transitionPlan}
            onLogToday={onLogToday}
            onOpenPdf={panel.openPlanPdf}
          />
          <ProtectedPlanPdfDialog
            viewer={panel.pdfViewer}
            onClose={panel.closePlanPdf}
            onOpenExternal={panel.openPlanPdfExternal}
          />
        </>
      )}
    </Panel>
  );
};

export default ClientWorkoutPlansPanel;
