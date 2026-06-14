/**
 * Component: WorkoutPlannerTrainingStyleSection
 * Purpose: Compact Swan Coach style controls for workout-builder generation.
 */

import React from 'react';
import { Flame } from 'lucide-react';
import type { HardcoreTrainingMethod, TrainingIntensityMode } from './WorkoutPlannerTypes';
import {
  HARDCORE_TRAINING_METHODS,
  TRAINING_INTENSITY_OPTIONS,
} from './WorkoutPlannerTypes';
import {
  PlanModeBar,
  PlanModeLabel,
  SmallSelect,
} from './WorkoutPlannerStyles';

interface WorkoutPlannerTrainingStyleSectionProps {
  trainingIntensityMode: TrainingIntensityMode;
  hardcoreMethod: HardcoreTrainingMethod;
  onTrainingIntensityModeChange: (mode: TrainingIntensityMode) => void;
  onHardcoreMethodChange: (method: HardcoreTrainingMethod) => void;
}

const WorkoutPlannerTrainingStyleSection: React.FC<WorkoutPlannerTrainingStyleSectionProps> = ({
  trainingIntensityMode,
  hardcoreMethod,
  onTrainingIntensityModeChange,
  onHardcoreMethodChange,
}) => (
  <PlanModeBar>
    <PlanModeLabel><Flame size={14} /> Swan Coach Style</PlanModeLabel>
    <SmallSelect
      value={trainingIntensityMode}
      onChange={event => onTrainingIntensityModeChange(event.target.value as TrainingIntensityMode)}
      aria-label="Select Swan Coach training style"
    >
      {TRAINING_INTENSITY_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </SmallSelect>
    {trainingIntensityMode === 'hardcore' && (
      <>
        <PlanModeLabel>Method</PlanModeLabel>
        <SmallSelect
          value={hardcoreMethod}
          onChange={event => onHardcoreMethodChange(event.target.value as HardcoreTrainingMethod)}
          aria-label="Select Hardcore method"
        >
          {HARDCORE_TRAINING_METHODS.map(method => (
            <option key={method.value} value={method.value}>{method.label}</option>
          ))}
        </SmallSelect>
      </>
    )}
  </PlanModeBar>
);

export default WorkoutPlannerTrainingStyleSection;
