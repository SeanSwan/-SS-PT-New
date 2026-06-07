/**
 * LongHorizonReviewFooter
 *
 * Purpose: Renders approval controls for a reviewed long-horizon draft while
 * LongHorizonContent owns the state transitions.
 */

import React from 'react';
import { RotateCcw, Save } from 'lucide-react';
import {
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from './copilot-shared-styles';

interface LongHorizonReviewFooterProps {
  state: 'plan_review' | 'approving';
  isSubmitting: boolean;
  auditLogId: number | null;
  approvalDisabled?: boolean;
  onRegenerate: () => void;
  onApprove: () => void;
}

const LongHorizonReviewFooter: React.FC<LongHorizonReviewFooterProps> = ({
  state,
  isSubmitting,
  auditLogId,
  approvalDisabled = false,
  onRegenerate,
  onApprove,
}) => {
  const isApproving = state === 'approving';
  const isApprovalLocked = [isSubmitting, isApproving, auditLogId == null, approvalDisabled].some(Boolean);
  const approveIcon = isApproving ? <Spinner size={16} /> : <Save size={16} />;
  const approveLabel = isApproving ? 'Saving...' : 'Approve & Save';

  return (
    <>
      <SecondaryButton onClick={onRegenerate} disabled={isSubmitting}>
        <RotateCcw size={16} />
        Regenerate
      </SecondaryButton>
      <PrimaryButton onClick={onApprove} disabled={isApprovalLocked}>
        {approveIcon}
        {approveLabel}
      </PrimaryButton>
    </>
  );
};

export default React.memo(LongHorizonReviewFooter);
