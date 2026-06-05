/**
 * LongHorizonErrorState
 *
 * Purpose: Renders long-horizon generation/approval errors with the correct
 * retry, override, waiver, and assignment guidance.
 */

import React from 'react';
import {
  AlertTriangle,
  FileWarning,
  Info,
  RefreshCw,
  Shield,
} from 'lucide-react';
import type {
  LongHorizonErrorFlags,
  LongHorizonValidationError,
} from './longHorizonErrors';
import {
  CenterContent,
  InfoContent,
  InfoPanel,
  PrimaryButton,
  SecondaryButton,
} from './copilot-shared-styles';
import {
  ActionRow,
  ErrorList,
  IconSlot,
  PanelCopy,
  PanelTitle,
} from './LongHorizonContent.styles';

interface LongHorizonErrorStateProps {
  state: 'error' | 'approve_error';
  errorMessage: string;
  errorFlags: LongHorizonErrorFlags;
  approveErrors: LongHorizonValidationError[];
  validationWarnings: string[];
  isSubmitting: boolean;
  onRetry: () => void;
  onAddOverride: () => void;
  onBackToConfigure: () => void;
  onClose: () => void;
}

const LongHorizonErrorState: React.FC<LongHorizonErrorStateProps> = ({
  state,
  errorMessage,
  errorFlags,
  approveErrors,
  validationWarnings,
  isSubmitting,
  onRetry,
  onAddOverride,
  onBackToConfigure,
  onClose,
}) => (
  <CenterContent>
    <AlertTriangle size={48} color="#ff6b6b" />
    <PanelTitle $tone="error">
      {state === 'approve_error' ? 'Approval Failed' : 'Generation Failed'}
    </PanelTitle>
    <PanelCopy $maxWidth={560}>{errorMessage}</PanelCopy>

    {errorFlags.isApprovedDraftInvalid && approveErrors.length > 0 && (
      <ErrorList>
        {approveErrors.map((err, idx) => (
          <InfoPanel key={`${err.code}-${idx}`} $variant="error">
            <IconSlot><FileWarning size={16} /></IconSlot>
            <InfoContent>
              <strong>{err.field || err.code}:</strong> {err.message}
            </InfoContent>
          </InfoPanel>
        ))}
      </ErrorList>
    )}

    {validationWarnings.length > 0 && (
      <InfoPanel $variant="warning">
        <IconSlot><Info size={16} /></IconSlot>
        <InfoContent>
          {validationWarnings.map((warning, idx) => (
            <div key={`${warning}-${idx}`}>{warning}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}

    {errorFlags.isConsentError && (
      <InfoPanel $variant="warning">
        <IconSlot><Shield size={16} /></IconSlot>
        <InfoContent>
          {errorFlags.isWaiverError
            ? 'This client\'s waiver consent is missing or outdated. The client must sign the current waiver, or an admin override reason is required to proceed.'
            : 'Swan Coach consent is not available for this client. Admin override reason is required if you choose to proceed without consent.'}
        </InfoContent>
      </InfoPanel>
    )}

    {errorFlags.isAssignmentError && (
      <InfoPanel $variant="warning">
        <IconSlot><Shield size={16} /></IconSlot>
        <InfoContent>
          You are not currently assigned to this client. Contact an administrator to continue.
        </InfoContent>
      </InfoPanel>
    )}

    <ActionRow>
      {errorFlags.isRetryable && (
        <PrimaryButton onClick={onRetry} disabled={isSubmitting}>
          <RefreshCw size={16} />
          Retry
        </PrimaryButton>
      )}
      {errorFlags.isOverrideReasonError && (
        <PrimaryButton onClick={onAddOverride}>
          Add Override Reason
        </PrimaryButton>
      )}
      <SecondaryButton onClick={onBackToConfigure}>Back to Configure</SecondaryButton>
      <SecondaryButton onClick={onClose}>Close</SecondaryButton>
    </ActionRow>
  </CenterContent>
);

export default React.memo(LongHorizonErrorState);
