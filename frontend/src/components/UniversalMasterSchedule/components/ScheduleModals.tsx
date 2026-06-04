import React from 'react';
import {
  isNonDeductingClientSource,
  normalizeAvailableSessions,
} from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import ScheduleBookingModal from './ScheduleBookingModal';
import ScheduleConnectedModals from './ScheduleConnectedModals';
import ScheduleCreateSessionModal from './ScheduleCreateSessionModal';
import type { ScheduleModalsProps } from './ScheduleModals.types';

const ScheduleModals: React.FC<ScheduleModalsProps> = (props) => {
  const normalizedSessionsRemaining = props.sessionsRemaining == null
    ? undefined
    : normalizeAvailableSessions(props.sessionsRemaining);
  const hasNoCredits = normalizedSessionsRemaining != null && normalizedSessionsRemaining <= 0;
  const isFreeTrackingBooking = props.mode === 'client' && isNonDeductingClientSource(props.clientSource);
  const isPaidCreditLocked = props.mode === 'client' && !isFreeTrackingBooking && hasNoCredits;
  const isBookingLocked = isFreeTrackingBooking || isPaidCreditLocked;

  return (
    <>
      {props.showCreateDialog && (
        <ScheduleCreateSessionModal
          showCreateDialog={props.showCreateDialog}
          setShowCreateDialog={props.setShowCreateDialog}
          formData={props.formData}
          setFormData={props.setFormData}
          dbTrainers={props.dbTrainers}
          dbClients={props.dbClients}
          useManualClient={props.useManualClient}
          setUseManualClient={props.setUseManualClient}
          isSlotSelected={props.isSlotSelected}
          handleCreateSession={props.handleCreateSession}
        />
      )}

      <ScheduleBookingModal
        mode={props.mode}
        showBookingDialog={props.showBookingDialog}
        setShowBookingDialog={props.setShowBookingDialog}
        bookingTarget={props.bookingTarget}
        bookingLoading={props.bookingLoading}
        bookingError={props.bookingError}
        creditsDisplay={props.creditsDisplay}
        normalizedSessionsRemaining={normalizedSessionsRemaining}
        isFreeTrackingBooking={isFreeTrackingBooking}
        isBookingLocked={isBookingLocked}
        handleBookSession={props.handleBookSession}
      />

      <ScheduleConnectedModals
        mode={props.mode}
        showRecurringDialog={props.showRecurringDialog}
        setShowRecurringDialog={props.setShowRecurringDialog}
        showBlockedDialog={props.showBlockedDialog}
        setShowBlockedDialog={props.setShowBlockedDialog}
        showNotificationDialog={props.showNotificationDialog}
        setShowNotificationDialog={props.setShowNotificationDialog}
        showDetailDialog={props.showDetailDialog}
        setShowDetailDialog={props.setShowDetailDialog}
        showSeriesDialog={props.showSeriesDialog}
        setShowSeriesDialog={props.setShowSeriesDialog}
        showAvailabilityEditor={props.showAvailabilityEditor}
        setShowAvailabilityEditor={props.setShowAvailabilityEditor}
        showOverrideModal={props.showOverrideModal}
        setShowOverrideModal={props.setShowOverrideModal}
        showPaymentModal={props.showPaymentModal}
        setShowPaymentModal={props.setShowPaymentModal}
        conflictModalOpen={props.conflictModalOpen}
        setConflictModalOpen={props.setConflictModalOpen}
        showClientRecurringDialog={props.showClientRecurringDialog}
        setShowClientRecurringDialog={props.setShowClientRecurringDialog}
        dbTrainers={props.dbTrainers}
        dbClients={props.dbClients}
        availableSessions={props.availableSessions}
        normalizedSessionsRemaining={normalizedSessionsRemaining}
        isFreeTrackingBooking={isFreeTrackingBooking}
        detailSession={props.detailSession}
        activeSeriesGroupId={props.activeSeriesGroupId}
        seriesSessions={props.seriesSessions}
        availabilityTrainerId={props.availabilityTrainerId}
        conflicts={props.conflicts}
        setConflicts={props.setConflicts}
        alternatives={props.alternatives}
        canOverrideConflicts={props.canOverrideConflicts}
        handleConflictAlternative={props.handleConflictAlternative}
        handleConflictOverride={props.handleConflictOverride}
        fetchSessions={props.fetchSessions}
        openSeriesDialog={props.openSeriesDialog}
      />
    </>
  );
};

export default ScheduleModals;
