/**
 * COMPONENT: ClientsWorkspace (Client Hub)
 * PURPOSE: Canonical admin client management surface with selector, daily
 * training cockpit, and selected-client detail tabs.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../hooks/use-toast';
import {
  CardGrid,
  ContentArea,
  DetailScrollWrap,
  HubContainer,
  LoadingPulse,
} from './ClientsWorkspace.styles';
import ClientHubGridCard from './clients-team/ClientHubGridCard';
import ClientsWorkspaceTopBar from './ClientsWorkspaceTopBar';
import ClientsWorkspaceEmptyState from './ClientsWorkspaceEmptyState';
import {
  getClientHubIntent,
  getClientIdFromSearchParams,
  getClientOnboardingPct,
  type ClientHubIntent,
} from './ClientsWorkspace.logic';
import CreateClientModal from '../Pages/admin-clients/CreateClientModal';
import SelectedClientTrainingHeader from './clients-team/SelectedClientTrainingHeader';
import { useClientsWorkspaceTabRenderers } from './ClientsWorkspaceTabs';
import {
  buildClientCoachDailyRoute,
  buildClientCoachOnboardingRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clients-team/clientDailyTrainingRoutes';
import { mapAdminClientToClientOption, toMiniCardClient } from './clients-team/clientOptionMappers';
import { ClientDetailView } from './clients-team';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { DetailTab } from './clients-team/ClientDetailView';
import ClientActivationQueuePanel from './ClientActivationQueuePanel';
import { useClientAccountLifecycle } from './clients-team/useClientAccountLifecycle';
import { useManualClientCreation } from './clients-team/useManualClientCreation';
import ClientLifecycleConfirmDialog from './clients-team/ClientLifecycleConfirmDialog';

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
const ClientsWorkspace: React.FC = () => {
  const { authAxios } = useAuth() as any;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('training');
  const [loading, setLoading] = useState(true);

  const urlClientId = getClientIdFromSearchParams(searchParams);
  const clientHubIntent = getClientHubIntent(searchParams);

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

  const runClientHubIntent = useCallback((client: ClientOption, intent: ClientHubIntent) => {
    if (intent === 'log_workout') {
      return navigateClientDailyRoute(buildClientWorkoutLoggerRoute(client.id));
    }

    if (intent === 'plan_next') {
      return navigateClientDailyRoute(buildClientWorkoutPlannerRoute(client.id));
    }

    return false;
  }, [navigateClientDailyRoute]);

  const loadClients = useCallback(async (): Promise<ClientOption[]> => {
    if (!authAxios) return [];
    try {
      setLoading(true);
      const response = await authAxios.get('/api/admin/clients', {
        params: { limit: 100, status: 'active' },
      });
      if (!response.data.success) return [];
      const mapped: ClientOption[] = (response.data.data?.clients || [])
        .map(mapAdminClientToClientOption)
        .filter((client: ClientOption | null): client is ClientOption => client !== null);
      setClients(mapped);
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch clients:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  const loadClientById = useCallback(async (clientId: number): Promise<ClientOption | null> => {
    if (!authAxios) return null;
    try {
      const response = await authAxios.get(`/api/admin/clients/${clientId}`);
      if (!response.data?.success) return null;
      return mapAdminClientToClientOption(response.data.data?.client);
    } catch (err) {
      console.warn('Failed to fetch client details:', err);
      return null;
    }
  }, [authAxios]);

  // Fetch all clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      const mapped = await loadClients();
      if (!urlClientId) return;
      const match = mapped.find(c => c.id === urlClientId) || await loadClientById(urlClientId);
      if (match) {
        if (runClientHubIntent(match, clientHubIntent)) return;
        setSelectedClient(match);
      }
    };
    fetchClients();
  }, [loadClients, loadClientById]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectClient = useCallback((client: ClientOption) => {
    if (runClientHubIntent(client, clientHubIntent)) return;

    setSelectedClient(client);
    setDetailTab('training');
    setSearchParams({ clientId: String(client.id) });
  }, [clientHubIntent, runClientHubIntent, setSearchParams]);

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

  const handleLogWorkout = useCallback(() => {
    if (selectedClient) {
      navigateClientDailyRoute(buildClientWorkoutLoggerRoute(selectedClient.id));
    }
  }, [navigateClientDailyRoute, selectedClient]);

  const handlePlanNext = useCallback(() => {
    if (selectedClient) {
      navigateClientDailyRoute(buildClientWorkoutPlannerRoute(selectedClient.id));
    }
  }, [navigateClientDailyRoute, selectedClient]);

  const handleViewProgress = useCallback(() => {
    setDetailTab('progress');
  }, []);

  const handleViewAsClient = useCallback(() => {
    if (selectedClient) {
      navigate(`/dashboard/admin/client-management/view-as/${selectedClient.id}`);
    }
  }, [navigate, selectedClient]);

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
    openManualCreate,
    closeManualCreate,
    handleManualCreate,
  } = useManualClientCreation({ onClientsChanged: loadClients });

  const handleManageAssignments = useCallback(() => {
    navigate('/dashboard/admin/client-trainer-assignments');
  }, [navigate]);

  const detailClient = useMemo(() => toMiniCardClient(selectedClient), [selectedClient]);
  const {
    renderTraining,
    renderProgress,
    renderBiometrics,
    renderOverview,
    renderSettings,
  } = useClientsWorkspaceTabRenderers(selectedClient);

  return (
    <HubContainer>
      <ClientsWorkspaceTopBar
        clients={clients}
        selectedClient={selectedClient}
        loading={loading}
        onSelectClient={handleSelectClient}
        onNewClient={handleNewClient}
        onOpenAI={handleOpenAI}
        onViewAsClient={handleViewAsClient}
        onDeactivateClient={handleDeactivateClient}
        onReactivateClient={handleReactivateClient}
        onSendPasswordReset={handleSendPasswordReset}
        onManageAssignments={handleManageAssignments}
        onManualCreateClient={openManualCreate}
      />
      <CreateClientModal
        open={manualCreateOpen}
        onClose={closeManualCreate}
        onSubmit={handleManualCreate}
      />
      <ClientLifecycleConfirmDialog
        request={deactivationConfirmation}
        onClose={closeDeactivationConfirmation}
      />
      {!selectedClient && authAxios && (
        <ClientActivationQueuePanel
          authAxios={authAxios}
          onSelectClient={handleSelectClient}
          onNavigate={navigate}
        />
      )}

      {selectedClient && (
        <SelectedClientTrainingHeader
          client={selectedClient}
          onboardingPct={getClientOnboardingPct(selectedClient)}
          onLogToday={handleLogWorkout}
          onPlanNext={handlePlanNext}
          onViewProgress={handleViewProgress}
          onDictateAI={handleOpenAI}
        />
      )}

      <ContentArea>
        {selectedClient && detailClient ? (
          <DetailScrollWrap>
            <ClientDetailView
              client={detailClient}
              activeTab={detailTab}
              onTabChange={setDetailTab}
              onBack={() => {
                setSelectedClient(null);
                setDetailTab('training');
                setSearchParams({});
              }}
              renderTraining={renderTraining}
              renderProgress={renderProgress}
              renderBiometrics={renderBiometrics}
              renderOverview={renderOverview}
              renderSettings={renderSettings}
            />
          </DetailScrollWrap>
        ) : loading ? (
          <LoadingPulse>Loading clients...</LoadingPulse>
        ) : clients.length === 0 ? (
          <ClientsWorkspaceEmptyState
            onNewClient={handleNewClient}
            onManualCreate={openManualCreate}
          />
        ) : (
          <CardGrid>
            {clients.map(c => (
              <ClientHubGridCard key={c.id} client={c} onSelect={handleSelectClient} />
            ))}
          </CardGrid>
        )}
      </ContentArea>
    </HubContainer>
  );
};

export default ClientsWorkspace;
