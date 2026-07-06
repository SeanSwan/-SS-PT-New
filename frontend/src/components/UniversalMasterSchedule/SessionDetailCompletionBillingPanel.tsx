/**
 * SessionDetailCompletionBillingPanel
 * ===================================
 * Direct-completion billing choice for paid SwanStudios sessions.
 *
 * Slice 0.1 (server-side completion billing): the panel now shows for every
 * billable, not-yet-deducted session — including insufficient-balance clients
 * (the checkbox is disabled there) — and requires a short waive reason
 * whenever the completion will NOT deduct a credit. The reason is recorded
 * as an immutable audit entry once server-side billing is enabled.
 */

import React from 'react';
import { Caption, Label, SmallText, StyledTextarea } from './ui';
import { NoShowCreditOption, NoShowReasonBox } from './SessionDetailModal.feedbackStyles';

export interface SessionDetailCompletionBillingPanelProps {
  show: boolean;
  canDeductSessionCredit: boolean;
  deductSessionCredit: boolean;
  onDeductSessionCreditChange: (value: boolean) => void;
  showWaiveReason: boolean;
  waiveReason: string;
  onWaiveReasonChange: (value: string) => void;
}

const SessionDetailCompletionBillingPanel: React.FC<SessionDetailCompletionBillingPanelProps> = ({
  show,
  canDeductSessionCredit,
  deductSessionCredit,
  onDeductSessionCreditChange,
  showWaiveReason,
  waiveReason,
  onWaiveReasonChange,
}) => {
  if (!show) {
    return null;
  }

  return (
    <>
      <NoShowCreditOption>
        <input
          aria-label="Deduct paid session credit"
          type="checkbox"
          checked={deductSessionCredit}
          disabled={!canDeductSessionCredit}
          onChange={(event) => onDeductSessionCreditChange(event.target.checked)}
        />
        <span aria-hidden="true">
          <SmallText>Deduct paid session credit</SmallText>
          <Caption secondary>
            {canDeductSessionCredit
              ? 'Turn this off only when admin or trainer is waiving this completed session.'
              : 'Client has no available session credits — completing will record a waived session.'}
          </Caption>
        </span>
      </NoShowCreditOption>
      {showWaiveReason && (
        <NoShowReasonBox>
          <Label htmlFor="completion-waive-reason">Waive reason (required)</Label>
          <StyledTextarea
            id="completion-waive-reason"
            value={waiveReason}
            onChange={(event) => onWaiveReasonChange(event.target.value)}
            placeholder="Why is this completed session not deducting a credit? (min 5 characters)"
            rows={2}
          />
          <SmallText secondary>
            Recorded to the billing audit trail with your name.
          </SmallText>
        </NoShowReasonBox>
      )}
    </>
  );
};

export default SessionDetailCompletionBillingPanel;
