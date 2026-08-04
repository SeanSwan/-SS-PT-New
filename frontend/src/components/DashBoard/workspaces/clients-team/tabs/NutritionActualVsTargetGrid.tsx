/**
 * ============================================================================
 * FILE: NutritionActualVsTargetGrid.tsx
 * PURPOSE: Phase 4A actual-vs-target rows (Calories/Protein/Carbs/Fat/Fiber)
 *          with Arctic Cyan data-only fill bars showing the gap, plus the
 *          "No targets yet" empty state with the Set-targets affordance
 *          when no active target exists (HY3 §(a)3).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 */
import React from 'react';
import { Target } from 'lucide-react';
import type { ActualVsTargetResult } from './NutritionCoachTab.logic';
import {
  TargetBarFill,
  TargetBarTrack,
  TargetEmptyCopy,
  TargetEmptyState,
  TargetGridCard,
  TargetGridRow,
  TargetGridRows,
  TargetGridTitle,
  TargetRowLabel,
  TargetRowValue,
} from './NutritionCoachPanels.styles';
import { SetTargetsButton } from './NutritionTabContent.styles';

interface NutritionActualVsTargetGridProps {
  result: ActualVsTargetResult;
  canSetTargets: boolean;
  onSetTargets: () => void;
}

const NutritionActualVsTargetGrid: React.FC<NutritionActualVsTargetGridProps> = ({
  result,
  canSetTargets,
  onSetTargets,
}) => (
  <TargetGridCard aria-label="Actual versus target nutrition">
    <TargetGridTitle>{result.modeLabel}</TargetGridTitle>
    {result.hasTargets ? (
      <TargetGridRows>
        {result.rows.map((row) => (
          <TargetGridRow key={row.id}>
            <TargetRowLabel>{row.label}</TargetRowLabel>
            <TargetBarTrack
              role="img"
              aria-label={`${row.label}: ${row.actualLabel} of ${row.targetLabel}`}
            >
              <TargetBarFill $percent={row.fillPercent} />
            </TargetBarTrack>
            <TargetRowValue $over={row.overTarget}>
              {row.actualLabel} / {row.targetLabel}
            </TargetRowValue>
          </TargetGridRow>
        ))}
      </TargetGridRows>
    ) : (
      <TargetEmptyState role="status">
        <TargetEmptyCopy>No targets yet — set targets to unlock gap tracking.</TargetEmptyCopy>
        {canSetTargets ? (
          <SetTargetsButton
            type="button"
            onClick={onSetTargets}
            aria-label="Set targets for this client"
          >
            <Target size={14} aria-hidden="true" />
            Set targets
          </SetTargetsButton>
        ) : null}
      </TargetEmptyState>
    )}
  </TargetGridCard>
);

export default NutritionActualVsTargetGrid;
