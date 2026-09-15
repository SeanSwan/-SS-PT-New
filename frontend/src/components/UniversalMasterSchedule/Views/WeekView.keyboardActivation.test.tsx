import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeekView from './WeekView';

/**
 * The role=button census converted every WeekView activation target to NATIVE
 * buttons: Enter/Space activation is browser-provided (locked end-to-end in
 * e2e/sprint-planner-a11y.spec.ts + the master-schedule census pass), so jsdom
 * proves the click contract the keyboard maps to, plus the native tag itself.
 */
describe('WeekView keyboard activation', () => {
  it('activates day headers, empty slots, and session cards through native button clicks', () => {
    const selectedDate = new Date(2026, 4, 26, 9, 0, 0);
    const onDrillDown = vi.fn();
    const onSelectSlot = vi.fn();
    const onSelectSession = vi.fn();
    const session = {
      id: 'keyboard-session',
      sessionDate: selectedDate,
      duration: 60,
      status: 'scheduled',
      clientName: 'Keyboard Client',
    };

    render(
      <WeekView
        date={selectedDate}
        sessions={[session]}
        onDrillDown={onDrillDown}
        onSelectSlot={onSelectSlot}
        onSelectSession={onSelectSession}
      />
    );

    const dayHeader = screen.getByRole('button', { name: 'View Tue May 26 2026' });
    expect(dayHeader.tagName).toBe('BUTTON');
    fireEvent.click(dayHeader);
    expect(onDrillDown).toHaveBeenCalledWith(expect.any(Date));

    const hourSlot = screen.getByRole('button', { name: 'Tue 9:00 AM' });
    expect(hourSlot.tagName).toBe('BUTTON');
    fireEvent.click(hourSlot);
    expect(onSelectSlot).toHaveBeenCalledWith({
      date: expect.any(Date),
      hour: 9,
    });

    const sessionCard = screen.getByText('Keyboard Client').closest('button');
    expect(sessionCard).toBeTruthy();
    fireEvent.click(sessionCard as Element);
    expect(onSelectSession).toHaveBeenCalledWith(session);
  });
});
