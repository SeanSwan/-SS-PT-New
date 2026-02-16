/**
 * useTimeWheelState — Shared time parsing, formatting, and validation utilities
 * ==============================================================================
 * Pure utility functions + a React hook for time picker state management.
 * All time values use "HH:mm" 24-hour format internally.
 *
 * Cross-midnight ranges are NOT supported in this sprint.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedTime {
  hour: number;   // 1-12
  minute: number; // 0-59
  period: 'AM' | 'PM';
}

export interface TimeValidation {
  valid: boolean;
  error?: string;
}

// ─── Step Validation ─────────────────────────────────────────────────────────

/**
 * Normalize step to a valid integer in 1..60. Falls back to 15 on invalid input.
 */
export function normalizeStep(step: unknown): number {
  if (step === null || step === undefined) return 15;
  const n = Number(step);
  if (!Number.isFinite(n) || n < 1 || n > 60) return 15;
  return Math.floor(n);
}

// ─── Time Parsing / Formatting ───────────────────────────────────────────────

/**
 * Parse "HH:mm" (24h) into 12-hour components.
 * Returns null for invalid input.
 */
export function parseTime(time: string): ParsedTime | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hStr, mStr] = time.split(':');
  const h24 = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (h24 < 0 || h24 > 23 || m < 0 || m > 59) return null;

  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let hour = h24 % 12;
  if (hour === 0) hour = 12;
  return { hour, minute: m, period };
}

/**
 * Format 12-hour components back to "HH:mm" (24h).
 */
export function formatTime(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h24 = hour % 12;
  if (period === 'PM') h24 += 12;
  return `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Format "HH:mm" as human-readable "h:mm AM/PM" string.
 */
export function formatTimeDisplay(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  return `${parsed.hour}:${parsed.minute.toString().padStart(2, '0')} ${parsed.period}`;
}

// ─── Slot Generation ─────────────────────────────────────────────────────────

/**
 * Compute the last valid time slot for a given step.
 * Uses mathematical derivation: lastSlotMinutes = floor((1439) / step) * step
 * This works for any step value (e.g., step=7 -> 23:57, step=13 -> 23:53).
 */
export function computeMaxTime(step: number): string {
  const s = normalizeStep(step);
  const lastSlotMinutes = Math.floor(1439 / s) * s; // 1439 = 24*60 - 1
  const h = Math.floor(lastSlotMinutes / 60);
  const m = lastSlotMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Convert "HH:mm" to total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes since midnight to "HH:mm".
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Generate time slots between min and max at given step intervals.
 */
export function generateSlots(
  min: string = '00:00',
  max?: string,
  step: number = 15
): string[] {
  const s = normalizeStep(step);
  const effectiveMax = max || computeMaxTime(s);
  const minMin = timeToMinutes(min);
  const maxMin = timeToMinutes(effectiveMax);
  const slots: string[] = [];

  // Start at the first slot that's >= min and aligned to step
  let start = Math.ceil(minMin / s) * s;
  for (let m = start; m <= maxMin; m += s) {
    if (m >= 0 && m < 1440) {
      slots.push(minutesToTime(m));
    }
  }
  return slots;
}

/**
 * Check if a time is within [min, max] range.
 */
export function isTimeInRange(time: string, min?: string, max?: string): boolean {
  const t = timeToMinutes(time);
  if (min !== undefined && t < timeToMinutes(min)) return false;
  if (max !== undefined && t > timeToMinutes(max)) return false;
  return true;
}

// ─── Round Up to Step ────────────────────────────────────────────────────────

/**
 * Round a time UP to the nearest step boundary.
 * Returns null if the result exceeds the computed maxTime for the given step
 * (meaning "no valid time slots remain").
 */
export function roundUpToStep(time: string, step: number): string | null {
  const s = normalizeStep(step);
  const minutes = timeToMinutes(time);
  const rounded = Math.ceil(minutes / s) * s;
  const maxMinutes = timeToMinutes(computeMaxTime(s));

  if (rounded > maxMinutes) return null;
  if (rounded >= 1440) return null;
  return minutesToTime(rounded);
}

// ─── Time Range Validation ───────────────────────────────────────────────────

/**
 * Validate that end > start. Cross-midnight is disallowed.
 */
export function validateTimeRange(start: string, end: string): TimeValidation {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (endMin <= startMin) {
    return { valid: false, error: 'End time must be after start time' };
  }
  return { valid: true };
}

// ─── Date+Time Serializer ────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Combine a date string and time string into "YYYY-MM-DDTHH:mm:ss".
 * Purely string-based — no new Date() construction (avoids timezone shift).
 * Used by ScheduleModals + BlockedTimeModal where API expects full datetime.
 * NOT used by RecurringSessionModal or AvailabilityOverrideModal (those send HH:mm).
 */
export function combineDateAndTime(dateStr: string, hhmm: string): string {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  if (!TIME_RE.test(hhmm)) {
    throw new Error(`Invalid time format: "${hhmm}". Expected HH:mm.`);
  }
  return `${dateStr}T${hhmm}:00`;
}

// ─── Today / MinTime ─────────────────────────────────────────────────────────

/**
 * Get today's date as "YYYY-MM-DD" from the same local-date basis as <input type="date">.
 * Accepts an optional `now` param for testability (frozen clock).
 */
export function getLocalToday(now?: number): string {
  const d = new Date(now ?? Date.now());
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compute the minimum selectable time for today, rounded up to the next step boundary.
 * Returns null if no valid slots remain today.
 * Accepts an optional `now` param for deterministic testing.
 */
export function getMinTimeForToday(step: number, now?: number): string | null {
  const s = normalizeStep(step);
  const d = new Date(now ?? Date.now());
  const currentMinutes = d.getHours() * 60 + d.getMinutes();
  const currentTime = minutesToTime(currentMinutes);
  return roundUpToStep(currentTime, s);
}

// ─── Timezone Abbreviation ───────────────────────────────────────────────────

/**
 * Get the user's local timezone abbreviation (e.g., "EST", "PDT", "GMT-5").
 * Uses Intl.DateTimeFormat.formatToParts() — the single canonical derivation.
 * Returns empty string if unavailable (TZ badge won't render).
 */
export function getTimezoneAbbr(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value ?? '';
  } catch {
    return '';
  }
}

// ─── React Hook ──────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTimeWheelStateOptions {
  value: string;
  onChange: (value: string) => void;
  step?: number;
  minTime?: string | null;
  maxTime?: string;
}

interface UseTimeWheelStateReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  slots: string[];
  selectedValue: string;
  setSelectedValue: (value: string) => void;
  normalizedStep: number;
  effectiveMinTime: string | undefined;
  effectiveMaxTime: string;
  displayValue: string;
  isDisabled: boolean;
}

export function useTimeWheelState({
  value,
  onChange,
  step = 15,
  minTime,
  maxTime,
}: UseTimeWheelStateOptions): UseTimeWheelStateReturn {
  const normalizedStep = normalizeStep(step);
  const effectiveMaxTime = maxTime || computeMaxTime(normalizedStep);
  const effectiveMinTime = minTime === null ? undefined : minTime;
  const isDisabled = minTime === null;

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    if (!isDisabled) setIsOpen(true);
  }, [isDisabled]);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    if (!isDisabled) setIsOpen(prev => !prev);
  }, [isDisabled]);

  const slots = generateSlots(effectiveMinTime, effectiveMaxTime, normalizedStep);

  const setSelectedValue = useCallback((newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  }, [onChange]);

  const displayValue = value ? formatTimeDisplay(value) : 'Select time';

  return {
    isOpen,
    open,
    close,
    toggle,
    slots,
    selectedValue: value,
    setSelectedValue,
    normalizedStep,
    effectiveMinTime,
    effectiveMaxTime,
    displayValue,
    isDisabled,
  };
}
