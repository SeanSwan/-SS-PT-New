/**
 * FILE: ClientDashboardHome.viewModel.test.ts
 * PURPOSE: Locks the mounted client home assignment routes to workout-progress truth.
 *
 * HOW IT FITS IN THE APP:
 *   ClientDashboardHomeTab shapes /api/workouts/:clientId/current into the
 *   visible "Today's training priority" card on /dashboard/client/overview.
 *   These tests prevent completed assignments from sending clients back into
 *   the logger after first login or password reset.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAssignmentView,
  buildInsights,
  buildTodaySnapshot,
} from './ClientDashboardHome.viewModel';
import type { HomeTrainingProof } from './HomeTabProofViewModel';

const baseProof: HomeTrainingProof = {
  thisWeekCount: 0,
  minutesThisWeek: 0,
  weeklyCounts: [0, 0, 0, 0],
  weekDelta: null,
  lastSession: null,
  latestSessionId: null,
  shareLine: null,
};
const volumeStatus = (rows: ReturnType<typeof buildInsights>) =>
  rows.find((r) => r.label === 'Training Volume')?.status;
const weekStatus = (rows: ReturnType<typeof buildInsights>) =>
  rows.find((r) => r.label === 'Workouts This Week')?.status;

const baseWorkout = {
  title: 'Strength Base Day 2',
  assignmentKey: 'plan-6m:w2:d2:homework',
  assignmentType: 'homework',
  assignmentStatus: 'ready',
  isLoggable: true,
  ctaLabel: 'Log Assignment',
  weekNumber: 2,
  dayNumber: 2,
  exerciseCount: 4,
  firstExercise: 'Goblet Squat',
  primaryPlanLabel: '6 Month Plan',
  homeworkSummary: null,
};

describe('buildInsights — target truth (launch panel gap b)', () => {
  it('measures volume against the ASSIGNED plan when its weekly volume is known', () => {
    const rows = buildInsights({ ...baseProof, thisWeekCount: 2, minutesThisWeek: 90 }, 40, 3, 4);
    expect(volumeStatus(rows)).toBe('2/4 plan sessions logged');
  });

  it('caps the logged count at the plan volume instead of reporting 5/4', () => {
    const rows = buildInsights({ ...baseProof, thisWeekCount: 6, minutesThisWeek: 240 }, 40, 3, 4);
    expect(volumeStatus(rows)).toBe('4/4 plan sessions logged');
  });

  it('makes NO target claim when the plan volume is unknown — never a hardcoded goal', () => {
    for (const unknown of [undefined, null, 0]) {
      const rows = buildInsights({ ...baseProof, thisWeekCount: 2, minutesThisWeek: 90 }, 40, 3, unknown);
      expect(volumeStatus(rows)).toBe('This week');
      expect(volumeStatus(rows)).not.toMatch(/target|goal|%/i);
    }
  });

  it('does not compare against an empty first week (hollow "Up N vs last week")', () => {
    const rows = buildInsights(
      { ...baseProof, thisWeekCount: 3, weeklyCounts: [0, 0, 0, 3], weekDelta: 3 },
      40, 3, 4,
    );
    expect(weekStatus(rows)).toBe('Building your baseline');
    expect(weekStatus(rows)).not.toMatch(/last week/);
  });

  it('reports a real week-over-week rise, flat week, and dip in plain language', () => {
    const up = buildInsights({ ...baseProof, thisWeekCount: 4, weeklyCounts: [1, 2, 2, 4], weekDelta: 2 }, 40, 3, 4);
    expect(weekStatus(up)).toBe('Up 2 vs last week');
    const flat = buildInsights({ ...baseProof, thisWeekCount: 3, weeklyCounts: [1, 2, 3, 3], weekDelta: 0 }, 40, 3, 4);
    expect(weekStatus(flat)).toBe('Matching last week');
    expect(weekStatus(flat)).not.toMatch(/Up 0/);
    const down = buildInsights({ ...baseProof, thisWeekCount: 1, weeklyCounts: [1, 2, 4, 1], weekDelta: -3 }, 40, 3, 4);
    expect(weekStatus(down)).toBe('3 fewer than last week');
  });

  it('never reintroduces a wearable tile it cannot source', () => {
    const rows = buildInsights({ ...baseProof, thisWeekCount: 2 }, 40, 3, 4);
    expect(rows.map((r) => r.label)).toEqual([
      'Workouts This Week', 'Training Volume', 'Consistency', 'Best Recent Week',
    ]);
    expect(rows.some((r) => r.value === 'Not available')).toBe(false);
  });
});

describe('ClientDashboardHome assignment view model', () => {
  it('routes completed current assignments to workout history instead of another log attempt', () => {
    const assignment = buildAssignmentView({
      workout: {
        ...baseWorkout,
        assignmentStatus: 'completed',
        ctaLabel: 'Log Assignment',
      },
      loading: false,
      error: false,
    });

    expect(assignment.actionPath).toBe('/dashboard/client/workouts');
    expect(assignment.actionLabel).toBe('Review Workout History');
    expect(assignment.rows.at(-1)).toMatchObject({

      label: 'Progress proof',
      meta: 'Logged today',
      complete: true,
    });
  });
  it('labels nutrition calories as logged intake rather than calories burned', () => {
    const snapshot = buildTodaySnapshot({
      sessions: [],
      proof: {
        totalSessions: 0,
        thisWeekCount: 0,
        minutesThisWeek: 0,
        weeklyCounts: [],
        latestSessionId: null,
        shareLine: '',
      },
      macroSummary: {
        totalCalories: 1850,
        totalProtein: 120,
        totalCarbs: 210,
        totalFat: 55,
        targetCalories: 2000,
        date: '2026-07-19',
      },
    });

    expect(snapshot.rows).toContainEqual({
      label: 'Calories Logged',
      value: '1,850 cal',
      meta: 'Nutrition log',
    });
    expect(snapshot.rows.some((row) => row.label === 'Calories Burned')).toBe(false);
  });
});