/**
 * ┌─── SUB-COMPONENT: GamificationOverview ────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView (Gamification tab)│
 * │ PURPOSE: Client gamification dashboard — XP, badges, ranks  │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────┐
 * │ [Level Badge ★5] [XP: 2,450/3,000] [Tier: Silver]  │ LevelBar
 * ├──────────────────────────────────────────────────────┤
 * │ [Achievements|Badges|Leaderboard|Challenges]         │ TabBar
 * ├──────────────────────────────────────────────────────┤
 * │ Achievements: recent unlocks + progress bars         │
 * │ Badges: collection grid (Common/Rare/Epic/Legendary) │
 * │ Leaderboard: ranked list with user position          │
 * │ Challenges: active + available challenges            │
 * └──────────────────────────────────────────────────────┘
 *
 * GAMIFICATION PROTOCOL (Octalysis Framework):
 * - Leveling: level = floor(0.1 × sqrt(totalPoints))
 * - Tiers: Bronze Forge → Silver Glacier → Gold Summit → Diamond Apex → Crystalline Swan
 * - Points: workout=50, exercise=10, PR=100, social=15, referral=200
 * - Rarity: Common=Swan Lavender, Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient
 *
 * DATA FLOW:
 * Props In:  { clientId, gamificationData }
 * State:     { activeTab, achievements[], badges[], challenges[] }
 * API Calls: GET /api/v1/gamification/profile?viewAs=:clientId, GET /api/v1/gamification/leaderboard, GET /api/v1/gamification/challenges
 *
 * Theme: Crystalline Swan (NOT Crystalline Swan — RETIRED)
 * NOTE: 1,641 lines — CRITICAL monolith. TODO: extract each tab section
 */

import React, { useEffect, useState, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Trophy,
  Star,
  Flame,
  TrendingUp,
  TrendingDown,
  Lock,
  PartyPopper,
  BadgeCheck,
  Swords,
  BarChart3,
  Plus,
  Crown,
  Medal,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'strength' | 'endurance' | 'consistency' | 'social' | 'nutrition' | 'recovery';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  points: number;
  icon: string;
  unlockCondition: string;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
  unlockedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  secretAchievement?: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  earnedDate: string;
  count?: number;
  criteria: string;
}

interface Level {
  level: number;
  name: string;
  description: string;
  minXP: number;
  maxXP: number;
  rewards: {
    type: 'badge' | 'unlock' | 'bonus';
    value: string;
    description: string;
  }[];
  features: string[];
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'community' | 'competitive';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  duration: string;
  startDate: string;
  endDate: string;
  participants: number;
  rewards: {
    position: number;
    points: number;
    badges?: string[];
    extras?: string;
  }[];
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
  status: 'upcoming' | 'active' | 'completed';
  joined?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  points: number;
  level: number;
  badges: number;
  streak: number;
  change: 'up' | 'down' | 'same';
  position_change: number;
}

type GamificationProfile = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photo?: string;
  points?: number | string | null;
  level?: number | string | null;
  tier?: string | null;
  streakDays?: number | string | null;
  nextLevelPoints?: number | string | null;
  nextLevelProgress?: number | string | null;
  leaderboardPosition?: number | string | null;
  userAchievements?: unknown[];
  rewards?: unknown[];
};

const ACHIEVEMENT_CATEGORIES: Achievement['category'][] = [
  'strength',
  'endurance',
  'consistency',
  'social',
  'nutrition',
  'recovery',
];

const ACHIEVEMENT_DIFFICULTIES: Achievement['difficulty'][] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
];

const RARITIES: Achievement['rarity'][] = ['common', 'rare', 'epic', 'legendary'];

const toRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? value as Record<string, any> : {};

const toNumber = (value: unknown, fallback = 0): number => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const normalizeCategory = (value: unknown): Achievement['category'] => {
  const category = String(value || '').toLowerCase();
  return ACHIEVEMENT_CATEGORIES.includes(category as Achievement['category'])
    ? category as Achievement['category']
    : 'strength';
};

const normalizeDifficulty = (value: unknown): Achievement['difficulty'] => {
  const difficulty = String(value || '').toLowerCase();
  return ACHIEVEMENT_DIFFICULTIES.includes(difficulty as Achievement['difficulty'])
    ? difficulty as Achievement['difficulty']
    : 'bronze';
};

const normalizeRarity = (value: unknown): Achievement['rarity'] => {
  const rarity = String(value || '').toLowerCase();
  return RARITIES.includes(rarity as Achievement['rarity'])
    ? rarity as Achievement['rarity']
    : 'common';
};

const formatTierName = (value: unknown): string => {
  const tier = toText(value, 'Level Profile').replace(/_/g, ' ');
  return tier.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const avatarUrl = (name: string, photo?: string): string => {
  if (photo) return photo;
  const encodedName = encodeURIComponent(name || 'Swan Athlete');
  return `https://ui-avatars.com/api/?name=${encodedName}&background=002060&color=60C0F0&size=40`;
};

const mapUserAchievements = (rows: unknown[] = []): Achievement[] =>
  rows.map((row, index) => {
    const userAchievement = toRecord(row);
    const achievement = toRecord(userAchievement.achievement);
    const progress = toNumber(userAchievement.progress, userAchievement.isCompleted ? 1 : 0);
    const maxProgress = Math.max(1, toNumber(achievement.maxProgress ?? achievement.targetValue, 1));

    return {
      id: String(userAchievement.id ?? achievement.id ?? index),
      title: toText(achievement.title ?? achievement.name, 'Achievement'),
      description: toText(achievement.description, ''),
      category: normalizeCategory(achievement.category),
      difficulty: normalizeDifficulty(achievement.difficulty),
      points: toNumber(userAchievement.pointsAwarded ?? achievement.xpReward ?? achievement.points),
      icon: toText(achievement.iconUrl ?? achievement.iconEmoji, ''),
      unlockCondition: Array.isArray(achievement.requirements)
        ? achievement.requirements.join(', ')
        : toText(achievement.unlockCondition ?? achievement.criteria, ''),
      progress,
      maxProgress,
      isUnlocked: Boolean(userAchievement.isCompleted ?? userAchievement.earnedAt),
      unlockedDate: toText(userAchievement.earnedAt, '') || undefined,
      rarity: normalizeRarity(achievement.rarity),
      secretAchievement: Boolean(achievement.isSecret ?? achievement.isHidden),
    };
  });

const mapUserRewards = (rows: unknown[] = []): Badge[] =>
  rows.map((row, index) => {
    const userReward = toRecord(row);
    const reward = toRecord(userReward.reward);

    return {
      id: String(userReward.id ?? reward.id ?? index),
      name: toText(reward.name ?? reward.title, 'Reward'),
      description: toText(reward.description, ''),
      iconUrl: toText(reward.iconUrl ?? reward.imageUrl, ''),
      rarity: normalizeRarity(reward.rarity),
      category: toText(reward.category, 'Rewards'),
      earnedDate: toText(userReward.earnedAt ?? userReward.redeemedAt, ''),
      count: userReward.count ? toNumber(userReward.count) : undefined,
      criteria: toText(reward.criteria ?? reward.unlockCondition, ''),
    };
  });

const mapLeaderboard = (rows: unknown[] = [], clientId: string): LeaderboardEntry[] =>
  rows.map((row, index) => {
    const entry = toRecord(row);
    const displayName = toText(
      entry.username,
      `${toText(entry.firstName)} ${toText(entry.lastName)}`.trim() || `User ${entry.id ?? index + 1}`
    );

    return {
      rank: toNumber(entry.rank, index + 1),
      userId: String(entry.id ?? entry.userId ?? index),
      username: String(entry.id ?? entry.userId) === clientId ? `${displayName} (selected)` : displayName,
      avatar: avatarUrl(displayName, toText(entry.photo, '')),
      points: toNumber(entry.points),
      level: toNumber(entry.level, 1),
      badges: toNumber(entry.badges ?? entry.badgeCount),
      streak: toNumber(entry.streakDays ?? entry.streak),
      change: 'same',
      position_change: 0,
    };
  });

const normalizeChallengeType = (value: unknown): Challenge['type'] => {
  const type = String(value || '').toLowerCase();
  if (type === 'community') return 'community';
  if (type === 'competitive') return 'competitive';
  return 'individual';
};

const normalizeChallengeDifficulty = (value: unknown): Challenge['difficulty'] => {
  const numericDifficulty = toNumber(value, 0);
  if (numericDifficulty >= 5) return 'extreme';
  if (numericDifficulty >= 4) return 'hard';
  if (numericDifficulty >= 3) return 'medium';
  const difficulty = String(value || '').toLowerCase();
  return ['easy', 'medium', 'hard', 'extreme'].includes(difficulty)
    ? difficulty as Challenge['difficulty']
    : 'easy';
};

const deriveChallengeStatus = (value: unknown, startDate: unknown, endDate: unknown): Challenge['status'] => {
  const status = String(value || '').toLowerCase();
  if (status === 'completed' || status === 'archived' || status === 'cancelled') return 'completed';

  const startMs = Date.parse(String(startDate || ''));
  const endMs = Date.parse(String(endDate || ''));
  const now = Date.now();
  if (Number.isFinite(startMs) && startMs > now) return 'upcoming';
  if (Number.isFinite(endMs) && endMs < now) return 'completed';
  return 'active';
};

const formatChallengeDuration = (startDate: unknown, endDate: unknown): string => {
  const startMs = Date.parse(String(startDate || ''));
  const endMs = Date.parse(String(endDate || ''));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 'Open';
  const days = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
  return days === 1 ? '1 day' : `${days} days`;
};

const mapChallenges = (rows: unknown[] = [], userRows: unknown[] = []): Challenge[] => {
  const participationByChallengeId = new Map<string, Record<string, any>>();

  userRows.forEach((row) => {
    const participation = toRecord(row);
    const challenge = toRecord(participation.challenge);
    const challengeId = String(participation.challengeId ?? challenge.id ?? '');
    if (challengeId) {
      participationByChallengeId.set(challengeId, participation);
    }
  });

  return rows
    .map((row) => {
      const challenge = toRecord(row);
      const id = String(challenge.id ?? '');
      if (!id) return null;

      const participation = participationByChallengeId.get(id);
      const currentProgress = toNumber(participation?.currentProgress ?? participation?.progress);
      const targetProgress = Math.max(1, toNumber(challenge.maxProgress, 1));
      const xpReward = toNumber(challenge.xpReward);
      const bonusReward = toNumber(challenge.bonusXpReward);

      return {
        id,
        title: toText(challenge.title, 'Challenge'),
        description: toText(challenge.description, ''),
        type: normalizeChallengeType(challenge.challengeType),
        category: toText(challenge.category, 'fitness').replace(/_/g, ' '),
        difficulty: normalizeChallengeDifficulty(challenge.difficulty),
        duration: formatChallengeDuration(challenge.startDate, challenge.endDate),
        startDate: toText(challenge.startDate, ''),
        endDate: toText(challenge.endDate, ''),
        participants: toNumber(challenge.currentParticipants),
        rewards: [{
          position: 1,
          points: xpReward + bonusReward,
          extras: bonusReward > 0 ? `${bonusReward} bonus XP` : undefined,
        }],
        progress: {
          current: currentProgress,
          target: targetProgress,
          unit: toText(challenge.progressUnit, 'completion'),
        },
        status: deriveChallengeStatus(challenge.status, challenge.startDate, challenge.endDate),
        joined: Boolean(participation),
      } satisfies Challenge;
    })
    .filter((challenge): challenge is Challenge => Boolean(challenge));
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const T = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05))',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  gold: '#ffd700',
  goldLight: '#ffed4e',
  fire: '#ff5722',
  green: '#4caf50',
  purple: '#9c27b0',
  orange: '#ff9800',
  blue: '#2196f3',
  red: '#f44336',
  glass: 'rgba(255,255,255,0.02)',
  glassBorder: 'rgba(255,255,255,0.1)',
} as const;

const rarityColor = (rarity: string) =>
  rarity === 'legendary' ? T.gold :
  rarity === 'epic' ? T.purple :
  rarity === 'rare' ? T.blue : T.green;

const rarityGradient = (rarity: string) =>
  rarity === 'legendary' ? 'linear-gradient(45deg, #ffd700, #ffed4e)' :
  rarity === 'epic' ? 'linear-gradient(45deg, #9c27b0, #e91e63)' :
  rarity === 'rare' ? 'linear-gradient(45deg, #2196f3, #03dac6)' :
  'linear-gradient(45deg, #4caf50, #8bc34a)';

const rarityBg = (rarity: string) =>
  rarity === 'legendary' ? 'rgba(255,215,0,0.1)' :
  rarity === 'epic' ? 'rgba(156,39,176,0.1)' :
  rarity === 'rare' ? 'rgba(33,150,243,0.1)' :
  'rgba(76,175,80,0.1)';

const rarityBorderColor = (rarity: string) =>
  rarity === 'legendary' ? 'rgba(255,215,0,0.5)' :
  rarity === 'epic' ? 'rgba(156,39,176,0.5)' :
  rarity === 'rare' ? 'rgba(33,150,243,0.5)' :
  'rgba(76,175,80,0.5)';

type SpacingProps = {
  $mt?: number;
  $mb?: number;
};

const spacingStyles = css<SpacingProps>`
  ${({ $mt }) => $mt !== undefined && css`margin-top: ${$mt}px;`}
  ${({ $mb }) => $mb !== undefined && css`margin-bottom: ${$mb}px;`}
`;

// ─── Animations ───────────────────────────────────────────────────────────────

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.5); }
  50% { box-shadow: 0 0 40px rgba(255,215,0,0.8); }
`;

const celebrationPop = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  padding: 24px;
  color: ${T.text};
`;

const HeaderSection = styled.div`
  margin-bottom: 32px;
`;

const HeaderTitle = styled.h2`
  color: ${T.gold};
  margin: 0 0 8px 0;
  font-weight: 700;
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderSubtitle = styled.p`
  color: ${T.textMuted};
  margin: 0;
  font-size: 1rem;
`;

const StatusBanner = styled.div<{ $tone?: 'loading' | 'error' }>`
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid ${({ $tone }) => $tone === 'error' ? 'rgba(244,67,54,0.35)' : T.border};
  background: ${({ $tone }) => $tone === 'error' ? 'rgba(244,67,54,0.1)' : 'rgba(14,165,233,0.08)'};
  color: ${({ $tone }) => $tone === 'error' ? '#fecaca' : T.text};
  font-size: 0.875rem;
`;

const EmptyPanel = styled.div`
  padding: 24px;
  border-radius: 12px;
  border: 1px dashed ${T.glassBorder};
  color: ${T.textMuted};
  background: ${T.glass};
  text-align: center;
`;

/* Glass Panel base for cards */
const GlassPanel = styled.div<SpacingProps>`
  background: ${T.bgCard};
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid ${T.glassBorder};
  transition: all 0.3s ease;
  ${spacingStyles}

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(255,215,0,0.15);
    border-color: rgba(255,215,0,0.3);
  }
`;

const CardBody = styled.div<{ $center?: boolean } & SpacingProps>`
  padding: 20px;
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
  ${spacingStyles}
`;

/* Achievement card with transient $props */
const AchievementCardPanel = styled.div<{ $unlocked?: boolean; $rarity?: string }>`
  background: ${({ $unlocked, $rarity }) =>
    $unlocked && $rarity
      ? `linear-gradient(135deg, ${rarityBg($rarity)}, rgba(255,255,255,0.05))`
      : T.glass};
  border-radius: 12px;
  border: 1px solid ${({ $unlocked, $rarity }) =>
    $unlocked && $rarity ? rarityBorderColor($rarity) : T.glassBorder};
  opacity: ${({ $unlocked }) => ($unlocked ? 1 : 0.6)};
  transition: all 0.3s ease;

  &:hover {
    transform: ${({ $unlocked }) => ($unlocked ? 'translateY(-2px)' : 'none')};
    box-shadow: ${({ $unlocked }) => ($unlocked ? '0 8px 24px rgba(255,215,0,0.1)' : 'none')};
  }
`;

/* Responsive grid that adapts across breakpoints */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const AchievementsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const OverviewTopGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 2fr;
  }
`;

const ChallengesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const BadgesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

/* Stat card */
const StatPanel = styled.div`
  padding: 16px;
  text-align: center;
  background: rgba(255,215,0,0.1);
  border-radius: 12px;
  border: 1px solid ${T.glassBorder};
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color || T.text};
  margin-top: 4px;
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  color: ${T.textMuted};
`;

/* Level circle */
const LevelCircle = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(45deg, ${T.gold}, ${T.goldLight});
  border: 3px solid #fff;
  animation: ${pulseGlow} 3s infinite;
`;

const LevelNumber = styled.span`
  font-size: 2rem;
  font-weight: 700;
  color: #002060;
`;

/* Progress bar */
const ProgressTrack = styled.div<{ $height?: number }>`
  width: 100%;
  height: ${({ $height }) => $height ?? 12}px;
  border-radius: ${({ $height }) => ($height ?? 12) / 2}px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number; $color?: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
  border-radius: inherit;
  background: ${({ $color }) => $color || T.gold};
  transition: width 0.6s ease;
`;

/* Action button (44px touch target) */
const ActionButton = styled.button<{ $variant?: 'filled' | 'outline'; $fullWidth?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  ${({ $variant }) =>
    $variant === 'outline'
      ? css`
          background: transparent;
          border: 1px solid rgba(255,215,0,0.5);
          color: ${T.gold};
          &:hover {
            border-color: ${T.gold};
            background: rgba(255,215,0,0.1);
            transform: scale(1.05);
          }
        `
      : css`
          background: linear-gradient(135deg, ${T.gold}, ${T.goldLight});
          border: none;
          color: #002060;
          &:hover {
            background: linear-gradient(135deg, ${T.goldLight}, ${T.gold});
            transform: scale(1.05);
          }
        `}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

/* Round icon button (44px) */
const RoundButton = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${T.glassBorder};
  background: transparent;
  color: ${T.text};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.08);
    border-color: ${T.gold};
    color: ${T.gold};
  }
`;

/* Tab button group */
const TabBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255,215,0,0.5);
  transition: all 0.2s ease;

  &:first-child {
    border-radius: 12px 0 0 12px;
  }
  &:last-child {
    border-radius: 0 12px 12px 0;
  }
  &:not(:first-child) {
    margin-left: -1px;
  }

  ${({ $active }) =>
    $active
      ? css`
          background: linear-gradient(135deg, ${T.gold}, ${T.goldLight});
          color: #002060;
          border-color: ${T.gold};
          z-index: 1;
        `
      : css`
          background: transparent;
          color: ${T.gold};
          &:hover {
            background: rgba(255,215,0,0.1);
          }
        `}
`;

/* Filter button group */
const FilterGroup = styled.div`
  display: flex;
  gap: 0;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  min-height: 36px;
  padding: 4px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255,215,0,0.5);
  transition: all 0.2s ease;

  &:first-child { border-radius: 8px 0 0 8px; }
  &:last-child { border-radius: 0 8px 8px 0; }
  &:not(:first-child) { margin-left: -1px; }

  ${({ $active }) =>
    $active
      ? css`
          background: linear-gradient(135deg, ${T.gold}, ${T.goldLight});
          color: #002060;
          border-color: ${T.gold};
          z-index: 1;
        `
      : css`
          background: transparent;
          color: ${T.gold};
          &:hover { background: rgba(255,215,0,0.1); }
        `}
`;

/* Chip / tag */
const ChipTag = styled.span<{ $rarity?: string; $outline?: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: capitalize;

  ${({ $rarity }) =>
    $rarity
      ? css`
          background: ${rarityGradient($rarity)};
          color: white;
        `
      : ''}

  ${({ $outline }) =>
    $outline
      ? css`
          background: transparent;
          border: 1px solid ${T.glassBorder};
          color: ${T.textMuted};
        `
      : ''}

  ${({ $color }) =>
    $color
      ? css`
          color: ${$color};
        `
      : ''}
`;

const StatusChip = styled.span<{ $status?: string }>`
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: capitalize;

  ${({ $status }) =>
    $status === 'active' ? css`background: rgba(76,175,80,0.2); color: #4caf50;` :
    $status === 'upcoming' ? css`background: rgba(255,152,0,0.2); color: #ff9800;` :
    css`background: rgba(255,255,255,0.08); color: ${T.textMuted};`}
`;

const DifficultyChip = styled.span<{ $difficulty?: string }>`
  display: inline-flex;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: capitalize;

  ${({ $difficulty }) =>
    $difficulty === 'extreme' ? css`background: rgba(244,67,54,0.2); color: #f44336;` :
    $difficulty === 'hard' ? css`background: rgba(255,152,0,0.2); color: #ff9800;` :
    $difficulty === 'medium' ? css`background: rgba(33,150,243,0.2); color: #2196f3;` :
    css`background: rgba(76,175,80,0.2); color: #4caf50;`}
`;

/* Select dropdown */
const SelectDropdown = styled.select`
  min-height: 36px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid ${T.glassBorder};
  background: rgba(15,23,42,0.9);
  color: ${T.text};
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  min-width: 120px;

  &:focus { border-color: ${T.accent}; }

  option {
    background: #0f172a;
    color: ${T.text};
  }
`;

/* Avatar circle */
const AvatarCircle = styled.div<{ $size?: number; $borderColor?: string; $opacity?: number; $center?: boolean }>`
  width: ${({ $size }) => $size ?? 48}px;
  height: ${({ $size }) => $size ?? 48}px;
  min-width: ${({ $size }) => $size ?? 48}px;
  border-radius: 50%;
  border: 2px solid ${({ $borderColor }) => $borderColor || T.glassBorder};
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  opacity: ${({ $opacity }) => $opacity ?? 1};
  ${({ $center }) => $center && css`margin: 0 auto 8px auto;`}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

/* Timeline */
const TimelineWrapper = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TimelineRow = styled.div`
  display: grid;
  grid-template-columns: 120px 40px 1fr;
  gap: 8px;
  align-items: start;
  min-height: 64px;

  @media (max-width: 640px) {
    grid-template-columns: 80px 32px 1fr;
  }
`;

const TimelineDate = styled.span`
  font-size: 0.8rem;
  color: ${T.textMuted};
  text-align: right;
  padding-top: 10px;
`;

const TimelineDotWrapper = styled.div<{ $isLast?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  height: 100%;
`;

const TimelineDotCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${T.gold};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  color: #002060;
`;

const TimelineConnectorLine = styled.div`
  width: 2px;
  flex: 1;
  background: rgba(255,255,255,0.15);
  min-height: 20px;
`;

const TimelineBody = styled.div`
  padding: 8px 0 24px 8px;
`;

/* Leaderboard list */
const LeaderList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  background: rgba(29,31,43,0.8);
  border-radius: 12px;
  border: 1px solid ${T.glassBorder};
  overflow: hidden;
`;

const LeaderItem = styled.li<{ $highlight?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${({ $highlight }) => ($highlight ? 'rgba(255,215,0,0.1)' : 'transparent')};
  border-bottom: 1px solid rgba(255,255,255,0.06);

  &:last-child { border-bottom: none; }
`;

const RankCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 60px;
`;

const RankNumber = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
`;

const LeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const LeaderName = styled.div<{ $bold?: boolean }>`
  font-weight: ${({ $bold }) => ($bold ? 700 : 400)};
  color: ${T.text};
`;

const LeaderMeta = styled.div`
  font-size: 0.8rem;
  color: ${T.textMuted};
`;

const LeaderPoints = styled.div`
  text-align: right;
`;

const PointsValue = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${T.gold};
`;

const ChangeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
`;

const ChangeText = styled.span`
  font-size: 0.75rem;
  color: ${T.textMuted};
`;

/* Filter controls bar */
const ControlsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
`;

const ControlsRight = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

/* Challenge card */
const ChallengePanel = styled.div`
  background: rgba(29,31,43,0.8);
  border-radius: 12px;
  border: 1px solid ${T.glassBorder};
  padding: 20px;
`;

/* Badge card */
const BadgePanel = styled.div`
  padding: 16px;
  text-align: center;
  border-radius: 12px;
  border: 1px solid ${T.glassBorder};
  background: ${T.glass};
`;

const BadgeName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${T.text};
  margin-bottom: 4px;
`;

const BadgeDescription = styled.div`
  font-size: 0.75rem;
  color: ${T.textMuted};
  margin-bottom: 8px;
`;

/* Modal overlay + panel */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const ModalDismissLayer = styled.button`
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: default;
`;

const ModalPanel = styled.div`
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 16px;
  border: 1px solid ${T.glassBorder};
  max-width: 480px;
  width: 100%;
  padding: 32px;
  text-align: center;
  position: relative;
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${T.glassBorder};
  background: transparent;
  color: ${T.textMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.08);
    color: ${T.text};
  }
`;

const CelebrationIcon = styled.div`
  animation: ${celebrationPop} 0.5s ease forwards;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h3<{ $color?: string } & SpacingProps>`
  color: ${({ $color }) => $color || T.gold};
  margin: 0 0 8px 0;
  font-weight: 700;
  font-size: 1.125rem;
  ${spacingStyles}
`;

const TextMuted = styled.span<{ $block?: boolean; $mt?: number; $mb?: number }>`
  display: ${({ $block }) => ($block ? 'block' : 'inline')};
  color: ${T.textMuted};
  font-size: 0.85rem;
  ${spacingStyles}
`;

const FlexRow = styled.div<{ $justify?: string; $gap?: number; $wrap?: boolean } & SpacingProps>`
  display: flex;
  align-items: center;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: ${({ $gap }) => $gap ?? 8}px;
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  ${spacingStyles}
`;

const FlexSpaceBetween = styled.div<SpacingProps>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  ${spacingStyles}
`;

const GoldText = styled.span<{ $block?: boolean; $mt?: number }>`
  display: ${({ $block }) => ($block ? 'block' : 'inline')};
  color: ${T.gold};
  font-weight: 600;
  ${({ $mt }) => $mt !== undefined && css`margin-top: ${$mt}px;`}
`;

const SuccessText = styled.span`
  color: ${T.green};
  font-size: 0.75rem;
  display: block;
  margin-top: 8px;
`;

const AchievementHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const InlineMetric = styled.span<{ $weight?: number; $size?: string }>`
  font-weight: ${({ $weight }) => $weight ?? 400};
  font-size: ${({ $size }) => $size ?? '0.85rem'};
`;

const AchievementTitleText = styled.div`
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
`;

const TimelineDescription = styled.div`
  font-size: 0.85rem;
  color: ${T.textMuted};
  margin-top: 4px;
`;

const ProgressBlock = styled.div<SpacingProps>`
  ${spacingStyles}
`;

const BadgeImage = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
`;

const BadgeCount = styled.div`
  font-size: 0.75rem;
  color: ${T.gold};
  margin-top: 8px;
`;

const ChallengeTitle = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
`;

const ModalTitle = styled.h2`
  color: ${T.gold};
  margin: 0 0 16px 0;
`;

const ModalAchievementName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 8px;
`;

const CelebrationPointsChip = styled(ChipTag)`
  background: ${T.gold};
  color: #002060;
  font-weight: 700;
  padding: 6px 16px;
  font-size: 0.85rem;
`;

const ModalActions = styled.div`
  margin-top: 24px;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface GamificationOverviewProps {
  clientId: string;
  onAchievementCelebrate?: (achievementId: string) => void;
  onChallengeJoin?: (challengeId: string) => void;
  onChallengeCreate?: () => void;
}

const GamificationOverview: React.FC<GamificationOverviewProps> = ({
  clientId,
  onAchievementCelebrate: _onAchievementCelebrate,
  onChallengeJoin,
  onChallengeCreate
}) => {
  const { authAxios } = useAuth();

  // State management
  const [selectedTab, setSelectedTab] = useState<string>('overview');
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [filteredCategory, setFilteredCategory] = useState<string>('all');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadGamification = async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, leaderboardRes, challengeRes] = await Promise.all([
          authAxios.get('/api/v1/gamification/profile', { params: { viewAs: clientId } }),
          authAxios.get('/api/v1/gamification/leaderboard', { params: { limit: 10 } }),
          authAxios.get('/api/v1/gamification/challenges', { params: { status: 'all', limit: 10 } }),
        ]);

        if (cancelled) return;

        const nextProfile = (profileRes.data?.profile ?? profileRes.data?.data?.profile ?? null) as GamificationProfile | null;
        const nextLeaderboard = leaderboardRes.data?.leaderboard ?? leaderboardRes.data?.data?.leaderboard ?? [];
        const nextChallenges = challengeRes.data?.challenges ?? challengeRes.data?.data?.challenges ?? [];
        let selectedClientChallenges: unknown[] = [];

        try {
          const userChallengeRes = await authAxios.get(
            `/api/v1/gamification/users/${clientId}/challenges`,
            { params: { status: 'all', limit: 100 } }
          );
          selectedClientChallenges = userChallengeRes.data?.challenges ?? userChallengeRes.data?.data?.challenges ?? [];
        } catch {
          selectedClientChallenges = [];
        }

        if (cancelled) return;

        setClientProfile(nextProfile);
        setAchievements(mapUserAchievements(nextProfile?.userAchievements ?? []));
        setBadges(mapUserRewards(nextProfile?.rewards ?? []));
        setChallenges(mapChallenges(nextChallenges, selectedClientChallenges));
        setLeaderboard(mapLeaderboard(nextLeaderboard, clientId));
      } catch (loadError) {
        if (cancelled) return;
        console.error('Failed to load gamification profile:', loadError);
        setClientProfile(null);
        setAchievements([]);
        setBadges([]);
        setChallenges([]);
        setLeaderboard([]);
        setError('Gamification data could not be loaded.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGamification();

    return () => {
      cancelled = true;
    };
  }, [authAxios, clientId]);

  const totalPoints = toNumber(clientProfile?.points);
  const currentXP = totalPoints;
  const nextLevelXP = Math.max(1, toNumber(clientProfile?.nextLevelPoints, totalPoints || 1));
  const streakDays = toNumber(clientProfile?.streakDays);

  const clientLevel = useMemo<Level>(() => ({
    level: Math.max(1, toNumber(clientProfile?.level, 1)),
    name: formatTierName(clientProfile?.tier),
    description: 'Current gamification profile',
    minXP: 0,
    maxXP: nextLevelXP,
    rewards: [],
    features: [],
  }), [clientProfile?.level, clientProfile?.tier, nextLevelXP]);

  // Filter achievements based on category and status
  const filteredAchievements = useMemo(() => {
    return achievements.filter(achievement => {
      if (filteredCategory !== 'all' && achievement.category !== filteredCategory) {
        return false;
      }
      if (achievementFilter === 'unlocked' && !achievement.isUnlocked) {
        return false;
      }
      if (achievementFilter === 'locked' && achievement.isUnlocked) {
        return false;
      }
      return true;
    });
  }, [achievements, filteredCategory, achievementFilter]);

  const activeCelebrationAchievement = useMemo(
    () => achievements.find(a => a.id === showCelebration),
    [achievements, showCelebration]
  );

  // ─── Render Overview ──────────────────────────────────────────────────────

  const renderOverview = () => (
    <div>
      <OverviewTopGrid>
        {/* User Level and Progress */}
        <GlassPanel>
          <CardBody $center>
            <LevelCircle>
              <LevelNumber>{clientLevel.level}</LevelNumber>
            </LevelCircle>
            <SectionTitle $color={T.gold} $mt={16}>
              {clientLevel.name}
            </SectionTitle>
            <TextMuted>{clientLevel.description}</TextMuted>

            <ProgressBlock $mt={24}>
              <FlexSpaceBetween $mb={8}>
                <TextMuted>Level Progress</TextMuted>
                <InlineMetric $weight={600}>
                  {currentXP - clientLevel.minXP}/{nextLevelXP} XP
                </InlineMetric>
              </FlexSpaceBetween>
              <ProgressTrack $height={12}>
                <ProgressFill $pct={((currentXP - clientLevel.minXP) / nextLevelXP) * 100} />
              </ProgressTrack>
            </ProgressBlock>
          </CardBody>
        </GlassPanel>

        {/* Quick Stats */}
        <GlassPanel>
          <CardBody>
            <SectionTitle $color={T.gold} $mb={20}>
              Your Gaming Stats
            </SectionTitle>
            <StatsGrid>
              <StatPanel>
                <Flame size={40} color={T.fire} />
                <StatValue $color={T.fire}>{streakDays}</StatValue>
                <StatLabel>Day Streak</StatLabel>
              </StatPanel>
              <StatPanel>
                <Star size={40} color={T.gold} />
                <StatValue $color={T.gold}>{totalPoints.toLocaleString()}</StatValue>
                <StatLabel>Total Points</StatLabel>
              </StatPanel>
              <StatPanel>
                <Trophy size={40} color={T.orange} />
                <StatValue $color={T.orange}>
                  {achievements.filter(a => a.isUnlocked).length}
                </StatValue>
                <StatLabel>Achievements</StatLabel>
              </StatPanel>
              <StatPanel>
                <Crown size={40} color={T.purple} />
                <StatValue $color={T.purple}>{badges.length}</StatValue>
                <StatLabel>Badges Earned</StatLabel>
              </StatPanel>
            </StatsGrid>
          </CardBody>
        </GlassPanel>
      </OverviewTopGrid>

      {/* Recent Achievements Timeline */}
      <GlassPanel $mt={24}>
        <CardBody>
          <SectionTitle $color={T.gold} $mb={20}>
            Recent Achievements
          </SectionTitle>
          {achievements.some(a => a.isUnlocked) ? (
            <TimelineWrapper>
              {achievements
              .filter(a => a.isUnlocked)
              .slice(0, 3)
              .map((achievement, index, arr) => (
                <TimelineRow key={achievement.id}>
                  <TimelineDate>
                    {achievement.unlockedDate && new Date(achievement.unlockedDate).toLocaleDateString()}
                  </TimelineDate>
                  <TimelineDotWrapper>
                    <TimelineDotCircle>
                      <Trophy size={16} />
                    </TimelineDotCircle>
                    {index < arr.length - 1 && <TimelineConnectorLine />}
                  </TimelineDotWrapper>
                  <TimelineBody>
                    <AchievementTitleText>{achievement.title}</AchievementTitleText>
                    <TimelineDescription>
                      {achievement.description}
                    </TimelineDescription>
                    <FlexRow $gap={8} $mt={8}>
                      <ChipTag $rarity={achievement.rarity}>{achievement.rarity}</ChipTag>
                      <ChipTag $outline>+{achievement.points} points</ChipTag>
                    </FlexRow>
                  </TimelineBody>
                </TimelineRow>
              ))}
            </TimelineWrapper>
          ) : (
            <EmptyPanel>No achievement records returned yet.</EmptyPanel>
          )}
        </CardBody>
      </GlassPanel>
    </div>
  );

  // ─── Render Achievements ──────────────────────────────────────────────────

  const renderAchievements = () => (
    <div>
      <ControlsBar>
        <SectionTitle $color={T.gold} $mb={0}>
          Achievements ({filteredAchievements.length})
        </SectionTitle>
        <ControlsRight>
          <SelectDropdown
            value={filteredCategory}
            onChange={(e) => setFilteredCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="strength">Strength</option>
            <option value="endurance">Endurance</option>
            <option value="consistency">Consistency</option>
            <option value="social">Social</option>
            <option value="nutrition">Nutrition</option>
          </SelectDropdown>
          <FilterGroup>
            <FilterButton
              $active={achievementFilter === 'all'}
              onClick={() => setAchievementFilter('all')}
            >
              All
            </FilterButton>
            <FilterButton
              $active={achievementFilter === 'unlocked'}
              onClick={() => setAchievementFilter('unlocked')}
            >
              Unlocked
            </FilterButton>
            <FilterButton
              $active={achievementFilter === 'locked'}
              onClick={() => setAchievementFilter('locked')}
            >
              Locked
            </FilterButton>
          </FilterGroup>
        </ControlsRight>
      </ControlsBar>

      {filteredAchievements.length > 0 ? (
        <AchievementsGrid>
          {filteredAchievements.map((achievement) => (
            <AchievementCardPanel
              key={achievement.id}
              $unlocked={achievement.isUnlocked}
              $rarity={achievement.rarity}
            >
              <CardBody>
                <AchievementHeaderRow>
                  <FlexRow $gap={12}>
                    <AvatarCircle
                      $size={48}
                      $borderColor={achievement.isUnlocked ? T.gold : '#666'}
                      $opacity={achievement.isUnlocked ? 1 : 0.5}
                    >
                      {achievement.isUnlocked
                        ? <Trophy size={22} color={T.gold} />
                        : <Lock size={22} color="#666" />}
                    </AvatarCircle>
                    <div>
                      <AchievementTitleText>
                        {achievement.secretAchievement && !achievement.isUnlocked
                          ? '???'
                          : achievement.title}
                      </AchievementTitleText>
                      <TextMuted>
                        {achievement.secretAchievement && !achievement.isUnlocked
                          ? 'Secret Achievement'
                          : achievement.description}
                      </TextMuted>
                    </div>
                  </FlexRow>
                  {achievement.isUnlocked && (
                    <RoundButton
                      title="Celebrate Achievement"
                      onClick={() => setShowCelebration(achievement.id)}
                    >
                      <PartyPopper size={18} />
                    </RoundButton>
                  )}
                </AchievementHeaderRow>

                <FlexRow $gap={8} $mb={12}>
                  <ChipTag $rarity={achievement.rarity}>{achievement.rarity}</ChipTag>
                  <ChipTag $outline>{achievement.category}</ChipTag>
                  <ChipTag $color={T.gold} $outline>{achievement.points} pts</ChipTag>
                </FlexRow>

                {!achievement.isUnlocked && !achievement.secretAchievement && (
                  <ProgressBlock $mt={12}>
                    <FlexSpaceBetween $mb={6}>
                      <TextMuted>Progress</TextMuted>
                      <InlineMetric $size="0.75rem">
                        {achievement.progress}/{achievement.maxProgress}
                      </InlineMetric>
                    </FlexSpaceBetween>
                    <ProgressTrack $height={8}>
                      <ProgressFill
                        $pct={(achievement.progress / achievement.maxProgress) * 100}
                      />
                    </ProgressTrack>
                  </ProgressBlock>
                )}

                {achievement.isUnlocked && achievement.unlockedDate && (
                  <SuccessText>
                    Unlocked on {new Date(achievement.unlockedDate).toLocaleDateString()}
                  </SuccessText>
                )}
              </CardBody>
            </AchievementCardPanel>
          ))}
        </AchievementsGrid>
      ) : (
        <EmptyPanel>No achievements match the current filters.</EmptyPanel>
      )}
    </div>
  );

  // ─── Render Badges ────────────────────────────────────────────────────────

  const renderBadges = () => (
    <div>
      <SectionTitle $color={T.gold} $mb={20}>
        Badge Collection ({badges.length})
      </SectionTitle>
      {badges.length > 0 ? (
        <BadgesGrid>
          {badges.map((badge) => (
            <BadgePanel key={badge.id}>
              <AvatarCircle
                $size={64}
                $borderColor={rarityColor(badge.rarity)}
                $center
              >
                {badge.iconUrl ? (
                  <BadgeImage
                    src={badge.iconUrl}
                    alt={badge.name}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
                {!badge.iconUrl && <BadgeCheck size={28} color={rarityColor(badge.rarity)} />}
              </AvatarCircle>
              <BadgeName>{badge.name}</BadgeName>
              <BadgeDescription>{badge.description}</BadgeDescription>
              <ChipTag $rarity={badge.rarity}>{badge.rarity}</ChipTag>
              {badge.count && (
                <BadgeCount>
                  Count: {badge.count}
                </BadgeCount>
              )}
            </BadgePanel>
          ))}
        </BadgesGrid>
      ) : (
        <EmptyPanel>No reward records returned yet.</EmptyPanel>
      )}
    </div>
  );

  // ─── Render Challenges ────────────────────────────────────────────────────

  const renderChallenges = () => (
    <div>
      <ControlsBar>
        <SectionTitle $color={T.gold} $mb={0}>
          Active Challenges
        </SectionTitle>
        <ActionButton onClick={onChallengeCreate}>
          <Plus size={18} /> Create Challenge
        </ActionButton>
      </ControlsBar>

      {challenges.length > 0 ? (
        <ChallengesGrid>
          {challenges.map((challenge) => (
            <ChallengePanel key={challenge.id}>
              <FlexSpaceBetween $mb={12}>
                <ChallengeTitle>
                  {challenge.title}
                </ChallengeTitle>
                <StatusChip $status={challenge.status}>{challenge.status}</StatusChip>
              </FlexSpaceBetween>

              <TextMuted $block $mb={12}>
                {challenge.description}
              </TextMuted>

              <FlexRow $gap={8} $mb={12}>
                <ChipTag $outline>{challenge.type}</ChipTag>
                <DifficultyChip $difficulty={challenge.difficulty}>{challenge.difficulty}</DifficultyChip>
                <ChipTag $outline>{challenge.participants} participants</ChipTag>
              </FlexRow>

              {challenge.progress && challenge.status === 'active' && (
                <ProgressBlock $mb={16}>
                  <FlexSpaceBetween $mb={6}>
                    <TextMuted>Your Progress</TextMuted>
                    <InlineMetric $weight={600}>
                      {challenge.progress.current}/{challenge.progress.target} {challenge.progress.unit}
                    </InlineMetric>
                  </FlexSpaceBetween>
                  <ProgressTrack $height={8}>
                    <ProgressFill
                      $pct={(challenge.progress.current / Math.max(1, challenge.progress.target)) * 100}
                      $color={T.green}
                    />
                  </ProgressTrack>
                </ProgressBlock>
              )}

              {challenge.rewards[0] && (
                <ProgressBlock $mb={16}>
                  <TextMuted>Top Rewards:</TextMuted>
                  <GoldText $block $mt={4}>
                    1st: {challenge.rewards[0].points} points
                    {challenge.rewards[0].extras && ` + ${challenge.rewards[0].extras}`}
                  </GoldText>
                </ProgressBlock>
              )}

              <ActionButton
                $variant={challenge.joined ? 'outline' : 'filled'}
                $fullWidth
                disabled={challenge.status === 'completed'}
                onClick={() => onChallengeJoin?.(challenge.id)}
              >
                {challenge.joined ? 'Joined' :
                 challenge.status === 'upcoming' ? 'Join Challenge' :
                 challenge.status === 'active' ? 'Join Now' : 'Completed'}
              </ActionButton>
            </ChallengePanel>
          ))}
        </ChallengesGrid>
      ) : (
        <EmptyPanel>No challenge records are connected to this view yet.</EmptyPanel>
      )}
    </div>
  );

  // ─── Render Leaderboard ───────────────────────────────────────────────────

  const renderLeaderboard = () => (
    <div>
      <SectionTitle $color={T.gold} $mb={20}>
        Monthly Leaderboard
      </SectionTitle>
      {leaderboard.length > 0 ? (
        <LeaderList>
          {leaderboard.map((entry) => (
            <LeaderItem key={entry.userId} $highlight={entry.userId === clientId}>
              <RankCell>
                <RankNumber>#{entry.rank}</RankNumber>
                {entry.rank === 1 && <Crown size={20} color={T.gold} />}
                {entry.rank === 2 && <Medal size={20} color="#c0c0c0" />}
                {entry.rank === 3 && <Medal size={20} color="#cd7f32" />}
              </RankCell>
              <AvatarCircle $size={40}>
                <img src={entry.avatar} alt={entry.username} />
              </AvatarCircle>
              <LeaderInfo>
                <LeaderName $bold={entry.userId === clientId}>
                  {entry.username}
                </LeaderName>
                <LeaderMeta>
                  Level {entry.level} &bull; {entry.badges} badges &bull; {entry.streak} day streak
                </LeaderMeta>
              </LeaderInfo>
              <LeaderPoints>
                <PointsValue>{entry.points.toLocaleString()}</PointsValue>
                <ChangeIndicator>
                  {entry.change === 'up' && <TrendingUp size={16} color={T.green} />}
                  {entry.change === 'down' && <TrendingDown size={16} color={T.red} />}
                  <ChangeText>
                    {entry.change === 'same' ? 'No change' :
                     entry.change === 'up' ? `+${entry.position_change}` :
                     entry.position_change}
                  </ChangeText>
                </ChangeIndicator>
              </LeaderPoints>
            </LeaderItem>
          ))}
        </LeaderList>
      ) : (
        <EmptyPanel>No leaderboard records returned yet.</EmptyPanel>
      )}
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      {/* Header */}
      <HeaderSection>
        <HeaderTitle>
          <Trophy size={40} />
          Gamification Hub
        </HeaderTitle>
        <HeaderSubtitle>
          Track achievements, compete with friends, and unlock rewards
        </HeaderSubtitle>
      </HeaderSection>

      {loading && <StatusBanner $tone="loading">Loading gamification data...</StatusBanner>}
      {error && <StatusBanner $tone="error" role="alert">{error}</StatusBanner>}

      {/* Tab Navigation */}
      <TabBar>
        <TabButton
          $active={selectedTab === 'overview'}
          onClick={() => setSelectedTab('overview')}
        >
          <BarChart3 size={18} /> Overview
        </TabButton>
        <TabButton
          $active={selectedTab === 'achievements'}
          onClick={() => setSelectedTab('achievements')}
        >
          <Trophy size={18} /> Achievements
        </TabButton>
        <TabButton
          $active={selectedTab === 'badges'}
          onClick={() => setSelectedTab('badges')}
        >
          <BadgeCheck size={18} /> Badges
        </TabButton>
        <TabButton
          $active={selectedTab === 'challenges'}
          onClick={() => setSelectedTab('challenges')}
        >
          <Swords size={18} /> Challenges
        </TabButton>
        <TabButton
          $active={selectedTab === 'leaderboard'}
          onClick={() => setSelectedTab('leaderboard')}
        >
          <BarChart3 size={18} /> Leaderboard
        </TabButton>
      </TabBar>

      {/* Content */}
      <div>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'achievements' && renderAchievements()}
        {selectedTab === 'badges' && renderBadges()}
        {selectedTab === 'challenges' && renderChallenges()}
        {selectedTab === 'leaderboard' && renderLeaderboard()}
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && (
          <ModalOverlay>
            <ModalDismissLayer
              type="button"
              aria-label="Close achievement celebration"
              onClick={() => setShowCelebration(null)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalPanel>
                <ModalCloseButton onClick={() => setShowCelebration(null)}>
                  <X size={18} />
                </ModalCloseButton>
                <CelebrationIcon>
                  <PartyPopper size={80} color={T.gold} />
                </CelebrationIcon>
                <ModalTitle>
                  Achievement Unlocked!
                </ModalTitle>
                <ModalAchievementName>
                  {activeCelebrationAchievement?.title}
                </ModalAchievementName>
                <TextMuted $block $mb={20}>
                  {activeCelebrationAchievement?.description}
                </TextMuted>
                <CelebrationPointsChip>
                  +{activeCelebrationAchievement?.points ?? 0} Points
                </CelebrationPointsChip>
                <ModalActions>
                  <ActionButton onClick={() => setShowCelebration(null)}>
                    Awesome!
                  </ActionButton>
                </ModalActions>
              </ModalPanel>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default GamificationOverview;
