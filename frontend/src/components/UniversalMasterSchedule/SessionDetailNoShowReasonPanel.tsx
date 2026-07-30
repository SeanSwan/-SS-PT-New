/**
 * SessionDetailNoShowReasonPanel
 * ==============================
 * Active no-show reason entry plus recorded no-show reason display.
 */

import React from 'react';
import { BodyText, Caption, Label, SmallText, StyledTextarea } from './ui';
import {
  NoShowCreditOption,
  NoShowReasonBox,
  NoShowReasonDisplay,
} from './SessionDetailModal.feedbackStyles';

export interface SessionDetailNoShowReasonPanelProps {
  showNoShowReason: boolean;
  noShowReasonInput: string;
  onNoShowReasonChange: (value: string) => void;
  canDeductSessionCredit: boolean;
  deductSessionCredit: boolean;
  onDeductSessionCreditChange: (value: boolean) => void;
  recordedNoShowReason?: string | null;
}

const SessionDetailNoShowReasonPanel: React.FC<SessionDetailNoShowReasonPanelProps> = ({
  showNoShowReason,
  noShowReasonInput,
  onNoShowReasonChange,
  canDeductSessionCredit,
  deductSessionCredit,
  onDeductSessionCreditChange,
  recordedNoShowReason,
}) => (
  <>
    {showNoShowReason && (
      <NoShowReasonBox>
        <Label htmlFor="no-show-reason">No-Show Reason (Optional)</Label>
        <StyledTextarea
          id="no-show-reason"
          value={noShowReasonInput}
          onChange={(event) => onNoShowReasonChange(event.target.value)}
          placeholder="Enter reason for no-show..."
          rows={3}
        />
        {/*
          Rule 75: this used to promise "Client will be notified about the
          no-show." The email is real (sessionRoutes.mjs attendance handler) but
          shouldNotifyClient() suppresses it when the client has no email, has
          email notifications off, or is inside their quiet hours — and the
          no-show path passes no `force`, so a suppressed notice is dropped, not
          deferred. Whoever marks the no-show needs to know they may still have
          to follow up personally.
        */}
        <SmallText secondary>
          We'll email the client — unless they've turned notifications off or are in quiet hours.
        </SmallText>
        {canDeductSessionCredit && (
          <NoShowCreditOption>
            <input
              aria-label="Deduct one SwanStudios session credit"
              type="checkbox"
              checked={deductSessionCredit}
              onChange={(event) => onDeductSessionCreditChange(event.target.checked)}
            />
            <span aria-hidden="true">
              <SmallText>Deduct one SwanStudios session credit</SmallText>
              <Caption secondary>
                Turn this off when admin or trainer is sparing the session.
              </Caption>
            </span>
          </NoShowCreditOption>
        )}
      </NoShowReasonBox>
    )}

    {recordedNoShowReason && (
      <NoShowReasonDisplay>
        <Caption secondary>No-Show Reason</Caption>
        <BodyText>{recordedNoShowReason}</BodyText>
      </NoShowReasonDisplay>
    )}
  </>
);

export default SessionDetailNoShowReasonPanel;
