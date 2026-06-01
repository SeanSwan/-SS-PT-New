/**
 * SessionDetailClientCancelReasonPanel
 * ====================================
 * Plain client cancellation reason entry shown before late-cancel warning is needed.
 */

import React from 'react';
import { Caption, FormField, Label, SmallText, StyledInput } from './ui';
import { EarlyCancelOption } from './SessionDetailModal.baseStyles';

export interface SessionDetailClientCancelReasonPanelProps {
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  isEarlyCancelEligible: boolean;
  earlyCancel: boolean;
  onEarlyCancelChange: (value: boolean) => void;
}

const SessionDetailClientCancelReasonPanel: React.FC<SessionDetailClientCancelReasonPanelProps> = ({
  cancelReason,
  onCancelReasonChange,
  isEarlyCancelEligible,
  earlyCancel,
  onEarlyCancelChange,
}) => (
  <FormField>
    <Label htmlFor="cancel-reason">Cancellation Reason (optional)</Label>
    <StyledInput
      id="cancel-reason"
      type="text"
      value={cancelReason}
      onChange={(event) => onCancelReasonChange(event.target.value)}
      placeholder="Reason for cancelling this session"
    />
    {isEarlyCancelEligible && (
      <EarlyCancelOption>
        <input
          type="checkbox"
          id="early-cancel"
          checked={earlyCancel}
          onChange={(event) => onEarlyCancelChange(event.target.checked)}
        />
        <label htmlFor="early-cancel">
          <SmallText>Early Cancel (no session credit deducted)</SmallText>
          <Caption secondary>Available for cancellations more than 24 hours before session</Caption>
        </label>
      </EarlyCancelOption>
    )}
  </FormField>
);

export default SessionDetailClientCancelReasonPanel;
