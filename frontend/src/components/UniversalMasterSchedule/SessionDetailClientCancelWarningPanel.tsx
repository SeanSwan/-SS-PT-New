/**
 * SessionDetailClientCancelWarningPanel
 * =====================================
 * Client-facing late/early cancellation confirmation branch for SessionDetailModal.
 */

import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { FormField, Label, StyledInput } from './ui';
import {
  EarlyCancelHeader,
  EarlyCancelPanel,
  LateCancelActionButton,
  LateCancelBackButton,
  LateCancelButtonRow,
  LateCancelFeeAmount,
  LateCancelFeeBox,
  LateCancelFeeLabel,
  LateCancelHoursLeft,
  LateCancelSessionDate,
  LateCancelSessionInfo,
  LateCancelWarningHeader,
  LateCancelWarningIcon,
  LateCancelWarningMessage,
  LateCancelWarningPanel,
  PositiveLateCancelWarningMessage,
} from './SessionDetailModal.lateCancelStyles';
import type { LateCancelWarningModel } from './SessionDetailModal.actions';

export interface SessionDetailClientCancelWarningPanelProps {
  lateCancelWarning: LateCancelWarningModel;
  loading: boolean;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

const SessionDetailClientCancelWarningPanel: React.FC<SessionDetailClientCancelWarningPanelProps> = ({
  lateCancelWarning,
  loading,
  cancelReason,
  onCancelReasonChange,
  onBack,
  onConfirm,
}) => {
  const reasonField = (
    <FormField>
      <Label htmlFor="cancel-reason">Cancellation Reason (optional)</Label>
      <StyledInput
        id="cancel-reason"
        type="text"
        value={cancelReason}
        onChange={(event) => onCancelReasonChange(event.target.value)}
        placeholder="Reason for cancelling"
      />
    </FormField>
  );

  const actionRow = (
    <LateCancelButtonRow>
      <LateCancelBackButton
        onClick={onBack}
        disabled={loading}
      >
        Go Back
      </LateCancelBackButton>
      <LateCancelActionButton
        variant={lateCancelWarning.isLateCancellation ? 'ruby' : 'emerald'}
        size="medium"
        onClick={onConfirm}
        disabled={loading}
        isLoading={loading}
      >
        {loading
          ? 'Cancelling...'
          : lateCancelWarning.isLateCancellation
            ? 'I Understand, Cancel Session'
            : 'Cancel Session (No Fee)'}
      </LateCancelActionButton>
    </LateCancelButtonRow>
  );

  if (!lateCancelWarning.isLateCancellation) {
    return (
      <EarlyCancelPanel>
        <EarlyCancelHeader>
          <span aria-hidden="true">
            <Check size={16} />
          </span>
          Free Cancellation Available
        </EarlyCancelHeader>
        <LateCancelSessionInfo>
          <LateCancelSessionDate>{lateCancelWarning.sessionDateFormatted}</LateCancelSessionDate>
          <LateCancelHoursLeft>
            {lateCancelWarning.hoursUntilSession.toFixed(1)} hours until session
          </LateCancelHoursLeft>
        </LateCancelSessionInfo>
        <PositiveLateCancelWarningMessage>
          {lateCancelWarning.warningMessage}
        </PositiveLateCancelWarningMessage>
        {reasonField}
        {actionRow}
      </EarlyCancelPanel>
    );
  }

  return (
    <LateCancelWarningPanel>
      <LateCancelWarningHeader>
        <LateCancelWarningIcon>
          <AlertTriangle size={18} aria-hidden="true" />
        </LateCancelWarningIcon>
        Late Cancellation Warning
      </LateCancelWarningHeader>
      <LateCancelSessionInfo>
        <LateCancelSessionDate>{lateCancelWarning.sessionDateFormatted}</LateCancelSessionDate>
        <LateCancelHoursLeft>
          {lateCancelWarning.hoursUntilSession > 0
            ? `${lateCancelWarning.hoursUntilSession.toFixed(1)} hours until session`
            : 'Session time has passed'}
        </LateCancelHoursLeft>
      </LateCancelSessionInfo>
      <LateCancelWarningMessage>
        {lateCancelWarning.warningMessage}
      </LateCancelWarningMessage>
      <LateCancelFeeBox>
        <LateCancelFeeLabel>Late Cancellation Fee</LateCancelFeeLabel>
        <LateCancelFeeAmount>
          {lateCancelWarning.lateFeeAmount === null
            ? 'See cancellation policy'
            : `$${lateCancelWarning.lateFeeAmount.toFixed(2)}`}
        </LateCancelFeeAmount>
      </LateCancelFeeBox>
      {reasonField}
      {actionRow}
    </LateCancelWarningPanel>
  );
};

export default SessionDetailClientCancelWarningPanel;
