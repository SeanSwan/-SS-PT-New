import { useCallback, useState } from 'react';
import apiService from '../../../services/api.service';
import {
  buildAttendancePayload,
  getApiErrorMessage,
  type AttendanceStatus,
} from '../SessionDetailModal.actions';
import type { SessionDetail } from '../SessionDetailModal.types';
import { canDeductScheduledSessionCredit } from './sessionCreditEligibility';

interface UseSessionAttendanceInput {
  session: SessionDetail | null;
  notes: string;
  onUpdated: () => void;
  onClose: () => void;
  setFormError: (error: string | null) => void;
}

export const useSessionAttendance = ({
  session,
  notes,
  onUpdated,
  onClose,
  setFormError,
}: UseSessionAttendanceInput) => {
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [noShowReasonInput, setNoShowReasonInput] = useState('');
  const [showNoShowReason, setShowNoShowReason] = useState(false);
  const [deductNoShowSessionCredit, setDeductNoShowSessionCredit] = useState(false);
  const canDeductNoShowSessionCredit = canDeductScheduledSessionCredit(session);

  const handleRecordAttendance = useCallback(async (status: AttendanceStatus) => {
    if (!session) {
      return;
    }

    if (status === 'no_show' && !showNoShowReason) {
      setDeductNoShowSessionCredit(canDeductNoShowSessionCredit);
      setShowNoShowReason(true);
      return;
    }

    setFormError(null);
    setAttendanceLoading(true);

    try {
      const response = await apiService.patch(
        `/api/sessions/${session.id}/attendance`,
        buildAttendancePayload(
          status,
          noShowReasonInput,
          notes,
          status === 'no_show' ? deductNoShowSessionCredit : undefined
        )
      );
      const result = response.data;
      if (result?.success === false) {
        setFormError(result?.message || 'Failed to record attendance.');
        return;
      }

      setShowNoShowReason(false);
      setNoShowReasonInput('');
      setDeductNoShowSessionCredit(false);
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error recording attendance:', error);
      setFormError(getApiErrorMessage(error, 'Failed to record attendance. Please try again.'));
    } finally {
      setAttendanceLoading(false);
    }
  }, [
    canDeductNoShowSessionCredit,
    deductNoShowSessionCredit,
    noShowReasonInput,
    notes,
    onClose,
    onUpdated,
    session,
    setFormError,
    showNoShowReason,
  ]);

  const handleBackFromNoShowReason = useCallback(() => {
    setShowNoShowReason(false);
    setNoShowReasonInput('');
    setDeductNoShowSessionCredit(false);
  }, []);

  return {
    attendanceLoading,
    noShowReasonInput,
    showNoShowReason,
    deductNoShowSessionCredit,
    canDeductNoShowSessionCredit,
    setNoShowReasonInput,
    setDeductNoShowSessionCredit,
    handleRecordAttendance,
    handleBackFromNoShowReason,
  };
};
