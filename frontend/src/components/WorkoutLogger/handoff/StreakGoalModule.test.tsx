import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StreakGoalModule from './StreakGoalModule';

describe('StreakGoalModule', () => {
  it('renders count against the default target of 3 with forward-pointing copy', () => {
    render(<StreakGoalModule sessionsThisWeek={2} streakWeeks={1} />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('1 more this week to hit your goal.')).toBeInTheDocument();
  });

  it('celebrates a met goal and names the multi-week run', () => {
    render(<StreakGoalModule sessionsThisWeek={3} streakWeeks={4} />);
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('Weekly goal met — 4-week run alive.')).toBeInTheDocument();
  });

  it('met goal with no prior run uses the streak-starts-here line (never "1-week run")', () => {
    render(<StreakGoalModule sessionsThisWeek={3} streakWeeks={1} />);
    expect(screen.getByText('Weekly goal met — the streak starts here.')).toBeInTheDocument();
  });

  it('respects an explicit weeklyTarget and clamps overshoot to the bar length', () => {
    render(<StreakGoalModule sessionsThisWeek={9} streakWeeks={2} weeklyTarget={5} />);
    expect(screen.getByText('9/5')).toBeInTheDocument();
    expect(screen.getByText('Weekly goal met — 2-week run alive.')).toBeInTheDocument();
  });

  it('invalid weeklyTarget (0 / negative / NaN) falls back to the default, never a broken bar', () => {
    render(<StreakGoalModule sessionsThisWeek={1} streakWeeks={0} weeklyTarget={0} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('DATA TRUTH: renders nothing when sessionsThisWeek is not a real count', () => {
    const { container } = render(
      <StreakGoalModule sessionsThisWeek={Number.NaN} streakWeeks={2} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('announces progress as one labelled group', () => {
    render(<StreakGoalModule sessionsThisWeek={2} streakWeeks={1} />);
    expect(
      screen.getByRole('group', { name: 'Weekly streak: 2 of 3 sessions. 1 more this week to hit your goal.' }),
    ).toBeInTheDocument();
  });
});
