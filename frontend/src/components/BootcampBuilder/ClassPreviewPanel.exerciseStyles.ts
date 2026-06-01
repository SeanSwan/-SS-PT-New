import styled from 'styled-components';
import { ExerciseRow, StationCard } from './BootcampBuilderStyles';

export const RegressionLine = styled.div`
  padding: 2px 12px 6px 28px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: color-mix(in srgb, var(--success, #10B981) 70%, transparent);
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '>';
    color: color-mix(in srgb, var(--success, #10B981) 45%, transparent);
    font-size: 13px;
  }

  span.label {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 35%, transparent);
    font-size: 10px;
  }
`;

export const FlowBadge = styled.span<{ $score: number }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  background: ${({ $score }) => {
    if ($score >= 80) return 'color-mix(in srgb, var(--success, #10B981) 12%, transparent)';
    if ($score >= 50) return 'color-mix(in srgb, var(--warning, #C6A84B) 16%, transparent)';
    return 'color-mix(in srgb, var(--danger, #C92A54) 14%, transparent)';
  }};
  color: ${({ $score }) => {
    if ($score >= 80) return 'var(--success, #10B981)';
    if ($score >= 50) return 'var(--warning, #C6A84B)';
    return 'var(--danger, #C92A54)';
  }};
`;

export const FlowInsightBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  font-size: 12px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 85%, transparent));
`;

export const FlowMeter = styled.div<{ $score: number }>`
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    width: ${({ $score }) => $score}%;
    border-radius: 3px;
    background: ${({ $score }) => {
      if ($score >= 80) return 'var(--success, #10B981)';
      if ($score >= 50) return 'var(--warning, #C6A84B)';
      return 'var(--danger, #C92A54)';
    }};
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

export const AlternativeHint = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-size: 11px;
  font-style: italic;
  padding: 8px 0 4px;
`;

export const LowImpactSwapRow = styled.button`
  width: 100%;
  min-height: 52px;
  border: 1px solid color-mix(in srgb, var(--success, #10B981) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--success, #10B981) 7%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: grid;
  gap: 4px;
  margin-bottom: 6px;
  padding: 9px 12px;
  text-align: left;

  &:hover {
    border-color: color-mix(in srgb, var(--success, #10B981) 40%, transparent);
    background: color-mix(in srgb, var(--success, #10B981) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--success, #10B981);
    outline-offset: 2px;
  }
`;

export const LowImpactName = styled.span`
  font-size: 13px;
  font-weight: 700;
`;

export const LowImpactValue = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font-size: 12px;
  line-height: 1.35;
`;

export const StationMetaRow = styled.div`
  align-items: center;
  display: flex;
  gap: 6px;
`;

export const StationEmptyState = styled.div`
  font-size: 12px;
  font-style: italic;
  opacity: 0.4;
  padding: 12px 14px;
`;

export const ExerciseRowFill = styled(ExerciseRow)`
  flex: 1;
`;

export const ExerciseMeta = styled.span`
  align-items: center;
  display: flex;
  gap: 6px;
`;

export const SetupTime = styled.span`
  font-size: 10px;
  opacity: 0.5;
`;

export const DeleteBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--danger, #C92A54) 32%, transparent);
  background: color-mix(in srgb, var(--danger, #C92A54) 8%, transparent);
  color: var(--danger, #C92A54);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--danger, #C92A54) 18%, transparent);
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--danger, #C92A54);
    outline-offset: 2px;
  }

  @media (hover: none) {
    opacity: 0.75;
  }
`;

export const ClickableStationCard = styled(StationCard)<{ $active: boolean }>`
  border-color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : undefined};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)' : undefined};
  cursor: pointer;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const ExRowWithDelete = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover ${DeleteBtn} {
    opacity: 0.75;
  }
`;

export const ModAccordionHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  min-height: 48px;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: var(--bg-surface, #1A1A24);
  }
`;

export const ModTable = styled.div`
  padding: 0 8px 8px;
`;

export const ModRow = styled.div<{ $even: boolean; $type?: 'easy' | 'joint' }>`
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: 6px;
  margin-bottom: 2px;
  background: ${({ $even, $type }) => {
    if ($type === 'easy') return 'color-mix(in srgb, var(--success, #10B981) 6%, transparent)';
    return $even ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 3%, transparent)' : 'transparent';
  }};
  border-left: 3px solid ${({ $type }) => $type === 'easy' ? 'var(--success, #10B981)' : 'transparent'};
`;

export const ModLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  min-width: 100px;
  flex-shrink: 0;
`;

export const ModValue = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

export const ModCount = styled.span`
  font-size: 10px;
  margin-left: auto;
  opacity: 0.5;
`;

export const EmptyModState = styled.div`
  font-size: 11px;
  font-style: italic;
  opacity: 0.4;
  padding: 8px 14px;
`;
