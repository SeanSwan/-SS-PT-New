/**
 * ClientPlanDetailModal — the client's read-only view of their WHOLE program.
 * Locks: every week renders (not just the current one), the "you are here"
 * markers land on the right week/day, honest loading/empty/error states, the
 * house dialog contract (Escape / click-outside / close), and — critically —
 * that the modal exposes NO plan-switching or editing control (trainer-
 * indispensability doctrine, Sean 2026-07-11).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../../../../../services/api.service', () => ({
  default: { get: mocks.get },
}));

import ClientPlanDetailModal from './ClientPlanDetailModal';

const planPayload = {
  id: 7,
  title: '12-Week Strength Base',
  status: 'active',
  durationWeeks: 12,
  difficulty: 'intermediate',
  currentWeek: 2,
  currentDay: 1,
  weeks: [
    {
      weekNumber: 1,
      focus: 'Stabilization',
      days: [
        { dayNumber: 1, dayName: 'Lower', exercises: [{ exerciseName: 'Goblet Squat', sets: 3, targetReps: '12', restSeconds: 60 }] },
      ],
    },
    {
      weekNumber: 2,
      focus: 'Strength Endurance',
      days: [
        { dayNumber: 1, dayName: 'Full Body', exercises: [{ exerciseName: 'Deadlift', sets: 4, targetReps: '5' }] },
        { dayNumber: 2, dayName: 'Upper', exercises: [] },
      ],
    },
  ],
};

const resolvePlan = (data: unknown = planPayload) =>
  mocks.get.mockResolvedValue({ data: { success: true, data } });

beforeEach(() => {
  mocks.get.mockReset();
});

describe('ClientPlanDetailModal', () => {
  it('renders nothing when closed and does not fetch', () => {
    resolvePlan();
    const { container } = render(
      <ClientPlanDetailModal open={false} onClose={() => {}} userId={42} planId={7} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('fetches the client-scoped full-plan read and shows EVERY week', async () => {
    resolvePlan();
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} />);

    expect(await screen.findByText('12-Week Strength Base')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/api/workouts/42/plans/7');

    // Both weeks present — the whole program, not just the current week.
    expect(screen.getByRole('button', { name: /week 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /week 2/i })).toBeInTheDocument();
  });

  it('marks the week AND day the member is actually on, and opens that week by default', async () => {
    resolvePlan();
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} />);
    await screen.findByText('12-Week Strength Base');

    // Week 2 is current -> flagged and expanded; its exercises are visible.
    expect(screen.getByRole('button', { name: /week 2, your current week/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Deadlift')).toBeInTheDocument();
    expect(screen.getByText('4 x 5')).toBeInTheDocument();

    // Week 1 is collapsed, so a 12-week plan isn't a wall of text.
    expect(screen.getByRole('button', { name: /^week 1$/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Goblet Squat')).not.toBeInTheDocument();

    // "Today" lands on the current day only.
    expect(screen.getAllByText('You are here')).toHaveLength(1);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('expands a non-current week on tap', async () => {
    resolvePlan();
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} />);
    await screen.findByText('12-Week Strength Base');

    fireEvent.click(screen.getByRole('button', { name: /^week 1$/i }));

    expect(await screen.findByText('Goblet Squat')).toBeInTheDocument();
    expect(screen.getByText('3 x 12 · 60s rest')).toBeInTheDocument();
  });

  it('DOCTRINE: exposes no plan-switching or editing control (trainer-only)', async () => {
    resolvePlan();
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} onLogToday={() => {}} />);
    await screen.findByText('12-Week Strength Base');

    // The status is a READ-OUT, not a button.
    expect(screen.getByText('Active plan').tagName).not.toBe('BUTTON');

    // No affordance that would let a client take the trainer's job.
    for (const forbidden of [/make active/i, /switch plan/i, /set as primary/i, /activate/i, /edit plan/i, /delete plan/i]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument();
    }
    // And the relationship is reinforced in copy.
    expect(screen.getByText(/your coach sets your plan/i)).toBeInTheDocument();
  });

  it('offers Log today only for the ACTIVE plan', async () => {
    resolvePlan({ ...planPayload, status: 'paused' });
    const { rerender } = render(
      <ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} onLogToday={() => {}} />,
    );
    await screen.findByText('12-Week Strength Base');
    // A paused plan is not the thing you train today.
    expect(screen.queryByRole('button', { name: /log today/i })).not.toBeInTheDocument();

    resolvePlan();
    rerender(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={8} onLogToday={() => {}} />);
    expect(await screen.findByRole('button', { name: /log today/i })).toBeInTheDocument();
  });

  it('is honest when the plan has no weeks laid out yet', async () => {
    resolvePlan({ ...planPayload, weeks: [] });
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} />);

    expect(await screen.findByText(/doesn't have its weeks laid out yet/i)).toBeInTheDocument();
    expect(screen.getByText(/your coach is still building it out/i)).toBeInTheDocument();
  });

  it('surfaces an error instead of a convincing empty program', async () => {
    mocks.get.mockRejectedValue(new Error('boom'));
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load this plan/i);
  });

  it('closes on Escape, click-outside, and the close button', async () => {
    resolvePlan();
    const onClose = vi.fn();
    render(<ClientPlanDetailModal open onClose={onClose} userId={42} planId={7} />);
    await screen.findByText('12-Week Strength Base');

    fireEvent.click(screen.getByRole('button', { name: /close plan/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('renders a rest week and an empty day without pretending they have work', async () => {
    resolvePlan();
    render(<ClientPlanDetailModal open onClose={() => {}} userId={42} planId={7} />);
    await screen.findByText('12-Week Strength Base');

    // Week 2 Day 2 has no exercises — say so rather than showing a blank card.
    await waitFor(() => expect(screen.getByText('Upper')).toBeInTheDocument());
    const upperDay = screen.getByText('Upper').closest('div') as HTMLElement;
    expect(within(upperDay.parentElement as HTMLElement).getByText(/no exercises listed/i)).toBeInTheDocument();
  });
});
