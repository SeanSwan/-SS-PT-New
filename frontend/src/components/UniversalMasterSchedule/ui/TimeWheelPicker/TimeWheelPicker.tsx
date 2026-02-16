/**
 * TimeWheelPicker — Adaptive time picker (mobile=wheel, desktop=dropdown)
 * ========================================================================
 * Single entry point that renders:
 * - Desktop (>480px): TimeDropdown positioned popover
 * - Mobile (<=480px): TimeWheel inside CustomModal bottom sheet (lazy-loaded)
 *
 * Value model: "HH:mm" 24-hour format throughout.
 * Cross-midnight ranges not supported.
 */

import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Clock } from 'lucide-react';
import TimeDropdown from './TimeDropdown';
import { useTimeWheelState, getTimezoneAbbr, formatTimeDisplay } from './useTimeWheelState';

// Lazy-load mobile wheel — desktop users never download this chunk
const TimeWheel = lazy(() => import('./TimeWheel'));

// ─── Mobile Detection (matches CustomModal threshold) ────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TimeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
  minTime?: string | null;
  maxTime?: string;
  step?: number;
  disabled?: boolean;
  label?: string;
  timezone?: string;
  'data-testid'?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  value,
  onChange,
  minTime,
  maxTime,
  step = 15,
  disabled = false,
  label,
  timezone,
  'data-testid': testId = 'time-wheel-picker',
}) => {
  const isMobile = useIsMobile();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const state = useTimeWheelState({
    value,
    onChange,
    step,
    minTime,
    maxTime,
  });

  const isEffectivelyDisabled = disabled || state.isDisabled;

  // Prefetch mobile wheel on focus/tap (warm the chunk before first open)
  const prefetchWheel = useCallback(() => {
    if (isMobile) {
      import('./TimeWheel');
    }
  }, [isMobile]);

  const tzDisplay = timezone ?? getTimezoneAbbr();

  return (
    <PickerContainer data-testid={testId}>
      <TriggerButton
        ref={triggerRef}
        type="button"
        onClick={state.toggle}
        onFocus={prefetchWheel}
        onTouchStart={prefetchWheel}
        disabled={isEffectivelyDisabled}
        aria-expanded={state.isOpen}
        aria-haspopup="listbox"
        aria-label={label ? `${label}: ${state.displayValue}` : `Time: ${state.displayValue}`}
        data-testid={`${testId}-trigger`}
      >
        <TriggerContent>
          <Clock size={16} />
          <TriggerText>
            {state.isDisabled ? 'No times available today' : state.displayValue}
          </TriggerText>
        </TriggerContent>
        {tzDisplay && !state.isDisabled && (
          <TzBadge data-testid="tz-badge">{tzDisplay}</TzBadge>
        )}
      </TriggerButton>

      {/* Desktop: inline dropdown */}
      {!isMobile && (
        <TimeDropdown
          isOpen={state.isOpen}
          onClose={state.close}
          slots={state.slots}
          selectedValue={state.selectedValue}
          onSelect={state.setSelectedValue}
          minTime={state.effectiveMinTime}
          maxTime={state.effectiveMaxTime}
          triggerRef={triggerRef}
        />
      )}

      {/* Mobile: wheel in modal (lazy-loaded) */}
      {isMobile && state.isOpen && (
        <Suspense fallback={null}>
          <TimeWheel
            isOpen={state.isOpen}
            onClose={state.close}
            value={state.selectedValue}
            onConfirm={state.setSelectedValue}
            slots={state.slots}
            minTime={state.effectiveMinTime}
            maxTime={state.effectiveMaxTime}
            label={label}
          />
        </Suspense>
      )}
    </PickerContainer>
  );
};

export default TimeWheelPicker;

// ─── Styled Components ───────────────────────────────────────────────────────

const PickerContainer = styled.div`
  position: relative;
  width: 100%;
`;

const TriggerButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 200ms ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  outline: none;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    border-color: rgba(14, 165, 233, 0.4);
    background: rgba(255, 255, 255, 0.08);
  }

  &:focus-visible {
    border-color: #0EA5E9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &[aria-expanded="true"] {
    border-color: rgba(14, 165, 233, 0.5);
    background: rgba(14, 165, 233, 0.05);
  }
`;

const TriggerContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: inherit;

  svg {
    color: #94a3b8;
    flex-shrink: 0;
  }
`;

const TriggerText = styled.span`
  font-weight: 500;
`;

const TzBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 500;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
`;
