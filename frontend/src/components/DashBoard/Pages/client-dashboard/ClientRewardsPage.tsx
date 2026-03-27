/**
 * ============================================================================
 * FILE: ClientRewardsPage.tsx
 * PURPOSE: Rewards, achievements, and tier progression display for clients
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows the client's current tier, XP progress, recent
 * achievements, point history, and badge showcase grid.
 * HOW IT FITS IN THE APP: ClientDashboard → ClientRewardsPage (Rewards tab)
 * KEY DECISIONS: Tier thresholds match gamification spec in CLAUDE.md.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientRewardsPage                                 ║
 * ║  PURPOSE: Gamification rewards and achievements view          ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Current Tier: [TierName]  Level X   ████████░░ XP bar     │
 * ├────────────────────────────────────────────────────────────┤
 * │ Recent Achievements        │ Point History                 │
 * │ [badge] [badge] [badge]    │ +50 Workout  +15 Social...   │
 * ├────────────────────────────────────────────────────────────┤
 * │ Badge Showcase (3-col grid of earned badges)               │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { gamData, loading, error }
 * API Calls: GET /api/v1/gamification/dashboard
 * Children:  none
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Award, Star, TrendingUp, Shield, Crown, Gem } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Bronze Forge', min: 1, max: 10, color: '#CD7F32' },
  { name: 'Silver Edge', min: 11, max: 25, color: '#C0C0C0' },
  { name: 'Titanium Core', min: 26, max: 50, color: '#878681' },
  { name: 'Obsidian Warrior', min: 51, max: 99, color: '#0A0A0F' },
  { name: 'Crystalline Swan', min: 100, max: Infinity, color: '#60C0F0' },
];

const getTierForLevel = (level: number) =>
  TIERS.find(t => level >= t.min && level <= t.max) || TIERS[0];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const PageWrap = styled.div`
  padding: 1.5rem; min-height: 100%; color: var(--text-primary, #E0ECF4);
`;

const TierCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem;
`;

const TierRow = styled.div`
  display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const TierBadge = styled.div<{ $color: string }>`
  width: 48px; height: 48px; border-radius: 12px;
  background: ${({ $color }) => $color}22;
  border: 2px solid ${({ $color }) => $color};
  display: flex; align-items: center; justify-content: center;
  color: ${({ $color }) => $color};
`;

const TierInfo = styled.div`
  flex: 1;
  h2 { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; }
  p { margin: 0.125rem 0 0; color: var(--text-secondary, #94a3b8); font-size: 0.8125rem; }
`;

const ProgressBarOuter = styled.div`
  width: 100%; height: 12px; border-radius: 6px;
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
`;

const ProgressBarInner = styled.div<{ $pct: number; $color: string }>`
  height: 100%; border-radius: 6px;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  transition: width 0.6s ease;
`;

const XpLabel = styled.div`
  display: flex; justify-content: space-between; font-size: 0.75rem;
  color: var(--text-muted, #94a3b8); margin-top: 0.375rem;
  font-family: 'Fira Code', monospace;
`;

const TwoCol = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const SectionCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px; padding: 1.25rem;
  h3 { margin: 0 0 0.75rem; font-size: 1rem; font-family: 'Plus Jakarta Sans', sans-serif;
       display: flex; align-items: center; gap: 0.5rem; }
`;

const AchievementItem = styled.div`
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
  font-size: 0.875rem;
`;

const BadgeIcon = styled.div<{ $rarity?: string }>`
  width: 36px; height: 36px; border-radius: 8px;
  background: ${({ $rarity }) =>
    $rarity === 'epic' ? 'rgba(139,92,246,0.15)' :
    $rarity === 'rare' ? 'rgba(198,168,75,0.15)' :
    'rgba(96,192,240,0.1)'};
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

const EmptyState = styled.p`
  color: var(--text-muted, #94a3b8); font-size: 0.875rem;
  text-align: center; padding: 1.5rem 0;
`;

const BadgeGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`;

const BadgePlaceholder = styled.div`
  aspect-ratio: 1; border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.15));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.375rem; font-size: 0.75rem; color: var(--text-muted, #94a3b8);
`;

const ShimmerBlock = styled.div`
  height: 80px; border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.06) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%; animation: ${shimmer} 1.5s infinite;
`;

const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419); border-left: 4px solid var(--error-accent, #C92A54);
  border-radius: 8px; padding: 1rem; margin-bottom: 1rem;
  color: var(--text-primary, #E0ECF4); font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientRewardsPage: React.FC = () => {
  const { authAxios } = useAuth();
  const [gamData, setGamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authAxios) return;
      try {
        const res = await authAxios.get('/api/v1/gamification/dashboard');
        setGamData(res.data?.data || res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load rewards data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authAxios]);

  if (loading) {
    return <PageWrap><ShimmerBlock style={{ marginBottom: 12 }} /><ShimmerBlock style={{ height: 200 }} /></PageWrap>;
  }

  const level = gamData?.level || gamData?.currentLevel || 1;
  const xp = gamData?.totalPoints || gamData?.xp || 0;
  const nextLevelXp = Math.ceil(((level + 1) / 0.1) ** 2);
  const currentLevelXp = Math.ceil((level / 0.1) ** 2);
  // Clamp 0-100 to prevent negative progress bar at level 1 with 0 XP
  const pct = nextLevelXp > currentLevelXp
    ? Math.max(0, Math.min(100, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))
    : 0;
  const tier = getTierForLevel(level);
  const achievements = gamData?.recentAchievements || gamData?.achievements || [];

  return (
    <PageWrap>
      {error && <ErrorBox>{error}</ErrorBox>}

      <TierCard>
        <TierRow>
          <TierBadge $color={tier.color}><Crown size={22} /></TierBadge>
          <TierInfo>
            <h2>{tier.name}</h2>
            <p>Level {level} {tier.max < Infinity ? `(${tier.min}-${tier.max})` : '(100+)'}</p>
          </TierInfo>
        </TierRow>
        <ProgressBarOuter><ProgressBarInner $pct={pct} $color={tier.color} /></ProgressBarOuter>
        <XpLabel><span>{xp.toLocaleString()} XP</span><span>{nextLevelXp.toLocaleString()} XP</span></XpLabel>
      </TierCard>

      <TwoCol>
        <SectionCard>
          <h3><Award size={18} /> Recent Achievements</h3>
          {achievements.length === 0
            ? <EmptyState>Complete workouts and challenges to earn achievements!</EmptyState>
            : achievements.slice(0, 5).map((a: any, i: number) => (
              <AchievementItem key={a.id || i}>
                <BadgeIcon $rarity={a.rarity}><Star size={16} /></BadgeIcon>
                <div><div>{a.name || a.title || 'Achievement'}</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{a.description || ''}</span></div>
              </AchievementItem>
            ))
          }
        </SectionCard>
        <SectionCard>
          <h3><TrendingUp size={18} /> Point History</h3>
          <EmptyState>Point history will appear here as you earn XP from workouts, social posts, and streaks.</EmptyState>
        </SectionCard>
      </TwoCol>

      <SectionCard>
        <h3><Gem size={18} /> Badge Showcase</h3>
        <BadgeGrid>
          {[1,2,3,4,5,6].map(i => (
            <BadgePlaceholder key={i}><Shield size={24} /><span>Locked</span></BadgePlaceholder>
          ))}
        </BadgeGrid>
      </SectionCard>
    </PageWrap>
  );
};

export default ClientRewardsPage;
