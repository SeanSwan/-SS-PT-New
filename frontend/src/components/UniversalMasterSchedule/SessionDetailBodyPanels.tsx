/**
 * SessionDetailBodyPanels
 * =======================
 * Presentation composition for the session detail modal body.
 */

import React from 'react';
import type { ClientSessionSignal } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import {
  SpacedErrorText,
  SpacedSmallText,
} from './SessionDetailModal.baseStyles';
import SessionDetailClientCancelReasonPanel from './SessionDetailClientCancelReasonPanel';
import SessionDetailClientCancelWarningPanel from './SessionDetailClientCancelWarningPanel';
import SessionDetailClientFeedbackPanel from './SessionDetailClientFeedbackPanel';
import SessionDetailCompletionBillingPanel from './SessionDetailCompletionBillingPanel';
import SessionDetailCancelOptionsPanel from './SessionDetailCancelOptionsPanel';
import SessionDetailCommandPanel from './SessionDetailCommandPanel';
import SessionDetailInfoGrid from './SessionDetailInfoGrid';
import SessionDetailNoShowReasonPanel from './SessionDetailNoShowReasonPanel';
import SessionDetailPackageSummary from './SessionDetailPackageSummary';
import SessionDetailSeriesCallout from './SessionDetailSeriesCallout';
import SessionDetailTrainerNotesPanel from './SessionDetailTrainerNotesPanel';
import type {
  CancellationChargeType,
  LateCancelWarningModel,
} from './SessionDetailModal.actions';
import type {
  SessionDetail,
  SessionDetailModalMode,
} from './SessionDetailModal.types';

export interface SessionDetailBodyPanelsProps {
  formError?: string | null;
  session: SessionDetail;
  sessionDate: Date;
  statusTone: string;
  hasAttendanceRecorded: boolean;
  canManage: boolean;
  mode: SessionDetailModalMode;
  isNonDeductingClient: boolean;
  sessionSignal: ClientSessionSignal;
  onApplyPayment?: (clientId: number) => void;
  showNoShowReason: boolean;
  noShowReasonInput: string;
  onNoShowReasonChange: (value: string) => void;
  canDeductNoShowSessionCredit: boolean;
  deductNoShowSessionCredit: boolean;
  onDeductNoShowSessionCreditChange: (value: boolean) => void;
  canManageSeries: boolean;
  seriesCount?: number;
  loading: boolean;
  onManageSeries?: (groupId: string) => void;
  onDeleteSeries: () => void;
  notes: string;
  trainerRating: string;
  clientFeedback: string;
  onNotesChange: (value: string) => void;
  onTrainerRatingChange: (value: string) => void;
  onClientFeedbackChange: (value: string) => void;
  canDeductCompletionSessionCredit: boolean;
  deductCompletionSessionCredit: boolean;
  onDeductCompletionSessionCreditChange: (value: boolean) => void;
  clientRating: number;
  clientComment: string;
  feedbackSubmitted: boolean;
  feedbackLoading: boolean;
  onClientRatingChange: (rating: number) => void;
  onClientCommentChange: (comment: string) => void;
  onSubmitFeedback: () => void;
  showLateCancelWarning: boolean;
  lateCancelWarning: LateCancelWarningModel | null;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onBackFromLateCancelWarning: () => void;
  onConfirmLateCancellation: () => void;
  canCancel: boolean;
  isEarlyCancelEligible: boolean;
  earlyCancel: boolean;
  onEarlyCancelChange: (value: boolean) => void;
  showCancelOptions: boolean;
  packagePrice: number | null;
  packageName: string | null;
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

const SessionDetailBodyPanels: React.FC<SessionDetailBodyPanelsProps> = ({
  formError,
  session,
  sessionDate,
  statusTone,
  hasAttendanceRecorded,
  canManage,
  mode,
  isNonDeductingClient,
  sessionSignal,
  onApplyPayment,
  showNoShowReason,
  noShowReasonInput,
  onNoShowReasonChange,
  canDeductNoShowSessionCredit,
  deductNoShowSessionCredit,
  onDeductNoShowSessionCreditChange,
  canManageSeries,
  seriesCount,
  loading,
  onManageSeries,
  onDeleteSeries,
  notes,
  trainerRating,
  clientFeedback,
  onNotesChange,
  onTrainerRatingChange,
  onClientFeedbackChange,
  canDeductCompletionSessionCredit,
  deductCompletionSessionCredit,
  onDeductCompletionSessionCreditChange,
  clientRating,
  clientComment,
  feedbackSubmitted,
  feedbackLoading,
  onClientRatingChange,
  onClientCommentChange,
  onSubmitFeedback,
  showLateCancelWarning,
  lateCancelWarning,
  cancelReason,
  onCancelReasonChange,
  onBackFromLateCancelWarning,
  onConfirmLateCancellation,
  canCancel,
  isEarlyCancelEligible,
  earlyCancel,
  onEarlyCancelChange,
  showCancelOptions,
  packagePrice,
  packageName,
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
}) => (
  <>
    {formError && (
      <SpacedErrorText>{formError}</SpacedErrorText>
    )}

    <SessionDetailNoShowReasonPanel
      showNoShowReason={showNoShowReason}
      noShowReasonInput={noShowReasonInput}
      onNoShowReasonChange={onNoShowReasonChange}
      canDeductSessionCredit={canDeductNoShowSessionCredit}
      deductSessionCredit={deductNoShowSessionCredit}
      onDeductSessionCreditChange={onDeductNoShowSessionCreditChange}
      recordedNoShowReason={session.noShowReason}
    />

    {canManageSeries && session.recurringGroupId && (
      <SessionDetailSeriesCallout
        recurringGroupId={session.recurringGroupId}
        seriesCount={seriesCount}
        loading={loading}
        onManageSeries={onManageSeries}
        onDeleteSeries={onDeleteSeries}
      />
    )}

    <SessionDetailCommandPanel
      session={session}
      mode={mode}
      isNonDeductingClient={isNonDeductingClient}
      onApplyPayment={onApplyPayment}
    />

    <SessionDetailInfoGrid
      session={session}
      sessionDate={sessionDate}
      statusTone={statusTone}
      hasAttendanceRecorded={hasAttendanceRecorded}
      canManage={canManage}
      mode={mode}
      isNonDeductingClient={isNonDeductingClient}
      sessionSignal={sessionSignal}
      onApplyPayment={onApplyPayment}
    />

    {session.isBlocked && session.reason && (
      <SpacedSmallText secondary>
        Block reason: {session.reason}
      </SpacedSmallText>
    )}

    {session.packageInfo && !isNonDeductingClient && (
      <SessionDetailPackageSummary packageInfo={session.packageInfo} />
    )}

    <SessionDetailCompletionBillingPanel
      show={canManage && canDeductCompletionSessionCredit}
      deductSessionCredit={deductCompletionSessionCredit}
      onDeductSessionCreditChange={onDeductCompletionSessionCreditChange}
    />

    <SessionDetailTrainerNotesPanel
      notes={notes}
      trainerRating={trainerRating}
      clientFeedback={clientFeedback}
      canManage={canManage}
      onNotesChange={onNotesChange}
      onTrainerRatingChange={onTrainerRatingChange}
      onClientFeedbackChange={onClientFeedbackChange}
    />

    {mode === 'client' && session.status === 'completed' && (
      <SessionDetailClientFeedbackPanel
        clientRating={clientRating}
        clientComment={clientComment}
        feedbackSubmitted={feedbackSubmitted}
        feedbackLoading={feedbackLoading}
        onRatingChange={onClientRatingChange}
        onCommentChange={onClientCommentChange}
        onSubmit={onSubmitFeedback}
      />
    )}

    {showLateCancelWarning && !canManage && lateCancelWarning && (
      <SessionDetailClientCancelWarningPanel
        lateCancelWarning={lateCancelWarning}
        loading={loading}
        cancelReason={cancelReason}
        onCancelReasonChange={onCancelReasonChange}
        onBack={onBackFromLateCancelWarning}
        onConfirm={onConfirmLateCancellation}
      />
    )}

    {canCancel && !showCancelOptions && !canManage && !showLateCancelWarning && (
      <SessionDetailClientCancelReasonPanel
        cancelReason={cancelReason}
        onCancelReasonChange={onCancelReasonChange}
        isEarlyCancelEligible={isEarlyCancelEligible}
        earlyCancel={earlyCancel}
        onEarlyCancelChange={onEarlyCancelChange}
      />
    )}

    {showCancelOptions && canManage && (
      <SessionDetailCancelOptionsPanel
        isEarlyCancelEligible={isEarlyCancelEligible}
        packagePrice={packagePrice}
        packageName={packageName}
        cancelReason={cancelReason}
        onCancelReasonChange={onCancelReasonChange}
        chargeType={chargeType}
        onChargeTypeChange={onChargeTypeChange}
        chargeAmount={chargeAmount}
        onChargeAmountChange={onChargeAmountChange}
        defaultFullCharge={defaultFullCharge}
        defaultLateFee={defaultLateFee}
        pricingUnavailable={pricingUnavailable}
        restoreCredit={restoreCredit}
        onRestoreCreditChange={onRestoreCreditChange}
        notifyOnCancel={notifyOnCancel}
        onNotifyOnCancelChange={onNotifyOnCancelChange}
      />
    )}
  </>
);

export default SessionDetailBodyPanels;
