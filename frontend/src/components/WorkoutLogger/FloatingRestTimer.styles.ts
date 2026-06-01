import styled, { keyframes, css } from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px ${withAlpha(CS.gaming, 0.3)}; }
  50% { box-shadow: 0 0 30px ${withAlpha(CS.gaming, 0.6)}; }
`;

const urgentPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px ${withAlpha(CS.error, 0.3)}; }
  50% { box-shadow: 0 0 35px ${withAlpha(CS.error, 0.6)}; }
`;

export const FloatingContainer = styled.div<{ $isDone: boolean }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9990;
  width: 240px;
  background: ${CS.surfaceDark};
  border: 1px solid ${({ $isDone }) =>
    $isDone ? withAlpha(CS.error, 0.4) : withAlpha(CS.gaming, 0.3)};
  border-radius: 1rem;
  padding: 1rem;
  backdrop-filter: blur(20px);
  animation: ${({ $isDone }) => $isDone ? css`${urgentPulse} 1s ease-in-out infinite` : 'none'};
  box-shadow: 0 8px 32px ${withAlpha(CS.bgDeep, 0.5)},
              0 0 20px ${withAlpha(CS.gaming, 0.1)};

  @supports not (backdrop-filter: blur(20px)) {
    background: ${CS.surfaceDark};
  }

  @media (max-width: 430px) {
    bottom: 1rem;
    right: 1rem;
    width: calc(100vw - 2rem);
  }
`;

export const MinimizedPill = styled.button<{ $isRunning: boolean; $isLow: boolean }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9990;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  min-height: 44px;
  background: ${CS.surfaceDark};
  border: 1px solid ${({ $isLow }) =>
    $isLow ? withAlpha(CS.error, 0.4) : withAlpha(CS.gaming, 0.3)};
  border-radius: 999px;
  color: ${CS.text};
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  animation: ${({ $isRunning }) => $isRunning ? css`${pulse} 2s ease-in-out infinite` : 'none'};

  svg {
    color: ${({ $isLow }) =>
      $isLow ? CS.error : CS.gaming};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 3px;
  }
`;

export const TimerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

export const TimerLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${withAlpha(CS.text, 0.65)};
  text-transform: uppercase;
  letter-spacing: 0.06em;

  svg { color: ${CS.gaming}; }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 0.375rem;
`;

export const IconBtn = styled.button`
  background: transparent;
  border: none;
  color: ${withAlpha(CS.text, 0.4)};
  cursor: pointer;
  padding: 0.5rem;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;

  &:hover {
    color: ${CS.text};
    background: ${withAlpha(CS.text, 0.05)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }
`;

export const TimeDisplay = styled.div<{ $isLow: boolean; $isDone: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 2.25rem;
  font-weight: 700;
  text-align: center;
  color: ${({ $isLow, $isDone }) =>
    $isDone ? CS.error : $isLow ? CS.accent : CS.text};
  line-height: 1;
`;

export const TimeSubtext = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  text-align: center;
  color: ${withAlpha(CS.text, 0.4)};
  margin-bottom: 0.75rem;
`;

export const ProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  background: ${withAlpha(CS.text, 0.08)};
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.75rem;
`;

export const ProgressFill = styled.div<{ $pct: number; $isLow: boolean }>`
  width: ${({ $pct }) => Math.min(100, $pct)}%;
  height: 100%;
  background: ${({ $isLow }) =>
    $isLow
      ? `linear-gradient(90deg, ${CS.accent}, ${CS.error})`
      : `linear-gradient(90deg, ${CS.gaming}, ${CS.secondary})`};
  border-radius: 2px;
  transition: width 1s linear;
`;

export const DurationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

export const DurationLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: ${withAlpha(CS.text, 0.65)};
  min-width: 36px;
  text-align: center;
`;

export const AdjustBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: ${withAlpha(CS.text, 0.05)};
  border: 1px solid ${withAlpha(CS.text, 0.1)};
  border-radius: 0.5rem;
  color: ${withAlpha(CS.text, 0.65)};
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  padding: 0.5rem 0.75rem;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;

  &:hover {
    background: ${withAlpha(CS.gaming, 0.1)};
    border-color: ${withAlpha(CS.gaming, 0.2)};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }
`;

export const ControlRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.75rem;
`;

export const ControlBtn = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  ${({ $primary }) => $primary ? css`
    background: ${CS.tertiary};
    color: ${CS.text};

    &:hover {
      box-shadow: 0 0 20px 4px ${withAlpha(CS.secondary, 0.4)};
      transform: scale(1.05);
    }
  ` : css`
    background: ${withAlpha(CS.text, 0.08)};
    color: ${withAlpha(CS.text, 0.65)};

    &:hover {
      background: ${withAlpha(CS.text, 0.12)};
      color: ${CS.text};
    }
  `}

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 3px;
  }
`;
