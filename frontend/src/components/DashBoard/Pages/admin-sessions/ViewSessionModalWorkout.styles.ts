import styled from 'styled-components';

export const WorkoutSection = styled.div`
  margin-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  padding-top: 1rem;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 0.75rem;
  padding: 0;
`;

export const SectionToggleButton = styled(SectionHeader).attrs({ as: 'button', type: 'button' })`
  cursor: pointer;
  background: transparent;
  border: 0;
  width: 100%;
  text-align: left;
  min-height: 44px;
`;

export const WorkoutAccentIcon = styled.span`
  display: inline-flex;
  color: var(--accent-secondary, #8B5CF6);
`;

export const WorkoutMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

export const MetaChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  font-size: 0.7rem;
  font-weight: 600;
`;

export const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ExerciseBlock = styled.div``;

export const ExerciseName = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const SetTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  .hide-sm {
    @media (max-width: 500px) {
      display: none;
    }
  }
`;

export const SetTh = styled.th`
  text-align: left;
  padding: 4px 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 42%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);
`;

export const SetTd = styled.td<{ $bold?: boolean }>`
  padding: 6px;
  color: ${({ $bold }) => ($bold ? 'var(--text-primary, #E0ECF4)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent)')};
  font-weight: ${({ $bold }) => ($bold ? 600 : 400)};
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
`;

export const SetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.7rem;
  font-weight: 700;
`;

export const EmptyWorkout = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 42%, transparent);
  font-size: 0.875rem;
  font-style: italic;
`;

export const EmptyWorkoutIcon = styled.span`
  display: inline-flex;
  opacity: 0.45;
`;
