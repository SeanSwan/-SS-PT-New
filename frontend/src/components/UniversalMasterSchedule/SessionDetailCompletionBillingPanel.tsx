/**
 * SessionDetailCompletionBillingPanel
 * ===================================
 * Direct-completion billing choice for paid SwanStudios sessions.
 */

import React from 'react';
import { Caption, SmallText } from './ui';
import { NoShowCreditOption } from './SessionDetailModal.feedbackStyles';

export interface SessionDetailCompletionBillingPanelProps {
  show: boolean;
  deductSessionCredit: boolean;
  onDeductSessionCreditChange: (value: boolean) => void;
}

const SessionDetailCompletionBillingPanel: React.FC<SessionDetailCompletionBillingPanelProps> = ({
  show,
  deductSessionCredit,
  onDeductSessionCreditChange,
}) => {
  if (!show) {
    return null;
  }

  return (
    <NoShowCreditOption>
      <input
        aria-label="Deduct paid session credit"
        type="checkbox"
        checked={deductSessionCredit}
        onChange={(event) => onDeductSessionCreditChange(event.target.checked)}
      />
      <span aria-hidden="true">
        <SmallText>Deduct paid session credit</SmallText>
        <Caption secondary>
          Turn this off only when admin or trainer is waiving this completed session.
        </Caption>
      </span>
    </NoShowCreditOption>
  );
};

export default SessionDetailCompletionBillingPanel;
