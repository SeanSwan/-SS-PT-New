/**
 * WorkoutHistoryPanel session, table, and PR styles.
 *
 * Keeps display chrome out of the canonical runtime component so the admin
 * workout-history surface can be audited by behavior instead of style noise.
 */
import styled from 'styled-components';

const getRpeColor = (value: number): string => {
  if (value >= 9) return 'var(--status-danger, #C92A54)';
  if (value >= 7) return 'var(--accent-gold, #C6A84B)';
  if (value >= 5) return 'var(--accent-primary, #60C0F0)';
  return 'var(--status-success, #4caf50)';
};

export const SessionCard = styled.div`
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent));
  border-radius: 10px;
  margin-bottom: 12px;
  /* Phase 15.3: overflow: visible so expanded edit controls are not clipped. */
  overflow: visible;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent));
  }
`;

export const SessionHeader = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: var(--text-primary, #E0ECF4);
  gap: 12px;
`;

export const SessionToggleButton = styled.button`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  min-height: 44px;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

export const SessionTitle = styled.span`
  font-weight: 600;
  font-size: 0.9375rem;
`;

export const SessionMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

export const MetaChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary, #8BA8C8);
`;

export const ExerciseTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`;

export const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  color: var(--text-secondary, #8BA8C8);
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  border-bottom: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent));
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
`;

export const Td = styled.td`
  padding: 8px 12px;
  color: var(--text-primary, #E0ECF4);
  border-bottom: 1px solid var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 3%, transparent));
`;

export const ExerciseNameCell = styled(Td)`
  font-weight: 500;
  vertical-align: top;
`;

export const SessionHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ExerciseTableViewport = styled.div`
  padding: 0 16px 16px;
  overflow-x: auto;
`;

export const WeightCell = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
`;

export const TempoCell = styled.span`
  color: var(--accent-secondary, #8B5CF6);
  font-family: 'Fira Code', monospace;
  font-size: 0.8em;
`;

export const RPECell = styled.span<{ $value: number }>`
  font-family: 'Fira Code', monospace;
  font-weight: 600;
  color: ${p => getRpeColor(p.$value)};
`;

export const OneRMCell = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.85em;
`;

export const PRBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Fira Code', monospace;
  color: var(--accent-gold, #C6A84B);
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--accent-gold, #C6A84B);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: var(--shadow-gold-soft, 0 0 8px color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent));
  }
`;

export const PRCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-gold-soft, color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent));
  border-radius: 10px;
  margin-bottom: 8px;
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--border-gold-medium, color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent));
  }
`;

export const PRDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

export const PRExerciseName = styled.div`
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
`;

export const PRDateText = styled.div`
  font-size: 0.8125rem;
  color: var(--text-secondary, #8BA8C8);
`;

export const PRActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PREstimate = styled.span`
  font-size: 0.6875rem;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
`;

export const AddSetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

export const SessionTotals = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
`;

export const TotalLabel = styled.span`
  color: var(--text-secondary, #8BA8C8);
`;

export const TotalValue = styled.span`
  color: var(--accent-primary, #60C0F0);
`;

export const SessionNotes = styled.p`
  color: var(--text-secondary, #8BA8C8);
  font-size: 0.8125rem;
  margin: 12px 0 0;
  font-style: italic;
`;

export const ShareIconBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  min-height: 44px;
  border-radius: 6px;
  border: 1px solid var(--border-secondary-strong, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent));
  background: var(--accent-secondary-bg-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.6875rem;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: var(--accent-secondary, #8B5CF6);
    box-shadow: var(--shadow-accent-soft, 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent));
  }
`;
