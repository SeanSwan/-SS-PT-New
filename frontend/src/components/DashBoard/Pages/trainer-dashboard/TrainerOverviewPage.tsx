/**
 * ============================================================================
 * FILE: TrainerOverviewPage.tsx
 * PURPOSE: Trainer dashboard overview with stats, today's schedule, and quick actions
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays a trainer's at-a-glance dashboard including
 * key performance stats, today's upcoming sessions, and shortcut actions.
 * HOW IT FITS IN THE APP: Trainer Dashboard → Overview tab (default landing)
 * KEY DECISIONS: Dark-first Crystalline Swan theme, CSS custom properties for theme compat
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TrainerOverviewPage                               ║
 * ║  PURPOSE: At-a-glance trainer dashboard with stats + schedule ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Trainer Overview                                           │
 * ├────────┬────────┬────────┬────────┐                        │
 * │ Active │ Today  │ Hours  │ Compl  │  ← StatCards           │
 * │Clients │Sessions│  Week  │  Rate  │                        │
 * └────────┴────────┴────────┴────────┘                        │
 * ┌──────────────────────────┬─────────────────────────────────┤
 * │ Today's Sessions         │ Quick Actions                   │
 * │ ┌──────────────────────┐ │ [View Clients] [Schedule]       │
 * │ │ 9:00 AM — Client A   │ │ [Workout Forge] [Videos]        │
 * │ │ 10:30 AM — Client B  │ │                                 │
 * │ └──────────────────────┘ │                                 │
 * └──────────────────────────┴─────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  None (page-level component)
 * State:     { sessions, stats, loading }
 * API Calls: GET /api/sessions?trainerId=me&date=today
 * Events:    Quick action clicks → navigate to other tabs
 * Children:  StatCard (×4), SessionList, QuickActionGrid
 *
 * CLICK-OUTCOMES:
 * [StatCard]        → Visual only (no click action)
 * [Session row]     → Navigate to session detail (future)
 * [Quick Action]    → Navigate to respective dashboard tab
 *
 * GAMIFICATION: None — trainer view, no direct XP triggers
 */
import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Clock, CheckCircle, Dumbbell, Eye, Calendar } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { AICommandBar } from '../../../Shared/AICommandBar';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface Session {
  id: number;
  clientName?: string;
  client?: { firstName?: string; lastName?: string };
  startTime?: string;
  endTime?: string;
  status?: string;
  type?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

const WelcomeHeader = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 24px;
  color: var(--text-heading, #E0ECF4);
`;

const AccentSpan = styled.span`
  color: var(--accent-primary, #60C0F0);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, #003080);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(96, 192, 240, 0.08);
`;

const IconCircle = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color || 'rgba(96, 192, 240, 0.15)'};
  flex-shrink: 0;
`;

const StatInfo = styled.div``;
const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #E0ECF4);
`;
const StatLabel = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  letter-spacing: 0.02em;
  margin-top: 2px;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text-heading, #E0ECF4);
`;

const ScheduleCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
`;

const SessionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  &:last-child { border-bottom: none; }
`;

const SessionInfo = styled.div``;
const SessionClient = styled.div`font-weight: 600; font-size: 0.95rem;`;
const SessionTime = styled.div`font-size: 0.8rem; color: var(--text-muted, rgba(224,236,244,0.5));`;

const StatusBadge = styled.span<{ $status?: string }>`
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 99px;
  background: ${({ $status }) =>
    $status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(96,192,240,0.15)'};
  color: ${({ $status }) =>
    $status === 'completed' ? '#22c55e' : 'var(--accent-primary, #60C0F0)'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-muted, rgba(224,236,244,0.5));
  font-size: 0.9rem;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px 20px;
  border: 1px solid var(--border-soft, #003080);
  border-radius: 10px;
  background: var(--bg-elevated, #002060);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  will-change: transform, box-shadow;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    color: #60C0F0;
    transition: color 0.3s ease;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    background: var(--bg-surface, #003080);
    border-color: #8B5CF6;
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.6),
                0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);
  }

  &:hover svg,
  &:focus-visible svg {
    color: #E0ECF4;
  }

  &:active {
    transform: translateY(0);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TrainerOverviewPage: React.FC = () => {
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        setFetchError(null);
        const today = new Date().toISOString().split('T')[0];
        const res = await authAxios.get(`/api/sessions?date=${today}`);
        setSessions(Array.isArray(res.data) ? res.data : res.data?.sessions || []);
      } catch {
        setFetchError('Failed to load today\'s schedule. Please refresh or check your connection.');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchToday();
  }, [authAxios]);

  const getClientName = (s: Session): string => {
    if (s.client?.firstName) {
      return `${s.client.firstName}${s.client.lastName ? ' ' + s.client.lastName : ''}`;
    }
    return s.clientName || 'Unassigned';
  };

  const stats = useMemo(() => ({
    totalClients: sessions.length > 0
      ? new Set(sessions.map(s => getClientName(s))).size
      : 0,
    sessionsThisWeek: sessions.length,
    hoursLogged: sessions.reduce((sum, s) => {
      if (!s.startTime || !s.endTime) return sum;
      return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
    }, 0),
    completionRate: sessions.length
      ? Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100)
      : 0
  }), [sessions]);

  const trainerName = user?.firstName || user?.username || 'Trainer';

  return (
    <PageWrapper>
      {/* SwanStudios Coach's Assistant — embedded at top */}
      <AICommandBar context="workout_generation" />

      <WelcomeHeader>
        Welcome back, <AccentSpan>{trainerName}</AccentSpan>
      </WelcomeHeader>

      <StatsGrid>
        <StatCard>
          <IconCircle><Users size={22} color="#60C0F0" /></IconCircle>
          <StatInfo><StatValue>{stats.totalClients}</StatValue><StatLabel>Clients Today</StatLabel></StatInfo>
        </StatCard>
        <StatCard>
          <IconCircle $color="rgba(139,92,246,0.15)"><CalendarDays size={22} color="#8B5CF6" /></IconCircle>
          <StatInfo><StatValue>{stats.sessionsThisWeek}</StatValue><StatLabel>Today's Sessions</StatLabel></StatInfo>
        </StatCard>
        <StatCard>
          <IconCircle $color="rgba(198,168,75,0.15)"><Clock size={22} color="#C6A84B" /></IconCircle>
          <StatInfo><StatValue>{stats.hoursLogged.toFixed(1)}</StatValue><StatLabel>Hours Logged</StatLabel></StatInfo>
        </StatCard>
        <StatCard>
          <IconCircle $color="rgba(34,197,94,0.15)"><CheckCircle size={22} color="#22c55e" /></IconCircle>
          <StatInfo><StatValue>{stats.completionRate}%</StatValue><StatLabel>Completion Rate</StatLabel></StatInfo>
        </StatCard>
      </StatsGrid>

      <SectionTitle>Today's Schedule</SectionTitle>
      <ScheduleCard>
        {loading ? (
          <EmptyState>Loading sessions...</EmptyState>
        ) : fetchError ? (
          <EmptyState>{fetchError}</EmptyState>
        ) : sessions.length === 0 ? (
          <EmptyState>No sessions scheduled for today. Enjoy the break!</EmptyState>
        ) : (
          sessions.slice(0, 6).map(s => (
            <SessionRow key={s.id}>
              <SessionInfo>
                <SessionClient>{getClientName(s)}</SessionClient>
                <SessionTime>{s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</SessionTime>
              </SessionInfo>
              <StatusBadge $status={s.status}>{s.status || 'upcoming'}</StatusBadge>
            </SessionRow>
          ))
        )}
      </ScheduleCard>

      <SectionTitle>Quick Actions</SectionTitle>
      <ActionsGrid>
        <ActionButton onClick={() => navigate('/dashboard/trainer/log-workout')}>
          <Dumbbell size={20} /> Log Workout
        </ActionButton>
        <ActionButton onClick={() => navigate('/dashboard/trainer/clients')}>
          <Eye size={20} /> View Clients
        </ActionButton>
        <ActionButton onClick={() => navigate('/dashboard/trainer/schedule')}>
          <Calendar size={20} /> Check Schedule
        </ActionButton>
      </ActionsGrid>
    </PageWrapper>
  );
};

export default TrainerOverviewPage;
