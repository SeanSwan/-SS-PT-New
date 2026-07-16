/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: PostWorkoutCelebration                           ║
 * ║  PURPOSE: Full-screen overlay celebrating workout completion  ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │                    (dark overlay)                           │
 * │                                                            │
 * │              🎉 WORKOUT COMPLETE! 🎉                       │
 * │                                                            │
 * │                  +125 XP                                   │
 * │              ██████████░░░ (XP bar)                        │
 * │                                                            │
 * │          ✨ Double XP Surge! (if surprise)                 │
 * │                                                            │
 * │          🏅 Level Up! (if leveled)                         │
 * │          🏆 Achievement: First Workout (if earned)         │
 * │                                                            │
 * │              Tap anywhere to dismiss                       │
 * └────────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[PostWorkoutCelebration] --> B[XPCounter]
 *   A --> C[SurpriseMultiplierBadge]
 *   A --> D[LevelUpGlow]
 *   A --> E[AchievementBadge]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Tap/Click Anywhere] → Dismisses overlay → Returns to previous screen
 * [Auto-dismiss after 5s] → Same as tap
 * [Escape key] → Same as tap
 *
 * DATA FLOW:
 * Props In:  { xpEarned, previousXP, newXP, surpriseMultiplier?, levelUp?,
 *              achievementUnlocked?, onDismiss }
 * State:     { phase: 'enter' | 'counting' | 'badges' | 'idle' }
 * Events:    onDismiss (callback when user taps or auto-dismiss fires)
 *
 * PSYCHOLOGY (Peak-End Rule — Kahneman, 1999):
 * The ending of an experience disproportionately affects how it's remembered.
 * This celebration ensures workouts end on a strong positive note,
 * increasing the likelihood of repeat behavior.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import XPCounter from './XPCounter';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface PostWorkoutCelebrationProps {
  xpEarned: number;
  previousXP: number;
  newXP: number;
  surpriseMultiplier?: number | null;
  surpriseLabel?: string | null;
  levelUp?: { newLevel: number; newTier: string } | null;
  achievementUnlocked?: { name: string; rarity: string } | null;
  onDismiss: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Tokens
// ─────────────────────────────────────────────────────────────
const TOKENS = {
  midnightSapphire: '#002060',
  iceWing: '#60C0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  obsidianBlack: '#0A0A0F',
  carbon: '#141419',
};

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#C6A84B',
  platinum: '#878681',
  crystalline: '#60C0F0',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframes (GPU-composited: transform + opacity only)
// ─────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
`;

const badgeEntrance = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 15, 0.92);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 300ms ease-out;
  cursor: pointer;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  max-width: 420px;
  animation: ${slideUp} 500ms ease-out 300ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 800;
  color: ${TOKENS.frostWhite};
  text-align: center;
  margin: 0;
  text-shadow: 0 0 30px rgba(96, 192, 240, 0.4);
`;

const SurpriseBadge = styled.div<{ $color: string }>`
  font-family: 'Sora', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  text-shadow: 0 0 20px ${({ $color }) => $color}66;
  animation: ${pulseGlow} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LevelUpSection = styled.div<{ $tierColor: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: 12px;
  background: ${({ $tierColor }) => `${$tierColor}15`};
  border: 1px solid ${({ $tierColor }) => `${$tierColor}40`};
  animation: ${badgeEntrance} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 800ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LevelText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${TOKENS.frostWhite};
`;

const TierText = styled.span`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  color: ${TOKENS.gildedFern};
  text-transform: capitalize;
`;

const AchievementSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-radius: 8px;
  background: ${TOKENS.carbon};
  border: 1px solid ${TOKENS.wingPurple}40;
  animation: ${badgeEntrance} 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 1200ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const AchievementName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  color: ${TOKENS.frostWhite};
`;

const DismissHint = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: ${TOKENS.frostWhite};
  opacity: 0.4;
  margin-top: 16px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const PostWorkoutCelebration: React.FC<PostWorkoutCelebrationProps> = ({
  xpEarned: _xpEarned,
  previousXP,
  newXP,
  surpriseMultiplier,
  surpriseLabel,
  levelUp,
  achievementUnlocked,
  onDismiss,
}) => {
  const [showXP, setShowXP] = useState(false);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Escape key to dismiss
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  // Stagger: show XP counter after overlay fades in (500ms)
  useEffect(() => {
    const timer = setTimeout(() => setShowXP(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const tierColor = levelUp
    ? TIER_COLORS[levelUp.newTier] || TOKENS.iceWing
    : TOKENS.iceWing;

  return createPortal(
    <Overlay
      onPointerDown={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Workout completion celebration"
    >
      <Content>
        <Title>Workout Complete!</Title>

        {showXP && (
          <XPCounter
            startXP={previousXP}
            endXP={newXP}
            label="TOTAL XP"
            showDelta={true}
          />
        )}

        {surpriseMultiplier && surpriseMultiplier > 1.0 && (
          <SurpriseBadge $color={TOKENS.gildedFern}>
            {surpriseLabel || `${surpriseMultiplier}x XP Surge!`}
          </SurpriseBadge>
        )}

        {levelUp && (
          <LevelUpSection $tierColor={tierColor}>
            <LevelText>Level {levelUp.newLevel}!</LevelText>
            <TierText>{levelUp.newTier} Tier</TierText>
          </LevelUpSection>
        )}

        {achievementUnlocked && (
          <AchievementSection>
            <span role="img" aria-label="trophy">🏆</span>
            <AchievementName>{achievementUnlocked.name}</AchievementName>
          </AchievementSection>
        )}

        <DismissHint>Tap anywhere to dismiss</DismissHint>
      </Content>
    </Overlay>,
    document.body
  );
};

export default PostWorkoutCelebration;
