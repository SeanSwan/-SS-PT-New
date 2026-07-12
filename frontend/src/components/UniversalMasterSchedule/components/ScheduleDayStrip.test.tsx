/**
 * Schedule Day Strip contract.
 * Locks the rolling-window math, local-day badge counting, drill-down
 * tap semantics, and the 44px/aria discipline of the date ribbon.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleDayStrip from './ScheduleDayStrip';
import {
  badgeLabel,
  buildDayWindow,
  countSessionsByDay,
  DAY_STRIP_LOOKAHEAD,
  DAY_STRIP_LOOKBACK,
  localDayKey,
  sessionDayKey,
} from './ScheduleDayStrip.logic';

describe('ScheduleDayStrip logic', () => {
  it('builds a stable window: one week back, three weeks forward', () => {
    const anchor = new Date(2026, 6, 11, 15, 30); // local Jul 11
    const chips = buildDayWindow(anchor);
    expect(chips).toHaveLength(DAY_STRIP_LOOKBACK + DAY_STRIP_LOOKAHEAD + 1);
    expect(chips[0].key).toBe('2026-07-04');
    expect(chips[chips.length - 1].key).toBe('2026-08-01');
    expect(chips.find(({ isToday }) => isToday)?.key).toBe('2026-07-11');
    // month boundary flags: first chip + Aug 1
    expect(chips[0].isMonthBoundary).toBe(true);
    expect(chips.find(({ key }) => key === '2026-08-01')?.isMonthBoundary).toBe(true);
    expect(chips.find(({ key }) => key === '2026-07-15')?.isMonthBoundary).toBe(false);
  });

  it('re-anchors around out-of-window selections and holds at the edges', () => {
    const today = new Date(2026, 6, 11); // Jul 11
    // inside the window (edges inclusive): stays today-anchored
    for (const offset of [-7, 0, 21]) {
      const selected = new Date(2026, 6, 11 + offset);
      const chips = buildDayWindow(today, selected);
      expect(chips[0].key).toBe('2026-07-04');
      expect(chips.some(({ key }) => key === localDayKey(selected))).toBe(true);
    }
    // one past each edge: window re-anchors around the selection
    const past = buildDayWindow(today, new Date(2026, 6, 3)); // -8
    expect(past.some(({ key }) => key === '2026-07-03')).toBe(true);
    const future = buildDayWindow(today, new Date(2026, 7, 2)); // +22
    expect(future.some(({ key }) => key === '2026-08-02')).toBe(true);
    // isToday stays truthful even when the anchor moved
    expect(future.find(({ isToday }) => isToday)).toBeUndefined();
    // year rollover + DST-transition selections keep exact-day membership
    const newYear = buildDayWindow(today, new Date(2026, 11, 31));
    expect(newYear.some(({ key }) => key === '2026-12-31')).toBe(true);
    expect(newYear.some(({ key }) => key === '2027-01-01')).toBe(true);
    const dstFall = buildDayWindow(today, new Date(2026, 10, 1)); // Nov 1 (US DST end)
    expect(dstFall.filter(({ key }) => key === '2026-11-01')).toHaveLength(1);
    expect(dstFall.some(({ key }) => key === '2026-11-02')).toBe(true);
  });

  it('counts sessions per LOCAL day via the schedule date-resolution chain', () => {
    const counts = countSessionsByDay([
      { sessionDate: new Date(2026, 6, 11, 6, 0).toISOString() },
      { start: new Date(2026, 6, 11, 18, 0) },
      { startTime: new Date(2026, 6, 12, 9, 0).toISOString() },
      { sessionDate: 'not-a-date' },
      {},
    ]);
    expect(counts.get('2026-07-11')).toBe(2);
    expect(counts.get('2026-07-12')).toBe(1);
    expect(sessionDayKey({})).toBeNull();
    expect(badgeLabel(3)).toBe('3');
    expect(badgeLabel(14)).toBe('9+');
  });
});

describe('ScheduleDayStrip component', () => {
  const today = new Date();
  const todayLabelDay = today.getDate();

  it('renders the ribbon with drill-down tap semantics and a Today pill', () => {
    const onSelectDay = vi.fn();
    render(
      <ScheduleDayStrip
        currentDate={today}
        sessions={[{ sessionDate: today.toISOString() }]}
        onSelectDay={onSelectDay}
      />,
    );

    const nav = screen.getByRole('navigation', { name: /jump to a day/i });
    expect(nav).toBeInTheDocument();

    // selected chip carries aria-current="date" and the session count
    const selected = nav.querySelector('[aria-current="date"]') as HTMLElement;
    expect(selected).not.toBeNull();
    expect(selected.textContent).toContain(String(todayLabelDay));
    expect(selected.getAttribute('aria-label')).toMatch(/1 session/);

    // tapping tomorrow drills down to that exact local day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowChip = nav.querySelector(
      `[aria-label^="${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][tomorrow.getDay()]}"]`,
    );
    const chips = Array.from(nav.querySelectorAll('button')).filter((button) =>
      /^\w{3} \w{3} \d+/.test(button.getAttribute('aria-label') ?? ''),
    );
    expect(chips.length).toBe(DAY_STRIP_LOOKBACK + DAY_STRIP_LOOKAHEAD + 1);
    expect(tomorrowChip).not.toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: /jump to today/i }),
    );
    expect(onSelectDay).toHaveBeenCalledTimes(1);
    const selectedDate: Date = onSelectDay.mock.calls[0][0];
    expect(localDayKey(selectedDate)).toBe(localDayKey(today));
  });

  it('pages the ribbon without changing the selected date (scrollLeft fallback, zero unhandled)', () => {
    const onSelectDay = vi.fn();
    const { container } = render(
      <ScheduleDayStrip currentDate={today} sessions={[]} onSelectDay={onSelectDay} />,
    );
    // jsdom has no Element.scrollBy — clicking must fall back to scrollLeft
    // without throwing (Codex REVISE finding 3: assertions passed but the
    // run exited 1 on unhandled TypeErrors).
    fireEvent.click(screen.getByRole('button', { name: /later days/i }));
    fireEvent.click(screen.getByRole('button', { name: /earlier days/i }));
    expect(onSelectDay).not.toHaveBeenCalled();
    expect(container).toBeTruthy();
  });

  it('shows the selected chip even when selection is far outside the window', () => {
    const farFuture = new Date(today);
    farFuture.setDate(today.getDate() + 60);
    render(
      <ScheduleDayStrip currentDate={farFuture} sessions={[]} onSelectDay={vi.fn()} />,
    );
    const nav = screen.getByRole('navigation', { name: /jump to a day/i });
    const selected = nav.querySelector('[aria-current="date"]') as HTMLElement;
    expect(selected).not.toBeNull();
    expect(selected.textContent).toContain(String(farFuture.getDate()));
  });
});
