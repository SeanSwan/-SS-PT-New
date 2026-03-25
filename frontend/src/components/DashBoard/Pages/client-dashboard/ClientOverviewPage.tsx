/**
 * ============================================================================
 * FILE: ClientOverviewPage.tsx
 * PURPOSE: Client fitness dashboard overview with stats, actions, and activity
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the client's main dashboard overview showing
 * their gamification stats, quick actions, recent activity, and next session.
 * HOW IT FITS IN THE APP: ClientDashboard → ClientOverviewPage (default tab)
 * KEY DECISIONS: Dark-first design with CSS variables for theme compatibility.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientOverviewPage                                ║
 * ║  PURPOSE: Client dashboard overview with stats and actions    ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Welcome, [Name]! Level X — [Tier]                          │
 * ├────────┬────────┬────────┬────────────────────────────────┤
 * │Workouts│ Streak │ Level  │ XP to Next                     │
 * ├────────┴────────┴────────┴────────────────────────────────┤
 * │ [Book Session] [View Progress] [Log Workout]               │
 * ├──────────────────────────┬─────────────────────────────────┤
 * │ Recent Activity          │ Next Session                    │
 * └──────────────────────────┴─────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { gamData, recentWorkouts, loading, error }
 * API Calls: GET /api/gamification/dashboard, GET /api/workout/sessions?limit=5
 * Children:  none (self-contained)
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Activity, Flame, Trophy, Zap, Calendar, TrendingUp, Dumbbell, Loader } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
`;

const WelcomeHeader = styled.div`
  margin-bottom: 1.5rem;
  h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.75rem; margin: 0 0 0.25rem; }
  p { color: var(--text-secondary, #94a3b8); font-size: 0.875rem; margin: 0; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: border-color 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const IconBox = styled.div<{ $color?: string }>`
  width: 44px; height: 44px; min-width: 44px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $color }) => $color || 'rgba(96, 192, 240, 0.12)'};
  color: var(--accent-primary, #60C0F0);
`;

const StatLabel = styled.span`
  display: block; font-size: 0.75rem; color: var(--text-muted, #94a3b8);
`;

const StatValue = styled.span`
  display: block; font-size: 1.25rem; font-weight: 700; font-family: 'Fira Code', monospace;
`;

const ActionsRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem;
`;

const ActionBtn = styled.button`
  min-height: 44px; padding: 0.625rem 1.25rem;
  border-radius: 10px; border: 1px solid var(--accent-primary, #60C0F0);
  background: transparent; color: var(--accent-primary, #60C0F0);
  font-weight: 600; font-size: 0.875rem; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem;
  transition: background 0.2s, color 0.2s;
  &:hover { background: var(--accent-primary, #60C0F0); color: var(--bg-base, #030712); }
`;

const TwoCol = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const SectionCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px; padding: 1.25rem;
  h3 { margin: 0 0 1rem; font-size: 1rem; font-family: 'Plus Jakarta Sans', sans-serif; }
`;

const ActivityItem = styled.div`
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  font-size: 0.875rem;
  &:last-child { border-bottom: none; }
  span { color: var(--text-muted, #94a3b8); font-size: 0.75rem; display: block; margin-top: 0.25rem; }
`;

const EmptyState = styled.p`
  color: var(--text-muted, #94a3b8); font-size: 0.875rem; text-align: center; padding: 1.5rem 0;
`;

const ShimmerCard = styled.div`
  height: 80px; border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.06) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419);
  border-left: 4px solid var(--error-accent, #C92A54);
  border-radius: 8px; padding: 1rem; margin-bottom: 1rem;
  color: var(--text-primary, #E0ECF4); font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const TIER_NAMES: Record<number, string> = {
  1: 'Bronze Forge', 2: 'Silver Edge', 3: 'Titanium Core', 4: 'Obsidian Warrior', 5: 'Crystalline Swan'
};

const getTier = (level: number) => {
  if (level >= 100) return TIER_NAMES[5];
  if (level >= 51) return TIER_NAMES[4];
  if (level >= 26) return TIER_NAMES[3];
  if (level >= 11) return TIER_NAMES[2];
  return TIER_NAMES[1];
};

const ClientOverviewPage: React.FC = () => {
  const { user, authAxios } = useAuth();
  const [gamData, setGamData] = useState<any>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authAxios) return;
      try {
        setLoading(true);
        const [gamRes, workoutRes] = await Promise.allSettled([
          authAxios.get('/api/gamification/dashboard'),
          authAxios.get('/api/workout/sessions', { params: { limit: 5 } })
        ]);
        if (gamRes.status === 'fulfilled') setGamData(gamRes.value?.data?.data || gamRes.value?.data);
        if (workoutRes.status === 'fulfilled') setRecentWorkouts(workoutRes.value?.data?.data || workoutRes.value?.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authAxios]);

  const level = gamData?.level || gamData?.currentLevel || 1;
  const xp = gamData?.totalPoints || gamData?.xp || 0;
  const nextLevelXp = Math.ceil((((level + 1) / 0.1) ** 2));
  const streak = gamData?.currentStreak || 0;
  // Use gamification total (not capped) — recentWorkouts.length is limited by API limit param
  const totalWorkouts = typeof gamData?.totalWorkouts === 'number' ? gamData.totalWorkouts : recentWorkouts.length;

  if (loading) {
    return (
      <PageWrap>
        <ShimmerCard style={{ height: 48, marginBottom: 16 }} />
        <StatsGrid>{[1,2,3,4].map(i => <ShimmerCard key={i} />)}</StatsGrid>
        <ShimmerCard style={{ height: 200 }} />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {error && <ErrorBox>{error}</ErrorBox>}
      <WelcomeHeader>
        <h1>Welcome back, {user?.firstName || 'Athlete'}!</h1>
        <p>Level {level} — {getTier(level)}</p>
      </WelcomeHeader>

      <StatsGrid>
        <StatCard><IconBox><Activity size={20} /></IconBox><div><StatLabel>Total Workouts</StatLabel><StatValue>{totalWorkouts}</StatValue></div></StatCard>
        <StatCard><IconBox $color="rgba(139,92,246,0.12)"><Flame size={20} style={{ color: '#8B5CF6' }} /></IconBox><div><StatLabel>Current Streak</StatLabel><StatValue>{streak} days</StatValue></div></StatCard>
        <StatCard><IconBox><Trophy size={20} /></IconBox><div><StatLabel>Current Level</StatLabel><StatValue>{level}</StatValue></div></StatCard>
        <StatCard><IconBox $color="rgba(198,168,75,0.12)"><Zap size={20} style={{ color: '#C6A84B' }} /></IconBox><div><StatLabel>XP to Next Level</StatLabel><StatValue>{(nextLevelXp - xp).toLocaleString()}</StatValue></div></StatCard>
      </StatsGrid>

      <ActionsRow>
        <ActionBtn onClick={() => console.warn('TODO: navigate to booking')}><Calendar size={18} /> Book Session</ActionBtn>
        <ActionBtn onClick={() => console.warn('TODO: navigate to progress')}><TrendingUp size={18} /> View Progress</ActionBtn>
        <ActionBtn onClick={() => console.warn('TODO: navigate to workout log')}><Dumbbell size={18} /> Log Workout</ActionBtn>
      </ActionsRow>

      <TwoCol>
        <SectionCard>
          <h3>Recent Activity</h3>
          {recentWorkouts.length === 0
            ? <EmptyState>No recent workouts yet. Start training to see your activity!</EmptyState>
            : recentWorkouts.slice(0, 5).map((w: any, i: number) => (
              <ActivityItem key={w.id || i}>{w.name || w.title || `Workout Session`}<span>{w.createdAt ? new Date(w.createdAt).toLocaleDateString() : ''}</span></ActivityItem>
            ))
          }
        </SectionCard>
        <SectionCard>
          <h3>Next Session</h3>
          <EmptyState>No upcoming sessions scheduled. Book one to get started!</EmptyState>
        </SectionCard>
      </TwoCol>
    </PageWrap>
  );
};

export default ClientOverviewPage;
