/**
 * OverviewSection.tsx — Client Dashboard Gamification Overview
 *
 * Displays the client's real gamification stats: level, tier, XP progress,
 * and recent achievements. Fetches data via useGamificationData() hook.
 *
 * Crystalline Swan palette: Midnight Sapphire → Ice Wing accents.
 */

import React from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { Award, Loader2, TrendingUp, Zap, Trophy, Target } from "lucide-react";
import { useGamificationData } from "../../hooks/gamification/useGamificationData";
import {
  getLevelProgress,
  TIER_DISPLAY,
  RARITY_COLORS,
  type TierName,
  type Rarity,
  type LevelProgress,
} from "../../types/gamification";

// ─── Crystalline Swan Tokens ───
const T = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  glassSurface: 'rgba(0, 48, 128, 0.35)',
  glassBorder: 'rgba(96, 192, 240, 0.15)',
  textMuted: 'rgba(224, 236, 244, 0.55)',
};

// ─── Animations ───
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const legendaryGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ─── Styled Components ───
const GlassCard = styled.div`
  background: ${T.glassSurface};
  backdrop-filter: blur(16px);
  border: 1px solid ${T.glassBorder};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${T.frostWhite};
  margin: 0 0 4px;
`;

const SectionSubtitle = styled.p`
  font-size: 0.82rem;
  color: ${T.textMuted};
  margin: 0 0 20px;
`;

const LevelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const LevelBadge = styled.div<{ $tier: TierName }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: ${T.frostWhite};
  background: linear-gradient(135deg, ${T.midnightSapphire}, ${T.royalDepth});
  border: 2px solid ${({ $tier }) => {
    const display = TIER_DISPLAY[$tier];
    return display?.color || T.swanLavender;
  }};
  box-shadow: 0 0 12px ${({ $tier }) => {
    const display = TIER_DISPLAY[$tier];
    return display?.color || T.swanLavender;
  }}44;
  flex-shrink: 0;
`;

const LevelInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LevelText = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${T.frostWhite};
  margin-bottom: 2px;
`;

const TierText = styled.div<{ $tier: TierName }>`
  font-size: 0.82rem;
  color: ${({ $tier }) => TIER_DISPLAY[$tier]?.color || T.textMuted};
  font-weight: 500;
  margin-bottom: 8px;
`;

const XPBarTrack = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 32, 96, 0.6);
  overflow: hidden;
  width: 100%;
`;

const XPBarFill = styled(motion.div)`
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, ${T.arcticCyan}, ${T.iceWing});
`;

const XPText = styled.div`
  font-size: 0.75rem;
  color: ${T.textMuted};
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 16px;
`;

const StatBox = styled.div`
  background: rgba(0, 32, 96, 0.3);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  border: 1px solid ${T.glassBorder};
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${T.iceWing};
`;

const StatLabel = styled.div`
  font-size: 0.72rem;
  color: ${T.textMuted};
  margin-top: 2px;
`;

const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const AchievementCard = styled(motion.div)<{ $rarity: Rarity }>`
  background: rgba(0, 32, 96, 0.3);
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  border: 1px solid ${({ $rarity }) => {
    const c = RARITY_COLORS[$rarity];
    return typeof c === 'string' && !c.includes('gradient') ? `${c}33` : `${T.swanLavender}33`;
  }};
  min-height: 44px;
`;

const AchievementEmoji = styled.div`
  font-size: 1.6rem;
  margin-bottom: 6px;
`;

const AchievementName = styled.div`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${T.frostWhite};
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RarityBadge = styled.span<{ $rarity: Rarity }>`
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;
  color: ${T.frostWhite};
  background: ${({ $rarity }) => {
    const c = RARITY_COLORS[$rarity];
    return typeof c === 'string' && !c.includes('gradient') ? `${c}44` : T.swanLavender;
  }};
  ${({ $rarity }) => $rarity === 'legendary' && `
    background: linear-gradient(135deg, #002060, #60C0F0, #C6A84B);
    background-size: 200% 200%;
    animation: ${legendaryGradient} 3s ease infinite;
  `}
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: ${T.textMuted};
  gap: 12px;
`;

const EmptyText = styled.p`
  color: ${T.textMuted};
  text-align: center;
  font-size: 0.9rem;
  margin: 16px 0;
`;

// ─── Component ───
interface OverviewSectionProps {
  currentLevel?: number;
  currentPoints?: number;
  nextLevelPoints?: number;
  badges?: { icon: React.FC<{ size?: number }>; label: string }[];
  trophies?: unknown[];
}

const OverviewSection: React.FC<OverviewSectionProps> = () => {
  const { profile, achievements, isLoading, hasError, levelProgress: hookLevelProgress } = useGamificationData();

  // Use hook's levelProgress or compute from profile data
  const points = profile?.data?.points ?? profile?.data?.profile?.points ?? 0;
  const lp: LevelProgress = hookLevelProgress ?? getLevelProgress(points);

  const recentAchievements = (achievements?.data?.achievements ?? achievements?.data ?? []).slice(0, 8);
  const totalWorkouts = profile?.data?.stats?.totalWorkouts ?? profile?.data?.profile?.totalWorkouts ?? 0;
  const streakDays = profile?.data?.stats?.streakDays ?? profile?.data?.profile?.streakDays ?? 0;
  const achievementCount = recentAchievements.length;

  if (isLoading) {
    return (
      <LoadingContainer>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        Loading gamification data...
      </LoadingContainer>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Level & XP Progress */}
      <GlassCard>
        <SectionTitle>Your Progress</SectionTitle>
        <SectionSubtitle>{lp.tierDisplay?.emoji} {lp.tierDisplay?.name ?? 'Bronze Forge'} Tier</SectionSubtitle>

        <LevelRow>
          <LevelBadge $tier={lp.tier}>
            {lp.level}
          </LevelBadge>
          <LevelInfo>
            <LevelText>Level {lp.level}</LevelText>
            <TierText $tier={lp.tier}>
              {lp.tierDisplay?.name ?? lp.tier}
            </TierText>
            <XPBarTrack>
              <XPBarFill
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(lp.progressPercent, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </XPBarTrack>
            <XPText>
              <span>{lp.currentPoints.toLocaleString()} XP</span>
              <span>{lp.nextLevelAt.toLocaleString()} XP to Level {lp.level + 1}</span>
            </XPText>
          </LevelInfo>
        </LevelRow>

        <StatsGrid>
          <StatBox>
            <StatValue>{totalWorkouts}</StatValue>
            <StatLabel>Workouts</StatLabel>
          </StatBox>
          <StatBox>
            <StatValue>{streakDays}</StatValue>
            <StatLabel>Day Streak</StatLabel>
          </StatBox>
          <StatBox>
            <StatValue>{lp.currentPoints.toLocaleString()}</StatValue>
            <StatLabel>Total XP</StatLabel>
          </StatBox>
          <StatBox>
            <StatValue>{achievementCount}</StatValue>
            <StatLabel>Achievements</StatLabel>
          </StatBox>
        </StatsGrid>
      </GlassCard>

      {/* Recent Achievements */}
      <GlassCard>
        <SectionTitle>Recent Achievements</SectionTitle>
        <SectionSubtitle>Your latest earned achievements</SectionSubtitle>

        {recentAchievements.length > 0 ? (
          <AchievementGrid>
            {recentAchievements.map((ach: any, i: number) => {
              const achievement = ach.achievement || ach;
              const rarity: Rarity = achievement.rarity || 'common';
              return (
                <AchievementCard
                  key={ach.id || i}
                  $rarity={rarity}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <AchievementEmoji>{achievement.iconEmoji || '🏆'}</AchievementEmoji>
                  <AchievementName>{achievement.title || achievement.name || 'Achievement'}</AchievementName>
                  <RarityBadge $rarity={rarity}>{rarity}</RarityBadge>
                </AchievementCard>
              );
            })}
          </AchievementGrid>
        ) : (
          <EmptyText>
            Start your journey to earn achievements! Complete workouts, engage with the community, and maintain streaks to level up.
          </EmptyText>
        )}
      </GlassCard>
    </div>
  );
};

export default OverviewSection;
