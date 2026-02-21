/**
 * Recurring Session Modal
 * =======================
 * Admin-only form to create recurring sessions via /api/sessions/recurring
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  CheckboxWrapper,
  CustomSelect,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  HelperText,
  SmallText,
  TimeWheelPicker,
} from './ui';

interface RecurringSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TrainerOption {
  value: string;
  label: string;
}

const daysOfWeekOptions = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const durationPresets = [
  { value: '4weeks', label: '4 Weeks' },
  { value: '8weeks', label: '8 Weeks' },
  { value: '12weeks', label: '12 Weeks' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: 'ongoing', label: 'Ongoing (12 months max)' },
  { value: 'custom', label: 'Custom Date Range' },
];

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
  const [times, setTimes] = useState<string[]>(['09:00']);
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

  const handleToggleDay = (day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        return prev.filter((value) => value !== day);
      }
      return [...prev, day].sort();
    });
  };

  const updateTime = (index: number, value: string) => {
    setTimes((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addTime = () => {
    setTimes((prev) => [...prev, '']);
  };

  const removeTime = (index: number) => {
    setTimes((prev) => prev.filter((_, idx) => idx !== index));
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

    const trimmedTimes = times.map((time) => time.trim()).filter(Boolean);
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
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to create recurring sessions');
        return;
      }

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

      const response = await fetch('/api/sessions/recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to create recurring sessions');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      setFormError('Could not create recurring sessions. Please try again.');
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

      <FormField>
        <Label required>Schedule Duration</Label>
        <CustomSelect
          value={durationPreset}
          onChange={handlePresetChange}
          options={durationPresets}
          placeholder="Select duration"
          aria-label="Schedule duration preset"
        />
        <HelperText>
          {durationPreset === 'custom'
            ? 'Choose your own start and end dates below.'
            : durationPreset === 'ongoing'
              ? 'Creates sessions for 12 months (max allowed).'
              : `Sessions will repeat for the selected period.`}
        </HelperText>
      </FormField>

      <FormField>
        <Label htmlFor="recurring-start-date" required>
          Start Date
        </Label>
        <StyledInput
          id="recurring-start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          hasError={Boolean(fieldErrors.startDate)}
        />
        {fieldErrors.startDate && <ErrorText>{fieldErrors.startDate}</ErrorText>}
      </FormField>

      <FormField>
        <Label htmlFor="recurring-end-date" required>
          End Date {durationPreset !== 'custom' && endDate && '(auto-calculated)'}
        </Label>
        <StyledInput
          id="recurring-end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          hasError={Boolean(fieldErrors.endDate)}
          disabled={durationPreset !== 'custom'}
        />
        {fieldErrors.endDate && <ErrorText>{fieldErrors.endDate}</ErrorText>}
      </FormField>

      <FormField>
        <Label required>Days of Week</Label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {daysOfWeekOptions.map((day) => (
            <CheckboxWrapper key={day.value}>
              <input
                type="checkbox"
                checked={daysOfWeek.includes(day.value)}
                onChange={() => handleToggleDay(day.value)}
              />
              <span>{day.label}</span>
            </CheckboxWrapper>
          ))}
        </div>
        {fieldErrors.daysOfWeek && <ErrorText>{fieldErrors.daysOfWeek}</ErrorText>}
      </FormField>

      <FormField>
        <Label required>Times</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {times.map((time, index) => (
            <div key={`time-${index}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <TimeWheelPicker
                  value={time}
                  onChange={(val) => updateTime(index, val)}
                  step={15}
                  label={`Session time ${index + 1}`}
                  data-testid={`recurring-time-${index}`}
                />
              </div>
              <OutlinedButton
                onClick={() => removeTime(index)}
                disabled={times.length === 1}
                type="button"
              >
                Remove
              </OutlinedButton>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <OutlinedButton onClick={addTime} type="button">
            Add Time
          </OutlinedButton>
        </div>
        {fieldErrors.times && <ErrorText>{fieldErrors.times}</ErrorText>}
        <HelperText>At least one time is required.</HelperText>
      </FormField>

      <FormField>
        <Label htmlFor="recurring-duration" required>
          Duration (minutes)
        </Label>
        <StyledInput
          id="recurring-duration"
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) || 0)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="recurring-trainer">
          Trainer (optional)
        </Label>
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
        <Label htmlFor="recurring-location" required>
          Location
        </Label>
        <StyledInput
          id="recurring-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </FormField>

      <FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
          />
          <span>Notify client about these sessions</span>
        </CheckboxWrapper>
      </FormField>
    </Modal>
  );
};

export default RecurringSessionModal;
