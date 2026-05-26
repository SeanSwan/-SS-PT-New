/**
 * COMPONENT: ClientsWorkspace (Client Hub)
 * PURPOSE: Canonical admin client management surface with selector, daily
 * training cockpit, and selected-client detail tabs.
 */

import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
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
import {
  buildClientCoachDailyRoute,
  buildClientWorkoutLoggerRoute,
  buildClientWorkoutPlannerRoute,
} from './clients-team/clientDailyTrainingRoutes';
import { ClientDetailView } from './clients-team';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { MiniCardClient } from './clients-team/ClientMiniCard';
import type { DetailTab } from './clients-team/ClientDetailView';
import ClientActivationQueuePanel from './ClientActivationQueuePanel';

// Lazy-load tab content to keep initial bundle lean.
//
// Phase 15.4 (2026-04-16): ProgressTabContent added here on the canonical
// mount path. Phase 15.3's original wiring was on MasterDetailLayout (a
// dormant sibling never mounted in the canonical route tree), which meant
// the live /dashboard/admin/client-management surface rendered the
// ClientDetailView placeholder "Truthful workout charts and analytics."
// instead of the real 12-chart Phase 14 grid.
const TrainingTabContent = lazy(() => import('./clients-team/tabs/TrainingTabContent'));
const ProgressTabContent = lazy(() => import('./clients-team/tabs/ProgressTabContent'));
const BiometricsTabContent = lazy(() => import('./clients-team/tabs/BiometricsTabContent'));
const OverviewTabContent = lazy(() => import('./clients-team/tabs/OverviewTabContent'));
const SettingsTabContent = lazy(() => import('./clients-team/tabs/SettingsTabContent'));

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
            if (match) setSelectedClient(match);
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
    setSelectedClient(client);
    setDetailTab('training');
    setSearchParams({ clientId: String(client.id) });
  }, [setSearchParams]);

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

  // Map ClientOption to MiniCardClient for ClientDetailView compatibility
  const detailClient: MiniCardClient | null = useMemo(() => {
    if (!selectedClient) return null;
    return {
      id: selectedClient.id,
      firstName: selectedClient.firstName,
      lastName: selectedClient.lastName,
      email: selectedClient.email,
      status: selectedClient.isActive ? 'active' as const : 'inactive' as const,
      tier: (selectedClient.availableSessions || 0) > 20 ? 'elite' : (selectedClient.availableSessions || 0) > 0 ? 'premium' : 'starter',
      engagementScore: 50,
      lastWeighIn: null,
      sessionsLeft: selectedClient.availableSessions || 0,
      workoutCount: selectedClient.workoutCount || 0,
    };
  }, [selectedClient]);

  // Render props for ClientDetailView tabs
  const renderTraining = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading training...</LoadingPulse>}>
      <TrainingTabContent clientId={clientId} clientName={`${selectedClient?.firstName} ${selectedClient?.lastName}`} />
    </Suspense>
  ), [selectedClient]);

  // Phase 15.4: truthful 12-chart admin-scoped progress view for the
  // selected client, using /api/analytics/:userId/chart-*. Do NOT mount
  // the legacy ClientProgressDashboard (the "Preview Mode" surface).
  const renderProgress = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading progress...</LoadingPulse>}>
      <ProgressTabContent clientId={clientId} clientName={`${selectedClient?.firstName} ${selectedClient?.lastName}`} />
    </Suspense>
  ), [selectedClient]);

  const renderBiometrics = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading biometrics...</LoadingPulse>}>
      <BiometricsTabContent clientId={clientId} clientName={`${selectedClient?.firstName} ${selectedClient?.lastName}`} />
    </Suspense>
  ), [selectedClient]);

  const renderOverview = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading overview...</LoadingPulse>}>
      <OverviewTabContent clientId={clientId} />
    </Suspense>
  ), []);

  const renderSettings = useCallback((clientId: number | string) => (
    <Suspense fallback={<LoadingPulse>Loading settings...</LoadingPulse>}>
      <SettingsTabContent clientId={clientId} clientName={`${selectedClient?.firstName} ${selectedClient?.lastName}`} />
    </Suspense>
  ), [selectedClient]);

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
