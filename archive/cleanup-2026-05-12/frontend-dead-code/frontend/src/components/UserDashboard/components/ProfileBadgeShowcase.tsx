/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ProfileBadgeShowcase (UserDashboard)              ║
 * ║  PURPOSE: Top 6 rarest badges displayed on profile header     ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌───────────────────────────────────────────────────────┐
 * │  Achievements                        [View All]       │
 * │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
 * │  │Badge1│ │Badge2│ │Badge3│ │  ?   │ │  ?   │ │  ?   │ │
 * │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
 * │  "No badges earned yet — complete workouts to unlock!"  │
 * └───────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[ProfileBadgeShowcase] --> B[BadgeSlot x 6]
 *   A --> C[EmptyState]
 *   A --> D[BadgeDetailModal]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Badge icon] -> Opens BadgeDetailModal with badge details
 * [Empty slot] -> No action (disabled)
 * [View All] -> onBadgeClick(null) or onViewAll -> navigates to badges tab
 *
 * DATA FLOW:
 * Props In:  { badges: UserBadge[], onBadgeClick: (badge) => void }
 * State:     { selectedBadge }
 * Children:  BadgeDetailModal (from Social/Profile)
 *
 * GAMIFICATION HOOKS:
 * - Display only, no point awards
 */

import React, { useState, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Award, Lock } from 'lucide-react';
import { type Rarity } from '../../../types/gamification';
import { getBadgeImage } from '../../../utils/badgeImageResolver';

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Tokens
// PURPOSE: Crystalline Swan palette constants
// ─────────────────────────────────────────────────────────────

const T = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  obsidianBlack: '#0A0A0F',
  carbon: '#141419',
} as const;

const RARITY_GLOW: Record<Rarity, string> = {
  common: 'rgba(64, 112, 192, 0.4)',
  rare: 'rgba(198, 168, 75, 0.4)',
  epic: 'rgba(139, 92, 246, 0.5)',
  legendary: 'rgba(198, 168, 75, 0.6)',
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: T.swanLavender,
  rare: T.gildedFern,
  epic: T.wingPurple,
  legendary: T.gildedFern,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Badge Data Interface
// ─────────────────────────────────────────────────────────────

export interface UserBadge {
  id: string;
  name: string;
  title: string;
  description: string;
  iconEmoji: string;
  iconUrl?: string | null;
  xpReward: number;
  category: string;
  rarity: Rarity;
  progress: number;
  maxProgress: number;
  earnedAt?: string | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const legendaryPulse = keyframes`
  0%, 100% { box-shadow: 0 0 16px rgba(198,168,75,0.25), 0 0 32px rgba(139,92,246,0.1); }
  50% { box-shadow: 0 0 28px rgba(198,168,75,0.45), 0 0 56px rgba(139,92,246,0.2); }
`;

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  padding: 1rem 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${T.frostWhite};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin: 0;
`;

const BadgeGrid = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const BadgeSlot = styled.button<{
  $rarity?: Rarity;
  $isEmpty: boolean;
}>`
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: ${({ $isEmpty }) => ($isEmpty ? 'default' : 'pointer')};
  background: ${({ $isEmpty }) =>
    $isEmpty ? 'rgba(64, 112, 192, 0.06)' : T.royalDepth};
  border: 2px solid
    ${({ $isEmpty, $rarity }) =>
      $isEmpty
        ? 'rgba(64, 112, 192, 0.12)'
        : `${RARITY_COLOR[$rarity || 'common']}44`};
  transition: all 0.15s ease;
  padding: 0;
  ${reducedMotion}

  ${({ $rarity, $isEmpty }) =>
    !$isEmpty &&
    $rarity === 'legendary' &&
    css`
      animation: ${legendaryPulse} 3s ease-in-out infinite;
      will-change: box-shadow;
    `}

  &:hover:not([disabled]) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px
      ${({ $rarity }) => ($rarity ? RARITY_GLOW[$rarity] : 'transparent')};
  }

  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
`;

const SlotImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
`;

const SlotEmoji = styled.span`
  font-size: 1.75rem;
  line-height: 1;
`;

const EmptySlotIcon = styled.span`
  font-size: 1.5rem;
  color: rgba(64, 112, 192, 0.25);
  font-family: 'Fira Code', monospace;
`;

const EmptyMessage = styled.p`
  font-size: 0.85rem;
  color: #b8c9db;
  font-family: 'Sora', sans-serif;
  text-align: center;
  padding: 1rem;
  margin: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface ProfileBadgeShowcaseProps {
  badges: UserBadge[];
  onBadgeClick: (badge: UserBadge) => void;
  maxSlots?: number;
  className?: string;
}

const SLOT_COUNT = 6;

const ProfileBadgeShowcase: React.FC<ProfileBadgeShowcaseProps> = React.memo(
  ({ badges, onBadgeClick, maxSlots = SLOT_COUNT, className }) => {
    // Sort by rarity (legendary first), then XP, take top N earned badges
    const topBadges = useMemo(() => {
      const order: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return badges
        .filter((b) => b.progress >= b.maxProgress)
        .map((b) => ({ ...b, iconUrl: b.iconUrl || getBadgeImage(b.name, 'glass') }))
        .sort((a, b) => {
          const rd = (order[a.rarity] ?? 4) - (order[b.rarity] ?? 4);
          return rd !== 0 ? rd : b.xpReward - a.xpReward;
        })
        .slice(0, maxSlots);
    }, [badges, maxSlots]);

    const emptySlotCount = Math.max(0, maxSlots - topBadges.length);
    const hasNoBadges = topBadges.length === 0;

    return (
      <Container className={className} role="region" aria-label="Achievement badges">
        <Header>
          <SectionTitle>
            <Award size={18} />
            Achievements
          </SectionTitle>
        </Header>

        {hasNoBadges && badges.length === 0 ? (
          <EmptyMessage>
            No badges earned yet — complete workouts to unlock!
          </EmptyMessage>
        ) : (
          <BadgeGrid>
            {topBadges.map((badge) => (
              <BadgeSlot
                key={badge.id}
                $rarity={badge.rarity}
                $isEmpty={false}
                onClick={() => onBadgeClick(badge)}
                aria-label={`${badge.title} — ${badge.rarity}`}
              >
                {badge.iconUrl ? (
                  <SlotImage src={badge.iconUrl} alt={badge.title} loading="lazy" />
                ) : (
                  <SlotEmoji role="img" aria-label={badge.title}>
                    {badge.iconEmoji || '?'}
                  </SlotEmoji>
                )}
              </BadgeSlot>
            ))}
            {Array.from({ length: emptySlotCount }).map((_, i) => (
              <BadgeSlot key={`empty-${i}`} $isEmpty={true} disabled aria-label="Empty badge slot">
                <EmptySlotIcon>?</EmptySlotIcon>
              </BadgeSlot>
            ))}
          </BadgeGrid>
        )}
      </Container>
    );
  }
);

ProfileBadgeShowcase.displayName = 'ProfileBadgeShowcase';

export default ProfileBadgeShowcase;
