/**
 * ============================================================================
 * FILE: MasterDetailLayout.tsx
 * PURPOSE: Master-Detail layout container for Clients & Team workspace
 * AUTHOR: Claude Opus 4.6 + Gemini 3.1 Pro | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the master-detail split layout with 4-pillar
 * navigation, collapsible master pane, client list, and detail view.
 * The "Roster" pillar shows the client list; other pillars show sub-tab
 * navigation that drives React Router Outlet content.
 *
 * HOW IT FITS IN THE APP: Replaces flat 11-tab WorkspaceContainer pattern.
 * ClientsWorkspace → MasterDetailLayout → ClientMiniCard + DetailPane(Outlet)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Users, TrendingUp, Building2, MessageSquare,
  Search, SlidersHorizontal, PanelLeftClose, PanelLeftOpen,
  ClipboardList, UserPlus, FileSignature, Target,
  UserCheck, Shield,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { logger } from '@/utils/logger';
import ClientMiniCard, { type MiniCardClient } from './ClientMiniCard';
import ClientDetailView from './ClientDetailView';
import {
  MasterDetailContainer,
  MasterPane,
  DetailPane,
  MasterHeader,
  CollapseButton,
  MicroStats,
  StatBlock,
  AttentionStat,
  SearchRow,
  SearchInput,
  FilterButton,
  PillarNav,
  PillarButton,
  ClientList,
  PillarContentArea,
  PillarSubTab,
  EmptyStateContainer,
  EmptyStateTitle,
  EmptyStateSubtext,
} from './MasterDetailStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────

type Pillar = 'roster' | 'growth' | 'studio' | 'comms';

interface PillarConfig {
  id: Pillar;
  label: string;
  icon: React.ReactNode;
}

const PILLARS: PillarConfig[] = [
  { id: 'roster', label: 'Roster', icon: <Users size={16} /> },
  { id: 'growth', label: 'Growth', icon: <TrendingUp size={16} /> },
  { id: 'studio', label: 'Studio', icon: <Building2 size={16} /> },
  { id: 'comms', label: 'Comms', icon: <MessageSquare size={16} /> },
];

// Sub-tabs for non-roster pillars — these map to existing routes
const PILLAR_TABS: Record<Exclude<Pillar, 'roster'>, { label: string; icon: React.ReactNode; path: string }[]> = {
  growth: [
    { label: 'Leads CRM', icon: <Target size={16} />, path: '/dashboard/people/leads' },
    { label: 'Onboarding', icon: <UserPlus size={16} />, path: '/dashboard/people/onboarding' },
    { label: 'Waivers', icon: <FileSignature size={16} />, path: '/dashboard/people/waivers' },
    { label: 'Orientation Queue', icon: <ClipboardList size={16} />, path: '/dashboard/people/orientations' },
  ],
  studio: [
    { label: 'Trainers', icon: <UserCheck size={16} />, path: '/dashboard/people/trainers' },
    { label: 'Users', icon: <Shield size={16} />, path: '/dashboard/people/users' },
  ],
  comms: [
    { label: 'Messages', icon: <MessageSquare size={16} />, path: '/dashboard/people/messages' },
  ],
};

// Routes that should show the Outlet (non-roster pillar content) instead of client detail
const OUTLET_ROUTES = [
  '/dashboard/people/leads',
  '/dashboard/people/onboarding',
  '/dashboard/people/waivers',
  '/dashboard/people/orientations',
  '/dashboard/people/trainers',
  '/dashboard/people/users',
  '/dashboard/people/messages',
  '/dashboard/people/progress',
  '/dashboard/people/assignments',
  '/dashboard/people/measurements',
  '/dashboard/people/sms-logs',
  '/dashboard/people/nasm',
  '/dashboard/people/social',
  '/dashboard/people/movement-screen',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const MasterDetailLayout: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePillar, setActivePillar] = useState<Pillar>('roster');
  const [clients, setClients] = useState<MiniCardClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Determine if current route is an outlet route (non-client-detail content)
  const isOutletRoute = useMemo(() => {
    return OUTLET_ROUTES.some(route =>
      location.pathname === route || location.pathname.startsWith(route + '/')
    );
  }, [location.pathname]);

  // Auto-detect pillar from current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/leads') || path.includes('/onboarding') || path.includes('/waivers') || path.includes('/orientations')) {
      setActivePillar('growth');
    } else if (path.includes('/trainers') || path.includes('/users')) {
      setActivePillar('studio');
    } else if (path.includes('/messages')) {
      setActivePillar('comms');
    } else {
      setActivePillar('roster');
    }
  }, [location.pathname]);

  // Fetch clients for roster
  useEffect(() => {
    if (!authAxios) return;
    const fetchClients = async () => {
      try {
        setLoading(true);
        const response = await authAxios.get('/api/admin/clients', {
          params: { limit: 100, includeStats: true, includeRevenue: true, includeSubscription: true },
        });
        if (response.data.success) {
          const mapped: MiniCardClient[] = (response.data.data?.clients || []).map((c: any) => ({
            id: c.id,
            firstName: c.firstName || '',
            lastName: c.lastName || '',
            email: c.email || '',
            status: c.isActive ? 'active' as const : 'inactive' as const,
            tier: c.availableSessions > 20 ? 'elite' : c.availableSessions > 0 ? 'premium' : 'starter',
            engagementScore: Math.min(100, Math.round(
              ((c.totalWorkouts || 0) * 5 + (c.clientSessions?.length || 0) * 10) / 2
            )),
            lastWeighIn: c.lastMeasurement || null,
            sessionsLeft: c.availableSessions || 0,
            workoutCount: c.totalWorkouts || 0,
          }));
          setClients(mapped);
        }
      } catch (err) {
        logger.warn('Failed to fetch clients for master pane:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [authAxios]);

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const needsAttention = clients.filter(c => (c.engagementScore || 0) < 20).length;
    return { total, active, needsAttention };
  }, [clients]);

  // Selected client object
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Handlers
  const handleSelectClient = useCallback((clientId: number | string) => {
    setSelectedClientId(clientId);
    setMobileDetailOpen(true);
    // Navigate to the base clients route when selecting a client
    if (location.pathname !== '/dashboard/people') {
      navigate('/dashboard/people');
    }
  }, [navigate, location.pathname]);

  const handleBack = useCallback(() => {
    setSelectedClientId(null);
    setMobileDetailOpen(false);
  }, []);

  const handlePillarChange = useCallback((pillar: Pillar) => {
    setActivePillar(pillar);
    if (pillar === 'roster') {
      navigate('/dashboard/people');
    } else {
      const tabs = PILLAR_TABS[pillar];
      if (tabs && tabs.length > 0) {
        navigate(tabs[0].path);
      }
    }
    // Deselect client when switching pillars
    setSelectedClientId(null);
    setMobileDetailOpen(false);
  }, [navigate]);

  const handleMessage = useCallback((clientId: number | string) => {
    navigate('/dashboard/people/messages');
  }, [navigate]);

  const handleLogWorkout = useCallback((clientId: number | string) => {
    // This will be wired to the workout logger modal
    setSelectedClientId(clientId);
    setMobileDetailOpen(true);
  }, []);

  const handleViewWorkouts = useCallback((clientId: number | string) => {
    setSelectedClientId(clientId);
    setMobileDetailOpen(true);
  }, []);

  const handleWeighIn = useCallback((clientId: number | string) => {
    setSelectedClientId(clientId);
    setMobileDetailOpen(true);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        const input = document.querySelector('[data-search-input]') as HTMLInputElement;
        input?.focus();
        return;
      }

      // Escape to deselect
      if (e.key === 'Escape' && selectedClientId) {
        handleBack();
        return;
      }

      // Arrow navigation in roster
      if (activePillar === 'roster' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const currentIdx = filteredClients.findIndex(c => c.id === selectedClientId);
        let nextIdx: number;
        if (e.key === 'ArrowDown') {
          nextIdx = currentIdx < filteredClients.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : filteredClients.length - 1;
        }
        if (filteredClients[nextIdx]) {
          handleSelectClient(filteredClients[nextIdx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClientId, activePillar, filteredClients, handleBack, handleSelectClient]);

  // ─── Render ────────────────────────────────────────────

  return (
    <MasterDetailContainer>
      {/* LEFT: Master Pane */}
      <MasterPane $isCollapsed={isCollapsed}>
        <MasterHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : 12 }}>
            {!isCollapsed && (
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary, #E0ECF4)',
                margin: 0,
              }}>
                Clients & Team
              </h2>
            )}
            <CollapseButton
              onClick={() => setIsCollapsed(prev => !prev)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </CollapseButton>
          </div>

          {!isCollapsed && (
            <>
              {/* 4-Pillar Navigation */}
              <PillarNav aria-label="Workspace pillars">
                {PILLARS.map((p) => (
                  <PillarButton
                    key={p.id}
                    $active={activePillar === p.id}
                    onClick={() => handlePillarChange(p.id)}
                    aria-pressed={activePillar === p.id}
                    title={p.label}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </PillarButton>
                ))}
              </PillarNav>

              {/* Micro-stats (Roster only) */}
              {activePillar === 'roster' && (
                <>
                  <MicroStats>
                    <StatBlock>
                      <span>Total</span>
                      <strong>{stats.total}</strong>
                    </StatBlock>
                    <StatBlock>
                      <span>Active</span>
                      <strong>{stats.active}</strong>
                    </StatBlock>
                    <AttentionStat>
                      <span>Attention</span>
                      <strong>{stats.needsAttention}</strong>
                    </AttentionStat>
                  </MicroStats>

                  <SearchRow>
                    <SearchInput>
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-search-input
                        aria-label="Search clients"
                      />
                    </SearchInput>
                    <FilterButton title="Filter clients" aria-label="Filter clients">
                      <SlidersHorizontal size={16} />
                    </FilterButton>
                  </SearchRow>
                </>
              )}
            </>
          )}
        </MasterHeader>

        {/* List Content */}
        {!isCollapsed && activePillar === 'roster' && (
          <ClientList>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary, #4070C0)', fontFamily: "'Sora', sans-serif", fontSize: '13px' }}>
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary, #4070C0)', fontFamily: "'Sora', sans-serif", fontSize: '13px' }}>
                {searchTerm ? 'No clients match your search' : 'No clients found'}
              </div>
            ) : (
              filteredClients.map((client, idx) => (
                <ClientMiniCard
                  key={client.id}
                  client={client}
                  isSelected={selectedClientId === client.id}
                  index={idx}
                  onSelect={handleSelectClient}
                  onMessage={handleMessage}
                  onLogWorkout={handleLogWorkout}
                  onViewWorkouts={handleViewWorkouts}
                  onWeighIn={handleWeighIn}
                />
              ))
            )}
          </ClientList>
        )}

        {/* Non-roster pillar sub-tabs */}
        {!isCollapsed && activePillar !== 'roster' && (
          <PillarContentArea>
            {PILLAR_TABS[activePillar]?.map((tab) => (
              <PillarSubTab
                key={tab.path}
                $active={location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')}
                onClick={() => navigate(tab.path)}
              >
                {tab.icon}
                {tab.label}
              </PillarSubTab>
            ))}
          </PillarContentArea>
        )}

        {/* Collapsed state: show avatars only */}
        {isCollapsed && activePillar === 'roster' && (
          <ClientList style={{ padding: '8px 0', alignItems: 'center' }}>
            {filteredClients.slice(0, 10).map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client.id)}
                title={`${client.firstName} ${client.lastName}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: selectedClientId === client.id ? '2px solid #8B5CF6' : '2px solid transparent',
                  background: 'linear-gradient(135deg, #002060, #003080)',
                  color: '#E0ECF4',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  margin: '4px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms ease',
                }}
              >
                {`${(client.firstName || '?')[0]}${(client.lastName || '?')[0]}`.toUpperCase()}
              </button>
            ))}
          </ClientList>
        )}
      </MasterPane>

      {/* RIGHT: Detail Pane */}
      <DetailPane $isOpenOnMobile={mobileDetailOpen || isOutletRoute}>
        {isOutletRoute ? (
          // Show router Outlet for non-roster pillar pages
          <div style={{ padding: '24px' }}>
            <Outlet />
          </div>
        ) : selectedClient ? (
          // Show client detail view
          <ClientDetailView
            client={selectedClient}
            onBack={handleBack}
          />
        ) : (
          // Empty state: Apex Command Center
          <EmptyStateContainer>
            <EmptyStateTitle>Command your day, Trainer.</EmptyStateTitle>
            <EmptyStateSubtext>
              Select a client from the roster to view their training history,
              biometrics, and progress. Use the quick actions to log workouts
              or record measurements.
            </EmptyStateSubtext>
            <div style={{ marginTop: '32px', display: 'flex', gap: '24px' }}>
              <StatBlock>
                <span>Today&apos;s Sessions</span>
                <strong>0</strong>
              </StatBlock>
              <StatBlock>
                <span>Overdue Check-ins</span>
                <strong style={{ color: '#C6A84B' }}>{stats.needsAttention}</strong>
              </StatBlock>
              <StatBlock>
                <span>Active Clients</span>
                <strong>{stats.active}</strong>
              </StatBlock>
            </div>
          </EmptyStateContainer>
        )}
      </DetailPane>
    </MasterDetailContainer>
  );
};

export default MasterDetailLayout;
