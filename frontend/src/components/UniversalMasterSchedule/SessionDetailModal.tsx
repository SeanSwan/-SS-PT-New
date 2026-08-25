/**
 * Session Detail Modal
 * ====================
 * Trainer/admin completion flow and read-only session details.
 */

import React, { useEffect, useState } from 'react';
import { Modal } from './ui';
import { useToast } from '../../hooks/use-toast';
import ScheduleConfirmDialog, {
  type ScheduleConfirmRequest,
} from './ScheduleConfirmDialog';
import SessionDetailBodyPanels from './SessionDetailBodyPanels';
import SessionDetailFooterActions from './SessionDetailFooterActions';
import { useSessionAttendance } from './hooks/useSessionAttendance';
import { useSessionCancellation } from './hooks/useSessionCancellation';
import { useSessionCompletion } from './hooks/useSessionCompletion';
import { useSessionClientFeedback } from './hooks/useSessionClientFeedback';
import { useSessionDetailPermissions } from './hooks/useSessionDetailPermissions';
import { useSessionDetailNavigation } from './hooks/useSessionDetailNavigation';
import { useSessionPackagePricing } from './hooks/useSessionPackagePricing';
import { useSessionSeriesActions } from './hooks/useSessionSeriesActions';
import type { SessionDetailModalProps } from './SessionDetailModal.types';
import { getSessionDate } from './SessionDetailModal.actions';
import {
  buildScheduleLogWorkoutLabel,
  getStatusTone,
} from './SessionDetailModal.logic';

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  open,
  mode,
  onClose,
  onUpdated,
  onManageSeries,
  onApplyPayment,
  onEditSession,
  seriesCount
}) => {
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ScheduleConfirmRequest | null>(null);

  const {
    isBlocked,
    canManage,
    canManageSeries,
    isNonDeductingClient,
    sessionSignal,
    isEarlyCancelEligible,
    canComplete,
    canCancel,
    canRecordAttendance,
    hasAttendanceRecorded,
    canOpenWorkoutLogger,
    canViewWorkouts,
  } = useSessionDetailPermissions({
    open,
    mode,
    session,
  });
  const {
    notes,
    trainerRating,
    clientFeedback,
    canDeductCompletionSessionCredit,
    deductCompletionSessionCredit,
    setNotes,
    setTrainerRating,
    setClientFeedback,
    setDeductCompletionSessionCredit,
    handleComplete,
  } = useSessionCompletion({
    open,
    session,
    onUpdated,
    onClose,
    setFormError,
    setLoading,
  });
  const {
    attendanceLoading,
    noShowReasonInput,
    showNoShowReason,
    deductNoShowSessionCredit,
    canDeductNoShowSessionCredit,
    setNoShowReasonInput,
    setDeductNoShowSessionCredit,
    handleRecordAttendance,
    handleBackFromNoShowReason,
  } = useSessionAttendance({
    session,
    notes,
    onUpdated,
    onClose,
    setFormError,
  });
  const { packagePrice, packageName, defaultFullCharge, defaultLateFee, pricingUnavailable } =
    useSessionPackagePricing({ open, sessionId: session?.id, canManage });
  const {
    clientRating,
    clientComment,
    feedbackSubmitted,
    feedbackLoading,
    setClientRating,
    setClientComment,
    handleSubmitFeedback,
  } = useSessionClientFeedback({
    open,
    session,
    onUpdated,
    setFormError,
  });
  const {
    cancelReason,
    earlyCancel,
    showCancelOptions,
    chargeType,
    chargeAmount,
    restoreCredit,
    notifyOnCancel,
    showLateCancelWarning,
    lateCancelWarning,
    lateCancelLoading,
    setCancelReason,
    setEarlyCancel,
    setChargeType,
    setChargeAmount,
    setRestoreCredit,
    setNotifyOnCancel,
    handleCancelClick,
    handleHideCancelOptions,
    handleCancel,
    handleBackFromLateCancelWarning,
    handleConfirmLateCancellation,
  } = useSessionCancellation({
    open,
    session,
    canManage,
    isEarlyCancelEligible,
    defaultFullCharge,
    defaultLateFee,
    pricingUnavailable,
    onUpdated,
    onClose,
    toast,
    setFormError,
    setLoading,
    setConfirmRequest,
  });
  const { handleDeleteSeries } = useSessionSeriesActions({
    session,
    onUpdated,
    onClose,
    setFormError,
    setLoading,
    setConfirmRequest,
  });
  const detailNavigation = useSessionDetailNavigation({ mode, session, onClose });

  useEffect(() => {
    if (!open || !session) {
      setFormError(null);
      setLoading(false);
      setConfirmRequest(null);
      return;
    }

    setFormError(null);
    setConfirmRequest(null);
  }, [open, session]);

  if (!session) {
    return null;
  }

  const sessionDate = getSessionDate(session);
  const statusTone = getStatusTone(session.status);
  const logWorkoutLabel = buildScheduleLogWorkoutLabel(session);

  return (
    <>
      <Modal
      isOpen={open}
      onClose={onClose}
      title="Session Details"
      size="lg"
      footer={(
        <SessionDetailFooterActions
          loading={loading}
          lateCancelLoading={lateCancelLoading}
          attendanceLoading={attendanceLoading}
          canCancel={canCancel}
          showCancelOptions={showCancelOptions}
          showLateCancelWarning={showLateCancelWarning}
          canRecordAttendance={canRecordAttendance}
          showNoShowReason={showNoShowReason}
          canComplete={canComplete}
          canEdit={canManage && Boolean(onEditSession) && session.status !== 'cancelled' && session.status !== 'completed'}
          canOpenWorkoutLogger={canOpenWorkoutLogger}
          canViewWorkouts={canViewWorkouts}
          logWorkoutLabel={logWorkoutLabel}
          mode={mode}
          onClose={onClose}
          onCancelClick={handleCancelClick}
          onHideCancelOptions={handleHideCancelOptions}
          onCancel={handleCancel}
          onRecordAttendance={handleRecordAttendance}
          onBackFromNoShowReason={handleBackFromNoShowReason}
          onComplete={handleComplete}
          onEdit={onEditSession || (() => undefined)}
          onCoachLogWorkout={detailNavigation.openCoachLogger}
          onLogWorkout={detailNavigation.openWorkoutLogger}
          onViewWorkouts={detailNavigation.viewWorkouts}
        />
      )}
    >
      <SessionDetailBodyPanels
        formError={formError}
        session={session}
        sessionDate={sessionDate}
        statusTone={statusTone}
        hasAttendanceRecorded={hasAttendanceRecorded}
        canManage={canManage}
        mode={mode}
        isNonDeductingClient={isNonDeductingClient}
        sessionSignal={sessionSignal}
        onApplyPayment={onApplyPayment}
        showNoShowReason={showNoShowReason}
        noShowReasonInput={noShowReasonInput}
        onNoShowReasonChange={setNoShowReasonInput}
        canDeductNoShowSessionCredit={canDeductNoShowSessionCredit}
        deductNoShowSessionCredit={deductNoShowSessionCredit}
        onDeductNoShowSessionCreditChange={setDeductNoShowSessionCredit}
        canManageSeries={canManageSeries}
        seriesCount={seriesCount}
        loading={loading}
        onManageSeries={onManageSeries}
        onDeleteSeries={handleDeleteSeries}
        notes={notes}
        trainerRating={trainerRating}
        clientFeedback={clientFeedback}
        onNotesChange={setNotes}
        onTrainerRatingChange={setTrainerRating}
        onClientFeedbackChange={setClientFeedback}
        canDeductCompletionSessionCredit={canDeductCompletionSessionCredit}
        deductCompletionSessionCredit={deductCompletionSessionCredit}
        onDeductCompletionSessionCreditChange={setDeductCompletionSessionCredit}
        clientRating={clientRating}
        clientComment={clientComment}
        feedbackSubmitted={feedbackSubmitted}
        feedbackLoading={feedbackLoading}
        onClientRatingChange={setClientRating}
        onClientCommentChange={setClientComment}
        onSubmitFeedback={handleSubmitFeedback}
        showLateCancelWarning={showLateCancelWarning}
        lateCancelWarning={lateCancelWarning}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onBackFromLateCancelWarning={handleBackFromLateCancelWarning}
        onConfirmLateCancellation={handleConfirmLateCancellation}
        canCancel={canCancel}
        isEarlyCancelEligible={isEarlyCancelEligible}
        earlyCancel={earlyCancel}
        onEarlyCancelChange={setEarlyCancel}
        showCancelOptions={showCancelOptions}
        packagePrice={packagePrice}
        packageName={packageName}
        chargeType={chargeType}
        onChargeTypeChange={setChargeType}
        chargeAmount={chargeAmount}
        onChargeAmountChange={setChargeAmount}
        defaultFullCharge={defaultFullCharge}
        defaultLateFee={defaultLateFee}
        pricingUnavailable={pricingUnavailable}
        restoreCredit={restoreCredit}
        onRestoreCreditChange={setRestoreCredit}
        notifyOnCancel={notifyOnCancel}
        onNotifyOnCancelChange={setNotifyOnCancel}
      />
      </Modal>
      <ScheduleConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
      />
    </>
  );
};

export default SessionDetailModal;
