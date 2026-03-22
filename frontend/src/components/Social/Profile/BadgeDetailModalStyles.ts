/**
 * ============================================================================
 * FILE: BadgeDetailModalStyles.ts
 * PURPOSE: Styled components for BadgeDetailModal
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Extracts styled components from BadgeDetailModal to
 * respect the 300-line file limit. Uses Crystalline Swan theme tokens.
 */

import styled, { keyframes, css } from 'styled-components';
import { T, RARITY_CONFIG, type ProfileBadge } from './ProfileBadgeShowcaseTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const legendaryGlow = keyframes`
  0%, 100% { box-shadow: 0 0 24px rgba(198,168,75,0.3), 0 0 48px rgba(139,92,246,0.15); }
  50% { box-shadow: 0 0 40px rgba(198,168,75,0.5), 0 0 72px rgba(139,92,246,0.25); }
`;

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: ${fadeIn} 0.2s ease-out;
  ${reducedMotion}
`;

export const ModalContainer = styled.div`
  position: relative;
  background: ${T.royalDepth};
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 20px;
  padding: 2rem;
  max-width: 420px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideUp} 0.3s ease-out;
  ${reducedMotion}

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: rgba(0, 32, 96, 0.2); border-radius: 8px; }
  &::-webkit-scrollbar-thumb { background: ${T.swanLavender}; border-radius: 8px; }
  &::-webkit-scrollbar-thumb:hover { background: ${T.iceWing}; }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${T.frostWhite};
  cursor: pointer;
  transition: all 0.15s ease;
  ${reducedMotion}

  &:hover { background: rgba(96, 192, 240, 0.2); }
  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Badge Image
// ─────────────────────────────────────────────────────────────

export const BadgeImageWrapper = styled.div<{ $rarity: ProfileBadge['rarity'] }>`
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid ${({ $rarity }) => `${RARITY_CONFIG[$rarity].color}66`};
  ${({ $rarity }) => $rarity === 'legendary' && css`
    animation: ${legendaryGlow} 3s ease-in-out infinite;
    will-change: box-shadow;
  `}
  ${reducedMotion}
`;

export const BadgeImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
`;

export const BadgeEmoji = styled.span`
  font-size: 3.5rem;
  line-height: 1;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Text Content
// ─────────────────────────────────────────────────────────────

export const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${T.frostWhite};
  text-align: center;
  margin-bottom: 0.5rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const RarityTag = styled.div<{ $rarity: ProfileBadge['rarity'] }>`
  display: inline-block;
  margin: 0 auto 1rem;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Sora', sans-serif;
  color: ${T.frostWhite};
  background: ${({ $rarity }) => `${RARITY_CONFIG[$rarity].color}22`};
  border: 1px solid ${({ $rarity }) => `${RARITY_CONFIG[$rarity].color}44`};
  text-align: center;
  width: fit-content;
`;

export const RarityCenter = styled.div`
  display: flex;
  justify-content: center;
`;

export const Description = styled.p`
  font-size: 0.9rem;
  color: #b8c9db;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 1.25rem;
`;

export const XpValue = styled.div<{ $rarity: ProfileBadge['rarity'] }>`
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ $rarity }) => RARITY_CONFIG[$rarity].color};
  margin-bottom: 1rem;
  font-family: 'Fira Code', monospace;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Progress
// ─────────────────────────────────────────────────────────────

export const ProgressSection = styled.div`
  margin-bottom: 1.25rem;
`;

export const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

export const ProgressFill = styled.div<{ $pct: number; $rarity: ProfileBadge['rarity'] }>`
  height: 100%;
  border-radius: 4px;
  width: ${({ $pct }) => $pct}%;
  transition: width 0.8s ease;
  background: ${({ $rarity }) => {
    switch ($rarity) {
      case 'legendary': return `linear-gradient(90deg, ${T.gildedFern}, ${T.wingPurple})`;
      case 'epic':      return `linear-gradient(90deg, ${T.wingPurple}, ${T.arcticCyan})`;
      case 'rare':      return `linear-gradient(90deg, ${T.gildedFern}, ${T.iceWing})`;
      default:          return `linear-gradient(90deg, ${T.swanLavender}, ${T.iceWing})`;
    }
  }};
  ${reducedMotion}
`;

export const ProgressText = styled.div`
  font-size: 0.8rem;
  color: #b8c9db;
  text-align: center;
  font-family: 'Fira Code', monospace;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Footer
// ─────────────────────────────────────────────────────────────

export const DateRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #b8c9db;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  font-family: 'Sora', sans-serif;
`;

export const ShareButton = styled.button`
  width: 100%;
  min-height: 48px;
  background: ${T.midnightSapphire};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: ${T.frostWhite};
  font-size: 0.9rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
  ${reducedMotion}

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  &:focus-visible {
    outline: 2px solid ${T.iceWing};
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4);
  }
`;
