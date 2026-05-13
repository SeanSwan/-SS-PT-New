/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BadgeDetailModal (UserDashboard)                  ║
 * ║  PURPOSE: Modal showing full badge details + share button     ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────┐
 * │  [X Close]                           │
 * │     ┌────────────┐                   │
 * │     │  Badge Art  │  (120x120)       │
 * │     └────────────┘                   │
 * │     Badge Title                      │
 * │     [Rarity Tag]                     │
 * │     Description text                 │
 * │     +250 XP                          │
 * │     ═══════════ 75% ═══════════      │
 * │     Earned: Mar 15, 2026             │
 * │     [  Share Badge  ]                │
 * └──────────────────────────────────────┘
 *
 *
 * CLICK-OUTCOME FLOWCHART:
 * [X button] -> onClose() -> modal closes
 * [Backdrop] -> onClose() -> modal closes
 * [Escape key] -> onClose() -> modal closes
 * [Share button] -> copies badge text to clipboard or triggers onShare
 *
 * DATA FLOW:
 * Props In:  { badge: UserBadge | null, isOpen: boolean, onClose: () => void }
 * State:     { imgLoaded, imgError }
 * Children:  None (leaf component)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { X, Share2, Calendar, Sparkles } from 'lucide-react';
import type { UserBadge } from './ProfileBadgeShowcase';
import type { Rarity } from '../../../types/gamification';
import { logger } from '@/utils/logger';

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
  arcticCyan: '#50A0F0',
} as const;

const RARITY_CFG: Record<Rarity, { color: string; label: string }> = {
  common:    { color: T.swanLavender, label: 'Common' },
  rare:      { color: T.gildedFern,   label: 'Rare' },
  epic:      { color: T.wingPurple,   label: 'Epic' },
  legendary: { color: T.gildedFern,   label: 'Legendary' },
};

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

const rm = css`@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  animation: ${fadeIn} 0.2s ease-out;
  ${rm}

  @supports not (backdrop-filter: blur(4px)) {
    background: rgba(10, 10, 15, 0.92);
  }
`;

const Modal = styled.div`
  position: relative;
  background: ${T.royalDepth};
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 20px;
  padding: 2rem;
  max-width: 420px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  animation: ${slideUp} 0.3s ease-out;
  ${rm}

  @media (max-width: 480px) {
    max-width: 100%; border-radius: 20px 20px 0 0;
    position: fixed; bottom: 0; left: 0; right: 0;
    max-height: 85vh;
  }
`;

const CloseBtn = styled.button`
  position: absolute; top: 1rem; right: 1rem;
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 50%; width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  color: ${T.frostWhite}; cursor: pointer;
  transition: all 0.15s ease; ${rm}

  &:hover { background: rgba(96, 192, 240, 0.2); }
  &:focus-visible {
    outline: 2px solid ${T.iceWing}; outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2);
  }
`;

const ImgWrap = styled.div<{ $rarity: Rarity }>`
  width: 120px; height: 120px; margin: 0 auto 1.5rem;
  border-radius: 20px; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  border: 2px solid ${({ $rarity }) => `${RARITY_CFG[$rarity].color}66`};
  ${({ $rarity }) => $rarity === 'legendary' && css`animation: ${legendaryGlow} 3s ease-in-out infinite; will-change: box-shadow;`}
  ${rm}
`;

const Img = styled.img`width: 100%; height: 100%; object-fit: cover; border-radius: 18px;`;
const Emoji = styled.span`font-size: 3.5rem; line-height: 1;`;

const Title = styled.h2`
  font-size: 1.5rem; font-weight: 700; color: ${T.frostWhite};
  text-align: center; margin-bottom: 0.5rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const RarityTag = styled.div<{ $rarity: Rarity }>`
  display: inline-block; margin: 0 auto 1rem; padding: 4px 12px;
  border-radius: 12px; font-size: 0.75rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  font-family: 'Sora', sans-serif; color: ${T.frostWhite};
  background: ${({ $rarity }) => `${RARITY_CFG[$rarity].color}22`};
  border: 1px solid ${({ $rarity }) => `${RARITY_CFG[$rarity].color}44`};
  width: fit-content;
`;

const Center = styled.div`display: flex; justify-content: center;`;

const Desc = styled.p`
  font-size: 0.9rem; color: #b8c9db; text-align: center;
  line-height: 1.6; margin-bottom: 1.25rem;
`;

const XpVal = styled.div<{ $rarity: Rarity }>`
  text-align: center; font-weight: 700; font-size: 1.1rem;
  color: ${({ $rarity }) => RARITY_CFG[$rarity].color};
  margin-bottom: 1rem; font-family: 'Fira Code', monospace;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
`;

const ProgBar = styled.div`
  width: 100%; height: 8px; background: rgba(96,192,240,0.08);
  border-radius: 4px; overflow: hidden; margin-bottom: 0.5rem;
`;

const ProgFill = styled.div<{ $pct: number; $rarity: Rarity }>`
  height: 100%; border-radius: 4px;
  width: ${({ $pct }) => $pct}%;
  transition: width 0.8s ease; ${rm}
  background: ${({ $rarity }) => {
    if ($rarity === 'legendary') return `linear-gradient(90deg, ${T.gildedFern}, ${T.wingPurple})`;
    if ($rarity === 'epic') return `linear-gradient(90deg, ${T.wingPurple}, ${T.arcticCyan})`;
    if ($rarity === 'rare') return `linear-gradient(90deg, ${T.gildedFern}, ${T.iceWing})`;
    return `linear-gradient(90deg, ${T.swanLavender}, ${T.iceWing})`;
  }};
`;

const ProgText = styled.div`font-size: 0.8rem; color: #b8c9db; text-align: center; font-family: 'Fira Code', monospace;`;
const DateRow = styled.div`display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #b8c9db; font-size: 0.85rem; margin-bottom: 1.5rem; font-family: 'Sora', sans-serif;`;

const ShareBtn = styled.button`
  width: 100%; min-height: 48px;
  background: ${T.midnightSapphire};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px; color: ${T.frostWhite};
  font-size: 0.9rem; font-weight: 600; font-family: 'Sora', sans-serif;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: all 0.15s ease; ${rm}

  &:hover { background: rgba(139,92,246,0.15); box-shadow: 0 0 20px rgba(139,92,246,0.3); }
  &:focus-visible {
    outline: 2px solid ${T.iceWing}; outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96,192,240,0.4), inset 0 0 0 1px rgba(139,92,246,0.2);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface BadgeDetailModalProps {
  badge: UserBadge | null;
  isOpen: boolean;
  onClose: () => void;
}

const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({ badge, isOpen, onClose }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgLoaded(false); setImgError(false); }, [badge?.id]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !badge) return null;

  const isEarned = badge.progress >= badge.maxProgress;
  const pct = badge.maxProgress > 0 ? Math.min((badge.progress / badge.maxProgress) * 100, 100) : 0;

  const handleShare = () => {
    const text = `I earned the "${badge.title}" badge on SwanStudios! (+${badge.xpReward} XP)`;
    navigator.clipboard.writeText(text).catch(() => {
      logger.warn('TODO: clipboard fallback');
    });
  };

  const earnedDate = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true" aria-label={`${badge.title} badge details`}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close badge details"><X size={20} /></CloseBtn>

        <ImgWrap $rarity={badge.rarity}>
          {badge.iconUrl && !imgError ? (
            <Img
              src={badge.iconUrl}
              alt={`${badge.title} badge`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{ display: imgLoaded ? 'block' : 'none' }}
            />
          ) : (
            <Emoji role="img" aria-label={badge.title}>{badge.iconEmoji || '?'}</Emoji>
          )}
        </ImgWrap>

        <Title>{badge.title}</Title>
        <Center><RarityTag $rarity={badge.rarity}>{RARITY_CFG[badge.rarity].label}</RarityTag></Center>
        <Desc>{badge.description}</Desc>
        <XpVal $rarity={badge.rarity}><Sparkles size={18} />+{badge.xpReward.toLocaleString()} XP</XpVal>

        <div style={{ marginBottom: '1.25rem' }}>
          <ProgBar><ProgFill $pct={pct} $rarity={badge.rarity} /></ProgBar>
          <ProgText>{badge.progress} / {badge.maxProgress}{isEarned ? ' — Completed' : ` — ${Math.round(pct)}%`}</ProgText>
        </div>

        {earnedDate && <DateRow><Calendar size={16} />Earned {earnedDate}</DateRow>}
        {isEarned && <ShareBtn onClick={handleShare}><Share2 size={18} />Share Badge</ShareBtn>}
      </Modal>
    </Backdrop>
  );
};

BadgeDetailModal.displayName = 'BadgeDetailModal';

export default BadgeDetailModal;
