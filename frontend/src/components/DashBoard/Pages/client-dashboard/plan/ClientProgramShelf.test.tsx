/**
 * ClientProgramShelf — the always-visible plan surface on the client's home.
 * Locks Sean's two hard requirements (2026-07-11):
 *   1. "Always there no matter what" — the card renders in EVERY state (active
 *      plan / loading / no plan / error). It must never vanish.
 *   2. Trainer indispensability — the member SEES their plans but is given no
 *      control to switch or edit one. Status pills are read-outs.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../../../services/api.service', () => ({ default: { get: mocks.get } }));

import ClientProgramShelf from './ClientProgramShelf';

const slot = (over: Record<string, unknown> = {}) => ({
  horizonKey: 'h1',
  label: '12 weeks',
  isDefaultHorizon: false,
  isFilled: true,
  isPrimary: false,
  ...over,
});

const vault = {
  defaultHorizonKey: 'h1',
  filledHorizonKeys: [],
  filledCount: 3,
  slots: [
    slot({ horizonKey: 'a', isPrimary: true, planId: 7, planTitle: '12-Week Strength Base', planStatus: 'active', durationWeeks: 12, currentWeek: 2, currentDay: 1 }),
    slot({ horizonKey: 'b', planId: 8, planTitle: 'Golf Power Block', planStatus: 'paused', durationWeeks: 6 }),
    slot({ horizonKey: 'c', planId: 9, planTitle: 'Off-Season Base', planStatus: 'completed', durationWeeks: 8 }),
    slot({ horizonKey: 'd', isFilled: false, label: '4 weeks' }), // empty horizon — must NOT reach the shelf
  ],
};

const workout = {
  title: 'Full Body',
  isLoggable: true,
  ctaLabel: 'Open Workout',
  weekNumber: 2,
  exerciseCount: 5,
  firstExercise: 'Deadlift',
  primaryPlanLabel: '12-Week Strength Base',
};

/** Today's session — absorbed from the retired TodaysAssignmentCard. */
const assignment = (over: Record<string, unknown> = {}) => ({
  kicker: "Today's assignment",
  title: 'Coach Homework Lower Strength',
  meta: '12-Week Strength Base / Week 2 / Day 1',
  rows: [],
  actionPath: '/dashboard/client/log-workout?loadPlan=today&assignmentKey=k1&assignmentType=homework',
  actionLabel: 'Open Workout',
  complete: false,
  empty: false,
  loading: false,
  error: false,
  ...over,
});

beforeEach(() => {
  mocks.get.mockReset();
  mocks.get.mockResolvedValue({ data: { success: true, data: { id: 7, title: '12-Week Strength Base', status: 'active', weeks: [] } } });
});

describe('ClientProgramShelf', () => {
  it('leads with the ACTIVE plan: which program, and how far in', () => {
    // The hero answers "what program am I on". Today's SESSION lives in the absorbed
    // today-strip (see the ABSORBED tests) — one fact per surface, no duplication.
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);

    expect(screen.getByTestId('program-shelf-hero')).toBeInTheDocument();
    expect(screen.getByText('12-Week Strength Base')).toBeInTheDocument();
    expect(screen.getByText(/week 2 of 12/i)).toBeInTheDocument();

    // Progress is real, not decorative: week 2 of 12 ~= 17%.
    const bar = screen.getByRole('progressbar', { name: /week 2 of 12/i });
    expect(bar).toHaveAttribute('aria-valuenow', '17');
  });

  it.each([
    ['past the plan end', 99, 100],
    ['before the plan start', -3, 0],
  ])('clamps %s progress and ARIA values to the 0-100 contract', (_case, currentWeek, expected) => {
    const driftedVault = {
      ...vault,
      slots: vault.slots.map((plan, index) => index === 0 ? { ...plan, currentWeek } : plan),
    };

    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={driftedVault as never} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(expected));
    expect(screen.getByText(`${expected}%`)).toBeInTheDocument();
  });

  it('shelves the OTHER plans (and never an unfilled horizon slot)', () => {
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);

    expect(screen.getByText(/your other plans \(2\)/i)).toBeInTheDocument();
    const shelf = screen.getByTestId('program-shelf-track');
    // Each shelf card must remain a real BUTTON (assistive tech must announce it
    // as actionable) — a role="listitem" here would silently destroy that.
    expect(within(shelf).getAllByRole('button')).toHaveLength(2);
    expect(within(shelf).getByText('Golf Power Block')).toBeInTheDocument();
    expect(within(shelf).getByText('Off-Season Base')).toBeInTheDocument();
    // The active plan is the hero, not a shelf card.
    expect(within(shelf).queryByText('12-Week Strength Base')).not.toBeInTheDocument();
    // Empty horizon slots never surface to the member.
    expect(within(shelf).queryByText('4 weeks')).not.toBeInTheDocument();

    expect(within(shelf).getByText('Paused')).toBeInTheDocument();
    expect(within(shelf).getByText('Completed')).toBeInTheDocument();
  });

  it('opens the full plan when a plan is tapped (hero and shelf both)', async () => {
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);

    fireEvent.click(screen.getByRole('button', { name: /view your full training plan/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/api/workouts/42/plans/7');

    fireEvent.click(screen.getByRole('button', { name: /close plan/i }));

    fireEvent.click(screen.getByRole('button', { name: /view plan: golf power block/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenLastCalledWith('/api/workouts/42/plans/8');
  });

  it('ALWAYS renders — loading, no plan, and error all hold the space', () => {
    // loading
    const { rerender } = render(<ClientProgramShelf userId={42} loading />);
    expect(screen.getByTestId('client-program-shelf')).toBeInTheDocument();
    expect(screen.getByTestId('program-shelf-skeleton')).toBeInTheDocument();

    // no plan yet — an invitation, not an error
    rerender(<ClientProgramShelf userId={42} planVault={{ ...vault, slots: [] } as never} />);
    expect(screen.getByTestId('client-program-shelf')).toBeInTheDocument();
    expect(screen.getByText(/no plan assigned yet/i)).toBeInTheDocument();
    expect(screen.getByText(/your coach is building your program/i)).toBeInTheDocument();

    // error — still present, and honest
    rerender(<ClientProgramShelf userId={42} error planVault={{ ...vault, slots: [] } as never} />);
    expect(screen.getByTestId('client-program-shelf')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load your plans/i)).toBeInTheDocument();
  });

  it('W0.1: the no-plan empty state coaches the next action — Log a workout (self-directed logging exists today)', () => {
    const onNavigate = vi.fn();
    render(
      <ClientProgramShelf
        userId={42}
        planVault={{ ...vault, slots: [] } as never}
        onNavigate={onNavigate}
      />,
    );
    const cta = screen.getByRole('button', { name: /log a workout/i });
    fireEvent.click(cta);
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
  });

  it('DOCTRINE: gives the member no way to switch or edit a plan', () => {
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);

    for (const forbidden of [/make active/i, /switch/i, /set as primary/i, /activate/i, /edit plan/i, /delete/i]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument();
    }
    // Status pills are read-outs, never buttons.
    expect(screen.getByText('Paused').tagName).not.toBe('BUTTON');
    expect(screen.getByText('Completed').tagName).not.toBe('BUTTON');
  });

  it('lets the shared Today rollout hide only the legacy assignment row', () => {
    render(
      <ClientProgramShelf
        userId={42}
        workout={workout as never}
        planVault={vault as never}
        assignment={assignment() as never}
        showTodayAssignment={false}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByTestId('client-program-shelf')).toBeInTheDocument();
    expect(screen.getByTestId('program-shelf-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('current-workout-card')).not.toBeInTheDocument();
  });
  it("ABSORBED: today's session lives on the hero — name, next exercise, and the RIGHT route", () => {
    const onNavigate = vi.fn();
    render(
      <ClientProgramShelf
        userId={42}
        workout={workout as never}
        planVault={vault as never}
        assignment={assignment() as never}
        onNavigate={onNavigate}
      />,
    );

    // The retired TodaysAssignmentCard's truth now lives here (same testid, so the
    // existing home truth-guards keep protecting this surface).
    const today = screen.getByTestId('current-workout-card');
    expect(today).toHaveTextContent(/today's assignment/i);
    expect(today).toHaveTextContent(/coach homework lower strength/i);
    expect(today).toHaveTextContent(/deadlift/i);
    expect(today).toHaveTextContent('5 exercises');

    // The CTA uses the assignment's OWN resolved path (carries assignmentKey +
    // assignmentType) — a hardcoded ?loadPlan=today would load the wrong session.
    fireEvent.click(screen.getByRole('button', { name: 'Open Workout' }));
    expect(onNavigate).toHaveBeenCalledWith(
      '/dashboard/client/log-workout?loadPlan=today&assignmentKey=k1&assignmentType=homework',
    );
  });

  it("ABSORBED: shows the done state once today's session is logged", () => {
    const onNavigate = vi.fn();
    render(
      <ClientProgramShelf
        userId={42}
        workout={workout as never}
        planVault={vault as never}
        assignment={assignment({ complete: true, actionLabel: 'Review Workout History', actionPath: '/dashboard/client/workouts' }) as never}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByTestId('current-workout-card')).toHaveTextContent(/logged today/i);
    // A completed session routes to history, not back into the logger.
    fireEvent.click(screen.getByRole('button', { name: 'Review Workout History' }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
  });

  it('stays honest when there is no live assignment (keeps the pending truth, drops the proof cue)', () => {
    // The retired card rendered even with nothing assigned, and that honesty is
    // worth keeping: the member should never be left guessing. What we DON'T show
    // is a "save after training" cue for work that does not exist.
    render(
      <ClientProgramShelf
        userId={42}
        workout={workout as never}
        planVault={vault as never}
        assignment={assignment({ empty: true, title: 'Plan pending', actionLabel: 'View Workouts' }) as never}
        onNavigate={vi.fn()}
      />,
    );
    const today = screen.getByTestId('current-workout-card');
    expect(today).toHaveTextContent(/plan pending/i);
    expect(today).not.toHaveTextContent(/save after training/i);
    expect(today).not.toHaveTextContent(/logged today/i);
  });

});
