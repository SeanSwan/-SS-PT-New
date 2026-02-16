/**
 * Blocked Time Modal
 * ==================
 * Admin/Trainer form to create blocked time via /api/sessions/block
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
  combineDateAndTime,
  getLocalToday,
  getMinTimeForToday,
  getTimezoneAbbr,
} from './ui';

interface BlockedTimeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TrainerOption {
  value: string;
  label: string;
}

const BlockedTimeModal: React.FC<BlockedTimeModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [isTrainerUser, setIsTrainerUser] = useState(false);

  const [blockedDateStr, setBlockedDateStr] = useState('');
  const [blockedTimeStr, setBlockedTimeStr] = useState('');
  const frozenNowRef = React.useRef(Date.now());

  // Compute sessionDate from split state
  const sessionDate = React.useMemo(() => {
    if (blockedDateStr && blockedTimeStr) {
      try { return combineDateAndTime(blockedDateStr, blockedTimeStr); } catch { return ''; }
    }
    return blockedDateStr || '';
  }, [blockedDateStr, blockedTimeStr]);

  // Compute minTime for today
  const blockedIsToday = blockedDateStr === getLocalToday();
  const blockedMinTime = React.useMemo(() => {
    if (!blockedIsToday) return undefined;
    return getMinTimeForToday(15, frozenNowRef.current);
  }, [blockedIsToday]);

  const [duration, setDuration] = useState(60);
  const [trainerId, setTrainerId] = useState('');
  const [location, setLocation] = useState('Main Studio');
  const [reason, setReason] = useState('');
  const [notifyClient, setNotifyClient] = useState(false);

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
      setBlockedDateStr('');
      setBlockedTimeStr('');
      return;
    }

    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user?.role === 'trainer') {
          setIsTrainerUser(true);
          if (user?.id && !trainerId) {
            setTrainerId(String(user.id));
          }
        } else {
          setIsTrainerUser(false);
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
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
  }, [open, trainerId]);

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!sessionDate) {
      errors.sessionDate = 'Session date is required';
    }

    if (!duration || duration <= 0) {
      errors.duration = 'Duration must be at least 15 minutes';
    }

    return errors;
  };

  const handleSubmit = async () => {
    setFormError(null);
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to block time');
        return;
      }

      const payload = {
        sessionDate,
        duration,
        trainerId: trainerId || null,
        location,
        reason: reason || undefined,
        notifyClient
      };

      const response = await fetch('/api/sessions/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to block time');
        return;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error blocking time:', error);
      setFormError('Could not block time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Block Time"
      size="md"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={loading}>
            Cancel
          </OutlinedButton>
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            Block Time
          </PrimaryButton>
        </>
      )}
    >
      <SmallText secondary style={{ marginBottom: '1rem' }}>
        Blocked time removes availability from the schedule.
      </SmallText>

      {formError && (
        <ErrorText style={{ marginBottom: '1rem' }}>
          {formError}
        </ErrorText>
      )}

      <FormField>
        <Label htmlFor="blocked-session-date" required>
          Session Date & Time
        </Label>
        <StyledInput
          id="blocked-session-date"
          type="date"
          value={blockedDateStr}
          onChange={(e) => {
            setBlockedDateStr(e.target.value);
            frozenNowRef.current = Date.now();
          }}
          hasError={Boolean(fieldErrors.sessionDate)}
        />
        <div style={{ marginTop: '0.5rem' }}>
          <TimeWheelPicker
            value={blockedTimeStr}
            onChange={setBlockedTimeStr}
            minTime={blockedMinTime}
            step={15}
            disabled={!blockedDateStr}
            label="Block Time"
            timezone={getTimezoneAbbr()}
            data-testid="blocked-time-picker"
          />
        </div>
        {blockedMinTime === null && blockedIsToday && (
          <HelperText style={{ color: '#f59e0b' }}>
            No times available today. Select a future date.
          </HelperText>
        )}
        {fieldErrors.sessionDate && <ErrorText>{fieldErrors.sessionDate}</ErrorText>}
      </FormField>

      <FormField>
        <Label htmlFor="blocked-duration" required>
          Duration (minutes)
        </Label>
        <StyledInput
          id="blocked-duration"
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) || 0)}
          hasError={Boolean(fieldErrors.duration)}
        />
        {fieldErrors.duration && <ErrorText>{fieldErrors.duration}</ErrorText>}
      </FormField>

      <FormField>
        <Label htmlFor="blocked-trainer">
          Trainer {isTrainerUser ? '(you)' : '(optional)'}
        </Label>
        <CustomSelect
          value={trainerId}
          onChange={(value) => setTrainerId(String(value))}
          options={trainerOptions}
          placeholder="Select trainer"
          searchable
          aria-label="Select trainer for blocked time"
          disabled={isTrainerUser}
        />
        <HelperText>
          {isTrainerUser
            ? 'Blocked time will apply to your calendar.'
            : 'Leave unassigned to block studio time without a trainer.'}
        </HelperText>
      </FormField>

      <FormField>
        <Label htmlFor="blocked-location" required>
          Location
        </Label>
        <StyledInput
          id="blocked-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="blocked-reason">
          Reason (optional)
        </Label>
        <StyledInput
          id="blocked-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lunch break, personal appointment, etc."
        />
      </FormField>

      <FormField>
        <CheckboxWrapper>
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
          />
          <span>Notify client about this block</span>
        </CheckboxWrapper>
        <HelperText>
          Default is off for blocked time.
        </HelperText>
      </FormField>
    </Modal>
  );
};

export default BlockedTimeModal;
