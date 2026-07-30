/**
 * WorkoutPlannerRolodexCard.styles
 *
 * Stable card geometry for the virtualized exercise rolodex in the active
 * admin/trainer Workout Planner. The grid keeps media, exercise copy, and the
 * 44px add action aligned from narrow phone widths through desktop/4K.
 */
import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';

export const ExerciseAddBtn = styled.button`
  all: unset;
  grid-column: 3;
  align-self: center;
  justify-self: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 44%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 430px) { grid-column: 2; }
`;

export const ExerciseItem = styled.div<{ $selected?: boolean }>`
  box-sizing: border-box;
  width: 100%;
  height: calc(100% - 8px);
  min-width: 0;
  min-height: 132px;
  text-align: left;
  display: grid;
  grid-template-columns: clamp(72px, 24%, 96px) minmax(0, 1fr) 44px;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)' : 'var(--border-soft, rgba(96, 192, 240, 0.06))'};
  border-left: 3px solid ${({ $selected }) => $selected ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)' : 'color-mix(in srgb, var(--bg-elevated, #141419) 96%, transparent)'};
  color: inherit;
  font: inherit;
  cursor: pointer;
  margin-bottom: 8px;
  overflow: hidden;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-elevated, #141419));
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-left-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(68px, 82px) minmax(0, 1fr) 44px;
    gap: 8px;
  }

  @media (max-width: 430px) {
    grid-template-columns: minmax(0, 1fr) 44px;
    padding: 8px 10px;
  }
`;

export const PlannerMediaThumb = styled.div`
  grid-column: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
  align-self: stretch;
  display: block;
  overflow: hidden;

  > div {
    width: 100%;
    height: 100%;
    min-height: 100%;
    aspect-ratio: auto;
    margin-bottom: 0;
  }

  > div [role='img'] {
    align-content: center;
    gap: 4px;
    padding: 8px 6px;
    overflow: hidden;
  }

  > div [role='img']::before {
    width: 44px;
    height: 38px;
  }

  > div [role='img'] > div {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  > div [role='img'] > div:first-of-type,
  > div [role='img'] > div:last-of-type {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  > div [role='img'] > div:first-of-type { font-size: 0.64rem; line-height: 1.1; }
  > div [role='img'] > div:last-of-type { font-size: 0.55rem; line-height: 1.15; }

  @media (max-width: 640px) {
    > div [role='img'] { padding: 7px 5px; }
    > div [role='img']::before { width: 38px; height: 34px; }
  }

  @media (max-width: 430px) { display: none; }
`;

export const ExerciseRowContent = styled.div`
  grid-column: 2;
  min-width: 0;
  min-height: 0;
  align-self: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  overflow: hidden;

  @media (max-width: 430px) { grid-column: 1; }
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
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

export const ExerciseDetailLine = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.78));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.35;
  overflow: hidden;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
`;

export const ExerciseMeta = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  display: flex;
  column-gap: 4px;
  row-gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  max-height: 48px;
  overflow: hidden;

  & > span {
    white-space: nowrap;
    flex-shrink: 1;
    min-width: 0;
  }
`;

export const MetaTag = styled.span<{ $impact?: string }>`
  display: inline-flex;
  align-items: center;
  max-width: min(16ch, 100%);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)';
    if ($impact === 'Medium Impact') return plannerGoldAlpha(0.12);
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)';
  }};
  color: ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'var(--accent-primary, #60C0F0)';
    if ($impact === 'Medium Impact') return PLANNER_GOLD;
    if ($impact === 'High Impact') return 'var(--danger, #C92A54)';
    return 'var(--text-muted, rgba(224, 236, 244, 0.55))';
  }};
  border: 1px solid ${({ $impact }) => {
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)';
    if ($impact === 'Medium Impact') return plannerGoldAlpha(0.2);
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 20%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)';
  }};
  margin: 2px 3px 2px 0;
`;
