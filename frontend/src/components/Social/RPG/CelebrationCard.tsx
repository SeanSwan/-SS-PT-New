/**
 * ┌─── SUB-COMPONENT: CelebrationCard ─────────────────────────┐
 * │ PARENT: SocialFeed (auto-generated posts)                   │
 * │ PURPOSE: Shareable celebration card for loot, achievements, │
 * │          level ups, streaks — RPG-themed visual cards        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ ✨ LEVEL UP!                     │                        │
 * │ │ Level 12 → Level 13             │                        │
 * │ │ Riverwing Tier                 │                        │
 * │ │ [Share to Feed]                  │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { type, data }                                       │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Share] → POST /api/social/posts (auto-celebration post)    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Trophy, Star, Flame, Zap, Gift, TrendingUp } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export type CelebrationType =
  | 'level_up'
  | 'achievement'
  | 'streak'
  | 'loot'
  | 'personal_record'
  | 'tier_up';

export interface CelebrationData {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  value?: string;
  color?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Config Maps
// ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<CelebrationType, { icon: React.ComponentType<any>; gradient: string; label: string }> = {
  level_up:       { icon: TrendingUp, gradient: 'linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%)', label: 'LEVEL UP' },
  achievement:    { icon: Trophy,     gradient: 'linear-gradient(135deg, #C6A84B 0%, #8B5CF6 100%)', label: 'ACHIEVEMENT' },
  streak:         { icon: Flame,      gradient: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)', label: 'STREAK' },
  loot:           { icon: Gift,       gradient: 'linear-gradient(135deg, #C6A84B 0%, #60C0F0 100%)', label: 'LOOT DROP' },
  personal_record:{ icon: Zap,        gradient: 'linear-gradient(135deg, #60C0F0 0%, #4ade80 100%)', label: 'NEW PR' },
  tier_up:        { icon: Star,       gradient: 'linear-gradient(135deg, #8B5CF6 0%, #C6A84B 100%)', label: 'TIER UP' },
};

const RARITY_BORDER: Record<string, string> = {
  common: 'rgba(64, 112, 192, 0.4)',
  rare: '#C6A84B',
  epic: '#8B5CF6',
  legendary: '#60C0F0',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface CelebrationCardProps {
  data: CelebrationData;
  onShare?: () => void;
}

const CelebrationCard: React.FC<CelebrationCardProps> = memo(({ data, onShare }) => {
  const config = TYPE_CONFIG[data.type] || TYPE_CONFIG.achievement;
  const Icon = config.icon;
  const borderColor = RARITY_BORDER[data.rarity || 'common'];

  return (
    <CardWrap $gradient={config.gradient} $borderColor={borderColor} $rarity={data.rarity || 'common'}>
      <CardLabel>{config.label}</CardLabel>
      <IconCircle>
        <Icon size={28} />
      </IconCircle>
      <CardTitle>{data.title}</CardTitle>
      {data.subtitle && <CardSubtitle>{data.subtitle}</CardSubtitle>}
      {data.value && <CardValue>{data.value}</CardValue>}
      {onShare && (
        <ShareBtn onClick={onShare}>Share to Feed</ShareBtn>
      )}
    </CardWrap>
  );
});

CelebrationCard.displayName = 'CelebrationCard';
export default CelebrationCard;

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const CardWrap = styled.div<{ $gradient: string; $borderColor: string; $rarity: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 20px 20px;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $borderColor }) => $borderColor};
  position: relative;
  overflow: hidden;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $gradient }) => $gradient};
    opacity: 0.06;
    pointer-events: none;
  }

  ${({ $rarity }) => $rarity === 'legendary' && `
    border-image: linear-gradient(135deg, #002060, #8B5CF6, #60C0F0, #C6A84B) 1;
  `}
`;

const CardLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const IconCircle = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
`;

const CardSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin: 0;
`;

const CardValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  background: linear-gradient(90deg, #60C0F0, #8B5CF6, #C6A84B, #60C0F0);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const ShareBtn = styled.button`
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s ease;

  &:hover { background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;
