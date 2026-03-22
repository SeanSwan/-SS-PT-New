/**
 * ============================================================================
 * FILE: BadgesTabStyles.ts
 * PURPOSE: Styled components for BadgesTab virtualized badge grid
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Extracts styled components from BadgesTab to respect
 * the 300-line file limit. All components use Crystalline Swan theme tokens.
 */

import styled, { keyframes, css } from 'styled-components';
import { T, RARITY_CONFIG, type ProfileBadge } from './ProfileBadgeShowcaseTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const legendaryPulse = keyframes`
  0%, 100% { box-shadow: 0 0 14px rgba(198,168,75,0.25); }
  50% { box-shadow: 0 0 24px rgba(198,168,75,0.45); }
`;

export const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const Header = styled.div`
  padding: 1.5rem 1.5rem 0;

  @media (max-width: 768px) {
    padding: 1rem 1rem 0;
  }
`;

export const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${T.frostWhite};
  margin: 0 0 0.25rem;
`;

export const Subtitle = styled.p`
  font-size: 0.85rem;
  color: #b8c9db;
  margin: 0 0 1rem;
  font-family: 'Sora', sans-serif;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Search
// ─────────────────────────────────────────────────────────────

export const SearchWrapper = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

export const SearchInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 1rem 0 2.75rem;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  color: ${T.frostWhite};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  outline: none;
  transition: border-color 0.15s ease;
  ${reducedMotion}

  &::placeholder { color: rgba(224, 236, 244, 0.4); }
  &:focus {
    border-color: ${T.iceWing};
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.2);
  }
`;

export const SearchIcon = styled.div`
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(224, 236, 244, 0.4);
  pointer-events: none;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Filter Chips
// ─────────────────────────────────────────────────────────────

export const FilterRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`;

export const FilterChip = styled.button<{ $active: boolean; $color?: string }>`
  min-height: 44px;
  padding: 0.4rem 0.85rem;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  ${reducedMotion}

  background: ${({ $active, $color }) =>
    $active ? `${$color || T.iceWing}22` : 'rgba(0, 32, 96, 0.2)'};
  border: 1px solid ${({ $active, $color }) =>
    $active ? `${$color || T.iceWing}66` : 'rgba(96, 192, 240, 0.1)'};
  color: ${({ $active }) => $active ? T.frostWhite : '#b8c9db'};

  &:hover {
    background: ${({ $color }) => `${$color || T.iceWing}15`};
    border-color: ${({ $color }) => `${$color || T.iceWing}44`};
  }
  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 2px;
  }
`;

export const CountBadge = styled.span`
  font-size: 0.8rem;
  color: #b8c9db;
  padding: 0.5rem 1.5rem;
  font-family: 'Fira Code', monospace;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Grid Area (wraps virtualized list)
// ─────────────────────────────────────────────────────────────

export const GridArea = styled.div`
  flex: 1;
  padding: 0 1.5rem 1.5rem;
  overflow: hidden;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: rgba(0, 32, 96, 0.2); border-radius: 8px; }
  &::-webkit-scrollbar-thumb { background: ${T.swanLavender}; border-radius: 8px; }
  &::-webkit-scrollbar-thumb:hover { background: ${T.iceWing}; }

  @media (max-width: 768px) {
    padding: 0 1rem 1rem;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Badge Card
// ─────────────────────────────────────────────────────────────

export const BadgeCard = styled.button<{
  $rarity: ProfileBadge['rarity'];
  $earned: boolean;
}>`
  width: 120px;
  height: 120px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem;
  cursor: pointer;
  background: ${T.royalDepth};
  border: 1.5px solid ${({ $earned, $rarity }) =>
    $earned ? `${RARITY_CONFIG[$rarity].color}44` : 'rgba(64, 112, 192, 0.1)'};
  transition: transform 150ms ease-in-out, box-shadow 150ms ease-in-out;
  ${reducedMotion}

  ${({ $earned }) => !$earned && css`
    filter: grayscale(60%);
    opacity: 0.5;
  `}

  ${({ $rarity, $earned }) => $earned && $rarity === 'legendary' && css`
    animation: ${legendaryPulse} 3s ease-in-out infinite;
    will-change: box-shadow;
  `}

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 24px ${({ $rarity }) => RARITY_CONFIG[$rarity].glow};
  }
  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4);
  }
`;

export const CardImage = styled.img`
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 10px;
`;

export const CardEmoji = styled.span`
  font-size: 2rem;
  line-height: 1;
`;

export const CardTitle = styled.span<{ $earned: boolean }>`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ $earned }) => $earned ? T.frostWhite : `${T.frostWhite}55`};
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  font-family: 'Sora', sans-serif;
`;

export const RarityDot = styled.div<{ $rarity: ProfileBadge['rarity'] }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $rarity }) => RARITY_CONFIG[$rarity].color};
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #b8c9db;
  font-family: 'Sora', sans-serif;
  text-align: center;
  gap: 0.5rem;
`;
