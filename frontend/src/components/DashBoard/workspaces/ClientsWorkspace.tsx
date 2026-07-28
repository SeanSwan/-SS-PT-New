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
import { useClientDirectoryExport } from './useClientDirectoryExport';
import ClientsWorkspaceView from './ClientsWorkspace.view';
import {
  buildClientDetailSearchParams,
  buildClientOnboardingWorkbenchRoute,
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
  fetchClientHubAdminClients,
  fetchAdminClientById,
  resolveInitialClientSelection,
} from './ClientsWorkspace.data';
import { useClientsWorkspaceTabRenderers } from './ClientsWorkspaceTabs';
import {
  buildClientCoachDailyRoute,
  buildClientCoachOnboardingRoute,
  buildClientWorkoutPlannerRoute,
} from './clients-team/clientDailyTrainingRoutes';
import { toMiniCardClient } from './clients-team/clientOptionMappers';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import { useClientAccountLifecycle } from './clients-team/useClientAccountLifecycle';
import { useManualClientCreation } from './clients-team/useManualClientCreation';
import type { ClientHubQuickAction } from './clients-team/ClientHubGridCardActions';
import { buildClientCardQuickActionRoute } from './clients-team/clientCardQuickActions';

const ClientsWorkspace: React.FC = () => {
  const { authAxios, services } = useAuth();
  const { toast } = useToast();
  const clientExport = useClientDirectoryExport(services?.adminClient, toast);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [detailTab, setDetailTab] = useState<ClientDetailTab>(() => getClientDetailTabFromSearchParams(searchParams) ?? 'training');
  const [loading, setLoading] = useState(true);

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
      return navigateClientDailyRoute(buildClientWorkoutPlannerRoute(client.id));
    }

    return false;
  }, [navigateClientDailyRoute, showClientDetailTab]);

  const loadClients = useCallback(async (): Promise<ClientOption[]> => {
    setLoading(true);
    try {
      const mapped = await fetchClientHubAdminClients(authAxios);
      setClients(mapped);
      return mapped;
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  const loadClientById = useCallback((clientId: number): Promise<ClientOption | null> =>
    fetchAdminClientById(authAxios, clientId), [authAxios]);

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

  const handleNewClient = useCallback(() => {
    navigate(buildClientCoachOnboardingRoute());
  }, [navigate]);

  const handleOpenAI = useCallback(() => {
    if (selectedClient) {
      navigateClientDailyRoute(buildClientCoachDailyRoute(selectedClient.id, 'log_workout'));
    } else {
      navigate('/dashboard/admin/coach-assistant');
    }
  }, [navigate, navigateClientDailyRoute, selectedClient]);

  const handleOpenOnboardingWorkbench = useCallback(() => {
    navigate(buildClientOnboardingWorkbenchRoute(selectedClient));
  }, [navigate, selectedClient]);

  const handleLogWorkout = useCallback(() => {
    if (selectedClient) {
      showClientDetailTab(selectedClient, 'training', 'logger');
    }
  }, [selectedClient, showClientDetailTab]);

  const handlePlanNext = useCallback(() => {
    if (selectedClient) {
      navigateClientDailyRoute(buildClientWorkoutPlannerRoute(selectedClient.id));
    }
  }, [navigateClientDailyRoute, selectedClient]);

  const handleViewProgress = useCallback(() => {
    if (selectedClient) showClientDetailTab(selectedClient, 'progress');
  }, [selectedClient, showClientDetailTab]);

  const handleViewAsClient = useCallback(() => {
    if (selectedClient) {
      navigate(`/dashboard/admin/client-management/view-as/${selectedClient.id}`);
    }
  }, [navigate, selectedClient]);

  const handleClearSelectedClient = useCallback(() => {
    setSelectedClient(null);
    setDetailTab('training');
    setSearchParams({});
  }, [setSearchParams]);

  const handleClientCardQuickAction = useCallback((client: ClientOption, action: ClientHubQuickAction) => {
    if (action === 'log') return showClientDetailTab(client, 'training', 'logger');

    const route = buildClientCardQuickActionRoute(client.id, action);
    if (route) return navigateClientDailyRoute(route);
    showClientDetailTab(client, 'progress');
  }, [navigateClientDailyRoute, showClientDetailTab]);

  const {
    handleDeactivateClient,
    handleReactivateClient,
    handleSendPasswordReset,
    deactivationConfirmation,
    closeDeactivationConfirmation,
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

  const handleCopyCreationHandoff = useCallback(async (value: string, label: string) => {
    const copied = await copyTextToClipboard(getBrowserClipboard(), value);
    toast(buildCreationHandoffCopyToast(label, copied));
  }, [toast]);

  const handleManageAssignments = useCallback(() => navigate('/dashboard/admin/client-trainer-assignments'), [navigate]);

  const detailClient = useMemo(() => toMiniCardClient(selectedClient), [selectedClient]);
  const {
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
    scheduleLoggerContext
  );

  return (
    <ClientsWorkspaceView
      authAxios={authAxios}
      clients={clients}
      selectedClient={selectedClient}
      detailClient={detailClient}
      detailTab={detailTab}
      clientHubIntent={clientHubIntent}
      loading={loading}
      exportingClients={clientExport.exporting}
      onExportClients={clientExport.exportClients}
      manualCreateOpen={manualCreateOpen}
      manualCreateTrainers={manualCreateTrainers}
      creationHandoff={creationHandoff}
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
      onManageAssignments={handleManageAssignments}
      onManualCreateClient={openManualCreate}
      onCloseManualCreate={closeManualCreate}
      onManualCreate={handleManualCreate}
      onDismissCreationHandoff={clearCreationHandoff}
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
