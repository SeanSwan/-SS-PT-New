import React from 'react';
import { AlertTriangle, Ban, Calendar, Check, Clock, DollarSign, User, X } from 'lucide-react';
import type { CancelledSession, ChargeType, PackagePriceInfo } from './CancelledSessionsWidget.types';
import {
  CancelButton,
  ChargeActions,
  ChargeButton,
  ChargeOptionRow,
  CustomAmountInput,
  CustomAmountLabel,
  CustomAmountSection,
  ExpandedChargeSection,
  ExpandButton,
  NoChargeButton,
  NoChargeRow,
  WaiveReasonInput,
  WaiveReasonLabel,
  WaiveSection,
} from './CancelledSessionsWidget.controls';
import {
  BadgeGroup,
  ChargeResult,
  ChargeSection,
  ChargedBadge,
  ClientInfo,
  ClientName,
  DecisionBadge,
  DetailRow,
  LateBadge,
  PackageInfo,
  ReasonText,
  ReviewerInfo,
  ReviewReasonDisplay,
  SessionCardShell,
  SessionDetails,
  SessionHeader,
} from './CancelledSessionsWidget.styles';

interface CancelledSessionCardProps {
  session: CancelledSession;
  priceInfo: PackagePriceInfo;
  isExpanded: boolean;
  isCharging: boolean;
  showChargeButtons: boolean;
  customAmount: string;
  waiveReason: string;
  formatDate: (dateString: string) => string;
  onCharge: (sessionId: number, chargeType: ChargeType, customAmount?: number) => void;
  onCustomAmountChange: (sessionId: number, value: string) => void;
  onExpand: (sessionId: number) => void;
  onWaiveReasonChange: (sessionId: number, value: string) => void;
  onCollapse: () => void;
}

const decisionIcons = {
  pending: <Clock size={12} />,
  charged: <DollarSign size={12} />,
  waived: <Check size={12} />,
};

const decisionLabel = (decision: CancelledSession['cancellationDecision']) => (
  decision ? decision.charAt(0).toUpperCase() + decision.slice(1) : ''
);

const CancelledSessionCard: React.FC<CancelledSessionCardProps> = ({
  session,
  priceInfo,
  isExpanded,
  isCharging,
  showChargeButtons,
  customAmount,
  waiveReason,
  formatDate,
  onCharge,
  onCustomAmountChange,
  onExpand,
  onWaiveReasonChange,
  onCollapse,
}) => {
  const pricingUnavailable = !priceInfo.isPricingAvailable;
  const canShowChargeControls = showChargeButtons && session.isLateCancellation && !session.cancellationChargedAt;
  const parsedCustomAmount = parseFloat(customAmount || '0');

  return (
    <SessionCardShell $isLate={session.isLateCancellation}>
      <SessionHeader>
        <ClientInfo>
          <User size={16} />
          <ClientName>{session.clientName}</ClientName>
        </ClientInfo>
        <BadgeGroup>
          {session.isLateCancellation && (
            <LateBadge>
              <AlertTriangle size={14} /> Late Cancel
            </LateBadge>
          )}
          {session.cancellationDecision && (
            <DecisionBadge $decision={session.cancellationDecision}>
              {decisionIcons[session.cancellationDecision]} {decisionLabel(session.cancellationDecision)}
            </DecisionBadge>
          )}
        </BadgeGroup>
      </SessionHeader>

      <SessionDetails>
        <DetailRow><Calendar size={14} /><span>Session: {formatDate(session.sessionDate)}</span></DetailRow>
        <DetailRow><X size={14} /><span>Cancelled: {formatDate(session.cancellationDate)}</span></DetailRow>
        {session.isLateCancellation && (
          <DetailRow $highlight>
            <Clock size={14} />
            <span>{session.hoursUntilSession < 1 ? 'Less than 1 hour notice' : `${Math.round(session.hoursUntilSession)} hours notice`}</span>
          </DetailRow>
        )}
        {session.cancellationReason && <ReasonText>Reason: {session.cancellationReason}</ReasonText>}
        {canShowChargeControls && (
          <PackageInfo>
            <DollarSign size={14} />
            <span>
              {pricingUnavailable
                ? 'Pricing unavailable - refresh before recording a preset fee.'
                : priceInfo.packageName
                  ? `Package: ${priceInfo.packageName} - $${priceInfo.pricePerSession ?? 0}/session`
                  : `Policy rate: $${priceInfo.fallbackPrice ?? 0}/session`}
            </span>
          </PackageInfo>
        )}
      </SessionDetails>

      {session.cancellationChargedAt ? (
        <ChargeResult>
          <ChargedBadge $type={session.cancellationChargeType}>
            {session.cancellationChargeType === 'none' ? (
              <><Ban size={14} /> Waived - no billing action</>
            ) : (
              <><DollarSign size={14} /> Recorded ${session.cancellationChargeAmount} fee</>
            )}
          </ChargedBadge>
          {session.cancellationReviewReason && (
            <ReviewReasonDisplay>
              <strong>Admin Note:</strong> {session.cancellationReviewReason}
              {session.reviewerInfo && (
                <ReviewerInfo>- {session.reviewerInfo.firstName} {session.reviewerInfo.lastName}</ReviewerInfo>
              )}
            </ReviewReasonDisplay>
          )}
        </ChargeResult>
      ) : (
        canShowChargeControls && (
          <ChargeSection>
            {!isExpanded ? (
              <ChargeActions>
                <ChargeButton type="button" onClick={() => onCharge(session.id, 'late_fee')} disabled={isCharging || pricingUnavailable} $variant="fee">
                  {isCharging ? 'Processing...' : pricingUnavailable ? 'Pricing unavailable' : `Record Late Fee $${priceInfo.lateFeeAmount ?? 0}`}
                </ChargeButton>
                <ChargeButton type="button" onClick={() => onCharge(session.id, 'full')} disabled={isCharging || pricingUnavailable} $variant="full">
                  {isCharging ? 'Processing...' : pricingUnavailable ? 'Pricing unavailable' : `Record Full $${priceInfo.defaultChargeAmount ?? 0}`}
                </ChargeButton>
                <ExpandButton type="button" onClick={() => onExpand(session.id)} disabled={isCharging}>More</ExpandButton>
              </ChargeActions>
            ) : (
              <ExpandedChargeSection>
                <ChargeOptionRow>
                  <ChargeButton type="button" onClick={() => onCharge(session.id, 'late_fee')} disabled={isCharging || pricingUnavailable} $variant="fee">
                    {pricingUnavailable ? 'Pricing unavailable' : `Record Late Fee $${priceInfo.lateFeeAmount ?? 0}`}
                  </ChargeButton>
                  <ChargeButton type="button" onClick={() => onCharge(session.id, 'full')} disabled={isCharging || pricingUnavailable} $variant="full">
                    {pricingUnavailable ? 'Pricing unavailable' : `Record Full Session $${priceInfo.defaultChargeAmount ?? 0}`}
                  </ChargeButton>
                </ChargeOptionRow>

                <CustomAmountSection>
                  <CustomAmountLabel>Custom Amount:</CustomAmountLabel>
                  <CustomAmountInput
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => onCustomAmountChange(session.id, e.target.value)}
                  />
                  <ChargeButton
                    type="button"
                    onClick={() => onCharge(session.id, 'custom', parsedCustomAmount)}
                    disabled={isCharging || !customAmount || parsedCustomAmount <= 0}
                    $variant="full"
                  >
                    <Check size={14} /> Record
                  </ChargeButton>
                </CustomAmountSection>

                <WaiveSection>
                  <WaiveReasonLabel>Waive Reason (required):</WaiveReasonLabel>
                  <WaiveReasonInput
                    placeholder="e.g., Emergency situation, first-time client courtesy..."
                    value={waiveReason}
                    onChange={(e) => onWaiveReasonChange(session.id, e.target.value)}
                  />
                </WaiveSection>

                <NoChargeRow>
                  <NoChargeButton type="button" onClick={() => onCharge(session.id, 'none')} disabled={isCharging || !waiveReason.trim()}>
                    <Ban size={14} /> Record Waiver
                  </NoChargeButton>
                  <CancelButton type="button" onClick={onCollapse}>Cancel</CancelButton>
                </NoChargeRow>
              </ExpandedChargeSection>
            )}
          </ChargeSection>
        )
      )}
    </SessionCardShell>
  );
};

export default CancelledSessionCard;
