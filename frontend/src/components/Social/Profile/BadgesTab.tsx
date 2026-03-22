/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BadgesTab                                         ║
 * ║  PURPOSE: Full virtualized badge grid for user dashboard      ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌───────────────────────────────────────────────────────┐
 * │  Badge Collection              12 / 804 earned       │
 * │  [🔍 Search badges...                          ]     │
 * │  [All] [Common] [Rare] [Epic] [Legendary]            │
 * │  [All] [Fitness] [Social] [Streak] [Milestone] ...   │
 * │  [All] [Earned] [Locked]                              │
 * │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
 * │  │Badge │ │Badge │ │Badge │ │Badge │ │Badge │ ...   │
 * │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
 * │  (react-window virtualized rows of 120x120 cards)    │
 * └───────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[BadgesTab] --> B[SearchInput]
 *   A --> C[FilterChips - Rarity]
 *   A --> D[FilterChips - Category]
 *   A --> E[FilterChips - Status]
 *   A --> F[VirtualizedGrid via react-window List]
 *   F --> G[BadgeCard x N]
 *   A --> H[BadgeDetailModal]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Search input] -> filters badges by name
 * [Rarity chip] -> filters by Common/Rare/Epic/Legendary
 * [Category chip] -> filters by fitness/social/streak/etc
 * [Status chip] -> filters by earned/locked
 * [Badge card] -> opens BadgeDetailModal
 *
 * DATA FLOW:
 * Props In:  { badges: ProfileBadge[] }
 * State:     { search, rarityFilter, categoryFilter, statusFilter, selectedBadge }
 * Children:  BadgeDetailModal, BadgeCard (inline memo)
 */

import React, { useState, useMemo, useCallback, memo, useRef } from 'react';
import { List } from 'react-window';
import { Search, Award } from 'lucide-react';
import { type ProfileBadge, type RarityFilter, type CategoryFilter, type StatusFilter, RARITY_CONFIG, T } from './ProfileBadgeShowcaseTypes';
import { BadgeDetailModal } from './BadgeDetailModal';
import { getBadgeImage } from '../../../utils/badgeImageResolver';
import {
  Container, Header, Title, Subtitle,
  SearchWrapper, SearchInput, SearchIcon,
  FilterRow, FilterChip, CountBadge,
  GridArea, BadgeCard, CardImage, CardEmoji, CardTitle, RarityDot,
  EmptyState,
} from './BadgesTabStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const CARD_SIZE = 120;
const CARD_GAP = 12;
const ROW_HEIGHT = CARD_SIZE + CARD_GAP;

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Definitions
// ─────────────────────────────────────────────────────────────

const RARITY_FILTERS: { id: RarityFilter; label: string; color?: string }[] = [
  { id: 'all',       label: 'All Rarities' },
  { id: 'common',    label: 'Common',    color: T.swanLavender },
  { id: 'rare',      label: 'Rare',      color: T.gildedFern },
  { id: 'epic',      label: 'Epic',      color: T.wingPurple },
  { id: 'legendary', label: 'Legendary', color: T.gildedFern },
];

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'fitness',   label: 'Fitness' },
  { id: 'social',    label: 'Social' },
  { id: 'streak',    label: 'Streaks' },
  { id: 'milestone', label: 'Milestones' },
  { id: 'special',   label: 'Special' },
  { id: 'community', label: 'Community' },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all',    label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'locked', label: 'Locked' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Memoized Badge Card
// PURPOSE: Prevents re-renders of individual cards in .map() loops
// ─────────────────────────────────────────────────────────────

const BadgeCardItem = memo<{
  badge: ProfileBadge;
  onClick: (badge: ProfileBadge) => void;
}>(({ badge, onClick }) => {
  const isEarned = badge.progress >= badge.maxProgress;
  return (
    <BadgeCard
      $rarity={badge.rarity}
      $earned={isEarned}
      onClick={() => onClick(badge)}
      aria-label={`${badge.title} — ${isEarned ? 'Earned' : 'Locked'} — ${RARITY_CONFIG[badge.rarity].label}`}
    >
      {badge.iconUrl ? (
        <CardImage src={badge.iconUrl} alt={badge.title} loading="lazy" />
      ) : (
        <CardEmoji role="img" aria-label={badge.title}>
          {badge.iconEmoji || '?'}
        </CardEmoji>
      )}
      <CardTitle $earned={isEarned}>
        {badge.title}
      </CardTitle>
      <RarityDot $rarity={badge.rarity} />
    </BadgeCard>
  );
});
BadgeCardItem.displayName = 'BadgeCardItem';

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

interface BadgesTabProps {
  badges: ProfileBadge[];
  onShare?: (badge: ProfileBadge) => void;
  className?: string;
}

export const BadgesTab: React.FC<BadgesTabProps> = ({ badges, onShare, className }) => {
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBadge, setSelectedBadge] = useState<ProfileBadge | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(800);

  // Measure grid width for column calculation
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      gridRef.current = node;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setGridWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
      setGridWidth(node.clientWidth);
      return () => observer.disconnect();
    }
  }, []);

  // Enrich badges with images and apply filters
  const filteredBadges = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return badges
      .map(b => ({ ...b, iconUrl: b.iconUrl || getBadgeImage(b.name, 'glass') }))
      .filter(b => {
        if (lowerSearch && !b.title.toLowerCase().includes(lowerSearch) &&
            !b.name.toLowerCase().includes(lowerSearch)) return false;
        if (rarityFilter !== 'all' && b.rarity !== rarityFilter) return false;
        if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
        const isEarned = b.progress >= b.maxProgress;
        if (statusFilter === 'earned' && !isEarned) return false;
        if (statusFilter === 'locked' && isEarned) return false;
        return true;
      });
  }, [badges, search, rarityFilter, categoryFilter, statusFilter]);

  const earnedCount = useMemo(
    () => badges.filter(b => b.progress >= b.maxProgress).length,
    [badges]
  );

  // Grid layout calculation
  const colCount = Math.max(1, Math.floor((gridWidth + CARD_GAP) / (CARD_SIZE + CARD_GAP)));
  const rowCount = Math.ceil(filteredBadges.length / colCount);

  const handleBadgeClick = useCallback((badge: ProfileBadge) => {
    setSelectedBadge(badge);
  }, []);

  // Virtualized row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const startIdx = index * colCount;
    const rowBadges = filteredBadges.slice(startIdx, startIdx + colCount);

    return (
      <div style={{ ...style, display: 'flex', gap: CARD_GAP, paddingBottom: CARD_GAP }}>
        {rowBadges.map(badge => (
          <BadgeCardItem key={badge.id} badge={badge} onClick={handleBadgeClick} />
        ))}
      </div>
    );
  }, [filteredBadges, colCount, handleBadgeClick]);

  return (
    <Container className={className} role="region" aria-label="Badge collection">
      <Header>
        <Title>Badge Collection</Title>
        <Subtitle>{earnedCount} / {badges.length} earned</Subtitle>

        <SearchWrapper>
          <SearchIcon><Search size={18} /></SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search badges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search badges by name"
          />
        </SearchWrapper>

        <FilterRow>
          {RARITY_FILTERS.map(f => (
            <FilterChip
              key={f.id}
              $active={rarityFilter === f.id}
              $color={f.color}
              onClick={() => setRarityFilter(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow>
          {CATEGORY_FILTERS.map(f => (
            <FilterChip
              key={f.id}
              $active={categoryFilter === f.id}
              onClick={() => setCategoryFilter(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow>
          {STATUS_FILTERS.map(f => (
            <FilterChip
              key={f.id}
              $active={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterRow>

        <CountBadge>{filteredBadges.length} badges</CountBadge>
      </Header>

      <GridArea ref={measuredRef}>
        {filteredBadges.length === 0 ? (
          <EmptyState>
            <Award size={32} />
            <span>No badges match your filters</span>
          </EmptyState>
        ) : (
          <List
            height={Math.min(rowCount * ROW_HEIGHT, 600)}
            itemCount={rowCount}
            itemSize={ROW_HEIGHT}
            width={gridWidth}
          >
            {Row}
          </List>
        )}
      </GridArea>

      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
        onShare={onShare}
      />
    </Container>
  );
};

export default BadgesTab;
