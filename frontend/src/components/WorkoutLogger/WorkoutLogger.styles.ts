import { motion } from 'framer-motion';
import { Heart, RotateCcw, Shield } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import { CS, reducedMotionSafe, shimmer, withAlpha } from './WorkoutLoggerCS';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;


export const WorkoutLoggerContainer = styled(motion.div)`
  min-height: min(100%, 100dvh);
  background: ${CS.bgDeep};
  background-image: radial-gradient(circle at 80% 20%, ${withAlpha(CS.secondary, 0.08)} 0%, transparent 40%),
                    radial-gradient(circle at 20% 80%, ${withAlpha(CS.glow, 0.04)} 0%, transparent 40%);
  padding: 2rem;
  color: ${CS.text};
  font-family: 'Sora', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1rem;
  position: relative;
  box-sizing: border-box;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
  }

  & > * { position: relative; }

  @supports not (height: 100dvh) {
    min-height: 100vh;
  }

  @media (min-width: 2560px) {
    max-width: 2400px;
    margin: 0 auto;
    padding: 2.5rem;
    font-size: 1.0625rem;
  }

  @media (min-width: 3840px) {
    max-width: 3200px;
    padding: 3rem;
    font-size: 1.125rem;
  }

  @media (max-width: 768px) { padding: 1rem; }
  @media (max-width: 430px) { padding: 0.75rem; }
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${withAlpha(CS.text, 0.2)};
  border-radius: 50%;
  border-top-color: ${CS.text};
  animation: ${spin} 0.8s ease-in-out infinite;
`;

export const CenteredLoader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

export const WarmupProtocolIcon = styled(Heart)`
  color: ${CS.gaming};
`;

export const BalanceProtocolIcon = styled(Shield)`
  color: var(--accent-secondary, ${CS.secondary});
`;

export const CooldownProtocolIcon = styled(RotateCcw)`
  color: ${CS.accent};
`;

export const ExerciseSection = styled.div`
  margin-bottom: 2rem;
`;

export const VoiceImportPanel = styled.section`
  margin: 0 0 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, ${withAlpha(CS.gaming, 0.2)});
  background: var(--bg-elevated, color-mix(in srgb, var(--bg-surface, #141419) 68%, transparent));
`;

export const VoiceImportHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.875rem;

  h2 {
    margin: 0;
    color: var(--text-primary, ${CS.text});
    font-size: 1rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--text-secondary, #8BA8C8);
    font-size: 0.875rem;
    line-height: 1.45;
  }
`;

export const LoadPlanRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

export const LoadPlanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  background: ${withAlpha(CS.secondary, 0.12)};
  border: 1px solid ${withAlpha(CS.secondary, 0.3)};
  border-radius: 10px;
  color: ${CS.secondary};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    background: ${withAlpha(CS.secondary, 0.2)};
    border-color: ${withAlpha(CS.secondary, 0.5)};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const ExerciseSearchBar = styled.div`
  position: relative;
  z-index: 10;
  margin-bottom: 2rem;
`;

export const RolodexTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 1rem 1.25rem;
  background: ${CS.inputBgDark};
  backdrop-filter: blur(16px);
  border: 2px solid ${withAlpha(CS.glow, 0.12)};
  border-radius: 1rem;
  color: ${CS.textSecondary};
  font-size: 0.95rem;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, color 0.2s;

  &:hover {
    border-color: ${CS.glow};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px ${withAlpha(CS.glow, 0.15)};
  }

  svg { color: ${CS.gaming}; flex-shrink: 0; }
`;

export const AddExerciseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 2rem;
  /* Dual-Button Glow law: Purple background -> Cyan glow. */
  background: linear-gradient(135deg, ${CS.secondary}, ${CS.tertiary});
  border: none;
  border-radius: 1rem;
  color: var(--button-text, ${CS.text});
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  margin-bottom: 2rem;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px ${withAlpha(CS.gaming, 0.25)};
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent, ${withAlpha(CS.text, 0.15)}, transparent);
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 36px ${withAlpha(CS.gaming, 0.4)};
  }
  &:active { transform: scale(0.98); }

  ${reducedMotionSafe}
`;

/** SESSION SHELL Finish stub (Slice 3): empty-state note before any set is logged. */
export const FinishEmptyNote = styled.p`
  margin: 1rem 0;
  padding: 1rem 1.25rem;
  border: 1px dashed ${withAlpha(CS.text, 0.2)};
  border-radius: 12px;
  color: ${CS.textMuted};
  font: 400 0.9rem 'Sora', sans-serif;
`;
