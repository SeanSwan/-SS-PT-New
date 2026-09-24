import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPdfRequest, pdfTarget } from './coachPdfRequest';
import TodayView from './TodayView';
vi.mock('../../../UniversalMasterSchedule/useSessionPlannedWorkout', () => ({
  useSessionPlannedWorkout: () => ({ status: 'none' }),
}));
afterEach(() => vi.useRealTimers());
const clients = [{ id: 84, label: 'Jesse Moreno' }, { id: 85, label: 'Maria Rios' }, { id: 86, label: 'Maria Chen' }];
describe('Independent review: PDF subject safety', () => {
  it('refuses lowercase ambiguous names rather than using the pinned client', () => {
    const request = 'Make a PDF for maria';
    expect(isPdfRequest(request)).toBe(true);
    expect(pdfTarget(request, clients, 84)).toBe('ambiguous');
  });
  it('refuses an explicit unknown full name rather than using the pinned client', () => {
    expect(pdfTarget('Make a PDF for Olivia Patel', clients, 84)).toBeNull();
  });
  it('refuses two separate named clients regardless of name length', () => {
    expect(pdfTarget('Make a PDF comparing Maria Rios with Jesse Moreno', clients, 84)).toBe('ambiguous');
  });
});
describe('Independent review: Today time progression', () => {
  it('moves from the ended session to the upcoming session without unrelated user input', () => {
    vi.useFakeTimers();
    const start = new Date(2026, 8, 24, 9, 30);
    vi.setSystemTime(start);
    const slot = (id: string, hour: number, clientId: number, who: string) => ({
      id, startsAt: new Date(2026, 8, 24, hour), minutes: 60, clientId, who, what: null, status: 'confirmed',
    });
    const model = {
      schedule: { state: { phase: 'ready', slots: [slot('a', 9, 84, 'Jesse'), slot('b', 11, 85, 'Maria')] }, refresh: vi.fn() },
      isClientMode: false, reviewTotal: 0, counts: { intake: 0, audio: 0, drafts: 0 }, nextActionLabel: null,
      controller: { clientPin: { clients } }, catalog: { commands: [] },
    };
    render(<TodayView model={model as never} />);
    expect(screen.getByRole('heading', { level: 2, name: /Jesse/ })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60 * 60 * 1000));
    expect(screen.getByRole('heading', { level: 2, name: /Maria/ })).toBeInTheDocument();
  });
});
