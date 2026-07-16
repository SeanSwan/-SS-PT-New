/**
 * ┌─── SUB-COMPONENT: BadgeShowcase ───────────────────────────┐
 * │ PARENT: UserProfilePage                                     │
 * │ PURPOSE: Drag-and-drop badge showcase (top 6 slots)         │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ 🏆 Badge Showcase                │                        │
 * │ │ [🥇] [🏋] [🔥] [⭐] [🎯] [  ]  │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { badges, onReorder?, editable? }                    │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Drag badge] → reorder slots → saves to user preferences   │
 * │ [Click badge] → shows badge detail tooltip                  │
 * │ GAMIFICATION: Displays user's pinned achievement badges     │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Award } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface ShowcaseBadge {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const RARITY_COLORS: Record<string, string> = {
  common: '#4070C0',
  rare: '#C6A84B',
  epic: '#8B5CF6',
  legendary: '#60C0F0',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface BadgeShowcaseProps {
  badges: ShowcaseBadge[];
  maxSlots?: number;
  editable?: boolean;
  onReorder?: (badges: ShowcaseBadge[]) => void;
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = memo(({
  badges,
  maxSlots = 6,
  editable = false,
  onReorder,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ idx: number; badge: ShowcaseBadge } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const slots = Array.from({ length: maxSlots }, (_, i) => badges[i] || null);

  const handleDragStart = useCallback((idx: number) => {
    if (!editable) return;
    setDragIndex(idx);
  }, [editable]);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setHoverIndex(idx);
  }, []);

  const handleDrop = useCallback((idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setHoverIndex(null);
      return;
    }
    const newBadges = [...badges];
    const [moved] = newBadges.splice(dragIndex, 1);
    newBadges.splice(idx, 0, moved);
    onReorder?.(newBadges);
    setDragIndex(null);
    setHoverIndex(null);
  }, [dragIndex, badges, onReorder]);

  const showTooltip = (idx: number, badge: ShowcaseBadge) => {
    tooltipTimer.current = setTimeout(() => setTooltip({ idx, badge }), 400);
  };

  const hideTooltip = () => {
    clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  if (!badges.length && !editable) return null;

  return (
    <ShowcaseWrap>
      <ShowcaseTitle>
        <Award size={14} />
        Badge Showcase
      </ShowcaseTitle>
      <SlotGrid>
        {slots.map((badge, idx) => (
          <Slot
            key={idx}
            $color={badge ? RARITY_COLORS[badge.rarity] : undefined}
            $empty={!badge}
            $dragging={dragIndex === idx}
            $hoverTarget={hoverIndex === idx && dragIndex !== null}
            draggable={editable && !!badge}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => { setDragIndex(null); setHoverIndex(null); }}
            onMouseEnter={() => badge && showTooltip(idx, badge)}
            onMouseLeave={hideTooltip}
            onFocus={() => badge && showTooltip(idx, badge)}
            onBlur={hideTooltip}
            tabIndex={badge ? 0 : -1}
            role={badge ? 'button' : 'presentation'}
            aria-label={badge?.name || 'Empty slot'}
          >
            {badge ? (
              badge.iconUrl ? (
                <BadgeImg src={badge.iconUrl} alt={badge.name} />
              ) : (
                <BadgeFallback $color={RARITY_COLORS[badge.rarity]}>
                  <Award size={20} />
                </BadgeFallback>
              )
            ) : editable ? (
              <EmptySlot>+</EmptySlot>
            ) : null}

            {tooltip?.idx === idx && (
              <Tooltip>
                <TooltipName>{tooltip.badge.name}</TooltipName>
                {tooltip.badge.description && (
                  <TooltipDesc>{tooltip.badge.description}</TooltipDesc>
                )}
                <TooltipRarity $color={RARITY_COLORS[tooltip.badge.rarity]}>
                  {tooltip.badge.rarity}
                </TooltipRarity>
              </Tooltip>
            )}
          </Slot>
        ))}
      </SlotGrid>
    </ShowcaseWrap>
  );
});

BadgeShowcase.displayName = 'BadgeShowcase';
export default BadgeShowcase;

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const ShowcaseWrap = styled.div`
  margin: 16px 0;
`;

const ShowcaseTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin: 0 0 10px;
`;

const SlotGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Slot = styled.div<{
  $color?: string;
  $empty: boolean;
  $dragging: boolean;
  $hoverTarget: boolean;
}>`
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $color, $empty, $hoverTarget }) =>
    $hoverTarget ? 'var(--accent-primary, #60C0F0)' :
    $empty ? 'var(--border-soft, rgba(96, 192, 240, 0.08))' :
    ($color || 'var(--border-soft, rgba(96, 192, 240, 0.08))')};
  cursor: ${({ $empty }) => $empty ? 'default' : 'grab'};
  opacity: ${({ $dragging }) => $dragging ? 0.4 : 1};
  transition: border-color 0.2s ease, transform 0.15s ease, opacity 0.2s ease;

  &:hover:not([aria-label="Empty slot"]) {
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const BadgeImg = styled.img`
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 6px;
`;

const BadgeFallback = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

const EmptySlot = styled.span`
  font-size: 20px;
  color: var(--text-muted, rgba(224, 236, 244, 0.15));
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--bg-base, #030712);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
`;

const TooltipName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const TooltipDesc = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-top: 2px;
`;

const TooltipRarity = styled.span<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
`;
