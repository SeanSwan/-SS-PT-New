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
  onRegenerate: () => void;
  onApprove: () => void;
}

const LongHorizonReviewFooter: React.FC<LongHorizonReviewFooterProps> = ({
  state,
  isSubmitting,
  auditLogId,
  onRegenerate,
  onApprove,
}) => (
  <>
    <SecondaryButton onClick={onRegenerate} disabled={isSubmitting}>
      <RotateCcw size={16} />
      Regenerate
    </SecondaryButton>
    <PrimaryButton
      onClick={onApprove}
      disabled={isSubmitting || state === 'approving' || auditLogId == null}
    >
      {state === 'approving' ? <Spinner size={16} /> : <Save size={16} />}
      {state === 'approving' ? 'Saving...' : 'Approve & Save'}
    </PrimaryButton>
  </>
);

export default React.memo(LongHorizonReviewFooter);
