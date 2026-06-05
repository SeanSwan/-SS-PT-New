/**
 * CopilotSingleWorkoutFooter
 *
 * Purpose: Pure footer actions for approving or regenerating a single
 * AI-generated workout draft.
 */

import React from 'react';
import { RotateCcw, Save } from 'lucide-react';
import type { CopilotState } from './copilot-types';
import {
  ModalFooter,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from './copilot-shared-styles';

interface CopilotSingleWorkoutFooterProps {
  state: Extract<CopilotState, 'draft_review' | 'approving'>;
  isSubmitting: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
}

const CopilotSingleWorkoutFooter: React.FC<CopilotSingleWorkoutFooterProps> = ({
  state,
  isSubmitting,
  onApprove,
  onRegenerate,
}) => (
  <ModalFooter>
    <SecondaryButton onClick={onRegenerate}>
      <RotateCcw size={16} />
      Regenerate
    </SecondaryButton>
    <PrimaryButton onClick={onApprove} disabled={isSubmitting || state === 'approving'}>
      {state === 'approving' ? <Spinner size={16} /> : <Save size={16} />}
      {state === 'approving' ? 'Saving...' : 'Approve & Save'}
    </PrimaryButton>
  </ModalFooter>
);

export default React.memo(CopilotSingleWorkoutFooter);
