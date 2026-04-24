/**
 * ┌─── SUB-COMPONENT: AdminViewAsWrapper ──────────────────────┐
 * │ PARENT: UnifiedAdminRoutes / ClientsWorkspace                │
 * │ PURPOSE: Data-fetch impersonation — admin sees a client's    │
 * │          dashboard data without JWT swap (audit-safe)         │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23         │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────────────────────┐ │
 * │ │ 🛡 Viewing as [Jackie Smith] (client) [Exit View]       │ │
 * │ ├──────────────────────────────────────────────────────────┤ │
 * │ │ [Summary Cards: Workouts | Streak | XP | Level]         │ │
 * │ ├──────────────────────────────────────────────────────────┤ │
 * │ │ [Recent Workouts]              [Upcoming Sessions]       │ │
 * │ │ ┌──────────────────┐          ┌──────────────────────┐  │ │
 * │ │ │ Mar 20 - Push... │          │ Mar 25 10:00 AM      │  │ │
 * │ │ │ Mar 18 - Pull... │          │ Mar 27 2:00 PM       │  │ │
 * │ │ └──────────────────┘          └──────────────────────┘  │ │
 * │ ├──────────────────────────────────────────────────────────┤ │
 * │ │ [Gamification: Level Badge + XP Bar + Achievements]      │ │
 * │ └──────────────────────────────────────────────────────────┘ │
 * │ Props: { userId (from URL param) }                           │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Exit View] → /dashboard/admin/client-management             │
 * │ SECURITY: Admin-only, data-fetch only, no JWT swap           │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, X, Dumbbell, Flame, Trophy, Star, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { TIER_DISPLAY, type TierName } from '../../../../../types/gamification';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
  margin-bottom: 24px;
`;

const BannerText = styled.span`
  flex: 1;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9375rem;
  strong { color: var(--accent-primary, #60C0F0); }
`;

const ExitBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(201, 42, 84, 0.4);
  background: rgba(201, 42, 84, 0.1);
  color: #E0ECF4;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(201, 42, 84, 0.2); }
`;

const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8125rem;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: var(--bg-surface, #141419);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionTitle = styled.h3`
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: var(--bg-surface, #141419);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 16px;
`;

const ListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8125rem;

  &:last-child { border-bottom: none; }
`;

const Badge = styled.span<{ $color?: string }>`
  font-size: 0.6875rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${p => p.$color ? `${p.$color}20` : 'rgba(96, 192, 240, 0.15)'};
  color: ${p => p.$color || '#60C0F0'};
  font-weight: 500;
  margin-left: auto;
`;

const XPBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
`;

const XPFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${p => Math.min(p.$pct, 100)}%;
  background: linear-gradient(90deg, #60C0F0, #8B5CF6);
  border-radius: 4px;
  transition: width 0.6s ease;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 48px;
  color: var(--text-secondary, #94a3b8);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ViewAsData {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  workouts: Array<{
    id: number;
    title: string;
    date: string;
    status: string;
    totalWeight: number;
  }>;
  sessions: Array<{
    id: number;
    date: string;
    type: string;
    status: string;
  }>;
  gamification: {
    level: number;
    totalPoints: number;
    currentStreak: number;
    tier: string;
    xpToNextLevel: number;
    xpProgress: number;
  } | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const AdminViewAsWrapper: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [data, setData] = useState<ViewAsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViewAsData = useCallback(async () => {
    if (!userId || !authAxios) return;
    setLoading(true);
    setError(null);

    try {
      // Parallel fetch: client profile + workouts + sessions + gamification
      const [profileRes, workoutsRes, sessionsRes, gamRes] = await Promise.allSettled([
        authAxios.get(`/api/admin/clients/${userId}`),
        authAxios.get(`/api/admin/clients/${userId}/workouts`, { params: { limit: 10 } }),
        authAxios.get(`/api/sessions`, { params: { userId, limit: 10, upcoming: true } }),
        // Phase 18.C.1A/1B: canonical viewAs read. Backend routes
        // `/api/v1/gamification/profile` through viewAsGuard (admin-only,
        // strict positive-integer, active-client target). The legacy
        // `/api/gamification/profile/:userId` path had no backend handler
        // and 404'd silently via Promise.allSettled, which is why this
        // panel rendered zeros for every admin view before this fix.
        authAxios.get('/api/v1/gamification/profile', { params: { viewAs: userId } }),
      ]);

      // Extract profile (required)
      if (profileRes.status !== 'fulfilled' || !profileRes.value.data) {
        throw new Error('Failed to load user profile');
      }
      const profile = profileRes.value.data.client || profileRes.value.data.user || profileRes.value.data;

      // Extract workouts (optional)
      const workouts = workoutsRes.status === 'fulfilled'
        ? (workoutsRes.value.data?.workouts || workoutsRes.value.data?.data || []).slice(0, 10)
        : [];

      // Extract sessions (optional)
      const sessions = sessionsRes.status === 'fulfilled'
        ? (sessionsRes.value.data?.sessions || sessionsRes.value.data?.data || []).slice(0, 10)
        : [];

      // Extract gamification (optional)
      let gamification = null;
      if (gamRes.status === 'fulfilled' && gamRes.value.data) {
        const g = gamRes.value.data.profile || gamRes.value.data.data || gamRes.value.data;
        const hasExplicitXpProgress = g.xpProgress != null || g.nextLevelProgress != null;
        const totalPoints = g.totalPoints ?? g.points ?? 0;
        // Backend `nextLevelPoints` is the ABSOLUTE threshold for the next
        // level (gamificationController.mjs:679), NOT remaining XP. Compute
        // remaining here so the "XP to next level" label is factually correct.
        // Clamp at 0 to avoid negative display if points somehow exceed the
        // threshold before a level recompute runs.
        const nextLevelThreshold = g.nextLevelPoints ?? g.xpToNextLevel ?? g.pointsToNextLevel;
        const xpToNextLevel = nextLevelThreshold != null
          ? Math.max(0, nextLevelThreshold - totalPoints)
          : 100;
        // Tier: backend returns a slug (e.g. 'bronze_forge') from User.tier
        // (User.mjs:295). Map through the canonical TIER_DISPLAY helper so
        // the UI shows a friendly label. Fall back to any backend-provided
        // human name, then raw value, then a safe default.
        const tierSlug = g.tier as TierName | undefined;
        const tierDisplay =
          (tierSlug && TIER_DISPLAY[tierSlug]?.name)
          ?? g.tierName
          ?? g.tier
          ?? 'Bronze Forge';
        gamification = {
          level: g.level ?? 0,
          totalPoints,
          currentStreak: g.currentStreak ?? g.streak ?? g.streakDays ?? 0,
          tier: tierDisplay,
          xpToNextLevel,
          xpProgress: g.xpProgress ?? g.nextLevelProgress ?? 0,
        };
        // Calculate XP progress percentage if not provided
        if (!hasExplicitXpProgress && gamification.xpToNextLevel > 0) {
          const pointsInLevel = gamification.totalPoints % gamification.xpToNextLevel;
          gamification.xpProgress = Math.round((pointsInLevel / gamification.xpToNextLevel) * 100);
        }
      }

      setData({
        user: {
          id: profile.id,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          role: profile.role || 'client',
        },
        workouts: workouts.map((w: any) => ({
          id: w.id,
          title: w.title || 'Workout',
          date: w.date,
          status: w.status || 'completed',
          totalWeight: w.totalWeight || 0,
        })),
        sessions: sessions.map((s: any) => ({
          id: s.id,
          date: s.date || s.scheduledAt,
          type: s.type || s.sessionType || 'Training',
          status: s.status || 'scheduled',
        })),
        gamification,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [userId, authAxios]);

  useEffect(() => { fetchViewAsData(); }, [fetchViewAsData]);

  const handleExit = () => navigate('/dashboard/admin/client-management');

  if (loading) {
    return (
      <Wrapper>
        <LoadingState>Loading user dashboard preview...</LoadingState>
      </Wrapper>
    );
  }

  if (error || !data) {
    return (
      <Wrapper>
        <EmptyState>
          {error || 'User not found'}
          <br /><br />
          <BackBtn onClick={handleExit} aria-label="Back to clients list">
            <ArrowLeft size={14} /> Back to Clients
          </BackBtn>
        </EmptyState>
      </Wrapper>
    );
  }

  const { user, workouts, sessions, gamification } = data;

  return (
    <Wrapper>
      {/* Impersonation Banner */}
      <Banner>
        <Shield size={18} color="#60C0F0" />
        <BannerText>
          Viewing as <strong>{user.firstName} {user.lastName}</strong> ({user.role})
          — This is a read-only preview of their dashboard
        </BannerText>
        <ExitBtn onClick={handleExit} aria-label="Exit impersonation view">
          <X size={14} /> Exit View
        </ExitBtn>
      </Banner>

      {/* Summary Stats */}
      <Grid>
        <StatCard>
          <StatValue>{workouts.length}</StatValue>
          <StatLabel>Recent Workouts</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{gamification?.currentStreak || 0}</StatValue>
          <StatLabel>Day Streak</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{gamification?.totalPoints?.toLocaleString() || '0'}</StatValue>
          <StatLabel>Total XP</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{gamification?.level || 1}</StatValue>
          <StatLabel>Level</StatLabel>
        </StatCard>
      </Grid>

      {/* Gamification Bar */}
      {gamification && (
        <Panel style={{ marginBottom: 24 }}>
          <SectionTitle>
            <Trophy size={16} color="#C6A84B" />
            {gamification.tier} — Level {gamification.level}
          </SectionTitle>
          <XPBar>
            <XPFill $pct={gamification.xpProgress} />
          </XPBar>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
            {gamification.xpToNextLevel.toLocaleString()} XP to next level
          </div>
        </Panel>
      )}

      {/* Two-column: Workouts + Sessions */}
      <TwoCol>
        <Panel>
          <SectionTitle><Dumbbell size={16} /> Recent Workouts</SectionTitle>
          {workouts.length === 0 ? (
            <EmptyState>No workouts logged yet</EmptyState>
          ) : (
            workouts.map(w => (
              <ListItem key={w.id}>
                <Dumbbell size={14} color="#60C0F0" />
                <div>
                  <div>{w.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                    {new Date(w.date).toLocaleDateString()}
                  </div>
                </div>
                <Badge $color={w.status === 'completed' ? '#4caf50' : '#60C0F0'}>
                  {w.status}
                </Badge>
              </ListItem>
            ))
          )}
        </Panel>

        <Panel>
          <SectionTitle><Calendar size={16} /> Upcoming Sessions</SectionTitle>
          {sessions.length === 0 ? (
            <EmptyState>No upcoming sessions</EmptyState>
          ) : (
            sessions.map(s => (
              <ListItem key={s.id}>
                <Calendar size={14} color="#8B5CF6" />
                <div>
                  <div>{s.type}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                    {new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Badge $color="#8B5CF6">{s.status}</Badge>
              </ListItem>
            ))
          )}
        </Panel>
      </TwoCol>
    </Wrapper>
  );
};

export default AdminViewAsWrapper;
