import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';

export const Wrapper = styled.section`
  margin-top: 16px;
  padding: 12px 14px 14px;
  border-radius: 10px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--accent-primary, #60C0F0);
`;

export const Title = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const BreadcrumbDim = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

export const TabRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

export const Tab = styled.button<{ $active: boolean; $tone: 'primary' | 'secondary'; $compact?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  padding: ${({ $compact }) => ($compact ? '6px 10px' : '8px 12px')};
  border-radius: 8px;
  border: 1px solid ${({ $active, $tone }) =>
    $active
      ? `color-mix(in srgb, var(--accent-${$tone === 'primary' ? 'primary' : 'secondary'}, #60C0F0) 60%, transparent)`
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  background: ${({ $active, $tone }) =>
    $active
      ? `color-mix(in srgb, var(--accent-${$tone === 'primary' ? 'primary' : 'secondary'}, #60C0F0) 18%, var(--bg-elevated, #141419))`
      : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.7))')};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s ease;
  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const SmallSubtext = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.62rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: capitalize;
`;

export const DayList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

export const DayChip = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, var(--bg-elevated, #141419))'
      : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  min-height: 56px;
  transition: all 0.15s ease;
  &:hover {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const DayChipLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
`;

export const DayChipMeta = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  text-transform: capitalize;
`;

export const DayCount = styled.span`
  margin-left: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 0.7rem;
  font-family: 'Fira Code', monospace;
`;

export const Detail = styled.div`
  padding: 12px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
`;

export const DetailTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: capitalize;
`;

export const DetailFocus = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  text-transform: lowercase;
`;

export const ExerciseList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const ExerciseRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* Name takes the row; swap/remove controls hug the right edge. */
  & > span:first-child { flex: 1; min-width: 0; }
  padding: 6px 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent);
  &:last-child { border-bottom: none; }
`;

export const FallbackBadge = styled.span`
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  text-transform: uppercase;
  background: ${plannerGoldAlpha(0.18)};
  color: ${PLANNER_GOLD};
`;

export const Empty = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  padding: 8px 0;
`;
