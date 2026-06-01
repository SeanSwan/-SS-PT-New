import { useCallback } from 'react';
import apiService from '../../../services/api.service';
import type { ScheduleConfirmRequest } from '../ScheduleConfirmDialog';
import { getApiErrorMessage } from '../SessionDetailModal.actions';
import type { SessionDetail } from '../SessionDetailModal.types';

interface UseSessionSeriesActionsParams {
  session: SessionDetail | null;
  onUpdated: () => void;
  onClose: () => void;
  setFormError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setConfirmRequest: (request: ScheduleConfirmRequest | null) => void;
}

export const useSessionSeriesActions = ({
  session,
  onUpdated,
  onClose,
  setFormError,
  setLoading,
  setConfirmRequest,
}: UseSessionSeriesActionsParams) => {
  const handleDeleteSeries = useCallback(() => {
    if (!session?.recurringGroupId) {
      return;
    }

    setConfirmRequest({
      title: 'Delete recurring series?',
      message: 'This deletes all future sessions in this recurring series. Completed history and past records stay intact.',
      confirmLabel: 'Delete future sessions',
      tone: 'danger',
      onConfirm: async () => {
        setFormError(null);
        setLoading(true);

        try {
          const response = await apiService.delete(`/api/sessions/recurring/${session.recurringGroupId}`);
          const result = response.data;
          if (result?.success === false) {
            setFormError(result?.message || 'Failed to delete recurring series.');
            return;
          }

          onUpdated();
          onClose();
        } catch (error) {
          console.error('Error deleting recurring series:', error);
          setFormError(getApiErrorMessage(error, 'Failed to delete recurring series. Please try again.'));
        } finally {
          setLoading(false);
        }
      },
    });
  }, [onClose, onUpdated, session, setConfirmRequest, setFormError, setLoading]);

  return {
    handleDeleteSeries,
  };
};
