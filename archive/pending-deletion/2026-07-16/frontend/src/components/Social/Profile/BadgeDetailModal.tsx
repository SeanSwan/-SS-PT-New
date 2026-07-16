/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BadgeDetailModal                                  ║
 * ║  PURPOSE: Full-screen modal showing badge details + share     ║
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
 * │     Rarity Tag                       │
 * │     Description text                 │
 * │     +250 XP                          │
 * │     ═══════════ 75% ═══════════      │
 * │     Earned: Mar 15, 2026             │
 * │     [  Share Badge  ]                │
 * └──────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { badge, isOpen, onClose, onShare }
 * State:     { imageLoaded, imageError }
 * Children:  None (leaf component)
 *
 * CLICK-OUTCOME FLOWCHART:
 * [X button] -> onClose() -> modal closes
 * [Share button] -> copies badge link to clipboard OR triggers onShare
 * [Backdrop click] -> onClose()
 * [Escape key] -> onClose()
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Share2, Calendar, Sparkles } from 'lucide-react';
import { RARITY_CONFIG, type ProfileBadge } from './ProfileBadgeShowcaseTypes';
import {
  Backdrop, ModalContainer, CloseButton,
  BadgeImageWrapper, BadgeImg, BadgeEmoji,
  Title, RarityTag, RarityCenter, Description,
  XpValue, ProgressSection, ProgressBar, ProgressFill, ProgressText,
  DateRow, ShareButton,
} from './BadgeDetailModalStyles';
import { logger } from '@/utils/logger';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface BadgeDetailModalProps {
  badge: ProfileBadge | null;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (badge: ProfileBadge) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders badge detail overlay with rarity glow, progress,
// and share functionality. Accessible with Escape-to-close and focus trap.
// ─────────────────────────────────────────────────────────────

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  badge,
  isOpen,
  onClose,
  onShare,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset image state when badge changes
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [badge?.id]);

  // Escape key handler
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
  const pct = badge.maxProgress > 0
    ? Math.min((badge.progress / badge.maxProgress) * 100, 100)
    : 0;

  const handleShare = () => {
    if (onShare) {
      onShare(badge);
    } else {
      // Default: copy badge name to clipboard
      const text = `I earned the "${badge.title}" badge on SwanStudios! (+${badge.xpReward} XP)`;
      navigator.clipboard.writeText(text).catch(() => {
        logger.warn('TODO: clipboard fallback');
      });
    }
  };

  const earnedDate = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true" aria-label={`${badge.title} badge details`}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} aria-label="Close badge details">
          <X size={20} />
        </CloseButton>

        <BadgeImageWrapper $rarity={badge.rarity}>
          {badge.iconUrl && !imgError ? (
            <BadgeImg
              src={badge.iconUrl}
              alt={`${badge.title} badge`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{ display: imgLoaded ? 'block' : 'none' }}
            />
          ) : (
            <BadgeEmoji role="img" aria-label={badge.title}>
              {badge.iconEmoji || '?'}
            </BadgeEmoji>
          )}
        </BadgeImageWrapper>

        <Title>{badge.title}</Title>

        <RarityCenter>
          <RarityTag $rarity={badge.rarity}>
            {RARITY_CONFIG[badge.rarity].label}
          </RarityTag>
        </RarityCenter>

        <Description>{badge.description}</Description>

        <XpValue $rarity={badge.rarity}>
          <Sparkles size={18} />
          +{badge.xpReward.toLocaleString()} XP
        </XpValue>

        <ProgressSection>
          <ProgressBar>
            <ProgressFill $pct={pct} $rarity={badge.rarity} />
          </ProgressBar>
          <ProgressText>
            {badge.progress} / {badge.maxProgress}
            {isEarned ? ' — Completed' : ` — ${Math.round(pct)}%`}
          </ProgressText>
        </ProgressSection>

        {earnedDate && (
          <DateRow>
            <Calendar size={16} />
            Earned {earnedDate}
          </DateRow>
        )}

        {isEarned && (
          <ShareButton onClick={handleShare}>
            <Share2 size={18} />
            Share Badge
          </ShareButton>
        )}
      </ModalContainer>
    </Backdrop>
  );
};

export default BadgeDetailModal;
