/**
 * Recurring Series Modal
 * ======================
 * Admin-only management for recurring series updates and deletions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  CustomSelect,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  SmallText,
  HelperText,
  CheckboxWrapper
} from './ui';

interface SessionSummary {
  sessionDate: string;
  duration: number;
  trainerId?: number;
  location?: string;
  notes?: string;
}

interface TrainerOption {
  value: string;
  label: string;
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

const RecurringSeriesModal: React.FC<RecurringSeriesModalProps> = ({
  groupId,
  open,
  onClose,
  onSuccess,
  seriesSessions = []
}) => {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [deleteAll, setDeleteAll] = useState(false);

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
      return;
    }

    setFormError(null);
    setDeleteAll(false);
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
        const token = localStorage.getItem('token');
        if (!token) {
          setTrainers([]);
          return;
        }

        const response = await fetch('/api/sessions/users/trainers', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          setTrainers([]);
          return;
        }

        const payload = await response.json();
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
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to update recurring series.');
        return;
      }

      const response = await fetch(`/api/sessions/recurring/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to update recurring series.');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating recurring series:', error);
      setFormError('Failed to update series. Please try again.');
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

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to delete recurring series.');
        return;
      }

      const query = deleteAll ? '?deleteAll=true' : '';
      const response = await fetch(`/api/sessions/recurring/${groupId}${query}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to delete recurring series.');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting recurring series:', error);
      setFormError('Failed to delete series. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <ErrorText style={{ marginBottom: '1rem' }}>
          {formError}
        </ErrorText>
      )}

      <SmallText secondary style={{ marginBottom: '1rem' }}>
        {seriesCount > 0
          ? `Series includes ${seriesCount} sessions from ${new Date(firstSession.sessionDate).toLocaleDateString()} to ${new Date(lastSession.sessionDate).toLocaleDateString()}.`
          : 'Series details unavailable. Update will apply to all future sessions.'}
      </SmallText>

      <FormField>
        <Label htmlFor="series-time">New Time (optional)</Label>
        <StyledInput
          id="series-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <HelperText>Updates the time for all future sessions.</HelperText>
      </FormField>

      <FormField>
        <Label htmlFor="series-duration">Duration (minutes)</Label>
        <StyledInput
          id="series-duration"
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
        />
      </FormField>

      <FormField>
        <Label htmlFor="series-trainer">Trainer</Label>
        <CustomSelect
          value={trainerId}
          onChange={(value) => setTrainerId(String(value))}
          options={trainerOptions}
          placeholder="Select trainer"
          searchable
          aria-label="Select trainer"
        />
      </FormField>

      <FormField>
        <Label htmlFor="series-location">Location</Label>
        <StyledInput
          id="series-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="series-notes">Notes</Label>
        <StyledInput
          id="series-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormField>

      <FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            checked={deleteAll}
            onChange={(e) => setDeleteAll(e.target.checked)}
          />
          <span>Delete past sessions too</span>
        </CheckboxWrapper>
      </FormField>
    </Modal>
  );
};

export default RecurringSeriesModal;
