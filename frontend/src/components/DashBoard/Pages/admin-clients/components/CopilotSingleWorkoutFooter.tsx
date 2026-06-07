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
  approvalDisabled?: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
}

const CopilotSingleWorkoutFooter: React.FC<CopilotSingleWorkoutFooterProps> = ({
  state,
  isSubmitting,
  approvalDisabled = false,
  onApprove,
  onRegenerate,
}) => {
  const isApproving = state === 'approving';
  const isApprovalLocked = [isSubmitting, isApproving, approvalDisabled].some(Boolean);
  const approveIcon = isApproving ? <Spinner size={16} /> : <Save size={16} />;
  const approveLabel = isApproving ? 'Saving...' : 'Approve & Save';

  return (
    <ModalFooter>
      <SecondaryButton onClick={onRegenerate} disabled={isSubmitting || isApproving}>
        <RotateCcw size={16} />
        Regenerate
      </SecondaryButton>
      <PrimaryButton onClick={onApprove} disabled={isApprovalLocked}>
        {approveIcon}
        {approveLabel}
      </PrimaryButton>
    </ModalFooter>
  );
};

export default React.memo(CopilotSingleWorkoutFooter);
