/**
 * LongHorizonScheduleView — L2.C regression tests
 * ================================================
 *
 * Locks in the Month → Week → Day drill-down behavior:
 *   1. Mounts with Month 1 / Week 1 / Day 1 selected by default.
 *   2. Switching Month resets the selected Week/Day.
 *   3. Switching Week resets the selected Day.
 *   4. Day chips render with exercise count + show exercises on click.
 *   5. rotationFallback exercises render the fallback badge.
 *   6. Falls back from empty week.days[] to populated week.sessions[]
 *      (matches L1 REV 2 shape-service parity rule).
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LongHorizonScheduleView from './LongHorizonScheduleView';
import type { GeneratedPlanWeek } from './WorkoutPlannerTypes';

const buildExercise = (id: string, name: string, opts: { rotationFallback?: boolean } = {}) => ({
  exerciseId: id,
  exerciseName: name,
  sets: 3,
  targetReps: '10-12',
  restTime: 60,
  ...opts,
});

const buildWeek = (
  weekNumber: number,
  focus: string,
  dayCount = 4,
  exercisesPerDay = 6,
  shapeKey: 'days' | 'sessions' = 'days',
): GeneratedPlanWeek => {
  const entries = Array.from({ length: dayCount }, (_, dIdx) => ({
    dayNumber: dIdx + 1,
    name: `W${weekNumber}D${dIdx + 1}: ${['push', 'pull', 'legs', 'core'][dIdx % 4]}`,
    focus: ['push', 'pull', 'legs', 'core'][dIdx % 4],
    exercises: Array.from({ length: exercisesPerDay }, (_, eIdx) =>
      buildExercise(`w${weekNumber}d${dIdx + 1}e${eIdx + 1}`, `Exercise W${weekNumber}D${dIdx + 1}E${eIdx + 1}`)),
  }));
  return {
    weekNumber,
    focus,
    [shapeKey]: entries,
  };
};

const build24WeekFixture = (): GeneratedPlanWeek[] =>
  Array.from({ length: 24 }, (_, i) => buildWeek(i + 1, ['Foundation', 'Hypertrophy', 'Strength'][Math.floor(i / 8) % 3]));

describe('LongHorizonScheduleView — defaults', () => {
  it('mounts with Month 1, Week 1, Day 1 selected', () => {
    cleanup();
    const weeks = build24WeekFixture();
    render(<LongHorizonScheduleView weeks={weeks} />);

    // The Month-1 tab is the active selection (aria-selected=true).
    expect(screen.getByRole('tab', { name: /^Month 1$/, selected: true })).toBeTruthy();
    // The Week-1 tab is active. Accessible name includes the focus subtext
    // appended (e.g. "Week 1Foundation"), so match by substring.
    const activeWeekTabs = screen.getAllByRole('tab', { selected: true })
      .filter(el => /Week 1/.test(el.textContent || ''));
    expect(activeWeekTabs.length).toBeGreaterThan(0);
    // First day's first exercise should be rendered in the detail panel.
    expect(screen.getAllByText(/Exercise W1D1E1/i).length).toBeGreaterThan(0);
  });

  it('renders ⌈weeks/4⌉ Month tabs for a 24-week plan', () => {
    cleanup();
    const weeks = build24WeekFixture();
    render(<LongHorizonScheduleView weeks={weeks} />);

    // 24 / 4 = 6 month tabs.
    for (let m = 1; m <= 6; m += 1) {
      expect(screen.getAllByRole('tab', { name: new RegExp(`^Month ${m}$`) }).length).toBeGreaterThan(0);
    }
    // Should NOT have a 7th month tab.
    expect(screen.queryAllByRole('tab', { name: /^Month 7$/ })).toHaveLength(0);
  });
});

describe('LongHorizonScheduleView — Month / Week / Day switching', () => {
  it('switching Month resets to Week 1 / Day 1 and shows that month\'s weeks', () => {
    cleanup();
    const weeks = build24WeekFixture();
    render(<LongHorizonScheduleView weeks={weeks} />);

    // Month 2 covers weeks 5-8.
    fireEvent.click(screen.getByRole('tab', { name: /^Month 2$/ }));

    // Week tabs should now show Week 5..8 labels.
    expect(screen.getAllByRole('tab', { name: /Week 5/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab', { name: /Week 8/ }).length).toBeGreaterThan(0);
    // Detail panel should show W5D1 exercises (default day after month change).
    expect(screen.getAllByText(/Exercise W5D1E1/i).length).toBeGreaterThan(0);
  });

  it('switching Week within a Month resets the selected Day', () => {
    cleanup();
    const weeks = build24WeekFixture();
    render(<LongHorizonScheduleView weeks={weeks} />);

    // Pick Month 2 then a different Day in Week 5.
    fireEvent.click(screen.getByRole('tab', { name: /^Month 2$/ }));
    // Day 3 chip - text label is "Day 3" with W5D3 meta.
    fireEvent.click(screen.getByRole('tab', { name: /Day 3.*W5D3/ }));
    expect(screen.getAllByText(/Exercise W5D3E1/i).length).toBeGreaterThan(0);

    // Switching Week 6 should reset to Day 1.
    fireEvent.click(screen.getByRole('tab', { name: /^Week 6/ }));
    expect(screen.getAllByText(/Exercise W6D1E1/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Exercise W6D3E1/i)).toHaveLength(0);
  });

  it('clicking a Day chip swaps the detail panel exercises', () => {
    cleanup();
    const weeks = build24WeekFixture();
    render(<LongHorizonScheduleView weeks={weeks} />);

    fireEvent.click(screen.getByRole('tab', { name: /Day 2.*W1D2/ }));
    expect(screen.getAllByText(/Exercise W1D2E1/i).length).toBeGreaterThan(0);
    // The Day-1 first exercise should NOT be in the detail panel anymore.
    expect(screen.queryAllByText(/Exercise W1D1E1/i)).toHaveLength(0);
  });
});

describe('LongHorizonScheduleView — fallback shape + edge cases', () => {
  it('renders week.sessions[] when week.days[] is empty (L1 REV 2 parity)', () => {
    cleanup();
    const weeks = Array.from({ length: 4 }, (_, i) =>
      buildWeek(i + 1, 'Foundation', 4, 6, 'sessions'));
    render(<LongHorizonScheduleView weeks={weeks} />);

    expect(screen.getAllByText(/Exercise W1D1E1/i).length).toBeGreaterThan(0);
  });

  it('shows the empty state when a week has no populated days/sessions', () => {
    cleanup();
    const weeks: GeneratedPlanWeek[] = [
      { weekNumber: 1, focus: 'Empty', days: [] },
      buildWeek(2, 'Foundation'),
      buildWeek(3, 'Foundation'),
      buildWeek(4, 'Foundation'),
    ];
    render(<LongHorizonScheduleView weeks={weeks} />);
    // Default week 1 is empty - the day-list empty state should show.
    expect(screen.getByText(/no populated days/i)).toBeTruthy();
  });

  it('shows the rotationFallback badge for fallback exercises', () => {
    cleanup();
    const weeks: GeneratedPlanWeek[] = [{
      weekNumber: 1,
      focus: 'Foundation',
      days: [{
        dayNumber: 1,
        name: 'W1D1: push',
        exercises: [
          buildExercise('a', 'A'),
          buildExercise('b', 'B-FALLBACK', { rotationFallback: true }),
        ],
      }],
    },
    buildWeek(2, 'Foundation'),
    buildWeek(3, 'Foundation'),
    buildWeek(4, 'Foundation'),
    ];
    render(<LongHorizonScheduleView weeks={weeks} />);

    // Lowercase-only match avoids the uppercase "B-FALLBACK" exercise name.
    expect(screen.getByText('fallback')).toBeTruthy();
  });
});
