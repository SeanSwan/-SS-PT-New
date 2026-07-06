/**
 * SaveSuccessPanel tests (Phase 2.1a)
 *
 * Locks: truthful per-section rendering (billing/plan/streak omitted when
 * absent), role-correct billing copy (you vs client), buy-more at <=2 in
 * self-mode ONLY, XP optimism only in self-mode, and Done firing the
 * deferred completion handler exactly once.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SaveSuccessPanel from './SaveSuccessPanel';
import type { DailyWorkoutForm } from '../../services/nasmApiService';

const mockUsePulse = vi.fn();
vi.mock('../../hooks/analytics/useProgressPulse', () => ({
  default: () => mockUsePulse(),
  useProgressPulse: () => mockUsePulse(),
}));

const baseForm = (over: Record<string, unknown> = {}) => ({
  id: 'form-1',
  clientId: 42,
  date: '2026-07-06',
  billing: {
    status: 'deducted',
    shouldDeduct: true,
    sessionDeducted: true,
    creditsDeducted: 1,
    creditsRequired: 1,
    remainingSessions: 5,
  },
  challengeProgress: null,
  ...over,
}) as unknown as DailyWorkoutForm;

const renderPanel = (props: Partial<React.ComponentProps<typeof SaveSuccessPanel>> = {}) => {
  const onDone = vi.fn();
  const onBuyMore = vi.fn();
  const onBookNext = vi.fn();
  render(
    <SaveSuccessPanel
      form={baseForm()}
      completedSets={12}
      formattedVolume="8,450 lbs"
      isSelfMode
      challengeProgress={null}
      onDone={onDone}
      onBuyMore={onBuyMore}
      onBookNext={onBookNext}
      {...props}
    />
  );
  return { onDone, onBuyMore, onBookNext };
};

describe('SaveSuccessPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePulse.mockReturnValue({ status: 'error', pulse: null, refetch: vi.fn() });
  });

  it('renders the headline beat and fires Done exactly once (deferred onComplete)', () => {
    const { onDone } = renderPanel();
    expect(screen.getByText(/workout saved/i)).toBeInTheDocument();
    expect(screen.getByText(/12 sets · 8,450 lbs moved/i)).toBeInTheDocument();
    const done = screen.getByRole('button', { name: /done/i });
    fireEvent.click(done);
    fireEvent.click(done);
    expect(onDone).toHaveBeenCalledTimes(2); // parent unmounts on first in real flow
  });

  it('shows self-mode billing copy and no buy-more above the low-balance threshold', () => {
    renderPanel();
    expect(screen.getByText(/used 1 session credit — you have 5 remaining/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /top up sessions/i })).toBeNull();
  });

  it('shows buy-more at <=2 remaining in self-mode and routes it', () => {
    const { onBuyMore } = renderPanel({
      form: baseForm({ billing: { status: 'deducted', shouldDeduct: true, sessionDeducted: true, creditsDeducted: 1, creditsRequired: 1, remainingSessions: 2 } }),
    });
    fireEvent.click(screen.getByRole('button', { name: /top up sessions/i }));
    expect(onBuyMore).toHaveBeenCalledTimes(1);
  });

  it('uses client-facing copy and hides buy-more + XP line in trainer mode', () => {
    renderPanel({
      isSelfMode: false,
      onBookNext: null,
      form: baseForm({ billing: { status: 'deducted', shouldDeduct: true, sessionDeducted: true, creditsDeducted: 1, creditsRequired: 1, remainingSessions: 1 } }),
    });
    expect(screen.getByText(/client has 1 remaining/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /top up sessions/i })).toBeNull();
    expect(screen.queryByText(/xp from this session/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /book next session/i })).toBeNull();
  });

  it('omits billing/plan lines when absent and never fabricates', () => {
    renderPanel({ form: baseForm({ billing: undefined }) });
    expect(screen.queryByText(/session credit/i)).toBeNull();
    expect(screen.queryByText(/plan advanced/i)).toBeNull();
  });

  it('renders the plan-advance line from planProgress', () => {
    renderPanel({
      form: baseForm({ planProgress: { advanced: true, planCompleted: false, next: { weekNumber: 4, dayNumber: 2 } } }),
    });
    expect(screen.getByText(/next up: week 4, day 2/i)).toBeInTheDocument();
  });

  it('shows the streak beat only in self-mode with a ready pulse', () => {
    mockUsePulse.mockReturnValue({
      status: 'ready',
      pulse: { streak: { weeklyCurrent: 3, weeklyLongest: 5, weekTarget: 3, daysThisWeek: 2, currentWeekPending: true } },
      refetch: vi.fn(),
    });
    renderPanel();
    expect(screen.getByText(/3-week streak alive · 2 training days this week/i)).toBeInTheDocument();
  });
});
