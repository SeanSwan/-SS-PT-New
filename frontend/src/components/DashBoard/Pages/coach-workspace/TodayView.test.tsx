/**
 * The Day Sheet and its one-line strip read the Universal Master Schedule and
 * never present a failed load as an empty day; every action reuses an existing,
 * ID-only path (Floor pins by id, the PDF is local, the brief is a registry command).
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TodayView, { floorLinkFor, upNext } from './TodayView';
import { localDateISO } from './floorSession';
import TodayStrip from './TodayStrip';
import type { TodaySlot } from './useTodaySchedule';

vi.mock('../../../UniversalMasterSchedule/useSessionPlannedWorkout', () => ({
  useSessionPlannedWorkout: (id: number | null) => (id ? { status: 'ready', planTitle: 'Strength', dayLabel: 'Lower A', completionState: null, exercises: [{ name: 'Box squat', setScheme: '4 × 6' }] } : { status: 'hidden' }),
}));

const at = (h: number, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
const slot = (id: string, h: number, extra: Partial<TodaySlot> = {}): TodaySlot => ({ id, startsAt: at(h), minutes: 60, status: 'confirmed', clientId: 12, who: `Client ${id}`, what: null, ...extra });

function model(state: unknown, over: Record<string, unknown> = {}) {
  return {
    schedule: { state, refresh: vi.fn() }, isClientMode: false, user: { id: 1 }, reviewTotal: 3,
    counts: { intake: 1, audio: 2, drafts: 0 }, nextActionLabel: null,
    controller: { clientPin: { clients: [{ id: 12, label: 'Avery Stone' }] } },
    catalog: { commands: [{ type: 'brief_my_day' }] },
    startFloor: vi.fn(), showView: vi.fn(), askAboutSession: vi.fn(), requestPdfFor: vi.fn(), requestPdf: vi.fn(),
    openReview: vi.fn(), sendCommand: vi.fn(), writeUnderDraft: vi.fn(),
    ...over,
  };
}

describe('upNext', () => {
  it('the session in progress, else the next, else the last of the day; cancelled never counts', () => {
    const slots = [slot('a', 6), slot('b', 9, { status: 'cancelled' }), slot('c', 11)];
    expect(upNext(slots, at(6, 30).getTime())?.id).toBe('a');
    expect(upNext(slots, at(8).getTime())?.id).toBe('c');
    expect(upNext(slots, at(22).getTime())?.id).toBe('c');
    expect(upNext([], Date.now())).toBeNull();
  });
});

describe('floorLinkFor', () => {
  it('links only a booked session — requested, completed and cancelled slots start an unbooked Floor', () => {
    expect(floorLinkFor(slot('s1', 9))?.scheduledSessionId).toBe('s1');
    expect(floorLinkFor(slot('s2', 9, { status: 'scheduled' }))?.scheduledSessionId).toBe('s2');
    for (const status of ['requested', 'completed', 'cancelled'] as const) expect(floorLinkFor(slot('x', 9, { status }))).toBeNull();
  });
});

describe('TodayView', () => {
  const ready = { phase: 'ready', scopeLabel: 'Your sessions', slots: [slot('a', 23, { minutes: 59 })] };

  it('up next shows the planned workout, and its actions reuse the ID-only paths', () => {
    const m = model(ready);
    render(<TodayView model={m as never} />);
    expect(screen.getByText('Box squat')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start in floor mode/i }));
    // The booking travels with Floor so the save completes it under its own credit rules (Astra F1).
    expect(m.startFloor).toHaveBeenCalledWith(12, { scheduledSessionId: 'a', date: localDateISO(ready.slots[0].startsAt), startsAt: ready.slots[0].startsAt.toISOString() });
    fireEvent.click(screen.getByRole('button', { name: /progress pdf/i }));
    expect(m.requestPdfFor).toHaveBeenCalledWith(12);
    fireEvent.click(screen.getByRole('button', { name: /ask swan coach/i }));
    expect(m.askAboutSession).toHaveBeenCalledWith(ready.slots[0]);
    fireEvent.click(screen.getByRole('button', { name: /brief my day/i }));
    expect(m.sendCommand).toHaveBeenCalledWith('Brief my day', 'brief_my_day');
    fireEvent.click(screen.getByRole('button', { name: /2\s*audio/i }));
    expect(m.openReview).toHaveBeenCalledWith('audio');
  });

  it('the brief is only sent as a command the catalog carries; otherwise it is drafted', () => {
    const m = model(ready, { catalog: { commands: [] } });
    render(<TodayView model={m as never} />);
    fireEvent.click(screen.getByRole('button', { name: /brief my day/i }));
    expect(m.sendCommand).not.toHaveBeenCalled();
    expect(m.writeUnderDraft).toHaveBeenCalledWith('Brief my day');
  });

  it('a failed load says so and offers retry — it is never an empty day', () => {
    const m = model({ phase: 'error', reason: 'failed' });
    render(<TodayView model={m as never} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This is not an empty day');
    expect(screen.queryByText(/No sessions on the books/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(m.schedule.refresh).toHaveBeenCalled();
  });

  it('a client outside the roster gets no Floor or PDF button (never logs under the previous pin)', () => {
    render(<TodayView model={model(ready, { controller: { clientPin: { clients: [] } } }) as never} />);
    expect(screen.queryByRole('button', { name: /progress pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start in floor mode/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask swan coach/i })).toBeInTheDocument(); // asking by time stays available
  });
});

describe('TodayStrip', () => {
  it('renders nothing while loading, on error, or on an empty day', () => {
    const { container, rerender } = render(<TodayStrip state={{ phase: 'loading' }} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TodayStrip state={{ phase: 'error', reason: 'failed' }} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TodayStrip state={{ phase: 'ready', scopeLabel: '', slots: [] }} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the next session and every chip opens Today', () => {
    const onOpen = vi.fn();
    render(<TodayStrip state={{ phase: 'ready', scopeLabel: '', slots: [slot('a', 6), slot('b', 11)] }} onOpen={onOpen} now={at(8).getTime()} />);
    const next = screen.getByRole('button', { name: /Client b, next/ });
    expect(next.closest('li')).toHaveAttribute('data-next', 'true');
    expect(screen.getByRole('button', { name: /Client a — open Today/ }).closest('li')).toHaveAttribute('data-past', 'true');
    fireEvent.click(next);
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('the Day Sheet keeps time on its own (Astra F6)', () => {
  afterEach(() => vi.useRealTimers());
  const day = (h: number, m = 0) => new Date(2026, 8, 24, h, m);
  const timed = (id: string, h: number) => ({ id, startsAt: day(h), minutes: 60, status: 'confirmed' as const, clientId: 12, who: `Client ${id}`, what: null });

  it('the strip moves its next marker when a session ends, with no other render', () => {
    vi.useFakeTimers();
    vi.setSystemTime(day(9, 30));
    render(<TodayStrip state={{ phase: 'ready', scopeLabel: '', slots: [timed('a', 9), timed('b', 11)] }} onOpen={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Client a, next/ })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60 * 60_000); });
    expect(screen.getByRole('button', { name: /Client b, next/ })).toBeInTheDocument();
  });

  it('at midnight a slot picked yesterday falls away (the schedule hook re-reads the day)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(day(23, 58));
    const m = model({ phase: 'ready', scopeLabel: '', slots: [timed('a', 9), timed('b', 11)] });
    render(<TodayView model={m as never} />);
    fireEvent.click(screen.getByRole('button', { name: /Client a/ }));
    expect(screen.getByText('Selected')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3 * 60_000); });
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });
});
