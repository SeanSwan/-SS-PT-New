/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientsWorkspace (Client Hub)                    ║
 * ║  PURPOSE: Unified client management — selector + detail tabs ║
 * ║  OWNER: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-04-03  ║
 * ║  AI VILLAGE VALIDATED: 2026-04-03 (14-brain consensus)      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ [Client Selector ▼]          [+ New Client]   [🤖 AI Coach] │
 * ├──────────────────────────────────────────────────────────────┤
 * │ 📷 Fixture Client — SwanStudios · 30yo · Beginner            │
 * │    Onboarding: 50% [████░░░░] 4/8 sections                  │
 * ├──────────────────────────────────────────────────────────────┤
 * │ [Overview] [Training] [Biometrics] [Settings]                │
 * ├──────────────────────────────────────────────────────────────┤
 * │  (Tab content)                                               │
 * └──────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In: (none — page-level)
 * State: selectedClientId, clients[], loading
 * API Calls: GET /api/admin/clients
 * Children: ClientSelectorDropdown, ClientHeaderCard, ClientDetailView
 */

import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, UserPlus, Dumbbell, Eye, UserCheck } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ClientSelectorDropdown from './clients-team/ClientSelectorDropdown';
import ClientHeaderCard from './clients-team/ClientHeaderCard';
import { ClientDetailView } from './clients-team';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { MiniCardClient } from './clients-team/ClientMiniCard';
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
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const HubContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;

  @media (min-width: 2560px) {
    max-width: 2200px;
    margin: 0 auto;
  }

  @media (min-width: 3840px) {
    max-width: 3000px;
  }
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    padding: 10px 12px;
    gap: 8px;
  }
`;

const TopBarActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'
      : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 14px;
    span { display: none; }
  }
`;

const HeaderSection = styled.div`
  padding: 0 20px 12px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0 12px 8px;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

/**
 * Scroll container for the ClientDetailView branch only. ContentArea above
 * stays overflow:hidden because the alternate CardGrid branch owns its own
 * vertical scroll. Without this wrapper the detail tabs (Training, Progress,
 * etc.) get clipped at the HubContainer height cap with no way to reach
 * content below the fold — that was the "Workout History tab unscrollable"
 * bug at normal browser zoom.
 */
const DetailScrollWrap = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }
`;

const ClientGridCard = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 80px;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const GridAvatar = styled.div<{ $source?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $source }) =>
    $source === 'move_fitness'
      ? 'linear-gradient(135deg, #C6A84B 0%, #8B5CF6 100%)'
      : 'linear-gradient(135deg, #002060 0%, #60C0F0 100%)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

const GridInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const GridName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
`;

const GridMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  margin-top: 2px;

  @media (max-width: 430px) {
    font-size: 14px;
  }
`;

const EmptyHub = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
`;

const LoadingPulse = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ClientsWorkspace: React.FC = () => {
  const { authAxios } = useAuth() as any;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
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
    setSearchParams({ clientId: String(client.id) });
  }, [setSearchParams]);

  const handleNewClient = useCallback(() => {
    navigate('/dashboard/admin/coach-assistant');
  }, [navigate]);

  const handleOpenAI = useCallback(() => {
    if (selectedClient) {
      navigate(`/dashboard/admin/coach-assistant?clientId=${selectedClient.id}`);
    } else {
      navigate('/dashboard/admin/coach-assistant');
    }
  }, [navigate, selectedClient]);

  // Phase 17 (2026-04-20): admin Log Workout CTA.
  // `ClientGridCard` is already a <button>, so the CTA lives in the top-bar
  // action area and is only shown when a client is selected. Canonical admin
  // log-workout route per UniversalDashboardLayout.tsx:541.
  const handleLogWorkout = useCallback(() => {
    if (selectedClient) {
      navigate(`/dashboard/admin/log-workout?clientId=${selectedClient.id}`);
    }
  }, [navigate, selectedClient]);

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

  const initials = (c: ClientOption) =>
    `${(c.firstName || '?')[0]}${(c.lastName || '?')[0]}`.toUpperCase();

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
            <ActionBtn onClick={handleLogWorkout} title={`Log a workout for ${selectedClient.firstName}`}>
              <Dumbbell size={16} />
              <span>Log Workout</span>
            </ActionBtn>
          )}
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
          <ActionBtn onClick={handleOpenAI} $variant="primary" title="Open Swan Coach with this client's context">
            <MessageCircle size={16} />
            <span>Swan Coach</span>
          </ActionBtn>
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
              onBack={() => {
                setSelectedClient(null);
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
              <ClientGridCard key={c.id} onClick={() => handleSelectClient(c)}>
                <GridAvatar $source={c.clientSource}>{initials(c)}</GridAvatar>
                <GridInfo>
                  <GridName>{c.firstName} {c.lastName}</GridName>
                  <GridMeta>
                    {c.clientSource === 'move_fitness' ? 'Move Fitness' : 'SwanStudios'}
                    {' · '}{c.workoutCount || 0} workouts
                    {c.availableSessions ? ` · ${c.availableSessions} sessions` : ''}
                  </GridMeta>
                </GridInfo>
              </ClientGridCard>
            ))}
          </CardGrid>
        )}
      </ContentArea>
    </HubContainer>
  );
};

export default ClientsWorkspace;
