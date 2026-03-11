/**
 * PhotoFeedback.tsx
 * =================
 * Thumbs up / thumbs down feedback pill overlay for gallery photo cards.
 * Designed by Gemini 3.1 Pro — Crystalline Swan palette.
 *
 * Features:
 * - Glassmorphism pill with 44px touch targets
 * - Optimistic UI updates with API fallback
 * - Spring-physics micro-animations
 * - Responsive: always visible on mobile, hover-reveal on desktop
 * - WCAG AA accessible (ARIA labels, focus-visible outlines)
 */
import React, { useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

// ── Keyframes ────────────────────────────────────────────────────────────

const popAnimation = keyframes`
  0% { transform: scale(0.8); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
`;

const slideUpFade = keyframes`
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
`;

// ── Styled Components (Gemini 3.1 Pro Design Spec) ──────────────────────

const FeedbackPill = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;

  /* Glassmorphism */
  background: linear-gradient(135deg, rgba(0, 32, 96, 0.6) 0%, rgba(0, 16, 64, 0.8) 100%);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  /* Always visible on mobile/tablet */
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 10;

  @media (min-width: 1280px) {
    top: 12px;
    right: 12px;
    opacity: ${({ $isVisible }) => ($isVisible ? '0.85' : '0')};
    transform: ${({ $isVisible }) => ($isVisible ? 'translateY(0)' : 'translateY(-4px)')};
  }
`;

const VoteButton = styled.button<{ $isActive: boolean; $variant: 'up' | 'down' }>`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ $isActive, $variant }) =>
    $isActive
      ? ($variant === 'up' ? '#60C0F0' : '#FF5E7E')
      : '#8A8A9D'};

  transition: color 0.2s ease, transform 0.15s ease;

  ${({ $isActive }) => $isActive && css`
    animation: ${popAnimation} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  `}

  &:hover {
    @media (min-width: 1024px) {
      color: ${({ $variant }) => ($variant === 'up' ? '#60C0F0' : '#FF5E7E')};
      transform: scale(1.1);
    }
  }

  &:active {
    transform: scale(0.9);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: -2px;
    border-radius: 50%;
  }

  svg {
    width: 20px;
    height: 20px;
    fill: ${({ $isActive }) => ($isActive ? 'currentColor' : 'none')};
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: ${({ $isActive, $variant }) =>
      $isActive
        ? `drop-shadow(0 0 8px ${$variant === 'up' ? 'rgba(96, 192, 240, 0.4)' : 'rgba(255, 94, 126, 0.4)'})`
        : 'none'};
  }
`;

const VoteCount = styled.span<{ $key?: number }>`
  font-size: 13px;
  font-weight: 600;
  color: #FFFFFF;
  min-width: 12px;
  text-align: center;
  user-select: none;
  animation: ${slideUpFade} 0.3s ease-out;
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
`;

// ── Component ────────────────────────────────────────────────────────────

interface PhotoFeedbackProps {
  photoId: number;
  thumbsUp: number;
  thumbsDown: number;
  userVote: 1 | -1 | null;
  onVote: (photoId: number, voteType: 1 | -1) => void;
  isHovered?: boolean;
}

const PhotoFeedback: React.FC<PhotoFeedbackProps> = ({
  photoId,
  thumbsUp,
  thumbsDown,
  userVote,
  onVote,
  isHovered = false,
}) => {
  const hasVoted = userVote !== null;
  const isVisible = hasVoted || isHovered;

  const handleUpClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onVote(photoId, 1);
  }, [photoId, onVote]);

  const handleDownClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onVote(photoId, -1);
  }, [photoId, onVote]);

  return (
    <FeedbackPill $isVisible={isVisible}>
      <VoteButton
        $isActive={userVote === 1}
        $variant="up"
        onClick={handleUpClick}
        aria-label={`Thumbs up, ${thumbsUp} votes`}
        aria-pressed={userVote === 1}
      >
        <ThumbsUp />
      </VoteButton>
      {thumbsUp > 0 && <VoteCount key={thumbsUp}>{thumbsUp}</VoteCount>}

      <Divider />

      <VoteButton
        $isActive={userVote === -1}
        $variant="down"
        onClick={handleDownClick}
        aria-label={`Thumbs down, ${thumbsDown} votes`}
        aria-pressed={userVote === -1}
      >
        <ThumbsDown />
      </VoteButton>
      {thumbsDown > 0 && <VoteCount key={thumbsDown}>{thumbsDown}</VoteCount>}
    </FeedbackPill>
  );
};

export default PhotoFeedback;
