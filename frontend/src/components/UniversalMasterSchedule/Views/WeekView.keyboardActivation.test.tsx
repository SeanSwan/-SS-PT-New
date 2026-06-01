import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeekView from './WeekView';

describe('WeekView keyboard activation', () => {
  it('activates day headers, empty slots, and session cards from the keyboard', () => {
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

    fireEvent.keyDown(screen.getByRole('button', { name: 'View Tue May 26 2026' }), {
      key: 'Enter',
    });
    expect(onDrillDown).toHaveBeenCalledWith(expect.any(Date));

    fireEvent.keyDown(screen.getByRole('button', { name: 'Tue 9:00 AM' }), {
      key: ' ',
    });
    expect(onSelectSlot).toHaveBeenCalledWith({
      date: expect.any(Date),
      hour: 9,
    });

    const sessionCard = screen.getByText('Keyboard Client').closest('[role="button"]');
    expect(sessionCard).toBeTruthy();
    fireEvent.keyDown(sessionCard as Element, { key: 'Enter' });
    expect(onSelectSession).toHaveBeenCalledWith(session);
  });
});
