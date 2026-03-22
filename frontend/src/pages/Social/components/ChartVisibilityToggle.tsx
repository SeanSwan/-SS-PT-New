/**
 * ┌─── SUB-COMPONENT: ChartVisibilityToggle ────────────────────┐
 * │ PARENT: ProfileSettings, UserProfilePage                     │
 * │ PURPOSE: Per-chart opt-in toggles for public profile display │
 * │ WIREFRAME:                                                    │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │ Chart Visibility                         │                 │
 * │ │ ☑ Weight Progression   ☐ Workout Heatmap │                 │
 * │ │ ☑ Muscle Radar         ☐ Body Composition│                 │
 * │ │ ☑ Goal Progress        ☐ Strength 1RM    │                 │
 * │ │ [Save]                                   │                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { chartVisibility, onSave }                            │
 * │ CLICK-OUTCOMES:                                               │
 * │ [Toggle] → Flips local state for that chart                   │
 * │ [Save] → PUT /api/profile with chartVisibility JSONB          │
 * └───────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface ChartVisibility {
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

const CHART_LABELS: Record<keyof ChartVisibility, string> = {
  workoutFrequency: 'Workout Frequency',
  weightProgression: 'Weight Progression',
  muscleRadar: 'Muscle Group Focus',
  macroSplit: 'Macro Split',
  cardioEndurance: 'Cardio Endurance',
  sessionFrequency: 'Session Frequency',
  bodyFatTrend: 'Body Fat Trend',
  muscleRecovery: 'Muscle Recovery',
  rpeByExercise: 'Exercise Intensity (RPE)',
  exerciseRolodex: 'Exercise History',
  workoutHeatmap: 'Workout Heatmap',
  goalProgress: 'Goal Progress',
};

const DEFAULT_VISIBILITY: ChartVisibility = {
  workoutFrequency: false,
  weightProgression: false,
  muscleRadar: false,
  macroSplit: false,
  cardioEndurance: false,
  sessionFrequency: false,
  bodyFatTrend: false,
  muscleRecovery: false,
  rpeByExercise: false,
  exerciseRolodex: false,
  workoutHeatmap: false,
  goalProgress: false,
};

interface ChartVisibilityToggleProps {
  chartVisibility?: Partial<ChartVisibility>;
  onSave: (visibility: ChartVisibility) => Promise<void>;
  saving?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ChartVisibilityToggle: React.FC<ChartVisibilityToggleProps> = ({
  chartVisibility,
  onSave,
  saving = false,
}) => {
  const [local, setLocal] = useState<ChartVisibility>({
    ...DEFAULT_VISIBILITY,
    ...chartVisibility,
  });
  const [dirty, setDirty] = useState(false);

  const toggle = useCallback((key: keyof ChartVisibility) => {
    setLocal(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setDirty(true);
      return next;
    });
  }, []);

  const handleSave = async () => {
    await onSave(local);
    setDirty(false);
  };

  return (
    <Card>
      <CardTitle>Chart Visibility</CardTitle>
      <Description>Choose which charts appear on your public profile</Description>
      <Grid>
        {(Object.keys(CHART_LABELS) as Array<keyof ChartVisibility>).map(key => (
          <ToggleRow key={key}>
            <ToggleInput
              type="checkbox"
              id={`cv-${key}`}
              checked={local[key]}
              onChange={() => toggle(key)}
            />
            <ToggleLabel htmlFor={`cv-${key}`}>
              {CHART_LABELS[key]}
            </ToggleLabel>
          </ToggleRow>
        ))}
      </Grid>
      <SaveButton onClick={handleSave} disabled={!dirty || saving}>
        {saving ? 'Saving…' : 'Save'}
      </SaveButton>
    </Card>
  );
};

export default ChartVisibilityToggle;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Card = styled.div`
  background: ${({ theme }) => theme?.colors?.surface || '#1A1A24'};
  border-radius: 16px;
  border: 1px solid rgba(80, 160, 240, 0.15);
  padding: 1.25rem;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 4px;
`;

const Description = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0 0 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;

  @media (max-width: 768px) {
    min-height: 44px;
  }
`;

const ToggleInput = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #8B5CF6;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const ToggleLabel = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  color: #E0ECF4;
  cursor: pointer;
`;

const SaveButton = styled.button`
  margin-top: 1rem;
  min-height: 44px;
  padding: 10px 32px;
  border-radius: 10px;
  border: none;
  background: #8B5CF6;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 16px rgba(96, 192, 240, 0.2);

  &:hover:not(:disabled) {
    background: #7c3aed;
    box-shadow: 0 0 24px rgba(96, 192, 240, 0.3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }
`;
