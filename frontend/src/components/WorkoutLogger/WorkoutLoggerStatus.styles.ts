import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const LiveRegion = styled.div`
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

export const ModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 0.625rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ $active }) =>
    $active ? CS.glow : CS.glassBorder};
  background: ${({ $active }) =>
    $active ? withAlpha(CS.glow, 0.15) : 'transparent'};
  color: ${({ $active }) =>
    $active ? CS.gaming : CS.textMuted};

  &:hover {
    border-color: ${CS.glow};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

export const OfflineBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: ${CS.warningBg};
  border: 1px solid ${CS.warningBorder};
  color: ${CS.warningText};
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: auto;
`;

export const RestTimerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: ${CS.infoBg};
  border: 1px solid ${CS.infoBorder};
  color: ${CS.gaming};
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;
