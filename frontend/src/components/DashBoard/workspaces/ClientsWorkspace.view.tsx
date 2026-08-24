/**
 * COMPONENT: ClientsWorkspaceView
 * PURPOSE: Presentational shell for the canonical admin Client Hub workspace.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-08
 *
 * WIREFRAME:
 * +----------------------------------------------------------------+
 * | top bar                                                        |
 * +----------------------------------------------------------------+
 * | optional creation handoff / lifecycle confirmation             |
 * +--------------------------+-------------------------------------+
 * | grid, loading, or empty  | selected client detail tabs         |
 * +--------------------------+-------------------------------------+
 *
 * DATA FLOW:
 * Props In:  normalized client state and event handlers
 * State:     none
 * API Calls: none
 * Events:    forwards user commands to ClientsWorkspace
 * Children:  ClientCreationHandoffPanel, ClientHubGridCard, ClientDetailView
 *
 * ARCHITECTURE:
 * graph TD
 *   ClientsWorkspace --> ClientsWorkspaceView
 *   ClientsWorkspaceView --> ClientCreationHandoffPanel
 *   ClientsWorkspaceView --> ClientDetailView
 *
 * PARENT: ClientsWorkspace owns state, API calls, and navigation commands.
 * DATA: Receives normalized ClientOption and MiniCardClient records only.
 */

import React from 'react';
import type { AssignableTrainer, CreateClientRequest } from '../../../services/adminClientService';
import CreateClientModal from '../Pages/admin-clients/CreateClientModal';
import {
  ContentArea,
  DetailScrollWrap,
  HubContainer,
  LoadingPulse,
  RosterAnnouncer,
} from './ClientsWorkspace.styles';
import ErrorNote from '../../ui/ErrorNote';
import ClientsWorkspaceLensFrame from './ClientsWorkspaceLensFrame';
import ClientActivationQueuePanel from './ClientActivationQueuePanel';
import ClientCreationHandoffPanel from './clients-team/ClientCreationHandoffPanel';
import ClientNutritionEstimateReviewPanel from './clients-team/ClientNutritionEstimateReviewPanel';
import ClientNutritionRosterTriagePanel from './clients-team/ClientNutritionRosterTriagePanel';
import ClientsWorkspaceEmptyState from './ClientsWorkspaceEmptyState';
import ClientsWorkspaceIntentBanner from './ClientsWorkspaceIntentBanner';
import ClientsWorkspaceTopBar from './ClientsWorkspaceTopBar';
import ClientLifecycleConfirmDialog, {
  type ClientLifecycleConfirmRequest,
} from './clients-team/ClientLifecycleConfirmDialog';
import ClientHubGridSection from './clients-team/ClientHubGridSection';
import type { ClientHubQuickAction } from './clients-team/ClientHubGridCardActions';
import { ClientDetailView } from './clients-team';
import {
  getClientHubAudienceConfig,
  type ClientHubAudience,
} from './clients-team/clientHubAudience';
import type { MiniCardClient } from './clients-team/ClientMiniCard';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import SelectedClientTrainingHeader from './clients-team/SelectedClientTrainingHeader';
import { getClientOnboardingPct, type ClientDetailTab, type ClientHubIntent } from './ClientsWorkspace.logic';
import type { ManualClientCreationHandoff } from './clients-team/manualClientCreationHandoff';

type TabRenderer = (clientId: number | string) => React.ReactNode;
type ContentMode = 'detail' | 'loading' | 'empty' | 'grid';
type ContentRenderer = React.FC<ClientsWorkspaceViewProps>;

interface ClientHubAxios {
  get: (path: string, config?: { params?: Record<string, string | number> }) => Promise<unknown>;
}

interface ClientsWorkspaceViewProps {
  audience?: ClientHubAudience;
  authAxios: ClientHubAxios | null;
  clients: ClientOption[];
  selectedClient: ClientOption | null;
  detailClient: MiniCardClient | null;
  detailTab: ClientDetailTab;
  clientHubIntent: ClientHubIntent;
  loading: boolean;
  /** Honest-state: true when the roster fetch failed (never shown as "no clients"). */
  loadError?: boolean;
  /** Re-runs the roster fetch in place. Absent means the banner degrades to text-only. */
  onRetryLoad?: () => void;
  manualCreateOpen: boolean;
  manualCreateTrainers: AssignableTrainer[];
  creationHandoff: ManualClientCreationHandoff | null;
  deactivationConfirmation: ClientLifecycleConfirmRequest | null;
  renderTraining: TabRenderer;
  renderProgress: TabRenderer;
  renderNutrition: TabRenderer;
  renderBiometrics: TabRenderer;
  renderOverview: TabRenderer;
  renderSettings: TabRenderer;
  onSelectClient: (client: ClientOption) => void;
  onNewClient: () => void;
  onOpenAI: () => void;
  onOpenOnboardingWorkbench: () => void;
  onViewAsClient: () => void;
  onDeactivateClient: () => void;
  onReactivateClient: () => void;
  onSendPasswordReset: () => void;
  onGenerateClaimLink: () => void;
  onManageAssignments: () => void;
  onManualCreateClient: () => void;
  onCloseManualCreate: () => void;
  onManualCreate: (values: CreateClientRequest) => Promise<void>;
  onDismissCreationHandoff: () => void;
  onCopyCreationHandoff: (value: string, label: string) => void;
  onCloseDeactivationConfirmation: () => void;
  onLogWorkout: () => void;
  onPlanNext: () => void;
  onViewProgress: () => void;
  onNavigate: (route: string) => void;
  onShowDetailTab: (client: ClientOption, tab: ClientDetailTab) => void;
  onClearSelectedClient: () => void;
  onClientCardQuickAction: (client: ClientOption, action: ClientHubQuickAction) => void;
}

const hasSelectedClientDetail = (
  selectedClient: ClientOption | null,
  detailClient: MiniCardClient | null
): boolean =>
  Boolean(selectedClient && detailClient);

const getLoadedClientListMode = (clients: ClientOption[]): ContentMode =>
  clients.length === 0 ? 'empty' : 'grid';

const getDirectoryContentMode = (
  props: Pick<ClientsWorkspaceViewProps, 'loading' | 'clients'>
): ContentMode =>
  props.loading ? 'loading' : getLoadedClientListMode(props.clients);

const getWorkspaceContentMode = (
  props: Pick<ClientsWorkspaceViewProps, 'selectedClient' | 'detailClient' | 'loading' | 'clients'>
): ContentMode =>
  hasSelectedClientDetail(props.selectedClient, props.detailClient)
    ? 'detail'
    : getDirectoryContentMode(props);

const ClientActivationQueueSlot: React.FC<{
  authAxios: ClientHubAxios | null;
  selectedClient: ClientOption | null;
  onSelectClient: (client: ClientOption) => void;
  onNavigate: (route: string) => void;
}> = ({ authAxios, selectedClient, onSelectClient, onNavigate }) => {
  if (selectedClient || !authAxios) return null;

  return (
    <ClientActivationQueuePanel
      authAxios={authAxios}
      onSelectClient={onSelectClient}
      onNavigate={onNavigate}
    />
  );
};

const SelectedClientDetail: React.FC<Pick<
  ClientsWorkspaceViewProps,
  | 'audience'
  | 'selectedClient'
  | 'detailClient'
  | 'detailTab'
  | 'renderTraining'
  | 'renderProgress'
  | 'renderNutrition'
  | 'renderBiometrics'
  | 'renderOverview'
  | 'renderSettings'
  | 'onLogWorkout'
  | 'onPlanNext'
  | 'onViewProgress'
  | 'onOpenAI'
  | 'onShowDetailTab'
  | 'onClearSelectedClient'
>> = ({
  audience = 'admin',
  selectedClient,
  detailClient,
  detailTab,
  renderTraining,
  renderProgress,
  renderNutrition,
  renderBiometrics,
  renderOverview,
  renderSettings,
  onLogWorkout,
  onPlanNext,
  onViewProgress,
  onOpenAI,
  onShowDetailTab,
  onClearSelectedClient,
}) => {
  if (!selectedClient || !detailClient) return null;

  return (
    <DetailScrollWrap>
      <SelectedClientTrainingHeader
        client={selectedClient}
        onboardingPct={getClientOnboardingPct(selectedClient)}
        onLogToday={onLogWorkout}
        onPlanNext={onPlanNext}
        onViewProgress={onViewProgress}
        onDictateAI={onOpenAI}
      />
      <ClientDetailView
        client={detailClient}
        activeTab={detailTab}
        visibleTabs={getClientHubAudienceConfig(audience).visibleDetailTabs}
        onTabChange={(tab) => onShowDetailTab(selectedClient, tab)}
        onBack={onClearSelectedClient}
        renderTraining={renderTraining}
        renderProgress={renderProgress}
        renderNutrition={renderNutrition}
        renderBiometrics={renderBiometrics}
        renderOverview={renderOverview}
        renderSettings={renderSettings}
      />
    </DetailScrollWrap>
  );
};

const ClientGrid: React.FC<Pick<
  ClientsWorkspaceViewProps,
  'clients' | 'onSelectClient' | 'onClientCardQuickAction'
>> = ({ clients, onSelectClient, onClientCardQuickAction }) => (
  <ClientHubGridSection
    clients={clients}
    onSelectClient={onSelectClient}
    onClientCardQuickAction={onClientCardQuickAction}
  />
);

const DetailContent: ContentRenderer = (props) => <SelectedClientDetail {...props} />;
// Purely visual. The screen-reader announcement is made by RosterAnnouncer, which
// lives OUTSIDE ContentArea — see its definition for why a live region nested inside
// an aria-busy subtree can have its announcement deferred and then lost.
const LoadingContent: ContentRenderer = () => <LoadingPulse>Loading clients...</LoadingPulse>;
const EmptyContent: ContentRenderer = (props) => {
  const config = getClientHubAudienceConfig(props.audience ?? 'admin');
  return (
    <ClientsWorkspaceEmptyState
      copy={config.emptyRosterCopy}
      showCreateActions={config.canManageAccounts}
      onNewClient={props.onNewClient}
      onManualCreate={props.onManualCreateClient}
    />
  );
};
const GridContent: ContentRenderer = (props) => <ClientGrid {...props} />;

const CONTENT_RENDERERS: Record<ContentMode, ContentRenderer> = {
  detail: DetailContent,
  loading: LoadingContent,
  empty: EmptyContent,
  grid: GridContent,
};

const ClientsWorkspaceContent: React.FC<ClientsWorkspaceViewProps> = (props) => {
  const Content = CONTENT_RENDERERS[getWorkspaceContentMode(props)];
  return <Content {...props} />;
};

const ClientsWorkspaceView: React.FC<ClientsWorkspaceViewProps> = (props) => {
  const audienceConfig = getClientHubAudienceConfig(props.audience ?? 'admin');

  return (
    <ClientsWorkspaceLensFrame>
    <HubContainer>
      {/* Always mounted; only its text changes. Outside ContentArea on purpose. */}
      <RosterAnnouncer role="status" aria-live="polite">
        {props.loading ? 'Loading clients...' : ''}
      </RosterAnnouncer>
      {props.loadError && !props.loading && (
        <ErrorNote onRetry={props.onRetryLoad} retryLabel="Retry">
          Couldn&apos;t load your client roster.
        </ErrorNote>
      )}
      <ClientsWorkspaceTopBar
        clients={props.clients}
        selectedClient={props.selectedClient}
        loading={props.loading}
        canManageAccounts={audienceConfig.canManageAccounts}
        onSelectClient={props.onSelectClient}
        onNewClient={props.onNewClient}
        onOpenAI={props.onOpenAI}
        onOpenOnboardingWorkbench={props.onOpenOnboardingWorkbench}
        onViewAsClient={props.onViewAsClient}
        onDeactivateClient={props.onDeactivateClient}
        onReactivateClient={props.onReactivateClient}
        onSendPasswordReset={props.onSendPasswordReset}
        onGenerateClaimLink={props.onGenerateClaimLink}
        onManageAssignments={props.onManageAssignments}
        onManualCreateClient={props.onManualCreateClient}
      />
      <ClientsWorkspaceIntentBanner
        intent={props.clientHubIntent}
        selectedClientId={props.selectedClient?.id ?? null}
      />
      {audienceConfig.canManageAccounts && (
        <>
          <CreateClientModal open={props.manualCreateOpen} onClose={props.onCloseManualCreate} onSubmit={props.onManualCreate} trainers={props.manualCreateTrainers} />
          <ClientCreationHandoffPanel
            handoff={props.creationHandoff}
            onDismiss={props.onDismissCreationHandoff}
            onCopy={props.onCopyCreationHandoff}
          />
          <ClientLifecycleConfirmDialog
            request={props.deactivationConfirmation}
            onClose={props.onCloseDeactivationConfirmation}
          />
        </>
      )}
      {audienceConfig.showRosterOpsPanels && (
        <>
          {/* Activation queue hits admin-only /api/admin/clients/activation-queue —
              gate on canManageAccounts so the trainer roster flip (4A) doesn't
              hand trainers a guaranteed 403 card. Nutrition panels below are
              per-trainer scoped server-side (assertAssignmentOrAdmin). */}
          {audienceConfig.canManageAccounts && (
            <ClientActivationQueueSlot authAxios={props.authAxios} selectedClient={props.selectedClient} onSelectClient={props.onSelectClient} onNavigate={props.onNavigate} />
          )}
          <ClientNutritionRosterTriagePanel clients={props.clients} hidden={Boolean(props.selectedClient) || props.loading} />
          <ClientNutritionEstimateReviewPanel clients={props.clients} hidden={Boolean(props.selectedClient) || props.loading} />
        </>
      )}
      {/* Persistent region, so aria-busy has something to flip back to false on. */}
      <ContentArea aria-busy={props.loading}>
        <ClientsWorkspaceContent {...props} />
      </ContentArea>
    </HubContainer>
    </ClientsWorkspaceLensFrame>
  );
};

export default ClientsWorkspaceView;
