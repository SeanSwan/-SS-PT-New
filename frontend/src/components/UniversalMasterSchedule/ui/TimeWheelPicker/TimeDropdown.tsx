/**
 * TimeDropdown — Desktop keyboard-friendly time slot dropdown
 * ============================================================
 * Positioned dropdown via React Portal (same pattern as CustomSelect.tsx).
 * Renders scrollable time slot buttons with arrow key navigation.
 * 44px minimum touch targets, Crystalline Swan glass styling.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DropdownList, PortalContainer, TimeSlotButton } from './TimeDropdown.styles';
import { formatTimeDisplay, isTimeInRange } from './useTimeWheelState';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TimeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  slots: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  minTime?: string;
  maxTime?: string;
  triggerRef: React.RefObject<HTMLElement | null>;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TimeDropdown: React.FC<TimeDropdownProps> = ({
  isOpen,
  onClose,
  slots,
  selectedValue,
  onSelect,
  minTime,
  maxTime,
  triggerRef,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Initialize focused index to selected value when opening
  useEffect(() => {
    if (isOpen) {
      const idx = slots.indexOf(selectedValue);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, selectedValue, slots]);

  // Calculate position relative to trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = Math.min(300, slots.length * 44 + 16);
    const spaceBelow = viewportHeight - rect.bottom;

    if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
      setOpenDirection('up');
      setPosition({ top: rect.top - dropdownHeight - 4, left: rect.left, width: rect.width });
    } else {
      setOpenDirection('down');
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [slots.length, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !dropdownRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose, triggerRef]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const el = itemRefs.current.get(focusedIndex);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, slots.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < slots.length) {
          const slot = slots[focusedIndex];
          if (!minTime || isTimeInRange(slot, minTime, maxTime)) {
            onSelect(slot);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(slots.length - 1);
        break;
    }
  }, [focusedIndex, slots, minTime, maxTime, onSelect, onClose, triggerRef]);

  // Focus list on open
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const focusedSlotId = focusedIndex >= 0 ? `time-option-${slots[focusedIndex]}` : undefined;

  const dropdown = (
    <PortalContainer
      ref={dropdownRef}
      $top={position.top}
      $left={position.left}
      $width={position.width}
    >
      <DropdownList
        ref={listRef}
        role="listbox"
        aria-activedescendant={focusedSlotId}
        aria-label="Select time"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        $direction={openDirection}
        data-testid="time-dropdown-list"
      >
        {slots.map((slot, idx) => {
          const isSelected = slot === selectedValue;
          const isFocused = idx === focusedIndex;
          const isDisabled = minTime ? !isTimeInRange(slot, minTime, maxTime) : false;

          return (
            <TimeSlotButton
              key={slot}
              ref={(el: HTMLButtonElement | null) => {
                if (el) itemRefs.current.set(idx, el);
                else itemRefs.current.delete(idx);
              }}
              id={`time-option-${slot}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={isDisabled}
              $isSelected={isSelected}
              $isFocused={isFocused}
              $isDisabled={isDisabled}
              onClick={() => {
                if (!isDisabled) onSelect(slot);
              }}
              onMouseEnter={() => setFocusedIndex(idx)}
              data-testid={`time-slot-${slot}`}
            >
              {formatTimeDisplay(slot)}
            </TimeSlotButton>
          );
        })}
      </DropdownList>
    </PortalContainer>
  );

  return createPortal(dropdown, document.body);
};

export default TimeDropdown;

// ─── Styled Components ───────────────────────────────────────────────────────
