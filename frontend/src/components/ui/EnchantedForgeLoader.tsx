/**
 * Enchanted Forge AI Loading Sequence
 * ====================================
 * Multi-stage loading overlay for AI workout generation.
 * - Pulsing Ice Wing core with crystalline glow
 * - Phased progress text (analyzing → forging → finalizing)
 * - Background/Cancel escape hatches
 * - prefers-reduced-motion support
 * - z-index: 1900 (below toasts at 2000)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Dumbbell, X } from 'lucide-react';

// ─── Design Tokens ───────────────────────────────────────────────

const TOKENS = {
  midnightSapphire: '#002060',
  iceWing: '#60C0F0',
  wingPurple: '#8B5CF6',
  frostWhite: '#E0ECF4',
} as const;

// ─── Phase Configuration ─────────────────────────────────────────

const PHASES = [
  { label: 'Analyzing your profile...', minDuration: 2000 },
  { label: 'Building NASM-guided plan...', minDuration: 3000 },
  { label: 'Matching exercises to library...', minDuration: 2000 },
  { label: 'Finalizing your workout plan...', minDuration: 1500 },
] as const;

// ─── Types ───────────────────────────────────────────────────────

interface EnchantedForgeLoaderProps {
  /** Whether the loader is visible */
  active: boolean;
  /** Called when user clicks "Run in Background" */
  onBackground?: () => void;
  /** Called when user clicks "Cancel" */
  onCancel?: () => void;
  /** Override phase labels */
  phases?: Array<{ label: string; minDuration: number }>;
}

// ─── Keyframes ──────────────────────────────────────────────────

const coreGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 20px rgba(96, 192, 240, 0.4),
      0 0 40px rgba(96, 192, 240, 0.2),
      0 0 60px rgba(139, 92, 246, 0.1);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 30px rgba(96, 192, 240, 0.6),
      0 0 60px rgba(96, 192, 240, 0.3),
      0 0 90px rgba(139, 92, 246, 0.15);
    transform: scale(1.05);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const progressPulse = keyframes`
  0% { width: 0%; }
  100% { width: 100%; }
`;

const textFadeSwap = keyframes`
  0% { opacity: 0; transform: translateY(8px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
`;

// ─── Styled Components ──────────────────────────────────────────

const Overlay = styled.div<{ $exiting: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1900;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 16, 48, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: ${({ $exiting }) => ($exiting ? fadeOut : fadeIn)} 0.3s ease forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: ${({ $exiting }) => ($exiting ? 0 : 1)};
  }
`;

const CoreOrb = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${TOKENS.iceWing}, ${TOKENS.wingPurple});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${TOKENS.frostWhite};
  animation: ${coreGlow} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  margin-bottom: 24px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.4);
  }
`;

const PhaseText = styled.p<{ $key: number }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: ${TOKENS.frostWhite};
  text-align: center;
  min-height: 1.5em;
  animation: ${textFadeSwap} 2.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 0 20px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ProgressTrack = styled.div`
  width: 240px;
  max-width: 80vw;
  height: 3px;
  background: rgba(224, 236, 244, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 32px;
`;

const ProgressFill = styled.div<{ $duration: number }>`
  height: 100%;
  background: linear-gradient(90deg, ${TOKENS.iceWing}, ${TOKENS.wingPurple});
  border-radius: 2px;
  animation: ${progressPulse} ${({ $duration }) => $duration}ms linear forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    width: 50%;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionBtn = styled.button<{ $variant: 'ghost' | 'cancel' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 36px;

  ${({ $variant }) =>
    $variant === 'ghost'
      ? css`
          background: rgba(96, 192, 240, 0.08);
          border: 1px solid rgba(96, 192, 240, 0.2);
          color: ${TOKENS.iceWing};

          &:hover {
            background: rgba(96, 192, 240, 0.15);
            border-color: rgba(96, 192, 240, 0.35);
          }
        `
      : css`
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;

          &:hover {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.35);
          }
        `}
`;

// ─── Component ──────────────────────────────────────────────────

export const EnchantedForgeLoader: React.FC<EnchantedForgeLoaderProps> = ({
  active,
  onBackground,
  onCancel,
  phases = PHASES as unknown as Array<{ label: string; minDuration: number }>,
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  // Show/hide with animation
  useEffect(() => {
    if (active) {
      setVisible(true);
      setExiting(false);
      setPhaseIndex(0);
    } else if (visible) {
      setExiting(true);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [active, visible]);

  // Cycle through phases
  useEffect(() => {
    if (!active || phaseIndex >= phases.length - 1) return;
    const duration = phases[phaseIndex].minDuration;
    const timer = setTimeout(() => setPhaseIndex((p) => Math.min(p + 1, phases.length - 1)), duration);
    return () => clearTimeout(timer);
  }, [active, phaseIndex, phases]);

  const handleBackground = useCallback(() => {
    onBackground?.();
  }, [onBackground]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  if (!visible) return null;

  const currentPhase = phases[phaseIndex] || phases[0];
  const totalDuration = phases.reduce((sum, p) => sum + p.minDuration, 0);

  return (
    <Overlay $exiting={exiting} role="status" aria-live="polite" aria-label="Generating workout plan">
      <CoreOrb>
        <Dumbbell size={32} />
      </CoreOrb>

      <PhaseText $key={phaseIndex} key={phaseIndex}>
        {currentPhase.label}
      </PhaseText>

      <ProgressTrack>
        <ProgressFill $duration={totalDuration} />
      </ProgressTrack>

      <ButtonRow>
        {onBackground && (
          <ActionBtn $variant="ghost" onClick={handleBackground} type="button">
            Run in Background
          </ActionBtn>
        )}
        {onCancel && (
          <ActionBtn $variant="cancel" onClick={handleCancel} type="button">
            <X size={14} />
            Cancel
          </ActionBtn>
        )}
      </ButtonRow>
    </Overlay>
  );
};

export default EnchantedForgeLoader;
