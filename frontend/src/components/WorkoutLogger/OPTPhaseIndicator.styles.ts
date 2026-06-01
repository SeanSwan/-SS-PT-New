import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const PhaseChip = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  background: ${({ $color }) => withAlpha($color, 0.15)};
  border: 1px solid ${({ $color }) => withAlpha($color, 0.4)};
  border-radius: 8px;
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover {
    background: ${({ $color }) => withAlpha($color, 0.25)};
    border-color: ${({ $color }) => $color};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

export const PhaseDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => withAlpha($color, 0.5)};
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${withAlpha(CS.bgDeep, 0.6)};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const Modal = styled.div`
  background: ${CS.bg};
  border: 1px solid ${CS.border};
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px ${withAlpha(CS.bgDeep, 0.4)};
`;

export const ModalTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  color: ${CS.text};
  margin: 0 0 8px;
`;

export const ModalWarning = styled.p`
  color: ${CS.warningText};
  font-size: 0.8rem;
  margin: 0 0 16px;
  padding: 8px 12px;
  background: ${CS.warningBg};
  border: 1px solid ${CS.warningBorder};
  border-radius: 6px;
`;

export const PhaseOption = styled.button<{ $color: string; $isActive: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: ${({ $isActive, $color }) =>
    $isActive ? withAlpha($color, 0.2) : CS.inputBg};
  border: 2px solid ${({ $isActive, $color }) =>
    $isActive ? $color : 'transparent'};
  border-radius: 8px;
  color: ${CS.text};
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${({ $color }) => withAlpha($color, 0.15)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

export const PhaseName = styled.span`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
`;

export const PhaseDetails = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: ${CS.textSecondary};
  font-variant-numeric: tabular-nums;
`;

export const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
`;

export const ModalButton = styled.button<{ $variant: 'cancel' | 'confirm' }>`
  min-height: 44px;
  padding: 10px 24px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  background: ${({ $variant }) =>
    $variant === 'confirm' ? CS.secondary : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'confirm' ? CS.text : CS.textSecondary};
  border: 1px solid ${({ $variant }) =>
    $variant === 'confirm' ? CS.secondary : CS.border};

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'confirm' ? CS.secondaryLight : withAlpha(CS.glow, 0.1)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;
