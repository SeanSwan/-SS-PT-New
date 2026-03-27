/**
 * AchievementShowcase — User Achievements Display
 * =================================================
 * Interactive showcase with 3D badge art (iconUrl), emoji fallback,
 * Crystalline Swan theming, rarity animations, and category filters.
 *
 * Theme: Enchanted Apex — Crystalline Swan
 * AI Village 9-Brain Consensus (2026-03-15): WCAG contrast fixes,
 * prefers-reduced-motion, GPU-accelerated legendary pulse,
 * focus-visible Wing Purple glow, 44px touch targets.
 */

import React, { useState, useMemo, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Dumbbell, Users, Flame, Target, Star, Building, Palette, Circle, Diamond } from 'lucide-react';
import { AnimatedButton } from '../shared/AnimatedButton';
import { TabNavigation } from '../shared/TabNavigation';
import { getBadgeImage } from '../../../utils/badgeImageResolver';

// ── Crystalline Swan Tokens ──
const T = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  wingPurple: '#8B5CF6',
};

// Rarity colors mapped to Crystalline Swan
const RARITY = {
  common:    { color: T.swanLavender, glow: 'rgba(64, 112, 192, 0.4)',  label: 'Cygnus Initiate' },
  rare:      { color: T.gildedFern,   glow: 'rgba(198, 168, 75, 0.4)',  label: 'Frostwing Ascendant' },
  epic:      { color: T.wingPurple,   glow: 'rgba(139, 92, 246, 0.5)',  label: 'Gilded Sovereign' },
  legendary: { color: T.gildedFern,   glow: 'rgba(198, 168, 75, 0.6)',  label: 'Amethyst Apex' },
};

// ── Animations ──

const achievementUnlock = keyframes`
  0%   { transform: scale(0.8) rotate(-5deg); opacity: 0; }
  50%  { transform: scale(1.08) rotate(2deg); opacity: 0.9; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const legendaryPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(198, 168, 75, 0.3),
                0 0 40px rgba(198, 168, 75, 0.15),
                inset 0 0 20px rgba(198, 168, 75, 0.05);
  }
  50% {
    box-shadow: 0 0 36px rgba(198, 168, 75, 0.5),
                0 0 72px rgba(198, 168, 75, 0.25),
                inset 0 0 36px rgba(198, 168, 75, 0.1);
  }
`;

const shimmer = keyframes`
  0%   { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ── Types ──

export interface Achievement {
  id: string;
  title: string;
  name?: string;
  description: string;
  iconEmoji: string;
  iconUrl?: string | null;
  xpReward: number;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'fitness' | 'social' | 'streak' | 'milestone' | 'special' | 'community';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: string[];
  shareCount?: number;
  isNew?: boolean;
  skillTree?: string;
}

export interface AchievementShowcaseProps {
  achievements: Achievement[];
  onShareAchievement?: (achievement: Achievement) => void;
  onBadgeClick?: (achievement: Achievement) => void;
  className?: string;
}

export type CategoryFilter = 'all' | 'fitness' | 'social' | 'streak' | 'milestone' | 'special' | 'community';
export type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

// ── Styled Components (Crystalline Swan) ──

const ShowcaseContainer = styled(motion.div)`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ShowcaseHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled(motion.h2)`
  font-size: 2rem;
  font-weight: 700;
  color: ${T.frostWhite};
  margin-bottom: 1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const StatsRow = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const StatBadge = styled(motion.div)`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 20px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${T.frostWhite};
  font-family: 'Fira Code', monospace;
  backdrop-filter: blur(8px);
`;

const FilterSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const FilterGroup = styled.div`
  margin-bottom: 1rem;
`;

const FilterLabel = styled.h4`
  color: #b8c9db;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Sora', sans-serif;
`;

const AchievementsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const AchievementCard = styled(motion.div)<{
  $rarity: Achievement['rarity'];
  $unlocked: boolean;
  $isNew?: boolean;
}>`
  position: relative;
  background: ${T.royalDepth};
  border: 1px solid ${({ $unlocked, $rarity }) => {
    if (!$unlocked) return 'rgba(64, 112, 192, 0.1)';
    return `${RARITY[$rarity].color}33`;
  }};
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  overflow: hidden;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.25s ease;
  ${reducedMotion}

  ${({ $rarity, $unlocked }) => $rarity === 'legendary' && $unlocked && css`
    animation: ${legendaryPulse} 3s ease-in-out infinite;
    will-change: box-shadow;
  `}

  ${({ $isNew }) => $isNew && css`
    animation: ${achievementUnlock} 0.8s ease-out;
  `}

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ $rarity }) => `${RARITY[$rarity].color}66`};
    box-shadow: 0 8px 32px ${({ $rarity }) => RARITY[$rarity].glow};
  }

  &:focus-visible {
    outline: 2px solid ${T.wingPurple};
    outline-offset: 2px;
  }

  ${({ $unlocked }) => !$unlocked && css`
    filter: grayscale(60%);
    opacity: 0.55;
  `}
`;

// Badge icon: supports 3D image or emoji fallback
const BadgeIconWrap = styled.div<{ $rarity: Achievement['rarity'] }>`
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  ${({ $rarity }) => $rarity === 'legendary' && css`
    border: 2px solid ${T.gildedFern};
  `}
  ${({ $rarity }) => $rarity === 'epic' && css`
    border: 2px solid rgba(139, 92, 246, 0.4);
  `}
  ${({ $rarity }) => $rarity === 'rare' && css`
    border: 2px solid rgba(198, 168, 75, 0.3);
  `}
  ${({ $rarity }) => $rarity === 'common' && css`
    border: 2px solid rgba(64, 112, 192, 0.2);
  `}
`;

const BadgeImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
`;

const BadgeSkeleton = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    ${T.royalDepth} 0px,
    ${T.swanLavender}33 40px,
    ${T.royalDepth} 80px
  );
  background-size: 200px 100%;
  animation: ${shimmer} 1.4s infinite linear;
  ${reducedMotion}
`;

const BadgeEmoji = styled.span`
  font-size: 2.5rem;
  line-height: 1;
`;

const AchievementTitle = styled.h3<{ $unlocked: boolean }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ $unlocked }) => $unlocked ? T.frostWhite : `${T.frostWhite}80`};
  margin-bottom: 0.4rem;
  text-align: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const AchievementDescription = styled.p<{ $unlocked: boolean }>`
  font-size: 0.8rem;
  color: ${({ $unlocked }) => $unlocked ? '#b8c9db' : `${T.frostWhite}55`};
  margin-bottom: 0.75rem;
  text-align: center;
  line-height: 1.45;
`;

const ProgressSection = styled.div`
  margin-bottom: 0.75rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 3px;
  margin-bottom: 0.4rem;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)<{ $pct: number; $rarity: Achievement['rarity'] }>`
  height: 100%;
  border-radius: 3px;
  background: ${({ $rarity }) => {
    switch ($rarity) {
      case 'legendary': return `linear-gradient(90deg, ${T.gildedFern}, ${T.wingPurple})`;
      case 'epic':      return `linear-gradient(90deg, ${T.wingPurple}, ${T.arcticCyan})`;
      case 'rare':      return `linear-gradient(90deg, ${T.gildedFern}, ${T.iceWing})`;
      default:          return `linear-gradient(90deg, ${T.swanLavender}, ${T.iceWing})`;
    }
  }};
  width: ${({ $pct }) => $pct}%;
`;

const ProgressText = styled.div`
  font-size: 0.75rem;
  color: #b8c9db;
  text-align: center;
  font-family: 'Fira Code', monospace;
`;

const XpReward = styled.div<{ $rarity: Achievement['rarity'] }>`
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ $rarity }) => RARITY[$rarity].color};
  margin-bottom: 0.75rem;
  font-family: 'Fira Code', monospace;
`;

const ShareBtn = styled(AnimatedButton)`
  width: 100%;
  margin-top: 0.4rem;
`;

const RarityTag = styled.div<{ $rarity: Achievement['rarity'] }>`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: ${({ $rarity }) => `${RARITY[$rarity].color}22`};
  border: 1px solid ${({ $rarity }) => `${RARITY[$rarity].color}44`};
  color: ${T.frostWhite};
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Sora', sans-serif;
`;

const NewTag = styled(motion.div)`
  position: absolute;
  top: -4px;
  left: -4px;
  background: linear-gradient(135deg, ${T.wingPurple}, ${T.iceWing});
  color: ${T.frostWhite};
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  z-index: 2;
  font-family: 'Sora', sans-serif;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #b8c9db;
  font-family: 'Sora', sans-serif;
`;

// ── Badge Image Component with loading state ──

const BadgeIcon: React.FC<{
  iconUrl?: string | null;
  iconEmoji: string;
  rarity: Achievement['rarity'];
  title: string;
}> = ({ iconUrl, iconEmoji, rarity, title }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset state when iconUrl changes to prevent stale fallback
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [iconUrl]);

  return (
    <BadgeIconWrap $rarity={rarity}>
      {iconUrl && !error ? (
        <>
          {!loaded && <BadgeSkeleton />}
          <BadgeImage
            src={iconUrl}
            alt={`${title} badge`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{ display: loaded ? 'block' : 'none' }}
          />
        </>
      ) : (
        <BadgeEmoji role="img" aria-label={title}>
          {iconEmoji}
        </BadgeEmoji>
      )}
    </BadgeIconWrap>
  );
};

// ── Main Component ──

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  onShareAchievement,
  onBadgeClick,
  className,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');

  // Enrich achievements with badge images from manifest
  const enrichedAchievements = useMemo(() =>
    achievements.map(a => ({
      ...a,
      iconUrl: a.iconUrl || getBadgeImage(a.name, 'glass'),
    })),
    [achievements]
  );

  const unlockedAchievements = enrichedAchievements.filter(a => a.progress >= a.maxProgress);
  const totalXpEarned = unlockedAchievements.reduce((sum, a) => sum + a.xpReward, 0);
  const completionPct = enrichedAchievements.length > 0
    ? Math.round((unlockedAchievements.length / enrichedAchievements.length) * 100)
    : 0;

  const filteredAchievements = enrichedAchievements.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
    return true;
  });

  const categoryOptions = [
    { id: 'all', label: 'All', icon: <Trophy size={16} /> },
    { id: 'fitness', label: 'Fitness', icon: <Dumbbell size={16} /> },
    { id: 'social', label: 'Social', icon: <Users size={16} /> },
    { id: 'streak', label: 'Streaks', icon: <Flame size={16} /> },
    { id: 'milestone', label: 'Milestones', icon: <Target size={16} /> },
    { id: 'special', label: 'Special', icon: <Star size={16} color="#C6A84B" /> },
    { id: 'community', label: 'Community', icon: <Building size={16} /> },
  ];

  const rarityOptions = [
    { id: 'all', label: 'All Rarities', icon: <Palette size={16} /> },
    { id: 'common', label: 'Cygnus Initiate', icon: <Circle size={16} color="#4070C0" fill="#4070C0" /> },
    { id: 'rare', label: 'Frostwing', icon: <Circle size={16} color="#C6A84B" fill="#C6A84B" /> },
    { id: 'epic', label: 'Gilded Sovereign', icon: <Circle size={16} color="#8B5CF6" fill="#8B5CF6" /> },
    { id: 'legendary', label: 'Amethyst Apex', icon: <Diamond size={16} color="#60C0F0" /> },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <ShowcaseContainer className={className} role="region" aria-label="Achievement gallery">
      <ShowcaseHeader>
        <Title>Achievement Gallery</Title>
        <StatsRow>
          <StatBadge>{unlockedAchievements.length} / {enrichedAchievements.length} Unlocked</StatBadge>
          <StatBadge>{totalXpEarned.toLocaleString()} XP</StatBadge>
          <StatBadge>{completionPct}% Complete</StatBadge>
        </StatsRow>
      </ShowcaseHeader>

      <FilterSection>
        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <TabNavigation
            tabs={categoryOptions.map(o => ({ id: o.id, label: o.label, icon: o.icon }))}
            activeTab={categoryFilter}
            onTabChange={(tab) => setCategoryFilter(tab as CategoryFilter)}
            variant="pills"
            orientation="horizontal"
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Rarity</FilterLabel>
          <TabNavigation
            tabs={rarityOptions.map(o => ({ id: o.id, label: o.label, icon: o.icon }))}
            activeTab={rarityFilter}
            onTabChange={(tab) => setRarityFilter(tab as RarityFilter)}
            variant="pills"
            orientation="horizontal"
          />
        </FilterGroup>
      </FilterSection>

      <AchievementsGrid variants={containerVariants} initial="hidden" animate="visible">
        <AnimatePresence>
          {filteredAchievements.length === 0 ? (
            <EmptyState>No achievements match these filters</EmptyState>
          ) : (
            filteredAchievements.map((achievement) => {
              const isUnlocked = achievement.progress >= achievement.maxProgress;
              const pct = achievement.maxProgress > 0
                ? Math.min((achievement.progress / achievement.maxProgress) * 100, 100)
                : 0;

              return (
                <AchievementCard
                  key={achievement.id}
                  variants={cardVariants}
                  layout
                  $rarity={achievement.rarity}
                  $unlocked={isUnlocked}
                  $isNew={achievement.isNew}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onBadgeClick?.(achievement)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${achievement.title} — ${isUnlocked ? 'Unlocked' : `${Math.round(pct)}% progress`} — ${RARITY[achievement.rarity].label}`}
                >
                  {achievement.isNew && (
                    <NewTag initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      NEW
                    </NewTag>
                  )}

                  <RarityTag $rarity={achievement.rarity}>
                    {RARITY[achievement.rarity].label}
                  </RarityTag>

                  <BadgeIcon
                    iconUrl={achievement.iconUrl}
                    iconEmoji={achievement.iconEmoji}
                    rarity={achievement.rarity}
                    title={achievement.title}
                  />

                  <AchievementTitle $unlocked={isUnlocked}>
                    {achievement.title}
                  </AchievementTitle>

                  <AchievementDescription $unlocked={isUnlocked}>
                    {achievement.description}
                  </AchievementDescription>

                  <XpReward $rarity={achievement.rarity}>
                    +{achievement.xpReward} XP
                  </XpReward>

                  <ProgressSection>
                    <ProgressBar>
                      <ProgressFill
                        $pct={pct}
                        $rarity={achievement.rarity}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                      />
                    </ProgressBar>
                    <ProgressText>
                      {achievement.progress} / {achievement.maxProgress}
                    </ProgressText>
                  </ProgressSection>

                  {isUnlocked && onShareAchievement && (
                    <ShareBtn
                      variant="outline"
                      size="small"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onShareAchievement(achievement);
                      }}
                    >
                      Share Achievement
                    </ShareBtn>
                  )}
                </AchievementCard>
              );
            })
          )}
        </AnimatePresence>
      </AchievementsGrid>
    </ShowcaseContainer>
  );
};

export default AchievementShowcase;
