import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Caption,
  FormField,
  Label,
  OutlinedButton,
  Spinner,
  StyledTextarea,
} from './ui';
import type { useApplyPaymentModalController } from './ApplyPaymentModal.controller';
import { ForceOverrideActions } from './ApplyPaymentModal.baseStyles';
import {
  ForceOverrideBody,
  ForceOverrideButton,
  ForceOverrideContainer,
  ForceOverrideHeader,
} from './ApplyPaymentModal.paymentStyles';

type PaymentController = ReturnType<typeof useApplyPaymentModalController>;

interface ForceOverridePanelProps {
  controller: PaymentController;
}

export const ApplyPaymentForceOverridePanel: React.FC<ForceOverridePanelProps> = ({ controller }) => {
  const {
    applying,
    duplicateWindowMessage,
    forceReason,
    handleCancelForceOverride,
    handleForceOverride,
    setForceReason,
    showForceOverride,
  } = controller;

  if (!showForceOverride) return null;

  return (
    <ForceOverrideContainer>
      <ForceOverrideHeader>
        <AlertTriangle size={18} />
        <span>Duplicate Payment Detected</span>
      </ForceOverrideHeader>
      <ForceOverrideBody>{duplicateWindowMessage}</ForceOverrideBody>
      <FormField>
        <Label htmlFor="force-reason">
          Reason for override (min 10 characters)
        </Label>
        <StyledTextarea
          id="force-reason"
          value={forceReason}
          onChange={(event) => setForceReason(event.target.value)}
          rows={2}
          placeholder="e.g., Client intentionally purchasing a second package today"
        />
        <Caption secondary>{forceReason.trim().length}/10 min characters</Caption>
      </FormField>
      <ForceOverrideActions>
        <OutlinedButton onClick={handleCancelForceOverride}>
          Cancel
        </OutlinedButton>
        <ForceOverrideButton
          onClick={handleForceOverride}
          disabled={applying || forceReason.trim().length < 10}
          type="button"
        >
          {applying ? <Spinner size={16} /> : <AlertTriangle size={16} />}
          Confirm Override
        </ForceOverrideButton>
      </ForceOverrideActions>
    </ForceOverrideContainer>
  );
};
