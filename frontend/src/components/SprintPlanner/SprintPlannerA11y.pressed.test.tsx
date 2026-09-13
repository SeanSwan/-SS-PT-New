/**
 * ============================================================================
 * FILE: SprintPlannerA11y.pressed.test.tsx — R-H17, slice 3 (the last targets).
 *
 * THE REGISTER'S CRITERION (15-audit-findings-and-fix-register.md:65, row R-H17):
 *   "Sprint cards, slots and dialogs support keyboard activation, focus
 *    containment/restoration, Escape and named errors"
 *
 * WHAT WAS MISSING AT THESE TWO SITES, measured before writing anything:
 *   * `BootcampCalendar` renders each class as a `CalendarDot` — a styled `div` with a bare
 *     `onClick` — so a slot that exists ONLY in the calendar view (the timeline is a separate tab)
 *     could not be opened from the keyboard at all, and its two-or-three-letter abbreviation was the
 *     whole accessible name.
 *   * `CreateSprintModal`'s day and focus chips ARE real `<button type="button">`s, so they were
 *     already keyboard-activatable — what they lacked was the PRESSED semantic: the selection was
 *     painted with a `$selected` prop that assistive technology cannot see, so "selected/pressed
 *     semantics" from the same register row was unmet even though the interaction worked.
 *
 * The day CELL (`CalendarCell`) is deliberately left as a pointer shortcut rather than given a
 * button role: it CONTAINS the dots, and nesting interactive elements inside `role="button"` is
 * invalid and would make the inner ones unreachable. Keyboard users reach the dots themselves.
 * ============================================================================
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BootcampCalendar from './BootcampCalendar';
import CreateSprintModal from './CreateSprintModal';

/**
 * The calendar renders the CURRENT month, so a hard-coded date silently renders no dot at all — the
 * first version of this file used 2026-03-03 and failed with "unable to find role=button" while the
 * heading read "September 2026". The fixture date is therefore derived from the displayed month.
 */
const slotDate = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-03`;
})();
const SLOT_DATE = new RegExp(slotDate);

const slot = (over: Record<string, unknown> = {}) => ({
  id: 7,
  dayOfWeek: 1,
  scheduledDate: slotDate,
  dayType: 'lower_body',
  status: 'planned',
  classFormat: 'stations_4x',
  classStyle: 'standard',
  ...over,
});

describe('R-H17 — calendar slots are reachable and openable without a mouse', () => {
  it('exposes a class dot as a button with a name that says WHICH class', () => {
    render(<BootcampCalendar slots={[slot()]} onSlotClick={vi.fn()} />);

    // The abbreviation alone ("LO") is not a usable name; the date and day type make it one.
    const dot = screen.getByRole('button', { name: SLOT_DATE });
    expect(dot).toHaveAttribute('tabindex', '0');
  });

  it('opens the slot on Enter and on Space', () => {
    const onSlotClick = vi.fn();
    render(<BootcampCalendar slots={[slot()]} onSlotClick={onSlotClick} />);
    const dot = screen.getByRole('button', { name: SLOT_DATE });

    fireEvent.keyDown(dot, { key: 'Enter' });
    expect(onSlotClick).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));

    onSlotClick.mockClear();
    fireEvent.keyDown(dot, { key: ' ' });
    expect(onSlotClick).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('does NOT open on an unrelated key', () => {
    const onSlotClick = vi.fn();
    render(<BootcampCalendar slots={[slot()]} onSlotClick={onSlotClick} />);

    fireEvent.keyDown(screen.getByRole('button', { name: SLOT_DATE }), { key: 'a' });

    expect(onSlotClick).not.toHaveBeenCalled();
  });
});

describe('R-H17 — the create-modal chips publish their pressed state', () => {
  const renderModal = () => {
    render(<CreateSprintModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    return screen.getByRole('button', { name: 'MON' });
  };

  it('marks a selected class day as pressed and an unselected one as not', async () => {
    const monday = renderModal();

    // MON is selected by default in this form; the chip must SAY so, not only look like it.
    expect(monday).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'SUN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('flips the pressed state when the chip is activated', async () => {
    const monday = renderModal();

    fireEvent.click(monday);

    expect(screen.getByRole('button', { name: 'MON' })).toHaveAttribute('aria-pressed', 'false');
  });
});
