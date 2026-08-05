/**
 * ============================================================================
 * FILE: CoachClientNutritionHeader.tsx
 * PURPOSE: 44px identity row for the coach nutrition tab — client alias +
 *          relative last-log signal + staff Set-targets affordance (HY3 §(a)1).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 */
import React from 'react';
import { Target } from 'lucide-react';
import type { LastLogView } from './NutritionCoachTab.logic';
import {
  CoachHeaderAlias,
  CoachHeaderIdentity,
  CoachHeaderLastLog,
  CoachHeaderRow,
} from './NutritionCoachTab.styles';
import { SetTargetsButton } from './NutritionTabContent.styles';

interface CoachClientNutritionHeaderProps {
  clientName: string;
  lastLog: LastLogView;
  canSetTargets: boolean;
  onSetTargets: () => void;
}

const CoachClientNutritionHeader: React.FC<CoachClientNutritionHeaderProps> = ({
  clientName,
  lastLog,
  canSetTargets,
  onSetTargets,
}) => (
  <CoachHeaderRow>
    <CoachHeaderIdentity>
      <CoachHeaderAlias>{clientName}</CoachHeaderAlias>
      <CoachHeaderLastLog $tone={lastLog.tone}>{lastLog.label}</CoachHeaderLastLog>
    </CoachHeaderIdentity>
    {canSetTargets ? (
      <SetTargetsButton
        type="button"
        onClick={onSetTargets}
        aria-label={`Set nutrition targets for ${clientName}`}
      >
        <Target size={14} aria-hidden="true" />
        Set targets
      </SetTargetsButton>
    ) : null}
  </CoachHeaderRow>
);

export default CoachClientNutritionHeader;
