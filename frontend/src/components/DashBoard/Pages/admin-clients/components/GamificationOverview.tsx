/**
 * Gamification Overview Component
 * 7-Star AAA Personal Training & Social Media App
 *
 * Comprehensive gamification system featuring:
 * - Achievement tracking and celebration
 * - Progressive level system with rewards
 * - Badge collection and rarity system
 * - Leaderboards and competitive elements
 * - Challenge creation and participation
 * - Social aspects and community engagement
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, glass panels, cyan accents)
 */

import React, { useState, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Trophy,
  Star,
  Flame,
  TrendingUp,
  TrendingDown,
  Lock,
  CheckCircle2,
  PartyPopper,
  ChevronDown,
  BadgeCheck,
  Swords,
  BarChart3,
  Plus,
  Crown,
  Medal,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

/* Glass Panel base for cards */
const GlassPanel = styled.div`
  background: ${T.bgCard};
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid ${T.glassBorder};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(255,215,0,0.15);
    border-color: rgba(255,215,0,0.3);
  }
`;

const CardBody = styled.div`
  padding: 20px;
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

/* Grid helpers */
const GridContainer = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: ${({ $gap }) => $gap ?? 24}px;
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
  color: #0a0a1a;
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
          color: #0a0a1a;
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
          color: #0a0a1a;
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
          color: #0a0a1a;
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
const AvatarCircle = styled.div<{ $size?: number; $borderColor?: string }>`
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
  color: #0a0a1a;
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

const SectionTitle = styled.h3<{ $color?: string }>`
  color: ${({ $color }) => $color || T.gold};
  margin: 0 0 8px 0;
  font-weight: 700;
  font-size: 1.125rem;
`;

const TextMuted = styled.span`
  color: ${T.textMuted};
  font-size: 0.85rem;
`;

const FlexRow = styled.div<{ $justify?: string; $gap?: number; $wrap?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  gap: ${({ $gap }) => $gap ?? 8}px;
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
`;

const FlexSpaceBetween = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const GoldText = styled.span`
  color: ${T.gold};
  font-weight: 600;
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

// ─── Component ────────────────────────────────────────────────────────────────

interface GamificationOverviewProps {
  clientId: string;
  onAchievementCelebrate?: (achievementId: string) => void;
  onChallengeJoin?: (challengeId: string) => void;
  onChallengeCreate?: () => void;
}

const GamificationOverview: React.FC<GamificationOverviewProps> = ({
  clientId,
  onAchievementCelebrate,
  onChallengeJoin,
  onChallengeCreate
}) => {
  // State management
  const [selectedTab, setSelectedTab] = useState<string>('overview');
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [filteredCategory, setFilteredCategory] = useState<string>('all');
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('stats');

  // Mock data
  const clientLevel: Level = {
    level: 15,
    name: "Fitness Warrior",
    description: "Master of strength and dedication",
    minXP: 12000,
    maxXP: 15000,
    rewards: [
      { type: 'badge', value: 'Golden Warrior', description: 'Exclusive level 15 badge' },
      { type: 'unlock', value: 'Advanced Programs', description: 'Access to elite workout plans' },
      { type: 'bonus', value: '500 XP', description: 'XP boost for next level' }
    ],
    features: ['Premium analytics', 'Personal trainer access', 'Custom meal plans']
  };

  const currentXP = 14250;
  const nextLevelXP = 3000;
  const streakDays = 35;
  const totalPoints = 15680;

  const mockAchievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first workout',
      category: 'strength',
      difficulty: 'bronze',
      points: 100,
      icon: '/icons/first-workout.png',
      unlockCondition: 'Complete 1 workout',
      progress: 1,
      maxProgress: 1,
      isUnlocked: true,
      unlockedDate: '2024-01-15',
      rarity: 'common'
    },
    {
      id: '2',
      title: 'Consistency King',
      description: 'Maintain a 30-day workout streak',
      category: 'consistency',
      difficulty: 'gold',
      points: 500,
      icon: '/icons/streak.png',
      unlockCondition: 'Workout for 30 consecutive days',
      progress: 35,
      maxProgress: 30,
      isUnlocked: true,
      unlockedDate: '2024-11-15',
      rarity: 'rare'
    },
    {
      id: '3',
      title: 'Iron Will',
      description: 'Lift 10,000 kg total in deadlifts',
      category: 'strength',
      difficulty: 'platinum',
      points: 1000,
      icon: '/icons/iron-will.png',
      unlockCondition: 'Reach 10,000 kg total deadlift volume',
      progress: 8500,
      maxProgress: 10000,
      isUnlocked: false,
      rarity: 'epic'
    },
    {
      id: '4',
      title: 'Social Butterfly',
      description: 'Get 100 likes on workout posts',
      category: 'social',
      difficulty: 'silver',
      points: 300,
      icon: '/icons/social.png',
      unlockCondition: 'Receive 100 total likes',
      progress: 127,
      maxProgress: 100,
      isUnlocked: true,
      unlockedDate: '2024-10-20',
      rarity: 'rare'
    },
    {
      id: '5',
      title: 'The Chosen One',
      description: 'A legendary achievement for the elite',
      category: 'strength',
      difficulty: 'diamond',
      points: 5000,
      icon: '/icons/legendary.png',
      unlockCondition: '???',
      progress: 0,
      maxProgress: 1,
      isUnlocked: false,
      rarity: 'legendary',
      secretAchievement: true
    }
  ];

  const mockBadges: Badge[] = [
    {
      id: 'b1',
      name: 'Workout Warrior',
      description: 'Completed 100 workouts',
      iconUrl: '/badges/warrior.png',
      rarity: 'rare',
      category: 'Achievements',
      earnedDate: '2024-11-01',
      count: 127,
      criteria: 'Complete 100 workouts'
    },
    {
      id: 'b2',
      name: 'Consistency Champion',
      description: '30-day streak achiever',
      iconUrl: '/badges/consistency.png',
      rarity: 'epic',
      category: 'Streaks',
      earnedDate: '2024-11-15',
      criteria: 'Maintain 30-day workout streak'
    },
    {
      id: 'b3',
      name: 'Social Star',
      description: 'Most liked posts this month',
      iconUrl: '/badges/social.png',
      rarity: 'rare',
      category: 'Social',
      earnedDate: '2024-12-01',
      criteria: 'Highest engagement rate'
    }
  ];

  const mockChallenges: Challenge[] = [
    {
      id: 'c1',
      title: 'December Deadlift Challenge',
      description: 'Complete 1000 total deadlifts this month',
      type: 'community',
      category: 'Strength',
      difficulty: 'hard',
      duration: '30 days',
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      participants: 243,
      rewards: [
        { position: 1, points: 2000, badges: ['Deadlift King'], extras: 'Free protein powder' },
        { position: 3, points: 1000, badges: ['Top Lifter'] },
        { position: 10, points: 500 }
      ],
      progress: {
        current: 450,
        target: 1000,
        unit: 'deadlifts'
      },
      status: 'active',
      joined: true
    },
    {
      id: 'c2',
      title: 'New Year Transformation',
      description: '12-week body transformation challenge',
      type: 'competitive',
      category: 'Overall',
      difficulty: 'extreme',
      duration: '84 days',
      startDate: '2025-01-01',
      endDate: '2025-03-25',
      participants: 0,
      rewards: [
        { position: 1, points: 10000, badges: ['Transformation Champion'], extras: 'Free personal training package' },
        { position: 5, points: 5000, badges: ['Transform Pro'] },
        { position: 20, points: 2000 }
      ],
      status: 'upcoming',
      joined: false
    }
  ];

  const mockLeaderboard: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: 'u1',
      username: 'FitnessKing01',
      avatar: '/avatars/user1.jpg',
      points: 25680,
      level: 22,
      badges: 45,
      streak: 85,
      change: 'same',
      position_change: 0
    },
    {
      rank: 2,
      userId: 'u2',
      username: 'IronMaven',
      avatar: '/avatars/user2.jpg',
      points: 24120,
      level: 21,
      badges: 38,
      streak: 67,
      change: 'up',
      position_change: 2
    },
    {
      rank: 3,
      userId: 'u3',
      username: 'GymQueen',
      avatar: '/avatars/user3.jpg',
      points: 22890,
      level: 20,
      badges: 41,
      streak: 45,
      change: 'down',
      position_change: -1
    },
    {
      rank: 15,
      userId: clientId,
      username: 'YourUsername',
      avatar: '/avatars/current.jpg',
      points: 15680,
      level: 15,
      badges: 18,
      streak: 35,
      change: 'up',
      position_change: 3
    }
  ];

  // Filter achievements based on category and status
  const filteredAchievements = useMemo(() => {
    return mockAchievements.filter(achievement => {
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
  }, [mockAchievements, filteredCategory, achievementFilter]);

  // ─── Render Overview ──────────────────────────────────────────────────────

  const renderOverview = () => (
    <div>
      <OverviewTopGrid>
        {/* User Level and Progress */}
        <GlassPanel>
          <CardBody style={{ textAlign: 'center' }}>
            <LevelCircle>
              <LevelNumber>{clientLevel.level}</LevelNumber>
            </LevelCircle>
            <SectionTitle $color={T.gold} style={{ marginTop: 16 }}>
              {clientLevel.name}
            </SectionTitle>
            <TextMuted>{clientLevel.description}</TextMuted>

            <div style={{ marginTop: 24 }}>
              <FlexSpaceBetween style={{ marginBottom: 8 }}>
                <TextMuted>Level Progress</TextMuted>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {currentXP - clientLevel.minXP}/{nextLevelXP} XP
                </span>
              </FlexSpaceBetween>
              <ProgressTrack $height={12}>
                <ProgressFill $pct={((currentXP - clientLevel.minXP) / nextLevelXP) * 100} />
              </ProgressTrack>
            </div>
          </CardBody>
        </GlassPanel>

        {/* Quick Stats */}
        <GlassPanel>
          <CardBody>
            <SectionTitle $color={T.gold} style={{ marginBottom: 20 }}>
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
                  {mockAchievements.filter(a => a.isUnlocked).length}
                </StatValue>
                <StatLabel>Achievements</StatLabel>
              </StatPanel>
              <StatPanel>
                <Crown size={40} color={T.purple} />
                <StatValue $color={T.purple}>{mockBadges.length}</StatValue>
                <StatLabel>Badges Earned</StatLabel>
              </StatPanel>
            </StatsGrid>
          </CardBody>
        </GlassPanel>
      </OverviewTopGrid>

      {/* Recent Achievements Timeline */}
      <GlassPanel style={{ marginTop: 24 }}>
        <CardBody>
          <SectionTitle $color={T.gold} style={{ marginBottom: 20 }}>
            Recent Achievements
          </SectionTitle>
          <TimelineWrapper>
            {mockAchievements
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
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{achievement.title}</span>
                    <div style={{ fontSize: '0.85rem', color: T.textMuted, marginTop: 4 }}>
                      {achievement.description}
                    </div>
                    <FlexRow $gap={8} style={{ marginTop: 8 }}>
                      <ChipTag $rarity={achievement.rarity}>{achievement.rarity}</ChipTag>
                      <ChipTag $outline>+{achievement.points} points</ChipTag>
                    </FlexRow>
                  </TimelineBody>
                </TimelineRow>
              ))}
          </TimelineWrapper>
        </CardBody>
      </GlassPanel>
    </div>
  );

  // ─── Render Achievements ──────────────────────────────────────────────────

  const renderAchievements = () => (
    <div>
      <ControlsBar>
        <SectionTitle $color={T.gold} style={{ margin: 0 }}>
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
                    style={{ opacity: achievement.isUnlocked ? 1 : 0.5 }}
                  >
                    {achievement.isUnlocked
                      ? <Trophy size={22} color={T.gold} />
                      : <Lock size={22} color="#666" />}
                  </AvatarCircle>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>
                      {achievement.secretAchievement && !achievement.isUnlocked
                        ? '???'
                        : achievement.title}
                    </div>
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

              <FlexRow $gap={8} style={{ marginBottom: 12 }}>
                <ChipTag $rarity={achievement.rarity}>{achievement.rarity}</ChipTag>
                <ChipTag $outline>{achievement.category}</ChipTag>
                <ChipTag $color={T.gold} $outline>{achievement.points} pts</ChipTag>
              </FlexRow>

              {!achievement.isUnlocked && !achievement.secretAchievement && (
                <div style={{ marginTop: 12 }}>
                  <FlexSpaceBetween style={{ marginBottom: 6 }}>
                    <TextMuted>Progress</TextMuted>
                    <span style={{ fontSize: '0.75rem' }}>
                      {achievement.progress}/{achievement.maxProgress}
                    </span>
                  </FlexSpaceBetween>
                  <ProgressTrack $height={8}>
                    <ProgressFill
                      $pct={(achievement.progress / achievement.maxProgress) * 100}
                    />
                  </ProgressTrack>
                </div>
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
    </div>
  );

  // ─── Render Badges ────────────────────────────────────────────────────────

  const renderBadges = () => (
    <div>
      <SectionTitle $color={T.gold} style={{ marginBottom: 20 }}>
        Badge Collection ({mockBadges.length})
      </SectionTitle>
      <BadgesGrid>
        {mockBadges.map((badge) => (
          <BadgePanel key={badge.id}>
            <AvatarCircle
              $size={64}
              $borderColor={rarityColor(badge.rarity)}
              style={{ margin: '0 auto 8px auto' }}
            >
              <BadgeCheck size={28} color={rarityColor(badge.rarity)} />
            </AvatarCircle>
            <BadgeName>{badge.name}</BadgeName>
            <BadgeDescription>{badge.description}</BadgeDescription>
            <ChipTag $rarity={badge.rarity}>{badge.rarity}</ChipTag>
            {badge.count && (
              <div style={{ fontSize: '0.75rem', color: T.gold, marginTop: 8 }}>
                Count: {badge.count}
              </div>
            )}
          </BadgePanel>
        ))}
      </BadgesGrid>
    </div>
  );

  // ─── Render Challenges ────────────────────────────────────────────────────

  const renderChallenges = () => (
    <div>
      <ControlsBar>
        <SectionTitle $color={T.gold} style={{ margin: 0 }}>
          Active Challenges
        </SectionTitle>
        <ActionButton onClick={onChallengeCreate}>
          <Plus size={18} /> Create Challenge
        </ActionButton>
      </ControlsBar>

      <ChallengesGrid>
        {mockChallenges.map((challenge) => (
          <ChallengePanel key={challenge.id}>
            <FlexSpaceBetween style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {challenge.title}
              </div>
              <StatusChip $status={challenge.status}>{challenge.status}</StatusChip>
            </FlexSpaceBetween>

            <TextMuted style={{ display: 'block', marginBottom: 12 }}>
              {challenge.description}
            </TextMuted>

            <FlexRow $gap={8} style={{ marginBottom: 12 }}>
              <ChipTag $outline>{challenge.type}</ChipTag>
              <DifficultyChip $difficulty={challenge.difficulty}>{challenge.difficulty}</DifficultyChip>
              <ChipTag $outline>{challenge.participants} participants</ChipTag>
            </FlexRow>

            {challenge.progress && challenge.status === 'active' && (
              <div style={{ marginBottom: 16 }}>
                <FlexSpaceBetween style={{ marginBottom: 6 }}>
                  <TextMuted>Your Progress</TextMuted>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {challenge.progress.current}/{challenge.progress.target} {challenge.progress.unit}
                  </span>
                </FlexSpaceBetween>
                <ProgressTrack $height={8}>
                  <ProgressFill
                    $pct={(challenge.progress.current / challenge.progress.target) * 100}
                    $color={T.green}
                  />
                </ProgressTrack>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <TextMuted>Top Rewards:</TextMuted>
              <GoldText style={{ display: 'block', marginTop: 4 }}>
                1st: {challenge.rewards[0].points} points
                {challenge.rewards[0].extras && ` + ${challenge.rewards[0].extras}`}
              </GoldText>
            </div>

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
    </div>
  );

  // ─── Render Leaderboard ───────────────────────────────────────────────────

  const renderLeaderboard = () => (
    <div>
      <SectionTitle $color={T.gold} style={{ marginBottom: 20 }}>
        Monthly Leaderboard
      </SectionTitle>
      <LeaderList>
        {mockLeaderboard.map((entry) => (
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
                <span style={{ fontSize: '0.75rem', color: T.textMuted }}>
                  {entry.change === 'same' ? 'No change' :
                   entry.change === 'up' ? `+${entry.position_change}` :
                   entry.position_change}
                </span>
              </ChangeIndicator>
            </LeaderPoints>
          </LeaderItem>
        ))}
      </LeaderList>
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
          <ModalOverlay onClick={() => setShowCelebration(null)}>
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
                <h2 style={{ color: T.gold, margin: '0 0 16px 0' }}>
                  Achievement Unlocked!
                </h2>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>
                  {mockAchievements.find(a => a.id === showCelebration)?.title}
                </div>
                <TextMuted style={{ display: 'block', marginBottom: 20 }}>
                  {mockAchievements.find(a => a.id === showCelebration)?.description}
                </TextMuted>
                <ChipTag style={{
                  background: T.gold,
                  color: '#0a0a1a',
                  fontWeight: 700,
                  padding: '6px 16px',
                  fontSize: '0.85rem',
                }}>
                  +{mockAchievements.find(a => a.id === showCelebration)?.points} Points
                </ChipTag>
                <div style={{ marginTop: 24 }}>
                  <ActionButton onClick={() => setShowCelebration(null)}>
                    Awesome!
                  </ActionButton>
                </div>
              </ModalPanel>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default GamificationOverview;
