import styled from 'styled-components';
import { CS, withAlpha, reducedMotionSafe } from './WorkoutLoggerCS';

export const QuickLogContainer = styled.div`
  background: ${withAlpha(CS.cardDark, 0.9)};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${CS.glassBorder};
  border-radius: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 430px) {
    padding: 1rem;
    border-radius: 1rem;
  }
`;

export const ExerciseNav = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

export const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 0.75rem;
  background: ${withAlpha(CS.glow, 0.08)};
  border: 1px solid ${CS.glassBorder};
  color: ${CS.gaming};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${withAlpha(CS.glow, 0.15)};
    border-color: ${CS.glow};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

export const ExerciseInfo = styled.div`
  flex: 1;
  text-align: center;
  min-width: 0;
`;

export const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${CS.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ExerciseMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: ${CS.textMuted};
  margin-top: 0.125rem;
`;

export const InputRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 430px) {
    gap: 0.5rem;
  }
`;

export const InputGroup = styled.div`
  flex: 1;
`;

export const InputLabel = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${CS.textMuted};
  margin-bottom: 0.375rem;
`;

export const QuickInput = styled.input`
  width: 100%;
  padding: 0.875rem 0.75rem;
  background: ${withAlpha(CS.bgDeep, 0.7)};
  border: 2px solid ${CS.glassBorder};
  border-radius: 0.75rem;
  color: ${CS.text};
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  min-height: 56px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px ${withAlpha(CS.glow, 0.15)};
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }

  @media (max-width: 430px) {
    font-size: 16px;
    min-height: 52px;
    padding: 0.75rem;
  }
`;

export const OverloadWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  padding-bottom: 0.875rem;
`;

export const LogSetButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 56px;
  padding: 1rem;
  /* Dual-Button Glow law: Blue background -> Purple glow. */
  background: linear-gradient(135deg, ${CS.primaryDeep}, ${CS.tertiary});
  border: none;
  border-radius: 0.75rem;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px ${withAlpha(CS.secondary, 0.25)};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px ${withAlpha(CS.secondary, 0.35)};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }

  ${reducedMotionSafe}
`;

export const SetDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

export const SetDot = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid ${({ $active, $completed }) =>
    $active ? CS.gaming : $completed ? CS.success : CS.glassBorder};
  background: ${({ $active, $completed }) =>
    $active ? CS.gaming : $completed ? CS.success : 'transparent'};
  cursor: pointer;
  padding: 0;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: ${CS.glow};
    transform: scale(1.08);
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;
