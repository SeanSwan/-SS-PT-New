/**
 * Exercise row and builder-list styles for the active Workout Planner.
 * Re-exported by WorkoutPlannerStyles.ts for compatibility.
 */
import styled from 'styled-components';

// SECTION: Exercise List Item
// ─────────────────────────────────────────────────────────────
export const ExerciseAddBtn = styled.button`
  all: unset;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    transform: scale(1.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ExerciseItem = styled.div<{ $selected?: boolean }>`
  box-sizing: border-box;
  width: 100%;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)' : 'var(--border-soft, rgba(96, 192, 240, 0.06))'};
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)' : 'rgba(255, 255, 255, 0.015)'};
  color: inherit;
  font: inherit;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  min-height: 132px;
  overflow: hidden;
  border-left: 3px solid ${({ $selected }) => $selected ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-left-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    transform: translateX(2px);
  }

  &:active { transform: translateX(0); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) {
    padding: 8px 10px;
  }
`;

export const PlannerMediaThumb = styled.div`
  flex: 0 0 96px;
  width: 96px;
  min-height: 88px;
  align-self: stretch;
  display: flex;
  align-items: stretch;

  > div {
    margin-bottom: 0;
    min-height: 100%;
  }

  @media (max-width: 640px) {
    flex-basis: 82px;
    width: 82px;
  }

  @media (max-width: 430px) {
    display: none;
  }
`;

export const ExerciseRowContent = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 108px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
`;

export const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.3;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 3px;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;

  @media (max-width: 430px) {
    white-space: normal;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;

export const ExerciseDetailLine = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

export const ExerciseMeta = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  display: flex;
  gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  max-height: 54px;
  overflow: hidden;

  /* Pipe separators and tag spans */
  & > span {
    white-space: nowrap;
    flex-shrink: 1;
    min-width: 0;
  }
`;

export const MetaTag = styled.span<{ $impact?: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.02em;
  white-space: nowrap;
  max-width: 14ch;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
    if ($impact === 'Medium Impact') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)';
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)';
  }};
  color: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'var(--accent-primary, #60C0F0)';
    if ($impact === 'Medium Impact') return 'var(--accent-gold, #C6A84B)';
    if ($impact === 'High Impact') return 'var(--danger, #C92A54)';
    return 'var(--text-muted, rgba(224, 236, 244, 0.55))';
  }};
  border: 1px solid ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)';
    if ($impact === 'Medium Impact') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)';
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 20%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)';
  }};
  margin: 2px 3px 2px 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Builder Exercise Row
// ─────────────────────────────────────────────────────────────
export const BuilderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
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
