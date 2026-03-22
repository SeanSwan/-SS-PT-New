/**
 * ┌─── SUB-COMPONENT: EditProfileChartToggles ─────────────────┐
 * │ PARENT: EditProfileModal                                     │
 * │ PURPOSE: Inline chart visibility toggles for profile edit    │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │ Chart Visibility                         │                 │
 * │ │ Choose which charts show on your profile │                 │
 * │ │ [x] Weight Progression  [x] Heatmap     │                 │
 * │ │ [x] Muscle Radar        [x] Goal Prog   │                 │
 * │ │ [ ] Body Fat Trend      [ ] Strength 1RM│                 │
 * │ │ [ ] Calorie Burn        [ ] Session Freq│                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { chartVisibility, onToggle }                         │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Toggle] -> onToggle(chartKey) flips boolean                 │
 * └──────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { BarChart3 } from 'lucide-react';
import { SectionHeading } from './EditProfileModalStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface ProfileChartVisibility {
  weightProgression: boolean;
  workoutHeatmap: boolean;
  muscleRadar: boolean;
  goalProgress: boolean;
  bodyFatTrend: boolean;
  strength1RM: boolean;
  calorieBurn: boolean;
  sessionFrequency: boolean;
}

export const DEFAULT_CHART_VISIBILITY: ProfileChartVisibility = {
  weightProgression: true,
  workoutHeatmap: true,
  muscleRadar: true,
  goalProgress: true,
  bodyFatTrend: false,
  strength1RM: false,
  calorieBurn: false,
  sessionFrequency: false,
};

const CHART_LABELS: Record<keyof ProfileChartVisibility, string> = {
  weightProgression: 'Weight Progression',
  workoutHeatmap: 'Workout Heatmap',
  muscleRadar: 'Muscle Group Radar',
  goalProgress: 'Goal Progress',
  bodyFatTrend: 'Body Fat Trend',
  strength1RM: 'Strength 1RM',
  calorieBurn: 'Calorie Burn',
  sessionFrequency: 'Session Frequency',
};

interface EditProfileChartTogglesProps {
  chartVisibility: ProfileChartVisibility;
  onToggle: (key: keyof ProfileChartVisibility) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Subtitle = styled.p`
  color: rgba(224, 236, 244, 0.45);
  font-size: 0.8rem;
  margin: -0.5rem 0 0.75rem;
`;

const ToggleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  user-select: none;

  &:hover {
    background: rgba(96, 192, 240, 0.06);
  }
`;

/* Custom checkbox: 20x20 with Crystalline Swan colors */
const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border: 2px solid rgba(96, 192, 240, 0.25);
  border-radius: 4px;
  background: ${({ theme }) => theme?.colors?.obsidianBlack || '#0A0A0F'};
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;

  &:checked {
    background: #8B5CF6;
    border-color: #8B5CF6;
  }

  &:checked::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 5px;
    width: 5px;
    height: 9px;
    border: solid #E0ECF4;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const ToggleLabel = styled.span`
  color: #E0ECF4;
  font-size: 0.8125rem;
  font-family: 'Sora', sans-serif;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const EditProfileChartToggles: React.FC<EditProfileChartTogglesProps> = ({
  chartVisibility,
  onToggle,
}) => {
  const keys = Object.keys(CHART_LABELS) as (keyof ProfileChartVisibility)[];

  return (
    <>
      <SectionHeading>
        <BarChart3 size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Chart Visibility
      </SectionHeading>
      <Subtitle>Choose which charts appear on your public profile</Subtitle>

      <ToggleGrid>
        {keys.map((key) => (
          <ToggleItem key={key} htmlFor={`chart-${key}`}>
            <Checkbox
              id={`chart-${key}`}
              checked={chartVisibility[key]}
              onChange={() => onToggle(key)}
            />
            <ToggleLabel>{CHART_LABELS[key]}</ToggleLabel>
          </ToggleItem>
        ))}
      </ToggleGrid>
    </>
  );
};

export default React.memo(EditProfileChartToggles);
