/**
 * Recurring Session Modal
 * =======================
 * Admin-only form to create recurring sessions via /api/sessions/recurring
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  SmallText,
} from './ui';
import apiService from '../../services/api.service';
import {
  createRecurringTimeRow,
  getRecurringTimeValues,
  removeRecurringTimeRow,
  updateRecurringTimeRow,
  type RecurringTimeRow,
  type TrainerOption,
} from './RecurringSessionModal.logic';
import {
  RecurringDayFields,
  RecurringScheduleFields,
  RecurringSessionDetailsFields,
  RecurringTimeFields,
} from './RecurringSessionModal.sections';

interface RecurringSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

/** Given a start date string (YYYY-MM-DD) and a preset key, return YYYY-MM-DD end date */
function computeEndDate(start: string, preset: string): string {
  const d = new Date(start + 'T00:00:00'); // local midnight
  switch (preset) {
    case '4weeks':  d.setDate(d.getDate() + 28); break;
    case '8weeks':  d.setDate(d.getDate() + 56); break;
    case '12weeks': d.setDate(d.getDate() + 84); break;
    case '6months': d.setMonth(d.getMonth() + 6); break;
    case '1year':   d.setFullYear(d.getFullYear() + 1); break;
    case 'ongoing': d.setMonth(d.getMonth() + 12); break;
    default: return '';
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const RecurringSessionModal: React.FC<RecurringSessionModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);

  const [durationPreset, setDurationPreset] = useState('8weeks');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const nextTimeRowId = useRef(2);
  const [timeRows, setTimeRows] = useState<RecurringTimeRow[]>([createRecurringTimeRow(1, '09:00')]);
  const [duration, setDuration] = useState(60);
  const [trainerId, setTrainerId] = useState('');
  const [location, setLocation] = useState('Main Studio');
  const [notifyClient, setNotifyClient] = useState(true);

  // Auto-compute endDate when startDate or preset changes (non-custom)
  useEffect(() => {
    if (durationPreset !== 'custom' && startDate) {
      setEndDate(computeEndDate(startDate, durationPreset));
    }
  }, [startDate, durationPreset]);

  const handlePresetChange = (value: string | number) => {
    const preset = String(value);
    setDurationPreset(preset);
    if (preset !== 'custom' && startDate) {
      setEndDate(computeEndDate(startDate, preset));
    }
  };

  const trainerOptions = useMemo(() => {
    return [
      { value: '', label: 'Unassigned (optional)' },
      ...trainers
    ];
  }, [trainers]);

  useEffect(() => {
    if (!open) {
      setFormError(null);
      setFieldErrors({});
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

  const handleToggleDay = (day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        return prev.filter((value) => value !== day);
      }
      return [...prev, day].sort();
    });
  };

  const updateTime = (rowId: string, value: string) => {
    setTimeRows((prev) => updateRecurringTimeRow(prev, rowId, value));
  };

  const addTime = () => {
    const row = createRecurringTimeRow(nextTimeRowId.current);
    nextTimeRowId.current += 1;
    setTimeRows((prev) => [...prev, row]);
  };

  const removeTime = (rowId: string) => {
    setTimeRows((prev) => removeRecurringTimeRow(prev, rowId));
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!endDate) {
      errors.endDate = 'End date is required';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        errors.endDate = 'End date must be after start date';
      }
    }

    if (!daysOfWeek.length) {
      errors.daysOfWeek = 'Select at least one day';
    }

    const trimmedTimes = getRecurringTimeValues(timeRows);
    if (!trimmedTimes.length) {
      errors.times = 'At least one time is required';
    }

    return { errors, trimmedTimes };
  };

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});

    const { errors, trimmedTimes } = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        startDate,
        endDate,
        daysOfWeek,
        times: trimmedTimes,
        duration,
        trainerId: trainerId || null,
        location,
        notifyClient,
        // Send client timezone offset so the backend (UTC) can store correct local times.
        // getTimezoneOffset() returns minutes BEHIND UTC (e.g., 480 for PST = UTC-8).
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      };

      const response = await apiService.post('/api/sessions/recurring', payload);
      const result = response.data;

      if (result?.success === false) {
        setFormError(result?.message || 'Failed to create recurring sessions');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      setFormError(getApiErrorMessage(error, 'Could not create recurring sessions. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Create Recurring Sessions"
      size="lg"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={loading}>
            Cancel
          </OutlinedButton>
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            Create Recurring
          </PrimaryButton>
        </>
      )}
    >
      <SmallText secondary style={{ marginBottom: '1rem' }}>
        Note: Recurring series are capped at 52 occurrences or 12 months.
      </SmallText>

      {formError && (
        <ErrorText style={{ marginBottom: '1rem' }}>
          {formError}
        </ErrorText>
      )}

      <RecurringScheduleFields
        durationPreset={durationPreset}
        startDate={startDate}
        endDate={endDate}
        fieldErrors={fieldErrors}
        onPresetChange={handlePresetChange}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <RecurringDayFields
        daysOfWeek={daysOfWeek}
        fieldErrors={fieldErrors}
        onToggleDay={handleToggleDay}
      />

      <RecurringTimeFields
        timeRows={timeRows}
        fieldErrors={fieldErrors}
        onAddTime={addTime}
        onRemoveTime={removeTime}
        onUpdateTime={updateTime}
      />

      <RecurringSessionDetailsFields
        duration={duration}
        trainerId={trainerId}
        trainerOptions={trainerOptions}
        location={location}
        notifyClient={notifyClient}
        onDurationChange={setDuration}
        onTrainerChange={setTrainerId}
        onLocationChange={setLocation}
        onNotifyClientChange={setNotifyClient}
      />
    </Modal>
  );
};

export default RecurringSessionModal;
