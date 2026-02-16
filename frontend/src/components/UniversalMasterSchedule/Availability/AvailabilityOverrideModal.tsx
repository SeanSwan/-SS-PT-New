/**
 * AvailabilityOverrideModal - One-off Schedule Override
 * ======================================================
 * Modal for adding vacation, sick days, or extra availability.
 * Uses TimeWheelPicker for start/end time with auto-correct validation.
 * Cross-midnight ranges not supported.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrainerAvailability } from '../../../hooks/useTrainerAvailability';
import {
  Modal,
  PrimaryButton,
  OutlinedButton,
  StyledInput,
  CustomSelect,
  FormField,
  Label,
  StyledTextarea,
  FlexBox,
  Spinner,
  TimeWheelPicker,
  validateTimeRange,
  getLocalToday,
  getMinTimeForToday,
  getTimezoneAbbr,
} from '../ui';
import { HelperText } from '../ui/Typography';
import { roundUpToStep } from '../ui/TimeWheelPicker/useTimeWheelState';

interface AvailabilityOverrideModalProps {
  trainerId: number | string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const STEP = 15;

const AvailabilityOverrideModal: React.FC<AvailabilityOverrideModalProps> = ({
  trainerId,
  isOpen,
  onClose,
  onCreated
}) => {
  const { addOverride, isAddingOverride } = useTrainerAvailability(trainerId);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    type: 'blocked',
    reason: ''
  });

  const [timeRangeNotice, setTimeRangeNotice] = useState('');
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frozenNowRef = useRef(Date.now());

  // Compute minTime for today (start time only)
  const isToday = formData.date === getLocalToday();
  const startMinTime = useMemo(() => {
    if (!isToday) return undefined;
    return getMinTimeForToday(STEP, frozenNowRef.current);
  }, [isToday]);

  // endTime minTime = startTime + one step
  const endMinTime = useMemo(() => {
    return roundUpToStep(formData.startTime, STEP);
  }, [formData.startTime]);

  // Auto-correct end time if it's <= start time
  const handleStartTimeChange = (val: string) => {
    setFormData(prev => {
      const next = { ...prev, startTime: val };
      const validation = validateTimeRange(val, prev.endTime);
      if (!validation.valid) {
        const corrected = roundUpToStep(val, STEP);
        if (corrected) {
          // Advance endTime by one step past startTime
          const endCorrected = roundUpToStep(
            `${Math.floor((parseInt(val.split(':')[0]) * 60 + parseInt(val.split(':')[1]) + STEP) / 60).toString().padStart(2, '0')}:${((parseInt(val.split(':')[0]) * 60 + parseInt(val.split(':')[1]) + STEP) % 60).toString().padStart(2, '0')}`,
            STEP
          );
          if (endCorrected) {
            next.endTime = endCorrected;
            showNotice('End time adjusted to be after start time');
          }
        }
      }
      return next;
    });
  };

  const handleEndTimeChange = (val: string) => {
    const validation = validateTimeRange(formData.startTime, val);
    if (!validation.valid) {
      // Auto-correct: set to startTime + step
      const minMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]) + STEP;
      const corrected = `${Math.floor(minMinutes / 60).toString().padStart(2, '0')}:${(minMinutes % 60).toString().padStart(2, '0')}`;
      const rounded = roundUpToStep(corrected, STEP);
      if (rounded) {
        setFormData(prev => ({ ...prev, endTime: rounded }));
        showNotice('End time adjusted to be after start time');
      }
    } else {
      setFormData(prev => ({ ...prev, endTime: val }));
    }
  };

  const showNotice = (msg: string) => {
    setTimeRangeNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setTimeRangeNotice(''), 3000);
  };

  // Refresh frozenNow when date changes
  useEffect(() => {
    frozenNowRef.current = Date.now();
  }, [formData.date]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    try {
      await addOverride({
        ...formData,
        trainerId: Number(trainerId)
      });
      if (onCreated) onCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create override:', error);
    }
  };

  const tzAbbr = getTimezoneAbbr();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Schedule Override"
      size="sm"
      footer={
        <>
          <OutlinedButton onClick={onClose} disabled={isAddingOverride}>
            Cancel
          </OutlinedButton>
          <PrimaryButton onClick={handleSubmit} disabled={isAddingOverride}>
            {isAddingOverride ? <Spinner size={16} /> : 'Add Override'}
          </PrimaryButton>
        </>
      }
    >
      <FlexBox direction="column" gap="1rem">
        <FormField>
          <Label htmlFor="date" required>Date</Label>
          <StyledInput
            id="date"
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </FormField>

        <FlexBox gap="1rem">
          <FormField style={{ flex: 1 }}>
            <Label htmlFor="startTime" required>Start Time</Label>
            <TimeWheelPicker
              value={formData.startTime}
              onChange={handleStartTimeChange}
              minTime={startMinTime}
              step={STEP}
              label="Start Time"
              timezone={tzAbbr}
              data-testid="override-start-time"
            />
            {startMinTime === null && isToday && (
              <HelperText style={{ color: '#f59e0b', marginTop: '0.25rem' }}>
                No times available today. Select a future date.
              </HelperText>
            )}
          </FormField>
          <FormField style={{ flex: 1 }}>
            <Label htmlFor="endTime" required>End Time</Label>
            <TimeWheelPicker
              value={formData.endTime}
              onChange={handleEndTimeChange}
              minTime={endMinTime}
              step={STEP}
              label="End Time"
              timezone={tzAbbr}
              data-testid="override-end-time"
            />
          </FormField>
        </FlexBox>

        {timeRangeNotice && (
          <HelperText
            style={{ color: '#f59e0b' }}
            data-testid="time-range-notice"
          >
            {timeRangeNotice}
          </HelperText>
        )}

        <FormField>
          <Label htmlFor="type" required>Type</Label>
          <CustomSelect
            value={formData.type}
            onChange={val => setFormData({ ...formData, type: val as string })}
            options={[
              { value: 'blocked', label: 'Blocked (Unavailable)' },
              { value: 'vacation', label: 'Vacation / Time Off' },
              { value: 'available', label: 'Extra Availability' }
            ]}
          />
        </FormField>

        <FormField>
          <Label htmlFor="reason">Reason (Optional)</Label>
          <StyledTextarea
            id="reason"
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            placeholder="e.g., Doctor appointment, Holiday"
            rows={3}
          />
        </FormField>
      </FlexBox>
    </Modal>
  );
};

export default AvailabilityOverrideModal;
