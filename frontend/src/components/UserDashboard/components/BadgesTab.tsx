/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BadgesTab (UserDashboard)                         ║
 * ║  PURPOSE: Full badge collection grid with react-window        ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌───────────────────────────────────────────────────────┐
 * │  Badge Collection              12 / 804 earned       │
 * │  [All] [Common] [Rare] [Epic] [Legendary]            │
 * │  [All] [Earned] [Locked] [Fitness] [Social] ...      │
 * │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
 * │  │Badge │ │Badge │ │Badge │ │Badge │  (4 cols desk) │
 * │  └──────┘ └──────┘ └──────┘ └──────┘               │
 * │  (react-window virtualized, 2 cols mobile)           │
 * └───────────────────────────────────────────────────────┘
 *
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Rarity chip] -> filters badges by rarity
 * [Status chip] -> filters by earned/locked
 * [SkillTree chip] -> filters by skill tree
 * [Badge card] -> opens BadgeDetailModal
 *
 * DATA FLOW:
 * Props In:  { userId: string }
 * State:     { rarityFilter, statusFilter, skillTreeFilter, selectedBadge, gridWidth }
 * API Calls: GET /api/v1/gamification/users/:userId/achievements
 * Children:  BadgeDetailModal, BadgeCardItem (inline memo)
 */

import React, { useState, useMemo, useCallback, useRef, memo } from 'react';
import { List } from 'react-window';
import styled, { keyframes, css } from 'styled-components';
import { Award, Lock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import type { Rarity, SkillTree } from '../../../types/gamification';
import { SKILL_TREE_DISPLAY } from '../../../types/gamification';
import { selectAchievements, selectGamificationLoading, fetchAchievements } from '../../../redux/slices/gamificationSlice';
import type { UserBadge } from './ProfileBadgeShowcase';
import BadgeDetailModal from './BadgeDetailModal';
import { getBadgeImage } from '../../../utils/badgeImageResolver';
import type { AppDispatch } from '../../../redux/store';

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Tokens
// ─────────────────────────────────────────────────────────────

const T = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  carbon: '#141419',
} as const;

const RARITY_COLOR: Record<Rarity, string> = {
  common: T.swanLavender,
  rare: T.gildedFern,
  epic: T.wingPurple,
  legendary: T.gildedFern,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const CARD_SIZE = 120;
const CARD_GAP = 12;
const ROW_HEIGHT = CARD_SIZE + CARD_GAP;

type RarityFilter = 'all' | Rarity;
type StatusFilter = 'all' | 'earned' | 'locked';
type TreeFilter = 'all' | SkillTree;

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const legendaryPulse = keyframes`
  0%, 100% { box-shadow: 0 0 14px rgba(198,168,75,0.25); }
  50% { box-shadow: 0 0 24px rgba(198,168,75,0.45); }
`;

const rm = css`@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Container = styled.div`display: flex; flex-direction: column; height: 100%; font-family: 'Plus Jakarta Sans', sans-serif;`;

const HeaderArea = styled.div`
  padding: 1.5rem 1.5rem 0;
  @media (max-width: 768px) { padding: 1rem 1rem 0; }
`;

const TitleRow = styled.div`display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;`;
const Title = styled.h2`font-size: 1.5rem; font-weight: 700; color: ${T.frostWhite}; margin: 0;`;
const SubText = styled.span`font-size: 0.85rem; color: #b8c9db; font-family: 'Sora', sans-serif;`;

const FilterRow = styled.div`display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;`;

const Chip = styled.button<{ $active: boolean; $color?: string }>`
  min-height: 44px; padding: 0.4rem 0.85rem;
  border-radius: 10px; font-size: 0.78rem; font-weight: 600;
  font-family: 'Sora', sans-serif; cursor: pointer;
  white-space: nowrap; transition: all 0.15s ease; ${rm}
  background: ${({ $active, $color }) => $active ? `${$color || T.iceWing}22` : 'rgba(0,32,96,0.2)'};
  border: 1px solid ${({ $active, $color }) => $active ? `${$color || T.iceWing}66` : 'rgba(96,192,240,0.1)'};
  color: ${({ $active }) => $active ? T.frostWhite : '#b8c9db'};

  &:hover { background: ${({ $color }) => `${$color || T.iceWing}15`}; }
  &:focus-visible { outline: 2px solid ${T.iceWing}; outline-offset: 2px; box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2); }
`;

const GridArea = styled.div`
  flex: 1; padding: 0 1.5rem 1.5rem; overflow: hidden;
  @media (max-width: 768px) { padding: 0 1rem 1rem; }
`;

const CardBtn = styled.button<{ $rarity: Rarity; $earned: boolean }>`
  width: ${CARD_SIZE}px; height: ${CARD_SIZE}px;
  border-radius: 16px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.25rem;
  padding: 0.5rem; cursor: pointer;
  background: ${T.royalDepth};
  border: 1.5px solid ${({ $earned, $rarity }) => $earned ? `${RARITY_COLOR[$rarity]}44` : 'rgba(64,112,192,0.1)'};
  transition: transform 150ms ease-in-out, box-shadow 150ms ease-in-out; ${rm}

  ${({ $earned }) => !$earned && css`filter: grayscale(60%); opacity: 0.5;`}
  ${({ $rarity, $earned }) => $earned && $rarity === 'legendary' && css`animation: ${legendaryPulse} 3s ease-in-out infinite; will-change: box-shadow;`}

  &:hover { transform: translateY(-4px) scale(1.02); }
  &:focus-visible { outline: 2px solid ${T.iceWing}; outline-offset: 4px; box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2); }
`;

const CardImg = styled.img`width: 56px; height: 56px; object-fit: cover; border-radius: 10px;`;
const CardEmoji = styled.span`font-size: 2rem; line-height: 1;`;
const CardLabel = styled.span<{ $earned: boolean }>`font-size: 0.65rem; font-weight: 600; color: ${({ $earned }) => $earned ? T.frostWhite : `${T.frostWhite}55`}; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; font-family: 'Sora', sans-serif;`;
const RarityDot = styled.div<{ $rarity: Rarity }>`width: 8px; height: 8px; border-radius: 50%; background: ${({ $rarity }) => RARITY_COLOR[$rarity]};`;
const LockOverlay = styled.div`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;`;

const EmptyState = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; color: #b8c9db; font-family: 'Sora', sans-serif;
  text-align: center; gap: 0.5rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Memoized Badge Card
// ─────────────────────────────────────────────────────────────

const BadgeCardItem = memo<{ badge: UserBadge; onClick: (b: UserBadge) => void }>(
  ({ badge, onClick }) => {
    const isEarned = badge.progress >= badge.maxProgress;
    return (
      <CardBtn $rarity={badge.rarity} $earned={isEarned} onClick={() => onClick(badge)} aria-label={`${badge.title} — ${isEarned ? 'Earned' : 'Locked'}`}>
        {badge.iconUrl ? <CardImg src={badge.iconUrl} alt={badge.title} loading="lazy" /> : <CardEmoji>{badge.iconEmoji || '?'}</CardEmoji>}
        <CardLabel $earned={isEarned}>{badge.title}</CardLabel>
        <RarityDot $rarity={badge.rarity} />
      </CardBtn>
    );
  }
);
BadgeCardItem.displayName = 'BadgeCardItem';

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Definitions
// ─────────────────────────────────────────────────────────────

const RARITY_OPTS: { id: RarityFilter; label: string; color?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'common', label: 'Common', color: T.swanLavender },
  { id: 'rare', label: 'Rare', color: T.gildedFern },
  { id: 'epic', label: 'Epic', color: T.wingPurple },
  { id: 'legendary', label: 'Legendary', color: T.gildedFern },
];

const STATUS_OPTS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'locked', label: 'Locked' },
];

const TREE_OPTS: { id: TreeFilter; label: string }[] = [
  { id: 'all', label: 'All Trees' },
  ...Object.entries(SKILL_TREE_DISPLAY).map(([k, v]) => ({ id: k as SkillTree, label: v.name })),
];

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

interface BadgesTabProps {
  userId: string;
  className?: string;
}

const BadgesTab: React.FC<BadgesTabProps> = ({ userId, className }) => {
  const dispatch = useDispatch<AppDispatch>();
  const achievements = useSelector(selectAchievements);
  const loading = useSelector(selectGamificationLoading);

  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [treeFilter, setTreeFilter] = useState<TreeFilter>('all');
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [gridWidth, setGridWidth] = useState(600);

  // Fetch on mount if empty
  React.useEffect(() => {
    if (achievements.length === 0 && !loading.achievements) {
      dispatch(fetchAchievements(userId));
    }
  }, [userId, achievements.length, loading.achievements, dispatch]);

  // Measure grid width
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setGridWidth(e.contentRect.width);
    });
    obs.observe(node);
    setGridWidth(node.clientWidth);
  }, []);

  // Map redux achievements to UserBadge shape + filter
  const { filtered, earnedCount, totalCount } = useMemo(() => {
    const mapped: UserBadge[] = achievements.map((a) => ({
      id: a.id, name: a.title, title: a.title, description: a.description,
      iconEmoji: a.iconEmoji, iconUrl: getBadgeImage(a.title, 'glass'),
      xpReward: a.xpReward, category: a.category, rarity: a.rarity,
      progress: a.progress, maxProgress: a.maxProgress,
      earnedAt: a.unlockedAt || null,
      skillTree: undefined,
    }));
    const earned = mapped.filter((b) => b.progress >= b.maxProgress).length;
    const result = mapped.filter((b) => {
      if (rarityFilter !== 'all' && b.rarity !== rarityFilter) return false;
      const isEarned = b.progress >= b.maxProgress;
      if (statusFilter === 'earned' && !isEarned) return false;
      if (statusFilter === 'locked' && isEarned) return false;
      if (treeFilter !== 'all' && b.skillTree !== treeFilter) return false;
      return true;
    });
    return { filtered: result, earnedCount: earned, totalCount: mapped.length };
  }, [achievements, rarityFilter, statusFilter, treeFilter]);

  const colCount = Math.max(1, Math.floor((gridWidth + CARD_GAP) / (CARD_SIZE + CARD_GAP)));
  const rowCount = Math.ceil(filtered.length / colCount);

  const handleClick = useCallback((badge: UserBadge) => setSelectedBadge(badge), []);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const start = index * colCount;
    const row = filtered.slice(start, start + colCount);
    return (
      <div style={{ ...style, display: 'flex', gap: CARD_GAP, paddingBottom: CARD_GAP }}>
        {row.map((b) => <BadgeCardItem key={b.id} badge={b} onClick={handleClick} />)}
      </div>
    );
  }, [filtered, colCount, handleClick]);

  return (
    <Container className={className} role="region" aria-label="Badge collection">
      <HeaderArea>
        <TitleRow><Title>Badge Collection</Title><SubText>{earnedCount} / {totalCount} earned</SubText></TitleRow>
        <FilterRow>{RARITY_OPTS.map((f) => <Chip key={f.id} $active={rarityFilter === f.id} $color={f.color} onClick={() => setRarityFilter(f.id)}>{f.label}</Chip>)}</FilterRow>
        <FilterRow>
          {STATUS_OPTS.map((f) => <Chip key={f.id} $active={statusFilter === f.id} onClick={() => setStatusFilter(f.id)}>{f.label}</Chip>)}
          {TREE_OPTS.map((f) => <Chip key={f.id} $active={treeFilter === f.id} onClick={() => setTreeFilter(f.id)}>{f.label}</Chip>)}
        </FilterRow>
      </HeaderArea>

      <GridArea ref={measuredRef}>
        {filtered.length === 0 ? (
          <EmptyState><Award size={32} /><span>No badges match your filters</span></EmptyState>
        ) : (
          <List height={Math.min(rowCount * ROW_HEIGHT, 600)} itemCount={rowCount} itemSize={ROW_HEIGHT} width={gridWidth}>{Row}</List>
        )}
      </GridArea>

      <BadgeDetailModal badge={selectedBadge} isOpen={selectedBadge !== null} onClose={() => setSelectedBadge(null)} />
    </Container>
  );
};

BadgesTab.displayName = 'BadgesTab';

export default BadgesTab;
