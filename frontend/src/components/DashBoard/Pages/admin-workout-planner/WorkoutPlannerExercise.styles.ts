/**
 * Exercise row and builder-list styles for the active Workout Planner.
 * Re-exported by WorkoutPlannerStyles.ts for compatibility.
 */
import styled from 'styled-components';

// SECTION: Exercise List Item
// -----------------------------------------------------------------------------
export {
  ExerciseAddBtn,
  ExerciseDetailLine,
  ExerciseItem,
  ExerciseMeta,
  ExerciseName,
  ExerciseRowContent,
  MetaTag,
  PlannerMediaThumb,
} from './WorkoutPlannerRolodexCard.styles';

// -----------------------------------------------------------------------------
// SECTION: Builder Exercise Row
// -----------------------------------------------------------------------------
export const BuilderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  /* Lens token seam: builder-row radius follows the active recipe. */
  border-radius: var(--world-row-radius, 12px);
  margin-bottom: 8px;
  background: var(--bg-base, #030712);
  transition: border-color 0.2s ease;

  &:hover { border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); }

  @media (max-width: 430px) {
    flex-wrap: wrap;
    padding: 8px 10px;
    gap: 6px;
  }
`;

export const BuilderRowNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  min-width: 24px;
`;

export const BuilderRowInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const MiniInput = styled.input`
  width: 56px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  text-align: center;
  min-height: 44px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const RemoveBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: color-mix(in srgb, var(--danger, #C92A54) 15%, transparent);
  color: var(--danger, #E14B67);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s ease;

  &:hover { background: color-mix(in srgb, var(--danger, #C92A54) 30%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: OPT Phase Badge
// ─────────────────────────────────────────────────────────────
export const PhaseBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  margin-bottom: 16px;
`;

export const PhaseLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
`;

export const PhaseParams = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

// ─────────────────────────────────────────────────────────────
