/**
 * ClientProgramShelf — the always-visible plan surface on the client's home.
 * Locks Sean's two hard requirements (2026-07-11):
 *   1. "Always there no matter what" — the card renders in EVERY state (active
 *      plan / loading / no plan / error). It must never vanish.
 *   2. Trainer indispensability — the member SEES their plans but is given no
 *      control to switch or edit one. Status pills are read-outs.
 */
import React from 'react';
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

beforeEach(() => {
  mocks.get.mockReset();
  mocks.get.mockResolvedValue({ data: { success: true, data: { id: 7, title: '12-Week Strength Base', status: 'active', weeks: [] } } });
});

describe('ClientProgramShelf', () => {
  it('leads with the ACTIVE plan: where they are, what is next, and how far in', () => {
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);

    expect(screen.getByTestId('program-shelf-hero')).toBeInTheDocument();
    expect(screen.getByText('12-Week Strength Base')).toBeInTheDocument();
    expect(screen.getByText(/week 2 of 12/i)).toBeInTheDocument();
    expect(screen.getByText('Deadlift')).toBeInTheDocument();       // next up
    expect(screen.getByText('5 exercises')).toBeInTheDocument();

    // Progress is real, not decorative: week 2 of 12 ~= 17%.
    const bar = screen.getByRole('progressbar', { name: /week 2 of 12/i });
    expect(bar).toHaveAttribute('aria-valuenow', '17');
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

  it('DOCTRINE: gives the member no way to switch or edit a plan', () => {
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);

    for (const forbidden of [/make active/i, /switch/i, /set as primary/i, /activate/i, /edit plan/i, /delete/i]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument();
    }
    // Status pills are read-outs, never buttons.
    expect(screen.getByText('Paused').tagName).not.toBe('BUTTON');
    expect(screen.getByText('Completed').tagName).not.toBe('BUTTON');
  });

  it('hides Log today when the member has no logger action wired', () => {
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} />);
    expect(screen.queryByRole('button', { name: /log today/i })).not.toBeInTheDocument();

    const onLogToday = vi.fn();
    render(<ClientProgramShelf userId={42} workout={workout as never} planVault={vault as never} onLogToday={onLogToday} />);
    fireEvent.click(screen.getAllByRole('button', { name: /log today's workout/i })[0]);
    expect(onLogToday).toHaveBeenCalledTimes(1);
  });
});
