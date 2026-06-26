import React from 'react';
import styled from 'styled-components';
import { BrainCircuit } from 'lucide-react';
import type { SwanCoachGenerationMode } from './WorkoutPlannerGuidedCandidateTypes';
import { PlanModeBar, PlanModeLabel } from './WorkoutPlannerStyles';

const ModeGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ModeButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => (
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.15))'
  )};
  background: ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, var(--bg-base, #030712))'
      : 'var(--bg-base, #030712)'
  )};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0 12px;
  cursor: pointer;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 3px; }
`;

interface WorkoutPlannerGenerationModeSectionProps {
  generationMode: SwanCoachGenerationMode;
  onGenerationModeChange: (mode: SwanCoachGenerationMode) => void;
}

const MODES: Array<{ value: SwanCoachGenerationMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'guide_me', label: 'Guide Me' },
  { value: 'deep_grill', label: 'Deep Grill' },
];

const WorkoutPlannerGenerationModeSection: React.FC<WorkoutPlannerGenerationModeSectionProps> = ({
  generationMode,
  onGenerationModeChange,
}) => (
  <PlanModeBar>
    <PlanModeLabel><BrainCircuit size={14} /> Generation Mode</PlanModeLabel>
    <ModeGroup aria-label="Swan Coach generation mode">
      {MODES.map(mode => (
        <ModeButton
          key={mode.value}
          type="button"
          aria-pressed={generationMode === mode.value}
          $active={generationMode === mode.value}
          onClick={() => onGenerationModeChange(mode.value)}
        >
          {mode.label}
        </ModeButton>
      ))}
    </ModeGroup>
  </PlanModeBar>
);

export default WorkoutPlannerGenerationModeSection;