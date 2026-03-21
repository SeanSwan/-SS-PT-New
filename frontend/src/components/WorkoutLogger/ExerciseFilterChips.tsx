/**
 * ┌─── SUB-COMPONENT: ExerciseFilterChips ─────────────────────┐
 * │ PARENT: NASMExerciseRolodex                                 │
 * │ PURPOSE: 10 body-part category filter chips for exercise    │
 * │          search — mobile-optimized horizontal scroll        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────┐    │
 * │ │ [All] [Chest] [Back] [Shoulders] [Arms] [Legs] ...  │    │
 * │ │  ←── horizontal scroll on mobile ──→                 │    │
 * │ └──────────────────────────────────────────────────────┘    │
 * │ Props: { activeCategory, onCategoryChange, categoryCounts } │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

// ─── Category Definitions (match backend bodyPartCategory values) ──

export const EXERCISE_CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Full Body',
  'Cardio',
  'Recovery',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

interface ExerciseFilterChipsProps {
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  /** Optional count per category for badge display */
  categoryCounts?: Record<string, number>;
}

const ExerciseFilterChips: React.FC<ExerciseFilterChipsProps> = memo(({
  activeCategory,
  onCategoryChange,
  categoryCounts,
}) => {
  const active = activeCategory || 'All';

  return (
    <ChipRow role="radiogroup" aria-label="Filter exercises by body part">
      {EXERCISE_CATEGORIES.map((cat) => {
        const isActive = cat === active;
        const count = categoryCounts?.[cat];
        return (
          <Chip
            key={cat}
            role="radio"
            aria-checked={isActive}
            $active={isActive}
            onClick={() => onCategoryChange(cat === 'All' ? null : cat)}
          >
            {cat}
            {count !== undefined && <ChipCount $active={isActive}>{count}</ChipCount>}
          </Chip>
        );
      })}
    </ChipRow>
  );
});

ExerciseFilterChips.displayName = 'ExerciseFilterChips';
export default ExerciseFilterChips;

// ── Styled Components ──

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }

  /* Fade edges on overflow */
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 8px,
    black calc(100% - 8px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 8px,
    black calc(100% - 8px),
    transparent 100%
  );
`;

const Chip = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 2rem;
  white-space: nowrap;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;

  background: ${({ $active }) =>
    $active ? withAlpha(CS.secondary, 0.25) : withAlpha(CS.glow, 0.08)};
  border: 1.5px solid ${({ $active }) =>
    $active ? CS.secondary : 'transparent'};
  color: ${({ $active }) =>
    $active ? CS.text : CS.textSecondary};
  box-shadow: ${({ $active }) =>
    $active ? `0 0 12px ${withAlpha(CS.secondary, 0.2)}` : 'none'};

  &:hover {
    background: ${({ $active }) =>
      $active ? withAlpha(CS.secondary, 0.3) : withAlpha(CS.glow, 0.15)};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

const ChipCount = styled.span<{ $active: boolean }>`
  font-size: 0.65rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 1px 5px;
  border-radius: 1rem;
  background: ${({ $active }) =>
    $active ? withAlpha(CS.secondary, 0.4) : withAlpha(CS.glow, 0.15)};
  color: ${({ $active }) =>
    $active ? CS.text : CS.textSecondary};
`;
