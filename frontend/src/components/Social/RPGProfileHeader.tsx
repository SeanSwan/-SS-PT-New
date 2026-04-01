/**
 * ============================================================================
 * FILE: RPGProfileHeader.tsx
 * PURPOSE: Compact RPG identity display (level, tier, job class, XP)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a compact inline RPG identity bar showing the user's tier badge,
 * level, optional job class, and XP. Used in post headers and profile pages
 * to surface gamification data alongside social content.
 *
 * HOW IT FITS IN THE APP:
 * Gamification API -> gamificationSlice -> RPGProfileHeader props
 * Embedded in PostCard headers and UserProfilePage hero sections.
 *
 * KEY DECISIONS:
 * - Tier colors match CLAUDE.md rarity system exactly
 * - color-mix() for transparent backgrounds (no hardcoded rgba)
 * - Compact mode hides XP for tight spaces (post headers)
 *
 * ┌─── SUB-COMPONENT: RPGProfileHeader ───────────────────────┐
 * │ PARENT: PostCard, UserProfilePage                           │
 * │ PURPOSE: Compact RPG identity display (level, tier, class)  │
 * │ WIREFRAME:                                                   │
 * │ ┌───────────────────────────────────────────┐               │
 * │ │ [TierIcon] Lv.42  IRON VANGUARD  12,350 XP│               │
 * │ └───────────────────────────────────────────┘               │
 * │ Props: { level, tier, xp?, jobClass?, compact? }             │
 * │ CLICK-OUTCOMES: None (display-only)                          │
 * │ GAMIFICATION: Displays user tier/level/XP from state         │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { Shield, Sword, Star, Flame } from 'lucide-react';
import type { TierName } from '../../types/gamification';

// ─────────────────────────────────────────────────────────────
// SECTION: Tier Configuration
// PURPOSE: Map tier names to display colors and icons
// WHY: Matches CLAUDE.md 5-Tier Progression System exactly
// ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<TierName, { label: string; color: string; icon: React.ReactNode }> = {
  bronze_forge:      { label: 'Bronze',      color: '#CD7F32', icon: <Shield size={12} /> },
  silver_edge:       { label: 'Silver',      color: '#C0C0C0', icon: <Shield size={12} /> },
  titanium_core:     { label: 'Titanium',    color: '#878681', icon: <Sword size={12} /> },
  obsidian_warrior:  { label: 'Obsidian',    color: '#3D3D3D', icon: <Star size={12} /> },
  crystalline_swan:  { label: 'Crystalline', color: '#60C0F0', icon: <Flame size={12} /> },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Job Class Labels
// PURPOSE: Human-readable names for RPG job classes
// ─────────────────────────────────────────────────────────────

const JOB_LABELS: Record<string, string> = {
  iron_vanguard: 'Iron Vanguard',
  swift_striker: 'Swift Striker',
  titan_guardian: 'Titan Guardian',
  sage_healer: 'Sage Healer',
  shadow_dancer: 'Shadow Dancer',
  beast_tamer: 'Beast Tamer',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface RPGProfileHeaderProps {
  level: number;
  tier: TierName;
  xp?: number;
  jobClass?: string | null;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders inline RPG identity bar
// ─────────────────────────────────────────────────────────────

const RPGProfileHeader: React.FC<RPGProfileHeaderProps> = memo(({
  level,
  tier,
  xp,
  jobClass,
  compact = false,
}) => {
  const tierInfo = TIER_CONFIG[tier] || TIER_CONFIG.bronze_forge;

  return (
    <RPGWrap $compact={compact}>
      <TierBadge $color={tierInfo.color} title={`${tierInfo.label} Tier`}>
        {tierInfo.icon}
      </TierBadge>
      <LevelTag>Lv.{level}</LevelTag>
      {jobClass && JOB_LABELS[jobClass] && (
        <JobTag>{JOB_LABELS[jobClass]}</JobTag>
      )}
      {!compact && xp !== undefined && (
        <XPTag>{xp.toLocaleString()} XP</XPTag>
      )}
    </RPGWrap>
  );
});

RPGProfileHeader.displayName = 'RPGProfileHeader';
export default RPGProfileHeader;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first RPG identity styles with theme CSS vars
// WHY: color-mix() for dynamic opacity on tier/accent colors
// ─────────────────────────────────────────────────────────────

const RPGWrap = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ $compact }) => $compact ? '4px' : '6px'};
  flex-wrap: wrap;
`;

const TierBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
  color: ${({ $color }) => $color};
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 40%, transparent);
`;

const LevelTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
`;

const JobTag = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const XPTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
`;
