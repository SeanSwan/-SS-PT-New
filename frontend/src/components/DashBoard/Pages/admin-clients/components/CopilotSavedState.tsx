/**
 * ============================================================================
 * FILE: CopilotSavedState.tsx
 * PURPOSE: Success state UI after a workout plan is approved and saved.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows the plan ID, unmatched exercises (if any),
 * validation warnings, and a close button after successful plan approval.
 *
 * HOW IT FITS IN THE APP: WorkoutCopilotPanel → CopilotSavedState
 * (when state === 'saved')
 *
 * KEY DECISIONS: Unmatched exercises are shown as warnings (not errors)
 * because the plan is already saved — they just won't link to the exercise
 * library for tracking.
 */

/**
 * ┌─── SUB-COMPONENT: CopilotSavedState ─────────────────────┐
 * │ PARENT: WorkoutCopilotPanel                                 │
 * │ PURPOSE: Success confirmation with warnings                 │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────┐                  │
 * │ │  ✓ Plan Approved and Saved             │                  │
 * │ │  Plan ID: 42 for ClientName            │                  │
 * │ │  [unmatched exercises warning]         │                  │
 * │ │  [validation warnings]                 │                  │
 * │ │  [Close]                               │                  │
 * │ └────────────────────────────────────────┘                  │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Close] → onClose                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { ValidationError } from './copilot-types';
import {
  CenterContent,
  SecondaryButton,
  InfoPanel,
  InfoContent,
} from './copilot-shared-styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────

interface CopilotSavedStateProps {
  savedPlanId: number | null;
  clientName: string;
  unmatchedExercises: Array<{ dayNumber: number; name: string }>;
  validationWarnings: ValidationError[];
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const CopilotSavedState: React.FC<CopilotSavedStateProps> = ({
  savedPlanId,
  clientName,
  unmatchedExercises,
  validationWarnings,
  onClose,
}) => (
  <CenterContent>
    <CheckCircle2 size={48} color="#00ff64" />
    <h3 style={{ color: '#00ff64', margin: 0 }}>Plan Approved and Saved</h3>
    <p style={{ color: '#94a3b8', margin: 0 }}>
      Plan ID: <strong style={{ color: '#e2e8f0' }}>{savedPlanId}</strong> for {clientName}
    </p>

    {unmatchedExercises.length > 0 && (
      <InfoPanel $variant="warning">
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <InfoContent>
          <strong>Unmatched exercises</strong> (not in library):
          {unmatchedExercises.map((e, i) => (
            <div key={i}>Day {e.dayNumber}: {e.name}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}

    {validationWarnings.length > 0 && (
      <InfoPanel $variant="warning">
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <InfoContent>
          {validationWarnings.map((w, i) => (
            <div key={i}>{w.message}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}

    <SecondaryButton onClick={onClose}>Close</SecondaryButton>
  </CenterContent>
);

export default React.memo(CopilotSavedState);
