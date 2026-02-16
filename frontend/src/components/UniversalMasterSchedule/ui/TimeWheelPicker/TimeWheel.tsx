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

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { motion, useMotionValue, useAnimation, PanInfo } from 'framer-motion';
import { Modal } from '../CustomModal';
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

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES_DEFAULT = [0, 15, 30, 45];
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

// ─── Wheel Column Component ─────────────────────────────────────────────────

interface WheelColumnProps {
  items: (string | number)[];
  selectedIndex: number;
  onChange: (index: number) => void;
  testId: string;
  label: string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedIndex,
  onChange,
  testId,
  label,
}) => {
  const controls = useAnimation();
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const centerOffset = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
  const activeDescendant = `${testId}-option-${selectedIndex}`;

  // Sync position to selected index
  useEffect(() => {
    const targetY = centerOffset - selectedIndex * ITEM_HEIGHT;
    controls.start({ y: targetY, transition: { type: 'spring', stiffness: 300, damping: 30 } });
  }, [selectedIndex, centerOffset, controls]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const currentY = y.get();
    const velocityBoost = info.velocity.y * 0.15;
    const projected = currentY + velocityBoost;
    const newIndex = Math.round((centerOffset - projected) / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));

    // Haptic feedback
    navigator.vibrate?.(10);

    onChange(clampedIndex);
  }, [centerOffset, items.length, onChange, y]);

  // Keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.max(0, selectedIndex - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.min(items.length - 1, selectedIndex + 1));
    }
  }, [selectedIndex, items.length, onChange]);

  return (
    <ColumnContainer
      role="listbox"
      aria-label={label}
      aria-activedescendant={activeDescendant}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      <HighlightBar />
      <ColumnMask />
      <motion.div
        ref={containerRef}
        drag="y"
        dragConstraints={{
          top: centerOffset - (items.length - 1) * ITEM_HEIGHT,
          bottom: centerOffset,
        }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ y }}
      >
        {items.map((item, idx) => (
          <WheelItem
            key={`${item}-${idx}`}
            id={`${testId}-option-${idx}`}
            role="option"
            aria-selected={idx === selectedIndex}
            $isActive={idx === selectedIndex}
            data-testid={`wheel-option-${item}`}
            onClick={() => {
              navigator.vibrate?.(10);
              onChange(idx);
            }}
          >
            {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
          </WheelItem>
        ))}
      </motion.div>

      {/* Live region for screen readers */}
      <LiveRegion aria-live="polite" aria-atomic="true">
        {items[selectedIndex]}
      </LiveRegion>
    </ColumnContainer>
  );
};

// ─── Native Select Fallback (reduced motion) ────────────────────────────────

interface NativeTimeSelectProps {
  value: string;
  onConfirm: (value: string) => void;
  slots: string[];
  minTime?: string;
  maxTime?: string;
  isOpen: boolean;
  onClose: () => void;
  label?: string;
}

const NativeTimeSelect: React.FC<NativeTimeSelectProps> = ({
  value,
  onConfirm,
  slots,
  minTime,
  maxTime,
  isOpen,
  onClose,
  label,
}) => {
  const [selected, setSelected] = useState(value || slots[0] || '');

  useEffect(() => {
    if (value && slots.includes(value)) {
      setSelected(value);
    }
  }, [value, slots]);

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  const footer = (
    <FooterRow>
      <CancelBtn type="button" onClick={onClose}>Cancel</CancelBtn>
      <ConfirmBtn type="button" onClick={handleConfirm}>Confirm</ConfirmBtn>
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
      <NativeSelectWrapper>
        <NativeSelect
          value={selected}
          onChange={e => setSelected(e.target.value)}
          data-testid="time-native-select"
        >
          {slots.map(slot => {
            const disabled = minTime ? !isTimeInRange(slot, minTime, maxTime) : false;
            return (
              <option key={slot} value={slot} disabled={disabled}>
                {formatTimeDisplay(slot)}
              </option>
            );
          })}
        </NativeSelect>
      </NativeSelectWrapper>
    </Modal>
  );
};

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

const WheelContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
  gap: 1rem;
`;

const PreviewText = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #0EA5E9;
  text-align: center;
  letter-spacing: 0.02em;
`;

const WheelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
`;

const WheelSeparator = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: #94a3b8;
  padding: 0 0.25rem;
  align-self: center;
`;

const ColumnContainer = styled.div`
  position: relative;
  width: 72px;
  height: ${WHEEL_HEIGHT}px;
  overflow: hidden;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.5);
    border-radius: 8px;
  }
`;

const HighlightBar = styled.div`
  position: absolute;
  top: ${Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT}px;
  left: 0;
  right: 0;
  height: ${ITEM_HEIGHT}px;
  background: rgba(14, 165, 233, 0.15);
  border-radius: 8px;
  pointer-events: none;
  z-index: 1;
`;

const ColumnMask = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: linear-gradient(
    to bottom,
    rgba(10, 15, 30, 0.9) 0%,
    transparent 30%,
    transparent 70%,
    rgba(10, 15, 30, 0.9) 100%
  );
`;

const WheelItem = styled.div<{ $isActive: boolean }>`
  height: ${ITEM_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${p => p.$isActive ? '1.25rem' : '1rem'};
  font-weight: ${p => p.$isActive ? 700 : 400};
  color: ${p => p.$isActive ? '#e2e8f0' : '#64748b'};
  transition: font-size 150ms ease, color 150ms ease;
  cursor: pointer;
  user-select: none;
`;

const LiveRegion = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
`;

const ValidationMessage = styled.div`
  font-size: 0.8rem;
  color: #f59e0b;
  text-align: center;
`;

const FooterRow = styled.div`
  display: flex;
  gap: 0.75rem;
  width: 100%;
`;

const CancelBtn = styled.button`
  flex: 1;
  padding: 0.75rem;
  min-height: 44px;
  background: rgba(51, 65, 85, 0.5);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover { background: rgba(51, 65, 85, 0.7); }
`;

const ConfirmBtn = styled.button`
  flex: 1;
  padding: 0.75rem;
  min-height: 44px;
  background: rgba(14, 165, 233, 0.2);
  border: 1px solid rgba(14, 165, 233, 0.4);
  border-radius: 8px;
  color: #0EA5E9;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover:not(:disabled) { background: rgba(14, 165, 233, 0.3); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const NativeSelectWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1rem 0;
`;

const NativeSelect = styled.select`
  width: 100%;
  max-width: 280px;
  padding: 0.75rem 1rem;
  min-height: 44px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 1rem;
  font-family: inherit;
  appearance: auto;
`;
