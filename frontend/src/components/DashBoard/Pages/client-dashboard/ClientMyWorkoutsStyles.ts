/**
 * ============================================================================
 * FILE: ClientMyWorkoutsStyles.ts
 * PURPOSE: Styled components for ClientMyWorkoutsPage — extracted per 300-line rule
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 */

import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Layout
// ─────────────────────────────────────────────────────────────
export const PageContainer = styled.div`
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;

    > button {
      justify-content: center;
      width: 100%;
    }
  }
`;

export const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const AccentIconSlot = styled.span<{ $muted?: boolean }>`
  display: inline-flex;
  align-items: center;
  color: var(--accent-primary, #60C0F0);
  opacity: ${({ $muted }) => ($muted ? 0.3 : 1)};
`;

export const LogBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Stats
// ─────────────────────────────────────────────────────────────
export const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

export const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 1rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.15));
  border-radius: 12px;
`;

export const StatIconSlot = styled(AccentIconSlot)`
  justify-content: center;
`;

export const StatValue = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const StatLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Workout Cards
// ─────────────────────────────────────────────────────────────
export const WorkoutCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

export const WorkoutHeader = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem 1.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  color: var(--text-primary, #E0ECF4);
  &:hover { background: rgba(96,192,240,0.05); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

export const WorkoutInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const WorkoutDate = styled.span`
  font-size: 0.75rem;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const WorkoutTitle = styled.span`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const WorkoutMeta = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
`;

export const ExpandBtn = styled.span`
  color: var(--text-muted, #94a3b8);
  flex-shrink: 0;
`;

export const WorkoutBody = styled.div`
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid var(--border-soft, rgba(96,192,240,0.1));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Details
// ─────────────────────────────────────────────────────────────
export const ExerciseBlock = styled.div`
  margin-top: 1rem;
`;

export const ExerciseName = styled.h4`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  margin: 0 0 0.5rem 0;
`;

export const SetTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  .hide-mobile { @media (max-width: 600px) { display: none; } }
`;

export const SetTableHead = styled.thead``;

export const SetTableRow = styled.tr`
  &:not(:last-child) { border-bottom: 1px solid rgba(96,192,240,0.08); }
`;

export const SetTh = styled.th`
  text-align: left;
  padding: 6px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted, #94a3b8);
`;

export const SetTd = styled.td<{ $highlight?: boolean }>`
  padding: 8px;
  color: ${p => p.$highlight ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #94a3b8)'};
  font-weight: ${p => p.$highlight ? 600 : 400};
  font-variant-numeric: tabular-nums;
`;

export const SetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.75rem;
  font-weight: 700;
`;

export const WorkoutNotes = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(96,192,240,0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
  strong { color: var(--text-primary, #E0ECF4); }
`;

export const NoSetsText = styled.p`
  padding: 1rem 0;
  color: var(--text-muted, #94a3b8);
  font-style: italic;
  font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: States (empty, error, loading)
// ─────────────────────────────────────────────────────────────
export {
  EmptyState,
  EmptyTitle,
  EmptyText,
  ErrorCard,
  RetryBtn,
  ShimmerCard,
} from './ClientMyWorkoutsStateStyles';
