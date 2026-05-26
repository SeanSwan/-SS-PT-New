/**
 * COMPONENT: ClientsWorkspace (Client Hub)
 * PURPOSE: Canonical admin client management surface with selector, daily
 * training cockpit, and selected-client detail tabs.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, UserPlus, Eye, UserCheck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  ActionBtn,
  CardGrid,
  ContentArea,
  DetailScrollWrap,
  EmptyHub,
  HeaderSection,
  HubContainer,
  LoadingPulse,
  TopBar,
  TopBarActions,
} from './ClientsWorkspace.styles';
import ClientSelectorDropdown from './clients-team/ClientSelectorDropdown';
import ClientHeaderCard from './clients-team/ClientHeaderCard';
import ClientDailyActionStrip from './clients-team/ClientDailyActionStrip';
import ClientHubGridCard from './clients-team/ClientHubGridCard';
import { useClientsWorkspaceTabRenderers } from './ClientsWorkspaceTabs';
import {
  buildClientCoachDailyRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clients-team/clientDailyTrainingRoutes';
import { toMiniCardClient } from './clients-team/clientOptionMappers';
import { ClientDetailView } from './clients-team';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { DetailTab } from './clients-team/ClientDetailView';
import ClientActivationQueuePanel from './ClientActivationQueuePanel';

type ClientHubIntent = 'log_workout' | 'plan_next' | null;

const getClientHubIntent = (searchParams: URLSearchParams): ClientHubIntent => {
  const intent = searchParams.get('intent');
  return intent === 'log_workout' || intent === 'plan_next' ? intent : null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ClientsWorkspace: React.FC = () => {
  const { authAxios } = useAuth() as any;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('training');
  const [loading, setLoading] = useState(true);

  // Read clientId from URL if present
  const urlClientId = searchParams.get('clientId') ? parseInt(searchParams.get('clientId')!) : null;
  const clientHubIntent = getClientHubIntent(searchParams);

  const runClientHubIntent = useCallback((client: ClientOption, intent: ClientHubIntent) => {
    if (intent === 'log_workout') {
      navigate(buildClientWorkoutLoggerRoute(client.id));
      return true;
    }

    if (intent === 'plan_next') {
      navigate(buildClientWorkoutPlannerRoute(client.id));
      return true;
    }

    return false;
  }, [navigate]);

  // Fetch all clients on mount
  useEffect(() => {
    if (!authAxios) return;
    const fetchClients = async () => {
      try {
        setLoading(true);
        const response = await authAxios.get('/api/admin/clients', {
          params: { limit: 100 },
        });
        if (response.data.success) {
          const mapped: ClientOption[] = (response.data.data?.clients || []).map((c: any) => ({
            id: c.id,
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            email: c.email || '',
            clientSource: c.clientSource || 'swanstudios',
            isActive: c.isActive !== false,
            availableSessions: c.availableSessions || 0,
            workoutCount: c.totalWorkouts || 0,
            fitnessGoal: c.fitnessGoal || '',
            trainingExperience: c.trainingExperience || '',
            dateOfBirth: c.dateOfBirth || null,
          }));
          setClients(mapped);

          // Auto-select from URL param
          if (urlClientId) {
            const match = mapped.find(c => c.id === urlClientId);
            if (match) {
              if (runClientHubIntent(match, clientHubIntent)) return;
              setSelectedClient(match);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch clients:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [authAxios]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectClient = useCallback((client: ClientOption) => {
    if (runClientHubIntent(client, clientHubIntent)) return;

    setSelectedClient(client);
    setDetailTab('training');
    setSearchParams({ clientId: String(client.id) });
  }, [clientHubIntent, runClientHubIntent, setSearchParams]);

  const handleNewClient = useCallback(() => {
    navigate('/dashboard/admin/coach-assistant');
  }, [navigate]);

  const handleOpenAI = useCallback(() => {
    if (selectedClient) {
      navigate(buildClientCoachDailyRoute(selectedClient.id, 'log_workout'));
    } else {
      navigate('/dashboard/admin/coach-assistant');
    }
  }, [navigate, selectedClient]);

  // Phase 17 (2026-04-20): admin Log Workout CTA.
  // The client grid cards are already buttons, so the CTA lives in the top-bar
  // action area and is only shown when a client is selected. Canonical admin
  // log-workout route per UniversalDashboardLayout.tsx:541.
  const handleLogWorkout = useCallback(() => {
    if (selectedClient) {
      navigate(buildClientWorkoutLoggerRoute(selectedClient.id));
    }
  }, [navigate, selectedClient]);

  const handlePlanNext = useCallback(() => {
    if (selectedClient) {
      navigate(buildClientWorkoutPlannerRoute(selectedClient.id));
    }
  }, [navigate, selectedClient]);

  const handleViewProgress = useCallback(() => {
    setDetailTab('progress');
  }, []);

  // Phase 18.C.1B.1R (2026-04-24): admin "View As" CTA. Navigates to the
  // canonical AdminViewAsWrapper mount at
  // /dashboard/admin/client-management/view-as/:userId, which was re-mounted
  // in UniversalDashboardLayout.tsx this slice after Phase 19 unmounted
  // the previous UnifiedAdminRoutes-backed route. Gated on selectedClient.
  const handleViewAsClient = useCallback(() => {
    if (selectedClient) {
      navigate(`/dashboard/admin/client-management/view-as/${selectedClient.id}`);
    }
  }, [navigate, selectedClient]);

  // UI-9 (2026-05-01): "Trainer Assignments" CTA. The drag-and-drop
  // ClientTrainerAssignments page has stayed mounted at
  // /dashboard/admin/client-trainer-assignments (UniversalDashboardLayout.tsx:526)
  // but its entry point was removed from this workspace when the dormant
  // MasterDetailLayout fell out of the canonical route tree (Phase 19).
  // Re-add the button so admins can reach trainer↔client assignment
  // management again. Always shown (not gated on selectedClient) since
  // it's a workspace-level operation.
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
      {/* Top Bar: Client selector + actions */}
      <TopBar>
        <ClientSelectorDropdown
          clients={clients}
          selectedId={selectedClient?.id ?? null}
          onSelect={handleSelectClient}
          onNewClient={handleNewClient}
          loading={loading}
        />
        <TopBarActions>
          {selectedClient && (
            <ActionBtn onClick={handleViewAsClient} title={`View ${selectedClient.firstName}'s dashboard as admin (read-only)`}>
              <Eye size={16} />
              <span>View As</span>
            </ActionBtn>
          )}
          <ActionBtn onClick={handleManageAssignments} title="Manage trainer↔client assignments (drag-and-drop)">
            <UserCheck size={16} />
            <span>Trainer Assignments</span>
          </ActionBtn>
          {!selectedClient && (
            <ActionBtn onClick={handleOpenAI} $variant="primary" title="Open Swan Coach">
              <MessageCircle size={16} />
              <span>Swan Coach</span>
            </ActionBtn>
          )}
          <ActionBtn onClick={handleNewClient} title="Onboard a new client via Swan Coach">
            <UserPlus size={16} />
            <span>New Client</span>
          </ActionBtn>
        </TopBarActions>
      </TopBar>

      {!selectedClient && authAxios && (
        <ClientActivationQueuePanel
          authAxios={authAxios}
          onSelectClient={handleSelectClient}
          onNavigate={navigate}
        />
      )}

      {/* Client Header Card (shown when client selected) */}
      {selectedClient && (
        <HeaderSection>
          <ClientDailyActionStrip
            clientName={`${selectedClient.firstName} ${selectedClient.lastName}`.trim()}
            workoutCount={selectedClient.workoutCount || 0}
            sessionsLeft={selectedClient.availableSessions || 0}
            onLogToday={handleLogWorkout}
            onPlanNext={handlePlanNext}
            onViewProgress={handleViewProgress}
            onDictateAI={handleOpenAI}
          />
          <ClientHeaderCard
            client={selectedClient as any}
            onboardingPct={50} // TODO: fetch from questionnaire API
          />
        </HeaderSection>
      )}

      {/* Content: either detail tabs or client card grid */}
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
          <EmptyHub>
            <UserPlus size={48} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>No clients yet</div>
            <div style={{ fontSize: 14 }}>Use the Swan Coach to onboard your first client</div>
            <ActionBtn onClick={handleNewClient} $variant="primary">
              <UserPlus size={16} />
              <span>Onboard New Client</span>
            </ActionBtn>
          </EmptyHub>
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
