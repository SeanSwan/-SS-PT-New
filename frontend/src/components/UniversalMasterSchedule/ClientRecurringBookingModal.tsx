import React, { useEffect, useMemo, useState } from 'react';
import { Modal, OutlinedButton, PrimaryButton } from './ui';
import apiService from '../../services/api.service';
import {
  buildTimeSlotOptions,
  filterRecurringSessions,
  getApiErrorMessage,
} from './ClientRecurringBookingModal.logic';
import {
  RecurringConfirmStep,
  RecurringFilterStep,
  RecurringSelectStep,
  RecurringStepIndicator,
} from './ClientRecurringBookingModal.steps';
import { ModalErrorText } from './ClientRecurringBookingModal.styles';
import type {
  ClientRecurringBookingModalProps,
  ClientRecurringStep,
} from './ClientRecurringBookingModal.types';

export type {
  ClientRecurringBookingModalProps,
  ClientRecurringSession,
} from './ClientRecurringBookingModal.types';

const ClientRecurringBookingModal: React.FC<ClientRecurringBookingModalProps> = ({
  open,
  onClose,
  onSuccess,
  availableSessions,
  userCredits,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ClientRecurringStep>('filter');
  const [selectedDay, setSelectedDay] = useState<number | ''>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setStep('filter');
    setSelectedDay('');
    setSelectedTimeSlot('');
    setWeeksAhead(4);
    setSelectedSessionIds(new Set());
    setError(null);
  }, [open]);

  const timeSlotOptions = useMemo(
    () => buildTimeSlotOptions(availableSessions),
    [availableSessions]
  );

  const filteredSessions = useMemo(
    () => filterRecurringSessions({
      availableSessions,
      selectedDay,
      selectedTimeSlot,
      weeksAhead,
    }),
    [availableSessions, selectedDay, selectedTimeSlot, weeksAhead]
  );

  const selectedSessions = useMemo(
    () => filteredSessions.filter((session) => selectedSessionIds.has(session.id)),
    [filteredSessions, selectedSessionIds]
  );

  const toggleSessionSelection = (sessionId: number) => {
    const nextSelection = new Set(selectedSessionIds);

    if (nextSelection.has(sessionId)) {
      nextSelection.delete(sessionId);
    } else {
      if (nextSelection.size >= userCredits) {
        setError(`You can only select up to ${userCredits} sessions (your available credits)`);
        return;
      }
      nextSelection.add(sessionId);
    }

    setError(null);
    setSelectedSessionIds(nextSelection);
  };

  const selectAll = () => {
    const maxSelectable = Math.min(filteredSessions.length, userCredits);
    const nextSelection = new Set(filteredSessions.slice(0, maxSelectable).map((session) => session.id));
    setSelectedSessionIds(nextSelection);
    setError(filteredSessions.length > userCredits
      ? `Limited to ${userCredits} sessions based on your available credits`
      : null);
  };

  const clearSelection = () => {
    setSelectedSessionIds(new Set());
    setError(null);
  };

  const handleBookRecurring = async () => {
    if (selectedSessionIds.size === 0) {
      setError('Please select at least one session to book');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/api/sessions/book-recurring', {
        sessionIds: Array.from(selectedSessionIds),
      });

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Failed to book recurring sessions');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to book sessions'));
    } finally {
      setLoading(false);
    }
  };

  const getFooter = () => {
    switch (step) {
      case 'filter':
        return (
          <>
            <OutlinedButton onClick={onClose}>Cancel</OutlinedButton>
            <PrimaryButton
              onClick={() => setStep('select')}
              disabled={filteredSessions.length === 0}
            >
              Find Sessions ({filteredSessions.length})
            </PrimaryButton>
          </>
        );
      case 'select':
        return (
          <>
            <OutlinedButton onClick={() => setStep('filter')}>Back</OutlinedButton>
            <PrimaryButton
              onClick={() => setStep('confirm')}
              disabled={selectedSessionIds.size === 0}
            >
              Review ({selectedSessionIds.size} selected)
            </PrimaryButton>
          </>
        );
      case 'confirm':
        return (
          <>
            <OutlinedButton onClick={() => setStep('select')} disabled={loading}>
              Back
            </OutlinedButton>
            <PrimaryButton onClick={handleBookRecurring} disabled={loading}>
              {loading ? 'Booking...' : `Book ${selectedSessionIds.size} Sessions`}
            </PrimaryButton>
          </>
        );
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Book Recurring Sessions"
      size="md"
      footer={getFooter()}
    >
      {error && <ModalErrorText>{error}</ModalErrorText>}

      <RecurringStepIndicator step={step} />

      {step === 'filter' && (
        <RecurringFilterStep
          selectedDay={selectedDay}
          selectedTimeSlot={selectedTimeSlot}
          weeksAhead={weeksAhead}
          timeSlotOptions={timeSlotOptions}
          filteredCount={filteredSessions.length}
          onSelectedDayChange={setSelectedDay}
          onSelectedTimeSlotChange={setSelectedTimeSlot}
          onWeeksAheadChange={setWeeksAhead}
        />
      )}

      {step === 'select' && (
        <RecurringSelectStep
          filteredSessions={filteredSessions}
          selectedSessionIds={selectedSessionIds}
          userCredits={userCredits}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onToggleSession={toggleSessionSelection}
        />
      )}

      {step === 'confirm' && (
        <RecurringConfirmStep
          selectedSessions={selectedSessions}
          selectedCount={selectedSessionIds.size}
          creditsAfter={userCredits - selectedSessionIds.size}
        />
      )}
    </Modal>
  );
};

export default ClientRecurringBookingModal;
