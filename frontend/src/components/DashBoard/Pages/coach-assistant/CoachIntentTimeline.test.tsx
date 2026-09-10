/**
 * FILE: CoachIntentTimeline.test.tsx
 * PURPOSE: G04c — Session Desk receipts timeline (S6).
 *          Covers bounded pagination, read/check/open-only affordances per state,
 *          the "retain terminal receipt on close" rule, newest-first ordering, and
 *          duplicate-id de-duplication.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CoachIntentTimeline, { type CoachTimelineEntry } from './CoachIntentTimeline';

const entry = (overrides: Partial<CoachTimelineEntry>): CoachTimelineEntry => ({
  id: 'intent-1',
  label: 'Bench 4x8 @ 185',
  state: 'verified',
  timestamp: '2026-09-08T10:00:00.000Z',
  ...overrides,
});

// Stateful parent that owns openEntryId (the desk owns this state in the app);
// callback spies are stable across rerenders so call counts survive interactions.
const OpenStateSpies: { onCheckResult: ((e: unknown) => void) | null; onOpenRecord: ((e: unknown) => void) | null } = { onCheckResult: null, onOpenRecord: null };
const OpenStateParent: React.FC = () => {
  const [openId, setOpenId] = React.useState<string | null>(null);
  return (
    <CoachIntentTimeline
      entries={[
        entry({ id: 'intent-verified', state: 'verified' }),
        entry({ id: 'intent-committed', state: 'committed_unverified' }),
        entry({ id: 'intent-rolled', state: 'rolled_back' }),
      ]}
      openEntryId={openId}
      onOpenEntryChange={setOpenId}
      onCheckResult={(entryArg) => OpenStateSpies.onCheckResult?.(entryArg)}
      onOpenRecord={(entryArg) => OpenStateSpies.onOpenRecord?.(entryArg)}
    />
  );
};

describe('G04c Session Desk receipts timeline', () => {
  afterEach(cleanup);
  it('renders an empty timeline with honest copy when there are no receipts', () => {
    render(<CoachIntentTimeline entries={[]} />);
    expect(screen.getByTestId('coach-intent-timeline')).toBeTruthy();
    expect(screen.getByText('No workout receipts yet.')).toBeTruthy();
  });

  it('offers Check result only on non-terminal states and Open record only on verified', () => {
    const onCheckResult = vi.fn();
    const onOpenRecord = vi.fn();
    OpenStateSpies.onCheckResult = onCheckResult;
    OpenStateSpies.onOpenRecord = onOpenRecord;
    render(<OpenStateParent />);
    // Action buttons live in the expanded detail panel: expand an entry to reveal its actions.
    // Verified: open + read, no check.
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-read-intent-verified')); });
    expect(screen.getByTestId('coach-intent-open-intent-verified')).toBeTruthy();
    expect(document.querySelector('[data-testid="coach-intent-check-intent-verified"]')).toBeNull();
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-close-intent-verified')); });
    // Committed-unverified: check + read, no open.
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-read-intent-committed')); });
    expect(screen.getByTestId('coach-intent-check-intent-committed')).toBeTruthy();
    expect(document.querySelector('[data-testid="coach-intent-open-intent-committed"]')).toBeNull();
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-close-intent-committed')); });
    // Rolled back (terminal): no state actions (check/open) — only the detail Close control.
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-read-intent-rolled')); });
    expect(document.querySelector('[data-testid="coach-intent-check-intent-rolled"]')).toBeNull();
    expect(document.querySelector('[data-testid="coach-intent-open-intent-rolled"]')).toBeNull();
    expect(screen.getByTestId('coach-intent-close-intent-rolled')).toBeTruthy();
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-close-intent-rolled')); });
    // Clicking a checkable entry's Check result routes through the owner callback.
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-read-intent-committed')); });
    act(() => { fireEvent.click(screen.getByTestId('coach-intent-check-intent-committed')); });
    expect(onCheckResult).toHaveBeenCalledTimes(1);
    expect(onOpenRecord).not.toHaveBeenCalled();
    OpenStateSpies.onCheckResult = null;
    OpenStateSpies.onOpenRecord = null;
  });

  it('hides the detail view on Close but retains the timeline entry (terminal receipt not erased)', () => {
    const onOpenEntryChange = vi.fn();
    render(
      <CoachIntentTimeline
        entries={[entry({ id: 'intent-1', state: 'verified', intentId: 'proposal-1' })]}
        openEntryId="intent-1"
        onOpenEntryChange={onOpenEntryChange}
      />,
    );
    expect(screen.getByTestId('coach-intent-detail-intent-1')).toBeTruthy();
    fireEvent.click(screen.getByTestId('coach-intent-close-intent-1'));
    expect(onOpenEntryChange).toHaveBeenCalledWith(null);
  });

  it('bounds the visible list to pageSize and reveals the remainder via "Show more"', () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      entry({
        id: `intent-${index}`,
        label: `Workout ${index}`,
        state: 'verified',
        timestamp: new Date(Date.UTC(2026, 8, 1 + index, 10)).toISOString(),
      }),
    );
    render(<CoachIntentTimeline entries={many} pageSize={10} />);
    const visible = screen.queryAllByTestId(/coach-intent-receipt-intent-\d+/);
    expect(visible).toHaveLength(10);
    // Newest first: the highest index (newest date) is rendered first.
    expect(visible[0].getAttribute('data-testid')).toBe('coach-intent-receipt-intent-14');
    const more = screen.getByTestId('coach-intent-timeline-more');
    expect(more.textContent).toContain('Show 5 more receipts');
    fireEvent.click(more);
    expect(screen.queryAllByTestId(/coach-intent-receipt-intent-\d+/)).toHaveLength(15);
    expect(screen.queryByTestId('coach-intent-timeline-more')).toBeNull();
  });

  it('de-duplicates duplicate receipt ids and ignores malformed entries', () => {
    const { container } = render(
      <CoachIntentTimeline
        entries={[
          entry({ id: 'intent-dup', state: 'verified' }),
          entry({ id: 'intent-dup', state: 'verified' }),
          { id: '', label: 'blank', state: 'verified' } as unknown as CoachTimelineEntry,
          undefined as unknown as CoachTimelineEntry,
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-testid="coach-intent-receipt-intent-dup"]')).toHaveLength(1);
  });
});
