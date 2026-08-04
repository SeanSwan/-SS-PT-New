/**
 * ============================================================================
 * FILE: NutritionDateStepper.tsx
 * PURPOSE: Phase 4A [‹] date [›] stepper (44px, Dual-Button Glow purple->cyan)
 *          with future-stepping disabled, plus the 7-day range toggle that
 *          switches the timeline fetch to start/end mode (HY3 §(a)4).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 */
import React from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import {
  canStepNutritionForward,
  formatNutritionStepperLabel,
} from './NutritionCoachTab.logic';
import {
  RangeToggleButton,
  StepperButton,
  StepperDateLabel,
  StepperRow,
} from './NutritionCoachPanels.styles';

interface NutritionDateStepperProps {
  dateIso: string;
  todayIso: string;
  rangeMode: boolean;
  onStep: (delta: 1 | -1) => void;
  onToggleRange: () => void;
}

const NutritionDateStepper: React.FC<NutritionDateStepperProps> = ({
  dateIso,
  todayIso,
  rangeMode,
  onStep,
  onToggleRange,
}) => {
  const forwardEnabled = canStepNutritionForward(dateIso, todayIso);

  return (
    <StepperRow>
      <StepperButton
        type="button"
        aria-label="Previous day"
        onClick={() => onStep(-1)}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </StepperButton>
      <StepperDateLabel aria-live="polite">
        {formatNutritionStepperLabel(dateIso)}
      </StepperDateLabel>
      <StepperButton
        type="button"
        aria-label="Next day"
        disabled={!forwardEnabled}
        onClick={() => onStep(1)}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </StepperButton>
      <RangeToggleButton
        type="button"
        $active={rangeMode}
        aria-pressed={rangeMode}
        aria-label="Toggle 7-day range view"
        onClick={onToggleRange}
      >
        <TrendingUp size={14} aria-hidden="true" />
        {rangeMode ? '7-day range on' : '7-day range'}
      </RangeToggleButton>
    </StepperRow>
  );
};

export default NutritionDateStepper;
