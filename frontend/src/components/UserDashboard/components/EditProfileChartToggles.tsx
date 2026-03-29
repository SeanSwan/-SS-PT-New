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
 * │ │ [ ] Training Load       [ ] Weekly Vol  │                 │
 * │ │ [ ] Exercise Compare    [ ] Cardio End  │                 │
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

// Aligned with ProfileChartsSection chart registry + backend validation
export interface ProfileChartVisibility {
  workoutFrequency: boolean;
  weightProgression: boolean;
  muscleRadar: boolean;
  macroSplit: boolean;
  cardioEndurance: boolean;
  sessionFrequency: boolean;
  bodyFatTrend: boolean;
  muscleRecovery: boolean;
  rpeByExercise: boolean;
  exerciseRolodex: boolean;
  workoutHeatmap: boolean;
  goalProgress: boolean;
}

export const DEFAULT_CHART_VISIBILITY: ProfileChartVisibility = {
  workoutFrequency: false,
  weightProgression: true,
  muscleRadar: true,
  macroSplit: false,
  cardioEndurance: false,
  sessionFrequency: false,
  bodyFatTrend: false,
  muscleRecovery: false,
  rpeByExercise: false,
  exerciseRolodex: false,
  workoutHeatmap: true,
  goalProgress: true,
};

const CHART_LABELS: Record<keyof ProfileChartVisibility, string> = {
  workoutFrequency: 'Workout Frequency',
  weightProgression: 'Weight Progression',
  muscleRadar: 'Muscle Group Radar',
  macroSplit: 'Macro Split',
  cardioEndurance: 'Cardio Endurance',
  sessionFrequency: 'Session Frequency',
  bodyFatTrend: 'Body Fat Trend',
  muscleRecovery: 'Muscle Recovery',
  rpeByExercise: 'RPE by Exercise',
  exerciseRolodex: 'Exercise History',
  workoutHeatmap: 'Workout Heatmap',
  goalProgress: 'Goal Progress',
};

interface EditProfileChartTogglesProps {
  chartVisibility: ProfileChartVisibility;
  onToggle: (key: keyof ProfileChartVisibility) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (theme-aware via CSS variables)
// ─────────────────────────────────────────────────────────────

const Subtitle = styled.p`
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
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
    background: var(--accent-primary-10, rgba(96, 192, 240, 0.06));
  }
`;

/* Custom checkbox using CSS variables for theme support */
const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  min-width: 20px;
  border: 2px solid var(--border-soft, rgba(96, 192, 240, 0.25));
  border-radius: 4px;
  background: var(--bg-base, #0A0A0F);
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;

  &:checked {
    background: var(--accent-secondary, #8B5CF6);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:checked::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 5px;
    width: 5px;
    height: 9px;
    border: solid var(--text-heading, #E0ECF4);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const ToggleLabel = styled.span`
  color: var(--text-primary, #E0ECF4);
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
