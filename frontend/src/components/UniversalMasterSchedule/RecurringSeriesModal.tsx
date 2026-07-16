/**
 * Recurring Series Modal
 * ======================
 * Admin-only management for recurring series updates and deletions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  SmallText,
} from './ui';
import apiService from '../../services/api.service';
import ScheduleConfirmDialog, {
  type ScheduleConfirmRequest,
} from './ScheduleConfirmDialog';
import RecurringSeriesModalFields, {
  type RecurringTrainerOption,
} from './RecurringSeriesModalFields';
import { StyledBox } from '@/components/ui/StyledBox';

interface SessionSummary {
  sessionDate: string;
  duration: number;
  trainerId?: number;
  location?: string;
  notes?: string;
}

interface RecurringSeriesModalProps {
  groupId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seriesSessions?: SessionSummary[];
}

const formatTimeValue = (dateString?: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

const RecurringSeriesModal: React.FC<RecurringSeriesModalProps> = ({
  groupId,
  open,
  onClose,
  onSuccess,
  seriesSessions = []
}) => {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<RecurringTrainerOption[]>([]);
  const [deleteAll, setDeleteAll] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ScheduleConfirmRequest | null>(null);

  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [trainerId, setTrainerId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const sortedSessions = useMemo(() => {
    return [...seriesSessions].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  }, [seriesSessions]);

  const seriesCount = sortedSessions.length;
  const firstSession = sortedSessions[0];
  const lastSession = sortedSessions[sortedSessions.length - 1];

  const trainerOptions = useMemo(() => ([
    { value: '', label: 'Keep current trainer' },
    ...trainers
  ]), [trainers]);

  useEffect(() => {
    if (!open) {
      setConfirmRequest(null);
      return;
    }

    setFormError(null);
    setDeleteAll(false);
    setConfirmRequest(null);
    setTime(formatTimeValue(firstSession?.sessionDate));
    setDuration(firstSession?.duration || '');
    setTrainerId(firstSession?.trainerId ? String(firstSession.trainerId) : '');
    setLocation(firstSession?.location || '');
    setNotes(firstSession?.notes || '');
  }, [open, firstSession]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadTrainers = async () => {
      try {
        const response = await apiService.get('/api/sessions/users/trainers');
        const payload = response.data;
        const raw = Array.isArray(payload)
          ? payload
          : payload?.data || payload?.trainers || [];

        const normalized = raw.map((trainer: any) => ({
          value: String(trainer.id),
          label: `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim()
            || trainer.email
            || `Trainer ${trainer.id}`
        }));

        setTrainers(normalized);
      } catch (error) {
        console.error('Error loading trainers:', error);
        setTrainers([]);
      }
    };

    loadTrainers();
  }, [open]);

  const handleUpdate = async () => {
    setFormError(null);

    if (!groupId) {
      setFormError('Recurring series ID is missing.');
      return;
    }

    const payload: Record<string, any> = {};

    if (time) {
      payload.time = time;
    }

    if (duration !== '') {
      payload.duration = Number(duration);
    }

    if (trainerId !== '') {
      payload.trainerId = trainerId;
    }

    if (location) {
      payload.location = location;
    }

    if (notes) {
      payload.notes = notes;
    }

    if (Object.keys(payload).length === 0) {
      setFormError('Add at least one field to update.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.put(`/api/sessions/recurring/${groupId}`, payload);
      const result = response.data;
      if (result?.success === false) {
        setFormError(result?.message || 'Failed to update recurring series.');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating recurring series:', error);
      setFormError(getApiErrorMessage(error, 'Failed to update series. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormError(null);

    if (!groupId) {
      setFormError('Recurring series ID is missing.');
      return;
    }

    const confirmMessage = deleteAll
      ? 'Delete all sessions in this series, including past sessions?'
      : 'Delete all future sessions in this series?';

    setConfirmRequest({
      title: deleteAll ? 'Delete full recurring series?' : 'Delete future recurring sessions?',
      message: confirmMessage,
      confirmLabel: deleteAll ? 'Delete full series' : 'Delete future sessions',
      tone: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          const query = deleteAll ? '?deleteAll=true' : '';
          const response = await apiService.delete(`/api/sessions/recurring/${groupId}${query}`);
          const result = response.data;
          if (result?.success === false) {
            setFormError(result?.message || 'Failed to delete recurring series.');
            return;
          }

          onSuccess();
          onClose();
        } catch (error) {
          console.error('Error deleting recurring series:', error);
          setFormError(getApiErrorMessage(error, 'Failed to delete series. Please try again.'));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <>
      <Modal
      isOpen={open}
      onClose={onClose}
      title="Manage Recurring Series"
      size="lg"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={loading}>
            Close
          </OutlinedButton>
          <OutlinedButton onClick={handleDelete} disabled={loading}>
            Delete All Future
          </OutlinedButton>
          <PrimaryButton onClick={handleUpdate} disabled={loading}>
            Update All Future
          </PrimaryButton>
        </>
      )}
    >
      {formError && (
        <StyledBox as={ErrorText} $style={{ marginBottom: '1rem' }}>
          {formError}
        </StyledBox>
      )}

      <StyledBox as={SmallText} secondary $style={{ marginBottom: '1rem' }}>
        {seriesCount > 0
          ? `Series includes ${seriesCount} sessions from ${new Date(firstSession.sessionDate).toLocaleDateString()} to ${new Date(lastSession.sessionDate).toLocaleDateString()}.`
          : 'Series details unavailable. Update will apply to all future sessions.'}
      </StyledBox>

      <RecurringSeriesModalFields
        time={time}
        setTime={setTime}
        duration={duration}
        setDuration={setDuration}
        trainerId={trainerId}
        setTrainerId={setTrainerId}
        trainerOptions={trainerOptions}
        location={location}
        setLocation={setLocation}
        notes={notes}
        setNotes={setNotes}
        deleteAll={deleteAll}
        setDeleteAll={setDeleteAll}
      />
      </Modal>
      <ScheduleConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
      />
    </>
  );
};

export default RecurringSeriesModal;
