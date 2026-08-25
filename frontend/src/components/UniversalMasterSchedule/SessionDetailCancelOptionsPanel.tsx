import React from 'react';
import {
  Caption,
  FormField,
  Label,
  SmallText,
  StyledInput,
} from './ui';
import {
  CancellationPanel,
  CancelPanelHeader,
  LateCancelWarning,
} from './SessionDetailModal.baseStyles';
import {
  PackageInfoBanner,
} from './SessionDetailModal.lateCancelStyles';
import {
  ChargeAmount,
  ChargeInputWrapper,
  ChargeOption,
  ChargeOptionHeader,
  ChargeRadio,
  ChargeTypeGrid,
  NotificationOption,
  RestoreCreditOption,
} from './SessionDetailModal.chargeStyles';
import type { CancellationChargeType } from './SessionDetailModal.actions';

interface SessionDetailCancelOptionsPanelProps {
  isEarlyCancelEligible: boolean;
  packagePrice?: number | null;
  packageName?: string | null;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  chargeType: CancellationChargeType;
  onChargeTypeChange: (value: CancellationChargeType) => void;
  chargeAmount: string;
  onChargeAmountChange: (value: string) => void;
  defaultFullCharge: number;
  defaultLateFee: number;
  pricingUnavailable: boolean;
  restoreCredit: boolean;
  onRestoreCreditChange: (value: boolean) => void;
  notifyOnCancel: boolean;
  onNotifyOnCancelChange: (value: boolean) => void;
}

const SessionDetailCancelOptionsPanel: React.FC<SessionDetailCancelOptionsPanelProps> = ({
  isEarlyCancelEligible,
  packagePrice,
  packageName,
  cancelReason,
  onCancelReasonChange,
  chargeType,
  onChargeTypeChange,
  chargeAmount,
  onChargeAmountChange,
  defaultFullCharge,
  defaultLateFee,
  pricingUnavailable,
  restoreCredit,
  onRestoreCreditChange,
  notifyOnCancel,
  onNotifyOnCancelChange,
}) => {
  const selectChargeType = (
    nextChargeType: CancellationChargeType,
    nextChargeAmount: string,
    nextRestoreCredit: boolean,
  ) => {
    onChargeTypeChange(nextChargeType);
    onChargeAmountChange(nextChargeAmount);
    onRestoreCreditChange(nextRestoreCredit);
  };

  return (
    <CancellationPanel>
      <CancelPanelHeader>
        <h3>Cancel Session - Choose Charge Option</h3>
        {!isEarlyCancelEligible && (
          <LateCancelWarning>
            Late cancellation (less than 24 hours notice)
          </LateCancelWarning>
        )}
      </CancelPanelHeader>

      {packagePrice && (
        <PackageInfoBanner>
          <SmallText>Client Package: {packageName || 'Standard'}</SmallText>
          <Caption secondary>Rate: ${packagePrice}/session</Caption>
        </PackageInfoBanner>
      )}

      <FormField>
        <Label htmlFor="cancel-reason-admin">Cancellation Reason</Label>
        <StyledInput
          id="cancel-reason-admin"
          type="text"
          value={cancelReason}
          onChange={(event) => onCancelReasonChange(event.target.value)}
          placeholder="Reason for cancelling this session"
        />
      </FormField>

      <ChargeTypeGrid>
        <ChargeOption htmlFor="charge-type-full" $selected={chargeType === 'full'} $variant="danger">
          <ChargeOptionHeader>
            <ChargeRadio
              id="charge-type-full"
              type="radio"
              name="chargeType"
              checked={chargeType === 'full'}
              disabled={pricingUnavailable}
              onChange={() => selectChargeType('full', String(defaultFullCharge), false)}
            />
            <span>Full Session Charge (Default)</span>
          </ChargeOptionHeader>
          <Caption secondary>
            {pricingUnavailable
              ? "This client's package price could not be loaded."
              : "Charge the full session rate based on client's package."}
          </Caption>
          <ChargeAmount $variant="danger">
            {pricingUnavailable ? 'Pricing unavailable' : `$${defaultFullCharge.toFixed(2)}`}
          </ChargeAmount>
        </ChargeOption>

        <ChargeOption htmlFor="charge-type-late-fee" $selected={chargeType === 'late_fee'} $variant="warning">
          <ChargeOptionHeader>
            <ChargeRadio
              id="charge-type-late-fee"
              type="radio"
              name="chargeType"
              checked={chargeType === 'late_fee'}
              disabled={pricingUnavailable}
              onChange={() => selectChargeType('late_fee', String(defaultLateFee), false)}
            />
            <span>Late Cancellation Fee (50%)</span>
          </ChargeOptionHeader>
          <Caption secondary>
            Apply a 50% late cancellation fee. Session credit is NOT restored.
          </Caption>
          <ChargeAmount $variant="warning">
            {pricingUnavailable ? 'Pricing unavailable' : `$${defaultLateFee.toFixed(2)}`}
          </ChargeAmount>
        </ChargeOption>

        <ChargeOption htmlFor="charge-type-partial" $selected={chargeType === 'partial'} $variant="warning">
          <ChargeOptionHeader>
            <ChargeRadio
              id="charge-type-partial"
              type="radio"
              name="chargeType"
              checked={chargeType === 'partial'}
              onChange={() => selectChargeType(
                'partial',
                pricingUnavailable ? '' : String(Math.round(defaultFullCharge * 0.5)),
                false
              )}
            />
            <span>Custom Amount</span>
          </ChargeOptionHeader>
          <Caption secondary>
            Apply a custom charge amount.
          </Caption>
          <ChargeInputWrapper>
            <span>$</span>
            <StyledInput
              type="number"
              min="0"
              step="0.01"
              value={chargeAmount}
              onChange={(event) => onChargeAmountChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              placeholder="Amount"
            />
          </ChargeInputWrapper>
        </ChargeOption>

        <ChargeOption htmlFor="charge-type-none" $selected={chargeType === 'none'} $variant="success">
          <ChargeOptionHeader>
            <ChargeRadio
              id="charge-type-none"
              type="radio"
              name="chargeType"
              checked={chargeType === 'none'}
              onChange={() => selectChargeType('none', '', true)}
            />
            <span>No Charge</span>
          </ChargeOptionHeader>
          <Caption secondary>
            Cancel without charging. Session credit will be restored to client.
          </Caption>
          <ChargeAmount $variant="success">$0.00</ChargeAmount>
        </ChargeOption>
      </ChargeTypeGrid>

      {chargeType === 'none' && (
        <RestoreCreditOption>
          <input
            type="checkbox"
            id="restore-credit"
            checked={restoreCredit}
            onChange={(event) => onRestoreCreditChange(event.target.checked)}
          />
          <label htmlFor="restore-credit">
            <SmallText>Restore session credit to client&apos;s account</SmallText>
          </label>
        </RestoreCreditOption>
      )}

      <NotificationOption>
        <input
          type="checkbox"
          id="notify-cancel"
          checked={notifyOnCancel}
          onChange={(event) => onNotifyOnCancelChange(event.target.checked)}
        />
        <label htmlFor="notify-cancel">
          <SmallText>Send email notification to client and trainer</SmallText>
        </label>
      </NotificationOption>
    </CancellationPanel>
  );
};

export default SessionDetailCancelOptionsPanel;
