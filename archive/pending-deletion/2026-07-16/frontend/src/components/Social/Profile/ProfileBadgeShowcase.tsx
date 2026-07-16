/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ProfileBadgeShowcase                              ║
 * ║  PURPOSE: Shows top 6 earned badges on user profile header    ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌───────────────────────────────────────────────────────┐
 * │  Achievements                                         │
 * │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
 * │  │Badge1│ │Badge2│ │Badge3│ │  ?   │ │  ?   │ │  ?   │ │
 * │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
 * └───────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { badges: ProfileBadge[], onViewAll?: () => void }
 * State:     { selectedBadge }
 * Children:  BadgeDetailModal
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Badge icon] -> Opens BadgeDetailModal with badge details
 * [Empty slot] -> No action (disabled)
 * [View All link] -> onViewAll() -> navigates to full badges tab
 *
 * GAMIFICATION HOOKS:
 * - Badge display only (no point awards from this component)
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Award } from 'lucide-react';
import { T, RARITY_CONFIG, type ProfileBadge } from './ProfileBadgeShowcaseTypes';
import { BadgeDetailModal } from './BadgeDetailModal';
import { getBadgeImage } from '../../../utils/badgeImageResolver';

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

const ViewAllLink = styled.button`
  background: none;
  border: none;
  color: ${T.iceWing};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  transition: color 0.15s ease;
  ${reducedMotion}

  &:hover { color: ${T.wingPurple}; }
  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 4px;
  }
`;

const BadgeGrid = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const BadgeSlot = styled.button<{
  $rarity?: ProfileBadge['rarity'];
  $isEmpty: boolean;
}>`
  width: 64px;
  height: 64px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: ${({ $isEmpty }) => $isEmpty ? 'default' : 'pointer'};
  background: ${({ $isEmpty }) => $isEmpty
    ? 'rgba(64, 112, 192, 0.06)'
    : T.royalDepth};
  border: 2px solid ${({ $isEmpty, $rarity }) =>
    $isEmpty
      ? 'rgba(64, 112, 192, 0.12)'
      : `${RARITY_CONFIG[$rarity || 'common'].color}44`};
  transition: all 0.15s ease;
  padding: 0;
  ${reducedMotion}

  ${({ $rarity, $isEmpty }) => !$isEmpty && $rarity === 'legendary' && css`
    animation: ${legendaryPulse} 3s ease-in-out infinite;
    will-change: box-shadow;
  `}

  &:hover:not([disabled]) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px ${({ $rarity }) =>
      $rarity ? RARITY_CONFIG[$rarity].glow : 'transparent'};
  }

  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4);
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

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface ProfileBadgeShowcaseProps {
  badges: ProfileBadge[];
  onViewAll?: () => void;
  onShare?: (badge: ProfileBadge) => void;
  maxSlots?: number;
  className?: string;
}

const SLOT_COUNT = 6;

export const ProfileBadgeShowcase: React.FC<ProfileBadgeShowcaseProps> = ({
  badges,
  onViewAll,
  onShare,
  maxSlots = SLOT_COUNT,
  className,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<ProfileBadge | null>(null);

  // Get top earned badges, sorted by rarity (legendary first) then XP
  const topBadges = useMemo(() => {
    const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return badges
      .filter(b => b.progress >= b.maxProgress)
      .map(b => ({
        ...b,
        iconUrl: b.iconUrl || getBadgeImage(b.name, 'glass'),
      }))
      .sort((a, b) => {
        const rarityDiff = (rarityOrder[a.rarity] ?? 4) - (rarityOrder[b.rarity] ?? 4);
        if (rarityDiff !== 0) return rarityDiff;
        return b.xpReward - a.xpReward;
      })
      .slice(0, maxSlots);
  }, [badges, maxSlots]);

  // Pad with empty slots up to maxSlots
  const emptySlotCount = Math.max(0, maxSlots - topBadges.length);

  return (
    <Container className={className} role="region" aria-label="Achievement badges">
      <Header>
        <SectionTitle>
          <Award size={18} />
          Achievements
        </SectionTitle>
        {onViewAll && (
          <ViewAllLink onClick={onViewAll}>
            View All
          </ViewAllLink>
        )}
      </Header>

      <BadgeGrid>
        {topBadges.map((badge) => (
          <BadgeSlot
            key={badge.id}
            $rarity={badge.rarity}
            $isEmpty={false}
            onClick={() => setSelectedBadge(badge)}
            aria-label={`${badge.title} — ${RARITY_CONFIG[badge.rarity].label}`}
          >
            {badge.iconUrl ? (
              <SlotImage
                src={badge.iconUrl}
                alt={badge.title}
                loading="lazy"
              />
            ) : (
              <SlotEmoji role="img" aria-label={badge.title}>
                {badge.iconEmoji || '?'}
              </SlotEmoji>
            )}
          </BadgeSlot>
        ))}

        {Array.from({ length: emptySlotCount }).map((_, i) => (
          <BadgeSlot
            key={`empty-${i}`}
            $isEmpty={true}
            disabled
            aria-label="Empty badge slot"
          >
            <EmptySlotIcon>?</EmptySlotIcon>
          </BadgeSlot>
        ))}
      </BadgeGrid>

      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
        onShare={onShare}
      />
    </Container>
  );
};

export default ProfileBadgeShowcase;
