/**
 * COMPONENT: ClientsWorkspace (Client Hub)
 * PURPOSE: Canonical admin client management surface with selector, daily
 * training cockpit, and selected-client detail tabs.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-08
 *
 * WIREFRAME:
 * +----------------------------------------------------------------+
 * | top bar: selector, quick actions, client creation               |
 * +----------------------+-----------------------------------------+
 * | client grid/detail   | selected-client tabs and training view  |
 * | create handoff panel | lifecycle confirmation dialog           |
 * +----------------------+-----------------------------------------+
 *
 * DATA FLOW:
 * Props In:  none
 * State:     clients, selectedClient, detailTab, creationHandoff
 * API Calls: admin client list/details through ClientsWorkspace.data
 * Events:    client select, create client, lifecycle actions, tab changes
 * Children:  ClientsWorkspaceView, client tab renderers
 *
 * ARCHITECTURE:
 * graph TD
 *   UniversalDashboardLayout --> ClientsWorkspace
 *   ClientsWorkspace --> ClientsWorkspaceView
 *   ClientsWorkspace --> useManualClientCreation
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/use-toast';
import ClientsWorkspaceView from './ClientsWorkspace.view';
import {
  buildClientDetailSearchParams,
  buildCreationHandoffCopyToast,
  copyTextToClipboard,
  getBrowserClipboard,
  getClientDetailTabFromSearchParams,
  getClientHubIntent,
  getClientIdFromSearchParams,
  getClientScheduleWorkoutLoggerContextFromSearchParams,
  getClientTrainingSectionFromSearchParams,
  type ClientDetailTab,
  type ClientHubIntent,
} from './ClientsWorkspace.logic';
import {
  fetchAdminClientById,
  fetchTrainerClientById,
  resolveInitialClientSelection,
} from './ClientsWorkspace.data';
import { useClientHubRoster } from './useClientHubRoster';
import { useClientsWorkspaceTabRenderers } from './ClientsWorkspaceTabs';
import { useClientHubAdminNav } from './useClientHubAdminNav';
import { buildClientCoachDailyRoute, buildClientWorkoutPlannerRoute } from './clients-team/clientDailyTrainingRoutes';
import { getClientHubAudienceConfig, type ClientHubAudience } from './clients-team/clientHubAudience';
import { toMiniCardClient } from './clients-team/clientOptionMappers';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import { useClientAccountLifecycle } from './clients-team/useClientAccountLifecycle';
import { useManualClientCreation } from './clients-team/useManualClientCreation';
import type { ClientHubQuickAction } from './clients-team/ClientHubGridCardActions';
import { buildClientCardQuickActionRoute } from './clients-team/clientCardQuickActions';

/** audience: 'admin' (default, full controls) or 'trainer' (assigned clients only). */
interface ClientsWorkspaceProps { audience?: ClientHubAudience }

const ClientsWorkspace: React.FC<ClientsWorkspaceProps> = ({ audience = 'admin' }) => {
  const { authAxios, user } = useAuth() as any;
  const audienceConfig = getClientHubAudienceConfig(audience);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { clients, setClients, loading, loadError, loadClients } = useClientHubRoster(authAxios, audience, user?.id);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [detailTab, setDetailTab] = useState<ClientDetailTab>(() => getClientDetailTabFromSearchParams(searchParams) ?? 'training');

  const urlClientId = getClientIdFromSearchParams(searchParams);
  const clientHubIntent = getClientHubIntent(searchParams);
  const urlDetailTab = getClientDetailTabFromSearchParams(searchParams);
  const scheduleLoggerContext = useMemo(
    () => getClientScheduleWorkoutLoggerContextFromSearchParams(searchParams),
    [searchParams]
  );

  const navigateClientDailyRoute = useCallback((route: string | null) => {
    if (!route) {
      toast({
        title: 'Client route unavailable',
        description: 'Reload Clients & Team and try again.',
        variant: 'destructive',
      });
      return false;
    }

    navigate(route);
    return true;
  }, [navigate, toast]);

  const showClientDetailTab = useCallback((client: ClientOption, tab: ClientDetailTab, trainingSection?: string) => {
    setSelectedClient(client);
    setDetailTab(tab);
    setSearchParams(buildClientDetailSearchParams(client, tab, trainingSection));
  }, [setSearchParams]);
  const runClientHubIntent = useCallback((client: ClientOption, intent: ClientHubIntent) => {
    if (intent === 'log_workout') {
      showClientDetailTab(client, 'training', 'logger');
      return true;
    }

    if (intent === 'plan_next') {
      return navigateClientDailyRoute(buildClientWorkoutPlannerRoute(client.id, audience));
    }

    return false;
  }, [audience, navigateClientDailyRoute, showClientDetailTab]);

  // Roster state + honest failure contract live in useClientHubRoster.

  const loadClientById = useCallback((clientId: number): Promise<ClientOption | null> => (
    audience === 'trainer'
      ? fetchTrainerClientById(authAxios, user?.id, clientId)
      : fetchAdminClientById(authAxios, clientId)
  ), [audience, authAxios, user?.id]);

  useEffect(() => {
    const fetchClients = async () => {
      const mapped = await loadClients();
      const selection = await resolveInitialClientSelection({
        mappedClients: mapped,
        urlClientId,
        urlDetailTab,
        loadClientById,
      });
      if (!selection) return;
      if (runClientHubIntent(selection.client, clientHubIntent)) return;
      setSelectedClient(selection.client);
      setDetailTab(selection.detailTab);
    };
    fetchClients();
  }, [loadClients, loadClientById]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleSelectClient = useCallback((client: ClientOption) => {
    if (runClientHubIntent(client, clientHubIntent)) return;

    showClientDetailTab(client, 'training');
  }, [clientHubIntent, runClientHubIntent, showClientDetailTab]);

  const {
    handleNewClient,
    handleOpenOnboardingWorkbench,
    handleViewAsClient,
    handleManageAssignments,
  } = useClientHubAdminNav(navigate, selectedClient);

  const handleOpenAI = useCallback(() => {
    if (selectedClient) {
      navigateClientDailyRoute(buildClientCoachDailyRoute(selectedClient.id, 'log_workout', audience));
    } else {
      navigate(audienceConfig.coachAssistantBase);
    }
  }, [audience, audienceConfig.coachAssistantBase, navigate, navigateClientDailyRoute, selectedClient]);

  const handleLogWorkout = useCallback(() => {
    if (selectedClient) {
      showClientDetailTab(selectedClient, 'training', 'logger');
    }
  }, [selectedClient, showClientDetailTab]);

  const handlePlanNext = useCallback(() => {
    if (selectedClient) {
      navigateClientDailyRoute(buildClientWorkoutPlannerRoute(selectedClient.id, audience));
    }
  }, [audience, navigateClientDailyRoute, selectedClient]);

  const handleViewProgress = useCallback(() => {
    if (selectedClient) showClientDetailTab(selectedClient, 'progress');
  }, [selectedClient, showClientDetailTab]);

  const handleClearSelectedClient = useCallback(() => {
    setSelectedClient(null);
    setDetailTab('training');
    setSearchParams({});
  }, [setSearchParams]);

  const handleClientCardQuickAction = useCallback((client: ClientOption, action: ClientHubQuickAction) => {
    if (action === 'log') return showClientDetailTab(client, 'training', 'logger');

    const route = buildClientCardQuickActionRoute(client.id, action, audience);
    if (route) return navigateClientDailyRoute(route);
    showClientDetailTab(client, 'progress');
  }, [audience, navigateClientDailyRoute, showClientDetailTab]);

  const {
    handleDeactivateClient,
    handleReactivateClient,
    handleSendPasswordReset,
    handleGenerateClaimLink,
    deactivationConfirmation,
    closeDeactivationConfirmation,
    passwordResetHandoff,
    clearPasswordResetHandoff,
  } = useClientAccountLifecycle({
    authAxios,
    selectedClient,
    setClients,
    setSelectedClient,
    toast,
  });
  const {
    manualCreateOpen,
    manualCreateTrainers,
    creationHandoff,
    openManualCreate,
    closeManualCreate,
    clearCreationHandoff,
    handleManualCreate,
  } = useManualClientCreation({ onClientsChanged: loadClients });
  const clientAccessHandoff = passwordResetHandoff ?? creationHandoff;
  const clearClientAccessHandoff = passwordResetHandoff ? clearPasswordResetHandoff : clearCreationHandoff;
  const handleCopyCreationHandoff = useCallback(async (value: string, label: string) => {
    const copied = await copyTextToClipboard(getBrowserClipboard(), value);
    toast(buildCreationHandoffCopyToast(label, copied));
  }, [toast]);

  const detailClient = useMemo(() => toMiniCardClient(selectedClient), [selectedClient]); const {
    renderTraining,
    renderProgress,
    renderNutrition,
    renderBiometrics,
    renderOverview,
    renderSettings,
  } = useClientsWorkspaceTabRenderers(
    selectedClient,
    getClientTrainingSectionFromSearchParams(searchParams),
    handleViewProgress,
    scheduleLoggerContext,
    audience
  );

  return (
    <ClientsWorkspaceView
      audience={audience}
      authAxios={authAxios}
      clients={clients}
      loadError={loadError}
      onRetryLoad={loadClients}
      selectedClient={selectedClient}
      detailClient={detailClient}
      detailTab={detailTab}
      clientHubIntent={clientHubIntent}
      loading={loading}
      manualCreateOpen={manualCreateOpen}
      manualCreateTrainers={manualCreateTrainers}
      creationHandoff={clientAccessHandoff}
      deactivationConfirmation={deactivationConfirmation}
      renderTraining={renderTraining}
      renderProgress={renderProgress}
      renderNutrition={renderNutrition}
      renderBiometrics={renderBiometrics}
      renderOverview={renderOverview}
      renderSettings={renderSettings}
      onSelectClient={handleSelectClient}
      onNewClient={handleNewClient}
      onOpenAI={handleOpenAI}
      onOpenOnboardingWorkbench={handleOpenOnboardingWorkbench}
      onViewAsClient={handleViewAsClient}
      onDeactivateClient={handleDeactivateClient}
      onReactivateClient={handleReactivateClient}
      onSendPasswordReset={handleSendPasswordReset}
      onGenerateClaimLink={handleGenerateClaimLink}
      onManageAssignments={handleManageAssignments}
      onManualCreateClient={openManualCreate}
      onCloseManualCreate={closeManualCreate}
      onManualCreate={handleManualCreate}
      onDismissCreationHandoff={clearClientAccessHandoff}
      onCopyCreationHandoff={handleCopyCreationHandoff}
      onCloseDeactivationConfirmation={closeDeactivationConfirmation}
      onLogWorkout={handleLogWorkout}
      onPlanNext={handlePlanNext}
      onViewProgress={handleViewProgress}
      onNavigate={navigate}
      onShowDetailTab={showClientDetailTab}
      onClearSelectedClient={handleClearSelectedClient}
      onClientCardQuickAction={handleClientCardQuickAction}
    />
  );
};
export default ClientsWorkspace;
