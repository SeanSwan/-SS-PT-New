/**
 * TimeWheel — Mobile rolodex-style time picker
 * ==============================================
 * Three-column wheel (Hour, Minute, AM/PM) with framer-motion drag.
 * Renders inside CustomModal for bottom-sheet UX, focus trap, drag-to-dismiss.
 *
 * Accessibility:
 * - Custom wheel: role="listbox", role="option", aria-activedescendant, aria-live
 * - Keyboard: Arrow Up/Down, Enter confirms
 * - Reduced motion: renders plain native <select> (own semantics, no listbox)
 *
 * Cross-midnight ranges not supported.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal } from '../CustomModal';
import NativeTimeSelect from './NativeTimeSelect';
import {
  CancelBtn,
  ConfirmBtn,
  FooterRow,
  PreviewText,
  ValidationMessage,
  WheelContainer,
  WheelRow,
  WheelSeparator,
} from './TimeWheel.styles';
import WheelColumn from './WheelColumn';
import { parseTime, formatTime, isTimeInRange, formatTimeDisplay } from './useTimeWheelState';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TimeWheelProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onConfirm: (value: string) => void;
  slots: string[];
  minTime?: string;
  maxTime?: string;
  label?: string;
}

// ─── Reduced Motion Detection ────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// ─── Wheel Column Constants ──────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES_DEFAULT = [0, 15, 30, 45];
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

// ─── Wheel Column Component ─────────────────────────────────────────────────

// ─── Native Select Fallback (reduced motion) ────────────────────────────────

// ─── Main TimeWheel Component ────────────────────────────────────────────────

const TimeWheel: React.FC<TimeWheelProps> = ({
  isOpen,
  onClose,
  value,
  onConfirm,
  slots,
  minTime,
  maxTime,
  label,
}) => {
  const prefersReduced = usePrefersReducedMotion();

  // Compute available minutes from slots (e.g., [0, 15, 30, 45])
  const availableMinutes = useMemo(() => {
    const mins = new Set<number>();
    slots.forEach(slot => {
      const m = parseInt(slot.split(':')[1], 10);
      mins.add(m);
    });
    const sorted = Array.from(mins).sort((a, b) => a - b);
    return sorted.length > 0 ? sorted : MINUTES_DEFAULT;
  }, [slots]);

  // Parse current value into wheel indices
  const parsed = parseTime(value);
  const [hourIndex, setHourIndex] = useState(() => parsed ? HOURS.indexOf(parsed.hour) : 0);
  const [minuteIndex, setMinuteIndex] = useState(() => {
    if (!parsed) return 0;
    const idx = availableMinutes.indexOf(parsed.minute);
    return idx >= 0 ? idx : 0;
  });
  const [periodIndex, setPeriodIndex] = useState(() => parsed ? PERIODS.indexOf(parsed.period) : 0);

  // Sync when value prop changes
  useEffect(() => {
    const p = parseTime(value);
    if (p) {
      const hi = HOURS.indexOf(p.hour);
      const mi = availableMinutes.indexOf(p.minute);
      if (hi >= 0) setHourIndex(hi);
      if (mi >= 0) setMinuteIndex(mi);
      setPeriodIndex(PERIODS.indexOf(p.period));
    }
  }, [value, availableMinutes]);

  const getCurrentTime = useCallback(() => {
    const hour = HOURS[hourIndex] ?? 12;
    const minute = availableMinutes[minuteIndex] ?? 0;
    const period = PERIODS[periodIndex] ?? 'AM';
    return formatTime(hour, minute, period);
  }, [hourIndex, minuteIndex, periodIndex, availableMinutes]);

  const handleConfirm = useCallback(() => {
    const time = getCurrentTime();
    if (!minTime || isTimeInRange(time, minTime, maxTime)) {
      onConfirm(time);
      onClose();
    }
  }, [getCurrentTime, minTime, maxTime, onConfirm, onClose]);

  // Reduced motion: use native <select>
  if (prefersReduced) {
    return (
      <NativeTimeSelect
        value={value}
        onConfirm={onConfirm}
        slots={slots}
        minTime={minTime}
        maxTime={maxTime}
        isOpen={isOpen}
        onClose={onClose}
        label={label}
      />
    );
  }

  const currentTime = getCurrentTime();
  const isCurrentValid = !minTime || isTimeInRange(currentTime, minTime, maxTime);

  const footer = (
    <FooterRow>
      <CancelBtn type="button" onClick={onClose}>Cancel</CancelBtn>
      <ConfirmBtn
        type="button"
        onClick={handleConfirm}
        disabled={!isCurrentValid}
      >
        Confirm
      </ConfirmBtn>
    </FooterRow>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={label || 'Select Time'}
      size="sm"
      footer={footer}
    >
      <WheelContainer data-testid="time-wheel-container">
        <PreviewText data-testid="time-wheel-preview">
          {formatTimeDisplay(currentTime)}
        </PreviewText>
        <WheelRow>
          <WheelColumn
            items={HOURS}
            selectedIndex={hourIndex}
            onChange={setHourIndex}
            testId="wheel-hour"
            label="Hour"
          />
          <WheelSeparator>:</WheelSeparator>
          <WheelColumn
            items={availableMinutes}
            selectedIndex={minuteIndex}
            onChange={setMinuteIndex}
            testId="wheel-minute"
            label="Minute"
          />
          <WheelColumn
            items={PERIODS}
            selectedIndex={periodIndex}
            onChange={setPeriodIndex}
            testId="wheel-period"
            label="AM/PM"
          />
        </WheelRow>
        {!isCurrentValid && (
          <ValidationMessage>
            Selected time is outside available range
          </ValidationMessage>
        )}
      </WheelContainer>
    </Modal>
  );
};

export default TimeWheel;

// ─── Styled Components ───────────────────────────────────────────────────────
