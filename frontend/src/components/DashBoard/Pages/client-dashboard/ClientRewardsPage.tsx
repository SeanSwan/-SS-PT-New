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
 * State:     useGamificationData profile cache
 * API Calls: GET /api/v1/gamification/profile via shared hook
 * Children:  none
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Award, Star, TrendingUp, Shield, Crown, Gem } from 'lucide-react';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Bronze Forge', min: 1, max: 10, color: 'var(--accent-secondary, #C6A84B)' },
  { name: 'Silver Edge', min: 11, max: 25, color: 'var(--text-secondary, #94a3b8)' },
  { name: 'Titanium Core', min: 26, max: 50, color: 'var(--accent-tertiary, #4070C0)' },
  { name: 'Obsidian Warrior', min: 51, max: 99, color: 'var(--bg-base, #0A0A0F)' },
  { name: 'Crystalline Swan', min: 100, max: Infinity, color: 'var(--accent-primary, #60C0F0)' },
];

const getTierForLevel = (level: number) =>
  TIERS.find(t => level >= t.min && level <= t.max) || TIERS[0];

const BORDER_SOFT = 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent))';
const BORDER_FAINT = 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent))';
const BORDER_HAIRLINE = 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent))';
const BORDER_DASHED = 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent))';
const SHIMMER_HIGHLIGHT = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)';

interface AchievementRecord {
  id?: string | number;
  achievement?: {
    tier?: string;
    rarity?: string;
    name?: string;
    description?: string;
  };
  name?: string;
  title?: string;
  description?: string;
}

interface PointTransaction {
  id: string | number;
  description?: string;
  source?: string;
  transactionType?: string;
  points?: number;
}

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
  border: 1px solid ${BORDER_SOFT};
  border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem;
`;

const TierRow = styled.div`
  display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const TierBadge = styled.div<{ $color: string }>`
  width: 48px; height: 48px; border-radius: 12px;
  background: color-mix(in srgb, ${({ $color }) => $color} 18%, transparent);
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
  border: 1px solid ${BORDER_FAINT};
  border-radius: 12px; padding: 1.25rem;
  h3 { margin: 0 0 0.75rem; font-size: 1rem; font-family: 'Plus Jakarta Sans', sans-serif;
       display: flex; align-items: center; gap: 0.5rem; }
`;

const AchievementItem = styled.div`
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${BORDER_HAIRLINE};
  &:last-child { border-bottom: none; }
  font-size: 0.875rem;
`;

const BadgeIcon = styled.div<{ $rarity?: string }>`
  width: 36px; height: 36px; border-radius: 8px;
  background: ${({ $rarity }) =>
    $rarity === 'epic' ? 'color-mix(in srgb, var(--accent-tertiary, #8B5CF6) 16%, transparent)' :
    $rarity === 'rare' ? 'color-mix(in srgb, var(--accent-secondary, #C6A84B) 16%, transparent)' :
    'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

const AchievementDescription = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
`;

const EmptyState = styled.p`
  color: var(--text-muted, #94a3b8); font-size: 0.875rem;
  text-align: center; padding: 1.5rem 0;
`;

const TransactionPoints = styled.span<{ $kind?: string }>`
  margin-left: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: ${({ $kind }) =>
    $kind === 'spend'
      ? 'var(--warning-accent, #F59E0B)'
      : 'var(--accent-primary, #60C0F0)'};
`;

const BadgeGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`;

const BadgePlaceholder = styled.div`
  aspect-ratio: 1; border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px dashed ${BORDER_DASHED};
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.375rem; font-size: 0.75rem; color: var(--text-muted, #94a3b8);
`;

const ShimmerBlock = styled.div<{ $height?: string; $bottom?: string }>`
  height: ${({ $height }) => $height || '80px'};
  margin-bottom: ${({ $bottom }) => $bottom || 0};
  border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, ${SHIMMER_HIGHLIGHT} 50%, var(--bg-elevated, #141419) 75%);
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
  const gamification = useGamificationData();
  const gamData = gamification.profile.data;
  const error = gamification.profile.error || gamification.error;

  if (gamification.isLoading || gamification.profile.isLoading) {
    return <PageWrap><ShimmerBlock $bottom="12px" /><ShimmerBlock $height="200px" /></PageWrap>;
  }

  const level = gamData?.level || 1;
  const xp = gamData?.points || 0;
  const nextLevelXp = Math.ceil(((level + 1) / 0.1) ** 2);
  const currentLevelXp = Math.ceil((level / 0.1) ** 2);
  const pct = gamData?.nextLevelProgress ?? (
    nextLevelXp > currentLevelXp
      ? Math.max(0, Math.min(100, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100))
      : 0
  );
  const tier = getTierForLevel(level);
  const achievements = gamData?.achievements || [];
  const transactions = gamData?.recentTransactions || [];

  return (
    <PageWrap>
      {error && <ErrorBox>{(error as Error).message || 'Failed to load rewards data'}</ErrorBox>}

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
            : (achievements as AchievementRecord[]).slice(0, 5).map((a, i) => (
              <AchievementItem key={a.id || i}>
                <BadgeIcon $rarity={a.achievement?.tier || a.achievement?.rarity}><Star size={16} /></BadgeIcon>
                <div><div>{a.achievement?.name || a.name || a.title || 'Achievement'}</div>
                <AchievementDescription>{a.achievement?.description || a.description || ''}</AchievementDescription></div>
              </AchievementItem>
            ))
          }
        </SectionCard>
        <SectionCard>
          <h3><TrendingUp size={18} /> Point History</h3>
          {transactions.length === 0
            ? <EmptyState>Point history will appear here as you earn XP from workouts, social posts, and streaks.</EmptyState>
            : (transactions as PointTransaction[]).slice(0, 5).map((tx) => (
              <AchievementItem key={tx.id}>
                <BadgeIcon><TrendingUp size={16} /></BadgeIcon>
                <div>
                  <div>{tx.description || tx.source || 'Point activity'}</div>
                  <AchievementDescription>{tx.source || 'gamification'}</AchievementDescription>
                </div>
                <TransactionPoints $kind={tx.transactionType}>
                  {tx.transactionType === 'spend' ? '-' : '+'}{Number(tx.points || 0).toLocaleString()} XP
                </TransactionPoints>
              </AchievementItem>
            ))
          }
        </SectionCard>
      </TwoCol>

      <SectionCard>
        <h3><Gem size={18} /> Badge Showcase</h3>
        {achievements.length === 0
          ? <EmptyState>Earned badges will appear here after achievements are completed.</EmptyState>
          : (
            <BadgeGrid>
              {(achievements as AchievementRecord[]).slice(0, 6).map((a, i) => (
                <BadgePlaceholder key={a.id || i} title={a.achievement?.name || a.name || 'Achievement'}>
                  <Shield size={24} /><span>Earned</span>
                </BadgePlaceholder>
              ))}
            </BadgeGrid>
          )}
      </SectionCard>
    </PageWrap>
  );
};

export default ClientRewardsPage;
